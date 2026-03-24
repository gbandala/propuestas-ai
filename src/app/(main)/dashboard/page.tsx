import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectList } from '@/features/projects/components'
import { signout } from '@/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {user?.email}
          {profile?.role && (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {profile.role}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {profile?.role === 'admin' && (
            <Link
              href="/admin/ai-usage"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Bitácora de IA
            </Link>
          )}
          <form action={signout}>
            <button
              type="submit"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
      <ProjectList />
    </div>
  )
}
