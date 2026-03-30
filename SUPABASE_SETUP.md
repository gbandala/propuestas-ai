# Supabase Setup — PropuestasAI

Guía completa para configurar Supabase desde cero: base de datos, storage, autenticación y usuario admin.

---

## 1. Crear el proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Elegir nombre, contraseña de base de datos y región
3. Esperar ~2 minutos a que el proyecto se provea

---

## 2. Variables de entorno

En el Dashboard ve a **Project Settings → API** y copia:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # "anon public"
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # "service_role" — NUNCA expongas esto en el cliente
```

---

## 3. Esquema de base de datos

Ejecuta este SQL completo en **Supabase Dashboard → SQL Editor → New query**:

```sql
-- =============================================
-- TABLAS
-- =============================================

-- Perfiles de usuario (se crea automáticamente al registrarse)
CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  avatar_url    text,
  role          text NOT NULL DEFAULT 'architect'
                  CHECK (role IN ('architect', 'commercial', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Proyectos
CREATE TABLE public.projects (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  client_name              text NOT NULL,
  description              text,
  status                   text NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  image_quality            text NOT NULL DEFAULT 'flash'
                             CHECK (image_quality IN ('flash', 'pro')),
  technical_completed_at   timestamptz,
  commercial_completed_at  timestamptz,
  archive_url              text,
  archived_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Brief libre (reemplaza technical_briefs multi-paso)
CREATE TABLE public.briefs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  content     text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
COMMENT ON TABLE public.briefs IS 'Brief de proyecto: textarea libre con 8 secciones guiadas. Reemplaza technical_briefs multi-paso.';

-- Technical briefs (legacy — multi-paso)
CREATE TABLE public.technical_briefs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  step_data        jsonb NOT NULL DEFAULT '{}',
  current_step     integer NOT NULL DEFAULT 1,
  markdown_content text,
  generated_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Identidad de marca
CREATE TABLE public.brand_identity (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  markdown_content    text NOT NULL DEFAULT '',
  logo_url            text,
  background_url      text,
  logo_variants       jsonb DEFAULT '[]',
  background_variants jsonb DEFAULT '[]',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Brand specs (legacy)
CREATE TABLE public.brand_specs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  primary_color    text NOT NULL DEFAULT '#3B82F6',
  secondary_color  text NOT NULL DEFAULT '#1E40AF',
  accent_color     text NOT NULL DEFAULT '#F59E0B',
  logo_url         text,
  font_family      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Storyboards
CREATE TABLE public.storyboards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('technical', 'commercial', 'infographic')),
  content_md  text NOT NULL DEFAULT '',
  version     integer NOT NULL DEFAULT 1,
  approved_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Jobs de generación async
CREATE TABLE public.generation_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type         text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress     integer NOT NULL DEFAULT 0,
  error        text,
  slide_number integer,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.generation_jobs.slide_number IS 'Índice del slide (1-10) para jobs de tipo proposal_infographics';

-- Infografías generadas
CREATE TABLE public.infographics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'technical',
  variant     integer,
  url         text NOT NULL,
  prompt_used text,
  selected    boolean NOT NULL DEFAULT false,
  slide_index integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.infographics IS 'Infografías generadas. slide_index indica posición en la propuesta (1-10). variant es legado.';

-- Presentaciones
CREATE TABLE public.presentations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('technical', 'commercial')),
  html_content text,
  slides_count integer NOT NULL DEFAULT 10,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Slides de presentación (legacy)
CREATE TABLE public.presentation_slides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('technical', 'commercial')),
  slide_number integer NOT NULL CHECK (slide_number >= 1 AND slide_number <= 15),
  url         text NOT NULL,
  prompt_used text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Logs de uso de IA
CREATE TABLE public.ai_usage_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  task_type         text NOT NULL,
  provider          text NOT NULL CHECK (provider IN ('gemini', 'openrouter')),
  model             text NOT NULL,
  prompt_tokens     integer,
  completion_tokens integer,
  total_tokens      integer,
  cost_usd          numeric,
  latency_ms        integer,
  is_revision       boolean NOT NULL DEFAULT false,
  revision_notes    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS — Row Level Security
-- =============================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_briefs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_identity      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_specs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infographics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- projects
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

-- briefs
CREATE POLICY "Users can manage own project briefs" ON public.briefs FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all briefs" ON public.briefs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- technical_briefs
CREATE POLICY "Users can manage own briefs" ON public.technical_briefs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = technical_briefs.project_id AND p.user_id = auth.uid()));

