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
      <Sidebar pathname={pathname} userName={userName} userTier={userTier} />
      <AppShell>{children}</AppShell>
      <BottomNav />
    </>
  )
}