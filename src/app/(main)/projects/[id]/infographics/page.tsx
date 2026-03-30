import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { getBrief } from '@/actions/brief'
import { ProposalInfographicGenerator, ImageQualityToggle } from '@/features/infographic-generation/components'
import { DownloadPptButton } from '@/features/infographic-generation/components/DownloadPptButton'
import { ProjectAiUsageWidget } from '@/shared/components/ProjectAiUsageWidget'

interface InfographicsPageProps {
  params: Promise<{ id: string }>
}

export default async function InfographicsPage({ params }: InfographicsPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [projectResult, briefResult, storyboardResult] = await Promise.all([
    getProjectById(id),
    getBrief(id),
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

  const project = projectResult.data

  // Guard: proyecto archivado
  if (project.status === 'archived') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">📦</div>
          <h2 className="text-lg font-semibold text-gray-900">Propuesta archivada</h2>
          <p className="mt-2 text-sm text-gray-500">
            Las infografías están disponibles en el ZIP descargable.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {project.archive_url && (
              <a
                href={project.archive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Descargar ZIP →
              </a>
            )}
            <Link
              href={`/projects/${id}`}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Volver al proyecto
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Guard: brief no completado
  if ('error' in briefResult || !briefResult.data) {
    redirect(`/projects/${id}/brief`)
  }

  // Guard: storyboard no aprobado
  if (!storyboardResult.data?.approved_at) {
    redirect(`/projects/${id}/storyboard?type=infographic`)
  }

  // Mostrar boton de continuar cuando hay al menos 1 infografia generada
  const { data: infographics } = await supabase
    .from('infographics')
    .select('id')
    .eq('project_id', id)
    .not('slide_index', 'is', null)
    .limit(1)

  const hasInfographics = (infographics?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header compacto — título + créditos + botón PPT en la misma fila */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
              &larr; {project.name}
            </Link>
            <h1 className="mt-1 text-xl font-bold text-gray-900">Infografías de la Propuesta</h1>
            <p className="text-sm text-gray-500">
              Genera cada slide con IA. Todas van incluidas en el PPT final.
            </p>
          </div>

          {/* Créditos + toggle calidad + PPT compactos arriba a la derecha */}
          <div className="flex shrink-0 items-start gap-3">
            <ImageQualityToggle
              projectId={id}
              currentQuality={project.image_quality}
            />
            <ProjectAiUsageWidget projectId={id} />
            {hasInfographics && (
              <DownloadPptButton projectId={id} />
            )}
          </div>
        </div>

        {/* Generador a ancho completo */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <ProposalInfographicGenerator projectId={id} />
        </div>
      </div>
    </div>
  )
}
