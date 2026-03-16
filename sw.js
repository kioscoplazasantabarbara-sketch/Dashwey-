/* ═══════════════════════════════════════════════════════════════════
   DASHWEY · Service Worker v1.0
   Estrategia: Cache-First para el shell de la app (HTML, assets)
   El estado de datos vive en localStorage — no necesita red.
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'dashwey-v1';
const SHELL = [
  './',
  './Dashwey_v82.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* ── Instalación: precachear el shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll falla si algún recurso no existe — usamos add individual con try/catch
      return Promise.allSettled(SHELL.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

/* ── Activación: limpiar cachés viejas ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: Cache-First, fallback a red ── */
self.addEventListener('fetch', event => {
  // Solo interceptar GET del mismo origen
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.startsWith('file://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cachear respuestas válidas del mismo origen
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin red y sin caché: devolver el HTML principal como fallback
        return caches.match('./Dashwey_v82.html') ||
               caches.match('./') ||
               new Response('Dashwey está offline. Recarga cuando tengas conexión.', {
                 headers: { 'Content-Type': 'text/plain' }
               });
      });
    })
  );
});
