import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUserIdFromCookies } from '@/lib/supabase';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query = supabaseAdmin
      .from('transactions')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (from) query.gte('created_at', from);
    if (to) query.lte('created_at', to);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const title = 'Transaction Statement';
    page.drawText(title, { x: 50, y: 760, size: 18, font });

    const rows = (data || []).slice(0, 1000); // limit
    let y = 730;
    const rowHeight = 14;

    page.drawText('Date | Name | Amount | Provider | Reference', { x: 50, y, size: 10, font });
    y -= rowHeight;

    for (const r of rows) {
      if (y < 40) break;
      const line = `${new Date(r.created_at).toLocaleDateString()} | ${r.name} | ${r.amount} | ${r.provider || ''} | ${r.transfer_reference || ''}`;
      page.drawText(line, { x: 50, y, size: 9, font });
      y -= rowHeight;
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=statement_${userId}.pdf`,
      },
    });
  } catch (error) {
    console.error('PDF statement error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
