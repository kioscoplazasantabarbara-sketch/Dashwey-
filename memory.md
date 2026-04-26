# DASHWEY — MEMORY (SOURCE OF TRUTH)

## ESTADO ACTUAL DEL PRODUCTO

- Versión activa: v1.3.1174-dev
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

## FUENTES DE DATOS

### Loyverse (ACTIVO)
- Fuente principal de ventas
- Sync realtime (polling 15s)
- Datos externos → inmutables
- Dedup por receiptId

### Budgetbakers (MANUAL — corregido v1.3.1174)
- Import CSV manual desde Ajustes
- NO es polling automático
- NO hay webhook ni API
- Datos externos → inmutables

### TPV Dashwey (PAUSADO)
- Desarrollo detenido
- NO tocar ni extender
- No forma parte del flujo actual

## CATÁLOGO

- Gestión interna en Dashwey
- Campo clave: `ventaNombre`
- Schema drift menor en `iva` field: 268 productos con número, 2 con string '10%' (parseFloat lo maneja)

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
- Estrategia B (subcolecciones) ACTIVA desde 2026-04-23 (`_schemaVersion: 2`)
- Doc raíz limpiado (v1.3.1174 sesión): -88% tamaño (1086 KB → 129 KB)

## FIREBASE (CRÍTICO COSTE)

- Máx 1 write por acción usuario
- save() con throttle global
- Subcolecciones para eventos
- Root mínimo (limpio de arrays transaccionales)

PROHIBIDO:
- save() en loops
- writes desde UI
- writes sin cambios reales

## DEFENSAS ACTIVAS

- Anti-zombies (5 capas)
- Auto-heal automático
- Integrity check pre-sync
- Root guard + hydration guard

## PROBLEMAS ABIERTOS

- A1: Subcolecciones sin limit/orderBy (coste alto)
- A4: Loyverse usa receipt_date (riesgo timezone)
- M1: renders sin throttle (22 callsites de App.dash.render)
- M2: falta test duplicados sourceRefId
- M3: addPedido no tiene ruta de reverso (removePedido) — saldo cuenta divergente si se borra pedido manualmente

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

## CHANGELOG v1.3.1174

- 🔴 FIX CRÍTICO: cargosExtra (RE/PV/Custom) ahora se persisten en pedido al confirmar desde LDC
  - Antes: panel "Impuestos" en pantalla "Pedido recibido" se rellenaba pero los valores se descartaban silenciosamente
  - Ahora: lee inputs ldc-imp-re/pv/extra al construir _pedConfirmado y añade cargosExtra
  - Impacto: gastos generados por pedidos ahora incluyen impuestos completos
  - Validación: pedidos antiguos sin cargosExtra siguen funcionando (FinEngine.pedidoCoste lee `|| {}`)
