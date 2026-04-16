'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, handle },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/account/profile')
    }
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
              placeholder="Joel Rhine"
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
              placeholder="rhonen"
            />
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