'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  User,
  Wallet,
  ShoppingBag,
  Percent,
  Users,
  Upload,
  Eye,
  EyeOff,
  Check,
  AlertCircle
} from 'lucide-react'

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

export default function Profile() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'password'>(
    (tabParam as any) || 'overview'
  )

  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<Stats>({ orders: 0, promoCodes: 0, referrals: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
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
    createdAt: ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile
        const profileRes = await fetch('/api/profile')
        if (!profileRes.ok) throw new Error('Failed to fetch profile')
        const profileData = await profileRes.json()
        setUser(profileData)
        setFormData(profileData)
        setProfileImage(profileData.profilePicture)

        // Fetch stats
        const [ordersRes, promoRes, referralsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/profile/promo-codes'),
          fetch('/api/profile/referrals')
        ])

        let orderCount = 0
        let promoCount = 0
        let referralCount = 0

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          orderCount = Array.isArray(ordersData) ? ordersData.length : (ordersData.length || 0)
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
          referrals: referralCount
        })
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' })
        return
      }

      const formDataObj = new FormData()
      formDataObj.append('file', file)

      try {
        setSaving(true)
        const res = await fetch('/api/profile/picture', {
          method: 'POST',
          body: formDataObj
        })
        if (!res.ok) throw new Error('Failed to upload picture')
        const data = await res.json()
        setProfileImage(data.profilePicture)
        setFormData({ ...formData, profilePicture: data.profilePicture })
        setMessage({ type: 'success', text: 'Profile picture updated' })
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to upload picture' })
      } finally {
        setSaving(false)
      }
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobileNumber: formData.mobileNumber,
          deliveryAddress: formData.deliveryAddress
        })
      })
      if (!res.ok) throw new Error('Failed to update profile')
      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      })
      if (!res.ok) throw new Error('Failed to change password')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage({ type: 'success', text: 'Password changed successfully' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to change password' })
    } finally {
      setSaving(false)
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

  if (!user) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="text-red-600">{error || 'User not found'}</div>
      </div>
    )
  }

  const memberDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  })

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 font-medium transition ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 font-medium transition ${
            activeTab === 'profile'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Edit Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 px-4 font-medium transition ${
            activeTab === 'password'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Change Password
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Card */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.name || 'Profile'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Welcome back</p>
                  <p className="text-2xl font-bold text-gray-900">{user.name || 'User'}</p>
                </div>
              </div>
              <div className="border-t pt-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="text-lg font-medium text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-lg font-medium text-gray-900">{memberDate}</p>
                </div>
              </div>
            </div>

            {/* Account Balance Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-xl shadow-lg text-white">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-blue-100 mb-2">Account Balance</p>
                  <p className="text-5xl font-bold">${user.accountBalance.toFixed(2)}</p>
                </div>
                <Wallet className="w-12 h-12 text-blue-200 opacity-50" />
              </div>
              <p className="text-blue-100">Available for purchases and withdrawals</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/orders"
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition text-center"
            >
              <ShoppingBag className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-blue-600">{stats.orders}</p>
              <p className="text-sm text-gray-600">Orders</p>
            </a>
            <a
              href="/profile/promocodes"
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition text-center"
            >
              <Percent className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-green-600">{stats.promoCodes}</p>
              <p className="text-sm text-gray-600">Promo Codes</p>
            </a>
            <a
              href="/profile/invite-friends"
              className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition text-center"
            >
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-purple-600">{stats.referrals}</p>
              <p className="text-sm text-gray-600">Referrals</p>
            </a>
          </div>
        </div>
      )}

      {/* Edit Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Picture */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
                <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-white text-center">
                      <div className="text-4xl mb-2">📷</div>
                    </div>
                  )}
                </div>
                <label className="block cursor-pointer">
                  <div className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium">
                    <Upload className="w-4 h-4" />
                    {saving ? 'Uploading...' : 'Upload Picture'}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2">
                  Email (Cannot be changed)
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.mobileNumber || ''}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-semibold mb-2">
                  Delivery Address
                </label>
                <textarea
                  id="address"
                  value={formData.deliveryAddress || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <h3 className="text-lg font-semibold">Change Password</h3>

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-semibold mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}