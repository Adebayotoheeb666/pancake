import { NextRequest, NextResponse } from 'next/server';
import { verifyMonnifyAccount } from '@/lib/actions/monnify.actions';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const LINKED_ACCOUNTS_TABLE = 'linked_accounts';

async function handleVerify(request: NextRequest) {
  try {
    const { accountNumber, bankCode, userId } = await request.json();

    if (!accountNumber || !bankCode || !userId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const accountData = await verifyMonnifyAccount({
      accountNumber,
      bankCode,
    });

    const { data, error } = await supabaseAdmin
      .from(LINKED_ACCOUNTS_TABLE)
      .insert({
        user_id: userId,
        provider: 'monnify',
        bank_name: 'Monnify Bank',
        account_number: accountNumber,
        bank_code: bankCode,
        account_name: accountData.accountName,
        country: 'NG',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { message: 'Failed to save account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accountName: accountData.accountName,
      linkedAccount: data,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
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
      keyGenerator: (req) => `monnify-verify:${getRateLimitKey(req, '')}`,
    }
  );
}
