import type { SupabaseClient } from '@supabase/supabase-js'

const HOURLY_JOB_LIMIT = 30

/**
 * Verifica si el usuario puede crear más generation_jobs.
 * Cuenta los jobs creados en la última hora para todos los proyectos del usuario.
 * Usa dos queries (projects -> generation_jobs) para respetar RLS sin service role.
 */
export async function checkGenerationRateLimit(
  supabase: SupabaseClient
): Promise<{ allowed: boolean; remaining: number }> {
  // 1. Obtener IDs de proyectos del usuario (RLS garantiza que solo ve los suyos)
  const { data: userProjects } = await supabase.from('projects').select('id')
  const projectIds = userProjects?.map((p: { id: string }) => p.id) ?? []

  if (projectIds.length === 0) return { allowed: true, remaining: HOURLY_JOB_LIMIT }

  // 2. Contar jobs recientes en esos proyectos
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('generation_jobs')
    .select('id', { count: 'exact', head: true })
    .in('project_id', projectIds)
    .gte('created_at', oneHourAgo)

  const used = count ?? 0
  const remaining = Math.max(0, HOURLY_JOB_LIMIT - used)
  return { allowed: used < HOURLY_JOB_LIMIT, remaining }
}
