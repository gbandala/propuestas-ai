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
**Estado: Pendiente**

- [ ] Crear Server Action `src/actions/brief.ts` (getBrief, saveBrief)
- [ ] Crear componente `src/features/brief/components/BriefForm.tsx`
  - Textarea grande con ~60 filas
  - 8 labels/títulos como guía visual sobre el textarea
  - Auto-save o botón guardar
- [ ] Crear página `src/app/(main)/projects/[id]/brief/page.tsx`
- [ ] Conectar al flujo de navegación del proyecto

---

### FASE 3 — Brand Identity (ampliar con logo y fondo)
**Estado: Pendiente**

- [ ] Actualizar `src/actions/brand-identity.ts`: incluir `logo_url` y `background_url`
- [ ] Actualizar `src/features/brand-identity/components/BrandIdentityForm.tsx`:
  - Agregar upload de logo (PNG/SVG, max 2MB, opcional)
  - Agregar upload de fondo (PNG/JPG, max 5MB, opcional)
  - Vista previa de imagen subida
- [ ] Subir a Supabase Storage bucket `project-assets`
  - Path logo: `projects/{projectId}/brand/logo.{ext}`
  - Path fondo: `projects/{projectId}/brand/background.{ext}`
- [ ] Guardar URLs en `brand_identity.logo_url` y `brand_identity.background_url`

---

### FASE 4 — Storyboard (ajustar prompts y tipo único)
**Estado: Pendiente**

- [ ] Actualizar `src/actions/storyboard.ts`:
  - Usar `briefs.content` en lugar de `technical_briefs.step_data` como fuente del brief
  - El tipo activo es `'infographic'`, eliminar lógica de `'technical'` y `'commercial'`
- [ ] Actualizar `buildSystemPrompt` en storyboard.ts:
  - Nuevo prompt para tipo `'infographic'`: describe los 7 slides de arranque (ROI, problema,
    flujo técnico, arquitectura, entregables, roadmap, inversión)
  - Indicar que el usuario puede agregar más secciones (hasta 10)
- [ ] Actualizar `buildUserPrompt`: usar el campo `content` del brief libre (no step_data)
- [ ] Limpiar referencia a `StoryboardType` commercial/technical en UI

---

### FASE 5 — Generación de infografías (ajustar prompts por slide)
**Estado: Pendiente**

- [ ] Actualizar `src/features/infographic-generation/services/prompt-builder.ts`:
  - 7 layouts específicos por tema de slide (ROI, problema, flujo, arquitectura, etc.)
  - Si `brand_identity.logo_url` existe: incluir descripción/instrucción en el prompt
  - Si `brand_identity.background_url` existe: incluir como referencia de fondo
- [ ] Actualizar `src/app/api/infographics/generate/route.ts`:
  - Leer `slide_index` del job en vez de `variant`
  - Guardar `slide_index` en `infographics`
  - Usar nueva lógica de prompt por slide_index
- [ ] Actualizar la UI de infografías:
  - Mostrar en orden por `slide_index` (no por variante)
  - Mantener: ampliar (lightbox), descargar individual, regenerar con comentario
  - Permitir agregar slide extra (genera storyboard entry + imagen nueva con slide_index N+1)

---

### FASE 6 — PPT (ajustar input)
**Estado: Pendiente**

- [ ] Actualizar `src/app/api/presentation/download-pptx/route.ts`:
  - Leer infografías de `infographics` ordenadas por `slide_index`
  - En vez de leer `presentation_slides`
  - Mantener lógica pptxgenjs existente (full-screen image per slide)
- [ ] Actualizar botón de descarga en UI para apuntar al nuevo endpoint

---

### FASE 7 — Navegación y limpieza
**Estado: Pendiente**

- [ ] Rediseñar stepper/navegación del proyecto:
  `Brief → Marca → Storyboard → Infografías → Descargar PPT`
- [ ] Eliminar rutas de fase comercial:
  - `/commercial`, `/commercial-storyboard`, etc.
- [ ] Simplificar dashboard: sin distinción de roles, sin fases separadas
- [ ] Eliminar código de brief multi-paso (`technical_briefs` actions/forms/hooks)
- [ ] Limpiar `src/types/database.ts`: remover tipos obsoletos una vez migrado
- [ ] Actualizar `ProjectAiUsageWidget`: nuevos task_type names
- [ ] Verificar y limpiar imports huérfanos

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
