# -*- coding: utf-8 -*-
"""
처방 데이터 파서
빈용 101/202 처방 및 방약합편 데이터를 파싱하여 JSON으로 변환
"""

import re
import json
import sys
import os
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

# UTF-8 출력 설정
sys.stdout.reconfigure(encoding='utf-8')

# 기본 경로 설정
DOCS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs')
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'apps', 'web', 'src', 'data', 'formulas')

# 데이터 출처 타입
class DataSource(Enum):
    BINYONG_101 = 'binyong101'
    BINYONG_202 = 'binyong202'
    BANGYAK_SANGTON = 'bangyak_sangton'
    BANGYAK_JUNGTON = 'bangyak_jungton'
    BANGYAK_HATON = 'bangyak_haton'

# 카테고리 매핑
DISEASE_CATEGORIES = {
    '근골격계질환': 'musculoskeletal',
    '소화기질환': 'digestive',
    '호흡기질환': 'respiratory',
    '순환기질환': 'cardiovascular',
    '신경계질환': 'neurological',
    '비뇨기질환': 'urological',
    '부인과질환': 'gynecological',
    '피부질환': 'dermatological',
    '대사질환': 'metabolic',
    '정신과질환': 'psychiatric',
    '소아질환': 'pediatric',
    '노인질환': 'geriatric',
    '면역질환': 'immunological',
    '종양질환': 'oncological',
}

BANGYAK_CATEGORIES = {
    '補益': 'boik',
    '보익': 'boik',
    '解表': 'haepyo',
    '해표': 'haepyo',
    '清熱': 'cheongryeol',
    '청열': 'cheongryeol',
    '瀉元': 'sawon',
    '사원': 'sawon',
    '溫裏': 'onri',
    '온리': 'onri',
    '理水': 'lisu',
    '이수': 'lisu',
    '和解': 'hwahae',
    '화해': 'hwahae',
    '理氣': 'ligi',
    '이기': 'ligi',
    '理血': 'lihyeol',
    '이혈': 'lihyeol',
    '祛痰': 'geotam',
    '거담': 'geotam',
    '疏風': 'sopung',
    '소풍': 'sopung',
    '安蟲': 'anchung',
    '안충': 'anchung',
}

# 한자-한글 처방명 매핑
HANJA_TO_HANGUL = {
    '加味溫膽湯': '가미온담탕',
    '六鬱湯': '육울탕',
    '梔子清肝湯': '치자청간탕',
    '溫膽湯': '온담탕',
    '歸脾湯': '귀비탕',
    '加味歸脾湯': '가미귀비탕',
    '四物湯': '사물탕',
    '八物湯': '팔물탕',
    '十全大補湯': '십전대보탕',
    '補中益氣湯': '보중익기탕',
    '逍遙散': '소요산',
    '加味逍遙散': '가미소요산',
    '四君子湯': '사군자탕',
    '六君子湯': '육군자탕',
    '香砂六君子湯': '향사육군자탕',
    '半夏瀉心湯': '반하사심탕',
    '小柴胡湯': '소시호탕',
    '大柴胡湯': '대시호탕',
    '柴胡桂枝湯': '시호계지탕',
    '桂枝湯': '계지탕',
    '麻黃湯': '마황탕',
    '葛根湯': '갈근탕',
    '小青龍湯': '소청룡탕',
    '麥門冬湯': '맥문동탕',
    '五苓散': '오령산',
    '五積散': '오적산',
    '當歸芍藥散': '당귀작약산',
    '芍藥甘草湯': '작약감초탕',
    '獨活寄生湯': '독활기생탕',
    '大防風湯': '대방풍탕',
    '萬金湯': '만금탕',
    '三氣飮': '삼기음',
    '雙和湯': '쌍화탕',
    '鹿茸大補湯': '녹용대보탕',
    '女神湯': '여신탕',
    '正氣天香湯': '정기천향탕',
    '香蘇散': '향소산',
    '行氣香蘇散': '행기향소산',
    '四七湯': '사칠탕',
    '加味四七湯': '가미사칠탕',
    '牛黃清心元': '우황청심원',
    '交感丹': '교감단',
    '天王補心丹': '천왕보심단',
    '醒心散': '성심산',
    '茯苓補心湯': '복령보심탕',
    '四物安神湯': '사물안신탕',
    '芎夏湯': '궁하탕',
    '究原心腎丸': '구원심신환',
    '古庵心腎丸': '고암심신환',
    '仁熟散': '인숙산',
    '陶氏升陽散火湯': '도씨승양산화탕',
}


