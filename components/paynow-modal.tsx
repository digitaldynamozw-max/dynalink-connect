'use client'

import { X } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PayNowPayment {
  orderId: string
  payNowRef: string
  amount: number
  subtotal?: number
  deliveryFee?: number
  vendorFees?: Array<{ vendorId: string; fee: number; itemCount: number }>
  successUrl: string
}

interface PayNowModalProps {
  paymentData: PayNowPayment
  onClose: () => void
  onSuccess: () => void
}

export function PayNowModal({ paymentData, onClose, onSuccess }: PayNowModalProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [cardName, setCardName] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '')
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setCardNumber(value.replace(/(\d{4})/g, '$1 ').trim())
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setExpiry(value.length >= 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value)
    }
  }

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 3) setCvc(value)
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update order status to paid
      const response = await fetch(`/api/orders/${paymentData.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      })

      if (response.ok) {
        onSuccess()
      } else {
        alert('Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentData.payNowRef)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold text-white">PayNow Payment</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            title="Close payment modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Payment Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Payment Reference:</p>
            <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-300">
              <span className="font-mono font-bold text-lg text-blue-600">{paymentData.payNowRef}</span>
              <button
                onClick={copyToClipboard}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          {(paymentData.subtotal !== undefined || paymentData.deliveryFee !== undefined) && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900 mb-3">Order Breakdown</p>
              {paymentData.subtotal !== undefined && (
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal:</span>
                  <span>${paymentData.subtotal.toFixed(2)}</span>
                </div>
              )}
              
              {paymentData.vendorFees && paymentData.vendorFees.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mt-2 mb-1">Delivery Fees:</p>
                  {paymentData.vendorFees.map((fee, index) => (
                    <div key={index} className="flex justify-between text-xs text-gray-600 ml-2">
                      <span>
                        {fee.vendorId === 'admin' ? 'Admin Store' : `Vendor (${fee.itemCount} item${fee.itemCount !== 1 ? 's' : ''})`}
                      </span>
                      <span>${fee.fee.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {paymentData.deliveryFee !== undefined && (
                <div className="flex justify-between text-sm font-semibold text-gray-900 border-t pt-2 mt-2">
                  <span>Total Delivery:</span>
                  <span>${paymentData.deliveryFee.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Total Amount to Pay</p>
            <p className="text-4xl font-bold text-gray-900">${paymentData.amount.toFixed(2)}</p>
          </div>

          {/* Card Form */}
          <form onSubmit={handlePayment} className="space-y-4">
            {/* Card Holder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                required
                maxLength={19}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Expiry and CVC */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  required
                  maxLength={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={handleCvcChange}
                  placeholder="123"
                  required
                  maxLength={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              disabled={loading || !cardNumber || !expiry || !cvc || !cardName}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Pay $${paymentData.amount.toFixed(2)}`}
            </button>
          </form>

          {/* Footer Text */}
          <p className="text-xs text-gray-500 text-center">
            Your payment is secured with PayNow. We accept all major credit cards.
          </p>
        </div>
      </div>
    </div>
  )
}
