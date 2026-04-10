import { ImageOff, Layers3, ScanSearch, Tags } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableWrap } from '@/components/admin-ui'

export default async function AdminClassifierPage() {
  await requireAdmin()

  const [productsMissingCategory, productsMissingMedia, vendorsMissingCategory] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [{ category: null }, { category: '' }],
      },
      include: {
        vendor: {
          select: {
            vendorName: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.product.findMany({
      where: {
        OR: [{ image: null }, { image: '' }, { description: null }, { description: '' }],
      },
      include: {
        vendor: {
          select: {
            vendorName: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.user.findMany({
      where: {
        isVendor: true,
        OR: [{ vendorCategory: null }, { vendorCategory: '' }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
  ])

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Classifier"
          description="Clean up missing catalog structure so products and vendors stay organized and merchandisable."
        />

        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Missing Categories" value={productsMissingCategory.length} helper="Products still uncategorized" icon={Tags} />
            <AdminStatCard label="Missing Media" value={productsMissingMedia.length} helper="Products missing image or description" icon={ImageOff} />
            <AdminStatCard label="Vendor Category Gaps" value={vendorsMissingCategory.length} helper="Vendors missing listing categories" icon={Layers3} />
            <AdminStatCard label="Classification Queue" value={productsMissingCategory.length + vendorsMissingCategory.length} helper="Records needing admin cleanup" icon={ScanSearch} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AdminSectionCard title="Products Missing Category" description="These products cannot be classified cleanly yet.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Product</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Vendor</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsMissingCategory.map((product) => (
                      <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{product.name}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.vendor?.vendorName || product.vendor?.email || 'Admin Store'}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{product.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <AdminSectionCard title="Vendor Listing Gaps" description="Vendors missing category structure or listing completeness.">
              <div className="space-y-3">
                {vendorsMissingCategory.map((vendor) => (
                  <div key={vendor.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{vendor.vendorName || vendor.email}</p>
                    <p className="mt-1 text-sm text-slate-500">No vendor category assigned yet</p>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
