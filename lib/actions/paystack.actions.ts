"use server";

import { parseStringify } from "../utils";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

export const createPaystackTransferRecipient = async (
  options: CreatePaystackTransferRecipientOptions
) => {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: options.recipientName,
          account_number: options.accountNumber,
          bank_code: options.bankCode,
          currency: options.currency || "NGN",
        }),
      }
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Failed to create transfer recipient");
    }

    return parseStringify({
      recipientId: data.data.recipient_code,
      accountName: data.data.details.account_name,
    });
  } catch (error) {
    console.error("Creating Paystack Transfer Recipient Failed:", error);
    throw error;
  }
};

export const verifyPaystackAccount = async (
  options: VerifyPaystackAccountOptions
) => {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${options.accountNumber}&bank_code=${options.bankCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Account verification failed");
    }

    return parseStringify({
      accountName: data.data.account_name,
      accountNumber: options.accountNumber,
      bankCode: options.bankCode,
    });
  } catch (error) {
    console.error("Verifying Paystack Account Failed:", error);
    throw error;
  }
};

export const createPaystackTransfer = async (
  options: CreatePaystackTransferOptions
) => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        reason: options.reason || "Payment transfer",
        amount: options.amount * 100,
        recipient: options.recipientCode,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Transfer failed");
    }

    return parseStringify({
      transferId: data.data.id,
      reference: data.data.reference,
      status: data.data.status,
    });
  } catch (error) {
    console.error("Creating Paystack Transfer Failed:", error);
    throw error;
  }
};

export const getPaystackTransactions = async (
  options: GetPaystackTransactionsOptions
) => {
  try {
    const params = new URLSearchParams();
    params.append("perPage", options.perPage?.toString() || "10");
    params.append("page", options.page?.toString() || "1");
    if (options.from) params.append("from", options.from);
    if (options.to) params.append("to", options.to);

    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Failed to fetch transactions");
    }

    const transactions = (data.data || []).map((transaction: any) => ({
      id: transaction.id,
      name: transaction.customer?.first_name
        ? `${transaction.customer.first_name} ${transaction.customer.last_name}`
        : "Transaction",
      amount: transaction.amount / 100,
      date: transaction.created_at,
      status: transaction.status,
      reference: transaction.reference,
      type: transaction.type || "payment",
    }));

    return parseStringify({
      transactions,
      pagination: data.meta,
    });
  } catch (error) {
    console.error("Getting Paystack Transactions Failed:", error);
    throw error;
  }
};

export const getPaystackBanks = async () => {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/bank?country=NG&currency=NGN`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Failed to fetch banks");
    }

    const banks = (data.data || []).map((bank: any) => ({
      code: bank.code,
      name: bank.name,
    }));

    return parseStringify(banks);
  } catch (error) {
    console.error("Getting Paystack Banks Failed:", error);
    throw error;
  }
};

declare interface CreatePaystackTransferRecipientOptions {
  recipientName: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
}

declare interface VerifyPaystackAccountOptions {
  accountNumber: string;
  bankCode: string;
}

declare interface CreatePaystackTransferOptions {
  recipientCode: string;
  amount: number;
  reason?: string;
}

declare interface GetPaystackTransactionsOptions {
  perPage?: number;
  page?: number;
  from?: string;
  to?: string;
}
