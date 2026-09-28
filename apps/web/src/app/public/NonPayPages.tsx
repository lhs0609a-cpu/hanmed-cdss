import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useSEO } from '@/hooks/useSEO'
import {
  appliedOnLabel,
  byItem,
  HIRA_NONPAY_URL,
  nonpayItemHref,
  nonpayItemSlug,
  nonpayRegionHref,
  nonpayRegionSlug,
  won,
  type NonPayItemView,
  type NonPayRegionResult,
} from '@/lib/nonpay'
import './public-content.css'

/**
 * 한방 비급여 진료비 공개 쪽.
 *
 * 마크업은 scripts/prerender-public.mjs 가 굽는 HTML 과 같은 모양이어야 한다.
 * 크롤러는 구운 HTML 을, 사람은 이 화면을 보는데 둘이 다르면 클로킹이다.
 *
 * 여기에는 잠긴 자리가 없다. 심평원이 이미 전부 공개한 통계라 우리가 가릴
 * 명분이 없고, 가리면 검색해서 온 사람이 아무것도 못 얻고 돌아간다.
 */

function useAllRegions() {
  const [data, setData] = useState<NonPayRegionResult[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let live = true
    api
      .get<NonPayRegionResult[]>('/public/nonpay-prices/korean-medicine/all')
      .then((res) => live && setData(res.data))
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [])
  return { data, error }
}

/** 자료가 어디서 왔고 언제 기준인지. 금액을 보이는 쪽마다 반드시 붙인다. */
function SourceNote({ appliedOn }: { appliedOn: string | null }) {
  const label = appliedOnLabel(appliedOn)
  return (
    <p className="public-note prerender-note">
      건강보험심사평가원 비급여진료비용 지역별 통계입니다
      {label ? ` (적용 ${label} 기준)` : ''}. 지역 안 의료기관들이 신고한 금액의
      분포이고 개별 한의원의 가격이 아닙니다. 실제 비용은 진료 범위와 횟수에
      따라 달라지므로 방문할 곳에 직접 확인해야 합니다.{' '}
      <a href={HIRA_NONPAY_URL} target="_blank" rel="noopener noreferrer">
        심평원 비급여 진료비 정보
      </a>
    </p>
  )
}

function Status({ error, what }: { error: boolean; what: string }) {
  return (
    <p className="public-index-lead">
      {error ? `${what}를 지금은 불러올 수 없습니다.` : '불러오는 중입니다…'}{' '}
      <Link to="/nonpay">한방 비급여 가격으로</Link>
    </p>
  )
}

type Stat = {
  min: number | null
  median: number | null
  average: number | null
  max: number | null
}

/** 최저·중간·평균·최고 네 칸. 표가 여러 쪽에 나오므로 한 곳에서 그린다. */
function StatCells({ stat }: { stat: Stat }) {
  return (
    <>
      <td>{won(stat.min)}</td>
      <td>{won(stat.median)}</td>
      <td>{won(stat.average)}</td>
      <td>{won(stat.max)}</td>
    </>
  )
}

function TableHead() {
  return (
    <tr>
      <th scope="col">구분</th>
      <th scope="col">최저</th>
      <th scope="col">중간</th>
      <th scope="col">평균</th>
      <th scope="col">최고</th>
    </tr>
  )
}

