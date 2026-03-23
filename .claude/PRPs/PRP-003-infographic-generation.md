# PRP-003: Infographic Generation — Generación Async de Infografías con IA

> **Estado**: IMPLEMENTADO — Pendiente QA manual
> **Fecha**: 2026-03-18 | **Completado**: 2026-03-22
> **Proyecto**: PropuestasAI

---

## Objetivo

Implementar la feature `infographic-generation` que permite al arquitecto seleccionar 1 de 3 variantes de infografía técnica (Diagrama de Flujo / Arquitectura de Componentes / Timeline de Fases), generadas de forma asíncrona con OpenRouter (Gemini 2.0 Flash), guardadas en Supabase Storage, con progreso en tiempo real via Supabase Realtime.

## Por Qué

| Problema | Solución |
|----------|----------|
| El arquitecto pierde 2-4 horas creando infografías técnicas manualmente en PPT/Visio | Generación automática de 3 variantes en < 90 segundos |
| Las infografías no tienen identidad de marca del cliente | Prompts inyectan brand colors y logo del proyecto |
| No hay feedback visual durante la generación (proceso lento) | Barra de progreso en tiempo real via Supabase Realtime (33% → 66% → 100%) |
| Las infografías están desconectadas del flujo del brief técnico | La feature se activa dentro del flujo `/projects/[id]/technical` una vez el brief está generado |

**Valor de negocio**: Reduce el tiempo de preparación de materiales técnicos de 2-4 horas a menos de 5 minutos. Es el paso más visible del flujo del arquitecto — el momento "wow" del producto.

## Qué

### Criterios de Éxito
- [ ] Al completar el brief técnico (Step 8), el usuario ve un botón "Generar Infografías"
- [ ] Al hacer click, se crean 3 registros en `generation_jobs` con status `pending` y se dispara la generación async
- [ ] La UI muestra progreso en tiempo real via Supabase Realtime: Infografía 1 (33%), Infografía 2 (66%), Infografía 3 (100%)
- [ ] Las 3 infografías se guardan en Supabase Storage en `/projects/{id}/infographics/`
- [ ] El arquitecto ve un preview de las 3 variantes y puede seleccionar una (radio-button style)
- [ ] La selección se persiste en la tabla `infographics` (campo `selected = true`)
- [ ] Si falla la generación de alguna variante → se muestra error claro por variante con botón "Reintentar"
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado (Happy Path)

1. Arquitecto completa Step 8 (Marca) del formulario técnico → hace click en "Generar Infografías"
2. UI muestra spinner general "Iniciando generación..." mientras se crean los jobs
3. Se crean 3 records en `generation_jobs` (uno por variante), status `pending`
4. Server Action dispara generación para las 3 variantes en paralelo
5. Cada variante actualiza su job a `running` → genera imagen → actualiza job a `completed` o `failed`
6. Supabase Realtime notifica al cliente de cada cambio de estado → barra de progreso avanza
7. Al completarse las 3 → UI muestra grid de 3 variantes con preview (imagen + label)
8. Arquitecto hace click en la variante preferida → se marca con borde azul y checkmark
9. Botón "Continuar con esta variante" se habilita → guarda selección y avanza al siguiente paso

---

## Contexto

### Referencias
- `src/features/technical-brief/` — Patrón de feature completa a seguir (components, hooks, services, store, types)
- `src/features/technical-brief/services/brief-generator.ts` — Ejemplo de servicio de generación de contenido
- `src/features/technical-brief/store/technical-brief.store.ts` — Patrón de Zustand store
- `src/types/database.ts` — Tipos `Infographic`, `GenerationJob`, `BrandSpec` ya definidos
- `src/shared/constants/brand.ts` — Colores default de marca
- `src/app/(main)/projects/[id]/technical/page.tsx` — Ruta donde se integra esta feature
- `BUSINESS_LOGIC.md §6` — Especificación de los 3 tipos de prompts y lógica de generación

### Arquitectura Propuesta (Feature-First)

