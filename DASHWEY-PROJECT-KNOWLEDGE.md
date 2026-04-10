# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## ESTADO ACTUAL

**Versión:** v1.3.634-dev
**Plataforma:** APK Android via Capacitor + WebView
**Deploy:** GitHub Pages → `server.url` en `capacitor.config.json`
**Usuarios:** Reales en producción — cero regresiones toleradas

---

## ARQUITECTURA

```
index.html (~33.800 líneas) — SPA monolítica completa
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
- Haptic: NUNCA durante scroll frames → solo en `touchend`/`scrollend`
- Inline handlers con `\'id\'` backslash-escaped fallan silenciosamente → usar `data-*` attrs
- Animaciones: SOLO `transform` + `opacity` → nunca `width/height/top/left`
- Snap CSS siempre scoped a `body[data-tab="X"]`
- `position: fixed` para dropdowns posicionados con `getBoundingClientRect()` — nunca `position: absolute` dentro de SideSheet

### Código
- `window.App = App` OBLIGATORIO — sin esto la app muere silenciosamente
- IIFE de `alm` tiene `return{}` al final → insertar funciones SIEMPRE antes de él
- `display:none` como base CSS para elementos JS-toggled — nunca `display:flex`
- Strings: Python `h.replace(old, new, 1)` — NUNCA `str_replace` en bloques con backticks
- NUNCA `confirm()` nativo → `window._showDestructiveConfirm()`
- NUNCA animar `height/width/top/left` → solo `transform` y `opacity`
- `will-change` solo en `.open`/`.animating` → nunca permanente en CSS base
- NUNCA `triggerHaptic` en bloque `catch` → bypasea `_isHapticAllowed()` y debounce
- NUNCA emojis multicolor en UI de datos
- El bump de versión debe actualizar EXACTAMENTE 4 archivos: `index.html`, `sw.js CACHE_NAME`, `version.json`, `version.txt`
- CSS de modos de app SIEMPRE en `html[data-app-mode="X"]` — nunca `body[data-app-mode]`

### What's New — regla crítica
- El `id` del entry más reciente en `_WN_CHANGELOG` DEBE ser único por versión: `'wn-YYYY-MM-DD-vXXX'`
- La clave del entry DEBE coincidir con `_APP_VERSION` actual
- Al hacer bump de versión → actualizar clave del entry + `id` interno + contenido

### Fórmula financiera universal — nunca violar
```
cu = precioCompra / udsCaja          (neto, sin IVA)
pvpNeto = pvp / (1 + iva%)           (neto sin IVA)
mg = (pvpNeto - cu) / pvpNeto × 100
```
Zonas correctas: `_calcMargenProd`, `_buildCatInlineItem`, `openCestaFs`, `build()` openProdDetail, `recalcD`, `_eaRecalc`, `_calcIAAnalysisRun/Ea`, `openCestaFs consolidación`, `_abrirCheckModalById`, `OrderSelector`, `_buildInsightPhrases`, `_openCardInsights`

### Gastos globales — arquitectura
- `gastoMensualTotal()` → solo `gastosOp` prorateados (para `beneficioNeto`, `runway`)
- `gastoGlobalPeriodo(range)` → `gastosOp` + compras Almacén + mermas del rango (para UI de FC)
- `renderFlujoCaja` y `_snapRenderFCDist` usan `gastoGlobalPeriodo`
- `_buildInsightPhrases` y `_openCardInsights` usan `gastoGlobalPeriodo`

### Búsqueda global obligatoria
- Si se reporta un bug en función X → buscar el mismo patrón en TODA la app antes de parchear
- Contar ocurrencias totales y citarlas antes de pedir GO

---

## SISTEMAS IMPLEMENTADOS

### UI & Animación
- **Ripple M3** — `.ripple-surface` + `initRipple()` IIFE, transition-based
- **Sheet system** — `--sheet-radius:28px`, `--sheet-spring`, scrim `rgba(0,0,0,0.32)`
- **SideSheet stack** — `window.SideSheet.open/back/closeAll()`, max 1 panel activo, swipe-to-close
- **Skeleton screens** — `.sk`, `.skeleton` + `Utils.showSkeleton/hideSkeleton`
- **Dark mode** — `--red:#B84C5C`, `--ink:#E8E3E3` en OLED
- **FOUC guard** — `<style id="dashwey-fouc-guard">` eliminado por JS

### Gestos & Input
- **Haptic M3** — `Utils.triggerHaptic()` con 16 tipos
- **Swipe nav** — umbral 90px o vel >0.5px/ms, resistencia elástica
- **PTR Dashboard y Almacén** — pill "Sincronizando…" con fade opacity gradual (alineados v1.3.560)
- **Collapsing headers** — `hdr-compact` via scroll listener + rAF throttle

