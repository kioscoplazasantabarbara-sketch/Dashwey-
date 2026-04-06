# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## ESTADO ACTUAL

**Versión:** v1.3.574-dev
**Plataforma:** APK Android via Capacitor + WebView
**Deploy:** GitHub Pages → `server.url` en `capacitor.config.json`
**Usuarios:** Reales en producción — cero regresiones toleradas

---

## ARQUITECTURA

```
index.html (~34.840 líneas) — SPA monolítica completa
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
- **Dashboard** — KPIs, landscape feed, snap cards, FinEngine
- **Ajustes** — SideSheet stack, settings drawer, equipo, permisos

## ROADMAP (no romper compatibilidad)

- **Hogar** — módulo futuro de finanzas personales
- **Cartera** — módulo futuro de seguimiento de inversiones
- **Ecosistema Multi-App** — ver sección dedicada abajo

---

## ECOSISTEMA MULTI-APP — VISIÓN Y ARQUITECTURA

### Concepto
Un solo `index.html` desplegado en GitHub Pages genera N aplicaciones
distintas en Play Store, diferenciadas únicamente por el parámetro `?mode=`
en el `server.url` del `capacitor.config.json` de cada APK.

```
index.html (GitHub Pages — un solo deploy)
        │
        ├── ?mode=hub   → Dashwey HUB   → propietario/manager
        ├── ?mode=pos   → Dashwey POS   → cajero
        ├── ?mode=alm   → Dashwey ALM   → mozo de almacén
        └── ?mode=cfo   → Dashwey CFO   → contable/gestor externo
```

### Modos definidos

| Modo | App Play Store | Rol target | Módulos visibles |
|------|---------------|------------|-----------------|
| `hub` (sin param) | Dashwey HUB | Propietario / Manager | Todo |
| `pos` | Dashwey POS | Cajero | Solo TPV |
| `alm` | Dashwey ALM | Mozo almacén | Solo Almacén |
| `cfo` | Dashwey CFO | Contable / Gestor | Solo Dashboard + Finanzas |

### Cómo funciona técnicamente

**1. Detección del modo** — en el HEAD script, antes del primer render:
```javascript
const _appMode = new URLSearchParams(location.search).get('mode') || 'hub';
document.body.setAttribute('data-app-mode', _appMode);
window._DASHWEY_MODE = _appMode;
```

**2. CSS por modo** — `body[data-app-mode="pos"]` oculta tabs innecesarios,
ajusta layout, elimina opciones de menú. CSS puro — cero JS adicional.

**3. Lógica por modo** — `nav` y `ui` leen `window._DASHWEY_MODE` al arrancar
para forzar el tab correcto y filtrar el menú de ajustes.

**4. Doble barrera de seguridad:**
- **Capa 1 (UX):** modo oculta módulos en la interfaz
- **Capa 2 (backend):** Firebase Auth + roles bloquean datos independientemente

### Seguridad — capas

```
CAPA 1 — ?mode=X         UX — oculta módulos. Saltable por técnicos.
CAPA 2 — canAccess()     Lógica JS — bloquea funciones. Saltable con acceso a código.
CAPA 3 — Firebase Auth   Backend Google — sin token válido, sin datos. NO saltable.
CAPA 4 — Firestore Rules Backend Google — define quién lee/escribe qué. NO saltable.
```

### Estado de implementación

| Feature | Estado |
|---------|--------|
| Roles y `canAccess()` | ✅ implementado |
| Login con email | ✅ implementado |
| Sync Firebase tiempo real | ✅ implementado |
| Gestión de equipo en HUB | ✅ implementado |
| `?mode=pos/alm/cfo` — UI y lógica | ✅ implementado v1.3.382 |
| Firestore Security Rules endurecidas | ⏳ pendiente — crítico antes de Play Store |

---

## REGLAS CRÍTICAS — NUNCA VIOLAR

### Android WebView
- `backdrop-filter` falla dentro de ancestro con `transform` → no combinar
- `transitionend` unreliable → siempre fallback `setTimeout` 350-400ms
- `IntersectionObserver` unreliable → usar `getBoundingClientRect`
- `confirm()` BLOQUEADO → usar `window._showDestructiveConfirm()`
- HTTP cache puede bypassar SW → `Cache-Control: no-cache` en fetch handler
- Haptic: NUNCA durante scroll frames → solo en `touchend`/`scrollend`
- Inline handlers con `\'id\'` backslash-escaped fallan silenciosamente → usar `data-*` attrs
- `scroll-snap-stop: always` en snap items del contenedor OK — bloquea salto de múltiples tarjetas. NUNCA en elementos con scroll interno propio
- Animaciones: SOLO `transform` + `opacity` → nunca `width/height/top/left`
- Snap CSS siempre scoped a `body[data-tab="X"]`

