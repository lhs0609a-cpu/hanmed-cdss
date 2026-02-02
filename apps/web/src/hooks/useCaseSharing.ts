import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

// Mock Data for Demo Mode
const MOCK_CASES: SharedCase[] = [
  {
    id: '1',
    authorId: 'u1',
    title: '만성 소화불량 환자의 한방 치료 사례',
    summary: '3개월 이상 지속된 소화불량 환자에게 반하사심탕 가감방을 투여하여 호전된 사례입니다.',
    category: 'internal',
    difficulty: 'intermediate',
    status: 'published',
    isAnonymous: false,
    patientInfo: { ageRange: '40대', gender: 'female', constitution: '소양인', mainSymptoms: ['소화불량', '속쓰림', '복부팽만'], duration: '3개월' },
    caseContent: { chiefComplaint: '속이 더부룩함', diagnosis: '비위습열', treatmentPlan: '청열화습, 건비화위', progress: [], outcome: '호전' },
    learningPoints: ['반하사심탕의 적응증', '가감 포인트'],
    tags: ['소화불량', '반하사심탕', '소양인'],
    statistics: { viewCount: 234, likeCount: 45, commentCount: 12, bookmarkCount: 23, shareCount: 5 },
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    author: { id: 'u1', name: '김한의', clinicName: '행복한의원', specialty: '내과', yearsOfExperience: 15 },
  },
  {
    id: '2',
    authorId: 'u2',
    title: '견비통 환자의 침구 복합 치료',
    summary: '1년 이상 지속된 오른쪽 어깨 통증 환자에게 침, 부항, 한약을 병행하여 치료한 사례입니다.',
    category: 'combined',
    difficulty: 'advanced',
    status: 'featured',
    isAnonymous: false,
    patientInfo: { ageRange: '50대', gender: 'male', mainSymptoms: ['어깨통증', '거상제한', '야간통'], duration: '1년' },
    caseContent: { chiefComplaint: '오른쪽 어깨 통증', diagnosis: '풍한습비', treatmentPlan: '거풍산한, 활혈통락', progress: [], outcome: '완치' },
    learningPoints: ['견비통의 변증', '침구 치료 포인트'],
    tags: ['견비통', '침구치료', '오십견'],
    statistics: { viewCount: 567, likeCount: 89, commentCount: 34, bookmarkCount: 56, shareCount: 12 },
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    author: { id: 'u2', name: '이침구', clinicName: '명의한의원', specialty: '침구', yearsOfExperience: 20 },
  },
  {
    id: '3',
    authorId: 'u3',
    title: '소아 아토피 피부염 치료 경험',
    summary: '5세 소아 아토피 환자에게 한약과 외용제를 병행하여 치료한 사례입니다.',
    category: 'pediatric',
    difficulty: 'intermediate',
    status: 'published',
    isAnonymous: true,
    patientInfo: { ageRange: '5세', gender: 'male', mainSymptoms: ['피부 소양감', '홍반', '건조'], duration: '2년' },
    caseContent: { chiefComplaint: '전신 피부 가려움', diagnosis: '풍열혈조', treatmentPlan: '청열양혈, 거풍지양', progress: [], outcome: '호전' },
    learningPoints: ['소아 아토피 변증', '외용제 활용'],
    tags: ['아토피', '소아', '피부질환'],
    statistics: { viewCount: 345, likeCount: 67, commentCount: 23, bookmarkCount: 34, shareCount: 8 },
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  },
];