def convert_hanja_to_hangul(hanja: str) -> str:
    """한자 처방명을 한글로 변환"""
    if hanja in HANJA_TO_HANGUL:
        return HANJA_TO_HANGUL[hanja]

    # 매핑에 없으면 음독 변환 시도 (기본적인 한자-한글 변환)
    # 여기서는 간단히 한자 그대로 반환
    return hanja


@dataclass
class FormulaComposition:
    herb: str
    hanja: Optional[str] = None
    amount: str = ''
    role: Optional[str] = None
    function: Optional[str] = None
    processing: Optional[str] = None


@dataclass
class PatientInfo:
    gender: str
    age: int
    constitution: Optional[str] = None
    location: Optional[str] = None
    occupation: Optional[str] = None
    physique: Optional[str] = None


@dataclass
class ClinicalCase:
    id: str
    title: str
    patient_info: Dict
    chief_complaint: str
    symptoms: List[str]
    diagnosis: str
    treatment: Dict
    progress: List[str]
    result: str
    notes: Optional[str] = None
    source: Optional[str] = None


@dataclass
class FormulaComparison:
    target_formula: str
    difference: str


@dataclass
class Formula:
    id: str
    name: str
    hanja: str
    code: str
    category: str
    category_label: str
    source: str
    original_text: Optional[str]
    composition: List[Dict]
    composition_text: Optional[str]
    usage: Optional[str]
    indications: List[str]
    indication_text: Optional[str]
    description: str
    mechanism: Optional[str]
    composition_explanation: Optional[str]
    comparisons: List[Dict]
    comparison_text: Optional[str]
    cases: List[Dict]
    contraindications: List[str]
    cautions: List[str]
    data_source: str
    search_keywords: List[str]


def parse_composition_text(text: str) -> List[Dict]:
    """약재 구성 텍스트를 파싱"""
    compositions = []

    # 정규식으로 약재와 용량 추출
    # 패턴: 약재명 용량 또는 약재명(수치법) 용량
    # 예: 玄胡索 當歸 桂心 杜冲薑炒各等分
    # 예: 防風 一錢半 防己 官桂 杏仁 黃芩 各一錢

    # 먼저 "各등분", "各一錢" 등의 공통 용량 패턴 찾기
    common_amount_pattern = r'各([一二三四五六七八九十半]?[錢分兩]?[半]?|等分)'

    # 약재명 패턴 (한자 2-4자 + 선택적 수치법)
    herb_pattern = r'([一-龥]{2,6})(?:\(([^)]+)\))?'

    # 간단한 파싱: 공백으로 분리
    parts = text.strip().split()
    current_herbs = []

    for part in parts:
        # 용량 표시인 경우
        if re.match(r'^各?[一二三四五六七八九十]?[錢分兩]?[半]?$|^等分$', part):
            # 이전 약재들에 용량 적용
            for herb in current_herbs:
                herb['amount'] = part
            current_herbs = []
        else:
            # 약재명
            herb_match = re.match(herb_pattern, part)
            if herb_match:
                herb_name = herb_match.group(1)
                processing = herb_match.group(2) if herb_match.group(2) else None

                # 수치법이 약재명에 붙어있는 경우 분리
                processing_keywords = ['薑炒', '酒洗', '酒炒', '炮', '炙', '蜜炙']
                for kw in processing_keywords:
                    if kw in herb_name:
                        herb_name = herb_name.replace(kw, '')
                        processing = kw
                        break

                if herb_name:
                    compositions.append({
                        'herb': herb_name,
                        'amount': '',
                        'processing': processing
                    })
                    current_herbs.append(compositions[-1])

    return compositions


