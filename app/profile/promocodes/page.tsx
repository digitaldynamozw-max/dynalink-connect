'use client'
import React, { useState, useEffect } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'

interface PromoCode {
  id: string
  code: string
  discount: number
  description: string | null
  expiryDate: string
  maxUses: number
  currentUses: number
  minPurchase: number
}

interface Stats {
  promoCodes: PromoCode[]
  active: number
  expired: number
  totalSavings: number
}

export default function PromoCodes() {
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const fetchPromoCodes = async () => {
      try {
        const res = await fetch('/api/profile/promo-codes')
        if (!res.ok) throw new Error('Failed to fetch promo codes')
        const result = await res.json()
        setData(result)
      } catch (err) {
        setError('Failed to load promo codes')
      } finally {
        setLoading(false)
      }
    }
    fetchPromoCodes()
  }, [])

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
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

  if (!data) {
    return (
      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="text-red-600">{error || 'Failed to load data'}</div>
      </div>
    )
  }

  const activeCodes = data.promoCodes.filter(
    (code) => new Date(code.expiryDate) > new Date() && code.currentUses < code.maxUses
  )
  const expiredCodes = data.promoCodes.filter(
    (code) => new Date(code.expiryDate) <= new Date() || code.currentUses >= code.maxUses
  )

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Promo Codes</h1>
        <p className="text-gray-600">Manage and track your discount codes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <p className="text-sm text-green-700 mb-2">Active Codes</p>
          <p className="text-3xl font-bold text-green-600">{data.active}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-700 mb-2">Total Savings</p>
          <p className="text-3xl font-bold text-blue-600">${data.totalSavings.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <p className="text-sm text-purple-700 mb-2">Expired Codes</p>
          <p className="text-3xl font-bold text-purple-600">{data.expired}</p>
        </div>
      </div>

      {/* Active Promo Codes */}
      {activeCodes.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Codes</h2>
          <div className="space-y-4">
            {activeCodes.map((promoCode) => (
              <div
                key={promoCode.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border-l-4 border-blue-500"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-2xl font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg font-mono">
                        {promoCode.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(promoCode.code)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition group"
                        title="Copy code"
                      >
                        {copiedCode === promoCode.code ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 mb-3">{promoCode.description || 'Discount code'}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Discount</p>
                        <p className="font-semibold text-gray-900">${promoCode.discount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Uses Left</p>
                        <p className="font-semibold text-gray-900">
                          {promoCode.maxUses === 0 ? 'Unlimited' : promoCode.maxUses - promoCode.currentUses}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Min. Purchase</p>
                        <p className="font-semibold text-gray-900">${promoCode.minPurchase}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expires</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(promoCode.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Codes */}
      {expiredCodes.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Expired Codes</h2>
          <div className="space-y-4">
            {expiredCodes.map((promoCode) => (
              <div
                key={promoCode.id}
                className="bg-gray-50 rounded-xl shadow-sm p-6 border-l-4 border-gray-300 opacity-60"
              >
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <code className="text-lg font-bold text-gray-600 bg-white px-3 py-1 rounded-lg font-mono">
                      {promoCode.code}
                    </code>
                    <p className="text-gray-600 mt-2">{promoCode.description || 'Discount code'}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {new Date(promoCode.expiryDate) <= new Date()
                        ? `Expired on ${new Date(promoCode.expiryDate).toLocaleDateString()}`
                        : 'All uses exhausted'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.promoCodes.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🎟️</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Promo Codes Yet</h3>
          <p className="text-gray-600 mb-6">You don't have any promo codes at the moment.</p>
        </div>
      )}
    </div>
  )
}