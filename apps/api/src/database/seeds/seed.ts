import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import * as bcrypt from 'bcrypt';

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  console.log('Seeding database...');

  // 테스트 사용자 생성
  const hashedPassword = await bcrypt.hash('password123', 10);
  await dataSource.query(`
    INSERT INTO users (email, password_hash, name, subscription_tier)
    VALUES
      ('admin@hanmed.kr', $1, '관리자', 'clinic'),
      ('doctor@hanmed.kr', $1, '홍길동', 'professional'),
      ('test@hanmed.kr', $1, '테스트', 'free')
    ON CONFLICT (email) DO NOTHING
  `, [hashedPassword]);

  // 약재 마스터 데이터
  await dataSource.query(`
    INSERT INTO herbs_master (korean_name, chinese_name, category, properties, meridians, functions)
    VALUES
      ('인삼', '人蔘', '보기약', '온/감미', ARRAY['비', '폐', '심'], '대보원기, 복맥고탈, 보비익폐'),
      ('황기', '黃芪', '보기약', '온/감미', ARRAY['비', '폐'], '보기승양, 고표지한, 이수소종'),
      ('당귀', '當歸', '보혈약', '온/감신', ARRAY['심', '간', '비'], '보혈활혈, 조경지통, 윤장통변'),
      ('백출', '白朮', '보기약', '온/고감', ARRAY['비', '위'], '건비익기, 조습이수, 고표지한'),
      ('감초', '甘草', '보기약', '평/감', ARRAY['십이경'], '보비익기, 청열해독, 조화제약'),
      ('천궁', '川芎', '활혈거어약', '온/신', ARRAY['간', '담', '심포'], '활혈행기, 거풍지통'),
      ('작약', '芍藥', '보혈약', '미한/고산', ARRAY['간', '비'], '양혈렴음, 유간지통, 평억간양'),
      ('숙지황', '熟地黃', '보혈약', '미온/감', ARRAY['간', '신'], '보혈자음, 익정전수'),
      ('복령', '茯苓', '이수삼습약', '평/담감', ARRAY['심', '비', '신'], '이수삼습, 건비화담, 영심안신'),
      ('생강', '生薑', '해표약', '온/신', ARRAY['비', '위', '폐'], '발표산한, 온중지구, 화담지해')
    ON CONFLICT DO NOTHING
  `);

  // 양약-한약 상호작용 데이터
  await dataSource.query(`
    INSERT INTO drug_herb_interactions (drug_name, herb_name, severity, mechanism, clinical_effect, recommendation)
    VALUES
      ('와파린', '당귀', 'critical', 'CYP2C9/CYP3A4 억제로 와파린 대사 감소', '출혈 위험 증가, INR 상승', '병용 금기. 반드시 다른 약재로 대체'),
      ('와파린', '단삼', 'critical', '항응고 효과 상승작용', '심각한 출혈 위험', '병용 금기'),
      ('아스피린', '은행잎', 'warning', '혈소판 응집 억제 상승', '출혈 경향 증가', '용량 조절 필요, 모니터링 권장'),
      ('메트포르민', '인삼', 'warning', '혈당 강하 효과 상승', '저혈당 위험', '혈당 모니터링 강화'),
      ('아토르바스타틴', '홍국', 'critical', '동일 기전 (HMG-CoA 환원효소 억제)', '횡문근융해증 위험 증가', '병용 금기'),
      ('디곡신', '감초', 'warning', '저칼륨혈증으로 디곡신 독성 증가', '부정맥 위험', '전해질 모니터링 필요'),
      ('암로디핀', '오수유', 'info', 'CYP3A4 상호작용 가능성', '혈압 강하 효과 변화 가능', '관찰 필요'),
      ('오메프라졸', '황련', 'info', '위산 분비 억제 효과 상승 가능', '임상적 의미 미미', '일반적으로 안전'),
      ('타이레놀', '시호', 'info', '간 대사 영향 가능', '간기능 모니터링 고려', '고용량 장기 복용시 주의'),
      ('프레드니손', '감초', 'warning', '스테로이드 작용 증강', '부종, 저칼륨혈증', '장기 복용시 주의')
    ON CONFLICT DO NOTHING
  `);

  // 테스트 치험례 데이터
  await dataSource.query(`
    INSERT INTO clinical_cases (case_number, patient_gender, patient_age, chief_complaint, symptoms, diagnosis, treatment_principle)
    VALUES
      ('CASE-001', 'F', 45, '만성 피로감', ARRAY['피로', '무력감', '식욕부진', '소화불량'], '비기허증', '보비익기'),
      ('CASE-002', 'M', 52, '불면증', ARRAY['불면', '다몽', '심계', '건망'], '심비양허', '보심비, 양혈안신'),
      ('CASE-003', 'F', 38, '생리통', ARRAY['월경통', '월경불순', '어혈', '냉증'], '어혈내정', '활혈화어, 온경지통'),
      ('CASE-004', 'M', 65, '요통', ARRAY['요통', '하지냉감', '야간뇨', '무력'], '신양허', '보신양, 강건골'),
      ('CASE-005', 'F', 28, '만성 두통', ARRAY['편두통', '어지러움', '메스꺼움', '광과민'], '간양상항', '평간잠양')
    ON CONFLICT DO NOTHING
  `);

  console.log('Seeding completed!');
  await dataSource.destroy();
}

seed().catch(console.error);
