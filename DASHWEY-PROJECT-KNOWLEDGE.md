# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## ESTADO ACTUAL

**Versión:** v1.3.874-dev
**Plataforma:** APK Android via Capacitor + WebView
**Deploy:** GitHub Pages → `server.url` en `capacitor.config.json`
**Usuarios:** Reales en producción — cero regresiones toleradas
**Package:** `com.dashwey.app`

---

## ARQUITECTURA

```
index.html (~35.800 líneas) — SPA monolítica completa
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
ui         → modales, sheets, overlays, settings
nav        → navegación entre tabs
dash       → Dashboard KPI + landscape feed
tpv        → Punto de Venta
alm        → Almacén e inventario
tpvQG      → Quick Grid TPV
```

**Bus de eventos:** `DashweyBus.emit/on`
**Entry point:** `window.App` — OBLIGATORIO, nunca solo `const App`

**Stack:** Vanilla JS/HTML/CSS · Firebase Firestore · localStorage · Capacitor · Service Worker
**Prohibido siempre:** TypeScript · React/Vue · Jest · ES6 modules · bundlers

---

## MÓDULOS ACTIVOS

- **TPV** — motor de venta directa + Hot Grid Pins + Quick Grid
- **Almacén** — stock, catálogo inline, proveedores, pedidos, check modal
- **Dashboard** — KPIs, landscape feed, snap cards (rendimiento/compras/flujo-caja/agenda), FinEngine
- **Ajustes** — SideSheet stack, settings drawer, equipo, permisos

## ROADMAP (no romper compatibilidad)

- **Hogar** — módulo futuro de finanzas personales
- **Cartera** — módulo futuro de seguimiento de inversiones
- **Ecosistema Multi-App** — ver sección dedicada abajo

---

## ECOSISTEMA MULTI-APP — VISIÓN Y ARQUITECTURA

Un solo `index.html` en GitHub Pages genera N apps por `?mode=` en `capacitor.config.json`.

| Modo | App | Rol | Módulos |
|------|-----|-----|---------|
| `hub` | Dashwey HUB | Propietario/Manager | Todo |
| `pos` | Dashwey POS | Cajero | Solo TPV |
| `alm` | Dashwey ALM | Mozo almacén | Solo Almacén |
| `cfo` | Dashwey CFO | Contable | Solo Dashboard+Finanzas |

| Feature | Estado |
|---------|--------|
| Roles y `canAccess()` | ✅ |
| Login con email | ✅ |
| Sync Firebase tiempo real | ✅ |
| Gestión de equipo | ✅ |
| `?mode=pos/alm/cfo` | ✅ v1.3.382 |
| Firestore Security Rules endurecidas | ⏳ CRÍTICO antes de Play Store |

---

## REGLAS CRÍTICAS — NUNCA VIOLAR

### Android WebView
- `backdrop-filter` falla dentro de ancestro con `transform` → no combinar
- `transitionend` unreliable → siempre fallback `setTimeout` 350-400ms
- `IntersectionObserver` unreliable → usar `getBoundingClientRect`
- `confirm()` BLOQUEADO → usar `window._showDestructiveConfirm()`
- Haptic: NUNCA durante scroll frames → solo en `touchend`/`scrollend`
- Inline handlers con `\'id\'` backslash-escaped fallan silenciosamente → usar `data-*` attrs
- Animaciones: SOLO `transform` + `opacity` → nunca `width/height/top/left`
- Snap CSS siempre scoped a `body[data-tab="X"]`
- `position: fixed` para overlays — NUNCA dentro de ancestro con `overflow:hidden` o `transform`
- HTTP cache puede bypassar SW → `Cache-Control: no-cache` en fetch handler

### Código
- `window.App = App` OBLIGATORIO — sin esto la app muere silenciosamente
- IIFE de `alm` tiene `return{}` al final → insertar funciones SIEMPRE antes de él
- `display:none` como base CSS para elementos JS-toggled — nunca `display:flex`
- Strings: Python `h.replace(old, new, 1)` — NUNCA `str_replace` en bloques con backticks
- NUNCA `confirm()` nativo → `window._showDestructiveConfirm()`
- NUNCA animar `height/width/top/left` → solo `transform` y `opacity`
- `will-change` solo en `.open`/`.animating` → nunca permanente en CSS base
- NUNCA `triggerHaptic` en bloque `catch`
- NUNCA emojis multicolor en UI de datos
- Bump de versión: EXACTAMENTE 4 archivos: `index.html`, `sw.js CACHE_NAME`, `version.json`, `version.txt`
- CSS de modos: SIEMPRE en `html[data-app-mode="X"]` — nunca `body[data-app-mode]`
- Al eliminar bloques JS dentro de `try/finally` → verificar que el `try` exterior sigue válido
- onclick inline → usar `&apos;` para comillas simples, nunca `''` concatenados
- Todo guard `_running = true` DEBE tener `finally { _running = false }` — nunca liberar en línea secuencial

