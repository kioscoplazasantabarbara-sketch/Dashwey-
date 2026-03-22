/* ═══════════════════════════════════════════════════════════════════
   Dashwey Service Worker v9.5.75
   FIX DEFINITIVO DOBLE SPLASH

   CAUSA RAÍZ DEL DOBLE SPLASH:
   El SW anterior cacheaba el HTML (Dashwey_v82.html) después de cada
   descarga exitosa. Al abrir la PWA instalada, el SW viejo aún activo
   servía el HTML cacheado (con el splash viejo) INSTANTÁNEAMENTE.
   El nuevo SW se activaba después y la página se recargaba con el nuevo
   HTML → el usuario veía dos splashes (el viejo del cache + el nuevo).

   SOLUCIÓN v9.5.74 (sin cambios en estrategia — ver HTML para fixes):
   1. El HTML NUNCA se cachea — siempre viene de la red.
      Sin HTML en cache = sin posibilidad de servir versión vieja.
   2. En activate: se envía SW_RELOAD a todos los clientes para que
      recarguen UNA VEZ con el HTML correcto desde la red.
   3. Limpieza agresiva: eliminar TODAS las caches antiguas en install
      (no solo en activate) para mayor agresividad.

   ESTRATEGIA DE CACHE v9.5.75:
   - HTML principal: SIEMPRE network-only (NUNCA se cachea)
   - version.txt: siempre red, sin cache
   - Assets estáticos (iconos): cache-first con fallback
   - Firebase CDN: network-first sin cachear
   - Al install: eliminar caches antiguas YA (no esperar activate)
   - Al activate: reload de todos los clientes + claim
   - skipWaiting: inmediato siempre
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME   = 'dashwey-v9-5-75';
const HTML_URL     = 'Dashwey_v82.html';
const VERSION_URL  = 'version.txt';

/* Solo pre-cachear assets estáticos mínimos — NUNCA el HTML */
const PRECACHE_URLS = [
  /* version.txt se sirve siempre de red — no pre-cachear */
  /* HTML nunca se cachea — ver fetch handler */
];

/* ── Install ────────────────────────────────────────────────────────
   v9.5.75: skipWaiting inmediato + limpieza agresiva de caches viejas
   ya en install (no esperar a activate) para cubrir el caso donde
   el SW viejo sigue activo y sirve HTML antiguo. */
self.addEventListener('install', e => {
  self.skipWaiting(); /* Activación inmediata — no esperar navegación */
  e.waitUntil(
    /* Limpiar caches antiguas YA en install — máxima agresividad */
    caches.keys()
      .then(keys => {
        const toDelete = keys.filter(k => k !== CACHE_NAME);
        return Promise.all(toDelete.map(k => {
          console.log('[SW v9.5.75] Install: eliminando cache antigua:', k);
          return caches.delete(k);
        }));
      })
      .then(() => caches.open(CACHE_NAME))
      .then(c => c.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

/* ── Activate ───────────────────────────────────────────────────────
   v9.5.75: claim + reload de TODOS los clientes.
   El reload fuerza que los clientes descarguen el HTML fresco de la red
   (nunca del cache, ya que el HTML no se cachea en v9.5.73).
   Guard: solo recargar si el cliente está en la URL de la app. */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const toDelete = keys.filter(k => k !== CACHE_NAME);
        return Promise.all(toDelete.map(k => {
          console.log('[SW v9.5.75] Activate: eliminando cache antigua:', k);
          return caches.delete(k);
        }));
      })
      .then(() => self.clients.claim())
      .then(() => {
        /* Notificar a todos los clientes: nuevo SW activo.
           El cliente HTML escucha SW_UPDATED y recarga UNA VEZ
           (con guard sessionStorage para evitar bucle). */
        return self.clients.matchAll({ type: 'window' })
          .then(clients => {
            clients.forEach(client => {
              client.postMessage({
                action: 'SW_UPDATED',
                version: '9.5.75'
              });
            });
          });
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
   v9.5.75 ESTRATEGIA DE CACHE:

   HTML principal → NETWORK-ONLY (nunca se cachea)
   ─────────────────────────────────────────────────────────────────
   CAMBIO CRÍTICO v9.5.74 (vigente): el HTML YA NO SE GUARDA en cache.
   Razón: si el HTML se guarda en cache, el SW siguiente puede servir
   el HTML viejo (con splash viejo) durante el gap entre install y
   activate. Al no cachear HTML, siempre viene de la red → siempre
   el HTML más reciente → siempre el splash correcto → cero duplicados.
   Offline sin red: mostrar página de error en lugar de HTML viejo.
   ────────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* version.txt: siempre de red, sin cache */
  if (url.pathname.endsWith(VERSION_URL)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  /* HTML principal: NETWORK-ONLY — NUNCA se cachea en v9.5.74.
     Offline: respuesta de error legible en lugar de HTML viejo. */
  if (url.pathname.endsWith(HTML_URL) || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => {
          /* Sin red: intentar cache como último recurso offline */
          return caches.match(e.request).then(cached => {
            if (cached) return cached;
            /* Sin cache tampoco: respuesta mínima de offline */
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dashwey — Sin conexión</title>' +
              '<style>body{font-family:Helvetica,Arial,sans-serif;background:#F7F2F2;display:flex;' +
              'align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column}' +
              'h1{font-size:24px;font-weight:900;letter-spacing:4px;color:#8B1A2F}' +
              'p{color:#666;font-size:14px;margin-top:8px}</style></head>' +
              '<body><h1>DASHWEY</h1><p>Sin conexión — conecta a internet y vuelve a intentarlo</p></body></html>',
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
      url.hostname.includes('firebaseapp.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  /* Assets estáticos (iconos, etc.): cache-first con fallback a red */
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
