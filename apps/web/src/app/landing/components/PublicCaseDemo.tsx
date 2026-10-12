import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  FlaskConical,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { PublicResearchSearch } from './PublicResearchSearch'
import './clinical-demo.css'

export type DemoEvent =
  | 'demo_viewed'
  | 'demo_started'
  | 'demo_step_selected'
  | 'demo_evidence_opened'
  | 'demo_completed'
  | 'demo_search_submitted'
  | 'demo_result_opened'
  | 'demo_signup_clicked'

const SOURCE = 'https://jikm.or.kr/upload/pdf/jikm-46-3-570.pdf'
const TABS = ['소견 비교', '처방·경과', '근거 확인']
const FINDINGS = [
  {
    id: 'nausea',
    label: '오심·구토',
    record: '메스꺼움과 반복되는 구토',
    source: '증례 · 주소증',
    page: 571,
  },
  {
    id: 'fullness',
    label: '조기 포만감',
    record: '식사를 일찍 멈추게 되는 포만감',
    source: '증례 · 주소증',
    page: 571,
  },
  {
    id: 'bloating',
    label: '상복부 팽만',
    record: '팽만감과 위완부 압통',
    source: '증례 · 초진 소견',
    page: 572,
  },
  {
    id: 'tongue',
    label: '후니한 설태',
    record: '설진: 후니(厚膩)',
    source: '증례 · 계통적 진찰',
    page: 571,
  },
  { id: 'pulse', label: '활맥', record: '맥진: 활(滑)', source: '증례 · 계통적 진찰', page: 571 },
]
const INITIAL = ['nausea', 'fullness', 'bloating']

