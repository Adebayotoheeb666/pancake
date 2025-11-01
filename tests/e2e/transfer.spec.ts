// Playwright E2E scaffold for transfer flows
// Requires Playwright to be installed and configured.

import { test, expect } from '@playwright/test';

const PROVIDERS = ['flutterwave', 'paystack', 'opay', 'monnify'];

for (const provider of PROVIDERS) {
  test(`Provider transfer UI flow - ${provider}`, async ({ page }) => {
    // Stub /api/transfer to simulate server response
    await page.route('**/api/transfer', async (route) => {
      const request = route.request();
      const post = await request.postData();
      // return a successful transfer response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, provider, transferId: `test-${provider}-1`, transfer: { id: `test-${provider}-1` } }),
      });
    });

    // Stub status endpoint to initially return processing then completed
    let called = 0;
    await page.route('**/api/transfer/status**', async (route) => {
      called++;
      if (called === 1) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'processing', message: 'Processing' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'completed', message: 'Completed' }) });
      }
    });

    await page.goto('/payment-transfer');
    await expect(page).toHaveURL(/payment-transfer/);

    // choose provider radio (if present) and provider select
    // Choose provider option in form
    await page.click('input[type="radio"][value="provider"]');
    await page.selectOption('select', provider);

    // Mock selecting accounts by setting select values
    // Wait for selects to be available and pick first options
    await page.waitForSelector('select');

    // Fill other fields
    await page.fill('input[placeholder="ex: johndoe@gmail.com"]', 'recipient@example.com');
    await page.fill('input[placeholder="ex: 5.00"]', '10.00');

    // Submit
    await page.click('button:has-text("Transfer Funds")');

    // Expect transfer status poller to appear
    await page.waitForSelector('text=Transfer Status', { timeout: 5000 });
    await page.waitForSelector('text=Checking transfer status...', { timeout: 5000 }).catch(() => {});

    // Wait for status to change to completed
    await page.waitForSelector('text=Status: Completed', { timeout: 10000 });

    expect(true).toBe(true);
  });
}


test('Webhook signature verification endpoints', async ({ request }) => {
  const secret = process.env.WEBHOOK_SECRET || 'test-webhook-secret';
  const crypto = await import('crypto');

  const payload = JSON.stringify({ id: 'ext-1', status: 'completed' });
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Test each webhook endpoint
  const endpoints = [
    '/api/webhooks/flutterwave',
    '/api/webhooks/paystack',
    '/api/webhooks/opay',
    '/api/webhooks/monnify',
    '/api/webhooks/dwolla',
  ];

  for (const endpoint of endpoints) {
    const res = await request.post(endpoint, {
      data: payload,
      headers: { 'content-type': 'application/json', 'x-signature': sig },
    });
    // expecting 200 or 204
    expect([200, 204]).toContain(res.status());
  }
});
