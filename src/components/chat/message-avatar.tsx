'use client'

import { Coffee } from 'lucide-react'

interface MessageAvatarProps {
  role: 'user' | 'assistant'
  userName?: string
}

export default function MessageAvatar({ role, userName = 'User' }: MessageAvatarProps) {
  if (role === 'assistant') {
    return (
      <div className="w-8 h-8 rounded-full bg-latte border border-border flex items-center justify-center shrink-0">
        <Coffee className="h-4 w-4 text-accent" aria-hidden="true" />
      </div>
    )
  }

  const initial = userName.charAt(0).toUpperCase()

  return (
    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold shrink-0">
      {initial}
    </div>
  )
}