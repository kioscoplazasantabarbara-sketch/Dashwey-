/* Dashwey Service Worker v7 — Network-First para HTML, Cache-First para assets
   v7: bump de versión para forzar purga de cache corrupto en dispositivos existentes.
   Añadido timeout de 5s en fetch del HTML para evitar esperas infinitas offline. */
const CACHE_NAME = 'dashwey-v7';
const HTML_URL   = 'Dashwey_v82.html';

// Timeout helper — evita que fetch se quede colgado indefinidamente
function fetchWithTimeout(request, ms) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

self.addEventListener('install', e => {
  // Activar inmediatamente sin esperar a que tabs anteriores cierren
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      // Borrar TODOS los caches anteriores (incluidos dashwey-v5, dashwey-v6)
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Purging old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      console.log('[SW] v7 activated, old caches purged');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first para el HTML principal (con timeout de 5s)
  if (url.pathname.endsWith(HTML_URL) || url.pathname.endsWith('/')) {
    e.respondWith(
      fetchWithTimeout(e.request, 5000)
        .then(res => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => {
          console.warn('[SW] HTML fetch failed/timeout — serving from cache');
          return caches.match(e.request);
        })
    );
    return;
  }

  // No cachear requests de Firebase Auth/Firestore — siempre van a red
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first para el resto de assets estáticos
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        }
        return res;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
