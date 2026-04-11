/* ═══════════════════════════════════════════════════════════════════
   Dashwey Service Worker v1.3.777-dev
   Cache: dashwey-v1-3-795-dev

   ESTRATEGIA DE CACHE v1.0.1:
   - HTML principal: SIEMPRE network-only (NUNCA se cachea)
   - version.json / version.txt: siempre red, sin cache
   - Assets estáticos (iconos, splash): cache-first con fallback
   - Firebase CDN: network-first sin cachear
   - Al install: skipWaiting inmediato + limpieza de caches antiguas
   - Al activate: claim + notificar SW_UPDATED a clientes
   - skipWaiting: inmediato siempre (manual y automático)
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'dashwey-v1-3-795-dev';
const HTML_URL    = 'index.html';

/* Solo pre-cachear assets estáticos mínimos — NUNCA el HTML */
const PRECACHE_URLS = [
  /* B-7: index.html no se pre-cachea — fetch handler lo sirve siempre de red */
  /* version.json se sirve siempre de red — no pre-cachear */
];

/* ── Install ────────────────────────────────────────────────────────
   skipWaiting inmediato + limpieza agresiva de caches viejas
   ya en install para cubrir el caso donde el SW viejo sigue activo. */
self.addEventListener('install', e => {
  self.skipWaiting(); /* Activación inmediata — no esperar navegación */
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const toDelete = keys.filter(k => k !== CACHE_NAME);
        return Promise.all(toDelete.map(k => {
          return caches.delete(k);
        }));
      })
      .then(() => caches.open(CACHE_NAME))
      .then(c => c.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

/* ── Activate ───────────────────────────────────────────────────────
   claim + limpieza final + notificar SW_UPDATED a todos los clientes.
   El cliente HTML escucha SW_UPDATED y recarga UNA VEZ con guard.
   v9.5.106: si no hay clientes activos (app cerrada), mostrar
   notificación nativa Android directamente desde el SW. */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const toDelete = keys.filter(k => k !== CACHE_NAME);
        return Promise.all(toDelete.map(k => {
          return caches.delete(k);
        }));
      })
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        if (clients.length > 0) {
          /* Hay clientes activos — notificar para que recarguen */
          clients.forEach(client => {
            client.postMessage({
              action: 'SW_UPDATED',
              version: CACHE_NAME
            });
          });
        } else {
          /* App cerrada — notificación nativa Android directamente desde SW */
          /* Solo si el permiso fue concedido previamente (no se puede pedir desde SW) */
          const permission = (typeof Notification !== 'undefined')
            ? Notification.permission : 'denied';
          if (permission === 'granted') {
            self.registration.showNotification('🆕 Dashwey ' + CACHE_NAME + ' disponible', {
              body:     'Abre la app para aplicar la actualización.',
              icon:     'icon-192.png',
              badge:    'icon-192.png',
              tag:      'dashwey-update',
              renotify: true,
              vibrate:  [100, 50, 100],
              data:     { action: 'update', version: CACHE_NAME, url: '/' },
            }).catch(() => {});
          }
        }
      })
  );
});

/* ── Messages desde el cliente ──────────────────────────────────── */
self.addEventListener('message', e => {
  if (!e.data) return;

  /* skipWaiting: activación manual desde el cliente */
  if (e.data.action === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  /* FORCE_REFRESH: limpiar cache y recargar */
  if (e.data.action === 'FORCE_REFRESH') {
    e.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
    return;
  }

  /* SHOW_NOTIFICATION: verificar permiso antes de mostrar */
  if (e.data.action === 'SHOW_NOTIFICATION') {
    const { title, opts } = e.data;
    if (!title) return;
    const permission = (typeof Notification !== 'undefined')
      ? Notification.permission
      : 'denied';
    if (permission !== 'granted') {
      console.info('[SW] SHOW_NOTIFICATION ignorado — permiso:', permission);
      return;
    }
    e.waitUntil(
      self.registration.showNotification(title, {
        icon:    'icon-192.png',
        badge:   'icon-192.png',
        vibrate: [100, 50, 100],
        ...opts,
      }).catch(err => {
        console.warn('[SW] showNotification error:', err && err.message);
      })
    );
    return;
  }
});

/* ── Push ───────────────────────────────────────────────────────── */
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); }
  catch(_) { payload = { title: 'Dashwey', body: e.data.text() }; }

  const permission = (typeof Notification !== 'undefined')
    ? Notification.permission : 'denied';
  if (permission !== 'granted') return;

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
  e.waitUntil(
    self.registration.showNotification(title, opts)
      .catch(err => console.warn('[SW] push notification error:', err && err.message))
  );
});

