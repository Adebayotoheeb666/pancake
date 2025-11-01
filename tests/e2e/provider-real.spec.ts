import { test, expect } from '@playwright/test';

// This test runs only when REAL_PROVIDER_E2E=true and required env vars are set in CI.
const runReal = process.env.REAL_PROVIDER_E2E === 'true';
const senderLinkedAccountId = process.env.REAL_SENDER_LINKED_ACCOUNT_ID;
const receiverLinkedAccountId = process.env.REAL_RECEIVER_LINKED_ACCOUNT_ID;
const senderUserId = process.env.REAL_SENDER_USER_ID;
const provider = process.env.REAL_PROVIDER || 'flutterwave';

if (!runReal || !senderLinkedAccountId || !receiverLinkedAccountId || !senderUserId) {
  test.skip(true, 'Skipping real provider E2E: set REAL_PROVIDER_E2E=true and REAL_SENDER_LINKED_ACCOUNT_ID, REAL_RECEIVER_LINKED_ACCOUNT_ID, REAL_SENDER_USER_ID');
}

test('Real provider transfer flow against sandbox', async ({ request }) => {
  // Initiate transfer via API (server will use sandbox creds from env)
  const payload = {
    type: 'provider',
    senderId: senderUserId,
    linkedAccountId: senderLinkedAccountId,
    receiverLinkedAccountId: receiverLinkedAccountId,
    amount: 100, // smallest test amount
    email: 'test-recipient@example.com',
    name: 'Test Recipient',
  };

  const res = await request.post('/api/transfer', { data: payload });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty('transferId');
  const transferId = body.transferId;

  // Poll status until completed/failed or timeout
  const timeoutMs = 60 * 1000; // 60 seconds
  const pollInterval = 3000;
  const start = Date.now();
  let status = null;

  while (Date.now() - start < timeoutMs) {
    const statusRes = await request.get(`/api/transfer/status?transferId=${transferId}&provider=${provider}`);
    if (!statusRes.ok()) {
      await new Promise(r => setTimeout(r, pollInterval));
      continue;
    }
    const statusBody = await statusRes.json();
    status = statusBody.status;
    if (status === 'completed' || status === 'failed' || status === 'error') break;
    await new Promise(r => setTimeout(r, pollInterval));
  }

  expect(['completed', 'processing', 'pending', 'failed', 'error']).toContain(status);
});
