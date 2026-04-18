'use client'

import { useState, createContext, useContext, type ReactNode } from 'react'
import { Coffee, ChevronsLeft, ChevronsRight, MessageCircle, FlaskConical, User, Settings } from 'lucide-react'
import SidebarItem from './sidebar-item'

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

interface SidebarProps {
  pathname: string
  userName?: string
  userTier?: string
}

const navItems = [
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: FlaskConical, label: 'Brewing Calculator', href: '/calculator' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

// Map route prefixes to nav items for active detection
function isActive(pathname: string, href: string): boolean {
  // Exact match or sub-path
  if (pathname === href || pathname.startsWith(href + '/')) return true
  // /chat is the default/root
  if (href === '/chat' && (pathname === '/' || pathname === '/(app)')) return true
  return false
}

export default function Sidebar({ pathname, userName, userTier }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'MC'

  const tierBadge = userTier || 'trial'
  const tierLabel =
    tierBadge === 'tier1'
      ? 'Basic'
      : tierBadge === 'tier2'
        ? 'Pro'
        : tierBadge === 'expired_trial'
          ? 'Expired'
          : 'Free'

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <aside
        data-collapsed={collapsed}
        className={[
          'hidden lg:flex flex-col fixed left-0 top-0 h-full z-30',
          'bg-surface border-r border-border',
          'transition-all duration-200 ease-out',
          collapsed ? 'w-16' : 'w-60',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
          <Coffee className="h-6 w-6 text-accent shrink-0" />
          {!collapsed && (
            <span className="font-[family-name:var(--font-display)] text-lg text-espresso whitespace-nowrap overflow-hidden">
              measure.coffee
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Bottom: User info + Collapse toggle */}
        <div className="border-t border-border px-2 py-3 shrink-0">
          {/* User */}
          <div className="flex items-center gap-3 px-2 min-h-[44px]">
            <div className="w-8 h-8 rounded-full bg-copper text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-sm font-medium text-text-primary truncate">
                  {userName || 'User'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-latte text-accent whitespace-nowrap">
                  {tierLabel}
                </span>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-2 flex items-center justify-center w-full min-h-[44px] rounded-md hover:bg-surface-muted transition-colors duration-150"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5 text-text-muted" />
            ) : (
              <ChevronsLeft className="h-5 w-5 text-text-muted" />
            )}
          </button>
        </div>
      </aside>
    </SidebarContext.Provider>
  )
}