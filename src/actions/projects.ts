'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types/database'

const CreateProjectSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  client_name: z.string().min(2, 'El nombre del cliente debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>

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

export async function archiveProject(id: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id) // solo el creador puede archivar

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
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
