import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Use service role to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const admin = createAdmin(supabaseUrl, supabaseKey)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id as 'tier1' | 'tier2'

      if (userId && planId) {
        // Update user's tier and store Stripe customer ID
        const updateData: Record<string, unknown> = {
          subscription_tier: planId,
          stripe_customer_id: session.customer as string,
        }
        await admin
          .from('profiles')
          .update(updateData)
          .eq('user_id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id

      if (userId) {
        // For future plan changes
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id

      if (userId) {
        // Downgrade back to trial
        await admin
          .from('profiles')
          .update({ subscription_tier: 'trial' })
          .eq('user_id', userId)
      }
      break
    }

    case 'invoice.payment_failed': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (event.data.object as any)?.subscription
      console.error('Payment failed for subscription:', String(subId ?? 'unknown'))
      break
    }
  }

  return NextResponse.json({ received: true })
}