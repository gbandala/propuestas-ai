import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { getStoryboard, generateStoryboard, approveStoryboard } from '@/actions/storyboard'
import { StoryboardReviewer } from '@/features/storyboard/components'
import { AiModelBadge } from '@/shared/components/AiModelBadge'
import { getLastAiLog } from '@/actions/ai-usage'
import { ProjectAiUsageWidget } from '@/shared/components/ProjectAiUsageWidget'
import type { StoryboardType } from '@/features/storyboard/types'

interface StoryboardPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}

export default async function StoryboardPage({ params, searchParams }: StoryboardPageProps) {
  const { id } = await params
  const { type: typeParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const type: StoryboardType = typeParam === 'commercial' ? 'commercial' : 'technical'

  // Comercial no puede ver storyboard tecnico
  if (profile?.role === 'commercial' && type === 'technical') {
    redirect(`/projects/${id}`)
  }

  const taskTypes = type === 'technical'
    ? ['storyboard_technical']
    : ['storyboard_commercial']

  const [projectResult, storyboardResult, lastLogResult] = await Promise.all([
    getProjectById(id),
    getStoryboard(id, type),
    getLastAiLog(id, taskTypes),
  ])

  const lastLog = 'data' in lastLogResult ? lastLogResult.data : null

  if ('error' in projectResult) notFound()

  const project = projectResult.data
  const storyboardData = 'data' in storyboardResult ? storyboardResult.data : null
  const storyboardId = storyboardData?.id ?? null

  async function handleGenerate(comments?: string) {
    'use server'
    const result = await generateStoryboard(id, type, comments)
    if ('error' in result) {
      console.error('[Storyboard] generateStoryboard error:', result.error)
      throw new Error(result.error)
    }
    revalidatePath(`/projects/${id}/storyboard`)
  }

  async function handleApprove() {
    'use server'
    if (!storyboardId) return
    const result = await approveStoryboard(storyboardId)
    if ('error' in result) {
      console.error('[Storyboard] approveStoryboard error:', result.error)
      throw new Error(result.error)
    }
    revalidatePath(`/projects/${id}/storyboard`)
  }

  const nextHref = type === 'technical'
    ? `/projects/${id}/technical`
    : `/projects/${id}/commercial`

  const typeLabel = type === 'technical' ? 'Tecnico' : 'Comercial'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
              ← {project.name}
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Storyboard {typeLabel}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Borrador textual de las piezas visuales. Apruebalo antes de generar las imagenes con IA.
            </p>
            {lastLog && (
              <div className="mt-2">
                <AiModelBadge log={lastLog} />
              </div>
            )}
          </div>
          <div className="hidden shrink-0 sm:block">
            <ProjectAiUsageWidget projectId={id} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <StoryboardReviewer
            projectId={id}
            type={type}
            storyboard={storyboardData ? {
              id: storyboardData.id,
              project_id: id,
              type,
              content_md: storyboardData.content_md,
              version: storyboardData.version,
              approved_at: storyboardData.approved_at,
              created_at: '',
              updated_at: '',
            } : null}
            onGenerate={handleGenerate}
            onApprove={handleApprove}
          />
        </div>

        {storyboardData?.approved_at && (
          <div className="flex justify-end">
            <Link
              href={nextHref}
              className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Continuar a generar infografias →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
