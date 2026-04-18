'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, FlaskConical, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface BottomNavItem {
  icon: LucideIcon
  label: string
  href: string
}

const items: BottomNavItem[] = [
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: FlaskConical, label: 'Calculator', href: '/calculator' },
  { icon: User, label: 'Profile', href: '/profile' },
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
        'lg:hidden fixed bottom-0 left-0 right-0 z-40',
        'flex items-center justify-around',
        'h-16 bg-surface border-t border-border',
        'pb-[env(safe-area-inset-bottom)]',
      ].join(' ')}
    >
      {items.map((item) => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex flex-col items-center justify-center',
              'min-w-[44px] min-h-[44px] px-3 py-1',
              'transition-colors duration-150',
              active ? 'text-accent' : 'text-text-muted',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}