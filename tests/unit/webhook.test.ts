import { computeHmacSha256Hex, verifyHmacSha256Hex } from '@/lib/utils/webhook';

describe('webhook utils', () => {
  const secret = 'test-secret';
  const payload = JSON.stringify({ foo: 'bar' });

  test('compute and verify HMAC SHA256 hex', () => {
    const sig = computeHmacSha256Hex(secret, payload);
    expect(typeof sig).toBe('string');
    const ok = verifyHmacSha256Hex(secret, payload, sig);
    expect(ok).toBe(true);
  });

  test('rejects invalid signature', () => {
    const ok = verifyHmacSha256Hex(secret, payload, 'bad-signature');
    expect(ok).toBe(false);
  });
});
