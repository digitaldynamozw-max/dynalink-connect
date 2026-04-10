import path from 'path'
import { spawnSync } from 'child_process'
export default function globalSetup() {
  const databaseUrl = `file:${path.resolve(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`
  const result = spawnSync('npx', ['tsx', 'prisma/seed.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    shell: true,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error('Failed to seed local SQLite database for Playwright tests')
  }
}
