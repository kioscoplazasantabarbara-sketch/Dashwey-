/* ═══════════════════════════════════════════════════════════════
   Dashwey Service Worker — PWA Architect Edition
   Versión dinámica: leída de version.txt en runtime (SSOT)
   Estrategia:
     HTML        → network-first (NUNCA sirve HTML antiguo)
     version.txt → network-only  (siempre fresco)
     assets      → cache-first   (inmutables por hash)
   skipWaiting: SOLO bajo petición explícita del cliente
   ═══════════════════════════════════════════════════════════════ */

const CACHE_PREFIX  = 'dashwey-';
const HTML_URL      = 'Dashwey_v82.html';
const VERSION_URL   = 'version.txt';

// CACHE_NAME dinámico: se resuelve al instalar leyendo version.txt
let CACHE_NAME = CACHE_PREFIX + 'current';

// ── Helpers ───────────────────────────────────────────────────────
function log(...args) {
  console.log('[SW]', ...args);
}

function getVersionUrl() {
  return self.registration.scope + VERSION_URL;
}

async function resolveVersion() {
  try {
    const res = await fetch(getVersionUrl(), { cache: 'no-store' });
    if (!res.ok) throw new Error('version.txt ' + res.status);
    const data = await res.json();
    const ver  = data.version || data.build || 'unknown';
    log('version.txt resolved →', ver);
    return ver;
  } catch (e) {
    log('resolveVersion failed:', e.message);
    return 'unknown';
  }
}

// ── INSTALL ───────────────────────────────────────────────────────
// Lee version.txt → establece CACHE_NAME dinámico → precachea HTML
self.addEventListener('install', e => {
  log('install event');
  e.waitUntil((async () => {
    const ver = await resolveVersion();
    CACHE_NAME = CACHE_PREFIX + ver;
    log('install: CACHE_NAME =', CACHE_NAME);
    const cache = await caches.open(CACHE_NAME);
    // Solo precachear HTML — assets se cachean on-demand
    try {
      await cache.add(new Request(HTML_URL, { cache: 'no-store' }));
      log('install: HTML precached OK');
    } catch (err) {
      log('install: HTML precache failed (offline?):', err.message);
    }
    // NO llamar skipWaiting aquí — el usuario decide cuándo activar
    log('install: done, waiting for activation signal');
  })());
});

// ── ACTIVATE ──────────────────────────────────────────────────────
// Limpia TODAS las caches que no sean la actual
self.addEventListener('activate', e => {
  log('activate event, CACHE_NAME =', CACHE_NAME);
  e.waitUntil((async () => {
    const keys = await caches.keys();
    log('activate: found caches:', keys);
    const toDelete = keys.filter(k => k !== CACHE_NAME);
    if (toDelete.length) {
      log('activate: deleting old caches:', toDelete);
      await Promise.all(toDelete.map(k => caches.delete(k)));
      log('activate: old caches deleted');
    }
    await self.clients.claim();
    log('activate: clients claimed');
  })());
});

// ── MESSAGE ───────────────────────────────────────────────────────
// skipWaiting SOLO bajo petición explícita (botón "Actualizar")
self.addEventListener('message', e => {
  if (e.data?.action === 'skipWaiting') {
    log('message: skipWaiting requested by client');
    self.skipWaiting();
  }
});

// ── FETCH ─────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // ── version.txt → network-only (NUNCA desde caché) ──
  if (url.pathname.endsWith(VERSION_URL)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(err => {
          log('fetch version.txt failed (offline):', err.message);
          return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
        })
    );
    return;
  }

  // ── HTML → network-first (NUNCA sirve HTML cacheado antiguo) ──
  if (url.pathname.endsWith(HTML_URL) || url.pathname.endsWith('/') || url.pathname === '') {
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request, { cache: 'no-store' });
        if (res.status === 200) {
          // Actualizar caché con la versión fresca
          const cache = await caches.open(CACHE_NAME);
          cache.put(e.request, res.clone());
          log('fetch HTML: network OK, cache updated');
        }
        return res;
      } catch (err) {
        log('fetch HTML: network failed, trying cache');
        const cached = await caches.match(e.request);
        if (cached) return cached;
        // Sin red y sin caché → respuesta de error controlada
        return new Response('<h1>Sin conexión</h1><p>Dashwey no está disponible offline en este momento.</p>',
          { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // ── Assets → cache-first, fetch-on-miss ──
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      if (res.status === 200 && res.type !== 'opaque') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(e.request, res.clone());
      }
      return res;
    } catch (err) {
      log('fetch asset failed:', url.pathname, err.message);
      return new Response('', { status: 503 });
    }
  })());
});
