import { createClient } from '@/lib/supabase/server'
import {
  summarizeActiveContext,
  type ActiveContextSummary,
} from '@/lib/profile/active-context'
import { redirect } from 'next/navigation'
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
  let activeContextSummary: ActiveContextSummary | null = null
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, active_context')
      .eq('user_id', user.id)
      .single()
    if (profile?.subscription_tier) {
      userTier = profile.subscription_tier
    }
    activeContextSummary = summarizeActiveContext(profile?.active_context)
  } catch {
    // Profile may not exist yet — default to trial
  }

  return (
    <AppShellProvider
      userName={userName}
      userTier={userTier}
      activeContextSummary={activeContextSummary}
    >
      {children}
    </AppShellProvider>
  )
}
