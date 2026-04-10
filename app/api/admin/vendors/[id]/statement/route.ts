import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildVendorStatementCsv } from '@/lib/vendor-statements'

function isAdmin(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user && (session.user as { role?: string }).role === 'admin'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const statement = await buildVendorStatementCsv(id)
  if (!statement) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  return new NextResponse(statement.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="admin-vendor-statement-${statement.vendor.id}.csv"`,
    },
  })
}
