# PRP-004: Presentación Técnica HTML (10 slides con storyboard por slide + lightbox infografías)

> **Estado**: APROBADO
> **Fecha**: 2026-03-23
> **Proyecto**: PropuestasAI

---

## Objetivo

Generar una presentación técnica en HTML puro (archivo único, sin dependencias externas) de 10 slides a partir del storyboard técnico aprobado, con navegación por teclado/click, diseño basado en la identidad de marca del proyecto, y lightbox para visualizar las infografías técnicas generadas.

## Por Qué

| Problema | Solución |
|----------|----------|
| El storyboard técnico existe como markdown en BD pero nunca se convierte en material presentable al cliente | Generar un HTML auto-contenido listo para abrir en browser o compartir por email |
| Las infografías generadas con IA están en Supabase Storage pero no hay forma de verlas integradas en contexto | El HTML incluye un lightbox que carga las infografías por URL directa (seleccionada por el arquitecto) |
| El arquitecto actualmente haría el HTML manualmente o en PowerPoint (horas de trabajo) | IA genera el HTML en segundos a partir del storyboard ya aprobado |
| El flujo del proyecto tiene el Paso 4 ("Infografías y Presentación Técnica") sin implementar | Esta feature completa ese paso del pipeline y habilita el progreso visible en la página del proyecto |

**Valor de negocio**: Completa el pipeline técnico (Pasos 1-4 de Fase Técnica). Reduce ~2-3h de trabajo de maquetación a cero. El arquitecto puede entregar el HTML al cliente directamente desde la app.

## Qué

### Criterios de Éxito
- [ ] La página `/projects/[id]/presentation/technical` existe y muestra la presentación generada o el botón para generarla
- [ ] El HTML generado tiene exactamente 10 slides con contenido extraído del storyboard técnico aprobado
- [ ] Cada slide refleja el slide correspondiente del storyboard (tipo, título, contenido, visual)
- [ ] El HTML incluye lightbox funcional que muestra las infografías técnicas (url de variante seleccionada, o las 3 si ninguna está seleccionada)
- [ ] Navegación funcional: flechas teclado (←/→), click en botones prev/next, indicador de slide actual (ej. "3 / 10")
- [ ] El HTML es un único archivo auto-contenido (CSS inline o `<style>`, sin imports externos)
- [ ] Paleta de colores del HTML corresponde a la identidad de marca del proyecto (colores extraídos del `brand_identity.markdown_content`)
- [ ] El log de uso AI se guarda en `ai_usage_logs` con `task_type = 'presentation_technical'`
- [ ] El Paso 4 en la página del proyecto marca "done" cuando existe la presentación generada
- [ ] `npm run typecheck` pasa sin errores

### Comportamiento Esperado (Happy Path)

1. Arquitecto completa Paso 3 (Storyboard aprobado) y tiene infografías generadas
2. Entra a la página del proyecto → ve Paso 4 desbloqueado → hace click en "Completar →"
3. Llega a `/projects/[id]/presentation/technical`
4. Ve botón "Generar Presentación Técnica" + descripción de lo que se va a generar
5. Hace click → spinner de carga (3-15 segundos) → aparece preview del HTML embebido en un `<iframe>` o se ofrece descarga directa
6. Puede hacer click en "Ver presentación" para abrirla en tab nuevo (HTML standalone)
7. Puede hacer click en "Regenerar" si quiere una nueva versión
8. La presentación HTML abierta en browser muestra 10 slides navegables con diseño de marca
9. Al hacer click en una infografía del slide correspondiente, se abre el lightbox con zoom

---

## Contexto

### Referencias

- `src/actions/storyboard.ts` — Patrón de generación con IA (`generateText`) + log AI usage. Seguir exactamente este patrón.
- `src/lib/ai-client.ts` — `generateText(systemPrompt, userPrompt)` → retorna `{ text, meta }`. Mismo cliente a usar.
- `src/features/infographic-generation/` — Cómo se obtienen las infografías y su estado (url, selected, variant)
- `src/types/database.ts` — `Presentation` interface ya existe: `{ html_content: string | null, slides_count: number, type: PresentationType }`. La tabla `presentations` ya existe en el schema.
- `src/app/(main)/projects/[id]/page.tsx` — El Paso 4 ya tiene su slot en el array `steps` (label: "Infografías y Presentación Técnica", `href` hardcodeado a `/technical`, `done: false`). Hay que actualizar el href y la lógica de `done`.
- `src/actions/infographics.ts` — `getProjectInfographics(projectId)` para obtener URLs de infografías
- `src/app/(main)/projects/[id]/technical/page.tsx` — Patrón de page server-side con `createClient()` + Server Actions
- `PRP-003-infographic-generation.md` — Contexto de cómo funciona el sistema de generación de imágenes

### Arquitectura Propuesta (Feature-First)

