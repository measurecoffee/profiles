'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Step = 'details' | 'verify-phone'

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    // Create auth account
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

    // If phone provided, send verification SMS
    if (phone) {
      try {
        const res = await fetch('/api/phone/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        })

        const data = await res.json()

        if (!res.ok) {
          // SMS send failed — still let them through, just skip verification
          console.warn('Phone verification send failed:', data.error)
          router.push('/account/profile')
          return
        }

        setStep('verify-phone')
      } catch {
        // Network error — skip verification, proceed to profile
        router.push('/account/profile')
      }
    } else {
      // No phone — go straight to profile
      router.push('/account/profile')
    }

    setLoading(false)
  }

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

      // Verified — go to profile
      router.push('/account/profile')
    } catch {
      setError('Network error. Please try again.')
    }

    setLoading(false)
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

  if (step === 'verify-phone') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-full max-w-md p-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-2">measure.coffee</h1>
          <p className="text-[#8B7355] mb-8">Verify your phone number</p>
          <p className="text-sm text-[#8B7355] mb-6">
            We sent a code to <strong>{phone}</strong>. Enter it below to confirm.
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
        </div>
      </div>
    )
  }

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
              Phone number <span className="text-[#8B7355] font-normal">— required for free trial</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-[#D4C5B0] rounded-lg bg-white text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#8B7355]"
              placeholder="+15551234567"
            />
            <p className="text-xs text-[#8B7355] mt-1">Used to verify your account. One trial per phone number.</p>
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
            {loading ? 'Creating account...' : 'Start free trial'}
          </button>
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