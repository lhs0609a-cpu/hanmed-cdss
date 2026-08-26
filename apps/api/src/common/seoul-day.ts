/**
 * 한국 시간 기준 날짜 계산.
 *
 * 복용 체크는 "오늘 먹었어요" 인데, 서버가 UTC 면 밤 9시 이후에 누른 것이
 * 다음 날로 기록된다. 반대로 새벽 1시에 누르면 전날로 간다. 하루가 밀리면
 * 순응도와 '복용 N일째' 가 전부 틀어지므로 날짜는 항상 KST 로 센다.
 *
 * 클라이언트가 보낸 날짜는 쓰지 않는다 — 기기 시계를 바꾸면 과거·미래를
 * 채워 넣을 수 있다.
 */

/** KST 기준 YYYY-MM-DD. */
export function seoulDay(date: Date = new Date()): string {
  // en-CA 로케일이 YYYY-MM-DD 를 준다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** KST 기준 0~23 시. 야간 발송 차단에 쓴다. */
export function seoulHour(date: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  return parseInt(hour, 10);
}

/** YYYY-MM-DD 에 일수를 더한다. */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** a 부터 b 까지의 일수(b - a). 같은 날이면 0. */
export function daysBetween(a: string, b: string): number {
  const from = Date.parse(`${a}T00:00:00Z`);
  const to = Date.parse(`${b}T00:00:00Z`);
  return Math.round((to - from) / 86400000);
}
