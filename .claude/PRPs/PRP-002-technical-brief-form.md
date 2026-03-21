# PRP-002: Formulario Multi-Paso — Brief Técnico (8 Pasos)

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-18
> **Proyecto**: PropuestasAI

---

## Objetivo

Construir el formulario multi-paso de 8 pasos que captura toda la información técnica del proyecto (datos del cliente, problema, ROI, funcionalidades, integraciones, presupuesto, solución técnica y marca) y genera automáticamente el brief técnico en Markdown, guardando el progreso en `technical_briefs.step_data` con persistencia por paso.

## Por Qué

| Problema | Solución |
|----------|----------|
| El arquitecto pierde 6 horas creando el brief técnico manualmente en PPT | Formulario guiado de 8 pasos captura la info estructurada y genera el MD automáticamente |
| Sin brief técnico la fase comercial permanece bloqueada para siempre | Al completar el paso 8 y generar el MD, se establece `technical_completed_at` desbloqueando la fase comercial |
| La página `/projects/[id]/technical` ya existe como link pero no tiene ruta ni componentes | Este PRP implementa esa ruta completa |

**Valor de negocio**: Reduce el tiempo del arquitecto de 6 horas a menos de 30 minutos. Es la pieza central del flujo técnico — sin este formulario no se puede generar ningún material.

## Qué

### Criterios de Éxito
- [ ] Arquitecto puede navegar entre los 8 pasos con "Siguiente" / "Anterior"
- [ ] Cada paso se guarda automáticamente en `technical_briefs.step_data` al avanzar (sin perder datos al refrescar)
- [ ] El paso 8 (marca) incluye upload de logo a Supabase Storage en `project-assets/projects/{id}/logo`
- [ ] Al completar el paso 8, el botón "Generar Brief" genera el Markdown completo
- [ ] El Markdown generado se guarda en `technical_briefs.step_data.generated_brief` y se marca `generated_at`
- [ ] Al guardar `generated_at`, se actualiza `projects.technical_completed_at` (desbloquea fase comercial)
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso

### Comportamiento Esperado (Happy Path)

1. Arquitecto entra a `/projects/[id]/technical`
2. Ve el formulario en Paso 1 con barra de progreso (1/8) y datos pre-cargados si ya existe `step_data`
3. Completa el paso → hace clic en "Siguiente" → datos se guardan en Supabase → avanza al paso 2
4. Puede navegar hacia atrás sin perder datos
5. En el paso 8 sube el logo (PNG/SVG <5MB) y elige colores primario, secundario y acento
6. Después del paso 8 ve botón "Generar Brief Técnico"
7. El sistema genera el Markdown completo (Template 1, ver referencia) y lo muestra en preview
8. Arquitecto confirma → se guarda el MD, `generated_at` se establece, `technical_completed_at` se actualiza
9. Se redirige a `/projects/[id]` donde la Fase Comercial ahora aparece desbloqueada

---

## Contexto

### Referencias
- `src/types/database.ts` — `TechnicalBrief`, `BrandSpec`, tipos ya definidos
- `src/actions/projects.ts` — Patrón de Server Actions: Zod + `{ data }` o `{ error }`
- `src/features/projects/` — Estructura feature-first a replicar en `technical-brief`
- `src/app/(main)/projects/[id]/page.tsx` — Ya linkea a `/projects/[id]/technical`
- `BUSINESS_LOGIC.md` sección 4 — Especificación exacta de los 8 pasos y los campos de cada uno

### Los 8 Pasos (campos por paso)

| Paso | Nombre | Campos clave |
|------|--------|--------------|
| 1 | Datos del Proyecto | nombre proyecto, empresa cliente, fecha, nombre arquitecto responsable |
| 2 | Problema e Impacto | descripción del problema, mínimo 3 puntos de impacto |
| 3 | ROI Esperado | KPIs actuales, KPIs objetivo, timeline de retorno |
| 4 | Funcionalidades | tabla: nombre, descripción, prioridad (Must/Should/Could) |
| 5 | Integraciones | tabla: nombre sistema, tipo (BD/API/interno), descripción |
| 6 | Presupuesto | tabla: tipo recurso (VPS/Storage/Licencia), costo mensual, notas |
| 7 | Solución Técnica | descripción arquitectura propuesta, stack tecnológico, fases de implementación con duración |
| 8 | Marca | upload logo (PNG/SVG <5MB), color primario, color secundario, color acento |

### Arquitectura Propuesta (Feature-First)

