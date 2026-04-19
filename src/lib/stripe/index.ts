import Stripe from 'stripe'

// Stripe is optional — only initialize if the secret key is provided
// This allows the app to build and run without Stripe during development
export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
  : null

export const PLANS = {
  tier1: {
    name: 'Basic',
    price: 5,
    priceId: process.env.STRIPE_TIER1_PRICE_ID || '',
    model: 'google/gemma-4-26b-a4b-it',
    weeklyTokens: 150_000,
    features: [
      '150K tokens per week',
      '8K context window',
      'Personalized brew guidance',
      'Equipment maintenance plans',
      'Full profile memory',
    ],
  },
  tier2: {
    name: 'Pro',
    price: 19,
    priceId: process.env.STRIPE_TIER2_PRICE_ID || '',
    model: 'google/gemma-4-31b-it',
    weeklyTokens: 500_000,
    features: [
      'Everything in Basic',
      '500K tokens per week',
      '16K context window',
      'Priority model routing',
      'Advanced diagnostics',
      'Cafe operations guidance',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS
