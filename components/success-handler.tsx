'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store'

interface Props {
  orderId?: string | null
  sessionId?: string | null
}

export default function SuccessHandler({ orderId, sessionId }: Props) {
  const router = useRouter()
  const clearCart = useCartStore(state => state.clearCart)

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setStatus('error')
      setMessage('Missing order information. Please check your order history.')
      return
    }

    const finalizeOrder = async () => {
      setStatus('processing')
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' })
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error?.error || 'Failed to finalize order')
        }

        clearCart()
        setStatus('success')
        setMessage('Your payment was successful! Your order is confirmed and will be delivered within 60 minutes.')
      } catch (err) {
        setStatus('error')
        setMessage((err as Error).message)
      }
    }

    finalizeOrder().catch(console.error)
  }, [orderId, clearCart])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-3xl w-full px-4 py-16">
        <div className="bg-white rounded-xl shadow-md p-10 text-center">
          {status === 'processing' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Finalizing your order...</h1>
              <p className="text-gray-600">Hang tight while we confirm your payment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-3xl font-bold text-green-600 mb-4">Order Confirmed!</h1>
              <p className="text-gray-700 mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => router.push('/orders')}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
                >
                  View Order History
                </button>
                <button
                  onClick={() => router.push('/products')}
                  className="w-full sm:w-auto bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300"
                >
                  Continue Shopping
                </button>
              </div>
              {sessionId && (
                <p className="mt-6 text-sm text-gray-500">Stripe session: {sessionId}</p>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-3xl font-bold text-red-600 mb-4">Order could not be completed</h1>
              <p className="text-gray-700 mb-6">{message}</p>
              <button
                onClick={() => router.push('/cart')}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
              >
                Return to Cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
