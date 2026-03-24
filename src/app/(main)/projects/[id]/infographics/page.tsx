import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { getTechnicalBrief } from '@/actions/technical-brief'
import { InfographicGenerator } from '@/features/infographic-generation/components'
import { ProjectAiUsageWidget } from '@/shared/components/ProjectAiUsageWidget'

interface InfographicsPageProps {
  params: Promise<{ id: string }>
}

export default async function InfographicsPage({ params }: InfographicsPageProps) {
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

  const [projectResult, briefResult, infographicStoryboardResult] = await Promise.all([
    getProjectById(id),
    getTechnicalBrief(id),
    supabase
      .from('storyboards')
      .select('id, approved_at')
      .eq('project_id', id)
      .eq('type', 'infographic')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if ('error' in projectResult) notFound()
  if ('error' in briefResult) notFound()

  const project = projectResult.data
  const briefCompleted = !!briefResult.data.generated_at

  // Guard: brief no completado
  if (!briefCompleted) {
    redirect(`/projects/${id}/technical`)
  }

  // Guard: storyboard de infografias no aprobado
  if (!infographicStoryboardResult.data?.approved_at) {
    redirect(`/projects/${id}/storyboard?type=infographic`)
  }

  // Mostrar boton de continuar cuando hay al menos 1 infografia generada
  const { data: infographics } = await supabase
    .from('infographics')
    .select('id')
    .eq('project_id', id)
    .limit(1)

  const hasInfographics = (infographics?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
          {/* Contenido principal */}
          <div className="min-w-0 space-y-6">
            <div>
              <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
                &larr; {project.name}
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">Infografias Tecnicas</h1>
              <p className="mt-1 text-sm text-gray-500">
                Genera 3 variantes con IA a partir del storyboard aprobado. Puedes seleccionar una para incluirla en la presentacion.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <InfographicGenerator projectId={id} />
            </div>

            {hasInfographics && (
              <div className="flex justify-end">
                <Link
                  href={`/projects/${id}/storyboard?type=technical`}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Continuar al Storyboard de Presentacion &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar: creditos IA */}
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
