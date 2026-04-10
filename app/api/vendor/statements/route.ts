import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { resolveActingVendorId } from '@/lib/vendor-actor'
import { buildVendorStatementCsv } from '@/lib/vendor-statements'

export async function GET(request: NextRequest) {
  const session = await auth()
  const vendorId = resolveActingVendorId(request, session).vendorId

  if (!vendorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const statement = await buildVendorStatementCsv(vendorId)
  if (!statement) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  return new NextResponse(statement.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vendor-statement-${statement.vendor.id}.csv"`,
    },
  })
}
