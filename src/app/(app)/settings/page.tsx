'use client'

import Link from 'next/link'
import { ChevronRight, LogOut, SlidersHorizontal, User, Shield } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-muted">
          Workspace Controls
        </p>
        <h1 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-espresso">
          Settings
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Manage account preferences and access advanced profile configuration.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <Link
          href="/profile"
          className="flex items-center gap-3 border-b border-border px-5 py-4 hover:bg-surface-muted transition-colors"
        >
          <User className="h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Profile</p>
            <p className="text-xs text-text-muted">View your coffee identity and plan details</p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
        </Link>

        <Link
          href="/settings/advanced-profile"
          className="flex items-center gap-3 border-b border-border px-5 py-4 hover:bg-surface-muted transition-colors"
        >
          <SlidersHorizontal className="h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Advanced Profile Settings</p>
            <p className="text-xs text-text-muted">
              Inspect and manage L1/L2/L3 memory configuration
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
        </Link>

        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Shield className="h-5 w-5 text-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Privacy</p>
            <p className="text-xs text-text-muted">
              Measure Barista memory controls are available in Advanced Profile Settings
            </p>
          </div>
        </div>

        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-destructive hover:bg-surface-muted transition-colors"
          >
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
