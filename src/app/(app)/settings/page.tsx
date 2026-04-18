'use client'

import { Settings, LogOut, User, Bell, Shield } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] text-espresso mb-1">
          Settings
        </h1>
        <p className="text-text-secondary text-sm">
          Manage your account and preferences.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl divide-y divide-border">
        <a href="/account/profile" className="flex items-center gap-3 px-5 py-4 hover:bg-surface-muted transition-colors">
          <User className="h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Profile</p>
            <p className="text-xs text-text-muted">View and edit your coffee identity</p>
          </div>
        </a>
        <button className="flex items-center gap-3 px-5 py-4 w-full text-left hover:bg-surface-muted transition-colors">
          <Bell className="h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Notifications</p>
            <p className="text-xs text-text-muted">Manage notification preferences</p>
          </div>
        </button>
        <button className="flex items-center gap-3 px-5 py-4 w-full text-left hover:bg-surface-muted transition-colors">
          <Shield className="h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Privacy</p>
            <p className="text-xs text-text-muted">Control what your agent remembers</p>
          </div>
        </button>
        <form action="/auth/logout" method="post">
          <button type="submit" className="flex items-center gap-3 px-5 py-4 w-full text-left hover:bg-surface-muted transition-colors text-destructive">
            <LogOut className="h-5 w-5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Sign out</p>
            </div>
          </button>
        </form>
      </div>
    </div>
  )
}