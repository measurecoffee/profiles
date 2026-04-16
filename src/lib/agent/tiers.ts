// Tier configuration — weekly token budgets and model assignments

export type SubscriptionTier = 'trial' | 'tier1' | 'tier2'

export interface TierConfig {
  name: string
  price: number           // monthly price in USD
  model: string           // OpenRouter model ID
  weeklyTokenBudget: number
  maxContextTokens: number // max tokens per request
  features: string[]
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  trial: {
    name: 'Free Trial',
    price: 0,
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokenBudget: 15_000,
    maxContextTokens: 4_096,
    features: ['1 week free', 'Basic coffee Q&A', 'Equipment lookup'],
  },
  tier1: {
    name: 'Barista',
    price: 5,
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokenBudget: 150_000,
    maxContextTokens: 8_192,
    features: ['Unlimited sessions', 'Equipment guidance', 'Maintenance schedules', 'Profile memory'],
  },
  tier2: {
    name: 'Roaster',
    price: 19,
    model: 'google/gemma-4-31b-it',
    weeklyTokenBudget: 500_000,
    maxContextTokens: 16_384,
    features: ['Everything in Barista', 'Advanced diagnostics', 'Business operations', 'Priority model', 'Extended context'],
  },
}

export function getTier(tier: string): TierConfig {
  return TIERS[(tier || 'trial') as SubscriptionTier] || TIERS.trial
}