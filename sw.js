/* ═══════════════════════════════════════════════════════════════════
   Dashwey Service Worker
   CACHE_NAME se actualiza junto con _APP_VERSION en cada deploy.

   ESTRATEGIA DE CACHE v1.0.3 (v1.3.1436 BUG-OFFLINE):
   - HTML principal: NETWORK-FIRST con fallback a cache offline.
     · Con red → descarga fresco + actualiza cache para offline.
     · Sin red → sirve versión cacheada (incluido fallback scope root).
   - version.json / version.txt: siempre red, sin cache (no-store).
   - Assets estáticos (iconos, splash): cache-first con fallback a red.
   - Firebase CDN: STALE-WHILE-REVALIDATE (antes era no-store, rompía offline).
   - Pre-cache en install: Firebase SDKs (best-effort) para arranque offline.
   - Al install: skipWaiting inmediato + limpieza agresiva de caches antiguas.
   - Al activate: claim + notificar SW_UPDATED a clientes.
   - skipWaiting: inmediato siempre (manual y automático).
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'dashwey-v1-3-1827';
const HTML_URL    = 'index.html';

/* v1.3.1436 BUG-OFFLINE FIX — Lote D
   Pre-cache crítico para arranque offline:
   - scope root '/Dashwey-/' (start_url del manifest, sin esto PWA fallaba al
     arrancar sin red porque solo estaba cacheado /Dashwey-/index.html)
   - Firebase SDKs (gstatic) — sin esto los import() de línea 10091 fallan offline
     y la app rompe en arranque (síntoma: pantalla "Sin conexión" persistente).
   addAll() es atómico: si UNA URL falla, ninguna se cachea. Por eso usamos
   add() individual con catch para no bloquear el install si gstatic está caído. */
