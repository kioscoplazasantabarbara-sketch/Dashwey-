# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## ESTADO ACTUAL

**Versión:** v1.3.444-dev  
**Plataforma:** APK Android via Capacitor + WebView  
**Deploy:** GitHub Pages → `server.url` en `capacitor.config.json`  
**Usuarios:** Reales en producción — cero regresiones toleradas

---

## ARQUITECTURA

```
index.html (~34.000 líneas) — SPA monolítica completa
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
```

**Bus de eventos:** `DashweyBus.emit/on`  
**Entry point:** `window.App` — OBLIGATORIO, nunca solo `const App`

**Stack:** Vanilla JS/HTML/CSS · Firebase Firestore · localStorage · Capacitor · Service Worker  
**Prohibido siempre:** TypeScript · React/Vue · Jest · ES6 modules · bundlers

---

## MÓDULOS ACTIVOS

- **TPV** — motor de venta directa
- **Almacén** — stock, catálogo, proveedores, pedidos
- **Dashboard** — KPIs, landscape feed, snap cards

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
  del modo — aunque alguien acceda sin `?mode=pos`, sin el rol correcto
  Firebase devuelve error en cada llamada

### Seguridad — capas

```
CAPA 1 — ?mode=X         UX — oculta módulos. Saltable por técnicos.
CAPA 2 — canAccess()     Lógica JS — bloquea funciones. Saltable con acceso a código.
CAPA 3 — Firebase Auth   Backend Google — sin token válido, sin datos. NO saltable.
CAPA 4 — Firestore Rules Backend Google — define quién lee/escribe qué. NO saltable.
```

La seguridad real vive en las capas 3 y 4 — en servidores de Google,
inmunes a decompilación del APK.

### Flujo de permisos — día a día

```
PROPIETARIO (HUB)                    TRABAJADOR (POS/ALM/CFO)
─────────────────                    ────────────────────────
Ajustes → Equipo                     Abre su app
→ Añadir miembro: email              → Login con su email
→ Asignar rol: cajero/mozo/contable  → App arranca en su modo
→ Guardar                            → Solo ve su módulo

Desde HUB en tiempo real:
→ Desactivar trabajador → sesión cierra inmediatamente
→ Cambiar rol → permisos actualizados sin acción del trabajador
→ Ver ventas del turno en Dashboard
```

### Modelo de negocio habilitado

```
PLAN BÁSICO     → 1 APK HUB
PLAN NEGOCIO    → HUB + POS ilimitados
PLAN PRO        → HUB + POS + ALM + CFO
PLAN ENTERPRISE → Todo + roles personalizados
```

### Updates — ventaja clave

Cuando se actualiza `index.html` en GitHub Pages, **todos los modos
se actualizan simultáneamente** sin recompilar ningún APK ni pasar
por revisión de Play Store.

Solo se recompila el APK cuando:
- Cambian permisos nativos (cámara, notificaciones)
- Cambia el icono o nombre de la app
- Google Play exige nueva versión del APK (~1 vez al año)

### Estado de implementación

| Feature | Estado |
|---------|--------|
| Roles y `canAccess()` | ✅ implementado |
| Login con email | ✅ implementado |
| Sync Firebase tiempo real | ✅ implementado |
| Gestión de equipo en HUB | ✅ implementado |
| `?mode=pos` — UI y lógica | ✅ implementado v1.3.382 |
| `?mode=alm` — UI y lógica | ✅ implementado v1.3.382 |
| `?mode=cfo` — UI y lógica | ✅ implementado v1.3.382 |
| Firestore Security Rules endurecidas | ⏳ pendiente — crítico antes de Play Store |

### Orden de implementación recomendado

1. `?mode=pos` — mayor demanda, menor riesgo (1 sesión)
2. Firestore Security Rules — crítico antes de Play Store (1 sesión)
3. `?mode=alm` (1 sesión)
4. `?mode=cfo` (1 sesión)

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

