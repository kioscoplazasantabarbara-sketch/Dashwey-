# DASHWEY — MEMORY (SOURCE OF TRUTH)

## ESTADO ACTUAL DEL PRODUCTO

- Versión activa: **v1.3.1213-dev**
- Proyecto en producción
- Firebase de pago (coste crítico)
- Multi-device activo

⚠️ REGLA:
Siempre actualizar versión al cerrar sesión.
Este archivo es fuente de verdad para nuevas sesiones.

## ARQUITECTURA

- Sistema event-driven (v1.3.1150+)
- Eventos inmutables: ventas, gastos, ingresos
- Estado derivado (NO persistir agregados)
- Ingestion-first (todo entra por ingestión)

## NAVEGACIÓN — ESTADO FINAL ESTABILIZADO (v1.3.1213)

### Estructura física vs lógica
```
Track DOM (físico):    [TPV(0) | Almacén(1) | Dashboard(2)]
Navbar visual:         [Almacén(bt-2) | Dashboard(bt-1) | Ajustes(bt-3)]
                        izquierda      centro            derecha
```

### Mapping `_logicalToPhysical`
```js
Tab 0 (TPV)       → físico 0
Tab 1 (Dashboard) → físico 2 (a la derecha)
Tab 2 (Almacén)   → físico 1 (a la izquierda)
```

### Reglas innegociables de navegación
- `_logicalToPhysical()` es **single source of truth** del mapping
- `_initNavActive` y `_syncNavActive` usan `getElementById('bt-' + i)` — NUNCA idx posicional (DOM no es secuencial)
- `_renderAll` cubre los 3 tabs con try/catch
- `_fixTrack` re-renderiza Dashboard (i=1) o Almacén (i=2) tras layout
- `transitionend` siempre tiene fallback `setTimeout` (420ms para track)

## FUENTES DE DATOS

### Loyverse (ACTIVO)
- Fuente principal de ventas
- Sync realtime (polling 15s)
- Datos externos → inmutables
- Dedup por receiptId

### Budgetbakers (ACTIVO)
- Fuente de gastos
- Datos externos → inmutables

### TPV Dashwey (PAUSADO)
- Desarrollo detenido
- NO tocar ni extender
- No forma parte del flujo actual
- Cold module: `window._DASHWEY_FEATURES.tpv = false` en hub mode

## CATÁLOGO

- Gestión interna en Dashwey
- Campo clave: `ventaNombre`

Matching Loyverse (orden obligatorio):
1. loyverseItemId
2. ventaNombre
3. nombre
4. fallback (_lv_xxx)

## GRUPOS DE VENTA

- Fase 2 completada (Dashboard activo)
- Metadata sobre items[]
- 1 producto → 1 grupo
- grupoId solo en ingestión

## SYNC

- Offline-first real
- Cola persistente (localStorage)
- Auto-flush al reconectar
- Merge multi-device por updatedAt

## FIREBASE (CRÍTICO COSTE)

- Máx 1 write por acción usuario
- save() con throttle global
- Subcolecciones para eventos
- Root mínimo

PROHIBIDO:
- save() en loops
- writes desde UI
- writes sin cambios reales

## DEFENSAS ACTIVAS

- Anti-zombies (5 capas)
- Auto-heal automático
- Integrity check pre-sync
- Root guard + hydration guard

## DESIGN SYSTEM — MOTION (v1.3.1210+)

### Curvas (CSS variables)
- `--ease-standard: cubic-bezier(0.2, 0, 0, 1)` — M3 standard
- `--ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1)` — M3 Emphasized apertura sheets
- `--ease-exit: cubic-bezier(0.3, 0, 0.8, 0.15)` — M3 Emphasized exit
- `--ease-decelerate: cubic-bezier(0, 0, 0.2, 1)` — entrada
- `--ease-accelerate: cubic-bezier(0.4, 0, 1, 1)` — cierre
- `--ease-out: cubic-bezier(0, 0, 0.2, 1)` — decel rápido
- `--spring: cubic-bezier(0.34, 1.56, 0.64, 1)` — bounce overshoot premium
- `--spring-nd: cubic-bezier(0.32, 0.72, 0, 1)` — spring sin bounce
- `--spring-snap: cubic-bezier(0.22, 1, 0.36, 1)` — snap impactante

### ⚠️ INVARIANTE CRÍTICO
- `--spring` y `--ease-enter` NUNCA pueden ser `var(--spring)` o `var(--ease-enter)` recursivamente.
- Bug histórico (v1.3.1210): eran recursivos → 62 lugares usaban `linear` sin saberlo.

### Haptics premium profile (v1.3.1210)
| Tipo | Web (ms) | Capacitor APK |
|---|---|---|
| selection | 12 | ImpactStyle.Light |
| impact | 22 | ImpactStyle.Medium |
| confirm | 28 | ImpactStyle.Medium |
| heavy | 32 | ImpactStyle.Heavy |
| longPress | 36 | ImpactStyle.Heavy |
| success | [18,40,22] | notification SUCCESS |
| error | [22,40,22,40,22] | notification ERROR |

Debounce: 80ms (v1.3.1213 — antes 40ms causaba duplicados touchend+onclick)

### Pressed states premium
- `.bt` navbar: scale(0.88) SVG + scale(0.95) label + opacity 0.85
- `.card[onclick]`: scale(0.985) + sombra reducida
- `.sd-row`: scale(0.992) + bg
- `.alm-item`/`.ns-item`: scale(0.985) ease-out
- `.btn-confirm`: scale(0.96) spring premium
- `.btn-primary`: scale(0.97) spring
- `.sd-toggle`: spring + scale(0.96)
- `.tpv-cat-chip`: scale(0.93) ease-out

### Ripple effect (14 elementos)
`.btn-ok, .btn-sec, .btn-primary, .cobro-pay-btn, .cat-float-btn, .dps-opt, .spot-item, .spot-create, .bt, #alm-fab, .sd-row, .btn-confirm, .btn-tickets-t, .btn-nuevo-t, .tpv-right-cobrar`
- Opacity 0.14, ease-decelerate 0.5s

### Toast premium entrance
- translateY(20px) + scale(0.96) → translateY(0) + scale(1) con --spring
- duración: --dur-std (220ms)

### GPU acceleration swipe
- `#swipe-track`: translateZ(0) + backface-visibility hidden
- `.tab-page`: translateZ(0) layer dedicado

## PROBLEMAS ABIERTOS

- A1: Subcolecciones sin limit/orderBy (coste alto)
- A4: Loyverse usa receipt_date (riesgo timezone)
- M1: renders sin throttle
- M2: falta test duplicados sourceRefId

## DECISIONES CLAVE

- NO modificar ventas históricas
- NO guardar derivados
- NO fuzzy matching
- Firebase = cuello de botella
- Prioridad: estabilidad + coste

## OBJETIVO ACTUAL

- Mantener estabilidad total
- Minimizar coste Firebase
- Evitar bugs de sync
- Mejorar consistencia multi-device
