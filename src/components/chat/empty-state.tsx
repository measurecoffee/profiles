'use client'

import { Coffee } from 'lucide-react'

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
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <Coffee className="h-14 w-14 text-accent opacity-50" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-espresso">
          What are you brewing today?
        </h2>
        <p className="text-sm text-text-secondary">
          Ask me anything about coffee — brewing, beans, equipment, or troubleshooting.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-1.5 text-sm text-text-secondary border border-border rounded-full
                hover:bg-latte hover:border-border-hover hover:text-text-primary
                transition-colors duration-150"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}