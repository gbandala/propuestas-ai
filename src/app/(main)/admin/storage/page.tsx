import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStorageDashboard } from '@/actions/admin'
import { StorageDashboard } from '@/features/admin/components/StorageDashboard'

export default async function StoragePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const result = await getStorageDashboard()
  const dashboardData = 'data' in result ? result.data : null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <Link href="/admin/ai-usage" className="text-sm text-gray-500 hover:text-gray-700">
                ← Bitácora de IA
              </Link>
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
                Dashboard
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Gestión de Storage</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitorea el uso del bucket, archiva propuestas y elimina proyectos elegibles para liberar espacio.
            </p>
          </div>
        </div>

        {dashboardData ? (
          <StorageDashboard data={dashboardData} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            {'error' in result ? result.error : 'No se pudo cargar la información de storage.'}
          </div>
        )}

      </div>
    </div>
  )
}
