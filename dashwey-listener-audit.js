/**
 * DASHWEY — Auditoría de Listener Leaks: TPV y Almacén
 * ═══════════════════════════════════════════════════════════════════════
 * Versión auditada: v1.3.296-dev
 * Fecha: 2026-03-31
 *
 * METODOLOGÍA:
 * 1. Localizar todos los addEventListener en TPV (L21721-22750) y ALM (L23133-28274)
 * 2. Clasificar por tipo de contenedor: STATIC (getElementById) vs EPHEMERAL (createElement)
 * 3. Verificar guards contra re-registro (_lpDelegated, _swipeInit, _sacListening)
 * 4. Verificar cleanup (removeEventListener, once:true, GC por ov.remove())
 * 5. Determinar si el leak es real (crece en memoria con el uso) o teórico (GC lo resuelve)
 *
 * RESULTADO EJECUTIVO:
 * ✅ NO se encontraron leaks reales en TPV ni Almacén
 * ✅ Todos los listeners en contenedores estáticos tienen guards contra re-registro
 * ✅ Todos los listeners en nodos efímeros se limpian via GC cuando el nodo se elimina
 * ✅ Los únicos listeners en document/window con riesgo tienen removeEventListener simétrico
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

/* ─────────────────────────────────────────────────────────────────────
 * MÓDULO TPV (L21721-L22750)
 * ──────────────────────────────────────────────────────────────────── */

/**
 * ✅ PUNTO 1: Hot Grid — event delegation (L21806-L21836)
 *
 * ANTES (v1.3.295): grid.querySelectorAll('.tpv-hot-btn').forEach(btn => {
 *   btn.addEventListener('touchstart', ...)   // 3 listeners × N botones por render
 *   btn.addEventListener('touchmove', ...)
 *   btn.addEventListener('touchend', ...)
 * })
 *
 * DESPUÉS (v1.3.296): 1 listener en el contenedor #tpv-hot-grid
 *
 * ESTADO ACTUAL:
 */
const _hotGridDelegation_AUDIT = `
// ✅ CORRECTO — Ya implementado en v1.3.296
// grid = getElementById('tpv-hot-grid') → STATIC
// Guard: if (!grid._lpDelegated) { grid._lpDelegated = true; ... }
// Resultado: 1 listener total, nunca re-registrado
`;

/**
 * ✅ PUNTO 2: Categorías tablet — event delegation (L21854-L21871)
 *
 * ANTES (v1.3.295): row.querySelectorAll('.tpv-cat-chip').forEach(btn => {
 *   btn.addEventListener(...)   // 3 listeners × N chips
 * })
 *
 * DESPUÉS (v1.3.296): 1 listener en el contenedor #tpv-cats-row
 *
 * ESTADO ACTUAL:
 */
const _catsDelegation_AUDIT = `
// ✅ CORRECTO — Ya implementado en v1.3.296
// row = getElementById('tpv-cats-row') → STATIC
// Guard: if (!row._lpDelegated) { row._lpDelegated = true; ... }
// Resultado: 1 listener total, nunca re-registrado
`;

/**
 * ✅ PUNTO 3: Lista productos — event delegation (L21879-L21907)
 *
 * ANTES (v1.3.295): prods.forEach(p => {
 *   (function(pid, el) {
 *     el.addEventListener('touchstart', ...) // 3 listeners × N productos por render
 *     el.addEventListener('touchmove', ...)
 *     el.addEventListener('touchend', ...)
 *   })(p.id, div)
 * })
 *
 * DESPUÉS (v1.3.296): 1 listener en el contenedor #tpv-prod-list
 *
 * ESTADO ACTUAL:
 */
const _prodsDelegation_AUDIT = `
// ✅ CORRECTO — Ya implementado en v1.3.296
// list = getElementById('tpv-prod-list') → STATIC
// Guard: if (!list._lpDelegated) { list._lpDelegated = true; ... }
// Usa data-pid en cada div para identificar el producto en el handler delegado
// Resultado: 1 listener total, nunca re-registrado
`;

/**
 * ✅ PUNTO 4: Dock swipe — _initDockSwipe (L22176-L22220)
 *
 * ESTADO:
 */
