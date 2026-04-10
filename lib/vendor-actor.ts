import { type NextRequest } from 'next/server'

type VendorActorSession = {
  user?: {
    id?: string
    role?: string
  }
} | null

export function resolveActingVendorId(
  request: NextRequest,
  session: VendorActorSession
) {
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id || null
  const sessionRole = (session?.user as { role?: string } | undefined)?.role || null

  if (!sessionUserId) {
    return {
      vendorId: null,
      adminId: null,
      impersonatedVendorId: null,
      isImpersonating: false,
    }
  }

  const impersonatedVendorId = request.cookies.get('impersonatedVendorId')?.value || null
  const adminId = request.cookies.get('adminImpersonationId')?.value || null
  const canImpersonate =
    Boolean(impersonatedVendorId) &&
    Boolean(adminId) &&
    (sessionUserId === adminId || sessionRole === 'admin')

  return {
    vendorId: canImpersonate ? impersonatedVendorId : sessionUserId,
    adminId,
    impersonatedVendorId,
    isImpersonating: canImpersonate,
  }
}
