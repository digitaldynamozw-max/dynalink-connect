'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader, Save, Upload } from 'lucide-react'
import { AdminSectionCard } from '@/components/admin-ui'
import { uploadAdminVendorAsset } from '@/lib/admin/vendor-assets'

interface VendorEditForm {
  email: string
  vendorName: string
  vendorDescription: string
  vendorImage: string
  storeBannerImage: string
  vendorCategory: string
  vendorPhoneNumber: string
  storeAddress: string
  storeCity: string
  storeState: string
  storeZipCode: string
  vendorPriority: string
  vendorVerified: boolean
  commissionRate: string
}

const emptyForm: VendorEditForm = {
  email: '',
  vendorName: '',
  vendorDescription: '',
  vendorImage: '',
  storeBannerImage: '',
  vendorCategory: '',
  vendorPhoneNumber: '',
  storeAddress: '',
  storeCity: '',
  storeState: '',
  storeZipCode: '',
  vendorPriority: '0',
  vendorVerified: false,
  commissionRate: '10',
}

export default function AdminVendorEditPage() {
  const params = useParams()
  const router = useRouter()
  const vendorId = typeof params?.id === 'string' ? params.id : ''
  const [form, setForm] = useState<VendorEditForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'banner' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchVendor = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`)
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load vendor')
      }

      setForm({
        email: data.email || '',
        vendorName: data.vendorName || '',
        vendorDescription: data.vendorDescription || '',
        vendorImage: data.vendorImage || '',
        storeBannerImage: data.storeBannerImage || '',
        vendorCategory: data.vendorCategory || '',
        vendorPhoneNumber: data.vendorPhoneNumber || '',
        storeAddress: data.storeAddress || '',
        storeCity: data.storeCity || '',
        storeState: data.storeState || '',
        storeZipCode: data.storeZipCode || '',
        vendorPriority: String(data.vendorPriority ?? 0),
        vendorVerified: Boolean(data.vendorVerified),
        commissionRate: String(data.commissionRate ?? 10),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendor')
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    if (vendorId) {
      void fetchVendor()
    }
  }, [fetchVendor, vendorId])

  const handleAssetChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'vendorImage' | 'storeBannerImage'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingAsset(field === 'vendorImage' ? 'logo' : 'banner')
    setError(null)
    try {
      const image = await uploadAdminVendorAsset(file)
      setForm((current) => ({
        ...current,
        [field]: image,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload asset')
    } finally {
      setUploadingAsset(null)
      event.target.value = ''
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          vendorPriority: Number.parseInt(form.vendorPriority || '0', 10),
          commissionRate: Number.parseFloat(form.commissionRate || '10'),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update vendor')
      }

      router.push(`/admin/vendors/${vendorId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">Loading vendor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/vendors/${vendorId}`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
            <p className="mt-1 text-xs text-gray-600">Update vendor details, listing assets, and priority.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <AdminSectionCard title="Vendor Details">
            <div className="mt-4 grid grid-cols-1 gap-3">
              <input value={form.vendorName} onChange={(e) => setForm((c) => ({ ...c, vendorName: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Vendor name" />
              <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Vendor email" />
              <input value={form.vendorPhoneNumber} onChange={(e) => setForm((c) => ({ ...c, vendorPhoneNumber: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Phone number" />
              <input value={form.vendorCategory} onChange={(e) => setForm((c) => ({ ...c, vendorCategory: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Category" />
              <input type="number" min="0" value={form.vendorPriority} onChange={(e) => setForm((c) => ({ ...c, vendorPriority: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Priority" />
              <input type="number" min="0" step="0.1" value={form.commissionRate} onChange={(e) => setForm((c) => ({ ...c, commissionRate: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Commission rate" />
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700">
                <input type="checkbox" checked={form.vendorVerified} onChange={(e) => setForm((c) => ({ ...c, vendorVerified: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                Verified vendor
              </label>
              <div />
              <input value={form.storeAddress} onChange={(e) => setForm((c) => ({ ...c, storeAddress: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Store address" />
              <input value={form.storeCity} onChange={(e) => setForm((c) => ({ ...c, storeCity: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="City" />
              <input value={form.storeState} onChange={(e) => setForm((c) => ({ ...c, storeState: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="State" />
              <input value={form.storeZipCode} onChange={(e) => setForm((c) => ({ ...c, storeZipCode: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Zip code" />
              <textarea value={form.vendorDescription} onChange={(e) => setForm((c) => ({ ...c, vendorDescription: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-xs" placeholder="Store description" rows={4} />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Listing Assets">
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-lg border border-dashed border-gray-300 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Vendor Logo</p>
                    <p className="text-xs text-gray-500">Used on vendor cards and store identity.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200">
                    {uploadingAsset === 'logo' ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAssetChange(event, 'vendorImage')} />
                  </label>
                </div>
                {form.vendorImage ? (
                  <div className="relative mt-3 h-24 w-24 overflow-hidden rounded-lg border border-gray-200">
                    <Image src={form.vendorImage} alt="Vendor logo" fill className="object-cover" />
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-dashed border-gray-300 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Store Banner</p>
                    <p className="text-xs text-gray-500">Shown in storefront and vendor listings.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200">
                    {uploadingAsset === 'banner' ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleAssetChange(event, 'storeBannerImage')} />
                  </label>
                </div>
                {form.storeBannerImage ? (
                  <div className="relative mt-3 h-24 w-full overflow-hidden rounded-lg border border-gray-200">
                    <Image src={form.storeBannerImage} alt="Vendor banner" fill className="object-cover" />
                  </div>
                ) : null}
              </div>
            </div>
          </AdminSectionCard>

          <div className="flex justify-end gap-3">
            <Link href={`/admin/vendors/${vendorId}`} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploadingAsset !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Vendor
            </button>
          </div>
        </form>
    </div>
  )
}
