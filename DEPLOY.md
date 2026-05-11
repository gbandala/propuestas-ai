# Despliegue en VPS (Dockploy + Traefik)

## Cambios ya aplicados
- `output: 'standalone'` en `next.config.ts`
- `Dockerfile` multi-stage con build args para vars `NEXT_PUBLIC_*`
- `.dockerignore`

## Checklist antes del primer deploy

### 1. Supabase Dashboard → Auth → URL Configuration
- [ ] Site URL: `https://tu-dominio.com`
- [ ] Redirect URLs: agregar `https://tu-dominio.com/**`

### 2. Dockploy — Build Arguments
Se pasan al `docker build` (se hornean en el bundle):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `NEXT_PUBLIC_SITE_URL` | `https://tu-dominio.com` |

### 3. Dockploy — Environment Variables
Variables de runtime (nunca se incluyen en la imagen):

| Variable | Notas |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API |
| `OPENROUTER_API_KEY` | openrouter.ai/settings/keys |
| `INTERNAL_API_SECRET` | Generar: `openssl rand -base64 32` |
| `IMAGE_MODEL_FLASH` | Default: `google/gemini-2.0-flash-exp:free` |
| `IMAGE_MODEL_PRO` | Default: `google/gemini-2.0-flash-exp:free` |
| `IMAGE_MODEL_FLUX` | Default: `black-forest-labs/flux-1.1-pro` |
| `TEXT_MODEL` | Default: `anthropic/claude-sonnet-4-6` |

### 4. Dockploy — General
- [ ] Puerto interno: `3000`
- [ ] Build context: raíz del repo (donde está el `Dockerfile`)

## Migración futura a Postgres en VPS
Cuando se abandone Supabase, los cambios serán en:
- `src/lib/supabase/` — swapear clientes por `postgres.js` o `pg`
- `src/lib/supabase/proxy.ts` — reemplazar `updateSession` por middleware de auth propio
- Eliminar `@supabase/ssr` y `@supabase/supabase-js` del `package.json`