### Formularios
- **Destructive confirm** — `window._showDestructiveConfirm({title, message, confirmText, onConfirm})`
- **Field validation** — `window._validateField(input, {required, min, email, minLen})`
- **Form tracking** — `window._trackFormChanges(formEl, draftKey)` + auto-save 30s


- `cargosExtra` en pedido: `{ re, puntoVerde, custom:{label,importe} }` — sumado en `pedidoCoste()` y mostrado en `_showSummary`


- `_cmExportarPedidoSheet(items, prov)` — función global para exportar pedido. Llamar desde opciones de cesta y opciones de CheckModal.


- `window._cmExportarPedido(items, prov)` — popup DOM puro, sin innerHTML con logica JS. Disponible desde opciones de cesta y opciones de CheckModal.


- `_showConfirmPopup` ALM-F6: toda la logica en funciones JS declaradas dentro de la funcion — cero innerHTML con codigo Python. makeField() construye inputs como DOM puro.

### SAC Dropdown
- `#sac-global-dd` → `position: fixed` (crítico — no cambiar a `absolute`)
- `_sacPositionDd(k)` y `_sacFilterNa(k, val)` usan `getBoundingClientRect()` + `visualViewport`
- Scroll listener en `fs-content` re-posiciona el dropdown al hacer scroll en el SideSheet

### Dashboard FC
- **Snap card FC** — `_snapRenderFCDist()`: cuentas + movimientos globales (gastosOp + pedidos + mermas + ventas)
- **Cajón modal FC** — `renderFlujoCaja()`: mismos movimientos globales + hash ampliado
- **Colores canónicos movimientos** — `MOV_COLORS`: venta/ingreso=`#16A34A`(+), compra=`#E53935`(−), gasto=`var(--red)`(−), merma=`#F97316`(−)
- **Labels dinámicos** — `snap-lbl-ing-flujo-caja` y `snap-lbl-gst-flujo-caja` actualizados con periodo

### Gráfica X — snap cards
- `_snapRenderChart`: usa `_xIdxSet` (Set de índices explícitos) en lugar de `labelEvery`
- Horas: `Set([0,6,12,18])` — Mes: `Set([0,7,14,21])` — Semana/Año: null (todas)
- Eliminado `|| i === n-1` que causaba solapamiento en días 29-30 y horas 22-23

### What's New
- `_WN_CHANGELOG` — clave = versión actual, `id` = `'wn-YYYY-MM-DD-vXXX'` único
- `_WN_SEEN_KEY = 'dashwey_wn_seen'` en localStorage — guarda el `id` al cerrar
- Solo muestra si `localStorage.getItem(_WN_SEEN_KEY) !== contentId`


### Modelo de precios — regla fundamental (verificado v1.3.658)
- `p.precioCompra` = precio por **BULTO** (unidad de compra al proveedor)
- `p.pvp` = precio por **UNIDAD** (precio de venta al cliente)
- `p.udscaja` = unidades por bulto (factor de conversión)
- Coste unitario: `cu = precioCompra / udscaja`
- Ganancia por bulto completo: `ganCaja = (pvpNeto_ud - cu_ud) × udscaja`
- Margen: `(pvpNeto_ud - cu_ud) / pvpNeto_ud × 100`
- **NUNCA** comparar `precioCompra` vs `pvp` sin prorratear
- **NUNCA** sumar IVA de compra al coste unitario — el IVA es deducible. Usar `cu = precioCompra / udscaja` (sin IVA)
- **NUNCA** usar `pvp × udscaja` — pvp ya es por unidad

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
for idx, s in enumerate(scripts):
    with open('/tmp/ts.js', 'w') as f: f.write(s)
    r = subprocess.run(['node', '--check', '/tmp/ts.js'], capture_output=True)
    if r.returncode != 0: print(f"Script[{idx}] ERROR: {r.stderr.decode()[:150]}")
