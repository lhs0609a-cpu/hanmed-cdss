import { useState, useMemo, useCallback } from 'react'
import {
  Search,
  MapPin,
  Zap,
  Target,
  Info,
  Ruler,
  Star,
  StarOff,
  History,
  GitCompare,
  X,
  ChevronRight,
  Sparkles,
  Heart,
  Brain,
  Activity,
  Eye,
  Ear,
  Wind,
  Hand,
  Footprints,
  CircleDot,
  TrendingUp,
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
  bodyRegion?: string
}

interface QuickPreset {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  description: string
  points: string[]
}

interface BodyRegion {
  id: string
  name: string
  icon: React.ReactNode
}

const meridians = [
  { code: 'LU', name: '수태음폐경', color: 'bg-gray-500', textColor: 'text-gray-600', bgLight: 'bg-gray-50' },
  { code: 'LI', name: '수양명대장경', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50' },
  { code: 'ST', name: '족양명위경', color: 'bg-yellow-600', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { code: 'SP', name: '족태음비경', color: 'bg-yellow-700', textColor: 'text-yellow-800', bgLight: 'bg-yellow-50' },
  { code: 'HT', name: '수소음심경', color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50' },
  { code: 'SI', name: '수태양소장경', color: 'bg-red-600', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  { code: 'BL', name: '족태양방광경', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  { code: 'KI', name: '족소음신경', color: 'bg-blue-700', textColor: 'text-blue-800', bgLight: 'bg-blue-50' },
  { code: 'PC', name: '수궐음심포경', color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50' },
  { code: 'TE', name: '수소양삼초경', color: 'bg-purple-600', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  { code: 'GB', name: '족소양담경', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' },
  { code: 'LR', name: '족궐음간경', color: 'bg-green-700', textColor: 'text-green-800', bgLight: 'bg-green-50' },
  { code: 'GV', name: '독맥', color: 'bg-indigo-500', textColor: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { code: 'CV', name: '임맥', color: 'bg-pink-500', textColor: 'text-pink-600', bgLight: 'bg-pink-50' },
]

// 부위별 분류
const bodyRegions: BodyRegion[] = [
  { id: 'head', name: '두면부', icon: <Brain className="h-4 w-4" /> },
  { id: 'neck', name: '경항부', icon: <CircleDot className="h-4 w-4" /> },
  { id: 'chest', name: '흉부', icon: <Heart className="h-4 w-4" /> },
  { id: 'abdomen', name: '복부', icon: <Activity className="h-4 w-4" /> },
  { id: 'back', name: '배부', icon: <Wind className="h-4 w-4" /> },
  { id: 'arm', name: '상지', icon: <Hand className="h-4 w-4" /> },
  { id: 'leg', name: '하지', icon: <Footprints className="h-4 w-4" /> },
]

// 빠른 조합 프리셋
const quickPresets: QuickPreset[] = [
  {
    id: 'headache',
    name: '두통',
    icon: <Brain className="h-5 w-5" />,
    color: 'from-purple-500 to-indigo-500',
    description: '두통, 편두통 치료 핵심 경혈',
    points: ['합곡', '태충', '풍지', '백회', '태양'],
  },
  {
    id: 'digestion',
    name: '소화불량',
    icon: <Activity className="h-5 w-5" />,
    color: 'from-orange-500 to-amber-500',
    description: '위장 기능 개선 경혈 조합',
    points: ['족삼리', '중완', '내관', '천추', '공손'],
  },
  {
    id: 'insomnia',
    name: '불면증',
    icon: <Star className="h-5 w-5" />,
    color: 'from-indigo-500 to-purple-500',
    description: '수면 장애 개선 경혈',
    points: ['신문', '내관', '삼음교', '백회', '안면'],
  },
  {
    id: 'shoulder',
    name: '견비통',
    icon: <Hand className="h-5 w-5" />,
    color: 'from-blue-500 to-cyan-500',
    description: '어깨 통증 치료 경혈',
    points: ['견우', '견료', '곡지', '외관', '합곡'],
  },
  {
    id: 'lumbago',
    name: '요통',
    icon: <Wind className="h-5 w-5" />,
    color: 'from-green-500 to-emerald-500',
    description: '허리 통증 치료 경혈',
    points: ['신수', '위중', '곤륜', '환도', '대장수'],
  },
  {
    id: 'cold',
    name: '감기',
    icon: <Zap className="h-5 w-5" />,
    color: 'from-cyan-500 to-blue-500',
    description: '감기 증상 완화 경혈',
    points: ['합곡', '대추', '풍지', '열결', '척택'],
  },
]

const symptomCategories = [
  '두통', '소화불량', '불면', '요통', '견비통', '월경통', '피로', '감기', '현훈', '구토', '변비', '심계', '이명', '비염', '천식'
]

// 경혈 데이터 (기존 데이터에 bodyRegion 추가)
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
    bodyRegion: 'chest',
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
    bodyRegion: 'arm',
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
    bodyRegion: 'arm',
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
    bodyRegion: 'arm',
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
    bodyRegion: 'arm',
  },
  // ===== 수양명대장경 (LI) =====
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
    bodyRegion: 'arm',
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
    bodyRegion: 'arm',
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
    bodyRegion: 'arm',
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
    bodyRegion: 'head',
  },
  // ===== 족양명위경 (ST) =====
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
    bodyRegion: 'abdomen',
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
    bodyRegion: 'leg',
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
    bodyRegion: 'leg',
  },
  // ===== 족태음비경 (SP) =====
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
    bodyRegion: 'leg',
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
    bodyRegion: 'leg',
  },
  // ===== 수소음심경 (HT) =====
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
    bodyRegion: 'arm',
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
    bodyRegion: 'arm',
  },
  // ===== 족태양방광경 (BL) =====
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
    bodyRegion: 'back',
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
    bodyRegion: 'back',
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
    bodyRegion: 'back',
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
    bodyRegion: 'back',
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
    bodyRegion: 'leg',
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
    bodyRegion: 'leg',
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
    bodyRegion: 'leg',
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
    bodyRegion: 'leg',
  },
  // ===== 수궐음심포경 (PC) =====
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
    bodyRegion: 'arm',
  },
  // ===== 수소양삼초경 (TE) =====
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
    bodyRegion: 'arm',
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
    bodyRegion: 'arm',
  },
  // ===== 족소양담경 (GB) =====
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
    bodyRegion: 'neck',
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
    bodyRegion: 'neck',
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
    bodyRegion: 'leg',
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
    bodyRegion: 'leg',
  },
  // ===== 족궐음간경 (LR) =====
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
    bodyRegion: 'leg',
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
    bodyRegion: 'back',
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
    bodyRegion: 'neck',
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
    bodyRegion: 'head',
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
    bodyRegion: 'head',
  },
  // ===== 임맥 (CV) =====
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
    bodyRegion: 'abdomen',
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
    bodyRegion: 'abdomen',
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
    bodyRegion: 'abdomen',
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
    bodyRegion: 'chest',
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
    bodyRegion: 'head',
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
    bodyRegion: 'head',
  },
]

