'use server'

import { createClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/ai-client'
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

  if (!briefResult.data) {
    return { error: 'El brief tecnico no existe. Completa el formulario primero.' }
  }

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

  // Generar contenido con IA
  let content: string
  let aiMeta: import('@/lib/ai-client').AiMeta | null = null
  try {
    const result = await generateStoryboardWithAI(type, stepData, brandMarkdown, comments, nextVersion)
    content = result.text
    aiMeta = result.meta
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando storyboard con IA'
    console.error('[Storyboard] generateStoryboardWithAI error:', msg)
    return { error: msg }
  }

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

  if (error) {
    console.error('[Storyboard] insert error:', error.message, { projectId, type })
    return { error: error.message }
  }

  // Guardar log de uso AI (no bloquea el flujo si falla)
  if (aiMeta) {
    const taskType = type === 'technical' ? 'storyboard_technical' : type === 'infographic' ? 'storyboard_infographic' : 'storyboard_commercial'
    supabase.from('ai_usage_logs').insert({
      project_id: projectId,
      user_id: user.id,
      task_type: taskType,
      provider: aiMeta.provider,
      model: aiMeta.model,
      prompt_tokens: aiMeta.promptTokens,
      completion_tokens: aiMeta.completionTokens,
      total_tokens: aiMeta.totalTokens,
      latency_ms: aiMeta.latencyMs,
      is_revision: !!comments,
      revision_notes: comments ?? null,
    }).then(({ error: logError }) => {
      if (logError) console.warn('[Storyboard] ai_usage_logs insert error:', logError.message)
    })
  }

  return { data }
}

