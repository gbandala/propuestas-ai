import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/ai-client'
import { buildTechnicalPrompt } from '@/features/infographic-generation/services/prompt-builder'
import { DEFAULT_COLORS } from '@/shared/constants/brand'
import type { StepData } from '@/features/technical-brief/types'
import type { AiTaskType } from '@/types/database'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? 'propuestasai-internal'

interface GenerateRequest {
  projectId: string
  variant: 1 | 2 | 3
  jobId: string
}

const VARIANT_TASK_TYPE: Record<1 | 2 | 3, AiTaskType> = {
  1: 'infographic_v1',
  2: 'infographic_v2',
  3: 'infographic_v3',
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: GenerateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { projectId, variant, jobId } = body
  const supabase = await createClient()

  // Obtener user_id del proyecto para el log
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  try {
    await supabase
      .from('generation_jobs')
      .update({ status: 'running', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const { data: brief } = await supabase
      .from('technical_briefs')
      .select('step_data')
      .eq('project_id', projectId)
      .single()

    const stepData = (brief?.step_data ?? {}) as StepData
    const colors = DEFAULT_COLORS

    await supabase
      .from('generation_jobs')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const prompt = buildTechnicalPrompt(variant as 1 | 2 | 3, stepData, colors)

    // Generar imagen con metadata
    const { buffer: imageBuffer, meta } = await generateImage(prompt)

    await supabase
      .from('generation_jobs')
      .update({ progress: 70, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Subir a Supabase Storage
    const filename = `projects/${projectId}/infographics/variant-${variant}-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('project-assets')
      .upload(filename, imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage
      .from('project-assets')
      .getPublicUrl(filename)

    await supabase
      .from('infographics')
      .insert({
        project_id: projectId,
        type: 'technical',
        variant,
        url: publicUrl,
        prompt_used: prompt,
        selected: false,
      })

    // Guardar log de uso AI
    await supabase.from('ai_usage_logs').insert({
      project_id: projectId,
      user_id: project?.user_id ?? null,
      task_type: VARIANT_TASK_TYPE[variant as 1 | 2 | 3],
      provider: meta.provider,
      model: meta.model,
      prompt_tokens: meta.promptTokens,
      completion_tokens: meta.completionTokens,
      total_tokens: meta.totalTokens,
      latency_ms: meta.latencyMs,
      is_revision: false,
    })

    await supabase
      .from('generation_jobs')
      .update({ status: 'completed', progress: 100, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ success: true })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`[generate-infographic] variant ${variant} job ${jobId}:`, errorMsg)

    await supabase
      .from('generation_jobs')
      .update({ status: 'failed', error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
