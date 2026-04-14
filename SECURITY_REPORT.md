# Security Audit Report: saas-factory-app

**Fecha:** 2026-04-14
**Skill versión:** v1.0
**Compliance:** GDPR
**Block on:** critical, high

---

## Executive Summary

| Categoría | Findings |
|-----------|----------|
| Critical  | 0        |
| High      | 4        |
| Medium    | 3        |
| Low       | 1        |
| Info      | 4        |

**Score: 43/100** 🚨
**DEPLOY BLOQUEADO 🚨**

> 4 findings altos deben resolverse antes de hacer deploy.

---

## SAST: Análisis Estático

### MÓDULO A — Secret Detection

✅ **PASS** — No se encontraron API keys hardcodeadas (Stripe, Google, AWS) ni service role JWTs en el código fuente.

---

⚠️ **HIGH — Credenciales de prueba hardcodeadas en código fuente**
- **Archivo:** `src/app/api/dev/seed/route.ts:10-11`
- **Descripción:** `TEST_PASSWORD = 'Test1234!'` está hardcodeado en el código fuente. Adicionalmente, el endpoint `GET /api/dev/seed` devuelve `{ email, password }` en la respuesta JSON. Aunque el bloqueo por `NODE_ENV === 'production'` existe, las credenciales quedan expuestas en el historial de git y en cualquier entorno de staging/preview que no configure esa variable correctamente.
- **Fix inmediato:**
  ```typescript
  // Mover a .env.local (nunca al repo)
  // DEV_SEED_EMAIL=test@propuestasai.dev
  // DEV_SEED_PASSWORD=<generate-random>

  const TEST_EMAIL = process.env.DEV_SEED_EMAIL ?? 'test@propuestasai.dev'
  const TEST_PASSWORD = process.env.DEV_SEED_PASSWORD
  if (!TEST_PASSWORD) {
    return NextResponse.json({ error: 'DEV_SEED_PASSWORD not set' }, { status: 500 })
  }

  // Eliminar el GET handler que devuelve las credenciales
  // O al menos nunca devolver la password en la respuesta
  ```

---

### MÓDULO B — XSS Detection

✅ **PASS** — No se encontraron usos de `dangerouslySetInnerHTML`, `eval()` ni asignaciones directas a `innerHTML`.

ℹ️ **INFO — CSP contiene `unsafe-eval` y `unsafe-inline` en script-src**
- **Archivo:** `next.config.ts:16`
- **Descripción:** `"script-src 'self' 'unsafe-inline' 'unsafe-eval'"` — ambas directivas anulan la protección XSS que brinda CSP. El comentario indica que `unsafe-eval` es requerido por Next.js dev, pero esto debe resolverse en producción con una CSP por entorno o nonces.
- Ver sección Medium M2 para el fix.

---

### MÓDULO C — Input Validation — Server Actions

⚠️ **HIGH — Server Actions de autenticación sin validación Zod**
- **Archivo:** `src/actions/auth.ts:7-105`
- **Funciones afectadas:** `login()`, `signup()`, `updatePassword()`, `updateProfile()`
- **Descripción:** Todas aceptan `FormData` y extraen datos con `formData.get('field') as string` sin schema de validación. No hay límites de longitud, validación de formato de email, ni verificación de tipo.
- **Fix:**
  ```typescript
  import { z } from 'zod'

  const LoginSchema = z.object({
    email: z.string().email('Email inválido').max(254),
    password: z.string().min(6, 'Mínimo 6 caracteres').max(128),
  })

  export async function login(formData: FormData) {
    const parsed = LoginSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    })
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    // ... resto de la función usando parsed.data
  }

  const SignupSchema = LoginSchema  // reutilizar o extender

  const UpdatePasswordSchema = z.object({
    password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/),
  })

  const UpdateProfileSchema = z.object({
    full_name: z.string().min(2).max(100),
  })
  ```

