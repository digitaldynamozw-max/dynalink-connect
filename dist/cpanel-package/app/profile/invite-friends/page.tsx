'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Gift, Share2, Users } from 'lucide-react'
import { ProfileEmptyState, ProfileMessage, ProfilePageShell, ProfilePanel, ProfileStatCard } from '@/components/profile-ui'

interface Referral {
  id: string
  referred: {
    id: string
    email: string
    name: string | null
    createdAt: string
  }
  status: string
  rewardAmount: number
  createdAt: string
}

interface ReferralStats {
  referrals: Referral[]
  completed: number
  pending: number
  totalRewards: number
}

export default function InviteFriends() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/signup?ref=friend`

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await fetch('/api/profile/referrals')
        if (!res.ok) throw new Error('Failed to fetch referrals')
        const data = await res.json()
        setStats(data)
      } catch {
        setError('Failed to load referrals')
      } finally {
        setLoading(false)
      }
    }

    void fetchReferrals()
  }, [])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter an email address.' })
      return
    }

    try {
      setInviting(true)
      const res = await fetch('/api/profile/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invitation')
      }
      setMessage({ type: 'success', text: 'Invitation sent successfully.' })
      setEmail('')

      const refreshRes = await fetch('/api/profile/referrals')
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setStats(data)
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send invitation.' })
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading referrals...</div>
  }

  if (!stats) {
    return <ProfileEmptyState title="Referrals unavailable" description={error || 'We could not load your referral data.'} />
  }

  return (
    <ProfilePageShell
      eyebrow="Referrals"
      title="Invite Friends"
      description="Share your link, send direct invites, and watch your rewards grow when referrals convert."
    >
      {message ? <ProfileMessage type={message.type} text={message.text} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProfileStatCard label="Reward Per Referral" value="$25" helper="Earned for each successful signup flow." accent="orange" icon={<Gift className="h-5 w-5" />} />
        <ProfileStatCard label="Completed Referrals" value={stats.completed} helper="Friends who completed the referral milestone." accent="violet" icon={<Users className="h-5 w-5" />} />
        <ProfileStatCard label="Total Earned" value={`$${stats.totalRewards.toFixed(2)}`} helper="Total rewards from referrals so far." accent="emerald" icon={<Gift className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfilePanel title="Share Your Referral Link" description="Copy your personal invite link and send it anywhere you want.">
          <div className="rounded-[1rem] bg-slate-50 p-3">
            <label htmlFor="referral-link" className="block text-xs font-semibold text-slate-700">
              Your referral link
            </label>
            <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
              <input
                id="referral-link"
                type="text"
                value={referralLink}
                readOnly
                className="min-w-0 flex-1 rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        </ProfilePanel>

        <ProfilePanel title="Invite By Email" description="Send a direct invitation without leaving your account dashboard.">
          <form onSubmit={handleInviteSubmit} className="space-y-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Friend&apos;s Email Address</span>
              <input
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                required
              />
            </label>
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" />
              {inviting ? 'Sending...' : 'Send invitation'}
            </button>
          </form>
        </ProfilePanel>
      </div>

      {stats.referrals.length > 0 ? (
        <ProfilePanel title="Referral History" description="Monitor who joined and which rewards have already matured.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2.5 font-semibold">Name</th>
                  <th className="pb-2.5 font-semibold">Email</th>
                  <th className="pb-2.5 font-semibold">Join Date</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Reward</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{referral.referred.name || 'Unknown'}</td>
                    <td className="py-3 text-slate-600">{referral.referred.email}</td>
                    <td className="py-3 text-slate-600">{new Date(referral.referred.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          referral.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {referral.status === 'completed' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {referral.status === 'completed' ? `$${referral.rewardAmount}` : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProfilePanel>
      ) : (
        <ProfileEmptyState title="No referrals yet" description="Start sharing your link and your first successful referral will show up here." />
      )}
    </ProfilePageShell>
  )
}