def parse_indications(text: str) -> List[str]:
    """적응증 텍스트를 리스트로 파싱"""
    if not text:
        return []

    # ⊕ 기호로 시작하는 경우
    if '⊕' in text:
        text = text.split('⊕')[1] if len(text.split('⊕')) > 1 else text

    # 쉼표, 반점 등으로 분리
    indications = re.split(r'[,，、\s]+', text.strip())
    return [ind.strip() for ind in indications if ind.strip()]


def parse_clinical_cases(text: str, formula_id: str) -> List[Dict]:
    """치험례/활용사례 텍스트를 파싱"""
    cases = []

    # 활용사례 섹션 찾기
    case_section_pattern = r'활용사례|활용례|Ȱ����'
    case_match = re.search(case_section_pattern, text)

    if not case_match:
        return cases

    case_text = text[case_match.end():]

    # 개별 케이스 패턴
    # 예: 1-1. 중풍(中風), 인사불성(人事不省)  남  70세
    case_pattern = r'(\d+-\d+)\.\s*([^\n]+?)(?:남|여)\s+(\d+)세'

    case_matches = re.finditer(case_pattern, case_text)

    case_num = 1
    for match in case_matches:
        case_id = match.group(1)
        title = match.group(2).strip()
        age = int(match.group(3))
        gender = 'M' if '남' in match.group(0) else 'F'

        # 케이스 상세 내용 추출 (다음 케이스까지)
        start = match.end()
        next_match = re.search(r'\d+-\d+\.', case_text[start:])
        end = start + next_match.start() if next_match else len(case_text)

        case_detail = case_text[start:end].strip()

        # 증상 추출 (① ② 등의 번호로 시작하는 항목)
        symptoms = re.findall(r'[①②③④⑤⑥⑦⑧⑨⑩]\s*([^\n①②③④⑤⑥⑦⑧⑨⑩]+)', case_detail)
        symptoms = [s.strip() for s in symptoms if s.strip()]

        cases.append({
            'id': f'{formula_id}-case-{case_num}',
            'title': title,
            'patientInfo': {
                'gender': gender,
                'age': age,
            },
            'chiefComplaint': title,
            'symptoms': symptoms,
            'diagnosis': '',
            'treatment': {
                'formula': '',
            },
            'progress': [],
            'result': '',
        })
        case_num += 1

    return cases


def parse_comparisons(text: str) -> List[Dict]:
    """처방비교 텍스트를 파싱"""
    comparisons = []

    # "xxx와 비교하면", "xxx과 비교하면" 패턴
    comparison_pattern = r'([가-힣]+(?:탕|산|환|음|단|고))[와과]\s*비교하면\s*([^。]+)'

    matches = re.finditer(comparison_pattern, text)
    for match in matches:
        comparisons.append({
            'targetFormula': match.group(1),
            'difference': match.group(2).strip()[:200]  # 200자 제한
        })

    return comparisons


def extract_section(text: str, section_name: str) -> Optional[str]:
    """특정 섹션의 내용 추출"""
    # 【xxx】 형식
    pattern = rf'【\s*{section_name}\s*】\s*([^\n【]+)'
    match = re.search(pattern, text)
    if match:
        return match.group(1).strip()

    # 일반 섹션명 형식
    pattern = rf'{section_name}\s+(.+?)(?=\n[가-힣]+\s+|\n【|\Z)'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()

    return None


