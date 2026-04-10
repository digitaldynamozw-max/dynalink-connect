import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type SessionUser = {
  id?: string
}

async function syncProductReviewMetrics(productId: string) {
  const aggregate = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { _all: true },
  })

  const averageRating = aggregate._avg.rating ?? 0
  const reviewCount = aggregate._count._all

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating,
      rating: averageRating,
      reviewCount,
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id || null
    const { productId } = await params

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      reviews.map((review) => ({
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
        isMine: userId ? review.userId === userId : false,
      }))
    )
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params
    const body = await request.json()
    const rating = Number(body.rating)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const comment = typeof body.comment === 'string' ? body.comment.trim() : ''

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    if (!title || !comment) {
      return NextResponse.json({ error: 'Title and comment are required' }, { status: 400 })
    }

    const [product, completedPurchase] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      }),
      prisma.orderItem.findFirst({
        where: {
          productId,
          order: {
            userId,
          },
          OR: [
            { status: 'completed' },
            { order: { status: 'completed' } },
          ],
        },
        select: { id: true },
      }),
    ])

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!completedPurchase) {
      return NextResponse.json(
        { error: 'You can only review products from completed orders' },
        { status: 403 }
      )
    }

    const review = await prisma.$transaction(async (tx) => {
      const savedReview = await tx.review.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {
          rating,
          title,
          comment,
          verified: true,
        },
        create: {
          userId,
          productId,
          rating,
          title,
          comment,
          verified: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      await tx.rating.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {
          rating,
          comment,
        },
        create: {
          userId,
          productId,
          rating,
          comment,
        },
      })

      return savedReview
    })

    await syncProductReviewMetrics(productId)

    return NextResponse.json({
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      isMine: true,
    })
  } catch (error) {
    console.error('Failed to save review:', error)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