### Código
- `window.App = App` OBLIGATORIO — sin esto la app muere silenciosamente
- IIFE de `alm` tiene `return{}` al final → insertar funciones SIEMPRE antes de él
- `display:none` como base CSS para elementos JS-toggled — nunca `display:flex`
- Strings: Python `h.replace(old, new, 1)` — NUNCA `str_replace` en bloques con backticks
- NUNCA `confirm()` nativo → `window._showDestructiveConfirm()`
- NUNCA `border-top: solid var(--red)` en headers de modales
- NUNCA `transform: scale` en `.sd-row:active` sin `isolation: isolate` en el padre
- NUNCA envolver código en `onConfirm: function(){}` sin contar llaves manualmente
- NUNCA `''` en atributos `onclick` para pasar variables → usar `\\'`
- NUNCA animar `height/width/top/left` → solo `transform` y `opacity`
- `will-change` solo en `.open`/`.animating` → nunca permanente en CSS base
- NUNCA `visibility:hidden` como atributo inline en `<html>` → usar `<style id>` eliminable por JS
- NUNCA animación de entrada sin `animation-fill-mode: forwards` → WebView re-ejecuta al recompositar
- NUNCA `triggerHaptic` en bloque `catch` → bypasea `_isHapticAllowed()` y debounce
- NUNCA emojis multicolor en UI de datos — si se usan emojis deben ser monocolor/neutros o sustituirse por iconos SVG
- Insights en snap cards: una frase narrativa elegante, NO fichas con título+valor+descripción — menos es más
- NUNCA escribir `data-app-mode` en `body` desde HEAD — `<body>` no existe aún; usar `document.documentElement`
- NUNCA hardcodear tab inicial (idx===1) en `_initTrack` ni en navbar active — leer `window._DASHWEY_MODE`
- El bump de versión debe actualizar EXACTAMENTE 5 lugares: `<title>`, `_APP_VERSION`, `sw.js CACHE_NAME`, `version.json`, `version.txt` — si falta uno el sistema de updates se rompe
- En modos con tab inicial ≠ hub, el render del módulo debe forzarse explícitamente — `goTab` lo bloquea por guard `_cTab === i`
- CSS de modos de app SIEMPRE en `html[data-app-mode="X"]` — nunca `body[data-app-mode]`

### Modo App — reglas futuras
- `window._DASHWEY_MODE` es de solo lectura — definido en HEAD, nunca mutar en runtime
- CSS de modo SIEMPRE scoped a `body[data-app-mode="X"]` — nunca global
- Lógica de modo en `nav` y `ui` — nunca en módulos de negocio (tpv, alm, dash)
- Firebase Security Rules son la única seguridad real — nunca confiar solo en el modo UI

### Búsqueda global obligatoria
- Si se reporta un bug en función X → buscar el mismo patrón en TODA la app antes de parchear
- Contar ocurrencias totales y citarlas antes de pedir GO
- Un fix parcial que deja instancias sin corregir es peor que no hacer nada

---

## SISTEMAS IMPLEMENTADOS

### UI & Animación
- **Ripple M3** — `.ripple-surface` + `_initRipple()`, transition-based, listener por elemento
- **Sheet system** — `--sheet-radius:28px`, `--sheet-spring`, scrim `rgba(0,0,0,0.32)`
- **Animación tokens** — `--ease-standard/accelerate/decelerate/enter/exit`, `--dur-micro:120ms/std:220ms/emphasis:340ms`
- **Motion profiles** — `body[data-tab="0/1/2"]` con `--mod-ease-enter/exit`, `--mod-dur-*` por módulo
- **Skeleton screens** — `.sk`, `.skeleton`, `.skeleton-card/item/chart/list` + `skeletonShimmer`
- **Img fade-in** — `img:not(.no-fade)` opacity:0 → `.img-loaded` opacity:1
- **App fade-in** — `@keyframes appFadeIn` en `#app` al arranque, con `forwards`
- **Dark mode** — saturación reducida en OLED, `--red:#B84C5C`, `--ink:#E8E3E3`
- **Alto contraste** — `@media (prefers-contrast: high)` completo
- **Energy saver** — `window._DashweyEnergySaver.set(true/false)`, CSS desactiva anims
- **FOUC guard** — `<style id="dashwey-fouc-guard">` eliminado por JS tras aplicar tema

