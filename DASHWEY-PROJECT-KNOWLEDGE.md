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
4. NUNCA instrucciones tipo "cambia esto"

---

FORMATO:

/ruta/archivo.ext

```lenguaje
(código completo)
```

--------------------------------------------------
12. ZIP DELIVERY POLICY (CRÍTICO)
--------------------------------------------------

Durante la sesión (mid-session):
→ entregar SOLO ZIP DEPLOY (5 archivos):
   - index.html
   - sw.js
   - version.json
   - version.txt
   - manifest.json

Al CIERRE de sesión:
→ entregar ZIP COMPLETO con TODOS los archivos del proyecto:
   - index.html, sw.js, version files, manifest.json
   - memory.md (actualizado)
   - restart.md (actualizado)
   - backlog.md (actualizado)
   - claude.md (actualizado)
   - DASHWEY-PROJECT-KNOWLEDGE.md (si aplica)
   - firestore.rules (si aplica)

--------------------------------------------------
13. CONSOLE COMMANDS (CRÍTICO)
--------------------------------------------------

Cuando se requieran comandos DevTools:
→ entregar SIEMPRE en un ÚNICO bloque copia-pega
→ JAMÁS fragmentar
→ Un solo snippet ejecutable end-to-end

--------------------------------------------------
14. FIXES GLOBALES (CRÍTICO)
--------------------------------------------------

En Dashwey NO existen fixes locales.

TODO bug debe tratarse como:

→ problema sistémico
→ no problema de UI o módulo aislado


REGLA OBLIGATORIA:

Antes de implementar cualquier fix, Claude debe:

1. Identificar la CAPA real del problema:

- ingestión
- modelo de datos
- estado
- sync
- derivados


2. Evaluar impacto en TODO el sistema:

- dashboard
- flujo de caja
- historial
- cuentas
- KPIs
- sync multi-device


3. Aplicar solución GLOBAL:

- corregir en origen
- no parchear en destino


PROHIBIDO:

- fixes solo en UI
- fixes solo en un módulo
- duplicar lógica para "arreglar visualmente"
- inconsistencias entre vistas


EJEMPLO:

Si falla "últimos movimientos":

❌ NO:
arreglar solo flujo de caja

✅ SI:
corregir fuente de datos / derivación
y validar en:

- historial ventas
- cuentas
- dashboard
- sync


VALIDACIÓN OBLIGATORIA:

Claude debe confirmar:

→ el fix afecta correctamente a TODO el sistema
→ no genera divergencias entre vistas

--------------------------------------------------
15. ICONOGRAFÍA — POLÍTICA OFICIAL (v1.3.1176+)
--------------------------------------------------

Definida en sesión 2026-04-26 tras análisis de industria
(Linear, Stripe, Loyverse, Square, Shopify).

PRINCIPIO:
"SVG cuando es estructura de UI · Emoji cuando es expresión humana o celebración rara"

15.1 USAR SVG (Lucide) PARA:

- Headers de módulos (TPV, Dashboard, Almacén, Ajustes)
- Bottom navbar
- Botones de acción (primarios y secundarios)
- Status indicators (online/offline/sync/synced)
- Toasts de status (error, success, warning, info)
- Empty states principales
- Cards del dashboard
- Iconos de listas (cuentas, productos, proveedores)
- Modales y sheets

Color: var(--ink) o currentColor (heredar contexto)
Stroke: 1.8px estándar Lucide
Tamaños: 16px (inline), 20px (botones), 24px (headers)

15.2 USAR EMOJI ÚNICAMENTE PARA:

- Bienvenida login (👋) — calidez inicial 1 vez por sesión
- Hitos celebrativos raros (🎉) — primera venta del día, etc.
- Notas/comentarios escritos por el usuario
- Categorías que el usuario crea libremente

15.3 NUEVO CÓDIGO (REGLA HARD):

A partir de v1.3.1177:
→ TODO nuevo código UI usa SVG, NO emoji
→ Cuando se modifica componente con emojis existentes,
  migrar sus emojis como parte del trabajo

15.4 LIMITACIÓN TÉCNICA ACTUAL:

showToast() usa textContent (no HTML).
Para soportar SVG en toasts requiere refactor.
→ Ver backlog.md "Migración Iconografía a SVG"

15.5 ESTADO ACTUAL (v1.3.1176):

- 1.171 ocurrencias de emoji en index.html
- 137 emojis distintos
- Top: ⚠️ (217×), ✅ (123×), 📦 (77×), 🏪 (33×)
- Migración pendiente: ver backlog
