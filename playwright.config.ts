import path from 'path'
import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3001'
const databaseUrl = `file:${path.resolve(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: {
    command: 'npm run dev',
    url: `${baseURL}/auth/signin`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  },
})
