'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Coffee,
  FlaskConical,
  MessageCircle,
  Plus,
  Settings,
  User,
} from 'lucide-react'
import SidebarItem from './sidebar-item'

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (value: boolean) => void
}

interface ChatThreadSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessageAt: string | null
  preview: string | null
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

const navItems = [
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: FlaskConical, label: 'Brewing Calculator', href: '/calculator' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

function isActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(href + '/')) return true
  if (href === '/chat' && (pathname === '/' || pathname === '/(app)')) return true
  return false
}

function getActiveThreadId(pathname: string): string | null {
  if (!pathname.startsWith('/chat/')) return null
  const [, , id] = pathname.split('/')
  return id || null
}

function formatThreadTimestamp(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function ChatHistorySubsection({
  collapsed,
  pathname,
}: {
  collapsed: boolean
  pathname: string
}) {
  const [expanded, setExpanded] = useState(true)
  const [threads, setThreads] = useState<ChatThreadSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadThreads() {
      setLoading(true)
      try {
        const response = await fetch('/api/chat/threads', { cache: 'no-store' })
        if (!response.ok) {
          if (!cancelled) setThreads([])
          return
        }

        const payload = (await response.json()) as { threads?: ChatThreadSummary[] }
        if (!cancelled) {
          setThreads(Array.isArray(payload.threads) ? payload.threads : [])
        }
      } catch {
        if (!cancelled) setThreads([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadThreads()
    return () => {
      cancelled = true
    }
  }, [pathname])

  if (collapsed) return null

  const activeThreadId = getActiveThreadId(pathname)

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex items-center gap-1 w-full px-3 py-1 text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`}
          aria-hidden="true"
        />
        Recent
      </button>

      {expanded && (
        <div className="space-y-0.5">
          {loading && (
            <p className="px-3 py-1 text-[11px] text-text-muted">Loading conversations...</p>
          )}

          {!loading && threads.length === 0 && (
            <p className="px-3 py-1 text-[11px] text-text-muted">No saved conversations yet.</p>
          )}

          {!loading &&
            threads.map((thread) => {
              const href = `/chat/${thread.id}`
              const isThreadActive = activeThreadId === thread.id
              return (
                <div key={thread.id} className="px-1">
                  <Link
                    href={href}
                    className={[
                      'flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors duration-150',
                      isThreadActive
                        ? 'bg-latte text-accent'
                        : 'text-text-secondary hover:bg-surface-muted',
                    ].join(' ')}
                  >
                    <MessageCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{thread.title}</span>
                    <span className="ml-auto text-[10px] text-text-muted font-[family-name:var(--font-mono)]">
                      {formatThreadTimestamp(thread.lastMessageAt || thread.updatedAt)}
                    </span>
                  </Link>
                  {thread.preview && (
                    <p className="pl-7 pr-2 pb-1 text-[10px] text-text-muted truncate">
                      {thread.preview}
                    </p>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}

interface SidebarProps {
  pathname: string
  userName?: string
  userTier?: string
}

export default function Sidebar({ pathname, userName, userTier }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const initials = userName
    ? userName
        .split(' ')
        .map((name) => name[0])
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
        <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
          <Coffee className="h-6 w-6 text-accent shrink-0" aria-hidden="true" />
          {!collapsed && (
            <span className="font-[family-name:var(--font-display)] text-lg text-espresso whitespace-nowrap overflow-hidden">
              measure.coffee
            </span>
          )}
        </div>

        {!collapsed && (
          <div className="px-2 pt-3">
            <Link
              href="/chat?new=1"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-accent border border-border rounded-md hover:bg-latte transition-colors duration-150"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Chat
            </Link>
          </div>
        )}

        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const isChatItem = item.href === '/chat'
            return (
              <div key={item.href}>
                <SidebarItem
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  active={isActive(pathname, item.href)}
                  collapsed={collapsed}
                />
                {isChatItem && isActive(pathname, item.href) && (
                  <ChatHistorySubsection collapsed={collapsed} pathname={pathname} />
                )}
                {isChatItem && index < navItems.length - 1 && (
                  <div className="my-2 border-t border-border" />
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-border px-2 py-3 shrink-0">
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