const _dockSwipe_AUDIT = `
// ✅ CORRECTO — Guard existente desde antes de v1.3.296
// list = getElementById('tpv-dock-items') → STATIC
// Guard: if (!list || list._swipeInit) return; list._swipeInit = true;
// Resultado: 3 listeners registrados exactamente 1 vez en toda la vida del módulo
//
// NOTA SOBRE row.addEventListener('transitionend', ...) en L22205:
// row es el nodo activo del swipe, se pasa { once: true } implícitamente:
//   row.addEventListener('transitionend', () => { ... }, { once: true })
// → listener se autoeliminina al dispararse. Sin leak.
`;

/**
 * ✅ PUNTO 5: Context menu TPV — document listeners (L22701-L22702)
 *
 * ESTADO:
 */
const _ctxMenu_AUDIT = `
// ✅ CORRECTO — Ambos con { once: true }
// document.addEventListener('touchstart', _closeCtx, { capture: true, passive: true, once: true })
// document.addEventListener('click', _closeCtx, { capture: true, once: true })
// → Se autoeliminan al primer toque/click. Sin leak.
`;

/**
 * ✅ PUNTO 6: Context menu buttons (L22683-L22684)
 *
 * ESTADO:
 */
const _ctxMenuBtns_AUDIT = `
// ✅ CORRECTO — btn es un nodo createElement (EPHEMERAL)
// Los botones del menú contextual se crean dinámicamente y se eliminan
// cuando el ctx menu se cierra (ctx.remove()). El GC limpia sus listeners.
`;

/* ─────────────────────────────────────────────────────────────────────
 * MÓDULO ALM (L23133-L28274)
 * ──────────────────────────────────────────────────────────────────── */

/**
 * ✅ PUNTO 7: Botones de acción ALM (L23504-L23506, L23718, L24372)
 *
 * ESTADO:
 */
const _almActionBtns_AUDIT = `
// ✅ CORRECTO — btn es createElement (EPHEMERAL) en todos los casos
// L23504-23506: botones de acción de la barra de artículo → parte del innerHTML de un overlay
// L23718: botón delete con { once: true }
// L24372: botón borrar proveedor con { once: true }
// Cuando los overlays/sheets se cierran, los nodos se eliminan y el GC hace el resto.
`;

/**
 * ✅ PUNTO 8: ALM view track — transitionend (L23875, L23910)
 *
 * ESTADO:
 */
const _almTrack_AUDIT = `
// ✅ CORRECTO — Pattern self-removing con named function
// track = getElementById('alm-view-track') → STATIC
//
// Pattern usado:
//   track.addEventListener('transitionend', function h() {
//     track.removeEventListener('transitionend', h);  ← cleanup inmediato
//     // ...
//   });
//
// Cada llamada añade 1 listener que se elimina al dispararse la primera vez.
// Tiene además un setTimeout(400ms) de fallback por si transitionend no llega
// (conocido bug en Android WebView). El fallback llama removeEventListener también.
// Sin leak.
`;

/**
 * ✅ PUNTO 9: CDD dropdown — document mousedown (L23769)
 *
 * ESTADO:
 */
const _cddMousedown_AUDIT = `
// ✅ NO ES LEAK — Se ejecuta una sola vez al inicializar el módulo ALM
//
// document.addEventListener('mousedown', e => { ... }, true)
//
// Este listener se registra UNA SOLA VEZ cuando el IIFE de alm se ejecuta
// (al arrancar la app). No está dentro de ninguna función que se llame repetidamente.
// Es un listener permanente de módulo — equivalente a los de nav o State.
// Sin leak.
`;

/**
 * ✅ PUNTO 10: SAC — autocomplete dropdown (L25300-L25317)
 *
 * ESTADO:
 */
const _sacGlobals_AUDIT = `
// ✅ CORRECTO — Patrón attach/detach simétrico con guard
//
// _sacAttachGlobals():
//   if (_sacListening) return;  ← guard contra re-registro
//   _sacListening = true;
//   document.addEventListener('pointerdown', _sacHandleOutside, ...)
//   document.addEventListener('keydown', _sacHandleEsc)
//   fs.addEventListener('scroll', _sacHandleScroll, ...)
//   visualViewport.addEventListener('resize', _sacHandleVV, ...)
//
// _sacDetachGlobals():
//   if (!_sacListening) return;
//   _sacListening = false;
//   document.removeEventListener('pointerdown', _sacHandleOutside)  ← limpieza simétrica
//   document.removeEventListener('keydown', _sacHandleEsc)
//   fs.removeEventListener('scroll', _sacHandleScroll)
//   visualViewport.removeEventListener('resize', _sacHandleVV)
//
// _sacDetachGlobals() se llama en _sacCloseAll() → llamado al cerrar el dropdown,
// al cambiar de tab (goTab), al cerrar el sheet fs-overlay.
// Sin leak.
`;

