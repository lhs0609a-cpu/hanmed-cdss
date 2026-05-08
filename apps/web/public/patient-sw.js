/**
 * 환자용 PWA — Service Worker.
 *
 * 정책:
 *   - /patient 스코프만 캐시한다 (한의사 화면과 분리).
 *   - 정적 자원: cache-first.
 *   - API: network-first, 네트워크 실패 시 캐시 fallback.
 *   - 푸시 알림: '복약 시간이에요', '내일 진료 예약 잊지 마세요' 등.
 *   - 오래된 캐시는 새 버전 활성화 시 정리.
 */

const VERSION = 'patient-v1';
const STATIC_CACHE = `ongojisin-patient-static-${VERSION}`;
const RUNTIME_CACHE = `ongojisin-patient-runtime-${VERSION}`;

const STATIC_ASSETS = [
  '/patient',
  '/patient-manifest.webmanifest',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('ongojisin-patient-') && !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // /patient 스코프만 가로챈다 — 한의사 앱(/dashboard)에는 영향 없음
  if (!url.pathname.startsWith('/patient') && !url.pathname.startsWith('/api/v1/patient')) return;

  // API: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // 정적: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return res;
      });
    }),
  );
});

// 푸시 알림 (서버에서 web-push 로 전송)
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: '온고지신 알림', body: event.data?.text() || '' };
  }
  const title = payload.title || '온고지신';
  const options = {
    body: payload.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: payload.url || '/patient' },
    tag: payload.tag || 'ongojisin-patient',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/patient';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((all) => {
      const existing = all.find((c) => c.url.includes('/patient'));
      if (existing) {
        existing.focus();
        existing.navigate?.(target);
      } else {
        clients.openWindow(target);
      }
    }),
  );
});
