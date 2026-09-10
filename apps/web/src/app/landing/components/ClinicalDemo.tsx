import { useRef, useState, type KeyboardEvent } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { LogoMark } from '@/components/common'

const CASES = [
  {
    id: 'sleep',
    label: '수면 불편',
    category: '수면 · 피로',
    complaint: '잠들기까지 시간이 오래 걸리고, 자고 나서도 개운하지 않아요.',
    observations: ['입면 어려움', '기상 후 피로', '생활 패턴 확인'],
    questions: [
      '불편함이 시작된 시기와 수면 시간',
      '복용 중인 약과 카페인 섭취',
      '동반 증상과 일상생활의 변화',
    ],
    search: '입면 어려움 · 피로',
    note: '수면 불편의 양상과 동반 소견을 정리하고, 관련 기록을 비교합니다.',
  },
  {
    id: 'digestion',
    label: '소화 불편',
    category: '소화 · 식사',
    complaint: '식사 후 속이 더부룩하고, 식사 시간이 불규칙해요.',
    observations: ['식후 더부룩함', '불규칙한 식사', '동반 소견 확인'],
    questions: [
      '불편함이 나타나는 시점과 지속 시간',
      '식사량과 식습관의 변화',
      '복용 중인 약과 동반 증상',
    ],
    search: '식후 불편 · 식사 패턴',
    note: '식사와 증상의 관계를 정리하고, 유사한 문진 맥락을 가진 기록을 살펴봅니다.',
  },
  {
    id: 'neck',
    label: '목·어깨 불편',
    category: '목·어깨 · 생활',
    complaint: '책상에 오래 앉아 있으면 목과 어깨가 뻐근해요.',
    observations: ['목·어깨 불편', '오랜 좌식 생활', '활동과의 관계'],
    questions: [
      '불편한 부위와 움직임에 따른 변화',
      '증상 발생 전후의 활동과 외상 여부',
      '동반 증상과 기존 진료 이력',
    ],
    search: '목·어깨 불편 · 활동',
    note: '불편한 부위와 활동 맥락을 정리하고, 관련 기록의 공통점과 차이를 검토합니다.',
  },
] as const

const STEPS = [
  {
    title: '소견을 정리하고',
    detail: '환자의 말에서 시작합니다.',
    icon: ClipboardList,
  },
  {
    title: '관련 근거를 살피고',
    detail: '기록의 맥락을 함께 읽습니다.',
    icon: BookOpen,
  },
  {
    title: '판단을 기록합니다',
    detail: '최종 결정은 한의사가 합니다.',
    icon: FileText,
  },
]

export type DemoEvent =
  | 'demo_case_selected'
  | 'demo_step_selected'
  | 'demo_evidence_opened'
  | 'demo_completed'

