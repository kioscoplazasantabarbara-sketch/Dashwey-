# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## ESTADO ACTUAL

**Versión:** v1.3.1132-dev
**Plataforma:** APK Android via Capacitor + WebView (+ acceso web)
**Deploy:** GitHub Pages → `server.url` en `capacitor.config.json`
**Usuarios:** Reales en producción — cero regresiones toleradas
**Package:** `com.dashwey.app`
**Contexto activo:** `business`
**UID:** MH6ASvyWv0TE1NfZH3GrIZbtr1n2

---

## ✅ LOOP DE SAVES RESUELTO (v1.3.1131-1132)

**Bug histórico (horas de depuración):** `onSnapshot` → render → setters → `save()` → Firebase write (1613 KB) → rebote onSnapshot → loop cada 3s.

**Protocolo ORIGEN implementado:**

1. **`save()` L10770** — early return si `_DashweyApplyingRemote=true`
2. **Single-flight debounce 500ms** vía `_DashweySaveScheduled`
3. **Re-agendar en 1s** si aborta por guard temporal (evita cambios huérfanos)
4. **Emits post-merge con setTimeout(150)** — mantiene flag durante Bus.emit async
5. **`refresh()` L18082** — setters envueltos en `_DashweyApplyingRemote=true`
6. **Watchdog 30s** libera `_isSaving` si Promise nunca resuelve

**Logs nuevos para debug:**
- `[SAVE_ORIGIN] LOCAL` — save legítimo del usuario
- `[SAVE_ORIGIN] REMOTE_BLOCKED` — save bloqueado correctamente durante apply
- `[SAVE] START` / `[SAVE] SUCCESS` / `[SAVE] ERROR`

**Validado:** 23 `REMOTE_BLOCKED` durante arranque + 0 `[SAVE] START` hasta cambio real del usuario. `dirty=undefined`, `save_scheduled=undefined`.

---

## 🔴 PENDIENTES CRÍTICOS PRÓXIMA SESIÓN

1. **Payload 1613 KB persistente** — `_buildLocalSnapshot` sigue devolviendo arrays transaccionales completos aunque subcol esté activo. Safety guard los recorta pero sigue llegando al log. Investigar extracción en `_writeFirebaseDual`.
2. **`invalid-argument` 400 residual** — algún campo no saneado por `_DashweyDeepClean`. Reviewar `settings.loyverse.paymentMap`, `_DashweyFCM` tokens, objetos anidados no cubiertos.
3. **Watchdog 30s se disparó una vez** — investigar por qué Promise del write tardó >30s. Posible timeout Firestore sin rechazo.

---

## 🛡️ PROTECCIÓN COSTES (activada 24 abr 2026)

**Google Cloud → Presupuestos y alertas:**
- Presupuesto mensual: **X €** (configurado por usuario)
- Alertas email: 50% / 90% / 100%
- Destinatarios: admins facturación + usuarios

**Daño del bug 23 abr:** 147 writes extra + 392k reads extra = **~0.71 €** (factura mayo).

**Tier gratis Blaze:**
- 20k writes/día
- 50k reads/día
- 20k deletes/día

---

## ARQUITECTURA

```
index.html (~43.500 líneas) — SPA monolítica completa
sw.js          — Service Worker con cache bust por versión
version.json   — Fuente de verdad de versión
version.txt    — Mirror de versión
manifest.json  — PWA manifest
```

**Módulos IIFE dentro de App:**
```
State      → fuente única de verdad + localStorage
KPI        → métricas de negocio
FinEngine  → motor financiero (funciones puras)
Utils      → helpers, haptics, toasts, formatters
ui         → modales, sheets, overlays, settings, LOYVERSE SYNC
nav        → navegación entre tabs
dash       → Dashboard KPI + landscape feed
tpv        → Punto de Venta (suspendido, Loyverse es caja real)
alm        → Almacén e inventario
tpvQG      → Quick Grid TPV
```

**Bus de eventos:** `DashweyBus.emit/on` (+ `emitSync` con guard anti-recursión)
**Entry point:** `window.App` — OBLIGATORIO, nunca solo `const App`

**Stack:** Vanilla JS/HTML/CSS · Firebase Firestore · localStorage · Capacitor · Service Worker
**Prohibido siempre:** TypeScript · React/Vue · Jest · ES6 modules · bundlers

### Firestore — ESTRATEGIA B (subcolecciones) ACTIVA

Arquitectura dividida:
- **Doc raíz** `usuarios/{uid}/contextos/{ctx}/datos/state` — settings, cuentas, productos, proveedores, lotesStock, hotPins, etc. (~99 KB)
- **Subcolecciones** `usuarios/{uid}/contextos/{ctx}/datos/state_sub/{tipo}/{id}`:
  - `ventas` (~2700 items), `gastosOp` (~704), `ingresosFin`, `historialPedidos` (~584), `mermas`, `facturas`

