import { randomUUID } from 'crypto'

type RequestDebugSession = {
  user?: {
    id?: string
    email?: string | null
    role?: string
  }
} | null | undefined

export function createRequestDebugId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

export function logRequestDebug(
  label: string,
  requestId: string,
  details: Record<string, unknown>
) {
  console.log(`[${label}]`, {
    requestId,
    ...details,
  })
}

export function logRequestError(
  label: string,
  requestId: string,
  error: unknown,
  details: Record<string, unknown>
) {
  console.error(`[${label}]`, {
    requestId,
    ...details,
    error,
  })
}

export function getSessionDebug(session: RequestDebugSession) {
  return {
    userId: session?.user?.id || null,
    userEmail: session?.user?.email || null,
    role: session?.user?.role || null,
  }
}
