import { COFFEE_AGENT_SYSTEM_PROMPT } from '@/lib/agent/system-prompt'
import { getTier } from '@/lib/agent/tiers'
import type { CalculatorContextPayload } from '@/lib/calculator/context'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  userId: string
  tier: string
  profileContext?: {
    identity?: Record<string, unknown>
    activeContext?: Record<string, unknown>
    deepContext?: Record<string, unknown>
    needsOnboarding?: boolean
    deepContextPath?: string
    deepContextValue?: unknown
    calculatorContext?: CalculatorContextPayload
  }
}

interface ChatResponse {
  message: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    remainingBudget: number
  }
  model: string
}

export async function chatWithAgent(request: ChatRequest): Promise<ChatResponse> {
  const tierConfig = getTier(request.tier)

  // Build system prompt with profile context
  let systemPrompt = COFFEE_AGENT_SYSTEM_PROMPT

  if (request.profileContext) {
    const identity = request.profileContext.identity
    const activeContext = request.profileContext.activeContext
    const deepContext = request.profileContext.deepContext
    const calculatorContext = request.profileContext.calculatorContext

    if (identity && Object.values(identity).some(v => v !== null && v !== undefined)) {
      systemPrompt += `\n\n## USER PROFILE\n`
      if (identity.name) systemPrompt += `Name: ${identity.name}\n`
      if (identity.handle) systemPrompt += `Handle: @${identity.handle}\n`
      if (identity.timezone) systemPrompt += `Timezone: ${identity.timezone}\n`
      if (identity.roles && (identity.roles as string[])?.length) {
        systemPrompt += `Roles: ${(identity.roles as string[]).join(', ')}\n`
      }
    }

    if (activeContext?.current_focus) {
      systemPrompt += `\nCurrent focus: ${activeContext.current_focus}\n`
    }

    // Inject existing deep context so agent knows what's already stored
    if (deepContext && Object.keys(deepContext).length > 0) {
      const hasContent = Object.values(deepContext).some(
        v => v && typeof v === 'object' && Object.keys(v as Record<string, unknown>).length > 0
      )
      if (hasContent) {
        systemPrompt += `\n## USER'S STORED PROFILE DATA\n`
        systemPrompt += JSON.stringify(deepContext, null, 2) + '\n'
        systemPrompt += `\n(Use this data to personalize your responses. If you learn new info, save it with {{SAVE_PROFILE}}.)\n`
      }
    }

    if (calculatorContext && Object.keys(calculatorContext).length > 0) {
      systemPrompt += `\n## CURRENT CALCULATOR CONTEXT\n`
      systemPrompt += JSON.stringify(calculatorContext, null, 2) + '\n'
      systemPrompt += `\n(These values came directly from the user's calculator workflow. Use them as structured brew context in your response.)\n`
    }

    // Onboarding flag
    if (request.profileContext.needsOnboarding) {
      systemPrompt += `\n## IMPORTANT: NEW USER ONBOARDING\nThis user has no equipment or preferences on file. Start the onboarding conversation now. Follow the ONBOARDING section in your instructions.\n`
    }

    // If agent requested deep context, inject it
    if (request.profileContext.deepContextPath && request.profileContext.deepContextValue !== undefined) {
      systemPrompt += `\n## USER'S ${request.profileContext.deepContextPath.toUpperCase()}\n`
      systemPrompt += JSON.stringify(request.profileContext.deepContextValue, null, 2) + '\n'
    }
  }

  // Build messages array — system prompt is ALWAYS first, never from user
  const apiMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...request.messages.filter(m => m.role !== 'system'),
  ]

  // Call OpenRouter
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://measure.coffee',
      'X-Title': 'measure.coffee Agent',
    },
    body: JSON.stringify({
      model: tierConfig.model,
      messages: apiMessages,
      max_tokens: Math.min(tierConfig.maxContextTokens, 2048),
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} — ${error}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  const usage = data.usage || {}

  return {
    message: choice?.message?.content || '',
    usage: {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      remainingBudget: 0, // filled in by caller from DB
    },
    model: data.model || tierConfig.model,
  }
}
