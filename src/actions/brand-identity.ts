'use server'

import { createClient } from '@/lib/supabase/server'
import { BRAND_IDENTITY_TEMPLATE } from '@/features/brand-identity/types'
import { removeGrayBackground } from '@/lib/image-utils'
import { checkGenerationRateLimit } from '@/lib/rate-limit'

export interface BrandVariant {
  variantIndex: 1 | 2 | 3
  url: string | null
  status: 'completed' | 'failed'
}

export async function getBrandIdentity(
  projectId: string
): Promise<{ data: { id: string; markdown_content: string; logo_url: string | null; background_url: string | null; logo_variants: BrandVariant[]; background_variants: BrandVariant[] } | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('brand_identity')
    .select('id, markdown_content, logo_url, background_url, logo_variants, background_variants')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data: data ? {
    ...data,
    logo_variants: (data.logo_variants ?? []) as BrandVariant[],
    background_variants: (data.background_variants ?? []) as BrandVariant[],
  } : null }
}

export async function createBrandGenerationJobs(
  projectId: string,
  imageType: 'logo' | 'background'
): Promise<{ data: Array<{ jobId: string; variantIndex: 1 | 2 | 3 }> } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { allowed } = await checkGenerationRateLimit(supabase)
  if (!allowed) return { error: 'Límite de generaciones alcanzado (30/hora). Intenta más tarde.' }

  const taskType = `brand_${imageType}` as 'infographic_v1'
  const jobs = await Promise.all(
    ([1, 2, 3] as const).map((variantIndex) =>
      supabase.from('generation_jobs').insert({
        project_id: projectId,
        type: taskType,
        status: 'pending',
        progress: 0,
        slide_number: variantIndex,
      }).select('id').single()
    )
  )

  const errors = jobs.filter((j) => j.error)
  if (errors.length) return { error: errors[0].error?.message ?? 'Error al crear jobs' }

  return {
    data: jobs.map((j, i) => ({
      jobId: j.data!.id,
      variantIndex: (i + 1) as 1 | 2 | 3,
    })),
  }
}

export async function getBrandJobStatuses(
  jobIds: string[]
): Promise<{ data: Array<{ id: string; status: string; progress: number; error: string | null }> } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('generation_jobs')
    .select('id, status, progress, error')
    .in('id', jobIds)

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

export async function getBrandVariants(
  projectId: string,
  imageType: 'logo' | 'background'
): Promise<{ data: BrandVariant[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const field = imageType === 'logo' ? 'logo_variants' : 'background_variants'
  const { data, error } = await supabase
    .from('brand_identity')
    .select(field)
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data: ((data as Record<string, unknown> | null)?.[field] ?? []) as BrandVariant[] }
}

