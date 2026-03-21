'use server'

import { createClient } from '@/lib/supabase/server'
import { BRAND_IDENTITY_TEMPLATE } from '@/features/brand-identity/types'

export async function getBrandIdentity(
  projectId: string
): Promise<{ data: { id: string; markdown_content: string } | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('brand_identity')
    .select('id, markdown_content')
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

  // Verificar permiso: solo architect o admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'commercial') return { error: 'Sin permiso para modificar la identidad de marca' }

  // Upsert: crear si no existe, actualizar si ya existe
  const { data: existing } = await supabase
    .from('brand_identity')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('brand_identity')
      .update({ markdown_content: markdownContent })
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
