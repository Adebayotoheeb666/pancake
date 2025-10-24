import { NextRequest, NextResponse } from 'next/server';
import { getFlutterwaveBanks } from '@/lib/actions/flutterwave.actions';

export async function GET(request: NextRequest) {
  try {
    const banks = await getFlutterwaveBanks();
    return NextResponse.json({ banks });
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}