```
src/features/infographic-generation/
├── components/
│   ├── InfographicGenerator.tsx      # Componente principal (orquesta todo)
│   ├── GenerationProgressBar.tsx     # Barra de progreso por variante (Realtime)
│   ├── InfographicVariantCard.tsx    # Card de preview de una variante (imagen + label + radio)
│   ├── InfographicVariantGrid.tsx    # Grid de 3 variantes seleccionables
│   └── index.ts
├── hooks/
│   ├── useInfographicGeneration.ts   # Dispara generación, maneja estado local
│   └── useRealtimeJobProgress.ts     # Suscripción a Supabase Realtime para los 3 jobs
├── services/
│   ├── prompt-builder.ts             # Construye prompts por variante con brand colors
│   └── openrouter-image.ts           # Llamada a OpenRouter (Gemini 2.0 Flash) para imagen
├── types/
│   └── index.ts                      # TechnicalInfographicVariant, GenerationState, etc.
└── store/
    └── infographic.store.ts          # Estado de jobs, variantes, selección
```

### Integración en la ruta existente

La feature se monta en `/projects/[id]/technical` (ya existe). Cuando el brief está generado (`technical_briefs.generated_at IS NOT NULL`), se renderiza `<InfographicGenerator projectId={id} />` debajo del preview del brief.

### Modelo de Datos

Las tablas `infographics` y `generation_jobs` ya están definidas en `src/types/database.ts` y en el esquema de Supabase (PRP-001).

**Tabla `generation_jobs`** (ya existe):
```sql
-- Campos relevantes ya definidos en database.ts:
-- id, project_id, type ('technical_infographics'), status, progress (0-100), error, created_at, updated_at
```

**Tabla `infographics`** (ya existe):
```sql
-- id, project_id, type ('technical'), variant (1/2/3), url, prompt_used, selected, created_at
```

**Storage bucket**: `infographics` (público) → path: `projects/{project_id}/{variant}-{timestamp}.png`

### Prompts por Variante (de BUSINESS_LOGIC.md)

```
Variante 1 — Diagrama de Flujo de Datos:
  "Create a technical data flow diagram, LEFT to RIGHT, with colored blocks and arrows.
   Primary color: {primary_color}, Secondary: {secondary_color}, Accent: {accent_color}.
   Project: {project_name}, Architecture: {architecture_description}.
   Style: AWS/Azure white background, professional, 1024x768px PNG"

Variante 2 — Arquitectura de Componentes:
  "Create a software component architecture diagram in AWS/Azure style.
   Primary color: {primary_color}, Secondary: {secondary_color}, Accent: {accent_color}.
   Stack: {stack_backend} / {stack_frontend} / {stack_database}.
   Project: {project_name}. White background, professional, 1024x768px PNG"

Variante 3 — Timeline Técnico de Fases (Gantt-like):
  "Create a technical project timeline / Gantt-like diagram.
   Phases: {phases_list}. Primary color: {primary_color}, Accent: {accent_color}.
   Project: {project_name}. Horizontal layout, white background, professional, 1024x768px PNG"
```

**Provider**: OpenRouter → `google/gemini-2.0-flash-exp:free` o `google/gemini-2.0-flash-thinking-exp`
**Fallback**: Gemini API directa si OpenRouter falla (429 / 5xx)
**Post-process**: Redimensionar output a 800×600, guardar en Supabase Storage

### Server Action Pattern

