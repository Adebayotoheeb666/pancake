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
      const receiverBank = await getBankByAccountId({
        accountId: receiverAccountId,
      });

      const transferParams = {
        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
        destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
        amount: amount,
      };

      const transfer = await createTransfer(transferParams);

      if (transfer) {
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

        return NextResponse.json({
          success: true,
          provider: 'dwolla',
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
        transfer: transferResult,
        message: 'Transfer completed successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid transfer type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Transfer failed',
      },
      { status: 500 }
    );
  }
}
