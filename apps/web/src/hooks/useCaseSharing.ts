import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

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
      const { data } = await api.get('/case-sharing/cases/featured');
      return data.data as SharedCase[];
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
      const params = new URLSearchParams();
      if (options?.specialty) params.append('specialty', options.specialty);
      if (options?.availableOnly) params.append('availableOnly', 'true');

      const { data } = await api.get(`/case-sharing/experts?${params.toString()}`);
      return data.data as ExpertProfile[];
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
    },
  });
}

// 인기 태그
export function usePopularTags() {
  return useQuery({
    queryKey: ['popular-tags'],
    queryFn: async () => {
      const { data } = await api.get('/case-sharing/tags/popular');
      return data.data as Array<{ tag: string; count: number }>;
    },
  });
}