export async function reopenStoryboard(
  storyboardId: string
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('storyboards')
    .update({ approved_at: null })
    .eq('id', storyboardId)
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateStoryboardContent(
  storyboardId: string,
  newContent: string
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('storyboards')
    .update({ content_md: newContent, approved_at: null })
    .eq('id', storyboardId)
    .select('id')
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
// Generación de storyboard con IA
// ---------------------------------------------------------------------------

async function generateStoryboardWithAI(
  type: StoryboardType,
  stepData: Record<string, unknown>,
  brandMarkdown: string,
  comments: string | undefined,
  version: number
): Promise<import('@/lib/ai-client').AiTextResult> {
  const systemPrompt = buildSystemPrompt(type)
  const userPrompt = buildUserPrompt(type, stepData, brandMarkdown, comments, version)
  return generateText(systemPrompt, userPrompt)
}

function buildSystemPrompt(type: StoryboardType): string {
  const date = new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })

  if (type === 'infographic') {
    return `Eres un arquitecto de software senior experto en comunicación visual técnica.
Tu tarea es generar el STORYBOARD DE INFOGRAFIAS TECNICAS en formato Markdown para una propuesta de software.

Describe con precisión SOLO las 3 infografías técnicas (NO slides de presentación).
Para cada infografía especifica: objetivo, audiencia, layout, paleta de colores con hex exactos, elementos visuales y texto en imagen.

Hoy es ${date}. Responde SOLO con el storyboard en Markdown, sin explicaciones previas ni texto adicional.

Formato requerido — usa EXACTAMENTE esta estructura de headers:

### Encabezado
(nombre del proyecto, version, estado, fecha)

### Infografia 1 — [titulo descriptivo]
- **Objetivo:** ...
- **Audiencia:** ...
- **Layout:** ...
- **Dimensiones:** 1024x768px
- **Paleta:** (hex exactos del brief)
- **Elementos visuales:** (que aparece y donde)
- **Texto en imagen:** (solo etiquetas cortas)

### Infografia 2 — [titulo descriptivo]
(misma estructura)

### Infografia 3 — [titulo descriptivo]
(misma estructura)

IMPORTANTE: Usa exactamente tres signos # (###) para cada infografia, NO uses cuatro # (####).
Infografia 1 debe ser el flujo de datos o proceso principal.
Infografia 2 debe ser la arquitectura tecnica o stack de componentes.
Infografia 3 debe ser el timeline de implementacion o entregables.

Usa información REAL del brief técnico proporcionado. No uses placeholders genéricos.
Al final agrega: "*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*"`
  }

  if (type === 'technical') {
    return `Eres un arquitecto de software senior experto en comunicación visual técnica.
Tu tarea es generar el STORYBOARD DE PRESENTACION TECNICA en formato Markdown para una propuesta de software.

Describe con precisión SOLO los 10 slides de presentación (NO infografías — esas ya están en una etapa anterior).
Para cada slide especifica: tipo, título, contenido concreto y descripción visual.

Hoy es ${date}. Responde SOLO con el storyboard en Markdown, sin explicaciones previas ni texto adicional.

Formato requerido:
- Encabezado con nombre del proyecto, versión y estado
- Sección "PRESENTACION TECNICA (10 slides)" con Slide 1 al 10:
  - Slide 1: Portada
  - Slide 2: El Problema
  - Slide 3: Objetivo y Alcance
  - Slide 4: Solucion Tecnica
  - Slide 5: Arquitectura y Stack
  - Slide 6: Infografia Tecnica (referencia a imagen generada)
  - Slide 7: Decisiones de Arquitectura
  - Slide 8: Entregables
  - Slide 9: Criterios de Exito
  - Slide 10: Proximos Pasos
- Cada slide debe tener: Tipo, Titulo, Contenido (bullets concretos extraidos del brief), Visual (descripcion del layout y elementos visuales CSS — sin emojis)

Usa información REAL del brief técnico proporcionado. No uses placeholders genéricos.
Al final agrega: "*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*"`
  }

  return `Eres un consultor comercial senior experto en propuestas de valor y comunicación ejecutiva.
Tu tarea es generar un STORYBOARD COMERCIAL detallado en formato Markdown para propuestas de software.

El storyboard describe con precisión 4 infografías de ROI/roadmap y 10 slides de presentación ejecutiva.
Para cada elemento debes especificar: objetivo, audiencia, layout, paleta de colores, elementos visuales y datos concretos.

Hoy es ${date}. Responde SOLO con el storyboard en Markdown, sin explicaciones previas ni texto adicional.

Formato requerido:
- Encabezado con nombre del proyecto, versión y estado
- Sección "INFOGRAFIAS COMERCIALES — ROI (2 variantes)" con ROI-A y ROI-B
- Sección "INFOGRAFIAS COMERCIALES — ROADMAP (2 variantes)" con Roadmap-A y Roadmap-B
- Sección "PRESENTACION COMERCIAL (10 slides)" con Slide 1 al 10
- Cada infografía debe tener: Objetivo, Layout, Dimensiones, Paleta de colores (con hex), Elementos visuales con datos reales del proyecto
- Cada slide debe tener: Tipo, Titulo, Contenido con métricas/beneficios reales del proyecto, Visual

Usa información REAL del brief proporcionado. Los números, beneficios y métricas deben ser específicos al proyecto.
Al final del documento agrega una línea: "*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*"`
}

