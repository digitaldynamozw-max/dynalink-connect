import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeProductPayload } from '@/lib/product-payload'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const product = await prisma.product.findUnique({
      include: {
        vendor: {
          select: {
            vendorName: true,
            name: true,
          },
        },
      },
      where: { id }
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(serializeProductPayload(product))
  } catch (error) {
    console.error(`GET /api/products/${id} failed`, error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const { auth } = await import('@/lib/auth')
    const session = await auth()
    const role = session?.user?.role
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      price,
      salePrice,
      onSale,
      image,
      category,
      stock,
      optionGroupsJson,
      specificationsJson,
    } = body

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        onSale: onSale || false,
        image,
        category,
        stock: parseInt(stock),
        optionGroupsJson: optionGroupsJson || null,
        specificationsJson: specificationsJson || null,
      }
    })

    const hydratedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        vendor: {
          select: {
            vendorName: true,
            vendorCategory: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(serializeProductPayload(hydratedProduct || product))
  } catch (error) {
    console.error(`PUT /api/products/${id} failed`, error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const { auth } = await import('@/lib/auth')
    const session = await auth()
    const role = session?.user?.role
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Product deleted' })
  } catch (error) {
    console.error(`DELETE /api/products/${id} failed`, error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
