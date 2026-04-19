// Tier configuration — weekly token budgets and model assignments

export type SubscriptionTier = 'trial' | 'expired_trial' | 'tier1' | 'tier2'

interface TierConfig {
  name: string
  price: number           // monthly price in USD (0 for trial)
  model: string           // OpenRouter model ID
  weeklyTokenBudget: number
  maxContextTokens: number // max tokens per request
  bestFor: string
  upgradeTrigger: string
  features: string[]
  canChat: boolean         // whether the tier allows chat access
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  trial: {
    name: 'Free Trial',
    price: 0,
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokenBudget: 15_000,
    maxContextTokens: 4_096,
    bestFor: 'First-time users evaluating Measure',
    upgradeTrigger: 'Upgrade when your 7-day trial ends or you need more weekly usage.',
    features: [
      '7 days of full access',
      'Phone verification required',
      '15K tokens per week',
      '4K context window',
      'Coffee Q&A and equipment lookup',
      'Starter memory (L1 + L2)',
    ],
    canChat: true,
  },
  expired_trial: {
    name: 'Trial Expired',
    price: 0,
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokenBudget: 0,
    maxContextTokens: 0,
    bestFor: 'Accounts awaiting a paid plan',
    upgradeTrigger: 'Upgrade to Basic or Pro to resume chat.',
    features: ['Upgrade to continue'],
    canChat: false,
  },
  tier1: {
    name: 'Basic',
    price: 5,
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokenBudget: 150_000,
    maxContextTokens: 8_192,
    bestFor: 'Home baristas and solo professionals',
    upgradeTrigger: 'Upgrade when you hit 150K tokens/week or need cafe-operations support.',
    features: [
      '150K tokens per week',
      '8K context window',
      'Unlimited chat sessions',
      'Personalized brew guidance and troubleshooting',
      'Equipment recommendations and care schedules',
      'Full profile memory (L1 + L2 + L3)',
      'Session continuity across conversations',
    ],
    canChat: true,
  },
  tier2: {
    name: 'Pro',
    price: 19,
    model: 'google/gemma-4-31b-it',
    weeklyTokenBudget: 500_000,
    maxContextTokens: 16_384,
    bestFor: 'Cafe teams and high-volume power users',
    upgradeTrigger: 'Highest available tier.',
    features: [
      'Everything in Basic',
      '500K tokens per week',
      '16K context window',
      'Priority 31B model routing',
      'Advanced diagnostics for espresso and brew workflows',
      'Cafe operations and workflow guidance',
      'Business metrics support and profitability framing',
    ],
    canChat: true,
  },
}

export function getTier(tier: string): TierConfig {
  return TIERS[(tier || 'trial') as SubscriptionTier] || TIERS.trial
}
