import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithAgent } from '@/lib/agent/chat'
import { getTier } from '@/lib/agent/tiers'
import { parseProfileUpdate, applyProfileUpdate } from '@/lib/agent/profile-update'
import { sanitizeCalculatorContext } from '@/lib/calculator/context'
import { deriveThreadTitle, fallbackThreadTitle } from '@/lib/chat/threads'

interface ClientMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ThreadRow {
  id: string
  title: string
  created_at: string
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isClientMessage(value: unknown): value is ClientMessage {
  if (!isRecord(value)) return false
  if (typeof value.content !== 'string') return false
  return value.role === 'user' || value.role === 'assistant' || value.role === 'system'
}

function formatThreadPayload(thread: ThreadRow) {
  return {
    id: thread.id,
    title: thread.title || fallbackThreadTitle(),
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const rawMessages = Array.isArray(body.messages) ? body.messages : null
    if (!rawMessages || rawMessages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    const safeMessages = rawMessages
      .filter(isClientMessage)
      .map((message) => ({ role: message.role, content: message.content.trim() }))
      .filter((message) => message.role !== 'system' && message.content.length > 0)

    if (safeMessages.length === 0) {
      return NextResponse.json({ error: 'No valid messages provided' }, { status: 400 })
    }

    const latestUserMessage = [...safeMessages].reverse().find((message) => message.role === 'user')
    if (!latestUserMessage) {
      return NextResponse.json({ error: 'A user message is required' }, { status: 400 })
    }

    const threadId = typeof body.threadId === 'string' && body.threadId.trim().length > 0
      ? body.threadId.trim()
      : null

    const rawCalculatorContext = body.calculatorContext
    const calculatorContext =
      rawCalculatorContext === undefined
        ? null
        : sanitizeCalculatorContext(rawCalculatorContext)

    if (rawCalculatorContext !== undefined && !calculatorContext) {
      return NextResponse.json({ error: 'Invalid calculator context payload' }, { status: 400 })
    }

    await supabase.rpc('check_trial_expiry', { p_user_id: user.id })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, identity, active_context, deep_context, phone_verified')
      .eq('user_id', user.id)
      .single()

    const tier = profile?.subscription_tier || 'trial'
    const tierConfig = getTier(tier)

    if (tier === 'trial' && !profile?.phone_verified) {
      return NextResponse.json(
        {
          error: 'Phone verification required',
          tier,
          upgrade_message: 'Please verify your phone number to start your free trial.',
          verify_url: '/account/profile',
        },
        { status: 403 }
      )
    }

    if (!tierConfig.canChat) {
      return NextResponse.json(
        {
          error: 'Trial expired',
          tier,
          upgrade_message: 'Your free trial has expired. Upgrade to continue chatting.',
          upgrade_url: '/account/profile',
        },
        { status: 403 }
      )
    }

    const { data: budgetInfo } = await supabase.rpc('check_token_budget', { p_user_id: user.id })
    const budget = budgetInfo?.[0]

    if (budget && budget.remaining_tokens <= 0) {
      return NextResponse.json(
        {
          error: 'Token budget exceeded',
          tier,
          remaining_tokens: 0,
          weekly_budget: budget.weekly_budget,
          upgrade_message: `You've used your weekly token budget. Upgrade to ${tier === 'trial' ? 'Basic ($5/mo)' : 'a higher tier'} for more.`,
          upgrade_url: '/account/profile',
        },
        { status: 429 }
      )
    }

    let thread: ThreadRow | null = null

    if (threadId) {
      const { data: existingThread, error: threadError } = await supabase
        .from('chat_threads')
        .select('id, title, created_at, updated_at')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .is('archived_at', null)
        .maybeSingle()

      if (threadError) {
        console.error('Thread lookup failed:', threadError.message)
        return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 })
      }

      if (!existingThread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      }

      thread = existingThread
    } else {
      const { data: createdThread, error: createThreadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: user.id,
          title: deriveThreadTitle(latestUserMessage.content),
        })
        .select('id, title, created_at, updated_at')
        .single()

      if (createThreadError || !createdThread) {
        console.error('Thread creation failed:', createThreadError?.message ?? 'Unknown error')
        return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
      }

      thread = createdThread
    }

