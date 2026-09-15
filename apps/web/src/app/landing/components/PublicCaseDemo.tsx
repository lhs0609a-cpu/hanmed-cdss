import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen, Check, Search } from 'lucide-react'

export type DemoEvent =
  | 'demo_step_selected'
  | 'demo_evidence_opened'
  | 'demo_completed'
const SOURCE = 'https://doi.org/10.22246/jikm.2025.46.3.570'
const TABS = ['소견과 변증', '처방과 경과', '출처와 검토']

/** Editorial summary of a public case report, not a generated patient recommendation. */
export function ClinicalDemo({
  onEvent,
  onTry,
}: {
  onEvent: (event: DemoEvent, detail: string) => void
  onTry: () => void
}) {
  const [tab, setTab] = useState(0)
  const visited = useRef(new Set([0]))
  const completed = useRef(false)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  function select(index: number) {
    setTab(index)
    visited.current.add(index)
    onEvent('demo_step_selected', `digestion:${index + 1}`)
    if (visited.current.size === TABS.length && !completed.current) {
      completed.current = true
      onEvent('demo_completed', 'digestion')
    }
  }
  return (
    <div className="case-demo">
      <div className="case-demo-top">
        <span>
          <BookOpen size={17} /> 공개 문헌으로 미리 보기
        </span>
        <span>가입·환자 정보 입력 없이</span>
      </div>
      <div className="case-query">
        <Search size={20} />
        <div>
          <span>이런 소견이 있는 기록을 살펴보세요</span>
          <strong>소화불량 · 오심 · 구토 · 상복부 팽만</strong>
        </div>
      </div>
      <div className="case-demo-body">
        <div className="case-result-heading">
          <span className="case-badge">증례보고 1례</span>
          <h3>
            소화불량 환자에서 어떤 소견을 보고,
            <br />
            어떤 처방과 경과를 기록했을까요?
          </h3>
          <p>이현진 외 · 대한한방내과학회지 · 2025</p>
        </div>
        <div
          className="case-tabs"
          role="tablist"
          aria-label="공개 증례 살펴보기"
        >
          {TABS.map((title, index) => (
            <button
              key={title}
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
              {title}
            </button>
          ))}
        </div>
        <div
          id="sample-panel"
          role="tabpanel"
          aria-labelledby={`sample-tab-${tab}`}
          className="case-panel"
          tabIndex={0}
        >
          {tab === 0 && (
            <dl>
              <div>
                <dt>주요 소견</dt>
                <dd>
                  오심·구토와 조기 포만감, 상복부 팽만을 호소한 기능성 소화불량
                  증례입니다.
                </dd>
              </div>
              <div>
                <dt>변증 근거</dt>
                <dd>
                  활맥, 후니한 설태, 상복부·위완부 압통 등을 근거로 저자들은
                  습담조체(濕痰阻滯)로 변증했습니다.
                </dd>
              </div>
              <div>
                <dt>비교할 지점</dt>
                <dd>
                  증상명뿐 아니라 설진·맥진·복진 소견이 내 환자와 어떻게 다른지
                  함께 검토하세요.
                </dd>
              </div>
            </dl>
          )}
          {tab === 1 && (
            <dl>
              <div>
                <dt>치료 기록</dt>
                <dd>
                  향사평위산, 반하백출천마탕 투여 기록 이후 지축이진탕을
                  사용했습니다. 침·전침·약침 치료도 병행했습니다.
                </dd>
              </div>
              <div>
                <dt>처방 구성 예</dt>
                <dd>
                  지축이진탕의 지실·천궁·복령·향부자 등 구성과 용량은 원문 Table
                  1에서 확인할 수 있습니다.
                </dd>
              </div>
              <div>
                <dt>6일간의 경과</dt>
                <dd>
                  위완통·두통 NRS는 각각 6에서 4로, FD-QOL은 61에서 41로
                  변했습니다. 퇴원 시 식도 부위 쓰림은 남아 있었습니다.
                </dd>
              </div>
            </dl>
          )}
          {tab === 2 && (
            <div className="case-source">
              <strong>
                지축이진탕을 포함한 한방치료로 호전된 오심, 구토를 동반한 기능성
                소화불량 환자의 소화불량 치험 1례
              </strong>
              <p>이현진 외. 대한한방내과학회지. 2025;46(3):570–578.</p>
              <a
                href={SOURCE}
                target="_blank"
                rel="noopener noreferrer"
                data-growth="demo_source_open"
                className="landing-text-link"
                onClick={() => onEvent('demo_evidence_opened', 'digestion')}
              >
                학회지 원문 확인 <ArrowUpRight size={16} />
                <span className="sr-only">(새 탭)</span>
              </a>
              <p>
                단일 증례이며 여러 치료를 병행했습니다. 한 처방의 효과나 다른
                환자에게 같은 결과가 나타남을 입증하지는 않습니다.
              </p>
            </div>
          )}
        </div>
        <div className="case-demo-next">
          <span>공개 논문을 요약한 고정 예시 · 실시간 AI 분석 아님</span>
          {tab < 2 && (
            <button
              type="button"
              data-growth={`demo_next_${tab + 1}`}
              onClick={() => select(tab + 1)}
            >
              {TABS[tab + 1]} 보기 <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="case-conversion">
        <div>
          <strong>이제 진료에 필요한 도구를 직접 써보세요.</strong>
          <p>
            <Check size={15} /> 무료 플랜 · AI 챗봇 월 50회 · 카드 등록 없음
          </p>
        </div>
        <Link
          to="/register"
          className="landing-button"
          data-growth="signup_after_demo"
        >
          무료 계정 만들기 <ArrowRight size={17} />
        </Link>
        <button
          type="button"
          className="landing-text-link"
          data-growth="demo_guest_try"
          onClick={onTry}
        >
          실제 프로그램 둘러보기 <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  )
}
