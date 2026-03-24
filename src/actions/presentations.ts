'use server'

import { createClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/ai-client'
import { buildSystemPrompt, buildUserPrompt } from '@/features/technical-presentation/services/html-builder'
import type { PresentationType } from '@/types/database'

export async function getPresentation(
  projectId: string,
  type: PresentationType
): Promise<{ data: { id: string; html_content: string | null; slides_count: number } | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('presentations')
    .select('id, html_content, slides_count')
    .eq('project_id', projectId)
    .eq('type', type)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data }
}

export async function generatePresentation(
  projectId: string,
  refinementInstructions?: string
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Cargar todos los datos necesarios en paralelo
  const [projectResult, storyboardResult, brandResult, infographicsResult] = await Promise.all([
    supabase.from('projects').select('name, client_name').eq('id', projectId).single(),
    supabase
      .from('storyboards')
      .select('content_md, approved_at')
      .eq('project_id', projectId)
      .eq('type', 'technical')
      .not('approved_at', 'is', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('brand_identity').select('markdown_content').eq('project_id', projectId).maybeSingle(),
    supabase
      .from('infographics')
      .select('url, selected')
      .eq('project_id', projectId)
      .order('selected', { ascending: false }),
  ])

  if (projectResult.error) return { error: projectResult.error.message }
  if (!storyboardResult.data) {
    return { error: 'No hay storyboard técnico aprobado. Aprueba el storyboard antes de generar la presentación.' }
  }

  const project = projectResult.data
  const storyboardMd = storyboardResult.data.content_md
  const brandMarkdown = brandResult.data?.markdown_content ?? ''

  // Preferir la infografía seleccionada; si ninguna, tomar la primera disponible
  const infographics = infographicsResult.data ?? []
  const selected = infographics.find((i) => i.selected)
  const infographicUrl = selected?.url ?? infographics[0]?.url ?? null

  // Generar HTML con IA
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(project.name, project.client_name, storyboardMd, brandMarkdown, infographicUrl, refinementInstructions)

  let htmlContent: string
  let aiMeta: import('@/lib/ai-client').AiMeta | null = null

  try {
    const result = await generateText(systemPrompt, userPrompt)
    htmlContent = result.text
    aiMeta = result.meta
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando presentación con IA'
    console.error('[Presentations] generateText error:', msg)
    return { error: msg }
  }

  // Limpiar el HTML por si la IA devuelve markdown wrapping
  const cleaned = htmlContent
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  // Guardar o actualizar en Supabase
  const existing = await supabase
    .from('presentations')
    .select('id')
    .eq('project_id', projectId)
    .eq('type', 'technical')
    .maybeSingle()

  let savedId: string

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from('presentations')
      .update({ html_content: cleaned, slides_count: 10, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id)
      .select('id')
      .single()
    if (error) return { error: error.message }
    savedId = data.id
  } else {
    const { data, error } = await supabase
      .from('presentations')
      .insert({ project_id: projectId, type: 'technical', html_content: cleaned, slides_count: 10 })
      .select('id')
      .single()
    if (error) return { error: error.message }
    savedId = data.id
  }

  // Log AI usage
  if (aiMeta) {
    supabase.from('ai_usage_logs').insert({
      project_id: projectId,
      user_id: user.id,
      task_type: 'presentation_technical',
      provider: aiMeta.provider,
      model: aiMeta.model,
      prompt_tokens: aiMeta.promptTokens,
      completion_tokens: aiMeta.completionTokens,
      total_tokens: aiMeta.totalTokens,
      latency_ms: aiMeta.latencyMs,
      is_revision: !!refinementInstructions,
      revision_notes: refinementInstructions ?? null,
    }).then(({ error: logError }) => {
      if (logError) console.warn('[Presentations] ai_usage_logs error:', logError.message)
    })
  }

  return { data: { id: savedId } }
}