def parse_binyong_formula(text: str, data_source: str) -> Optional[Dict]:
    """빈용처방 데이터 파싱"""

    # 처방 코드 및 이름 추출
    # 패턴1: 中統145 寶여신탕 (寶 바로 뒤에 한글 처방명이 붙음) - binyong101
    # 패턴2: 中統 91 寶加味溫膽湯 (코드 사이 공백, 寶 뒤에 한자 처방명) - binyong202
    # 패턴3: 上統88 寶독활기생탕 (처방명이 바로 이어짐)

    # 한자 처방명 패턴 (binyong202)
    # 寶 뒤에 줄바꿈, 제어문자(\x07 등)가 있을 수 있음
    code_pattern_hanja = r'([上中下]統)\s*(\d+)\s*寶[\s\x00-\x1f]*([一-龥]+(?:湯|散|丸|飮|丹|膏|元))'
    match = re.search(code_pattern_hanja, text)

    hanja = ''
    if match:
        code = match.group(1) + match.group(2)
        hanja = match.group(3)
        # 한자명에서 한글명 추출 시도
        name = convert_hanja_to_hangul(hanja)
    else:
        # 한글 처방명 패턴 (binyong101)
        # 寶 뒤에 줄바꿈, 제어문자(\x07 등)가 있을 수 있음
        code_pattern_hangul = r'([上中下]統)\s*(\d+)\s*寶[\s\x00-\x1f]*([가-힣]+(?:탕|산|환|음|단|고|원|전|방))'
        match = re.search(code_pattern_hangul, text)

        if not match:
            return None

        code = match.group(1) + match.group(2)
        name = match.group(3)

    # 처방명이 아닌 경우 스킵 (카테고리명 등)
    if name in ['근골격계질환', '소화기질환', '호흡기질환', '순환기질환', '신경계질환',
                 '비뇨기질환', '부인과질환', '피부질환', '대사질환', '정신과질환']:
        return None

    # 한자 이름 추출 (구성 약재 앞에 있는 경우)
    if not hanja:
        hanja_pattern = rf'{name}\s*\n\s*([一-龥\s]+)\n'
        hanja_match = re.search(hanja_pattern, text)
        if hanja_match:
            hanja = hanja_match.group(1).strip()

    # 구성 추출 (처방명 뒤에 오는 한자 약재명들)
    composition_text = ''

    # 패턴1: 한글 접미사 (binyong101)
    comp_pattern_kr = r'(?:탕|산|환|음|단|고|원|전|방)[\s\x00-\x1f\n]+([一-龥\s薑炒酒洗各等分一二三四五六七八九十錢分兩半枚片]+?)[\s\x00-\x1f]*【'

    # 패턴2: 한자 접미사 (binyong202) - 처방명 바로 뒤 (제어문자 포함)
    # 加味溫膽湯\n\x07\x01\x15\n\x07香附子二錢四分... 형식
    # 끝 조건: 治 또는 【 전까지
    comp_pattern_cn = r'(?:湯|散|丸|飮|丹|膏|元)[\s\x00-\x1f]+([一-龥][^治【]+)'

    # 먼저 한글 패턴 시도
    comp_match = re.search(comp_pattern_kr, text)
    if not comp_match:
        # 한자 패턴 시도 - 첫 번째 매칭만 사용 (처방명 바로 뒤)
        comp_match = re.search(comp_pattern_cn, text)

    if comp_match:
        composition_text = comp_match.group(1).strip()
        # 제어문자 및 줄바꿈 제거
        composition_text = re.sub(r'[\x00-\x1f\n]', ' ', composition_text).strip()
        # 연속 공백 제거
        composition_text = re.sub(r'\s+', ' ', composition_text).strip()

    # 각 섹션 추출 (【出    典】 형식)
    source_pattern = r'【出\s*典】\s*(.+?)(?=\n【|$)'
    source_match = re.search(source_pattern, text)
    source_text = source_match.group(1).strip() if source_match else ''

    usage_pattern = r'【用\s*法】\s*(.+?)(?=\n【|$)'
    usage_match = re.search(usage_pattern, text)
    usage = usage_match.group(1).strip() if usage_match else None

    indication_pattern = r'【適\s*應\s*症】[\t\s]*(.+?)(?=\n[\x00-\x1f]*처방|\n\x0c|$)'
    indication_match = re.search(indication_pattern, text, re.DOTALL)
    indication_text = indication_match.group(1).strip() if indication_match else ''
    # 제어문자 제거
    indication_text = re.sub(r'[\x00-\x1f]', ' ', indication_text).strip() if indication_text else ''

    # 처방설명 추출 (탭 문자로 구분)
    desc_pattern = r'처방설명[\t\s]+(.+?)(?=처방구성|처방비교|활용|만\s*금\s*탕|$)'
    desc_match = re.search(desc_pattern, text, re.DOTALL)
    description = desc_match.group(1).strip() if desc_match else ''

    # 처방구성 설명 추출
    comp_exp_pattern = r'처방구성[\t\s]+(.+?)(?=처방비교|활용|$)'
    comp_exp_match = re.search(comp_exp_pattern, text, re.DOTALL)
    composition_explanation = comp_exp_match.group(1).strip() if comp_exp_match else None

    # 처방비교 추출
    comp_text_pattern = r'처방비교[\t\s]+(.+?)(?=활용|만\s*금\s*탕|$)'
    comp_text_match = re.search(comp_text_pattern, text, re.DOTALL)
    comparison_text = comp_text_match.group(1).strip() if comp_text_match else ''

    # 파싱된 비교 정보
    comparisons = parse_comparisons(comparison_text)

    # 적응증 파싱
    indications = parse_indications(indication_text)

    # 구성 약재 파싱
    compositions = parse_composition_text(composition_text)

    # 치험례 파싱
    cases = parse_clinical_cases(text, f'{data_source}-{code}')

    # 검색 키워드 생성
    search_keywords = [name] + indications

    formula_id = f'{data_source}-{code.replace("統", "tong-")}'

    return {
        'id': formula_id,
        'name': name,
        'hanja': '',  # 한자는 별도 매핑 필요
        'code': code,
        'category': 'etc',
        'categoryLabel': '',
        'source': source_text,
        'originalText': None,
        'composition': compositions,
        'compositionText': composition_text,
        'usage': usage,
        'indications': indications,
        'indicationText': indication_text,
        'description': description[:2000] if description else '',  # 2000자 제한
        'mechanism': None,
        'compositionExplanation': composition_explanation[:1000] if composition_explanation else None,
        'comparisons': comparisons,
        'comparisonText': comparison_text[:1000] if comparison_text else None,
        'cases': cases,
        'contraindications': [],
        'cautions': [],
        'dataSource': data_source,
        'searchKeywords': search_keywords,
    }


