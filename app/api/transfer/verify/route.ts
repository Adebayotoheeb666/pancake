import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBankByAccountId } from '@/lib/actions/user.actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sharableId, linkedAccountId } = body;

    if (!sharableId && !linkedAccountId) {
      return NextResponse.json({ error: 'Missing sharableId or linkedAccountId' }, { status: 400 });
    }

    if (sharableId) {
      // decrypt sharableId (client used btoa)
      let accountId: string;
      try {
        accountId = Buffer.from(sharableId, 'base64').toString('utf8');
      } catch (err) {
        return NextResponse.json({ error: 'Invalid sharableId' }, { status: 400 });
      }

      const bank = await getBankByAccountId({ accountId });
      if (!bank) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, accountName: bank.accountName || bank.accountId || null, account: bank });
    }

    if (linkedAccountId) {
      const { data, error } = await supabaseAdmin
        .from('linked_accounts')
        .select('*')
        .eq('id', linkedAccountId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Linked account not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, accountName: data.account_name, account: data });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Verification failed' }, { status: 500 });
  }
}
