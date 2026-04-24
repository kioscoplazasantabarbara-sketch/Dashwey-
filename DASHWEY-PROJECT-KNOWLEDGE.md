# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## ESTADO ACTUAL

**Versión:** v1.3.1141-dev
**Plataforma:** APK Android via Capacitor + WebView (+ acceso web)
**Deploy:** GitHub Pages → `server.url` en `capacitor.config.json`
**Usuarios:** Reales en producción — cero regresiones toleradas
**Package:** `com.dashwey.app`
**Contexto activo:** `business`
**UID:** MH6ASvyWv0TElNfZH3GrIZbtr1n2
**Presupuesto Firebase:** Alertas configuradas 50/90/100%
**Loyverse:** Free plan, proxy EU-west1 Cloud Function, caja real
**TPV Dashwey:** Suspendido (módulo activo, UI oculta)

---

## ARQUITECTURA

```
index.html (~43.800 líneas) — SPA monolítica completa
sw.js          — Service Worker con cache bust por versión
version.json   — Fuente de verdad de versión
version.txt    — Mirror de versión
manifest.json  — PWA manifest
```

**Módulos IIFE dentro de App:**
```
State      → fuente única verdad + localStorage + _DashweyDirtyItems persistido
KPI        → getBeneficioNeto filtra _isKpiVisible
FinEngine  → helpers _ivaFactor/_ivaPct + _calcMargenProd único + FIFO valorStock
Utils      → helpers, haptics, toasts, formatters
ui         → modales, sheets, overlays, settings
nav        → navegación entre tabs
dash       → Dashboard KPI + snap cards lazy + landscape feed
tpv        → Punto de Venta (suspendido)
alm        → Almacén e inventario
tpvQG      → Quick Grid TPV
```

**Bus de eventos:** `DashweyBus.emit/on` — **setters emiten centralizadamente desde v1.3.1138**
**Entry point:** `window.App` — OBLIGATORIO, nunca solo `const App`

**Stack:** Vanilla JS/HTML/CSS · Firebase Firestore · localStorage · Capacitor · Service Worker
**Prohibido siempre:** TypeScript · React/Vue · Jest · ES6 modules · bundlers

---

## REGLAS CRÍTICAS — NUNCA VIOLAR

### Android WebView
- `backdrop-filter` falla dentro de ancestro con `transform` o `will-change:transform` → no combinar
- `will-change:transform` NUNCA permanente en CSS de sheets — solo vía clase JS durante animación
- `transitionend` unreliable → siempre fallback `setTimeout` 350-400ms
- `IntersectionObserver` unreliable → mantener fallback `getBoundingClientRect`
- `confirm()` BLOQUEADO → usar `window._showDestructiveConfirm()`
- Haptic: NUNCA durante scroll → solo en `touchend`/`scrollend`
- Animaciones: SOLO `transform` + `opacity`
- `position: fixed` overlays — NUNCA dentro de `overflow:hidden` o `transform`
- `@keyframes transform:scale` en SVG freezea WebView
- `navigator.vibrate` unreliable con patrones continuos

### Código
- `window.App = App` OBLIGATORIO
- IIFE `alm`: funciones SIEMPRE antes de `return{}`
- Strings: Python `h.replace(old, new, 1)` — NUNCA regex en Firestore paths con paréntesis
- NUNCA `confirm()` nativo
- NUNCA animar `height/width/top/left`
- NUNCA `triggerHaptic` en `catch`
- Bump versión: 4 archivos + `CURRENT_CACHE`
- Guard doble-tap: flag + setTimeout reset, nunca `{once:true}`
- Navbar touch/mouse guard: timestamp-based, no pointerType string-compare

### Auth y Layout
- `#auth-screen` SIEMPRE fuera de `#app`
- `resetStorage()` SOLO en `doReset()` y `authRegister()`
- `authLogout` limpia TODOS los flags: `_DashweyDirtyItems`, `_DashweySubPending`, `_DashweyDirty`, `_DashweySaveScheduled`, `_DashweyLastSyncedSnap`, `_DashweyLastRootDigest`, `_DashweyInitialSyncDone=false`

