import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithAgent } from '@/lib/agent/chat'
import { getTier } from '@/lib/agent/tiers'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    // Strip any system messages from client — we inject our own
    const safeMessages = messages.filter(
      (m: { role: string }) => m.role !== 'system'
    )

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, identity, active_context')
      .eq('user_id', user.id)
      .single()

    const tier = profile?.subscription_tier || 'trial'

    // Check token budget
    const { data: budgetInfo } = await supabase
      .rpc('check_token_budget', { p_user_id: user.id })

    const budget = budgetInfo?.[0]
    if (budget && budget.remaining_tokens <= 0) {
      return NextResponse.json({
        error: 'Token budget exceeded',
        tier,
        remaining_tokens: 0,
        weekly_budget: budget.weekly_budget,
        upgrade_message: `You've used your weekly token budget. Upgrade to ${tier === 'trial' ? 'Barista ($5/mo)' : 'a higher tier'} for more.`,
      }, { status: 429 })
    }

    // Call agent
    const result = await chatWithAgent({
      messages: safeMessages,
      userId: user.id,
      tier,
      profileContext: {
        identity: profile?.identity as Record<string, unknown> | undefined,
        activeContext: profile?.active_context as Record<string, unknown> | undefined,
      },
    })

    // Record token usage
    const { data: remaining } = await supabase
      .rpc('record_token_usage', {
        p_user_id: user.id,
        p_input: result.usage.inputTokens,
        p_output: result.usage.outputTokens,
      })

    result.usage.remainingBudget = remaining || 0

    return NextResponse.json({
      message: result.message,
      model: result.model,
      usage: result.usage,
      tier,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}