def parse_bangyak_formula(text: str, data_source: str) -> Optional[Dict]:
    """방약합편 데이터 파싱"""

    # 처방 코드 및 이름 추출
    # 패턴: 中統1 寶  소속명탕 小續命湯
    code_pattern = r'([上中下]統\d+)\s*寶?\s*([가-힣]+(?:탕|산|환|음|단|고|원))\s*([一-龥]+(?:湯|散|丸|飮|丹|膏|元))?'
    match = re.search(code_pattern, text)

    if not match:
        return None

    code = match.group(1)
    name = match.group(2)
    hanja = match.group(3) or ''

    # 구성 추출
    composition_text = ''
    # 한자명 다음 줄에 구성이 옴
    comp_pattern = rf'{hanja if hanja else name}\s*\n\s*([一-龥\s薑炒酒洗各等分一二三四五六七八九十錢分兩半片枚]+)'
    comp_match = re.search(comp_pattern, text)
    if comp_match:
        composition_text = comp_match.group(1).strip()

    # 본문 설명 추출 (구성 다음부터 처방구성을 보면 전까지)
    desc_start = comp_match.end() if comp_match else 0
    desc_pattern = r'처방구성을 보면|처방비교|활용사례'
    desc_end_match = re.search(desc_pattern, text[desc_start:])
    description = text[desc_start:desc_start + desc_end_match.start()].strip() if desc_end_match else ''

    # 처방구성 설명 추출
    comp_exp_pattern = r'처방구성을 보면\s*(.+?)(?=\n\n[가-힣]+[와과] 비교하면|활용사례|$)'
    comp_exp_match = re.search(comp_exp_pattern, text, re.DOTALL)
    composition_explanation = comp_exp_match.group(1).strip() if comp_exp_match else None

    # 처방비교 추출
    comparison_text = ''
    comp_texts = re.findall(r'([가-힣]+[와과] 비교하면[^활]+)', text)
    if comp_texts:
        comparison_text = '\n'.join(comp_texts)

    comparisons = parse_comparisons(text)

    # 구성 약재 파싱
    compositions = parse_composition_text(composition_text)

    # 치험례 파싱
    cases = parse_clinical_cases(text, f'{data_source}-{code}')

    # 카테고리 추출 (主로 xxx하는 處方)
    category = 'etc'
    category_label = ''
    cat_pattern = r'主로\s*([補益解表清熱瀉元溫裏理水和解理氣理血祛痰疏風安蟲])[하는]'
    cat_match = re.search(cat_pattern, text)
    if cat_match:
        cat_text = cat_match.group(1)
        for key, value in BANGYAK_CATEGORIES.items():
            if key in cat_text:
                category = value
                category_label = f'主로 {key}하는 處方'
                break

    search_keywords = [name, hanja] if hanja else [name]

    formula_id = f'{data_source}-{code.replace("統", "tong-")}'

    return {
        'id': formula_id,
        'name': name,
        'hanja': hanja,
        'code': code,
        'category': category,
        'categoryLabel': category_label,
        'source': '方藥合編',
        'originalText': None,
        'composition': compositions,
        'compositionText': composition_text,
        'usage': None,
        'indications': [],
        'indicationText': None,
        'description': description[:2000] if description else '',
        'mechanism': None,
        'compositionExplanation': composition_explanation[:1000] if composition_explanation else None,
        'comparisons': comparisons,
        'comparisonText': comparison_text[:1000] if comparison_text else None,
        'cases': cases,
        'contraindications': [],
        'cautions': [],
        'dataSource': data_source,
        'searchKeywords': search_keywords,
    }