### Código
- `window.App = App` OBLIGATORIO — sin esto la app muere silenciosamente
- IIFE de `alm` tiene `return{}` al final → insertar funciones SIEMPRE antes de él
- `display:none` como base CSS para elementos JS-toggled — nunca `display:flex`
- Strings: Python `h.replace(old, new, 1)` — NUNCA `str_replace` en bloques con backticks
- NUNCA `confirm()` nativo → `window._showDestructiveConfirm()`
- NUNCA `border-top: solid var(--red)` en headers de modales
- NUNCA `transform: scale` en `.sd-row:active` sin `isolation: isolate` en el padre
- NUNCA animar `height/width/top/left` → solo `transform` y `opacity`
- `will-change` solo en `.open`/`.animating` → nunca permanente en CSS base
- NUNCA `visibility:hidden` como atributo inline en `<html>` → usar `<style id>` eliminable por JS
- NUNCA animación de entrada sin `animation-fill-mode: forwards`
- NUNCA `triggerHaptic` en bloque `catch` → bypasea `_isHapticAllowed()` y debounce
- NUNCA emojis multicolor en UI de datos
- NUNCA escribir `data-app-mode` en `body` desde HEAD — usar `document.documentElement`
- NUNCA hardcodear tab inicial (idx===1) en `_initTrack` — leer `window._DASHWEY_MODE`
- El bump de versión debe actualizar EXACTAMENTE 4 archivos: `index.html`, `sw.js CACHE_NAME`, `version.json`, `version.txt`
- CSS de modos de app SIEMPRE en `html[data-app-mode="X"]` — nunca `body[data-app-mode]`
- NUNCA mismo componente visual implementado diferente en dos módulos sin justificación
- NUNCA usar el índice del `.map()` post-`filter()` como referencia a arrays de estado — preservar siempre el índice original como propiedad explícita del objeto resultante (`{ p, originalIdx }`) — crea inconsistencia UX acumulativa (aprendido en A-3: PTR Dashboard vs PTR Almacén)

### Búsqueda global obligatoria
- Si se reporta un bug en función X → buscar el mismo patrón en TODA la app antes de parchear
- Contar ocurrencias totales y citarlas antes de pedir GO
- Un fix parcial que deja instancias sin corregir es peor que no hacer nada

---

## SISTEMAS IMPLEMENTADOS

### UI & Animación
- **Ripple M3** — `.ripple-surface` + `initRipple()` IIFE, transition-based
- **Sheet system** — `--sheet-radius:28px`, `--sheet-spring`, scrim `rgba(0,0,0,0.32)`
- **SideSheet stack** — `window.SideSheet.open/back/closeAll()`, max 1 panel activo, swipe-to-close, overlay dinámico `ss-overlay`
- **Animación tokens** — `--ease-standard/accelerate/decelerate/enter/exit`, `--dur-micro:120ms/std:220ms/emphasis:340ms`
- **Skeleton screens** — `.sk`, `.skeleton` + `Utils.showSkeleton/hideSkeleton`
- **Dark mode** — `--red:#B84C5C`, `--ink:#E8E3E3` en OLED
- **Energy saver** — `window._DashweyEnergySaver.set(true/false)`
- **FOUC guard** — `<style id="dashwey-fouc-guard">` eliminado por JS

