import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, accountName, bankName, bankCode } = body;

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const updates: any = {};
    if (accountName !== undefined) updates.account_name = accountName;
    if (bankName !== undefined) updates.bank_name = bankName;
    if (bankCode !== undefined) updates.bank_code = bankCode;

    const { data, error } = await supabaseAdmin
      .from('linked_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });

    return NextResponse.json({ success: true, account: data });
  } catch (error) {
    console.error('Update linked account error', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 500 });
  }
}
