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

  // Leer brief libre y brand identity
  const [briefResult, brandResult] = await Promise.all([
    supabase
      .from('briefs')
      .select('content')
      .eq('project_id', projectId)
      .maybeSingle(),
    supabase
      .from('brand_identity')
      .select('markdown_content')
      .eq('project_id', projectId)
      .maybeSingle(),
  ])

  if (!briefResult.data) {
    return { error: 'El brief no existe. Completa el brief del proyecto primero.' }
  }

  const briefContent = briefResult.data.content
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
    const result = await generateStoryboardWithAI(type, briefContent, brandMarkdown, comments, nextVersion)
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
  briefContent: string,
  brandMarkdown: string,
  comments: string | undefined,
  version: number
): Promise<import('@/lib/ai-client').AiTextResult> {
  const systemPrompt = buildSystemPrompt(type)
  const userPrompt = buildUserPrompt(briefContent, brandMarkdown, comments, version)
  return generateText(systemPrompt, userPrompt)
}

function buildSystemPrompt(type: StoryboardType): string {
  const date = new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })

  if (type === 'infographic') {
    return `Eres un arquitecto de software senior y comunicador visual experto en propuestas de software.
Tu tarea es generar el STORYBOARD DE LA PROPUESTA en formato Markdown.

El storyboard describe con precisión los slides que se convertirán en imágenes para un PPT.
Arrancar con 7 slides obligatorios. Si el brief tiene información suficiente para slides adicionales (máx 10), agrégalos.

Hoy es ${date}. Responde SOLO con el storyboard en Markdown, sin texto adicional antes ni después.

SLIDES OBLIGATORIOS (7):
1. Resumen ejecutivo con ROI
2. Entendimiento del problema
3. Flujo de la solución técnica
4. Arquitectura
5. Entregables
6. Roadmap de ejecución
7. Modelo de inversión

Formato requerido — usa EXACTAMENTE esta estructura (un bloque ### por slide):

### Encabezado
(nombre del proyecto, cliente, versión, fecha)

### Slide 1 — Resumen Ejecutivo con ROI
- **Objetivo:** (qué debe comunicar este slide)
- **Layout:** (descripción del layout visual — ej: portada con métricas destacadas)
- **Elementos visuales:** (qué aparece, dónde, con qué datos reales del brief)
- **Texto en imagen:** (títulos, subtítulos, métricas clave — solo texto corto)
- **Paleta:** (colores hex del brief de marca)

### Slide 2 — Entendimiento del Problema
(misma estructura)

... (continuar hasta Slide 7, agregar Slide 8-10 solo si hay información suficiente)

REGLAS:
- Usa exactamente ### (tres #) para cada slide. NUNCA uses ####.
- Usa datos REALES del brief. No uses placeholders genéricos.
- El Slide 1 (ROI) debe incluir métricas concretas: tiempo ahorrado, costo, automatización.
- El Slide 4 (Arquitectura) debe nombrar tecnologías específicas si las hay.
- El Slide 7 (Inversión) debe incluir los montos y momentos del brief.
Al final agrega: "*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*"`
  }

  // Prompts legacy (no se usan en el nuevo flujo)
  if (type === 'technical') {
    return `Eres un arquitecto de software senior experto en comunicación visual técnica.
Genera el STORYBOARD DE PRESENTACION TECNICA en Markdown (10 slides). Hoy es ${date}.
Responde SOLO con el storyboard. Al final agrega: "*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*"`
  }

  return `Eres un consultor comercial senior.
Genera un STORYBOARD COMERCIAL en Markdown (4 infografías ROI/roadmap + 10 slides). Hoy es ${date}.
Responde SOLO con el storyboard. Al final agrega: "*Para aprobar este storyboard o solicitar cambios, usa los botones en la interfaz.*"`
}

function buildUserPrompt(
  briefContent: string,
  brandMarkdown: string,
  comments: string | undefined,
  version: number
): string {
  const lines: string[] = []

  lines.push(`# BRIEF DEL PROYECTO`)
  lines.push(`Versión de storyboard: ${version}`)
  if (comments) lines.push(`Cambios solicitados: ${comments}`)
  lines.push('')
  lines.push(briefContent)
  lines.push('')

  if (brandMarkdown) {
    lines.push(`# IDENTIDAD DE MARCA`)
    lines.push(brandMarkdown)
    lines.push('')
  }

  lines.push(`Genera el STORYBOARD DE LA PROPUESTA usando todos los datos anteriores.`)

  return lines.join('\n')
}
