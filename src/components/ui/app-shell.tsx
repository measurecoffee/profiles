'use client'

import { useSidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { collapsed } = useSidebar()

  return (
    <div
      className={[
        // Desktop: offset for sidebar, Mobile: full width with bottom nav spacing
        'min-h-screen transition-[margin] duration-200 ease-out',
        'pb-16 lg:pb-0',
        collapsed ? 'lg:ml-16' : 'lg:ml-60',
      ].join(' ')}
    >
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </div>
  )
}