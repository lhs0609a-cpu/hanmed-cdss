import { useState } from 'react'
import {
  BookOpen,
  Search,
  ChevronRight,
  BookMarked,
  ScrollText,
  Quote,
  Star,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassicText {
  id: string
  title: string
  titleHanja: string
  author: string
  dynasty: string
  category: string
  description: string
  chapters: number
  isFavorite?: boolean
}

interface TextPassage {
  id: string
  bookId: string
  bookTitle: string
  chapter: string
  originalText: string
  translation: string
  annotation?: string
  keywords: string[]
}

const classics: ClassicText[] = [
  // ===== 종합의서 =====
  {
    id: '1',
    title: '동의보감',
    titleHanja: '東醫寶鑑',
    author: '허준',
    dynasty: '조선',
    category: '종합의서',
    description: '조선시대 허준이 편찬한 한의학의 백과사전. 내경편, 외형편, 잡병편, 탕액편, 침구편으로 구성.',
    chapters: 25,
    isFavorite: true,
  },
  {
    id: '6',
    title: '의학입문',
    titleHanja: '醫學入門',
    author: '이천',
    dynasty: '명',
    category: '종합의서',
    description: '초학자를 위한 의학 입문서. 운기, 진단, 본초, 침구 등 수록.',
    chapters: 8,
  },
  {
    id: '7',
    title: '경악전서',
    titleHanja: '景岳全書',
    author: '장개빈',
    dynasty: '명',
    category: '종합의서',
    description: '장개빈의 의학 저술 총집. 온보학파의 대표 저서.',
    chapters: 64,
  },
  {
    id: '9',
    title: '의림개착',
    titleHanja: '醫林改錯',
    author: '왕청임',
    dynasty: '청',
    category: '종합의서',
    description: '어혈론의 대표 저서. 해부학적 관찰과 활혈거어법 강조.',
    chapters: 4,
  },
  {
    id: '10',
    title: '비위론',
    titleHanja: '脾胃論',
    author: '이고',
    dynasty: '금',
    category: '종합의서',
    description: '비위학설의 기초 저서. 보토파(補土派)의 이론적 근거.',
    chapters: 3,
    isFavorite: true,
  },
  {
    id: '11',
    title: '단계심법',
    titleHanja: '丹溪心法',
    author: '주단계',
    dynasty: '원',
    category: '종합의서',
    description: '자음파(滋陰派)의 대표 저서. 양유여음부족론 제창.',
    chapters: 5,
  },
  {
    id: '12',
    title: '의방집해',
    titleHanja: '醫方集解',
    author: '왕앙',
    dynasty: '청',
    category: '종합의서',
    description: '방제학의 명저. 21류로 700여 처방 분류 정리.',
    chapters: 21,
  },
  {
    id: '13',
    title: '증치준승',
    titleHanja: '證治準繩',
    author: '왕긍당',
    dynasty: '명',
    category: '종합의서',
    description: '임상 전문서. 잡병, 상한, 본초 등 종합적으로 정리.',
    chapters: 44,
  },

  // ===== 상한·온병 =====
  {
    id: '2',
    title: '상한론',
    titleHanja: '傷寒論',
    author: '장중경',
    dynasty: '후한',
    category: '상한',
    description: '장중경이 저술한 외감열병 치료의 경전. 육경변증의 기초.',
    chapters: 22,
    isFavorite: true,
  },
  {
    id: '14',
    title: '온병조변',
    titleHanja: '溫病條辨',
    author: '오국통',
    dynasty: '청',
    category: '상한',
    description: '온병학의 대표 저서. 삼초변증 체계 수립.',
    chapters: 6,
    isFavorite: true,
  },
  {
    id: '15',
    title: '온열론',
    titleHanja: '溫熱論',
    author: '엽천사',
    dynasty: '청',
    category: '상한',
    description: '위기영혈변증의 기초. 온병학파의 창시 저서.',
    chapters: 1,
  },
  {
    id: '16',
    title: '습열병편',
    titleHanja: '濕熱病篇',
    author: '설생백',
    dynasty: '청',
    category: '상한',
    description: '습열병의 변증논치 전문서.',
    chapters: 1,
  },
  {
    id: '17',
    title: '상한명리론',
    titleHanja: '傷寒明理論',
    author: '성무기',
    dynasty: '금',
    category: '상한',
    description: '상한론 해설서. 50개 증상에 대해 상세히 논술.',
    chapters: 4,
  },

  // ===== 잡병 =====
  {
    id: '3',
    title: '금궤요략',
    titleHanja: '金匱要略',
    author: '장중경',
    dynasty: '후한',
    category: '잡병',
    description: '장중경의 잡병 치료서. 내과 잡병의 변증논치 수록.',
    chapters: 25,
  },
  {
    id: '18',
    title: '제병원후론',
    titleHanja: '諸病源候論',
    author: '소원방',
    dynasty: '수',
    category: '잡병',
    description: '최초의 병인병리학 전문서. 1,720종 병증 수록.',
    chapters: 50,
  },
  {
    id: '19',
    title: '유경',
    titleHanja: '類經',
    author: '장개빈',
    dynasty: '명',
    category: '잡병',
    description: '황제내경을 12류로 분류하여 해설한 주석서.',
    chapters: 32,
  },

  // ===== 기초이론 =====
  {
    id: '4',
    title: '황제내경',
    titleHanja: '黃帝內經',
    author: '미상',
    dynasty: '전국시대',
    category: '기초이론',
    description: '한의학의 기초 이론서. 소문과 영추로 구성.',
    chapters: 162,
    isFavorite: true,
  },
  {
    id: '20',
    title: '난경',
    titleHanja: '難經',
    author: '편작(秦越人)',
    dynasty: '전한',
    category: '기초이론',
    description: '81난(難)으로 구성된 의학 문답서. 맥학, 경락, 장부 등 논술.',
    chapters: 81,
    isFavorite: true,
  },
  {
    id: '21',
    title: '중장경',
    titleHanja: '中藏經',
    author: '화타',
    dynasty: '후한',
    category: '기초이론',
    description: '화타의 의학 이론서. 장부론과 허실론 수록.',
    chapters: 3,
  },

  // ===== 본초 =====
  {
    id: '5',
    title: '본초강목',
    titleHanja: '本草綱目',
    author: '이시진',
    dynasty: '명',
    category: '본초',
    description: '1,892종의 약물을 수록한 본초학의 집대성서.',
    chapters: 52,
  },
  {
    id: '22',
    title: '신농본초경',
    titleHanja: '神農本草經',
    author: '미상',
    dynasty: '후한',
    category: '본초',
    description: '최초의 본초학 저서. 365종 약물을 상중하 3품으로 분류.',
    chapters: 3,
    isFavorite: true,
  },
  {
    id: '23',
    title: '본초비요',
    titleHanja: '本草備要',
    author: '왕앙',
    dynasty: '청',
    category: '본초',
    description: '본초학 입문서. 470종 약물의 성미귀경 간명하게 정리.',
    chapters: 8,
  },
  {
    id: '24',
    title: '탕액본초',
    titleHanja: '湯液本草',
    author: '왕호고',
    dynasty: '원',
    category: '본초',
    description: '약물의 귀경학설을 발전시킨 본초서.',
    chapters: 3,
  },
  {
    id: '25',
    title: '본초구진',
    titleHanja: '本草求眞',
    author: '황궁수',
    dynasty: '청',
    category: '본초',
    description: '약물을 공능별로 분류한 본초서. 10류 분류법.',
    chapters: 10,
  },

  // ===== 사상의학 =====
  {
    id: '8',
    title: '동의수세보원',
    titleHanja: '東醫壽世保元',
    author: '이제마',
    dynasty: '조선',
    category: '사상의학',
    description: '사상체질의학의 창시서. 태양인, 소양인, 태음인, 소음인 체질론.',
    chapters: 4,
    isFavorite: true,
  },
  {
    id: '26',
    title: '격치고',
    titleHanja: '格致藁',
    author: '이제마',
    dynasty: '조선',
    category: '사상의학',
    description: '이제마의 철학적 사상을 담은 저서.',
    chapters: 1,
  },

  // ===== 침구 =====
  {
    id: '27',
    title: '침구갑을경',
    titleHanja: '針灸甲乙經',
    author: '황보밀',
    dynasty: '진',
    category: '침구',
    description: '최초의 침구학 전문서. 349혈 수록.',
    chapters: 12,
    isFavorite: true,
  },
  {
    id: '28',
    title: '침구대성',
    titleHanja: '針灸大成',
    author: '양계주',
    dynasty: '명',
    category: '침구',
    description: '침구학의 집대성서. 역대 침구 이론과 기법 종합.',
    chapters: 10,
  },
  {
    id: '29',
    title: '침구자생경',
    titleHanja: '針灸資生經',
    author: '왕집중',
    dynasty: '송',
    category: '침구',
    description: '증상별 취혈법을 정리한 침구 임상서.',
    chapters: 7,
  },
  {
    id: '30',
    title: '동인수혈침구도경',
    titleHanja: '銅人腧穴針灸圖經',
    author: '왕유일',
    dynasty: '송',
    category: '침구',
    description: '최초의 경혈 정위 표준화 저서. 동인형 제작 기초.',
    chapters: 3,
  },

  // ===== 방제 =====
  {
    id: '31',
    title: '태평혜민화제국방',
    titleHanja: '太平惠民和劑局方',
    author: '관찬',
    dynasty: '송',
    category: '방제',
    description: '최초의 국가 약전. 297방 수록.',
    chapters: 10,
    isFavorite: true,
  },
  {
    id: '32',
    title: '비급천금요방',
    titleHanja: '備急千金要方',
    author: '손사막',
    dynasty: '당',
    category: '방제',
    description: '손사막의 임상 집대성서. 5,300여 처방 수록.',
    chapters: 30,
    isFavorite: true,
  },
  {
    id: '33',
    title: '외대비요',
    titleHanja: '外臺秘要',
    author: '왕도',
    dynasty: '당',
    category: '방제',
    description: '당대 이전 의방 총집. 6,000여 처방 수록.',
    chapters: 40,
  },
  {
    id: '34',
    title: '성제총록',
    titleHanja: '聖濟總錄',
    author: '관찬',
    dynasty: '송',
    category: '방제',
    description: '송대 의방 총집. 20,000여 처방 수록.',
    chapters: 200,
  },
  {
    id: '35',
    title: '삼인극일병증방론',
    titleHanja: '三因極一病證方論',
    author: '진언',
    dynasty: '송',
    category: '방제',
    description: '삼인학설(내인, 외인, 불내외인)을 체계화한 저서.',
    chapters: 18,
  },

  // ===== 부인과 =====
  {
    id: '36',
    title: '부인양방대전',
    titleHanja: '婦人良方大全',
    author: '진자명',
    dynasty: '송',
    category: '부인과',
    description: '최초의 부인과 전문서. 24문으로 구성.',
    chapters: 24,
  },
  {
    id: '37',
    title: '제음강목',
    titleHanja: '濟陰綱目',
    author: '무지맹',
    dynasty: '명',
    category: '부인과',
    description: '부인과 질환을 망라한 종합서.',
    chapters: 14,
  },
  {
    id: '38',
    title: '달생편',
    titleHanja: '達生編',
    author: '갈근',
    dynasty: '청',
    category: '부인과',
    description: '산과 전문서. 안태와 분만 관련 내용.',
    chapters: 2,
  },

  // ===== 소아과 =====
  {
    id: '39',
    title: '소아약증직결',
    titleHanja: '小兒藥證直訣',
    author: '전을',
    dynasty: '송',
    category: '소아과',
    description: '최초의 소아과 전문서. 소아의 생리와 병리 특성 논술.',
    chapters: 3,
    isFavorite: true,
  },
  {
    id: '40',
    title: '유과발휘',
    titleHanja: '幼科發揮',
    author: '만전',
    dynasty: '명',
    category: '소아과',
    description: '소아과 임상 경험서.',
    chapters: 4,
  },

  // ===== 외과 =====
  {
    id: '41',
    title: '외과정종',
    titleHanja: '外科正宗',
    author: '진실공',
    dynasty: '명',
    category: '외과',
    description: '외과학의 대표 저서. 창양 치료법 집대성.',
    chapters: 4,
  },
  {
    id: '42',
    title: '의종금감',
    titleHanja: '醫宗金鑑',
    author: '오겸',
    dynasty: '청',
    category: '외과',
    description: '청대 의학 교과서. 외과심법요결 포함.',
    chapters: 90,
  },

  // ===== 진단 =====
  {
    id: '43',
    title: '맥경',
    titleHanja: '脈經',
    author: '왕숙화',
    dynasty: '진',
    category: '진단',
    description: '최초의 맥학 전문서. 24맥 분류.',
    chapters: 10,
    isFavorite: true,
  },
  {
    id: '44',
    title: '빈호맥학',
    titleHanja: '瀕湖脈學',
    author: '이시진',
    dynasty: '명',
    category: '진단',
    description: '27맥을 시가(詩歌) 형식으로 정리한 맥학 입문서.',
    chapters: 1,
  },
  {
    id: '45',
    title: '사진심법요결',
    titleHanja: '四診心法要訣',
    author: '오겸',
    dynasty: '청',
    category: '진단',
    description: '망문문절 사진법을 정리한 진단학서.',
    chapters: 1,
  },
]

const demoPassages: TextPassage[] = [
  // ===== 상한론 =====
  {
    id: '1',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '태양병 상편',
    originalText: '太陽之爲病 脈浮 頭項强痛而惡寒',
    translation: '태양병이란 맥이 부(浮)하고, 머리와 목덜미가 뻣뻣하게 아프면서 오한이 있는 것이다.',
    annotation: '태양병의 기본 증상을 설명한 조문. 부맥, 두항강통, 오한이 태양병의 삼대 증상이다.',
    keywords: ['태양병', '부맥', '두통', '오한'],
  },
  {
    id: '2',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '태양병 상편',
    originalText: '太陽病 頭痛發熱 身疼腰痛 骨節疼痛 惡風無汗而喘者 麻黃湯主之',
    translation: '태양병으로 두통, 발열이 있고, 몸과 허리가 아프며, 관절이 아프고, 오풍이 있으면서 땀이 없고 천식이 있는 경우 마황탕으로 치료한다.',
    annotation: '마황탕증의 조문. 표실증(表實證)으로 무한(無汗)이 핵심 감별점이다.',
    keywords: ['마황탕', '두통', '발열', '무한'],
  },
  {
    id: '3',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '태양병 상편',
    originalText: '太陽中風 陽浮而陰弱 陽浮者熱自發 陰弱者汗自出 嗇嗇惡寒 淅淅惡風 翕翕發熱 鼻鳴乾嘔者 桂枝湯主之',
    translation: '태양중풍에 양이 부하고 음이 약하다. 양이 부하면 열이 스스로 나고, 음이 약하면 땀이 스스로 난다. 소소히 오한이 있고, 석석히 오풍이 있으며, 흡흡히 발열하고, 코에서 소리가 나며 마른 구역질이 있으면 계지탕으로 치료한다.',
    annotation: '계지탕증의 조문. 표허증(表虛證)으로 자한(自汗)이 핵심 감별점이다.',
    keywords: ['계지탕', '중풍', '자한', '오한'],
  },
  {
    id: '4',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '양명병편',
    originalText: '陽明之爲病 胃家實是也',
    translation: '양명병이란 위가(胃家)에 실(實)이 있는 것이다.',
    annotation: '양명병의 핵심을 위가실(胃家實)로 정의한 조문.',
    keywords: ['양명병', '위가실', '실증'],
  },
  {
    id: '5',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '소양병편',
    originalText: '少陽之爲病 口苦 咽乾 目眩也',
    translation: '소양병이란 입이 쓰고, 목이 마르며, 눈이 어지러운 것이다.',
    annotation: '소양병의 삼대 증상: 구고, 인건, 목현.',
    keywords: ['소양병', '구고', '인건', '목현'],
  },
  {
    id: '6',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '소양병편',
    originalText: '傷寒五六日 中風 往來寒熱 胸脇苦滿 嘿嘿不欲飮食 心煩喜嘔 或胸中煩而不嘔... 小柴胡湯主之',
    translation: '상한 5-6일에 중풍하여 한열왕래하고, 흉협이 그득하게 아프며, 묵묵히 음식을 먹고 싶지 않고, 심번하고 구역질을 잘 하거나, 혹 흉중이 번하면서 구역질은 없는 경우... 소시호탕으로 치료한다.',
    annotation: '소시호탕증의 대표 조문. 화해법의 기본.',
    keywords: ['소시호탕', '한열왕래', '흉협고만', '심번'],
  },
  {
    id: '7',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '태음병편',
    originalText: '太陰之爲病 腹滿而吐 食不下 自利益甚 時腹自痛 若下之 必胸下結硬',
    translation: '태음병이란 복만하면서 토하고, 음식이 내려가지 않으며, 설사가 더욱 심해지고, 때때로 배가 아프다. 만약 하법을 쓰면 반드시 흉하가 결경해진다.',
    annotation: '태음병의 특징: 비위허한(脾胃虛寒)으로 인한 소화기 증상.',
    keywords: ['태음병', '복만', '설사', '비위허한'],
  },
  {
    id: '8',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '소음병편',
    originalText: '少陰之爲病 脈微細 但欲寐也',
    translation: '소음병이란 맥이 미세하고, 다만 자고 싶어 하는 것이다.',
    annotation: '소음병의 핵심: 심신양허로 맥이 미세하고 기력이 없음.',
    keywords: ['소음병', '미세맥', '기면', '양허'],
  },
  {
    id: '9',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '궐음병편',
    originalText: '厥陰之爲病 消渴 氣上撞心 心中疼熱 飢而不欲食 食則吐蚘 下之利不止',
    translation: '궐음병이란 소갈하고, 기가 위로 치솟아 심장을 들이받으며, 심중이 아프고 열나며, 배고프되 먹고 싶지 않고, 먹으면 회충을 토하며, 하법을 쓰면 설사가 멈추지 않는다.',
    annotation: '궐음병의 특징: 한열착잡(寒熱錯雜)의 복잡한 양상.',
    keywords: ['궐음병', '소갈', '상열하한', '회충'],
  },
  {
    id: '10',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '태양병 중편',
    originalText: '發汗若下之 病仍不解 煩躁者 茯苓四逆湯主之',
    translation: '발한이나 하법 후에도 병이 풀리지 않고 번조하면 복령사역탕으로 치료한다.',
    annotation: '양기허탈 후 진액손상으로 번조가 나타날 때 사용.',
    keywords: ['복령사역탕', '번조', '양허', '진액손상'],
  },
  {
    id: '11',
    bookId: '2',
    bookTitle: '상한론',
    chapter: '태양병 하편',
    originalText: '心下痞 按之濡 其脈關上浮者 大黃黃連瀉心湯主之',
    translation: '심하비가 있는데 눌러보면 연하고 관상맥이 부하면 대황황련사심탕으로 치료한다.',
    annotation: '열결심하비(熱結心下痞)의 치법.',
    keywords: ['사심탕', '심하비', '열결', '대황'],
  },

  // ===== 금궤요략 =====
  {
    id: '12',
    bookId: '3',
    bookTitle: '금궤요략',
    chapter: '장부경락선후병맥증',
    originalText: '夫治未病者 見肝之病 知肝傳脾 當先實脾',
    translation: '미병을 치료하는 자는 간병을 보면 간이 비로 전변할 것을 알고 먼저 비를 실하게 해야 한다.',
    annotation: '미병을 다스리는 예방의학적 관점. 장부 상관관계에 기초한 치미병 이론.',
    keywords: ['치미병', '간병', '비', '오행'],
  },
  {
    id: '13',
    bookId: '3',
    bookTitle: '금궤요략',
    chapter: '흉비심통단기병맥증치',
    originalText: '胸痹之病 喘息咳唾 胸背痛 短氣 寸口脈沈而遲 關上小緊數 栝蔞薤白白酒湯主之',
    translation: '흉비병에 천식, 해수, 담, 흉배통, 단기가 있고, 촌구맥이 침이면서 지하고, 관상맥이 소긴하면서 삭하면 과루해백백주탕으로 치료한다.',
    annotation: '흉비병(협심증 유사)의 대표 처방.',
    keywords: ['흉비', '과루해백백주탕', '흉통', '단기'],
  },
  {
    id: '14',
    bookId: '3',
    bookTitle: '금궤요략',
    chapter: '복만한산숙식병맥증치',
    originalText: '病腹滿 按之不痛爲虛 痛者爲實 可下之',
    translation: '복만병에서 눌러서 아프지 않으면 허이고, 아프면 실이니 하법을 쓸 수 있다.',
    annotation: '복만의 허실 감별법.',
    keywords: ['복만', '허실', '안진', '하법'],
  },
  {
    id: '15',
    bookId: '3',
    bookTitle: '금궤요략',
    chapter: '혈비허로병맥증치',
    originalText: '男子脈虛沈弦 無寒熱 短氣裏急 小便不利 面色白 時目瞑兼衄 少腹滿 此爲勞 虛勞裏急 悸衄腹中痛 夢失精 四肢痠疼 手足煩熱 咽乾口燥 小建中湯主之',
    translation: '남자의 맥이 허하고 침현하며, 한열이 없고, 단기와 이급이 있고, 소변불리, 안색이 희고, 때때로 눈이 침침하며 코피가 나고, 소복이 그득하면 이것이 노(勞)이다. 허로이급, 심계, 코피, 복중통, 몽정, 사지산통, 수족번열, 인건구조에 소건중탕으로 치료한다.',
    annotation: '허로병의 대표 조문과 소건중탕의 적응증.',
    keywords: ['허로', '소건중탕', '이급', '번열'],
  },

  // ===== 황제내경 =====
  {
    id: '16',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '소문 상고천진론',
    originalText: '上古之人 其知道者 法於陰陽 和於術數 食飲有節 起居有常 不妄作勞',
    translation: '상고시대의 사람들 중 도를 아는 자는 음양에 법하고, 술수에 화하며, 음식에 절도가 있고, 기거에 일정함이 있으며, 함부로 과로하지 않았다.',
    annotation: '양생(養生)의 기본 원칙을 설명한 구절.',
    keywords: ['양생', '음양', '절도'],
  },
  {
    id: '17',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '소문 사기조신대론',
    originalText: '春三月 此謂發陳 天地俱生 萬物以榮 夜臥早起 廣步於庭 被髮緩形 以使志生',
    translation: '봄 석 달은 발진(發陳)이라 한다. 천지가 함께 생하고 만물이 영화롭다. 밤에 자고 일찍 일어나 뜰에서 넓게 걷고, 머리를 풀어 헤치고 몸을 느슨히 하여 뜻이 생하게 해야 한다.',
    annotation: '춘계 양생법. 생발지기에 순응하는 방법.',
    keywords: ['춘계', '양생', '발진', '조기'],
  },
  {
    id: '18',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '소문 음양응상대론',
    originalText: '陰陽者 天地之道也 萬物之綱紀 變化之父母 生殺之本始 神明之府也 治病必求於本',
    translation: '음양이란 천지의 도이며, 만물의 법도이고, 변화의 부모이며, 생살의 근본이고, 신명의 집이다. 병을 치료함에 반드시 근본에서 구해야 한다.',
    annotation: '음양의 중요성과 치병구본(治病求本)의 원칙.',
    keywords: ['음양', '치병구본', '근본', '천지지도'],
  },
  {
    id: '19',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '소문 장상론',
    originalText: '心者 君主之官也 神明出焉',
    translation: '심은 군주의 관(官)이니, 신명이 여기서 나온다.',
    annotation: '심장의 기능을 군주에 비유. 오장육부의 계층적 관계 설명.',
    keywords: ['심', '군주', '신명', '오장'],
  },
  {
    id: '20',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '소문 장상론',
    originalText: '肝者 將軍之官 謀慮出焉',
    translation: '간은 장군의 관이니, 모려(謀慮)가 여기서 나온다.',
    annotation: '간장의 기능을 장군에 비유.',
    keywords: ['간', '장군', '모려', '소설'],
  },
  {
    id: '21',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '소문 지진요대론',
    originalText: '帝曰 善 何謂虛實 岐伯曰 邪氣盛則實 精氣奪則虛',
    translation: '황제가 말했다: 좋다. 허실이란 무엇인가? 기백이 말했다: 사기가 성하면 실이고, 정기가 빼앗기면 허이다.',
    annotation: '허실의 개념을 정의한 명문.',
    keywords: ['허실', '사기', '정기', '변증'],
  },
  {
    id: '22',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '영추 본신',
    originalText: '肝藏血 血舍魂 肝氣虛則恐 實則怒',
    translation: '간은 혈을 저장하고, 혈에는 혼이 머문다. 간기가 허하면 두려워하고, 실하면 노한다.',
    annotation: '간장과 정서의 관계. 간과 혼의 연관성.',
    keywords: ['간', '혈', '혼', '공노'],
  },
  {
    id: '23',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '영추 경맥',
    originalText: '經脈者 所以能決死生 處百病 調虛實 不可不通',
    translation: '경맥이란 죽고 사는 것을 결정하고, 백병을 다스리며, 허실을 조절하는 것이니, 통하지 않으면 안 된다.',
    annotation: '경맥의 중요성을 강조한 구절.',
    keywords: ['경맥', '사생', '백병', '허실'],
  },

  // ===== 동의보감 =====
  {
    id: '24',
    bookId: '1',
    bookTitle: '동의보감',
    chapter: '내경편 신형',
    originalText: '神者 心之主也 心者 神之舍也',
    translation: '신(神)은 마음의 주인이요, 마음은 신이 머무는 곳이다.',
    keywords: ['신', '심', '정신'],
  },
  {
    id: '25',
    bookId: '1',
    bookTitle: '동의보감',
    chapter: '내경편 혈',
    originalText: '血者 水穀之精也 生化於脾 總統於心 藏受於肝 宣布於肺 施泄於腎',
    translation: '혈이란 수곡의 정이다. 비에서 생화되고, 심이 총통하며, 간에 저장되고, 폐에서 선포되며, 신에서 시설된다.',
    annotation: '혈의 생성과 순환에 관한 오장의 역할.',
    keywords: ['혈', '오장', '생화', '비'],
  },
  {
    id: '26',
    bookId: '1',
    bookTitle: '동의보감',
    chapter: '내경편 기',
    originalText: '人之生 氣之聚也 聚則爲生 散則爲死 故曰 一息不運則機緘窮 一毫不續則穹壤判',
    translation: '사람이 사는 것은 기가 모인 것이다. 모이면 살고 흩어지면 죽는다. 그러므로 한 번의 호흡이 운행되지 않으면 기틀이 다하고, 한 터럭만큼이라도 이어지지 않으면 하늘과 땅이 나뉜다.',
    annotation: '기의 중요성과 생명의 원리.',
    keywords: ['기', '생명', '호흡', '취산'],
  },
  {
    id: '27',
    bookId: '1',
    bookTitle: '동의보감',
    chapter: '외형편 두',
    originalText: '頭者 諸陽之會也 上丹田也 百神所集 萬神咸會',
    translation: '머리는 여러 양의 모임이요, 상단전이며, 백신이 모이는 곳이고, 만신이 다 모이는 곳이다.',
    annotation: '두부의 중요성과 양기의 집결처.',
    keywords: ['두', '제양', '상단전', '백신'],
  },
  {
    id: '28',
    bookId: '1',
    bookTitle: '동의보감',
    chapter: '잡병편 풍',
    originalText: '風者 百病之長也 善行而數變',
    translation: '풍은 백병의 장(長)이니, 잘 다니고 자주 변한다.',
    annotation: '풍사의 특성: 선행(善行)과 수변(數變).',
    keywords: ['풍', '백병지장', '선행', '수변'],
  },

  // ===== 난경 =====
  {
    id: '29',
    bookId: '20',
    bookTitle: '난경',
    chapter: '일난',
    originalText: '十二經皆有動脈 獨取寸口 以決五臟六腑死生吉凶之法 何謂也',
    translation: '십이경에 모두 동맥이 있는데 홀로 촌구를 취하여 오장육부의 사생길흉을 결정하는 법은 무엇인가?',
    annotation: '촌구맥진의 이론적 근거를 묻는 첫 번째 난.',
    keywords: ['촌구', '맥진', '십이경', '동맥'],
  },
  {
    id: '30',
    bookId: '20',
    bookTitle: '난경',
    chapter: '팔난',
    originalText: '諸十二經脈者 皆繫於生氣之原 所謂生氣之原者 謂十二經之根本也 謂腎間動氣也',
    translation: '모든 십이경맥은 생기의 근원에 연결되어 있다. 이른바 생기의 근원이란 십이경의 근본이요, 신간동기(腎間動氣)를 말한다.',
    annotation: '신간동기, 즉 원기(元氣)가 경맥의 근본임을 설명.',
    keywords: ['생기지원', '신간동기', '원기', '십이경'],
  },
  {
    id: '31',
    bookId: '20',
    bookTitle: '난경',
    chapter: '이십이난',
    originalText: '經言脈有是動 有所生病 二者何也',
    translation: '경에서 말하기를 맥에 시동(是動)과 소생병(所生病) 두 가지가 있다고 하였는데, 이 둘은 무엇인가?',
    annotation: '경락병증의 시동병과 소생병의 구분.',
    keywords: ['시동병', '소생병', '경락', '병증'],
  },
  {
    id: '32',
    bookId: '20',
    bookTitle: '난경',
    chapter: '사십이난',
    originalText: '經言肝主色 心主臭 脾主味 肺主聲 腎主液 鼻者肺之候 而反知香臭 耳者腎之候 而反聞聲 其意何也',
    translation: '경에서 말하기를 간은 색을 주관하고, 심은 취(臭)를 주관하고, 비는 맛을 주관하고, 폐는 소리를 주관하고, 신은 액을 주관한다고 하였다. 그런데 코는 폐의 후(候)인데 오히려 향취를 알고, 귀는 신의 후인데 오히려 소리를 듣는다. 그 뜻은 무엇인가?',
    annotation: '오장과 오관의 관계 및 상호작용 설명.',
    keywords: ['오장', '오관', '간주색', '폐주성'],
  },
  {
    id: '33',
    bookId: '20',
    bookTitle: '난경',
    chapter: '육십육난',
    originalText: '經言肺之原出於太淵 心之原出於大陵 肝之原出於太衝 脾之原出於太白 腎之原出於太谿',
    translation: '경에서 말하기를 폐의 원혈은 태연에서 나오고, 심의 원혈은 대릉에서 나오고, 간의 원혈은 태충에서 나오고, 비의 원혈은 태백에서 나오고, 신의 원혈은 태계에서 나온다고 하였다.',
    annotation: '오장의 원혈을 설명한 구절.',
    keywords: ['원혈', '태연', '태충', '태계'],
  },

  // ===== 본초 =====
  {
    id: '34',
    bookId: '22',
    bookTitle: '신농본초경',
    chapter: '상품 인삼',
    originalText: '人蔘 味甘微寒 主補五臟 安精神 定魂魄 止驚悸 除邪氣 明目 開心益智 久服輕身延年',
    translation: '인삼은 맛이 달고 약간 차다. 주로 오장을 보하고, 정신을 안정시키며, 혼백을 정하고, 경계를 멎게 하며, 사기를 제거하고, 눈을 밝게 하며, 마음을 열어 지혜롭게 한다. 오래 복용하면 몸이 가벼워지고 수명이 연장된다.',
    annotation: '인삼의 기본 효능. 상품(上品) 약재의 대표.',
    keywords: ['인삼', '보오장', '안정신', '상품'],
  },
  {
    id: '35',
    bookId: '22',
    bookTitle: '신농본초경',
    chapter: '상품 감초',
    originalText: '甘草 味甘平 主五臟六腑寒熱邪氣 堅筋骨 長肌肉 倍力 金瘡腫 解毒 久服輕身延年',
    translation: '감초는 맛이 달고 평하다. 주로 오장육부의 한열사기를 다스리고, 근골을 견고하게 하며, 기육을 자라게 하고, 힘을 배로 늘리며, 금창종을 치료하고, 독을 푼다. 오래 복용하면 몸이 가벼워지고 수명이 연장된다.',
    annotation: '감초의 효능. 조화제로서의 역할.',
    keywords: ['감초', '해독', '조화', '평'],
  },
  {
    id: '36',
    bookId: '22',
    bookTitle: '신농본초경',
    chapter: '상품 황기',
    originalText: '黃耆 味甘微溫 主癰疽久敗創 排膿止痛 大風癩疾 五痔鼠瘻 補虛 小兒百病',
    translation: '황기는 맛이 달고 약간 따뜻하다. 주로 옹저가 오래되어 괴저가 된 것, 농을 배출하고 통증을 멎게 하며, 대풍나질, 오치서루를 치료하고, 허를 보하며, 소아의 백병을 치료한다.',
    annotation: '황기의 보기 작용과 창양 치료 효능.',
    keywords: ['황기', '보허', '배농', '보기'],
  },
  {
    id: '37',
    bookId: '5',
    bookTitle: '본초강목',
    chapter: '초부 당귀',
    originalText: '當歸 血藥也 活血以補血 又能通利經脈',
    translation: '당귀는 혈약이다. 혈을 활하여 혈을 보하고, 또한 경맥을 통리할 수 있다.',
    annotation: '당귀의 보혈활혈 작용.',
    keywords: ['당귀', '보혈', '활혈', '통경'],
  },

  // ===== 온병학 =====
  {
    id: '38',
    bookId: '15',
    bookTitle: '온열론',
    chapter: '본론',
    originalText: '溫邪上受 首先犯肺 逆傳心包',
    translation: '온사는 위로 받아들여 먼저 폐를 범하고, 역전하여 심포에 전해진다.',
    annotation: '온병의 전변 법칙. 위기영혈 변증의 기초.',
    keywords: ['온사', '폐', '심포', '역전'],
  },
  {
    id: '39',
    bookId: '15',
    bookTitle: '온열론',
    chapter: '본론',
    originalText: '衛之後方言氣 營之後方言血',
    translation: '위분 다음에 기분을 말하고, 영분 다음에 혈분을 말한다.',
    annotation: '위기영혈의 순서적 전변.',
    keywords: ['위분', '기분', '영분', '혈분'],
  },
  {
    id: '40',
    bookId: '14',
    bookTitle: '온병조변',
    chapter: '상초편',
    originalText: '凡病溫者 始於上焦 在手太陰',
    translation: '무릇 온병은 상초에서 시작하니, 수태음폐경에 있다.',
    annotation: '삼초변증에서 온병이 상초폐에서 시작함을 설명.',
    keywords: ['온병', '상초', '수태음', '폐'],
  },
  {
    id: '41',
    bookId: '14',
    bookTitle: '온병조변',
    chapter: '상초편',
    originalText: '太陰溫病 但咳 身不甚熱 微渴者 辛凉輕劑 桑菊飮主之',
    translation: '태음온병에 다만 기침만 하고 몸에 열이 심하지 않으며 약간 갈증이 있으면 신량경제인 상국음으로 치료한다.',
    annotation: '상국음의 적응증. 온병 초기 폐위증.',
    keywords: ['상국음', '태음온병', '해소', '신량'],
  },

  // ===== 비위론 =====
  {
    id: '42',
    bookId: '10',
    bookTitle: '비위론',
    chapter: '비위허즉구규지관불리논',
    originalText: '脾胃俱虛 則不能食而瘦 或少食而肥 雖肥而四肢不擧 蓋脾虛則怠惰嗜臥',
    translation: '비위가 모두 허하면 먹지 못하고 야위거나, 혹은 적게 먹으면서 살찌나 비록 살찌더라도 사지를 들지 못한다. 대개 비허하면 게을러지고 눕기를 좋아한다.',
    annotation: '비위허의 다양한 증상 양상.',
    keywords: ['비위허', '비만', '수척', '권태'],
  },
  {
    id: '43',
    bookId: '10',
    bookTitle: '비위론',
    chapter: '음식노권소상원기론',
    originalText: '飮食失節 寒溫不適 則脾胃乃傷',
    translation: '음식에 절도가 없고 한온이 적절하지 않으면 비위가 상한다.',
    annotation: '비위 손상의 기본 원인.',
    keywords: ['음식', '비위', '실절', '손상'],
  },

  // ===== 동의수세보원 =====
  {
    id: '44',
    bookId: '8',
    bookTitle: '동의수세보원',
    chapter: '사단론',
    originalText: '肺大而肝小者 名曰太陽人 肝大而肺小者 名曰太陰人 脾大而腎小者 名曰少陽人 腎大而脾小者 名曰少陰人',
    translation: '폐가 크고 간이 작은 자를 태양인이라 하고, 간이 크고 폐가 작은 자를 태음인이라 하며, 비가 크고 신이 작은 자를 소양인이라 하고, 신이 크고 비가 작은 자를 소음인이라 한다.',
    annotation: '사상인의 장부 대소 기준.',
    keywords: ['사상인', '태양인', '태음인', '소양인', '소음인'],
  },
  {
    id: '45',
    bookId: '8',
    bookTitle: '동의수세보원',
    chapter: '확충론',
    originalText: '太陽人 恒有怒心 太陰人 恒有樂心 少陽人 恒有哀心 少陰人 恒有喜心',
    translation: '태양인은 항상 노(怒)의 마음이 있고, 태음인은 항상 락(樂)의 마음이 있으며, 소양인은 항상 애(哀)의 마음이 있고, 소음인은 항상 희(喜)의 마음이 있다.',
    annotation: '사상인별 항상적 정서 특성.',
    keywords: ['사상인', '정서', '희노애락', '성정'],
  },

  // ===== 침구 =====
  {
    id: '46',
    bookId: '27',
    bookTitle: '침구갑을경',
    chapter: '경락유주',
    originalText: '手太陰肺之脈 起於中焦 下絡大腸 還循胃口 上膈屬肺',
    translation: '수태음폐경의 맥은 중초에서 시작하여 아래로 대장에 연락하고, 위구를 돌아 횡격막 위로 올라가 폐에 속한다.',
    annotation: '수태음폐경의 유주 경로.',
    keywords: ['수태음폐경', '유주', '중초', '대장'],
  },
  {
    id: '47',
    bookId: '28',
    bookTitle: '침구대성',
    chapter: '표리원락',
    originalText: '原者 臟腑之氣所出 絡者 經脈之氣所行',
    translation: '원혈은 장부의 기가 나오는 곳이고, 락혈은 경맥의 기가 행하는 곳이다.',
    annotation: '원혈과 락혈의 정의.',
    keywords: ['원혈', '락혈', '장부', '경맥'],
  },
  {
    id: '48',
    bookId: '28',
    bookTitle: '침구대성',
    chapter: '사총혈가',
    originalText: '肚腹三里留 腰背委中求 頭項尋列缺 面口合谷收',
    translation: '배와 아랫배는 족삼리에서 치료하고, 허리와 등은 위중에서 구하며, 머리와 목은 열결에서 찾고, 얼굴과 입은 합곡에서 거둔다.',
    annotation: '사총혈의 암송가. 임상 요혈의 정리.',
    keywords: ['사총혈', '족삼리', '위중', '열결', '합곡'],
  },

  // ===== 맥경 =====
  {
    id: '49',
    bookId: '43',
    bookTitle: '맥경',
    chapter: '분별삼관경계맥',
    originalText: '從魚際至高骨 却行一寸 其中名曰寸口 從寸至尺 名曰尺澤 故曰尺寸',
    translation: '어제로부터 고골에 이르러 뒤로 1촌을 가면 그 중간을 촌구라 한다. 촌에서 척에 이르는 것을 척택이라 한다. 그러므로 척촌이라 한다.',
    annotation: '촌구와 척의 위치 설명.',
    keywords: ['촌구', '척택', '어제', '맥진'],
  },
  {
    id: '50',
    bookId: '43',
    bookTitle: '맥경',
    chapter: '평맥법',
    originalText: '脈有三部 部有四經 所謂三部者 寸關尺也 所謂四經者 謂手太陰肺 手陽明大腸 足厥陰肝 足少陽膽',
    translation: '맥에는 세 부위가 있고, 각 부위에는 네 가지 경이 있다. 이른바 삼부란 촌관척이다. 이른바 사경이란 수태음폐, 수양명대장, 족궐음간, 족소양담이다.',
    annotation: '삼부와 사경의 배속.',
    keywords: ['삼부', '촌관척', '사경', '배속'],
  },

  // ===== 소아과 =====
  {
    id: '51',
    bookId: '39',
    bookTitle: '소아약증직결',
    chapter: '오장변증',
    originalText: '面上證 左腮爲肝 右腮爲肺 額上爲心 鼻爲脾 頦爲腎',
    translation: '얼굴의 증상에서 왼쪽 뺨은 간이고, 오른쪽 뺨은 폐이며, 이마는 심이고, 코는 비이며, 턱은 신이다.',
    annotation: '소아 면진법. 오장을 얼굴에 배속.',
    keywords: ['면진', '소아', '오장', '뺨'],
  },
  {
    id: '52',
    bookId: '39',
    bookTitle: '소아약증직결',
    chapter: '허실변증',
    originalText: '小兒之臟腑柔弱 易虛易實 易寒易熱',
    translation: '소아의 장부는 유약하여 허해지기 쉽고 실해지기 쉬우며, 차가워지기 쉽고 열나기 쉽다.',
    annotation: '소아 생리 특성: 장부 미숙으로 인한 변화무쌍함.',
    keywords: ['소아', '장부유약', '역허역실', '역한역열'],
  },

  // ===== 외과 =====
  {
    id: '53',
    bookId: '41',
    bookTitle: '외과정종',
    chapter: '창양총론',
    originalText: '癰疽原是火毒生 經絡阻隔氣血凝',
    translation: '옹저는 원래 화독에서 생기며, 경락이 막히고 기혈이 응체된다.',
    annotation: '옹저의 기본 병기: 화독과 기혈 울체.',
    keywords: ['옹저', '화독', '경락', '기혈응'],
  },

  // ===== 의림개착 =====
  {
    id: '54',
    bookId: '9',
    bookTitle: '의림개착',
    chapter: '혈부론',
    originalText: '血府即胸中心肺之間 亦可言爲腦海',
    translation: '혈부는 바로 흉중의 심폐 사이이며, 또한 뇌해라고도 할 수 있다.',
    annotation: '혈부의 위치에 대한 왕청임의 견해.',
    keywords: ['혈부', '흉중', '심폐', '뇌해'],
  },
  {
    id: '55',
    bookId: '9',
    bookTitle: '의림개착',
    chapter: '어혈론',
    originalText: '不論何病 凡有瘀血者 皆可活血化瘀',
    translation: '어떤 병이든 어혈이 있으면 모두 활혈화어할 수 있다.',
    annotation: '활혈화어법의 광범위한 적용.',
    keywords: ['어혈', '활혈화어', '치법'],
  },
]

export default function ClassicsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState<ClassicText | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [searchResults, setSearchResults] = useState<TextPassage[]>([])
  const [showResults, setShowResults] = useState(false)

  const categories = ['전체', '종합의서', '상한', '잡병', '기초이론', '본초', '사상의학', '침구', '방제', '부인과', '소아과', '외과', '진단']

  const filteredClassics = classics.filter((book) => {
    const matchesSearch =
      !searchQuery ||
      book.title.includes(searchQuery) ||
      book.titleHanja.includes(searchQuery) ||
      book.author.includes(searchQuery)

    const matchesCategory =
      selectedCategory === '전체' || book.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleSearch = () => {
    if (!searchQuery.trim()) return

    const results = demoPassages.filter(
      (p) =>
        p.originalText.includes(searchQuery) ||
        p.translation.includes(searchQuery) ||
        p.keywords.some((k) => k.includes(searchQuery))
    )
    setSearchResults(results)
    setShowResults(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-amber-500" />
          고전 원문 검색
        </h1>
        <p className="mt-1 text-gray-500">
          한의학 고전의 원문과 해석을 검색하세요
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="원문, 해석, 키워드로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
          >
            검색
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setShowResults(false)
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                selectedCategory === category
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">
              검색 결과 ({searchResults.length}건)
            </h2>
            <button
              onClick={() => setShowResults(false)}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              목록으로
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <ScrollText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((passage) => (
                <div
                  key={passage.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BookMarked className="h-5 w-5 text-amber-500" />
                    <span className="font-medium text-gray-900">{passage.bookTitle}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{passage.chapter}</span>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl mb-4 border-l-4 border-amber-400">
                    <Quote className="h-5 w-5 text-amber-400 mb-2" />
                    <p className="text-lg text-gray-900 font-medium leading-relaxed">
                      {passage.originalText}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{passage.translation}</p>
                  </div>

                  {passage.annotation && (
                    <div className="p-3 bg-gray-50 rounded-lg mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-700">주석:</span> {passage.annotation}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {passage.keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg cursor-pointer hover:bg-amber-200"
                        onClick={() => {
                          setSearchQuery(keyword)
                          handleSearch()
                        }}
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book List */}
      {!showResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassics.map((book) => (
            <div
              key={book.id}
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-amber-200 transition-all cursor-pointer"
              onClick={() => setSelectedBook(book)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-sm text-gray-500">{book.titleHanja}</p>
                  </div>
                </div>
                {book.isFavorite && (
                  <Star className="h-5 w-5 text-amber-400 fill-current" />
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-gray-400">저자:</span>
                  <span>{book.author} ({book.dynasty})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                    {book.category}
                  </span>
                  <span className="text-xs text-gray-400">{book.chapters}편</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {book.description}
              </p>

              <div className="flex items-center text-sm font-medium text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                원문 보기
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {selectedBook.title}
                  <span className="text-lg text-gray-500">{selectedBook.titleHanja}</span>
                </h2>
                <p className="text-gray-500 mt-1">
                  {selectedBook.author} · {selectedBook.dynasty}
                </p>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-amber-900">{selectedBook.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">분류</p>
                  <p className="font-medium text-gray-900">{selectedBook.category}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">편수</p>
                  <p className="font-medium text-gray-900">{selectedBook.chapters}편</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3">관련 원문</h3>
                <div className="space-y-3">
                  {demoPassages
                    .filter((p) => p.bookId === selectedBook.id)
                    .slice(0, 3)
                    .map((passage) => (
                      <div key={passage.id} className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-2">{passage.chapter}</p>
                        <p className="text-gray-900 mb-2">{passage.originalText}</p>
                        <p className="text-sm text-gray-600">{passage.translation}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBook(null)}
              className="w-full mt-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
