# BUSINESS_LOGIC.md - PropuestasAI

> Generado por SaaS Factory V4 | Fecha: 2026-03-16 | Actualizado: 2026-03-25

---

## 1. Problema de Negocio

**Dolor:** Las consultoras de software y agencias de IA pierden entre 14 y 18 horas hombre por cada propuesta comercial. El arquitecto técnico invierte 6 horas en el análisis y brief técnico en PPT, y el gestor comercial invierte 8 horas adicionales creando infografías con identidad de marca y la propuesta comercial con tarifas.

**Costo actual por propuesta:**
- Arquitecto técnico: 6 horas × $30/hr = **$180**
- Gestor comercial: 8 horas × $20/hr = **$160**
- **Total: $340 por propuesta** (sin contar costo de oportunidad)

---

## 2. Solución

**Propuesta de valor:** Un generador automático de materiales de propuesta técnica y comercial (infografías + presentaciones HTML/PDF) para arquitectos y gestores comerciales de consultoras de software, usando IA para crear el contenido visual en minutos con identidad de marca propia.

### Premisa del flujo

> **El formulario de 5 pasos NO genera el discovery — lo captura.**
>
> Se asume que antes de usar la app, el arquitecto ya realizó un proceso de discovery con el cliente: reuniones, análisis del problema, definición de la solución técnica, estimación de presupuesto y roadmap. La app es la herramienta que toma esa información ya elaborada y produce los materiales de presentación (infografías + slides) en minutos, con la identidad visual del cliente.

### Flujo principal (Happy Path) — Propuesta Unificada

> **Rediseño 2026-03-25 (PRP-005):** El flujo técnico/comercial separado fue reemplazado por una propuesta unificada. El output final es un único PPTX con 7–10 slides infográficos generados con IA.

#### Fase 0: Preparación
1. Usuario crea el proyecto en la app (nombre del cliente, descripción)
2. Configura la **identidad de marca** del cliente: sube o edita un archivo Markdown con colores, tipografía, tono visual, logo y fondo. Si no tiene uno, parte de una plantilla base editable. Upload máx. 5 MB por imagen.

#### Fase 1: Brief (captura del discovery)
3. Usuario completa el formulario de 5 pasos con la información del discovery previo:
   - Datos del cliente y proyecto
   - Descripción del problema y sus impactos
   - KPIs actuales y objetivos (ROI esperado)
   - Tabla de funcionalidades con prioridad (Must/Should/Could)
   - Integraciones técnicas, presupuesto y arquitectura
4. Sistema genera brief técnico en Markdown automáticamente y marca `technical_completed_at`

#### Fase 2: Storyboard
5. Sistema genera **storyboard de propuesta** (7 slides estándar con estructura fija):
   - Encabezado / Problema & KPIs / Solución & Flujo / Arquitectura / Entregables & Equipo / Roadmap / Inversión & ROI
   - Usuario revisa, aprueba o solicita ajustes con comentarios
   - El sistema regenera el storyboard completo con los comentarios incorporados
   - Aprobación queda registrada en `storyboards.approved_at`

#### Fase 3: Infografías (generación IA)
6. Con el storyboard aprobado, sistema genera 1 infografía por slide (7–10 imágenes, 1376×768 px, Gemini Flash Image)
   - Cada slide tiene prompts con layout específico según su tipo (ROI, flujo, arquitectura, etc.)
   - Generación async: fire-and-forget + polling cada 3s
   - Cards con estado en tiempo real (pendiente / generando / listo / error)
   - Retry individual por slide
   - Lightbox de preview con navegación por teclado
   - Cada infografía se guarda en `infographics.slide_index`

#### Fase 4: Descarga PPTX
7. Con al menos 1 infografía generada, usuario descarga el PPTX
   - PPT lee `infographics` ordenados por `slide_index`
   - Archivo: `{cliente}_propuesta.pptx`
   - Layout WIDE (33.87 × 19.05 cm), imagen full-bleed por slide

