'use client'

import { useCartStore } from '@/lib/store'
import { Minus, Plus, Trash2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { PayNowModal } from '@/components/paynow-modal'

interface DeliveryFeeBreakdown {
  vendorId: string
  vendorName: string
  distanceKm?: number | null
  durationMinutes?: number | null
  fee: number
  itemCount: number
  available?: boolean
  availabilityMessage?: string | null
  nextOpenLabel?: string | null
}

interface DeliveryQuote {
  customerAddress: string
  vendorFees: DeliveryFeeBreakdown[]
  totalDeliveryFee: number
  ratePerKm?: number
  hasUnavailableVendors?: boolean
}

interface PaymentModalData {
  orderId: string
  payNowRef: string
  amount: number
  subtotal: number
  deliveryFee: number
  platformFee?: number
  fulfillmentMethod?: 'delivery' | 'pickup'
  requestedDeliveryAt?: string | null
  vendorFees: DeliveryFeeBreakdown[]
  successUrl: string
}

interface CheckoutSettings {
  pickupEnabled: boolean
  platformFeePerOrder: number
  globalDeliveryEtaMinutes: number
  platformOrdersPaused: boolean
  allStoresTemporarilyClosed: boolean
  platformStoreAddress?: string | null
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentModalData | null>(null)
  const [customerAddress, setCustomerAddress] = useState('')
  const [scheduleDelivery, setScheduleDelivery] = useState(false)
  const [requestedDeliveryAt, setRequestedDeliveryAt] = useState('')
  const [deliveryFees, setDeliveryFees] = useState<DeliveryQuote | null>(null)
  const [showAddressInput, setShowAddressInput] = useState(true)
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null)
  const [error, setError] = useState('')

  const total = getTotal()
  const platformFee = checkoutSettings?.platformFeePerOrder || 0
  const collectionAddress = items[0]?.vendorAddress || checkoutSettings?.platformStoreAddress || 'Vendor shop address will be confirmed after checkout.'

  const calculateDelivery = useCallback(async (address: string) => {
    try {
      const response = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions || [],
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
  }, [items])

  // Load saved delivery address from session
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/site-settings')
        const data = await response.json()
        if (data?.settings) {
          setCheckoutSettings(data.settings)
          if (data.settings.pickupEnabled === false) {
            setFulfillmentMethod('delivery')
          }
        }
      } catch (settingsError) {
        console.error('Failed to load checkout settings:', settingsError)
      }
    }

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
    
    loadSettings()
    loadUserAddress()
  }, [calculateDelivery, session?.user?.email])

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
    if (status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (checkoutSettings?.platformOrdersPaused) {
      setError('The marketplace is not accepting orders right now.')
      return
    }

    if (checkoutSettings?.allStoresTemporarilyClosed) {
      setError('All stores are temporarily closed right now.')
      return
    }

    if (fulfillmentMethod === 'delivery' && !deliveryFees) {
      setError('Please enter your delivery address')
      setShowAddressInput(true)
      return
    }

    if (fulfillmentMethod === 'delivery' && deliveryFees?.hasUnavailableVendors) {
      setError('One or more stores are currently closed. Remove them or wait until they reopen.')
      return
    }

    if (scheduleDelivery) {
      if (!requestedDeliveryAt) {
        setError('Please choose a delivery date and time')
        return
      }

      const scheduledAt = new Date(requestedDeliveryAt)
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        setError('Please choose a future delivery date and time')
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            selectedOptions: item.selectedOptions || [],
            selectedOptionsSummary: item.selectedOptionsSummary || '',
          })),
          customerAddress: fulfillmentMethod === 'pickup' ? null : customerAddress,
          fulfillmentMethod,
          requestedDeliveryAt:
            scheduleDelivery && requestedDeliveryAt
              ? new Date(requestedDeliveryAt).toISOString()
              : null,
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
          <Link href="/products" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Checking your session...</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf0,#fff,#f8fafc)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 rounded-[1.5rem] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed,#ffffff_48%,#fef3c7)] p-4 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Shopping Cart</h1>
          <p className="mt-1 text-sm text-slate-600">Review items, confirm delivery details, and move to payment.</p>
        </div>
        
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-[1rem] border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {items.map(item => (
              <div key={item.id} className="mb-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="mr-3 h-14 w-14 rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                      <p className="text-sm text-slate-600">${item.price}</p>
                      {item.selectedOptionsSummary ? (
                        <p className="mt-1 text-xs text-slate-500">{item.selectedOptionsSummary}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
                        title="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
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
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-slate-900">Order Summary</h2>

              <div className="mb-4 rounded-[1rem] border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Fulfilment</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('delivery')}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      fulfillmentMethod === 'delivery'
                        ? 'border-slate-900 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => checkoutSettings?.pickupEnabled && setFulfillmentMethod('pickup')}
                    disabled={!checkoutSettings?.pickupEnabled}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      fulfillmentMethod === 'pickup'
                        ? 'border-slate-900 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Collection
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {fulfillmentMethod === 'pickup'
                    ? `Customer collection happens at ${collectionAddress}${items[0]?.vendorName ? ` for ${items[0].vendorName}` : ''}.`
                    : 'Delivery fee is calculated from store to customer address.'}
                </p>
              </div>
              
              {fulfillmentMethod === 'delivery' && showAddressInput && (
                <form onSubmit={handleAddressSubmit} className="mb-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Delivery Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="123 Main Street, City, State"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-slate-950 px-3 py-2.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Apply'}
                    </button>
                  </div>
                </form>
              )}

              {fulfillmentMethod === 'delivery' && customerAddress && !showAddressInput && (
                <div className="mb-4 rounded-[1rem] bg-blue-50 p-3">
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

              <div className="mb-4 rounded-[1rem] border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <input
                    type="checkbox"
                    checked={scheduleDelivery}
                    onChange={(event) => {
                      setScheduleDelivery(event.target.checked)
                      if (!event.target.checked) {
                        setRequestedDeliveryAt('')
                        setError('')
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Schedule delivery for later
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Leave unchecked for the earliest available handoff.
                </p>

                {scheduleDelivery ? (
                  <div className="mt-3">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Delivery Date And Time
                    </label>
                    <input
                      type="datetime-local"
                      value={requestedDeliveryAt}
                      min={new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
                      onChange={(e) => setRequestedDeliveryAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    />
                  </div>
                ) : null}
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-700">
                  <span>Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {checkoutSettings ? (
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Platform fee:</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                ) : null}
                {fulfillmentMethod === 'delivery' && deliveryFees && (
                  <>
                    <div className="mt-2 border-t pt-2">
                      <p className="mb-2 text-sm font-medium text-slate-900">Delivery Fees:</p>
                      {deliveryFees.vendorFees.map((fee, idx: number) => (
                        <div key={idx} className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                          <div className="flex justify-between text-slate-700">
                            <span>
                              {fee.vendorName}
                              {typeof fee.distanceKm === 'number' ? ` (${fee.distanceKm.toFixed(2)} km)` : ''}
                            </span>
                            <span className={fee.available === false ? 'text-red-700 font-semibold' : ''}>
                              {fee.available === false ? 'Unavailable' : `$${fee.fee.toFixed(2)}`}
                            </span>
                          </div>
                          {fee.available === false && fee.availabilityMessage && (
                            <p className="mt-1 text-red-700">{fee.availabilityMessage}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm font-semibold text-slate-700">
                      <span>Delivery:</span>
                      <span>${deliveryFees.totalDeliveryFee.toFixed(2)}</span>
                    </div>
                    {typeof deliveryFees.ratePerKm === 'number' && (
                      <p className="text-xs text-gray-500">
                        Charged at ${deliveryFees.ratePerKm.toFixed(2)} per km from each store to your address.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="mb-4 flex justify-between text-xl font-bold text-slate-950">
                <span>Total:</span>
                <span>${(total + (fulfillmentMethod === 'delivery' ? deliveryFees?.totalDeliveryFee || 0 : 0) + platformFee).toFixed(2)}</span>
              </div>

              <div className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {fulfillmentMethod === 'pickup' ? 'Collection time: ' : 'Delivery time: '}
                <span className="font-medium text-slate-900">
                  {scheduleDelivery && requestedDeliveryAt
                    ? new Date(requestedDeliveryAt).toLocaleString()
                    : 'As soon as possible'}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={
                  loading ||
                  checkoutSettings?.platformOrdersPaused ||
                  checkoutSettings?.allStoresTemporarilyClosed ||
                  (fulfillmentMethod === 'delivery' && (!deliveryFees || deliveryFees.hasUnavailableVendors))
                }
                className="w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Processing...'
                  : checkoutSettings?.platformOrdersPaused
                    ? 'Orders Paused'
                    : checkoutSettings?.allStoresTemporarilyClosed
                      ? 'Stores Closed'
                      : fulfillmentMethod === 'delivery' && deliveryFees?.hasUnavailableVendors
                        ? 'Delivery Unavailable'
                        : 'Proceed to Payment'}
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
