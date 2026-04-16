import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { SajuReport, SajuReportStatus } from '../../../database/entities/saju-report.entity';
import {
  SajuReportSection,
  SajuSectionType,
} from '../../../database/entities/saju-report-section.entity';
import {
  TIER_SECTIONS,
  SECTION_TITLES,
  TIER_MODEL,
  TIER_MAX_TOKENS,
} from '../types/saju-report.types';
import { SajuCalculationService } from './saju-calculation.service';
import { SajuImageService } from './saju-image.service';

/** 리포트 생성 최대 소요 시간 (ms). 이보다 오래된 GENERATING 상태는 stale로 판단 */
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30분

@Injectable()
export class SajuReportGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(SajuReportGeneratorService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private configService: ConfigService,
    private calculationService: SajuCalculationService,
    private imageService: SajuImageService,
    @InjectRepository(SajuReport)
    private reportRepository: Repository<SajuReport>,
    @InjectRepository(SajuReportSection)
    private sectionRepository: Repository<SajuReportSection>,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });
  }

  /** 서버 시작 시 stale GENERATING 리포트 복구 */
  async onModuleInit() {
    try {
      const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
      const staleReports = await this.reportRepository.find({
        where: {
          status: SajuReportStatus.GENERATING,
          generationStartedAt: LessThan(staleThreshold),
        },
      });

      if (staleReports.length > 0) {
        this.logger.warn(`Stale GENERATING 리포트 ${staleReports.length}개 발견 → FAILED 처리`);
        await this.reportRepository.update(
          { id: In(staleReports.map((r) => r.id)) },
          {
            status: SajuReportStatus.FAILED,
            errorMessage: '서버 재시작으로 생성이 중단되었습니다. 고객센터로 문의해주세요.',
          },
        );
      }

      // 최근 시작된 GENERATING 리포트는 재개 시도
      const recentReports = await this.reportRepository.find({
        where: {
          status: SajuReportStatus.GENERATING,
        },
      });
      for (const report of recentReports) {
        this.logger.log(`리포트 재개 시도 [${report.id}]`);
        this.generateReport(report).catch((err) => {
          this.logger.error(`리포트 재개 실패 [${report.id}]`, err);
        });
      }
    } catch (err) {
      this.logger.error('onModuleInit stale 복구 실패', err);
    }
  }

  /** 리포트 생성 시작 (비동기) */
  async startGeneration(reportId: string): Promise<void> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('리포트를 찾을 수 없습니다.');
    }

    // 비동기 실행 (await 하지 않음)
    this.generateReport(report).catch((error) => {
      this.logger.error(`리포트 생성 실패 [${reportId}]`, error);
    });
  }

  /** 리포트 생성 메인 로직 */
  private async generateReport(report: SajuReport): Promise<void> {
    const sections = TIER_SECTIONS[report.tier];
    const model = TIER_MODEL[report.tier];
    const maxTokens = TIER_MAX_TOKENS[report.tier];
    const isPremium = report.tier === 'premium';

    // 공유 컨텍스트 블록
    const contextBlock = this.calculationService.formatForPrompt(
      report.birthDate,
      report.birthHour ?? undefined,
      report.name,
      report.gender ?? undefined,
    );

    // 이미 완료된 섹션 조회 (재개 시 skip용)
    const existingSections = await this.sectionRepository.find({
      where: { reportId: report.id, isCompleted: true },
    });
    const completedTypes = new Set(existingSections.map((s) => s.sectionType));

    try {
      await this.reportRepository.update(report.id, {
        status: SajuReportStatus.GENERATING,
        generationStartedAt: report.generationStartedAt ?? new Date(),
      });

      for (let i = 0; i < sections.length; i++) {
        const sectionType = sections[i];

        // 이미 생성된 섹션은 skip
        if (completedTypes.has(sectionType)) {
          continue;
        }

        const sectionPrompt = this.getSectionPrompt(sectionType, contextBlock);

        // Claude API 호출
        const response = await this.anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: sectionPrompt }],
          system: this.getSystemPrompt(),
        });

        const content = response.content
          .filter((block) => block.type === 'text')
          .map((block) => (block as any).text as string)
          .join('\n');

        const tokenCount =
          (response.usage?.output_tokens || 0) +
          (response.usage?.input_tokens || 0);

        // 섹션 저장
        const section = this.sectionRepository.create({
          reportId: report.id,
          sectionType,
          sectionOrder: i + 1,
          title: SECTION_TITLES[sectionType],
          content,
          tokenCount,
          modelUsed: model,
          isCompleted: true,
        });

        // 프리미엄: DALL-E 이미지 생성
        if (isPremium) {
          try {
            const imageResult = await this.imageService.generateSectionImage(
              sectionType,
              report.dominantElement,
            );
            if (imageResult) {
              section.imageUrl = imageResult.url;
              section.imagePrompt = imageResult.prompt;
            }
          } catch (imgError) {
            this.logger.warn(`이미지 생성 실패 [${sectionType}]`, imgError);
            // graceful fallback: 이미지 없이 계속
          }
        }

        await this.sectionRepository.save(section);

        // 진행률 업데이트
        await this.reportRepository.update(report.id, {
          completedSections: i + 1,
        });
      }

      // 완료
      await this.reportRepository.update(report.id, {
        status: SajuReportStatus.COMPLETED,
        generationCompletedAt: new Date(),
        completedSections: sections.length,
      });

      this.logger.log(`리포트 생성 완료 [${report.id}]`);
    } catch (error) {
      await this.reportRepository.update(report.id, {
        status: SajuReportStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
      });
      throw error;
    }
  }

  /** 시스템 프롬프트 */
  private getSystemPrompt(): string {
    return `당신은 한국 사주팔자(四柱八字)와 한의학에 정통한 최고의 명리학자이자 한의학 박사입니다.
사주 분석을 기반으로 깊이 있고, 구체적이며, 실용적인 리포트를 작성합니다.

작성 원칙:
1. 마크다운 형식으로 작성하세요 (## 소제목, **강조**, 리스트 등)
2. 한의학 용어는 한글(한자) 형태로 병기하세요
3. 추상적 표현을 피하고 구체적 예시와 실천 방안을 제시하세요
4. 건강 관련 내용은 한의학 오행/장부 이론에 기반하되, 의학적 진단이 아님을 명시하세요
5. 한국어로 작성하고, 존댓말(~니다)체를 사용하세요
6. 각 섹션은 최소 1000자 이상으로 상세히 작성하세요
7. 오행의 상생/상극 관계를 활용한 구체적 조언을 포함하세요`;
  }

  /** 섹션별 프롬프트 */
  private getSectionPrompt(
    sectionType: SajuSectionType,
    contextBlock: string,
  ): string {
    const prompts: Record<SajuSectionType, string> = {
      [SajuSectionType.OVERVIEW]: `${contextBlock}

위 사주 정보를 바탕으로 [사주 개요] 섹션을 작성해주세요.

포함 내용:
- 일간(日干) 분석: 본인의 핵심 성질과 기본 기운
- 사주 구조 해설: 4개 기둥의 관계와 의미
- 오행 밸런스 해설: 강한/약한 기운이 인생에 미치는 영향
- 천간/지지 조합의 특수성 (충, 합, 형 등 있을 경우)
- 전체적인 명식(命式)의 특징 요약`,

      [SajuSectionType.PERSONALITY]: `${contextBlock}

위 사주 정보를 바탕으로 [성격 DNA] 섹션을 작성해주세요.

포함 내용:
- 타고난 성격의 핵심: 일간에 기반한 기본 성향
- 외적 성격 vs 내적 성격 (천간 vs 지지)
- 대인관계에서의 특징: 첫인상, 소통 스타일
- 리더십 스타일과 의사결정 패턴
- 강점과 보완할 점 (구체적 상황 예시)
- MBTI나 에니어그램과의 재미있는 비교`,

      [SajuSectionType.HEALTH_CONSTITUTION]: `${contextBlock}

위 사주 정보를 바탕으로 [건강 체질 정밀진단] 섹션을 작성해주세요. 이것이 핵심 차별점입니다.

포함 내용:
- 사상체질 상세 분석: 해당 체질의 특성과 발현 방식
- 장부 강약 분석: 오행에 기반한 장기별 강약점 (간, 심, 비, 폐, 신)
- 취약 건강 포인트: 계절별/나이별 주의해야 할 건강 이슈
- 식이 양생법: 체질에 맞는 음식/피해야 할 음식 (구체적 식품명)
- 운동 처방: 체질에 맞는 운동 종류와 강도
- 생활 양생법: 수면, 스트레스 관리, 계절 양생
- 오행 보충법: 약한 오행을 보충하는 구체적 방법 (색상, 방위, 음식, 활동)

※ 의학적 진단이 아닌 한의학 이론에 기반한 건강 가이드임을 명시`,

      [SajuSectionType.CAREER_WEALTH]: `${contextBlock}

위 사주 정보를 바탕으로 [직업 & 재물운] 섹션을 작성해주세요.

포함 내용:
- 재물 성향: 정재(正財)형 vs 편재(偏財)형 분석
- 재물 패턴: 돈이 들어오고 나가는 방식
- 직업 적성: 오행별 적합 직종과 구체적 직업 추천
- 사업 vs 직장: 어떤 방식이 더 유리한지
- 재물운 타이밍: 재물운이 좋아지는 시기
- 재테크 스타일: 체질에 맞는 투자/저축 전략
- 커리어 발전 조언`,

      [SajuSectionType.RELATIONSHIPS]: `${contextBlock}

위 사주 정보를 바탕으로 [대인관계 & 궁합] 섹션을 작성해주세요.

포함 내용:
- 연애 스타일: 이상형과 연애 패턴
- 결혼운: 시기와 배우자 상(像)
- 이상적인 궁합: 잘 맞는 오행/체질 조합
- 주의할 궁합: 갈등이 생기기 쉬운 조합
- 가족 관계: 부모/형제/자녀와의 관계 특성
- 직장/사회 관계: 직장 동료, 상사와의 관계 팁
- 인간관계 개운법`,

      [SajuSectionType.YEARLY_FORTUNE]: `${contextBlock}

위 사주 정보를 바탕으로 [2026년 총운] 섹션을 작성해주세요.

2026년은 병오(丙午)년입니다. 이 세운과 본인의 사주가 만나 어떤 기운이 형성되는지 분석해주세요.

포함 내용:
- 2026년 전체 운세 개요
- 건강운: 올해 특히 주의할 건강 포인트
- 재물운: 올해의 재물 흐름과 투자 조언
- 직업운: 커리어 변화와 기회
- 애정운: 연애/결혼/인간관계 흐름
- 학업운 (해당 시)
- 분기별 운세 요약 (1-3월, 4-6월, 7-9월, 10-12월)
- 올해의 행운 키워드와 주의사항`,

      [SajuSectionType.MONTHLY_FORTUNE]: `${contextBlock}

위 사주 정보를 바탕으로 [2026년 월별 운세] 섹션을 작성해주세요.

각 월의 간지와 본인 사주의 관계를 분석하여 12개월 각각에 대해 작성해주세요.

각 월별 포함 내용:
- 해당 월의 간지와 오행 기운
- 건강 포인트
- 재물/직업 조언
- 인간관계 팁
- 행운의 날짜/색상/방위
- 주의사항

※ 1월부터 12월까지 모두 작성`,

      [SajuSectionType.LIFE_ADVICE]: `${contextBlock}

위 사주 정보를 바탕으로 [종합 조언 & 개운법] 섹션을 작성해주세요.

포함 내용:
- 인생 전체의 흐름과 대운(大運) 분석
- 10년 단위 인생 로드맵 (과거 포함, 미래 중심)
- 개운법 종합: 색상, 방위, 숫자, 음식, 활동
- 명상/수행 추천: 체질에 맞는 마음 수련법
- 풍수 조언: 거주지/사무실 방위와 인테리어 팁
- 핵심 인생 조언 3가지
- 마무리: 격려와 응원의 메시지`,
    };

    return prompts[sectionType];
  }
}
