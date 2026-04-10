import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const body = await request.json()
    const helpful = Boolean(body.helpful)

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, helpful: true, notHelpful: true },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: helpful
        ? { helpful: review.helpful + 1 }
        : { notHelpful: review.notHelpful + 1 },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update helpful vote:', error)
    return NextResponse.json({ error: 'Failed to update review feedback' }, { status: 500 })
  }
}
