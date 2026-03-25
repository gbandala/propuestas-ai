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

  const briefCompleted = !!project.technical_completed_at

  // Verificar brand identity, storyboard y estado de infografias
  const [brandResult, storyboardResult, infographicsResult, briefResult] = await Promise.all([
    supabase.from('brand_identity').select('id').eq('project_id', id).maybeSingle(),
    supabase.from('storyboards').select('id, approved_at').eq('project_id', id).eq('type', 'infographic').order('version', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('infographics').select('id').eq('project_id', id),
    supabase.from('briefs').select('id').eq('project_id', id).maybeSingle(),
  ])

  const hasBrand = !!brandResult.data
  const hasBrief = !!briefResult.data
  const storyboardApproved = !!storyboardResult.data?.approved_at
  const infographicsCount = infographicsResult.data?.length ?? 0
  const hasInfographics = infographicsCount > 0

  const steps = [
    {
      number: 1,
      label: 'Identidad de Marca',
      description: 'Colores, tipografia, logo y fondo para las infografias.',
      done: hasBrand,
      href: `/projects/${id}/brand`,
      locked: false,
    },
    {
      number: 2,
      label: 'Brief del Proyecto',
      description: 'Captura libre del discovery: problema, ROI, solucion, entregables y roadmap.',
      done: briefCompleted,
      href: `/projects/${id}/brief`,
      locked: false,
    },
    {
      number: 3,
      label: 'Storyboard de la Propuesta',
      description: 'Borrador textual de los 7 slides. Editar, iterar y aprobar antes de generar.',
      done: storyboardApproved,
      href: `/projects/${id}/storyboard?type=infographic`,
      locked: !briefCompleted,
      lockedReason: 'Requiere el brief completado.',
    },
    {
      number: 4,
      label: 'Infografias de la Propuesta',
      description: `${infographicsCount > 0 ? `${infographicsCount} imagen${infographicsCount !== 1 ? 'es' : ''} generada${infographicsCount !== 1 ? 's' : ''}` : '7 slides como imagenes'} — ampliar, descargar o regenerar individualmente.`,
      done: hasInfographics,
      href: `/projects/${id}/infographics`,
      locked: !storyboardApproved,
      lockedReason: 'Requiere el storyboard aprobado.',
    },
    {
      number: 5,
      label: 'Descargar Propuesta PPT',
      description: 'Empaqueta todas las infografias en un archivo PowerPoint listo para presentar.',
      done: false,
      href: `/projects/${id}/presentation/technical`,
      locked: !hasInfographics,
      lockedReason: 'Requiere tener infografias generadas.',
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

        {/* Flujo de propuesta */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Propuesta</h2>
          <div className="space-y-3">
            {steps.map((step) => (
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
                        {step.done ? 'Ver' : 'Ir →'}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
