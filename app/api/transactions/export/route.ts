import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Export transactions error:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // convert to CSV
    const headers = ['id', 'name', 'amount', 'created_at', 'channel', 'category', 'sender_bank_id', 'receiver_bank_id', 'email', 'provider', 'transfer_reference'];
    const rows = (data || []).map((r: any) => headers.map((h) => (r[h] !== undefined && r[h] !== null) ? String(r[h]).replace(/\n/g, ' ') : '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions_${userId}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export transactions error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed' }, { status: 500 });
  }
}
