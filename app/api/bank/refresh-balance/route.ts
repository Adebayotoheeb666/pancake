import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/actions/bank.actions';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId parameter' },
        { status: 400 }
      );
    }

    // Fetch fresh account data from Plaid
    const accountData = await getAccount({ appwriteItemId: accountId });

    if (!accountData) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      account: accountData.data,
      transactions: accountData.transactions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Balance refresh error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to refresh balance',
      },
      { status: 500 }
    );
  }
}