```

**VERSIONADO — sincronizar en 4 archivos:**
- `index.html` → buscar/reemplazar la versión anterior
- `sw.js` → `CACHE_NAME: dashwey-v1-3-XXX-dev`
- `version.json` → `{"version": "1.3.XXX-dev"}`
- `version.txt` → `1.3.XXX-dev`

---

## PENDIENTES

- **Firestore Security Rules** — endurecer antes de Play Store ⚠️ CRÍTICO
- **ALM-F6** · Cargos extra en "Comprobar pedido" — ✅ implementado v1.3.634
- **ALM-F2** · Exportar pedido — ✅ implementado v1.3.635
- **ALM-F5** · Artículo de suministro interno — consumo propio
- **ALM-F3** · Unidades al nombre en catálogo (solo visual)
- **ALM-F4** · Tipo de artículo — kg / litros / uds / cajas
- **AUTH-B2** · `_authLoginSafe/_authRegisterSafe` duplican lógica — deuda técnica

---

## HISTORIAL DE BUGS CRÍTICOS — NO REPETIR

| Bug | Causa | Regla |
|-----|-------|-------|
| App no arranca | Llaves desbalanceadas al envolver código | Contar llaves manualmente |
| App no arranca | Apóstrofe sin escapar en string JS | Usar comillas dobles externas |
| Ripple en grupo entero | `transform:scale` sin `isolation: isolate` | `.sd-group` necesita `isolation: isolate` |
| Funciones muertas | Declaradas después del `return{}` del IIFE de `alm` | Insertar siempre antes del `return{}` |
| onclick inline falla | `\'id\'` en atributos inline de WebView | Usar `data-*` attrs + `addEventListener` |
| Destello blanco al volver | `visibility:hidden` inline — WebView lo re-aplica | Usar `<style id="fouc-guard">` eliminable |
| `confirm()` nativo | Bloqueado silenciosamente en WebView | Siempre `window._showDestructiveConfirm()` |
| REG-01 cm-summary-overlay no bloqueaba swipe | BUG-06 fix activo _showSummary pero no se añadio al guard | Añadir cm-summary-open a _isAnySheetOpen v1.3.640 |
| BUG-06 _showSummary dead code | _doConfirm cerraba el modal sin mostrar resumen | _showSummary activado desde _doConfirm v1.3.639 |
| BUG-07 RE calcula IVA incorrecto | Items en _abrirCheckModalById sin campo iva — fallback siempre 10% | Añadir iva: p.iva en 3 rutas de construccion de items v1.3.638 |
| BUG-05 carrito proveedor incorrecto | _restoreCarrito y _loadCarritoLocal no validaban p.prov del producto | Añadir guard p.prov === activeProv/currentProv en forEach v1.3.637 |
| BUG-01 swipe con CheckModal | check-modal-overlay no estaba en _isAnySheetOpen | Añadir check a _isAnySheetOpen v1.3.636 |
| _showSummary dead code | Funcion definida pero nunca invocada — resumen no se mostraba | Activar desde _doConfirm pasando cargosExtra en meta |
| REG-01 cm-summary-overlay no bloqueaba swipe | BUG-06 fix activo _showSummary pero no se añadio al guard | Añadir cm-summary-open a _isAnySheetOpen v1.3.640 |
| BUG-06 _showSummary dead code | _doConfirm cerraba el modal sin mostrar resumen | _showSummary activado desde _doConfirm v1.3.639 |
| BUG-07 RE calcula IVA incorrecto | Items en _abrirCheckModalById sin campo iva — fallback siempre 10% | Añadir iva: p.iva en 3 rutas de construccion de items v1.3.638 |
| BUG-05 carrito proveedor incorrecto | _restoreCarrito y _loadCarritoLocal no validaban p.prov del producto | Añadir guard p.prov === activeProv/currentProv en forEach v1.3.637 |
| BUG-01 swipe con CheckModal | check-modal-overlay no estaba en _isAnySheetOpen | Añadir check a _isAnySheetOpen v1.3.636 |
| _showSummary dead code | Definida pero nunca invocada — resumen no se mostraba | Activar desde _doConfirm pasando cargosExtra en meta |
| Archivo corrompido por encode | UnicodeEncodeError al escribir emojis con surrogates | Usar \uXXXX en strings Python, nunca emojis literales en scripts |
| Barras 1px en dias sin ventas | barH||2 forzaba 2px minimo en rect SVG | Usar barH directo — height=0 valido SVG, tooltip funciona via data-v |
| Insights truncados ("Rev", "un") | `.snap-narrative-text { height: 68px; overflow: hidden }` cortaba frases largas | Cambiar a `min-height: 68px` sin overflow |
| Runway 999 m. | `gastoMensualTotal()` solo lee gastosOp — si vacio devuelve 0 | `runway()` usa `gastoGlobalPeriodo(mesActualRange())` (gastosOp + compras + mermas) |
| Margen -81% / ROI -270% | `coste: i.p.precioCompra` en payload venta — precio bulto sin prorratear | Usar `_calcMargenProd(i.p).cu` = precioCompra/udsCaja |
| SAC dropdown fuera de lugar | `position:absolute` dentro de SideSheet | `position:fixed` + `getBoundingClientRect()` |
| WN muestra updates antiguos | `id` del entry no cambia con cada versión | `id` = `'wn-YYYY-MM-DD-vXXX'` único por versión |
| Gráfica X solapamiento | `labelEvery` + `i===n-1` forzado | Usar `_xIdxSet` con índices explícitos por tipo |
| ZIP corrompido | Bump de versión sobre archivo ya duplicado | Verificar `wc -l` antes de bump |

---

*Actualizar versión y pendientes al cerrar cada sesión.*
