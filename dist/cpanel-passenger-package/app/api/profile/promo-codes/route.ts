import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promoCodes = await prisma.promoCode.findMany({
      where: { userId: session.user.id },
      orderBy: { expiryDate: 'desc' }
    })

    // Categorize promo codes
    const now = new Date()
    const active = promoCodes.filter(code => code.expiryDate > now && code.currentUses < code.maxUses)
    const expired = promoCodes.filter(code => code.expiryDate <= now)

    return NextResponse.json({
      promoCodes,
      active: active.length,
      expired: expired.length,
      totalSavings: active.reduce((sum, code) => sum + code.discount, 0)
    })
  } catch (error) {
    console.error('Promo codes fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 })
  }
}
