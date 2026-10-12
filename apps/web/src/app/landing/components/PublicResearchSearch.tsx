import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, ChevronDown, FileText, Search } from 'lucide-react'
import type { DemoEvent } from './PublicCaseDemo'

const TOPICS = [
  { id: 'back-pain', label: '요통', description: '통증·재활' },
  { id: 'migraine', label: '편두통', description: '두통' },
  { id: 'sleep', label: '수면장애', description: '수면' },
  { id: 'vomiting', label: '구토', description: '소화기' },
] as const
const LABELS: Record<string, string> = {
  case_report: '증례보고',
  rct: '무작위 대조시험',
  systematic_review: '체계적 고찰',
  observational: '관찰 연구',
  guideline: '진료지침',
  review: '종설',
}
type Paper = {
  slug: string
  title: string
  titleKo?: string | null
  summaryKo?: string | null
  journal?: string | null
  publishedYear?: number | null
  evidenceType?: string
  url?: string | null
  doi?: string | null
}
type Result = { items: Paper[]; total: number }
const API = (import.meta.env.VITE_API_URL || 'https://api.ongojisin.co.kr/api/v1').replace(
  /\/$/,
  '',
)

function sourceUrl(paper: Paper) {
  try {
    const url = new URL(paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : ''))
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export function PublicResearchSearch({
  onEvent,
  onInteract,
}: {
  onEvent: (event: DemoEvent, detail: string) => void
  onInteract: () => void
}) {
  const [topic, setTopic] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(
    () => () => {
      request.current?.abort()
      request.current = null
    },
    [],
  )

  function changeTopic(index: number) {
    request.current?.abort()
    request.current = null
    setTopic(index)
    setResult(null)
    setError('')
    setOpen(null)
    setLoading(false)
    onInteract()
  }

  async function search() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setLoading(true)
    setError('')
    setResult(null)
    setOpen(null)
    onInteract()
    onEvent('demo_search_submitted', TOPICS[topic].id)
    try {
      const response = await fetch(
        `${API}/public/references?keyword=${encodeURIComponent(TOPICS[topic].label)}&limit=3&page=1`,
        {
          signal: controller.signal,
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        },
      )
      if (!response.ok) throw new Error(response.status === 429 ? 'rate-limit' : 'unavailable')
      const body = await response.json()
      const data = body.data ?? body
      if (
        !Array.isArray(data.items) ||
        typeof data.total !== 'number' ||
        !data.items.every(
          (item: Paper) => typeof item.slug === 'string' && typeof item.title === 'string',
        )
      ) {
        throw new Error('unavailable')
      }
      if (request.current !== controller) return
      setResult(data)
    } catch (caught) {
      if (request.current !== controller) return
      setError(
        caught instanceof Error && caught.message === 'rate-limit'
          ? '검색 요청이 잠시 몰렸습니다. 잠시 후 다시 검색해 주세요.'
          : '문헌을 불러오지 못했습니다. 다시 검색하거나 소견 비교 체험을 이어가세요.',
      )
    } finally {
      window.clearTimeout(timeout)
      if (request.current === controller) {
        setLoading(false)
        resultRef.current?.focus({ preventScroll: true })
        if (window.matchMedia('(max-width: 760px)').matches) {
          resultRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
        }
      }
    }
  }

  return (
    <div className="cd-workbench cd-research">
      <aside className="cd-input">
        <span className="cd-eyebrow">01 / 관심 주제 선택</span>
        <h3>
          이번에는,
          <br />
          실제 문헌을 찾아보세요.
        </h3>
        <p>공개 문헌 데이터베이스에서 주제에 해당하는 자료를 바로 조회합니다.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void search()
          }}
        >
          <fieldset>
            <legend>검색할 주제</legend>
            <div className="cd-topic-options">
              {TOPICS.map((item, index) => (
                <label key={item.id} className={topic === index ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="demo-research-topic"
                    checked={topic === index}
                    onChange={() => changeTopic(index)}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="landing-button cd-compare-button"
            disabled={loading}
            data-growth="demo_research_search"
          >
            <Search size={16} />
            {loading ? '문헌 조회 중…' : `${TOPICS[topic].label} 문헌 찾기`}
          </button>
        </form>
        <div className="cd-example-note">
          <BookOpen size={17} />
          <span>
            실제 검색 결과의 서지 정보와 공개 요약을 보여드립니다. AI 진단이나 처방 추천이 아닙니다.
          </span>
        </div>
      </aside>
      <div
        className="cd-result cd-research-results"
        ref={resultRef}
        tabIndex={-1}
        aria-busy={loading}
      >
        <div className="cd-result-meta">
          <span className="cd-eyebrow">02 / 검색 결과 검토</span>
          <span className="cd-paper-badge">공개 문헌 DB</span>
        </div>
        <h3>{TOPICS[topic].label} 관련 문헌</h3>
        <p className="cd-citation">연구 유형과 요약을 읽고 원문까지 확인하세요.</p>
        <div className="cd-search-status" role="status">
          {loading
            ? '공개 문헌을 조회하고 있습니다.'
            : result
              ? `${result.total.toLocaleString('ko-KR')}편 중 ${result.items.length}편 표시 · 최신 연도순`
              : ''}
        </div>
        {loading && (
          <div className="cd-skeletons" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="cd-search-empty" role="alert">
            <FileText size={28} />
            <h4>잠시 연결이 원활하지 않아요.</h4>
            <p>{error}</p>
            <button
              type="button"
              className="landing-button landing-button-small"
              onClick={() => void search()}
            >
              다시 검색하기
            </button>
          </div>
        )}
        {!loading && !error && !result && (
          <div className="cd-search-empty">
            <span className="cd-search-art" aria-hidden="true">
              <Search size={32} />
            </span>
            <h4>설명보다, 직접 찾아보는 한 번.</h4>
            <p>
              왼쪽에서 주제를 선택하고 검색해 보세요.
              <br />
              가입 없이 실제 결과를 확인할 수 있습니다.
            </p>
            <div className="cd-search-benefits">
              <span>
                <FileText size={16} />
                한국어 요약
              </span>
              <span>
                <BookOpen size={16} />
                학회지·원문
              </span>
            </div>
          </div>
        )}
        {result && !result.items.length && (
          <div className="cd-search-empty">
            <Search size={28} />
            <h4>이 주제의 공개 자료를 찾지 못했습니다.</h4>
            <p>다른 주제를 선택해 검색해 보세요.</p>
          </div>
        )}
        {result && result.items.length > 0 && (
          <div className="cd-paper-list">
            {result.items.map((paper, index) => (
              <article key={paper.slug} className={open === paper.slug ? 'is-open' : ''}>
                <button
                  type="button"
                  className="cd-paper-toggle"
                  aria-expanded={open === paper.slug}
                  aria-controls={`demo-paper-${index}`}
                  onClick={() => {
                    const isOpening = open !== paper.slug
                    setOpen(isOpening ? paper.slug : null)
                    if (isOpening) onEvent('demo_result_opened', TOPICS[topic].id)
                  }}
                >
                  <span className="cd-paper-number">0{index + 1}</span>
                  <span>
                    <span className="cd-paper-kind">
                      {LABELS[paper.evidenceType || ''] || '연구 문헌'} ·{' '}
                      {paper.publishedYear || '연도 미상'}
                    </span>
                    <strong>{paper.titleKo || paper.title}</strong>
                    <small>{paper.journal || '학술지 정보 미등록'}</small>
                  </span>
                  <ChevronDown size={17} />
                </button>
                <div
                  id={`demo-paper-${index}`}
                  className="cd-paper-summary"
                  hidden={open !== paper.slug}
                >
                  <span className="cd-eyebrow">공개 요약</span>
                  <p>
                    {paper.summaryKo ||
                      '이 문헌은 공개 한국어 요약이 아직 없습니다. 아래 원문에서 연구 내용을 확인하세요.'}
                  </p>
                  <div>
                    <a
                      href={`/references/${encodeURIComponent(paper.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onEvent('demo_evidence_opened', TOPICS[topic].id)}
                    >
                      문헌 상세 보기 <ArrowUpRight size={14} />
                      <span className="sr-only">(새 탭)</span>
                    </a>
                    {sourceUrl(paper) && (
                      <a
                        href={sourceUrl(paper)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onEvent('demo_evidence_opened', TOPICS[topic].id)}
                      >
                        원문 확인 <ArrowUpRight size={14} />
                        <span className="sr-only">(새 탭)</span>
                      </a>
                    )}
                  </div>
                  <small>한국어 요약은 원문과 함께 검토해 주세요.</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