export async function selectBrandVariant(
  projectId: string,
  imageType: 'logo' | 'background',
  selectedUrl: string,
  allVariantUrls: string[]
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Delete the previous active image if it exists (and is different from selected)
  const { data: brand } = await supabase
    .from('brand_identity')
    .select('logo_url, background_url')
    .eq('project_id', projectId)
    .maybeSingle()

  const previousUrl = imageType === 'logo' ? brand?.logo_url : brand?.background_url
  if (previousUrl && previousUrl !== selectedUrl) {
    try {
      const urlObj = new URL(previousUrl)
      const match = urlObj.pathname.match(/\/object\/public\/project-assets\/(.+)/)
      if (match?.[1]) {
        await supabase.storage.from('project-assets').remove([decodeURIComponent(match[1])])
      }
    } catch { /* non-blocking */ }
  }

  // Delete the other 2 variant images from bucket
  for (const url of allVariantUrls) {
    if (url === selectedUrl) continue
    try {
      const urlObj = new URL(url)
      const match = urlObj.pathname.match(/\/object\/public\/project-assets\/(.+)/)
      if (match?.[1]) {
        await supabase.storage.from('project-assets').remove([decodeURIComponent(match[1])])
      }
    } catch { /* non-blocking */ }
  }

  // Set selected as active, clear variants
  const urlField = imageType === 'logo' ? 'logo_url' : 'background_url'
  const variantsField = imageType === 'logo' ? 'logo_variants' : 'background_variants'
  const { error } = await supabase
    .from('brand_identity')
    .update({
      [urlField]: selectedUrl,
      [variantsField]: [],
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function createSingleBrandJob(
  projectId: string,
  imageType: 'logo' | 'background',
  variantIndex: 1 | 2 | 3
): Promise<{ data: { jobId: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const taskType = `brand_${imageType}` as 'infographic_v1'
  const { data, error } = await supabase
    .from('generation_jobs')
    .insert({ project_id: projectId, type: taskType, status: 'pending', progress: 0, slide_number: variantIndex })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { data: { jobId: data.id } }
}

export async function getActiveBrandJobs(
  projectId: string,
  imageType: 'logo' | 'background'
): Promise<{ data: Array<{ id: string; variantIndex: 1 | 2 | 3; status: string; progress: number; error: string | null }> } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const taskType = `brand_${imageType}` as 'infographic_v1'
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('id, slide_number, status, progress, error')
    .eq('project_id', projectId)
    .eq('type', taskType)
    .in('status', ['pending', 'running'])
    .order('slide_number', { ascending: true })

  if (error) return { error: error.message }
  return {
    data: (data ?? []).map((j) => ({
      id: j.id,
      variantIndex: ((j.slide_number ?? 1) as 1 | 2 | 3),
      status: j.status,
      progress: j.progress,
      error: j.error,
    })),
  }
}

export async function discardBrandVariants(
  projectId: string,
  imageType: 'logo' | 'background'
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const variantsField = imageType === 'logo' ? 'logo_variants' : 'background_variants'
  const { data: brand } = await supabase
    .from('brand_identity')
    .select(variantsField)
    .eq('project_id', projectId)
    .maybeSingle()

  const variants: BrandVariant[] = ((brand as Record<string, unknown> | null)?.[variantsField] ?? []) as BrandVariant[]

  // Delete all variant files from bucket
  for (const v of variants) {
    if (!v.url) continue
    try {
      const urlObj = new URL(v.url)
      const match = urlObj.pathname.match(/\/object\/public\/project-assets\/(.+)/)
      if (match?.[1]) {
        await supabase.storage.from('project-assets').remove([decodeURIComponent(match[1])])
      }
    } catch { /* non-blocking */ }
  }

  const { error } = await supabase
    .from('brand_identity')
    .update({ [variantsField]: [], updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function saveBrandIdentity(
  projectId: string,
  markdownContent: string
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: existing } = await supabase
    .from('brand_identity')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('brand_identity')
      .update({ markdown_content: markdownContent, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error) return { error: error.message }
    return { data }
  }

  const { data, error } = await supabase
    .from('brand_identity')
    .insert({ project_id: projectId, markdown_content: markdownContent })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function initBrandIdentity(
  projectId: string
): Promise<{ data: { id: string } } | { error: string }> {
  return saveBrandIdentity(projectId, BRAND_IDENTITY_TEMPLATE)
}

export async function uploadBrandImage(
  projectId: string,
  formData: FormData,
  imageType: 'logo' | 'background',
  processTransparency?: boolean
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No se recibió el archivo' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const validExts = imageType === 'logo' ? ['png', 'svg', 'jpg', 'jpeg', 'webp'] : ['png', 'jpg', 'jpeg', 'webp']
  if (!validExts.includes(ext)) {
    return { error: `Formato no válido. Acepta: ${validExts.join(', ')}` }
  }

  const maxBytes = imageType === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024
  if (file.size > maxBytes) {
    return { error: `El archivo supera el límite de ${maxBytes / 1024 / 1024}MB` }
  }

  // Timestamp en filename → URL único en cada upload, evita caché del browser
  // Si se aplica corrección de transparencia, siempre guardamos como PNG
  const outputExt = (processTransparency && ext !== 'svg') ? 'png' : ext
  const filename = `projects/${projectId}/brand/${imageType}-${Date.now()}.${outputExt}`
  const rawBuffer = await file.arrayBuffer()
  // Aplicar corrección de fondo gris/checkerboard si el usuario lo indicó
  let buffer: ArrayBuffer | Buffer = rawBuffer
  if (processTransparency && ext !== 'svg') {
    try {
      buffer = await removeGrayBackground(Buffer.from(rawBuffer))
    } catch (err) {
      console.warn('[uploadBrandImage] removeGrayBackground failed, uploading original:', err)
      buffer = rawBuffer
    }
  }

  // Borrar archivo anterior del bucket antes de subir el nuevo
  const urlField = imageType === 'logo' ? 'logo_url' : 'background_url'
  const { data: currentBrand } = await supabase
    .from('brand_identity')
    .select(urlField)
    .eq('project_id', projectId)
    .maybeSingle()
  const previousUrl = (currentBrand as Record<string, string | null> | null)?.[urlField] ?? null
  if (previousUrl) {
    try {
      const urlObj = new URL(previousUrl)
      const match = urlObj.pathname.match(/\/object\/public\/project-assets\/(.+)/)
      if (match?.[1]) {
        await supabase.storage.from('project-assets').remove([decodeURIComponent(match[1])])
      }
    } catch { /* non-blocking */ }
  }

  const contentType = (processTransparency && ext !== 'svg') ? 'image/png' : file.type
  const { error: uploadError } = await supabase.storage
    .from('project-assets')
    .upload(filename, buffer, { contentType })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('project-assets')
    .getPublicUrl(filename)

  // Asegurar que el registro exista antes de actualizar
  const { data: existing } = await supabase
    .from('brand_identity')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()

  if (!existing) {
    await supabase.from('brand_identity').insert({
      project_id: projectId,
      markdown_content: BRAND_IDENTITY_TEMPLATE,
    })
  }

  const field = imageType === 'logo' ? { logo_url: publicUrl } : { background_url: publicUrl }
  const { error: updateError } = await supabase
    .from('brand_identity')
    .update({ ...field, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  if (updateError) return { error: updateError.message }

  return { url: publicUrl }
}

export async function removeBrandImage(
  projectId: string,
  imageType: 'logo' | 'background'
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const field = imageType === 'logo' ? { logo_url: null } : { background_url: null }
  const { error } = await supabase
    .from('brand_identity')
    .update({ ...field, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  if (error) return { error: error.message }
  return { success: true }
}