const MOCK_EXPERTS: ExpertProfile[] = [
  { id: 'e1', userId: 'u1', specialty: ['내과', '소화기'], bio: '20년 경력의 한방내과 전문의입니다.', credentials: ['한방내과전문의'], yearsOfExperience: 20, publishedCasesCount: 45, totalLikesReceived: 890, menteeCount: 12, rating: 4.8, isAvailableForMentorship: true, mentorshipRate: 50000, user: { name: '김한의', clinicName: '행복한의원' } },
  { id: 'e2', userId: 'u2', specialty: ['침구', '통증'], bio: '침구 치료 전문입니다.', credentials: ['침구과전문의'], yearsOfExperience: 15, publishedCasesCount: 32, totalLikesReceived: 567, menteeCount: 8, rating: 4.6, isAvailableForMentorship: true, mentorshipRate: 40000, user: { name: '이침구', clinicName: '명의한의원' } },
  { id: 'e3', userId: 'u3', specialty: ['부인과', '산후조리'], bio: '한방부인과 전문의입니다.', credentials: ['한방부인과전문의'], yearsOfExperience: 18, publishedCasesCount: 28, totalLikesReceived: 456, menteeCount: 6, rating: 4.7, isAvailableForMentorship: false, user: { name: '박여의', clinicName: '여성한의원' } },
];

const MOCK_STATISTICS = {
  totalCases: 156,
  publishedCases: 123,
  totalComments: 567,
  totalExperts: 24,
  byCategory: [{ category: 'internal', count: 45 }, { category: 'combined', count: 34 }],
  byDifficulty: [{ difficulty: 'intermediate', count: 56 }, { difficulty: 'advanced', count: 34 }],
  topAuthors: [],
  topTags: [],
};

const MOCK_POPULAR_TAGS = [
  { tag: '소화불량', count: 45 },
  { tag: '요통', count: 38 },
  { tag: '불면', count: 32 },
  { tag: '두통', count: 28 },
  { tag: '피로', count: 25 },
  { tag: '아토피', count: 22 },
  { tag: '견비통', count: 18 },
  { tag: '비염', count: 15 },
];

// Types
export interface SharedCase {
  id: string;
  authorId: string;
  title: string;
  summary: string;
  category: 'internal' | 'external' | 'acupuncture' | 'herbal' | 'combined' | 'pediatric' | 'gynecology' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  status: 'draft' | 'pending_review' | 'published' | 'featured' | 'archived';
  isAnonymous: boolean;
  patientInfo: {
    ageRange: string;
    gender: string;
    constitution?: string;
    mainSymptoms: string[];
    duration: string;
  };
  caseContent: {
    chiefComplaint: string;
    medicalHistory?: string;
    examination?: string;
    diagnosis: string;
    treatmentPlan: string;
    prescription?: {
      formulaName: string;
      herbs: Array<{ name: string; amount: string }>;
      modifications?: string;
    };
    progress: Array<{
      visitNumber: number;
      date?: string;
      symptoms: string;
      treatment: string;
      outcome: string;
    }>;
    outcome: string;
    followUp?: string;
  };
  learningPoints: string[];
  references?: string[];
  tags: string[];
  statistics: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    bookmarkCount: number;
    shareCount: number;
  };
  createdAt: string;
  publishedAt?: string;
  author?: {
    id: string;
    name: string;
    clinicName?: string;
    specialty?: string;
    yearsOfExperience?: number;
  };
}

export interface CaseComment {
  id: string;
  caseId: string;
  authorId: string;
  parentId?: string;
  content: string;
  isAnonymous: boolean;
  likeCount: number;
  createdAt: string;
  author?: { name: string; specialty?: string };
  replies?: CaseComment[];
}

export interface ExpertProfile {
  id: string;
  userId: string;
  specialty: string[];
  bio?: string;
  credentials: string[];
  yearsOfExperience: number;
  publishedCasesCount: number;
  totalLikesReceived: number;
  menteeCount: number;
  rating: number;
  isAvailableForMentorship: boolean;
  mentorshipRate?: number;
  user?: { name: string; clinicName?: string };
}

export interface CaseMentorship {
  id: string;
  caseId: string;
  mentorId: string;
  menteeId: string;
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestMessage?: string;
  feedback?: string;
  rating?: number;
  createdAt: string;
  case?: { title: string };
  mentor?: { name: string };
}

