# PRP-005 — Rediseño: Propuesta Unificada (7-10 slides como infografías)

> Sesión de diseño: 2026-03-25
> Estado: En ejecución

## Contexto del cambio

Pivote basado en revisión con el cliente. La solución se simplifica radicalmente:
el output final es un PPT con 7-10 imágenes, todas generadas como infografías,
sin distinción entre fase técnica y fase comercial.

## Caso de uso de referencia

**Proyecto de ejemplo (Trosten):**
- Título: KPI de kilómetros recorridos para rutas corporativas
- Cliente: Trosten Industries
- Brief libre con 8 secciones: problema/dolores, objetivo/ROI, insumos, producto esperado,
  solución técnica, entregables, roadmap, modelo de inversión

## Lo que desaparece

- [ ] Fase comercial completa (rutas, storyboard comercial, slides comerciales, rol `commercial`)
- [ ] Brief técnico multi-paso (5 pasos / `technical_briefs` → reemplazado por `briefs`)
- [ ] Presentación técnica como entidad separada (10 slides PNG, `presentation_slides`)
- [ ] Storyboard tipos `technical` y `commercial` (solo queda `infographic`)
- [ ] Variantes de infografías (3 fijas por tipo) → ahora N slides indexados
- [ ] Distinción de roles usuario → un solo tipo de usuario sin rol por ahora

## El nuevo flujo

```
Crear proyecto (título + cliente)
    ↓
Brief (un solo textarea, 8 secciones guiadas)
    ↓
Identidad de marca (colores + fuentes + logo opcional + fondo opcional)
    ↓
Storyboard (tipo: infographic) → 7 slides de arranque, editables, aprobación obligatoria
    ↓
Generación de infografías (7-10 imágenes, individual: zoom / descargar / regenerar)
    ↓
Descargar PPT (empaqueta todas las infografías en orden)
```

## Slides de arranque (7 fijos, se pueden agregar más)

1. Resumen ejecutivo con ROI
2. Entendimiento del problema
3. Flujo de la solución técnica
4. Arquitectura
5. Entregables
6. Roadmap de ejecución
7. Modelo de inversión

## Plan de trabajo por fases

---

### FASE 1 — Base de datos y tipos TypeScript
**Estado: ✅ Completada**

#### DB — Supabase
- [x] Crear tabla `briefs` (reemplaza `technical_briefs`)
  - Columnas: `id`, `project_id` (unique FK), `content` (text largo), `created_at`, `updated_at`
  - RLS: usuario dueño del proyecto puede leer/escribir
- [x] Agregar `logo_url` (text nullable) a `brand_identity`
- [x] Agregar `background_url` (text nullable) a `brand_identity`
- [x] Agregar `slide_index` (integer nullable) a `infographics`
  - Representa el orden del slide en la propuesta (1-10)

#### TypeScript — `src/types/database.ts`
- [x] Agregar interfaz `Brief`
- [x] Agregar `Brief` al mapping `Database.public.Tables`
- [x] Agregar `logo_url`, `background_url` a `BrandIdentity`
- [x] Agregar `slide_index` a `Infographic`
- [x] Agregar `'proposal_infographics'` a `JobType`
- [x] Actualizar `AiTaskType`: agregar `infographic_slide_1` ... `infographic_slide_10`
- [x] Actualizar `StoryboardType`: agregar `'proposal'` (alias futuro, `'infographic'` es el activo)

---

### FASE 2 — Brief (nuevo formulario de un paso)
**Estado: ✅ Completada**

- [x] Crear Server Action `src/actions/brief.ts` (getBrief, saveBrief)
- [x] Crear componente `src/features/brief/components/BriefForm.tsx`
  - Textarea grande con 60 filas + font-mono
  - 8 labels en banner azul como guía visual
  - Botón "Guardar Brief" — guarda en `briefs` + marca `technical_completed_at`
  - Estado "Brief guardado" + botón "Continuar al Storyboard →" al guardar
- [x] Crear página `src/app/(main)/projects/[id]/brief/page.tsx`
- [x] Actualizar página de proyecto `[id]/page.tsx`:
  - Nuevo flujo de 5 pasos (Marca → Brief → Storyboard → Infografías → PPT)
  - Eliminada "Fase Comercial" y referencias a rol architect
- [x] Actualizar `[id]/brand/page.tsx`: link apunta a `/brief` en vez de `/technical`

---

### FASE 3 — Brand Identity (ampliar con logo y fondo)
**Estado: ✅ Completada**

- [x] Actualizar `src/actions/brand-identity.ts`:
  - `getBrandIdentity` retorna `logo_url` y `background_url`
  - Nueva action `uploadBrandImage(projectId, formData, type)`: sube a Storage y guarda URL en DB
  - Nueva action `removeBrandImage(projectId, type)`: limpia URL en DB
- [x] Actualizar `src/features/brand-identity/types/index.ts`: `logo_url`, `background_url` en `BrandIdentityData`
- [x] Actualizar `src/features/brand-identity/components/BrandIdentityEditor.tsx`:
  - Nueva sección "Imágenes de Marca" debajo del editor markdown
  - Dos cards: Logo (PNG/SVG/JPG, máx 2MB) y Fondo (PNG/JPG, máx 5MB)
  - Upload via `useTransition` + Server Action con FormData
  - Preview de imagen, botón "Eliminar" y "Cambiar imagen"
- [x] Storage path: `projects/{projectId}/brand/{logo|background}.{ext}` (upsert)

---

