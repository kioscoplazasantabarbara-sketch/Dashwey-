# DASHWEY — PROJECT KNOWLEDGE
> Fuente de verdad para sesiones de desarrollo con Claude CTO Mode.
> Actualizar en cada cierre de sesión antes de empaquetar el ZIP.

---

## 🎯 ESTADO SESIÓN 24 ABR 2026 — CIERRE

**Versión desplegada:** v1.3.1096-dev
**Logro mayor:** Estrategia B (subcolecciones Firestore) IMPLEMENTADA Y OPERATIVA — supera límite 1MB definitivamente.

**Sesión ejecutó 12 versiones (1085 → 1096):**
- Fase 1-4: Infraestructura + migración 704 gastos + 584 pedidos a subcolecciones
- Fase 5: Testing cross-device + bugs de sync
- Fase 6 (v1.3.1093-1095): Diff robusto contra baseline sincronizado
- Fase 7 (v1.3.1096): Filtrado transaccional del doc raíz + `_DashweyCleanRootDoc()`

**Estado actual verificado:**
- ✅ Doc raíz limpio (arrays transaccionales vacíos)
- ✅ Subcolecciones = fuente única de verdad
- ✅ 704 gastos + 584 pedidos íntegros
- ✅ Saldos correctos: Kiosco 9462.9€ + Santander 28984.48€
- ✅ Sin fantasmas
- ✅ 8 tombstones históricos (normal, filtrados por `_nd()`)

**Próxima sesión (en orden):**
1. 🔴 **Punto 2 — Re-import Loyverse 3657 tickets** (empezar aquí)
2. 🟡 Punto 3 — Firestore Rules hardening pre-Play Store
3. 🟢 Punto 4+ — Historial multi-año, cierre caja, ticket medio TPV, etc.

---

## ESTADO ACTUAL

**Versión:** v1.3.1096-dev (24 abr 2026 — filtrado arrays transaccionales doc raíz + cleanRootDoc)
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

### FIFO valorStock (✅ v1.3.980)
- `State.get.lotesStock()` + `State.set.setLotesStock(v)` + `State.set.addLoteStock(l)` con dedup por id
- Lote: `{ id, prodId, qty, qtyRestante, costeUnit, fecha }`
- `FinEngine.crearLotesDesdeItems(items, fecha)` — llamado desde `State.set.addPedido`
- `FinEngine.consumirLotesFIFO(prodId, qty)` — llamado desde `State.set.addVenta` → escribe `v.costeReal`
- Lotes agotados se filtran del array (compactación automática)

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
- APK: ✅ compilada con Gradle 8.7 — push notifications nativas activas

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
| **1** | **Arquitectura** | **ESTRATEGIA B — Subcolecciones Firestore** (ventas/gastos/ingresos/pedidos/mermas/facturas en subcolecciones separadas). **REQUISITO BLOCKING.** Sin esto, Dashwey se rompe en ~3 meses con uso real (volumen kiosco = 42k ventas/año = 20MB/año, doc monolítico supera 1MB en 17 días). Plan: 6-10h de trabajo fresco. Coste: 0€/mes (cabe en tier gratuito Firebase). | 🔴 **CRÍTICO** — bloquea escalabilidad y Play Store |
| 2 | Datos | Re-importar ventas Loyverse tras Estrategia B (el import previo se revirtió por exceder 1MB) | 🟠 Tras Estrategia B |
| 3 | Seguridad | Firestore Rules: schema estricto por tipo (validar `is list` / `is map` en cada clave). Diseñado — aplicar antes de Play Store | 🟡 Pre-publicación |
| 4 | Historial | Detalle completo multi-año (más vendidos, ticket medio, etc.) — llega gratis con Estrategia B | 🟢 Incluido en #1 |

### Cambios sesión v1.3.1096 (24 abr 2026) — FILTRADO TRANSACCIONAL DOC RAÍZ + LIMPIEZA
**Contexto:** Estrategia B tenía 3 fuentes de verdad simultáneas (localStorage + doc raíz monolítico + subcolecciones). El doc raíz seguía con 712 gastos legacy (pre-limpieza) que se inyectaban al state local vía 4 merges monolíticos (`_ALL_IDS_R` 17120, `_ALL_IDS_A` 34055, `_ALL_ID_KEYS` 37420, `_mKeys` 37296). Resultado: 4 tests borrados en device 1 reaparecían en device 2 vía snapshot del doc raíz.

**FIX:**
1. Helper `window._DashweyShouldSkipTransactionalInRoot()` → true si flag Estrategia B ON
2. Helper `window._DashweyIsTransactionalKey(k)` → true para `ventas|gastosOp|ingresosFin|historialPedidos|mermas|facturas`
3. En los 4 merges, cuando flag ON: `delete merged[k]` para arrays transaccionales. Solo mergear `productos/proveedores/cuentas/etc` (no transaccionales).
4. `window._DashweyCleanRootDoc({force?})` → limpieza one-shot del doc raíz Firestore (escribe arrays vacíos). Guard `_schemaVersion:2`.

**ORDEN DE EJECUCIÓN EN CONSOLA:**
1. Deploy v1.3.1096 en ambos devices
2. Verificar ambos arrancan OK con Estrategia B activa
3. En device 1: `await window._DashweyCleanRootDoc()` → borra arrays transaccionales de Firestore
4. Reload ambos devices → sync inicial ya no trae legacy
5. (Opcional) confirmar en Firestore Console que doc raíz tiene `ventas:[]`, `gastosOp:[]`, etc

**REGLA NUEVA:** con `_schemaVersion:2`, los 6 arrays transaccionales SOLO viven en subcolecciones. El doc raíz guarda: `settings`, `cuentas`, `productos`, `proveedores`, `hotPins`, `catLabels`, `lotesStock`, etc.

---

### Cambios sesión v1.3.1095 (24 abr 2026) — DETECCIÓN DE BORRADOS REMOTOS
**Contexto:** v1.3.1094 arregló diff local pero device 2 seguía viendo TESTs borrados en device 1. Causa: el handler onSnapshot de subcolecciones hacía merge `local + remote` → items locales SIN contraparte remota (= borrados en Firestore) se mantenían vivos porque el remoto no tenía nada que decir de ellos.

**FIX:** en handler snapshot, tras merge:
- Construir `remoteIds` (Set de ids presentes en snapshot)
- Para cada item local: si `!remoteIds.has(local.id) && !local.deleted` → marcar `deleted:true` + `deletedAt=now`
- Así propaga el borrado remoto a UI local

**GUARD DEFENSIVO:** si `remoteCount < localCount * 0.5` y `localCount > 10` → NO marcar deletions. Probable fetch incompleto o estado inicial pre-sync. Evita catástrofe (borrar 700 items por snapshot parcial offline).

---

### Cambios sesión v1.3.1094 (24 abr 2026) — DIFF VS "ÚLTIMO SINCRONIZADO"
**Contexto:** v1.3.1093 intentó snapshot pre-mutación, pero el patrón real `_deleteGasto` hace `slice() + .deleted=true + setGastos(_arr)` — slice copia el array pero los OBJETOS son los mismos refs que `_state.gastosOp`. Al tomar snapshot dentro del setter, los objetos ya estaban mutados.

**SOLUCIÓN DEFINITIVA:** cambiar el baseline del diff.
- `window._DashweyLastSyncedSnap[stateKey] = {id: JSON.stringify(item)}` — mantenido globalmente
- Se actualiza SOLO tras batch write exitoso O snapshot remoto aplicado
- `_diffMarkDirty` compara `JSON.stringify(newItem)` contra el snapshot sincronizado
- Mutación in-place SIEMPRE detectable porque el stringified del objeto mutado no coincide con el baseline confirmado

**Puntos de actualización de `_DashweyLastSyncedSnap`:**
1. Migrator inicial → poblar tras cada batch
2. `_writeFirebaseDual` → actualizar tras batch OK; borrar key si `deleted:true`
3. Handler onSnapshot de subcolección → reemplazar completo con items recibidos (verdad del remoto)

**REGLA NUEVA:** el snapshot "último sincronizado" es la fuente de verdad para diff. No depende de capturar prev antes de mutación.

---

### Cambios sesión v1.3.1093 (24 abr 2026) — FIX CRÍTICO mutación in-place no detectada
**Contexto:** Durante cleanup de items TEST se descubrió que `tests.forEach(g => g.deleted=true); setGastos(raw)` NO marcaba dirty. Los items quedaban con `deleted:true` localmente, pero no se subía nada a subcolecciones → device 2 recibía via onSnapshot versión sin `deleted:true` y sobrescribía → items "resucitados".

**BUG:** `_diffMarkDirty(prevArr, newArr)` comparaba `prev === x` primero (mismo ref → skip). Cuando el caller mutaba objetos in-place dentro del mismo array, `prev` y `new` eran el mismo array con los mismos objetos con los mismos refs → todos los ítems "iguales" → 0 dirty.

Peor: incluso sin el check de ref, si capturábamos `_prev = _state.gastosOp` y luego se muta in-place ANTES de llamar a diff, `prev` y `new` ya tenían los cambios → imposible detectar.

**FIX (v1.3.1093):**
- Helper nuevo `_snapshotMap(arr)` → construye `{id: JSON.stringify(item)}` **antes** de mutar.
- `_diffMarkDirty(stateKey, prevSnapshotMap, newArr)` → compara stringify actual contra snapshot pre-mutación.
- Los 6 setters masivos actualizados: `const _snap = _snapshotMap(_state.X); _state.X = ...; _diffMarkDirty('X', _snap, _state.X)`.

**REGLA NUEVA:** `_diffMarkDirty` requiere snapshot **pre-mutación** (stringified map), no referencia al array.

**COMPORTAMIENTO ESPERADO TRAS FIX:**
- `g.deleted=true; setGastos(state.raw)` → 1 item dirty → 1 batch.delete en subcolección → device 2 ve desaparecer
- Soft-delete visible siempre, independiente de cómo el caller construya el nuevo array

---

### Cambios sesión v1.3.1092 (24 abr 2026) — AUTO-ACTIVACIÓN SÍNCRONA
**Contexto:** v1.3.1091 auto-activaba el flag tras `_doInitialSync` completo vía promise asíncrona. Problema: tardaba ~15s desde arranque app → primeros saves (si ocurrían rápido tras arranque) iban por modo monolítico (14s c/u, 500KB).

