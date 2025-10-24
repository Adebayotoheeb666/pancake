"use server";

"use server";

import { parseStringify } from "../utils";
import { supabaseAdmin } from "../supabase";

const TRANSACTIONS_TABLE = "transactions";

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const payload = {
      channel: 'online',
      category: 'Transfer',
      name: transaction.name,
      amount: transaction.amount,
      sender_id: transaction.senderId,
      sender_bank_id: transaction.senderBankId,
      receiver_id: transaction.receiverId,
      receiver_bank_id: transaction.receiverBankId,
      email: transaction.email,
    };

    const { data, error } = await supabaseAdmin
      .from(TRANSACTIONS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) throw error || new Error('Failed to create transaction');

    const mapped = {
      $id: data.id,
      name: data.name,
      amount: data.amount,
      $createdAt: data.created_at,
      channel: data.channel,
      category: data.category,
      senderBankId: data.sender_bank_id,
      receiverBankId: data.receiver_bank_id,
      email: data.email,
    } as unknown as Transaction;

    return parseStringify(mapped);
  } catch (error) {
    console.log(error);
  }
}

export const getTransactionsByBankId = async ({bankId}: getTransactionsByBankIdProps) => {
  try {
    const { data: senderData, error: senderErr } = await supabaseAdmin
      .from(TRANSACTIONS_TABLE)
      .select("*")
      .eq('sender_bank_id', bankId);

    const { data: receiverData, error: receiverErr } = await supabaseAdmin
      .from(TRANSACTIONS_TABLE)
      .select("*")
      .eq('receiver_bank_id', bankId);

    if (senderErr || receiverErr) throw senderErr || receiverErr;

    const docs = [...(senderData || []), ...(receiverData || [])].map((row: any) => ({
      $id: row.id,
      name: row.name,
      amount: row.amount,
      $createdAt: row.created_at,
      channel: row.channel,
      category: row.category,
      senderBankId: row.sender_bank_id,
      receiverBankId: row.receiver_bank_id,
    }));

    const transactions = {
      total: docs.length,
      documents: docs,
    };

    return parseStringify(transactions);
  } catch (error) {
    console.log(error);
  }
}
