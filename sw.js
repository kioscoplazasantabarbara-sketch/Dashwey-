/* ═══════════════════════════════════════════════════════════════════
   Dashwey Service Worker v9.5.26
   FIX: Cache busting agresivo para splash en mobile/PWA/iOS

   ESTRATEGIA DE CACHE:
   - HTML principal: SIEMPRE network-first (nunca cache-only)
   - version.txt: siempre red, sin cache
   - Assets estáticos: cache-first con fallback
   - Al activar: eliminar TODAS las caches antiguas
   - skipWaiting: inmediato siempre (no esperar navegación)
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME   = 'dashwey-v9-5-26';  /* FIX: incrementar con CADA deploy */
const HTML_URL     = 'Dashwey_v82.html';
const VERSION_URL  = 'version.txt';

/* Lista de recursos a pre-cachear (solo los esenciales offline) */
const PRECACHE_URLS = [
  VERSION_URL,
  /* NO pre-cachear HTML aquí — lo cachea el fetch handler tras red exitosa */
];

/* ── Install: pre-cache mínimo + skipWaiting inmediato ─────────────
   CRÍTICO: skipWaiting() sin esperar — el nuevo SW toma control
   en el siguiente fetch, no en la siguiente navegación completa.
   Esto garantiza que mobile/PWA actualice sin necesitar reload manual. */
self.addEventListener('install', e => {
  self.skipWaiting(); /* FIX v9.5.26: activación inmediata, no esperar */
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE_URLS).catch(() => { /* ignorar fallos de precache */ }))
  );
});

/* ── Activate: LIMPIAR TODAS las caches antiguas ───────────────────
   FIX v9.5.26: eliminar cualquier cache dashwey-* que no sea la actual.
   Esto fuerza que mobile/iOS recargue el HTML y el splash frescos. */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const toDelete = keys.filter(k =>
          /* Borrar CUALQUIER versión anterior, sea del nombre que sea */
          k !== CACHE_NAME
        );
        return Promise.all(toDelete.map(k => {
          console.log('[SW] Eliminando cache antigua:', k);
          return caches.delete(k);
        }));
      })
      /* Tomar control de TODOS los clientes abiertos inmediatamente */
      .then(() => self.clients.claim())
      /* Notificar a todos los clientes que el SW se actualizó */
      .then(() => {
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ action: 'SW_UPDATED', version: '9.5.26' });
          });
        });
      })
  );
});

/* ── Messages desde el cliente ────────────────────────────────────── */
self.addEventListener('message', e => {
  if (!e.data) return;

  /* skipWaiting: activación manual desde el cliente */
  if (e.data.action === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  /* FORCE_REFRESH: limpiar cache y recargar (botón "Actualizar" en banner) */
  if (e.data.action === 'FORCE_REFRESH') {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
    return;
  }

  /* SHOW_NOTIFICATION: mostrar notificación local desde el cliente */
  if (e.data.action === 'SHOW_NOTIFICATION') {
    const { title, opts } = e.data;
    if (!title) return;
    e.waitUntil(
      self.registration.showNotification(title, {
        icon:    'icon-192.png',
        badge:   'icon-192.png',
        vibrate: [100, 50, 100],
        ...opts,
      })
    );
    return;
  }
});

/* ── Push: recibir mensajes FCM (server-side) ────────────────────── */
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch(_) { payload = { title: 'Dashwey', body: e.data.text() }; }

  const title = payload.title || 'Dashwey';
  const opts  = {
    body:     payload.body   || '',
    icon:     payload.icon   || 'icon-192.png',
    badge:    'icon-192.png',
    tag:      payload.tag    || 'dashwey-push',
    renotify: true,
    vibrate:  [100, 50, 100],
    data:     payload.data   || {},
  };

  e.waitUntil(self.registration.showNotification(title, opts));
});

/* ── Notification click: deep-link al módulo correcto ────────────── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data   = e.notification.data || {};
  const action = data.action || '';
  const card   = data.card   || '';

  let targetUrl = self.registration.scope;
  const params  = new URLSearchParams();
  if (action) params.set('action', action);
  if (card)   params.set('card',   card);
  if (params.toString()) targetUrl += '?' + params.toString();

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.postMessage({ action: 'DEEP_LINK', deepAction: action, card });
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});

/* ── Fetch: estrategia por tipo de recurso ───────────────────────── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* version.txt: SIEMPRE de red, sin cache —
     es el archivo que determina si hay actualización disponible */
  if (url.pathname.endsWith(VERSION_URL)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* HTML principal: SIEMPRE network-first, cache como fallback offline.
     FIX v9.5.26: no-store en la petición para evitar caché HTTP del browser.
     Esto garantiza que el splash dinámico (en el HTML) sea siempre el nuevo. */
  if (url.pathname.endsWith(HTML_URL) || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, {
        cache: 'no-store',  /* FIX: forzar red, ignorar caché HTTP */
      })
        .then(res => {
          if (res && res.status === 200) {
            /* Actualizar cache con la versión fresca */
            const cloned = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, cloned));
          }
          return res;
        })
        .catch(() => {
          /* Sin red: servir desde cache (modo offline) */
          return caches.match(e.request);
        })
    );
    return;
  }

  /* Firebase CDN + otros externos: network-first sin cachear
     (no cachear Firebase JS para evitar versiones obsoletas) */
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebaseapp.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  /* Resto de assets (iconos, etc.): cache-first con fallback a red */
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request)
          .then(res => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              const cloned = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(e.request, cloned));
            }
            return res;
          });
      })
  );
});
