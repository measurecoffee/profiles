'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/ui/sidebar'
import AppShell from '@/components/ui/app-shell'
import BottomNav from '@/components/ui/bottom-nav'

interface AppShellProviderProps {
  children: React.ReactNode
  userName: string
  userTier: string
  pathname: string // not used — we read from client hook
}

export default function AppShellProvider({
  children,
  userName,
  userTier,
}: AppShellProviderProps) {
  const pathname = usePathname()

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-surface focus:text-text-primary"
      >
        Skip to content
      </a>
      <Sidebar pathname={pathname} userName={userName} userTier={userTier} />
      <AppShell>
        <div id="main-content" className="page-enter">
          {children}
        </div>
      </AppShell>
      <BottomNav />
    </>
  )
}