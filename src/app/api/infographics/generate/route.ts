import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { generateImage, fetchImageAsBase64 } from '@/lib/ai-client'

import { removeGrayBackground } from '@/lib/image-utils'
import type { ImageQuality } from '@/lib/ai-client'
import { buildTechnicalPrompt, buildProposalSlidePrompt } from '@/features/infographic-generation/services/prompt-builder'
import { DEFAULT_COLORS } from '@/shared/constants/brand'
import type { StepData } from '@/features/technical-brief/types'
import type { AiTaskType } from '@/types/database'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? 'propuestasai-internal'

interface TechnicalGenerateRequest {
  projectId: string
  variant: 1 | 2 | 3
  jobId: string
  slideNumber?: never
}

interface ProposalGenerateRequest {
  projectId: string
  slideNumber: number
  jobId: string
  variant?: never
}

type GenerateRequest = TechnicalGenerateRequest | ProposalGenerateRequest

const VARIANT_TASK_TYPE: Record<1 | 2 | 3, AiTaskType> = {
  1: 'infographic_v1',
  2: 'infographic_v2',
  3: 'infographic_v3',
}

/** Extrae el contenido de un slide específico del markdown de storyboard */
function extractSlideContent(markdown: string, slideNumber: number): { title: string; content: string } {
  // parts[0] = vacío, parts[1] = Encabezado, parts[2] = Slide 1, parts[3] = Slide 2...
  const parts = markdown.split(/^### /m)
  const part = parts[slideNumber + 1]
  if (!part) return { title: `Slide ${slideNumber}`, content: '' }
  const firstNewline = part.indexOf('\n')
  const title = part.slice(0, firstNewline).trim()
  const content = part.slice(firstNewline + 1).trim()
  return { title, content }
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

  const { projectId, jobId } = body
  const isProposalFlow = typeof body.slideNumber === 'number'

  const userToken = req.headers.get('x-user-token') ?? ''
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userToken}` } } }
  )

  const { data: project } = await supabase
    .from('projects')
    .select('user_id, image_quality')
    .eq('id', projectId)
    .single()

  const imageQuality: ImageQuality = (project?.image_quality ?? 'flash') as ImageQuality

  try {
    await supabase
      .from('generation_jobs')
      .update({ status: 'running', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    let prompt: string
    let taskType: AiTaskType
    let slideIndex: number | null = null
    let backgroundUrl: string | null = null
    let backgroundBase64: { data: string; mimeType: string } | null = null
    let logoUrl: string | null = null

    if (isProposalFlow) {
      // --- Flujo propuesta: N slides desde storyboard ---
      const slideNumber = body.slideNumber as number

      const [storyboardResult, brandResult] = await Promise.all([
        supabase
          .from('storyboards')
          .select('content_md')
          .eq('project_id', projectId)
          .eq('type', 'infographic')
          .not('approved_at', 'is', null)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('brand_identity')
          .select('markdown_content, background_url, logo_url')
          .eq('project_id', projectId)
          .maybeSingle(),
      ])

      const { title, content } = extractSlideContent(
        storyboardResult.data?.content_md ?? '',
        slideNumber
      )
      const brandMarkdown = brandResult.data?.markdown_content ?? ''
      const rawBackgroundUrl = brandResult.data?.background_url ?? null
      logoUrl = brandResult.data?.logo_url ?? null

      // Pre-fetch background to verify it's accessible and avoid double-fetch later
      if (rawBackgroundUrl) {
        backgroundBase64 = await fetchImageAsBase64(rawBackgroundUrl)
        if (!backgroundBase64) {
          console.warn(`[generate] Background URL inaccessible for project ${projectId}, slide ${slideNumber} — generating without background`)
        }
      }

      // Only reference background in prompt if the image is actually available
      backgroundUrl = backgroundBase64 ? rawBackgroundUrl : null

      prompt = buildProposalSlidePrompt(slideNumber, title, content, brandMarkdown, logoUrl, backgroundUrl)
      taskType = `infographic_slide_${Math.min(slideNumber, 10) as 1}` as AiTaskType
      slideIndex = slideNumber
    } else {
      // --- Flujo técnico legacy: 3 variantes fijas ---
      const variant = body.variant as 1 | 2 | 3

      const { data: brief } = await supabase
        .from('technical_briefs')
        .select('step_data')
        .eq('project_id', projectId)
        .single()

      const stepData = (brief?.step_data ?? {}) as StepData
      prompt = buildTechnicalPrompt(variant, stepData, DEFAULT_COLORS)
      taskType = VARIANT_TASK_TYPE[variant]
    }

    await supabase
      .from('generation_jobs')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const { buffer: rawImageBuffer, meta } = await generateImage(
      prompt,
      isProposalFlow
        ? { backgroundImageBase64: backgroundBase64, quality: imageQuality }
        : { quality: imageQuality }
    )

    // Composite logo bottom-right — evita colisión con títulos que suelen estar arriba
    let imageBuffer = rawImageBuffer
    if (isProposalFlow && logoUrl) {
      try {
        const logoFetched = await fetchImageAsBase64(logoUrl)
        if (logoFetched) {
          const logoData = Buffer.from(logoFetched.data, 'base64')
          const logoClean = await removeGrayBackground(logoData)
          const logoResized = await sharp(logoClean)
            .resize(160, 90, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer()
          const logoMeta = await sharp(logoResized).metadata()
          const mainMeta = await sharp(rawImageBuffer).metadata()
          const logoW = logoMeta.width ?? 160
          const logoH = logoMeta.height ?? 90
          const mainW = mainMeta.width ?? 1280
          const mainH = mainMeta.height ?? 960
          const left = mainW - logoW - 24
          const top = mainH - logoH - 24
          imageBuffer = await sharp(rawImageBuffer)
            .composite([{ input: logoResized, top, left, blend: 'over' }])
            .png()
            .toBuffer()
        }
      } catch (err) {
        console.warn('[generate] Logo compositing failed, uploading without logo:', err)
      }
    }

    await supabase
      .from('generation_jobs')
      .update({ progress: 70, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Borrar archivo anterior del bucket antes de subir el nuevo (evita archivos huérfanos)
    if (isProposalFlow) {
      const { data: existing } = await supabase
        .from('infographics')
        .select('url')
        .eq('project_id', projectId)
        .eq('slide_index', slideIndex)
        .maybeSingle()
      if (existing?.url) {
        try {
          const urlObj = new URL(existing.url)
          // El path en storage viene después de /object/public/project-assets/
          const match = urlObj.pathname.match(/\/object\/public\/project-assets\/(.+)/)
          if (match?.[1]) {
            await supabase.storage.from('project-assets').remove([decodeURIComponent(match[1])])
          }
        } catch {
          // No bloqueante — si falla la limpieza se sigue con la subida
        }
      }
    }

    // Subir imagen a Storage
    const fileKey = isProposalFlow
      ? `projects/${projectId}/infographics/slide-${slideIndex}-${Date.now()}.png`
      : `projects/${projectId}/infographics/variant-${body.variant}-${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('project-assets')
      .upload(fileKey, imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage
      .from('project-assets')
      .getPublicUrl(fileKey)

    // Guardar infographic
    if (isProposalFlow) {
      // Eliminar infographic anterior del mismo slide si existe
      await supabase
        .from('infographics')
        .delete()
        .eq('project_id', projectId)
        .eq('slide_index', slideIndex)

      await supabase.from('infographics').insert({
        project_id: projectId,
        type: 'technical' as const,  // mantener constraint existente
        variant: slideIndex!,
        slide_index: slideIndex,
        url: publicUrl,
        prompt_used: prompt,
        selected: false,
      })
    } else {
      await supabase.from('infographics').insert({
        project_id: projectId,
        type: 'technical' as const,
        variant: body.variant as number,
        url: publicUrl,
        prompt_used: prompt,
        selected: false,
      })
    }

    // Log de uso AI
    await supabase.from('ai_usage_logs').insert({
      project_id: projectId,
      user_id: project?.user_id ?? null,
      task_type: taskType,
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
    const identifier = isProposalFlow ? `slide ${body.slideNumber}` : `variant ${body.variant}`
    console.error(`[generate-infographic] ${identifier} job ${jobId}:`, errorMsg)

    await supabase
      .from('generation_jobs')
      .update({ status: 'failed', error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