⚠️ **HIGH — Server Action `createUser` sin validación Zod**
- **Archivo:** `src/actions/admin-users.ts:51-83`
- **Descripción:** `createUser()` toma `email` y `password` de `FormData` con comprobaciones manuales (null check, longitud mínima 6). No valida formato de email, longitud máxima, caracteres permitidos, ni complejidad de contraseña.
- **Fix:**
  ```typescript
  import { z } from 'zod'

  const CreateUserSchema = z.object({
    email: z.string().email('Email inválido').max(254),
    password: z.string()
      .min(8, 'Mínimo 8 caracteres')
      .max(128)
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
  })

  export async function createUser(formData: FormData) {
    try {
      await requireAdmin()
      const parsed = CreateUserSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
      })
      if (!parsed.success) return { error: parsed.error.issues[0].message }
      // ... usar parsed.data.email y parsed.data.password
    } catch (e) { ... }
  }
  ```

---

## RLS Audit

⚠️ **MEDIUM — No se encontró directorio `supabase/` ni archivos de migración**
- El directorio `supabase/migrations/` no existe en el repositorio. No es posible auditar estáticamente las políticas RLS ni verificar qué tablas tienen Row Level Security habilitado.
- Las tablas identificadas en el código incluyen: `profiles`, `projects`, `briefs`, `brand_identity`, `storyboards`, `infographics`, `generation_jobs`, `ai_usage_logs`, `technical_briefs`, `presentation_slides`.
- **Acción requerida:** Verificar en el Supabase Dashboard → Table Editor → cada tabla → RLS que todas las tablas con datos de usuario tienen RLS habilitado y policies configuradas. Ejecutar:
  ```sql
  -- Auditar estado RLS de todas las tablas
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```
- Especial atención: `profiles` (datos personales), `projects`, `briefs`, `brand_identity` deben tener policies que filtren por `auth.uid()`.

ℹ️ **INFO — `SUPABASE_SERVICE_ROLE_KEY` solo se usa en rutas server-side**
- No se encontró uso de `SUPABASE_SERVICE_ROLE_KEY` en componentes `"use client"`. La key de service role está correctamente aislada en rutas API y acciones server. ✅

⚠️ **HIGH — Fallback silencioso de service_role a anon key**
- **Archivo:** `src/app/api/projects/archive/route.ts:16`
- **Código:** `process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`
- **Descripción:** Si `SUPABASE_SERVICE_ROLE_KEY` no está configurada en producción, el cliente Supabase se inicializa con la anon key sin lanzar ningún error. Esto puede hacer que la operación de archivado falle silenciosamente o pase con permisos insuficientes. Todas las demás rutas (`/api/infographics/generate`, `/api/brand/generate-image`) usan `src/lib/supabase/admin.ts` que lanza error si falta la key.
- **Fix:**
  ```typescript
  // src/app/api/projects/archive/route.ts:14-17
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  )
  ```

---

## Dependency Audit

⚠️ **LOW — No existe `package-lock.json` en el repositorio**
- `package-lock.json` está en `.gitignore` (línea 6). Sin lockfile no es posible ejecutar `npm audit` ni garantizar reproducibilidad de dependencias.
- **Riesgo:** Instalaciones en CI/CD pueden resolver versiones distintas incluyendo patches con vulnerabilidades no detectadas.
- **Fix:** Eliminar `package-lock.json` del `.gitignore` y comitear el lockfile:
  ```bash
  # 1. Quitar de .gitignore
  # Eliminar la línea "package-lock.json" de .gitignore

  # 2. Generar y commitear
  npm install
  git add package-lock.json
  git commit -m "chore: add package-lock.json for reproducible builds"

  # 3. Ejecutar auditoría
  npm audit
  ```

---

## GDPR Compliance

- [ ] **Política de retención de datos** — No se encontró documentación de cuánto tiempo se retienen los datos de usuarios/proyectos. La función `autoCleanOldProjects` archiva proyectos después de 30 días pero no elimina datos de usuarios.
- [x] **Right to be forgotten** — `permanentlyDeleteProject()` en `src/actions/admin.ts` elimina registros en cascada (ai_usage_logs → generation_jobs → infographics → presentation_slides → storyboards → technical_briefs → brand_identity → projects). Sin embargo, falta la eliminación de la cuenta de usuario y su perfil.
- [ ] **Consent tracking** — No se encontró implementación de consent tracking para GDPR. Si se procesan datos de usuarios de la UE, esto es obligatorio.