### Auth y Layout
- `#auth-screen` SIEMPRE fuera de `<div id="app">` — hermano directo en `body`
- `overflow:hidden` en `#app` destruye `position:fixed` en Android WebView
- `resetStorage()` SOLO en `doReset()` y `authRegister()` — NUNCA en `authLogout()` ni `authLogin()`

### Sync Firebase — CRÍTICO
- `_DashweyInitialSyncDone = false` al arrancar y en `authLogin`
- `_DashweyInitialSyncDone = true` solo cuando `_doInitialSync` completa exitosamente
- En `save()`: si Firebase activo pero `!_DashweyInitialSyncDone` → solo escribir localStorage, NO Firebase
- Guard en `save()`, NO en `fb.write()` — es el punto correcto y sin efectos secundarios
- `_writeFirebase` = write directo — NO añadir `fb.read()` antes (condición de carrera)
- Merge de arrays acumulativos: solo en recepción (`onSnapshot`) con `_mergeById`
- `resetHash()` tras aplicar onSnapshot → fuerza que estado fusionado suba a Firebase
- Arrays mergeables: `['ventas','historialPedidos','mermas','pendingOrders','cierresCaja']`
- Datos mutables (cuentas, gastos, ingresos): last-write-wins, NO en `_MERGE_KEYS`

### Búsqueda global obligatoria
- Bug en función X → buscar mismo patrón en TODA la app antes de parchear
- Citar ocurrencias totales antes de pedir GO

---

## SISTEMAS IMPLEMENTADOS

### Dashboard — Snap Cards activas
- `rendimiento` — ventas, margen, hora pico
- `compras` — pedidos, stock
- `flujo-caja` — saldo, ingresos/gastos, runway. Botón `+ Movimiento` = rojo crimson
- `agenda` — 3 pestañas: Alertas / Entregas / Eventos
- ~~`caducidades`~~ — **ELIMINADA v1.3.742** (contenido en pestaña Alertas de Agenda)

### Dashboard — Agenda
- **Alertas** (default): `_snapRenderAlertasEnAgenda()` — sin stock, bajo mínimo, caducidades
- **Entregas**: pedidos programados pendientes
- **Eventos**: ex-Visitas Comerciales. State: `visitasComerciales` (NO renombrar). UI: "Eventos"

### FIFO valorStock (v1.3.742)
- `State.lotesStock[]` — `{ prodId, qty, costeUnit, fecha }`
- `FinEngine.crearLotesDesdeItems(items, fecha)` — al confirmar pedido
- `FinEngine.consumirLotesFIFO(prodId, qty)` — al vender en TPV
- `valorStock()` — suma lotes activos; fallback a precio actual si no hay lotes

### Modelo de precios
- `p.precioCompra` = precio por **BULTO**
- `p.pvp` = precio por **UNIDAD**
- `p.udscaja` = unidades por bulto
- `cu = precioCompra / udscaja` — NUNCA comparar sin prorratear

### Fórmula financiera universal
```
cu = precioCompra / udsCaja
pvpNeto = pvp / (1 + iva%)
mg = (pvpNeto - cu) / pvpNeto × 100
```

### SAC Dropdown
- `#sac-global-dd` → `position: fixed` — no cambiar a `absolute`
- `_sacPositionDd` usa `getBoundingClientRect()` + `visualViewport`

### FCM Push Notifications
- VAPID key: `BDck5vcqwviHaMHXNeGoLTouXCKeZEd4dD39a0wVFmhfTTR70DjpZLfSGNTmRcFX3ABG9ssodnNzOHcRpRsRbHs`
- `window._DashweyFCM.sendToOthers(title, body, data)` — envía a todos menos el dispositivo actual
- APK: pendiente compilar — Gradle 8.2 incompatible con JVM 21 → subir a Gradle 8.7

---

## PROTOCOLO DE TRABAJO

**FLUJO OBLIGATORIO:**
1. Leer código real antes de opinar
2. Identificar causa raíz con línea exacta
3. Buscar TODAS las ocurrencias — citarlas antes de pedir GO
4. Consultar si hay ambigüedad de negocio
5. Esperar GO explícito
6. Ejecución quirúrgica — cambio mínimo viable
7. Validar sintaxis (`node --check`) antes de entregar