/* ── Notification click ─────────────────────────────────────────── */
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

/* ── Fetch ──────────────────────────────────────────────────────────
   ESTRATEGIA DE CACHE v1.0.1:

   HTML principal → NETWORK-ONLY (nunca se cachea)
   ─────────────────────────────────────────────────────────────────
   El HTML NO se guarda en cache. Siempre viene de la red.
   Sin HTML en cache = sin posibilidad de servir versión vieja.
   Offline sin red: página de error mínima con botón Reintentar.

   version.json / version.txt → NETWORK-ONLY
   Firebase CDN → network-first sin cachear
   Assets estáticos → cache-first con fallback a red
   ────────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* version.json y version.txt: siempre de red, sin cache */
  if (url.pathname.endsWith('version.json') ||
      url.pathname.endsWith('version.txt')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => new Response('{}', {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }

  /* HTML principal: NETWORK-FIRST con fallback a cache offline.
     Con red → descarga fresco (siempre actualizado).
     Sin red → sirve versión cacheada para modo offline. */
  if (url.pathname.endsWith(HTML_URL) ||
      url.pathname.endsWith('/') ||
      url.pathname === '/Dashwey-/' ||
      url.pathname === '/Dashwey-/index.html') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          /* Con red: actualizar cache y devolver respuesta fresca */
          if (res && res.status === 200) {
            const cloned = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, cloned));
          }
          return res;
        })
        .catch(() => {
          /* Sin red: servir desde cache */
          return caches.match(e.request).then(cached => {
            if (cached) return cached;
            /* Sin cache tampoco: página mínima de offline */
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
              '<meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<title>Dashwey — Sin conexión</title>' +
              '<style>*{margin:0;padding:0;box-sizing:border-box}' +
              'body{font-family:-apple-system,Helvetica,Arial,sans-serif;' +
              'background:#F7F2F2;display:flex;align-items:center;' +
              'justify-content:center;height:100vh;flex-direction:column;gap:16px}' +
              '.icon{width:72px;height:72px;border-radius:18px;background:#8B1A2F;' +
              'display:flex;align-items:center;justify-content:center}' +
              'h1{font-size:22px;font-weight:800;letter-spacing:4px;color:#8B1A2F}' +
              'p{color:#666;font-size:14px;text-align:center;max-width:260px;line-height:1.5}' +
              'button{margin-top:8px;padding:12px 28px;background:#8B1A2F;color:#fff;' +
              'border:none;border-radius:50px;font-size:15px;font-weight:600;cursor:pointer}' +
              '</style></head><body>' +
              '<div class="icon"><svg width="36" height="36" viewBox="0 0 58 58" fill="none">' +
              '<rect x="6" y="6" width="20" height="20" rx="5" fill="white"/>' +
              '<rect x="32" y="6" width="20" height="20" rx="5" fill="white"/>' +
              '<rect x="6" y="32" width="20" height="20" rx="5" fill="white"/>' +
              '<rect x="32" y="32" width="20" height="20" rx="5" fill="white"/>' +
              '</svg></div>' +
              '<h1>DASHWEY</h1>' +
              '<p>Sin conexión — conecta a internet y vuelve a intentarlo</p>' +
              '<button onclick="location.reload()">Reintentar</button>' +
              '</body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
        })
    );
    return;
  }

  /* Firebase CDN: network-first sin cachear */
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('firebase.com')) {
    e.respondWith(
      fetch(new Request(e.request, { cache: 'no-store' })).catch(() => caches.match(e.request))
    );
    return;
  }

  /* Assets estáticos (iconos, splash images, etc.): cache-first con fallback a red */
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
