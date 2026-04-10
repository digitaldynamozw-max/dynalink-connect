import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = (await auth()) as any
    
    if (!session) {
      console.error('No session found in profile GET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check for user ID or email
    const userId = session?.user?.id
    const userEmail = session?.user?.email
    
    if (!userId && !userEmail) {
      console.error('No user ID or email in session:', { userId, userEmail })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: userId ? { id: userId } : { email: userEmail as string },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        accountBalance: true,
        mobileNumber: true,
        deliveryAddress: true,
        language: true,
        createdAt: true
      }
    })

    if (!user) {
      console.error('User not found in database, but has valid session:', { userId, userEmail })
      // User has a valid session but doesn't exist in database
      // This can happen after database reset, return 401 to signal session is invalid
      return NextResponse.json({ error: 'User session invalid' }, { status: 401 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile', details: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = (await auth()) as any
    
    // Check for user ID or email
    const userId = session?.user?.id
    const userEmail = session?.user?.email
    
    if (!userId && !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { firstName, lastName, mobileNumber, deliveryAddress, language } = body

    const user = await prisma.user.update({
      where: userId ? { id: userId } : { email: userEmail },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        mobileNumber: mobileNumber || undefined,
        deliveryAddress: deliveryAddress || undefined,
        language: language || undefined,
        name: firstName && lastName ? `${firstName} ${lastName}` : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        accountBalance: true,
        mobileNumber: true,
        deliveryAddress: true,
        language: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
