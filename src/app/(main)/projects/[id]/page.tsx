import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectById } from '@/actions/projects'
import { ProjectStatusBadge } from '@/features/projects/components'
import { createClient } from '@/lib/supabase/server'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const result = await getProjectById(id)

  if ('error' in result) notFound()

  const project = result.data
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isArchitect = profile?.role === 'architect' || profile?.role === 'admin' || project.user_id === user!.id
  const technicalDone = !!project.technical_completed_at

  // Verificar brand identity, storyboards y estado de infografias
  const [brandResult, infographicStoryboardResult, presentationStoryboardResult, infographicsResult, presentationResult] = await Promise.all([
    supabase.from('brand_identity').select('id').eq('project_id', id).maybeSingle(),
    supabase.from('storyboards').select('id, approved_at').eq('project_id', id).eq('type', 'infographic').order('version', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('storyboards').select('id, approved_at').eq('project_id', id).eq('type', 'technical').order('version', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('infographics').select('id, selected').eq('project_id', id),
    supabase.from('presentations').select('id, html_content').eq('project_id', id).eq('type', 'technical').maybeSingle(),
  ])

  const hasBrand = !!brandResult.data
  const infographicStoryboardApproved = !!infographicStoryboardResult.data?.approved_at
  const presentationStoryboardApproved = !!presentationStoryboardResult.data?.approved_at
  const hasInfographics = (infographicsResult.data?.length ?? 0) > 0
  const hasPresentation = !!presentationResult.data?.html_content

  const steps = [
    {
      number: 1,
      label: 'Identidad de Marca',
      description: 'Colores, tipografia, logo y tono visual del cliente.',
      done: hasBrand,
      href: `/projects/${id}/brand`,
      visible: isArchitect,
      locked: false,
    },
    {
      number: 2,
      label: 'Brief Tecnico',
      description: 'Captura del discovery: problema, ROI, funcionalidades y stack.',
      done: technicalDone,
      href: `/projects/${id}/technical`,
      visible: isArchitect,
      locked: false,
    },
    {
      number: 3,
      label: 'Storyboard de Infografias',
      description: 'Borrador textual de las 3 piezas visuales. Aprobar antes de generar.',
      done: infographicStoryboardApproved,
      href: `/projects/${id}/storyboard?type=infographic`,
      visible: isArchitect,
      locked: !technicalDone,
      lockedReason: 'Requiere el brief tecnico completado.',
    },
    {
      number: 4,
      label: 'Infografias Tecnicas',
      description: '3 variantes con IA. Puedes seleccionar una para incluirla en la presentacion.',
      done: hasInfographics,
      href: `/projects/${id}/infographics`,
      visible: isArchitect,
      locked: !infographicStoryboardApproved,
      lockedReason: 'Requiere el storyboard de infografias aprobado.',
    },
    {
      number: 5,
      label: 'Storyboard de Presentacion',
      description: 'Borrador textual de los 10 slides. Aprobar antes de generar la presentacion.',
      done: presentationStoryboardApproved,
      href: `/projects/${id}/storyboard?type=technical`,
      visible: isArchitect,
      locked: !hasInfographics,
      lockedReason: 'Requiere tener infografias generadas.',
    },
    {
      number: 6,
      label: 'Presentacion Tecnica',
      description: 'Presentacion HTML de 10 slides generada con IA.',
      done: hasPresentation,
      href: `/projects/${id}/presentation/technical`,
      visible: isArchitect,
      locked: !presentationStoryboardApproved,
      lockedReason: 'Requiere el storyboard de presentacion aprobado.',
    },
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              ← Proyectos
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-1 text-gray-500">{project.client_name}</p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        {project.description && (
          <p className="mt-4 text-gray-600">{project.description}</p>
        )}

        {/* Flujo Tecnico */}
        {isArchitect && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Fase Tecnica</h2>
            <div className="space-y-3">
              {steps.map((step) => {
                if (!step.visible) return null
                return (
                  <div
                    key={step.number}
                    className={`rounded-lg border-2 p-5 transition-colors ${
                      step.locked
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : step.done
                        ? 'border-green-200 bg-green-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                          step.locked ? 'bg-white text-gray-400 border border-gray-300' : step.done ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border border-gray-300'
                        }`}>
                          {!step.locked && step.done ? '✓' : step.number}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{step.label}</h3>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                      </div>
                      <div>
                        {step.locked ? (
                          <span className="text-xs text-gray-400">🔒 {step.lockedReason}</span>
                        ) : (
                          <Link
                            href={step.href}
                            className={`inline-flex rounded-md px-4 py-1.5 text-sm font-medium text-white ${
                              step.done ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {step.done ? 'Ver' : 'Completar →'}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Fase Comercial */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Fase Comercial</h2>
          <div className={`rounded-lg border-2 p-5 ${
            !technicalDone
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : project.commercial_completed_at
              ? 'border-green-200 bg-green-50'
              : 'border-purple-200 bg-purple-50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">Propuesta Comercial</h3>
                  {!technicalDone && <span className="text-xs text-gray-400">🔒 Bloqueada</span>}
                  {project.commercial_completed_at && <span className="text-sm font-medium text-green-600">✓ Completada</span>}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Propuesta, infografias de ROI/Roadmap y presentacion ejecutiva.
                </p>
                {!technicalDone && (
                  <p className="mt-1 text-xs text-gray-400">
                    Requiere la fase tecnica completada para habilitarse.
                  </p>
                )}
              </div>
              {technicalDone && (
                <Link
                  href={`/projects/${id}/commercial`}
                  className="inline-flex rounded-md bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
                >
                  {project.commercial_completed_at ? 'Ver propuesta' : 'Completar →'}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-8 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Informacion del proyecto</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">Creado</dt>
              <dd className="font-medium">{new Date(project.created_at).toLocaleDateString('es-MX')}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd><ProjectStatusBadge status={project.status} /></dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
