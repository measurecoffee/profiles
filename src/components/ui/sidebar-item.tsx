'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  href: string
  active: boolean
  collapsed?: boolean
  children?: ReactNode
}

export default function SidebarItem({
  icon: Icon,
  label,
  href,
  active,
  collapsed = false,
  children,
}: SidebarItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = Boolean(children)

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault()
      setExpanded(!expanded)
    }
  }

  const baseClasses = [
    'group flex items-center gap-3 min-h-[48px] rounded-[18px] border px-3.5 transition-all duration-150',
    active
      ? 'border-border-strong bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] text-white shadow-[0_18px_32px_rgba(18,15,12,0.14)]'
      : 'border-transparent text-text-secondary hover:border-border hover:bg-white/72 hover:text-text-primary',
  ].join(' ')

  if (collapsed) {
    return (
      <Link
        href={hasChildren ? '#' : href}
        onClick={handleClick}
        className={baseClasses + ' justify-center px-0'}
        title={label}
        aria-label={label}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <div>
      <Link
        href={hasChildren ? '#' : href}
        onClick={handleClick}
        className={baseClasses}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="truncate text-sm font-medium tracking-[-0.02em]">{label}</span>
      </Link>

      {hasChildren && (
        <div
          className={[
            'overflow-hidden transition-all duration-200 ease-out',
            expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}
        >
          <div className="ml-8 mt-1 space-y-1">{children}</div>
        </div>
      )}
    </div>
  )
}
