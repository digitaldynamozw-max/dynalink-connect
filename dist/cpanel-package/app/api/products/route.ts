import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeProductPayload } from '@/lib/product-payload'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        vendor: {
          select: {
            vendorName: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(products.map((product) => serializeProductPayload(product)))
  } catch (error) {
    console.error('GET /api/products failed', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const product = await prisma.product.create({
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

    return NextResponse.json(serializeProductPayload(product), { status: 201 })
  } catch (error) {
    console.error('POST /api/products failed', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
