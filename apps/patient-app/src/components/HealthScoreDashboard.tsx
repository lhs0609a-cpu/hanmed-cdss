import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 장부 기능 점수 인터페이스
export interface OrganFunctionScores {
  spleen: number;
  lung: number;
  kidney: number;
  liver: number;
  heart: number;
}

// 체열/근실도 해석 인터페이스
export interface BodyStateInterpretation {
  traditional: string;
  modern: string;
  relatedSymptoms: string[];
  recommendations: string[];
}

// 트렌드 인터페이스
export interface HealthScoreTrend {
  changeFromLast: number;
  direction: 'improving' | 'stable' | 'declining';
  interpretation: string;
}

// 점수 근거 인터페이스
export interface ScoreEvidence {
  factor: string;
  sourceData: string;
  contribution: number;
  confidence: number;
}

// 대시보드 Props
export interface HealthScoreDashboardProps {
  // 기본 정보
  evaluatedAt: string;
  clinicName?: string;

  // 체열 점수
  bodyHeatScore: number;
  bodyHeatInterpretation: BodyStateInterpretation;

  // 근실도 점수
  bodyStrengthScore: number;
  bodyStrengthInterpretation: BodyStateInterpretation;

  // 기혈순환도
  circulationScore: number;
  circulationInterpretation: string;

  // 장부 기능 점수
  organFunctionScores: OrganFunctionScores;
  organInterpretations: Record<string, string>;

  // 종합 건강 지수
  overallHealthIndex: number;
  overallInterpretation: string;

  // 신뢰도
  confidenceLevel: number;
  confidenceExplanation?: string;

  // 트렌드
  trend?: HealthScoreTrend;

  // 근거 데이터
  scoreEvidence?: ScoreEvidence[];
}

type TabType = 'overview' | 'organs' | 'details';

// 점수별 색상 계산
const getScoreColor = (score: number, max: number = 100): string => {
  const ratio = score / max;
  if (ratio >= 0.8) return '#10B981'; // 초록
  if (ratio >= 0.6) return '#22C55E'; // 연초록
  if (ratio >= 0.4) return '#F59E0B'; // 노랑
  if (ratio >= 0.2) return '#F97316'; // 주황
  return '#EF4444'; // 빨강
};

// 체열 점수 색상
const getBodyHeatColor = (score: number): string => {
  if (score <= -5) return '#3B82F6'; // 파랑 (극한)
  if (score <= -2) return '#0EA5E9'; // 하늘 (한)
  if (score <= 2) return '#22C55E'; // 초록 (평)
  if (score <= 5) return '#F97316'; // 주황 (열)
  return '#EF4444'; // 빨강 (극열)
};

// 근실도 점수 색상
const getBodyStrengthColor = (score: number): string => {
  if (score <= -5) return '#8B5CF6'; // 보라 (극허)
  if (score <= -2) return '#A855F7'; // 연보라 (허)
  if (score <= 2) return '#22C55E'; // 초록 (평)
  if (score <= 5) return '#F59E0B'; // 노랑 (실)
  return '#EF4444'; // 빨강 (극실)
};

// 트렌드 아이콘
const getTrendIcon = (direction: string): string => {
  switch (direction) {
    case 'improving': return 'trending-up';
    case 'declining': return 'trending-down';
    default: return 'remove';
  }
};

const getTrendColor = (direction: string): string => {
  switch (direction) {
    case 'improving': return '#10B981';
    case 'declining': return '#EF4444';
    default: return '#6B7280';
  }
};

