'use client'

export default function TypingIndicator() {
  return (
    <div className="message-enter flex items-end justify-start gap-3">
      <div className="w-9 shrink-0" />
      <div className="tech-card-muted rounded-[22px] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-accent" />
          <span className="typing-dot w-2 h-2 rounded-full bg-accent" style={{ animationDelay: '150ms' }} />
          <span className="typing-dot w-2 h-2 rounded-full bg-accent" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
