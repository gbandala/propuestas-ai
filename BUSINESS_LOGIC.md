# BUSINESS_LOGIC.md - PropuestasAI

> Generado por SaaS Factory V4 | Fecha: 2026-03-16

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

**Flujo principal (Happy Path):**

### Flujo Arquitecto (Fase Técnica)
1. Arquitecto crea proyecto y completa formulario de 8 pasos (datos del cliente, problema, ROI esperado, funcionalidades, integraciones, presupuesto, solución técnica, marca)
2. Sistema genera brief técnico en Markdown automáticamente
3. Sistema genera 3 variantes de infografía técnica con IA (Diagrama de Flujo / Arquitectura de Componentes / Timeline de Fases)
4. Arquitecto selecciona variante preferida y ve preview de 2 slides
5. Arquitecto aprueba → sistema genera presentación técnica completa (10 slides HTML)
6. Arquitecto descarga ZIP con carpeta `/tecnica/` (brief + infografías + presentación)

### Flujo Comercial (Fase Comercial)
7. Gestor comercial accede al proyecto (solo si la fase técnica está completa)
8. Completa propuesta comercial: descripción ejecutiva, tarifas por fase, roadmap con fechas
9. Sistema genera 2 variantes de infografía ROI y 2 variantes de infografía Roadmap con IA
10. Gestor selecciona variantes → sistema genera presentación comercial completa (10 slides HTML)
11. Gestor descarga ZIP con carpeta `/comercial/` (propuesta + infografías + presentación)
12. Opcionalmente descargar ZIP completo con ambas carpetas

---

## 3. Usuario Objetivo

**Roles:**
- **Arquitecto Técnico** — diseña la solución, llena el brief técnico, genera materiales técnicos
- **Gestor Comercial** — prepara propuesta de venta, genera infografías con ROI y roadmap
- **Administrador del Sistema** — configura claves de APIs (OpenRouter, Gemini), gestiona usuarios

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
- Especificación de marca: logo (PNG/SVG <5MB), color primario, color secundario, color acento
- Propuesta comercial en Markdown (descripción ejecutiva, beneficios, caso de uso)
- Tabla de fases con costos (Discovery, Diseño, Implementación, Rollout)
- Roadmap con actividades, fechas y equipos

**Output:**
- `brief-tecnico.md` — documento técnico completo (Template 1)
- `presentacion-tecnica.html` — 10 slides interactivos con brand identity
- 3 infografías técnicas PNG 800×600 (flujo de datos / arquitectura / timeline)
- `propuesta-comercial.md` — documento comercial completo (Template 2)
- `presentacion-comercial.html` — 10 slides ejecutivos con brand identity
- 2 infografías comerciales ROI PNG 800×600 (curva retorno / antes-después)
- 2 infografías roadmap PNG 800×600 (timeline horizontal / Gantt-style)
- `proyecto-xyz.json` — metadata completa del proyecto
- ZIP descargable por carpeta o completo

