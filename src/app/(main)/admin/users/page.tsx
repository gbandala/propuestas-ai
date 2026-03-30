import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listUsers } from '@/actions/admin-users'
import { UserManager } from './UserManager'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const result = await listUsers()

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Proyectos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="mt-1 text-sm text-gray-500">Solo los administradores pueden crear y eliminar usuarios.</p>

        <div className="mt-8">
          {'error' in result ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {result.error}
              {result.error.includes('SERVICE_ROLE_KEY') && (
                <p className="mt-2">
                  Agrega <code className="bg-red-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> a tu{' '}
                  <code className="bg-red-100 px-1 rounded">.env.local</code>.<br />
                  Lo encuentras en: Supabase Dashboard → Project Settings → API → service_role key.
                </p>
              )}
            </div>
          ) : (
            <UserManager initialUsers={result.data} />
          )}
        </div>
      </div>
    </div>
  )
}