### Gestos & Input
- **Haptic M3** — `Utils.triggerHaptic()` con 16 tipos: `selection/impact/success/error` + `edgeSqueeze/edgeRelease/longPress/dragCrossing/collision/gestureStart/End/reject`
- **Swipe nav** — `swipe-track`, umbral 90px o vel >0.5px/ms, resistencia elástica sub-umbral, `_isAnySheetOpen()` bloquea si hay overlay
- **PTR Dashboard** — pill "Sincronizando…" con fade opacity gradual
- **PTR Almacén** — pill "Sincronizando…" con fade opacity gradual (alineado con Dashboard en v1.3.560)
- **Collapsing headers** — `hdr-compact` via scroll listener + rAF throttle

### Formularios
- **Destructive confirm** — `window._showDestructiveConfirm({title, message, confirmText, onConfirm})`
- **Field validation** — `window._validateField(input, {required, min, email, minLen})`
- **Form tracking** — `window._trackFormChanges(formEl, draftKey)` + auto-save 30s

### DashweyBus
- `DashweyBus.emit(event, payload)` — batching con `setTimeout(0)`, deduplicación por evento en mismo tick
- `DashweyBus.emitSync(event, payload)` — inmediato, con guard anti-recursión `_emitSyncDepth`
- `DashweyBus.on/off(event, handler)` — sin duplicados
- Eventos: `venta · pedido · stock · cuenta · gasto · ingreso · visita · proveedor · periodo · full`

### Utils API
```js
Utils.formatDate/Time/Currency(...)   // localizado por idioma del perfil
Utils.getErrorMessage(error)          // mensajes amigables ES/EN
Utils.getImagePlaceholder(icon)       // SVG data URI
Utils.triggerHaptic(type)             // motor háptico M3
Utils.updateSyncBadge(mode)           // offline/syncing/synced/error
Utils.showToast(msg)
Utils.showSkeleton(id, rows, type)    // 'card'|'item'|'form'
Utils.hideSkeleton(id)
Utils.openPeriodSheet(config)         // period picker global reutilizable
```

### Tokens CSS principales
```css
--ease-standard:   cubic-bezier(0.2, 0, 0, 1)
--ease-enter:      cubic-bezier(0.05, 0.7, 0.1, 1.0)
--dur-micro: 120ms  --dur-std: 220ms  --dur-emphasis: 340ms
--sheet-duration: 0.28s
--r-sm:8px  --r-md:12px  --r-lg:16px  --r-xl:22px  --r-pill:50px
--btn-h:52px  --btn-h-sm:40px
```

---

## PROTOCOLO DE TRABAJO

**FLUJO OBLIGATORIO:**
1. Leer código real antes de opinar
2. Identificar causa raíz con línea exacta
3. Buscar TODAS las ocurrencias del patrón — citarlas antes de pedir GO
4. Consultar si hay ambigüedad de negocio
5. Esperar GO explícito
6. Ejecución quirúrgica — cambio mínimo viable
7. Validar sintaxis (`node --check`) antes de entregar

**VALIDACIÓN ANTES DE ENTREGAR — OBLIGATORIA:**
```python
import subprocess, re
with open('index.html', 'r') as f:
    content = f.read()
scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', content, re.DOTALL)
combined = '\n'.join(scripts)
with open('/tmp/b.js', 'w') as f:
    f.write(combined)
r = subprocess.run(['node', '--check', '/tmp/b.js'], capture_output=True)
print("OK" if r.returncode == 0 else r.stderr.decode())
```

