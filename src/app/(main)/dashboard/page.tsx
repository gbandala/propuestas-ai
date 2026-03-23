import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectList } from '@/features/projects/components'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  return (
    <div className="min-h-screen p-8">
      {profile?.role === 'admin' && (
        <div className="mb-6 flex justify-end">
          <Link
            href="/admin/ai-usage"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Bitácora de IA
          </Link>
        </div>
      )}
      <ProjectList />
    </div>
  )
}
