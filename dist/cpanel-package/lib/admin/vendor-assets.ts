export async function uploadAdminVendorAsset(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/admin/vendors/assets', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to upload asset')
  }

  return payload.image as string
}
