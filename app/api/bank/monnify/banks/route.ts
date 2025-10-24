import { NextRequest, NextResponse } from 'next/server';
import { getMonnifyBanks } from '@/lib/actions/monnify.actions';

export async function GET(request: NextRequest) {
  try {
    const banks = await getMonnifyBanks();
    return NextResponse.json({ banks });
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}