export function NonPayIndexPage() {
  const { data, error } = useAllRegions()
  useSEO({
    title: '한방 비급여 진료비 — 추나·약침 지역별 가격',
    description:
      '추나요법·약침술·한방물리요법의 지역별 최저·중간·평균·최고 가격. 건강보험심사평가원 비급여 진료비용 공개 자료입니다.',
  })
  if (!data)
    return (
      <div className="public-index">
        <Status error={error} what="가격" />
      </div>
    )
  const national = data.find((r) => r.region === 'All') ?? data[0]
  const items = byItem(data)
  return (
    <div className="public-index">
      <h1>한방 비급여 진료비</h1>
      <p className="public-index-lead">
        추나요법·약침술처럼 건강보험이 되지 않는 한방 진료의 가격을 지역별로
        봅니다. 심평원이 공개한 통계를 항목 {items.length}개, 지역 {data.length}
        곳으로 정리했습니다.
      </p>

      <h2>항목별</h2>
      <div className="public-table-scroll">
        <table className="public-table">
          <caption>{national.regionName} 기준 가격</caption>
          <thead>
            <TableHead />
          </thead>
          <tbody>
            {national.items.map((item) => {
              const slug = nonpayItemSlug(item.name)
              return (
                <tr key={item.code}>
                  <th scope="row">
                    {slug ? (
                      <Link to={nonpayItemHref(slug)}>{item.name}</Link>
                    ) : (
                      item.name
                    )}
                  </th>
                  <StatCells stat={item} />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2>지역별</h2>
      <ul className="public-list public-chips">
        {data.map((r) => {
          const slug = nonpayRegionSlug(r.regionName)
          return slug ? (
            <li key={r.region}>
              <Link to={nonpayRegionHref(slug)}>{r.regionName}</Link>
            </li>
          ) : null
        })}
      </ul>

      <SourceNote appliedOn={national.appliedOn} />
    </div>
  )
}

export function NonPayItemPage() {
  const { slug = '' } = useParams()
  const { data, error } = useAllRegions()
  const view: NonPayItemView | undefined = data
    ? byItem(data).find((v) => v.slug === slug)
    : undefined
  useSEO({
    title: view ? `${view.name} 비급여 가격 — 지역별` : '한방 비급여 진료비',
    description: view
      ? `${view.name}의 지역별 최저·중간·평균·최고 가격. 심평원 비급여 진료비용 공개 자료.`
      : undefined,
  })
  if (!data || !view)
    return (
      <div className="public-teaser">
        <Status error={error || (!!data && !view)} what="항목" />
      </div>
    )
  const national = view.rows.find((r) => r.regionCode === 'All')
  const appliedOn = data.find((r) => r.appliedOn)?.appliedOn ?? null
  return (
    <article className="public-teaser prerender-teaser">
      <p className="public-kicker prerender-kicker">{view.category}</p>
      <h1>{view.name}</h1>
      <p>
        {view.name}은(는) 건강보험이 적용되지 않는 한방 항목입니다.
        {national && national.stat.median !== null
          ? ` 전국 중간 가격은 ${won(national.stat.median)}입니다.`
          : ''}{' '}
        아래는 지역별 분포입니다.
      </p>
      <div className="public-table-scroll">
        <table className="public-table">
          <caption>{view.name} 지역별 가격</caption>
          <thead>
            <TableHead />
          </thead>
          <tbody>
            {view.rows.map((row) => {
              const regionSlug = nonpayRegionSlug(row.regionName)
              return (
                <tr key={row.regionCode}>
                  <th scope="row">
                    {regionSlug ? (
                      <Link to={nonpayRegionHref(regionSlug)}>{row.regionName}</Link>
                    ) : (
                      row.regionName
                    )}
                  </th>
                  <StatCells stat={row.stat} />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p>
        <Link to="/nonpay">다른 항목 보기</Link>
      </p>
      <SourceNote appliedOn={appliedOn} />
    </article>
  )
}

export function NonPayRegionPage() {
  const { region = '' } = useParams()
  const { data, error } = useAllRegions()
  const found = data?.find((r) => nonpayRegionSlug(r.regionName) === region)
  useSEO({
    title: found ? `${found.regionName} 한방 비급여 진료비` : '한방 비급여 진료비',
    description: found
      ? `${found.regionName}의 추나요법·약침술 등 한방 비급여 항목 ${found.items.length}개 가격. 심평원 공개 자료.`
      : undefined,
  })
  if (!data || !found)
    return (
      <div className="public-teaser">
        <Status error={error || (!!data && !found)} what="지역" />
      </div>
    )
  return (
    <article className="public-teaser prerender-teaser">
      <p className="public-kicker prerender-kicker">한방 비급여 진료비</p>
      <h1>{found.regionName} 한방 비급여 가격</h1>
      <p>
        {found.regionName} 지역 의료기관이 신고한 한방 비급여 항목{' '}
        {found.items.length}개의 가격 분포입니다.
      </p>
      <div className="public-table-scroll">
        <table className="public-table">
          <caption>{found.regionName} 항목별 가격</caption>
          <thead>
            <TableHead />
          </thead>
          <tbody>
            {found.items.map((item) => {
              const slug = nonpayItemSlug(item.name)
              return (
                <tr key={item.code}>
                  <th scope="row">
                    {slug ? (
                      <Link to={nonpayItemHref(slug)}>{item.name}</Link>
                    ) : (
                      item.name
                    )}
                  </th>
                  <StatCells stat={item} />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ul className="public-list public-chips">
        {data.map((r) => {
          const slug = nonpayRegionSlug(r.regionName)
          return slug && r.region !== found.region ? (
            <li key={r.region}>
              <Link to={nonpayRegionHref(slug)}>{r.regionName}</Link>
            </li>
          ) : null
        })}
      </ul>
      <SourceNote appliedOn={found.appliedOn} />
    </article>
  )
}
