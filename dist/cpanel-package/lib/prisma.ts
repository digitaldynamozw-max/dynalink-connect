import path from 'path'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaClient() {
  if (process.env.NODE_ENV !== 'production') {
    const localSqlitePath = path.resolve(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')
    const localSqliteUrl = `file:${localSqlitePath}`
    process.env.DATABASE_URL = localSqliteUrl

    return new PrismaClient({
      datasources: {
        db: {
          url: localSqliteUrl,
        },
      },
    })
  }

  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
