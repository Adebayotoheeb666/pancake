"use server";

import { parseStringify } from "../utils";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const FLUTTERWAVE_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "";
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || "";

export const createFlutterwaveRecipient = async (
  options: CreateFlutterwaveRecipientOptions
) => {
  try {
    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/transfers/recipients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_bank: options.bankCode,
        account_number: options.accountNumber,
        currency: options.currency || "NGN",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create recipient");
    }

    return parseStringify({
      recipientId: data.data.id,
      recipientCode: data.data.recipient_code,
    });
  } catch (error) {
    console.error("Creating Flutterwave Recipient Failed:", error);
    throw error;
  }
};

export const getFlutterwaveAccount = async (
  options: GetFlutterwaveAccountOptions
) => {
  try {
    const response = await fetch(
      `${FLUTTERWAVE_BASE_URL}/accounts/resolve?account_number=${options.accountNumber}&account_bank=${options.bankCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Account verification failed");
    }

    return parseStringify({
      accountName: data.data.account_name,
      accountNumber: options.accountNumber,
      bankCode: options.bankCode,
    });
  } catch (error) {
    console.error("Getting Flutterwave Account Failed:", error);
    throw error;
  }
};

export const createFlutterwaveTransfer = async (
  options: CreateFlutterwaveTransferOptions
) => {
  try {
    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/transfers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_bank: options.recipientBankCode,
        account_number: options.recipientAccountNumber,
        amount: options.amount,
        currency: options.currency || "NGN",
        narration: options.narration,
        reference: options.reference,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Transfer failed");
    }

    return parseStringify({
      transferId: data.data.id,
      reference: data.data.reference,
      status: data.data.status,
    });
  } catch (error) {
    console.error("Creating Flutterwave Transfer Failed:", error);
    throw error;
  }
};

export const getFlutterwaveTransactions = async (
  options: GetFlutterwaveTransactionsOptions
) => {
  try {
    const response = await fetch(
      `${FLUTTERWAVE_BASE_URL}/transactions?customer_id=${options.customerId}&from=${options.from}&to=${options.to}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch transactions");
    }

    const transactions = (data.data || []).map((transaction: any) => ({
      id: transaction.id,
      name: transaction.customer?.name || "Transfer",
      amount: transaction.amount,
      date: transaction.created_at,
      status: transaction.status,
      reference: transaction.reference,
      type: transaction.type || "transfer",
    }));

    return parseStringify(transactions);
  } catch (error) {
    console.error("Getting Flutterwave Transactions Failed:", error);
    throw error;
  }
};

export const getFlutterwaveBanks = async () => {
  try {
    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/banks/NG`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch banks");
    }

    const banks = (data.data || []).map((bank: any) => ({
      code: bank.code,
      name: bank.name,
    }));

    return parseStringify(banks);
  } catch (error) {
    console.error("Getting Flutterwave Banks Failed:", error);
    throw error;
  }
};

declare interface CreateFlutterwaveRecipientOptions {
  bankCode: string;
  accountNumber: string;
  currency?: string;
}

declare interface GetFlutterwaveAccountOptions {
  accountNumber: string;
  bankCode: string;
}

declare interface CreateFlutterwaveTransferOptions {
  recipientBankCode: string;
  recipientAccountNumber: string;
  amount: number;
  currency?: string;
  narration?: string;
  reference: string;
}

declare interface GetFlutterwaveTransactionsOptions {
  customerId: string;
  from?: string;
  to?: string;
}
