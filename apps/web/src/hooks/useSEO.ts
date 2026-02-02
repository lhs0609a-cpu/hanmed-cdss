import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
  ogType?: 'website' | 'article'
  noIndex?: boolean
}

const DEFAULT_TITLE = '온고지신 AI'
const DEFAULT_DESCRIPTION = '40년 임상 경험의 6,000건 치험례 데이터와 AI가 결합된 한의학 CDSS'

/**
 * 페이지별 SEO 메타데이터 설정 훅
 */
export function useSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  ogImage,
  ogType = 'website',
  noIndex = false,
}: SEOProps = {}) {
  useEffect(() => {
    // 페이지 타이틀 설정
    const fullTitle = title ? `${title} | ${DEFAULT_TITLE}` : `${DEFAULT_TITLE} - 한의학 CDSS`
    document.title = fullTitle

    // 메타 태그 업데이트 헬퍼
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name'
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute(attribute, name)
        document.head.appendChild(meta)
      }
      meta.content = content
    }

    // 기본 메타 태그
    updateMeta('description', description)

    if (keywords.length > 0) {
      updateMeta('keywords', keywords.join(', '))
    }

    // 로봇 메타 태그
    if (noIndex) {
      updateMeta('robots', 'noindex, nofollow')
    }

    // Open Graph
    updateMeta('og:title', fullTitle, true)
    updateMeta('og:description', description, true)
    updateMeta('og:type', ogType, true)

    if (ogImage) {
      updateMeta('og:image', ogImage, true)
    }

    // Twitter Card
    updateMeta('twitter:title', fullTitle)
    updateMeta('twitter:description', description)

    if (ogImage) {
      updateMeta('twitter:image', ogImage)
    }

    // 클린업: 페이지 언마운트 시 기본값으로 복원 (선택적)
    return () => {
      document.title = `${DEFAULT_TITLE} - 한의학 CDSS`
    }
  }, [title, description, keywords, ogImage, ogType, noIndex])
}

/**
 * 미리 정의된 페이지별 SEO 설정
 */
export const PAGE_SEO = {
  dashboard: {
    title: '대시보드',
    description: '온고지신 AI 대시보드 - 진료 현황과 AI 활용 통계를 확인하세요',
  },
  consultation: {
    title: 'AI 진료 상담',
    description: '환자 증상을 입력하면 AI가 최적의 처방을 추천합니다. 6,000건 치험례 기반 분석.',
    keywords: ['AI진료', '처방추천', '한의학상담'],
  },
  cases: {
    title: '치험례 검색',
    description: '40년 임상 경험이 담긴 6,000건 치험례 데이터베이스를 검색하세요.',
    keywords: ['치험례', '임상사례', '한의학케이스'],
  },
  subscription: {
    title: '요금제',
    description: '온고지신 AI 요금제 안내. 14일 무료 체험으로 시작하세요.',
    keywords: ['요금제', '구독', '무료체험'],
  },
  login: {
    title: '로그인',
    description: '온고지신 AI에 로그인하세요.',
    noIndex: true,
  },
  register: {
    title: '회원가입',
    description: '온고지신 AI 회원가입. 14일 무료 체험을 시작하세요.',
  },
}

export default useSEO
