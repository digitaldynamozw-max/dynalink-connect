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
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if ((session.user as any)?.role !== 'admin') {
      router.push('/')
      return
    }
  }, [session, router])

  if (!session || (session.user as any)?.role !== 'admin') {
    return null
  }

  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 pt-20 bg-gray-50">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
