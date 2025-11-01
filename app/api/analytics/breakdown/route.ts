import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserIdFromCookies } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let q = supabaseAdmin
      .from('transactions')
      .select('category, amount')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });

    const groups: Record<string, number> = {};
    (data || []).forEach((t: any) => {
      const cat = t.category || 'uncategorized';
      const amount = Number(t.amount) || 0;
      groups[cat] = (groups[cat] || 0) + amount;
    });

    return NextResponse.json({ breakdown: groups });
  } catch (err) {
    console.error('Analytics breakdown error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
