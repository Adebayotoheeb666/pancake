import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHmacSha256Hex } from '@/lib/utils/webhook';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText || '{}');

    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || '';
    const header = request.headers.get('x-paystack-signature') || request.headers.get('x-signature') || '';

    if (secret) {
      const ok = verifyHmacSha256Hex(secret, bodyText, header);
      if (!ok) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const external_transfer_id = body.data?.reference || body.data?.id || body.reference || body.id;
    const status = body.event || body.data?.status || 'processing';

    const updates: any = { status, status_message: `Paystack webhook: ${status}` };

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
        .eq('reference', body.data?.reference || body.reference)
        .select()
        .single();

      if (e2) {
        Sentry.captureException(e2);
        console.error('Paystack webhook update failed', e2);
        return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
      }

      return NextResponse.json({ success: true, transfer: d2 });
    }

    return NextResponse.json({ success: true, transfer: data });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook failed' }, { status: 500 });
  }
}
