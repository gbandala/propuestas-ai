import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/shared/components/AppHeader'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (user) {
    const isGoogleUser = user.app_metadata?.provider === 'google' ||
      (user.app_metadata?.providers as string[] | undefined)?.includes('google')

    if (!isGoogleUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profile?.must_change_password) {
        redirect('/update-password')
      }
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main>{children}</main>
    </div>
  )
}
