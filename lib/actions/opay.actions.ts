"use server";

import { parseStringify } from "../utils";

const OPAY_BASE_URL = "https://api.opaydemo.com";
const OPAY_SECRET_KEY = process.env.OPAY_SECRET_KEY || "";
const OPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_OPAY_PUBLIC_KEY || "";
const OPAY_MERCHANT_ID = process.env.OPAY_MERCHANT_ID || "";

export const createOpayBeneficiary = async (
  options: CreateOpayBeneficiaryOptions
) => {
  try {
    const response = await fetch(
      `${OPAY_BASE_URL}/api/v3/transferService/beneficiary/add`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
          "X-Merchant-ID": OPAY_MERCHANT_ID,
        },
        body: JSON.stringify({
          accountNumber: options.accountNumber,
          bankCode: options.bankCode,
          beneficiaryName: options.beneficiaryName,
          currency: options.currency || "NGN",
        }),
      }
    );

    const data = await response.json();

    if (data.code !== "00000") {
      throw new Error(data.message || "Failed to create beneficiary");
    }

    return parseStringify({
      beneficiaryId: data.data.beneficiaryId,
      accountName: data.data.accountName,
    });
  } catch (error) {
    console.error("Creating Opay Beneficiary Failed:", error);
    throw error;
  }
};

export const verifyOpayAccount = async (
  options: VerifyOpayAccountOptions
) => {
  try {
    const response = await fetch(
      `${OPAY_BASE_URL}/api/v3/accountService/accountVerification`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
          "X-Merchant-ID": OPAY_MERCHANT_ID,
        },
        body: JSON.stringify({
          accountNumber: options.accountNumber,
          bankCode: options.bankCode,
        }),
      }
    );

    const data = await response.json();

    if (data.code !== "00000") {
      throw new Error(data.message || "Account verification failed");
    }

    return parseStringify({
      accountName: data.data.accountName,
      accountNumber: options.accountNumber,
      bankCode: options.bankCode,
    });
  } catch (error) {
    console.error("Verifying Opay Account Failed:", error);
    throw error;
  }
};

export const createOpayTransfer = async (
  options: CreateOpayTransferOptions
) => {
  try {
    const response = await fetch(`${OPAY_BASE_URL}/api/v3/transferService/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
        "X-Merchant-ID": OPAY_MERCHANT_ID,
      },
      body: JSON.stringify({
        beneficiaryId: options.beneficiaryId,
        amount: options.amount,
        currency: options.currency || "NGN",
        narration: options.narration,
        reference: options.reference,
      }),
    });

    const data = await response.json();

    if (data.code !== "00000") {
      throw new Error(data.message || "Transfer failed");
    }

    return parseStringify({
      transferId: data.data.transactionId,
      reference: data.data.reference,
      status: data.data.status,
    });
  } catch (error) {
    console.error("Creating Opay Transfer Failed:", error);
    throw error;
  }
};

export const getOpayTransactions = async (
  options: GetOpayTransactionsOptions
) => {
  try {
    const response = await fetch(
      `${OPAY_BASE_URL}/api/v3/transactionService/queryTransaction`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
          "X-Merchant-ID": OPAY_MERCHANT_ID,
        },
        body: JSON.stringify({
          startDate: options.from,
          endDate: options.to,
          pageNumber: options.page || 1,
          pageSize: options.pageSize || 10,
        }),
      }
    );

    const data = await response.json();

    if (data.code !== "00000") {
      throw new Error(data.message || "Failed to fetch transactions");
    }

    const transactions = (data.data?.content || []).map((transaction: any) => ({
      id: transaction.transactionId,
      name: transaction.counterParty || "Transfer",
      amount: transaction.amount,
      date: transaction.transactionTime,
      status: transaction.status,
      reference: transaction.reference,
      type: transaction.transactionType || "transfer",
    }));

    return parseStringify({
      transactions,
      pagination: {
        pageNumber: data.data?.pageNumber,
        pageSize: data.data?.pageSize,
        totalRecords: data.data?.totalRecords,
      },
    });
  } catch (error) {
    console.error("Getting Opay Transactions Failed:", error);
    throw error;
  }
};

export const getOpayBanks = async () => {
  try {
    const response = await fetch(`${OPAY_BASE_URL}/api/v3/bank/list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${OPAY_SECRET_KEY}`,
        "X-Merchant-ID": OPAY_MERCHANT_ID,
      },
    });

    const data = await response.json();

    if (data.code !== "00000") {
      throw new Error(data.message || "Failed to fetch banks");
    }

    const banks = (data.data || []).map((bank: any) => ({
      code: bank.code,
      name: bank.name,
    }));

    return parseStringify(banks);
  } catch (error) {
    console.error("Getting Opay Banks Failed:", error);
    throw error;
  }
};

declare interface CreateOpayBeneficiaryOptions {
  accountNumber: string;
  bankCode: string;
  beneficiaryName: string;
  currency?: string;
}

declare interface VerifyOpayAccountOptions {
  accountNumber: string;
  bankCode: string;
}

declare interface CreateOpayTransferOptions {
  beneficiaryId: string;
  amount: number;
  currency?: string;
  narration?: string;
  reference: string;
}

declare interface GetOpayTransactionsOptions {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
