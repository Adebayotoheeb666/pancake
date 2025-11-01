import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserIdFromCookies } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to fetch savings goals' }, { status: 500 });

    return NextResponse.json({ goals: data });
  } catch (err) {
    console.error('Savings GET error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, targetAmount, targetDate } = body;

    if (!name || !targetAmount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .insert({ user_id: userId, name, target_amount: Number(targetAmount), target_date: targetDate || null })
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create savings goal' }, { status: 500 });

    return NextResponse.json({ goal: data });
  } catch (err) {
    console.error('Savings POST error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
