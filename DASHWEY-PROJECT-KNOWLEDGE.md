# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## ESTADO ACTUAL

**Versión:** v1.3.742-dev
**Plataforma:** APK Android via Capacitor + WebView
**Deploy:** GitHub Pages → `server.url` en `capacitor.config.json`
**Usuarios:** Reales en producción — cero regresiones toleradas
**Package:** `com.dashwey.app`

---

## ARQUITECTURA

```
index.html (~34.500 líneas) — SPA monolítica completa
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
- `position: fixed` para dropdowns — nunca `position: absolute` dentro de SideSheet
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

### Sync entre dispositivos
- `_writeFirebase` = write directo — NO añadir `fb.read()` antes (condición de carrera)
- Merge de arrays acumulativos: solo en recepción (`onSnapshot`) con `_mergeById`
- `resetHash()` tras aplicar onSnapshot → fuerza que estado fusionado suba a Firebase
- Arrays mergeables: `['ventas','cuentas','gastosOp','ingresosFin','historialPedidos','mermas','pendingOrders','visitasComerciales','cierresCaja','lotesStock']`

### FCM Push Notifications
- VAPID key: `BDck5vcqwviHaMHXNeGoLTouXCKeZEd4dD39a0wVFmhfTTR70DjpZLfSGNTmRcFX3ABG9ssodnNzOHcRpRsRbHs`
- Service Account: `firebase-adminsdk-fbsvc@dashwey-project.iam.gserviceaccount.com`
- `window._DashweyFCM.sendToOthers(title, body, data)` — envía a todos los dispositivos excepto el actual
- Triggers: venta TPV + pedido confirmado → `sendToOthers`
- APK: pendiente compilar — Gradle 8.2 incompatible con JVM 21 → subir a Gradle 8.7
- Android project: `C:\Users\Hung\dashwey-app\android\`

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

### Alertas en app (ex-Notificaciones)
- Renombrado en v1.3.739 — solo items reales: "Novedades" + "Pedido confirmado"
- Items eliminados (sin background scheduling): cierre diario, mensual, anual, entrega, caducidad

### FIFO valorStock (v1.3.742)
- `State.lotesStock[]` — `{ prodId, qty, costeUnit, fecha }`
- `FinEngine.crearLotesDesdeItems(items, fecha)` — al confirmar pedido
- `FinEngine.consumirLotesFIFO(prodId, qty)` — al vender en TPV
- `valorStock()` — suma lotes activos; fallback a precio actual si no hay lotes
- Triggers: `_ldcAbrirDetallePedido` + `procesarPago`

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

### Gastos globales
- `gastoMensualTotal()` → solo `gastosOp` prorateados (para `beneficioNeto`, `runway`)
- `gastoGlobalPeriodo(range)` → `gastosOp` + compras + mermas (para UI de FC)

### SAC Dropdown
- `#sac-global-dd` → `position: fixed` — no cambiar a `absolute`
- `_sacPositionDd` usa `getBoundingClientRect()` + `visualViewport`

### Gráfica X — snap cards
- `_snapRenderChart`: usa `_xIdxSet` (Set de índices explícitos)
- Horas: `Set([0,6,12,18])` — Mes: `Set([0,7,14,21])` — Semana/Año: null

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
|---|---|---|---|
| 14 | TPV | Resumen post-cobro | 🟢 |
| 15 | TPV | Historial ventas del día desde TPV | 🟢 |
| 21 | Sistema | Push APK — Gradle 8.7 pendiente | 🔵 WIP |
| — | Seguridad | Firestore Security Rules | ⚠️ CRÍTICO |

---

## HISTORIAL DE BUGS CRÍTICOS — NO REPETIR

| Bug | Causa | Regla |
|-----|-------|-------|
| App no arranca | Llaves desbalanceadas | Contar llaves manualmente |
| App no arranca | `try` sin `catch/finally` al eliminar bloque JS | Mapear estructura try/finally antes de eliminar |
| App no arranca | FCM `_DashweyRegisterFCM` con `try` roto | Verificar estructura completa del bloque FCM |
| Sync roto | `read-merge-write` en `_writeFirebase` | Write directo — merge solo en onSnapshot |
| Solo 1 cuenta visible | Write de A sobreescribía datos de B | `resetHash()` + merge en onSnapshot |
| onclick falla en WebView | `&apos;` mal escapado → `''` concatenados | Usar `&apos;` correctamente o `data-*` attrs |
| valorStock retroactivo | `valorStock()` usaba precio actual | FIFO `lotesStock` v1.3.742 |
| Tarjeta caducidades SyntaxError | Eliminar bloque interno dejó `try` sin cerrar | Mapear y eliminar en orden de mayor a menor índice |
| Ripple en grupo entero | `transform:scale` sin `isolation: isolate` | `.sd-group` necesita `isolation: isolate` |
| Funciones muertas | Declaradas después del `return{}` del IIFE `alm` | Insertar siempre antes del `return{}` |
| `confirm()` nativo | Bloqueado en WebView | `window._showDestructiveConfirm()` |
| SAC dropdown fuera de lugar | `position:absolute` dentro de SideSheet | `position:fixed` + `getBoundingClientRect()` |

---

*Actualizar versión y pendientes al cerrar cada sesión.*
