import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileContent from './profile-content'

interface Identity {
  name: string | null
  handle: string | null
  timezone: string | null
  roles: string[]
  communication_style: string | null
  active_projects: string[]
  profile_version: number
}

interface Profile {
  id: string
  user_id: string
  identity: Identity
  active_context: Record<string, unknown>
  deep_context: Record<string, Record<string, unknown>>
  sharing_allowlist: Record<string, string[]>
  advanced_config: boolean
  subscription_tier: string
  trial_started_at: string | null
  phone: string | null
  phone_verified: boolean
  profile_version: number
  updated_at: string
  updated_by: string
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return <ProfileContent profile={profile as Profile | null} email={user.email || ''} />
}