**VALIDACIÓN OBLIGATORIA:**
```python
import subprocess, re
with open('index.html') as f:
    content = f.read()
scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', content, re.DOTALL)
with open('/tmp/b.js', 'w') as f:
    f.write('\n'.join(scripts))
r = subprocess.run(['node', '--check', '/tmp/b.js'], capture_output=True)
print('OK' if r.returncode == 0 else r.stderr.decode())
```

**VERSIONADO — 4 archivos:**
- `index.html` → `_APP_VERSION` + título
- `sw.js` → `CACHE_NAME: dashwey-v1-3-XXX-dev`
- `version.json` → `{"version": "1.3.XXX-dev"}`
- `version.txt` → `1.3.XXX-dev`

---

## PENDIENTES

| # | Área | Pendiente | Prioridad |
|---|------|-----------|-----------|
| 1 | UI | Dot rojo fantasma en tarjeta Agenda — no encontrado en código, requiere DevTools APK debug | 🟠 Importante |
| 2 | Seguridad | Firestore Security Rules endurecidas | ⚠️ CRÍTICO antes de Play Store |
| 3 | Push | APK FCM — Gradle 8.7 pendiente compilar | 🔵 WIP |

### Cambios sesión v1.3.867–v1.3.869
- **v1.3.867** — FIX: `authLogout()` dejaba `_DashweySavingCtrl.isSaving = true` sin liberar → `save()` bloqueado permanentemente hasta reload tras logout+login en la misma sesión. Fix: liberar `isSaving = false` antes del toast de cierre.
- **v1.3.868** — FIX CRÍTICO lógica financiera: transferencias inflaban `revenue()`, `beneficioNeto` y `gastoMensualTotal()`. Fix: añadido `tipo: 'transferencia'` a los movimientos espejo (addGasto + addIngreso), excluidos en `revenue()` y `gastoMensualEq()`. Ídem para `tipo: 'ajuste'` en `revenue()`.
- **v1.3.874** — FEAT core financiero + TPV:
  (1) Cuentas: eliminados botones inline +Ingreso/Borrar → botón "Editar ›" abre _openEditCuentaSheet. Formulario nueva cuenta en FS dedicado (_openAddCuentaFs). _confirmBorrarCuenta intacto.
  (2) Modal +Movimiento: _openMovimientoFullscreen() — FS fullscreen con calculadora custom (_buildCalcPad), sin teclado nativo. _confirmarMovimiento sin cambios (mismos IDs).
  (3) TPV: _guardarComoArticuloYAnadir() — crea artículo real en Almacén (trackStock:false) y lo añade al ticket activo. openManualSale mantiene flujo existente.
  BLOQUEADOS: migración iconos, edición retroactiva movimientos (ver DISEÑO-ICONOS-MOVIMIENTOS.md).
- **v1.3.873** — FEAT Almacén/Pedidos programados:
  (1) Long press en artículo del pedido → modal edición qty/precio/eliminar.
  (2) Botón ⊕ Impuestos en pedido: panel con RE (5.2%), Punto Verde, impuesto adicional, total recalculado en tiempo real.
  (3) Botón 📤 Compartir: texto WhatsApp-ready vía navigator.share o clipboard.
  (4) Banner "Añadir artículo" al final del catálogo inline → openNuevoArtFs().
  (5) Toggle seguimiento de stock (ftrack) en formulario nuevo artículo → campo trackStock en prod; TPV respeta trackStock !== false.
  (6) Eliminado toggle RE (Recargo de Equivalencia) del formulario nuevo artículo.
- **v1.3.872** — FIX: (1) Imagen artículo: emoji 📦 reemplazado por SVG neutro en formularios nuevo/editar. CSS `alm-photo-emoji` con `display:flex` para centrado correcto. (2) Sin bug real en saldo 0€ — el dirty-check y State manejan 0 correctamente.
- **v1.3.871** — FIX Almacén/Dashboard: (1) Banner borrador insertado dentro de `.alm-form-body` en vez del primer hijo de `#fs-content` — ya no tapa el header. (2) `_movTipo` se resetea a `gasto` al abrir el sheet — evita que el tipo anterior persista. (3) `_snapRenderChart` retorna si `wrap.clientWidth < 4` — evita SVG vacío cuando la tarjeta no es activa. (4) PTR indicators (dash + alm) suben de `z-index:50` a `z-index:300` — visibles por encima de `bottom-tabs` (200).
- **v1.3.870** — FIX UI: `bottom-tabs z-index: 50 → 200` (evita solapamiento con contenido posicionado). `body.keyboard-open .mov-sheet-panel { max-height: 60dvh }` (botón confirmar visible con teclado abierto).
- **v1.3.869** — FIX UX: `scrollIntoView({ behavior: 'smooth' })` en `_onVVResize` causaba doble salto visual al abrir teclado en Android WebView. Cambiado a `behavior: 'instant', block: 'nearest'`.

