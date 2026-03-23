'use server'

import { createClient } from '@/lib/supabase/server'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? 'propuestasai-internal'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Dispara la generación de una variante via API route — fire-and-forget (no await)
// El Server Action no espera la respuesta; el API route corre de forma independiente.
function triggerVariantGeneration(projectId: string, variant: 1 | 2 | 3, jobId: string, accessToken: string) {
  fetch(`${BASE_URL}/api/infographics/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
      'x-user-token': accessToken,
    },
    body: JSON.stringify({ projectId, variant, jobId }),
  }).catch((err: unknown) => {
    console.error('[infographic] Error disparando variante', variant, ':', err)
  })
}

export async function generateTechnicalInfographics(
  projectId: string
): Promise<{ data: { jobIds: string[] } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener access token para pasarlo al API route (llamada server-to-server no lleva cookies)
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token ?? ''

  // Verificar que el brief esté generado
  const { data: brief } = await supabase
    .from('technical_briefs')
    .select('generated_at')
    .eq('project_id', projectId)
    .single()

  if (!brief?.generated_at) return { error: 'El brief técnico debe estar completado primero' }

  // Evitar duplicados
  const { data: existingJobs } = await supabase
    .from('generation_jobs')
    .select('id')
    .eq('project_id', projectId)
    .eq('type', 'technical_infographics')
    .in('status', ['pending', 'running'])

  if (existingJobs && existingJobs.length > 0) {
    return { error: 'Ya hay una generación en curso' }
  }

  // Crear 3 jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('generation_jobs')
    .insert([
      { project_id: projectId, type: 'technical_infographics' as const, status: 'pending' as const, progress: 0 },
      { project_id: projectId, type: 'technical_infographics' as const, status: 'pending' as const, progress: 0 },
      { project_id: projectId, type: 'technical_infographics' as const, status: 'pending' as const, progress: 0 },
    ])
    .select('id')

  if (jobsError || !jobs) return { error: jobsError?.message ?? 'Error creando jobs' }

  const jobIds = jobs.map((j) => j.id)

  // Disparar generación via API routes — fire-and-forget, el Server Action no espera
  triggerVariantGeneration(projectId, 1, jobIds[0], accessToken)
  triggerVariantGeneration(projectId, 2, jobIds[1], accessToken)
  triggerVariantGeneration(projectId, 3, jobIds[2], accessToken)

  return { data: { jobIds } }
}

export async function selectInfographicVariant(
  infographicId: string,
  projectId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  await supabase
    .from('infographics')
    .update({ selected: false })
    .eq('project_id', projectId)
    .eq('type', 'technical')

  const { error } = await supabase
    .from('infographics')
    .update({ selected: true })
    .eq('id', infographicId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getProjectInfographics(
  projectId: string
): Promise<{ data: { jobs: unknown[]; infographics: unknown[] } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [jobsResult, infographicsResult] = await Promise.all([
    supabase
      .from('generation_jobs')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'technical_infographics')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('infographics')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'technical')
      .order('variant', { ascending: true }),
  ])

  return {
    data: {
      jobs: jobsResult.data ?? [],
      infographics: infographicsResult.data ?? [],
    },
  }
}

export async function retryInfographicVariant(
  projectId: string,
  variant: 1 | 2 | 3
): Promise<{ data: { jobId: string } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token ?? ''

  const { data: job, error } = await supabase
    .from('generation_jobs')
    .insert({
      project_id: projectId,
      type: 'technical_infographics' as const,
      status: 'pending' as const,
      progress: 0,
    })
    .select('id')
    .single()

  if (error || !job) return { error: error?.message ?? 'Error' }

  triggerVariantGeneration(projectId, variant, job.id, accessToken)

  return { data: { jobId: job.id } }
}
