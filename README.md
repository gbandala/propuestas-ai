# PropuestasAI

Generador automatico de materiales de propuesta tecnica y comercial para consultoras de software y agencias de IA. Transforma un formulario de 8 pasos en infografias, presentaciones HTML y documentos listos para entregar al cliente — en menos de 30 minutos.

---

## El Problema

Las consultoras y agencias invierten entre **14 y 18 horas-hombre por cada propuesta comercial**:

- Arquitecto tecnico: 6 horas en analisis y brief tecnico en PPT
- Gestor comercial: 8 horas en infografias con identidad de marca y propuesta con tarifas
- Costo promedio: **$340 por propuesta** (sin contar costo de oportunidad)
- Dolor adicional: quitar marcas de agua de herramientas gratuitas, mantener coherencia de marca

**PropuestasAI reduce ese tiempo a menos de 30 minutos y el costo a menos de $10 en APIs.**

---

## Quienes lo usan

| Rol | Que hace en la app |
|-----|--------------------|
| **Arquitecto Tecnico** | Crea el proyecto, completa el brief tecnico de 8 pasos, genera infografias tecnicas y presentacion tecnica, descarga ZIP tecnico |
| **Gestor Comercial** | Accede al proyecto cuando la fase tecnica esta completa, completa la propuesta comercial, genera infografias de ROI y roadmap, descarga ZIP comercial |
| **Administrador** | Configura claves de API (OpenRouter), gestiona usuarios, tiene acceso total a ambas fases |

---

## Que produce

### Flujo Tecnico (Arquitecto)
1. Completa formulario de 8 pasos (datos del cliente, problema, ROI, funcionalidades, integraciones, presupuesto, stack tecnico, marca)
2. Sistema genera **brief-tecnico.md** automaticamente
3. IA genera **3 variantes de infografia tecnica** (Diagrama de Flujo / Arquitectura de Componentes / Timeline de Fases)
4. Arquitecto selecciona variante y aprueba
5. Sistema genera **presentacion-tecnica.html** (10 slides con brand identity)
6. Descarga **ZIP tecnico**: brief + infografias + presentacion

### Flujo Comercial (Gestor — solo si la fase tecnica esta completa)
7. Completa propuesta comercial: descripcion ejecutiva, tarifas por fase, roadmap
8. IA genera **4 variantes de infografia comercial** (2 ROI + 2 Roadmap)
9. Gestor selecciona variantes y aprueba
10. Sistema genera **presentacion-comercial.html** (10 slides ejecutivos)
11. Descarga **ZIP comercial** o **ZIP completo** con ambas carpetas

### Estructura del ZIP
```
proyecto-cliente/
├── tecnica/
│   ├── brief-tecnico.md
│   ├── infografia-flujo.png
│   ├── infografia-arquitectura.png
│   ├── infografia-timeline.png
│   └── presentacion-tecnica.html
└── comercial/
    ├── propuesta-comercial.md
    ├── infografia-roi-timeline.png
    ├── infografia-roi-comparativa.png
    ├── infografia-roadmap-horizontal.png
    ├── infografia-roadmap-gantt.png
    └── presentacion-comercial.html
```

---

## Requisitos para funcionar

### Variables de entorno (`.env.local`)

```bash
# Supabase (base de datos y autenticacion)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenRouter (generacion de infografias con IA)
OPENROUTER_API_KEY=sk-or-...

# URL del sitio (para OAuth redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Servicios externos necesarios

| Servicio | Para que se usa | Donde obtenerlo |
|----------|----------------|-----------------|
| **Supabase** | Base de datos, auth, storage y realtime | supabase.com |
| **OpenRouter** | Generacion de infografias con Gemini 2.0 Flash | openrouter.ai |
| **Google OAuth** (opcional) | Login con Google | Se configura en Supabase Dashboard |

---

## Como hacerlo funcionar

### 1. Clonar e instalar

```bash
git clone https://github.com/gbandala/propuestas-ai.git
cd propuestas-ai
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

### 3. Configurar Supabase

En tu proyecto de Supabase, ejecutar las migraciones de la carpeta `/supabase/migrations/` o crear las tablas manualmente segun `src/types/database.ts`.

Tablas requeridas: `profiles`, `projects`, `technical_briefs`, `brand_specs`, `infographics`, `presentations`, `commercial_proposals`, `generation_jobs`, `downloads`

### 4. Levantar en desarrollo

```bash
npm run dev
# Disponible en http://localhost:3000
```

### 5. Primer usuario

Al registrarte, tu cuenta se crea con rol `architect` por defecto. Para asignar rol `admin` o `commercial`, actualizar directamente en Supabase Dashboard → tabla `profiles` → columna `role`.

---

## Stack Tecnico

```yaml
Framework:  Next.js 16 (App Router) + TypeScript
Database:   Supabase (PostgreSQL + Auth + Storage + Realtime)
Estilos:    Tailwind CSS 3.4 + shadcn/ui
Estado:     Zustand
Validacion: Zod
IA:         OpenRouter → google/gemini-2.0-flash-exp
Realtime:   Supabase Realtime (progreso de generacion en vivo)
Deploy:     Vercel
```

---

## Deploy en Vercel

```bash
npm install -g vercel
vercel
```

Variables requeridas en Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `NEXT_PUBLIC_SITE_URL` (tu dominio de produccion)

Actualizar tambien en Supabase Dashboard → Authentication → URL Configuration → Site URL con tu dominio de produccion.

---

## Comandos de desarrollo

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run typecheck    # Verificar tipos TypeScript
npm run lint         # ESLint
```
