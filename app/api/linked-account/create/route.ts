import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      provider,
      accountNumber,
      bankCode,
      accountName,
    } = body;

    if (!userId || !provider || !accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if account already linked
    const { data: existingAccount } = await supabaseAdmin
      .from('linked_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('account_number', accountNumber)
      .eq('provider', provider)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        { error: 'This account is already linked' },
        { status: 400 }
      );
    }

    // Get bank name from bank code
    const bankMaps: { [key: string]: string } = {
      '011': 'First Bank',
      '007': 'Zenith Bank',
      '008': 'Eco Bank',
      '058': 'Guaranty Trust Bank',
      '009': 'Standard Chartered Bank',
      '033': 'Access Bank',
      '050': 'Fidelity Bank',
      '070': 'Fidelity Bank',
    };

    const bankName = bankMaps[bankCode] || 'Unknown Bank';

    // Insert linked account
    const { data, error } = await supabaseAdmin
      .from('linked_accounts')
      .insert({
        user_id: userId,
        provider,
        account_number: accountNumber,
        bank_code: bankCode,
        bank_name: bankName,
        account_name: accountName || '',
        country: 'NG', // Default to Nigeria, can be extended
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to link account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account: data,
      message: 'Account linked successfully',
    });
  } catch (error) {
    console.error('Link account error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to link account',
      },
      { status: 500 }
    );
  }
}