---

## 3. Usuario Objetivo

**Roles:**
- **Usuario** — realiza el discovery con el cliente, captura la información en el formulario, genera y aprueba el storyboard, genera infografías y descarga el PPTX
- **Administrador del Sistema** — accede a la Bitácora de IA (uso por proyecto, rating de modelos, créditos OpenRouter), gestiona usuarios y permisos

**Contexto:** Consultoras de transformación digital y agencias de soluciones de IA que generan entre 5 y 30 propuestas por mes. Actualmente usan PPT + NotebookLLM + edición manual. El dolor más grande del comercial es quitar marcas de agua de herramientas gratuitas y mantener coherencia de marca.

---

## 4. Arquitectura de Datos

**Input:**
- Datos del cliente y proyecto (nombre, empresa, fecha, arquitecto responsable)
- Descripción del problema y sus impactos (min 3 puntos)
- KPIs actuales y objetivos con timeline
- Tabla de funcionalidades con prioridad (Must/Should/Could)
- Integraciones técnicas (BD, APIs externas, sistemas propios)
- Tabla de recursos y presupuesto (por tipo: VPS, Storage, licencias)
- Descripción de arquitectura y stack tecnológico propuesto
- Fases de implementación con duración y fechas
- Brand identity en Markdown: colores HEX, tipografías, tono visual, logo URL, texturas
- Propuesta comercial en Markdown (descripción ejecutiva, beneficios, caso de uso)
- Tabla de fases con costos (Discovery, Diseño, Implementación, Rollout)
- Roadmap con actividades, fechas y equipos

**Output:**
- `brief-tecnico.md` — documento técnico completo (generado del formulario 5 pasos)
- `storyboard-propuesta.md` — 7 slides con título, objetivo visual, elementos y texto (aprobado por el usuario)
- 7–10 infografías PNG 1376×768 con IA (una por slide del storyboard)
- `{cliente}_propuesta.pptx` — PPTX descargable con slides infográficos, layout WIDE
- `brand-identity.md` — identidad visual del proyecto (colores, tipografía, logo, fondo)

**Storage (Supabase tables):**
- `projects` — id, name, client_name, user_id, status, description, technical_completed_at, created_at
- `briefs` — project_id, content (Markdown del discovery), created_at, updated_at
- `brand_identity` — project_id, markdown_content, logo_url, background_url, created_at, updated_at
- `storyboards` — id, project_id, type (`infographic`), content_md, version, approved_at, created_at
- `infographics` — id, project_id, slide_index (0–N), url, prompt_used, created_at (slide_index NOT NULL = propuesta)
- `generation_jobs` — id, project_id, type, status, progress, error, slide_number, created_at
- `ai_usage_logs` — project_id, user_id, task_type, provider, model, total_tokens, cost_usd, latency_ms, is_revision, revision_notes

---

## 5. KPI de Éxito

**Métrica principal:** Reducir el tiempo de generación de materiales de propuesta de 14 horas (6 arquitecto + 8 comercial) a menos de 30 minutos por propuesta completa.

**KPIs secundarios:**
- Costo por propuesta: de $340 a menos de $10 (costo API de IA)
- Consistencia de marca: 100% de materiales con colores y logo correctos (0% de marcas de agua)
- Capacidad de escala: procesar 20+ propuestas simultáneas sin degradación

---

## 6. Especificación Técnica (Para el Agente)

### Features a Implementar (Feature-First)

```
src/features/
├── auth/                    # Autenticación con 3 roles (architect, commercial, admin)
├── projects/                # CRUD de proyectos + dashboard
├── brand-identity/          # Editor Markdown de identidad visual + plantilla base + upload
├── technical-brief/         # Formulario multi-paso 8 pasos + generación brief MD
├── storyboard/              # Generación de storyboard textual + revisión + aprobación iterativa
├── infographic-generation/  # Generación async con IA + selección de variante
├── presentation-generation/ # Generación de HTML slides + preview
├── commercial-proposal/     # Editor Markdown + tablas de fases/costos/roadmap
└── downloads/               # ZIP generator + descarga por sección o completo
```

