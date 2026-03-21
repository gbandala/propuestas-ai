'use server'

import { createClient } from '@/lib/supabase/server'
import type { StoryboardType } from '@/features/storyboard/types'

export async function getStoryboard(
  projectId: string,
  type: StoryboardType
): Promise<{ data: { id: string; content_md: string; version: number; approved_at: string | null } | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('storyboards')
    .select('id, content_md, version, approved_at')
    .eq('project_id', projectId)
    .eq('type', type)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data }
}

export async function generateStoryboard(
  projectId: string,
  type: StoryboardType,
  comments?: string
): Promise<{ data: { id: string; content_md: string; version: number } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Leer datos necesarios
  const [briefResult, brandResult] = await Promise.all([
    supabase
      .from('technical_briefs')
      .select('step_data')
      .eq('project_id', projectId)
      .maybeSingle(),
    supabase
      .from('brand_identity')
      .select('markdown_content')
      .eq('project_id', projectId)
      .maybeSingle(),
  ])

  if (!briefResult.data) return { error: 'El brief tecnico no existe. Completa el formulario primero.' }

  const stepData = briefResult.data.step_data as Record<string, unknown>
  const brandMarkdown = brandResult.data?.markdown_content ?? ''

  // Obtener version actual para incrementar
  const { data: existing } = await supabase
    .from('storyboards')
    .select('version')
    .eq('project_id', projectId)
    .eq('type', type)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (existing?.version ?? 0) + 1

  const content = buildStoryboardContent(type, stepData, brandMarkdown, comments, nextVersion)

  const { data, error } = await supabase
    .from('storyboards')
    .insert({
      project_id: projectId,
      type,
      content_md: content,
      version: nextVersion,
      approved_at: null,
    })
    .select('id, content_md, version')
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function approveStoryboard(
  storyboardId: string
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('storyboards')
    .update({ approved_at: new Date().toISOString() })
    .eq('id', storyboardId)
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { data }
}

// ---------------------------------------------------------------------------
// Builder del contenido del storyboard
// ---------------------------------------------------------------------------

function buildStoryboardContent(
  type: StoryboardType,
  stepData: Record<string, unknown>,
  brandMarkdown: string,
  comments: string | undefined,
  version: number
): string {
  const date = new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })
  const projectName = (stepData.step1 as Record<string, string> | undefined)?.project_name ?? 'Proyecto'
  const clientName = (stepData.step1 as Record<string, string> | undefined)?.client_name ?? 'Cliente'

  const commentsNote = comments
    ? `\n> **Cambios solicitados (v${version}):** ${comments}\n`
    : ''

  if (type === 'technical') {
    return buildTechnicalStoryboard(projectName, clientName, stepData, brandMarkdown, date, version, commentsNote)
  }
  return buildCommercialStoryboard(projectName, clientName, stepData, brandMarkdown, date, version, commentsNote)
}

