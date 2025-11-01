import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserIdFromCookies } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });

    return NextResponse.json({ budgets: data });
  } catch (err) {
    console.error('Budgets GET error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, amount, period } = body;

    if (!name || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('budgets')
      .insert({ user_id: userId, name, amount: Number(amount), period: period || 'monthly' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });

    return NextResponse.json({ budget: data });
  } catch (err) {
    console.error('Budgets POST error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