/** A source-backed walkthrough and a real public API search, kept visibly distinct. */
export function ClinicalDemo({
  onEvent,
  onTry,
}: {
  onEvent: (event: DemoEvent, detail: string) => void
  onTry: () => void
}) {
  const [mode, setMode] = useState<'case' | 'research'>('case')
  const [selected, setSelected] = useState(INITIAL)
  const [applied, setApplied] = useState(INITIAL)
  const [compared, setCompared] = useState(false)
  const [tab, setTab] = useState(0)
  const [reviewed, setReviewed] = useState<number[]>([])
  const root = useRef<HTMLDivElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const viewed = useRef(false)
  const started = useRef(false)
  const completed = useRef(false)
  const notify = useRef(onEvent)
  notify.current = onEvent
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const modeButtons = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !viewed.current) {
          viewed.current = true
          notify.current('demo_viewed', 'workspace')
        }
      },
      { threshold: 0.15 },
    )
    if (root.current) observer.observe(root.current)
    return () => observer.disconnect()
  }, [])

  function interact() {
    if (!viewed.current) {
      viewed.current = true
      onEvent('demo_viewed', 'workspace')
    }
    if (!started.current) {
      started.current = true
      onEvent('demo_started', 'workspace')
    }
  }

  function select(index: number) {
    interact()
    setTab(index)
    setReviewed((previous) => (previous.includes(index) ? previous : [...previous, index]))
    onEvent('demo_step_selected', `digestion:${index + 1}`)
  }

  useEffect(() => {
    if (compared && reviewed.length === 3 && !completed.current) {
      completed.current = true
      notify.current('demo_completed', 'case_review')
    }
  }, [compared, reviewed])

  function compare() {
    interact()
    setApplied([...selected])
    setCompared(true)
    select(0)
    result.current?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 760px)').matches) {
      result.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  }

  function reset() {
    setSelected(INITIAL)
    setApplied(INITIAL)
    setCompared(false)
    setTab(0)
    setReviewed([])
    onEvent('demo_step_selected', 'digestion:reset')
  }

  const dirty = selected.join(',') !== applied.join(',')

  return (
    <div className="clinical-workbench" ref={root}>
      <div className="cd-toolbar">
        <div className="cd-workspace-label">
          <span>
            <BookOpen size={18} />
          </span>
          <strong>나의 첫 임상 워크스페이스</strong>
        </div>
        <span className="cd-open-label">
          <span /> 가입 없이 체험 중
        </span>
      </div>
      <div className="cd-modes" role="tablist" aria-label="체험 방식">
        {(['case', 'research'] as const).map((item, index) => (
          <button
            key={item}
            type="button"
            role="tab"
            id={`demo-mode-${item}`}
            aria-selected={mode === item}
            aria-controls={`demo-mode-panel-${item}`}
            tabIndex={mode === item ? 0 : -1}
            ref={(node) => {
              modeButtons.current[index] = node
            }}
            onClick={() => {
              interact()
              setMode(item)
            }}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
              interact()
              setMode(next === 0 ? 'case' : 'research')
              modeButtons.current[next]?.focus()
            }}
          >
            {item === 'case' ? <SlidersHorizontal size={16} /> : <Search size={16} />}
            {item === 'case' ? '소견으로 증례 비교' : '실제 문헌 검색'}
            {item === 'research' && <span className="cd-live-tag">LIVE</span>}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="demo-mode-panel-case"
        aria-labelledby="demo-mode-case"
        hidden={mode !== 'case'}
      >
        <div className="cd-workbench">
          <aside className="cd-input">
            <span className="cd-eyebrow">01 / 비교할 소견</span>
            <h3>
              같은 소화불량이라도,
              <br />
              소견은 다르니까.
            </h3>
            <p>관심 있는 소견을 골라 논문의 기록과 나란히 확인해 보세요.</p>
            <fieldset>
              <legend>비교할 예시 소견 선택</legend>
              <div className="cd-finding-options">
                {FINDINGS.map((finding) => (
                  <label
                    key={finding.id}
                    className={selected.includes(finding.id) ? 'is-selected' : ''}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(finding.id)}
                      onChange={() => {
                        interact()
                        setSelected((previous) =>
                          previous.includes(finding.id)
                            ? previous.filter((id) => id !== finding.id)
                            : [...previous, finding.id],
                        )
                      }}
                    />
                    <span>{finding.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              className="landing-button cd-compare-button"
              disabled={!selected.length}
              data-growth="demo_compare"
              onClick={compare}
            >
              {compared ? '선택한 소견 다시 비교' : '선택한 소견 비교하기'} <ArrowRight size={16} />
            </button>
            <p className="cd-input-status" role="status">
              {!selected.length
                ? '소견을 하나 이상 선택해 주세요.'
                : dirty
                  ? '선택을 바꿨습니다. 비교 버튼으로 적용하세요.'
                  : `${selected.length}개 소견 선택 · 환자 정보 입력 없음`}
            </p>
            <div className="cd-example-note">
              <FileText size={17} />
              <span>
                공개 학회지 증례 1편을 직접 검토하는 체험입니다. 선택한 소견은 이 브라우저에서만
                처리합니다.
              </span>
            </div>
            <button type="button" className="cd-reset" onClick={reset}>
              <RotateCcw size={13} /> 처음부터 살펴보기
            </button>
          </aside>

          <div className="cd-result" ref={result} tabIndex={-1}>
            <div className="cd-result-meta">
              <span className="cd-eyebrow">02 / 기록과 근거 확인</span>
              <span className="cd-paper-badge">증례보고 · 2025</span>
            </div>
            <h3>
              오심·구토를 동반한
              <br className="cd-mobile-break" /> 기능성 소화불량
            </h3>
            <p className="cd-citation">이현진 외 · 대한한방내과학회지 46(3) · 570–578</p>
            <div
              className="cd-progress"
              aria-label={`검토 진행: 3개 항목 중 ${reviewed.length}개 확인`}
            >
              {TABS.map((label, index) => (
                <span key={label} className={reviewed.includes(index) ? 'is-done' : ''}>
                  <i>{reviewed.includes(index) ? <Check size={11} /> : index + 1}</i>
                  {label}
                </span>
              ))}
            </div>
            <div className="cd-tabs" role="tablist" aria-label="증례 검토 항목">
              {TABS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  id={`sample-tab-${index}`}
                  aria-selected={tab === index}
                  aria-controls="sample-panel"
                  tabIndex={tab === index ? 0 : -1}
                  ref={(node) => {
                    buttons.current[index] = node
                  }}
                  data-growth={`demo_step_${index + 1}`}
                  onClick={() => select(index)}
                  onKeyDown={(event) => {
                    let next = index
                    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
                    else if (event.key === 'ArrowLeft')
                      next = (index + TABS.length - 1) % TABS.length
                    else if (event.key === 'Home') next = 0
                    else if (event.key === 'End') next = TABS.length - 1
                    else return
                    event.preventDefault()
                    select(next)
                    buttons.current[next]?.focus()
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              id="sample-panel"
              className="cd-panel"
              role="tabpanel"
              aria-labelledby={`sample-tab-${tab}`}
              tabIndex={0}
            >
              {tab === 0 && (
                <>
                  <div className="cd-panel-lead" role="status">
                    <span>
                      {compared ? <Check size={16} /> : <Search size={16} />}
                      {compared
                        ? `선택한 ${applied.length}개 소견의 기록을 연결했습니다`
                        : '소견을 선택하고, 기록 속 근거를 찾아보세요'}
                    </span>
                  </div>
                  <div className="cd-comparison-head" aria-hidden="true">
                    <span>선택한 소견</span>
                    <span>논문에 기록된 내용</span>
                  </div>
                  <dl className="cd-comparison">
                    {FINDINGS.filter((finding) => applied.includes(finding.id)).map((finding) => (
                      <div key={finding.id} className={compared ? 'is-linked' : ''}>
                        <dt>
                          <Check size={14} />
                          {finding.label}
                        </dt>
                        <dd>
                          {finding.record}
                          <small>
                            {finding.source} · p.{finding.page}
                          </small>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="cd-insight">
                    <FlaskConical size={18} />
                    <div>
                      <strong>증상 다음에는, 변증의 근거까지.</strong>
                      <p>
                        저자들은 설태·맥상·복부 소견을 함께 보고 습담조체로 변증했습니다. 증상이
                        같다는 이유만으로 같은 처방을 선택하는 것은 아닙니다.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {tab === 1 && (
                <>
                  <p className="cd-panel-description">
                    처방 이름과 함께, 치료 순서와 실제 관찰된 변화를 확인하세요.
                  </p>
                  <div className="cd-outcomes">
                    <div>
                      <span>위완통 NRS</span>
                      <strong>
                        6 <ArrowRight size={18} /> <em>4</em>
                      </strong>
                      <small>입원 시 → 퇴원 시</small>
                    </div>
                    <div>
                      <span>FD-QOL</span>
                      <strong>
                        61 <ArrowRight size={18} /> <em>41</em>
                      </strong>
                      <small>소화불량 관련 삶의 질 점수</small>
                    </div>
                  </div>
                  <ol className="cd-timeline">
                    <li>
                      <span>초기</span>
                      <div>
                        <strong>향사평위산 · 반하백출천마탕</strong>
                        <p>선행 투여 기록을 함께 검토합니다.</p>
                      </div>
                    </li>
                    <li>
                      <span>이후</span>
                      <div>
                        <strong>지축이진탕을 포함한 복합 치료</strong>
                        <p>침·전침·약침도 병행했습니다. 처방 구성은 원문 Table 1에 있습니다.</p>
                      </div>
                    </li>
                    <li>
                      <span>6일 경과</span>
                      <div>
                        <strong>호전과 남은 증상을 함께 확인</strong>
                        <p>퇴원 시 식도 부위 쓰림은 남아 있었습니다.</p>
                      </div>
                    </li>
                  </ol>
                  <p className="cd-footnote">
                    논문의 관찰값입니다. 단일 증례·복합 치료 결과로, 특정 처방의 효과를 분리해
                    입증하지 않습니다.
                  </p>
                </>
              )}
              {tab === 2 && (
                <>
                  <div className="cd-source-card">
                    <BookOpen size={23} />
                    <div>
                      <span>원문으로 돌아갈 수 있는 근거</span>
                      <h4>
                        지축이진탕을 포함한 한방치료로 호전된 오심, 구토를 동반한 기능성 소화불량
                        환자의 소화불량 치험 1례
                      </h4>
                      <p>이현진 외 · 2025 · DOI 10.22246/jikm.2025.46.3.570</p>
                      <a
                        href={SOURCE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cd-source-link"
                        data-growth="demo_source_open"
                        onClick={() => onEvent('demo_evidence_opened', 'digestion')}
                      >
                        학회지 원문 PDF 열기 <ArrowUpRight size={15} />
                        <span className="sr-only">(새 탭)</span>
                      </a>
                    </div>
                  </div>
                  <div className="cd-review-notes">
                    <strong>진료에 참고하기 전, 확인할 세 가지</strong>
                    <ul>
                      <li>
                        <Check size={14} />내 환자와 소견·동반 질환이 같은가?
                      </li>
                      <li>
                        <Check size={14} />
                        함께 시행한 치료는 무엇인가?
                      </li>
                      <li>
                        <Check size={14} />
                        호전되지 않은 증상과 관찰 기간은?
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
            <div className="cd-next">
              <span>공개 증례 요약 · 실시간 AI 진단 아님</span>
              <button
                type="button"
                onClick={() => {
                  if (tab < 2) select(tab + 1)
                  else {
                    interact()
                    setMode('research')
                    modeButtons.current[1]?.focus()
                  }
                }}
              >
                {tab < 2 ? `${TABS[tab + 1]} 보기` : '다른 문헌도 검색하기'}{' '}
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id="demo-mode-panel-research"
        aria-labelledby="demo-mode-research"
        hidden={mode !== 'research'}
      >
        <PublicResearchSearch onEvent={onEvent} onInteract={interact} />
      </div>

      <div className="cd-conversion">
        <div>
          <span className="cd-eyebrow">03 / 선생님의 진료로 이어가기</span>
          <h3>
            {compared || mode === 'research'
              ? '찾고, 비교하고, 근거를 확인하는 진료.'
              : '다음 검색은, 선생님이 궁금한 것으로.'}
          </h3>
          <p>무료 계정에서 처방·약재를 찾아보고, AI 챗봇에 이어서 질문해 보세요.</p>
          <ul>
            <li>
              <Check size={14} />
              기간 제한 없는 무료 플랜
            </li>
            <li>
              <Check size={14} />
              AI 챗봇 월 50회
            </li>
            <li>
              <Check size={14} />
              카드 등록 없음
            </li>
          </ul>
        </div>
        <div className="cd-conversion-actions">
          <Link
            to="/register"
            className="landing-button"
            data-growth="signup_after_demo"
            onClick={() => onEvent('demo_signup_clicked', mode)}
          >
            무료 계정으로 직접 시작하기 <ArrowRight size={17} />
          </Link>
          <button type="button" onClick={onTry} data-growth="demo_guest_try">
            가입 전에 제품 화면 더 보기 <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
