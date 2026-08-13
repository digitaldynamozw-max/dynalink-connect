import crypto from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
// Load `sharp` dynamically at runtime where available (some hosts cannot install native binaries)
let _maybeSharp: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  _maybeSharp = require('sharp')
} catch (err) {
  _maybeSharp = null
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const WEBP_COMPRESSED_MIME_TYPES = new Set(['image/jpeg', 'image/png'])

export function validateImageFile(file: File | null | undefined) {
  if (!file) {
    return { ok: false as const, error: 'No file provided' }
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return {
      ok: false as const,
      error: 'Only JPG, PNG, WEBP, and GIF images are supported',
    }
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false as const,
      error: 'File size must be less than 5MB',
    }
  }

  return { ok: true as const }
}

export function buildDataUrlFromBuffer(mimeType: string, buffer: ArrayBuffer) {
  return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`
}

function resolveImageExtension(file: File) {
  const fromMime = MIME_TYPE_EXTENSIONS[file.type]
  if (fromMime) {
    return fromMime
  }

  const originalExtension = path.extname(file.name || '').toLowerCase()
  return originalExtension || '.bin'
}

export function resolvePublicRoot() {
  const configuredPublicRoot = process.env.DYNALINK_PUBLIC_ROOT?.trim()
  if (configuredPublicRoot) {
    return path.resolve(configuredPublicRoot)
  }

  const cwd = process.cwd()
  const isStandaloneRuntime = path.basename(cwd) === 'standalone' && path.basename(path.dirname(cwd)) === '.next'

  if (isStandaloneRuntime) {
    return path.resolve(cwd, '..', '..', 'public')
  }

  return path.resolve(cwd, 'public')
}

export function resolveUploadsRoot() {
  const configuredUploadsRoot = process.env.DYNALINK_UPLOADS_ROOT?.trim()
  if (configuredUploadsRoot) {
    return path.resolve(configuredUploadsRoot)
  }

  return path.resolve(resolvePublicRoot(), 'uploads')
}

export function resolveUploadReadRoots() {
  const primaryRoot = resolveUploadsRoot()
  const cwdRoot = path.resolve(process.cwd(), 'public', 'uploads')

  return Array.from(new Set([primaryRoot, cwdRoot]))
}

export async function persistUploadedImage(file: File, folder: string) {
  const extension = WEBP_COMPRESSED_MIME_TYPES.has(file.type) ? '.webp' : resolveImageExtension(file)
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`
  const absoluteDirectory = path.join(resolveUploadsRoot(), ...folder.split('/'))
  const absolutePath = path.join(absoluteDirectory, fileName)

  await mkdir(absoluteDirectory, { recursive: true })
  const sourceBuffer = Buffer.from(await file.arrayBuffer())
  const outputBuffer =
    WEBP_COMPRESSED_MIME_TYPES.has(file.type)
      ? _maybeSharp
        ? await _maybeSharp(sourceBuffer)
            .rotate()
            .resize({
              width: 1800,
              height: 1800,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 82, effort: 4 })
            .toBuffer()
        : sourceBuffer
      : sourceBuffer

  await writeFile(absolutePath, outputBuffer)

  return `/api/uploads/${path.posix.join(folder, fileName)}`
}
