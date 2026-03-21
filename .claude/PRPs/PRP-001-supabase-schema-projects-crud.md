# PRP-001: Supabase Schema + Projects CRUD

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-18
> **Proyecto**: PropuestasAI

---

## Objetivo

Crear el schema completo de Supabase (8 tablas + RLS + Storage buckets) y la feature `projects` con CRUD completo: crear, listar, ver detalle y archivar proyectos desde el dashboard.

## Por Qué

| Problema | Solución |
|----------|----------|
| La app tiene auth con 3 roles pero ninguna tabla de negocio | Migración SQL crea el schema completo de una vez |
| Sin proyectos no hay flujo técnico ni comercial | Feature `projects` es la entrada al happy path |
| Dashboard está vacío (solo placeholder) | Lista de proyectos con estado y acciones contextuales por rol |

**Valor de negocio**: Desbloquea todos los flujos posteriores. Sin este PRP no existe ninguna otra feature. Es el cimiento de la fábrica.

## Qué

### Criterios de Éxito
- [ ] `npm run typecheck` pasa sin errores después de aplicar la migración
- [ ] Arquitecto puede crear un proyecto, verlo en el dashboard y ver su detalle
- [ ] Comercial ve el proyecto en el dashboard pero el botón "Fase Comercial" aparece deshabilitado hasta que la fase técnica esté completa
- [ ] Admin puede ver todos los proyectos de todos los usuarios
- [ ] RLS bloquea acceso cruzado entre usuarios no relacionados
- [ ] `npm run build` exitoso

### Comportamiento Esperado (Happy Path)

1. Arquitecto inicia sesión → ve dashboard con lista vacía + botón "Nuevo Proyecto"
2. Crea proyecto llenando nombre, cliente y descripción breve
3. El proyecto aparece en la lista con estado `draft` y badge de rol
4. Arquitecto entra al detalle del proyecto → ve las fases disponibles (Técnica habilitada, Comercial bloqueada)
5. Comercial inicia sesión → ve el mismo proyecto en su dashboard (fase técnica como read-only, fase comercial bloqueada con tooltip explicativo)
6. Admin ve todos los proyectos de todos los arquitectos en un panel unificado

---

## Contexto

### Referencias
- `src/types/database.ts` — Patrón de tipos existente (Profile, UserRole). Extender con los nuevos tipos
- `src/actions/auth.ts` — Patrón de Server Actions (sin try/catch, retornar `{ error }` o `{ success }`)
- `src/lib/supabase/server.ts` — Cliente Supabase server-side ya configurado
- `src/features/auth/` — Estructura de feature-first a replicar en `projects`
- `src/app/(main)/dashboard/page.tsx` — Página a reemplazar con la lista real

### Arquitectura Propuesta (Feature-First)

```
src/features/projects/
├── components/
│   ├── ProjectCard.tsx         # Card con nombre, cliente, estado, acciones
│   ├── ProjectList.tsx         # Grid/Lista de proyectos con empty state
│   ├── CreateProjectModal.tsx  # Modal con form (nombre, cliente, descripción)
│   ├── ProjectStatusBadge.tsx  # Badge: draft / in_progress / completed / archived
│   └── index.ts
├── hooks/
│   └── useProjects.ts          # Hook: lista, crear, archivar
├── services/
│   └── projects.service.ts     # Llamadas a Server Actions
├── store/
│   └── projects.store.ts       # Zustand: lista de proyectos en caché
└── types/
    └── index.ts                # ProjectStatus, Project, CreateProjectInput

src/actions/
└── projects.ts                 # Server Actions: getProjects, createProject, archiveProject

src/app/(main)/
├── dashboard/
│   └── page.tsx                # Reemplazar placeholder con <ProjectList />
└── projects/
    └── [id]/
        └── page.tsx            # Detalle del proyecto con fases
```

### Modelo de Datos

