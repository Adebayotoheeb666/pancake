import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankId, userId } = body;

    if (!bankId || !userId) {
      return NextResponse.json(
        { error: 'Missing bankId or userId' },
        { status: 400 }
      );
    }

    // Verify the bank account belongs to the user
    const { data: bank, error: fetchError } = await supabaseAdmin
      .from('banks')
      .select('*')
      .eq('id', bankId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !bank) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Delete the bank account
    const { error: deleteError } = await supabaseAdmin
      .from('banks')
      .delete()
      .eq('id', bankId);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting bank account:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to disconnect account',
      },
      { status: 500 }
    );
  }
}
