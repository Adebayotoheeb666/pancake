import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('linked_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accounts: data || [],
    });
  } catch (error) {
    console.error('Error fetching linked accounts:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch accounts',
      },
      { status: 500 }
    );
  }
}
