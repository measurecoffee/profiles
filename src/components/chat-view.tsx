'use client'

import { useState, useRef, useEffect } from 'react'
import { Coffee, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  message?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    remainingBudget: number
  }
  tier?: string
  model?: string
  upgrade_message?: string
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface border border-border rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<ChatResponse['usage']>()
  const [tier, setTier] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages, loading])

  useEffect(() => {
    if (!initialized) {
      setInitialized(true)
      sendMessage('Hi! I just signed up.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data: ChatResponse = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.upgrade_message || 'Token budget exceeded')
        } else {
          setError(data.error || 'Something went wrong')
        }
        return
      }

      if (data.message) {
        setMessages([...newMessages, { role: 'assistant', content: data.message }])
      }
      setUsage(data.usage)
      setTier(data.tier || '')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-[calc(100vh)] -m-4 md:-m-6 lg:-m-8">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-accent" />
          <div>
            <h1 className="text-sm font-semibold text-text-primary font-[family-name:var(--font-display)]">
              measure.coffee
            </h1>
            <p className="text-xs text-text-muted">
              {tier && `${tier}`}
              {usage && ` · ${usage.remainingBudget?.toLocaleString()} tokens left`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
        {messages.length === 0 && !loading && (
          <div className="text-center text-text-muted mt-12">
            <Coffee className="h-12 w-12 mx-auto mb-3 text-accent opacity-40" />
            <p className="text-lg font-[family-name:var(--font-display)] text-espresso mb-2">Starting your coffee profile...</p>
            <p className="text-sm">I&apos;ll ask a few questions so I can give you personalized advice.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={[
                'max-w-[80%] rounded-2xl px-4 py-2.5',
                msg.role === 'user'
                  ? 'bg-accent text-cream'
                  : 'bg-surface border border-border text-text-primary',
              ].join(' ')}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="text-center">
            <p className="text-sm text-destructive bg-red-50 rounded-lg px-4 py-2 inline-block">{error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-surface p-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about coffee..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-border rounded-full bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-accent text-cream rounded-full font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}