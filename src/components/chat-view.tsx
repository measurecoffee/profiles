'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Coffee, Send } from 'lucide-react'
import MessageAvatar from '@/components/chat/message-avatar'
import TypingIndicator from '@/components/chat/typing-indicator'
import EmptyState from '@/components/chat/empty-state'
import MarkdownRenderer from '@/components/chat/markdown-renderer'
import {
  clearQueuedCalculatorContext,
  readQueuedCalculatorContext,
  type CalculatorContextPayload,
} from '@/lib/calculator/context'

const ONBOARDING_STARTER_MESSAGE = 'Hi! I just signed up.'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface InitialChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatViewProps {
  initialThreadId?: string | null
  initialMessages?: InitialChatMessage[]
}

interface ChatResponse {
  threadId?: string
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
  const previous = msgs[index - 1]
  const current = msgs[index]
  const elapsed = current.timestamp.getTime() - previous.timestamp.getTime()
  return elapsed >= 60_000 || previous.role !== current.role
}

function mapInitialMessages(initialMessages: InitialChatMessage[]): Message[] {
  return initialMessages.map((message) => ({
    role: message.role,
    content: message.content,
    timestamp: new Date(message.createdAt),
  }))
}

export default function ChatView({
  initialThreadId = null,
  initialMessages = [],
}: ChatViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromCalculator = searchParams.get('from') === 'calculator'
  const [threadId, setThreadId] = useState<string | null>(initialThreadId)
  const [messages, setMessages] = useState<Message[]>(() => mapInitialMessages(initialMessages))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<ChatResponse['usage']>()
  const [tier, setTier] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [pendingCalculatorContext, setPendingCalculatorContext] = useState<CalculatorContextPayload | null>(null)
  const [nextMessageCalculatorContext, setNextMessageCalculatorContext] = useState<CalculatorContextPayload | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const contextInitializedRef = useRef(false)

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const calculatorContext = nextMessageCalculatorContext
    const userMessage: Message = { role: 'user', content: trimmed, timestamp: new Date() }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          calculatorContext,
        }),
      })

      const data: ChatResponse = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.upgrade_message || 'Token budget exceeded')
        } else {
          setError(data.error || 'Something went wrong')
        }
        return
      }

      const resultingThreadId = data.threadId ?? threadId
      if (resultingThreadId && resultingThreadId !== threadId) {
        setThreadId(resultingThreadId)
        router.replace(`/chat/${resultingThreadId}`)
      } else if (calculatorContext && resultingThreadId) {
        router.replace(`/chat/${resultingThreadId}`)
      }

      if (data.message) {
        setMessages([
          ...nextMessages,
          { role: 'assistant', content: data.message, timestamp: new Date() },
        ])
      }
      setUsage(data.usage)
      setTier(data.tier || '')

      if (calculatorContext) {
        setPendingCalculatorContext(null)
        setNextMessageCalculatorContext(null)
        clearQueuedCalculatorContext()
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages, loading])

  useEffect(() => {
    if (initialized) return
    setInitialized(true)
    if (!fromCalculator && messages.length === 0) {
      void sendMessage(ONBOARDING_STARTER_MESSAGE)
    }
    // sendMessage intentionally omitted to avoid reruns from identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, fromCalculator, messages.length])

  useEffect(() => {
    if (contextInitializedRef.current) return
    contextInitializedRef.current = true

    const queued = readQueuedCalculatorContext()
    if (!queued) return

    setPendingCalculatorContext(queued)

    if (fromCalculator) {
      setNextMessageCalculatorContext(queued)
      setInput(queued.chatPrompt)
    }
  }, [fromCalculator])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await sendMessage(input)
  }

  const handleSuggestionClick = (text: string) => {
    void sendMessage(text)
  }

  const handleUseCalculatorContext = () => {
    if (!pendingCalculatorContext) return
    setNextMessageCalculatorContext(pendingCalculatorContext)
    setInput((current) => (current.trim() ? current : pendingCalculatorContext.chatPrompt))
    inputRef.current?.focus()
  }

  const handleClearCalculatorContext = () => {
    setPendingCalculatorContext(null)
    setNextMessageCalculatorContext(null)
    clearQueuedCalculatorContext()
  }

  const isEmpty = messages.length === 0 && !loading

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-[calc(100vh)] -m-4 md:-m-6 lg:-m-8">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-background">
        {pendingCalculatorContext && (
          <div className="mb-4 rounded-lg border border-border bg-surface p-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Calculator Context Ready</p>
            <p className="mt-1 text-sm text-text-primary">{pendingCalculatorContext.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!nextMessageCalculatorContext && (
                <button
                  onClick={handleUseCalculatorContext}
                  className="px-3 py-1.5 rounded-full bg-accent text-cream text-xs font-medium hover:bg-accent-hover transition-colors"
                >
                  Use in Next Brew Advice
                </button>
              )}
              <button
                onClick={handleClearCalculatorContext}
                className="px-3 py-1.5 rounded-full border border-border text-text-primary text-xs font-medium hover:bg-surface-muted transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {isEmpty && <EmptyState onSuggestionClick={handleSuggestionClick} />}

        {messages.map((message, index) => {
          const showTimestamp = shouldShowTimestamp(messages, index)
          const isUser = message.role === 'user'

          return (
            <div
              key={`${message.role}-${message.timestamp.getTime()}-${index}`}
              className={`message-enter flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
            >
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}
                </div>
                {showTimestamp && (
                  <p className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted-high mt-0.5 px-1">
                    {formatTime(message.timestamp)}
                  </p>
                )}
              </div>

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

      <div className="border-t border-border bg-surface p-3 shrink-0">
        {nextMessageCalculatorContext && (
          <div className="max-w-3xl mx-auto mb-2 px-1">
            <p className="text-xs text-text-secondary">
              Next message will include structured context from your{' '}
              <span className="font-medium text-text-primary">{nextMessageCalculatorContext.title}</span>{' '}
              calculator result.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
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