**Flags activos:**
- `window._DashweyUseSubcollections = true` (auto `schemaVersion=2`)
- `window._DashweyDirty` — cambios locales pendientes
- `window._DashweyApplyingRemote` — bloquea markDirty/save durante apply remoto
- `window._DashweySaveScheduled` — single-flight debounce guard
- `window._DashweySavingCtrl.isSaving` — bloquea writes concurrentes
- `window._DashweyLastSaveEndTs` — timestamp último save (deprecated, revisar uso)

**Writer:** `_writeFirebaseDual` extrae trans arrays + escribe batches en subcol
**Reader:** onSnapshot por subcol → `_subcollection_snapshot` event → handler en State
**Safety guard:** si payload > 900KB → fuerza limpieza arrays transaccionales

### Limpieza Firestore (CRÍTICO)

**`window._DashweyDeepClean`** — saneador global único usado por fb.write Y batches subcol:
- `undefined/null` → `null`
- `NaN/Infinity` → `null`
- `function/symbol` → eliminado
- Keys con `__` (prefijo/sufijo) → eliminadas
- `Date` → ISO string

### Cola snapshots remotos (v1.3.1124+)

```js
window._DashweySubPending = {}  // { stateKey: items[] }
window._DashweyDrainPendingSnapshots()
```

- Si `isSaving=true` al recibir snapshot → se **encola**, NO se descarta
- Drain automático tras `_writeFirebase` (setTimeout 100ms)
- Drain periódico cada 5s safety net
- Watchdog 30s libera `isSaving` si Promise no resuelve

### SyncAhora — pull directo emergencia (v1.3.1125)

```js
await window._DashweySyncAhora()
```

Bypass completo del handler Bus:
- Fetch directo Firestore de las 6 subcolecciones
- Merge manual con locales por ID
- `State.set.X(merged)` directo
- Auto-ejecución 5s tras arranque

---

## INTEGRACIÓN LOYVERSE

**Proxy:** `https://europe-west1-dashwey-project.cloudfunctions.net/loyverseProxy`
**Token:** `localStorage.dashwey_lv_token`
**Dedup:** `v_lv_<receiptId>` en `_lvCommitReceipts`
**Mapeo pago:** `settings.loyverse.paymentMap` (CASH/CARD/OTHER → cuentaId)

### Auto-sync polling (v1.3.1099+)
- `_lvSyncHoy({force: true})` — cutoff 72h, paginación cursor
- Debounce 10s via `_lvLastSyncTs`

### Fetch histórico bajo demanda (v1.3.1121+)
- `App.ui._lvFetchRangoHistorico(startISO, endISO, onDone, priority)`
- Priority 1 = click usuario, 0 = prefetch
- Cache `localStorage.dashwey_lv_dias_fetched` TTL 30 días
- Cola FIFO `window._DashweyLvQueue`
- Prefetch vecinos: ◀ → [-1, -2], ▶ → [+1]
- Plan Free fallback: si 402 con `created_at_min`, reintenta sin filtro

### Navegación ◀▶ períodos custom (v1.3.1120+)
- `shiftPeriod(dir)` custom: **+24h exactas** (como Loyverse Dashboard)
- Auto-fetch si rango <3 ventas locales
- Guard tap-through: `_DashweyPeriodSheetClosedAt` 400ms

---

## MÓDULOS ACTIVOS

- **TPV** — suspendido, Loyverse es caja real
- **Almacén** — stock, catálogo inline, proveedores, pedidos
- **Dashboard** — KPIs, snap cards (rendimiento/compras/flujo-caja/agenda)
- **Ajustes** — SideSheet stack, equipo, permisos
- **Loyverse Integration** — polling 72h + histórico bajo demanda
- **BudgetBakers CSV import** — histórico manual

## ROADMAP

- **Hogar** — finanzas personales (futuro)
- **Cartera** — seguimiento inversiones (futuro)
- **Webhook Loyverse Pro** — requiere plan Pro pago
- **Ecosistema Multi-App** — `?mode=hub/pos/alm/cfo`

---

## REGLAS CRÍTICAS — NUNCA VIOLAR

### Save Engine (v1.3.1130+)
- **save() hace early return si `_DashweyApplyingRemote=true`** — nunca escribe
- **Single-flight** via `_DashweySaveScheduled` — nunca 2 saves encolados
- **Debounce 500ms** fijo (deprecated `_DashweyUrgentSave`)
- **Sin retry cíclico** — no re-disparar tras .then/.catch
- **Re-agendar 1s** si aborta por guard temporal
- **Watchdog 30s** obligatorio para cada Promise de write

### Emits post-merge (v1.3.1131)
- Handler onSnapshot NO libera `_DashweyApplyingRemote` síncronamente
- Usar `setTimeout(restore, 150)` tras los emits
- Los handlers Bus corren en setTimeout(0), deben ver flag=true

### Firestore writes
- `fb.write()` SIEMPRE pasa por `window._DashweyDeepClean`
- `batch.set()` en subcolecciones también limpia cada item
- NUNCA `undefined`, `NaN`, `Infinity` en valor
- Safety guard >900KB previene write si payload grande

### Estrategia B
- `_schemaVersion: 2` en doc raíz
- Arrays transaccionales VIVEN en subcolecciones, NO en doc raíz
- `_writeFirebaseDual` SIEMPRE excluye transactionalKeys del rootPayload
- Handler `_subcollection_snapshot` hace merge por ID + timestamp
- Handler tiene SKIP guard O(1): counts + primer/último ID