/**
 * ✅ PUNTO 11: Animación fly-to-cart ALM (L26185)
 *
 * ESTADO:
 */
const _flyToCart_AUDIT = `
// ✅ CORRECTO — { once: true }
//
// destEl.addEventListener('animationend', () => {
//   destEl.classList.remove('alm-cart-bump');
// }, { once: true });
//
// destEl es getElementById('alm-hdr-cart-badge') → STATIC (siempre en DOM)
// El { once: true } garantiza que el listener se elimina al dispararse.
// Si la animación no dispara (por cualquier motivo), no hay leak adicional
// porque el listener simplemente queda inactivo sobre un nodo que no cambia.
`;

/**
 * ✅ PUNTO 12: Center overlay click ALM (L26948, L27515, L27741)
 *
 * ESTADO:
 */
const _almOverlayClick_AUDIT = `
// ✅ CORRECTO — ov es createElement (EPHEMERAL), se elimina con ov.remove()
//
// var ov = document.createElement('div');
// ov.addEventListener('click', function(e) { if (e.target === ov) _closeAlmOverlay(); });
// document.body.appendChild(ov);
// ...
// _closeAlmOverlay(): ov.remove() ← elimina el nodo + todos sus listeners
//
// La función _closeAlmOverlay() llama ov.remove() en un setTimeout(200ms) para
// que la transición CSS de cierre complete. Una vez removido, el GC libera
// el nodo y todos los listeners adjuntos.
// Sin leak.
`;

/**
 * ✅ PUNTO 13: _truckAttachSwipe — swipe en filas de pedidos (L27765-L27806)
 *
 * ESTADO:
 */
const _truckSwipe_AUDIT = `
// ✅ NO ES LEAK — Los row nodes son hijos del ov que se elimina completamente
//
// _truckAttachSwipe(ov):
//   container.querySelectorAll('[data-order-id]').forEach(function(row) {
//     row.addEventListener('touchstart', ...)  // ←── estos 3 listeners
//     row.addEventListener('touchmove', ...)
//     row.addEventListener('touchend', ...)
//   });
//
// Los [data-order-id] son nodos dentro de ov.innerHTML. Cuando el overlay se cierra:
//   _closeAlmOverlay() → ov.remove() → ov y TODOS sus descendientes (incluyendo los
//   row nodes con sus 3 listeners cada uno) son eliminados del DOM y el GC los libera.
//
// CONDICIÓN NECESARIA: que ov.remove() siempre se ejecute.
// _closeAlmOverlay() tiene un guard: if (!ov.parentNode) return;
// y openPendingOrders() hace: existing.remove() antes de crear el nuevo ov.
// Las dos condiciones se cumplen. Sin leak.
//
// NOTA: Si en el futuro se cambia la arquitectura a un overlay persistente
// (sin ov.remove()), ENTONCES habría que convertir _truckAttachSwipe a event
// delegation en el container. Documentado aquí como punto de atención futura.
`;

/* ─────────────────────────────────────────────────────────────────────
 * TABLA RESUMEN — PUNTOS DE AUDITORÍA
 * ──────────────────────────────────────────────────────────────────── */