**VERSIONADO — sincronizar en 4 archivos:**
- `index.html` → `replace(old, new)` SIN límite — TODAS las ocurrencias (title, _APP_VERSION, _WN_CHANGELOG keys)
- `sw.js` → `CACHE_NAME: dashwey-v1-3-XXX-dev`
- `version.json` → `{"version": "1.3.XXX-dev"}`
- `version.txt` → `1.3.XXX-dev`
- ⚠️ VERIFICAR: `_APP_VERSION` en index.html debe coincidir exactamente con `version.json` antes de entregar

**ZIP de entrega:** `dashwey-{version}.zip` con los 5 archivos + este `.md` + `AUDITORIA_DEUDA_TECNICA.md`

---

## DEUDA TÉCNICA — ESTADO v1.3.566

**Deuda total estimada:** ~254 líneas (0,73%) — estado CONTROLADO.

### Dead code pendiente de eliminar (Fase B)

| ID | Función | Línea aprox. | Líneas | Riesgo | Acción |
|----|---------|-------------|--------|--------|--------|
| DC-10 | `_setCardPeriod` | ~L18061 | 7 | BAJO | Verificar `_getCardPeriods` antes |
| DC-11 | `_catRefreshItem` | ~L28039 | 1 | BAJO | Eliminar directamente |
| DC-12 | `_DashweyTests` | ~L34070 | 95 | BAJO | Mover a archivo separado o eliminar del APK |

### Stubs activos con callers (Fase C — no tocar hasta clean install APK)

`_catLpStart`, `_catLpEnd`, `openCatalogoPicker`, `_switchAgendaTab`,
`_updateMainBtn`, `clearMainSearch`, `_guardarCarritoYPopup`, `_activarComprobacion`

### Limitación conocida documentada
- **CheckModal `Set` checked** no persiste en resume >30s — el `Set` de JS no es serializable. Comportamiento por diseño, no parcheable sin cambio arquitectónico.

---

## PENDIENTES

- **Firestore Security Rules** — endurecer antes de Play Store ⚠️ CRÍTICO
- ~~**TPV-A1**~~ — ✅ resuelto en v1.3.574-dev
- **TPV-A2** — `cobro-total-num` no se actualiza si `chgQ` con cobro abierto en tablet (⚠️ ALTO)
- **TPV-M1** — `_tpvFlyToCart` fallback pill usa `left/top` directo en vez de `transform` (MEDIO)
- **TPV-B1** — `animationend` en flash del dock sin fallback timeout (BAJO)
- ✅ **CSS dead code auditado** — 720 líneas eliminadas en v1.3.571 (grupos: orden-*, card-period-*, po-card-*, prov-prod-*, kpi-*, bn-*, rv-*, rank-*, top-*, ds-list-*, merma-*, ns-*, art-toggle-*, skeleton-card/chart/item/list, fin-kpi/hero-amount/label/ia-*, ia-*, fc-sparkline-*, ventas-prod-*, visita-*, ta-header-*, pe-period-*, bar-chart-*, tpv-cats-*, alm-confirm-*/hdr-*/summary-*)
- ⏳ **CSS dudoso pendiente** — settings-row (selector compartido), ss-row, alm-banner/dock/prov parciales, snap-fc parcial, pedcal parcial
- Módulo **Hogar** — finanzas personales (roadmap)
- Módulo **Cartera** — seguimiento de inversiones (roadmap)
- Stagger en listas (Capa 3 motion) — pendiente

---

## HISTORIAL DE BUGS CRÍTICOS — NO REPETIR

