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
        'relative min-h-screen overflow-hidden transition-[margin] duration-200 ease-out',
        'pb-24 lg:pb-0',
        collapsed ? 'lg:ml-[88px]' : 'lg:ml-80',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 border-b border-border/60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10rem] top-8 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(163,111,40,0.22),_transparent_68%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,_rgba(184,178,160,0.12)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(184,178,160,0.12)_1px,_transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.45),transparent_82%)]"
      />
      <div className="relative mx-auto w-full max-w-[108rem] px-4 pb-8 pt-4 md:px-6 lg:px-8 lg:pt-6">
        {children}
      </div>
    </div>
  )
}