/**
 * TABLA DE PUNTOS AUDITADOS
 *
 * #  | Sitio                              | Línea | Tipo             | Estado     | Mecanismo
 * ---|------------------------------------+-------+------------------+------------+-----------------------
 *  1 | TPV hot grid long press            | 21806 | STATIC delegated | ✅ LIMPIO  | _lpDelegated guard
 *  2 | TPV categorías tablet long press   | 21854 | STATIC delegated | ✅ LIMPIO  | _lpDelegated guard
 *  3 | TPV lista productos long press     | 21879 | STATIC delegated | ✅ LIMPIO  | _lpDelegated guard
 *  4 | TPV dock swipe (start/move/end)    | 22176 | STATIC guarded   | ✅ LIMPIO  | _swipeInit guard
 *  5 | TPV dock row transitionend         | 22205 | DYNAMIC          | ✅ LIMPIO  | { once: true }
 *  6 | TPV ctx menu document listeners    | 22701 | DOC/WIN          | ✅ LIMPIO  | { once: true }
 *  7 | TPV ctx menu buttons               | 22683 | EPHEMERAL        | ✅ LIMPIO  | GC via ctx.remove()
 *  8 | ALM action bar buttons             | 23504 | EPHEMERAL        | ✅ LIMPIO  | GC via overlay.remove()
 *  9 | ALM alm-view-track transitionend   | 23875 | STATIC           | ✅ LIMPIO  | removeEventListener(h)
 * 10 | ALM alm-view-track transitionend   | 23910 | STATIC           | ✅ LIMPIO  | removeEventListener(h)
 * 11 | ALM CDD dropdown mousedown         | 23769 | DOC/WIN          | ✅ LIMPIO  | init único de módulo
 * 12 | ALM SAC autocomplete globals       | 25300 | DOC/WIN          | ✅ LIMPIO  | _sacDetachGlobals()
 * 13 | ALM fly-to-cart animationend       | 26185 | STATIC           | ✅ LIMPIO  | { once: true }
 * 14 | ALM center overlay click           | 26948 | EPHEMERAL        | ✅ LIMPIO  | GC via ov.remove()
 * 15 | ALM center overlay 2               | 27515 | EPHEMERAL        | ✅ LIMPIO  | GC via ov.remove()
 * 16 | ALM center overlay 3               | 27741 | EPHEMERAL        | ✅ LIMPIO  | GC via ov.remove()
 * 17 | ALM _truckAttachSwipe rows         | 27765 | EPHEMERAL (child)| ✅ LIMPIO  | GC via ov.remove()
 */

/* ─────────────────────────────────────────────────────────────────────
 * PUNTOS DE ATENCIÓN FUTURA (no leaks actuales, pero frágiles)
 * ──────────────────────────────────────────────────────────────────── */

/**
 * ⚠️  ATENCIÓN FUTURA 1: _truckAttachSwipe
 *
 * Si en el futuro openPendingOrders() cambia a un overlay persistente (no remove())
 * para mejorar la performance, _truckAttachSwipe() DEBE convertirse a event delegation:
 *
 * MIGRACIÓN RECOMENDADA (solo si el overlay se hace persistente):
 */
function _truckAttachSwipe_FUTURE_SAFE(container) {
  if (!container || container._swipeDelegated) return;
  container._swipeDelegated = true;

  var x0 = 0, dx = 0, activeRow = null;

  // 1 listener en el container en lugar de 3×N en las filas
  container.addEventListener('touchstart', function(e) {
    var row = e.target.closest('[data-order-id]');
    if (!row) return;
    activeRow = row;
    x0 = e.touches[0].clientX;
    dx = 0;
    row.style.transition = 'none';
  }, { passive: true });

  container.addEventListener('touchmove', function(e) {
    if (!activeRow) return;
    dx = e.touches[0].clientX - x0;
    if (Math.abs(dx) > 8) {
      activeRow.style.transform = 'translateX(' + dx + 'px)';
      activeRow.style.opacity   = String(Math.max(0.3, 1 - Math.abs(dx) / 140));
    }
  }, { passive: true });

  container.addEventListener('touchend', function() {
    if (!activeRow) return;
    var row = activeRow;
    activeRow = null;
    row.style.transition = '';
    if (Math.abs(dx) > 80) {
      row.style.transform = 'translateX(' + (dx > 0 ? '130%' : '-130%') + ')';
      row.style.opacity   = '0';
      var oid    = row.dataset.orderId;
      var provId = row.dataset.provId;
      setTimeout(function() {
        try {
          if (provId) {
            var orders = (State.get.pendingOrders() || []).filter(function(o) {
              return o.provId === provId && o.status === 'pending';
            });
            orders.forEach(function(o) {
              try { App.alm._eliminarPedidoProgramado(o.id); } catch(_) {}
            });
          } else {
            App.alm._eliminarPedidoProgramado(oid);
          }
        } catch(_) {}
        if (row.parentNode) row.style.display = 'none';
      }, 200);
    } else {
      row.style.transform = '';
      row.style.opacity   = '';
    }
    dx = 0;
  });
}

