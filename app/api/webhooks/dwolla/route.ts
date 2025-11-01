import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHmacSha256Hex } from '@/lib/utils/webhook';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText || '{}');

    const secret = process.env.DWOLLA_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || '';
    const header = request.headers.get('x-dwolla-signature') || request.headers.get('x-signature') || '';

    if (secret) {
      const ok = verifyHmacSha256Hex(secret, bodyText, header);
      if (!ok) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const external_transfer_id = body.resource?.id || body.id || body.eventId;
    const status = body.eventType || body.status || 'processing';

    const updates: any = { status, status_message: `Dwolla webhook: ${status}` };

    const { data, error } = await supabaseAdmin
      .from('transfers')
      .update(updates)
      .eq('external_transfer_id', external_transfer_id)
      .select()
      .single();

    if (error) {
      const { data: d2, error: e2 } = await supabaseAdmin
        .from('transfers')
        .update(updates)
        .eq('reference', body.resource?.metadata?.reference || body.reference)
        .select()
        .single();

      if (e2) {
        Sentry.captureException(e2);
        console.error('Dwolla webhook update failed', e2);
        return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
      }

      return NextResponse.json({ success: true, transfer: d2 });
    }

    return NextResponse.json({ success: true, transfer: data });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Dwolla webhook error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook failed' }, { status: 500 });
  }
}