### Sync Firebase — CRÍTICO
- `_DashweyInitialSyncDone=false` al arrancar y en `authLogin`
- `_DashweyInitialSyncDone=true` solo cuando `_doInitialSync` completa
- `save()` early return si `_DashweyApplyingRemote=true`
- Origen determinista: single-flight debounce 500ms + logs `[SAVE_ORIGIN] LOCAL/REMOTE_BLOCKED`
- Emits post-merge con `setTimeout(150)` para mantener flag durante Bus async
- `_writeFirebaseDual`: **BATCHES SUBCOL PRIMERO, ROOT DESPUÉS** (atomicidad)
- Si batches fallan → abortar SIN subir root
- `_DashweyDirtyItems` persistido localStorage
- `_cleanForFirestore` reemplazado por `_DashweyDeepClean` global recursivo

### Setters (v1.3.1138+)
- Setters transaccionales emiten su evento CENTRALIZADAMENTE
- UI callers NO re-emiten
- `addVenta/addGasto/addIngreso/addPedido/addMerma/addProd/addProv` emiten desde setter
- `_recalcSaldosListener` coalesce en RAF (50 emits → 1 recalc)

### Financiero
- `cu = precioCompra / udsCaja`
- `pvpNeto = pvp / (1 + iva%)`
- `mg = (pvpNeto − cu) / pvpNeto × 100`
- IVA: `window._ivaFactor(raw)` / `window._ivaPct(raw)` globales
- Margen: `_calcMargenProd(p)` fuente única
- `valorStock()` prioriza lotes FIFO, fallback precioCompra
- `ventaCoste`: `v.costeReal` → `i.coste` línea → legacy
- `_isKpiVisible` filtra transfer/pendiente/scope en `revenue` + `getBeneficioNeto`
- `beneficioBruto` (€) vs `margenBruto` (%) — nombres desambiguados
- Nunca hardcodear IVA `1.10`

### Firestore
- Límite 1MB doc, safety guard 900KB fuerza limpieza
- `isValidSize()` rechaza > 1024000 bytes
- Split create/update/delete

---

## SISTEMAS IMPLEMENTADOS

### Dashboard — Snap Cards lazy (v1.3.1139)
- Solo card activa se renderiza eagerly
- Resto marca `data-stale="1"`
- Observer/scroll detecta y renderiza al entrar viewport

### Dashboard — Cards activas
- `rendimiento` — ventas, margen, hora pico
- `compras` — pedidos, stock
- `flujo-caja` — saldo, ingresos/gastos, runway
- `agenda` — 3 pestañas: Alertas / Entregas / Eventos

### FIFO valorStock (v1.3.1137+)
- Lote: `{ id, prodId, qty, qtyRestante, costeUnit, fecha }`
- `crearLotesDesdeItems` en `addPedido`
- `consumirLotesFIFO` en `addVenta` → escribe `v.costeReal`
- Si FIFO falla: `v.costeRealPending=true` para retry

### Modelo de precios
- `p.precioCompra` = precio BULTO
- `p.pvp` = precio UNIDAD
- `p.udscaja` = unidades por bulto
- `cu = precioCompra / udscaja` — NUNCA comparar sin prorratear

### FCM Push
- VAPID: `BDck5vcqwviHaMHXNeGoLTouXCKeZEd4dD39a0wVFmhfTTR70DjpZLfSGNTmRcFX3ABG9ssodnNzOHcRpRsRbHs`

### Loyverse (caja real)
- Proxy: `https://europe-west1-dashwey-project.cloudfunctions.net/loyverseProxy`
- Plan Free 250 tickets/página, cursor + `created_at_min`
- Cache localStorage TTL 30 días, cola FIFO priority

---

## PROTOCOLO DE TRABAJO

