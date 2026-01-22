/**
 * 처방별 한열/보사 성질 시드 데이터
 * 이종대 선생님 기준에 따른 처방 분류
 */

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Formula, FormulaHeatNature, FormulaStrengthNature } from '../entities/formula.entity';
import { BodyHeat, BodyStrength } from '../entities/clinical-case.entity';

// 처방별 한열/보사 성질 매핑 데이터
const formulaPropertiesData: Array<{
  name: string;
  heatNature: FormulaHeatNature;
  strengthNature: FormulaStrengthNature;
  suitableBodyHeat: BodyHeat[];
  suitableBodyStrength: BodyStrength[];
  contraindicatedBodyHeat?: BodyHeat[];
  contraindicatedBodyStrength?: BodyStrength[];
}> = [
  // ==========================================
  // 온열성 처방 (한증 환자에 적합)
  // ==========================================
  {
    name: '이중탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '사군자탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '육군자탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '보중익기탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '십전대보탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '팔물탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '귀비탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '팔미지황환',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '우귀음',
    heatNature: FormulaHeatNature.HOT,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
  },
  {
    name: '부자이중탕',
    heatNature: FormulaHeatNature.HOT,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
  },
  {
    name: '진무탕',
    heatNature: FormulaHeatNature.HOT,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
  },
  {
    name: '사역탕',
    heatNature: FormulaHeatNature.HOT,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '당귀사역탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },

  // ==========================================
  // 한량성 처방 (열증 환자에 적합)
  // ==========================================
  {
    name: '백호탕',
    heatNature: FormulaHeatNature.COLD,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.EXCESS, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '황련해독탕',
    heatNature: FormulaHeatNature.COLD,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.EXCESS],
    contraindicatedBodyHeat: [BodyHeat.COLD],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '용담사간탕',
    heatNature: FormulaHeatNature.COLD,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.EXCESS, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '육미지황환',
    heatNature: FormulaHeatNature.COOL,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },
  {
    name: '좌귀음',
    heatNature: FormulaHeatNature.COOL,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },
  {
    name: '천왕보심단',
    heatNature: FormulaHeatNature.COOL,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },
  {
    name: '대승기탕',
    heatNature: FormulaHeatNature.COLD,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.EXCESS],
    contraindicatedBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '소승기탕',
    heatNature: FormulaHeatNature.COLD,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.EXCESS, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '청심연자음',
    heatNature: FormulaHeatNature.COOL,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },
  {
    name: '지백지황환',
    heatNature: FormulaHeatNature.COLD,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },

  // ==========================================
  // 평성 처방 (한열 균형)
  // ==========================================
  {
    name: '소요산',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
  },
  {
    name: '가미소요산',
    heatNature: FormulaHeatNature.COOL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },
  {
    name: '시호소간산',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL, BodyStrength.EXCESS],
  },
  {
    name: '소시호탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL, BodyStrength.EXCESS],
  },
  {
    name: '반하사심탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
  },
  {
    name: '오령산',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.NEUTRAL, BodyStrength.EXCESS],
  },
  {
    name: '이진탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
  },
  {
    name: '온담탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
  },

  // ==========================================
  // 해표제 (표증 치료)
  // ==========================================
  {
    name: '계지탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '마황탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.EXCESS],
    contraindicatedBodyHeat: [BodyHeat.HOT],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '갈근탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.NEUTRAL, BodyStrength.EXCESS],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '소청룡탕',
    heatNature: FormulaHeatNature.WARM,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.COLD],
    suitableBodyStrength: [BodyStrength.NEUTRAL, BodyStrength.EXCESS],
    contraindicatedBodyHeat: [BodyHeat.HOT],
  },
  {
    name: '은교산',
    heatNature: FormulaHeatNature.COOL,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.NEUTRAL, BodyStrength.EXCESS],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },
  {
    name: '상국음',
    heatNature: FormulaHeatNature.COOL,
    strengthNature: FormulaStrengthNature.NEUTRAL,
    suitableBodyHeat: [BodyHeat.HOT, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT, BodyStrength.NEUTRAL],
    contraindicatedBodyHeat: [BodyHeat.COLD],
  },

  // ==========================================
  // 활혈거어제 (어혈 치료)
  // ==========================================
  {
    name: '혈부축어탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL, BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.NEUTRAL, BodyStrength.EXCESS],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '도핵승기탕',
    heatNature: FormulaHeatNature.COLD,
    strengthNature: FormulaStrengthNature.DRAINING,
    suitableBodyHeat: [BodyHeat.HOT],
    suitableBodyStrength: [BodyStrength.EXCESS],
    contraindicatedBodyHeat: [BodyHeat.COLD],
    contraindicatedBodyStrength: [BodyStrength.DEFICIENT],
  },
  {
    name: '사물탕',
    heatNature: FormulaHeatNature.NEUTRAL,
    strengthNature: FormulaStrengthNature.TONIFYING,
    suitableBodyHeat: [BodyHeat.COLD, BodyHeat.NEUTRAL],
    suitableBodyStrength: [BodyStrength.DEFICIENT],
  },
];

async function seedFormulaProperties() {
  console.log('처방 한열/보사 성질 시드 시작...');

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const formulaRepository = dataSource.getRepository(Formula);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const data of formulaPropertiesData) {
    const formula = await formulaRepository.findOne({
      where: { name: data.name },
    });

    if (formula) {
      formula.heatNature = data.heatNature;
      formula.strengthNature = data.strengthNature;
      formula.suitableBodyHeat = data.suitableBodyHeat;
      formula.suitableBodyStrength = data.suitableBodyStrength;
      formula.contraindicatedBodyHeat = data.contraindicatedBodyHeat || null;
      formula.contraindicatedBodyStrength = data.contraindicatedBodyStrength || null;

      await formulaRepository.save(formula);
      console.log(`  ✓ ${data.name} 업데이트 완료`);
      updatedCount++;
    } else {
      console.log(`  ✗ ${data.name} 처방을 찾을 수 없음`);
      notFoundCount++;
    }
  }

  await dataSource.destroy();

  console.log('\n===== 시드 완료 =====');
  console.log(`업데이트: ${updatedCount}개`);
  console.log(`미발견: ${notFoundCount}개`);
  console.log(`총: ${formulaPropertiesData.length}개`);
}

// 직접 실행 시
seedFormulaProperties()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('시드 실패:', error);
    process.exit(1);
  });

export { formulaPropertiesData, seedFormulaProperties };
