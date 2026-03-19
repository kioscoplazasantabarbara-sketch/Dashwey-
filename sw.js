/* ═══════════════════════════════════════════════════════════════
   Dashwey Service Worker v8
   Network-First HTML · Cache-First assets · Auto-update support
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'dashwey-v8';
const HTML_URL    = 'Dashwey_v82.html';
const VERSION_URL = 'version.txt';

// ── install: cachear assets críticos y activar inmediatamente ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([HTML_URL, VERSION_URL]).catch(() => {}))
      .then(() => self.skipWaiting()) // activar sin esperar a que cierren los clientes
  );
});

// ── activate: limpiar cachés antiguas y tomar control ──────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // controlar tabs abiertos sin reload
  );
});

// ── message: permite skipWaiting desde el cliente ──────────────
self.addEventListener('message', e => {
  if (e.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ── fetch: network-first HTML, cache-first assets ──────────────
self.addEventListener('fetch', e => {
  // Ignorar peticiones no-GET (POST, PUT, etc.) — no se pueden cachear
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // version.txt: siempre network, nunca caché (anti-cache estricto)
  if (url.pathname.endsWith(VERSION_URL)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML principal: network-first, fallback a caché
  if (url.pathname.endsWith(HTML_URL) || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res?.status === 200) {
            const resClone = res.clone(); // clonar ANTES de consumir
            caches.open(CACHE_NAME)
              .then(cache => cache.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets (JS, CSS, fonts, imágenes): cache-first, fallback network
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res?.status === 200 && res.type !== 'opaque') {
            const resClone = res.clone(); // clonar ANTES de consumir
            caches.open(CACHE_NAME)
              .then(cache => cache.put(e.request, resClone));
          }
          return res;
        });
      })
  );
});