**FLUJO OBLIGATORIO (7 pasos):**
1. MAP flujo afectado end-to-end
2. AUDIT código, dependencias, callers, CSS, DOM, events
3. RISK qué no debe romper
4. CONSULT si ambiguo (STOP, preguntar)
5. EXECUTE cambios quirúrgicos
6. VALIDATE `node --check` por bloque script
7. RECORD cambios en knowledge.md

**VERSIONADO — 4 archivos:**
- `index.html` → `_APP_VERSION` + título + `CURRENT_CACHE`
- `sw.js` → `CACHE_NAME: dashwey-v1-3-XXX-dev`
- `version.json` → `{"version":"1.3.XXX-dev"}`
- `version.txt` → `1.3.XXX-dev`

**ZIP RULE:**
```python
arcname = 'dashwey/' + relpath
```

---

## PENDIENTES

### 🟡 Pre-Play Store
- **Firestore Rules hardening** — schema estricto por tipo (is list/is map 24+ claves). Diseñado, listo.
- Verificar contadores Firebase 24-25 abr (writes <20k, reads <50k tier gratis)

### 🔵 Cleanup mental
- `_lastSavedHash` legacy
- `_DashweyLastSaveEndTs` dead code

### 🟢 Roadmap funcional

**Eliminar:** Visitas Comerciales, botón Business, tarjeta Estado Inventario (→ Agenda)

**Simplificar:** Notificaciones → "Alertas en app"; financial module → auto TPV+Alm; TPV dock contador visible

**Completar:** `exportarDatos()` (gastosOp/ingresosFin/cuentas/notifPrefs/hotPins/settings); Informe IA sin auth; unificar Hot Grid + Quick Grid

**Rediseñar Agenda:** eventos unificados por urgencia + acción directa

**Crear:** Cierre caja, stock alert → "Pedir ahora", ticket medio TPV, post-cobro summary, histórico diario ventas, smart order, dashboard 5-segundos, precio editable por ticket

**FCM/Cloud Functions** (Spark free, ~3-4 sesiones): push reales stock/caducidad/cierre

**Long-term history** (~5 sesiones): archivado mensual Drive + lector histórico + comparaciones

**BudgetBakers import:** A (filtro 18m) / B (subcol mensual) / C (dual). Recomendado A→B

---

## CAMBIOS SESIÓN 24 ABR 2026

### v1.3.1136 — DATA LAYER HARDEN (8 fixes)
1. `authLogout` limpia todos los flags (cross-account leak)
2. `_writeFirebaseDual`: batches subcol PRIMERO, root DESPUÉS
3. `lastSyncAt` estampado en path `!InitialSyncDone`
4. `_DashweyDirtyItems` persistido localStorage
5. `_flushQueue` usa `_writeFirebaseDual`
6. Guard `deleted` requiere baseline + delta ≤20 items / 5%
7. `_writeFirebase` usa `_DashweyDeepClean` recursivo
8. `addVenta` marca `costeRealPending:true` si FIFO falla

### v1.3.1137 — LOGIC LAYER AUDIT (8 fixes)
1. `valorStock()` prioriza FIFO
2. `ventaCoste()` lee `v.costeReal` prioritario
3. `getBeneficioNeto()` filtra `_isKpiVisible`
4. `revenue()` filtra ventas `_isKpiVisible`
5. Helpers globales `_ivaFactor`/`_ivaPct` (8 duplicaciones eliminadas)
6. `_bbCalcProvMargenAvg` + `_buildCatInlineItem` usan `_calcMargenProd`
7. `_ventaIng` local delega a `FinEngine.ventaIngresos`
8. `getBeneficioNeto` devuelve `beneficioBruto` + alias `margenBruto`

