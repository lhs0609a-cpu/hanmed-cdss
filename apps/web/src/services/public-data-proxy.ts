/**
 * 공공데이터포털(data.go.kr) 호출은 백엔드 프록시를 통해서만 한다.
 *
 * 이전에는 프론트가 VITE_PUBLIC_DATA_API_KEY 로 gov API 를 직접 호출해
 * serviceKey 가 클라이언트 번들에 노출됐다. 이제 serviceKey 는 서버에만 있고,
 * 프론트는 endpoint 키 + 파라미터만 프록시로 넘긴다. (서버가 키 주입)
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://api.ongojisin.co.kr/api/v1'

const PROXY_URL = `${API_BASE_URL}/public-data`

/**
 * 공공데이터 프록시 호출. serviceKey 는 붙이지 않는다(서버가 주입).
 * @param endpoint 화이트리스트 endpoint 키 (예: 'DRUG_INFO', 'DUR_CONTRAINDICATION')
 * @param params serviceKey 를 제외한 쿼리 파라미터 (URLSearchParams)
 */
export async function fetchPublicData(
  endpoint: string,
  params: URLSearchParams
): Promise<Response> {
  params.set('endpoint', endpoint)
  return fetch(`${PROXY_URL}?${params.toString()}`)
}
