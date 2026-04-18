'use client'

import { useState, useRef, useEffect } from 'react'
import { Coffee, Send } from 'lucide-react'
import MessageAvatar from '@/components/chat/message-avatar'
import TypingIndicator from '@/components/chat/typing-indicator'
import EmptyState from '@/components/chat/empty-state'
import MarkdownRenderer from '@/components/chat/markdown-renderer'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function shouldShowTimestamp(msgs: Message[], index: number): boolean {
  if (index === 0) return true
  const prev = msgs[index - 1]
  const curr = msgs[index]
  // Show if different minute or different sender
  const prevMinute = prev.timestamp.getMinutes()
  const currMinute = curr.timestamp.getMinutes()
  return prevMinute !== currMinute || prev.role !== curr.role
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

    const userMessage: Message = { role: 'user', content: text.trim(), timestamp: new Date() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(({ role, content }) => ({ role, content })) }),
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
        setMessages([...newMessages, { role: 'assistant', content: data.message, timestamp: new Date() }])
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

  const handleSuggestionClick = (text: string) => {
    sendMessage(text)
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-[calc(100vh)] -m-4 md:-m-6 lg:-m-8">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-accent" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-semibold text-text-primary font-[family-name:var(--font-display)]">
              measure.coffee
            </h1>
            <p className="text-xs text-text-muted-high">
              {tier && `${tier}`}
              {usage && ` · ${usage.remainingBudget?.toLocaleString()} tokens left`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-background">
        {isEmpty && <EmptyState onSuggestionClick={handleSuggestionClick} />}

        {messages.map((msg, i) => {
          const showTimestamp = shouldShowTimestamp(messages, i)
          const isUser = msg.role === 'user'

          return (
            <div key={i} className={`message-enter flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {/* Avatar — left for agent, hidden for user (user avatar on right) */}
              {!isUser && <MessageAvatar role="assistant" />}

              <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={[
                    'rounded-2xl px-4 py-2.5',
                    isUser
                      ? 'bg-accent text-cream'
                      : 'bg-surface border border-border text-text-primary',
                  ].join(' ')}
                >
                  {isUser ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>
                {showTimestamp && (
                  <p className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted-high mt-0.5 px-1">
                    {formatTime(msg.timestamp)}
                  </p>
                )}
              </div>

              {/* User avatar on the right */}
              {isUser && <MessageAvatar role="user" />}
            </div>
          )
        })}

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