### Gestos & Input
- **Haptic M3** — `Utils.triggerHaptic()` con 16 tipos: `edgeSqueeze`, `edgeRelease`, `longPress`, `dragCrossing`, `collision`, `gestureStart/End`, `reject`, etc.
- **Edge gestures** — swipe borde derecho → ajustes; doble tap borde superior → scroll top
- **Input mode** — `data-input-mode="touch/mouse"` en body, CSS adapta tamaños
- **Keyboard shortcuts** — Esc, Ctrl+S, Ctrl+K, Alt+1/2/3, Ctrl+Enter

### Formularios
- **Destructive confirm** — `window._showDestructiveConfirm({title, message, confirmText, onConfirm})`
- **Field validation** — `window._validateField(input, {required, min, email, minLen})`
- **Focus first error** — `window._focusFirstError(formEl)`
- **Form tracking** — `window._trackFormChanges(formEl, draftKey)` + auto-save 30s
- **Clear dirty** — `window._clearFormDirty(formEl, draftKey)`
- **Draft restore** — `window._restoreDraft(key)`, `window._discardDraft(key)`
- Conectado en: `openNuevoArtFs`, `openEditArt`, `openEditProv`
- Limpiado en: `saveArt`, `_eaSave`, `saveProvEdit`

### Utilidades
- **Lazy loading** — `window._initLazyLoading(container)` con `data-lazy-src`, MutationObserver
- **Has-scroll** — `.has-scroll` + ResizeObserver → clase `.scrollable` + gradiente inferior
- **Scroll suave** — `scroll-behavior: smooth` en html
- **Tooltips** — `[data-tooltip]` solo en `hover: hover` PC
- **Scrollbar PC** — webkit scrollbar 6px en landscape feed, tpv scroll, alm scroll
- **Landscape history** — `_landscapeHistory[]` con botón back `‹` en landscape main
- **What's New** — key única `dashwey_wn_seen`, solo muestra versión actual si hay entrada en changelog
- **Sync badge** — offline/syncing/synced/error con Network Information API

### Utils API
```js
Utils.formatDate(date, options)     // localizado por idioma del perfil
Utils.formatTime(date)              // HH:MM localizado
Utils.formatCurrency(amount)        // EUR/moneda del perfil
Utils.getErrorMessage(error)        // mensajes amigables ES/EN
Utils.getImagePlaceholder(icon)     // SVG data URI
Utils.triggerHaptic(type)           // motor háptico M3
Utils.updateSyncBadge(mode)         // offline/syncing/synced/error
Utils.showToast(msg)
Utils.showSkeleton(id, rows, type)
Utils.hideSkeleton(id)
```

### Tokens CSS principales
```css
--ease-standard:   cubic-bezier(0.2, 0, 0, 1)
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1)
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1)
--ease-enter:      cubic-bezier(0.05, 0.7, 0.1, 1.0)
--dur-micro: 120ms  --dur-std: 220ms  --dur-emphasis: 340ms
--sheet-duration: 0.28s  --sheet-spring: cubic-bezier(0.05,0.7,0.1,1.0)
--r-sm:8px  --r-md:12px  --r-lg:16px  --r-xl:22px  --r-pill:50px
--btn-h:52px  --btn-h-sm:40px  --btn-h-xs:40px
```

---

## PROTOCOLO DE TRABAJO

**FLUJO OBLIGATORIO:**
1. Leer código real antes de opinar
2. Identificar causa raíz con línea exacta
3. Buscar TODAS las ocurrencias del patrón en la app — citarlas antes de pedir GO
4. Consultar si hay ambigüedad de negocio
5. Esperar GO explícito
6. Ejecución quirúrgica — cambio mínimo viable

**VALIDACIÓN ANTES DE ENTREGAR — OBLIGATORIA:**
```python
import subprocess, re
with open('index.html', 'r') as f:
    content = f.read()
scripts = list(re.finditer(r'<script[^>]*>(.*?)</script>', content, re.DOTALL))
errors = []
for i, m in enumerate(scripts, 1):
    js = m.group(1)
    start_line = content[:m.start()].count('\n') + 1
    with open('/tmp/blk.js', 'w') as f:
        f.write(js)
    r = subprocess.run(['node', '--check', '/tmp/blk.js'], capture_output=True)
    if r.returncode != 0:
        err = r.stderr.decode().strip().split('\n')
        errors.append(f"Block {i} (HTML line ~{start_line}): {err[-1]}")
if errors:
    for e in errors: print(e)
else:
    print("ALL SCRIPT BLOCKS SYNTAX OK")
```

