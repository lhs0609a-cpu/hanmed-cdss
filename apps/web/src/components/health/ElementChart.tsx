/**
 * 오행 레이더 차트 (SVG 기반)
 * 목/화/토/금/수 다섯 축으로 된 펜타곤 레이더 차트
 */
import { motion } from 'framer-motion'
import { ELEMENTS, ELEMENT_COLORS, ELEMENT_EMOJI, type ElementBalance } from '@/lib/saju'

interface ElementChartProps {
  balance: ElementBalance
  size?: number
  showLabels?: boolean
  animated?: boolean
}

const ANGLE_OFFSET = -Math.PI / 2 // 목(木)을 위에서 시작

function polarToCartesian(cx: number, cy: number, r: number, index: number, total: number) {
  const angle = ANGLE_OFFSET + (2 * Math.PI * index) / total
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function makePolygonPoints(cx: number, cy: number, r: number, total: number): string {
  return Array.from({ length: total }, (_, i) => {
    const p = polarToCartesian(cx, cy, r, i, total)
    return `${p.x},${p.y}`
  }).join(' ')
}

export default function ElementChart({
  balance,
  size = 200,
  showLabels = true,
  animated = true,
}: ElementChartProps) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.38
  const labelR = size * 0.48
  const total = ELEMENTS.length

  // 데이터 포인트 (각 오행의 비율을 반지름으로 변환)
  const maxVal = Math.max(...Object.values(balance), 1)
  const dataPoints = ELEMENTS.map((el, i) => {
    const r = (balance[el] / maxVal) * maxR
    return polarToCartesian(cx, cy, r, i, total)
  })

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // 격자 레벨 (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 배경 격자 */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={makePolygonPoints(cx, cy, maxR * level, total)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={level === 1 ? 1.5 : 0.5}
            opacity={0.6}
          />
        ))}

        {/* 축선 */}
        {ELEMENTS.map((_, i) => {
          const p = polarToCartesian(cx, cy, maxR, i, total)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="#d1d5db"
              strokeWidth={0.5}
            />
          )
        })}

        {/* 데이터 영역 */}
        {animated ? (
          <motion.polygon
            points={dataPolygon}
            fill="url(#elementGradient)"
            stroke="#f97316"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ) : (
          <polygon
            points={dataPolygon}
            fill="url(#elementGradient)"
            stroke="#f97316"
            strokeWidth={2}
          />
        )}

        {/* 데이터 포인트 */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={ELEMENT_COLORS[ELEMENTS[i]]}
            stroke="white"
            strokeWidth={2}
            initial={animated ? { scale: 0 } : undefined}
            animate={animated ? { scale: 1 } : undefined}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
          />
        ))}

        {/* 그라디언트 정의 */}
        <defs>
          <radialGradient id="elementGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
          </radialGradient>
        </defs>
      </svg>

      {/* 라벨 (SVG 밖에 배치) */}
      {showLabels &&
        ELEMENTS.map((el, i) => {
          const pos = polarToCartesian(cx, cy, labelR, i, total)
          return (
            <div
              key={el}
              className="absolute flex flex-col items-center"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="text-base leading-none">{ELEMENT_EMOJI[el]}</span>
              <span className="text-[10px] font-bold mt-0.5" style={{ color: ELEMENT_COLORS[el] === '#f8fafc' ? '#94a3b8' : ELEMENT_COLORS[el] }}>
                {el}
              </span>
              <span className="text-[10px] text-gray-500">{balance[el]}%</span>
            </div>
          )
        })}
    </div>
  )
}

/** 간단한 바 차트 버전 (모바일/작은 공간용) */
export function ElementBar({ balance }: { balance: ElementBalance }) {
  return (
    <div className="space-y-2">
      {ELEMENTS.map((el) => (
        <div key={el} className="flex items-center gap-2">
          <span className="text-sm w-6">{ELEMENT_EMOJI[el]}</span>
          <span className="text-xs w-6 font-medium" style={{ color: ELEMENT_COLORS[el] === '#f8fafc' ? '#94a3b8' : ELEMENT_COLORS[el] }}>
            {el}
          </span>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: ELEMENT_COLORS[el] === '#f8fafc' ? '#94a3b8' : ELEMENT_COLORS[el] }}
              initial={{ width: 0 }}
              animate={{ width: `${balance[el]}%` }}
              transition={{ duration: 0.5, delay: ELEMENTS.indexOf(el) * 0.1 }}
            />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">{balance[el]}%</span>
        </div>
      ))}
    </div>
  )
}
