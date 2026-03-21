# PropuestasAI

Generador automatico de materiales de propuesta tecnica y comercial para consultoras de software y agencias de IA. Toma la informacion de un discovery previo y produce infografias, presentaciones HTML y documentos listos para entregar al cliente — en menos de 30 minutos.

---

## El Problema

Las consultoras y agencias invierten entre **14 y 18 horas-hombre por cada propuesta comercial**:

- Arquitecto tecnico: 6 horas en estructurar el brief y crear diapositivas tecnicas
- Gestor comercial: 8 horas en infografias con identidad de marca y propuesta con tarifas
- Costo promedio: **$340 por propuesta** (sin contar costo de oportunidad)
- Dolor adicional: quitar marcas de agua de herramientas gratuitas, mantener coherencia de marca

**PropuestasAI reduce ese tiempo a menos de 30 minutos y el costo a menos de $10 en APIs.**

---

## Premisa importante

> El formulario de 8 pasos **NO genera el discovery** — lo captura.
>
> Se asume que el arquitecto ya realizo el proceso de discovery con el cliente (reuniones, analisis del problema, definicion de la solucion, estimacion de presupuesto). La app toma esa informacion elaborada y produce los materiales visuales con la identidad del cliente.

---

## Quienes lo usan

| Rol | Que hace en la app |
|-----|--------------------|
| **Arquitecto Tecnico** | Crea el proyecto, configura la identidad de marca, captura el discovery en el formulario de 8 pasos, revisa y aprueba el storyboard, genera infografias y presentacion tecnica |
| **Gestor Comercial** | Accede cuando la fase tecnica esta completa, completa la propuesta comercial, revisa y aprueba el storyboard comercial, genera infografias de ROI y roadmap, descarga entregables |
| **Administrador** | Configura claves de API, gestiona usuarios, acceso total a ambas fases |

---

## Flujo completo

```
Crear proyecto
      ↓
Configurar Brand Identity
(subir o editar plantilla Markdown con colores, tipografia, logo)
      ↓
Brief Tecnico — 8 pasos
(captura del discovery previo: problema, ROI, funcionalidades, stack, presupuesto)
      ↓
Storyboard Tecnico
(borrador textual de 3 infografias + 10 slides → revisar → iterar → aprobar)
      ↓
Generacion de Infografias Tecnicas (3 variantes con IA)
      ↓
Generacion de Presentacion Tecnica (10 slides HTML)
      ↓
Descarga ZIP Tecnico
      ↓
[Fase Comercial]
Propuesta Comercial (descripcion ejecutiva, tarifas, roadmap)
      ↓
Storyboard Comercial
(borrador textual de 4 infografias + 10 slides → revisar → iterar → aprobar)
      ↓
Generacion de Infografias Comerciales (2 ROI + 2 Roadmap)
      ↓
Generacion de Presentacion Comercial (10 slides HTML)
      ↓
Descarga ZIP Comercial o ZIP Completo
```

---

## Que produce

### Entregables del Arquitecto (Fase Tecnica)

| Archivo | Descripcion |
|---------|-------------|
| `brief-tecnico.md` | Documento tecnico completo generado del formulario |
| `storyboard-tecnico.md` | Descripcion textual aprobada de infografias y slides |
| `infografia-flujo.png` | Diagrama de flujo de datos (800x600) |
| `infografia-arquitectura.png` | Arquitectura de componentes estilo AWS/Azure (800x600) |
| `infografia-timeline.png` | Timeline tecnico de fases Gantt-style (800x600) |
| `presentacion-tecnica.html` | 10 slides interactivos con brand identity |

### Entregables del Gestor Comercial (Fase Comercial)

| Archivo | Descripcion |
|---------|-------------|
| `propuesta-comercial.md` | Documento comercial con tarifas y roadmap |
| `storyboard-comercial.md` | Descripcion textual aprobada de infografias y slides |
| `infografia-roi-timeline.png` | Curva de retorno en el tiempo (800x600) |
| `infografia-roi-comparativa.png` | Comparativa Antes/Despues de metricas (800x600) |
| `infografia-roadmap-horizontal.png` | Timeline horizontal de 4 fases ejecutivo (800x600) |
| `infografia-roadmap-gantt.png` | Gantt-style con actividades por fase (800x600) |
| `presentacion-comercial.html` | 10 slides ejecutivos con brand identity |

### Estructura del ZIP

```
proyecto-cliente/
├── brand-identity.md
├── proyecto-cliente.json
├── tecnica/
│   ├── brief-tecnico.md
│   ├── storyboard-tecnico.md
│   ├── infografia-flujo.png
│   ├── infografia-arquitectura.png
│   ├── infografia-timeline.png
│   └── presentacion-tecnica.html
└── comercial/
    ├── propuesta-comercial.md
    ├── storyboard-comercial.md
    ├── infografia-roi-timeline.png
    ├── infografia-roi-comparativa.png
    ├── infografia-roadmap-horizontal.png
    ├── infografia-roadmap-gantt.png
    └── presentacion-comercial.html
```

---

## Brand Identity en Markdown

Al crear un proyecto se precarga una plantilla base editable. El usuario puede personalizarla o subir su propio archivo `.md`:

```markdown
# Brand Identity — [Nombre del Proyecto]

## Colores
- Primario: #2563EB
- Secundario: #1E40AF
- Acento: #F59E0B
- Fondo: #F8FAFC
- Texto: #0F172A

## Tipografia
- Titulos: Inter Bold
- Cuerpo: Inter Regular
- Monospace: JetBrains Mono

## Tono Visual
- Estilo: Profesional, moderno, limpio
- Evitar: colores saturados, tipografias decorativas

## Logo
- URL: (pegar URL del logo)
- Posicion en materiales: esquina inferior derecha
```

Todos los materiales generados (infografias y slides) usan este documento como contexto de marca.

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
| **Google OAuth** (opcional) | Login con Google | Supabase Dashboard → Authentication → Providers |

---

## Como instalarlo

### 1. Clonar e instalar

```bash
git clone https://github.com/gbandala/propuestas-ai.git
cd propuestas-ai
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase y OpenRouter
```

### 3. Configurar Supabase

Ejecutar las migraciones en tu proyecto de Supabase. Tablas requeridas:
`profiles`, `projects`, `technical_briefs`, `brand_identity`, `storyboards`,
`infographics`, `presentations`, `commercial_proposals`, `generation_jobs`, `downloads`

### 4. Levantar en desarrollo

```bash
npm run dev
# Disponible en http://localhost:3000
```

### 5. Primer usuario

Al registrarte se asigna rol `architect` por defecto. Para cambiar a `admin` o `commercial`: Supabase Dashboard → tabla `profiles` → columna `role`.

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

Actualizar en Supabase Dashboard → Authentication → URL Configuration con tu dominio de produccion.

---

## Comandos de desarrollo

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run typecheck    # Verificar tipos TypeScript
npm run lint         # ESLint
```
