# BUSINESS_LOGIC.md - PropuestasAI

> Generado por SaaS Factory V4 | Fecha: 2026-03-16 | Actualizado: 2026-03-21

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

### Flujo principal (Happy Path)

#### Fase 0: Preparación
1. Arquitecto crea el proyecto en la app (nombre del cliente, descripción)
2. Configura la **identidad de marca** del cliente: sube o edita un archivo Markdown con colores, tipografía, tono visual y logo. Si no tiene uno, parte de una plantilla base que puede personalizar.

#### Fase 1: Técnica (Arquitecto)
3. Arquitecto completa el formulario de 5 pasos con la información del discovery previo:
   - Datos del cliente y proyecto
   - Descripción del problema y sus impactos
   - KPIs actuales y objetivos (ROI esperado)
   - Tabla de funcionalidades con prioridad (Must/Should/Could)
   - Integraciones técnicas
   - Presupuesto por recurso
   - Arquitectura y stack propuesto
   - Confirmación de identidad de marca
4. Sistema genera brief técnico en Markdown automáticamente
5. Sistema genera **storyboard técnico** (borrador textual de las 3 infografías y los 10 slides):
   - Para cada pieza: título, objetivo visual, elementos clave, descripción de layout, texto exacto
   - Arquitecto revisa el storyboard, lo aprueba o solicita ajustes con comentarios
   - El sistema regenera solo las piezas modificadas hasta obtener aprobación
6. Con el storyboard aprobado, sistema genera 3 variantes de infografía técnica con IA
7. Arquitecto selecciona variante preferida
8. Sistema genera presentación técnica completa (10 slides HTML)
9. Arquitecto descarga ZIP con carpeta `/tecnica/` (brief + infografías + presentación)

#### Fase 2: Comercial (Gestor Comercial — solo si fase técnica completada)
10. Gestor accede al proyecto
11. Completa propuesta comercial: descripción ejecutiva, tarifas por fase, roadmap con fechas
12. Sistema genera **storyboard comercial** (borrador textual de 4 infografías y 10 slides comerciales)
    - Gestor revisa, aprueba o itera con comentarios
13. Con storyboard aprobado, genera 2 variantes ROI + 2 variantes Roadmap
14. Gestor selecciona variantes → sistema genera presentación comercial (10 slides HTML)
15. Gestor descarga ZIP con carpeta `/comercial/`
16. Opcionalmente descarga ZIP completo con ambas carpetas

---

## 3. Usuario Objetivo

**Roles:**
- **Arquitecto Técnico** — realiza el discovery con el cliente, captura la información en el formulario, genera y aprueba materiales técnicos
- **Gestor Comercial** — prepara la propuesta de venta a partir del brief técnico aprobado, genera materiales comerciales
- **Administrador del Sistema** — configura claves de APIs (OpenRouter, Gemini), gestiona usuarios y permisos

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
- `brief-tecnico.md` — documento técnico completo
- `storyboard-tecnico.md` — descripción textual aprobada de infografías y slides técnicos
- `presentacion-tecnica.html` — 10 slides interactivos con brand identity
- 3 infografías técnicas PNG 800×600 (flujo de datos / arquitectura / timeline)
- `storyboard-comercial.md` — descripción textual aprobada de infografías y slides comerciales
- `propuesta-comercial.md` — documento comercial completo
- `presentacion-comercial.html` — 10 slides ejecutivos con brand identity
- 2 infografías comerciales ROI PNG 800×600
- 2 infografías roadmap PNG 800×600
- `brand-identity.md` — identidad visual del proyecto
- `proyecto-xyz.json` — metadata completa del proyecto
- ZIP descargable por carpeta o completo

**Storage (Supabase tables):**
- `projects` — id, name, client, architect_id, commercial_id, status, created_at
- `technical_briefs` — project_id, step_data (JSONB), generated_at
- `brand_identity` — project_id, markdown_content, created_at, updated_at
- `storyboards` — id, project_id, type (technical/commercial), content_md, version, approved_at, created_at
- `infographics` — project_id, type (technical/roi/roadmap), variant, url, selected
- `presentations` — project_id, type (technical/commercial), html_url, slides_count
- `commercial_proposals` — project_id, markdown_content, phases_data (JSONB), generated_at
- `downloads` — project_id, type (technical/commercial/complete), zip_url, downloaded_at
- `generation_jobs` — id, project_id, type, status, progress, error, created_at

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
   - Usar OpenRouter con Gemini 2.0 Flash para generación de imágenes
   - El prompt incluye: storyboard aprobado + brand identity + dimensiones 1024×768px
   - Post-process: redimensionar a 800×600, añadir logo en esquina según brand identity
   - Guardar en Supabase Storage bajo `/projects/{id}/infographics/`

6. **Generación async con progress:**
   - Usar Supabase Realtime para actualizar estado del job en tiempo real
   - UI muestra barra de progreso por infografía (33% → 66% → 100%)

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
2. [x] Implementar Auth con roles (architect / commercial / admin)
3. [x] Feature: projects (CRUD + dashboard)
4. [x] Feature: technical-brief (multi-step form 5 pasos + generación MD)
5. [x] Feature: infographic-generation (async con Realtime progress)
6. [x] Feature: brand-identity (editor Markdown + plantilla base)
7. [x] Feature: storyboard con IA real (Gemini/OpenRouter, generacion contextual)
8. [x] Capa de IA unificada: Gemini primario → OpenRouter fallback + ai_usage_logs
9. [x] Bitácora /admin/ai-usage + AiModelBadge + Widget de créditos por proyecto
10. [x] Feature: presentation-generation (HTML 10 slides, refinar, pantalla completa — 2026-03-23)
11. [ ] Feature: commercial-proposal (Markdown editor + tablas dinámicas)
12. [ ] Feature: downloads (ZIP generator)

---

## 7. Scope V1 (MVP)

**Incluido en V1:**
- Auth completo con 3 roles
- Configuración de brand identity en Markdown (plantilla base editable + upload)
- Formulario técnico de 8 pasos con validación
- Storyboard técnico: generación textual + revisión iterativa + aprobación
- Generación de 3 variantes de infografía técnica con IA (con storyboard como contexto)
- Preview de 2 slides técnicas antes de aprobar
- Generación de presentación técnica HTML (10 slides)
- Acceso condicional al flujo comercial
- Formulario comercial con Markdown editor y tablas de fases/costos
- Storyboard comercial: generación textual + revisión + aprobación
- Generación de 2+2 variantes de infografías comerciales (ROI + Roadmap)
- Generación de presentación comercial HTML (10 slides)
- Descarga ZIP por sección y completa
- Panel admin para configurar API keys

**Fuera de V1 (backlog):**
- Exportar HTML a PDF via Puppeteer (V2)
- Casos de éxito / templates pre-cargados por industria (V2)
- Historial de versiones de propuestas (V2)
- Colaboración en tiempo real entre arquitecto y comercial (V2)
- Firma digital de propuestas (V3)