### Cambios sesión v1.3.860–v1.3.862
- **v1.3.860** — Últimos Movimientos (Flujo de Caja): fecha `dd mmm` a la izquierda de cada fila. Nueva clase CSS `.snap-fc-mov-date`.
- **v1.3.861** — `render()` llama `_snapDoRenderAll()` con guard `body[data-tab="1"]`. Todas las snap cards se actualizan en tiempo real tras pedido, gasto, ingreso, venta, transferencia.
- **v1.3.862** — Gráfico Inversión en Mercancía corregido: usaba `ventasEnPeriodo`, ahora usa `historialPedidos` + `pedidoCoste()`. Cubre todos los tipos de período.
- **v1.3.863** — FIX CRÍTICO: botón "Pedido recibido" (flujo LDC `_ldcAbrirDetallePedido`) no llamaba `addPedido()` — el pedido se eliminaba de `pendingOrders` sin pasar a `historialPedidos`. Fix: guardar en historial + emitir `pedido_stock` antes de `removePendingOrder`.

---

## HISTORIAL DE BUGS CRÍTICOS — NO REPETIR

| Bug | Causa | Regla |
|-----|-------|-------|
| App no arranca | Llaves desbalanceadas | Contar llaves manualmente |
| App no arranca | `try` sin `catch/finally` al eliminar bloque JS | Mapear estructura try/finally antes de eliminar |
| Auth-screen sobre Dashboard | `#auth-screen` dentro de `#app` con `overflow:hidden` → `position:fixed` roto en WebView | `#auth-screen` SIEMPRE fuera de `#app` en body |
| Login mostraba texto `47,0.3);">` | Div del logo partido al mover auth-screen | Verificar integridad HTML tras mover bloques |
| Datos borrados en logout | `authLogout()` llamaba `resetStorage()` + `save()` subía vacío a Firebase | `resetStorage()` NUNCA en logout/login |
| Datos borrados al limpiar almacenamiento | `save()` escribía a Firebase con state vacío antes de `_doInitialSync` | Guard `_DashweyInitialSyncDone` en `save()` |
| Sync roto | `read-merge-write` en `_writeFirebase` | Write directo — merge solo en onSnapshot |
| Solo 1 cuenta visible | Write de A sobreescribía datos de B | `resetHash()` + merge en onSnapshot |
| valorStock retroactivo | `valorStock()` usaba precio actual | FIFO `lotesStock` v1.3.742 |
| Snap cards congeladas tras datos nuevos | `render()` no llamaba `_snapDoRenderAll()` — solo `refresh()` lo hacía | Añadir `_snapDoRenderAll()` al final de `render()` con guard `dataset.tab==='1'` |
| Gráfico Inversión Mercancía incorrecto | `_snapRenderChart` usaba `ventasEnPeriodo` para tarjeta compras | Rama `cardId==='compras'` → `historialPedidos` + `pedidoCoste()` |
| Pedido recibido no llega a Dashboard | Flujo LDC `_ldcAbrirDetallePedido` → botón "Pedido recibido" eliminaba de `pendingOrders` sin `addPedido()` | Añadir `addPedido()` + `DashweyBus.emit('pedido_stock')` antes de `removePendingOrder` |
| Botón "Resetear datos" no funciona en WebView | `confirmReset` usaba `setFs` + `onclick` inline — bloqueado silenciosamente en Android WebView | Reemplazado por `_showDestructiveConfirm` con `onConfirm: doReset` |
| Botón "+ Movimiento" desaparece sin movimientos | `renderFlujoCaja` hacía `return` prematuro al no haber movimientos — el bloque de creación del botón nunca se ejecutaba | Eliminar `return` — mensaje "Sin movimientos" se muestra y el botón se crea siempre |
| Cuentas/gastos borrados vuelven | `cuentas`, `gastosOp`, `ingresosFin` en `_MERGE_KEYS` — `_mergeById` los restauraba | Solo arrays acumulativos en `_MERGE_KEYS` |
| Guards sin finally | `_running=true` sin `finally` bloqueaba formularios permanentemente | TODO guard DEBE liberarse en `finally` |
| Renders crasheaban con item corrupto | forEach sin try/catch interno — un item malo borraba toda la lista | try/catch interno en cada item de render |
| `confirm()` nativo | Bloqueado en WebView | `window._showDestructiveConfirm()` |
| SAC dropdown fuera de lugar | `position:absolute` dentro de SideSheet | `position:fixed` + `getBoundingClientRect()` |
| onclick inline falla | `\'id\'` backslash-escaped en WebView | Usar `data-*` attrs + `addEventListener` |

---

*Actualizar versión y pendientes al cerrar cada sesión.*