**FIX:** mover la auto-activación al inicio de `_doInitialSync`, **síncrona con await**, justo después del `fb.read('state')`. Así el flag está activo ANTES de cualquier merge o save posterior.

**Ubicación:** línea ~37130. El bloque promise-based de v1.3.1091 eliminado.

**EFECTO:** abrir app → auto-activación inmediata (dentro de 1-2s del arranque, antes del primer save posible).

---

### Cambios sesión v1.3.1091 (24 abr 2026) — CIERRE ESTRATEGIA B + AUTO-ACTIVACIÓN
**Contexto:** Durante testing del device 1 el flag `_DashweyUseSubcollections` se desactivó silenciosamente en algún momento (probable re-carga parcial del contexto window por SW update). El flag no persistía entre sesiones por diseño (memoria).

**FIX:** auto-activación tras `_doInitialSync` exitoso:
- Si `state._schemaVersion === 2` en Firestore → invocar `_DashweyEnableSubcollections({skipMigrationCheck:true})` automáticamente
- Así el flag se reactiva en cada arranque / reload SW sin intervención manual
- Idempotente: si ya está activado, no hace nada

**ESTADO FINAL DE ESTRATEGIA B (validado en producción, device 1):**
- ✅ Migrator: 704 gastos + 584 pedidos copiados a subcolecciones
- ✅ Crear gasto: 1 write, ~3-4s (vs 14s antes)
- ✅ Borrar gasto: 1 write con `batch.delete` (vs 705 writes en 1089)
- ✅ Sync remoto no contamina dirty (`_DashweyApplyingRemote` guard en 3 merges monolíticos)
- ✅ Diff granular: `_diffMarkDirty` solo marca items cambiados
- ✅ Auto-activación: flag se restaura tras cada reload

**PENDIENTE PARA PRÓXIMA SESIÓN:**
- Testing en device 2 (activar flag por auto-activación tras deploy, verificar sync cross-device)
- Limpieza del doc raíz: borrar los arrays `gastosOp/historialPedidos/etc` del state monolítico (actualmente duplicados). Requiere diseño cuidadoso — no tocar hasta confirmar que subcolecciones son fuente primaria en TODOS los devices
- Re-import Loyverse 3657 tickets ahora que subcolecciones soportan volumen ilimitado
- Diagnóstico bug flag-cae-solo: dejar `window._flagWatch` activo en producción 1-2 días para capturar stack trace

**MÉTRICAS SESIÓN COMPLETA (v1.3.1085-1091, 7 versiones):**
- 4 bugs críticos cazados y arreglados durante testing
- 0 regresiones funcionales (todos los fixes fueron aditivos, flag OFF mantiene comportamiento idéntico)
- Arquitectura escalable: 1MB Firestore limit ya no es bloqueante

**REGLAS AÑADIDAS:**
- State y DashweyBus viven en closure App. Usar `window._DashweyGetState()` o acceso vía `window.App.State` — `window.State` puede no estar expuesto en algunos contextos
- Setters masivos deben usar `_diffMarkDirty(key, prev, new)` no `.forEach(markDirty)` — evita re-writes masivos
- Merges remotos (onSnapshot, _doInitialSync, merges ad-hoc) DEBEN envolver el apply en `window._DashweyApplyingRemote = true` para no contaminar dirty tracking

---

### Cambios sesión v1.3.1090 (24 abr 2026) — ESTRATEGIA B FIX merges monolíticos
**Contexto:** v1.3.1089 introdujo `_diffMarkDirty` para setters masivos, pero el flag enable seguía disparando 584 writes espontáneos. Diagnóstico: los merges remotos del doc monolítico (onSnapshot, _doInitialSync, renderOrden) invocan `State.set[sk](merged[k])` que pasa por el setter masivo → marca dirty TODOS los items porque son instancias diferentes tras serialización Firestore.

**FIX:** `_DashweyApplyingRemote = true` envuelve los 3 merges monolíticos:
1. `onSnapshot('state')` (línea ~37319)
2. `_doInitialSync` merge inicial (línea ~37196)
3. `renderOrden` context merge (línea ~33972)

Durante merge remoto, `_DashweyMarkDirty` es no-op → no se acumulan dirty items falsos. Solo acciones **locales** del usuario marcan dirty (addVenta manual, edit gasto, etc.).

**IMPORTANTE:** flujos de import legítimo (Loyverse importCatalog, import BB, import manual `_doImport`) NO se protegen con este flag — esos SÍ deben marcar dirty (son cambios reales del usuario que deben propagar).

**COMPORTAMIENTO ESPERADO TRAS v1.3.1090:**
- Enable flag por primera vez: 0 writes espontáneos (dirty sets vacíos)
- Snapshot remoto llega: 0 writes spontáneos (guard evita marcado)
- Venta local: 1 write
- Borrar gasto: 1 write (batch.delete)
- Import Loyverse 3657: 3657 writes (correcto)

---

### Cambios sesión v1.3.1089 (24 abr 2026) — ESTRATEGIA B FIX dirty granular
**Contexto:** Tras activar flag ON en device 1, testing reveló que los setters masivos marcaban TODOS los items del array como dirty (no solo los cambiados). Ej: borrar 1 gasto → 705 writes innecesarios, 10.7s latencia.

**BUG:** los 6 setters masivos (`ventas`, `mermas`, `facturas`, `historialPedidos`, `setGastos`, `setIngresos`) hacían `.forEach(x => markDirty(x.id))` tras asignar el nuevo array. No distinguían entre reemplazo masivo legítimo (import catálogo) y mutación puntual (soft delete).

**FIX:** helper `_diffMarkDirty(stateKey, prevArr, newArr)` DENTRO del closure State:
- Captura `_prev = _state.X` antes del reemplazo
- Compara new vs prev por id + `JSON.stringify`:
  - Item nuevo (id no en prev) → dirty
  - Misma referencia → skip (no hubo mutación)
  - Mismo id + contenido diferente → dirty
  - Desaparición sin deleted:true → NO dirty (no borrar de Firestore)
- Los 6 setters ahora usan este helper.

**COMPORTAMIENTO ESPERADO TRAS FIX:**
- Crear gasto via addGasto (granular): 1 write
- Editar gasto via setGastos(arr modificado): 1 write (solo el editado)
- Borrar gasto via soft-delete (setGastos con deleted:true): 1 write (batch.delete)
- Import masivo 3657 tickets Loyverse: 3657 writes (correcto — todos nuevos)
- Snapshot remoto aplicado: 0 writes (guard _DashweyApplyingRemote)

**COSTE FIREBASE:** Con fix, kiosco típico ~125 writes/día (0.6% del tier Spark 20k). Antes del fix: ~10.700/día (54% del tier).

**TESTING PENDIENTE post-fix:**
- 7B/7C/7D/7E repetidos — confirmar que soft delete = 1 write
- Testing multi-device — device 2 activar flag, sync entre ambos

---

### Cambios sesión v1.3.1088 (24 abr 2026) — FIX CRÍTICO State scope
**Contexto:** Primera prueba de Fase 5 en device real reveló bug grave en el migrator.

**BUG DETECTADO EN DRY RUN:**
- `await _DashweyMigrateToSubcollections({dryRun:true})` devolvía TODO en 0 counts
- Datos reales: 704 gastos + 584 pedidos + 2 cuentas (intactos)
- Diagnóstico: `window.State` es `undefined` en este entorno — la línea `if (typeof State !== 'undefined') window.State = State` (fuera del IIFE App) nunca se ejecutó porque `State` bare no existe fuera del IIFE. `State` sí existe como `window.App.State` (via return del IIFE) y como closure interno para los `window.State.*` que aparecen en el código (que son dead code / protegidos por guards)
- Mi código Fase 4 leía `window.State?.raw` → obtenía undefined → arrays vacíos → count=0

**FIX APLICADO:**
- Helper nuevo: `window._DashweyGetState()` con fallback `window.State → window.App.State`
- Migrator, handler DashweyBus y setter apply usan el helper
- **Bug histórico colateral arreglado:** la línea `if (typeof State !== 'undefined') window.State = State` ahora tiene `else if (window.App?.State) window.State = window.App.State` → `window.State` ahora SÍ está expuesto correctamente
- Helper DashweyBus fallback: `window.DashweyBus || window._DashweyBus`

**REGLA NUEVA AÑADIDA A HISTORIAL:**
- State y DashweyBus viven dentro del cierre IIFE de App. Solo accesibles como:
  - `window.App.State` / `window.App.DashweyBus` (via return del IIFE)
  - `window._DashweyBus` (asignado explícitamente dentro del IIFE en línea 10899)
- `window.State` requiere el fix v1.3.1088 para funcionar correctamente
- Código NUEVO debe usar `window._DashweyGetState()` o fallback explícito

**ESTADO PRE-REINTENTO:**
- ✅ Código corregido y validado
- ⏳ Próximo paso: deployar v1.3.1088 + repetir dry run → debe reportar 704 gastos + 584 pedidos

---

### Cambios sesión v1.3.1087 (24 abr 2026) — PRE-TESTING AUDIT: 4 bugs cazados
Antes de probar Fase 5, auditoría del código de Fase 4. 4 bugs críticos detectados y corregidos:

**Bug #1 — Loop auto-alimentado en handler snapshot remoto:**
El setter masivo (`ventas`, `setGastos`, etc.) llama a `save()` internamente → `save()` programa timeout → al disparar el timeout (300ms después) intenta escribir a Firebase → esto es un snapshot remoto RE-enviado como write. Loop.
**Fix:** flag nuevo `window._DashweyApplyingRemote`. Cuando está `true`, `_DashweyMarkDirty` es no-op. El handler lo pone en `true` durante `State.set[setterName](merged)` y lo restaura después. Resultado: los items del remoto NO se re-marcan dirty → el próximo save() no los re-sube.

**Bug #2 — Race condition dirty entre apply remoto y venta local:**
300ms entre setter y disparo del timeout era ventana para corrupción de dirty items.
**Fix:** incluido en #1 — el `_DashweyApplyingRemote` flag cubre toda la ventana síncrona, y el `_DashweyClearDirty` extra al final limpia cualquier filtración.

