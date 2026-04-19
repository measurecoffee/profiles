'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Coffee, Send } from 'lucide-react'
import MessageAvatar from '@/components/chat/message-avatar'
import TypingIndicator from '@/components/chat/typing-indicator'
import EmptyState from '@/components/chat/empty-state'
import MarkdownRenderer from '@/components/chat/markdown-renderer'
import { COFFEE_AGENT_NAME } from '@/lib/agent/brand'
import { TIERS } from '@/lib/agent/tiers'
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
  shouldBootstrapOnboarding?: boolean
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
  shouldBootstrapOnboarding = false,
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
  const [pendingCalculatorContext, setPendingCalculatorContext] = useState<CalculatorContextPayload | null>(null)
  const [nextMessageCalculatorContext, setNextMessageCalculatorContext] = useState<CalculatorContextPayload | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const contextInitializedRef = useRef(false)
  const onboardingInitializedRef = useRef(false)

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
    if (onboardingInitializedRef.current) return
    if (!shouldBootstrapOnboarding || fromCalculator || messages.length > 0) return

    onboardingInitializedRef.current = true
    void sendMessage(ONBOARDING_STARTER_MESSAGE)
    // sendMessage intentionally omitted to avoid reruns from identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCalculator, messages.length, shouldBootstrapOnboarding])

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
  const tierLabel = tier ? TIERS[tier as keyof typeof TIERS]?.name || tier : ''

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4 lg:min-h-[calc(100dvh-6rem)]">
      <div className="tech-card tech-card-grid shrink-0 px-4 py-5 sm:px-6">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-border-strong bg-[linear-gradient(135deg,rgba(26,24,20,0.96),rgba(18,16,13,0.98))] shadow-[0_18px_32px_rgba(18,15,12,0.14)]">
              <Coffee className="h-5 w-5 text-gold" aria-hidden="true" />
            </div>
            <div>
              <p className="tech-label">Brew intelligence session</p>
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-text-primary font-[family-name:var(--font-display)]">
                {COFFEE_AGENT_NAME}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Technical coffee guidance with memory of your setup, recent calculators, and the
                last thread context.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="tech-chip">measure/core</span>
            {tierLabel && <span className="tech-chip">{tierLabel}</span>}
            {usage && (
              <span className="tech-chip-strong">
                {usage.remainingBudget?.toLocaleString()} tokens left
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={[
          'tech-card flex-1 overflow-y-auto p-4 sm:p-6',
          isEmpty ? 'flex items-center justify-center' : '',
        ].join(' ')}
      >
        <div className="space-y-3">
          {pendingCalculatorContext && (
            <div className="tech-card-muted mb-4 p-4">
              <p className="tech-label">Calculator context queued</p>
              <p className="mt-2 text-sm text-text-primary">{pendingCalculatorContext.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!nextMessageCalculatorContext && (
                  <button
                    onClick={handleUseCalculatorContext}
                    className="tech-button-primary px-4 text-sm"
                  >
                    Use in next brew advice
                  </button>
                )}
                <button
                  onClick={handleClearCalculatorContext}
                  className="tech-button-secondary px-4 text-sm"
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
                className={`message-enter flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-3`}
              >
                {!isUser && <MessageAvatar role="assistant" />}

                <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={[
                      'rounded-[22px] px-4 py-3',
                      isUser
                        ? 'tech-card-strong text-[color:var(--color-background)]'
                        : 'tech-card-muted text-text-primary',
                    ].join(' ')}
                  >
                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap leading-6">{message.content}</p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}
                  </div>
                  {showTimestamp && (
                    <p className="mt-1 px-1 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.14em] text-text-muted-high">
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
              <p className="inline-block rounded-[16px] border border-destructive/20 bg-[rgba(138,69,40,0.08)] px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="tech-card shrink-0 p-3 sm:p-4">
        {nextMessageCalculatorContext && (
          <div className="mb-3 px-1">
            <p className="text-xs leading-5 text-text-secondary">
              Next message will include structured context from{' '}
              <span className="font-medium text-text-primary">{nextMessageCalculatorContext.title}</span>.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Ask ${COFFEE_AGENT_NAME} about coffee...`}
            disabled={loading}
            className="tech-input flex-1"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="tech-button-primary h-12 w-12 shrink-0 px-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