### Roles y Permisos (RLS en Supabase)

| Feature | Architect | Commercial | Admin |
|---------|-----------|------------|-------|
| Crear / editar proyecto | ✓ | ✗ | ✓ |
| Configurar brand identity | ✓ | ✗ | ✓ |
| Formulario técnico (5 pasos) | ✓ | ✗ | ✓ |
| Storyboard técnico (generar/aprobar) | ✓ | ✗ | ✓ |
| Generar infografías técnicas | ✓ | ✗ | ✓ |
| Generar presentación técnica | ✓ | ✗ | ✓ |
| Descargar ZIP técnico | ✓ | ✗ | ✓ |
| Ver brief técnico (read-only) | ✓ | ✓ (RO) | ✓ |
| Propuesta comercial | ✗ | ✓ | ✓ |
| Storyboard comercial (generar/aprobar) | ✗ | ✓ | ✓ |
| Generar infografías comerciales | ✗ | ✓ | ✓ |
| Generar presentación comercial | ✗ | ✓ | ✓ |
| Descargar ZIP comercial / completo | ✗ | ✓ | ✓ |
| Configurar API keys | ✗ | ✗ | ✓ |

### Lógica de Negocio Crítica

1. **Acceso condicional al flujo comercial:** El gestor solo puede acceder si `technical_briefs.generated_at IS NOT NULL`.

2. **Brand identity como contexto de generación:** Todos los prompts de infografías y slides inyectan el markdown de brand identity para garantizar coherencia visual.

3. **Storyboard como checkpoint obligatorio:** No se puede lanzar generación de imágenes ni slides sin un storyboard con `approved_at IS NOT NULL`. Esto evita generaciones fallidas por prompts mal definidos.

4. **Iteración del storyboard:**
   - Cada revisión con comentarios crea una nueva versión (`version` incremental)
   - Se guardan todas las versiones para auditoría
   - Solo la última versión aprobada se usa como contexto de generación

5. **Generación de infografías con IA:**
   - Modelo: `google/gemini-2.0-flash-exp:free` via OpenRouter (fallback automático si falla)
   - 1 infografía por slide del storyboard (7–10 imágenes), 1376×768 px
   - Prompt por slide: incluye título, contenido del slide, identidad de marca (colores, logo, fondo) y layout hint específico por tipo de slide
   - Guardar en Supabase Storage bajo `/projects/{id}/infographics/slide_{n}.png`
   - `slide_index` en tabla `infographics` identifica el slide; permite regenerar individualmente

6. **Generación async con progress (patrón fire-and-forget + polling):**
   - Server Action crea jobs en generation_jobs con slide_number → llama API Route via fetch
   - API Route hace el trabajo y actualiza job (running → completed/failed)
   - UI hace polling setInterval(3s) — Realtime descartado por ser poco confiable con jobs rapidos
   - Polling se detiene automaticamente cuando no quedan jobs activos

7. **Plantilla base de brand identity:**
   - Al crear un proyecto, se pre-carga una plantilla Markdown editable
   - El usuario puede reemplazarla por completo subiendo su propio `.md`
   - Si no hay logo, se omite el watermark en los materiales generados

8. **ZIP generator:**
   - Estructura: `proyecto-xyz/tecnica/` y `proyecto-xyz/comercial/`
   - Incluir `brand-identity.md` y `storyboard-*.md` en cada carpeta
   - Nombre: `{slug}-tecnica.zip` / `{slug}-comercial.zip` / `{slug}-completo.zip`

### Generación de Storyboard (Skill: storyboard-draft)

El skill `storyboard-draft` genera un documento Markdown estructurado con:

**Para cada infografía técnica (3):**
```markdown
## Infografía 1 — Diagrama de Flujo de Datos
**Objetivo:** Mostrar cómo fluye la información entre sistemas
**Layout:** Horizontal LEFT→RIGHT, 4 bloques conectados con flechas
**Colores:** Fondo #F8FAFC, bloques en color primario, flechas en acento
**Elementos:**
- Bloque 1: "Usuario Final" (ícono persona)
- Bloque 2: "API Gateway" (ícono nube)
- Bloque 3: "Procesamiento IA" (ícono chip)
- Bloque 4: "Base de Datos" (ícono cilindro)
**Texto en imagen:** Solo etiquetas cortas, max 4 palabras por elemento
**Logo:** Esquina inferior derecha, 60px
```

**Para cada slide de presentación (10):**
```markdown
## Slide 3 — Arquitectura Propuesta
**Tipo:** Slide de contenido técnico
**Título:** "Arquitectura de la Solución"
**Subtítulo:** "Stack moderno, escalable y seguro"
**Contenido principal:** Diagrama de 3 capas (Frontend / Backend / Datos)
**Bullet points:** (si aplica)
**Imagen de fondo:** Gradiente suave en colores de marca
**CTA / nota al pie:** "Escalable a 10,000 usuarios concurrentes"
```

### Stack Confirmado (Golden Path SaaS Factory)

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui |
| Backend | Supabase (Auth + Database + Storage + Realtime) |
| IA | Gemini API directa (primario, free) → @openrouter/sdk (fallback automático) |
| Validación | Zod |
| Estado | Zustand |
| Testing | Playwright CLI + MCP |
| Deploy | Vercel |

### Próximos Pasos

1. [x] Configurar Supabase: tablas, RLS, Storage buckets
2. [x] Implementar Auth con roles (user / admin)
3. [x] Feature: projects (CRUD + dashboard con progress tracker 4 etapas)
4. [x] Feature: technical-brief (formulario 5 pasos + generación brief MD desde `briefs.content`)
5. [x] Feature: brand-identity (editor Markdown + upload logo/fondo, límite 5 MB)
6. [x] Feature: storyboard infográfico (7 slides, IA, revisión iterativa, aprobación)
7. [x] Capa de IA unificada: OpenRouter (gemini-2.0-flash-exp:free) + ai_usage_logs
8. [x] Feature: infographic-generation — propuesta unificada (N slides dinámicos, store Zustand, polling, lightbox, retry individual — PRP-005 — 2026-03-25)
9. [x] Feature: descarga PPTX propuesta (`infographics` ordenados por `slide_index`)
10. [x] Bitácora /admin/ai-usage: uso por proyecto (storyboards, infografías, revisiones), detalle expandible por proyecto, rating de modelos
11. [ ] Feature: ZIP generator (brief + infografías + PPTX en un solo archivo)
12. [ ] Feature: historial de versiones de storyboard (auditoría de revisiones)

---

## 7. Scope V1 (MVP)

**Incluido en V1 (completado):**
- Auth con roles (user / admin)
- Identidad de marca: editor Markdown + upload logo y fondo (5 MB máx)
- Brief técnico: formulario 5 pasos + generación automática en Markdown
- Storyboard de propuesta: 7 slides, generación IA, revisión iterativa, aprobación
- Generación de 7–10 infografías PNG 1376×768 con IA (una por slide)
- Descarga de propuesta como PPTX (slides infográficos ordenados)
- Dashboard con progress tracker (Información → Storyboard → Infografías → PPT)
- Bitácora de IA (admin): uso por proyecto, detalle expandible, rating de modelos, créditos OpenRouter

**Fuera de V1 (backlog):**
- ZIP generator (brief + infografías + PPTX en un solo archivo)
- Historial de versiones de storyboard (auditoría de revisiones)
- Templates de storyboard pre-cargados por industria (V2)
- Colaboración en tiempo real (V2)
- Firma digital de propuestas (V3)
