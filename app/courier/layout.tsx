'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const role = session?.user?.role
  const hasCourierAccess = role === 'admin' || role === 'courier'

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!hasCourierAccess) {
      router.push('/')
    }
  }, [hasCourierAccess, router, session, status])

  if (status === 'loading') {
    return <div className="py-8 text-center text-sm text-slate-500">Checking your session...</div>
  }

  if (!session || !hasCourierAccess) {
    return null
  }

  return <>{children}</>
}
