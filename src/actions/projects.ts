'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Project, ImageQuality } from '@/types/database'

const CreateProjectSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  client_name: z.string().min(2, 'El nombre del cliente debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>

export async function getAllProjectsForDashboard(): Promise<{ data: Project[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

export async function getProjects(): Promise<{ data: Project[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

export interface ProposalProgress {
  infoLoaded: boolean
  storyboardApproved: boolean
  hasInfographics: boolean
}

export interface ProjectWithProgress extends Project {
  proposalProgress: ProposalProgress
}

export async function getProjectsWithProgress(): Promise<{ data: ProjectWithProgress[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (projectsError) return { error: projectsError.message }
  if (!projects || projects.length === 0) return { data: [] }

  const projectIds = projects.map((p) => p.id)

  const [storyboardsResult, infographicsResult] = await Promise.all([
    supabase
      .from('storyboards')
      .select('project_id')
      .in('project_id', projectIds)
      .eq('type', 'infographic')
      .not('approved_at', 'is', null),
    supabase
      .from('infographics')
      .select('project_id')
      .in('project_id', projectIds)
      .not('slide_index', 'is', null),
  ])

  const approvedSet = new Set((storyboardsResult.data ?? []).map((s) => s.project_id))
  const infographicSet = new Set((infographicsResult.data ?? []).map((i) => i.project_id))

  return {
    data: projects.map((p) => ({
      ...p,
      proposalProgress: {
        infoLoaded: !!p.technical_completed_at,
        storyboardApproved: approvedSet.has(p.id),
        hasInfographics: infographicSet.has(p.id),
      },
    })),
  }
}

export async function getProjectsWithProgressAll(): Promise<{ data: ProjectWithProgress[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (projectsError) return { error: projectsError.message }
  if (!projects || projects.length === 0) return { data: [] }

  const projectIds = projects.map((p) => p.id)

  const [storyboardsResult, infographicsResult] = await Promise.all([
    supabase
      .from('storyboards')
      .select('project_id')
      .in('project_id', projectIds)
      .eq('type', 'infographic')
      .not('approved_at', 'is', null),
    supabase
      .from('infographics')
      .select('project_id')
      .in('project_id', projectIds)
      .not('slide_index', 'is', null),
  ])

  const approvedSet = new Set((storyboardsResult.data ?? []).map((s) => s.project_id))
  const infographicSet = new Set((infographicsResult.data ?? []).map((i) => i.project_id))

  return {
    data: projects.map((p) => ({
      ...p,
      proposalProgress: {
        infoLoaded: !!p.technical_completed_at,
        storyboardApproved: approvedSet.has(p.id),
        hasInfographics: infographicSet.has(p.id),
      },
    })),
  }
}

export async function getProjectById(id: string): Promise<{ data: Project } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  if (!data) return { error: 'Proyecto no encontrado' }
  return { data }
}

export async function createProject(
  input: CreateProjectInput
): Promise<{ data: Project } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const parsed = CreateProjectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: parsed.data.name,
      client_name: parsed.data.client_name,
      description: parsed.data.description ?? null,
      user_id: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { data }
}

export async function archiveProject(projectId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, client_name, user_id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Proyecto no encontrado' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/projects/archive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_API_SECRET ?? 'propuestasai-internal',
    },
    body: JSON.stringify({ projectId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    return { error: err.error ?? 'Error al archivar' }
  }

  const result = await res.json()

  await supabase.from('projects').update({
    status: 'archived',
    archived_at: new Date().toISOString(),
    archive_url: result.archiveUrl,
  }).eq('id', projectId)

  revalidatePath('/dashboard')
  revalidatePath(`/projects/${projectId}`)

  return { success: true }
}

export async function updateImageQuality(
  id: string,
  quality: ImageQuality
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('projects')
    .update({ image_quality: quality, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${id}/infographics`)
  return { success: true }
}

export async function updateProjectStatus(
  id: string,
  status: Project['status']
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/projects/${id}`)
  return { success: true }
}
