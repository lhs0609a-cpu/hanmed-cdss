import { useState } from 'react'
import { Pill, Building2, Calendar, AlertCircle, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react'
import {
  useMfdsDrugSearch,
  useMfdsDrugDetailBySeq,
  parseMfdsDocXml,
  parseMaterialName,
  type MfdsListItem,
} from '@/hooks/useMfdsDrug'
import { useMfdsDurProduct, type DurProductItem } from '@/hooks/useMfdsDur'

interface Props {
  /** 검색할 처방명 (예: "반하사심탕") */
  formulaName: string
}

/**
 * 식약처 의약품 허가정보 패널
 * 처방명으로 식약처 NEDRUG 검색 → 제품 목록 + 선택 시 효능/용법/주의사항 상세
 */
export function MfdsDrugPanel({ formulaName }: Props) {
  const [selectedSeq, setSelectedSeq] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const search = useMfdsDrugSearch(formulaName, { limit: 20 })

  const items = search.data?.items?.filter((i) => i.CANCEL_NAME === '정상') ?? []
  const totalCount = search.data?.totalCount ?? 0

  if (search.isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">식약처 허가 제품 조회 중...</span>
        </div>
      </div>
    )
  }

  if (search.isError) {
    return null // 조용히 숨김 (인증 안 됐거나 API 실패시)
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">식약처 허가 제품</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              총 {totalCount}건 · 식품의약품안전처 NEDRUG 공식 데이터
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* 좌: 제품 목록 */}
            <div className="lg:col-span-1 lg:border-r border-gray-100 max-h-[480px] overflow-y-auto">
              <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
                허가 제품 ({items.length})
              </div>
              {items.slice(0, 50).map((item) => (
                <ProductRow
                  key={item.ITEM_SEQ}
                  item={item}
                  selected={selectedSeq === item.ITEM_SEQ}
                  onClick={() => setSelectedSeq(item.ITEM_SEQ)}
                />
              ))}
            </div>

            {/* 우: 선택된 제품 상세 */}
            <div className="lg:col-span-2 max-h-[480px] overflow-y-auto">
              {selectedSeq ? (
                <ProductDetail itemSeq={selectedSeq} />
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  좌측 제품을 선택하면 효능효과 / 용법용량 / 주의사항이 표시됩니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductRow({
  item,
  selected,
  onClick,
}: {
  item: MfdsListItem
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50/40 transition-colors ${
        selected ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <Pill className={`h-4 w-4 mt-0.5 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-gray-900 truncate">{item.ITEM_NAME}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{item.ENTP_NAME}</span>
          </div>
          {item.SPCLTY_PBLC && (
            <span
              className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded ${
                item.SPCLTY_PBLC === '전문의약품'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {item.SPCLTY_PBLC}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function ProductDetail({ itemSeq }: { itemSeq: string }) {
  const detail = useMfdsDrugDetailBySeq(itemSeq)
  const item = detail.data?.items?.[0]

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-6 text-sm text-gray-500">상세 정보를 불러올 수 없습니다.</div>
    )
  }

  const efficacy = parseMfdsDocXml(item.EE_DOC_DATA)
  const dosage = parseMfdsDocXml(item.UD_DOC_DATA)
  const cautions = parseMfdsDocXml(item.NB_DOC_DATA)
  const ingredients = parseMaterialName(item.MATERIAL_NAME)

  return (
    <div className="p-5 space-y-5 text-sm">
      {/* 헤더 */}
      <div>
        <h4 className="font-bold text-gray-900 text-base">{item.ITEM_NAME}</h4>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {item.ENTP_NAME}
          </span>
          {item.ITEM_PERMIT_DATE && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> 허가 {formatDate(item.ITEM_PERMIT_DATE)}
            </span>
          )}
          {item.RARE_DRUG_YN === 'Y' && (
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
              희귀의약품
            </span>
          )}
        </div>
      </div>

      {/* DUR 안전성 검사 */}
      <DurSafetyCheck itemSeq={item.ITEM_SEQ} />


      {/* 성분 */}
      {ingredients.length > 0 && (
        <Section title="성분 / 분량" icon={<Pill className="h-4 w-4 text-emerald-600" />}>
          <ul className="space-y-1 text-gray-700">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                {ing.ingredient && <span className="font-medium">{ing.ingredient}</span>}
                {ing.amount && (
                  <span className="text-gray-500">
                    {ing.amount}
                    {ing.unit && ` ${ing.unit}`}
                  </span>
                )}
                {ing.spec && <span className="text-gray-400 text-xs">[{ing.spec}]</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 효능효과 */}
      {efficacy.length > 0 && (
        <Section title="효능 · 효과" icon={<ShieldCheck className="h-4 w-4 text-blue-600" />}>
          {efficacy.map((art, i) => (
            <ParagraphGroup key={i} title={art.articleTitle} paragraphs={art.paragraphs} />
          ))}
        </Section>
      )}

      {/* 용법용량 */}
      {dosage.length > 0 && (
        <Section title="용법 · 용량" icon={<Pill className="h-4 w-4 text-indigo-600" />}>
          {dosage.map((art, i) => (
            <ParagraphGroup key={i} title={art.articleTitle} paragraphs={art.paragraphs} />
          ))}
        </Section>
      )}

      {/* 사용상의 주의사항 */}
      {cautions.length > 0 && (
        <Section
          title="사용상 주의사항"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          variant="warning"
        >
          <CautionChips articles={cautions} />
          {cautions.map((art, i) => (
            <ParagraphGroup key={i} title={art.articleTitle} paragraphs={art.paragraphs} />
          ))}
        </Section>
      )}

      {/* 보관/유효기간 */}
      {(item.STORAGE_METHOD || item.VALID_TERM) && (
        <Section title="보관 · 유효기간" icon={<Calendar className="h-4 w-4 text-gray-500" />}>
          {item.STORAGE_METHOD && (
            <p className="text-gray-600">
              <span className="font-medium">보관: </span>
              {item.STORAGE_METHOD}
            </p>
          )}
          {item.VALID_TERM && (
            <p className="text-gray-600 mt-1">
              <span className="font-medium">유효기간: </span>
              {item.VALID_TERM}
            </p>
          )}
        </Section>
      )}

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>출처: 식품의약품안전처 NEDRUG</span>
        <a
          href={`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemPhotoFix?itemSeq=${item.ITEM_SEQ}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-gray-600"
        >
          NEDRUG 원문 <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
  variant,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  variant?: 'warning'
}) {
  return (
    <div
      className={`rounded-lg p-3 ${
        variant === 'warning' ? 'bg-red-50/40 border border-red-100' : 'bg-gray-50/60'
      }`}
    >
      <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
        {icon}
        {title}
      </h5>
      <div className="text-xs space-y-2">{children}</div>
    </div>
  )
}

function ParagraphGroup({
  title,
  paragraphs,
}: {
  title: string
  paragraphs: string[]
}) {
  return (
    <div className="space-y-1">
      {title && <p className="font-medium text-gray-700">{title}</p>}
      {paragraphs.map((p, i) => (
        <p key={i} className="text-gray-600 leading-relaxed pl-2">
          {p}
        </p>
      ))}
    </div>
  )
}

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

/** DUR 플래그 → 위험도 색상/아이콘 매핑 */
const DUR_TYPE_STYLE: Record<
  string,
  { label: string; className: string; severe: boolean }
> = {
  병용금기: { label: '병용금기', className: 'bg-red-100 text-red-800 border-red-200', severe: true },
  임부금기: { label: '임부금기', className: 'bg-red-100 text-red-800 border-red-200', severe: true },
  특정연령대금기: {
    label: '연령금기',
    className: 'bg-red-100 text-red-800 border-red-200',
    severe: true,
  },
  노인주의: {
    label: '노인주의',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    severe: false,
  },
  용량주의: {
    label: '용량주의',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    severe: false,
  },
  투여기간주의: {
    label: '투여기간주의',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    severe: false,
  },
  효능군중복: {
    label: '효능군중복',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    severe: false,
  },
  서방형분할주의: {
    label: '분할주의',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    severe: false,
  },
}

function DurSafetyCheck({ itemSeq }: { itemSeq: string }) {
  const { data, isLoading, isError } = useMfdsDurProduct({ itemSeq })

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50/40 p-3 text-xs text-gray-500 flex items-center gap-2">
        <div className="h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        DUR 안전성 검사 중...
      </div>
    )
  }
  if (isError) return null
  if (!data || data.totalCount === 0) {
    return (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 text-xs text-emerald-700 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5" />
        식약처 DUR 등록된 금기·주의사항이 없습니다.
      </div>
    )
  }

  const types = data.types
  const hasSevere = types.some((t) => DUR_TYPE_STYLE[t]?.severe)

  return (
    <div
      className={`rounded-lg border p-3 ${
        hasSevere
          ? 'bg-red-50/60 border-red-200'
          : 'bg-amber-50/40 border-amber-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {hasSevere ? (
          <ShieldAlert className="h-4 w-4 text-red-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-600" />
        )}
        <h5 className="font-semibold text-sm text-gray-900">
          식약처 DUR 안전성 검사
        </h5>
        <span className="text-[11px] text-gray-500">
          (총 {data.totalCount}건)
        </span>
      </div>

      {/* 타입별 칩 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {types.map((t) => {
          const style = DUR_TYPE_STYLE[t]
          const count = data.grouped[t]?.length ?? 0
          return (
            <span
              key={t}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                style ? style.className : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              {style?.label || t}
              <span className="opacity-70">·{count}</span>
            </span>
          )
        })}
      </div>

      {/* 상세 목록 (각 타입별 최대 3건) */}
      <div className="space-y-2 mt-2">
        {types.map((t) => {
          const list = data.grouped[t] || []
          const visible = list.slice(0, 3)
          if (visible.length === 0) return null
          return (
            <details key={t} className="text-xs">
              <summary className="cursor-pointer text-gray-700 font-medium hover:text-gray-900">
                {DUR_TYPE_STYLE[t]?.label || t} 상세 ({list.length})
              </summary>
              <ul className="mt-1.5 ml-3 space-y-1.5">
                {visible.map((row, i) => (
                  <li key={i} className="text-gray-600 leading-snug">
                    <DurRowSummary row={row} type={t} />
                  </li>
                ))}
                {list.length > visible.length && (
                  <li className="text-[11px] text-gray-400">
                    + 외 {list.length - visible.length}건
                  </li>
                )}
              </ul>
            </details>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        출처: 식품의약품안전처 의약품안전사용서비스(DUR) · 환자별 위험도는 해당 환자 정보 입력 시 정밀 매칭됩니다.
      </p>
    </div>
  )
}

function DurRowSummary({ row, type }: { row: DurProductItem; type: string }) {
  const ingr =
    row.INGR_KOR_NAME || row.INGR_NAME || row.INGR_ENG_NAME || ''
  const reason = row.PROHBT_CONTENT || row.REMARK || ''
  const mixtureName =
    row.MIXTURE_INGR_KOR_NAME ||
    row.MIXTURE_INGR_ENG_NAME ||
    row.MIXTURE_ITEM_NAME ||
    ''

  if (type === '병용금기' && mixtureName) {
    return (
      <span>
        <span className="font-medium">{ingr}</span>
        <span className="text-gray-400 mx-1">×</span>
        <span className="font-medium">{mixtureName}</span>
        {reason && <span className="block text-gray-500 mt-0.5">— {reason}</span>}
      </span>
    )
  }
  return (
    <span>
      <span className="font-medium">{ingr}</span>
      {reason && <span className="text-gray-500"> — {reason}</span>}
    </span>
  )
}

/**
 * 사용상 주의사항 본문에서 주요 대상자/금기 키워드를 자동 추출하여 칩으로 표시.
 * NEDRUG 공식 표현이 다양해 키워드 기반 휴리스틱 사용.
 */
const CAUTION_KEYWORDS: Array<{ label: string; patterns: string[]; severe?: boolean }> = [
  { label: '임부 금기', patterns: ['임부', '임산부', '임신부'], severe: true },
  { label: '수유부 주의', patterns: ['수유부', '수유 중'] },
  { label: '소아 주의', patterns: ['소아', '어린이', '15세 미만', '12세 미만', '6세 미만'] },
  { label: '고령자 주의', patterns: ['고령자', '노인'] },
  { label: '간장애 주의', patterns: ['간장애', '간 장애', '간기능', '간 기능'], severe: true },
  { label: '신장애 주의', patterns: ['신장애', '신 장애', '신기능', '신 기능'], severe: true },
  { label: '심장애 주의', patterns: ['심장애', '심부전', '심 기능'] },
  { label: '운전·기계조작', patterns: ['운전', '기계조작', '기계 조작'] },
  { label: '음주 주의', patterns: ['음주', '알코올', '알콜'] },
  { label: '과민증/알레르기', patterns: ['과민증', '과민반응', '알레르기', '아나필락시'] },
  { label: '당뇨 주의', patterns: ['당뇨', '혈당'] },
  { label: '고혈압 주의', patterns: ['고혈압'] },
  { label: '출혈 위험', patterns: ['출혈'] },
]

function CautionChips({
  articles,
}: {
  articles: Array<{ articleTitle: string; paragraphs: string[] }>
}) {
  const flat = articles
    .flatMap((a) => [a.articleTitle, ...a.paragraphs])
    .join(' ')
    .toLowerCase()

  const hits = CAUTION_KEYWORDS.filter((kw) =>
    kw.patterns.some((p) => flat.includes(p.toLowerCase())),
  )

  if (hits.length === 0) return null

  return (
    <div className="mb-3 -mt-1">
      <p className="text-[11px] font-medium text-red-700 mb-1.5">주의 대상자 / 금기</p>
      <div className="flex flex-wrap gap-1.5">
        {hits.map((kw) => (
          <span
            key={kw.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
              kw.severe
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <AlertCircle className="h-3 w-3" />
            {kw.label}
          </span>
        ))}
      </div>
    </div>
  )
}
