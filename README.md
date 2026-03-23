# PropuestasAI

Generador automatico de materiales de propuesta tecnica y comercial para consultoras de software y agencias de IA. Toma la informacion de un discovery previo y produce infografias, presentaciones HTML y documentos listos para entregar al cliente — en menos de 30 minutos.

---

## El Problema

Las consultoras y agencias invierten entre **14 y 18 horas-hombre por cada propuesta comercial**:

- Arquitecto tecnico: 6 horas en estructurar el brief y crear diapositivas tecnicas
- Gestor comercial: 8 horas en infografias con identidad de marca y propuesta con tarifas
- Costo promedio: **$340 por propuesta** (sin contar costo de oportunidad)

**PropuestasAI reduce ese tiempo a menos de 30 minutos y el costo a menos de $10 en APIs.**

---

## Premisa importante

> El formulario de 5 pasos **NO genera el discovery** — lo captura.
>
> Se asume que el arquitecto ya realizo el proceso de discovery con el cliente (reuniones, analisis del problema, definicion de la solucion, estimacion de presupuesto). La app toma esa informacion elaborada y produce los materiales visuales con la identidad del cliente.

---

## Quienes lo usan

| Rol | Que hace en la app |
|-----|--------------------|
| **Arquitecto Tecnico** | Crea el proyecto, configura la identidad de marca, captura el discovery en el formulario de 5 pasos, revisa y aprueba el storyboard, genera infografias y presentacion tecnica |
| **Gestor Comercial** | Accede cuando la fase tecnica esta completa, completa la propuesta comercial, genera infografias y presentacion comercial |
| **Administrador** | Acceso total + bitacora de uso de IA en `/admin/ai-usage` |

---

## Flujo completo

```
Crear proyecto
      |
Configurar Brand Identity (editor Markdown con colores, tipografia, logo)
      |
Brief Tecnico - 5 pasos (captura del discovery: problema, solucion, stack, decisiones, entregables)
      |
Storyboard Tecnico  <- IA genera contenido contextual del brief
(borrador textual -> revisar -> iterar -> aprobar)
      |
Infografias Tecnicas (3 variantes con IA, progreso en tiempo real)
      |
[PENDIENTE] Presentacion Tecnica (10 slides HTML)
      |
[PENDIENTE] Fase Comercial
```

---

## Capa de IA

### Cliente unificado: Gemini -> OpenRouter

Toda la generacion de IA pasa por `src/lib/ai-client.ts`:

- **Primario**: Gemini API directa (`GEMINI_API_KEY`) — free tier sin costo
- **Fallback automatico**: OpenRouter SDK cuando Gemini no esta disponible
  - Se activa en: 400 / 429 / 404 / 503 / RESOURCE_EXHAUSTED / API_KEY_INVALID
- **Modelo**: `google/gemini-3.1-flash-image-preview` en ambos proveedores
- **Transparente**: el fallback ocurre silenciosamente, sin interrupciones al usuario

### Bitacora de uso: `ai_usage_logs`

Cada llamada registra: provider, model, task_type, tokens, cost_usd, latency_ms, is_revision.
La tabla `is_revision` mide calidad del modelo: true cuando el usuario pidio cambios.

### Dashboard admin: `/admin/ai-usage`

Solo visible para rol `admin`. Muestra:
- Balance OpenRouter en tiempo real (comprados / usados / restantes)
- Rating de modelos por tasa de revision (% outputs que requirieron ajustes — menor = mejor)
- Bitacora completa de generaciones con filtros por proyecto

### Widget de creditos por proyecto

En cada etapa del flujo aparece un widget lateral con tokens acumulados,
costo total y contadores por tipo de generacion (Storyboard, Infografias).

---

## Variables de entorno (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# IA - Gemini API directa (primario, free tier)
GEMINI_API_KEY=AIzaSy...

# IA - OpenRouter SDK (fallback automatico cuando Gemini no responde)
OPENROUTER_API_KEY=sk-or-...

# URL del sitio
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Secreto para llamadas server-to-server (default: propuestasai-internal)
INTERNAL_API_SECRET=propuestasai-internal
```

---

## Stack Tecnico

```yaml
Framework:   Next.js 16 (App Router) + React 19 + TypeScript
Database:    Supabase (PostgreSQL + Auth + Storage + Realtime)
Estilos:     Tailwind CSS 3.4
Estado:      Zustand
Validacion:  Zod
IA:          Gemini API directa (primario) -> @openrouter/sdk (fallback)
Modelo:      google/gemini-3.1-flash-image-preview (texto + imagen)
Realtime:    Supabase Realtime (progreso de generacion de infografias)
Deploy:      Vercel
```

---

## Como instalarlo

```bash
git clone https://github.com/gbandala/propuestas-ai.git
cd propuestas-ai
npm install
cp .env.example .env.local   # editar con tus credenciales
npm run dev
# Disponible en http://localhost:3000
```

Tablas Supabase requeridas: `profiles`, `projects`, `technical_briefs`, `brand_identity`,
`storyboards`, `infographics`, `generation_jobs`, `ai_usage_logs`, `downloads`

Primer usuario: rol `architect` por defecto. Para cambiar a `admin`:
Supabase Dashboard -> tabla `profiles` -> columna `role`.

---

## Servicios externos

| Servicio | Para que | Donde obtenerlo |
|----------|----------|-----------------|
| **Supabase** | Base de datos, auth, storage, realtime | supabase.com |
| **Google AI Studio** | `GEMINI_API_KEY` (free tier) | aistudio.google.com |
| **OpenRouter** | `OPENROUTER_API_KEY` (fallback de IA) | openrouter.ai |

---

## Deploy en Vercel

```bash
vercel
```

Variables requeridas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `INTERNAL_API_SECRET`

---

## Comandos de desarrollo

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run typecheck    # Verificar tipos TypeScript
npm run lint         # ESLint
```

---

## Estado actual (2026-03-22)

### Implementado
- [x] Auth completo con 3 roles (architect / commercial / admin)
- [x] Projects CRUD + dashboard
- [x] Brand Identity (editor Markdown + preview + plantilla base)
- [x] Technical Brief — 5 pasos arquitectura-first
- [x] Storyboard con IA real (Gemini/OpenRouter genera contenido contextual del brief)
- [x] Infographic Generation — 3 variantes async con progreso Realtime
- [x] Capa AI unificada: Gemini primario (free) -> OpenRouter fallback (automatico)
- [x] Bitacora de uso `/admin/ai-usage` (balance OpenRouter, rating de modelos, logs)
- [x] Widget Creditos IA por proyecto en cada etapa del flujo

### Pendiente
- [ ] Presentation Generation (HTML 10 slides)
- [ ] Commercial Proposal
- [ ] Downloads (ZIP tecnico / comercial / completo)