### v1.3.1138 — INTERACTION LAYER (7 fixes)
1. `_deleteGasto` emite `'gasto'`
2. `addVenta/addGasto/addIngreso/addPedido/addMerma/addProd/addProv` emiten desde setter
3. `_addGasto` UI ya no emite (setter lo hace)
4. `_recalcSaldosListener` coalesce en RAF
5. Guard `_addingGastoFlag` reset 500ms (reemplaza `{once:true}`)
6. LDC btn `_bR.dataset.p=''` en `finally`
7. Navbar guard `dataset.ttap` timestamp (reemplaza `pointerType!=='touch'`)

### v1.3.1139 — UI LAYER CLEAN (7 fixes)
1. `_snapDoRenderAll` renderiza SOLO card activa + lazy stale flag
2. `renderFlujoCaja` duplicado removido de `dash.render()`
3. `renderAgenda` duplicado removido de `pedido_stock` handler
4. `_snapRenderCard` duplicado removido de `_scheduleVentaRender`
5. `updateBadge` usa `_ivaFactor` (antes hardcoded 1.10)
6. `will-change:transform` removido de sheets (whats-new, dash-period)
7. `_applyDashMode` guard ya existente — verificado

### v1.3.1140 — SYNC LAYER: root dual consistente (4 callsites)
**Causa raíz:** `[Dashwey/FB] invalid-argument` recurrente + log payload con 31 keys incluyendo las 6 transaccionales. 4 callsites llamaban `fb.write('state', _buildLocalSnapshot())` directo → bypasean `_writeFirebaseDual` → doc root >1MB con `ventas`/`gastosOp`/`ingresosFin`/`historialPedidos`/`mermas`/`facturas` → Firestore rechaza.

**Fixes:**
1. Exportado `window._DashweyWriteDual = _writeFirebaseDual` (L10584) para uso fuera del IIFE storage
2. Callsite L38697 (primera subida a nube) → usa `_DashweyWriteDual` con fallback
3. Callsite L38819 (resubida post-merge setTimeout 1500ms) → usa `_DashweyWriteDual`
4. Callsite L38823 (`localTs > remoteTs`) → usa `_DashweyWriteDual`
5. Callsite L39428 (visibilitychange hidden flush) → usa `_DashweyWriteDual`

**Impacto:** todas las rutas de escritura al root pasan por el dispatcher dual → root nunca excede 1MB, subcolecciones drenan correctamente, `invalid-argument` eliminado.

**NO tocado:** L9465 (escribe arrays vacíos intencionalmente — `_forceRootClean`), L9609 (migración schema), L10443 (es `_writeFirebase` interno del dispatcher).

### v1.3.1141 — SAFE HARDEN MODE: guard defensivo + flush manual (4 fixes)
**Estrategia:** consistencia FUERTE — blindar el sistema contra bypass accidentales del dispatcher dual, sin refactor.

**FIX 1 — ROOT WRITE GUARD en `fb.write`** (L8972-L8995)
- Detecta payload `state` con arrays transaccionales NO-vacíos
- Redirige a `_DashweyWriteDual` automáticamente
- Flag interno `__dualBypass` rompe recursión (set en path OFF L10500 + rootPayload ON L10528)
- **Riesgo prevenido:** cualquier callsite nuevo o legacy que pase `fb.write('state', snap_completo)` → auto-corregido sin invalid-argument
- Warning log: `[Dashwey/FB] ROOT_GUARD: write con arrays transaccionales → redirigido a WriteDual`

**FIX 2 — DIRTY QUEUE FLUSH MANUAL** (L10614-L10696)
- `window._DashweyFlushDirty()` async, idempotente, single-flight (`_DashweyFlushing`)
- Guards: fb_not_ready, offline, initial_sync_pending, no_dirty → retorna `{ok, flushed, skipped}`
- Drena `_DashweyDirtyItems` por stateKey → `_DashweyWriteSubcollectionBatch` → limpia Set SOLO tras confirmación
- Actualiza `_DashweyLastSyncedSnap` baseline (evita falsos positivos delete detection)
- **Hook automático:** window.online → setTimeout 1500ms → flush (L10730-L10732)
- **Uso manual:** consola para diagnóstico `await _DashweyFlushDirty()`

