import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateImage } from '@/lib/ai-client'
import type { ImageQuality } from '@/types/database'
import { buildLogoPrompt, buildBackgroundPrompt } from '@/features/brand-identity/services/brand-prompt-builder'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET
if (!INTERNAL_SECRET) throw new Error('INTERNAL_API_SECRET environment variable is required')

interface GenerateBrandImageRequest {
  projectId: string
  jobId: string
  imageType: 'logo' | 'background'
  variantIndex: 1 | 2 | 3
  prompt: string
  referenceBase64?: { data: string; mimeType: string } | null
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: GenerateBrandImageRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { projectId, jobId, imageType, variantIndex, prompt, referenceBase64 } = body

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

    // Fetch project + brand data for the prompt
    const [projectResult, brandResult] = await Promise.all([
      supabase.from('projects').select('name, user_id, image_quality').eq('id', projectId).single(),
      supabase.from('brand_identity').select('markdown_content').eq('project_id', projectId).maybeSingle(),
    ])

    const companyName = projectResult.data?.name ?? 'Company'
    const brandMarkdown = brandResult.data?.markdown_content ?? ''
    const imageQuality: ImageQuality = (projectResult.data?.image_quality ?? 'flash') as ImageQuality

    // Build the final prompt (variantIndex adds a subtle variation hint)
    const variationHint = variantIndex === 1 ? '' : variantIndex === 2 ? ' (variation: try a different icon style)' : ' (variation: bolder composition)'
    const fullPrompt = imageType === 'logo'
      ? buildLogoPrompt(companyName, prompt + variationHint, brandMarkdown, !!referenceBase64)
      : buildBackgroundPrompt(companyName, prompt + variationHint, brandMarkdown, !!referenceBase64)

    await supabase
      .from('generation_jobs')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const { buffer: imageBuffer, meta } = await generateImage(fullPrompt, {
      backgroundImageBase64: referenceBase64 ?? null,
      quality: imageQuality,
    })

    await supabase
      .from('generation_jobs')
      .update({ progress: 70, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Delete previous variant from bucket if it exists
    const variantsField = imageType === 'logo' ? 'logo_variants' : 'background_variants'
    const { data: brandRow } = await supabase
      .from('brand_identity')
      .select(variantsField)
      .eq('project_id', projectId)
      .maybeSingle()

    const existingVariants: Array<{ variantIndex: number; url: string | null; status?: string }> =
      (brandRow as Record<string, unknown> | null)?.[variantsField] as Array<{ variantIndex: number; url: string | null; status?: string }> ?? []
    const oldVariant = existingVariants.find((v) => v.variantIndex === variantIndex)
    if (oldVariant?.url) {
      try {
        const urlObj = new URL(oldVariant.url)
        const match = urlObj.pathname.match(/\/object\/public\/project-assets\/(.+)/)
        if (match?.[1]) {
          await supabase.storage.from('project-assets').remove([decodeURIComponent(match[1])])
        }
      } catch { /* non-blocking */ }
    }

    // Upload new image
    const fileKey = `projects/${projectId}/brand/generated/${imageType}-${variantIndex}-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('project-assets')
      .upload(fileKey, imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage.from('project-assets').getPublicUrl(fileKey)

    // Update brand_identity.logo_variants / background_variants
    const updatedVariants = existingVariants.filter((v) => v.variantIndex !== variantIndex)
    updatedVariants.push({ variantIndex, url: publicUrl, status: 'completed' })

    await supabase
      .from('brand_identity')
      .update({ [variantsField]: updatedVariants, updated_at: new Date().toISOString() })
      .eq('project_id', projectId)

    // Log AI usage
    await supabase.from('ai_usage_logs').insert({
      project_id: projectId,
      user_id: projectResult.data?.user_id ?? null,
      task_type: `brand_${imageType}_v${variantIndex}` as 'infographic_v1',
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

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`[brand/generate-image] ${imageType} v${variantIndex} job ${jobId}:`, errorMsg)

    await supabase
      .from('generation_jobs')
      .update({ status: 'failed', error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