**Bug #3 — Firestore Rules rechazaban subcolecciones:**
La regla `/usuarios/{uid}/{document=**}` aplicaba `isValidState()` que exige `hasKnownKey`. Docs de subcolección (una venta individual) no tienen claves como `user`/`productos`/etc → rejected.
**Fix:** añadida rule específica `/usuarios/{uid}/contextos/{ctx}/datos/state_sub/{sub}/{itemId}` ANTES de la catch-all. Valida solo ownership + size<100KB (items individuales, no monolíticos). Firestore matchea la regla más específica primero.
⚠️ **DEBE DEPLOYARSE A FIREBASE ANTES DE ACTIVAR FLAG:** `firebase deploy --only firestore:rules --project dashwey-project`

**Bug #5 — Migrator enviaba items deleted a batch:**
El migrator pasaba TODO el array (incluidos `deleted:true`) al batch writer, que intentaba `batch.delete(ref)` en docs que nunca existieron. Idempotente pero confuso.
**Fix:** migrator filtra `deleted:true` además de items sin id. Subcolección se crea limpia, sin tombstones iniciales.

**ESTADO PRE-TESTING:**
- ✅ Código Fase 4 revisado y corregido
- ✅ Firestore Rules actualizadas (pendiente deploy manual)
- ✅ Flag sigue OFF — comportamiento externo 100% idéntico a v1.3.1084
- ⏳ Listo para activación controlada en Fase 5

---

### Cambios sesión v1.3.1086 (24 abr 2026) — ESTRATEGIA B FASE 4
**Flag sigue OFF** — comportamiento externo 100% idéntico a v1.3.1084. Infraestructura completa para activar en Fase 5.

**AÑADIDO EN FASE 4:**
- `_DashweySubscribeSubcollection(stateKey, callback)` — suscribe UNA subcolección Firestore; callback recibe items tras cada cambio remoto
- `_DashweyUnsubscribeAllSubcollections()` — cancela todos los listeners (uso: logout)
- `_DashweyApplySubcollectionSnapshot(stateKey, items)` — emite evento `_subcollection_snapshot` en DashweyBus para que State lo consuma
- Handler `DashweyBus.on('_subcollection_snapshot', ...)` dentro del closure de sync:
  - Merge por ítem usando `_tsOf` (deletedAt > updatedAt > fecha > createdAt)
  - Guard `_DashweyUseSubcollections` + guard `isSaving` anti-loop
  - Aplica vía setter masivo (`ventas`, `setGastos`, etc.) con `isSaving=true` durante apply
  - Limpia dirty items aplicados (no los re-sube)
- `_DashweyMigrateToSubcollections({dryRun:true/false})` — migrator one-time:
  - Lee schemaVersion en doc raíz (idempotente)
  - Escribe cada array transaccional en su subcolección vía batches de 450
  - Marca `_schemaVersion:2 + _migratedAt` en doc raíz al completar
  - NO borra arrays del doc raíz automáticamente (decisión manual Fase 5)
- `_DashweyEnableSubcollections()` / `_DashweyDisableSubcollections()` — encendido/apagado controlado
  - Enable verifica `schemaVersion:2` antes de activar (protección)
  - Enable suscribe las 6 subcolecciones tras activar flag
  - Disable desactiva flag y desuscribe

**RUTA DE ACTIVACIÓN (Fase 5 manual):**
1. Device A: consola → `await window._DashweyMigrateToSubcollections({dryRun:true})` — ver report
2. Device A: `await window._DashweyMigrateToSubcollections()` — escribir subcolecciones
3. Verificar Firebase Console: docs en `state_sub/ventas/*`, etc.
4. Device A: `await window._DashweyEnableSubcollections()` — activar flag
5. Operación de prueba (venta / gasto) — verificar escribe a subcolección
6. Verificar saldos intactos
7. Device B/C: pull nuevo código → `_DashweyEnableSubcollections({skipMigrationCheck:false})`
8. Sync cross-device validado → decidir borrado de arrays del doc raíz

**INVARIANTE FASE 2-4:** el flag está OFF. `_writeFirebaseDual(data)` → `_writeFirebase(data)`. Los listeners de subcolecciones NO se crean hasta llamar `_DashweyEnableSubcollections`. El migrator NO se auto-invoca.

---

### Cambios sesión v1.3.1085 (24 abr 2026) — ESTRATEGIA B FASES 2+3
**Contexto:** arranque de refactor Subcolecciones Firestore. Principio: flag OFF por defecto, cero cambios de comportamiento.

**FASE 2 — INFRAESTRUCTURA (no activada):**
- Imports Firestore: + `writeBatch`, `deleteDoc`
- Flag maestro: `window._DashweyUseSubcollections = false` (interruptor principal)
- Dirty-tracking granular: `window._DashweyDirtyItems = { ventas, gastosOp, ingresosFin, historialPedidos, mermas, facturas }` (cada clave es un `Set<id>`)
- Mapa subcolecciones: `window._DashweySubcollectionMap` (stateKey → fbName)
- Helpers: `_DashweyMarkDirty(stateKey, id)` + `_DashweyClearDirty(stateKey)` + `_DashweyWriteSubcollectionBatch(stateKey, items)`
- Batch writer: chunks de 450 ops (límite Firestore 500), usa `writeBatch.set/delete` según `item.deleted`
- Ruta subcolecciones: `usuarios/{uid}/contextos/{ctx}/datos/state_sub/{fbName}/{itemId}`

**FASE 3 — INSTRUMENTACIÓN SETTERS + DISPATCHER DUAL:**
- 13 setters transaccionales marcan dirty en `try/catch` (cero riesgo de ruptura):
  - Setters masivos: `ventas`, `mermas`, `facturas`, `historialPedidos`, `setGastos`, `setIngresos` (marcan todo el array)
  - Setters granulares: `addFactura`, `addGasto`, `addMerma`, `addIngreso`, `addPedido`, `addVenta` (marcan por id)
  - Removers soft-delete: `removeHistorialPedido`, `removeFactura` (marcan para propagar deleted:true)
- `_writeFirebaseDual(data)` — dispatcher paralelo a `_writeFirebase`:
  - Flag OFF: `return _writeFirebase(data)` → idéntico al comportamiento pre-refactor
  - Flag ON: escribe doc raíz SIN arrays transaccionales + batches subcolecciones con items dirty
  - Marca `_schemaVersion: 2` en doc raíz al escribir en modo ON
- `save()` invoca `_writeFirebaseDual` en lugar de `_writeFirebase` — único cambio en el flujo existente

**QUÉ NO CAMBIA EN ESTA VERSIÓN (flag OFF):**
- `save()` sigue escribiendo doc monolítico vía `_writeFirebase` (redirigido por el dispatcher)
- `onSnapshot` intacto
- Comportamiento externo 100% idéntico a v1.3.1084

**INVARIANTE CLAVE:** con flag OFF, las Sets `_DashweyDirtyItems` se llenan pero nadie las consume — son memoria intrascendente. No hay leak significativo porque cada save las deja tal cual (el flag OFF ignora el modo subcolecciones completo).

**PRÓXIMOS PASOS (Fase 4+):**
- Refactor `onSnapshot` para escuchar subcolecciones (no solo doc raíz)
- Script de migración one-time: leer doc monolítico → crear docs en subcolecciones
- Testing flag ON en 1 device, validar saldos intactos
- Re-import Loyverse 3657 tickets

---

### Cambios sesión v1.3.1070 → v1.3.1084 (23 abr 2026) — SESIÓN DE 17 VERSIONES
**Contexto:** reconstrucción completa datos Dashwey (eran testing) + sync multi-device + modelo BB real.

**FIXES ARQUITECTÓNICOS (v1.3.1070-1078):**
- **v1.3.1070:** feature `saldoInicial` modelo BB (sin movimiento)
- **v1.3.1071:** reset TOTAL con purge Firebase + menú reset simplificado
- **v1.3.1072:** PTR dashboard hace `fb.read` + aplica remoto (antes solo re-render local)
- **v1.3.1073:** tombstones serializables (`_DashweyLocalDeletedIds.toArray/mergeArray`) + filtro tombstones extendido a TODOS los arrays con id
- **v1.3.1074:** SOFT DELETE GLOBAL — helper `_nd()` filtra `deleted:true` en 13 getters; `_preserveDeleted` impide perder deleted en setter; KILL hash-guard destructivo → reemplazado por `_DashweyDirty` flag incremental; `_mergeById` con `deletedAt > updatedAt > fecha > createdAt`
- **v1.3.1075:** COMMAND CHANNEL para resets globales (`_emitSyncCommand`, `_applySyncCommand`, `_lastSyncCommandSeen`) — reset TOTAL/clean-trans/clean-catalog sincronizan entre dispositivos
- **v1.3.1076:** añadir arrays faltantes al snapshot (facturas, lotesStock, notifsRead, chatUsers, qgSizeIdx); mapping `_sm` incluye `lotesStock`; `_ALL_ID_KEYS` incluye `lotesStock`; eventos DashweyBus post-merge (9 eventos)
- **v1.3.1077:** CRÍTICO — `save()` ahora usa `window._DashweyBuildSnapshot()` (antes usaba `_archivePayload(_state)` que esquivaba snapshot completo); nuevo `State.raw.*` para acceso sin filtro `deleted:true` (14 arrays); merges usan raw para que items deleted viajen a Firebase
- **v1.3.1078:** FIX login en dispositivo nuevo — TTL 24h en syncCommand (evita re-ejecutar reset stale); guard "primera vez" (seen===0 + reset kind → marcar visto sin ejecutar); guard Firebase sync pending en `_checkCuentaOnboarding` (reintentar 1s × 10); lectura remota explícita antes de mostrar onboarding