**FIX 3 — WRITE GUARD GLOBAL (hydrated)** (verificado sin cambios)
- Guards existentes confirmados: `_DashweyInitialSyncDone` L11045, L15789, L15793, L16839, L38820, L39295
- `_state = load()` síncrono antes de cualquier save
- **Conclusión:** sistema ya bloquea writes si estado no hidratado

**FIX 4 — ANTI-LOOP / SAVE ENGINE** (verificado sin cambios)
- `_DashweySaveScheduled` single-flight (L10923)
- Debounce 500ms `_saveTimer` (L10925)
- `_isSaving` concurrency guard (L10988)
- Watchdog 30s (L11037) libera `_isSaving` si Promise no resuelve
- **Conclusión:** save engine ya robusto; no requiere cambios

**Validación simulada:**
- ✅ Cold start con datos existentes: guard hydrated bloquea Firebase pre-sync
- ✅ Offline → reconexión: `_flushQueue` + `_DashweyFlushDirty` cubren ambos lados
- ✅ Múltiples writes seguidos: single-flight dedupa
- ✅ Cambio cuenta: logout limpia flags, login re-sincroniza

---

## HISTORIAL BUGS CRÍTICOS — NO REPETIR

| Bug | Regla |
|-----|-------|
| App no arranca (llaves) | Contar manualmente |
| Auth-screen sobre Dashboard | `#auth-screen` hermano de `#app` en body |
| Datos borrados logout | `resetStorage()` NUNCA en logout/login |
| Datos borrados cold start | Guard `_DashweyInitialSyncDone` |
| Sync roto | Write directo — merge solo en onSnapshot |
| valorStock retroactivo | FIFO lotesStock v1.3.1137 |
| Pedido LDC sin llegar | `addPedido()` + emit `pedido_stock` antes de `removePendingOrder` |
| Cuentas borradas vuelven | Solo arrays acumulativos en MERGE_KEYS |
| Guards sin finally | TODO guard DEBE liberarse |
| `confirm()` WebView | `_showDestructiveConfirm()` |
| SAC fuera lugar | `position:fixed` + `getBoundingClientRect()` |
| onclick inline falla | `data-*` + addEventListener |
| Tombstones perdidos | localStorage TTL 90d |
| Rules sin límite | `size() < 1024000` |
| CURRENT_CACHE desinc | 5 puntos bump |
| Loop saves 3s + flicker | setTimeout(150) mantiene flag durante Bus async |
| Doble conteo Loyverse | Filter `origen==='loyverse'` |
| Cross-account dirty leak | Limpiar TODOS flags en logout |
| Root sin subcol | Orden invertido: batches antes root |
| Dirty perdido offline+close | Persistir localStorage |
| `_cleanForFirestore` no recursivo | `_DashweyDeepClean` global |
| Falsos positivos deleted | Baseline + delta ≤20 items/5% |
| Margen drift 4 impls | `_calcMargenProd` único |
| IVA hardcoded 1.10 | `_ivaFactor/_ivaPct` globales |
| Ventas importadas sin render | Setters emiten centralizadamente |
| `_deleteGasto` sin emit | Añadido `emit('gasto')` |
| Double-tap navbar 2× | Timestamp guard 500ms |
| `{once:true}` trap | Flag + setTimeout reset |
| `renderFlujoCaja` 2× render | Eliminar duplicado |
| `renderAgenda` 2× en pedido_stock | dash.render ya lo incluye |
| `_snapRenderCard` 2× post-venta | Eliminar extra |
| Total badge ≠ total pagar | `_ivaFactor(p.iva)` |
| Sheets sin backdrop Android | `will-change:transform` solo via JS |
| Snap cards renderizan todo | Solo activa eager, resto lazy stale |

---

*Actualizar versión y pendientes al cerrar cada sesión.*
