# README_Dev.md — Dashwey Technical Reference

> **Versión de referencia:** `v1.3.296-dev`  
> **Archivo principal:** `index.html` — 31.862 líneas / 1.394 KB  
> **Entorno:** Android APK via Capacitor/WebView + GitHub Pages  
> **Última actualización:** 2026-03-31

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Distribución del archivo](#2-distribución-del-archivo)
3. [Script blocks — mapa de ubicaciones](#3-script-blocks--mapa-de-ubicaciones)
4. [IIFEs y módulos principales](#4-iifes-y-módulos-principales)
5. [State — fuente única de verdad](#5-state--fuente-única-de-verdad)
6. [FinEngine y KPI — motor financiero](#6-finengine-y-kpi--motor-financiero)
7. [Módulo TPV](#7-módulo-tpv)
8. [Módulo Dashboard (dash)](#8-módulo-dashboard-dash)
9. [Módulo Almacén (alm)](#9-módulo-almacén-alm)
10. [Módulo UI y Nav](#10-módulo-ui-y-nav)
11. [Funciones grandes (> 100 líneas)](#11-funciones-grandes--100-líneas)
12. [Sistema de eventos custom](#12-sistema-de-eventos-custom)
13. [CSS — jerarquía z-index y variables clave](#13-css--jerarquía-z-index-y-variables-clave)
14. [Patrones y convenciones](#14-patrones-y-convenciones)
15. [Qué NO tocar y por qué](#15-qué-no-tocar-y-por-qué)
16. [Riesgos conocidos](#16-riesgos-conocidos)
17. [Deploy y validación](#17-deploy-y-validación)
18. [Tests](#18-tests)

---

## 1. Arquitectura general

```
index.html (todo en un archivo)
├── CSS inline (~7.610 líneas)
├── HTML DOM (~1.343 líneas)
└── JS inline (~22.909 líneas)
    ├── Script block HEAD: Namespace + Proxy guard
    ├── Script block AUTH: Safe wrappers pre-App
    ├── Script block FIREBASE: Imports CDN + bridge
    ├── Script block I18N: ES/EN engine
    ├── Script block MAIN (20.070 líneas): App completa
    │   ├── const App = (() => { ... })()  ← TODO vive aquí
    │   │   ├── State
    │   │   ├── DashweyBus
    │   │   ├── KPI
    │   │   ├── FinEngine
    │   │   ├── Utils
    │   │   ├── ui
    │   │   ├── nav
    │   │   ├── dash
    │   │   ├── tpv
    │   │   ├── tpvQG
    │   │   └── alm
    │   └── window.App = App  ← OBLIGATORIO (const no va a window)
    ├── Script blocks externos: CheckModal, SwipeClose, PWA,
    │   SheetSwipe, BackGesture, AndroidBack, ThemeEngine,
    │   InitSync, Spotlight
    └── Script block TESTS: _DashweyTests (on-demand)
```

**Persistencia:**
- **Primaria:** `localStorage['dashwey_v3']` — síncrona, siempre disponible
- **Secundaria:** Firebase Firestore — async, debounced 800ms, offline-safe
- **Clave de merge:** `Object.assign(DEFAULTS_clone, localStorage_data)` — los arrays del usuario siempre ganan

---

## 2. Distribución del archivo

| Sección | Líneas aprox. |
|---|---|
| `<head>` + CSS global | L1–L7800 |
| CSS módulos (TPV, Alm, Dash) | L1500–L7340 |
| HTML DOM (estructura estática) | L7800–L9230 |
| Script MAIN (`const App`) | L9333–L29403 |
| Scripts auxiliares externos | L29403–L31760 |
| Test suite | L31763–L31859 |

---

## 3. Script blocks — mapa de ubicaciones

| Bloque | Líneas | Descripción |
|---|---|---|
| `NAMESPACE` | L18–L129 | `window.App` Proxy guard (pre-init), `_authTabSafe` |
| `AUTH SAFE` | L7894–L7948 | `_authTabSafe`, `_authErrorMsg` — wrappers ante crash de App |
| `FIREBASE` | L8900–L9230 | Import CDN, bridge `_DashweyFirebase`, auth, Firestore, FCM |
| `I18N` | L9232–L9331 | `window._DashweyI18n` — ES/EN, `t(key)`, `window.t` alias |
| **`MAIN APP`** | **L9333–L29403** | **`const App` — todo el negocio vive aquí** |
| `CHECK MODAL` | L29468–L29556 | Helpers de modal de comprobación de pedidos Almacén |
| `SWIPE CLOSE` | L29559–L29596 | Swipe-to-close del settings drawer |
| `PWA` | L29598–L29840 | Service Worker, install banner, update checker |
| `SHEET SWIPE` | L29858–L30036 | Swipe progresivo hacia abajo en fs-overlay / modales |
| `BACK GESTURE` | L30038–L30107 | Edge swipe universal (back) |
| `ANDROID BACK` | L30109–L30245 | Hardware back button + gesture Android |
| `THEME ENGINE` | L30247–L30378 | Día / Noche / Auto — `_DashweyTheme` |
| `INIT SYNC` | L30480–L31176 | `_doInitialSync`, `_syncAppState`, Firebase↔localStorage |
| `ORDER CHECK` | L31180–L31509 | `_doConfirm`, flujo comprobación pedidos, `_renderList` |
| `SPOTLIGHT` | L31511–L31754 | Almacén spotlight overlay — `_spotlightOpen/Close/Render` |
| `TESTS` | L31763–L31859 | `_DashweyTests` — suite unitaria on-demand |

---

## 4. IIFEs y módulos principales

Todos los módulos viven **dentro del IIFE de App** (L9399–L29220). Se acceden como `App.X` desde el exterior.

```
window.App = {
  State, KPI, FinEngine, Utils,
  ui, nav, dash, tpv, alm,
  canAccess, limpiarBD
}
```

| Módulo | IIFE start | `return{}` | Responsabilidad |
|---|---|---|---|
| `State` | L9426 | L9856 | SSOT — toda lectura/escritura de datos |
| `DashweyBus` | L9878 | — | Event bus interno `on/emit` |
| `KPI` | L10075 | L10442 | Filtros por periodo, datos para gráficos |
| `FinEngine` | L10478 | L10528 | Motor financiero — todos los cálculos monetarios |
| `Utils` | L10858 | L11136 | Helpers: `feur`, `showToast`, `triggerHaptic`, `esc` |
| `ui` | L11195 | L13212 | Sheets, modales, settings drawer, idioma, perfil |
| `nav` | L13228 | L13500 | `goTab`, swipe de tabs, `_cTab` |
| `dash` | L13537 | L13783 | Dashboard — renders de tarjetas, KPIs, períodos |
| `tpv` | L21721 | L22738 | Terminal de Venta — carrito, dock, cobro, tickets |
| `tpvQG` | L22751 | L23026 | Quick Grid personalizable del TPV (tablet) |
| `alm` | L23133 | L28500 | Almacén — catálogo, carrito, pedidos, stock |

**Wiring obligatorio (L29218–L29232):**
```js
// const no va a window en scripts clásicos — estas líneas son CRÍTICAS
window.App = App;
window.Utils = Utils;
window.State = State;
window.DashweyBus = DashweyBus;
```

---

## 5. State — fuente única de verdad

**L9426 | `const State = (() => { ... })()`**

### Campos de `_state` (localStorage key: `dashwey_v3`)

| Campo | Tipo | Descripción |
|---|---|---|
| `user` | Object | uid, role, email, activeContext, lastSyncAt |
| `syncStatus` | Object | mode, pendingWrites, lastError |
| `productos` | Array | Catálogo de artículos |
| `proveedores` | Array | Proveedores con días de pedido/entrega |
| `ventas` | Array | Historial de ventas TPV |
| `ticketsAbiertos` | Array | Tickets activos en TPV |
| `pendingOrders` | Array | Pedidos guardados pendientes de recepción |
| `historialPedidos` | Array | Pedidos ya recibidos (actualiza stock) |
| `ordenItems` | Array | Items del flujo de pedido Almacén |
| `mermas` | Array | Mermas registradas |
| `ingresosFin` | Array | Ingresos financieros manuales |
| `cuentas` | Array | Cuentas bancarias y caja |
| `gastosOp` | Array | Gastos operativos |
| `settings` | Object | toggles, notifPrefs, cierreHora, negocioId |
| `perfil` | Object | nombre, tipo, email, foto, idioma |
| `period` | Object | `{ type, label, offset }` |

### Flujo de persistencia

```
State.set.X() → _writeLocal() [síncrono] → _writeFirebase() [async, debounced 800ms]
                                         ↓ si offline
                                         → _pendingQueue[] → flush on 'online'
```

### ⚠️ Regla crítica — `save()` hash guard

`save()` compara un fingerprint JSON antes de escribir a Firebase para evitar writes duplicados. Los campos incluidos en el hash son:

```js
{ p: productos, v: proveedores, vt: ventas,
  c: cuentas, g: gastosOp, pf: perfil.nombre,
  po: pendingOrders, ig: ingresosFin }   // v1.3.294+
```

Si el hash no cambia → **no se escribe a Firebase**. Si añades un nuevo campo importante, añádelo al hash.

### Demo data

**`_DEMO_DEFAULTS`** (L9430) — separado de DEFAULTS desde v1.3.295. Solo activo en primera instalación (sin localStorage). `Object.assign(DEFAULTS_clone, raw)` sobreescribe los arrays demo con datos reales en arranques posteriores.

---

## 6. FinEngine y KPI — motor financiero

### FinEngine (L10478)

Único punto de cálculo financiero. **Nunca calcular dinero fuera de FinEngine.**

| Función | Descripción |
|---|---|
| `revenue(range)` | Ventas TPV + ingresosFin en rango |
| `costeVentas(range)` | COGS del período |
| `comprasPeriodo(range)` | Coste pedidos Almacén (con IVA dinámico) |
| `beneficioNeto(range)` | ingresos − COGS − gastos prorateados al rango |
| `margenBruto(range)` | % bruto — devuelve 0 si sin ventas |
| `pedidoCoste(ped)` | Coste pedido con IVA por item (`it.iva` o default 10%) |
| `ventaIngresos(v)` | Lee `v.total` → `items[]` → `pvp×qty` (por ese orden) |
| `snapshot(period)` | Objeto completo con TODAS las métricas |
| `deltaRevenue(period)` | Delta % vs período anterior del mismo tamaño |

**Schema de venta (v9.5.x):**
```js
{ id, fecha, metodo, total, ticketId, items: [{ prodId, qty, pvp, coste, margen }] }
```
`ventaIngresos()` prioriza `v.total` — no recalcula si ya existe.

### KPI (L10075)

Filtros de datos por período. Depende de `State` y `FinEngine`.

| Función | Descripción |
|---|---|
| `periodRange(period)` | `{ start, end }` — soporta today/week/month/year/custom |
| `ventasEnPeriodo(period)` | Ventas filtradas |
| `pedidosEnPeriodo(period)` | Pedidos filtrados |
| `getVentasChartData(period, mode)` | Datos de gráfico — usa `items[]` (no raíz) |
| `getChartData(period)` | Datos gráfico compras — usa `FinEngine.pedidoCoste` |
| `getBeneficioNeto(period)` | Beneficio con desglose |

---

## 7. Módulo TPV

**L21721 | `const tpv = (() => { ... })()`**

### Funciones públicas exportadas (L22738)

```js
{ render, addCart, chgQ, setcat, catsScroll, onSearch, clearSearch, toggleDock,
  _undoLast, openCobro, closeCobro, procesarPago,
  openTickets, closeTickets, nuevoTicket, activarTicket, borrarTicket,
  openManualSale, confirmManualSale, _invalidateCatsHash, setHotGridMax }
```

### Dirty-check hashes (rendimiento)

```js
let _hotGridHash = '';   // productos en hot grid + cantidades carrito
let _prodsHash   = '';   // lista completa de productos + filtros
let _catsHash    = '';   // categorías disponibles + activa
```
Invalidar con `_prodsHash = ''; _hotGridHash = '';` después de mutaciones al carrito o stock.

### Flujo de venta

```
addCart(id) → _cart[id].q++ → Utils.triggerHaptic('light')
           → _tapFeedback() → _updateDock() → _saveCurrentToTicket()

procesarPago(metodo) → State.set.addVenta(payload) → updateProd(stock--)
                    → Firebase async (retry 3x backoff 1s/2s)
                    → closeCobro() → render()
```

### Listeners — event delegation (v1.3.296+)

Los tres contenedores estáticos tienen **1 listener cada uno** con guard `_lpDelegated`:
- `#tpv-hot-grid` — long press en botones `.tpv-hot-btn`
- `#tpv-cats-row` — long press en chips `.tpv-cat-chip` (solo tablet)
- `#tpv-prod-list` — long press en items `.tpv-prod-item` (usa `data-pid`)

El dock (`#tpv-dock-items`) usa `_initDockSwipe()` con guard `list._swipeInit = true`.

### Quick Grid tablet (tpvQG — L22751)

Renderiza en `#tpv-qg-grid`. Long press → config de celda. Persiste en `localStorage['tpvQG_cells']`.

---

## 8. Módulo Dashboard (dash)

**L13537 | `const dash = (() => { ... })()`**

Renders de tarjetas snap. Cada tarjeta tiene su propio selector de período independiente.

### Funciones de render principales

| Función | Línea | Descripción |
|---|---|---|
| `render()` | L13541 | Render principal — llama a todos los sub-renders |
| `renderVentas(period)` | L13684 | Anillos + gráfico evolución ventas |
| `renderTopArticulos()` | — | Top artículos por ventas |
| `renderRendimiento()` | — | Card de rendimiento |
| `renderFlujoCaja()` | — | Card flujo de caja (usa FinEngine.snapshot) |
| `_snapRenderCard(id)` | L19815 | Snap card completa — 379 líneas |
| `_snapRenderChart(...)` | L19421 | Gráfico SVG inline — 207 líneas |
| `_snapBuildNarrative(...)` | L18368 | Texto de análisis IA — 261 líneas |

### Período activo

```js
State.get.period()           // período global
State.set.period(p)          // setter
KPI.periodRange(p)           // → { start: Date, end: Date }
```

Cada tarjeta puede tener período propio via `.dash-period-selector`.

---

## 9. Módulo Almacén (alm)

**L23133 | `const alm = (() => { ... })()`**

El módulo más complejo. 192 referencias a `App.alm` en el archivo.

### Estados del banner (dos estados exclusivos)

```
Estado 1: alm-banner-visible (sin alm-banner-pending)
          → "Creando Pedido" — carrito activo, botón Confirmar

Estado 2: alm-banner-visible + alm-banner-pending
          → "Pedidos Programados" — pedidos guardados, botón Comprobar
```

**⚠️ REGLA:** Nunca escribir `style.display` en `#alm-progress-banner`. Solo usar clases `alm-banner-visible` / `alm-banner-pending`. Ver L23789.

### Flujo de pedido

```
Añadir artículo → _ordenCarrito[id]++ → updateBadge()
Confirmar → _guardarComoOrdenPendiente() → State.set.addPendingOrder()
          → _ordenCarrito = {} → banner Estado 2
Comprobar → _abrirCheckModalPendiente() → ConfirmModal
          → _confirmarPedidoDesdeCarrito() → updateProd(stock+=)
          → State.set.removePendingOrder() → historialPedidos
```

### Carrito persistido

```js
localStorage['dashwey_carrito_v1']   // backup del carrito entre sesiones
```

Se restaura en `_almLoadInitialState()` (L28537+ aprox). Se limpia al confirmar.

### FAB y Accept button

- `#alm-fab` — siempre visible. Color cambia con estado del banner.
- `#alm-accept-fixed` — **siempre `display:none`** desde v1.3.153 (migrado a banner+FAB). El elemento existe para compat JS, nunca se muestra.

### TDZ — Variables declaradas antes de return{}

Almacén tiene vars que deben declararse **antes** de `return{}` en el IIFE para evitar TDZ en onclicks inline:
```js
// ⚠️ Estas vars se usan desde onclick="App.alm.X()" — no mover después de return{}
let _catInlineLpFired = false;    // L23142
let _catInlineQ       = '';       // L23144
let _almKbActive      = false;    // L25909
let _confirmandoPedido = false;   // L27314
```

---

## 10. Módulo UI y Nav

### ui (L11195)

Gestión de todas las capas de overlay. Reglas arquitectónicas críticas:

| Regla | Descripción |
|---|---|
| `fs-overlay` | Un solo sheet de formulario activo. `setFs(html)` → `openFs()` en ese orden |
| `modal-overlay` | Un solo modal activo. Nunca apilar dos |
| `settings-drawer` | Navegación interna via `sdSubOpen/Close`. NUNCA `SideSheet.open()` desde Ajustes |
| Cierre de sheets | `classList.remove('open')` primero → `setTimeout(cleanup, 220ms)` — nunca `display:none` directo |
| `CLOSE_DUR = 220` | Debe coincidir con `--sheet-duration: 0.22s` en CSS |

**Funciones públicas clave:**

```js
openFs(type?)     // type: 'full' | 'half' | undefined
closeFs()
openModal(html)   // solo un modal activo
closeModal()
openSettings()    // abre settings-drawer
openMainMenu()    // menú legacy / fallback
showWhatsNew(ver) // changelog desde _WN_CHANGELOG
```

### nav (L13228)

```js
goTab(i)          // 0=TPV, 1=Dashboard, 2=Almacén
goTabFS(i)        // cierra fs-overlay antes de navegar
nav._cTab         // tab activo actual (getter)
```

**`goTab` no tiene haptic** — lo comparte swipe y tap. Añadir haptic aquí lo dispararía en ambos casos. Documentado en L13388.

`goTab` cierra automáticamente: `fs-overlay`, `modal-overlay`, `tpv-cobro-sheet`, `tickets-sheet`, `ns-overlay`, `sac-global-dd` y todos los center-overlays.

---

## 11. Funciones grandes (> 100 líneas)

> Estas funciones tienen alta densidad lógica. Modificar con precaución.

| Función | Línea | Líneas | Descripción |
|---|---|---|---|
| `numInput` | L21108 | 625 | Builder de HTML string para inputs en settings. **No lógica de negocio — solo UI strings.** |
| `setLanguage` + `_WN_CHANGELOG` | L12607 | 566 | `setLanguage` son 9 líneas. El resto (553L) es el objeto `_WN_CHANGELOG` con el historial de versiones. |
| `_snapRenderCard` | L19815 | 379 | Render completo de una snap card del Dashboard |
| `_sdNav` | L20840 | 268 | Navegación del settings drawer — routing interno |
| `_snapBuildNarrative` | L18368 | 261 | Generación de texto de análisis por tarjeta |
| `safeCall` | L9352 | 239 | Wrapper safe + `DashweyBus` implementación completa |
| `_renderChatCenter` | L16816 | 224 | UI del centro de mensajes interno |
| `_checkCaducidades` | L28349 | 220 | Scheduler de notificaciones de caducidad |
| `updateBadge` | L24492 | 210 | Estado del banner Almacén — fuente de verdad visual |
| `_snapRenderChart` | L19421 | 207 | Gráfico SVG del snap panel |
| `save` | L9683 | 198 | Persistencia State — localStorage + Firebase con guards |
| `_doInitialSync` | L28651 | 182 | Sync inicial Firebase→localStorage al arrancar |
| `openMainMenu` | L11310 | 174 | Render del menú de ajustes |
| `openPendingOrders` | L27546 | 165 | Modal de pedidos programados |
| `openNuevoArtFs` | L25109 | 157 | Formulario de nuevo artículo Almacén |
| `_syncAppState` | L28947 | 156 | Sync de estado Firebase en caliente |

---

## 12. Sistema de eventos custom

Comunicación cross-módulo via `window.dispatchEvent(new CustomEvent(...))`.

| Evento | Emisor | Receptor | Descripción |
|---|---|---|---|
| `dashwey:tab-changed` | `nav.goTab` | Spotlight, varios | Cambio de tab |
| `dashwey:venta-registrada` | `tpv.procesarPago` | Dashboard | Nueva venta guardada |
| `dashwey:pedido-confirmado` | `alm._doConfirm` | Dashboard snap | Pedido recibido |
| `dashwey:pedido-eliminado` | `alm` | Dashboard snap | Pedido descartado |
| `dashwey:firebase-ready` | Firebase init | State, InitSync | Firebase disponible |
| `dashwey:auth-changed` | Firebase auth | Auth gate | Cambio de sesión |
| `tpv:rendered` | `tpv.render` | dock, externos | TPV re-renderizado |
| `date:changed` | DPS / dash | Dashboard | Cambio de período |
| `item:created` | `alm` | varios | Artículo creado en Almacén |

**Bus interno (`DashweyBus`):** `DashweyBus.on(event, fn)` / `DashweyBus.emit(event, payload)` — solo para comunicación interna entre módulos del IIFE principal.

---

## 13. CSS — jerarquía z-index y variables clave

### z-index hierarchy

```
50      #bottom-tabs (navbar)
100     #header (safe-area spacer)
9000    FABs, overlays base
9010    #alm-fab
9100    TPV cobro sheet
9500    SideSheet
9990    TPV quick grid sheets
9999    settings-drawer
10050   alm center overlays (análisis pedido)
10100   fs-overlay (sheets de formulario)
10101   modal-overlay
10102   auth screen
10103–10105  modales dinámicos creados por JS
10150   alm-spotlight
10200   alm order check overlay
10300   alm prov picker
10500   auth/splash (máxima prioridad)
```

### Variables CSS críticas

```css
--tab-h:          50px          /* altura navbar (sin safe area) */
--tab-real:       calc(--tab-h + --sab)  /* altura real con notch */
--header-h:       0px           /* header colapsado desde v1.3.69 */
--sat:            env(safe-area-inset-top, 44px)
--sab:            env(safe-area-inset-bottom, 0px)
--sheet-duration: 0.22s         /* DEBE coincidir con CLOSE_DUR = 220 en JS */
--dur-std:        220ms
--spring:         cubic-bezier(0.34, 1.56, 0.64, 1)
--ease:           cubic-bezier(0.4, 0, 0.2, 1)
```

### Responsive breakpoints

```css
@media (min-width: 768px)  { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }
@media (max-height: 500px) and (orientation: landscape) { /* landscape móvil */ }
body.tpv-tablet-pos { /* tablet TPV — activado por JS via innerWidth/innerHeight */ }
```

---

## 14. Patrones y convenciones

### Haptic feedback

```js
Utils.triggerHaptic(type)
// tipos: 'light' | 'medium' | 'selection' | 'success' | 'error' | 'confirm'
// debounce: 60ms (_HAPTIC_DEBOUNCE)
// respeta: State.get.settings().prefHaptic (global)
//          State.get.settings().tpvVibracion (solo addCart en TPV)
// bridge: Capacitor.Plugins.Haptics → navigator.vibrate fallback
```

**Regla:** Todo haptic pasa por `Utils.triggerHaptic()`. Prohibido usar `navigator.vibrate()` directamente.

### Animaciones

- Duración estándar: `220ms` / `var(--dur-std)`
- Long press: `500ms` (`LP_MS`)
- Solo `transform` + `opacity` en animaciones (compositor-only)
- `will-change: transform` solo durante la transición → limpiar en `setTimeout(220ms)`

### Renders con dirty-check

Patrón obligatorio para cualquier render que pueda llamarse frecuentemente:
```js
const newHash = datos.map(d => `${d.id}:${d.valor}`).join('|');
if (newHash === _prevHash) return;   // no rebuild
_prevHash = newHash;
// ... rebuild DOM
```

### Template literals en innerHTML

```js
// ✅ Correcto
div.innerHTML = `<input type="number" value="${Number(val) || 0}">`;
div.innerHTML = `<input type="date" value="${date ? date.slice(0,10) : ''}">`;
div.innerHTML = `<img src="${foto || ''}">`;

// ❌ Prohibido — rompe onclicks en WebView
div.innerHTML = `<button onclick="fn('${id}')">`;   // usar addEventListener
div.innerHTML = `${val}`;                             // sin guard → XSS + crash

// ✅ Para onclicks con ID
div.dataset.id = id;                                 // data attribute
div.addEventListener('click', () => fn(div.dataset.id));
```

### Event delegation

Usar siempre que el contenedor sea estático y los hijos se re-rendericen:
```js
if (!container._delegated) {
  container._delegated = true;
  container.addEventListener('touchstart', e => {
    const target = e.target.closest('.selector');
    if (!target) return;
    // ...
  }, { passive: true });
}
```

### Sheets y modales

```js
// Abrir sheet de formulario:
App.ui.setFs(`<div>...</div>`);   // 1. inyectar HTML
App.ui.openFs();                   // 2. animar apertura

// Cerrar:
App.ui.closeFs();                  // NO escribir display:none — closeFs lo gestiona
```

---

## 15. Qué NO tocar y por qué

| Elemento | Por qué no tocar |
|---|---|
| `window.App = App` (L29225) | Sin esto, los `onclick="App.X()"` usan el Proxy vacío del HEAD. La app no funciona. |
| `Object.assign(DEFAULTS_clone, raw)` en `load()` | El orden es correcto — DEFAULTS primero, localStorage encima. Invertirlo rompe los defaults de `notifPrefs` |
| `#alm-progress-banner` con `style.display` | Solo clases CSS controlan su visibilidad. Inline styles tienen mayor especificidad y bloquean `updateBadge()` |
| `CLOSE_DUR = 220` en `closeFs` | Debe coincidir exactamente con `--sheet-duration: 0.22s` en CSS |
| `scroll-snap-stop: always` (eliminado) | Bloqueaba scroll interno en Android WebView. No reintroducir. |
| `backdrop-filter` dentro de elementos con `transform` | No funciona en Android WebView. Ver historial v1.3.167 |
| `goTab` sin haptic | Se llama también desde swipe. Haptic aquí = vibración en cada swipe. |
| Variables `let` antes de `return{}` en alm | TDZ — si se mueven después del return no son accesibles desde `onclick` inline antes de init. |
| `_isSaving` / `_isSyncing` guards en `save()` | Previenen loops de escritura Firebase. No añadir writes que salten estos guards. |
| Hash fingerprint en `save()` | Si se elimina → Firebase recibe escrituras duplicadas en cada keypress. |
| `IntersectionObserver` para snap detection | No confiable en Android WebView. Usar `getBoundingClientRect + scroll listener`. |

---

## 16. Riesgos conocidos

### 🔴 Riesgo alto

**Tamaño del archivo (1.394 KB / 31.862 líneas)**
- El parser del WebView Android procesa todo el archivo en cada cold start
- En dispositivos de gama media-baja el tiempo de parse es perceptible
- Límite práctico: ~35.000 líneas antes de impacto medible en arranque
- **Acción:** No añadir módulos completos sin evaluar split de archivos

**innerHTML como vector de crash**
- 138 assignments de `innerHTML`
- Si un template literal contiene un `</script>` o `</body>` → rompe el parser HTML
- Esto ocurrió en v1.3.296 cuando el bloque de tests se insertó dentro de un template literal de factura
- **Acción:** Todo `innerHTML` con strings largos debe validarse que no contiene tags de cierre de documento

### 🟡 Riesgo medio

**163 listeners sin `removeEventListener` correspondiente**
- La mayoría son `document` / `window` level — se acumulan si el código que los añade se ejecuta más de una vez
- Los listeners en nodos DOM con dirty-check son seguros (nodos nuevos en cada render → GC limpia)
- Los listeners con `{ once: true }` son seguros
- **Identificar:** Los 42 `document/window.addEventListener` sin `once:true` ni `passive:true` — revisar si están protegidos por guard o se ejecutan solo una vez en init

**`_WN_CHANGELOG` (553 líneas de datos)**
- El objeto de changelog What's New vive en el mismo scope que la lógica de `setLanguage`
- No es código ejecutable, pero aumenta el tiempo de parse
- **Acción futura:** Extraer a JSON externo o lazy-load

**Almacén — estado dual del carrito**
- `_ordenCarrito` (in-memory) + `localStorage['dashwey_carrito_v1']` (backup)
- Si hay discrepancia entre ambos → el carrito se restaura del localStorage al entrar al tab
- El flag `_confirmandoPedido` previene doble-tap pero debe liberarse en `finally` — ver L27326

### 🟢 Riesgo bajo

**42 `document.addEventListener` sin `once:true`**
- Revisar antes de añadir nuevos listeners globales que estos no se re-registren en cada render

**`console.log` en producción**
- 7 `console.log` activos — la mayoría son en flujo de confirmación de pedidos y útiles para debug
- 1 eliminado en v1.3.296 (tablet mode detection)

**CSS muerto estimado**
- ~397 selectores CSS definidos pero sin elemento HTML correspondiente detectable
- La mayoría son falsos positivos (usados en template literals de innerHTML)
- No limpiar masivamente sin verificación manual clase por clase

---

## 17. Deploy y validación

### Flujo de entrega

```bash
# 1. Validar sintaxis JS antes de ZIP (OBLIGATORIO)
python3 -c "
import re
with open('index.html','r') as f: h = f.read()
scripts = re.findall(r'<script(?:[^>]*)>(.*?)</script>', h, re.DOTALL)
open('/tmp/b.js','w').write('\n'.join(scripts))
"
node --check /tmp/b.js   # debe devolver exit 0

# 2. Bump version en los 4 archivos
# index.html, sw.js, version.json, version.txt

# 3. Bump CACHE_NAME en sw.js
# dashwey-v1-3-XXX-dev → coincide con versión

# 4. ZIP de entrega
zip dashwey-vX.X.XXX-dev.zip index.html sw.js version.json version.txt manifest.json

# 5. Deploy → GitHub Pages
# Arrastrar los 4 archivos al repo: index.html, sw.js, manifest.json, version.json
```

### Cache clearing (APK)

```js
// Ejecutar en consola del WebView para forzar recarga limpia:
navigator.serviceWorker.getRegistrations()
  .then(r => r.forEach(sw => sw.unregister()))
  .then(() => caches.keys().then(k => Promise.all(k.map(c => caches.delete(c)))))
  .then(() => { location.reload(true); });
```

### ⚠️ Trampa frecuente — template literals con `</body>`

Si se usa `replace('</body>', ...)` para inyectar código, verificar primero cuántas ocurrencias hay:

```bash
grep -n "</body>" index.html
# La factura de compra contiene </body></html>` en un template literal
# Siempre usar .rfind('</body>') o equivalente — no .find()
```

---

## 18. Tests

**Activación:**
```js
window._DashweyRunTests()          // ejecutar manualmente desde consola
// o añadir #dashwey-tests al hash de URL → auto-ejecuta 1.5s después de DOMContentLoaded
```

**Resultado:**
```js
window._DashweyTestResults
// { passed, failed, total, pct, results[] }
```

**Suite actual (v1.3.296) — 15 tests:**

| Test | Módulo | Qué valida |
|---|---|---|
| `ventaIngresos: modern` | FinEngine | `v.total` priorizado |
| `ventaIngresos: legacy` | FinEngine | `pvp × qty` raíz |
| `ventaIngresos: items[]` | FinEngine | suma de items |
| `ventaIngresos: null` | FinEngine | no crash con null |
| `pedidoCoste: IVA 10%` | FinEngine | IVA dinámico |
| `pedidoCoste: IVA 21%` | FinEngine | campo `iva` respetado |
| `pedidoCoste: default` | FinEngine | default 10% sin campo |
| `pedidoCoste: null` | FinEngine | no crash con null |
| `margenBruto: sin ventas` | FinEngine | división por cero → 0 |
| `periodRange: today/week/month/year/custom` | KPI | 5 tipos de período |
| `ventasEnPeriodo: past` | KPI | filtro temporal vacío |
| `deltaRevenue: period` | FinEngine | acepta período activo |
| `gastoMensualTotal: > 0` | FinEngine | demo data cargada |

**Añadir tests:** Editar el bloque `_DashweyTests` en L31763. Usar `assert(nombre, got, expected)` o `assertRange(nombre, got, min, max)`. No requiere framework externo.

---

## Constantes de referencia rápida

```js
STORAGE_KEY      = 'dashwey_v3'        // clave localStorage principal
LANG_KEY         = 'dashwey_lang'      // preferencia de idioma
CARRITO_KEY      = 'dashwey_carrito_v1' // backup carrito Almacén
ANIM_DELAY       = 220                 // ms — duración estándar de animaciones
CLOSE_DUR        = 220                 // ms — closeFs cleanup delay (= --sheet-duration)
_HAPTIC_DEBOUNCE = 60                  // ms — anti-spam haptic
LP_MS            = 500                 // ms — umbral long press
SWIPE_THRESHOLD  = 60                  // px — umbral swipe-to-delete dock TPV
HDR_COMPACT_THRESHOLD = 10             // px — scrollTop para activar hdr-compact
FIREBASE_DEBOUNCE = 800               // ms — debounce writes a Firestore
FB_RETRY_MAX     = 3                   // reintentos Firebase (backoff 1s/2s)
TAB_0 = 'tpv' | TAB_1 = 'dashboard' | TAB_2 = 'almacen'
```

---

*Generado automáticamente desde análisis estático de `index.html` v1.3.296-dev*  
*Actualizar este documento en cada release que modifique arquitectura, módulos o convenciones.*