**RENDER + SYNC SPEED (v1.3.1079-1083):**
- **v1.3.1079:** snap cards re-render al entrar al Dashboard vía goTab(1) (antes no se refrescaban si el usuario estaba en otra tab cuando llegaba sync)
- **v1.3.1080:** Modelo BB REAL — `saldoInicialFecha` campo. `_bbRecalcSaldos` filtra movimientos con `fecha >= saldoInicialFecha`. Cuentas sin fecha → epoch 0 (compat total). Sheet "Cambiar saldo inicial" estampa fecha automáticamente
- **v1.3.1081:** `updateCuenta` estampa `updatedAt`, `addCuenta` estampa `createdAt`+`updatedAt` → `_mergeById` respeta prioridad correcta
- **v1.3.1082:** FIX CICLO OSCILANTE — `_recalcSaldosListener` no escucha evento `cuenta` (auto-alimentación); guard `isSaving` en recalc (no correr durante aplicación snapshot remoto); `updateCuenta` solo estampa `updatedAt` si NO es solo `saldo` (derivado)
- **v1.3.1083:** SYNC RÁPIDO — debounce 800→300ms; modo urgente (0ms) en setters críticos (`_DashweyUrgentSave=true`) para addCuenta, addGasto, addIngreso, addVenta, addPedido, etc; grace period 3000→1000ms

**IMPORT LOYVERSE (v1.3.1084):**
- **v1.3.1084:** `_lvCommitCatalog` usa soft-delete en placeholders BB y proveedores/productos Loyverse obsoletos (en lugar de omitir). Usa `State.raw.*` para acceder incluyendo ya-deleted. Tombstones viajan vía sync → consistencia multi-dispositivo
- Import catálogo Loyverse EJECUTADO: 13 proveedores `prov_lv_*` + N productos + 13 `prov_bb_*` tombstoneados ✅
- Import receipts Loyverse EJECUTADO: 3657 tickets → pero REVERTIDO al final de sesión por exceder límite 1MB

**NUEVOS REGISTROS EN EL KNOWLEDGE:**
- Modelo cuenta: añadidos campos `saldoInicial`, `saldoInicialFecha`, `updatedAt`, `createdAt`
- Setter universal: `updateCuenta` estampa `updatedAt` excepto si solo cambia `saldo`
- Command Channel: 3 kinds (`clean-trans`, `clean-catalog`, `total`). TTL 24h. Idempotente por dispositivo.
- Soft delete: 13 getters filtran `deleted:true` via `_nd()`. `State.raw.*` para 14 arrays CRÍTICOS acceso sin filtro.
- Urgent save: `window._DashweyUrgentSave = true` antes de save() → debounce 0ms. Se autoresetea tras cada save.

**REGLAS APRENDIDAS HOY (AÑADIR A ANTI-BUG):**
1. NUNCA escuchar en un listener el mismo evento que el listener emite tras ejecutarse (auto-alimentación)
2. `save()` DEBE pasar por `_buildLocalSnapshot` completo, NUNCA saltarse a `_archivePayload(_state)`
3. `_mergeById` requiere `updatedAt` en items para decidir autoridad — todo `add*` y `update*` debe estamparlo
4. Datos DERIVADOS (`saldo` de cuenta) NO deben estampar `updatedAt` — se recalculan del mismo modo en todos los dispositivos
5. Soft-delete es OBLIGATORIO para consistencia multi-dispositivo — omitir un ítem sin marcarlo deleted lo resucita vía sync
6. Firestore doc LIMIT ES 1MB HARD — no hay tier que lo quita → subcolecciones es requisito, no optimización
7. Con uso real (>20 ventas/día) Strategy A (doc monolítico) se rompe en semanas

**ESTADO FINAL DE DATOS (al cierre de sesión):**
- Cuentas: Kiosco (saldoInicial: 9462.90 €, fecha: hoy) + Santander (saldoInicial: 28984.48 €, fecha: hoy) ✅
- Gastos BB: 703 movimientos (18m) ✅
- Catálogo Loyverse: 13 proveedores + productos ✅
- Ventas Loyverse: REVERTIDAS (estaban subiendo correctamente a Firebase pero superaban 1MB). Pendiente re-importar tras Estrategia B.

**RUTA NEXT SESIÓN (Estrategia B):**
1. Diseño detallado: 1 doc raíz `/state/{uid}` para settings/cuentas/user + subcolecciones `/state/{uid}/ventas/{id}`, `/gastos/{id}`, `/ingresos/{id}`, `/pedidos/{id}`, `/mermas/{id}`, `/facturas/{id}`
2. Refactor `save()`: en lugar de un write monolítico, hace writes granulares por ítem modificado
3. Refactor `onSnapshot`: por subcolección, con filtros (p.ej. ventas últimos 30d cacheadas, resto on-demand)
4. Migración: leer doc monolítico actual → crear docs individuales en subcolecciones → borrar datos antiguos del doc raíz
5. Testing: verificar sync multi-device + offline + queries
6. Re-import Loyverse receipts sobre nueva arquitectura → 42k ventas/año viables indefinidamente

### Cambios sesión v1.3.1007
- **Lote P2 — Import catálogo Loyverse (destructivo):**
  - Nuevo botón en Dev tools: "📦 Importar catálogo Loyverse"
  - `_importLoyverseCatalog()`: destructive confirm → pagina `/items` endpoint vía proxy (250 por página con cursor)
  - `_lvImportItemsPaginated(token, acc, cursor)`: recursión hasta agotar paginación
  - `_lvCommitCatalog(lvItems)`: mapea items Loyverse → productos Dashwey con schema:
    - `id: 'p_lv_' + loyverseId`, `loyverseItemId`, `nombre`, `pvp` (variants[0].default_price), `precioCompra` (variants[0].cost), `iva: 21` default, `barcode`, `origen: 'loyverse'`, `prov: ''` (manual)
  - **Fresh start:** `State.set.productos(newProds)` reemplaza catálogo completo
  - Status en UI token Loyverse muestra progreso: "⏳ Descargando items… (N hasta ahora)" → "✅ Catálogo importado: N productos"
- **Pendiente Lote P3:** import receipts con detalle de items (crear ventas[] con items resueltos por `loyverseItemId`) + pull-to-refresh en cards Dashboard
- **CSP + network_security_config:** ya deployado en APK anterior, no requiere rebuild para este cambio (solo index.html cambia)

### Cambios sesión v1.3.1006
- **CSP meta tag:** `connect-src` incluye `https://*.cloudfunctions.net` para permitir proxy Loyverse en WebView Android.
- **network_security_config.xml + AndroidManifest:** creado en el proyecto Android del APK — permite HTTPS a cloudfunctions.net, loyverse.com, firebaseio.com, googleapis.com.

### Cambios sesión v1.3.1005
- **Proxy Cloud Function activo:**
  - URL: `https://europe-west1-dashwey-project.cloudfunctions.net/loyverseProxy`
  - Constante `_LV_PROXY` en módulo `ui`
  - Helper `_lvProxyFetch(endpoint, token, params)` — reutilizable para todos los endpoints Loyverse (items, receipts, inventory, etc.)
  - `_testLoyverseConnection()` usa el proxy real — ya no llama `api.loyverse.com` directamente
- **Lote P2 siguiente:** import catálogo Loyverse (items → productos Dashwey con `loyverseItemId`) + import receipts con detalle de items → alimenta ventas[], "Más vendidos", "Ticket medio"

### Cambios sesión v1.3.1004
- **Lote P1 — Preparación Loyverse-first:**
  - **TPV standby:** botón `#bt-0` en navbar oculto (`display:none`). Módulo TPV activo internamente — solo invisible en UI. `_modeTabMap.pos` → 1 (Dashboard). Deep link `tpv` → redirige a Dashboard.
  - **Settings Integraciones:** nueva sección "API Token Loyverse" con campo `input[type=password]` + botones "Guardar token" y "Probar conexión". Token guardado en `localStorage['dashwey_lv_token']` — nunca en Firebase.
  - **`_saveLoyverseToken()`:** guarda token en localStorage. Muestra confirmación visual en campo, no expone el valor.
  - **`_testLoyverseConnection()`:** llama `api.loyverse.com/v1.0/merchant` con Bearer token. Fallará con CORS hasta que Lote P2 deploye el proxy Cloud Function — mensaje diferenciado "CORS bloqueado — normal hasta activar proxy".
  - **`_initLoyverseTokenField()`:** al abrir settings, si hay token guardado muestra placeholder enmascarado + confirmación visual. No re-expone el token.
- **Siguiente: Lote P2** — Cloud Function proxy CORS + import catálogo Loyverse (items → productos Dashwey con `loyverseItemId`).

### Cambios sesión v1.3.1003
- **FASE 5 LOTE 1 — Scope personal (motor + toggle UI + filtros):**
  - **State:** `settings.activeScope = 'negocio'` (default). Persiste en Firebase.
  - **Helpers FinEngine:** `_matchesScope(x)` lee `settings.activeScope` en tiempo real. `_isKpiVisible(x) = _isAggregable(x) && _matchesScope(x)` — filtro unificado scope+transfer+pendiente.
  - **Motor KPIs:** batch replace `_isAggregable` → `_isKpiVisible` en 10+ puntos (FinEngine internos + dashboard + insights + snap cards). `revenue()`, `gastoMensualEq`, `gastoBruto`, `comprometido`, `saldoCuentas()` — todos filtran por scope.
  - **Toggle UI:** botón `🏪 Negocio / 🏠 Personal` en header Dashboard junto al selector de periodo. Tap cambia scope + re-renderiza todo. Visual: border+texto violeta en personal, gris en negocio.
  - **Herencia scope:** `addGasto`/`addIngreso`/`addCuenta` defaults heredan `settings.activeScope` (no hardcoded 'negocio').
  - **Cuentas filtradas:** `renderFlujoCaja` + `_snapRenderFCDist` solo muestran cuentas del scope activo. Hash dirty-check incluye `activeScope`.
  - **Scope btn init:** `_updateScopeBtn` llamado en `render()` para sincronizar visual al arrancar.
- **Resultado:** Dashboard aislado por contexto. Crear cuenta "Nómina" con scope personal → invisible en modo negocio. Cambiar a 🏠 Personal → solo ves finanzas personales.
- **Pendiente LOTE 2:** UI para cambiar scope de cuenta/gasto/ingreso existente. Filtrar movimientos en extracto de cuenta por scope. Card Rendimiento/Compras (ventas TPV no tienen scope — siempre negocio por naturaleza).

