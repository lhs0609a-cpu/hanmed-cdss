export type LiveSession = {
  id: string; visitor: string; source: string; device: string;
  firstAt: string; lastAt: string; receivedAt: string;
  startAt: string | null; submitAt: string | null; successAt: string | null;
  errorAt: string | null; demoAt: string | null; featureAt: string | null;
  page: string;
};
const minute = 60000;
const stamp = (s: string | null) => s ? Date.parse(s) : 0;
export function buildLive(sessions: LiveSession[], now: number) {
  const end = Math.floor(now / minute) * minute;
  const iso = (n: number) => new Date(n).toISOString();
  const inWindow = (at: string | null, from: number, to: number) => stamp(at) >= from && stamp(at) < to;
  const recent = sessions.filter(s => inWindow(s.lastAt, end - 5 * minute, end));
  const rules = [];
  for (const device of ['all', 'mobile', 'desktop', 'tablet']) {
    const group = sessions.filter(s => device === 'all' || s.device === device);
    const specs = [
      { code: 'signup_error', label: '가입 오류 비율 증가', minutes: 15, minimum: 20,
        eligible: (s: LiveSession, a: number, b: number) => inWindow(s.submitAt, a, b),
        affected: (s: LiveSession) => stamp(s.errorAt) >= stamp(s.submitAt) && !!s.errorAt,
        action: '오류가 발생한 기기에서 가입을 재현하고 입력 안내와 API 응답을 확인하세요.',
        verify: '같은 기기의 가입 요청 대비 오류 비율과 오류 후 완료 수를 비교하세요.' },
      { code: 'form_abandoned', label: '가입 입력 중단 비율 증가', minutes: 60, minimum: 30,
        eligible: (s: LiveSession, a: number, b: number) => !!s.startAt && inWindow(s.lastAt, a - 30 * minute, b - 30 * minute),
        affected: (s: LiveSession) => !s.submitAt && !s.successAt,
        action: '필수 입력 안내와 모바일 동의 단계의 불편을 확인하세요.',
        verify: '종료된 가입 입력 세션 중 요청까지 진행한 비율을 비교하세요.' },
      { code: 'demo_only', label: '체험 후 미가입 비율 증가', minutes: 60, minimum: 30,
        eligible: (s: LiveSession, a: number, b: number) => !!s.demoAt && inWindow(s.lastAt, a - 30 * minute, b - 30 * minute),
        affected: (s: LiveSession) => !s.successAt && !s.featureAt,
        action: '체험 완료 화면의 가입 혜택과 가입 버튼 노출을 확인하세요.',
        verify: '종료된 체험 완료 세션의 가입 완료 비율을 같은 기기에서 비교하세요.' },
      { code: 'not_activated', label: '가입 후 미사용 비율 증가', minutes: 60, minimum: 30,
        eligible: (s: LiveSession, a: number, b: number) => !!s.successAt && inWindow(s.lastAt, a - 30 * minute, b - 30 * minute),
        affected: (s: LiveSession) => !s.featureAt || stamp(s.featureAt) < stamp(s.successAt),
        action: '가입 직후 예시와 첫 기능으로 이동하는 안내를 점검하세요.',
        verify: '종료된 신규 가입 세션의 첫 기능 사용 비율을 비교하세요.' },
    ];
    for (const rule of specs) {
      const width = rule.minutes * minute;
      const current = group.filter(s => rule.eligible(s, end - width, end));
      const previous = group.filter(s => rule.eligible(s, end - 2 * width, end - width));
      const affected = current.filter(rule.affected).length;
      const baseline = previous.filter(rule.affected).length;
      const rate = current.length ? affected / current.length : null;
      const baselineRate = previous.length ? baseline / previous.length : null;
      const sufficient = current.length >= rule.minimum && previous.length >= rule.minimum;
      rules.push({ id: `${rule.code}:${device}`, code: rule.code, label: rule.label, device,
        windowStart: iso(end - width), windowEnd: iso(end),
        baselineStart: iso(end - 2 * width), baselineEnd: iso(end - width),
        denominator: current.length, numerator: affected, baselineDenominator: previous.length,
        baselineNumerator: baseline, rate, baselineRate, sufficient,
        triggered: sufficient && affected >= 5 && rate! >= baselineRate! * 2 && rate! - baselineRate! >= 0.1,
        recovered: current.filter(s => rule.affected(s) && s.errorAt && stamp(s.successAt) >= stamp(s.errorAt)).length,
        action: rule.action, verify: rule.verify,
        hypothesis: '화면 안내나 유입 구성 변화가 원인일 수 있습니다. 행동 기록만으로 원인을 확정할 수 없습니다.',
      });
    }
  }
  return {
    asOf: iso(now), windowStart: iso(end - 60 * minute), windowEnd: iso(end),
    lastReceivedAt: sessions.length ? iso(sessions.reduce((latest, s) => Math.max(latest, stamp(s.receivedAt)), 0)) : null,
    sampleSize: sessions.filter(s => inWindow(s.lastAt, end - 60 * minute, end)).length,
    recentVisitors: new Set(recent.map(s => s.visitor)).size,
    minutes: Array.from({ length: 60 }, (_, i) => {
      const from = end - (60 - i) * minute;
      return { at: iso(from),
        starts: sessions.filter(s => inWindow(s.firstAt, from, from + minute)).length,
        signups: sessions.filter(s => inWindow(s.successAt, from, from + minute)).length };
    }),
    feed: [...recent].sort((a, b) => stamp(b.lastAt) - stamp(a.lastAt)).slice(0, 20).map(s => ({
      source: s.source, device: s.device, page: s.page, at: s.lastAt,
      stages: [s.demoAt && '체험 완료', s.startAt && '가입 입력', s.submitAt && '가입 요청', s.successAt && '가입 완료', s.featureAt && '기능 사용'].filter(Boolean),
    })),
    rules,
  };
}