export default function HealthScoreDashboard({
  evaluatedAt,
  clinicName,
  bodyHeatScore,
  bodyHeatInterpretation,
  bodyStrengthScore,
  bodyStrengthInterpretation,
  circulationScore,
  circulationInterpretation,
  organFunctionScores,
  organInterpretations,
  overallHealthIndex,
  overallInterpretation,
  confidenceLevel,
  confidenceExplanation,
  trend,
  scoreEvidence = [],
}: HealthScoreDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: '종합 점수', icon: 'fitness' },
    { key: 'organs', label: '장부 기능', icon: 'body' },
    { key: 'details', label: '상세 분석', icon: 'analytics' },
  ];

  // 장부 기능 레이더 차트
  const renderOrganRadarChart = () => {
    const centerX = 140;
    const centerY = 140;
    const radius = 100;
    const organs = [
      { key: 'spleen', name: '비위', angle: -90 },
      { key: 'lung', name: '폐', angle: -18 },
      { key: 'kidney', name: '신', angle: 54 },
      { key: 'liver', name: '간', angle: 126 },
      { key: 'heart', name: '심', angle: 198 },
    ];

    const getPointPosition = (angle: number, distance: number) => {
      const rad = (angle * Math.PI) / 180;
      return {
        x: centerX + Math.cos(rad) * distance,
        y: centerY + Math.sin(rad) * distance,
      };
    };

    // 데이터 포인트 계산
    const dataPoints = organs.map(organ => {
      const score = organFunctionScores[organ.key as keyof OrganFunctionScores];
      const distance = (score / 100) * radius;
      return getPointPosition(organ.angle, distance);
    });

    const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <View style={styles.radarContainer}>
        <Svg width={280} height={280} viewBox="0 0 280 280">
          {/* 배경 원들 */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((level, idx) => (
            <Circle
              key={idx}
              cx={centerX}
              cy={centerY}
              r={radius * level}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          ))}

          {/* 축선 */}
          {organs.map((organ, idx) => {
            const end = getPointPosition(organ.angle, radius);
            return (
              <Line
                key={idx}
                x1={centerX}
                y1={centerY}
                x2={end.x}
                y2={end.y}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            );
          })}

          {/* 데이터 폴리곤 */}
          <Polygon
            points={polygonPoints}
            fill="#10B98133"
            stroke="#10B981"
            strokeWidth={2}
          />

          {/* 데이터 포인트 */}
          {dataPoints.map((point, idx) => (
            <Circle
              key={idx}
              cx={point.x}
              cy={point.y}
              r={6}
              fill="#10B981"
            />
          ))}

          {/* 라벨 */}
          {organs.map((organ, idx) => {
            const labelPos = getPointPosition(organ.angle, radius + 25);
            const score = organFunctionScores[organ.key as keyof OrganFunctionScores];
            return (
              <G key={`label-${idx}`}>
                <SvgText
                  x={labelPos.x}
                  y={labelPos.y - 8}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize={13}
                  fontWeight="600"
                >
                  {organ.name}
                </SvgText>
                <SvgText
                  x={labelPos.x}
                  y={labelPos.y + 8}
                  textAnchor="middle"
                  fill={getScoreColor(score)}
                  fontSize={12}
                  fontWeight="500"
                >
                  {score}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  // 체열/근실도 스펙트럼 바
  const renderSpectrumBar = (
    score: number,
    type: 'heat' | 'strength'
  ) => {
    const isHeat = type === 'heat';
    const leftLabel = isHeat ? '한(寒)' : '허(虛)';
    const rightLabel = isHeat ? '열(熱)' : '실(實)';
    const color = isHeat ? getBodyHeatColor(score) : getBodyStrengthColor(score);
    const position = ((score + 10) / 20) * 100; // -10~10을 0~100%로 변환

    return (
      <View style={styles.spectrumContainer}>
        <View style={styles.spectrumLabels}>
          <Text style={styles.spectrumLabelLeft}>{leftLabel}</Text>
          <Text style={styles.spectrumLabelRight}>{rightLabel}</Text>
        </View>
        <View style={styles.spectrumTrack}>
          <View
            style={[
              styles.spectrumGradient,
              {
                backgroundColor: isHeat
                  ? 'linear-gradient(to right, #3B82F6, #22C55E, #EF4444)'
                  : 'linear-gradient(to right, #8B5CF6, #22C55E, #EF4444)',
              },
            ]}
          >
            {/* 그라데이션 대신 구간 색상 */}
            <View style={[styles.spectrumSection, { backgroundColor: '#3B82F6', flex: 1 }]} />
            <View style={[styles.spectrumSection, { backgroundColor: '#0EA5E9', flex: 1 }]} />
            <View style={[styles.spectrumSection, { backgroundColor: '#22C55E', flex: 1 }]} />
            <View style={[styles.spectrumSection, { backgroundColor: '#F97316', flex: 1 }]} />
            <View style={[styles.spectrumSection, { backgroundColor: '#EF4444', flex: 1 }]} />
          </View>
          <View style={[styles.spectrumIndicator, { left: `${position}%` }]}>
            <View style={[styles.spectrumDot, { backgroundColor: color }]} />
          </View>
        </View>
        <View style={styles.spectrumScore}>
          <Text style={[styles.spectrumScoreText, { color }]}>
            {score > 0 ? `+${score}` : score}
          </Text>
        </View>
      </View>
    );
  };

  // 종합 점수 원형 게이지
  const renderOverallGauge = () => {
    const size = 180;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (overallHealthIndex / 100) * circumference;
    const rotation = -90;

    return (
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          {/* 배경 원 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {/* 진행 원 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getScoreColor(overallHealthIndex)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.gaugeCenter}>
          <Text style={[styles.gaugeScore, { color: getScoreColor(overallHealthIndex) }]}>
            {overallHealthIndex}
          </Text>
          <Text style={styles.gaugeLabel}>종합 건강지수</Text>
        </View>
      </View>
    );
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 종합 건강 지수 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="fitness" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>종합 건강 지수</Text>
          {trend && (
            <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(trend.direction)}15` }]}>
              <Ionicons
                name={getTrendIcon(trend.direction) as any}
                size={14}
                color={getTrendColor(trend.direction)}
              />
              <Text style={[styles.trendText, { color: getTrendColor(trend.direction) }]}>
                {trend.changeFromLast > 0 ? '+' : ''}{trend.changeFromLast.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {renderOverallGauge()}

        <Text style={styles.overallInterpretation}>{overallInterpretation}</Text>

        {trend && (
          <View style={styles.trendBox}>
            <Ionicons
              name={getTrendIcon(trend.direction) as any}
              size={18}
              color={getTrendColor(trend.direction)}
            />
            <Text style={styles.trendInterpretation}>{trend.interpretation}</Text>
          </View>
        )}
      </View>

      {/* 체열 점수 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="flame" size={16} color="#EF4444" />
          </View>
          <Text style={styles.cardTitle}>체열 (寒熱)</Text>
        </View>

        {renderSpectrumBar(bodyHeatScore, 'heat')}

        <View style={styles.interpretationBox}>
          <View style={styles.interpretationRow}>
            <View style={styles.interpretationLabel}>
              <Ionicons name="book" size={14} color="#8B5CF6" />
              <Text style={styles.interpretationLabelText}>한의학적 해석</Text>
            </View>
            <Text style={styles.interpretationText}>{bodyHeatInterpretation.traditional}</Text>
          </View>
          <View style={styles.interpretationRow}>
            <View style={styles.interpretationLabel}>
              <Ionicons name="flask" size={14} color="#3B82F6" />
              <Text style={styles.interpretationLabelText}>현대의학적 해석</Text>
            </View>
            <Text style={styles.interpretationText}>{bodyHeatInterpretation.modern}</Text>
          </View>
        </View>

        {bodyHeatInterpretation.recommendations.length > 0 && (
          <View style={styles.recommendationsBox}>
            <Text style={styles.recommendationsTitle}>생활 지침</Text>
            {bodyHeatInterpretation.recommendations.map((rec, idx) => (
              <View key={idx} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 근실도 점수 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="barbell" size={16} color="#6366F1" />
          </View>
          <Text style={styles.cardTitle}>근실도 (虛實)</Text>
        </View>

        {renderSpectrumBar(bodyStrengthScore, 'strength')}

        <View style={styles.interpretationBox}>
          <View style={styles.interpretationRow}>
            <View style={styles.interpretationLabel}>
              <Ionicons name="book" size={14} color="#8B5CF6" />
              <Text style={styles.interpretationLabelText}>한의학적 해석</Text>
            </View>
            <Text style={styles.interpretationText}>{bodyStrengthInterpretation.traditional}</Text>
          </View>
          <View style={styles.interpretationRow}>
            <View style={styles.interpretationLabel}>
              <Ionicons name="flask" size={14} color="#3B82F6" />
              <Text style={styles.interpretationLabelText}>현대의학적 해석</Text>
            </View>
            <Text style={styles.interpretationText}>{bodyStrengthInterpretation.modern}</Text>
          </View>
        </View>

        {bodyStrengthInterpretation.recommendations.length > 0 && (
          <View style={styles.recommendationsBox}>
            <Text style={styles.recommendationsTitle}>생활 지침</Text>
            {bodyStrengthInterpretation.recommendations.map((rec, idx) => (
              <View key={idx} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 기혈순환 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="pulse" size={16} color="#EC4899" />
          </View>
          <Text style={styles.cardTitle}>기혈순환도</Text>
          <View style={[styles.scoreBadge, { backgroundColor: `${getScoreColor(circulationScore)}15` }]}>
            <Text style={[styles.scoreBadgeText, { color: getScoreColor(circulationScore) }]}>
              {circulationScore}/100
            </Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${circulationScore}%`,
                  backgroundColor: getScoreColor(circulationScore),
                },
              ]}
            />
          </View>
        </View>

        <Text style={styles.circulationInterpretation}>{circulationInterpretation}</Text>
      </View>
    </ScrollView>
  );

  const renderOrgansTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 레이더 차트 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="body" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>장부 기능 종합</Text>
        </View>

        {renderOrganRadarChart()}

        <Text style={styles.chartDescription}>
          각 장부의 기능 점수를 0-100으로 표시합니다.{'\n'}
          80점 이상이면 양호, 60점 이하면 관리가 필요합니다.
        </Text>
      </View>

      {/* 장부별 상세 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>장부별 상세 점수</Text>
        </View>

        {[
          { key: 'spleen', name: '비위(脾胃)', icon: 'restaurant', desc: '소화 기능' },
          { key: 'lung', name: '폐(肺)', icon: 'cloud', desc: '호흡/면역 기능' },
          { key: 'kidney', name: '신(腎)', icon: 'water', desc: '신장/생식/골격 기능' },
          { key: 'liver', name: '간(肝)', icon: 'leaf', desc: '간/해독/근육 기능' },
          { key: 'heart', name: '심(心)', icon: 'heart', desc: '심장/순환/정신 기능' },
        ].map((organ) => {
          const score = organFunctionScores[organ.key as keyof OrganFunctionScores];
          const interpretation = organInterpretations[organ.key];

          return (
            <View key={organ.key} style={styles.organCard}>
              <View style={styles.organHeader}>
                <View style={styles.organInfo}>
                  <View style={[styles.organIcon, { backgroundColor: `${getScoreColor(score)}15` }]}>
                    <Ionicons name={organ.icon as any} size={18} color={getScoreColor(score)} />
                  </View>
                  <View>
                    <Text style={styles.organName}>{organ.name}</Text>
                    <Text style={styles.organDesc}>{organ.desc}</Text>
                  </View>
                </View>
                <View style={styles.organScoreContainer}>
                  <Text style={[styles.organScore, { color: getScoreColor(score) }]}>
                    {score}
                  </Text>
                  <Text style={styles.organScoreMax}>/100</Text>
                </View>
              </View>

              <View style={styles.organProgressContainer}>
                <View style={styles.organProgressTrack}>
                  <View
                    style={[
                      styles.organProgressFill,
                      {
                        width: `${score}%`,
                        backgroundColor: getScoreColor(score),
                      },
                    ]}
                  />
                </View>
              </View>

              {interpretation && (
                <Text style={styles.organInterpretation}>{interpretation}</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderDetailsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 평가 정보 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>평가 정보</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>평가일</Text>
            <Text style={styles.infoValue}>{evaluatedAt}</Text>
          </View>
          {clinicName && (
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>의료기관</Text>
              <Text style={styles.infoValue}>{clinicName}</Text>
            </View>
          )}
        </View>

        <View style={styles.confidenceBox}>
          <View style={styles.confidenceHeader}>
            <Text style={styles.confidenceLabel}>평가 신뢰도</Text>
            <Text style={[styles.confidenceValue, { color: getScoreColor(confidenceLevel * 100) }]}>
              {Math.round(confidenceLevel * 100)}%
            </Text>
          </View>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${confidenceLevel * 100}%`,
                  backgroundColor: getScoreColor(confidenceLevel * 100),
                },
              ]}
            />
          </View>
          {confidenceExplanation && (
            <Text style={styles.confidenceExplanation}>{confidenceExplanation}</Text>
          )}
        </View>
      </View>

      {/* 평가 근거 */}
      {scoreEvidence.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>평가 근거</Text>
          </View>

          {scoreEvidence.map((evidence, idx) => (
            <View key={idx} style={styles.evidenceItem}>
              <View style={styles.evidenceHeader}>
                <Text style={styles.evidenceFactor}>{evidence.factor}</Text>
                <View style={styles.evidenceConfidence}>
                  <Text style={styles.evidenceConfidenceText}>
                    신뢰도 {Math.round(evidence.confidence * 100)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.evidenceSource}>{evidence.sourceData}</Text>
              <View style={styles.evidenceContribution}>
                <Text style={styles.evidenceContributionLabel}>기여도</Text>
                <View style={styles.evidenceContributionBar}>
                  <View
                    style={[
                      styles.evidenceContributionFill,
                      { width: `${Math.min(evidence.contribution, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.evidenceContributionValue}>{evidence.contribution}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 점수 해석 가이드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="help-circle" size={20} color="#10B981" />
          <Text style={styles.cardTitle}>점수 해석 가이드</Text>
        </View>

        <View style={styles.guideSection}>
          <Text style={styles.guideSectionTitle}>체열 점수 (寒熱)</Text>
          <View style={styles.guideItems}>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.guideText}>-10 ~ -5: 극한(極寒)</Text>
            </View>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#0EA5E9' }]} />
              <Text style={styles.guideText}>-4 ~ -2: 한(寒)</Text>
            </View>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.guideText}>-1 ~ +1: 평(平)</Text>
            </View>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#F97316' }]} />
              <Text style={styles.guideText}>+2 ~ +4: 열(熱)</Text>
            </View>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.guideText}>+5 ~ +10: 극열(極熱)</Text>
            </View>
          </View>
        </View>

        <View style={styles.guideSection}>
          <Text style={styles.guideSectionTitle}>종합 건강 지수</Text>
          <View style={styles.guideItems}>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.guideText}>80-100: 건강</Text>
            </View>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.guideText}>60-79: 양호</Text>
            </View>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.guideText}>40-59: 관리 필요</Text>
            </View>
            <View style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.guideText}>0-39: 주의</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 면책 조항 */}
      <View style={styles.disclaimerBox}>
        <Ionicons name="alert-circle" size={18} color="#6B7280" />
        <Text style={styles.disclaimerText}>
          이 건강 점수는 참고용이며, 정확한 진단을 위해서는 반드시 전문 의료인과 상담하시기 바랍니다.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* 탭 네비게이션 */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? '#10B981' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 컨텐츠 */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'organs' && renderOrgansTab()}
      {activeTab === 'details' && renderDetailsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#10B981',
  },
  tabLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeScore: {
    fontSize: 48,
    fontWeight: '700',
  },
  gaugeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  overallInterpretation: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 8,
  },
  trendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  trendInterpretation: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  spectrumContainer: {
    marginBottom: 16,
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spectrumLabelLeft: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  spectrumLabelRight: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  spectrumTrack: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  spectrumGradient: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
  },
  spectrumSection: {
    height: '100%',
  },
  spectrumIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    marginLeft: -2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spectrumDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  spectrumScore: {
    alignItems: 'center',
    marginTop: 8,
  },
  spectrumScoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  interpretationBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  interpretationRow: {
    gap: 6,
  },
  interpretationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interpretationLabelText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  interpretationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  recommendationsBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  circulationInterpretation: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  radarContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chartDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  organCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 14,
  },
  organHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  organInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  organIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  organDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  organScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  organScore: {
    fontSize: 24,
    fontWeight: '700',
  },
  organScoreMax: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  organProgressContainer: {
    marginBottom: 8,
  },
  organProgressTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  organProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  organInterpretation: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  confidenceBox: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceExplanation: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  evidenceItem: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evidenceFactor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  evidenceConfidence: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  evidenceConfidenceText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  evidenceSource: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  evidenceContribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evidenceContributionLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 40,
  },
  evidenceContributionBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  evidenceContributionFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  evidenceContributionValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    width: 35,
    textAlign: 'right',
  },
  guideSection: {
    marginBottom: 16,
  },
  guideSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  guideItems: {
    gap: 6,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  guideText: {
    fontSize: 13,
    color: '#4B5563',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    marginBottom: 32,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});
