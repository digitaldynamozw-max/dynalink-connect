'use client'

import { useCartStore } from '@/lib/store'
import { Minus, Plus, Trash2, AlertCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { PayNowModal } from '@/components/paynow-modal'

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore()
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [customerAddress, setCustomerAddress] = useState('')
  const [deliveryFees, setDeliveryFees] = useState<any>(null)
  const [showAddressInput, setShowAddressInput] = useState(true)
  const [error, setError] = useState('')

  const total = getTotal()

  // Load saved delivery address from session
  useEffect(() => {
    const loadUserAddress = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch('/api/profile')
          const data = await res.json()
          if (data.deliveryAddress) {
            setCustomerAddress(data.deliveryAddress)
            setShowAddressInput(false)
            await calculateDelivery(data.deliveryAddress)
          }
        } catch (error) {
          console.error('Failed to load user profile:', error)
        }
      }
    }
    
    loadUserAddress()
  }, [session])

  const calculateDelivery = async (address: string) => {
    try {
      const response = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity
          })),
          customerAddress: address
        })
      })

      if (!response.ok) {
        throw new Error('Failed to calculate delivery')
      }

      const data = await response.json()
      setDeliveryFees(data)
      setError('')
      setShowAddressInput(false)
    } catch (error) {
      setError('Failed to calculate delivery fees')
      console.error('Delivery calculation error:', error)
    }
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerAddress.trim()) {
      setError('Please enter a delivery address')
      return
    }
    
    setLoading(true)
    try {
      await calculateDelivery(customerAddress)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!deliveryFees) {
      setError('Please enter your delivery address')
      setShowAddressInput(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            name: item.name
          })),
          customerAddress
        })
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Checkout failed')
        return
      }
      
      setPaymentData(data)
      setShowPayment(true)
    } catch (error) {
      setError('Checkout failed. Please try again.')
      console.error('Checkout failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
          <a href="/products" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">
            Continue Shopping
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md mr-4" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-gray-600">${item.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300"
                        title="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-lg font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-300"
                        title="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove item from cart"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              {showAddressInput && (
                <form onSubmit={handleAddressSubmit} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="123 Main Street, City, State"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Apply'}
                    </button>
                  </div>
                </form>
              )}

              {customerAddress && !showAddressInput && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-900">
                    Deliveries to: <span className="font-semibold">{customerAddress}</span>
                    <button 
                      onClick={() => setShowAddressInput(true)}
                      className="ml-2 text-blue-600 hover:underline text-xs"
                    >
                      Change
                    </button>
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {deliveryFees && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-sm font-medium text-gray-900 mb-2">Delivery Fees:</p>
                      {deliveryFees.vendorFees.map((fee: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600 flex justify-between ml-2">
                          <span>{fee.vendorId === 'admin' ? 'Admin Store' : `Vendor ${fee.vendorId.slice(0, 8)}`}</span>
                          <span>${fee.fee.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-gray-700 font-semibold border-t pt-2">
                      <span>Delivery:</span>
                      <span>${deliveryFees.totalDeliveryFee.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between mb-4 text-2xl font-bold">
                <span>Total:</span>
                <span>${(total + (deliveryFees?.totalDeliveryFee || 0)).toFixed(2)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading || !deliveryFees}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    {showPayment && paymentData && (
      <PayNowModal
        paymentData={paymentData}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          clearCart()
          router.push(`/success?orderId=${paymentData.orderId}`)
        }}
      />
    )}
    </>
  )
}