// 케이스 목록 (무한 스크롤)
export function useCases(options?: {
  category?: string;
  difficulty?: string;
  status?: string;
  tags?: string[];
  keyword?: string;
  authorId?: string;
}) {
  return useInfiniteQuery({
    queryKey: ['shared-cases', options],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const params = new URLSearchParams();
        params.append('page', String(pageParam));
        params.append('limit', '20');
        if (options?.category) params.append('category', options.category);
        if (options?.difficulty) params.append('difficulty', options.difficulty);
        if (options?.status) params.append('status', options.status);
        if (options?.keyword) params.append('keyword', options.keyword);
        if (options?.authorId) params.append('authorId', options.authorId);
        if (options?.tags?.length) params.append('tags', options.tags.join(','));

        const { data } = await api.get(`/case-sharing/cases?${params.toString()}`);
        return data.data as { cases: SharedCase[]; total: number; page: number; hasMore: boolean };
      } catch {
        // Return mock data for demo mode
        let filtered = [...MOCK_CASES];
        if (options?.category) filtered = filtered.filter(c => c.category === options.category);
        if (options?.difficulty) filtered = filtered.filter(c => c.difficulty === options.difficulty);
        if (options?.keyword) filtered = filtered.filter(c => c.title.includes(options.keyword!) || c.summary.includes(options.keyword!));
        return { cases: filtered, total: filtered.length, page: pageParam, hasMore: false };
      }
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

// 케이스 상세
export function useCase(caseId: string) {
  return useQuery({
    queryKey: ['shared-case', caseId],
    queryFn: async () => {
      const { data } = await api.get(`/case-sharing/cases/${caseId}`);
      return data.data as SharedCase;
    },
    enabled: !!caseId,
  });
}

// 추천 케이스
export function useFeaturedCases() {
  return useQuery({
    queryKey: ['featured-cases'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/case-sharing/cases/featured');
        return data.data as SharedCase[];
      } catch {
        return MOCK_CASES.filter(c => c.status === 'featured');
      }
    },
  });
}

// 유사 케이스 검색
export function useSimilarCases(symptoms: string[], constitution?: string) {
  return useQuery({
    queryKey: ['similar-cases', symptoms, constitution],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('symptoms', symptoms.join(','));
      if (constitution) params.append('constitution', constitution);

      const { data } = await api.get(`/case-sharing/cases/similar?${params.toString()}`);
      return data.data as SharedCase[];
    },
    enabled: symptoms.length > 0,
  });
}

// 케이스 생성
export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: Omit<SharedCase, 'id' | 'authorId' | 'status' | 'statistics' | 'createdAt' | 'publishedAt' | 'author'>) => {
      const { data } = await api.post('/case-sharing/cases', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-cases'] });
      queryClient.invalidateQueries({ queryKey: ['my-cases'] });
    },
  });
}

// 케이스 수정
export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, ...dto }: { caseId: string } & Partial<SharedCase>) => {
      const { data } = await api.put(`/case-sharing/cases/${caseId}`, dto);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shared-case', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['shared-cases'] });
    },
  });
}

// 케이스 발행
export function usePublishCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const { data } = await api.post(`/case-sharing/cases/${caseId}/publish`);
      return data.data;
    },
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['shared-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['shared-cases'] });
    },
  });
}

// 좋아요 토글
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const { data } = await api.post(`/case-sharing/cases/${caseId}/like`);
      return data.data;
    },
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['shared-case', caseId] });
    },
  });
}

// 북마크 토글
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const { data } = await api.post(`/case-sharing/cases/${caseId}/bookmark`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarked-cases'] });
    },
  });
}

// 북마크한 케이스
export function useBookmarkedCases() {
  return useQuery({
    queryKey: ['bookmarked-cases'],
    queryFn: async () => {
      const { data } = await api.get('/case-sharing/cases/bookmarked');
      return data.data as SharedCase[];
    },
  });
}