def split_into_formulas(content: str) -> List[str]:
    """전체 텍스트를 개별 처방 단위로 분리"""
    # 처방 코드 패턴으로 분리 (中統145 또는 中統 91 형식 모두 지원)
    pattern = r'(?=[上中下]統\s*\d+\s*寶)'
    parts = re.split(pattern, content)
    return [p.strip() for p in parts if p.strip() and re.search(r'[上中下]統\s*\d+', p)]


def parse_file(filepath: str, data_source: str) -> List[Dict]:
    """파일 파싱"""
    print(f"파싱 중: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    formulas = []
    formula_texts = split_into_formulas(content)

    print(f"  - 발견된 처방 수: {len(formula_texts)}")

    for text in formula_texts:
        if data_source.startswith('binyong'):
            formula = parse_binyong_formula(text, data_source)
        else:
            formula = parse_bangyak_formula(text, data_source)

        if formula:
            formulas.append(formula)

    print(f"  - 파싱 완료된 처방 수: {len(formulas)}")
    return formulas


def main():
    """메인 함수"""
    print("=" * 50)
    print("처방 데이터 파서 시작")
    print("=" * 50)

    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_PATH, exist_ok=True)

    all_formulas = []

    # 파일 매핑
    files = [
        ('binyong_101_extracted.txt', 'binyong101'),
        ('binyong_202_extracted.txt', 'binyong202'),
        ('bangyak_1_sangton_extracted.txt', 'bangyak_sangton'),
        ('bangyak_2_jungton_extracted.txt', 'bangyak_jungton'),
        ('bangyak_3_haton_extracted.txt', 'bangyak_haton'),
    ]

    for filename, data_source in files:
        filepath = os.path.join(DOCS_PATH, filename)
        if os.path.exists(filepath):
            formulas = parse_file(filepath, data_source)
            all_formulas.extend(formulas)

            # 개별 파일로도 저장
            output_file = os.path.join(OUTPUT_PATH, f'{data_source}.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(formulas, f, ensure_ascii=False, indent=2)
            print(f"  - 저장됨: {output_file}")
        else:
            print(f"파일 없음: {filepath}")

    # 전체 통합 파일 저장
    all_output = os.path.join(OUTPUT_PATH, 'all-formulas.json')
    with open(all_output, 'w', encoding='utf-8') as f:
        json.dump(all_formulas, f, ensure_ascii=False, indent=2)

    print("=" * 50)
    print(f"총 파싱된 처방 수: {len(all_formulas)}")
    print(f"통합 파일: {all_output}")
    print("=" * 50)

    return all_formulas


if __name__ == '__main__':
    main()
