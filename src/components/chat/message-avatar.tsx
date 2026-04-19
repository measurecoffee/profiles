'use client'

import { Coffee } from 'lucide-react'

interface MessageAvatarProps {
  role: 'user' | 'assistant'
  userName?: string
}

export default function MessageAvatar({ role, userName = 'User' }: MessageAvatarProps) {
  if (role === 'assistant') {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-border-strong bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] shadow-[0_16px_28px_rgba(18,15,12,0.12)]">
        <Coffee className="h-4 w-4 text-gold" aria-hidden="true" />
      </div>
    )
  }

  const initial = userName.charAt(0).toUpperCase()

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-border-strong bg-[rgba(255,255,255,0.74)] text-xs font-semibold text-text-primary">
      {initial}
    </div>
  )
}
