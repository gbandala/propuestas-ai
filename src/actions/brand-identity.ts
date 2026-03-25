'use server'

import { createClient } from '@/lib/supabase/server'
import { BRAND_IDENTITY_TEMPLATE } from '@/features/brand-identity/types'

export async function getBrandIdentity(
  projectId: string
): Promise<{ data: { id: string; markdown_content: string; logo_url: string | null; background_url: string | null } | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('brand_identity')
    .select('id, markdown_content, logo_url, background_url')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data }
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
  imageType: 'logo' | 'background'
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

  const filename = `projects/${projectId}/brand/${imageType}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('project-assets')
    .upload(filename, buffer, { contentType: file.type, upsert: true })

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
