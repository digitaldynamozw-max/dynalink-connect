'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/auth-shell'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })

      if (response.ok) {
        // Auto sign in after signup
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false
        })

        if (result?.ok) {
          router.push('/')
        }
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Unable to create your account')
      }
    } catch {
      setErrorMessage('Failed to sign up')
    }

    setLoading(false)
  }

  return (
    <AuthShell
      kicker="Create Account"
      title="Start your DynaLink account."
      subtitle="Create one identity for shopping, order tracking, and future marketplace features, all inside the same branded experience."
      footer={
        <p>
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-semibold text-[var(--brand-accent-strong)] transition hover:text-[var(--brand-accent)]">
            Sign in instead
          </Link>
        </p>
      }
    >
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent-strong)]">
          New Customer
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Sign up</h2>
        <p className="mt-2 text-sm text-slate-600">
          Set up your account and we&apos;ll sign you in right away.
        </p>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded-2xl border border-[rgba(255,129,129,0.35)] bg-[rgba(255,129,129,0.12)] px-4 py-3 text-sm text-rose-950">
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-2xl border border-white/18 bg-white/42 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-xl outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-highlight)]"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-2xl border border-white/18 bg-white/42 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-xl outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-highlight)]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-2xl border border-white/18 bg-white/42 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-xl outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-highlight)]"
            placeholder="Create a password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="theme-accent-btn inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
