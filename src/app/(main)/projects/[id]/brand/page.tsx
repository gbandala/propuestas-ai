import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { getBrandIdentity, saveBrandIdentity, initBrandIdentity } from '@/actions/brand-identity'
import { BrandIdentityEditor } from '@/features/brand-identity/components'

interface BrandPageProps {
  params: Promise<{ id: string }>
}

export default async function BrandIdentityPage({ params }: BrandPageProps) {
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

  const [projectResult, brandResult] = await Promise.all([
    getProjectById(id),
    getBrandIdentity(id),
  ])

  if ('error' in projectResult) notFound()

  const project = projectResult.data
  const brandData = 'data' in brandResult ? brandResult.data : null

  // Si no existe, pre-cargar la plantilla base
  if (!brandData) {
    await initBrandIdentity(id)
  }

  const initialBrand = brandData ?? null

  async function handleSave(markdown: string) {
    'use server'
    await saveBrandIdentity(id, markdown)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← {project.name}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Identidad de Marca</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define los colores, tipografia y estilo visual del cliente. Se usa en todas las infografias generadas.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <BrandIdentityEditor
            projectId={id}
            initial={initialBrand ? {
              ...initialBrand,
              project_id: id,
              created_at: '',
              updated_at: '',
            } : null}
            onSave={handleSave}
          />
        </div>

        <div className="flex justify-end">
          <Link
            href={`/projects/${id}/brief`}
            className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continuar al Brief →
          </Link>
        </div>
      </div>
    </div>
  )
}