function buildTechnicalStoryboard(
  projectName: string,
  clientName: string,
  stepData: Record<string, unknown>,
  brandMarkdown: string,
  date: string,
  version: number,
  commentsNote: string
): string {
  const primaryColor = extractColor(brandMarkdown, 'Primario') ?? '#2563EB'
  const accentColor = extractColor(brandMarkdown, 'Acento') ?? '#F59E0B'
  const bgColor = extractColor(brandMarkdown, 'Fondo') ?? '#F8FAFC'

  const step2 = stepData.step2 as Record<string, unknown> | undefined
  const step7 = stepData.step7 as Record<string, unknown> | undefined
  const step3 = stepData.step3 as Record<string, unknown> | undefined

  const problemSummary = (step2?.description as string) ?? 'Proceso manual con alta carga operativa'
  const stack = (step7?.stack as string) ?? 'Next.js + Supabase + OpenRouter'
  const kpiCurrent = (step3?.current_kpis as string) ?? 'Metricas actuales del cliente'
  const kpiTarget = (step3?.target_kpis as string) ?? 'Metricas objetivo post-implementacion'

  return `# Storyboard Tecnico — ${projectName} / ${clientName}
> Version ${version} | Generado: ${date}
> Estado: PENDIENTE DE APROBACION
${commentsNote}
---

## INFOGRAFIAS TECNICAS (3 variantes)

### Infografia 1 — Diagrama de Flujo de Datos
**Objetivo:** Mostrar como fluye la informacion entre los componentes del sistema
**Audiencia:** Arquitectos y CTOs del cliente
**Layout:** Horizontal LEFT→RIGHT, 4-5 bloques conectados con flechas
**Dimensiones:** 800×600px

**Paleta de colores:**
- Fondo: ${bgColor}
- Bloques principales: ${primaryColor}
- Flechas y conectores: ${accentColor}
- Texto en bloques: #FFFFFF

**Elementos visuales:**
- Bloque 1: "Usuario / Actor" — punto de entrada del proceso
- Bloque 2: "Frontend / App" — interfaz de interaccion
- Bloque 3: "Backend / API" — logica de negocio y procesamiento
- Bloque 4: "Base de Datos" — persistencia y consulta de datos
- Bloque 5 (si aplica): "Servicio Externo / IA" — integracion externa
- Flechas: etiquetas con el tipo de accion (solicitud, respuesta, evento)

**Texto en imagen:** Solo etiquetas cortas (max 4 palabras por elemento)
**Logo:** Esquina inferior derecha, 60px de alto

---

### Infografia 2 — Arquitectura de Componentes
**Objetivo:** Mostrar la arquitectura tecnica en capas del sistema propuesto
**Stack de referencia:** ${stack}
**Layout:** Vertical TOP→DOWN, 3 capas (Frontend / Backend / Datos)
**Dimensiones:** 800×600px

**Paleta de colores:**
- Fondo: ${bgColor}
- Capa Frontend: ${primaryColor} con opacidad 15%
- Capa Backend: ${primaryColor} con opacidad 30%
- Capa Datos: ${primaryColor} con opacidad 50%
- Bordes de componentes: ${primaryColor}

**Elementos visuales:**
- Capa 1 (Frontend): componentes de UI / Web / Mobile
- Capa 2 (Backend): APIs, servicios, integraciones
- Capa 3 (Datos): base de datos, storage, cache
- Conectores verticales entre capas con descripcion del protocolo

**Texto en imagen:** Nombre del componente + tecnologia (ej: "API Gateway / Next.js")
**Logo:** Esquina inferior derecha, 60px de alto

---

### Infografia 3 — Timeline de Fases
**Objetivo:** Mostrar el roadmap de implementacion de forma visual
**Layout:** Horizontal, 4 fases en linea de tiempo
**Dimensiones:** 800×600px

**Paleta de colores:**
- Linea de tiempo: ${accentColor}
- Puntos de fase: ${primaryColor}
- Fondo de etiquetas: ${bgColor}
- Texto: #0F172A

**Elementos visuales:**
- Fase 1: Discovery / Diseno — duracion y entregable clave
- Fase 2: Implementacion MVP — duracion y entregable clave
- Fase 3: Pruebas y Ajustes — duracion y entregable clave
- Fase 4: Lanzamiento y Soporte — duracion y entregable clave
- Linea de tiempo horizontal con hitos marcados

**Texto en imagen:** Nombre de fase + duracion (ej: "Diseno — 2 semanas")
**Logo:** Esquina inferior derecha, 60px de alto

---

## PRESENTACION TECNICA (10 slides)

### Slide 1 — Portada
**Tipo:** Cover
**Titulo:** "${projectName}"
**Subtitulo:** "Propuesta Tecnica para ${clientName}"
**Fecha:** ${date}
**Fondo:** Gradiente suave usando colores de marca
**Logo:** Centrado en la parte superior

### Slide 2 — El Problema
**Tipo:** Problema / Dolor
**Titulo:** "El Desafio Actual"
**Contenido:** 3 bullets con los puntos de dolor principales
**Dato de referencia:** ${problemSummary}
**Visual:** Icono de alerta o proceso roto

### Slide 3 — Nuestra Solucion
**Tipo:** Propuesta de valor
**Titulo:** "La Solucion Propuesta"
**Contenido:** Una oracion de valor + 3 beneficios clave medibles
**Visual:** Icono de check o flecha de transformacion

### Slide 4 — Arquitectura Tecnica
**Tipo:** Diagrama tecnico
**Titulo:** "Arquitectura de la Solucion"
**Contenido:** Referencia a Infografia 2 (arquitectura de componentes)
**Stack visible:** ${stack}

### Slide 5 — Funcionalidades MVP
**Tipo:** Tabla / Lista priorizada
**Titulo:** "Alcance del MVP"
**Contenido:** Funcionalidades Must/Should/Could en tabla simple
**Visual:** Tabla con 3 columnas y codigos de color por prioridad

### Slide 6 — Integraciones
**Tipo:** Diagrama de conectores
**Titulo:** "Integraciones y Sistemas"
**Contenido:** Sistemas externos conectados, APIs, fuentes de datos
**Visual:** Referencia a Infografia 1 (flujo de datos)

### Slide 7 — Plan de Implementacion
**Tipo:** Timeline visual
**Titulo:** "Roadmap de Implementacion"
**Contenido:** Referencia a Infografia 3 (timeline de fases)
**Duracion total:** estimada segun fases del brief

### Slide 8 — Inversion por Fase
**Tipo:** Tabla de presupuesto
**Titulo:** "Detalle de Inversion"
**Contenido:** Tabla con fases, recursos y costos
**Visual:** Tabla con totales y subtotales claros

### Slide 9 — ROI Esperado
**Tipo:** Metricas de retorno
**Titulo:** "Impacto Esperado"
**Actual:** ${kpiCurrent}
**Objetivo:** ${kpiTarget}
**Visual:** Comparativa antes/despues con flechas de mejora

### Slide 10 — Proximos Pasos
**Tipo:** CTA / Cierre
**Titulo:** "Como Avanzamos"
**Contenido:** 3 acciones concretas con responsable y fecha tentativa
**CTA:** Contacto del arquitecto responsable

---

*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*
`
}

