"use server";

import { parseStringify } from "../utils";

const MONNIFY_BASE_URL = "https://sandbox.monnify.com/api";
const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY || "";
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY || "";

const getMonnifyAuthHeader = () => {
  const credentials = `${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");
  return `Basic ${encodedCredentials}`;
};

export const createMonnifyTransferRecipient = async (
  options: CreateMonnifyTransferRecipientOptions
) => {
  try {
    const response = await fetch(
      `${MONNIFY_BASE_URL}/v1/transfer/bank-details/validate`,
      {
        method: "POST",
        headers: {
          Authorization: getMonnifyAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: options.accountNumber,
          bankCode: options.bankCode,
        }),
      }
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(data.responseMessage || "Failed to create recipient");
    }

    return parseStringify({
      accountName: data.responseBody.accountName,
      accountNumber: options.accountNumber,
      bankCode: options.bankCode,
    });
  } catch (error) {
    console.error("Creating Monnify Transfer Recipient Failed:", error);
    throw error;
  }
};

export const verifyMonnifyAccount = async (
  options: VerifyMonnifyAccountOptions
) => {
  try {
    const response = await fetch(
      `${MONNIFY_BASE_URL}/v1/transfer/bank-details/validate`,
      {
        method: "POST",
        headers: {
          Authorization: getMonnifyAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: options.accountNumber,
          bankCode: options.bankCode,
        }),
      }
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(data.responseMessage || "Account verification failed");
    }

    return parseStringify({
      accountName: data.responseBody.accountName,
      accountNumber: options.accountNumber,
      bankCode: options.bankCode,
    });
  } catch (error) {
    console.error("Verifying Monnify Account Failed:", error);
    throw error;
  }
};

export const createMonnifyTransfer = async (
  options: CreateMonnifyTransferOptions
) => {
  try {
    const response = await fetch(
      `${MONNIFY_BASE_URL}/v1/transfer/create`,
      {
        method: "POST",
        headers: {
          Authorization: getMonnifyAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceAccountNumber: options.sourceAccountNumber,
          destinationBankCode: options.bankCode,
          destinationAccountNumber: options.accountNumber,
          amount: options.amount,
          currency: options.currency || "NGN",
          transactionReference: options.reference,
          narration: options.narration,
        }),
      }
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(data.responseMessage || "Transfer failed");
    }

    return parseStringify({
      transferId: data.responseBody.transactionId,
      reference: data.responseBody.transactionReference,
      status: data.responseBody.status,
    });
  } catch (error) {
    console.error("Creating Monnify Transfer Failed:", error);
    throw error;
  }
};

export const getMonnifyTransactions = async (
  options: GetMonnifyTransactionsOptions
) => {
  try {
    const params = new URLSearchParams();
    if (options.pageNumber) params.append("pageNumber", options.pageNumber.toString());
    if (options.pageSize) params.append("pageSize", options.pageSize.toString());
    if (options.from) params.append("from", options.from);
    if (options.to) params.append("to", options.to);

    const response = await fetch(
      `${MONNIFY_BASE_URL}/v1/transactions/search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: getMonnifyAuthHeader(),
        },
      }
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(data.responseMessage || "Failed to fetch transactions");
    }

    const transactions = (data.responseBody?.content || []).map((transaction: any) => ({
      id: transaction.transactionId,
      name: transaction.counterPartyName || "Transfer",
      amount: transaction.amount,
      date: transaction.transactionDate,
      status: transaction.status,
      reference: transaction.transactionReference,
      type: transaction.transactionType || "transfer",
    }));

    return parseStringify({
      transactions,
      pagination: {
        pageNumber: data.responseBody?.pageNumber,
        pageSize: data.responseBody?.pageSize,
        totalPages: data.responseBody?.totalPages,
        totalRecords: data.responseBody?.totalRecords,
      },
    });
  } catch (error) {
    console.error("Getting Monnify Transactions Failed:", error);
    throw error;
  }
};

export const getMonnifyBanks = async () => {
  try {
    const response = await fetch(
      `${MONNIFY_BASE_URL}/v1/banks`,
      {
        method: "GET",
        headers: {
          Authorization: getMonnifyAuthHeader(),
        },
      }
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(data.responseMessage || "Failed to fetch banks");
    }

    const banks = (data.responseBody || []).map((bank: any) => ({
      code: bank.code,
      name: bank.name,
    }));

    return parseStringify(banks);
  } catch (error) {
    console.error("Getting Monnify Banks Failed:", error);
    throw error;
  }
};

declare interface CreateMonnifyTransferRecipientOptions {
  accountNumber: string;
  bankCode: string;
}

declare interface VerifyMonnifyAccountOptions {
  accountNumber: string;
  bankCode: string;
}

declare interface CreateMonnifyTransferOptions {
  sourceAccountNumber: string;
  accountNumber: string;
  bankCode: string;
  amount: number;
  currency?: string;
  reference: string;
  narration?: string;
}

declare interface GetMonnifyTransactionsOptions {
  pageNumber?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}
