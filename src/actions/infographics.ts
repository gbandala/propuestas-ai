'use server'

import { createClient } from '@/lib/supabase/server'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? 'propuestasai-internal'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Dispara la generación de una variante via API route — fire-and-forget (no await)
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

// Dispara la generación de un slide de propuesta — fire-and-forget
function triggerSlideGeneration(projectId: string, slideNumber: number, jobId: string, accessToken: string) {
  fetch(`${BASE_URL}/api/infographics/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
      'x-user-token': accessToken,
    },
    body: JSON.stringify({ projectId, slideNumber, jobId }),
  }).catch((err: unknown) => {
    console.error('[infographic] Error disparando slide', slideNumber, ':', err)
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

export async function deselectInfographicVariant(
  projectId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('infographics')
    .update({ selected: false })
    .eq('project_id', projectId)
    .eq('type', 'technical')

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

// ---------------------------------------------------------------------------
// Propuesta unificada — N slides desde el storyboard aprobado
// ---------------------------------------------------------------------------

/** Parsea el markdown en secciones ### y devuelve los slides (excluye el Encabezado) */
function parseStoryboardSlides(markdown: string): Array<{ slideNumber: number; title: string }> {
  const parts = markdown.split(/^### /m)
  // parts[0] = vacío, parts[1] = Encabezado, parts[2] = Slide 1, etc.
  const slides: Array<{ slideNumber: number; title: string }> = []
  for (let i = 2; i < parts.length; i++) {
    const firstNewline = parts[i].indexOf('\n')
    const title = parts[i].slice(0, firstNewline).trim()
    if (title) {
      slides.push({ slideNumber: i - 1, title })
    }
  }
  return slides
}

export async function generateProposalInfographics(
  projectId: string
): Promise<{ data: { jobIdToSlide: Record<string, number>; slides: Array<{ slideNumber: number; title: string }> } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token ?? ''

  // Obtener storyboard aprobado
  const { data: storyboard } = await supabase
    .from('storyboards')
    .select('content_md')
    .eq('project_id', projectId)
    .eq('type', 'infographic')
    .not('approved_at', 'is', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!storyboard?.content_md) {
    return { error: 'El storyboard debe estar aprobado antes de generar las infografías' }
  }

  const slides = parseStoryboardSlides(storyboard.content_md)
  if (slides.length === 0) return { error: 'No se encontraron slides en el storyboard' }

  // Evitar duplicados
  const { data: activeJobs } = await supabase
    .from('generation_jobs')
    .select('id')
    .eq('project_id', projectId)
    .eq('type', 'proposal_infographics')
    .in('status', ['pending', 'running'])

  if (activeJobs && activeJobs.length > 0) {
    return { error: 'Ya hay una generación en curso' }
  }

  // Crear un job por slide
  const jobInserts = slides.map((s) => ({
    project_id: projectId,
    type: 'proposal_infographics' as const,
    status: 'pending' as const,
    progress: 0,
    slide_number: s.slideNumber,
  }))

  const { data: jobs, error: jobsError } = await supabase
    .from('generation_jobs')
    .insert(jobInserts)
    .select('id, slide_number')

  if (jobsError || !jobs) return { error: jobsError?.message ?? 'Error creando jobs' }

  const jobIdToSlide: Record<string, number> = {}
  jobs.forEach((j) => {
    if (j.slide_number) jobIdToSlide[j.id] = j.slide_number
  })

  // Disparar generación por slide con stagger de 600ms para no saturar OpenRouter
  ;(async () => {
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i]
      if (j.slide_number) triggerSlideGeneration(projectId, j.slide_number, j.id, accessToken)
      if (i < jobs.length - 1) await new Promise((r) => setTimeout(r, 600))
    }
  })()

  return { data: { jobIdToSlide, slides } }
}

export async function getProposalInfographics(
  projectId: string
): Promise<{
  data: {
    jobs: Array<{ id: string; status: string; progress: number; error: string | null; slide_number: number | null }>
    infographics: Array<{ id: string; slide_index: number | null; url: string }>
    slides: Array<{ slideNumber: number; title: string }>
  }
} | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [jobsResult, infographicsResult, storyboardResult] = await Promise.all([
    supabase
      .from('generation_jobs')
      .select('id, status, progress, error, slide_number')
      .eq('project_id', projectId)
      .eq('type', 'proposal_infographics')
      .in('status', ['pending', 'running', 'failed'])
      .order('created_at', { ascending: false }),
    supabase
      .from('infographics')
      .select('id, slide_index, url')
      .eq('project_id', projectId)
      .not('slide_index', 'is', null)
      .order('slide_index', { ascending: true }),
    supabase
      .from('storyboards')
      .select('content_md')
      .eq('project_id', projectId)
      .eq('type', 'infographic')
      .not('approved_at', 'is', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const slides = storyboardResult.data?.content_md
    ? parseStoryboardSlides(storyboardResult.data.content_md)
    : []

  return {
    data: {
      jobs: jobsResult.data ?? [],
      infographics: infographicsResult.data ?? [],
      slides,
    },
  }
}

export async function retryProposalSlide(
  projectId: string,
  slideNumber: number
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
      type: 'proposal_infographics' as const,
      status: 'pending' as const,
      progress: 0,
      slide_number: slideNumber,
    })
    .select('id')
    .single()

  if (error || !job) return { error: error?.message ?? 'Error' }

  triggerSlideGeneration(projectId, slideNumber, job.id, accessToken)

  return { data: { jobId: job.id } }
}
