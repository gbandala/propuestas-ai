'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { archiveProject } from './projects'

export interface StorageStats {
  totalBytes: number
  byProject: Array<{ projectId: string; projectName: string; bytes: number }>
}

export async function getStorageStats(): Promise<{ data: StorageStats } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: files, error } = await supabase.storage
    .from('project-assets')
    .list('projects', { limit: 1000 })

  if (error) return { error: error.message }

  const byProject: StorageStats['byProject'] = []
  let totalBytes = 0

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, client_name')

  const projectMap = new Map(projects?.map(p => [p.id, `${p.name} (${p.client_name})`]) ?? [])

  for (const folder of files ?? []) {
    if (!folder.name) continue
    const projectId = folder.name
    let projectBytes = 0

    const subfolders = ['infographics', 'brand', 'archive']
    for (const sub of subfolders) {
      const { data: subFiles } = await supabase.storage
        .from('project-assets')
        .list(`projects/${projectId}/${sub}`, { limit: 500 })

      for (const f of subFiles ?? []) {
        projectBytes += f.metadata?.size ?? 0
      }
    }

    totalBytes += projectBytes
    if (projectBytes > 0) {
      byProject.push({
        projectId,
        projectName: projectMap.get(projectId) ?? projectId.slice(0, 8),
        bytes: projectBytes,
      })
    }
  }

  byProject.sort((a, b) => b.bytes - a.bytes)

  return { data: { totalBytes, byProject: byProject.slice(0, 5) } }
}

// ---------------------------------------------------------------------------
// Storage Dashboard (F3 + F4)
// ---------------------------------------------------------------------------

export interface ProjectStorageRow {
  id: string
  name: string
  client_name: string
  status: string
  created_at: string
  updated_at: string
  archived_at: string | null
  archive_url: string | null
  bucketBytes: number
}

export interface StorageDashboardData {
  totalBytes: number
  projects: ProjectStorageRow[]
}

export async function getStorageDashboard(): Promise<{ data: StorageDashboardData } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [bucketResult, projectsResult] = await Promise.all([
    supabase.storage.from('project-assets').list('projects', { limit: 1000 }),
    supabase.from('projects').select('id, name, client_name, status, created_at, updated_at, archived_at, archive_url').order('created_at', { ascending: false }),
  ])

  if (bucketResult.error) return { error: bucketResult.error.message }

  // Build a map of projectId -> bucketBytes
  const bytesMap = new Map<string, number>()
  for (const folder of bucketResult.data ?? []) {
    if (!folder.name) continue
    const projectId = folder.name
    let projectBytes = 0
    for (const sub of ['infographics', 'brand', 'archive']) {
      const { data: subFiles } = await supabase.storage
        .from('project-assets')
        .list(`projects/${projectId}/${sub}`, { limit: 500 })
      for (const f of subFiles ?? []) {
        projectBytes += f.metadata?.size ?? 0
      }
    }
    bytesMap.set(projectId, projectBytes)
  }

  const dbProjects = projectsResult.data ?? []
  const totalBytes = Array.from(bytesMap.values()).reduce((s, b) => s + b, 0)

  const projects: ProjectStorageRow[] = dbProjects.map((p) => ({
    id: p.id,
    name: p.name,
    client_name: p.client_name,
    status: p.status,
    created_at: p.created_at,
    updated_at: p.updated_at,
    archived_at: p.archived_at ?? null,
    archive_url: p.archive_url ?? null,
    bucketBytes: bytesMap.get(p.id) ?? 0,
  }))

  return { data: { totalBytes, projects } }
}

export async function permanentlyDeleteProject(projectId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verify admin role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo admins pueden eliminar proyectos permanentemente' }

  // Get project to find archive_url
  const { data: project } = await supabase.from('projects').select('archive_url, name').eq('id', projectId).single()
  if (!project) return { error: 'Proyecto no encontrado' }

  // Delete ZIP from bucket if exists
  if (project.archive_url) {
    try {
      const urlObj = new URL(project.archive_url)
      const match = urlObj.pathname.match(/\/object\/public\/project-assets\/(.+)/)
      if (match?.[1]) {
        await supabase.storage.from('project-assets').remove([decodeURIComponent(match[1])])
      }
    } catch {
      // Non-blocking — proceed even if ZIP deletion fails
    }
  }

  // Delete all remaining bucket files for this project
  for (const sub of ['infographics', 'brand']) {
    const { data: subFiles } = await supabase.storage
      .from('project-assets')
      .list(`projects/${projectId}/${sub}`, { limit: 500 })
    if (subFiles?.length) {
      const paths = subFiles.map((f) => `projects/${projectId}/${sub}/${f.name}`)
      await supabase.storage.from('project-assets').remove(paths)
    }
  }

  // Delete DB records (cascade order)
  await supabase.from('ai_usage_logs').delete().eq('project_id', projectId)
  await supabase.from('generation_jobs').delete().eq('project_id', projectId)
  await supabase.from('infographics').delete().eq('project_id', projectId)
  await supabase.from('presentation_slides').delete().eq('project_id', projectId)
  await supabase.from('storyboards').delete().eq('project_id', projectId)
  await supabase.from('technical_briefs').delete().eq('project_id', projectId)
  await supabase.from('brand_identity').delete().eq('project_id', projectId)
  await supabase.from('projects').delete().eq('id', projectId)

  revalidatePath('/admin/storage')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function autoCleanOldProjects(): Promise<{ archived: number; freedMB: number } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Buscar proyectos completados hace más de 30 días, sin archive_url aún
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 30)

  const { data: candidates } = await supabase
    .from('projects')
    .select('id, name')
    .eq('status', 'completed')
    .is('archive_url', null)
    .lt('updated_at', cutoffDate.toISOString())
    .order('updated_at', { ascending: true })
    .limit(10) // máximo 10 por vez para no saturar

  if (!candidates?.length) return { archived: 0, freedMB: 0 }

  let archived = 0
  let freedMB = 0

  for (const project of candidates) {
    const result = await archiveProject(project.id)
    if ('success' in result) {
      archived++
      freedMB += 12 // estimado por propuesta
    }
  }

  return { archived, freedMB }
}