```
src/features/technical-brief/
├── components/
│   ├── TechnicalBriefForm.tsx          # Orquestador: estado del paso actual, navegación
│   ├── StepProgressBar.tsx             # Barra de progreso 1/8 con nombres de pasos
│   ├── steps/
│   │   ├── Step1ProjectData.tsx        # Datos del proyecto
│   │   ├── Step2Problem.tsx            # Problema e impacto (textarea + lista dinámica)
│   │   ├── Step3ROI.tsx                # KPIs actuales/objetivos + timeline
│   │   ├── Step4Features.tsx           # Tabla dinámica de funcionalidades
│   │   ├── Step5Integrations.tsx       # Tabla dinámica de integraciones
│   │   ├── Step6Budget.tsx             # Tabla dinámica de presupuesto
│   │   ├── Step7TechSolution.tsx       # Textarea arquitectura + tabla de fases
│   │   └── Step8Brand.tsx              # Logo upload + color pickers
│   ├── BriefPreview.tsx                # Preview del MD generado antes de confirmar
│   └── index.ts
├── hooks/
│   └── useTechnicalBrief.ts            # Cargar/guardar step_data, tracking del paso actual
├── services/
│   └── brief-generator.ts              # Función pura: step_data → Markdown string (Template 1)
├── store/
│   └── technical-brief.store.ts        # Zustand: step_data local, currentStep
└── types/
    └── index.ts                        # StepData por paso, TechnicalBriefFormData

src/actions/
└── technical-brief.ts                  # Server Actions: getTechnicalBrief, saveBriefStep,
                                        # generateBrief (guarda MD + timestamps)

src/app/(main)/projects/[id]/
└── technical/
    └── page.tsx                        # Carga el brief existente o crea uno nuevo, renderiza <TechnicalBriefForm />
```

### Modelo de Datos

La tabla `technical_briefs` ya existe (creada en PRP-001). Los datos se guardan en `step_data` como JSONB con esta estructura:

```typescript
interface StepData {
  step1?: { projectName: string; clientCompany: string; date: string; architectName: string }
  step2?: { problemDescription: string; impacts: string[] }
  step3?: { currentKPIs: KPI[]; targetKPIs: KPI[]; returnTimeline: string }
  step4?: { features: Feature[] }  // { name, description, priority: 'Must'|'Should'|'Could' }
  step5?: { integrations: Integration[] }  // { name, type: 'BD'|'API'|'internal', description }
  step6?: { budget: BudgetItem[] }  // { type: 'VPS'|'Storage'|'License', monthlyCost: number, notes }
  step7?: { architectureDescription: string; stack: string; phases: Phase[] }  // { name, duration, dates }
  step8?: { logoUrl: string | null; primaryColor: string; secondaryColor: string; accentColor: string }
  generatedBrief?: string  // Markdown generado
}
```

La tabla `brand_specs` recibe los datos del paso 8 como una fila separada (upsert por `project_id`).

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase con el bucle agéntico.

### Fase 1: Server Actions y Tipos
**Objetivo**: `src/actions/technical-brief.ts` con `getTechnicalBrief` (carga o crea el registro), `saveBriefStep` (guarda el step_data del paso actual + `current_step`), y `generateBrief` (genera el MD, guarda `generated_at`, actualiza `projects.technical_completed_at` y hace upsert en `brand_specs`). Tipos de `StepData` definidos en `src/features/technical-brief/types/index.ts`.
**Validación**: `npm run typecheck` pasa. Cada action retorna `{ data }` o `{ error }` consistentemente.

### Fase 2: Generador de Markdown
**Objetivo**: `src/features/technical-brief/services/brief-generator.ts` — función pura `generateBriefMarkdown(stepData: StepData, projectName: string): string` que produce el brief técnico completo en Markdown usando los datos de los 8 pasos. Sin dependencias externas, sin IA (la generación de infografías con IA es otro PRP).
**Validación**: Función exportada. Dado un `stepData` completo produce un string Markdown con todas las secciones (cliente, problema, ROI, funcionalidades, integraciones, presupuesto, arquitectura, marca).

### Fase 3: Zustand Store y Hook
**Objetivo**: `technical-brief.store.ts` con estado: `stepData`, `currentStep`, `isSaving`, `isGenerating`. Hook `useTechnicalBrief` que expone: `goToStep(n)`, `saveCurrentStep(data)`, `generateBrief()`.
**Validación**: Store inicializa con `currentStep: 1` y `stepData: {}`. Hook llama a las Server Actions correspondientes.

