import { NextRequest, NextResponse } from 'next/server';
import { performProviderTransfer, getLinkedAccounts } from '@/lib/actions/provider-transfer.actions';
import { createTransfer } from '@/lib/actions/dwolla.actions';
import { createTransaction } from '@/lib/actions/transaction.actions';
import { getBank, getBankByAccountId } from '@/lib/actions/user.actions';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit, getRateLimitKey } from '@/lib/rate-limit';

async function handleTransfer(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      senderId,
      senderBankId,
      senderProvider,
      receiverAccountId,
      amount,
      email,
      name,
      linkedAccountId,
      receiverLinkedAccountId,
    } = body;

    if (!senderId || !amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle Plaid/Dwolla transfer (existing flow)
    if (type === 'dwolla') {
      const senderBank = await getBank({ documentId: senderBankId });
      // support either raw receiverAccountId or encrypted sharableId
      let finalReceiverAccountId = receiverAccountId;
      if (!finalReceiverAccountId && body.sharableId) {
        try {
          finalReceiverAccountId = Buffer.from(body.sharableId, 'base64').toString('utf8');
        } catch (err) {
          return NextResponse.json({ error: 'Invalid sharableId' }, { status: 400 });
        }
      }

      const receiverBank = await getBankByAccountId({
        accountId: finalReceiverAccountId,
      });

      const transferParams = {
        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
        destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
        amount: amount,
      };

      const transfer = await createTransfer(transferParams);

    if (transfer) {
      // Store transfer status in database
      const { data: transferRecord } = await supabaseAdmin
        .from('transfers')
        .insert({
          provider: 'dwolla',
          amount: Number(amount),
          sender_id: senderBank.userId.$id,
          receiver_id: receiverBank.userId.$id,
          status: 'completed',
          status_message: 'Transfer completed successfully',
          reference: `dwolla-${Date.now()}`,
        })
        .select()
        .single();

      const transaction = {
        name: name || 'Transfer',
        amount: amount,
        senderId: senderBank.userId.$id,
        senderBankId: senderBank.$id,
        receiverId: receiverBank.userId.$id,
        receiverBankId: receiverBank.$id,
        email: email,
        provider: 'dwolla',
      };

      await createTransaction(transaction);

      // Audit log
      try {
        const { logAudit } = await import('@/lib/audit');
        await logAudit({ userId: senderBank.userId.$id, method: 'POST', path: '/api/transfer', status: 200, ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null, body: { type: 'dwolla', amount, receiverAccountId } });
      } catch (e) {
        console.error('Failed to write audit log', e);
      }

      return NextResponse.json({
        success: true,
        provider: 'dwolla',
        transferId: transferRecord?.id,
        message: 'Transfer completed successfully',
      });
    }
    }

    // Handle African provider transfers
    if (type === 'provider') {
      const { data: senderLinkedAccount } = await supabaseAdmin
        .from('linked_accounts')
        .select('*')
        .eq('id', linkedAccountId)
        .single();

      const { data: receiverLinkedAccount } = await supabaseAdmin
        .from('linked_accounts')
        .select('*')
        .eq('id', receiverLinkedAccountId)
        .single();

      if (!senderLinkedAccount || !receiverLinkedAccount) {
        return NextResponse.json(
          { error: 'Invalid linked accounts' },
          { status: 400 }
        );
      }

      const provider = senderLinkedAccount.provider;

      if (senderLinkedAccount.provider !== receiverLinkedAccount.provider) {
        return NextResponse.json(
          {
            error: 'Sender and receiver must use the same payment provider',
          },
          { status: 400 }
        );
      }

      const transferResult = await performProviderTransfer({
        provider: provider as 'flutterwave' | 'paystack' | 'opay' | 'monnify',
        amount: Number(amount),
        senderAccount: senderLinkedAccount,
        receiverAccount: receiverLinkedAccount,
      });

      // Store transfer in database with status tracking
      const { data: transferRecord } = await supabaseAdmin
        .from('transfers')
        .insert({
          provider: provider,
          amount: Number(amount),
          sender_id: senderId,
          receiver_id: receiverLinkedAccount.user_id,
          status: transferResult.status || 'processing',
          status_message: `Transfer initiated via ${provider}`,
          reference: transferResult.reference,
          external_transfer_id: transferResult.transferId,
        })
        .select()
        .single();

      // Record the transaction
      const transaction = {
        name: name || 'Provider Transfer',
        amount: amount,
        senderId: senderId,
        senderBankId: linkedAccountId,
        receiverId: receiverLinkedAccount.user_id,
        receiverBankId: receiverLinkedAccountId,
        email: email,
        provider: provider,
        transfer_reference: transferResult.reference,
      };

      await createTransaction(transaction);

      return NextResponse.json({
        success: true,
        provider: provider,
        transferId: transferRecord?.id,
        transfer: transferResult,
        message: 'Transfer initiated successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid transfer type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Transfer error:', error);
    try { (await import('@sentry/nextjs')).captureException(error); } catch(e) { console.error('Sentry capture failed', e); }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Transfer failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    () => handleTransfer(request),
    {
      limit: 5, // 5 transfer attempts per user
      windowMs: 60 * 60 * 1000, // 1 hour
      keyGenerator: (req) => `transfer:${getRateLimitKey(req, '')}`,
    }
  );
}