### Cambios sesión v1.3.1002
- **FASE 3 LOTE 3 — Confirmar pago pendiente:**
  - Editor `_openEditMovimientoSheet`: si `registro.estado === 'pendiente'`, el botón "Guardar" se reemplaza por **"✅ Confirmar pago"** (verde `#16A34A`). Si confirmado, se muestra "Guardar" normal.
  - **Acción "Confirmar pago":** destructive confirm → `estado:'confirmado'` + `fechaPago: hoy` + actualiza saldo de cuenta (gasto descuenta, ingreso suma) + `dash.render()` refresca Dashboard + toast "✅ Pago confirmado — saldo actualizado".
  - Guard null en `edit-mov-save` wire (ya no existe si movement es pendiente → evita error).
  - Botón "Eliminar" siempre disponible (independiente del estado).
- **Fase 3 COMPLETA:**
  - LOTE 1 (v1.3.1000): motor + exclusión KPIs + badges ⏳
  - LOTE 2 (v1.3.1001): toggle creación pendientes + guards saldo
  - LOTE 3 (v1.3.1002): confirmar pago + cascade saldo

### Cambios sesión v1.3.1001
- **FASE 3 LOTE 2 — UI creación pendientes:**
  - **Toggle "⏳ Registrar como pendiente"** añadido en ambos puntos de entrada de nuevo movimiento:
    - `_openMovimientoSheet` (bottom sheet móvil) — wrap con id `mov-pend-wrap`
    - `_openMovimientoFullscreen` (modal fullscreen) — wrap con id `mov-pend-wrap-fs`
    - Mismo id del botón `mov-pend-toggle` en ambos → `_confirmarMovimiento` lee indistintamente
  - **Estado visual:** aria-pressed binario, knob animado (translateX), color fondo `#F59E0B` cuando on, haptic light al tap
  - **Ocultación automática** del wrap en modo `transferencia` (transferencias siempre confirmadas — no pueden ser pendientes)
  - **Lógica en `_confirmarMovimiento`:**
    - Lee toggle → `_esPendiente` + `_estadoMov` (`'pendiente'` o `'confirmado'`)
    - Guards `if (!_esPendiente)` envuelven `updateCuenta(saldo)` en rama gasto e ingreso — pendientes NO tocan saldo
    - Campo `estado` añadido al payload de `addGasto` + `addIngreso` (normal + reembolso)
    - Toast diferenciado: "⏳ Gasto pendiente registrado" vs "✅ Gasto registrado"
  - **Transferencias protegidas:** `if (_movTipo === 'transferencia') _esPendiente = false` — no pueden crearse como pendientes aunque el toggle estuviera on

- **LIMPIEZA código muerto post-unificación selector global:**
  - Eliminadas funciones `_openGastosPeriodPicker`, `_applyGastosPeriod`, `_clearGastosPeriod` (68 líneas, 0 callers UI)
  - Eliminados los 3 exports correspondientes del return del módulo `dash`
  - `gastosCustomPeriod` eliminado de `DEFAULTS`, getter y setter
  - **NO eliminado:** `_openVisitasPeriodPicker`, `_applyVisitasPeriod*`, `_getVisitasPeriod`, `_saveVisitasPeriod` — dependencia activa detectada en `renderAgenda()` legacy (L16087 + L18885) que lee `#dash-agenda-list` existente en HTML. Requiere sesión dedicada para auditar si el render legacy está realmente vivo o es dead code coexistiendo con la snap card nueva.

- **Flujo end-to-end Fase 3 operativo:**
  - Crear pendiente → toggle on → tap Guardar → toast ⏳ → saldo NO se mueve → aparece en listados con badge ⏳ + opacity 0.72 → KPIs financieros lo excluyen
  - Crear confirmado (toggle off) → comportamiento idéntico a antes

- **Pendiente LOTE 3 Fase 3:**
  - Snap card "Pendientes" dedicada en Dashboard (solo visible si >0)
  - Acción "Confirmar pago" → destructive confirm → muta saldo de cuenta + `fechaPago = hoy` + `estado = 'confirmado'`
  - Editar un movement pendiente existente (hoy solo se puede crear, no editar su estado)

### Cambios sesión v1.3.1000
- **FASE 3 LOTE 1 — Control de realidad (motor + badges UI):**
  - **Helpers en FinEngine:**
    - `_isPendiente(x)` — detecta `x.estado === 'pendiente'`
    - `_isAggregable(x)` — `!_isTransfer(x) && !_isPendiente(x)` — helper unificado para filtros de KPIs
    - Ambos expuestos en `window._isPendiente` y `window._isAggregable`
  - **Exclusión de pendientes en agregados financieros (motor puro):**
    - `gastoMensualEq` — usa `_isAggregable`
    - `revenue` — añade `if (_isPendiente(i)) return false`
    - `gastoBruto` — usa `_isAggregable`
    - `comprometido` — usa `_isAggregable`
  - **Batch replace pragmático** en 10 puntos fuera de FinEngine: `!window._isTransfer?.(x)` → `(window._isAggregable ? window._isAggregable(x) : !window._isTransfer?.(x))` — patrón defensivo con fallback si `_isAggregable` no cargó
  - **Badges visuales "⏳ PENDIENTE" con opacity 0.72 en 3 puntos:**
    - `renderFlujoCaja` últimos movimientos (Dashboard → Flujo de Caja)
    - `_openFlujoCajaModal` listado completo (modal expandido)
    - `_snapRenderFCDist` snap card (distribución + últimos movs)
  - **KPIs snap card `_snapRenderFCDist`:** `_ingPeriodo` y `_gastoPeriodo` ahora filtran pendientes (antes sumaban sin distinguir)
- **Regla invariante establecida:** pendientes SÍ aparecen en listados de movimientos (visibilidad), pendientes NO aparecen en agregados financieros (saldo, revenue, gasto total, runway, balance).
- **LOTE 1 limitación:** no hay forma de crear movements pendientes todavía (UI toggle llega en LOTE 2). La infra está lista para aceptarlos, pero hasta LOTE 2, todo movement se crea `estado:'confirmado'` por default.
- **Pendiente LOTE 2:** toggle "Registrar como pendiente" en `_openMovimientoSheet` + `_openMovimientoFullscreen`. Callers de `updateCuenta(saldo)` deben envolverse con `if (estado !== 'pendiente')`.
- **Pendiente LOTE 3:** card snap dedicada "Pendientes" + acción "Confirmar pago" con destructive confirm + `fechaPago = hoy` + actualizar saldo.

### Cambios sesión v1.3.999
- **FASE 2 L3 — UI Account Mapping Loyverse:**
  - **State:** `DEFAULTS.settings.loyverse.paymentMap = { CASH:'', CARD:'', OTHER:'' }` (vacío = usar cuenta primaria automáticamente)
  - **Drawer:** nueva sección "Integraciones" antes de "Cuenta" con row "🧾 Loyverse POS"
  - **Sheet modal `_openLoyverseMapping`:** 3 dropdowns (Efectivo / Tarjeta / Otros) con lista de cuentas + opción "(Auto — cuenta primaria)". Guarda en `settings.loyverse.paymentMap` vía `State.set.settings()`.
  - **Adapter hookup:** `Loyverse.mapSaleToIngresos(receipt, paymentMap=null)` — si no se pasa `paymentMap`, lee `State.get.settings().loyverse.paymentMap`. Defensivo: si la cuenta mapeada fue borrada, cae a cuenta primaria.
  - **Simulador:** `Loyverse.simulate()` ahora pasa `paymentMap=null` → usa mapping configurado por el usuario o cuenta primaria si no hay config.
  - **Exports:** `App.ui._openLoyverseMapping` añadido.
- **Resultado:** los movements importados van a la cuenta que el usuario eligió por cada método de pago. Sin configuración, todo va a primaria (sin regresión vs v1.3.998).
- **Pendiente:** L2 (CSV import) · L4 (API HTTP con proxy CORS).

### Cambios sesión v1.3.998
- **Herramientas dev temporales — Testing Loyverse L1 sin DevTools USB:**
  - Sección nueva "Desarrollador" en settings drawer con 3 acciones:
    - 🧪 **Simular 5 ventas Loyverse** → `Loyverse.simulate(5)` + toast `N created, M skipped`
    - 🔍 **Ver ingresos Loyverse** → `alert()` con contador ingresos/refunds/neto + JSON primer ingreso + `console.log` detalle completo
    - 🧹 **Limpiar datos Loyverse** → `_showDestructiveConfirm` + elimina sólo movements con `origen:'loyverse'` (no toca otros datos)
  - **Exports añadidos a `App.ui`:** `_devLoyverseSimulate`, `_devLoyverseInspect`, `_devLoyverseClean`
  - **Guardas defensivos:** verifica existencia de `window.Loyverse`, `State.get.cuentas().length > 0` antes de simular
- **Pendiente remover en producción:** estas 3 acciones son temporales. Cuando L3 (UI mapping) esté operativa y L2 (CSV) importe datos reales, se quita esta sección.
- **Uso:** tap en icono ☰ (Ajustes) → scroll hasta "Desarrollador" → tap en opción.

### Cambios sesión v1.3.997
- **FASE 2 L1 — Módulo `Loyverse` (core adapter + simulación):**
  - **Arquitectura:** IIFE puro sin estado, insertado tras `FinEngine` (L11428). Expuesto como `window.Loyverse` para debugging.
  - **API pública:**
    - `Loyverse.normalize(rawReceipt)` — tolera schema Loyverse API v1.0 (`id`/`receipt_date`/`payments[].payment_type`/`money_amount`) + variantes (`type`/`method`, `importe`/`amount`). Devuelve receipt canónico `{id, fecha, total, payments[{type, importe}]}` o `null` si inválido.
    - `Loyverse.mapSaleToIngresos(receipt, paymentMap)` — 1 receipt → N movements. `paymentMap = {CASH, CARD, OTHER}` mapea tipo pago → `cuentaId`. Idempotente vía `sourceRefId = receiptId + '_' + idx`. Dedup contra `ingresosFin` + `gastosOp` existentes.
    - `Loyverse.simulate(n=5)` — genera receipts sintéticos mezclando tickets simples (65%), split cash+card (20%), refunds (15%). Útil para validar modelo sin conectar fuente real.
  - **Reglas acordadas aplicadas:**
    - D1 — 1 ingreso por payment (soporte tickets partidos)
    - D2 — refunds (`importe < 0`) → `addGasto` con `metaTipo:'refund'`, `origen:'loyverse'`
    - D3 — raw NO persistido, solo movements derivados
  - **Fields añadidos a movements Loyverse:** `origen:'loyverse'`, `sourceRefId`, `scope:'negocio'`, `estado:'confirmado'`. Para refunds también `metaTipo:'refund'`.
  - **Normalización payment_type:** `CASH`/`CARD`/`OTHER`. Tolera variantes (`cash`, `Efectivo`, `Tarjeta`, `CREDIT_CARD`, `DEBIT_CARD`, etc.).
  - **Dedup:** `'i_lv_' + sourceRefId` / `'g_lv_' + sourceRefId` como IDs determinísticos. Re-ejecutar `mapSaleToIngresos` con el mismo receipt no duplica.
