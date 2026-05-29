// my trips — service worker
// 앱 셸(HTML + CDN 라이브러리)만 캐싱. Firebase 통신은 항상 네트워크.
const CACHE_VERSION = 'mytrips-v2';
const APP_SHELL = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase / 실시간 데이터 / API는 항상 네트워크
  const networkOnlyHosts = [
    'firestore.googleapis.com', 'firebase', 'googleapis.com', 'gstatic.com',
    'google.com', 'identitytoolkit', 'securetoken',
    'mymemory.translated.net', 'frankfurter', 'exchangerate', 'er-api.com',
    'open-meteo.com', 'basemaps.cartocdn.com',
  ];
  if (networkOnlyHosts.some((h) => url.hostname.includes(h))) return;

  // 앱 셸: 캐시 우선
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (url.origin === location.origin ||
            url.hostname.includes('cdn.jsdelivr.net') ||
            url.hostname.includes('unpkg.com') ||
            url.hostname.includes('fonts.g'))) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
