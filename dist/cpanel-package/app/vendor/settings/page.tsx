'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { VendorSidebar } from '@/components/vendor-sidebar'
import { Save, AlertCircle } from 'lucide-react'

interface VendorProfile {
  id: string
  vendorName: string
  vendorDescription: string
  vendorPhoneNumber: string
  vendorImage?: string
  storeBannerImage?: string
  vendorCategory?: string
  storeAddress: string
  storeCity: string
  storeState: string
  storeZipCode: string
  commissionRate: number
}

export default function VendorSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    void fetchProfile()
  }, [router, session, status])

  async function fetchProfile() {
    try {
      const response = await fetch('/api/vendor/register', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/vendor/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setMessage({ type: 'success', text: 'Settings saved successfully.' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex">
        <VendorSidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex">
        <VendorSidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Please register as a vendor first</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <VendorSidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Store Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your storefront details. Delivery and dispatch updates are handled by admin.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Store Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                  <input
                    type="text"
                    value={profile.vendorName}
                    onChange={(e) => setProfile({ ...profile, vendorName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter store name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store Category</label>
                  <input
                    type="text"
                    value={profile.vendorCategory || ''}
                    onChange={(e) => setProfile({ ...profile, vendorCategory: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Electronics, Beauty, Home..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profile.vendorPhoneNumber}
                    onChange={(e) => setProfile({ ...profile, vendorPhoneNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo Image URL</label>
                  <input
                    type="url"
                    value={profile.vendorImage || ''}
                    onChange={(e) => setProfile({ ...profile, vendorImage: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image URL</label>
                  <input
                    type="url"
                    value={profile.storeBannerImage || ''}
                    onChange={(e) => setProfile({ ...profile, storeBannerImage: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
                  <textarea
                    value={profile.vendorDescription}
                    onChange={(e) => setProfile({ ...profile, vendorDescription: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    rows={4}
                    placeholder="Describe your store"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Store Location</h2>
              <p className="text-sm text-gray-600 mb-4">
                This is your store location for records and pickup coordination. Delivery is managed from admin.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={profile.storeAddress}
                    onChange={(e) => setProfile({ ...profile, storeAddress: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter street address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={profile.storeCity}
                    onChange={(e) => setProfile({ ...profile, storeCity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={profile.storeState}
                    onChange={(e) => setProfile({ ...profile, storeState: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter state"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                  <input
                    type="text"
                    value={profile.storeZipCode}
                    onChange={(e) => setProfile({ ...profile, storeZipCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Enter zip code"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Commission</h2>
              <p className="text-sm text-gray-600">
                Your current marketplace commission rate is <strong>{profile.commissionRate}%</strong>.
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
