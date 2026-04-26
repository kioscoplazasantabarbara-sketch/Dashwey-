# DASHWEY — RESTART (SESSION CONTEXT)

## ÚLTIMA VERSIÓN
**v1.3.1213** (estabilizada post-cambios UI/UX masivos)

## ESTADO ACTUAL

Sistema en producción, estable, con:

- Loyverse integrado (ventas realtime polling 15s)
- Budgetbakers integrado (gastos)
- Grupos de venta Fase 2 (Dashboard activo)
- Sync multi-device robusto
- Sistema anti-zombies + auto-heal activo
- Firebase en modo coste controlado
- **Design System Motion v2 (premium)** — curvas reales, ripple expandido, pressed states
- **Navegación canónica estable** — Almacén ← Dashboard → Ajustes con animaciones coherentes
- **Track DOM reordenado** — `[TPV | Almacén | Dashboard]` con mapping `_logicalToPhysical`

TPV Dashwey:
→ PAUSADO (no tocar) — cold module

## LO ÚLTIMO IMPLEMENTADO (sesión 2026-04-26)

### Motion Overhaul (v1.3.1210 → v1.3.1212)
- Bug crítico fijado: `var(--spring)` y `var(--ease-enter)` recursivos → ahora cubic-bezier reales
- Haptics premium profile (12-32ms web + ImpactStyle nativo APK)
- 14 elementos con ripple effect (era 7)
- Pressed states premium en navbar/cards/sd-row/alm-item/btn-confirm/sd-toggle/btn-primary/chip
- Toast con entrada bouncy (translateY+scale spring)
- Track transitions con --spring-nd
- GPU acceleration en swipe (translateZ + backface)
- Stagger entrance en items Almacén

### Navegación estable (v1.3.1206 → v1.3.1209)
- Bug crítico `_initNavActive`: usaba idx posicional con DOM no secuencial → fix con getElementById
- Bug crítico `tab-almacen` fuera del swipe-track → reinsertado dentro
- DOM swap: track ahora `[TPV | Almacén | Dashboard]`
- `_logicalToPhysical` mapping: 0→0, 1→2, 2→1
- Swipe direction coherente con orden visual del navbar

### Stabilization audit (v1.3.1213)
- `_syncNavActive` reescrito (cobertura completa todos los .bt)
- Haptic debounce 40→80ms (anti-doble touchend+onclick)
- 2 inline mappings unificados a `_logicalToPhysical`
- Comentarios obsoletos limpiados

## PROBLEMA / FOCO ACTUAL

Prioridad absoluta:

1. Reducir coste Firebase
2. Evitar cualquier bug de sync
3. Mantener estabilidad total

NO prioridad:
- nuevas features grandes
- refactors estructurales
- más cambios de UX/motion (sistema ya estable y premium)

## SIGUIENTE PASO (INMEDIATO)

Antes de cualquier desarrollo:

→ Auditar coste real de:
- writes por venta Loyverse
- frecuencia save()
- polling vs writes

Luego decidir:

- optimización writes
- reducción renders innecesarios
- mejoras de batching

## REGLAS PARA ESTA SESIÓN

- NO tocar sync sin justificación fuerte
- NO aumentar writes
- NO modificar eventos históricos
- NO introducir lógica en UI
- NO tocar navegación (estabilizada en v1.3.1213)
- NO tocar motion system (estabilizado en v1.3.1212)

## CONTEXTO IMPORTANTE

- Firebase es cuello de botella
- Multi-device ya es estable (no romper)
- Sistema ya complejo → evitar sobre-ingeniería
- Cualquier cambio debe ser quirúrgico

## INVARIANTES CRÍTICAS (NO ROMPER)

### Navegación
- swipe-track DEBE tener exactamente 3 hijos directos: tab-tpv, tab-almacen, tab-dashboard
- `_logicalToPhysical`: 0→0, 1→2, 2→1 (NO identity, NO swap inverso)
- `_initNavActive` y `_syncNavActive`: usar IDs explícitos 'bt-N', NO idx posicional
- `_fixTrack`: usar render() NO refresh() (refresh dispara fb.read+save = bucle)

### CSS Motion
- `var(--spring)` y `var(--ease-enter)`: NUNCA recursivos a sí mismos
- Curvas como cubic-bezier explícitos

### Firebase
- save() solo vía State.set → _writeFirebase
- Nunca writes directos a colecciones separadas
- _DashweyApplyingRemote bloquea correctamente saves durante apply

### UI
- transitionend SIEMPRE con setTimeout fallback
- @keyframes ripple PROHIBIDO (causa flickering WebView)
- native confirm() PROHIBIDO (bloqueado Android WebView)
- window.X attachments explícitos

## SI HAY DUDA

Elegir siempre:

→ menos writes
→ más simple
→ más estable
