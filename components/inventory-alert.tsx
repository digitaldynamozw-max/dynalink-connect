'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Product {
  id: string
  name: string
  stock: number
  price: number
}

interface StockAlert {
  productId: string
  productName: string
  currentStock: number
  threshold: number
}

interface InventoryAlertProps {
  threshold?: number
  onAlertsChange?: (alerts: StockAlert[]) => void
}

export function InventoryAlert({ threshold = 5, onAlertsChange }: InventoryAlertProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchLowStockProducts()
  }, [threshold])

  async function fetchLowStockProducts() {
    try {
      const response = await fetch(`/api/vendor/products?lowStock=${threshold}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const products = await response.json()
        const lowStockAlerts = products
          .filter((p: Product) => p.stock <= threshold)
          .map((p: Product) => ({
            productId: p.id,
            productName: p.name,
            currentStock: p.stock,
            threshold: threshold,
          }))

        setAlerts(lowStockAlerts)
        onAlertsChange?.(lowStockAlerts)
      }
    } catch (error) {
      console.error('Failed to fetch low stock products:', error)
    } finally {
      setLoading(false)
    }
  }

  function dismissAlert(productId: string) {
    const newDismissed = new Set(dismissed)
    newDismissed.add(productId)
    setDismissed(newDismissed)
  }

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.productId))

  if (loading) {
    return null
  }

  if (visibleAlerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {visibleAlerts.map(alert => (
        <div
          key={alert.productId}
          className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />

          <div className="flex-1">
            <h4 className="font-semibold text-orange-900">{alert.productName}</h4>
            <p className="text-sm text-orange-800">
              Current stock: <strong>{alert.currentStock} units</strong> (threshold: {alert.threshold})
            </p>
          </div>

          <button
            onClick={() => dismissAlert(alert.productId)}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            title="Dismiss alert"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
