import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeProductPayload } from '@/lib/product-payload'

interface SessionUser {
  id?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
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

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(serializeProductPayload(product))
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product || product.vendorId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
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

    const updated = await prisma.product.update({
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
      where: { id: updated.id },
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

    return NextResponse.json(serializeProductPayload(hydratedProduct || updated))
  } catch {
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product || product.vendorId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
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

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description || undefined,
        price: price ? parseFloat(price) : undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        onSale: onSale !== undefined ? onSale : undefined,
        image: image || undefined,
        category: category || undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        optionGroupsJson: optionGroupsJson !== undefined ? optionGroupsJson || null : undefined,
        specificationsJson: specificationsJson !== undefined ? specificationsJson || null : undefined,
      }
    })

    const hydratedProduct = await prisma.product.findUnique({
      where: { id: updated.id },
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

    return NextResponse.json(serializeProductPayload(hydratedProduct || updated))
  } catch {
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = (session?.user as SessionUser | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product || product.vendorId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
