'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Store } from 'lucide-react'

export default function VendorRegisterPage() {
  const { data: session } = useSession() as any
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    vendorName: '',
    vendorDescription: '',
    storeAddress: '',
    storeCity: '',
    storeState: '',
    storeZipCode: '',
    vendorPhoneNumber: '',
    latitude: '',
    longitude: ''
  })

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to become a vendor.</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to register as vendor')
      }

      router.push('/vendor/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Become a Vendor</h1>
          <p className="text-gray-600 text-lg">
            Join our marketplace and start selling your products to customers
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Store Name *
              </label>
              <input
                type="text"
                name="vendorName"
                value={formData.vendorName}
                onChange={handleChange}
                placeholder="Your unique store name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Store Description
              </label>
              <textarea
                name="vendorDescription"
                value={formData.vendorDescription}
                onChange={handleChange}
                placeholder="Tell customers about your store"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Store Address *
              </label>
              <input
                type="text"
                name="storeAddress"
                value={formData.storeAddress}
                onChange={handleChange}
                placeholder="Street address"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">City *</label>
                <input
                  type="text"
                  name="storeCity"
                  value={formData.storeCity}
                  onChange={handleChange}
                  placeholder="City"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">State *</label>
                <input
                  type="text"
                  name="storeState"
                  value={formData.storeState}
                  onChange={handleChange}
                  placeholder="State"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Zip Code *</label>
                <input
                  type="text"
                  name="storeZipCode"
                  value={formData.storeZipCode}
                  onChange={handleChange}
                  placeholder="Zip code"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="vendorPhoneNumber"
                value={formData.vendorPhoneNumber}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Latitude (optional)
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="40.7128"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Longitude (optional)
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="-74.0060"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Create Store'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already a vendor? <a href="/vendor/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">Go to Dashboard</a>
            </p>
          </form>
        </div>

        {/* Benefits */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 rounded-lg p-4 w-fit mx-auto mb-4">
              <Store className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Your Own Store</h3>
            <p className="text-gray-600 text-sm">Complete control over your products and prices</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 rounded-lg p-4 w-fit mx-auto mb-4">
              <Store className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Delivery</h3>
            <p className="text-gray-600 text-sm">Automatic delivery fee calculation by location</p>
          </div>
          <div className="text-center">
            <div className="bg-pink-100 rounded-lg p-4 w-fit mx-auto mb-4">
              <Store className="h-8 w-8 text-pink-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Grow Your Business</h3>
            <p className="text-gray-600 text-sm">Access to thousands of customers</p>
          </div>
        </div>
      </div>
    </div>
  )
}
