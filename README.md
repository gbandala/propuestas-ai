# PropuestasAI

Generador automatico de materiales de propuesta tecnica y comercial para consultoras de software y agencias de IA. Toma la informacion de un discovery previo y produce infografias, presentaciones y documentos listos para entregar al cliente — en menos de 30 minutos.

---

## El Problema

Las consultoras y agencias invierten entre **14 y 18 horas-hombre por cada propuesta comercial**:

- Arquitecto tecnico: 6 horas en estructurar el brief y crear diapositivas tecnicas
- Gestor comercial: 8 horas en infografias con identidad de marca y propuesta con tarifas
- Costo promedio: **$340 por propuesta** (sin contar costo de oportunidad)

**PropuestasAI reduce ese tiempo a menos de 30 minutos y el costo a menos de $10 en APIs.**

---

## Premisa importante

> El formulario de 5 pasos **NO genera el discovery** — lo captura.
>
> Se asume que el arquitecto ya realizo el proceso de discovery con el cliente (reuniones, analisis del problema, definicion de la solucion, estimacion de presupuesto). La app toma esa informacion elaborada y produce los materiales visuales con la identidad del cliente.

---

## Quienes lo usan

| Rol | Que hace en la app |
|-----|--------------------|
| **Arquitecto Tecnico** | Crea el proyecto, configura la identidad de marca, captura el discovery en el formulario de 5 pasos, revisa y aprueba el storyboard, genera infografias y presentacion tecnica |
| **Gestor Comercial** | Accede cuando la fase tecnica esta completa, completa la propuesta comercial, genera infografias y presentacion comercial |
| **Administrador** | Acceso total + bitacora de uso de IA en `/admin/ai-usage` |

---

## Flujo completo

```
Crear proyecto
      |
Configurar Brand Identity (editor Markdown con colores, tipografia, logo + fondo de slides)
      |
Brief del Proyecto — captura libre del discovery en Markdown
      |
Storyboard de Propuesta  <- IA genera 7 slides textuales, editar por seccion, aprobar
      |
Infografias de la Propuesta — 7 slides PNG async con IA
  - Logo composited automaticamente en esquina inferior-derecha via sharp
  - Fondo de marca como referencia visual para el modelo de imagen
  - Toggle de calidad: Flash / Pro / Flux por proyecto
      |
Descarga PPTX
      |
[PENDIENTE] Fase Comercial
```

---

## Capa de IA

### Cliente unificado — solo OpenRouter

Toda la generacion de imagenes y texto pasa por `src/lib/ai-client.ts` usando exclusivamente **OpenRouter**:

| Uso | Funcion | Modelo por defecto |
|-----|---------|-------------------|
| Imagenes Flash | `generateImage({ quality: 'flash' })` | `google/gemini-2.5-flash-image` |
| Imagenes Pro | `generateImage({ quality: 'pro' })` | `google/gemini-3.1-flash-image-preview` |
| Imagenes Flux | `generateImage({ quality: 'flux' })` | `black-forest-labs/flux.2-pro` |
| Texto (storyboards) | `generateText()` | `anthropic/claude-sonnet-4-6` |

Los modelos se configuran en `.env.local` — no requieren cambio de codigo al actualizarse.

### Toggle de calidad por proyecto

Cada proyecto tiene un selector ⚡ Flash / ✦ Pro / ✺ Flux que persiste en BD.
El modelo elegido se usa para todas las generaciones de ese proyecto.

### Bitacora de uso: `ai_usage_logs`

Cada llamada registra: `provider`, `model`, `task_type`, `tokens`, `latency_ms`, `is_revision`.
`is_revision: true` cuando el usuario pidio cambios — mide calidad del modelo.

### Dashboard admin: `/admin/ai-usage`

Solo visible para rol `admin`. Muestra:
- Balance OpenRouter en tiempo real (comprados / usados / restantes)
- Rating de modelos por tasa de revision (menor = mejor)
- Bitacora completa de generaciones con filtros por proyecto

---

## Variables de entorno (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenRouter (proveedor unico de IA)
OPENROUTER_API_KEY=sk-or-...

# Modelos de imagen (cambiar aqui sin tocar codigo)
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

> **Nota:** `GEMINI_API_KEY` ya no es necesario. La generacion de imagenes con Gemini directo requiere billing habilitado en Google Cloud (el free tier tiene quota = 0). Todo va por OpenRouter.

---

## Stack Tecnico

```yaml
Framework:   Next.js 16 (App Router) + React 19 + TypeScript
Database:    Supabase (PostgreSQL + Auth + Storage + Realtime)
Estilos:     Tailwind CSS 3.4
Estado:      Zustand
Validacion:  Zod
IA Imagenes: OpenRouter — Gemini Flash / Gemini Pro / Flux Pro (configurable via env)
IA Texto:    OpenRouter — claude-sonnet-4-6 (storyboards)
Compositing: sharp (logo bottom-right sobre cada slide generado)
Realtime:    Supabase Realtime (progreso de generacion)
Deploy:      Vercel
```

---

## Como instalarlo

```bash
git clone https://github.com/gbandala/propuestas-ai.git
cd propuestas-ai
npm install
cp .env.example .env.local   # editar con tus credenciales
npm run dev
# Disponible en http://localhost:3000
```

> **Configuración de base de datos:** Ver [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) para la guía completa de instalación: esquema SQL, storage, Google OAuth y creación del usuario admin.