### FASE 4 — Storyboard (ajustar prompts y tipo único)
**Estado: ✅ Completada**

- [x] Actualizar `src/actions/storyboard.ts`:
  - Usar `briefs.content` en lugar de `technical_briefs.step_data` como fuente del brief
  - El tipo activo es `'infographic'`, lógica de `'technical'` y `'commercial'` como stubs legacy
- [x] Actualizar `buildSystemPrompt` en storyboard.ts:
  - Nuevo prompt para tipo `'infographic'`: 7 slides de arranque con estructura detallada por slide
  - Formato `### Slide N — Título` con campos: Objetivo, Layout, Elementos visuales, Texto en imagen, Paleta
- [x] Actualizar `buildUserPrompt`: usa `briefContent` (texto libre) + `brandMarkdown`
- [x] Limpiar UI: `typeLabel` hardcodeado, descripción del estado vacío actualizada
- [x] Validado en navegador: 7 slides generados correctamente desde `briefs.content`

---

### FASE 5 — Generación de infografías (ajustar prompts por slide)
**Estado: ✅ Completada**

- [x] Actualizar `src/features/infographic-generation/services/prompt-builder.ts`:
  - Nueva función `buildProposalSlidePrompt` con 7 layouts específicos por tema
  - Extrae colores hex del brand identity markdown automáticamente
  - Incluye instrucciones de logo y fondo si están presentes
- [x] Actualizar `src/app/api/infographics/generate/route.ts`:
  - Detecta flujo por presencia de `slideNumber` vs `variant` en el body
  - Lee storyboard aprobado y extrae contenido del slide por `slideNumber`
  - Guarda con `slide_index = slideNumber` en `infographics`
  - Usa `AiTaskType` `infographic_slide_N` para el log
- [x] Nueva acción `generateProposalInfographics`: lee storyboard aprobado, crea N jobs
- [x] Nueva acción `getProposalInfographics`: devuelve jobs activos + infografías + slides del storyboard
- [x] Nueva acción `retryProposalSlide`: reintenta un slide individual
- [x] Nuevo store `proposal.store.ts`: dinámico para N slides (vs hardcoded 1|2|3)
- [x] Nuevo hook `useProposalJobProgress`: mapea jobId → slideIndex para realtime
- [x] Nuevos componentes: `ProposalInfographicGenerator`, `ProposalSlideCard`, `ProposalLightbox`
- [x] Página `/infographics` actualizada: usa `ProposalInfographicGenerator`, verifica `briefs` (no `technical_briefs`)
- [x] Build limpio, typecheck limpio

---

### FASE 6 — PPT (ajustar input)
**Estado: ✅ Completada**

- [x] Actualizar `src/app/api/presentation/download-pptx/route.ts`:
  - Nuevo parámetro `type=proposal`: lee `infographics` con `slide_index IS NOT NULL` ordenadas por `slide_index`
  - Legacy `type=technical`: mantiene lectura de `presentation_slides` sin cambios
  - Filename y título del PPT actualizados según tipo
- [x] Reescribir `src/app/(main)/projects/[id]/presentation/technical/page.tsx`:
  - Nuevo flujo: verifica storyboard infographic aprobado + al menos 1 infografía
  - Muestra grid de preview de slides con número
  - Botón de descarga apunta a `?type=proposal`
  - Guards redirigen a infografías si no hay imágenes generadas

---

### FASE 7 — Navegación y limpieza
**Estado: ✅ Completada**

- [x] Rutas de fase comercial: no existían en el router (nunca se crearon en este proyecto)
- [x] `/projects/[id]/technical/page.tsx` → redirect permanente a `/brief` (preserva backlinks)
- [x] `projects/[id]/page.tsx` → infographicsCount filtra por `slide_index IS NOT NULL` (solo propuesta)
- [x] Dashboard → sin badge de rol para usuarios normales (admin conserva acceso a Bitácora de IA)
- [x] `ProjectAiUsageWidget` → eliminado row "Slides" (legacy `slide_technical_*`); infografías nuevas ya caen en "Infografías" por prefijo
- [x] `getProjectAiSummary` → comentarios aclaratorios en la clasificación de task_types
- [x] Tipos obsoletos en `database.ts`: conservados con comentarios (datos históricos existentes)
- [x] Build limpio, typecheck limpio

---

## Decisiones de arquitectura

| Decisión | Razón |
|----------|-------|
| Crear tabla `briefs` nueva (no modificar `technical_briefs`) | Preservar datos existentes, migración limpia |
| Mantener `technical_briefs` en DB (no DROP) | Datos de prueba existentes, DROP es destructivo |
| `slide_index` en infographics en vez de `variant` | Las infografías ahora son slides ordenados, no variantes |
| `storyboard.type = 'infographic'` se reutiliza | Ya existe en la DB, no rompe constraint |
| Logo/fondo como texto en prompt (no multimodal input) | El modelo recibe URL/descripción; multimodal complica el flujo |
| Roles: mantener check constraint en DB, eliminar en UI | No se puede hacer DROP CONSTRAINT sin riesgo en datos activos |

## Notas para sesiones futuras

- Los datos existentes en `technical_briefs`, `presentation_slides`, `storyboards` (tipos technical/commercial)
  se conservan en DB pero son ignorados por la nueva UI
- El `slide_index` de infografías empieza en 1 (coincide con el número del slide en storyboard)
- El storyboard markdown sigue siendo la fuente de verdad para cuántas infografías generar
- La infografía con `slide_number` del job → `slide_index` en la tabla (misma lógica que antes con slide_number)
