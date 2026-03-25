import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { ProjectAiUsageWidget } from '@/shared/components/ProjectAiUsageWidget'

interface PresentationPageProps {
  params: Promise<{ id: string }>
}

export default async function PresentationPage({ params }: PresentationPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [projectResult, storyboardResult, infographicsResult] = await Promise.all([
    getProjectById(id),
    supabase
      .from('storyboards')
      .select('id, approved_at')
      .eq('project_id', id)
      .eq('type', 'infographic')
      .not('approved_at', 'is', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('infographics')
      .select('id, slide_index, url')
      .eq('project_id', id)
      .not('slide_index', 'is', null)
      .not('url', 'is', null)
      .order('slide_index', { ascending: true }),
  ])

  if ('error' in projectResult) notFound()

  const project = projectResult.data

  // Guard: storyboard no aprobado
  if (!storyboardResult.data) {
    redirect(`/projects/${id}/storyboard?type=infographic`)
  }

  // Guard: sin infografías generadas
  if (!infographicsResult.data || infographicsResult.data.length === 0) {
    redirect(`/projects/${id}/infographics`)
  }

  const infographics = infographicsResult.data
  const downloadUrl = `/api/presentation/download-pptx?projectId=${id}&type=proposal`

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
          <div className="min-w-0 space-y-6">
            {/* Header */}
            <div>
              <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
                &larr; {project.name}
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">Descargar Propuesta PPT</h1>
              <p className="mt-1 text-sm text-gray-500">
                {infographics.length} slides listos. Descarga el archivo PowerPoint con todas las infografías en orden.
              </p>
            </div>

            {/* Download card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {project.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {infographics.length} slides · formato .pptx
                  </p>
                </div>
                <a
                  href={downloadUrl}
                  download
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar PPT
                </a>
              </div>
            </div>

            {/* Preview grid */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Vista previa — {infographics.length} slides
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {infographics.map((inf) => (
                  <div key={inf.id} className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                    <div className="relative aspect-[4/3] bg-gray-50">
                      <Image
                        src={inf.url!}
                        alt={`Slide ${inf.slide_index}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="px-2 py-1.5 text-center">
                      <span className="text-xs font-medium text-gray-500">Slide {inf.slide_index}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Back link */}
            <div className="flex items-center gap-4 pt-2">
              <Link
                href={`/projects/${id}/infographics`}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Volver a infografías
              </Link>
              <Link
                href={`/projects/${id}`}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Volver al proyecto
              </Link>
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
