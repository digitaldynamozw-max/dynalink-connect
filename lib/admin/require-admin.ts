import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (role !== 'admin') {
    redirect('/')
  }

  return session
}
