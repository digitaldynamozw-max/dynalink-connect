import { useCallback } from 'react'

interface AnalyticsEvent {
  eventType: 'viewed' | 'added_to_cart' | 'purchased' | 'searched' | 'filtered'
  productId?: string
  productName?: string
  amount?: number
  orderId?: string
}

export function useAnalytics() {
  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
    } catch (error) {
      console.error('Failed to track analytics:', error)
    }
  }, [])

  return { trackEvent }
}
