'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Brief } from '@/types/database'

export async function getBrief(
  projectId: string
): Promise<{ data: Brief | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('briefs')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data }
}

export async function saveBrief(
  projectId: string,
  content: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!content.trim()) return { error: 'El brief no puede estar vacío' }

  const now = new Date().toISOString()

  const { error: briefError } = await supabase
    .from('briefs')
    .upsert(
      { project_id: projectId, content, updated_at: now },
      { onConflict: 'project_id' }
    )

  if (briefError) return { error: briefError.message }

  // Marcar brief como completado en projects (reutiliza technical_completed_at)
  const { error: projectError } = await supabase
    .from('projects')
    .update({ technical_completed_at: now, status: 'in_progress', updated_at: now })
    .eq('id', projectId)

  if (projectError) return { error: projectError.message }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/brief`)
  return { success: true }
}
