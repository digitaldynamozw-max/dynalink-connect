import { FileSearch2, ImageOff, Layers3, ScanSearch, Tags, TextSearch } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import { requireAdmin } from '@/lib/admin/require-admin'
import {
  AdminBadge,
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  AdminTableWrap,
} from '@/components/admin-ui'

function formatPercent(value: number, total: number) {
  if (total <= 0) {
    return '0%'
  }

  return `${Math.round((value / total) * 100)}%`
}

export default async function AdminClassifierPage() {
  await requireAdmin()

  const [
    totalProducts,
    totalVendors,
    categoryGapCount,
    mediaGapCount,
    descriptionGapCount,
    specsGapCount,
    vendorsMissingCategoryCount,
    vendorsMissingProfileCount,
    productsMissingCategory,
    productsWithQualityGaps,
    vendorsNeedingAttention,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.user.count({ where: { isVendor: true } }),
    prisma.product.count({
      where: {
        OR: [{ category: null }, { category: '' }],
      },
    }),
    prisma.product.count({
      where: {
        OR: [{ image: null }, { image: '' }],
      },
    }),
    prisma.product.count({
      where: {
        OR: [{ description: null }, { description: '' }],
      },
    }),
    prisma.product.count({
      where: {
        OR: [{ specificationsJson: null }, { specificationsJson: '' }],
      },
    }),
    prisma.user.count({
      where: {
        isVendor: true,
        OR: [{ vendorCategory: null }, { vendorCategory: '' }],
      },
    }),
    prisma.user.count({
      where: {
        isVendor: true,
        OR: [
          { vendorDescription: null },
          { vendorDescription: '' },
          { vendorImage: null },
          { vendorImage: '' },
        ],
      },
    }),
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
      orderBy: [{ stock: 'desc' }, { updatedAt: 'desc' }],
      take: 8,
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { image: null },
          { image: '' },
          { description: null },
          { description: '' },
          { specificationsJson: null },
          { specificationsJson: '' },
        ],
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
      take: 8,
    }),
    prisma.user.findMany({
      where: {
        isVendor: true,
        OR: [
          { vendorCategory: null },
          { vendorCategory: '' },
          { vendorDescription: null },
          { vendorDescription: '' },
          { vendorImage: null },
          { vendorImage: '' },
        ],
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  const qualityGapCount = mediaGapCount + descriptionGapCount + specsGapCount
  const categoryCoverage = totalProducts - categoryGapCount
  const vendorCoverage = totalVendors - vendorsMissingCategoryCount

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
        <AdminPageHeader
          title="Classifier"
          description="Catalog quality control for categories, content completeness, and vendor listing readiness."
        />

        <div className="space-y-4 p-3.5 sm:p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2">
            <AdminStatCard label="Category Coverage" value={formatPercent(categoryCoverage, totalProducts)} helper={`${categoryCoverage} of ${totalProducts} products classified`} icon={Tags} />
            <AdminStatCard label="Media Gaps" value={mediaGapCount} helper="Products missing a primary image" icon={ImageOff} />
            <AdminStatCard label="Copy Gaps" value={descriptionGapCount} helper="Products still missing useful descriptions" icon={TextSearch} />
            <AdminStatCard label="Specs Gaps" value={specsGapCount} helper="Products missing specification detail" icon={FileSearch2} />
            <AdminStatCard label="Vendor Readiness" value={formatPercent(vendorCoverage, totalVendors)} helper={`${vendorsMissingCategoryCount} vendor category gaps remain`} icon={Layers3} />
            <AdminStatCard label="Cleanup Queue" value={categoryGapCount + vendorsMissingCategoryCount} helper="Records that need classification next" icon={ScanSearch} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
            <AdminSectionCard title="Products To Classify" description="The highest-priority products still missing category structure.">
              <AdminTableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Product</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Vendor</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Stock</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-700">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsMissingCategory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8">
                          <AdminEmptyState message="Every sampled product already has a category assigned." />
                        </td>
                      </tr>
                    ) : (
                      productsMissingCategory.map((product) => (
                        <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-xs font-medium text-slate-900">{product.name}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{product.vendor?.vendorName || product.vendor?.email || 'Admin Store'}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{product.stock}</td>
                          <td className="px-3 py-2">
                            <AdminBadge label={product.stock > 0 ? 'Sellable now' : 'Backlog only'} tone={product.stock > 0 ? 'amber' : 'neutral'} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSectionCard>

            <AdminSectionCard title="Catalog Health" description="Real content-completeness signals across the product catalog.">
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Coverage snapshot</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Products</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{totalProducts}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Vendors</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{totalVendors}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Content pressure points</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">Products missing category</span>
                      <span className="font-semibold text-slate-900">{categoryGapCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">Products missing media or copy</span>
                      <span className="font-semibold text-slate-900">{qualityGapCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">Vendor profile gaps</span>
                      <span className="font-semibold text-slate-900">{vendorsMissingProfileCount}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Why this matters</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Classification is now showing the actual merchandising gaps: missing categories reduce discoverability, while missing media, copy, and specs weaken conversion even when items are already live.
                  </p>
                </div>
              </div>
            </AdminSectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSectionCard title="Quality Gap Listing" description="Five to eight products where merchandising content is still incomplete.">
              <div className="grid gap-3">
                {productsWithQualityGaps.length === 0 ? (
                  <AdminEmptyState message="The sampled product set already has media, copy, and specs in place." />
                ) : (
                  productsWithQualityGaps.slice(0, 5).map((product) => {
                    const missingParts = [
                      !product.image?.trim() ? 'image' : null,
                      !product.description?.trim() ? 'description' : null,
                      !product.specificationsJson?.trim() ? 'specs' : null,
                    ].filter(Boolean)

                    return (
                      <div key={product.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{product.vendor?.vendorName || product.vendor?.email || 'Admin Store'}</p>
                          </div>
                          <AdminBadge label={`${missingParts.length} gaps`} tone={missingParts.length > 1 ? 'amber' : 'neutral'} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          {missingParts.map((part) => (
                            <span key={part} className="rounded-full bg-slate-100 px-3 py-1 capitalize">
                              Missing {part}
                            </span>
                          ))}
                          <span className="rounded-full bg-slate-100 px-3 py-1">Stock {product.stock}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Vendor Attention Board" description="The vendor listings that need cleanup before they look complete on the storefront.">
              <div className="grid gap-3">
                {vendorsNeedingAttention.length === 0 ? (
                  <AdminEmptyState message="Vendor category and profile details are currently in good shape." />
                ) : (
                  vendorsNeedingAttention.map((vendor) => {
                    const missingParts = [
                      !vendor.vendorCategory?.trim() ? 'category' : null,
                      !vendor.vendorDescription?.trim() ? 'description' : null,
                      !vendor.vendorImage?.trim() ? 'brand image' : null,
                    ].filter(Boolean)

                    return (
                      <div key={vendor.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{vendor.vendorName || vendor.email}</p>
                            <p className="mt-1 text-sm text-slate-500">{vendor._count.products} listed products</p>
                          </div>
                          <AdminBadge label={`${missingParts.length} gaps`} tone={missingParts.length > 1 ? 'amber' : 'neutral'} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          {missingParts.map((part) => (
                            <span key={part} className="rounded-full bg-slate-100 px-3 py-1 capitalize">
                              Missing {part}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
