import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    // Optional webhook secret validation
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = request.headers.get('x-webhook-secret') || request.headers.get('x-provider-signature') || request.headers.get('x-signature');
      if (!provided || provided !== expectedSecret) {
        console.warn('Webhook secret mismatch');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { provider, external_transfer_id, status, reference, transferId } = body;

    if (!provider || !external_transfer_id) {
      return NextResponse.json({ error: 'Missing provider or external_transfer_id' }, { status: 400 });
    }

    // Update transfers table by external id or reference
    const updates: any = {
      status: status || 'processing',
      status_message: `Update from ${provider}: ${status}`,
    };

    if (reference) updates.reference = reference;

    const { data, error } = await supabaseAdmin
      .from('transfers')
      .update(updates)
      .eq('external_transfer_id', external_transfer_id)
      .select()
      .single();

    if (error) {
      // fallback: try update by reference
      const { data: d2, error: e2 } = await supabaseAdmin
        .from('transfers')
        .update(updates)
        .eq('reference', reference)
        .select()
        .single();

      if (e2) {
        Sentry.captureException(e2);
        console.error('Webhook update failed', e2);
        return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
      }

      return NextResponse.json({ success: true, transfer: d2 });
    }

    return NextResponse.json({ success: true, transfer: data });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook failed' }, { status: 500 });
  }
}