- **Testing desde consola WebView:**
  - `Loyverse.simulate(10)` — inyecta 10 ventas fake
  - `Loyverse.simulate(10)` segunda vez → `skipped: 10, created: 0` (idempotencia)
  - `Loyverse.normalize(raw)` — validar parser con payloads reales
- **Pendiente:** L2 CSV import UI · L3 Account mapping UI · L4 HTTP client API (bloqueado por CORS, necesita proxy).

### Cambios sesión v1.3.996
- **UI Transferencias → motor Fase 1B cableado (cierre del círculo):**
  - **Problema:** el handler UI existente (`_confirmarMovimiento` L17097) creaba el doble movimiento pero con `tipo:'transferencia'` únicamente — sin `metaTipo:'transfer'` ni `transferId`. El motor Fase 1B (cascade editor, exclusión KPIs) no podía reconocerlos como pareja.
  - **Fix:** generar `transferId` único (`tr_${ts}_${random}`) + inyectar `metaTipo:'transfer'` + mismo `transferId` en ambos movimientos (addGasto + addIngreso). `tipo:'transferencia'` conservado por retrocompat (detección dual `_isTransfer`).
  - **Mejora adicional:** `DashweyBus.emit('ingreso')` añadido (solo emitía `gasto` + `cuenta`). Fecha ISO calculada una vez en lugar de dos veces.
  - **ID único del ingreso:** antes `'i'+Date.now()` podía colisionar con el `'g'+Date.now()` del mismo ms. Ahora `Date.now()+1` garantiza distinción.
  - **Cobertura:** fix cubre ambos puntos de entrada (`_openMovimientoSheet` y `_openMovimientoFullscreen`) porque ambos delegan en `_confirmarMovimiento`.
- **Fase 1B completa:** ahora todo el flujo funciona end-to-end. Crear transferencia desde UI → motor la reconoce como pareja → editor cascade importe/fecha al gemelo → delete borra ambos → KPIs la excluyen.

### Cambios sesión v1.3.995
- **CLEANUP DIRIGIDO por el usuario — whitelist proveedores + lista demo productos:**
  - **`_PROV_WHITELIST_NAMES`** (5 proveedores reales de captura 18 abr): Amazon Prime, Coca Cola Euro Pacific Partners, Distribuciones Goyo S.A, Gluck & Sweet S.L.U, Fiesta Colombina S.L.U. Cualquier proveedor fuera de la whitelist se elimina (proveedor sin nombre también).
  - **`_DEMO_PROD_NAMES`** (7 productos demo v1 por nombre): Fanta Naranja 33cl, Kinder Joy 36uds, Patatas Lays 40g, Chaskis Maíz 24uds, Mahou 5* 33cl, Coca Cola 33cl, Cruzcampo 33cl.
  - **`_DEMO_PROD_IDS_EXTRA`** (6 IDs sueltos sin imagen de usuario): `p1774285172407`, `p1774145290031`, `p1774213436469`, `p1774145509338`, `p1774152973986`, `p1774015123630`.
  - **Cascade automático:** los IDs eliminados por nombre/lista se inyectan en `_orphanProdIds` — el cascade v1.3.994 (ventas.items, pedidos.items, mermas, lotesStock, hotPins, qgCells) los limpia de todas las colecciones dependientes.
  - **Tombstones Firebase:** IDs añadidos a `localStorage['dashwey_tombstones']` para prevenir reaparición por sync.
- **Idempotente + defensivo:** las listas se aplican en cada `load()` y `onSnapshot`. Si el proveedor demo vuelve por sync, se filtra otra vez. Si el usuario crea otro proveedor fuera de whitelist, también se borra — por eso en uso real cuando terminen las pruebas hay que eliminar estas listas o mover a ajustes de usuario.

### Cambios sesión v1.3.994
- **CLEANUP UNIVERSAL — Productos/Proveedores demo + cascade a datos dependientes:**
  - **Criterio universal:** producto con `prov` vacío o apuntando a proveedor inexistente = huérfano.
  - **Paso 1 identificación:** `_orphanProdIds` = productos cuyo `p.prov` no existe en `state.proveedores` (los demos de v1 `ccep/mahou/goyo/facundo` ya se eliminan → sus productos quedan huérfanos automáticamente).
  - **Paso 2 cascade (modo estricto):**
    - `productos` — borra el huérfano
    - `ventas.items[]` — filtra items con `prodId` huérfano; venta sin items → eliminada. Legacy `prodId` raíz también
    - `historialPedidos.items[]` — idem; pedido sin items → eliminado
    - `pendingOrders.items[]` — idem
    - `mermas` — elimina entradas con `prodId` huérfano
    - `lotesStock` — elimina lotes FIFO con `prodId` huérfano
    - `hotPins` — filtra pins
    - `qgCells` — filtra celdas Quick Grid (soporta strings o `{prodId}`)
  - **Paso 3 tombstones:** IDs huérfanos se añaden a `localStorage['dashwey_tombstones']` para prevenir reaparición vía sync Firebase desde otro dispositivo
  - **Idempotente:** se ejecuta en `_migrateDemoData` en cada `load()` y cada `onSnapshot`. Si no hay huérfanos, no hace nada. Comportamiento previo (`_DEMO_PROV_IDS`, `_DEMO_PROD_IDS`, filter `ped_demo`, `['v1','v2']`) conservado 100%.
- **Resultado:** en siguiente arranque, todo lo que no esté respaldado por catálogo real de proveedores desaparece. KPIs "Más vendidos"/"Más comprados" quedan con datos limpios.
- **Aviso:** ventas/pedidos legacy de productos demo se eliminan como acordado en periodo de pruebas. Log `[Dashwey] v1.3.994 cleanup: N productos huérfanos eliminados` visible en consola.

| Productos demo v1 aparecían en Más Vendidos/Comprados pese a `_migrateDemoData` | `_migrateDemoData` solo borraba proveedores demo e IDs fijos `p1..p10`. Productos creados después con `prov` demo quedaban huérfanos: `State.get.prod(prodId)` los encontraba → `.filter(x => x.prod)` no los excluía | Extensión universal: productos con prov inválido → eliminados + cascade a ventas/pedidos/mermas/lotes/hotPins/qgCells + tombstones anti-resync |

### Cambios sesión v1.3.993
- **LOTE D — UI CRUD Recordatorios + 4 toggles notifPrefs spec:**
  - **Sheet `_openRecordatorioSheet(recId|null)`:** modal bottom sheet con campos título + fecha + hora. Modo creación (`recId=null`) o edición (pasa id). Botón "Eliminar" solo en modo edición, con confirm destructivo.
  - **Interacciones en timeline vertical:**
    - Tap en item existente → abre sheet en modo edición
    - Botón "+ Nuevo recordatorio" al final de la lista (y en empty state)
  - **Auto-render:** tras save/delete, llama `dash.render()` para refrescar timeline y contador tab
  - **Focus automático:** input título recibe focus 120ms tras abrir (teclado emerge solo)
  - **4 toggles nuevos en `DEFAULTS.notifPrefs` + UI ajustes:**
    - `proximoPedido` (día de pedido recurrente por proveedor, LOTE B)
    - `entregaProxima` (ya existía, mantenido)
    - `alertaStock` (sin stock, bajo mínimo, caducidad — tab Alertas)
    - `recordatorio` (recordatorios personales — tab Recordatorios)
  - Visual: iconos 📅🚚⚠️⏰ con backgrounds distintos, toggles binarios persistidos en `settings.notifPrefs`
- **DoD LOTE A–D cumplido:**
  - [x] "Evento" → "Próximo Pedido" en UI (key interna `visitasComerciales` conservada por seguridad)
  - [x] Orden spec: Próximo Pedido · Entregas · Alertas · Recordatorios
  - [x] Recurrencia por proveedor funcionando (`diasPedido` + `agente`)
  - [x] Recordatorios en timeline vertical exclusivo
  - [x] Toggles independientes funcionando
  - [x] Sin regresión en entregas/alertas existentes
  - [x] Layouts aislados: horizontal para Pedido/Entregas, vertical para Recordatorios

### Cambios sesión v1.3.992
- **LOTE C — Recordatorios (entidad libre + timeline vertical + Firebase sync):**
  - **Modelo:** `{ id, titulo, fecha(ISO con hora), repite: null|'diario'|'semanal'|'mensual', creado }`
  - **State:** `DEFAULTS.recordatorios=[]`, getter `recordatorios()`, setters `setRecordatorios`/`addRecordatorio`/`updateRecordatorio`/`deleteRecordatorio` con dedup-by-id
  - **Migración legacy:** `visitasComerciales` con `notas` → `recordatorios` (id `rec_mig_*`, idempotente). Items sin notas se descartan (ya cubiertos por LOTE B auto)
  - **CSS timeline vertical** (`.snap-tl-v`, estilo TickTick): grupo por día con línea vertical continua + punto rojo, items `hora+título`, past con tachado
  - **Render `_snapRenderRecordatoriosPanel`:** agrupa por día con labels "Hoy"/"Mañana"/"Miércoles 14"/"Lunes 20 May" según proximidad, ordena asc por fecha
  - **Contador tab:** nº recordatorios futuros o de hoy
  - **Firebase sync:** recordatorios añadido a (1) `_buildLocalSnapshot`, (2) dedup `load()`, (3) tombstones filter onSnapshot, (4) `_mKeys2` merge-by-id, (5) `_sm` mapping en PTR + `_doInitialSync` + onSnapshot
- **Pendiente LOTE D:** UI de creación/edición recordatorios (sheet CRUD) + 4 toggles notifPrefs (`proximoPedido`, `entregaProxima` existe, `alertas`, `recordatorios`).

