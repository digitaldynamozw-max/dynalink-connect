'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminSidebar } from '@/components/admin-sidebar'

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user?.role !== 'admin') {
      router.push('/')
      return
    }
  }, [router, session, status])

  if (status === 'loading') {
    return <div className="py-8 text-center text-sm text-slate-500">Checking your session...</div>
  }

  if (!session || session.user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar />
      <main className="ml-72 min-h-screen bg-slate-100">
        <div className="p-3 lg:p-4">
          {children}
        </div>
      </main>
    </div>
  )
}
