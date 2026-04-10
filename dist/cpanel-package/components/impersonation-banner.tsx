'use client'

import { AlertCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function ImpersonationBanner() {
  const router = useRouter()
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [vendorName, setVendorName] = useState('')

  useEffect(() => {
    // Check if admin is impersonating by looking for the cookie
    const checkImpersonation = async () => {
      try {
        const res = await fetch('/api/admin/impersonate-status')
        if (res.ok) {
          const data = await res.json()
          if (data.isImpersonating) {
            setIsImpersonating(true)
            setVendorName(data.vendorName)
          }
        }
      } catch (error) {
        console.error('Failed to check impersonation status:', error)
      }
    }

    checkImpersonation()
  }, [])

  const handleExitImpersonation = async () => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'DELETE'
      })

      if (res.ok) {
        router.push('/admin/vendors')
      }
    } catch (error) {
      console.error('Error exiting impersonation:', error)
    }
  }

  if (!isImpersonating) {
    return null
  }

  return (
    <div className="bg-amber-50 border-b-2 border-amber-300 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            You are viewing as: <span className="text-amber-700">{vendorName}</span>
          </p>
          <p className="text-amber-700 text-xs mt-1">
            You are temporarily impersonating this vendor. Changes made here will affect their account.
          </p>
        </div>
      </div>
      <button
        onClick={handleExitImpersonation}
        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold text-sm flex-shrink-0"
      >
        <X className="h-4 w-4" />
        Exit Admin View
      </button>
    </div>
  )
}
