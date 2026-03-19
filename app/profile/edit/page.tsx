'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function EditProfileRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.push('/profile?tab=edit')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin mb-4">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto"></div>
        </div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}