```sql
-- Proyectos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  description TEXT,
  architect_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commercial_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  technical_completed_at TIMESTAMPTZ,
  commercial_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brief técnico (8 pasos guardados como JSONB)
CREATE TABLE technical_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_data JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Especificación de marca
CREATE TABLE brand_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3B82F6',
  secondary_color TEXT NOT NULL DEFAULT '#1E40AF',
  accent_color TEXT NOT NULL DEFAULT '#F59E0B',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Infografías generadas
CREATE TABLE infographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('technical', 'roi', 'roadmap')),
  variant INTEGER NOT NULL CHECK (variant BETWEEN 1 AND 3),
  url TEXT,
  prompt_used TEXT,
  selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presentaciones HTML
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('technical', 'commercial')),
  html_content TEXT,
  slides_count INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, type)
);

-- Propuestas comerciales
CREATE TABLE commercial_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  markdown_content TEXT,
  phases_data JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Jobs de generación async
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('technical_infographics', 'commercial_infographics', 'technical_presentation', 'commercial_presentation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descargas
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('technical', 'commercial', 'complete')),
  zip_url TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE infographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Policies: projects
-- Admin ve todo
CREATE POLICY "admin_all_projects" ON projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Arquitecto ve sus propios proyectos
CREATE POLICY "architect_own_projects" ON projects
  FOR ALL USING (architect_id = auth.uid());

-- Comercial ve proyectos donde es el comercial asignado
CREATE POLICY "commercial_assigned_projects" ON projects
  FOR SELECT USING (commercial_id = auth.uid());

-- Storage bucket para assets de proyectos
INSERT INTO storage.buckets (id, name, public) VALUES ('project-assets', 'project-assets', false);
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase con el bucle agéntico.

### Fase 1: Migración Supabase
**Objetivo**: Todas las tablas creadas en Supabase con RLS habilitado y policies correctas. Storage bucket `project-assets` creado.
**Validación**: `mcp__supabase__list_tables` muestra las 8 tablas nuevas. `get_advisors` no reporta tablas sin RLS.

### Fase 2: Tipos TypeScript
**Objetivo**: `src/types/database.ts` extendido con los tipos de todas las tablas nuevas. Tipos exportados listos para usar en features.
**Validación**: `npm run typecheck` pasa sin errores.

### Fase 3: Server Actions de Proyectos
**Objetivo**: `src/actions/projects.ts` con `getProjects`, `createProject`, `getProjectById`, `archiveProject`. Cada action respeta los permisos por rol.
**Validación**: TypeScript compila. Funciones retornan `{ data }` o `{ error }` consistentemente.

### Fase 4: Feature Projects (Componentes y Store)
**Objetivo**: `src/features/projects/` completo con `ProjectCard`, `ProjectList`, `CreateProjectModal`, `ProjectStatusBadge`, `useProjects` hook y Zustand store.
**Validación**: Componentes renderizan sin errores. `CreateProjectModal` muestra form con validación Zod.

### Fase 5: Páginas y Rutas
**Objetivo**: Dashboard muestra `<ProjectList />` real. Nueva ruta `/projects/[id]` con detalle del proyecto mostrando las fases disponibles con estado (habilitado/bloqueado según `technical_completed_at`).
**Validación**: `npm run build` exitoso. Playwright screenshot confirma que el dashboard muestra la lista.

### Fase 6: Validación Final
**Objetivo**: Sistema funcionando end-to-end. Los 3 roles ven lo correcto en el dashboard.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Arquitecto puede crear proyecto y verlo en el dashboard
- [ ] Comercial ve el proyecto sin acceso a fase técnica de edición
- [ ] Admin ve todos los proyectos
- [ ] RLS confirmado: usuario A no ve proyectos de usuario B

---

## Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] El campo `role` en `profiles` ya existe — NO recrear la tabla profiles, solo referenciarla
- [ ] Las policies de Supabase con `EXISTS (subquery)` son más lentas que join directo — usar para admin está OK dado el volumen bajo
- [ ] `commercial_id` es nullable (un proyecto puede no tener comercial asignado aún) — validar en UI
- [ ] Next.js App Router: los Server Actions no pueden retornar JSX, solo datos serializables
- [ ] Zustand store debe inicializarse con `[]` (no `null`) para evitar flash de contenido vacío

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan (seguir el patrón de `src/actions/auth.ts`)
- NO ignorar errores de TypeScript
- NO hardcodear IDs ni rutas (usar constantes en `src/shared/constants/`)
- NO omitir validación Zod en `createProject` (nombre, cliente son requeridos)
- NO mostrar datos del arquitecto al comercial más allá de lo necesario para el contexto

---

*PRP pendiente aprobación. No se ha modificado código.*