function buildCommercialStoryboard(
  projectName: string,
  clientName: string,
  _stepData: Record<string, unknown>,
  brandMarkdown: string,
  date: string,
  version: number,
  commentsNote: string
): string {
  const primaryColor = extractColor(brandMarkdown, 'Primario') ?? '#2563EB'
  const accentColor = extractColor(brandMarkdown, 'Acento') ?? '#F59E0B'
  const bgColor = extractColor(brandMarkdown, 'Fondo') ?? '#F8FAFC'

  return `# Storyboard Comercial — ${projectName} / ${clientName}
> Version ${version} | Generado: ${date}
> Estado: PENDIENTE DE APROBACION
${commentsNote}
---

## INFOGRAFIAS COMERCIALES — ROI (2 variantes)

### Infografia ROI-A — Timeline de Retorno
**Objetivo:** Mostrar la curva de inversion vs retorno en el tiempo
**Layout:** Grafica de lineas con dos curvas (costo acumulado vs retorno acumulado)
**Dimensiones:** 800×600px

**Paleta de colores:**
- Fondo: ${bgColor}
- Curva de costo: #EF4444 (zona roja = inversion)
- Curva de retorno: #22C55E (zona verde = ganancia)
- Punto de equilibrio: ${accentColor} con etiqueta "Break-even"
- Eje X: meses / trimestres

**Elementos visuales:**
- Eje X: timeline (0 a 12 o 24 meses segun proyecto)
- Eje Y: valor en dolares o porcentaje
- Zona roja: periodo de inversion inicial
- Zona verde: periodo de retorno positivo
- Anotacion: punto de equilibrio y ROI final proyectado
**Logo:** Esquina inferior derecha, 60px de alto

---

### Infografia ROI-B — Comparativa Antes / Despues
**Objetivo:** Mostrar el contraste de metricas clave antes y despues de la solucion
**Layout:** Dos columnas side-by-side (ANTES en rojo / DESPUES en verde)
**Dimensiones:** 800×600px

**Paleta de colores:**
- Columna ANTES: fondo #FEF2F2, texto #DC2626
- Columna DESPUES: fondo #F0FDF4, texto #16A34A
- Titulos de columna: ${primaryColor}

**Elementos visuales:**
- 4-5 metricas comparadas en formato: icono + numero + etiqueta
- Flechas de mejora entre columnas indicando % de cambio
- Metrica de impacto principal destacada (mas grande)
**Logo:** Esquina inferior derecha, 60px de alto

---

## INFOGRAFIAS COMERCIALES — ROADMAP (2 variantes)

### Infografia Roadmap-A — Timeline Horizontal Ejecutivo
**Objetivo:** Mostrar las fases del proyecto de forma limpia para un publico no tecnico
**Layout:** Timeline horizontal con 4 puntos de fase, iconos grandes
**Dimensiones:** 800×600px

**Paleta de colores:**
- Linea de tiempo: ${primaryColor}
- Circulos de fase: alternar ${primaryColor} y ${accentColor}
- Etiquetas: sobre fondo ${bgColor}

**Elementos visuales:**
- 4 fases con icono representativo, nombre y duracion
- Sin detalles tecnicos — solo nombres ejecutivos (ej: "Inicio", "Construccion", "Pruebas", "Lanzamiento")
- Hito de entrega final resaltado
**Logo:** Esquina inferior derecha, 60px de alto

---

### Infografia Roadmap-B — Gantt Simplificado
**Objetivo:** Mostrar las actividades por fase con barras de duracion
**Layout:** Tabla Gantt con filas de actividad y columnas de tiempo (semanas/meses)
**Dimensiones:** 800×600px

**Paleta de colores:**
- Barras de actividad: ${primaryColor}
- Barras de hito: ${accentColor}
- Filas alternas: blanco y ${bgColor}
- Cabecera: ${primaryColor} con texto blanco

**Elementos visuales:**
- 8-12 actividades distribuidas en 4 fases
- Duracion de cada barra proporcional al tiempo
- Hitos marcados con diamante en ${accentColor}
**Logo:** Esquina inferior derecha, 60px de alto

---

## PRESENTACION COMERCIAL (10 slides)

### Slide 1 — Portada Ejecutiva
**Tipo:** Cover minimalista
**Titulo:** "Propuesta Comercial"
**Subtitulo:** "${clientName}"
**Fecha:** ${date}
**Fondo:** Color primario de marca con logo centrado

### Slide 2 — Resumen Ejecutivo
**Tipo:** Executive Summary
**Titulo:** "En Resumen"
**Contenido:** El problema en 2 oraciones + la solucion en 1 oracion + el ROI esperado
**Visual:** Ninguno — solo tipografia limpia

### Slide 3 — Propuesta de Valor
**Tipo:** Value proposition
**Titulo:** "Lo Que Lograras"
**Contenido:** 3 beneficios cuantificados con iconos grandes
**Visual:** 3 cards con icono + numero + descripcion breve

### Slide 4 — Nuestro Enfoque
**Tipo:** Metodologia
**Titulo:** "Como Lo Hacemos"
**Contenido:** 4 pasos del proceso (no tecnico — centrado en el cliente)
**Visual:** Iconos de proceso en horizontal

### Slide 5 — Entregables
**Tipo:** Lista de resultados
**Titulo:** "Que Recibiras"
**Contenido:** Lista de entregables por fase con checkmarks
**Visual:** Tabla simple con fase y entregable

### Slide 6 — Roadmap
**Tipo:** Visual de timeline
**Titulo:** "Plan de Trabajo"
**Contenido:** Referencia a Infografia Roadmap-A
**Duracion total:** resaltada

### Slide 7 — Inversion
**Tipo:** Tabla de costos
**Titulo:** "Inversion por Fase"
**Contenido:** Tabla con fases, descripcion y costo — con total destacado
**Visual:** Tabla con fila de total en color acento

### Slide 8 — Retorno Esperado
**Tipo:** ROI visual
**Titulo:** "Tu Retorno de Inversion"
**Contenido:** Referencia a Infografia ROI-A + metrica principal de ROI
**Visual:** Numero grande del ROI % con contexto temporal

### Slide 9 — Por Que Nosotros
**Tipo:** Diferenciadores
**Titulo:** "Por Que Elegirnos"
**Contenido:** 3-4 diferenciadores concretos (experiencia, casos de exito, metodologia)
**Visual:** Logos de clientes anteriores o iconos de logros

### Slide 10 — Siguiente Paso
**Tipo:** CTA de cierre
**Titulo:** "Como Avanzamos"
**Contenido:** Una accion clara con fecha limite sugerida + datos de contacto
**Visual:** Boton o destacado visual del CTA

---

*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*
`
}

function extractColor(brandMarkdown: string, colorName: string): string | null {
  const regex = new RegExp(`${colorName}:\\s*(#[0-9A-Fa-f]{6})`)
  const match = brandMarkdown.match(regex)
  return match ? match[1] : null
}
