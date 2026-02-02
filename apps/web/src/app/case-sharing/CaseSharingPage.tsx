import { useState } from 'react';
import {
  BookOpen,
  Users,
  Star,
  MessageCircle,
  Bookmark,
  Heart,
  Search,
  Filter,
  Plus,
  Award,
  ChevronRight,
  RefreshCw,
  Eye,
  Share2,
  GraduationCap,
} from 'lucide-react';
import {
  useCases,
  useFeaturedCases,
  useCaseStatistics,
  usePopularTags,
  useExperts,
  useToggleLike,
  useToggleBookmark,
} from '@/hooks/useCaseSharing';

const categoryLabels: Record<string, string> = {
  internal: '내과',
  external: '외과',
  acupuncture: '침구',
  herbal: '한약',
  combined: '복합',
  pediatric: '소아',
  gynecology: '부인과',
  other: '기타',
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  beginner: { label: '초급', color: 'bg-green-100 text-green-700' },
  intermediate: { label: '중급', color: 'bg-blue-100 text-blue-700' },
  advanced: { label: '고급', color: 'bg-purple-100 text-purple-700' },
  expert: { label: '전문가', color: 'bg-red-100 text-red-700' },
};

export default function CaseSharingPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'featured' | 'experts' | 'my'>('browse');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    data: casesData,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useCases({
    keyword: searchKeyword,
    category: selectedCategory,
    difficulty: selectedDifficulty,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });
  const { data: featuredCases } = useFeaturedCases();
  const { data: statistics } = useCaseStatistics();
  const { data: popularTags } = usePopularTags();
  const { data: experts } = useExperts({ availableOnly: true });

  const toggleLikeMutation = useToggleLike();
  const toggleBookmarkMutation = useToggleBookmark();

  const cases = casesData?.pages.flatMap((page) => page.cases) || [];

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">케이스 공유 네트워크</h1>
          <p className="text-gray-500 mt-1">한의원 네트워크 증례 공유 및 멘토링</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" />
          케이스 작성
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">총 케이스</p>
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{statistics?.totalCases || 0}건</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">공개 케이스</p>
            <Share2 className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{statistics?.publishedCases || 0}건</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">총 댓글</p>
            <MessageCircle className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{statistics?.totalComments || 0}개</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">등록 전문가</p>
            <GraduationCap className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{statistics?.totalExperts || 0}명</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-8">
          {[
            { key: 'browse', label: '케이스 검색', icon: Search },
            { key: 'featured', label: '추천 케이스', icon: Star },
            { key: 'experts', label: '전문가 멘토', icon: Award },
            { key: 'my', label: '내 케이스', icon: BookOpen },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="케이스 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h4 className="font-medium mb-3">카테고리</h4>
              <div className="space-y-2">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === key}
                      onChange={() => setSelectedCategory(selectedCategory === key ? undefined : key)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h4 className="font-medium mb-3">난이도</h4>
              <div className="space-y-2">
                {Object.entries(difficultyLabels).map(([key, { label }]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty"
                      checked={selectedDifficulty === key}
                      onChange={() =>
                        setSelectedDifficulty(selectedDifficulty === key ? undefined : key)
                      }
                      className="text-primary-600"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Popular Tags */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h4 className="font-medium mb-3">인기 태그</h4>
              <div className="flex flex-wrap gap-2">
                {popularTags?.slice(0, 15).map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => handleTagClick(tag.tag)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedTags.includes(tag.tag)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    #{tag.tag} ({tag.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cases List */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-primary-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {categoryLabels[caseItem.category]}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              difficultyLabels[caseItem.difficulty]?.color
                            }`}
                          >
                            {difficultyLabels[caseItem.difficulty]?.label}
                          </span>
                          {caseItem.status === 'featured' && (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              추천
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">{caseItem.title}</h3>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{caseItem.summary}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-sm text-gray-500">
                            {caseItem.patientInfo.gender === 'male' ? '남' : '여'},{' '}
                            {caseItem.patientInfo.ageRange}
                          </span>
                          <span className="text-sm text-gray-500">
                            {caseItem.patientInfo.mainSymptoms.slice(0, 3).join(', ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {caseItem.tags.slice(0, 5).map((tag) => (
                            <span key={tag} className="text-xs text-primary-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-4">
                        {!caseItem.isAnonymous && caseItem.author && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{caseItem.author.name}</p>
                              <p className="text-xs text-gray-500">{caseItem.author.clinicName}</p>
                            </div>
                          </div>
                        )}
                        {caseItem.isAnonymous && (
                          <span className="text-sm text-gray-500">익명</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLikeMutation.mutate(caseItem.id);
                          }}
                          className="flex items-center gap-1 text-gray-500 hover:text-red-500"
                        >
                          <Heart className="w-4 h-4" />
                          <span className="text-sm">{caseItem.statistics.likeCount}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmarkMutation.mutate(caseItem.id);
                          }}
                          className="flex items-center gap-1 text-gray-500 hover:text-amber-500"
                        >
                          <Bookmark className="w-4 h-4" />
                          <span className="text-sm">{caseItem.statistics.bookmarkCount}</span>
                        </button>
                        <span className="flex items-center gap-1 text-gray-500">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm">{caseItem.statistics.commentCount}</span>
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">{caseItem.statistics.viewCount}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {hasNextPage && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      {isFetchingNextPage ? (
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      ) : null}
                      더 보기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Featured Tab */}
      {activeTab === 'featured' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCases?.map((caseItem) => (
            <div
              key={caseItem.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm text-amber-600 font-medium">추천 케이스</span>
                </div>
                <h3 className="font-semibold text-lg">{caseItem.title}</h3>
                <p className="text-gray-500 text-sm mt-2 line-clamp-3">{caseItem.summary}</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                    {categoryLabels[caseItem.category]}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      difficultyLabels[caseItem.difficulty]?.color
                    }`}
                  >
                    {difficultyLabels[caseItem.difficulty]?.label}
                  </span>
                </div>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Heart className="w-4 h-4" />
                    {caseItem.statistics.likeCount}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Eye className="w-4 h-4" />
                    {caseItem.statistics.viewCount}
                  </span>
                </div>
                {caseItem.author && !caseItem.isAnonymous && (
                  <span className="text-sm text-gray-500">{caseItem.author.name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Experts Tab */}
      {activeTab === 'experts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experts?.map((expert) => (
            <div
              key={expert.id}
              className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-primary-200 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{expert.user?.name}</h4>
                    {expert.isAvailableForMentorship && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        멘토링 가능
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{expert.user?.clinicName}</p>
                  <p className="text-sm text-gray-500 mt-1">경력 {expert.yearsOfExperience}년</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {expert.specialty.slice(0, 4).map((spec) => (
                  <span
                    key={spec}
                    className="px-2 py-0.5 text-xs bg-primary-50 text-primary-700 rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>
              {expert.bio && (
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{expert.bio}</p>
              )}
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <BookOpen className="w-4 h-4" />
                    {expert.publishedCasesCount}개 케이스
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    {expert.menteeCount}명 멘티
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium">{expert.rating.toFixed(1)}</span>
                </div>
              </div>
              <button className="w-full mt-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
                멘토링 요청
              </button>
            </div>
          ))}
        </div>
      )}

      {/* My Cases Tab */}
      {activeTab === 'my' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">아직 작성한 케이스가 없습니다</h3>
          <p className="text-gray-500 mt-2">첫 번째 케이스를 공유해보세요</p>
          <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            케이스 작성하기
          </button>
        </div>
      )}
    </div>
  );
}
