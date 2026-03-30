import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/actions/auth'

export async function AppHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-3">
      <div>
        <p className="text-sm text-gray-500">{user.email}</p>
        {isAdmin && (
          <p className="text-xs font-medium text-blue-600">Administrador</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <Link
              href="/admin/ai-usage"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Bitácora de IA
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Usuarios
            </Link>
          </>
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
    </header>
  )
}
