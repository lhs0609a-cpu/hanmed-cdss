export interface HealthCheckItem {
  slug: string
  title: string
  subtitle: string
  description: string
  emoji: string
  category: string
  participantCount: number
  estimatedMinutes: number
  questions: string[]
  result: {
    lowThreshold: number
    midThreshold: number
    levels: {
      low: { label: string; description: string }
      mid: { label: string; description: string }
      high: { label: string; description: string }
    }
    koreanMedicine: {
      term: string
      termHanja: string
      explanation: string
    }
    tips: { icon: string; title: string; description: string }[]
    warnings: string[]
  }
}

export const healthChecks: HealthCheckItem[] = [
  {
    slug: 'eye-twitch',
    title: '눈 밑이 자주 떨리는 사람',
    subtitle: '눈떨림 체크',
    description:
      '눈 밑이 파르르 떨리는 증상, 단순 피로일까요? 한의학에서는 혈허(血虛)의 신호로 봅니다. 내 몸이 보내는 신호를 확인해보세요.',
    emoji: '👁️',
    category: '피로',
    participantCount: 12847,
    estimatedMinutes: 2,
    questions: [
      '눈 밑이나 눈꺼풀이 자주 떨린다',
      '피곤하면 눈떨림이 심해진다',
      '잠을 자도 개운하지 않다',
      '어지럽거나 눈앞이 핑 도는 느낌이 있다',
      '얼굴색이 창백하거나 누렇다는 말을 듣는다',
      '손톱이 잘 부러지거나 세로줄이 있다',
      '생리량이 적거나 생리주기가 불규칙하다 (해당 시)',
      '근육이 자주 뭉치거나 쥐가 잘 난다',
    ],
    result: {
      lowThreshold: 3,
      midThreshold: 5,
      levels: {
        low: {
          label: '경미',
          description:
            '일시적 피로나 스트레스로 인한 증상일 가능성이 높습니다. 충분한 휴식과 영양 섭취로 개선될 수 있어요.',
        },
        mid: {
          label: '주의',
          description:
            '혈허(血虛) 경향이 보입니다. 몸에 피(혈)가 부족해지면서 근육과 신경에 영양공급이 원활하지 않을 수 있어요.',
        },
        high: {
          label: '관리 필요',
          description:
            '혈허 증상이 뚜렷합니다. 눈떨림 외에도 다양한 부수 증상이 동반될 수 있으니, 한의사 상담을 권합니다.',
        },
      },
      koreanMedicine: {
        term: '혈허',
        termHanja: '血虛',
        explanation:
          '한의학에서 "혈(血)"은 단순한 피가 아니라, 온몸에 영양과 윤택함을 공급하는 물질입니다. 혈이 부족하면 근육에 영양이 제대로 전달되지 않아 경련(떨림)이 생기고, 피부·손톱·모발이 건조해지며, 어지러움이 나타납니다. 특히 여성은 생리·출산으로 혈이 소모되기 쉬워 눈떨림이 더 잘 나타납니다.',
      },
      tips: [
        {
          icon: '🍵',
          title: '대추차·구기자차',
          description:
            '대추(大棗)는 보혈의 대표 약재입니다. 구기자와 함께 끓여 마시면 간과 혈을 보해줍니다. 하루 대추 5~7개를 물에 끓여 드세요.',
        },
        {
          icon: '🥬',
          title: '시금치, 당근, 검은깨',
          description:
            '철분과 엽산이 풍부한 녹색 채소, 비타민A가 풍부한 당근, 보혈 식품인 검은깨를 자주 섭취하세요.',
        },
        {
          icon: '📍',
          title: '혈자리: 혈해혈(血海穴)',
          description:
            '무릎 안쪽 위 2치(약 3cm) 지점의 혈해혈을 하루 2~3회, 30초씩 지압하면 혈 순환에 도움이 됩니다.',
        },
      ],
      warnings: [
        '눈떨림이 2주 이상 지속될 때',
        '눈떨림과 함께 얼굴 근육이 같이 떨릴 때',
        '시력 변화가 동반될 때',
        '한쪽 눈만 지속적으로 떨릴 때',
      ],
    },
  },
  {
    slug: 'dawn-wake',
    title: '새벽에 꼭 깨는 사람',
    subtitle: '새벽기상 체크',
    description:
      '알람 없이 새벽 3~5시에 눈이 떠지나요? 한의학에서는 자오유주(子午流注) 이론으로 이 시간대의 각성을 간(肝)·폐(肺)와 연결합니다.',
    emoji: '🌙',
    category: '잠',
    participantCount: 18392,
    estimatedMinutes: 2,
    questions: [
      '새벽 3~5시 사이에 자주 깬다',
      '한번 깨면 다시 잠들기 어렵다',
      '꿈을 많이 꾸고 선명하게 기억한다',
      '잠자리에서 한숨이나 깊은 숨을 자주 쉰다',
      '스트레스를 받으면 잠이 더 안 온다',
      '눈이 뻑뻑하거나 충혈되기 쉽다',
      '옆구리나 가슴이 답답한 느낌이 있다',
      '화가 나면 잘 삭이지 못하는 편이다',
    ],
    result: {
      lowThreshold: 3,
      midThreshold: 5,
      levels: {
        low: {
          label: '경미',
          description:
            '일시적 수면 패턴 변화일 수 있습니다. 수면 위생 개선으로 충분히 호전될 수 있어요.',
        },
        mid: {
          label: '주의',
          description:
            '간기울결(肝氣鬱結) 경향이 보입니다. 억눌린 감정이나 스트레스가 간의 소설(疏泄) 기능을 방해하고 있을 수 있어요.',
        },
        high: {
          label: '관리 필요',
          description:
            '간화(肝火)가 상승하여 수면을 방해하고 있을 가능성이 높습니다. 장기적으로 건강에 영향을 줄 수 있으니 전문 상담을 권합니다.',
        },
      },
      koreanMedicine: {
        term: '간기울결·자오유주',
        termHanja: '肝氣鬱結·子午流注',
        explanation:
          '한의학의 자오유주(子午流注) 이론에 따르면 새벽 1~3시는 간(肝), 3~5시는 폐(肺)의 기운이 왕성한 시간입니다. 이 시간에 반복적으로 깨는 것은 간의 기운이 울체되어 열이 위로 올라가거나, 폐기가 약해져 호흡과 기의 순환이 원활하지 못한 것과 관련됩니다. 특히 스트레스가 많은 현대인에게 간기울결로 인한 새벽 각성이 매우 흔합니다.',
      },
      tips: [
        {
          icon: '🍵',
          title: '국화차·산조인차',
          description:
            '국화(菊花)는 간열을 내려주고, 산조인(酸棗仁)은 마음을 편안하게 해줍니다. 취침 1시간 전에 따뜻하게 마셔보세요.',
        },
        {
          icon: '🧘',
          title: '취침 전 스트레칭',
          description:
            '잠들기 전 10분간 옆구리 스트레칭으로 간경(肝經)을 풀어주세요. 양쪽으로 몸을 기울여 옆구리를 늘리는 동작이 효과적입니다.',
        },
        {
          icon: '📍',
          title: '혈자리: 태충혈(太衝穴)',
          description:
            '발등의 엄지와 검지 사이 움푹 들어간 곳의 태충혈을 지압하면 간기울결을 풀어주는 데 도움이 됩니다.',
        },
      ],
      warnings: [
        '한 달 이상 거의 매일 새벽에 깰 때',
        '수면 부족으로 낮 활동에 지장이 있을 때',
        '식은땀이나 가슴 두근거림이 동반될 때',
        '우울감이나 불안감이 심해질 때',
      ],
    },
  },
  {
    slug: 'dry-mouth',
    title: '입이 자꾸 마르는 사람',
    subtitle: '입마름 체크',
    description:
      '물을 마셔도 입이 계속 마르고 목이 건조한가요? 한의학에서는 음허(陰虛)의 신호로 봅니다. 몸속 진액 상태를 확인해보세요.',
    emoji: '💧',
    category: '소화',
    participantCount: 9563,
    estimatedMinutes: 2,
    questions: [
      '입이 자주 마르고 물을 자주 찾는다',
      '입술이 잘 갈라지고 건조하다',
      '밤에 잘 때 입이 더 마른다',
      '목이 자주 건조하고 가래가 잘 안 나온다',
      '손바닥·발바닥에 열감이 있다',
      '변비가 있거나 변이 딱딱한 편이다',
      '피부가 전체적으로 건조한 편이다',
      '오후에 미열이 오르거나 얼굴이 달아오른다',
    ],
    result: {
      lowThreshold: 3,
      midThreshold: 5,
      levels: {
        low: {
          label: '경미',
          description:
            '수분 섭취 부족이나 환경적 건조함으로 인한 일시적 증상일 수 있습니다.',
        },
        mid: {
          label: '주의',
          description:
            '음허(陰虛) 경향이 보입니다. 몸속 진액(수분)이 부족해져 윤택함이 사라지고 있을 수 있어요.',
        },
        high: {
          label: '관리 필요',
          description:
            '음허 증상이 뚜렷합니다. 건조함이 전신에 영향을 주고 있으니, 체질에 맞는 한의학적 관리가 필요합니다.',
        },
      },
      koreanMedicine: {
        term: '음허',
        termHanja: '陰虛',
        explanation:
          '한의학에서 "음(陰)"은 몸을 촉촉하게 적시고 열을 식혀주는 물질(진액, 혈 등)을 말합니다. 음이 부족해지면 몸 곳곳이 건조해지고, 상대적으로 열이 떠올라 입마름·피부건조·변비 등이 나타납니다. 과로, 수면 부족, 매운 음식, 스트레스가 음을 소모하는 주요 원인입니다.',
      },
      tips: [
        {
          icon: '🍵',
          title: '맥문동차·오미자차',
          description:
            '맥문동(麥門冬)은 폐와 위의 음을 보충해주는 대표 약재입니다. 오미자와 함께 끓여 마시면 진액 생성에 도움이 됩니다.',
        },
        {
          icon: '🍐',
          title: '배, 연근, 흰 목이버섯',
          description:
            '배와 연근은 폐를 윤택하게 하고, 흰 목이버섯(은이)은 음을 보하는 대표 식재료입니다.',
        },
        {
          icon: '📍',
          title: '혈자리: 조해혈(照海穴)',
          description:
            '안쪽 복사뼈 바로 아래 움푹 들어간 곳의 조해혈은 음을 보하고 인후를 윤택하게 하는 혈자리입니다.',
        },
      ],
      warnings: [
        '갈증과 함께 소변량이 많아졌을 때 (당뇨 가능성)',
        '입마름과 함께 눈도 심하게 건조할 때',
        '3개월 이상 증상이 지속될 때',
        '약물 복용 중 입마름이 심해졌을 때',
      ],
    },
  },
  {
    slug: 'cold-hands',
    title: '손발이 항상 찬 사람',
    subtitle: '손발냉증 체크',
    description:
      '여름에도 손발이 차갑고 양말 없이는 못 자나요? 한의학에서는 양허(陽虛)의 신호로 봅니다. 내 몸의 온기 상태를 확인해보세요.',
    emoji: '🧊',
    category: '냉증',
    participantCount: 21034,
    estimatedMinutes: 2,
    questions: [
      '손발이 항상 차갑다',
      '겨울뿐 아니라 여름에도 손발이 시리다',
      '아랫배가 차갑거나 시린 느낌이 있다',
      '찬 음식을 먹으면 배가 아프거나 설사한다',
      '추위를 많이 타고 따뜻한 것을 좋아한다',
      '소변이 맑고 자주 보는 편이다',
      '무릎이나 허리가 시리거나 아프다',
      '피로감을 자주 느끼고 기력이 없다',
    ],
    result: {
      lowThreshold: 3,
      midThreshold: 5,
      levels: {
        low: {
          label: '경미',
          description:
            '말초 혈액순환이 다소 저하된 상태일 수 있습니다. 운동과 보온으로 개선될 수 있어요.',
        },
        mid: {
          label: '주의',
          description:
            '양허(陽虛) 경향이 보입니다. 몸의 양기(온기)가 부족하여 사지 말단까지 온기가 전달되지 못하고 있을 수 있어요.',
        },
        high: {
          label: '관리 필요',
          description:
            '양허 증상이 뚜렷합니다. 소화기와 신장의 양기 보강이 필요하며, 체질에 맞는 관리를 권합니다.',
        },
      },
      koreanMedicine: {
        term: '양허',
        termHanja: '陽虛',
        explanation:
          '한의학에서 "양(陽)"은 몸을 따뜻하게 하고 기능을 활성화하는 에너지입니다. 양이 부족하면 체온 유지가 어려워져 손발부터 차가워지고, 소화력이 떨어지며, 면역력이 약해집니다. 특히 비위(脾胃)와 신장(腎)의 양기가 중요한데, 찬 음식, 과로, 체력 저하가 양허의 주요 원인입니다.',
      },
      tips: [
        {
          icon: '🍵',
          title: '생강차·계피차',
          description:
            '생강(生薑)과 계피(肉桂)는 양기를 따뜻하게 보해주는 대표 식품입니다. 하루 1~2잔 따뜻하게 마셔보세요.',
        },
        {
          icon: '🫚',
          title: '양고기, 마늘, 부추',
          description:
            '양고기는 대표적 온성(溫性) 식품이고, 마늘·부추도 양기를 돋우는 음식입니다. 찬 음식은 줄이세요.',
        },
        {
          icon: '📍',
          title: '혈자리: 관원혈(關元穴)',
          description:
            '배꼽 아래 3치(약 4.5cm) 지점의 관원혈을 따뜻한 손으로 문지르거나 쑥뜸을 하면 양기 보충에 도움됩니다.',
        },
      ],
      warnings: [
        '손발이 보라색으로 변하거나 감각이 없을 때',
        '한쪽만 유독 차갑거나 부어오를 때',
        '냉증과 함께 체중이 갑자기 변할 때',
        '심한 생리통이나 생리불순이 동반될 때',
      ],
    },
  },
  {
    slug: 'after-meal-sleepy',
    title: '밥 먹으면 무조건 졸린 사람',
    subtitle: '식후졸림 체크',
    description:
      '식사 후 눈꺼풀이 천근만근? 단순 식곤증이 아닐 수 있습니다. 한의학에서는 비위기허(脾胃氣虛)의 신호로 봅니다.',
    emoji: '😴',
    category: '소화',
    participantCount: 15728,
    estimatedMinutes: 2,
    questions: [
      '식사 후 반드시 졸리다',
      '밥을 먹으면 배가 더부룩하고 가스가 찬다',
      '소화가 잘 안 되는 편이다',
      '식욕이 없거나, 먹어도 맛을 잘 모르겠다',
      '팔다리에 힘이 없고 무거운 느낌이 있다',
      '대변이 무르거나 설사를 자주 한다',
      '아침에 일어나기 힘들고 머리가 무겁다',
      '조금만 움직여도 쉽게 피곤하다',
    ],
    result: {
      lowThreshold: 3,
      midThreshold: 5,
      levels: {
        low: {
          label: '경미',
          description:
            '일반적인 식곤증 범위입니다. 식사량 조절과 가벼운 산책으로 개선될 수 있어요.',
        },
        mid: {
          label: '주의',
          description:
            '비위기허(脾胃氣虛) 경향이 보입니다. 소화기의 기운이 약해져 음식을 에너지로 잘 바꾸지 못하고 있을 수 있어요.',
        },
        high: {
          label: '관리 필요',
          description:
            '비위 기능이 상당히 저하된 상태입니다. 만성 피로와 소화 문제가 연결되어 있으니 전문 상담을 권합니다.',
        },
      },
      koreanMedicine: {
        term: '비위기허',
        termHanja: '脾胃氣虛',
        explanation:
          '한의학에서 비위(脾胃)는 음식을 소화하고 영양분(기혈)을 만들어 온몸에 보내는 "후천지본(後天之本)"입니다. 비위의 기운이 약하면 음식이 들어와도 제대로 소화·흡수하지 못해 영양이 에너지로 전환되지 않고, 오히려 졸림·더부룩함·피로로 나타납니다. 불규칙한 식사, 찬 음식, 과식, 걱정이 비위를 상하게 합니다.',
      },
      tips: [
        {
          icon: '🍵',
          title: '사군자차·보리차',
          description:
            '인삼·백출·복령·감초로 구성된 사군자탕은 비위 보강의 대표 처방입니다. 간편하게는 볶은 보리차를 식후에 드세요.',
        },
        {
          icon: '🫘',
          title: '마(산약), 대추, 찹쌀',
          description:
            '마(산약)는 비위를 보하는 대표 식품이고, 대추·찹쌀도 비위의 기운을 돋워줍니다. 죽으로 먹으면 더 좋습니다.',
        },
        {
          icon: '📍',
          title: '혈자리: 족삼리(足三里)',
          description:
            '무릎 아래 3치(약 4.5cm), 정강이뼈 바깥쪽의 족삼리혈을 매일 지압하면 비위 기능 강화에 효과적입니다.',
        },
      ],
      warnings: [
        '식후 졸림이 매우 심해 일상에 지장이 있을 때',
        '체중이 갑자기 늘거나 줄 때',
        '대변에 소화되지 않은 음식이 보일 때',
        '식후 어지럽거나 식은땀이 날 때',
      ],
    },
  },
  {
    slug: 'hair-loss',
    title: '머리카락이 자꾸 빠지는 사람',
    subtitle: '탈모고민 체크',
    description:
      '샤워할 때 빠지는 머리카락이 걱정되시나요? 한의학에서는 탈모를 혈허(血虛)와 신허(腎虛)의 복합 신호로 봅니다.',
    emoji: '💇',
    category: '스트레스',
    participantCount: 24156,
    estimatedMinutes: 2,
    questions: [
      '머리카락이 예전보다 많이 빠진다',
      '머리카락이 가늘어지고 힘이 없다',
      '두피가 가렵거나 각질이 많다',
      '스트레스를 받으면 탈모가 심해지는 것 같다',
      '허리나 무릎이 시리거나 약한 편이다',
      '잠을 잘 못 자거나 수면의 질이 낮다',
      '눈이 자주 피로하고 시력이 떨어진 느낌이다',
      '기억력이나 집중력이 예전보다 떨어졌다',
    ],
    result: {
      lowThreshold: 3,
      midThreshold: 5,
      levels: {
        low: {
          label: '경미',
          description:
            '계절적 탈모나 일시적 스트레스성 탈모일 가능성이 높습니다. 생활 습관 개선으로 호전될 수 있어요.',
        },
        mid: {
          label: '주의',
          description:
            '혈허(血虛)·신허(腎虛) 경향이 보입니다. 모발에 영양을 공급하는 혈과 신정(腎精)이 부족해지고 있을 수 있어요.',
        },
        high: {
          label: '관리 필요',
          description:
            '혈허와 신허가 복합적으로 나타나고 있습니다. 체질에 맞는 적극적인 한의학적 관리를 권합니다.',
        },
      },
      koreanMedicine: {
        term: '혈허·신허',
        termHanja: '血虛·腎虛',
        explanation:
          '한의학에서 "발(髮)은 혈(血)의 나머지"라 하여, 혈이 충분해야 모발이 윤택합니다. 또한 "신(腎)은 골(骨)을 주관하고 그 영화가 발(髮)에 나타난다"고 하여, 신장의 정기가 모발의 성장과 직결됩니다. 과로, 스트레스, 수면 부족, 영양 불균형이 혈과 신정을 소모하여 탈모를 유발합니다.',
      },
      tips: [
        {
          icon: '🍵',
          title: '하수오차·흑두차',
          description:
            '하수오(何首烏)는 보혈·보신의 대표 약재이고, 검은콩(흑두)도 신장을 보합니다. 볶은 검은콩을 차로 마셔보세요.',
        },
        {
          icon: '🥜',
          title: '검은깨, 호두, 굴',
          description:
            '검은깨·호두는 신장을 보하고, 굴(牡蠣)은 아연이 풍부하여 모발 성장에 도움을 줍니다.',
        },
        {
          icon: '📍',
          title: '혈자리: 백회혈(百會穴)',
          description:
            '정수리 꼭대기의 백회혈을 매일 가볍게 두드리거나 지압하면 두피 혈액순환을 촉진합니다.',
        },
      ],
      warnings: [
        '갑자기 동전 크기로 빠질 때 (원형탈모)',
        '두피에 염증·통증·발적이 있을 때',
        '다른 부위(눈썹, 속눈썹)도 빠질 때',
        '약물 복용 후 탈모가 시작되었을 때',
      ],
    },
  },
]

export function getHealthCheckBySlug(slug: string): HealthCheckItem | undefined {
  return healthChecks.find((check) => check.slug === slug)
}
