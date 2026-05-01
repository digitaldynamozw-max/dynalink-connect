'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'

const VENDOR_WORKSPACE_PREFIXES = [
  '/vendor/dashboard',
  '/vendor/orders',
  '/vendor/payouts',
  '/vendor/products',
  '/vendor/catalog',
  '/vendor/auctions',
  '/vendor/settings',
]

const PUBLIC_COMMERCE_PREFIXES = ['/vendors', '/products', '/orders', '/wishlist', '/cart']

function isVendorWorkspacePath(pathname: string) {
  return VENDOR_WORKSPACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isVendorStorefrontPath(pathname: string) {
  return pathname.startsWith('/vendor/') && !isVendorWorkspacePath(pathname) && pathname !== '/vendor/register'
}

function isWorkspacePath(pathname: string) {
  return pathname.startsWith('/admin') || pathname.startsWith('/courier') || isVendorWorkspacePath(pathname)
}

function getWorkspaceLanding(role?: string | null) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'courier') return '/courier/dashboard'
  if (role === 'vendor' || role === 'vendor_staff') return '/vendor/dashboard'
  return '/'
}

function isWorkspaceRole(role?: string | null) {
  return role === 'admin' || role === 'courier' || role === 'vendor' || role === 'vendor_staff'
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role || null

  const showPublicChrome = useMemo(() => !isWorkspacePath(pathname), [pathname])

  useEffect(() => {
    if (status === 'loading' || !isWorkspaceRole(role)) {
      return
    }

    const landingPath = getWorkspaceLanding(role)
    const isRestrictedPublicRoute = PUBLIC_COMMERCE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
    const isStorePreview = searchParams.get('preview') === '1'

    if (isRestrictedPublicRoute || (isVendorStorefrontPath(pathname) && !isStorePreview)) {
      router.replace(landingPath)
    }
  }, [pathname, role, router, searchParams, status])

  return (
    <>
      {showPublicChrome ? <Navbar /> : null}
      {children}
      {showPublicChrome ? <Footer /> : null}
    </>
  )
}
