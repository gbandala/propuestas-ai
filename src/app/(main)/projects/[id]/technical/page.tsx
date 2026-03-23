import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { getTechnicalBrief } from '@/actions/technical-brief'
import { TechnicalBriefForm } from '@/features/technical-brief/components'
import { InfographicGenerator } from '@/features/infographic-generation/components'
import { ProjectAiUsageWidget } from '@/shared/components/ProjectAiUsageWidget'

interface TechnicalPageProps {
  params: Promise<{ id: string }>
}

export default async function TechnicalBriefPage({ params }: TechnicalPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Comercial no puede acceder a esta ruta
  if (profile?.role === 'commercial') redirect(`/projects/${id}`)

  const [projectResult, briefResult] = await Promise.all([
    getProjectById(id),
    getTechnicalBrief(id),
  ])

  if ('error' in projectResult) notFound()
  if ('error' in briefResult) notFound()

  const project = projectResult.data
  const brief = briefResult.data
  const briefCompleted = !!brief.generated_at

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
          {/* Contenido principal */}
          <div className="min-w-0 space-y-10">
            <div className="mb-6">
              <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
                ← {project.name}
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">Brief Técnico</h1>
              <p className="mt-1 text-sm text-gray-500">
                Completa los 5 pasos para generar el documento técnico y desbloquear la fase comercial.
              </p>
            </div>

            <TechnicalBriefForm
              projectId={id}
              projectName={project.name}
              initialBrief={brief}
            />

            {briefCompleted && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <InfographicGenerator projectId={id} />
              </div>
            )}
          </div>

          {/* Sidebar: créditos IA del proyecto */}
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
