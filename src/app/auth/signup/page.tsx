'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Coffee } from 'lucide-react'

type Step = 'details' | 'verify-phone' | 'choose-plan'

const STEPS: Step[] = ['details', 'verify-phone', 'choose-plan']
const STEP_LABELS: Record<Step, string> = {
  details: 'Details',
  'verify-phone': 'Verify',
  'choose-plan': 'Plan',
}

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current)
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={[
              'w-2.5 h-2.5 rounded-full transition-colors',
              i <= currentIndex ? 'bg-accent' : 'bg-border',
            ].join(' ')}
          />
          <span
            className={[
              'text-xs font-medium transition-colors',
              i <= currentIndex ? 'text-accent' : 'text-text-muted',
            ].join(' ')}
          >
            {STEP_LABELS[step]}
          </span>
          {i < STEPS.length - 1 && (
            <div className="w-6 h-px bg-border mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SignupPage() {
  const [step, setStep] = useState<Step>('details')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Step 1: Create account + send SMS
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!phone || phone.trim().length < 10) {
      setError('Phone number is required to create your account.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, handle, phone },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send verification code. Please try again.')
        setLoading(false)
        return
      }

      setStep('verify-phone')
    } catch {
      setError('Network error. Please try again.')
    }

    setLoading(false)
  }

  // Step 2: Verify phone OTP
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setLoading(false)
        return
      }

      setStep('choose-plan')
    } catch {
      setError('Network error. Please try again.')
    }

    setLoading(false)
  }

  // Step 3: Choose plan
  const handleChoosePlan = (planId: 'trial' | 'tier1' | 'tier2') => {
    if (planId === 'trial') {
      router.push('/chat')
      return
    }

    fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.url) {
          window.location.href = data.url
        } else {
          setError(data.error || 'Failed to start checkout. You can upgrade later from your profile.')
          router.push('/chat')
        }
      })
      .catch(() => {
        setError('Network error. You can upgrade later from your profile.')
        router.push('/chat')
      })
  }

  const handleResendCode = async () => {
    setError(null)
    try {
      const res = await fetch('/api/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to resend code')
      }
    } catch {
      setError('Network error. Please try again.')
    }
  }

  // ============= RENDER: Verify Phone =============
  if (step === 'verify-phone') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-espresso">
              measure.coffee
            </h1>
          </div>
          <p className="text-text-secondary mb-4">Verify your phone number</p>
          <StepIndicator current={step} />
          <p className="text-sm text-text-secondary mb-6">
            We sent a 6-digit code to <strong>{phone}</strong>. Enter it below to confirm your account.
          </p>

          <form onSubmit={handleVerifyPhone} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-text-primary mb-1">
                Verification code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-surface text-text-primary text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="000000"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-destructive text-sm bg-red-50 p-3 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-6 bg-primary text-cream rounded-full font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify phone'}
            </button>
          </form>

          <button
            onClick={handleResendCode}
            className="mt-4 w-full py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Resend code
          </button>

          <p className="mt-6 text-xs text-text-muted text-center">
            Phone verification prevents abuse and ensures one trial per number.
          </p>
        </div>
      </div>
    )
  }

  // ============= RENDER: Choose Plan =============
  if (step === 'choose-plan') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-lg p-8">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-[family-name:var(--font-display)] text-espresso">
              measure.coffee
            </h1>
          </div>
          <p className="text-text-secondary mb-4">Choose your plan</p>
          <StepIndicator current={step} />

          {error && (
            <div className="text-destructive text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</div>
          )}

          <div className="space-y-4">
            {/* Trial */}
            <button
              onClick={() => handleChoosePlan('trial')}
              className="w-full text-left p-5 border border-border rounded-xl bg-surface hover:border-border-hover transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-text-primary">Free Trial</h2>
                <span className="text-text-secondary font-medium">$0</span>
              </div>
              <p className="text-sm text-text-secondary">
                7 days free · 15K weekly tokens · Basic coffee Q&A and equipment lookup
              </p>
            </button>

            {/* Basic — cream + copper borders */}
            <button
              onClick={() => handleChoosePlan('tier1')}
              className="w-full text-left p-5 border-2 border-copper rounded-xl bg-cream hover:bg-latte transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-text-primary">Basic</h2>
                <span className="text-text-primary font-bold">$5/mo</span>
              </div>
              <p className="text-sm text-text-secondary">
                150K weekly tokens · Equipment guidance · Maintenance schedules · Full profile memory
              </p>
            </button>

            {/* Pro — espresso + gold, copper border + Recommended badge */}
            <button
              onClick={() => handleChoosePlan('tier2')}
              className="relative w-full text-left p-5 border-2 border-copper rounded-xl bg-espresso hover:bg-primary-hover transition-colors"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full bg-accent text-cream">
                Recommended
              </span>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-cream">Pro</h2>
                <span className="text-gold font-bold">$19/mo</span>
              </div>
              <p className="text-sm text-text-secondary">
                500K weekly tokens · Priority model · Advanced diagnostics · Business consulting
              </p>
            </button>
          </div>

          <button
            onClick={() => router.push('/chat')}
            className="mt-4 w-full py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Skip — start with free trial
          </button>
        </div>
      </div>
    )
  }

  // ============= RENDER: Signup Details =============
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-[family-name:var(--font-display)] text-espresso">
            measure.coffee
          </h1>
        </div>
        <p className="text-text-secondary mb-4">Create your profile</p>
        <StepIndicator current={step} />

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Display name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Coffee Lover"
            />
          </div>

          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-text-primary mb-1">
              Handle
            </label>
            <input
              id="handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="coffeelover"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-1">
              Phone number <span className="text-destructive">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="(555) 123-4567"
            />
            <p className="text-xs text-text-muted mt-1">
              US numbers — enter 10 digits. One trial per phone number.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-destructive text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-6 bg-primary text-cream rounded-full font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-text-muted text-center">
            After creating your account, you&apos;ll verify your phone number, then choose a plan.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <a href="/auth/login" className="text-accent font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}