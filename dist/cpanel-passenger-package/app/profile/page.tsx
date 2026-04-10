'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Percent,
  ShoppingBag,
  Upload,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import {
  ProfileEmptyState,
  ProfileMessage,
  ProfilePageShell,
  ProfilePanel,
  ProfileStatCard,
} from '@/components/profile-ui'

interface UserProfile {
  id: string
  email: string
  name: string | null
  firstName: string | null
  lastName: string | null
  profilePicture: string | null
  accountBalance: number
  mobileNumber: string | null
  deliveryAddress: string | null
  createdAt: string
}

interface Stats {
  orders: number
  promoCodes: number
  referrals: number
}

function ProfileContent() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<Stats>({ orders: 0, promoCodes: 0, referrals: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState<UserProfile>({
    id: '',
    email: '',
    name: null,
    firstName: null,
    lastName: null,
    profilePicture: null,
    accountBalance: 0,
    mobileNumber: null,
    deliveryAddress: null,
    createdAt: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            throw new Error('Your session has expired. Please sign in again.')
          }
          throw new Error(`Failed to fetch profile: ${profileRes.status}`)
        }

        const profileData = await profileRes.json()
        setUser(profileData)
        setFormData(profileData)
        setProfileImage(profileData.profilePicture)

        const [ordersRes, promoRes, referralsRes] = await Promise.all([
          fetch('/api/orders', { credentials: 'include' }),
          fetch('/api/profile/promo-codes', { credentials: 'include' }),
          fetch('/api/profile/referrals', { credentials: 'include' }),
        ])

        let orderCount = 0
        let promoCount = 0
        let referralCount = 0

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          orderCount = Array.isArray(ordersData) ? ordersData.length : ordersData.length || 0
        }
        if (promoRes.ok) {
          const promoData = await promoRes.json()
          promoCount = promoData.active || 0
        }
        if (referralsRes.ok) {
          const referralData = await referralsRes.json()
          referralCount = referralData.completed || 0
        }

        setStats({
          orders: orderCount,
          promoCodes: promoCount,
          referrals: referralCount,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB.' })
      return
    }

    const formDataObj = new FormData()
    formDataObj.append('file', file)

    try {
      setSavingProfile(true)
      const res = await fetch('/api/profile/picture', {
        method: 'POST',
        credentials: 'include',
        body: formDataObj,
      })
      if (!res.ok) throw new Error('Failed to upload picture')
      const data = await res.json()
      setProfileImage(data.profilePicture)
      setFormData((current) => ({ ...current, profilePicture: data.profilePicture }))
      setMessage({ type: 'success', text: 'Profile picture updated.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload picture.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSavingProfile(true)
      const res = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobileNumber: formData.mobileNumber,
          deliveryAddress: formData.deliveryAddress,
        }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      const updated = await res.json()
      setUser((current) => (current ? { ...current, ...updated } : updated))
      setFormData((current) => ({ ...current, ...updated }))
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    try {
      setSavingPassword(true)
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      })
      if (!res.ok) throw new Error('Failed to change password')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage({ type: 'success', text: 'Password changed successfully.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password.' })
    } finally {
      setSavingPassword(false)
    }
  }

  const memberDate = useMemo(
    () =>
      user
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
          })
        : '',
    [user]
  )

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading account...</div>
  }

  if (!user) {
    return (
      <div className="min-h-[60vh]">
        <ProfileEmptyState title="Account unavailable" description={error || 'We could not load your account right now.'} />
      </div>
    )
  }

  return (
    <ProfilePageShell
      eyebrow="Account Overview"
      title="My Account"
      description="Manage your profile, password, delivery details, and account performance from one refreshed workspace."
      actions={
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <ShoppingBag className="h-4 w-4" />
          View Orders
        </Link>
      }
    >
      {message ? <ProfileMessage type={message.type} text={message.text} /> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <ProfileStatCard
          label="Account Balance"
          value={`$${user.accountBalance.toFixed(2)}`}
          helper="Available for marketplace purchases."
          accent="orange"
          icon={<Wallet className="h-5 w-5" />}
        />
        <ProfileStatCard
          label="Orders"
          value={stats.orders}
          helper="Orders tracked in your account history."
          accent="blue"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <ProfileStatCard
          label="Promo Codes"
          value={stats.promoCodes}
          helper="Active discounts ready for checkout."
          accent="emerald"
          icon={<Percent className="h-5 w-5" />}
        />
        <ProfileStatCard
          label="Referrals"
          value={stats.referrals}
          helper="Friends who completed your invite flow."
          accent="violet"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.25fr]">
        <ProfilePanel className="overflow-hidden">
          <div className="rounded-[1.15rem] bg-[linear-gradient(135deg,#0f172a,#1e293b,#334155)] p-4 text-white">
            <div className="flex items-center gap-3">
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt={user.name || 'Profile'} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/10" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <User className="h-7 w-7" />
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-300">Welcome back</p>
                <h2 className="mt-1 text-xl font-black">{user.name || 'DynaLink customer'}</h2>
                <p className="mt-1 text-xs text-slate-300">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-[1rem] bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Member Since</p>
              <p className="mt-1.5 text-base font-semibold text-slate-950">{memberDate}</p>
            </div>
            <div className="rounded-[1rem] bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saved Delivery Address</p>
              <div className="mt-1.5 flex items-start gap-2 text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <p className="text-xs leading-5">{user.deliveryAddress || 'No delivery address saved yet.'}</p>
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
              <Upload className="h-4 w-4" />
              {savingProfile ? 'Uploading...' : 'Upload picture'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </ProfilePanel>

        <div className="space-y-6">
          <ProfilePanel title="Profile Details" description="Update the personal details customers and delivery flows depend on.">
            <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">First Name</span>
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Last Name</span>
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Email Address</span>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-[1rem] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Phone Number</span>
                <input
                  type="tel"
                  value={formData.mobileNumber || ''}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Delivery Address</span>
                <textarea
                  value={formData.deliveryAddress || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  rows={3}
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                />
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save profile changes'}
                </button>
              </div>
            </form>
          </ProfilePanel>

          <ProfilePanel title="Security" description="Change your password and keep your account protected.">
            <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Current Password</span>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-orange-400"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">New Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-orange-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-2.5 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Confirm Password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    className="w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-orange-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-3 top-2.5 text-slate-400"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  <Lock className="h-4 w-4" />
                  {savingPassword ? 'Updating...' : 'Change password'}
                </button>
                <p className="text-xs text-slate-500">Use at least 6 characters and avoid reusing an old password.</p>
              </div>
            </form>
          </ProfilePanel>
        </div>
      </div>

      {error ? (
        <div className="inline-flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}
    </ProfilePageShell>
  )
}

export default function Profile() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading account...</div>}>
      <ProfileContent />
    </Suspense>
  )
}
