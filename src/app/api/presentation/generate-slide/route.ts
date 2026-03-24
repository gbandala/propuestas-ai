import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateImage } from '@/lib/ai-client'
import { buildSlidePrompt, extractSlideData, parseBrand } from '@/features/technical-presentation/services/slide-prompt-builder'
import type { AiTaskType } from '@/types/database'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? 'propuestasai-internal'

interface GenerateSlideRequest {
  projectId: string
  slideNumber: number
  jobId: string
  comments?: string
}

const SLIDE_TASK_TYPE: Record<number, AiTaskType> = {
  1: 'slide_technical_1',
  2: 'slide_technical_2',
  3: 'slide_technical_3',
  4: 'slide_technical_4',
  5: 'slide_technical_5',
  6: 'slide_technical_6',
  7: 'slide_technical_7',
  8: 'slide_technical_8',
  9: 'slide_technical_9',
  10: 'slide_technical_10',
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: GenerateSlideRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { projectId, slideNumber, jobId, comments } = body

  if (slideNumber < 1 || slideNumber > 10) {
    return NextResponse.json({ error: 'slideNumber must be 1-10' }, { status: 400 })
  }

  const userToken = req.headers.get('x-user-token') ?? ''
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userToken}` } } }
  )

  try {
    await supabase
      .from('generation_jobs')
      .update({ status: 'running', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Cargar datos del proyecto
    const [projectResult, briefResult, brandResult, infographicsResult] = await Promise.all([
      supabase.from('projects').select('name, client_name, user_id').eq('id', projectId).single(),
      supabase.from('technical_briefs').select('step_data').eq('project_id', projectId).single(),
      supabase.from('brand_identity').select('markdown_content').eq('project_id', projectId).maybeSingle(),
      supabase.from('infographics').select('url, selected').eq('project_id', projectId).eq('type', 'technical').order('selected', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (!projectResult.data) throw new Error('Proyecto no encontrado')

    const stepData = (briefResult.data?.step_data ?? {}) as Record<string, unknown>
    const brandMarkdown = brandResult.data?.markdown_content ?? ''
    const brand = parseBrand(brandMarkdown)
    const slideData = extractSlideData(stepData, projectResult.data.name, projectResult.data.client_name)
    slideData.infographicUrl = infographicsResult.data?.url ?? null

    await supabase
      .from('generation_jobs')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const prompt = buildSlidePrompt(slideNumber, slideData, brand, comments)

    const { buffer: imageBuffer, meta } = await generateImage(prompt)

    await supabase
      .from('generation_jobs')
      .update({ progress: 70, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Subir a Storage
    const filename = `projects/${projectId}/slides/technical/slide-${slideNumber}-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('project-assets')
      .upload(filename, imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage
      .from('project-assets')
      .getPublicUrl(filename)

    // Upsert en presentation_slides (reemplaza si el slide ya existe)
    const { error: upsertError } = await supabase
      .from('presentation_slides')
      .upsert({
        project_id: projectId,
        type: 'technical',
        slide_number: slideNumber,
        url: publicUrl,
        prompt_used: prompt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,type,slide_number' })

    if (upsertError) throw new Error(upsertError.message)

    // Log AI usage
    await supabase.from('ai_usage_logs').insert({
      project_id: projectId,
      user_id: projectResult.data.user_id,
      task_type: SLIDE_TASK_TYPE[slideNumber] ?? 'slide_technical_1',
      provider: meta.provider,
      model: meta.model,
      prompt_tokens: meta.promptTokens,
      completion_tokens: meta.completionTokens,
      total_tokens: meta.totalTokens,
      latency_ms: meta.latencyMs,
      is_revision: !!comments,
      revision_notes: comments ?? null,
    })

    await supabase
      .from('generation_jobs')
      .update({ status: 'completed', progress: 100, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`[generate-slide] slide ${slideNumber} job ${jobId}:`, errorMsg)

    await supabase
      .from('generation_jobs')
      .update({ status: 'failed', error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
