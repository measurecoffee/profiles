'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Coffee,
  FlaskConical,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Settings,
  User,
} from 'lucide-react'
import type { ActiveContextSummary } from '@/lib/profile/active-context'
import { COFFEE_AGENT_NAME } from '@/lib/agent/brand'
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
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FlaskConical, label: 'Calculators', href: '/calculator' },
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
    if (collapsed) {
      setLoading(false)
      return
    }

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
  }, [collapsed, pathname])

  if (collapsed) return null

  const activeThreadId = getActiveThreadId(pathname)

  return (
    <div className="mx-2 mb-2 border-l border-border pl-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-1 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted-high transition-colors hover:text-text-primary"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          Recent Threads
        </button>
        <Link
          href="/chat?new=1"
          className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-border px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary hover:border-border-strong hover:bg-white/70"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New
        </Link>
      </div>

      {expanded && (
        <div className="space-y-1 pb-2">
          {loading && (
            <p className="py-1 text-[11px] text-text-muted">Loading conversations...</p>
          )}

          {!loading && threads.length === 0 && (
            <p className="py-1 text-[11px] text-text-muted">No saved conversations yet.</p>
          )}

          {!loading &&
            threads.map((thread) => {
              const href = `/chat/${thread.id}`
              const isThreadActive = activeThreadId === thread.id
              return (
                <div key={thread.id}>
                  <Link
                    href={href}
                    className={[
                      'flex items-center gap-2 rounded-[14px] border px-2.5 py-2 text-xs transition-all duration-150',
                      isThreadActive
                        ? 'border-border-strong bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] text-[color:var(--color-background)]'
                        : 'border-transparent text-text-secondary hover:border-border hover:bg-white/72 hover:text-text-primary',
                    ].join(' ')}
                  >
                    <MessageCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{thread.title}</span>
                    <span
                      className={[
                        'ml-auto text-[10px] font-[family-name:var(--font-mono)]',
                        isThreadActive
                          ? 'text-[color:rgba(244,240,228,0.7)]'
                          : 'text-text-muted-high',
                      ].join(' ')}
                    >
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
  activeContextSummary?: ActiveContextSummary | null
}

export default function Sidebar({
  pathname,
  userName,
  userTier,
  activeContextSummary,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('measure.sidebar.collapsed') === '1'
  })

  useEffect(() => {
    window.localStorage.setItem('measure.sidebar.collapsed', collapsed ? '1' : '0')
  }, [collapsed])

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
          : 'Trial'

  const hasContextSummary = Boolean(
    activeContextSummary?.currentFocus ||
      activeContextSummary?.sessionHint ||
      (activeContextSummary?.activeIssues?.length ?? 0) > 0
  )

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <aside
        data-collapsed={collapsed}
        className={[
          'hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col',
          'border-r border-border bg-[rgba(255,255,255,0.74)] backdrop-blur-xl',
          'transition-[width] duration-200 ease-out',
          collapsed ? 'w-[88px]' : 'w-80',
        ].join(' ')}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,_rgba(184,178,160,0.14)_1px,_transparent_1px)] bg-[size:48px_48px] opacity-60"
        />

        <div className="relative flex min-h-[88px] items-center gap-3 border-b border-border px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-border-strong bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] shadow-[0_18px_30px_rgba(18,15,12,0.12)]">
            <Coffee className="h-5 w-5 text-gold" aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-[-0.04em] text-text-primary font-[family-name:var(--font-display)] lowercase">
                measure workspace.
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-text-muted-high">
                <span>measure/core</span>
                <span>{tierLabel.toLowerCase()}/plan</span>
                <span>{COFFEE_AGENT_NAME.toLowerCase()}</span>
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="relative px-4 pt-4">
            <Link
              href="/chat?new=1"
              className="tech-button-primary flex w-full items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Conversation
            </Link>
          </div>
        )}

        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
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
                {isChatItem && (
                  <ChatHistorySubsection collapsed={collapsed} pathname={pathname} />
                )}
              </div>
            )
          })}

          {!collapsed && hasContextSummary && activeContextSummary && (
            <div className="tech-card-muted tech-card-grid mx-2 mt-4 p-4">
              <p className="tech-label">
                Active Context
              </p>
              <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-text-primary">
                {activeContextSummary.currentFocus || 'Active coffee conversation'}
              </p>
              {activeContextSummary.sessionHint && (
                <p className="mt-2 text-[13px] leading-6 text-text-secondary">
                  {activeContextSummary.sessionHint}
                </p>
              )}
              {activeContextSummary.activeIssues.length > 0 && (
                <p className="mt-3 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.14em] text-text-muted-high">
                  Issues: {activeContextSummary.activeIssues.slice(0, 2).join(' / ')}
                </p>
              )}
            </div>
          )}
        </nav>

        <div className="relative border-t border-border p-3">
          <div className="tech-card-muted flex min-h-[60px] items-center gap-3 px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] text-xs font-semibold text-background shadow-[0_16px_28px_rgba(18,15,12,0.14)]">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {userName || 'User'}
                </p>
                <span className="tech-chip mt-1">
                  {tierLabel}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="tech-button-secondary mt-3 flex w-full items-center justify-center"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5" />
            ) : (
              <ChevronsLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>
    </SidebarContext.Provider>
  )
}