-- brand_identity
CREATE POLICY "brand_identity_select" ON public.brand_identity FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "brand_identity_insert" ON public.brand_identity FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "brand_identity_update" ON public.brand_identity FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- brand_specs
CREATE POLICY "Users can manage own brand specs" ON public.brand_specs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = brand_specs.project_id AND p.user_id = auth.uid()));

-- storyboards
CREATE POLICY "storyboards_select" ON public.storyboards FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "storyboards_insert" ON public.storyboards FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "storyboards_update" ON public.storyboards FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- generation_jobs
CREATE POLICY "Users can manage own jobs" ON public.generation_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = generation_jobs.project_id AND p.user_id = auth.uid()));

-- infographics
CREATE POLICY "Users can manage own infographics" ON public.infographics FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = infographics.project_id AND p.user_id = auth.uid()));

-- presentations
CREATE POLICY "presentations_project_access" ON public.presentations FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- presentation_slides
CREATE POLICY "Users can manage their own presentation slides" ON public.presentation_slides FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all presentation slides" ON public.presentation_slides FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ai_usage_logs
CREATE POLICY "users_see_own_project_logs" ON public.ai_usage_logs FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "users_insert_own_project_logs" ON public.ai_usage_logs FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "admins_see_all_logs" ON public.ai_usage_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- TRIGGER: crear perfil automáticamente al registrarse
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. Storage — bucket `project-assets`

En **Storage → New bucket**:

| Campo | Valor |
|-------|-------|
| Name | `project-assets` |
| Public bucket | ✅ activado |
| File size limit | sin límite (o 10 MB) |

Luego en **Storage → Policies** agrega estas 4 políticas sobre la tabla `objects`:

```sql
-- Lectura pública
CREATE POLICY "Public read project assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-assets');

-- Subida autenticada
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-assets');

-- Actualización autenticada
CREATE POLICY "Authenticated users can update"
  ON storage.objects FOR UPDATE
  USING  (bucket_id = 'project-assets')
  WITH CHECK (bucket_id = 'project-assets');

-- Borrado autenticado
CREATE POLICY "Users can delete own assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-assets');
```

---

## 5. Autenticación — Email/Password

En **Authentication → Providers → Email**:

- Enable Email provider: ✅
- Confirm email: desactivar para entornos de desarrollo (los usuarios creados por admin se confirman automáticamente)

---

## 6. Autenticación — Google OAuth

En **Authentication → Providers → Google**:

1. Activar **Google provider**
2. Ir a [console.cloud.google.com](https://console.cloud.google.com)
3. Crear proyecto → **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     ```
     https://xxxx.supabase.co/auth/v1/callback
     ```
     (sustituir `xxxx` por tu project ref de Supabase)
4. Copiar **Client ID** y **Client Secret** al Dashboard de Supabase
5. En el Dashboard, copiar la **Callback URL** que Supabase muestra y pegarla en Google Console

Para producción agregar también:
```
https://tu-dominio.com/auth/callback
```

---

## 7. Crear el usuario administrador

### Opción A — Desde la app (recomendado)

1. Ir a `/login` y crear la cuenta con email/password
2. En Supabase Dashboard → **Table Editor → profiles**
3. Buscar el registro con ese email y cambiar `role` de `architect` a `admin`

### Opción B — SQL directo

Después de que el usuario se registre por primera vez:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'test@propuestasai.com';
```

### Credenciales del admin de referencia

```
Email:    test@propuestasai.com
Password: Test1234!
Rol:      admin
```

---

## 8. Realtime — habilitar para generation_jobs

En **Database → Replication** (o **Table Editor → generation_jobs → Realtime**):

Activar Realtime para la tabla `generation_jobs`. El polling de progreso de generación de infografías usa Supabase Realtime para actualizaciones en tiempo real.

---

## 9. Verificación final

Ejecuta este SQL para confirmar que todo está en orden:

```sql
-- Verificar tablas creadas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar trigger
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Verificar bucket
SELECT id, name, public FROM storage.buckets;
```

Resultado esperado: 12 tablas con `rowsecurity = true`, trigger `on_auth_user_created`, bucket `project-assets` público.

---

## 10. Variables completas de `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenRouter (proveedor único de IA)
OPENROUTER_API_KEY=sk-or-...

# Modelos de imagen (cambiar aquí sin tocar código)
IMAGE_MODEL_FLASH=google/gemini-2.5-flash-image
IMAGE_MODEL_PRO=google/gemini-3.1-flash-image-preview
IMAGE_MODEL_FLUX=black-forest-labs/flux.2-pro

# Modelo de texto para storyboards
TEXT_MODEL=anthropic/claude-sonnet-4-6

# URL del sitio
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Secreto para llamadas server-to-server
INTERNAL_API_SECRET=propuestasai-internal
```
