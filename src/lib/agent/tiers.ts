// Tier configuration — weekly token budgets and model assignments

export type SubscriptionTier = 'trial' | 'expired_trial' | 'tier1' | 'tier2'

interface TierConfig {
  name: string
  price: number           // monthly price in USD (0 for trial)
  model: string           // OpenRouter model ID
  weeklyTokenBudget: number
  maxContextTokens: number // max tokens per request
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
    features: [
      '7 days free',
      'Phone verification required',
      '15K weekly token budget',
      'Coffee Q&A and equipment lookup',
      'Basic brewing guidance',
      'Profile memory (L1 + L2)',
    ],
    canChat: true,
  },
  expired_trial: {
    name: 'Trial Expired',
    price: 0,
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokenBudget: 0,
    maxContextTokens: 0,
    features: ['Upgrade to continue'],
    canChat: false,
  },
  tier1: {
    name: 'Basic',
    price: 5,
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokenBudget: 150_000,
    maxContextTokens: 8_192,
    features: [
      'Unlimited chat sessions',
      '150K weekly token budget',
      'Equipment guidance and recommendations',
      'Maintenance and cleaning schedules',
      'Brewing parameters and troubleshooting',
      'Full profile memory (L1 + L2 + L3)',
      'Session context persistence',
    ],
    canChat: true,
  },
  tier2: {
    name: 'Pro',
    price: 19,
    model: 'google/gemma-4-31b-it',
    weeklyTokenBudget: 500_000,
    maxContextTokens: 16_384,
    features: [
      'Everything in Basic',
      '500K weekly token budget',
      'Priority model (31B)',
      'Advanced equipment diagnostics',
      'Cafe operations and workflow consulting',
      'Business metrics and profitability analysis',
      'Extended 16K context window',
      'Deep equipment history tracking',
    ],
    canChat: true,
  },
}

export function getTier(tier: string): TierConfig {
  return TIERS[(tier || 'trial') as SubscriptionTier] || TIERS.trial
}