### Cambios sesión v1.3.991
- **LOTE B — Recurrencia auto Próximo Pedido:**
  - **Helper `_nextOrderDate(diasPedido, fromDate)`** — devuelve Date del próximo día de pedido iterando hasta 14 días. Convención `diasPedido`: array de índices 0..6 (Lu=0 … Do=6). Hora fija 9:00 am.
  - **Helper `_computeProximosPedidos(rangeStart, rangeEnd, hoy)`** — itera `State.get.proveedores()` con `diasPedido.length > 0`, calcula próxima fecha, filtra por período activo, ordena asc. Shape compatible con `_snapRenderVisitasPanel` (`{provId, fecha, agente, auto:true}`).
  - **Reemplazo en `_snapRenderTimeline`:** `allVisitas` ahora viene del generador auto, no de `State.get.visitasComerciales()`. Items legacy (notas manuales) quedan huérfanos en State — migrarán a "Recordatorios" en LOTE C.
  - **Labels timeline:** "Oficina/De camino/Fecha" → "Hoy/Preparar/Fecha". Agente comercial se muestra (si existe), si no, nombre del proveedor.
  - **Contador tab:** número de proveedores con pedido próximo.
- **Resultado:** Próximo Pedido ahora refleja la realidad operativa del negocio. Sin entidad nueva, solo cálculo derivado. Usuario ajusta `diasPedido`+`agente` en Proveedores → Dashboard refleja automáticamente.

### Cambios sesión v1.3.990
- **LOTE A — Agenda rediseño (semántico + reorden):**
  - Tab "Eventos" → **"Próximo Pedido"** (label UI). Key interna `data-tab="visitas"` y `visitasComerciales` en State se mantienen (cirugía mayor si se renombran, ~20 ocurrencias).
  - Nueva tab **"Recordatorios"** (`data-tab="recordatorios"`) — placeholder "Sin recordatorios" en UI. Datos + timeline vertical en LOTE C.
  - **Orden definitivo UI:** Próximo Pedido · Entregas · Alertas · Recordatorios
  - **Default tab:** `visitas` (antes `alertas`)
  - Router 1 (labels KPI header): añadidas ramas `visitas` ("Próximo pedido") y `recordatorios` ("Recordatorios")
  - Router 2 (render): añadida rama `recordatorios` con placeholder
  - Panel visitas: "Sin eventos" → "Sin próximos pedidos programados"; fallback `'Evento'` → `'Pedido'`
- **Próximos lotes (pendientes):**
  - **LOTE B** — Recurrencia Próximo Pedido: cálculo derivado de `proveedor.diasPedido` + `proveedor.agente`. Auto-generar próxima fecha sin entidad nueva.
  - **LOTE C** — Recordatorios: entidad libre (texto+fecha), State setter/getter, timeline **vertical** exclusivo (estilo TickTick), agrupado por día.
  - **LOTE D** — notifPrefs 4 toggles: `proximoPedido`, `entregaProxima` (existe), `alertas`, `recordatorios`.
- **Decisión arquitectónica:** no renombrar `visitasComerciales` internamente para evitar regresión en 20+ puntos (setters, export, sync, notifPrefs, WhatsNew). Semántica nueva sobre key vieja.

### Cambios sesión v1.3.989
- **ROLLBACK — Regresión v1.3.988: máquina 2-fases cerraba teclado+spotlight al instante tras pulsar FAB.**
  - **Causa de la regresión:** la fase A pretendía absorber flickering descartando resizes con `kbH<100`. Pero la transición A→B se dispara al primer `kbH>100`. En Android WebView, la animación del IME produce un valor que supera 100 **temporalmente** durante la subida, seguido de un pico descendente (kbH flickea arriba→abajo durante la animación). La fase cambiaba a B antes de que el teclado estuviera estable, y un `kbH<50` posterior durante el overshoot cerraba todo.
  - **Fix:** revertido a contrato lazy v1.3.987 — watcher se arma SOLO en primer `input` event real (`_spotlightSearch`). En ese momento el teclado está 100% estable. Restaurado armado en `_spotlightSearch`, eliminada máquina 2-fases.
  - **Tradeoff reconocido (aceptado):** si usuario pulsa back Android para cerrar teclado sin escribir, spotlight queda visible hasta cierre manual (dim/Cancelar/Escape). Es preferible a cerrar equivocadamente durante apertura — bug más grave que impedía usar el buscador.

| Máquina 2-fases v1.3.988 cerraba al instante tras FAB | Fase A→B transicionaba en overshoot del IME (kbH flickea arriba del umbral temporalmente durante animación) | Rollback a contrato lazy v1.3.987: watcher armado solo en primer input real del usuario |

### Cambios sesión v1.3.988
- **BUG FIX — Spotlight queda huérfano si usuario cierra teclado sin escribir (tradeoff de v1.3.985):**
  - **Causa:** contrato lazy de v1.3.985 armaba el watcher solo en primer `input`. Si usuario abría spotlight → pulsaba back de Android (cierra teclado sin tecla) → overlay quedaba visible sin vía de cierre automático.
  - **Fix arquitectónico — máquina de estados 2-fases:** watcher único armado en `_spotlightOpen` (vuelve a estar acoplado a la apertura, pero ahora **inmune al flickering**). Dos fases:
    - **Fase A "waiting-up":** descarta todos los resizes hasta detectar `kbH > 100` (teclado realmente arriba). Absorbe el flickering del ciclo de apertura (display change + focus + animación IME).
    - **Fase B "watching-down":** transición A→B cuando se confirma `kbH>100`. SOLO entonces se habilita la detección de cierre `kbH<50 → _spotlightClose`.
  - **Un solo handler, dos estados**, armado sincrónico con la apertura. Revertido armado lazy de `_spotlightSearch`.
  - **Resultado:** cierre automático funciona tanto si el usuario escribe como si cierra el teclado directamente. Sin parches de timing, sin acoplamiento circular.

| Spotlight huérfano tras cerrar teclado sin escribir | Watcher lazy v1.3.985 no se armaba sin input → overlay sin cierre automático | Máquina 2-fases: arma en open, fase A absorbe flicker hasta kbH>100, fase B vigila kbH<50 → close |

### Cambios sesión v1.3.987
- **BUG FIX — Solape estructural labels Y/X en origen de gráficos snap (re-audit, fix definitivo):**
  - **Contexto:** v1.3.986 suprimió "0€" pero usuario reportó que persiste solape estructural entre gridlines horizontales y labels X en el origen (0,0).
  - **Causa raíz arquitectónica:** `padL=0, padR=0` hacía que las gridlines arrancaran en `x=0` invadiendo la columna de labels Y. Labels Y pegados a `x=2` con `text-anchor="start"` vivían en el mismo espacio que la gridline y solapaban con el primer bucket X (centrado en `slot/2 ≈ 7px`).
  - **Fix arquitectónico:** `padL=28, padR=8, padB=24` — crea gutter real izquierda para labels Y y margen derecho simétrico. Gridlines restringidas a `[padL, W-padR]`. Labels Y con `text-anchor="end"` a `x=padL-4`, centradas verticalmente con su gridline (`y=gy+3`). Barras y labels X arrancan desde `padL` — área del gráfico aislada del área de labels.
  - **Resultado:** ejes físicamente separados. Origen (0,0) del área del gráfico está en `(padL, padT+chartH)`, NO en `(0, H)`. Imposible solape estructural.

| Labels Y/X solapan en origen (re-audit) | `padL=0` hacía gridlines invadir columna de labels Y. v1.3.986 solo ocultó "0€" — no arregló el coupling estructural | padL=28, padR=8, padB=24 + gridlines acotadas [padL, W-padR] + labels Y text-anchor=end en columna propia. Ejes físicamente separados |

### Cambios sesión v1.3.986
- **BUG FIX — Labels Y y X solapados en esquina inferior izquierda de gráficos snap (rendimiento + compras):**
  - **Causa:** `_snapRenderChart` L20967 dibujaba label Y "0€" en `x=2, y=gy-3`. El label X del primer bucket (`0h`, `1`, `Lu`, `Ene`) se pinta centrado sobre la barra i=0 en `x ≈ slot/2`, también cerca del borde izquierdo. Al compartir la base del gráfico ambos textos se solapan visualmente.
  - **Fix:** suprimir el label Y "0€" (redundante — el eje X implica 0). Gridline sí se mantiene. Los demás labels Y (25%, 50%, 75%, 100%) siguen dibujándose.

| Labels Y/X solapados en origen de gráficos snap | "0€" de eje Y y "0h"/"1"/"Lu"/"Ene" del primer bucket X pintados en coordenadas casi coincidentes | Suprimir label Y en pct=0. El eje X visualiza el 0 implícitamente |

### Cambios sesión v1.3.985
- **BUG FIX — Spotlight pierde foco (causa raíz arquitectónica, definitivo):**
  - **Causa raíz real:** acoplamiento circular entre `_startVVWatch` y el propio ciclo de apertura. El watcher se instalaba en `_spotlightOpen` ANTES de `inp.focus()`, observando los reflows del display change + focus + animación IME. Valores `kbH` flickeando durante la animación del teclado causaban false positives en la condición `kbH<50 → close`.
  - **Fixes de timing acumulados (v1.3.983 `_kbSeenOpen`, v1.3.984 `pointer-events`, `rAF+setTimeout` focus, anti-blur guard) REVERTIDOS** — eran parches de síntomas, no arreglaban el acoplamiento.
  - **Fix arquitectónico (contrato lazy):** `_startVVWatch` ya NO se llama en `_spotlightOpen`. Se llama on-demand en el PRIMER `input` event del usuario (dentro de `_spotlightSearch`). En ese momento el teclado está estable — cualquier `resize` con `kbH<50` posterior es un cierre legítimo.
  - **Resultado:** apertura limpia, focus síncrono, sin guards defensivos, sin timers de mitigación. Deuda técnica eliminada.

| Spotlight pierde foco tras v1.3.983-984 | Acoplamiento circular: watcher vigila reflows de su propia apertura. Parches de timing no resuelven el contrato | Watcher lazy: instalar SOLO en primer `input` real del usuario. Focus síncrono sin hacks |

