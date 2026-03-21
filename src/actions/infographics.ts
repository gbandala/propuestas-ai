'use server'

import { createClient } from '@/lib/supabase/server'
import { generateInfographicImage } from '@/features/infographic-generation/services/openrouter-image'
import { buildTechnicalPrompt } from '@/features/infographic-generation/services/prompt-builder'
import { DEFAULT_COLORS } from '@/shared/constants/brand'
import type { StepData } from '@/features/technical-brief/types'
import type { BrandIdentity } from '@/types/database'

export async function generateTechnicalInfographics(
  projectId: string
): Promise<{ data: { jobIds: string[] } } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que el brief esté generado
  const { data: brief } = await supabase
    .from('technical_briefs')
    .select('step_data, generated_at')
    .eq('project_id', projectId)
    .single()

  if (!brief?.generated_at) return { error: 'El brief técnico debe estar completado primero' }

  // Verificar que no hay jobs pendientes/running (evitar duplicados)
  const { data: existingJobs } = await supabase
    .from('generation_jobs')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('type', 'technical_infographics')
    .in('status', ['pending', 'running'])

  if (existingJobs && existingJobs.length > 0) {
    return { error: 'Ya hay una generación en curso' }
  }

  // Cargar brand_spec (con fallback a defaults)
  const { data: brandSpec } = await supabase
    .from('brand_specs')
    .select('*')
    .eq('project_id', projectId)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  // Crear 3 jobs en paralelo
  const jobInserts = [1, 2, 3].map((variant) => ({
    project_id: projectId,
    type: 'technical_infographics' as const,
    status: 'pending' as const,
    progress: 0,
  }))

  const { data: jobs, error: jobsError } = await supabase
    .from('generation_jobs')
    .insert(jobInserts)
    .select('id')

  if (jobsError || !jobs) return { error: jobsError?.message ?? 'Error creando jobs' }

  const stepData = brief.step_data as StepData
  const colors = {
    primary: brandSpec?.primary_color ?? DEFAULT_COLORS.primary,
    secondary: brandSpec?.secondary_color ?? DEFAULT_COLORS.secondary,
    accent: brandSpec?.accent_color ?? DEFAULT_COLORS.accent,
  }

  // Disparar generación en paralelo (sin await — fire and forget con Promise.allSettled)
  const jobIds = jobs.map((j) => j.id)

  // Ejecutar en background sin bloquear
  Promise.allSettled([
    generateAndSaveVariant(supabase, projectId, 1, jobIds[0], stepData, colors, brandSpec),
    generateAndSaveVariant(supabase, projectId, 2, jobIds[1], stepData, colors, brandSpec),
    generateAndSaveVariant(supabase, projectId, 3, jobIds[2], stepData, colors, brandSpec),
  ])

  return { data: { jobIds } }
}

async function generateAndSaveVariant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  variant: 1 | 2 | 3,
  jobId: string,
  stepData: StepData,
  colors: { primary: string; secondary: string; accent: string },
  brandSpec: BrandIdentity | null
) {
  try {
    // Marcar como running
    await supabase
      .from('generation_jobs')
      .update({ status: 'running', progress: 10, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const prompt = buildTechnicalPrompt(variant, stepData, colors)

    await supabase
      .from('generation_jobs')
      .update({ progress: 30, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const imageBuffer = await generateInfographicImage(prompt)

    await supabase
      .from('generation_jobs')
      .update({ progress: 70, updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Subir a Supabase Storage
    const filename = `projects/${projectId}/infographics/variant-${variant}-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('project-assets')
      .upload(filename, imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: { publicUrl } } = supabase.storage
      .from('project-assets')
      .getPublicUrl(filename)

    // Guardar infographic record
    const { data: infographic } = await supabase
      .from('infographics')
      .insert({
        project_id: projectId,
        type: 'technical',
        variant,
        url: publicUrl,
        prompt_used: prompt,
        selected: false,
      })
      .select('id')
      .single()

    // Marcar job como completado
    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return { infographicId: infographic?.id }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    throw err
  }
}

export async function selectInfographicVariant(
  infographicId: string,
  projectId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Deseleccionar todas las técnicas del proyecto
  await supabase
    .from('infographics')
    .update({ selected: false })
    .eq('project_id', projectId)
    .eq('type', 'technical')

  // Seleccionar la elegida
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

  const { data: brief } = await supabase
    .from('technical_briefs')
    .select('step_data')
    .eq('project_id', projectId)
    .single()

  const { data: brandSpec } = await supabase
    .from('brand_specs')
    .select('*')
    .eq('project_id', projectId)
    .single()

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

  const stepData = (brief?.step_data ?? {}) as StepData
  const colors = {
    primary: brandSpec?.primary_color ?? DEFAULT_COLORS.primary,
    secondary: brandSpec?.secondary_color ?? DEFAULT_COLORS.secondary,
    accent: brandSpec?.accent_color ?? DEFAULT_COLORS.accent,
  }

  Promise.allSettled([
    generateAndSaveVariant(supabase, projectId, variant, job.id, stepData, colors, brandSpec),
  ])

  return { data: { jobId: job.id } }
}

