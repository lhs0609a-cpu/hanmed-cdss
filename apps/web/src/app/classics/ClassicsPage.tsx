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
]

const demoPassages: TextPassage[] = [
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
    bookId: '1',
    bookTitle: '동의보감',
    chapter: '내경편 신형',
    originalText: '神者 心之主也 心者 神之舍也',
    translation: '신(神)은 마음의 주인이요, 마음은 신이 머무는 곳이다.',
    keywords: ['신', '심', '정신'],
  },
  {
    id: '5',
    bookId: '4',
    bookTitle: '황제내경',
    chapter: '소문 상고천진론',
    originalText: '上古之人 其知道者 法於陰陽 和於術數 食飲有節 起居有常 不妄作勞',
    translation: '상고시대의 사람들 중 도를 아는 자는 음양에 법하고, 술수에 화하며, 음식에 절도가 있고, 기거에 일정함이 있으며, 함부로 과로하지 않았다.',
    annotation: '양생(養生)의 기본 원칙을 설명한 구절.',
    keywords: ['양생', '음양', '절도'],
  },
]

export default function ClassicsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState<ClassicText | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [searchResults, setSearchResults] = useState<TextPassage[]>([])
  const [showResults, setShowResults] = useState(false)

  const categories = ['전체', '종합의서', '상한', '잡병', '기초이론', '본초', '사상의학']

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