```
src/
├── features/
│   └── technical-presentation/
│       ├── components/
│       │   ├── PresentationViewer.tsx       # Client component: muestra iframe + botones
│       │   └── index.ts
│       ├── services/
│       │   └── html-builder.ts             # Prompt construction para el HTML (server-only)
│       └── types/
│           └── index.ts                     # PresentationData, GenerationState
│
├── actions/
│   └── presentations.ts                     # Server Actions: generatePresentation, getPresentation
│
└── app/(main)/projects/[id]/
    └── presentation/
        └── technical/
            └── page.tsx                     # Page: carga datos, renderiza PresentationViewer
```

### Modelo de Datos

La tabla `presentations` ya existe en el schema de Supabase (definida en `src/types/database.ts`):

```typescript
// Ya existe — NO crear migración nueva
interface Presentation {
  id: string
  project_id: string
  type: PresentationType  // 'technical' | 'commercial'
  html_content: string | null
  slides_count: number
  created_at: string
  updated_at: string
}
```

Verificar que la tabla existe en Supabase antes de implementar. Si no existe, la migración SQL es:

```sql
-- Solo si no existe
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('technical', 'commercial')),
  html_content TEXT,
  slides_count INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presentations_project_access" ON presentations
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
```

Actualizar `AiTaskType` en `src/types/database.ts`:
```typescript
// Agregar a la union existente:
| 'presentation_technical'
| 'presentation_commercial'
```

### Consideraciones de diseño del HTML generado

La IA debe generar un archivo HTML con:
- `<!DOCTYPE html>` completo, CSS inline en `<style>`
- Slides como `<section>` con `display: none` excepto el activo
- JavaScript inline para navegación (prev/next, keyboard events)
- Lightbox vanilla JS para infografías (sin librerías)
- Colores extraídos del `brand_identity.markdown_content` (el brand usa markdown con colores hex)
- Tipografía: system fonts (no Google Fonts, para evitar dependencias externas)
- Responsive: funciona en 1280px+ (presentación de escritorio)

---

## Bloques adicionales aprobados

### Bloque A — Storyboard slide a slide

**Problema**: El storyboard se muestra como bloque markdown crudo en `<pre>`. No se puede editar un slide específico.

**Cambio**: Parsear el markdown en slides individuales (el IA ya genera secciones numeradas). Mostrar cada slide como tarjeta editable:
- Botón "Editar" por slide → textarea inline → guardar sin llamar a IA
- Mantener flujo global "Pedir cambios con IA" para regenerar todo
- Botón "Aprobar" disponible en cualquier momento

**Archivos**:
- `src/features/storyboard/components/StoryboardReviewer.tsx` — parsear + UI de tarjetas por slide
- `src/actions/storyboard.ts` — agregar `updateStoryboardSlide(id, newContent)` para guardar ediciones parciales (actualiza el markdown completo con el slide modificado)

### Bloque B — Lightbox en infografías

**Problema**: Las variantes se ven en tarjetas pequeñas. Las letras son ilegibles sin poder ver detalle antes de seleccionar.

**Cambio**:
- Ícono de lupa en cada tarjeta con imagen generada
- Click abre overlay fullscreen con imagen a tamaño real
- Lightbox: cerrar (ESC/click afuera), flechas para navegar entre variantes, botón "Seleccionar esta" desde el lightbox

**Archivos**:
- `src/features/infographic-generation/components/InfographicVariantCard.tsx` — agregar botón zoom
- `src/features/infographic-generation/components/InfographicLightbox.tsx` — nuevo componente overlay
- `src/features/infographic-generation/components/InfographicGenerator.tsx` — estado del lightbox

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Lightbox en infografías (Bloque B)
**Objetivo**: Crear `InfographicLightbox.tsx` como overlay fullscreen con imagen grande, navegación entre variantes (solo las que tienen imagen), cerrar con ESC o click afuera, y botón "Seleccionar esta variante" desde el lightbox. Agregar botón de lupa en `InfographicVariantCard` y gestionar estado `openLightbox` en `InfographicGenerator`.
**Validación**: Click en lupa abre lightbox. ESC cierra. Flechas navegan entre variantes con imagen. Seleccionar desde lightbox funciona.

### Fase 2: Storyboard slide a slide (Bloque A)
**Objetivo**: Modificar `StoryboardReviewer.tsx` para parsear `content_md` en slides individuales (separador: líneas `## Slide N` o `---`). Mostrar cada slide como tarjeta con título, contenido, y botón "Editar" que abre textarea inline. Agregar `updateStoryboardContent(id, newContent)` en `storyboard.ts` para guardar ediciones sin IA. Mantener flujo "Pedir cambios + regenerar con IA" como opción separada.
**Validación**: El storyboard muestra tarjetas individuales por slide. Editar un slide guarda sin llamar a IA. El botón "Aprobar" sigue funcionando.

### Fase 3: Tipos, Actions y Verificación de BD
**Objetivo**: Actualizar tipos en `database.ts`, crear `src/actions/presentations.ts` con `generatePresentation` y `getPresentation`, y verificar que la tabla `presentations` existe en Supabase (crear migración solo si hace falta).
**Validación**: `npm run typecheck` pasa. Llamar `getPresentation(projectId, 'technical')` desde consola o test no lanza error de tabla inexistente.

