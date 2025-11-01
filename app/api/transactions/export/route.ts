import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserIdFromCookies } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Prefer deriving user from auth cookies for security
    let userId: string | null = null;

    try {
      userId = await getAuthUserIdFromCookies();
    } catch (e) {
      console.error('[export] Error reading auth cookie:', e);
    }

    // Fallback to query param for backward compatibility
    if (!userId) {
      const { searchParams } = new URL(request.url);
      userId = searchParams.get('userId');
    }

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

    // convert to CSV with proper escaping
    const headers = ['id', 'name', 'amount', 'created_at', 'channel', 'category', 'sender_bank_id', 'receiver_bank_id', 'email', 'provider', 'transfer_reference'];

    const escapeCell = (val: any) => {
      if (val === undefined || val === null) return '';
      const s = String(val).replace(/\r?\n/g, ' ');
      // escape double quotes by doubling
      const escaped = s.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = (data || []).map((r: any) => headers.map((h) => escapeCell(r[h])).join(','));
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');

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
