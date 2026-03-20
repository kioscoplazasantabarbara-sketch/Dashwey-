/* Dashwey Service Worker v9.5.25
 * Handles: cache, updates, push notifications (background + foreground),
 * notification click → deep-link to module/card.
 */

const CACHE_NAME   = 'dashwey-v9-5-25';
const HTML_URL     = 'Dashwey_v82.html';
const VERSION_URL  = 'version.txt';

// ── Install: pre-cache HTML + version ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll([HTML_URL, VERSION_URL]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches anteriores ───────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Messages desde el cliente ──────────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;

  // skipWaiting: forzar activación inmediata
  if (e.data.action === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  // SHOW_NOTIFICATION: mostrar notificación local desde el cliente
  // (usado por NotifEngine cuando el SW está activo)
  if (e.data.action === 'SHOW_NOTIFICATION') {
    const { title, opts } = e.data;
    if (!title) return;
    e.waitUntil(
      self.registration.showNotification(title, {
        icon:    '/icon-192.png',
        badge:   '/icon-192.png',
        vibrate: [100, 50, 100],
        ...opts,
      })
    );
    return;
  }
});

// ── Push: recibir mensajes push de FCM (server-side) ──────────────
// Payload esperado: { title, body, data: { action, card, url } }
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch(_) { payload = { title: 'Dashwey', body: e.data.text() }; }

  const title = payload.title || 'Dashwey';
  const opts  = {
    body:     payload.body   || '',
    icon:     payload.icon   || '/icon-192.png',
    badge:    '/icon-192.png',
    tag:      payload.tag    || 'dashwey-push',
    renotify: true,
    vibrate:  [100, 50, 100],
    data:     payload.data   || {},
  };

  e.waitUntil(self.registration.showNotification(title, opts));
});

// ── Notification click: abrir app en el módulo correcto ───────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data   = e.notification.data || {};
  const action = data.action || '';
  const card   = data.card   || '';

  // Construir URL con deep-link params
  let targetUrl = self.registration.scope;
  const params  = new URLSearchParams();
  if (action) params.set('action', action);
  if (card)   params.set('card',   card);
  if (params.toString()) targetUrl += '?' + params.toString();

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Si hay una ventana abierta, enfocarla y enviarle el deep-link
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.postMessage({ action: 'DEEP_LINK', deepAction: action, card });
            return client.focus();
          }
        }
        // Si no hay ventana, abrir una nueva
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});

// ── Fetch: cache-first para assets, network-first para HTML ───────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // version.txt: siempre de red (no cachear)
  if (url.pathname.endsWith(VERSION_URL)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML principal: network-first, cache de fallback
  if (url.pathname.endsWith(HTML_URL) || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res?.status === 200) {
            const c = res.clone();
            caches.open(CACHE_NAME).then(ca => ca.put(e.request, c));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Resto: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res?.status === 200 && res.type !== 'opaque') {
          const c = res.clone();
          caches.open(CACHE_NAME).then(ca => ca.put(e.request, c));
        }
        return res;
      });
    })
  );
});