ℹ️ **INFO — Implementar eliminación completa de cuenta de usuario para GDPR**
- El flujo de `permanentlyDeleteProject` no elimina el perfil de `profiles` ni la cuenta de `auth.users`. Añadir:
  ```typescript
  // Al final de permanentlyDeleteProject o en una función deleteUserAccount separada
  await supabase.from('profiles').delete().eq('id', userId)
  await adminClient.auth.admin.deleteUser(userId)
  ```

---

## Security Headers

ℹ️ **INFO — Headers de seguridad configurados correctamente**
- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Strict-Transport-Security` con preload ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Permissions-Policy` restrictiva ✅

⚠️ **MEDIUM — CSP con `unsafe-eval` y `unsafe-inline` en script-src**
- **Archivo:** `next.config.ts:16`
- **Descripción:** Ambas directivas deshabilitan la protección XSS de CSP. `unsafe-eval` es necesario durante desarrollo pero no debe ir a producción.
- **Fix:**
  ```typescript
  // next.config.ts
  const isDev = process.env.NODE_ENV === 'development'

  const cspScriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'"  // mínimo; idealmente usar nonces

  // Reemplazar la línea del script-src por:
  cspScriptSrc,
  ```

---

## Positive Findings

ℹ️ **INFO — SSRF protection en `/api/download-image`**
- Allowlist via regex `/^https:\/\/[a-z0-9-]+\.supabase\.co\//` previene Server-Side Request Forgery. ✅

ℹ️ **INFO — Rutas internas protegidas por `INTERNAL_API_SECRET`**
- `/api/infographics/generate`, `/api/brand/generate-image`, `/api/projects/archive` verifican el header `x-internal-secret` antes de procesar. ✅

ℹ️ **INFO — Todas las Server Actions verifican autenticación**
- Todas las acciones llaman a `supabase.auth.getUser()` y retornan error si no hay usuario. ✅

ℹ️ **INFO — Rutas admin verifican rol de usuario**
- `getStorageStats`, `getStorageDashboard`, `permanentlyDeleteProject`, `getUsageLogs`, `getModelRatings`, `getOpenRouterBalance` verifican `profile.role === 'admin'`. ✅

---

## Remediation Plan

| # | Severidad | Finding                                    | Archivo                                          | Esfuerzo | Acción |
|---|-----------|--------------------------------------------|--------------------------------------------------|----------|--------|
| 1 | 🔴 HIGH   | Credenciales hardcodeadas en seed route    | `src/app/api/dev/seed/route.ts:10-11`            | 15 min   | Mover a env vars, eliminar GET que devuelve password |
| 2 | 🔴 HIGH   | Auth Server Actions sin Zod                | `src/actions/auth.ts:7-105`                      | 30 min   | Agregar LoginSchema, SignupSchema, UpdatePasswordSchema, UpdateProfileSchema |
| 3 | 🔴 HIGH   | `createUser` sin Zod                       | `src/actions/admin-users.ts:51-83`               | 15 min   | Agregar CreateUserSchema con validación de email y password |
| 4 | 🔴 HIGH   | Fallback silencioso service_role → anon    | `src/app/api/projects/archive/route.ts:16`       | 5 min    | Lanzar error si `SUPABASE_SERVICE_ROLE_KEY` no está definida |
| 5 | 🟡 MEDIUM | CSP con unsafe-eval en producción          | `next.config.ts:16`                              | 20 min   | CSP diferenciada por entorno, eliminar unsafe-eval en prod |
| 6 | 🟡 MEDIUM | Header injection en Content-Disposition    | `src/app/api/download-image/route.ts:31`         | 10 min   | Sanitizar `filename`: `filename.replace(/[^\w\s.-]/g, '_').slice(0, 100)` |
| 7 | 🟡 MEDIUM | RLS no auditable (sin directorio supabase) | Supabase Dashboard                               | 60 min   | Verificar manualmente RLS en todas las tablas con datos de usuario |
| 8 | ⚪ LOW    | No existe package-lock.json               | `.gitignore:6`                                   | 10 min   | Quitar de .gitignore, generar y commitear |

---

**RESULTADO: DEPLOY BLOQUEADO 🚨**
4 findings de severidad HIGH deben resolverse (estimado total: ~65 minutos de trabajo) antes de autorizar el deploy a producción.
