import { test, expect } from '@playwright/test'

// This e2e test is a scaffold. It will be skipped unless E2E_BASE_URL is set.
const base = process.env.E2E_BASE_URL

test.describe('Checkout -> Courier settlement e2e', () => {
  test.skip(!base, 'E2E_BASE_URL not configured')

  test('happy path (scaffold)', async ({ request }) => {
    // This test expects a running app reachable at E2E_BASE_URL.
    // It is a scaffold demonstrating the flow; adapt auth and payloads to your running app.
    const checkoutRes = await request.post(`${base}/api/checkout`, {
      data: {
        // minimal payload expected by your API; adjust as needed
        items: [],
        shippingAddress: { address: 'Test' },
        paymentMethod: 'pay_on_delivery',
      },
    })

    expect([200, 201]).toContain(checkoutRes.status())

    // Further steps would PATCH the courier route to mark items completed
    // and then assert on wallet transactions via the API or DB.
  })
})