// 내 케이스
export function useMyCases() {
  return useQuery({
    queryKey: ['my-cases'],
    queryFn: async () => {
      const { data } = await api.get('/case-sharing/cases/mine');
      return data.data as SharedCase[];
    },
  });
}

// 댓글 목록
export function useCaseComments(caseId: string) {
  return useQuery({
    queryKey: ['case-comments', caseId],
    queryFn: async () => {
      const { data } = await api.get(`/case-sharing/cases/${caseId}/comments`);
      return data.data as CaseComment[];
    },
    enabled: !!caseId,
  });
}

// 댓글 작성
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { caseId: string; content: string; parentId?: string; isAnonymous?: boolean }) => {
      const { caseId, ...body } = dto;
      const { data } = await api.post(`/case-sharing/cases/${caseId}/comments`, body);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-comments', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['shared-case', variables.caseId] });
    },
  });
}

// 전문가 목록
export function useExperts(options?: { specialty?: string; availableOnly?: boolean }) {
  return useQuery({
    queryKey: ['experts', options],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (options?.specialty) params.append('specialty', options.specialty);
        if (options?.availableOnly) params.append('availableOnly', 'true');

        const { data } = await api.get(`/case-sharing/experts?${params.toString()}`);
        return data.data as ExpertProfile[];
      } catch {
        let filtered = [...MOCK_EXPERTS];
        if (options?.availableOnly) filtered = filtered.filter(e => e.isAvailableForMentorship);
        return filtered;
      }
    },
  });
}

// 전문가 상세
export function useExpert(expertId: string) {
  return useQuery({
    queryKey: ['expert', expertId],
    queryFn: async () => {
      const { data } = await api.get(`/case-sharing/experts/${expertId}`);
      return data.data as ExpertProfile;
    },
    enabled: !!expertId,
  });
}

// 멘토링 요청
export function useRequestMentorship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { caseId: string; mentorId: string; message?: string }) => {
      const { data } = await api.post('/case-sharing/mentorship/request', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mentorships'] });
    },
  });
}

// 멘토링 응답
export function useRespondMentorship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mentorshipId, accept }: { mentorshipId: string; accept: boolean }) => {
      const { data } = await api.post(`/case-sharing/mentorship/${mentorshipId}/respond`, { accept });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mentorships'] });
      queryClient.invalidateQueries({ queryKey: ['mentorship-requests'] });
    },
  });
}

// 내 멘토링
export function useMyMentorships() {
  return useQuery({
    queryKey: ['my-mentorships'],
    queryFn: async () => {
      const { data } = await api.get('/case-sharing/mentorship/mine');
      return data.data as CaseMentorship[];
    },
  });
}

// 멘토링 요청 (멘토 입장)
export function useMentorshipRequests() {
  return useQuery({
    queryKey: ['mentorship-requests'],
    queryFn: async () => {
      const { data } = await api.get('/case-sharing/mentorship/requests');
      return data.data as CaseMentorship[];
    },
  });
}

// 카테고리별 통계
export function useCaseStatistics() {
  return useQuery({
    queryKey: ['case-statistics'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/case-sharing/statistics');
        return data.data as {
          totalCases: number;
          publishedCases: number;
          totalComments: number;
          totalExperts: number;
          byCategory: Array<{ category: string; count: number }>;
          byDifficulty: Array<{ difficulty: string; count: number }>;
          topAuthors: Array<{ authorId: string; authorName: string; caseCount: number }>;
          topTags: Array<{ tag: string; count: number }>;
        };
      } catch {
        return MOCK_STATISTICS;
      }
    },
  });
}

// 인기 태그
export function usePopularTags() {
  return useQuery({
    queryKey: ['popular-tags'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/case-sharing/tags/popular');
        return data.data as Array<{ tag: string; count: number }>;
      } catch {
        return MOCK_POPULAR_TAGS;
      }
    },
  });
}
