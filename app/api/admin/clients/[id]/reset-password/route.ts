import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const session = (await auth()) as any
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const client = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    })

    // In production, send email with temporary password
    // For now, just return success
    return NextResponse.json({
      message: 'Password reset sent',
      temporaryPassword: tempPassword // Only for dev, remove in production
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
