/* ═══════════════════════════════════════════════════════════════════
   DASHWEY · Service Worker v2.0
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'dashwey-v3';
const SHELL = ['./Dashwey_v82.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  // Skip waiting immediately — don't block on old SW
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(SHELL.map(url => cache.add(url)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Never cache requests with _t= timestamp (update checks)
  if (event.request.url.includes('_t=')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./Dashwey_v82.html'));
    })
  );
});
