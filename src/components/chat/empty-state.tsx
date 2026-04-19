'use client'

import { Coffee } from 'lucide-react'
import { COFFEE_AGENT_NAME } from '@/lib/agent/brand'

interface EmptyStateProps {
  onSuggestionClick: (text: string) => void
}

const suggestions = [
  'Help me dial in my espresso',
  'Equipment recommendations',
  'Troubleshoot my brew',
]

export default function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-border-strong bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] shadow-[0_18px_32px_rgba(18,15,12,0.14)]">
        <Coffee className="h-7 w-7 text-gold" aria-hidden="true" />
      </div>
      <div className="space-y-3">
        <p className="tech-label">Personal coffee workspace</p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.05em] text-text-primary">
          What are you brewing today?
        </h2>
        <p className="mx-auto max-w-xl text-sm leading-6 text-text-secondary">
          Ask {COFFEE_AGENT_NAME} about recipes, equipment, troubleshooting, or cafe workflows.
          The session remembers your setup and can pull in calculator context.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="tech-chip-button px-4"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
