'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('not verified')) {
        setError('Your email is not yet confirmed. Check your inbox for a verification link, or sign up again with phone verification.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      router.push('/account/profile')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-[#2C1810] mb-2">measure.coffee</h1>
        <p className="text-[#8B7355] mb-8">Sign in to your profile</p>

        <form onSubmit={handleLogin} className="space-y-4">
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8B7355]">
          Don&apos;t have an account?{' '}
          <a href="/auth/signup" className="text-[#2C1810] font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}