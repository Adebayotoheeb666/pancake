import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('transferId');
    const provider = searchParams.get('provider');

    if (!transferId || !provider) {
      return NextResponse.json(
        { error: 'Missing transferId or provider' },
        { status: 400 }
      );
    }

    // Query transfers table for status
    const { data, error } = await supabaseAdmin
      .from('transfers')
      .select('*')
      .eq('id', transferId)
      .eq('provider', provider)
      .single();

    if (error) {
      // If no transfer record found, return pending (might be processing)
      return NextResponse.json({
        status: 'pending',
        message: 'Transfer is being processed',
      });
    }

    if (!data) {
      return NextResponse.json({
        status: 'pending',
        message: 'Transfer is being processed',
      });
    }

    return NextResponse.json({
      success: true,
      status: data.status || 'pending',
      message: data.status_message || 'Transfer in progress',
      transferId: data.id,
      reference: data.reference,
    });
  } catch (error) {
    console.error('Error fetching transfer status:', error);
    return NextResponse.json(
      {
        status: 'failed',
        message: 'Failed to fetch transfer status',
      },
      { status: 500 }
    );
  }
}