export function ClinicalDemo({
  onEvent,
  onTry,
}: {
  onEvent: (event: DemoEvent, detail: string) => void
  onTry: () => void
}) {
  const [selectedCase, setSelectedCase] = useState(0)
  const [step, setStep] = useState(0)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const sample = CASES[selectedCase]

  const selectCase = (index: number) => {
    setSelectedCase(index)
    setStep(0)
    setEvidenceOpen(false)
    setReviewed(false)
    onEvent('demo_case_selected', CASES[index].id)
  }

  const selectStep = (index: number) => {
    setStep(index)
    onEvent('demo_step_selected', `${sample.id}:${index + 1}`)
  }

  const handleTabKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % CASES.length
    else if (event.key === 'ArrowLeft')
      next = (index + CASES.length - 1) % CASES.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = CASES.length - 1
    else return
    event.preventDefault()
    selectCase(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="clinical-demo">
      <div
        className="demo-scenarios"
        role="tablist"
        aria-label="샘플 케이스 선택"
      >
        {CASES.map((item, index) => (
          <button
            type="button"
            key={item.id}
            role="tab"
            id={`case-tab-${item.id}`}
            aria-selected={selectedCase === index}
            aria-controls="case-panel"
            tabIndex={selectedCase === index ? 0 : -1}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            onKeyDown={(event) => handleTabKey(event, index)}
            onClick={() => selectCase(index)}
          >
            <span className="scenario-dot" aria-hidden="true" />
            {item.label}
          </button>
        ))}
        <span className="demo-sample-label">가입 없이 체험하는 가상 예시</span>
      </div>
      <div
        className="demo-layout"
        id="case-panel"
        role="tabpanel"
        aria-labelledby={`case-tab-${sample.id}`}
      >
        <div className="demo-guide">
          <span className="landing-eyebrow">YOUR CLINICAL WORKFLOW</span>
          <h3>
            환자의 이야기에서
            <br />
            판단의 근거까지.
          </h3>
          <div className="demo-steps" role="group" aria-label="데모 단계">
            {STEPS.map(({ title, detail, icon: Icon }, index) => (
              <button
                type="button"
                key={title}
                className={step === index ? 'is-active' : ''}
                aria-pressed={step === index}
                onClick={() => selectStep(index)}
              >
                <span className="demo-step-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="demo-caption">
            단계를 눌러 사용 흐름을 확인해 보세요.
            <br />
            실제 환자 정보나 AI 분석 결과가 아닙니다.
          </p>
        </div>
        <div className="demo-window">
          <div className="demo-window-bar">
            <span className="demo-window-brand">
              <LogoMark variant="bare" size={25} />
              온고지신 워크스페이스
            </span>
            <span className="demo-window-badge">인터랙티브 데모</span>
          </div>
          <div className="demo-window-body">
            <div className="demo-patient-line">
              <span>
                <span className="patient-avatar">가</span>
                <strong>가상 환자</strong>
                <span>{sample.category}</span>
              </span>
              <span>예시 기록</span>
            </div>
            <div className="demo-content" key={`${sample.id}-${step}`}>
              {step === 0 && (
                <>
                  <div className="demo-content-heading">
                    <ClipboardList size={18} aria-hidden="true" />
                    <h4>문진 소견 정리</h4>
                    <span>01 / 03</span>
                  </div>
                  <blockquote>“{sample.complaint}”</blockquote>
                  <div className="demo-tags">
                    {sample.observations.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="demo-note">
                    <span className="demo-label">함께 확인할 문진 정보</span>
                    {sample.questions.map((question) => (
                      <p key={question}>
                        <span className="empty-check" aria-hidden="true" />
                        {question}
                      </p>
                    ))}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="demo-content-heading">
                    <BookOpen size={18} aria-hidden="true" />
                    <h4>관련 기록 검토</h4>
                    <span>02 / 03</span>
                  </div>
                  <div className="demo-search">
                    <Search size={17} aria-hidden="true" />
                    <span>{sample.search}</span>
                    <span>검색어 예시</span>
                  </div>
                  <div className="demo-reference">
                    <div>
                      <span className="demo-label">치험례 검토 화면 예시</span>
                      <h5>{sample.label} 관련 기록</h5>
                    </div>
                    <p>{sample.note}</p>
                    <button
                      type="button"
                      className="demo-evidence-button"
                      aria-expanded={evidenceOpen}
                      aria-controls="demo-evidence-detail"
                      onClick={() => {
                        setEvidenceOpen(!evidenceOpen)
                        if (!evidenceOpen)
                          onEvent('demo_evidence_opened', sample.id)
                      }}
                    >
                      <BookOpen size={16} aria-hidden="true" />
                      {evidenceOpen
                        ? '확인 항목 접기'
                        : '근거 확인 항목 펼치기'}
                      <ChevronRight
                        size={16}
                        className={evidenceOpen ? 'is-open' : ''}
                        aria-hidden="true"
                      />
                    </button>
                    {evidenceOpen && (
                      <div
                        id="demo-evidence-detail"
                        className="demo-evidence-detail"
                      >
                        <p>
                          <strong>출처</strong>기록의 원문과 작성 맥락을
                          확인합니다.
                        </p>
                        <p>
                          <strong>적용 맥락</strong>환자 소견과 기록의
                          공통점·차이를 살핍니다.
                        </p>
                        <p>
                          <strong>검토 범위</strong>기록의 경과와 누락된 정보를
                          확인합니다.
                        </p>
                        <small>
                          실제 문헌 인용이 아닌 검토 흐름 예시입니다.
                        </small>
                      </div>
                    )}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="demo-content-heading">
                    <FileText size={18} aria-hidden="true" />
                    <h4>검토 내용 정리</h4>
                    <span>03 / 03</span>
                  </div>
                  <div className="demo-summary">
                    <div>
                      <span>주요 소견</span>
                      <p>{sample.observations.slice(0, 2).join(', ')}</p>
                    </div>
                    <div>
                      <span>참고 기록</span>
                      <p>{sample.label} 관련 기록의 맥락 검토</p>
                    </div>
                    <div>
                      <span>의료진 판단</span>
                      <p>추가 문진과 진찰 후 한의사가 작성</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`demo-review ${reviewed ? 'is-reviewed' : ''}`}
                    aria-pressed={reviewed}
                    onClick={() => {
                      setReviewed(!reviewed)
                      if (!reviewed) onEvent('demo_completed', sample.id)
                    }}
                  >
                    <span>
                      {reviewed ? <Check size={16} aria-hidden="true" /> : null}
                    </span>
                    {reviewed
                      ? '예시 검토를 완료했습니다'
                      : '예시 검토 완료 표시하기'}
                  </button>
                  <p className="demo-review-note" role="status">
                    {reviewed
                      ? '이제 실제 프로그램에서 더 많은 기능을 둘러보세요.'
                      : '이 데모의 변경 사항은 환자 차트에 저장되지 않습니다.'}
                  </p>
                </>
              )}
            </div>
            <div className="demo-window-footer">
              <span>
                <ShieldCheck size={15} aria-hidden="true" />
                최종 판단은 한의사에게
              </span>
              {step < 2 ? (
                <button type="button" onClick={() => selectStep(step + 1)}>
                  다음 단계
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={onTry}>
                  프로그램 둘러보기
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