**VERSIONADO — sincronizar en 4 archivos:**
- `index.html` → `_APP_VERSION` + título
- `sw.js` → `CACHE_NAME: dashwey-v1-3-XXX-dev`
- `version.json` → `{"version": "1.3.XXX-dev"}`
- `version.txt` → `1.3.XXX-dev`

**ZIP de entrega:** `dashwey-{version}.zip` con los 5 archivos + este `.md`

---

## PENDIENTES

- Confirmar en dispositivo que flickering desapareció con v1.3.381
- ✅ **`?mode=pos/alm/cfo`** — implementado en v1.3.382
- ✅ **Auditoría FIX 1** — `confirm()` nativo → `_showDestructiveConfirm` (v1.3.443)
- ✅ **Auditoría FIX 2** — `will-change` permanente eliminado en 12 selectores base (v1.3.443)
- ✅ **Auditoría FIX 3** — 8 `console.log` debug eliminados de paths runtime (v1.3.443)
- ✅ **`openMainMenu` fallback cortado** — `openSettings()` ya no cae al menú legacy (v1.3.444)
- **Firestore Security Rules** — endurecer antes de Play Store (1 sesión)
- Stagger en listas (Capa 3 motion) — pendiente
- Módulo **Hogar** — finanzas personales (roadmap)
- Módulo **Cartera** — seguimiento de inversiones (roadmap)

---

## HISTORIAL DE BUGS CRÍTICOS — NO REPETIR

| Bug | Causa | Regla |
|-----|-------|-------|
| App no arranca | `onConfirm: function(){}` con llaves desbalanceadas | Contar llaves manualmente al envolver código existente |
| App no arranca | `'You don't have permission'` apóstrofe sin escapar | Usar comillas dobles externas o escapar `\'` |
| App no arranca | `addEventListener` sin `})` de cierre | Verificar cierre de cada callback al añadir código entre medias |
| App no arranca | Doble declaración de función por replace fallido | Verificar que el old string matchea exactamente antes de escribir |
| Ripple en grupo entero | `transform:scale` en `.sd-row:active` sin `isolation` | `.sd-group` necesita `isolation: isolate` |
| Skeleton permanente | `showSkeleton` sobreescribe innerHTML del contenedor | No usar `showSkeleton` en contenedores con hijos propios |
| Funciones muertas | Declaradas después del `return{}` del IIFE de `alm` | Insertar siempre antes del `return{}` |
| onclick inline falla | `\'id\'` en atributos inline de WebView | Usar `data-*` attrs + `addEventListener` |
| What's New siempre igual | Contenido del changelog no cambiaba entre versiones | Entrada nueva por cada update relevante para el usuario |
| Destello blanco al volver de otra app | `visibility:hidden` en atributo HTML inline — WebView lo re-aplica al recompositar | Usar `<style id="fouc-guard">` eliminable por JS |
| Destello blanco appFadeIn | Sin `animation-fill-mode:forwards` — WebView re-ejecuta animación desde opacity:0 | Toda animación de `#app` necesita `forwards` |
| Haptic inconsistente 1a vs 2a vez | `catch` llamaba `triggerHaptic` bypaseando `_isHapticAllowed()` | NUNCA triggerHaptic en catch |
| What's New versiones pasadas | Keys múltiples por versión — buscaba primera no vista | Una sola key `dashwey_wn_seen` con versión vista |

---

| `will-change` permanente en base CSS | GPU layers siempre activos → memoria/batería en dispositivos bajos | `will-change` solo en `.open`/`.animating` — nunca en selector base |
| `confirm()` nativo en WebView | Bloqueado silenciosamente — flujo inatrapable | Siempre `window._showDestructiveConfirm()` |
| Fallback a función legacy en `openSettings` | UI inconsistente, email hardcodeado, menú obsoleto activado en producción | Fallbacks de UI deben fallar silencioso (`console.error`) — nunca degradar a código legacy |

*Actualizar versión y pendientes al cerrar cada sesión.*
