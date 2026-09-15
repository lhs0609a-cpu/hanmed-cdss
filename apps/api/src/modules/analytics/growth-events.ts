import { BadRequestException } from '@nestjs/common';

export const GROWTH_TYPES = [
  'page_view',
  'page_engagement',
  'click',
  'signup_start',
  'signup_submit',
  'signup_success',
  'signup_error',
  'login_success',
  'login_error',
  'demo_completed',
  'feature_used',
  'client_error',
  'web_vital',
] as const;
export const PUBLIC_PAGES = [
  '/',
  '/go',
  '/start',
  '/trial',
  '/register',
  '/login',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/subscription-terms',
];
export function safePage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (PUBLIC_PAGES.includes(value)) return value;
  if (/^\/dashboard(?:\/[a-z-]+)?$/.test(value)) return value;
  return null;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseGrowthEvents(body: unknown, now = Date.now()) {
  const events = (body as { events?: unknown })?.events;
  if (!Array.isArray(events) || !events.length || events.length > 50)
    throw new BadRequestException('Expected 1–50 events');
  return events.map((e) => {
    if (
      !e ||
      !uuid.test(e.id) ||
      !uuid.test(e.sessionId) ||
      !uuid.test(e.visitorId) ||
      !GROWTH_TYPES.includes(e.type) ||
      !safePage(e.page)
    )
      throw new BadRequestException('Invalid event');
    const time = Date.parse(e.timestamp);
    if (!Number.isFinite(time) || time > now + 60000 || time < now - 86400000)
      throw new BadRequestException('Invalid timestamp');
    const p: Record<string, unknown> = {
      page: e.page,
      visitorId: e.visitorId,
      device: ['mobile', 'tablet', 'desktop'].includes(e.device)
        ? e.device
        : 'desktop',
      version: '1',
    };
    if (typeof e.viewId === 'string' && uuid.test(e.viewId))
      p.viewId = e.viewId;
    // Only campaign slugs and fixed machine codes; never DOM text, form values or URLs.
    for (const key of [
      'source',
      'medium',
      'campaign',
      'content',
      'target',
      'code',
      'metric',
    ]) {
      if (typeof e[key] === 'string' && /^[a-zA-Z0-9_.:-]{1,80}$/.test(e[key]))
        p[key] = e[key];
    }
    for (const [key, max] of Object.entries({
      x: 100,
      y: 100,
      scroll: 100,
      duration: 1800,
      width: 10000,
      height: 100000,
      value: 60000,
    })) {
      if (
        typeof e[key] === 'number' &&
        Number.isFinite(e[key]) &&
        e[key] >= 0 &&
        e[key] <= max
      )
        p[key] = Math.round(e[key] * 100) / 100;
    }
    return {
      id: e.id,
      type: `growth_${e.type}`,
      sessionId: e.sessionId,
      userId: null,
      properties: p,
      occurredAt: new Date(time),
    };
  });
}
