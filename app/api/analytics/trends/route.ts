import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserIdFromCookies } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6', 10);

    // Fetch transactions for the past N months
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months + 1);
    const from = fromDate.toISOString();

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('amount, created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .gte('created_at', from)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });

    const buckets: Record<string, number> = {};

    (data || []).forEach((t: any) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = (buckets[key] || 0) + Number(t.amount || 0);
    });

    return NextResponse.json({ trends: buckets });
  } catch (err) {
    console.error('Analytics trends error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
