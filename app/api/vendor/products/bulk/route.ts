import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user?.isVendor) {
      return NextResponse.json(
        { error: 'Only vendors can bulk import products' },
        { status: 403 }
      )
    }

    const { products } = await request.json()

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const product of products) {
      try {
        if (!product.name || product.price === null) {
          results.failed++
          results.errors.push(`Row skipped: Missing name or price`)
          continue
        }

        await prisma.product.create({
          data: {
            vendorId: session.user.id,
            name: product.name,
            description: product.description || null,
            price: parseFloat(product.price),
            stock: parseInt(product.stock) || 0,
            category: product.category || null,
            stock: parseInt(product.stock) || 0,
            category: product.category || null,
          }
        })

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`Failed to import "${product.name}": ${error.message}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    )
  }
}