---

## Gestión de usuarios

PropuestasAI usa un modelo de **acceso cerrado**: no hay registro público. Solo un administrador puede crear cuentas nuevas.

### Roles disponibles

| Rol | Acceso |
|-----|--------|
| `architect` | Crea y gestiona sus propios proyectos |
| `admin` | Acceso total + bitácora IA + gestión de usuarios |

### Cómo dar de alta un usuario (solo admin)

1. Iniciar sesión con cuenta admin
2. Ir a **Usuarios** (botón en el header superior)
3. Ingresar email y contraseña del nuevo usuario → **+ Crear usuario**
4. La cuenta se crea confirmada — el usuario puede iniciar sesión de inmediato

El admin no puede eliminarse a sí mismo. Los usuarios con rol `admin` no tienen botón de eliminar.

### Credenciales del admin inicial

```
Email:    test@propuestasai.com
Password: Test1234!
```

> Para cambiar el rol de un usuario a `admin`: Supabase Dashboard → Table Editor → `profiles` → columna `role`.

---

## Servicios externos

| Servicio | Para que | Donde obtenerlo |
|----------|----------|-----------------|
| **Supabase** | Base de datos, auth, storage, realtime | supabase.com |
| **OpenRouter** | Todos los modelos de IA (imagen + texto) | openrouter.ai |

---

## Deploy en Vercel

```bash
vercel
```

Variables requeridas en Vercel:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`OPENROUTER_API_KEY`, `IMAGE_MODEL_FLASH`, `IMAGE_MODEL_PRO`, `IMAGE_MODEL_FLUX`,
`TEXT_MODEL`, `NEXT_PUBLIC_SITE_URL`, `INTERNAL_API_SECRET`

---

## Comandos de desarrollo

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run typecheck    # Verificar tipos TypeScript
npm run lint         # ESLint
```

---

## Escalabilidad y Gestion de Storage

### Limites por plan de Supabase

Cada propuesta genera archivos en el bucket `project-assets`:

| Recurso | Tamaño estimado | ×100 propuestas |
|---------|----------------|-----------------|
| Logo (PNG) | ~500 KB | 50 MB |
| Fondo (PNG) | ~1.5 MB | 150 MB |
| 7 slides generados (~1 MB c/u) | ~7 MB | ~700 MB |
| **Total por propuesta** | **~9 MB** | **~900 MB** |

| Plan Supabase | Storage | Precio | Propuestas activas |
|---------------|---------|--------|--------------------|
| Free | 1 GB | $0 | ~110 propuestas |
| Pro | 100 GB | $25/mes | ~11,000 propuestas |

### Regla de higiene: sin archivos huerfanos

Cada vez que se regenera un slide, el archivo anterior se **borra del bucket** antes de subir el nuevo.

### Gestion del ciclo de vida de propuestas

1. **Monitor de storage** — widget en `/admin` con MB usados / limite del plan / alerta al 80%
2. **Archivo de propuestas** — al archivar: ZIP (brief + storyboard + slides) y limpieza del bucket
3. **Limpieza automatica** — propuestas archivadas >90 dias marcadas para limpieza (admin aprueba)

---

## Estado actual (2026-03-30)

### Implementado

- [x] Auth completo con 3 roles (architect / commercial / admin)
- [x] Acceso cerrado: solo admin puede crear cuentas — no hay registro publico
- [x] Forzar cambio de contrasena en primer login (usuarios creados por admin)
- [x] Header global con email, badge de rol y acciones en todas las paginas
- [x] Gestion de usuarios `/admin/users`: crear, listar y eliminar (solo admin)
- [x] Projects CRUD + dashboard con seccion de proyectos archivados
- [x] Brand Identity: editor Markdown + upload logo/fondo con validacion de dimensiones
  - Logo composited programaticamente en bottom-right de cada slide (via sharp)
- [x] Brief del Proyecto — captura libre del discovery en Markdown
- [x] Storyboard de Propuesta — 7 slides, generacion IA (claude-sonnet), edicion, aprobacion iterativa
- [x] Infografias de la Propuesta — 7 slides PNG async con IA
  - Toggle Flash / Pro / Flux por proyecto (persiste en BD)
  - Polling setInterval(3s), lightbox fullscreen, regenerar individual con comentario
  - Borra archivo anterior del bucket al regenerar (sin archivos huerfanos)
- [x] Descarga PPTX directa desde `/infographics` — marca proyecto como Completado
- [x] Capa AI unificada: solo OpenRouter, modelos configurables en .env.local
- [x] Bitacora de uso `/admin/ai-usage`:
  - Balance OpenRouter, rating de modelos, logs completos
  - Badge de usuario por proyecto (quien trabaja que)
- [x] Widget creditos IA por proyecto: tokens + costo + contadores por tipo
- [x] Storage lifecycle completo:
  - Monitor en `/admin/ai-usage` con plan selector, barra de progreso y top 5 proyectos
  - Auto-limpieza: ZIP de proyectos completados >30 dias + limpieza del bucket
  - Dashboard `/admin/storage`: tabla con tamaño real en bucket por proyecto
  - Limpieza permanente de archivados >90 dias (solo admin, con confirmacion inline)

### Pendiente

- [ ] Fase Comercial completa
- [ ] ZIP generator manual (brief + infografias + PPTX a demanda)
- [ ] Historial de versiones de storyboard