**Storage (Supabase tables):**
- `projects` — id, name, client, architect_id, commercial_id, status, created_at
- `technical_briefs` — project_id, step_data (JSONB con los 8 pasos), generated_at
- `brand_specs` — project_id, logo_url, primary_color, secondary_color, accent_color
- `infographics` — project_id, type (technical/roi/roadmap), variant (1/2/3), url, selected
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
├── projects/                # CRUD de proyectos + dashboard de proyectos
├── technical-brief/         # Formulario multi-paso 8 pasos + generación brief MD
├── brand-identity/          # Upload de logo + color picker + preview
├── infographic-generation/  # Generación async con IA + selección de variante
├── presentation-generation/ # Generación de HTML slides + preview
├── commercial-proposal/     # Editor Markdown + tablas de fases/costos/roadmap
└── downloads/               # ZIP generator + descarga por sección o completo
```

### Roles y Permisos (RLS en Supabase)

| Feature | Architect | Commercial | Admin |
|---------|-----------|------------|-------|
| Crear / editar proyecto | ✓ | ✗ | ✓ |
| Formulario técnico (8 pasos) | ✓ | ✗ | ✓ |
| Upload logo / marca | ✓ | ✗ | ✓ |
| Generar infografías técnicas | ✓ | ✗ | ✓ |
| Generar presentación técnica | ✓ | ✗ | ✓ |
| Descargar ZIP técnico | ✓ | ✗ | ✓ |
| Ver brief técnico (read-only) | ✓ | ✓ (RO) | ✓ |
| Propuesta comercial | ✗ | ✓ | ✓ |
| Generar infografías comerciales | ✗ | ✓ | ✓ |
| Generar presentación comercial | ✗ | ✓ | ✓ |
| Descargar ZIP comercial / completo | ✗ | ✓ | ✓ |
| Configurar API keys | ✗ | ✗ | ✓ |

### Lógica de Negocio Crítica

1. **Acceso condicional al flujo comercial:** El gestor comercial solo puede acceder a la fase comercial si `technical_briefs.generated_at IS NOT NULL` para ese proyecto.

2. **Generación de infografías con IA:**
   - Usar OpenRouter con Gemini 2.0 Flash para generación de imágenes
   - Generar prompt específico por variante (ver especificación funcional)
   - Post-process: redimensionar a 800×600, añadir logo watermark en esquina
   - Guardar en Supabase Storage bajo `/projects/{id}/infographics/`
   - Si falla generación → mostrar error claro, permitir reintentar

3. **Generación async con progress:**
   - Generación de 3 infografías técnicas puede tomar 30-90 segundos
   - Usar Supabase Realtime para actualizar estado del job en tiempo real
   - UI muestra barra de progreso por infografía (33% → 66% → 100%)

4. **Validación de colores WCAG:**
   - Verificar contraste primario/secundario ratio > 4.5:1 (WCAG AA)
   - Si no cumple → alerta al usuario pero no bloquear

5. **ZIP generator:**
   - Estructura de carpetas exacta: `proyecto-xyz/tecnica/` y `proyecto-xyz/comercial/`
   - Incluir `proyecto-xyz.json` con metadata
   - Nombre del ZIP: `{slug-proyecto}-tecnica.zip` / `{slug-proyecto}-comercial.zip` / `{slug-proyecto}-completo.zip`

### Generación de Contenido IA

**Para infografías técnicas (3 variantes):**
- Variante 1: Diagrama de Flujo de Datos (LEFT→RIGHT, bloques + flechas)
- Variante 2: Arquitectura de Componentes estilo AWS/Azure
- Variante 3: Timeline Técnico de Fases (Gantt-like visual)

**Para infografías comerciales ROI (2 variantes):**
- Variante 1A: ROI Timeline (curva de retorno en el tiempo, zona roja/verde)
- Variante 1B: Comparativa Antes/Después (métricas side-by-side)

**Para infografías roadmap (2 variantes):**
- Variante 2A: Timeline Horizontal de 4 fases (ejecutivo, no técnico)
- Variante 2B: Gantt-style con actividades por fase

**Proveedor:** OpenRouter → `google/gemini-2.0-flash-exp` (imagen + texto)
**Fallback:** Gemini directo via API si OpenRouter falla
**Prompt base:** Inyectar brand colors, logo URL, datos del proyecto, dimensiones 1024×768px

### Stack Confirmado (Golden Path SaaS Factory)

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui |
| Backend | Supabase (Auth + Database + Storage + Realtime) |
| IA | Vercel AI SDK v5 + OpenRouter (Gemini 2.0 Flash para imágenes) |
| Validación | Zod |
| Estado | Zustand |
| Testing | Playwright CLI + MCP |
| Deploy | Vercel |

> **Nota de adaptación:** La especificación original menciona Redis + Bull para jobs. En el golden path usamos Supabase Realtime + Edge Functions para jobs async. La lógica es equivalente pero sin infraestructura adicional.

### Próximos Pasos

1. [ ] Configurar Supabase: tablas, RLS, Storage buckets
2. [ ] Implementar Auth con roles (architect / commercial / admin)
3. [ ] Feature: projects (CRUD + dashboard)
4. [ ] Feature: technical-brief (multi-step form 8 pasos + generación MD)
5. [ ] Feature: brand-identity (logo upload + color picker)
6. [ ] Feature: infographic-generation (async con Realtime progress)
7. [ ] Feature: presentation-generation (HTML slides con brand)
8. [ ] Feature: commercial-proposal (Markdown editor + tablas dinámicas)
9. [ ] Feature: downloads (ZIP generator)
10. [ ] Testing E2E con Playwright
11. [ ] Deploy en Vercel

---

## 7. Scope V1 (MVP)

**Incluido en V1:**
- Auth completo con 3 roles
- Formulario técnico de 8 pasos con validación
- Generación de 3 variantes de infografía técnica con IA
- Preview de 2 slides técnicas antes de aprobar
- Generación de presentación técnica HTML (10 slides)
- Acceso condicional al flujo comercial
- Formulario comercial con Markdown editor y tablas de fases/costos
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
