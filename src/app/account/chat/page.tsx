'use client'

import { useState, useRef, useEffect } from 'react'

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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<ChatResponse['usage']>()
  const [tier, setTier] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  // Auto-send a greeting to kick off onboarding on first visit
  useEffect(() => {
    if (!initialized) {
      setInitialized(true)
      sendMessage('Hi! I just signed up.')
    }
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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendMessage(input)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#D4C5B0] bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#2C1810]">measure.coffee agent</h1>
          <p className="text-xs text-[#8B7355]">
            {tier && `Tier: ${tier}`}
            {usage && ` · ${usage.remainingBudget?.toLocaleString()} tokens remaining`}
          </p>
        </div>
        <a href="/account/profile" className="text-sm text-[#8B7355] hover:underline">
          Profile
        </a>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-[#8B7355] mt-12">
            <p className="text-lg mb-2">Starting your coffee profile...</p>
            <p className="text-sm">I&apos;ll ask a few questions so I can give you personalized advice.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user'
                ? 'bg-[#2C1810] text-white'
                : 'bg-white border border-[#D4C5B0] text-[#2C1810]'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#D4C5B0] rounded-2xl px-4 py-2.5">
              <p className="text-sm text-[#8B7355] animate-pulse">Brewing a response...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-2 inline-block">{error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#D4C5B0] bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about coffee..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-[#D4C5B0] rounded-full bg-[#FAF8F5] text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#8B7355] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-[#2C1810] text-white rounded-full font-medium hover:bg-[#3D2918] disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}