const PRECACHE_URLS = [
  /* B-7: index.html no se pre-cachea — fetch handler lo cachea tras primer fetch exitoso */
  /* version.json se sirve siempre de red — no pre-cachear */
];
const FIREBASE_SDK_URLS = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js',
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
      .then(c => {
        /* v1.3.1436 BUG-OFFLINE FIX — Lote D
           Pre-cache best-effort: si una URL falla (sin red en install),
           no rompemos toda la instalación. fetch handler las cacheará luego. */
        const fbPromises = FIREBASE_SDK_URLS.map(url => {
          return fetch(url, { mode: 'cors' })
            .then(res => {
              if (res && (res.status === 200 || res.type === 'opaque')) {
                return c.put(url, res.clone());
              }
            })
            .catch(() => { /* sin red en install: ignorar, fetch handler lo cubrirá */ });
        });
        return Promise.all([
          c.addAll(PRECACHE_URLS).catch(() => {}),
          ...fbPromises
        ]);
      })
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
          /* v1.3.1436 BUG-OFFLINE FIX — Lote D
             Sin red: servir desde cache. Antes el fallback solo intentaba
             match exacto de la URL pedida. Si el usuario abría PWA con
             '/Dashwey-/' (start_url manifest, sin index.html), no había
             match en cache (solo estaba '/Dashwey-/index.html') → caía a la
             página minimal "Sin conexión" aunque el HTML SÍ estaba cacheado.
             Ahora: 1) intentar match exacto; 2) si falla, intentar
             '/Dashwey-/index.html' como fallback universal. */
          return caches.match(e.request).then(cached => {
            if (cached) return cached;
            return caches.match('/Dashwey-/index.html').then(idxCached => {
              if (idxCached) return idxCached;
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
          });
        })
    );
    return;
  }

  /* v1.3.1480 BUG-MEM-01 FIX — fetch handler selectivo
     ─────────────────────────────────────────────────────────────────
     Antes (v1.3.1479 y anteriores): la rama de googleapis.com cacheaba
     TODAS las llamadas a *.googleapis.com con stale-while-revalidate,
     incluyendo Firestore Listen (URLs con timestamp único cada llamada),
     Identity Toolkit (auth), Secure Token (refresh). Resultado: el cache
     SW crecía sin freno (58.5 MB acumulados en una sesión típica) →
     memoria heap inflada (Response objects retenidos) → boot lento y
     lag generalizado en producción.

     Ahora: SOLO se cachean Firebase SDKs estáticos (versión hardcoded
     10.12.2 desde gstatic.com), que son inmutables. Cualquier otra URL
     hacia googleapis.com / cloudfunctions.net / *.run.app pasa directo
     a fetch sin tocar el cache.

     Patrones SIEMPRE network-only (nunca cache):
     - firestore.googleapis.com (Firestore Listen + writes)
     - identitytoolkit.googleapis.com (auth signIn)
     - securetoken.googleapis.com (token refresh)
     - cloudfunctions.net (Loyverse proxy)
     - run.app (Cloud Run)
     - any URL with query params (?...) — heurística para APIs dinámicas
  */
  const _isNeverCacheUrl = (u) => {
    const h = u.hostname;
    if (h.includes('firestore.googleapis.com')) return true;
    if (h.includes('identitytoolkit.googleapis.com')) return true;
    if (h.includes('securetoken.googleapis.com')) return true;
    if (h.includes('firebaseinstallations.googleapis.com')) return true;
    if (h.includes('fcm.googleapis.com')) return true;
    if (h.includes('fcmregistrations.googleapis.com')) return true;
    if (h.includes('cloudfunctions.net')) return true;
    if (h.endsWith('.run.app')) return true;
    /* Heurística: cualquier googleapis.com NO-gstatic con query string
       es API dinámica (Firestore, RTDB, etc.). gstatic.com sin query
       son SDKs cacheables. */
    if (h.includes('googleapis.com') && u.search && u.search.length > 0) return true;
    return false;
  };

  if (_isNeverCacheUrl(url)) {
    /* Network-only sin cache. Si falla, propagar error al cliente. */
    e.respondWith(fetch(e.request));
    return;
  }

  /* Firebase SDKs estáticos (gstatic.com) + Firebase app hosting:
     stale-while-revalidate (versión hardcoded, staleness aceptable).
     v1.3.1436 BUG-OFFLINE FIX — Lote D: si cache vacío, esperar red.
     v1.3.1480: scope reducido a gstatic.com + firebaseapp.com + firebase.com
     (NO googleapis.com — ese ya quedó atrapado por _isNeverCacheUrl arriba). */
  if (url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('firebase.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request)
          .then(res => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              const cloned = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(e.request, cloned)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached); /* sin red: caer al cache (puede ser undefined) */
        /* Si hay cache → servir inmediato (rápido).
           Si no hay cache → esperar red (primer fetch). */
        return cached || fetchPromise;
      })
    );
    return;
  }

  /* Assets estáticos del propio dominio (iconos, splash images): cache-first
     v1.3.1480 BUG-MEM-01 FIX — guard contra cross-origin no contemplado.
     Antes: cualquier fetch que no matcheara las ramas anteriores se cacheaba.
     Esto capturaba accidentalmente subdominios de Google y otros, contribuyendo
     al crecimiento descontrolado del cache.
     Ahora: solo se cachean recursos same-origin (el propio dominio del PWA).
     Cross-origin no contemplado → network-only, sin tocar cache.
     NOTA: same-origin con query string SÍ se cachea, porque son assets
     versionados (ej. icon-192.png?v=9.5.74, manifest.json?v=v1.3.893-dev). */
  const _scope = self.registration.scope || self.location.origin + '/';
  const _scopeOrigin = new URL(_scope).origin;
  const _isSameOrigin = (url.origin === _scopeOrigin);

  if (!_isSameOrigin) {
    /* Cross-origin no contemplado en ramas anteriores → network-only.
       Previene crecimiento del cache con URLs externas no esperadas. */
    e.respondWith(fetch(e.request).catch(() => Response.error()));
    return;
  }

  /* Assets estáticos same-origin: cache-first con fallback a red */
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
