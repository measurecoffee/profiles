'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Step = 'details' | 'verify-phone' | 'choose-plan'

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

    // Create auth account (autoconfirm is ON, so no email verification needed)
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

    // Send phone verification SMS
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

      // Phone verified — now choose plan
      setStep('choose-plan')
    } catch {
      setError('Network error. Please try again.')
    }

    setLoading(false)
  }

  // Step 3: Choose plan
  const handleChoosePlan = (planId: 'trial' | 'tier1' | 'tier2') => {
    if (planId === 'trial') {
      // Go straight to profile
      router.push('/account/profile')
      return
    }

    // Redirect to Stripe checkout
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
          // Still let them continue
          router.push('/account/profile')
        }
      })
      .catch(() => {
        setError('Network error. You can upgrade later from your profile.')
        router.push('/account/profile')
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-full max-w-md p-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-2">measure.coffee</h1>
          <p className="text-[#8B7355] mb-6">Verify your phone number</p>
          <p className="text-sm text-[#8B7355] mb-6">
            We sent a 6-digit code to <strong>{phone}</strong>. Enter it below to confirm your account.
          </p>

          <form onSubmit={handleVerifyPhone} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-[#2C1810] mb-1">
                Verification code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full px-3 py-2 border border-[#D4C5B0] rounded-lg bg-white text-[#2C1810] text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
                placeholder="000000"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-700 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#2C1810] text-white rounded-lg font-medium hover:bg-[#3D2918] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify phone'}
            </button>
          </form>

          <button
            onClick={handleResendCode}
            className="mt-4 w-full py-2 text-sm text-[#8B7355] hover:text-[#2C1810] transition-colors"
          >
            Resend code
          </button>

          <p className="mt-6 text-xs text-[#8B7355] text-center">
            Phone verification prevents abuse and ensures one trial per number.
          </p>
        </div>
      </div>
    )
  }

  // ============= RENDER: Choose Plan =============
  if (step === 'choose-plan') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-full max-w-lg p-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-2">measure.coffee</h1>
          <p className="text-[#8B7355] mb-8">Choose your plan</p>

          {error && (
            <div className="text-red-700 text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</div>
          )}

          <div className="space-y-4">
            {/* Trial */}
            <button
              onClick={() => handleChoosePlan('trial')}
              className="w-full text-left p-5 border border-[#D4C5B0] rounded-xl bg-white hover:border-[#8B7355] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#2C1810]">Free Trial</h2>
                <span className="text-[#8B7355] font-medium">$0</span>
              </div>
              <p className="text-sm text-[#8B7355]">
                7 days free · 15K weekly tokens · Basic coffee Q&A and equipment lookup
              </p>
            </button>

            {/* Basic */}
            <button
              onClick={() => handleChoosePlan('tier1')}
              className="w-full text-left p-5 border-2 border-[#2C1810] rounded-xl bg-white hover:bg-[#F0E8DC] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#2C1810]">Basic</h2>
                <span className="text-[#2C1810] font-bold">$5/mo</span>
              </div>
              <p className="text-sm text-[#8B7355]">
                150K weekly tokens · Equipment guidance · Maintenance schedules · Full profile memory
              </p>
            </button>

            {/* Pro */}
            <button
              onClick={() => handleChoosePlan('tier2')}
              className="w-full text-left p-5 border border-[#D4C5B0] rounded-xl bg-[#2C1810] hover:bg-[#3D2918] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-white">Pro</h2>
                <span className="text-white font-bold">$19/mo</span>
              </div>
              <p className="text-sm text-[#8B7355]">
                500K weekly tokens · Priority model · Advanced diagnostics · Business consulting
              </p>
            </button>
          </div>

          <button
            onClick={() => router.push('/account/profile')}
            className="mt-4 w-full py-2 text-sm text-[#8B7355] hover:text-[#2C1810] transition-colors"
          >
            Skip — start with free trial
          </button>
        </div>
      </div>
    )
  }

  // ============= RENDER: Signup Details =============
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-[#2C1810] mb-2">measure.coffee</h1>
        <p className="text-[#8B7355] mb-8">Create your profile</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#2C1810] mb-1">
              Display name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[#D4C5B0] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
              placeholder="Coffee Lover"
            />
          </div>

          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-[#2C1810] mb-1">
              Handle
            </label>
            <input
              id="handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full px-3 py-2 border border-[#D4C5B0] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
              placeholder="coffeelover"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#2C1810] mb-1">
              Phone number <span className="text-red-600">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#D4C5B0] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
              placeholder="+1 555 123 4567"
            />
            <p className="text-xs text-[#8B7355] mt-1">
              We&apos;ll send a verification code via SMS. One trial per phone number.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#2C1810] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#D4C5B0] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#2C1810] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-[#D4C5B0] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-700 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#2C1810] text-white rounded-lg font-medium hover:bg-[#3D2918] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-[#8B7355] text-center">
            After creating your account, you&apos;ll verify your phone number, then choose a plan.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-[#8B7355]">
          Already have an account?{' '}
          <a href="/auth/login" className="text-[#2C1810] font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}