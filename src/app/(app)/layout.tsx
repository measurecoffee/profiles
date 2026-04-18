import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/ui/sidebar'
import AppShell from '@/components/ui/app-shell'
import BottomNav from '@/components/ui/bottom-nav'
import AppShellProvider from './shell-provider'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  const user = session.user
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'

  // Fetch tier from profiles table
  let userTier = 'trial'
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single()
    if (profile?.subscription_tier) {
      userTier = profile.subscription_tier
    }
  } catch {
    // Profile may not exist yet — default to trial
  }

  return (
    <AppShellProvider
      pathname="placeholder"
      userName={userName}
      userTier={userTier}
    >
      {children}
    </AppShellProvider>
  )
}