### Fase 4: Servicio de construcción de prompts HTML
**Objetivo**: Crear `src/features/technical-presentation/services/html-builder.ts` con las funciones `buildSystemPrompt()` y `buildUserPrompt()` que construyen el prompt para que la IA genere el HTML completo. El user prompt incluye: datos del storyboard técnico aprobado (parseado slide a slide), URLs de infografías (preferentemente la variante seleccionada), colores de brand identity, y nombre/cliente del proyecto.
**Validación**: Las funciones son puras (no async), retornan strings correctamente tipados, `typecheck` pasa.

### Fase 5: Feature components (PresentationViewer)
**Objetivo**: Crear `src/features/technical-presentation/components/PresentationViewer.tsx` — Client Component que recibe `html_content` o `null`. Si `null`, muestra estado vacío con botón "Generar". Si tiene contenido, muestra el HTML en un `<iframe srcDoc={html_content}>` con altura fija + botones "Ver en pantalla completa" (abre blob URL en tab nuevo) y "Regenerar".
**Validación**: Componente renderiza sin errores, `typecheck` pasa.

### Fase 6: Page de presentación técnica
**Objetivo**: Crear `src/app/(main)/projects/[id]/presentation/technical/page.tsx` como Server Component. Carga el proyecto, verifica que el storyboard técnico esté aprobado (redirect a `/projects/[id]` si no), obtiene la presentación existente (si hay), y renderiza `PresentationViewer`. Incluye `ProjectAiUsageWidget` en sidebar (patrón de `/technical`).
**Validación**: Página accesible en `http://localhost:3000/projects/[id]/presentation/technical`. Redirige correctamente si no hay storyboard aprobado.

### Fase 7: Actualizar página del proyecto (Paso 4)
**Objetivo**: En `src/app/(main)/projects/[id]/page.tsx`, actualizar el Paso 4 para: (a) cambiar `href` de `/technical` a `/projects/${id}/presentation/technical`, (b) calcular `done` basado en si existe una `presentations` row con `html_content IS NOT NULL` para este proyecto, (c) agregar la query a Supabase en el `Promise.all` junto a las de brand y storyboard.
**Validación**: El Paso 4 muestra "Ver" (verde) cuando hay presentación, y "Completar →" cuando no. El lock se mantiene hasta que storyboard esté aprobado.

### Fase 8: Validación Final
**Objetivo**: Sistema funcionando end-to-end — arquitecto puede generar la presentación HTML desde la UI, verla en iframe, abrirla en tab nuevo, y el Paso 4 del proyecto se marca como completado.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot de `/projects/[id]/presentation/technical` muestra la UI correctamente
- [ ] Playwright screenshot del HTML generado muestra slides con diseño de marca
- [ ] El Paso 4 en la página del proyecto cambia a verde tras generar
- [ ] El log en `ai_usage_logs` aparece con `task_type = 'presentation_technical'`

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

_(vacío — se poblará durante la implementación)_

---

## Gotchas

- [ ] La tabla `presentations` está en `database.ts` pero puede NO existir todavía en Supabase — verificar con `list_tables` antes de insertar
- [ ] `html_content` puede ser muy largo (>50KB de HTML). Supabase `text` aguanta, pero el `<iframe srcDoc>` tiene límite de ~2MB en browsers — dentro del rango esperado
- [ ] El HTML generado por IA puede tener comillas simples/dobles mezcladas que rompan el `srcDoc`. Validar que el output sea HTML válido (el prompt debe pedir HTML limpio)
- [ ] Brand identity se guarda como `markdown_content` (texto libre), no como JSON estructurado. El prompt debe instruir a la IA a extraer los colores hex del markdown directamente
- [ ] Las URLs de infografías en Supabase Storage son signed URLs o públicas — verificar que no expiren durante la sesión antes de embebidas en el HTML (mejor: usar `url` directa de la columna `infographics.url`)
- [ ] El Paso 4 en la página del proyecto tiene `done: false` hardcodeado — al agregar la query de presentación al `Promise.all`, cuidar el orden de los awaits para no romper las otras queries
- [ ] `AiTaskType` en `database.ts` es una union type — agregar `'presentation_technical'` sin romper el tipo de `ai_usage_logs.task_type`
- [ ] No usar `any` en ningún punto del nuevo código

## Anti-Patrones

- NO generar el HTML en el Server Action directamente sin usar `html-builder.ts` (separar construcción de prompts de la lógica de persistencia)
- NO usar `useState` para almacenar el HTML completo en el cliente (viene del servidor como prop, no se guarda en estado)
- NO crear un API route separado para la generación (la presentación es sincrónica y cabe en el timeout de Server Actions — a diferencia de las infografías que son fire-and-forget)
- NO hardcodear colores de marca en el prompt (deben venir siempre del `brand_identity.markdown_content`)
- NO olvidar el log de AI usage al final del Server Action (patrón de `storyboard.ts`)
- NO crear tabla `presentations` con migración si ya existe — verificar primero

---

*PRP pendiente aprobación. No se ha modificado código.*
