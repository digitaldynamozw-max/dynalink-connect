import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email: string, password: string, callbackPath: string) {
  await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/signin'))
  await page.waitForLoadState('networkidle')
}

test.describe.serial('Delivery Smoke Suite', () => {
  test('admin can assign an unassigned delivery from courier ops', async ({ page }) => {
    await signIn(page, 'admin@example.com', 'password', '/admin/couriers')
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('link', { name: 'Courier' }).click()

    await expect(page.getByRole('link', { name: 'Open Live Map Screen' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Overdue Items')).toBeVisible({ timeout: 20_000 })

    const dispatchBoardTitle = page.getByText('Rider Dispatch Board')
    await dispatchBoardTitle.scrollIntoViewIfNeeded()
    await expect(dispatchBoardTitle).toBeVisible()

    const unassignedRow = page.locator('tr', { hasText: 'Atomic Habits' }).first()
    await expect(unassignedRow).toBeVisible()

    const assignSelect = unassignedRow.locator('select[title="Assign courier"]')
    await assignSelect.selectOption({ label: 'Tariro Rider' })

    await expect(unassignedRow.locator('p', { hasText: 'Tariro Rider' }).first()).toBeVisible()
  })

  test('courier can start, exception, and complete a delivery with proof', async ({ page }) => {
    await signIn(page, 'courier1@example.com', 'password', '/courier/dashboard')

    await expect(page.getByText('Courier Dashboard')).toBeVisible()

    const acceptedRow = page.locator('tr', { hasText: 'Accepted' }).first()
    const startButton = acceptedRow.getByRole('button', { name: 'Start Delivery' })
    await expect(startButton).toBeVisible()
    await startButton.click()

    const activeRow = page.locator('tr', { hasText: 'Courier On The Way' }).first()
    const exceptionSelect = activeRow.locator('select[title="Exception type"]')
    await exceptionSelect.selectOption('customer_unreachable')
    await activeRow.getByPlaceholder('Exception note').fill('Customer asked for a gate callback.')
    await activeRow.getByPlaceholder('Next action').fill('Call customer again before handoff.')
    await activeRow.getByRole('button', { name: 'Report issue' }).click()

    await expect(activeRow.getByText(/Latest exception:/i)).toBeVisible()

    await activeRow.getByPlaceholder('Recipient').fill('Sample Customer')
    await activeRow.getByPlaceholder('Signature name').fill('S. Customer')
    await activeRow.getByPlaceholder('Delivery note').fill('Delivered after callback confirmation.')

    const proofFile = activeRow.locator('input[type="file"]')
    await proofFile.setInputFiles({
      name: 'proof.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s0m7XUAAAAASUVORK5CYII=',
        'base64'
      ),
    })

    await activeRow.getByLabel('Handed to recipient').check()
    await activeRow.getByLabel('Package sealed').check()
    await activeRow.getByLabel('Address confirmed').check()

    const completeButton = activeRow.getByRole('button', { name: 'Complete Delivery' })
    await completeButton.click()

    await expect(page.getByText('Delivered').first()).toBeVisible()
    await expect(page.getByText(/Delivered to Sample Customer/i).first()).toBeVisible()
    await expect(page.getByText(/Signed by S. Customer/i).first()).toBeVisible()
  })

  test('customer can manage notification preferences and see delivery updates', async ({ page }) => {
    await signIn(page, 'customer@example.com', 'password', '/profile/notifications')
    await page.goto('/profile/notifications')

    await expect(page.getByText('Delivery Notifications')).toBeVisible()
    await expect(page.getByText('Notification Channels')).toBeVisible()

    const emailToggle = page.getByRole('button', { name: /Email/ }).first()
    await emailToggle.click()
    await expect(page.getByText('Saving...')).toBeVisible()
    await expect(page.getByText('Saving...')).toBeHidden()

    await expect(page.getByText(/Delivery completed|Delivery on the way|Rider assigned/i).first()).toBeVisible()
  })
})
