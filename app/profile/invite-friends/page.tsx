'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, Share2, Users, Gift, AlertCircle } from 'lucide-react'

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

interface Stats {
  referrals: Referral[]
  completed: number
  pending: number
  totalRewards: number
}

export default function InviteFriends() {
  const [stats, setStats] = useState<Stats | null>(null)
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
      } catch (err) {
        setError('Failed to load referrals')
      } finally {
        setLoading(false)
      }
    }
    fetchReferrals()
  }, [])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    try {
      setInviting(true)
      const res = await fetch('/api/profile/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invitation')
      }
      setMessage({ type: 'success', text: 'Invitation sent successfully' })
      setEmail('')
      
      // Refresh referrals
      const refreshRes = await fetch('/api/profile/referrals')
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setStats(data)
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send invitation' })
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="text-red-600">{error || 'Failed to load data'}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Invite a Friend</h1>
        <p className="text-gray-600">Earn rewards when your friends join DynaLink Connect</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Rewards Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <Gift className="w-8 h-8 text-blue-600 mb-3" />
          <p className="text-sm text-blue-700 font-semibold mb-1">Your Reward</p>
          <p className="text-2xl font-bold text-blue-600">$25</p>
          <p className="text-xs text-blue-600 mt-2">Per successful referral</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <Users className="w-8 h-8 text-purple-600 mb-3" />
          <p className="text-sm text-purple-700 font-semibold mb-1">Friends Referred</p>
          <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
          <p className="text-xs text-purple-600 mt-2">Total active referrals</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <Gift className="w-8 h-8 text-green-600 mb-3" />
          <p className="text-sm text-green-700 font-semibold mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-green-600">${stats.totalRewards.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-2">From referral rewards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Share Referral Link */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-blue-600" />
            Share Your Referral Link
          </h2>

          <div className="mb-6">
            <label htmlFor="referral-link" className="block text-sm font-semibold text-gray-700 mb-3">Your Referral Link</label>
            <div className="flex gap-2">
              <input
                id="referral-link"
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition font-semibold ${
                  copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Share this link with your friends</p>
          </div>
        </div>

        {/* Invite Via Email */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite Via Email</h2>

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Friend's Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 Tip:</span> Your friends will receive a special welcome offer when they sign up using your referral link!
            </p>
          </div>
        </div>
      </div>

      {/* Referral History */}
      {stats.referrals.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Referrals</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-semibold text-gray-700 py-3">Name</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3">Email</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3">Join Date</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3">Status</th>
                  <th className="text-left text-sm font-semibold text-gray-700 py-3">Reward</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-4">
                      <p className="font-medium text-gray-900">{referral.referred.name || 'Unknown'}</p>
                    </td>
                    <td className="py-4 text-gray-600">{referral.referred.email}</td>
                    <td className="py-4 text-gray-600">
                      {new Date(referral.referred.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          referral.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {referral.status === 'completed' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          referral.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {referral.status === 'completed' ? `$${referral.rewardAmount}` : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.referrals.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Referrals Yet</h3>
          <p className="text-gray-600">Start inviting friends to earn rewards!</p>
        </div>
      )}
    </div>
  )
}