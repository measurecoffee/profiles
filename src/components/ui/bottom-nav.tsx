'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, FlaskConical, Settings, User, LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface BottomNavItem {
  icon: LucideIcon
  label: string
  href: string
}

const items: BottomNavItem[] = [
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: LayoutDashboard, label: 'Dash', href: '/dashboard' },
  { icon: FlaskConical, label: 'Calc', href: '/calculator' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (pathname === href || pathname.startsWith(href + '/')) return true
    if (href === '/chat' && (pathname === '/' || pathname === '/(app)')) return true
    return false
  }

  return (
    <nav
      className={[
        'lg:hidden fixed bottom-3 left-3 right-3 z-40',
        'tech-card border px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]',
        'grid grid-cols-5 items-center gap-1',
      ].join(' ')}
    >
      {items.map((item) => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={[
              'flex min-h-[52px] flex-col items-center justify-center rounded-[16px] border px-2 py-1.5',
              'transition-all duration-150',
              active
                ? 'border-border-strong bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] text-background shadow-[0_14px_24px_rgba(18,15,12,0.14)]'
                : 'border-transparent text-text-muted hover:border-border hover:bg-white/72 hover:text-text-primary',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em]">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
