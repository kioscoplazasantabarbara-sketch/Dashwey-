# DASHWEY — Diseño: Sistema de Iconos y Edición de Movimientos
> Documento de arquitectura. No implementar sin aprobación explícita.

---

## 1. SISTEMA DE ICONOS

### Problema actual
Existen dos usos completamente distintos de emojis en la app:

| Tipo | Ejemplos | ¿Modificable? |
|---|---|---|
| **Data icons** (en Firebase) | `prov.icon`, `p.e` (emoji del producto) | ❌ NO — son datos del usuario |
| **UI icons** (en HTML generado) | botones, toasts, labels | ✅ SÍ — son presentación |

### Arquitectura propuesta

**Capa de abstracción `UI_ICONS`** — objeto global con SVGs monocromos:

```js
const UI_ICONS = {
  trash:    '<svg width="14" height="14" ...>...</svg>',
  edit:     '<svg ...>...</svg>',
  check:    '<svg ...>...</svg>',
  plus:     '<svg ...>...</svg>',
  arrow:    '<svg ...>...</svg>',
  // etc.
};
```

**Regla de uso:**
- `UI_ICONS.trash` para botones/acciones de UI
- `p.e || '📦'` para mostrar el icono del producto (dato del usuario, inmutable)
- `prov.icon || '🏪'` para mostrar el icono del proveedor (dato del usuario, inmutable)

### Estrategia de migración (NO ejecutar ahora)

**Fase 1** — Solo toasts y labels de botones (bajo riesgo):
- Reemplazar emojis en `showToast()` calls por texto plano
- No afecta Firebase, no afecta datos

**Fase 2** — Botones de acción en modales generados (medio riesgo):
- Sustituir `'🗑️ Borrar'` → `UI_ICONS.trash + ' Borrar'`
- Solo en HTML generado por JS, no en datos

**Fase 3** — Iconos de categorías en UI (requiere migración de datos):
- Requiere campo separado `iconType: 'emoji' | 'svg'` en producto/proveedor
- Migración suave: si `iconType` no existe → usar emoji legacy
- Prohibido hasta tener estrategia de migración Firebase aprobada

### PROHIBIDO hasta nueva orden
- Modificar `prov.icon`, `p.e` o cualquier campo almacenado en Firebase
- Migración masiva de datos sin feature flag

---

## 2. EDICIÓN RETROACTIVA DE MOVIMIENTOS

### Problema de consistencia

Editar un gasto/ingreso pasado afecta `cuentas.saldo` que es un campo **calculado y almacenado**.
Si A edita un movimiento y B está offline con saldo diferente → conflicto irresoluble con last-write-wins.

### Tres opciones evaluadas

#### A. Event Sourcing
- Estado = replay de todos los eventos ordenados por timestamp
- **Pro:** consistencia perfecta, auditable
- **Contra:** requiere refactor completo de State + Firebase. Estimación: 8–12 sesiones
- **Veredicto:** descartado por coste

#### B. Ledger inmutable + compensaciones ✅ RECOMENDADO
- Los movimientos existentes son inmutables
- "Editar" = crear movimiento de compensación + nuevo movimiento con valor correcto
- `cuentas.saldo` se recalcula en `_confirmarMovimiento` como siempre
- **Pro:** sin refactor de State, compatible con sync actual, auditable
- **Contra:** historial crece; requiere UI que muestre compensaciones de forma legible
- **Estimación:** 2–3 sesiones

**Implementación propuesta:**
```js
// "Editar" gasto de 100€ → 80€
// 1. Añadir compensación:
addGasto({ id: 'comp_' + originalId, importe: -100, tipo: 'compensacion', ref: originalId })
// 2. Añadir nuevo valor:
addGasto({ id: 'edit_' + originalId, importe: 80, tipo: 'edicion', ref: originalId })
// La cuenta recibe: -100 (comp) + (-80) = ajuste neto correcto
// UI filtra tipo:'compensacion' y los muestra agrupados con el original
```

#### C. Recálculo completo desde historial
- `cuentas.saldo = 0 + suma(todos los movimientos)`
- **Pro:** siempre consistente
- **Contra:** requiere que TODOS los movimientos estén en Firebase (actualmente gastosOp e ingresosFin son last-write-wins, no append-only). Migración compleja.
- **Veredicto:** viable a largo plazo, pero requiere cambio de modelo de datos primero

### REQUISITO PREVIO antes de implementar B
Antes de implementar edición de movimientos, hacer **gastosOp e ingresosFin append-only**:
1. Añadirlos a `_MERGE_KEYS` en el sistema de sync
2. Crear `updateGasto(id, patch)` que muta el item in-place (como `updateProd`)
3. Asegurar que el merge por ID en `onSnapshot` los consolida correctamente

**Este prerequisito es ~1 sesión de trabajo y debe aprobarse por separado.**

### PROHIBIDO hasta nueva orden
- Mutar `gastosOp` o `ingresosFin` retroactivamente sin el prerequisito
- Implementar edición que no tenga compensación de saldo

---

*Documento creado en sesión v1.3.874-dev. Actualizar si cambia el modelo de datos.*
