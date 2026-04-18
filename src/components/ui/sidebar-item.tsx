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
    'flex items-center gap-3 min-h-[44px] px-3 rounded-md transition-colors duration-150',
    active
      ? 'bg-latte text-accent'
      : 'text-text-secondary hover:bg-surface-muted',
  ].join(' ')

  if (collapsed) {
    return (
      <Link
        href={hasChildren ? '#' : href}
        onClick={handleClick}
        className={baseClasses + ' justify-center'}
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
        <span className="text-sm font-medium truncate">{label}</span>
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