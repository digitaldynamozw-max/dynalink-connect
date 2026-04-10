'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const PROTECTED_VENDOR_PREFIXES = [
  '/vendor/dashboard',
  '/vendor/orders',
  '/vendor/payouts',
  '/vendor/products',
  '/vendor/catalog',
  '/vendor/settings',
]

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const role = session?.user?.role
  const isProtected = PROTECTED_VENDOR_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
  const hasVendorAccess = role === 'admin' || role === 'vendor' || role === 'vendor_staff'

  useEffect(() => {
    if (!isProtected || status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!hasVendorAccess) {
      router.push('/')
    }
  }, [hasVendorAccess, isProtected, router, session, status])

  if (isProtected && (status === 'loading' || (session && !hasVendorAccess))) {
    return <div className="py-8 text-center text-sm text-slate-500">Checking your session...</div>
  }

  if (isProtected && !session) {
    return null
  }

  return <>{children}</>
}
