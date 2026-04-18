'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Trash2, Moon, Sun, Bell, User, Shield } from 'lucide-react'

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

export default function SettingsContent({
  email,
  displayName,
  profile,
}: {
  email: string
  displayName: string | null
  profile: Profile | null
}) {
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    // TODO: Implement account deletion
    // For now, just sign out
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', isDarkMode ? 'light' : 'dark')
    }
  }

  const toggleNotifications = () => {
    setNotifications(!notifications)
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', String(!notifications))
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Account Section */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-text-primary mb-4">
          Account
        </h2>
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-text-muted-high">
                Display Name
              </label>
              <div className="mt-1 h-11 px-3 flex items-center bg-surface-muted border border-border rounded-md text-text-secondary">
                {displayName || 'Not set'}
              </div>
            </div>
            <div>
              <label className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-text-muted-high">
                Handle
              </label>
              <div className="mt-1 h-11 px-3 flex items-center bg-surface-muted border border-border rounded-md text-text-secondary">
                {profile?.identity?.handle || 'Not set'}
              </div>
            </div>
          </div>
          <div>
            <label className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-text-muted-high">
              Email
            </label>
            <div className="mt-1 h-11 px-3 flex items-center bg-surface-muted border border-border rounded-md text-text-secondary">
              {email}
            </div>
          </div>
          {profile?.phone && (
            <div>
              <label className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-text-muted-high">
                Phone
              </label>
              <div className="mt-1 h-11 px-3 flex items-center bg-surface-muted border border-border rounded-md text-text-secondary">
                {profile.phone}
                {profile.phone_verified && (
                  <span className="ml-2 text-xs text-success">✓ Verified</span>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-text-muted-high mt-2">
            <User className="inline w-3 h-3 mr-1" />
            Account details are managed through your profile.{' '}
            <a href="/profile" className="text-accent-dark hover:underline">
              View profile →
            </a>
          </p>
        </div>
      </section>

      {/* Preferences Section */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-text-primary mb-4">
          Preferences
        </h2>
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-5 h-5 text-accent" />
              ) : (
                <Sun className="w-5 h-5 text-accent" />
              )}
              <div>
                <p className="text-text-primary font-medium">Appearance</p>
                <p className="text-sm text-text-muted-high">
                  {isDarkMode ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              style={{ backgroundColor: isDarkMode ? 'var(--color-espresso)' : 'var(--color-latte)' }}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-border" />

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-accent" />
              <div>
                <p className="text-text-primary font-medium">Notifications</p>
                <p className="text-sm text-text-muted-high">
                  Receive updates about your profile
                </p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
              style={{ backgroundColor: notifications ? 'var(--color-accent)' : 'var(--color-latte)' }}
              aria-label="Toggle notifications"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-destructive mb-4">
          Danger Zone
        </h2>
        <div className="bg-surface border border-destructive/20 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary font-medium">Sign Out</p>
              <p className="text-sm text-text-muted-high">
                Sign out of your account on this device
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-text-primary hover:bg-surface-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-destructive font-medium">Delete Account</p>
              <p className="text-sm text-text-muted-high">
                Permanently delete your account and all data
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-destructive text-destructive hover:bg-destructive/10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-destructive/50"
              aria-label="Delete account"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">
                    Are you sure you want to delete your account?
                  </p>
                  <p className="text-sm text-text-muted-high mt-1">
                    This action cannot be undone. All your data, including your coffee profile and
                    conversation history, will be permanently deleted.
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 rounded-full bg-destructive text-white hover:bg-destructive/90 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-destructive/50"
                    >
                      Yes, delete my account
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-full border border-border text-text-primary hover:bg-surface-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}