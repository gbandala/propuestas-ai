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

  const isArchitect = profile?.role === 'architect' || profile?.role === 'admin'
  const technicalDone = !!project.technical_completed_at

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

        {/* Fases */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Fase Técnica */}
          <div className={`rounded-lg border-2 p-6 ${technicalDone ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Fase Técnica</h2>
              {technicalDone && (
                <span className="text-sm font-medium text-green-600">✓ Completada</span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Brief técnico, infografías y presentación para el equipo de arquitectura.
            </p>
            <div className="mt-4">
              {isArchitect ? (
                <Link
                  href={`/projects/${id}/technical`}
                  className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {technicalDone ? 'Ver brief técnico' : 'Completar brief técnico →'}
                </Link>
              ) : (
                <span className="text-sm text-gray-500">
                  {technicalDone ? 'Brief técnico completado' : 'Pendiente de completar por el arquitecto'}
                </span>
              )}
            </div>
          </div>

          {/* Fase Comercial */}
          <div className={`rounded-lg border-2 p-6 ${
            !technicalDone
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : project.commercial_completed_at
              ? 'border-green-200 bg-green-50'
              : 'border-purple-200 bg-purple-50'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Fase Comercial</h2>
              {project.commercial_completed_at && (
                <span className="text-sm font-medium text-green-600">✓ Completada</span>
              )}
              {!technicalDone && (
                <span className="text-xs text-gray-400">🔒 Bloqueada</span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Propuesta comercial, infografías de ROI y presentación ejecutiva para el cliente.
            </p>
            <div className="mt-4">
              {!technicalDone ? (
                <p className="text-xs text-gray-400">
                  Requiere la fase técnica completada para habilitarse.
                </p>
              ) : (
                <Link
                  href={`/projects/${id}/commercial`}
                  className="inline-flex rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  {project.commercial_completed_at ? 'Ver propuesta comercial' : 'Completar propuesta comercial →'}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-8 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Información del proyecto</h3>
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
