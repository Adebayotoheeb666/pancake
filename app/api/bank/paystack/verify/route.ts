import { NextRequest, NextResponse } from 'next/server';
import { verifyPaystackAccount } from '@/lib/actions/paystack.actions';
import { withRateLimit, getRateLimitKey } from '@/lib/rate-limit';

async function handleVerify(request: NextRequest) {
  try {
    const { accountNumber, bankCode } = await request.json();

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const accountData = await verifyPaystackAccount({
      accountNumber,
      bankCode,
    });

    return NextResponse.json({
      success: true,
      accountName: accountData.accountName,
      accountNumber: accountData.accountNumber,
      bankCode: accountData.bankCode,
    });
  } catch (error) {
    console.error('Paystack verification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    () => handleVerify(request),
    {
      limit: 10,
      windowMs: 60 * 60 * 1000,
      keyGenerator: (req) => `paystack-verify:${getRateLimitKey(req, '')}`,
    }
  );
}
