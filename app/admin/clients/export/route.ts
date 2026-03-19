import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = (await auth()) as any
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clients = await prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        email: true,
        name: true,
        accountBalance: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Create CSV
    let csv = 'ID,Name,Email,Account Balance,Status,Created Date\n'

    clients.forEach(client => {
      const date = client.createdAt.toISOString().split('T')[0]
      csv += `"${client.id}","${client.name || ''}","${client.email}","${client.accountBalance}","${client.isActive ? 'Active' : 'Blocked'}","${date}"\n`
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="clients-export.csv"'
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
  }
}