```typescript
// src/actions/infographics.ts
export async function generateTechnicalInfographics(projectId: string): Promise<ActionResult>
export async function selectInfographicVariant(infographicId: string): Promise<ActionResult>
export async function retryInfographicVariant(jobId: string, variant: number): Promise<ActionResult>
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Tipos, Store y Server Actions
**Objetivo**: Infraestructura base — tipos TypeScript, Zustand store para estado de generación, y Server Actions para disparar/monitorear generación y persistir selección
**Validación**: `npm run typecheck` pasa; `generateTechnicalInfographics`, `selectInfographicVariant` y `retryInfographicVariant` están definidas y compilables

### Fase 2: Servicio de Generación (prompt-builder + openrouter-image)
**Objetivo**: Lógica de llamada a OpenRouter con los 3 prompts correctos, manejo de errores y fallback a Gemini directo, y post-procesado de imagen
**Validación**: El servicio recibe `{ projectId, variant, brandSpec, stepData }` y retorna URL de imagen guardada en Supabase Storage; maneja correctamente errores de API (429, 5xx) con mensaje descriptivo

### Fase 3: Componentes UI (ProgressBar + VariantCard + Grid)
**Objetivo**: Componentes visuales: barra de progreso por variante, card de preview de infografía seleccionable, y grid de 3 variantes
**Validación**: Los componentes renderizan correctamente con datos mockeados; `InfographicVariantCard` muestra imagen, label de variante y estado de selección; `GenerationProgressBar` muestra progress 0-100%

### Fase 4: Supabase Realtime Hook
**Objetivo**: Hook `useRealtimeJobProgress` que suscribe a cambios en `generation_jobs` para los 3 jobs del proyecto y actualiza el store en tiempo real
**Validación**: Al cambiar un job en Supabase directamente, el componente refleja el cambio sin refresh; el hook se desuscribe limpiamente en unmount

### Fase 5: Integración en `/projects/[id]/technical`
**Objetivo**: Montar `<InfographicGenerator />` en la página técnica, visible solo cuando `technical_briefs.generated_at IS NOT NULL`, con flujo completo: generar → progreso → preview → seleccionar → continuar
**Validación**: Playwright screenshot confirma UI; el flujo completo funciona end-to-end; la selección persiste tras recargar la página

### Fase 6: Validación Final
**Objetivo**: Sistema funcionando end-to-end con calidad production-ready
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma: barra de progreso visible durante generación, grid de 3 variantes, selección con borde azul
- [ ] Los 3 criterios de éxito principales verificados manualmente
- [ ] Errores de generación muestran mensaje claro + botón reintentar

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] **OpenRouter imagen con Gemini**: Usar `google/gemini-2.0-flash-exp:free` — verificar que el modelo soporta generación de imágenes en OpenRouter antes de implementar (puede requerir endpoint diferente: `/api/generate` no `/api/chat`)
- [ ] **Supabase Realtime**: Los canales de Realtime deben filtrarse por `project_id` para no recibir eventos de otros proyectos. Usar `filter: 'project_id=eq.{projectId}'`
- [ ] **Storage bucket público**: Las URLs de imágenes deben ser públicas para poder renderizarlas en `<img>`. Crear bucket `infographics` con policy pública
- [ ] **Race condition en jobs**: Si el usuario hace click en "Generar" dos veces, se crearían jobs duplicados. Deshabilitar el botón durante generación y verificar jobs existentes antes de crear nuevos
- [ ] **BrandSpec puede no existir**: Si el arquitecto no completó Step 8 (Marca), `brand_specs` puede estar vacío. Usar `DEFAULT_COLORS` de `src/shared/constants/brand.ts` como fallback
- [ ] **Gemini genera imágenes en base64**: OpenRouter/Gemini puede retornar la imagen como base64 en el response, no como URL directa. Hay que decodificar y subir a Supabase Storage manualmente
- [ ] **Server Actions no pueden ser long-running**: La generación de 3 imágenes puede exceder el timeout de Vercel (10s en free). Considerar disparar las 3 en paralelo con `Promise.all` y actualizar jobs individualmente conforme van completando

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan (seguir patrón de `technical-brief` feature)
- NO ignorar errores de TypeScript
- NO hardcodear colores — usar `BrandSpec` del proyecto con fallback a `DEFAULT_COLORS`
- NO omitir validación Zod en inputs de Server Actions
- NO bloquear toda la UI si falla 1 variante — las 3 son independientes
- NO guardar imágenes en base64 en la DB — siempre a Supabase Storage

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

- OpenRouter SDK wraps params en `chatGenerationParams: { model, messages, modalities }` — NO flat como en el ejemplo de docs
- `message.images[0].imageUrl.url` es camelCase (no `image_url`) en el SDK
- Fire-and-forget en Server Actions cancela promesas → usar API Route para trabajo long-running
- OPENROUTER_API_KEY no funciona con endpoint de Gemini directo — son keys distintas
- Gemini API retorna `usageMetadata.promptTokenCount/candidatesTokenCount/totalTokenCount` para tracking de tokens
- El modelo en OpenRouter es `google/gemini-3.1-flash-image-preview`; en Gemini directo es `gemini-3.1-flash-image-preview` (sin prefijo google/)
- ai_usage_logs insert debe ser fire-and-forget (.then() sin await) para no bloquear generación

---

*PRP pendiente aprobación. No se ha modificado código.*