| Bug | Causa | Regla |
|-----|-------|-------|
| App no arranca | `onConfirm: function(){}` con llaves desbalanceadas | Contar llaves manualmente al envolver código existente |
| App no arranca | Apóstrofe sin escapar en string JS | Usar comillas dobles externas o escapar `\'` |
| App no arranca | `addEventListener` sin `})` de cierre | Verificar cierre de cada callback |
| App no arranca | Doble declaración de función por replace fallido | Verificar que el old string matchea exactamente |
| Ripple en grupo entero | `transform:scale` en `.sd-row:active` sin `isolation` | `.sd-group` necesita `isolation: isolate` |
| Skeleton permanente | `showSkeleton` sobreescribe innerHTML del contenedor | No usar en contenedores con hijos propios |
| Funciones muertas | Declaradas después del `return{}` del IIFE de `alm` | Insertar siempre antes del `return{}` |
| onclick inline falla | `\'id\'` en atributos inline de WebView | Usar `data-*` attrs + `addEventListener` |
| Destello blanco al volver | `visibility:hidden` inline — WebView lo re-aplica al recompositar | Usar `<style id="fouc-guard">` eliminable por JS |
| Destello blanco appFadeIn | Sin `animation-fill-mode:forwards` | Toda animación de `#app` necesita `forwards` |
| Haptic inconsistente | `catch` llamaba `triggerHaptic` bypaseando guards | NUNCA triggerHaptic en catch |
| `will-change` permanente | GPU layers siempre activos → memoria/batería | Solo en `.open`/`.animating` |
| `confirm()` nativo | Bloqueado silenciosamente en WebView | Siempre `window._showDestructiveConfirm()` |
| Insight siempre igual en refresh | `_startInsightRotation` siempre empezaba en índice 0 | `_insightIdx{}` persiste último índice — cada refresh avanza al siguiente |
| PTR no actualiza snap cards | `refresh()` solo llamaba `_snapRenderCard(_activeCardId)` — una tarjeta, sin animación en las demás | Reemplazar por `_snapLastRenderedCardId=null` + `_snapDoRenderAll()` — todas las tarjetas con contadores animados |
| Snap salta múltiples tarjetas | `scroll-snap-stop: normal` permite que swipe largo skip snap points intermedios | Cambiar a `always` en `.card` — detención obligatoria en cada tarjeta. Cajones internos no afectados |
| Cajón FC scroll bloqueado | `overscroll-behavior-y: contain` en `.snap-fc-scroll` impedía propagación al snap padre | Cambiar a `auto` — chaining nativo: scroll cajón → snap tarjeta al llegar al límite |
| Margen erróneo en snap cards | `mgBruto` usaba `revenue()` que incluye `ingFin` → denominador inflado; `margenMedio` usaba `precioCompra` directo sin prorratear `udsCaja` | Fix 1: `_vtaTPV` separado para mgBruto. Fix 2: `_calcMargenProd` para margenMedio |
| PTR Almacén sin fade | PTR Dash y PTR Alm implementados diferente | Mismo componente visual = mismo comportamiento (corregido v1.3.560) |
| Swipe-delete dock no ejecuta en WebView | `transitionend` unreliable — item desaparecía visualmente pero seguía en `_cart` | Patrón doble-seguro: `_swipeDone` flag + `transitionend` + `setTimeout(350)` — el que llega primero ejecuta, el segundo es no-op (corregido v1.3.574) |
| Hot Grid pins corruptos al borrar producto | `filter(Boolean)` post-map reindexaba slots — `data-slot` apuntaba a posición incorrecta en `_hotPins` | NUNCA usar índice post-filter como referencia a arrays de estado — preservar `originalIdx` explícitamente (corregido v1.3.573) |
| Fallback a función legacy | UI inconsistente, código obsoleto activado | Fallbacks deben fallar silencioso — nunca degradar a legacy |

---

| Banner update eterno | `replace(old,new,1)` solo reemplaza primera ocurrencia — `_APP_VERSION` en L12544 quedó en versión anterior mientras `version.json` avanzaba | El bump de versión debe usar `replace(old,new)` SIN límite de count, y verificar que `_APP_VERSION` coincide con `version.json` antes de entregar |
| CSS selector muerto con coma | `.fin-card-tap:active,` + `.card-REMOVED {` — eliminar selector REMOVED requiere también quitar la coma del selector anterior | Al eliminar un selector de lista CSS siempre limpiar la coma del selector que queda |

---

*Actualizar versión y pendientes al cerrar cada sesión.*