    if (!thread) {
      return NextResponse.json({ error: 'Failed to resolve thread' }, { status: 500 })
    }

    const userMessageCount = safeMessages.filter((message) => message.role === 'user').length
    if (thread.title === fallbackThreadTitle() && userMessageCount === 1) {
      const { data: renamedThread, error: renameError } = await supabase
        .from('chat_threads')
        .update({ title: deriveThreadTitle(latestUserMessage.content) })
        .eq('id', thread.id)
        .eq('user_id', user.id)
        .select('id, title, created_at, updated_at')
        .single()

      if (!renameError && renamedThread) {
        thread = renamedThread
      }
    }

    const { error: persistUserError } = await supabase.from('chat_messages').insert({
      thread_id: thread.id,
      user_id: user.id,
      role: 'user',
      content: latestUserMessage.content,
    })

    if (persistUserError) {
      console.error('Failed to persist user message:', persistUserError.message)
      return NextResponse.json({ error: 'Failed to persist user message' }, { status: 500 })
    }

    const deepContext = (profile?.deep_context as Record<string, unknown>) || {}
    const needsOnboarding =
      !deepContext.equipment || Object.keys(deepContext.equipment as Record<string, unknown>).length === 0

    const result = await chatWithAgent({
      messages: safeMessages,
      userId: user.id,
      tier,
      profileContext: {
        identity: profile?.identity as Record<string, unknown> | undefined,
        activeContext: profile?.active_context as Record<string, unknown> | undefined,
        deepContext,
        needsOnboarding,
        calculatorContext: calculatorContext ?? undefined,
      },
    })

    const update = parseProfileUpdate(result.message)
    let cleanMessage = result.message

    if (update) {
      cleanMessage = result.message.replace(/\{\{SAVE_PROFILE\}\}[\s\S]*?\{\{\/SAVE_PROFILE\}\}/, '').trim()
      await applyProfileUpdate(supabase, user.id, update)
    }

    if (cleanMessage) {
      const { error: persistAssistantError } = await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        user_id: user.id,
        role: 'assistant',
        content: cleanMessage,
      })

      if (persistAssistantError) {
        console.error('Failed to persist assistant message:', persistAssistantError.message)
        return NextResponse.json({ error: 'Failed to persist assistant message' }, { status: 500 })
      }
    }

    if (calculatorContext) {
      const activeContext = isRecord(profile?.active_context) ? profile.active_context : {}
      const priorRecent = Array.isArray(activeContext.recent_activity) ? activeContext.recent_activity : []
      const contextCapturedAt = new Date().toISOString()

      await supabase
        .from('profiles')
        .update({
          active_context: {
            ...activeContext,
            current_focus: `Dialing in ${calculatorContext.title.toLowerCase()}`,
            session_hint: 'Using calculator context in this conversation',
            recent_activity: [
              {
                type: 'calculator_context_used',
                calculator: calculatorContext.calculator,
                summary: calculatorContext.summary,
                at: contextCapturedAt,
              },
              ...priorRecent,
            ].slice(0, 8),
          },
          updated_at: contextCapturedAt,
          updated_by: 'user:calculator-context',
        })
        .eq('user_id', user.id)
    }

    const { data: refreshedThread } = await supabase
      .from('chat_threads')
      .select('id, title, created_at, updated_at')
      .eq('id', thread.id)
      .eq('user_id', user.id)
      .single()

    const { data: remaining } = await supabase.rpc('record_token_usage', {
      p_user_id: user.id,
      p_input: result.usage.inputTokens,
      p_output: result.usage.outputTokens,
    })

    result.usage.remainingBudget = remaining || 0

    const threadPayload = formatThreadPayload((refreshedThread ?? thread) as ThreadRow)

    return NextResponse.json({
      threadId: threadPayload.id,
      message: cleanMessage,
      model: result.model,
      usage: result.usage,
      tier,
      thread: threadPayload,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
