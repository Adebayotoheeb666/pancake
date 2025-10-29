"use server";

import { parseStringify } from "../utils";
import { supabaseAdmin } from "../supabase";
import {
  createFlutterwaveTransfer,
  createFlutterwaveRecipient,
} from "./flutterwave.actions";
import {
  createPaystackTransfer,
  createPaystackTransferRecipient,
} from "./paystack.actions";
import {
  createOpayTransfer,
  createOpayBeneficiary,
} from "./opay.actions";
import {
  createMonnifyTransfer,
  createMonnifyTransferRecipient,
  getMonnifyTransactions,
} from "./monnify.actions";
import {
  getFlutterwaveTransactions,
} from "./flutterwave.actions";
import {
  getPaystackTransactions,
} from "./paystack.actions";
import {
  getOpayTransactions,
} from "./opay.actions";

export const getLinkedAccounts = async ({ userId }: { userId: string }) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("linked_accounts")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return parseStringify(data || []);
  } catch (error) {
    console.error("Error fetching linked accounts:", error);
    return [];
  }
};

export const performProviderTransfer = async (
  options: PerformProviderTransferOptions
) => {
  try {
    const { provider, amount, senderAccount, receiverAccount } = options;

    let transferResult;

    switch (provider) {
      case "flutterwave":
        transferResult = await flutterwaveTransfer(
          amount,
          senderAccount,
          receiverAccount
        );
        break;
      case "paystack":
        transferResult = await paystackTransfer(
          amount,
          senderAccount,
          receiverAccount
        );
        break;
      case "opay":
        transferResult = await opayTransfer(
          amount,
          senderAccount,
          receiverAccount
        );
        break;
      case "monnify":
        transferResult = await monnifyTransfer(
          amount,
          senderAccount,
          receiverAccount
        );
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    return transferResult;
  } catch (error) {
    console.error("Provider transfer error:", error);
    throw error;
  }
};

const flutterwaveTransfer = async (
  amount: number,
  senderAccount: LinkedAccount,
  receiverAccount: LinkedAccount
) => {
  try {
    const recipient = await createFlutterwaveRecipient({
      bankCode: receiverAccount.bank_code || "",
      accountNumber: receiverAccount.account_number,
      currency: "NGN",
    });

    const transfer = await createFlutterwaveTransfer({
      recipientBankCode: receiverAccount.bank_code || "",
      recipientAccountNumber: receiverAccount.account_number,
      amount: Number(amount),
      currency: "NGN",
      reference: `TXN-${Date.now()}`,
      narration: `Transfer to ${receiverAccount.account_name}`,
    });

    return {
      success: true,
      provider: "flutterwave",
      transferId: transfer.transferId,
      reference: transfer.reference,
      status: transfer.status,
    };
  } catch (error) {
    console.error("Flutterwave transfer failed:", error);
    throw error;
  }
};

const paystackTransfer = async (
  amount: number,
  senderAccount: LinkedAccount,
  receiverAccount: LinkedAccount
) => {
  try {
    const recipient = await createPaystackTransferRecipient({
      recipientName: receiverAccount.account_name,
      accountNumber: receiverAccount.account_number,
      bankCode: receiverAccount.bank_code || "",
      currency: "NGN",
    });

    const transfer = await createPaystackTransfer({
      recipientCode: recipient.recipientId,
      amount: Number(amount),
      reason: `Transfer to ${receiverAccount.account_name}`,
    });

    return {
      success: true,
      provider: "paystack",
      transferId: transfer.transferId,
      reference: transfer.reference,
      status: transfer.status,
    };
  } catch (error) {
    console.error("Paystack transfer failed:", error);
    throw error;
  }
};

const opayTransfer = async (
  amount: number,
  senderAccount: LinkedAccount,
  receiverAccount: LinkedAccount
) => {
  try {
    const beneficiary = await createOpayBeneficiary({
      accountNumber: receiverAccount.account_number,
      bankCode: receiverAccount.bank_code || "",
      beneficiaryName: receiverAccount.account_name,
      currency: "NGN",
    });

    const transfer = await createOpayTransfer({
      beneficiaryId: beneficiary.beneficiaryId,
      amount: Number(amount),
      currency: "NGN",
      reference: `TXN-${Date.now()}`,
      narration: `Transfer to ${receiverAccount.account_name}`,
    });

    return {
      success: true,
      provider: "opay",
      transferId: transfer.transferId,
      reference: transfer.reference,
      status: transfer.status,
    };
  } catch (error) {
    console.error("Opay transfer failed:", error);
    throw error;
  }
};

const monnifyTransfer = async (
  amount: number,
  senderAccount: LinkedAccount,
  receiverAccount: LinkedAccount
) => {
  try {
    const transfer = await createMonnifyTransfer({
      sourceAccountNumber: senderAccount.account_number,
      accountNumber: receiverAccount.account_number,
      bankCode: receiverAccount.bank_code || "",
      amount: Number(amount),
      narration: `Transfer to ${receiverAccount.account_name}`,
      reference: `TXN-${Date.now()}`,
    });

    return {
      success: true,
      provider: "monnify",
      transferId: transfer.transferId,
      reference: transfer.reference,
      status: transfer.status,
    };
  } catch (error) {
    console.error("Monnify transfer failed:", error);
    throw error;
  }
};

export const getProviderTransactions = async (
  provider: "flutterwave" | "paystack" | "opay" | "monnify",
  linkedAccountId?: string,
  options?: any
) => {
  try {
    switch (provider) {
      case "flutterwave":
        if (!options?.customerId) return [];
        const flutterwaveTransactions = await getFlutterwaveTransactions({
          customerId: options.customerId,
          from: options.from,
          to: options.to,
        });
        return flutterwaveTransactions || [];

      case "paystack":
        const paystackTransactions = await getPaystackTransactions({
          perPage: options?.perPage || 10,
        });
        return paystackTransactions || [];

      case "opay":
        if (!options?.customerId) return [];
        const opayTransactions = await getOpayTransactions({
          customerId: options.customerId,
          from: options.from,
          to: options.to,
        });
        return opayTransactions || [];

      case "monnify":
        const monnifyTransactions = await getMonnifyTransactions({
          pageNumber: options?.pageNumber || 0,
          pageSize: options?.pageSize || 10,
        });
        return monnifyTransactions || [];

      default:
        return [];
    }
  } catch (error) {
    console.error(`Error fetching ${provider} transactions:`, error);
    return [];
  }
};

declare interface PerformProviderTransferOptions {
  provider: "flutterwave" | "paystack" | "opay" | "monnify";
  amount: number;
  senderAccount: LinkedAccount;
  receiverAccount: LinkedAccount;
}

declare interface LinkedAccount {
  id: string;
  user_id: string;
  provider: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_code?: string;
  country: string;
  created_at?: string;
}
