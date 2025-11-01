import crypto from 'crypto';

export function computeHmacSha256Hex(secret: string, payload: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyHmacSha256Hex(secret: string, payload: string, signatureHeader: string) {
  if (!secret) return false;
  const expected = computeHmacSha256Hex(secret, payload);
  // use timing-safe compare
  const sigBuf = Buffer.from(signatureHeader || '', 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
