import { useState } from 'react'
import {
  Search,
  MapPin,
  Filter,
  Zap,
  Target,
  Info,
  Ruler,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Acupoint {
  id: string
  code: string
  name: string
  hanja: string
  pinyin: string
  meridian: string
  meridianCode: string
  location: string
  depth: string
  angle: string
  indications: string[]
  techniques: string[]
  cautions?: string
  relatedPoints?: string[]
}

const meridians = [
  { code: 'LU', name: '수태음폐경', color: 'bg-gray-500' },
  { code: 'LI', name: '수양명대장경', color: 'bg-yellow-500' },
  { code: 'ST', name: '족양명위경', color: 'bg-yellow-600' },
  { code: 'SP', name: '족태음비경', color: 'bg-yellow-700' },
  { code: 'HT', name: '수소음심경', color: 'bg-red-500' },
  { code: 'SI', name: '수태양소장경', color: 'bg-red-600' },
  { code: 'BL', name: '족태양방광경', color: 'bg-blue-500' },
  { code: 'KI', name: '족소음신경', color: 'bg-blue-700' },
  { code: 'PC', name: '수궐음심포경', color: 'bg-purple-500' },
  { code: 'TE', name: '수소양삼초경', color: 'bg-purple-600' },
  { code: 'GB', name: '족소양담경', color: 'bg-green-500' },
  { code: 'LR', name: '족궐음간경', color: 'bg-green-700' },
  { code: 'GV', name: '독맥', color: 'bg-indigo-500' },
  { code: 'CV', name: '임맥', color: 'bg-pink-500' },
]

const symptomCategories = [
  '두통', '소화불량', '불면', '요통', '견비통', '월경통', '피로', '감기', '현훈', '구토', '변비', '심계', '이명', '비염', '천식'
]

const demoAcupoints: Acupoint[] = [
  // ===== 수태음폐경 (LU) =====
  {
    id: 'lu1',
    code: 'LU1',
    name: '중부',
    hanja: '中府',
    pinyin: 'Zhongfu',
    meridian: '수태음폐경',
    meridianCode: 'LU',
    location: '전흉부, 제1늑간, 전정중선 외측 6촌',
    depth: '0.5~0.8촌',
    angle: '사자(외하방)',
    indications: ['해수', '천식', '흉통', '견배통', '흉만'],
    techniques: ['사법', '평보평사'],
    cautions: '심자 금기 (폐손상)',
    relatedPoints: ['폐수(BL13)', '척택(LU5)'],
  },
  {
    id: 'lu5',
    code: 'LU5',
    name: '척택',
    hanja: '尺澤',
    pinyin: 'Chize',
    meridian: '수태음폐경',
    meridianCode: 'LU',
    location: '주횡문 상, 상완이두근건 요측 함요처',
    depth: '0.8~1.2촌',
    angle: '직자',
    indications: ['해수', '천식', '객혈', '인후종통', '흉만', '소아경풍', '주비'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '대추(GV14)'],
  },
  {
    id: 'lu7',
    code: 'LU7',
    name: '열결',
    hanja: '列缺',
    pinyin: 'Lieque',
    meridian: '수태음폐경',
    meridianCode: 'LU',
    location: '전완 요측, 요골경상돌기 상방 함요처, 완횡문 상 1.5촌',
    depth: '0.3~0.5촌',
    angle: '사자(상방)',
    indications: ['두통', '경항강통', '해수', '천식', '인후종통', '구안와사', '수완통'],
    techniques: ['보법', '사법'],
    relatedPoints: ['합곡(LI4)', '풍지(GB20)', '조해(KI6)'],
  },
  {
    id: 'lu9',
    code: 'LU9',
    name: '태연',
    hanja: '太淵',
    pinyin: 'Taiyuan',
    meridian: '수태음폐경',
    meridianCode: 'LU',
    location: '완횡문 요측단, 요골동맥 요측 함요처',
    depth: '0.3~0.5촌',
    angle: '직자',
    indications: ['해수', '천식', '객혈', '인후종통', '흉통', '무맥증'],
    techniques: ['보법'],
    cautions: '동맥 주의',
    relatedPoints: ['폐수(BL13)', '척택(LU5)'],
  },
  {
    id: 'lu11',
    code: 'LU11',
    name: '소상',
    hanja: '少商',
    pinyin: 'Shaoshang',
    meridian: '수태음폐경',
    meridianCode: 'LU',
    location: '무지 말절 요측, 조갑각에서 0.1촌',
    depth: '0.1촌 (점자)',
    angle: '직자',
    indications: ['인후종통', '비뉵', '발열', '중풍혼미', '전간', '수지마목'],
    techniques: ['점자 출혈', '사법'],
    relatedPoints: ['합곡(LI4)', '어제(LU10)'],
  },
  // ===== 수양명대장경 (LI) =====
  {
    id: 'li1',
    code: 'LI1',
    name: '상양',
    hanja: '商陽',
    pinyin: 'Shangyang',
    meridian: '수양명대장경',
    meridianCode: 'LI',
    location: '시지 말절 요측, 조갑각에서 0.1촌',
    depth: '0.1촌',
    angle: '직자 또는 점자',
    indications: ['인후종통', '치통', '이명', '열병', '혼미'],
    techniques: ['사법', '점자출혈'],
    relatedPoints: ['합곡(LI4)', '소상(LU11)'],
  },
  {
    id: 'li4',
    code: 'LI4',
    name: '합곡',
    hanja: '合谷',
    pinyin: 'Hegu',
    meridian: '수양명대장경',
    meridianCode: 'LI',
    location: '수배부, 제1·2중수골 사이, 제2중수골 중점의 요측',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['두통', '치통', '인후종통', '발열', '무한', '다한', '경폐', '체통', '구안와사', '반신불수', '눈병', '비염'],
    techniques: ['보법', '사법', '온침', '뜸'],
    cautions: '임신부 금침',
    relatedPoints: ['곡지(LI11)', '열결(LU7)', '태충(LR3)'],
  },
  {
    id: 'li10',
    code: 'LI10',
    name: '수삼리',
    hanja: '手三里',
    pinyin: 'Shousanli',
    meridian: '수양명대장경',
    meridianCode: 'LI',
    location: '전완 배면, 양계에서 곡지까지 2촌',
    depth: '0.8~1.2촌',
    angle: '직자',
    indications: ['치통', '견비통', '상지불수', '복통', '설사', '편두통'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['곡지(LI11)', '합곡(LI4)'],
  },
  {
    id: 'li11',
    code: 'LI11',
    name: '곡지',
    hanja: '曲池',
    pinyin: 'Quchi',
    meridian: '수양명대장경',
    meridianCode: 'LI',
    location: '주관절 외측, 척택과 외측상과 연결선 중점',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['발열', '인후종통', '눈병', '치통', '두통', '현훈', '고혈압', '피부병', '상지마비', '복통', '설사'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['합곡(LI4)', '외관(TE5)', '혈해(SP10)'],
  },
  {
    id: 'li15',
    code: 'LI15',
    name: '견우',
    hanja: '肩髃',
    pinyin: 'Jianyu',
    meridian: '수양명대장경',
    meridianCode: 'LI',
    location: '견봉 전하방, 삼각근 상부',
    depth: '0.8~1.5촌',
    angle: '직자 또는 사자',
    indications: ['견비통', '상지불수', '반신불수', '풍습비', '두드러기'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['견료(TE14)', '곡지(LI11)'],
  },
  {
    id: 'li20',
    code: 'LI20',
    name: '영향',
    hanja: '迎香',
    pinyin: 'Yingxiang',
    meridian: '수양명대장경',
    meridianCode: 'LI',
    location: '비익 외측, 비순구 중점',
    depth: '0.3~0.5촌',
    angle: '사자(상내방)',
    indications: ['비색', '비연', '비뉵', '구안와사', '면양', '담도회충증'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '인당(EX-HN3)'],
  },
  // ===== 족양명위경 (ST) =====
  {
    id: 'st2',
    code: 'ST2',
    name: '사백',
    hanja: '四白',
    pinyin: 'Sibai',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '안면부, 동공 직하방, 안와하공 함요처',
    depth: '0.2~0.3촌',
    angle: '직자',
    indications: ['눈병', '구안와사', '두통', '현훈', '삼차신경통'],
    techniques: ['사법'],
    cautions: '심자 금기',
    relatedPoints: ['합곡(LI4)', '태양(EX-HN5)'],
  },
  {
    id: 'st6',
    code: 'ST6',
    name: '협거',
    hanja: '頰車',
    pinyin: 'Jiache',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '하악각 전상방, 교근 융기처',
    depth: '0.3~0.5촌',
    angle: '직자 또는 사자',
    indications: ['구안와사', '치통', '하악통', '아관긴급', '경항강통'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '하관(ST7)'],
  },
  {
    id: 'st7',
    code: 'ST7',
    name: '하관',
    hanja: '下關',
    pinyin: 'Xiaguan',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '이전방, 관골궁 하연, 하악골과상돌기 함요처',
    depth: '0.3~0.5촌',
    angle: '직자',
    indications: ['이농', '이명', '치통', '구안와사', '아관긴급'],
    techniques: ['사법'],
    relatedPoints: ['협거(ST6)', '청궁(SI19)'],
  },
  {
    id: 'st8',
    code: 'ST8',
    name: '두유',
    hanja: '頭維',
    pinyin: 'Touwei',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '두부, 이마모서리 위 0.5촌, 두유발제 내측',
    depth: '0.5~1촌',
    angle: '평자',
    indications: ['두통', '현훈', '눈병', '다루'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '태양(EX-HN5)'],
  },
  {
    id: 'st25',
    code: 'ST25',
    name: '천추',
    hanja: '天樞',
    pinyin: 'Tianshu',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '복부, 배꼽 외측 2촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['복통', '복창', '설사', '변비', '이질', '월경불조', '수종'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['족삼리(ST36)', '상거허(ST37)'],
  },
  {
    id: 'st36',
    code: 'ST36',
    name: '족삼리',
    hanja: '足三里',
    pinyin: 'Zusanli',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '슬개골 아래 3촌, 경골 외측 1횡지',
    depth: '1~2촌',
    angle: '직자',
    indications: ['위통', '구토', '복창', '설사', '변비', '소화불량', '하지마비', '각기', '허로', '수종', '중풍', '전간'],
    techniques: ['보법', '사법', '온침', '뜸'],
    relatedPoints: ['중완(CV12)', '내관(PC6)', '합곡(LI4)'],
  },
  {
    id: 'st37',
    code: 'ST37',
    name: '상거허',
    hanja: '上巨虛',
    pinyin: 'Shangjuxu',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '족삼리 아래 3촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['복통', '설사', '이질', '장옹', '하지마비'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['족삼리(ST36)', '천추(ST25)'],
  },
  {
    id: 'st40',
    code: 'ST40',
    name: '풍륭',
    hanja: '豊隆',
    pinyin: 'Fenglong',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '외과첨 상 8촌, 경골 외측 2횡지',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['담음', '해수', '천식', '두통', '현훈', '전간', '하지마비', '변비'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['족삼리(ST36)', '중완(CV12)', '폐수(BL13)'],
  },
  {
    id: 'st44',
    code: 'ST44',
    name: '내정',
    hanja: '內庭',
    pinyin: 'Neiting',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '족배부, 제2·3지 사이, 지간접합부 후방',
    depth: '0.3~0.5촌',
    angle: '직자 또는 사자',
    indications: ['치통', '인후종통', '비뉵', '위통', '복창', '설사', '열병', '족배종통'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '족삼리(ST36)'],
  },
  // ===== 족태음비경 (SP) =====
  {
    id: 'sp3',
    code: 'SP3',
    name: '태백',
    hanja: '太白',
    pinyin: 'Taibai',
    meridian: '족태음비경',
    meridianCode: 'SP',
    location: '족내측, 제1중족골두 후하방 적백육제',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['위통', '복창', '구토', '설사', '변비', '각기', '체중절통'],
    techniques: ['보법', '사법'],
    relatedPoints: ['족삼리(ST36)', '공손(SP4)'],
  },
  {
    id: 'sp4',
    code: 'SP4',
    name: '공손',
    hanja: '公孫',
    pinyin: 'Gongsun',
    meridian: '족태음비경',
    meridianCode: 'SP',
    location: '족내측, 제1중족골 기저부 전하연',
    depth: '0.6~1촌',
    angle: '직자',
    indications: ['위통', '구토', '복통', '설사', '심통', '불면', '전간', '각기'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['내관(PC6)', '족삼리(ST36)'],
  },
  {
    id: 'sp6',
    code: 'SP6',
    name: '삼음교',
    hanja: '三陰交',
    pinyin: 'Sanyinjiao',
    meridian: '족태음비경',
    meridianCode: 'SP',
    location: '경골 내측면, 내과첨 상 3촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['장명', '복창', '설사', '월경불조', '붕루', '대하', '음정', '유정', '소변불리', '불면', '현훈', '하지마비'],
    techniques: ['보법', '사법', '뜸'],
    cautions: '임신부 금침',
    relatedPoints: ['족삼리(ST36)', '혈해(SP10)', '관원(CV4)'],
  },
  {
    id: 'sp9',
    code: 'SP9',
    name: '음릉천',
    hanja: '陰陵泉',
    pinyin: 'Yinlingquan',
    meridian: '족태음비경',
    meridianCode: 'SP',
    location: '경골 내측과 후하방 함요처',
    depth: '1~2촌',
    angle: '직자',
    indications: ['복창', '수종', '소변불리', '유뇨', '슬통', '설사', '황달'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['삼음교(SP6)', '족삼리(ST36)'],
  },
  {
    id: 'sp10',
    code: 'SP10',
    name: '혈해',
    hanja: '血海',
    pinyin: 'Xuehai',
    meridian: '족태음비경',
    meridianCode: 'SP',
    location: '대퇴내측, 슬개골 내측상방 2촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['월경불조', '붕루', '경폐', '풍진', '습진', '슬통', '고관절통'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['삼음교(SP6)', '곡지(LI11)'],
  },
  // ===== 수소음심경 (HT) =====
  {
    id: 'ht3',
    code: 'HT3',
    name: '소해',
    hanja: '少海',
    pinyin: 'Shaohai',
    meridian: '수소음심경',
    meridianCode: 'HT',
    location: '주횡문 내측단, 상완골내측상과 전면',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['심통', '주비', '상완통', '수전', '건망', '전간'],
    techniques: ['보법', '사법'],
    relatedPoints: ['신문(HT7)', '내관(PC6)'],
  },
  {
    id: 'ht5',
    code: 'HT5',
    name: '통리',
    hanja: '通里',
    pinyin: 'Tongli',
    meridian: '수소음심경',
    meridianCode: 'HT',
    location: '전완 전면, 완횡문 상 1촌, 척측수근굴근건 요측',
    depth: '0.3~0.5촌',
    angle: '직자',
    indications: ['심계', '혀가 뻣뻣함', '설강불리', '완비', '현훈'],
    techniques: ['보법', '사법'],
    relatedPoints: ['신문(HT7)'],
  },
  {
    id: 'ht7',
    code: 'HT7',
    name: '신문',
    hanja: '神門',
    pinyin: 'Shenmen',
    meridian: '수소음심경',
    meridianCode: 'HT',
    location: '완횡문 척측단, 두상골 요측 함요처',
    depth: '0.3~0.5촌',
    angle: '직자',
    indications: ['심통', '심계', '불면', '건망', '전간', '치매', '울증', '히스테리'],
    techniques: ['보법', '사법'],
    relatedPoints: ['내관(PC6)', '백회(GV20)', '삼음교(SP6)'],
  },
  // ===== 수태양소장경 (SI) =====
  {
    id: 'si3',
    code: 'SI3',
    name: '후계',
    hanja: '後谿',
    pinyin: 'Houxi',
    meridian: '수태양소장경',
    meridianCode: 'SI',
    location: '수척측, 제5중수지관절 후방 척측 적백육제',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['두통', '경항강통', '요배통', '전간', '학질', '이명', '눈병'],
    techniques: ['사법'],
    relatedPoints: ['신맥(BL62)', '합곡(LI4)'],
  },
  {
    id: 'si6',
    code: 'SI6',
    name: '양로',
    hanja: '養老',
    pinyin: 'Yanglao',
    meridian: '수태양소장경',
    meridianCode: 'SI',
    location: '전완 배면, 척골두 요측 함요처',
    depth: '0.3~0.5촌',
    angle: '직자 또는 사자',
    indications: ['목훈', '견비완통', '요통', '낙침'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '곡지(LI11)'],
  },
  {
    id: 'si19',
    code: 'SI19',
    name: '청궁',
    hanja: '聽宮',
    pinyin: 'Tinggong',
    meridian: '수태양소장경',
    meridianCode: 'SI',
    location: '이전방, 이주 중앙 전방, 하악골과상돌기 후연 함요처',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['이롱', '이명', '이농', '치통', '전간'],
    techniques: ['사법'],
    relatedPoints: ['예풍(TE17)', '하관(ST7)'],
  },
  // ===== 족태양방광경 (BL) =====
  {
    id: 'bl2',
    code: 'BL2',
    name: '찬죽',
    hanja: '攢竹',
    pinyin: 'Zanzhu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '안면부, 미두 함요처',
    depth: '0.3~0.5촌',
    angle: '사자(하방) 또는 평자',
    indications: ['두통', '눈병', '딸꾹질', '면통', '미릉골통'],
    techniques: ['사법'],
    cautions: '심자 금기',
    relatedPoints: ['태양(EX-HN5)', '합곡(LI4)'],
  },
  {
    id: 'bl10',
    code: 'BL10',
    name: '천주',
    hanja: '天柱',
    pinyin: 'Tianzhu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '후두부, 승모근 외연, 후발제 내, 아문 외측 1.3촌',
    depth: '0.5~0.8촌',
    angle: '직자 또는 사자',
    indications: ['두통', '경항강통', '인후종통', '비색', '전간', '히스테리'],
    techniques: ['사법'],
    cautions: '심자 금기',
    relatedPoints: ['풍지(GB20)', '풍부(GV16)'],
  },
  {
    id: 'bl11',
    code: 'BL11',
    name: '대저',
    hanja: '大杼',
    pinyin: 'Dazhu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제1흉추극돌기 하 외측 1.5촌',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['해수', '발열', '두통', '경항강통', '골증조열'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['대추(GV14)', '폐수(BL13)'],
  },
  {
    id: 'bl13',
    code: 'BL13',
    name: '폐수',
    hanja: '肺俞',
    pinyin: 'Feishu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제3흉추극돌기 하 외측 1.5촌',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['해수', '천식', '객혈', '폐결핵', '골증조열', '도한'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['태연(LU9)', '중부(LU1)'],
  },
  {
    id: 'bl15',
    code: 'BL15',
    name: '심수',
    hanja: '心俞',
    pinyin: 'Xinshu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제5흉추극돌기 하 외측 1.5촌',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['심통', '심계', '불면', '건망', '전간', '해수', '토혈'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['신문(HT7)', '내관(PC6)'],
  },
  {
    id: 'bl17',
    code: 'BL17',
    name: '격수',
    hanja: '膈俞',
    pinyin: 'Geshu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제7흉추극돌기 하 외측 1.5촌',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['구토', '딸꾹질', '천식', '해수', '토혈', '빈혈', '야맹증'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['혈해(SP10)', '삼음교(SP6)'],
  },
  {
    id: 'bl18',
    code: 'BL18',
    name: '간수',
    hanja: '肝俞',
    pinyin: 'Ganshu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제9흉추극돌기 하 외측 1.5촌',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['황달', '협통', '토혈', '비뉵', '눈병', '현훈', '전간', '정신병'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['태충(LR3)', '기문(LR14)'],
  },
  {
    id: 'bl20',
    code: 'BL20',
    name: '비수',
    hanja: '脾俞',
    pinyin: 'Pishu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제11흉추극돌기 하 외측 1.5촌',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['복창', '황달', '구토', '설사', '이질', '수종', '식욕부진'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['족삼리(ST36)', '삼음교(SP6)'],
  },
  {
    id: 'bl21',
    code: 'BL21',
    name: '위수',
    hanja: '胃俞',
    pinyin: 'Weishu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제12흉추극돌기 하 외측 1.5촌',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['위통', '구토', '복창', '장명', '소아감질'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['중완(CV12)', '족삼리(ST36)'],
  },
  {
    id: 'bl23',
    code: 'BL23',
    name: '신수',
    hanja: '腎俞',
    pinyin: 'Shenshu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제2요추극돌기 하 외측 1.5촌',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['유정', '양위', '월경불조', '대하', '소변불리', '수종', '요통', '이명', '이롱'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['관원(CV4)', '태계(KI3)', '명문(GV4)'],
  },
  {
    id: 'bl25',
    code: 'BL25',
    name: '대장수',
    hanja: '大腸俞',
    pinyin: 'Dachangshu',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '제4요추극돌기 하 외측 1.5촌',
    depth: '0.8~1.2촌',
    angle: '직자',
    indications: ['복창', '설사', '변비', '요통', '좌골신경통'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['천추(ST25)', '상거허(ST37)'],
  },
  {
    id: 'bl40',
    code: 'BL40',
    name: '위중',
    hanja: '委中',
    pinyin: 'Weizhong',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '슬와횡문 중앙',
    depth: '1~1.5촌 또는 점자출혈',
    angle: '직자',
    indications: ['요통', '하지마비', '슬통', '복통', '구토', '설사', '소변불리', '열병', '피부병'],
    techniques: ['사법', '점자출혈'],
    relatedPoints: ['신수(BL23)', '곤륜(BL60)'],
  },
  {
    id: 'bl57',
    code: 'BL57',
    name: '승산',
    hanja: '承山',
    pinyin: 'Chengshan',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '비복근 양두 사이, 위중과 곤륜 연결선 중점',
    depth: '1~2촌',
    angle: '직자',
    indications: ['치질', '탈항', '변비', '요배통', '하지마비', '비복근경련', '각기'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['위중(BL40)', '곤륜(BL60)'],
  },
  {
    id: 'bl60',
    code: 'BL60',
    name: '곤륜',
    hanja: '崑崙',
    pinyin: 'Kunlun',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '외과첨과 아킬레스건 사이 함요처',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['두통', '경항강통', '요천통', '좌골신경통', '슬통', '족근통', '난산', '전간'],
    techniques: ['사법', '뜸'],
    cautions: '임신부 금침',
    relatedPoints: ['후계(SI3)', '태계(KI3)'],
  },
  {
    id: 'bl62',
    code: 'BL62',
    name: '신맥',
    hanja: '申脈',
    pinyin: 'Shenmai',
    meridian: '족태양방광경',
    meridianCode: 'BL',
    location: '외과첨 직하 함요처',
    depth: '0.3~0.5촌',
    angle: '직자',
    indications: ['두통', '현훈', '불면', '전간', '요퇴통', '족근통'],
    techniques: ['사법'],
    relatedPoints: ['후계(SI3)', '조해(KI6)'],
  },
  // ===== 족소음신경 (KI) =====
  {
    id: 'ki1',
    code: 'KI1',
    name: '용천',
    hanja: '湧泉',
    pinyin: 'Yongquan',
    meridian: '족소음신경',
    meridianCode: 'KI',
    location: '족저, 제2·3지간 연접부와 족저 후연 연결선 전 1/3',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['두정통', '현훈', '혼미', '전간', '소아경풍', '인후종통', '대소변곤란', '발열'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['백회(GV20)', '인중(GV26)'],
  },
  {
    id: 'ki3',
    code: 'KI3',
    name: '태계',
    hanja: '太谿',
    pinyin: 'Taixi',
    meridian: '족소음신경',
    meridianCode: 'KI',
    location: '내과첨과 아킬레스건 사이 함요처',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['이명', '이롱', '인후종통', '치통', '해수', '천식', '객혈', '불면', '유정', '양위', '월경불조', '요통'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['신수(BL23)', '관원(CV4)'],
  },
  {
    id: 'ki6',
    code: 'KI6',
    name: '조해',
    hanja: '照海',
    pinyin: 'Zhaohai',
    meridian: '족소음신경',
    meridianCode: 'KI',
    location: '내과첨 직하 1촌 함요처',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['인후건통', '월경불조', '음정', '소변빈삭', '전간', '불면', '변비'],
    techniques: ['보법'],
    relatedPoints: ['열결(LU7)', '삼음교(SP6)'],
  },
  {
    id: 'ki7',
    code: 'KI7',
    name: '복류',
    hanja: '復溜',
    pinyin: 'Fuliu',
    meridian: '족소음신경',
    meridianCode: 'KI',
    location: '내과첨 상 2촌, 아킬레스건 전연',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['수종', '복창', '설사', '자한', '도한', '요척통', '하지위비'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['태계(KI3)', '합곡(LI4)'],
  },
  // ===== 수궐음심포경 (PC) =====
  {
    id: 'pc3',
    code: 'PC3',
    name: '곡택',
    hanja: '曲澤',
    pinyin: 'Quze',
    meridian: '수궐음심포경',
    meridianCode: 'PC',
    location: '주횡문 상, 상완이두근건 척측',
    depth: '0.8~1촌 또는 점자출혈',
    angle: '직자',
    indications: ['심통', '심계', '위통', '구토', '열병', '주비', '상완통'],
    techniques: ['사법', '점자출혈'],
    relatedPoints: ['내관(PC6)', '척택(LU5)'],
  },
  {
    id: 'pc6',
    code: 'PC6',
    name: '내관',
    hanja: '內關',
    pinyin: 'Neiguan',
    meridian: '수궐음심포경',
    meridianCode: 'PC',
    location: '전완 전면, 완횡문 상 2촌, 장장근건과 요측수근굴근건 사이',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['심통', '심계', '흉민', '구토', '위통', '불면', '전간', '울증', '눈병', '히스테리', '멀미'],
    techniques: ['보법', '사법', '온침'],
    relatedPoints: ['족삼리(ST36)', '중완(CV12)', '신문(HT7)', '공손(SP4)'],
  },
  {
    id: 'pc8',
    code: 'PC8',
    name: '노궁',
    hanja: '勞宮',
    pinyin: 'Laogong',
    meridian: '수궐음심포경',
    meridianCode: 'PC',
    location: '수장부, 제2·3중수골 사이, 제3중수지관절 근위',
    depth: '0.3~0.5촌',
    angle: '직자',
    indications: ['심통', '전간', '구토', '구창', '구취', '수장다한'],
    techniques: ['사법'],
    relatedPoints: ['신문(HT7)', '내관(PC6)'],
  },
  // ===== 수소양삼초경 (TE) =====
  {
    id: 'te3',
    code: 'TE3',
    name: '중저',
    hanja: '中渚',
    pinyin: 'Zhongzhu',
    meridian: '수소양삼초경',
    meridianCode: 'TE',
    location: '수배부, 제4·5중수골 사이, 제4중수지관절 후방',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['두통', '이명', '이롱', '인후종통', '견비통', '수지굴신불리'],
    techniques: ['사법'],
    relatedPoints: ['외관(TE5)', '예풍(TE17)'],
  },
  {
    id: 'te5',
    code: 'TE5',
    name: '외관',
    hanja: '外關',
    pinyin: 'Waiguan',
    meridian: '수소양삼초경',
    meridianCode: 'TE',
    location: '전완 배면, 완횡문 상 2촌, 요골과 척골 사이',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['발열', '두통', '이명', '이롱', '협통', '상지마비', '수지동통', '변비'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '곡지(LI11)', '내관(PC6)'],
  },
  {
    id: 'te14',
    code: 'TE14',
    name: '견료',
    hanja: '肩髎',
    pinyin: 'Jianliao',
    meridian: '수소양삼초경',
    meridianCode: 'TE',
    location: '견봉 후하방 함요처, 견우 후방 약 1촌',
    depth: '0.5~1촌',
    angle: '직자 또는 사자',
    indications: ['견비통', '상지불수'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['견우(LI15)', '견정(SI9)'],
  },
  {
    id: 'te17',
    code: 'TE17',
    name: '예풍',
    hanja: '翳風',
    pinyin: 'Yifeng',
    meridian: '수소양삼초경',
    meridianCode: 'TE',
    location: '이수 후방, 유양돌기와 하악각 사이 함요처',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['이명', '이롱', '이농', '구안와사', '치통', '하악통', '경항강통'],
    techniques: ['사법'],
    relatedPoints: ['청궁(SI19)', '풍지(GB20)'],
  },
  {
    id: 'te23',
    code: 'TE23',
    name: '사죽공',
    hanja: '絲竹空',
    pinyin: 'Sizhukong',
    meridian: '수소양삼초경',
    meridianCode: 'TE',
    location: '안면부, 미모 외측단 함요처',
    depth: '0.3~0.5촌',
    angle: '평자(후방)',
    indications: ['두통', '눈병', '면통', '전간'],
    techniques: ['사법'],
    cautions: '심자 금기',
    relatedPoints: ['태양(EX-HN5)', '찬죽(BL2)'],
  },
  // ===== 족소양담경 (GB) =====
  {
    id: 'gb1',
    code: 'GB1',
    name: '동자료',
    hanja: '瞳子髎',
    pinyin: 'Tongziliao',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '안면부, 외자 외측 0.5촌 함요처',
    depth: '0.3~0.5촌',
    angle: '사자(후방) 또는 평자',
    indications: ['두통', '눈병', '구안와사'],
    techniques: ['사법'],
    relatedPoints: ['태양(EX-HN5)', '합곡(LI4)'],
  },
  {
    id: 'gb2',
    code: 'GB2',
    name: '청회',
    hanja: '聽會',
    pinyin: 'Tinghui',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '이전방, 이주간절흔 전방, 하악골과상돌기 후연',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['이명', '이롱', '이농', '치통', '구안와사', '하악통'],
    techniques: ['사법'],
    relatedPoints: ['청궁(SI19)', '예풍(TE17)'],
  },
  {
    id: 'gb8',
    code: 'GB8',
    name: '솔곡',
    hanja: '率谷',
    pinyin: 'Shuaigu',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '이첨 직상 발제 상 1.5촌',
    depth: '0.5~0.8촌',
    angle: '평자',
    indications: ['편두통', '현훈', '구토', '소아경풍'],
    techniques: ['사법'],
    relatedPoints: ['두유(ST8)', '풍지(GB20)'],
  },
  {
    id: 'gb14',
    code: 'GB14',
    name: '양백',
    hanja: '陽白',
    pinyin: 'Yangbai',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '전두부, 미상연 중점 직상 1촌',
    depth: '0.3~0.5촌',
    angle: '평자(하방)',
    indications: ['두통', '눈병', '안면신경마비', '안검경련'],
    techniques: ['사법'],
    relatedPoints: ['찬죽(BL2)', '태양(EX-HN5)'],
  },
  {
    id: 'gb20',
    code: 'GB20',
    name: '풍지',
    hanja: '風池',
    pinyin: 'Fengchi',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '후두부, 유돌 아래, 승모근과 흉쇄유돌근 사이 함요처',
    depth: '0.8~1.2촌',
    angle: '코끝 방향 사자',
    indications: ['두통', '현훈', '경항강통', '목적종통', '비색', '비연', '이명', '중풍', '감모', '전간', '고혈압'],
    techniques: ['사법', '평보평사'],
    cautions: '심자 금기',
    relatedPoints: ['백회(GV20)', '합곡(LI4)', '태양(EX-HN5)'],
  },
  {
    id: 'gb21',
    code: 'GB21',
    name: '견정',
    hanja: '肩井',
    pinyin: 'Jianjing',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '견부, 대추와 견봉 연결선 중점',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['두통', '경항강통', '견배통', '상지불수', '난산', '유옹', '나력'],
    techniques: ['사법', '뜸'],
    cautions: '심자 금기 (기흉), 임신부 금침',
    relatedPoints: ['견우(LI15)', '곡지(LI11)'],
  },
  {
    id: 'gb30',
    code: 'GB30',
    name: '환도',
    hanja: '環跳',
    pinyin: 'Huantiao',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '둔부, 대전자와 천골열공 연결선 외측 1/3',
    depth: '2~3촌',
    angle: '직자',
    indications: ['요퇴통', '좌골신경통', '하지마비', '풍습비', '중풍'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['위중(BL40)', '양릉천(GB34)'],
  },
  {
    id: 'gb34',
    code: 'GB34',
    name: '양릉천',
    hanja: '陽陵泉',
    pinyin: 'Yanglingquan',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '비골두 전하방 함요처',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['협통', '구고', '구토', '황달', '슬통', '하지마비', '각기', '근경련'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['족삼리(ST36)', '음릉천(SP9)'],
  },
  {
    id: 'gb39',
    code: 'GB39',
    name: '현종',
    hanja: '懸鍾',
    pinyin: 'Xuanzhong',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '외과첨 상 3촌, 비골 전연',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['반신불수', '경항강통', '흉협창통', '슬통', '하지마비', '각기', '치매'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['양릉천(GB34)', '삼음교(SP6)'],
  },
  {
    id: 'gb41',
    code: 'GB41',
    name: '족임읍',
    hanja: '足臨泣',
    pinyin: 'Zulinqi',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '족배부, 제4·5중족골 접합부 후방',
    depth: '0.3~0.5촌',
    angle: '직자',
    indications: ['두통', '현훈', '눈병', '유옹', '협통', '월경불조', '족배종통'],
    techniques: ['사법'],
    relatedPoints: ['외관(TE5)', '풍지(GB20)'],
  },
  // ===== 족궐음간경 (LR) =====
  {
    id: 'lr2',
    code: 'LR2',
    name: '행간',
    hanja: '行間',
    pinyin: 'Xingjian',
    meridian: '족궐음간경',
    meridianCode: 'LR',
    location: '족배부, 제1·2지 사이, 지간접합부 후방 적백육제',
    depth: '0.5~0.8촌',
    angle: '사자(상방)',
    indications: ['두통', '현훈', '눈병', '협통', '월경불조', '붕루', '소변불리', '전간', '소아경풍'],
    techniques: ['사법'],
    relatedPoints: ['태충(LR3)', '합곡(LI4)'],
  },
  {
    id: 'lr3',
    code: 'LR3',
    name: '태충',
    hanja: '太衝',
    pinyin: 'Taichong',
    meridian: '족궐음간경',
    meridianCode: 'LR',
    location: '족배부, 제1·2중족골 접합부 앞 함몰처',
    depth: '0.5~1촌',
    angle: '직자 또는 사자',
    indications: ['두통', '현훈', '목적종통', '협통', '월경불조', '붕루', '소변불리', '전간', '소아경풍', '고혈압', '불면'],
    techniques: ['보법', '사법'],
    relatedPoints: ['합곡(LI4)', '백회(GV20)', '풍지(GB20)'],
  },
  {
    id: 'lr8',
    code: 'LR8',
    name: '곡천',
    hanja: '曲泉',
    pinyin: 'Ququan',
    meridian: '족궐음간경',
    meridianCode: 'LR',
    location: '슬횡문 내측단, 반건양근건 내측 함요처',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['소변불리', '유뇨', '음양', '양위', '음정', '대하', '슬통', '하지마비'],
    techniques: ['보법', '사법'],
    relatedPoints: ['삼음교(SP6)', '음릉천(SP9)'],
  },
  {
    id: 'lr14',
    code: 'LR14',
    name: '기문',
    hanja: '期門',
    pinyin: 'Qimen',
    meridian: '족궐음간경',
    meridianCode: 'LR',
    location: '흉부, 유두 직하, 제6늑간',
    depth: '0.5~0.8촌',
    angle: '사자',
    indications: ['흉협통', '구토', '딸꾹질', '토산', '황달', '유옹'],
    techniques: ['사법', '뜸'],
    cautions: '심자 금기 (기흉)',
    relatedPoints: ['간수(BL18)', '태충(LR3)'],
  },
  // ===== 독맥 (GV) =====
  {
    id: 'gv4',
    code: 'GV4',
    name: '명문',
    hanja: '命門',
    pinyin: 'Mingmen',
    meridian: '독맥',
    meridianCode: 'GV',
    location: '요부, 제2요추극돌기 하',
    depth: '0.5~1촌',
    angle: '사자(상방)',
    indications: ['요통', '유정', '양위', '대하', '월경불조', '설사', '소아발육부진'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['신수(BL23)', '관원(CV4)'],
  },
  {
    id: 'gv14',
    code: 'GV14',
    name: '대추',
    hanja: '大椎',
    pinyin: 'Dazhui',
    meridian: '독맥',
    meridianCode: 'GV',
    location: '경부, 제7경추극돌기 하',
    depth: '0.5~1촌',
    angle: '사자(상방)',
    indications: ['발열', '학질', '해수', '천식', '두통', '경항강통', '중풍', '전간', '골증조열'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['풍지(GB20)', '합곡(LI4)', '곡지(LI11)'],
  },
  {
    id: 'gv16',
    code: 'GV16',
    name: '풍부',
    hanja: '風府',
    pinyin: 'Fengfu',
    meridian: '독맥',
    meridianCode: 'GV',
    location: '후두부, 후발제 직상 1촌, 외후두융기 직하 함요처',
    depth: '0.5~1촌',
    angle: '직자(턱 방향)',
    indications: ['두통', '경항강통', '현훈', '인후종통', '실어', '중풍', '전간'],
    techniques: ['사법'],
    cautions: '심자 금기 (연수손상)',
    relatedPoints: ['풍지(GB20)', '백회(GV20)'],
  },
  {
    id: 'gv20',
    code: 'GV20',
    name: '백회',
    hanja: '百會',
    pinyin: 'Baihui',
    meridian: '독맥',
    meridianCode: 'GV',
    location: '정수리, 전정중선 상, 전발제에서 5촌',
    depth: '0.5~1촌',
    angle: '평자(후방향)',
    indications: ['두통', '현훈', '중풍', '불면', '건망', '탈항', '자궁탈수', '이명', '고혈압', '정신병'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['풍지(GB20)', '태양(EX-HN5)', '인당(EX-HN3)'],
  },
  {
    id: 'gv23',
    code: 'GV23',
    name: '상성',
    hanja: '上星',
    pinyin: 'Shangxing',
    meridian: '독맥',
    meridianCode: 'GV',
    location: '두부, 전정중선 상, 전발제에서 1촌',
    depth: '0.5~0.8촌',
    angle: '평자(후방)',
    indications: ['두통', '눈병', '비색', '비연', '비뉵', '전간'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['인당(EX-HN3)', '합곡(LI4)'],
  },
  {
    id: 'gv26',
    code: 'GV26',
    name: '인중',
    hanja: '人中',
    pinyin: 'Renzhong',
    meridian: '독맥',
    meridianCode: 'GV',
    location: '안면부, 인중구 상 1/3',
    depth: '0.3~0.5촌',
    angle: '사자(상방)',
    indications: ['혼미', '전간', '중풍', '구안와사', '요척통', '급성요좌', '소아경풍', '히스테리'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '백회(GV20)', '용천(KI1)'],
  },
  // ===== 임맥 (CV) =====
  {
    id: 'cv3',
    code: 'CV3',
    name: '중극',
    hanja: '中極',
    pinyin: 'Zhongji',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '복부, 전정중선 상, 배꼽 아래 4촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['유뇨', '소변불리', '유정', '양위', '월경불조', '대하', '붕루', '불임'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['관원(CV4)', '삼음교(SP6)'],
  },
  {
    id: 'cv4',
    code: 'CV4',
    name: '관원',
    hanja: '關元',
    pinyin: 'Guanyuan',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '복부, 전정중선 상, 배꼽 아래 3촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['유정', '양위', '월경불조', '붕루', '대하', '요통', '설사', '탈항', '허로', '유뇨', '빈뇨'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['기해(CV6)', '신궐(CV8)', '삼음교(SP6)'],
  },
  {
    id: 'cv6',
    code: 'CV6',
    name: '기해',
    hanja: '氣海',
    pinyin: 'Qihai',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '복부, 전정중선 상, 배꼽 아래 1.5촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['복통', '설사', '변비', '유뇨', '유정', '양위', '월경불조', '허탈', '중풍탈증'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['관원(CV4)', '족삼리(ST36)'],
  },
  {
    id: 'cv8',
    code: 'CV8',
    name: '신궐',
    hanja: '神闕',
    pinyin: 'Shenque',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '복부, 배꼽 중앙',
    depth: '금침',
    angle: '-',
    indications: ['복통', '설사', '탈항', '수종', '중풍탈증', '허탈'],
    techniques: ['뜸 (침 금기)'],
    cautions: '침 금기',
    relatedPoints: ['관원(CV4)', '기해(CV6)'],
  },
  {
    id: 'cv12',
    code: 'CV12',
    name: '중완',
    hanja: '中脘',
    pinyin: 'Zhongwan',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '복부, 전정중선 상, 배꼽 위 4촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['위통', '구토', '딸꾹질', '복창', '설사', '황달', '전간'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['족삼리(ST36)', '내관(PC6)', '비수(BL20)'],
  },
  {
    id: 'cv17',
    code: 'CV17',
    name: '전중',
    hanja: '膻中',
    pinyin: 'Tanzhong',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '흉부, 전정중선 상, 양 유두 연결선 중점',
    depth: '0.3~0.5촌',
    angle: '평자(하방)',
    indications: ['흉민', '심통', '해수', '천식', '유옹', '유즙불행', '딸꾹질'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['내관(PC6)', '폐수(BL13)'],
  },
  {
    id: 'cv22',
    code: 'CV22',
    name: '천돌',
    hanja: '天突',
    pinyin: 'Tiantu',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '경부, 흉골상연 중앙 함요처',
    depth: '0.3~0.5촌 (하방 사자)',
    angle: '사자(하방)',
    indications: ['해수', '천식', '흉통', '인후종통', '매핵기', '구토', '딸꾹질'],
    techniques: ['사법'],
    cautions: '심자 금기',
    relatedPoints: ['열결(LU7)', '합곡(LI4)'],
  },
  {
    id: 'cv24',
    code: 'CV24',
    name: '승장',
    hanja: '承漿',
    pinyin: 'Chengjiang',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '안면부, 턱끝 정중앙 함요처',
    depth: '0.2~0.3촌',
    angle: '사자(상방)',
    indications: ['구안와사', '치통', '잇몸종통', '다연', '구창', '전간'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '협거(ST6)'],
  },
  // ===== 경외기혈 (Extra Points) =====
  {
    id: 'ex-hn3',
    code: 'EX-HN3',
    name: '인당',
    hanja: '印堂',
    pinyin: 'Yintang',
    meridian: '경외기혈',
    meridianCode: 'EX',
    location: '안면부, 양 미두 연결선 중점',
    depth: '0.3~0.5촌',
    angle: '평자(하방) 또는 제피',
    indications: ['두통', '현훈', '비색', '비연', '눈병', '불면', '소아경풍', '전간'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)', '영향(LI20)'],
  },
  {
    id: 'ex-hn5',
    code: 'EX-HN5',
    name: '태양',
    hanja: '太陽',
    pinyin: 'Taiyang',
    meridian: '경외기혈',
    meridianCode: 'EX',
    location: '안면부, 미초와 외자 중점 후방 약 1촌 함요처',
    depth: '0.3~0.5촌 또는 점자출혈',
    angle: '직자 또는 사자',
    indications: ['두통', '편두통', '눈병', '구안와사', '치통'],
    techniques: ['사법', '점자출혈'],
    relatedPoints: ['합곡(LI4)', '풍지(GB20)'],
  },
  {
    id: 'ex-b2',
    code: 'EX-B2',
    name: '협척',
    hanja: '夾脊',
    pinyin: 'Jiaji',
    meridian: '경외기혈',
    meridianCode: 'EX',
    location: '척추 양측, 각 극돌기 하 외측 0.5촌 (17쌍)',
    depth: '0.5~1촌',
    angle: '사자',
    indications: ['상응 내장 질환', '척추 질환'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['해당 배수혈'],
  },
  {
    id: 'ex-ue9',
    code: 'EX-UE9',
    name: '외노궁',
    hanja: '外勞宮',
    pinyin: 'Wailaogong',
    meridian: '경외기혈',
    meridianCode: 'EX',
    location: '수배부, 제2·3중수골 사이, 중수지관절 후방 0.5촌',
    depth: '0.5~0.8촌',
    angle: '직자',
    indications: ['낙침', '수배통', '수지마목', '수저종'],
    techniques: ['사법'],
    relatedPoints: ['합곡(LI4)'],
  },
  {
    id: 'ex-le4',
    code: 'EX-LE4',
    name: '내슬안',
    hanja: '內膝眼',
    pinyin: 'Neixiyan',
    meridian: '경외기혈',
    meridianCode: 'EX',
    location: '슬부, 슬개인대 내측 함요처',
    depth: '0.5~1촌',
    angle: '사자(외하방)',
    indications: ['슬통', '하지마비', '각기'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['독비(ST35)', '양릉천(GB34)'],
  },
  {
    id: 'ex-le7',
    code: 'EX-LE7',
    name: '난미',
    hanja: '闌尾',
    pinyin: 'Lanwei',
    meridian: '경외기혈',
    meridianCode: 'EX',
    location: '하퇴 전면, 족삼리 하 약 2촌 압통점',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['급성 충수염', '만성 충수염', '소화불량'],
    techniques: ['사법', '뜸'],
    relatedPoints: ['족삼리(ST36)', '천추(ST25)'],
  },
]

export default function AcupointsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeridian, setSelectedMeridian] = useState<string | null>(null)
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<Acupoint | null>(null)

  const filteredPoints = demoAcupoints.filter((point) => {
    const matchesSearch =
      !searchQuery ||
      point.name.includes(searchQuery) ||
      point.hanja.includes(searchQuery) ||
      point.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      point.indications.some((ind) => ind.includes(searchQuery))

    const matchesMeridian = !selectedMeridian || point.meridianCode === selectedMeridian

    const matchesSymptom =
      !selectedSymptom || point.indications.some((ind) => ind.includes(selectedSymptom))

    return matchesSearch && matchesMeridian && matchesSymptom
  })

  const getMeridianColor = (code: string) => {
    return meridians.find((m) => m.code === code)?.color || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="h-7 w-7 text-rose-500" />
          경혈 검색
        </h1>
        <p className="mt-1 text-gray-500">
          경락별, 부위별, 증상별로 경혈을 검색하세요
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="혈명, 코드, 주치로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Meridian Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">경락:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMeridian(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                !selectedMeridian
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            {meridians.map((meridian) => (
              <button
                key={meridian.code}
                onClick={() => setSelectedMeridian(meridian.code)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                  selectedMeridian === meridian.code
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', meridian.color)} />
                {meridian.code}
              </button>
            ))}
          </div>
        </div>

        {/* Symptom Filter */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">주치:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSymptom(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                !selectedSymptom
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            {symptomCategories.map((symptom) => (
              <button
                key={symptom}
                onClick={() => setSelectedSymptom(symptom)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  selectedSymptom === symptom
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Points List */}
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {filteredPoints.length}개의 경혈
          </p>
          {filteredPoints.map((point) => (
            <button
              key={point.id}
              onClick={() => setSelectedPoint(point)}
              className={cn(
                'w-full text-left bg-white rounded-xl shadow-sm border p-4 transition-all hover:shadow-md',
                selectedPoint?.id === point.id
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-gray-100 hover:border-rose-200'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn('w-3 h-3 rounded-full', getMeridianColor(point.meridianCode))} />
                  <span className="font-bold text-gray-900">{point.name}</span>
                  <span className="text-gray-500">{point.hanja}</span>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                  {point.code}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{point.meridian}</p>
              <div className="flex flex-wrap gap-1">
                {point.indications.slice(0, 4).map((ind, i) => (
                  <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs rounded">
                    {ind}
                  </span>
                ))}
                {point.indications.length > 4 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                    +{point.indications.length - 4}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Point Detail */}
        <div className="lg:sticky lg:top-4 h-fit">
          {selectedPoint ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('w-4 h-4 rounded-full', getMeridianColor(selectedPoint.meridianCode))} />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedPoint.name}
                    </h2>
                    <span className="text-xl text-gray-500">{selectedPoint.hanja}</span>
                  </div>
                  <p className="text-gray-500">{selectedPoint.pinyin}</p>
                </div>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-mono rounded-lg">
                  {selectedPoint.code}
                </span>
              </div>

              {/* Meridian */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">소속 경락</p>
                <p className="font-medium text-gray-900">{selectedPoint.meridian}</p>
              </div>

              {/* Location */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <p className="font-medium text-blue-900">취혈 위치</p>
                </div>
                <p className="text-blue-700">{selectedPoint.location}</p>
              </div>

              {/* Needling */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Ruler className="h-5 w-5 text-purple-500" />
                    <p className="font-medium text-purple-900">자침 깊이</p>
                  </div>
                  <p className="text-purple-700">{selectedPoint.depth}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <p className="font-medium text-indigo-900 mb-2">자침 각도</p>
                  <p className="text-indigo-700">{selectedPoint.angle}</p>
                </div>
              </div>

              {/* Indications */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <p className="font-medium text-gray-900">주치</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPoint.indications.map((ind, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-lg"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              {/* Techniques */}
              <div>
                <p className="font-medium text-gray-900 mb-3">시술 방법</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPoint.techniques.map((tech, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm rounded-lg"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cautions */}
              {selectedPoint.cautions && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-red-500" />
                    <p className="font-medium text-red-900">주의사항</p>
                  </div>
                  <p className="text-red-700">{selectedPoint.cautions}</p>
                </div>
              )}

              {/* Related Points */}
              {selectedPoint.relatedPoints && (
                <div>
                  <p className="font-medium text-gray-900 mb-3">배혈 (관련 혈위)</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPoint.relatedPoints.map((rp, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg"
                      >
                        {rp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">경혈을 선택하면 상세 정보가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
