# DASHWEY — BACKLOG (PRIORITIZED)

## 🔴 CRÍTICO — COSTE / RIESGO REAL

### FIREBASE (DINERO DIRECTO)

- [ ] Auditar writes por flujo real:
  - venta Loyverse
  - creación/edición producto
  - cambios grupos
  → output: writes/acción

- [ ] Detectar múltiples save() por acción
  → instrumentar logs:
  `[SAVE] ts + origen + count`

- [ ] Verificar throttle global save() (10s)
  → confirmar que NO hay bypass

---

### SYNC / CONSISTENCIA

- [ ] Detectar loops de save()
  → patrón:
  write → snapshot → write

- [ ] Verificar idempotencia Loyverse:
  - dedup por `receiptId`
  - no recreación de ventas

- [ ] Test multi-device real:
  - 2 dispositivos activos
  - cambios simultáneos
  - validar convergencia

---

## 🟠 ALTO IMPACTO — PERFORMANCE / ESCALABILIDAD

### RENDER

- [ ] Throttle global `App.dash.render()`
  → evitar 40+ callsites sin control
  → implementar scheduler (RAF + flag)

- [ ] Evitar renders sin cambios reales
  → hash/diff antes de render

---

### FIRESTORE

- [ ] Subcolecciones:
  - añadir `limit`
  - añadir `orderBy`
  → evitar snapshots completos

- [ ] Revisar listeners activos
  → evitar duplicados

---

### LOYVERSE

- [ ] Validar `created_at` vs `receipt_date`
  → evitar drift por timezone

- [ ] Evaluar reducción payload sync
  → si API lo permite

---

## 🟡 INTEGRIDAD FUNCIONAL

- [ ] Test `validarIntegridad()` grupos:
  - escenarios edge
  - rounding
  - grandes volúmenes

- [ ] Test FIFO con ventas Loyverse:
  - consumo correcto lotes
  - coste real aplicado

---

## 🟢 OPTIMIZACIÓN (SIN PRISA)

- [ ] Índices cacheados adicionales (solo si necesario)
- [ ] Optimización de cálculo ROI
- [ ] Reducir recalculos dashboard

---

## 🔵 PAUSADO (NO TOCAR)

- [ ] TPV Dashwey
- [ ] Features nuevas grandes
- [ ] Refactors estructurales

---

## ✅ COMPLETADO ESTA SESIÓN (2026-04-26)

### Navegación (v1.3.1206 → v1.3.1209)
- ✅ Fix `_initNavActive` con getElementById (no idx posicional)
- ✅ Reinserción `tab-almacen` dentro de `swipe-track`
- ✅ DOM swap track → `[TPV | Almacén | Dashboard]`
- ✅ `_logicalToPhysical` mapping coherente
- ✅ Swipe direction alineado con navbar visual

### Motion System (v1.3.1210 → v1.3.1212)
- ✅ Fix bug crítico: variables CSS recursivas
- ✅ Haptics premium profile
- ✅ Ripple expandido a 14 elementos
- ✅ Pressed states premium en 8 componentes
- ✅ Toast bouncy entrance
- ✅ Track transitions con --spring-nd
- ✅ GPU acceleration swipe
- ✅ Stagger entrance Almacén items

### Stabilization (v1.3.1213)
- ✅ `_syncNavActive` cobertura completa (incluye bt-3)
- ✅ Haptic debounce 40→80ms
- ✅ Mappings físicos unificados a `_logicalToPhysical`
- ✅ Comentarios obsoletos limpiados

---

## ⚠️ REGLA DE BACKLOG

Nada entra en desarrollo si no responde:

1. ¿Reduce coste Firebase?
2. ¿Mejora estabilidad sync?
3. ¿Evita un bug crítico?

Si NO cumple al menos uno → NO se hace.
