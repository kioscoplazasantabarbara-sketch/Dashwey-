# DASHWEY — RESTART (SESSION CONTEXT)

## ÚLTIMA VERSIÓN
v1.3.1174-dev

## ESTADO ACTUAL

Sistema en producción, estable, con:

- Loyverse integrado (ventas realtime polling 15s)
- Budgetbakers integrado (import CSV manual desde Ajustes)
- Grupos de venta Fase 2 (Dashboard activo)
- Sync multi-device robusto
- Estrategia B (subcolecciones) ACTIVA — schemaVersion 2
- Doc raíz limpio (129 KB tras limpieza v1.3.1174)
- Sistema anti-zombies + auto-heal activo
- Firebase en modo coste controlado

TPV Dashwey:
→ PAUSADO (no tocar)

## LO ÚLTIMO IMPLEMENTADO (v1.3.1174)

- 🔴 FIX CRÍTICO cargosExtra:
  - Pantalla "Pedido recibido" (LDC) ahora persiste RE/Punto Verde/Custom
  - Antes los valores se descartaban silenciosamente al confirmar
  - Línea 36195 index.html — leer ldc-imp-re/pv/extra antes de construir _pedConfirmado
- 🧹 Limpieza doc raíz Firestore:
  - Ejecutado _DashweyCleanRootDoc() — eliminados 2566 items legacy
  - Tamaño doc raíz: 1086 KB → 129 KB (-88%)
  - Subcolecciones intactas (fuente única de verdad)

## DIAGNÓSTICOS COMPLETADOS EN ESTA SESIÓN

- ✅ H1 (IVA hardcoded) DESCARTADO — todos los productos tienen IVA configurado (268 num, 2 string)
- ✅ H2 (BB no sincroniza) NO ES BUG — es import manual CSV (memory.md actualizado)
- ✅ H3 (cap 3000 ventas) NO ES PROBLEMA — 2998 = composición real (1208 lvsum + 1789 lv)
- ✅ Estrategia B activa funciona correctamente
- ✅ FinEngine.pedidoCoste sí incluye cargosExtra correctamente
- 🔴 Bug real identificado: cargosExtra se descartaban al confirmar pedido desde LDC

## PROBLEMA / FOCO ACTUAL

Prioridad absoluta:

1. Reducir coste Firebase
2. Evitar cualquier bug de sync
3. Mantener estabilidad total

NO prioridad:
- nuevas features grandes
- refactors estructurales

## SIGUIENTE PASO (INMEDIATO)

Validar fix v1.3.1174 en producción:
- Recibir pedido con RE rellenado
- Verificar gasto creado incluye RE
- Verificar tarjeta Flujo de Caja muestra total correcto

Tras validar:
- Auditar coste real Firebase tras limpieza root
- Considerar M3 (removePedido para reverso)

## REGLAS PARA ESTA SESIÓN

- NO tocar sync sin justificación fuerte
- NO aumentar writes
- NO modificar eventos históricos
- NO introducir lógica en UI
- Comandos consola SIEMPRE en bloque único copia-pega

## CONTEXTO IMPORTANTE

- Firebase es cuello de botella
- Multi-device ya es estable (no romper)
- Sistema ya complejo → evitar sobre-ingeniería
- Cualquier cambio debe ser quirúrgico

## SI HAY DUDA

Elegir siempre:

→ menos writes  
→ más simple  
→ más estable  
