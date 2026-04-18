'use client'

export default function TypingIndicator() {
  return (
    <div className="flex justify-start items-end gap-2 message-enter">
      <div className="w-8 shrink-0" /> {/* spacer for avatar alignment */}
      <div className="bg-surface border border-border rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-accent" />
          <span className="typing-dot w-2 h-2 rounded-full bg-accent" style={{ animationDelay: '150ms' }} />
          <span className="typing-dot w-2 h-2 rounded-full bg-accent" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}