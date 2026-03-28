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
Storyboard de Infografias  <- IA genera 3 descripciones visuales, editar por seccion, aprobar
      |
Infografias Tecnicas (3 variantes PNG con IA, lightbox, regenerar individual, seleccion opcional)
      |
Storyboard de Presentacion  <- IA genera 10 slides textuales, editar, aprobar
      |
Presentacion Tecnica (10 slides PNG 1376x768 con IA, polling en tiempo real, lightbox, retry con comentario, descarga PPTX)
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
costo total y contadores por tipo de generacion (Storyboard / Infografias / Slides).

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
`storyboards`, `infographics`, `presentation_slides`, `generation_jobs`, `ai_usage_logs`, `downloads`

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

## Escalabilidad y Gestión de Storage

### Límites por plan de Supabase

Cada propuesta genera archivos en el bucket `project-assets`:

| Recurso | Tamaño estimado | ×100 propuestas |
|---------|----------------|-----------------|
| Logo (PNG) | ~500 KB | 50 MB |
| Fondo (PNG) | ~1.5 MB | 150 MB |
| 10 slides generados (~1 MB c/u) | ~10 MB | ~1,000 MB |
| **Total por propuesta** | **~12 MB** | **~1.2 GB** |

| Plan Supabase | Storage | Precio | Propuestas activas |
|---------------|---------|--------|--------------------|
| Free | 1 GB | $0 | ~80 propuestas |
| Pro | 100 GB | $25/mes | ~8,000 propuestas |

### Regla de higiene: sin archivos huérfanos

Cada vez que se regenera un slide, el archivo anterior se **borra del bucket** antes de subir el nuevo.
Esto garantiza que el storage nunca acumule versiones obsoletas y el plan Free se mantenga viable.

### Gestión del ciclo de vida de propuestas

Para mantener el storage bajo control en producción:

1. **Monitor de storage** — widget en `/admin` con MB usados / límite del plan / alerta al 80%
2. **Archivo de propuestas** — al archivar un proyecto: se genera ZIP (brief + storyboard + slides) y se borran los archivos del bucket
3. **Limpieza automática** — propuestas archivadas con más de 90 días se marcan para limpieza (el admin aprueba o cancela)

### Ruta de migración

```
Free (1 GB) → hasta ~80 propuestas activas simultáneas
Pro ($25/mes) → hasta ~8,000 propuestas → cubre cualquier agencia mediana
Extra GB ($0.021/GB) → escalable linealmente
```

---

## Estado actual (2026-03-28)

### Implementado — Flujo de propuesta unificada completo
- [x] Auth completo con 3 roles (architect / commercial / admin)
- [x] Projects CRUD + dashboard con sección de proyectos archivados
- [x] Brand Identity (editor Markdown + preview + upload logo/fondo + compositing logo en slides)
- [x] Brief del Proyecto — captura libre del discovery en Markdown
- [x] Storyboard de Propuesta — 7 slides, generación IA, edición por sección, aprobación iterativa, regeneración por slide
- [x] Infografías de la Propuesta — 7 slides PNG 1280×960 async con IA
  - Logo composited top-right via sharp (sin recuadro blanco — prompt no menciona el logo)
  - Polling setInterval(3s), lightbox fullscreen, regenerar individual
  - Al regenerar: borra archivo anterior del bucket (sin archivos huérfanos)
- [x] Descarga PPTX (infografías ordenadas por slide_index)
- [x] Capa AI unificada: Gemini primario (free) → OpenRouter fallback automático
- [x] Flash/Pro toggle por proyecto (image_quality en BD)
- [x] Bitácora de uso `/admin/ai-usage` (balance OpenRouter, rating de modelos, logs)
- [x] Widget créditos IA: tokens + costo + Storyboard / Infografías
- [x] Storage lifecycle completo (PRP-006):
  - Monitor de storage en `/admin/ai-usage` con plan selector, barra progreso y top 5 proyectos
  - Auto-limpieza: ZIP de proyectos completados >30 días + limpieza del bucket
  - Proyectos archivados: visibles en dashboard, brief/storyboard legibles, slides en ZIP
  - Dashboard `/admin/storage`: tabla completa de todos los proyectos con tamaño real en bucket
  - Limpieza permanente de archivados >90 días: borra ZIP, archivos y todos los registros de BD (solo admin, con confirmación inline)

### Pendiente
- [ ] ZIP generator manual (brief + infografías + PPTX a demanda)
- [ ] Historial de versiones de storyboard
