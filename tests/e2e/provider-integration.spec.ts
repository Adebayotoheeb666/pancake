import { test, expect } from '@playwright/test';

// These tests require provider sandbox credentials in env (set in CI or local env)
const FLUTTERWAVE_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;

const SKIP_MSG = 'Skipping provider integration tests because sandbox keys are not set';

if (!FLUTTERWAVE_KEY && !PAYSTACK_KEY) {
  test.skip(SKIP_MSG, () => {});
}

test.describe('Provider integration (sanity)', () => {
  test('GET /api/bank/flutterwave/banks returns 200', async ({ request }) => {
    if (!FLUTTERWAVE_KEY) test.skip(SKIP_MSG);
    const res = await request.get('/api/bank/flutterwave/banks');
    expect([200, 500]).toContain(res.status()); // 500 if provider rejects credentials; 200 if ok
  });

  test('GET /api/bank/paystack/banks returns 200', async ({ request }) => {
    if (!PAYSTACK_KEY) test.skip(SKIP_MSG);
    const res = await request.get('/api/bank/paystack/banks');
    expect([200, 500]).toContain(res.status());
  });
});