### Fase 4: Componentes de Pasos (Steps 1-4)
**Objetivo**: `StepProgressBar` + los primeros 4 componentes de pasos (`Step1ProjectData`, `Step2Problem`, `Step3ROI`, `Step4Features`) con formularios controlados, validación Zod client-side y botones "Siguiente"/"Anterior".
**Validación**: Componentes renderizan sin errores. `Step4Features` permite agregar/eliminar filas de la tabla de funcionalidades dinámicamente.

### Fase 5: Componentes de Pasos (Steps 5-8)
**Objetivo**: `Step5Integrations`, `Step6Budget`, `Step7TechSolution`, `Step8Brand` (con logo upload a Supabase Storage y color pickers HTML nativos). Validación WCAG: si contraste primario/secundario < 4.5:1 mostrar warning sin bloquear.
**Validación**: Componentes renderizan sin errores. Upload de logo funciona y devuelve URL pública almacenada en Storage. Color pickers tienen valores por defecto coherentes.

### Fase 6: Orquestador y Preview
**Objetivo**: `TechnicalBriefForm.tsx` que ensambla todos los pasos con el store. `BriefPreview.tsx` que muestra el Markdown generado en un modal antes de confirmar. Al confirmar llama a `generateBrief()` que guarda y redirige.
**Validación**: Flujo completo de paso 1 a paso 8 sin errores. Preview muestra el MD formateado. Al confirmar se actualiza `technical_completed_at` y se redirige a `/projects/[id]`.

### Fase 7: Página de Ruta
**Objetivo**: `src/app/(main)/projects/[id]/technical/page.tsx` que carga el `TechnicalBrief` existente (o crea uno nuevo si no existe) y renderiza `<TechnicalBriefForm />`. Solo accesible para `architect` y `admin` — redirigir a `/projects/[id]` si el rol es `commercial`.
**Validación**: La ruta `/projects/[id]/technical` carga sin errores. El arquitecto ve el formulario en el paso donde lo dejó (`current_step`). El comercial es redirigido.

### Fase 8: Validación Final
**Objetivo**: Sistema end-to-end funcionando. Los 8 pasos guardan datos, el brief se genera y la fase comercial se desbloquea.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Arquitecto completa los 8 pasos → el MD generado es correcto
- [ ] Al confirmar el brief: `technical_completed_at` se establece en la tabla `projects`
- [ ] En `/projects/[id]` la Fase Comercial aparece desbloqueada
- [ ] Comercial es redirigido al intentar acceder directamente a la ruta `/technical`
- [ ] Al refrescar en el paso 5, el formulario retoma desde el paso 5 con los datos previos

---

## Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] `saveBriefStep` debe hacer `upsert` (no `insert`) en `technical_briefs` ya que el registro puede o no existir — usar `onConflict: 'project_id'`
- [ ] El upload de logo a Supabase Storage requiere que el bucket `project-assets` exista con las políticas correctas (ya creado en PRP-001, verificar antes de implementar)
- [ ] Los color pickers `<input type="color">` devuelven hex (#RRGGBB) — validar formato antes de guardar
- [ ] `Step4Features`, `Step5Integrations`, `Step6Budget` tienen tablas dinámicas — usar `useFieldArray` pattern con `useState` local; NO depender de React Hook Form (sin esa lib en el proyecto)
- [ ] La generación del Markdown es síncrona (sin IA en este PRP) — la IA llega en el PRP de infografías
- [ ] El `current_step` en la tabla `technical_briefs` puede quedar desincronizado del store local — siempre cargar desde DB al montar la página
- [ ] Los Server Actions no pueden lanzar excepciones hacia el cliente — siempre retornar `{ error: string }` en lugar de throw
- [ ] La validación WCAG del contraste (ratio 4.5:1) requiere calcular luminancia relativa — usar fórmula sencilla en cliente sin librerías externas

## Anti-Patrones

- NO usar `any` en los tipos de `step_data` — definir la interfaz `StepData` completa
- NO guardar el formulario entero al final — guardar paso a paso al avanzar (UX resiliente)
- NO redirigir al comercial desde el Server Component directamente — leer el rol en la página y hacer `redirect()` de Next.js
- NO omitir validación Zod en `saveBriefStep` aunque sea parcial — validar que `step` sea 1-8 y `data` sea un objeto
- NO hardcodear los colores por defecto en múltiples lugares — definirlos como constante en `src/shared/constants/`

---

*PRP pendiente aprobación. No se ha modificado código.*