### Android WebView
- `backdrop-filter` falla dentro de ancestro con `transform`
- `transitionend` unreliable → fallback `setTimeout` 350-400ms
- `IntersectionObserver` unreliable → `getBoundingClientRect`
- `confirm()` BLOQUEADO → `window._showDestructiveConfirm()`
- Haptic solo en `touchend`/`scrollend`
- Inline handlers con backslash-escape fallan silenciosamente → `data-*` attrs
- Animaciones: solo `transform` + `opacity`
- `position: fixed` NUNCA dentro de `overflow:hidden` o `transform`

### Código
- `window.App = App` OBLIGATORIO
- IIFE `alm` tiene `return{}` final → insertar funciones ANTES
- Strings: Python `h.replace(old, new, 1)` — NUNCA str_replace en backticks
- Bump versión: 4 archivos (index.html + CURRENT_CACHE, sw.js, version.json, version.txt)
- Todo guard `_running=true` DEBE tener `finally { _running=false }`

### Auth y Layout
- `#auth-screen` SIEMPRE fuera de `#app` — hermano directo en body
- `resetStorage()` SOLO en `doReset()` y `authRegister()`

### Búsqueda global obligatoria
- Bug en función X → buscar mismo patrón en TODA la app antes de parchear
- Citar ocurrencias totales antes de pedir GO

---

## HISTORIAL DE BUGS CRÍTICOS — NO REPETIR

| Bug | Causa | Regla |
|-----|-------|-------|
| Loop saves cada 3s | onSnapshot → render → setter → save → write → onSnapshot | `save()` early return si `_DashweyApplyingRemote`, emits post-merge con setTimeout(150) |
| Cambios huérfanos (dirty=true, scheduled=false) | save abortaba por guard sin re-agendar | Re-agendar 1s si dirty persistente |
| _isSaving atascado | Promise write nunca resolvía | Watchdog 30s obligatorio |
| Snapshots remotos descartados | isSaving=true → return silencioso | Cola `_DashweySubPending` + drain |
| App no arranca | `try` sin `catch/finally` al eliminar JS | Mapear estructura try/finally |
| Auth-screen sobre Dashboard | `#auth-screen` dentro `#app` con overflow:hidden | #auth-screen fuera de #app |
| Datos borrados en logout | resetStorage en logout subía vacío | resetStorage solo en doReset/authRegister |
| valorStock retroactivo | usaba precio actual | FIFO lotesStock v1.3.742 |
| Snap cards congeladas | render() no llamaba _snapDoRenderAll | Añadir al final de render() |
| Pedido recibido no llega | flujo LDC eliminaba sin addPedido() | addPedido + emit antes de removePendingOrder |
| Botón resetear no funciona WebView | confirm inline bloqueado | _showDestructiveConfirm |
| Cuentas/gastos borrados vuelven | en _MERGE_KEYS | Solo acumulativos en merge |
| Guards sin finally | _running=true sin finally bloqueaba permanente | TODO guard DEBE liberarse en finally |
| SAC dropdown fuera | position:absolute en SideSheet | position:fixed + getBoundingClientRect |
| lotesStock no persistía | faltaba en DEFAULTS | Añadir a DEFAULTS en cada nueva key |
| Tombstones perdidos | Set en memoria | Persistir localStorage con TTL 90 días |
| Gastos duplicados | Sin dedup-by-id | Aplicar patrón addVenta a todos setters |
| FIFO vaporware | Comentarios sin implementación | crearLotesDesdeItems + consumirLotesFIFO |
| Merma invisible contabilidad | addMerma no impactaba cuentas | Crea gastoOp categoría Mermas |
| CURRENT_CACHE desincronizado | Bump olvidaba CURRENT_CACHE L154 | 5 puntos de bump en index.html |

---

## CAMBIOS SESIÓN v1.3.1132

- **v1.3.1119-1125:** Estrategia B subcolecciones + SyncAhora + cola pendientes
- **v1.3.1126:** SKIP guard O(1) handler subcolecciones
- **v1.3.1127:** Watchdog 30s `_isSaving`
- **v1.3.1128:** save() early return si applyingRemote
- **v1.3.1129:** refresh() setters con guard applyingRemote (revertido throttle 10s)
- **v1.3.1130:** Protocolo origen: single-flight debounce 500ms + logs `[SAVE_ORIGIN]` + `[SAVE]`
- **v1.3.1131:** Emits post-merge con setTimeout(150) para mantener flag durante Bus async
- **v1.3.1132:** Re-agendar save 1s si aborta por guard temporal (evita huérfanos)

---

## LOYVERSE — DATOS

- **Proxy Cloud Function:** `https://europe-west1-dashwey-project.cloudfunctions.net/loyverseProxy`
- **Plan:** Free (250 tickets/página con cursor, acepta `created_at_min`)
- **Dataset actual:** 2695 ventas totales, 230 del 23 abr (suma 372.54€)

---

*Actualizar versión y pendientes al cerrar cada sesión.*