const STORAGE_KEY = 'acupoint-favorites'
const RECENT_KEY = 'acupoint-recent'

export default function AcupointsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeridian, setSelectedMeridian] = useState<string | null>(null)
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<Acupoint | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [comparePoints, setComparePoints] = useState<Acupoint[]>([])
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [recentPoints, setRecentPoints] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<Acupoint | null>(null)

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((pointId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(pointId)
        ? prev.filter(id => id !== pointId)
        : [...prev, pointId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites))
      return newFavorites
    })
  }, [])

  // 최근 본 경혈 추가
  const addToRecent = useCallback((pointId: string) => {
    setRecentPoints(prev => {
      const filtered = prev.filter(id => id !== pointId)
      const newRecent = [pointId, ...filtered].slice(0, 10)
      localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent))
      return newRecent
    })
  }, [])

  // 경혈 선택
  const handleSelectPoint = useCallback((point: Acupoint) => {
    if (compareMode) {
      if (comparePoints.find(p => p.id === point.id)) {
        setComparePoints(prev => prev.filter(p => p.id !== point.id))
      } else if (comparePoints.length < 3) {
        setComparePoints(prev => [...prev, point])
      }
    } else {
      setSelectedPoint(point)
      addToRecent(point.id)
    }
  }, [compareMode, comparePoints, addToRecent])

  // 프리셋 클릭
  const handlePresetClick = useCallback((preset: QuickPreset) => {
    const points = demoAcupoints.filter(p => preset.points.includes(p.name))
    if (points.length > 0) {
      setCompareMode(true)
      setComparePoints(points.slice(0, 3))
    }
  }, [])

  // 필터링된 경혈 목록
  const filteredPoints = useMemo(() => {
    return demoAcupoints.filter((point) => {
      const matchesSearch =
        !searchQuery ||
        point.name.includes(searchQuery) ||
        point.hanja.includes(searchQuery) ||
        point.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        point.indications.some((ind) => ind.includes(searchQuery))

      const matchesMeridian = !selectedMeridian || point.meridianCode === selectedMeridian
      const matchesSymptom = !selectedSymptom || point.indications.some((ind) => ind.includes(selectedSymptom))
      const matchesRegion = !selectedRegion || point.bodyRegion === selectedRegion
      const matchesFavorites = !showFavoritesOnly || favorites.includes(point.id)

      return matchesSearch && matchesMeridian && matchesSymptom && matchesRegion && matchesFavorites
    })
  }, [searchQuery, selectedMeridian, selectedSymptom, selectedRegion, showFavoritesOnly, favorites])

  // 최근 본 경혈
  const recentPointsList = useMemo(() => {
    return recentPoints
      .map(id => demoAcupoints.find(p => p.id === id))
      .filter((p): p is Acupoint => p !== undefined)
      .slice(0, 5)
  }, [recentPoints])

  const getMeridianStyle = (code: string) => {
    return meridians.find((m) => m.code === code) || { color: 'bg-gray-500', textColor: 'text-gray-600', bgLight: 'bg-gray-50' }
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

      {/* Quick Presets */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="font-bold text-gray-900">빠른 증상별 경혈 조합</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'group relative p-4 rounded-xl border-2 border-transparent bg-gradient-to-br text-white transition-all hover:scale-105 hover:shadow-lg',
                preset.color
              )}
            >
              <div className="flex flex-col items-center gap-2">
                {preset.icon}
                <span className="font-bold">{preset.name}</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-center px-2">
                  <p className="text-xs mb-1">{preset.description}</p>
                  <p className="text-[10px] opacity-75">{preset.points.join(', ')}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent & Favorites Bar */}
      {(recentPointsList.length > 0 || favorites.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 최근 본 경혈 */}
            {recentPointsList.length > 0 && (
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">최근:</span>
                <div className="flex gap-1">
                  {recentPointsList.map(point => (
                    <button
                      key={point.id}
                      onClick={() => handleSelectPoint(point)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {point.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 즐겨찾기 필터 */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                showFavoritesOnly
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Star className={cn('h-4 w-4', showFavoritesOnly && 'fill-amber-500')} />
              즐겨찾기 ({favorites.length})
            </button>

            {/* 비교 모드 */}
            <button
              onClick={() => {
                setCompareMode(!compareMode)
                if (!compareMode) setComparePoints([])
              }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ml-auto',
                compareMode
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <GitCompare className="h-4 w-4" />
              {compareMode ? `비교 중 (${comparePoints.length}/3)` : '비교 모드'}
            </button>
          </div>
        </div>
      )}

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

        {/* Body Region Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">부위:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRegion(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                !selectedRegion
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            {bodyRegions.map((region) => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                  selectedRegion === region.id
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {region.icon}
                {region.name}
              </button>
            ))}
          </div>
        </div>

        {/* Meridian Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
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
                    ? `${meridian.bgLight} ${meridian.textColor} ring-2 ring-current`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span className={cn('w-2.5 h-2.5 rounded-full', meridian.color)} />
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

      {/* Compare Mode Panel */}
      {compareMode && comparePoints.length > 0 && (
        <div className="bg-indigo-50 rounded-2xl shadow-sm border border-indigo-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-indigo-900 flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              경혈 비교 ({comparePoints.length}/3)
            </h2>
            <button
              onClick={() => {
                setCompareMode(false)
                setComparePoints([])
              }}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              비교 종료
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparePoints.map((point) => {
              const style = getMeridianStyle(point.meridianCode)
              return (
                <div key={point.id} className="bg-white rounded-xl p-4 relative">
                  <button
                    onClick={() => setComparePoints(prev => prev.filter(p => p.id !== point.id))}
                    className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('w-3 h-3 rounded-full', style.color)} />
                    <h3 className="font-bold">{point.name}</h3>
                    <span className="text-gray-500 text-sm">{point.code}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500">경락</p>
                      <p className="font-medium">{point.meridian}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">주치</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {point.indications.slice(0, 5).map((ind, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500">깊이</p>
                      <p className="font-medium">{point.depth}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {comparePoints.length < 3 && (
              <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 flex items-center justify-center text-indigo-400">
                <p className="text-sm">경혈을 클릭하여 추가</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Points List */}
        <div className="space-y-3">
          <p className="text-sm text-gray-500 flex items-center justify-between">
            <span>{filteredPoints.length}개의 경혈</span>
            {compareMode && <span className="text-indigo-600">경혈을 클릭하여 비교에 추가</span>}
          </p>
          {filteredPoints.map((point) => {
            const style = getMeridianStyle(point.meridianCode)
            const isCompareSelected = comparePoints.some(p => p.id === point.id)
            const isFavorite = favorites.includes(point.id)

            return (
              <div
                key={point.id}
                className="relative"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <button
                  onClick={() => handleSelectPoint(point)}
                  className={cn(
                    'w-full text-left bg-white rounded-xl shadow-sm border p-4 transition-all hover:shadow-md',
                    selectedPoint?.id === point.id && !compareMode
                      ? 'border-rose-500 ring-2 ring-rose-500/20'
                      : isCompareSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-gray-100 hover:border-rose-200'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-3 h-3 rounded-full', style.color)} />
                      <span className="font-bold text-gray-900">{point.name}</span>
                      <span className="text-gray-500">{point.hanja}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                        {point.code}
                      </span>
                    </div>
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

                {/* 즐겨찾기 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(point.id)
                  }}
                  className="absolute top-3 right-14 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {isFavorite ? (
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  ) : (
                    <StarOff className="h-4 w-4 text-gray-300 hover:text-amber-500" />
                  )}
                </button>

                {/* 호버 미리보기 툴팁 */}
                {hoveredPoint?.id === point.id && !compareMode && (
                  <div className="absolute left-full ml-2 top-0 z-10 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-4 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-medium text-gray-900">취혈 위치</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{point.location}</p>

                    <div className="flex gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">깊이</p>
                        <p className="font-medium">{point.depth}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">각도</p>
                        <p className="font-medium">{point.angle}</p>
                      </div>
                    </div>

                    {point.cautions && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600">{point.cautions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Point Detail */}
        <div className="lg:sticky lg:top-4 h-fit">
          {selectedPoint && !compareMode ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('w-4 h-4 rounded-full', getMeridianStyle(selectedPoint.meridianCode).color)} />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedPoint.name}
                    </h2>
                    <span className="text-xl text-gray-500">{selectedPoint.hanja}</span>
                    <button
                      onClick={() => toggleFavorite(selectedPoint.id)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      {favorites.includes(selectedPoint.id) ? (
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      ) : (
                        <Star className="h-5 w-5 text-gray-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-gray-500">{selectedPoint.pinyin}</p>
                </div>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-mono rounded-lg">
                  {selectedPoint.code}
                </span>
              </div>

              {/* Meridian */}
              <div className={cn('p-4 rounded-xl', getMeridianStyle(selectedPoint.meridianCode).bgLight)}>
                <p className="text-sm text-gray-500 mb-1">소속 경락</p>
                <p className={cn('font-medium', getMeridianStyle(selectedPoint.meridianCode).textColor)}>
                  {selectedPoint.meridian}
                </p>
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
                      <button
                        key={i}
                        onClick={() => {
                          const pointName = rp.split('(')[0]
                          const found = demoAcupoints.find(p => p.name === pointName)
                          if (found) handleSelectPoint(found)
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                      >
                        {rp}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : !compareMode ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">경혈을 선택하면 상세 정보가 표시됩니다</p>
              <p className="text-sm text-gray-400 mt-2">
                리스트에 마우스를 올리면 미리보기를 볼 수 있습니다
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
