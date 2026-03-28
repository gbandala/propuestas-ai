import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/actions/projects'
import { getBrandIdentity, saveBrandIdentity, initBrandIdentity } from '@/actions/brand-identity'
import { BrandIdentityEditor } from '@/features/brand-identity/components'
import { BrandImagesTab } from '@/features/brand-identity/components/BrandImagesTab'

interface BrandPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function BrandIdentityPage({ params, searchParams }: BrandPageProps) {
  const { id } = await params
  const { tab = 'identity' } = await searchParams

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

  if (!brandData) {
    await initBrandIdentity(id)
  }

  async function handleSave(markdown: string) {
    'use server'
    await saveBrandIdentity(id, markdown)
  }

  const tabs = [
    { key: 'identity', label: 'Identidad de Marca' },
    { key: 'images', label: 'Imágenes' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← {project.name}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Identidad de Marca</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define los colores, tipografía y estilo visual del cliente. Se usa en todas las infografías generadas.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/projects/${id}/brand?tab=${t.key}`}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                {t.key === 'images' && (brandData?.logo_url || brandData?.background_url) && (
                  <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-400" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {tab === 'identity' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <BrandIdentityEditor
              projectId={id}
              initial={brandData ? {
                ...brandData,
                logo_variants: [],
                background_variants: [],
                project_id: id,
                created_at: '',
                updated_at: '',
              } : null}
              onSave={handleSave}
            />
          </div>
        )}

        {tab === 'images' && (
          <BrandImagesTab
            projectId={id}
            initialLogoUrl={brandData?.logo_url ?? null}
            initialBgUrl={brandData?.background_url ?? null}
          />
        )}

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
