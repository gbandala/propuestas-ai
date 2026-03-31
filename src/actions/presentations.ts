'use server'

import { createClient } from '@/lib/supabase/server'
import type { PresentationType } from '@/types/database'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET
if (!INTERNAL_SECRET) throw new Error('INTERNAL_API_SECRET environment variable is required')
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function triggerSlideGeneration(
  projectId: string,
  slideNumber: number,
  jobId: string,
  accessToken: string,
  comments?: string
) {
  fetch(`${BASE_URL}/api/presentation/generate-slide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET!,
      'x-user-token': accessToken,
    },
    body: JSON.stringify({ projectId, slideNumber, jobId, comments }),
  }).catch((err: unknown) => {
    console.error('[presentation] Error disparando slide', slideNumber, ':', err)
  })
}

// ---------------------------------------------------------------------------
// Leer slides generados
// ---------------------------------------------------------------------------

export interface PresentationSlide {
  id: string
  slide_number: number
  url: string
  created_at: string
  updated_at: string
}

export async function getPresentationSlides(
  projectId: string,
  type: PresentationType = 'technical'
): Promise<{ data: { slides: PresentationSlide[]; jobs: unknown[] } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [slidesResult, jobsResult] = await Promise.all([
    supabase
      .from('presentation_slides')
      .select('id, slide_number, url, created_at, updated_at')
      .eq('project_id', projectId)
      .eq('type', type)
      .order('slide_number', { ascending: true }),
    supabase
      .from('generation_jobs')
      .select('id, status, progress, error, slide_number')
      .eq('project_id', projectId)
      .eq('type', 'technical_presentation')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    data: {
      slides: slidesResult.data ?? [],
      jobs: jobsResult.data ?? [],
    },
  }
}

// ---------------------------------------------------------------------------
// Generar todos los slides (10 jobs fire-and-forget)
// ---------------------------------------------------------------------------

export async function generatePresentation(
  projectId: string
): Promise<{ data: { jobIds: string[] } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token ?? ''

  // Verificar storyboard aprobado
  const { data: storyboard } = await supabase
    .from('storyboards')
    .select('id, approved_at')
    .eq('project_id', projectId)
    .eq('type', 'technical')
    .not('approved_at', 'is', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!storyboard) {
    return { error: 'El storyboard técnico debe estar aprobado antes de generar los slides.' }
  }

  // Evitar generaciones duplicadas en curso
  const { data: activeJobs } = await supabase
    .from('generation_jobs')
    .select('id')
    .eq('project_id', projectId)
    .eq('type', 'technical_presentation')
    .in('status', ['pending', 'running'])

  if (activeJobs && activeJobs.length > 0) {
    return { error: 'Ya hay una generación de slides en curso.' }
  }

  // Crear 10 jobs (uno por slide) con slide_number para trazabilidad
  const jobInserts = Array.from({ length: 10 }, (_, i) => ({
    project_id: projectId,
    type: 'technical_presentation' as const,
    status: 'pending' as const,
    progress: 0,
    slide_number: i + 1,
  }))

  const { data: jobs, error: jobsError } = await supabase
    .from('generation_jobs')
    .insert(jobInserts)
    .select('id')

  if (jobsError || !jobs) return { error: jobsError?.message ?? 'Error creando jobs' }

  const jobIds = jobs.map((j) => j.id)

  // Disparar generación de cada slide — fire-and-forget
  for (let i = 0; i < 10; i++) {
    triggerSlideGeneration(projectId, i + 1, jobIds[i], accessToken)
  }

  return { data: { jobIds } }
}

// ---------------------------------------------------------------------------
// Regenerar un slide individual (con comentario opcional)
// ---------------------------------------------------------------------------

export async function retryPresentationSlide(
  projectId: string,
  slideNumber: number,
  comments?: string
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
      type: 'technical_presentation' as const,
      status: 'pending' as const,
      progress: 0,
      slide_number: slideNumber,
    })
    .select('id')
    .single()

  if (error || !job) return { error: error?.message ?? 'Error creando job' }

  triggerSlideGeneration(projectId, slideNumber, job.id, accessToken, comments)

  return { data: { jobId: job.id } }
}

// ---------------------------------------------------------------------------
// Compatibilidad: verificar si el proyecto tiene slides generados
// ---------------------------------------------------------------------------

export async function getPresentation(
  projectId: string,
  type: PresentationType
): Promise<{ data: { id: string; html_content: string | null; slides_count: number } | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: slides } = await supabase
    .from('presentation_slides')
    .select('id')
    .eq('project_id', projectId)
    .eq('type', type)
    .limit(1)

  if (!slides || slides.length === 0) return { data: null }

  return { data: { id: projectId, html_content: null, slides_count: 10 } }
}
