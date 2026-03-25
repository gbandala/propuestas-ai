import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { getBrief } from '@/actions/brief'
import { BriefForm } from '@/features/brief/components/BriefForm'
import { ProjectAiUsageWidget } from '@/shared/components/ProjectAiUsageWidget'

interface BriefPageProps {
  params: Promise<{ id: string }>
}

export default async function BriefPage({ params }: BriefPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [projectResult, briefResult] = await Promise.all([
    getProjectById(id),
    getBrief(id),
  ])

  if ('error' in projectResult) notFound()
  if ('error' in briefResult) notFound()

  const project = projectResult.data
  const brief = briefResult.data
  const briefCompleted = !!project.technical_completed_at

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
          {/* Contenido principal */}
          <div className="min-w-0 space-y-6">
            <div>
              <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
                ← {project.name}
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">Brief del Proyecto</h1>
              <p className="mt-1 text-sm text-gray-500">
                Describe el proyecto en texto libre. Usa las secciones como guía para incluir toda la información relevante.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <BriefForm
                projectId={id}
                initialContent={brief?.content ?? null}
                briefCompleted={briefCompleted}
              />
            </div>
          </div>

          {/* Sidebar */}
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