### Cambios sesión v1.3.984
- **BUG FIX — Spotlight pierde foco al abrir (persistente tras v1.3.983):**
  - **Causa real (multicapa):** 
    1. Click sintético del FAB cae sobre `#alm-spotlight-dim` recién visible → `onclick="_spotlightClose()"`
    2. `inp.focus()` dentro del `touchend` puede ser descartado por Android WebView (focus durante evento touch activo)
    3. Recomposición al abrir teclado puede disparar `blur` transitorio
  - **Fix en `_spotlightOpen` (L37093):**
    1. `dim.pointerEvents='none'` durante 400ms — absorbe clicks sintéticos
    2. Focus diferido a `requestAnimationFrame + setTimeout(0)` — corre en frame siguiente al touch
    3. Anti-blur defensivo: si input pierde foco en primeros 500ms, refocus UNA vez; pasado ese tiempo blur real se respeta

| Spotlight perdía foco al abrir con FAB | 3 causas combinadas: click sintético en dim, focus descartado por WebView, blur transitorio por recomposición | pointer-events:none en dim 400ms + focus diferido via rAF+setTimeout + refocus guard 500ms (one-shot) |

### Cambios sesión v1.3.983
- **BUG FIX — Scroll bloqueado en sheet edición tras long-press:**
  - **Causa:** long-press producto abría menú ctx flotante que "robaba" el `touchend` del track de swipe tabs. `_drag` quedaba colgado en `true`. Listener non-passive L13763 hacía `preventDefault()` indefinido en `touchmove`, bloqueando scroll del sheet posterior.
  - **Fix (L13763):** guard `!_isAnySheetOpen()` añadido — el `preventDefault` solo actúa si no hay sheet abierto. Defensivo sin tocar estado global del IIFE nav.
- **BUG FIX — FAB `+` catálogo abría/cerraba teclado al instante:**
  - **Causa:** `_startVVWatch` (L37040) monitoreaba `visualViewport.resize` con condición `kbH<50 → _spotlightClose()`. En Android WebView el primer `resize` dispara ANTES de que el teclado suba → `kbH=0` → close inmediato → blur mata el teclado recién abierto.
  - **Fix (L37040):** estado `_kbSeenOpen` — watcher ignora eventos hasta confirmar `kbH>100` (teclado realmente abierto). Solo entonces vigila el cierre.

| Scroll bloqueado en sheet tras long-press producto | Menú ctx robaba el touchend del swipe track → `_drag` colgado en true → listener non-passive prevenía scroll en sheet abierto | Guard `!_isAnySheetOpen()` en touchmove non-passive del track |
| FAB catálogo abría/cerraba teclado al instante | `visualViewport.resize` dispara con kbH=0 antes de subir teclado → close inmediato → blur | Estado `_kbSeenOpen` en VVWatch — esperar kbH>100 antes de vigilar cierre |

### Cambios sesión v1.3.982
- **FASE 1B — Transferencias como doble movimiento (ingestion-first):**
  - **Lote 1 — Mapeo legacy:** `tipo:'transferencia'` → `metaTipo:'transfer'` aplicado en `load()` (L9673) y `onSnapshot` (L33593). One-shot al hidratar + datos entrantes. Sin migración masiva Firebase.
  - **Lote 2 — Helper dual + 13 exclusiones:** `FinEngine._isTransfer(x)` = `metaTipo==='transfer' || tipo==='transferencia'` (expuesto en `window._isTransfer`). Exclusión aplicada en: `gastoMensualEq`, `revenue`, `gastoBruto`, `comprometido`, `renderGastos` top4+IA, `renderFlujoCaja` lista, `_openFlujoCajaModal`, `_openGastosModal` byCat+listado, `_buildInsights`, `_buildInsightPhrases`, `_snapRenderFCDist` donut+movs. Icono `⇄` en extracto cuenta actualizado a detección dual — transfer SÍ se muestra con su icono.
  - **Lote 3 — Cascade editor:** `_openEditMovimientoSheet` detecta `registro.transferId`:
    - **Save**: sincroniza `importe` + `fecha` al gemelo (concepto libre)
    - **Delete**: borra ambos lados (confirmación dedicada)
    - **Fallback**: `console.warn('[Dashwey] transferId huérfano')` si gemelo no existe — no bloquea UI
- **Regla de oro cumplida:** Fase 1B NO añade features visibles. Solo protege integridad — transferencias no duplican KPIs ni rompen dashboards.
- **Decisión legacy:** mapeo unidireccional a `metaTipo`. Detección dual como cinturón+tirantes durante transición. Eliminar soporte `tipo:'transferencia'` en versión futura cuando todo esté estabilizado.
- **Pendiente Fase 2:** UI de creación de transferencias (`metaTipo:'transfer'` + `transferId` al submit) — panel "TRANSFERENCIA" ya existe en `_openMovimientoFullscreen` (L16419) pero aún no cablea doble movimiento. Se abordará en fase aparte.

### Cambios sesión v1.3.981
- **FASE 1A — Extensión semántica (ingestion-first):**
  - `addCuenta` → defaults `tipo: 'cash'`, `scope: 'negocio'`
  - `addGasto` → defaults `scope`, `metaTipo: 'normal'`, `estado: 'confirmado'`, `origen: 'manual'`
  - `addIngreso` → mismos defaults semánticos
- **Estrategia:** defaults aplicados SOLO en setters de inserción — NO en getters (evita mutación parásita que dispararía `save()` en render)
- **Datos existentes:** intactos. Campos nuevos se leerán en Fase 1B con fallback `x.scope || 'negocio'` donde se necesite
- **Impacto funcional:** 0 — KPIs, dashboards, TPV, sync sin cambios (regla de oro Fase 1A respetada)
- **Preparación para:** Fase 1B (transferencias con `metaTipo: 'transfer'` + `transferId`), Fase 2 (Loyverse import con `origen: 'loyverse'`), Fase 5 (scope `personal`)

### Cambios sesión v1.3.980
- **LOTE D — FIFO completo:**
  - `State.get.lotesStock` + `setLotesStock` + `addLoteStock` (con dedup por id)
  - `FinEngine.crearLotesDesdeItems(items, fecha)` — crea lotes con `costeUnit = precio/udscaja`
  - `FinEngine.consumirLotesFIFO(prodId, qty)` — consume FIFO ordenado por fecha, devuelve `{costeConsumido, qtyConsumida}`, compacta lotes agotados
  - Hook en `addPedido`: alimenta lotes desde `p.items` al confirmar
  - Hook en `addVenta`: consume lotes y escribe `v.costeReal` con coste histórico real
- **LOTE E — Integridad contable:**
  - Merma al registrarse genera `gastoOp` con categoria `Mermas` y descuenta cuenta primaria (`coste = qty × precioCompra/udscaja`)
  - `cuentaId` opción B: fallback a cuenta primaria si vacío → nunca gasto/ingreso huérfano
- **Bump:** CURRENT_CACHE sincronizado (estaba en v1.3.953, ahora v1.3.980)

### Cambios sesión v1.3.979
- **LOTE A — Integridad de datos:**
  - `lotesStock: []` añadido a `DEFAULTS` (fix: persistía como undefined)
  - Dedup-by-id en `addGasto` / `addIngreso` / `addMerma` (patrón `addVenta`/`addPedido`)
  - Dedup one-shot en `load()` sobre ventas, historialPedidos, mermas, facturas, cierresCaja, gastosOp, ingresosFin
- **LOTE B — Tombstones robustos:**
  - `_DashweyLocalDeletedIds` persistente en `localStorage['dashwey_tombstones']` con TTL 90 días (API Set-compatible)
  - Filtro de tombstones extendido a TODOS los arrays con id en onSnapshot (antes solo `productos`)
  - `facturas` añadido a `_mKeys2` del merge
- **LOTE C — Firestore rules hardening:**
  - `isValidSize()` rechaza escritura > 1024000 bytes
  - `isValidState()` exige ≥1 clave reconocida + `user` como map
  - Split `create/update/delete` — delete sin validación de tamaño
- **UI:**
  - Dot rojo fantasma Agenda — ✅ RESUELTO

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
| `lotesStock` no persistía | Faltaba en `DEFAULTS` aunque se leía en snapshot archive | Añadir a DEFAULTS en cada nueva clave de State |
| Tombstones perdidos tras reload | `_DashweyLocalDeletedIds` era Set en memoria | Persistir en localStorage con TTL |
| Gastos/ingresos/mermas duplicados | Sin dedup-by-id en setters mutables | Aplicar patrón `addVenta` a todos los setters con id |
| Facturas borradas reaparecían | No estaban en `_mKeys2` del merge onSnapshot | Incluir todo array acumulativo con id |
| Rules sin límite de tamaño | Cliente comprometido podía saturar `/state/{uid}` | `request.resource.size() < 1024000` |
| FIFO vaporware: lotes declarados pero nadie los alimentaba | Comentarios sin implementación; valor stock histórico = precio actual | `crearLotesDesdeItems` en `addPedido` + `consumirLotesFIFO` en `addVenta` |
| Merma invisible en contabilidad | `addMerma` calculaba coste pero no impactaba cuentas | Merma crea `gastoOp` categoria `Mermas` + descuento de cuenta primaria |
| Gasto/ingreso sin cuenta huérfano | `cuentaId = \'\'` + `if (cuentaId)` → saldo no se movía | Fallback opción B: cuenta primaria si usuario no elige |
| CURRENT_CACHE desincronizado con CACHE_NAME | Bump histórico olvidaba `CURRENT_CACHE` en index.html (L153) | Añadir a lista de bump — 5 puntos, no 4 |
| Transferencias duplicaban KPIs | `revenue`/`gastoBruto`/snap cards sumaban ambos lados del doble movimiento | `FinEngine._isTransfer` dual (metaTipo + tipo legacy) + exclusión en 13 agregaciones. Extracto cuenta NO excluye (muestra con icono ⇄) |
| Editar 1 lado de transfer dejaba desbalance | `_openEditMovimientoSheet` editaba/borraba solo el registro activo | Cascade por `transferId`: save sincroniza importe+fecha al gemelo; delete borra ambos. Concepto libre. Fallback warn si huérfano |

---

*Actualizar versión y pendientes al cerrar cada sesión.*
