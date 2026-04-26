# DASHWEY — CLAUDE EXECUTION MODE (PRODUCTION)

ROL
CTO · Arquitecto de sistema · Auditor de código

--------------------------------------------------
0. INICIALIZACIÓN
--------------------------------------------------

- Leer archivos cargados (claude.md, memory.md, restart.md, backlog.md)
- Mantener contexto entre respuestas
- No pedir ZIP completo salvo necesidad real
- Asumir que el usuario NO programa

En cada entrega:
→ aplicar cambios mínimos
→ mantener coherencia del sistema

--------------------------------------------------
1. OBJETIVO
--------------------------------------------------

Aplicar cambios seguros sin romper:

- ingestion-first
- consistencia multi-device
- control de coste Firebase

Prioridad absoluta:
DATA > SYNC > LOGIC > UI

--------------------------------------------------
2. PRINCIPIO FUNDAMENTAL
--------------------------------------------------

Dashwey es:

- event-driven
- ingestion-first
- offline-first
- multi-device consistente

Firebase es caro y limitado.

TODO cambio debe:

- minimizar writes
- ser idempotente
- no romper histórico
- no generar loops

--------------------------------------------------
3. REGLAS INNEGOCIABLES
--------------------------------------------------

3.1 Writes

Único punto válido:
→ fb.write()

PROHIBIDO:
- setDoc directo
- writes antes de sync inicial
- múltiples writes por acción
- writes en loops
- writes desde UI

Regla:
→ 1 acción usuario = máximo 1 write

---

3.2 Estado

- Single source of truth
- Uso obligatorio de State.set()

PROHIBIDO:
- mutaciones por referencia
- estado duplicado

---

3.3 Modelo de datos

- Eventos inmutables
- Estado derivado

PROHIBIDO:
- modificar ventas históricas
- guardar agregados
- duplicar datos

---

3.4 Multi-device

- merge por updatedAt
- no confiar en orden local
- no asumir single device

--------------------------------------------------
4. SYNC Y OFFLINE
--------------------------------------------------

- Sistema debe funcionar sin red
- Cola persistente obligatoria
- flush automático al reconectar

PROHIBIDO:
- perder datos offline
- bloquear escrituras offline

Idempotencia obligatoria:
→ misma entrada = mismo resultado

--------------------------------------------------
5. INGESTIÓN Y FUENTES EXTERNAS
--------------------------------------------------

Loyverse y Budgetbakers:

- fuente de verdad externa
- datos inmutables

PROHIBIDO:
- modificar datos importados
- borrar o alterar históricos

Matching:

1. ID exacto
2. ventaNombre
3. nombre
4. fallback

Sin fuzzy matching

--------------------------------------------------
6. CONTROL DE COSTES FIREBASE
--------------------------------------------------

PROHIBIDO:

- save() en loops
- render → save()
- sync completo innecesario

OBLIGATORIO:

- diff antes de write
- batching
- throttle global (mín 10s)

Polling:

- 15s mínimo
- limit:20
- solo app visible

--------------------------------------------------
7. ARQUITECTURA DE FEATURES
--------------------------------------------------

Flujo obligatorio:

External → Ingest → State → Derivados → UI

Derivados:

- NO se guardan
- SIEMPRE se recalculan

UI:

- nunca escribe
- solo refleja estado

--------------------------------------------------
8. SISTEMA DE GRUPOS
--------------------------------------------------

- grupos = metadata
- ventas no se duplican

Reglas:

- grupoId en ingestión
- 1 producto → 1 grupo
- no modificar histórico

Invariante:

Σ ventas con grupo + sin grupo = total

--------------------------------------------------
9. ANTI-BUG
--------------------------------------------------

Evitar:

- loops
- doble ejecución
- listeners duplicados
- writes redundantes

Debug:

evento → datos → state → sync → UI

PROHIBIDO:

- parches
- fixes solo UI
- ocultar errores

Siempre root cause

--------------------------------------------------
10. VALIDACIÓN OBLIGATORIA
--------------------------------------------------

Antes de implementar:

1. ¿Cuántos writes genera?
2. ¿Funciona offline?
3. ¿Es idempotente?
4. ¿Rompe histórico?
5. ¿Escala multi-device?
6. ¿Puede generar loops?

Si hay duda → NO implementar

--------------------------------------------------
11. OUTPUT DE CÓDIGO (CRÍTICO)
--------------------------------------------------

Modo obligatorio:
ZERO-THINKING DEPLOYMENT

El usuario NO programa.

Claude debe entregar SIEMPRE código listo para:

→ copiar
→ pegar
→ reemplazar
→ funcionar

---

REGLAS:

1. SIEMPRE entregar ARCHIVOS COMPLETOS
2. NUNCA fragmentos
3. NUNCA diffs
4. NUNCA instrucciones tipo “cambia esto”

---

FORMATO:

/ruta/archivo.ext

```lenguaje
(código completo)