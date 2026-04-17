import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithAgent } from '@/lib/agent/chat'
import { getTier } from '@/lib/agent/tiers'
import { parseProfileUpdate, applyProfileUpdate } from '@/lib/agent/profile-update'

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

    // Check trial expiry before anything else
    await supabase.rpc('check_trial_expiry', { p_user_id: user.id })

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, identity, active_context, deep_context, phone_verified')
      .eq('user_id', user.id)
      .single()

    const tier = profile?.subscription_tier || 'trial'
    const tierConfig = getTier(tier)

    // Trial users must have verified phone to chat
    if (tier === 'trial' && !profile?.phone_verified) {
      return NextResponse.json({
        error: 'Phone verification required',
        tier,
        upgrade_message: 'Please verify your phone number to start your free trial.',
        verify_url: '/account/profile',
      }, { status: 403 })
    }

    // Block expired trials
    if (!tierConfig.canChat) {
      return NextResponse.json({
        error: 'Trial expired',
        tier,
        upgrade_message: 'Your free trial has expired. Upgrade to continue chatting.',
        upgrade_url: '/account/profile',
      }, { status: 403 })
    }

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
        upgrade_message: `You've used your weekly token budget. Upgrade to ${tier === 'trial' ? 'Basic ($5/mo)' : 'a higher tier'} for more.`,
        upgrade_url: '/account/profile',
      }, { status: 429 })
    }

    // Determine if onboarding is needed (no equipment or preferences in deep_context)
    const deepContext = (profile?.deep_context as Record<string, unknown>) || {}
    const needsOnboarding = !deepContext.equipment || Object.keys(deepContext.equipment as Record<string, unknown>).length === 0

    // Call agent
    const result = await chatWithAgent({
      messages: safeMessages,
      userId: user.id,
      tier,
      profileContext: {
        identity: profile?.identity as Record<string, unknown> | undefined,
        activeContext: profile?.active_context as Record<string, unknown> | undefined,
        deepContext: deepContext,
        needsOnboarding,
      },
    })

    // Parse any {{SAVE_PROFILE}} blocks from the agent response
    const update = parseProfileUpdate(result.message)
    let cleanMessage = result.message
    if (update) {
      // Strip the save block from the visible message
      cleanMessage = result.message.replace(/\{\{SAVE_PROFILE\}\}[\s\S]*?\{\{\/SAVE_PROFILE\}\}/, '').trim()
      // Apply the update to the database
      await applyProfileUpdate(supabase, user.id, update)
    }

    // Record token usage
    const { data: remaining } = await supabase
      .rpc('record_token_usage', {
        p_user_id: user.id,
        p_input: result.usage.inputTokens,
        p_output: result.usage.outputTokens,
      })

    result.usage.remainingBudget = remaining || 0

    return NextResponse.json({
      message: cleanMessage,
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