function buildUserPrompt(
  type: StoryboardType,
  stepData: Record<string, unknown>,
  brandMarkdown: string,
  comments: string | undefined,
  version: number
): string {
  const step1 = stepData.step1 as Record<string, string> | undefined
  const step2 = stepData.step2 as Record<string, string> | undefined
  const step3 = stepData.step3 as Record<string, string> | undefined
  const step4 = stepData.step4 as Record<string, string> | undefined
  const step5 = stepData.step5 as Record<string, unknown> | undefined

  const projectName = step1?.projectName ?? step1?.project_name ?? 'Proyecto'
  const clientCompany = step1?.clientCompany ?? step1?.client_name ?? 'Cliente'
  const architectName = step1?.architectName ?? '—'
  const date = step1?.date ? new Date(step1.date).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX')

  const lines: string[] = []
  lines.push(`# DATOS DEL PROYECTO`)
  lines.push(`- Nombre: ${projectName}`)
  lines.push(`- Cliente: ${clientCompany}`)
  lines.push(`- Arquitecto: ${architectName}`)
  lines.push(`- Fecha: ${date}`)
  lines.push(`- Version storyboard: ${version}`)
  if (comments) lines.push(`- Cambios solicitados: ${comments}`)
  lines.push('')

  if (step2) {
    lines.push(`# CONTEXTO DEL PROBLEMA`)
    if (step2.problem) lines.push(`- Problema: ${step2.problem}`)
    if (step2.objective) lines.push(`- Objetivo: ${step2.objective}`)
    if (step2.inputs) lines.push(`- Insumos: ${step2.inputs}`)
    if (step2.expectedOutput) lines.push(`- Resultado esperado: ${step2.expectedOutput}`)
    // compatibilidad con campos legacy
    if (step2.description) lines.push(`- Descripcion: ${step2.description}`)
    lines.push('')
  }

  if (step3) {
    lines.push(`# SOLUCION TECNICA`)
    if (step3.whatItDoes) lines.push(`- Que hace: ${step3.whatItDoes}`)
    if (step3.requirements) lines.push(`- Que necesita: ${step3.requirements}`)
    if (step3.outputs) lines.push(`- Que produce: ${step3.outputs}`)
    if (step3.howToTest) lines.push(`- Como probar: ${step3.howToTest}`)
    if (step3.failureHandling) lines.push(`- En caso de falla: ${step3.failureHandling}`)
    if (step3.validCases) lines.push(`- Casos validos: ${step3.validCases}`)
    // compatibilidad con campos legacy
    if (step3.current_kpis) lines.push(`- KPIs actuales: ${step3.current_kpis}`)
    if (step3.target_kpis) lines.push(`- KPIs objetivo: ${step3.target_kpis}`)
    lines.push('')
  }

  if (step4) {
    lines.push(`# DECISIONES DE ARQUITECTURA`)
    if (step4.architectureDecisions) lines.push(`- Decisiones: ${step4.architectureDecisions}`)
    if (step4.selfServiceConfig) lines.push(`- Config self-service: ${step4.selfServiceConfig}`)
    if (step4.whenToEscalate) lines.push(`- Cuando escalar: ${step4.whenToEscalate}`)
    // compatibilidad con campos legacy
    if (step4.stack) lines.push(`- Stack tecnologico: ${step4.stack}`)
    lines.push('')
  }

  if (step5) {
    lines.push(`# ENTREGABLES`)
    const deliverables = step5.deliverables as Array<{ name: string; format: string; acceptanceCriteria: string }> | undefined
    if (deliverables && deliverables.length > 0) {
      deliverables.forEach((d, i) => {
        lines.push(`- Entregable ${i + 1}: ${d.name} (${d.format}) — Criterio: ${d.acceptanceCriteria}`)
      })
    }
    if (typeof step5.finalAcceptanceCriteria === 'string') {
      lines.push(`- Criterio final: ${step5.finalAcceptanceCriteria}`)
    }
    lines.push('')
  }

  if (brandMarkdown) {
    lines.push(`# IDENTIDAD DE MARCA`)
    lines.push(brandMarkdown)
    lines.push('')
  }

  if (type === 'infographic') {
    lines.push(`Genera el STORYBOARD DE INFOGRAFIAS TECNICAS (solo las 3 infografias) usando todos los datos anteriores.`)
  } else if (type === 'technical') {
    lines.push(`Genera el STORYBOARD DE PRESENTACION TECNICA (solo los 10 slides) usando todos los datos anteriores.`)
  } else {
    lines.push(`Genera el STORYBOARD COMERCIAL completo (4 infografias ROI/roadmap + 10 slides ejecutivos) usando todos los datos anteriores.`)
  }

  return lines.join('\n')
}
