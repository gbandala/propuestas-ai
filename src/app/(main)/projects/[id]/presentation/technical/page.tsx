import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { PresentationViewer } from '@/features/technical-presentation/components'
import { ProjectAiUsageWidget } from '@/shared/components/ProjectAiUsageWidget'

interface TechnicalPresentationPageProps {
  params: Promise<{ id: string }>
}

export default async function TechnicalPresentationPage({ params }: TechnicalPresentationPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'commercial') redirect(`/projects/${id}`)

  const [projectResult, storyboardResult] = await Promise.all([
    getProjectById(id),
    supabase
      .from('storyboards')
      .select('id, approved_at')
      .eq('project_id', id)
      .eq('type', 'technical')
      .not('approved_at', 'is', null)
      .limit(1)
      .maybeSingle(),
  ])

  if ('error' in projectResult) notFound()

  // Guard: sin storyboard aprobado → redirigir al storyboard
  if (!storyboardResult.data) {
    redirect(`/projects/${id}/storyboard?type=technical`)
  }

  const project = projectResult.data

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
          {/* Contenido principal */}
          <div className="min-w-0 space-y-6">
            <div>
              <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
                ← {project.name}
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">Presentación Técnica</h1>
              <p className="mt-1 text-sm text-gray-500">
                10 slides generados como imágenes con IA. Cada slide se puede regenerar individualmente con comentarios.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <PresentationViewer projectId={id} />
            </div>
          </div>

          {/* Sidebar: créditos IA */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <ProjectAiUsageWidget projectId={id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