/**
 * ⚠️  ATENCIÓN FUTURA 2: innerHTML masivo en ALM
 *
 * ALM tiene 37 innerHTML = assignments (vs 16 en TPV).
 * Los de mayor riesgo son los que reemplazan listas con listeners:
 *   - sugEl.innerHTML (L26301, L26329) — resultados de búsqueda inline
 *   - listEl.innerHTML (L23971, L24716) — listas de artículos/proveedores
 *
 * Todos son actualmente seguros porque:
 *   a) Los items generados usan onclick inline (string), no addEventListener
 *   b) Los containers son estáticos (getElementById) → el reemplazo de innerHTML
 *      elimina los nodos anteriores y el GC limpia cualquier listener adjunto
 *
 * REGLA A SEGUIR: si en el futuro se añaden addEventListener a items dentro
 * de estas listas, convertir a event delegation en el container estático.
 */

/**
 * ⚠️  ATENCIÓN FUTURA 3: document.addEventListener 'mousedown' en ALM CDD
 *
 * El listener de CDD (Custom Dropdown) en L23769 está en el nivel de módulo:
 *   document.addEventListener('mousedown', e => { ... }, true)
 *
 * Esto es intencional (se registra 1 vez) pero si alm se reinicializa
 * (hipotético) se registraría de nuevo. Actualmente imposible porque el
 * IIFE de alm solo corre una vez. Si se modulariza en el futuro, proteger con:
 *
 *   if (!window._cddMousedownAttached) {
 *     window._cddMousedownAttached = true;
 *     document.addEventListener('mousedown', ...)
 *   }
 */

/* ─────────────────────────────────────────────────────────────────────
 * CONVENCIONES PARA NUEVOS LISTENERS — GUÍA RÁPIDA
 * ──────────────────────────────────────────────────────────────────── */

/**
 * REGLA 1: Container ESTÁTICO que se re-renderiza → event delegation + guard
 *
 * ❌ MAL:
 *   function render() {
 *     container.innerHTML = items.map(...).join('');
 *     container.querySelectorAll('.item').forEach(el => {
 *       el.addEventListener('touchstart', handler);  // leak si render() se llama N veces
 *     });
 *   }
 *
 * ✅ BIEN:
 *   function render() {
 *     container.innerHTML = items.map(...).join('');
 *     // los listeners están en el container, no en los items
 *   }
 *   function _initDelegation() {
 *     if (container._delegated) return;
 *     container._delegated = true;
 *     container.addEventListener('touchstart', e => {
 *       const item = e.target.closest('.item');
 *       if (!item) return;
 *       handler(item);
 *     }, { passive: true });
 *   }
 */

/**
 * REGLA 2: Nodo EFÍMERO (createElement) → libre, GC limpia al remove()
 *
 * ✅ CORRECTO:
 *   const modal = document.createElement('div');
 *   modal.addEventListener('click', handler);       // ok — ephemeral
 *   document.body.appendChild(modal);
 *   // al cerrar:
 *   modal.remove();                                  // → GC elimina modal + handler
 */

/**
 * REGLA 3: document / window → siempre con removeEventListener simétrico
 *
 * ✅ CORRECTO:
 *   function open() {
 *     if (_attached) return;    // guard
 *     _attached = true;
 *     document.addEventListener('keydown', _handler);
 *   }
 *   function close() {
 *     if (!_attached) return;
 *     _attached = false;
 *     document.removeEventListener('keydown', _handler);
 *   }
 *
 * ✅ ALTERNATIVA para listeners de un solo uso:
 *   document.addEventListener('click', handler, { once: true });
 */

/**
 * REGLA 4: Listener que dispara una sola vez → { once: true }
 *
 * ✅ CORRECTO:
 *   el.addEventListener('transitionend', cleanup, { once: true });
 *   el.addEventListener('animationend', cleanup, { once: true });
 */

/**
 * REGLA 5: Validar antes de añadir cualquier listener en una función de render
 *
 * Checklist:
 *   □ ¿El container es estático (getElementById)?
 *     → Usar event delegation + guard _delegated
 *   □ ¿El nodo es efímero (createElement)?
 *     → Libre. Confirmar que el nodo se elimina con .remove() en el close handler
 *   □ ¿Es document o window?
 *     → Siempre removeEventListener simétrico + guard booleano
 *   □ ¿Dispara una sola vez?
 *     → { once: true }
 */

// ─── FIN DE AUDITORÍA ────────────────────────────────────────────────
