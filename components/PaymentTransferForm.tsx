"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { getLinkedAccounts } from "@/lib/actions/provider-transfer.actions";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import TransferStatusPoller from './TransferStatusPoller';

const formSchema = z.object({
  transferType: z.enum(["plaid", "provider"], {
    errorMap: () => ({ message: "Please select a transfer type" }),
  }),
  provider: z.string().optional(),
  email: z.string().email("Invalid email address"),
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(1, "Amount is required"),
  senderBank: z.string().optional(),
  senderLinkedAccount: z.string().optional(),
  receiverLinkedAccount: z.string().optional(),
  sharableId: z.string().optional(),
});

interface LinkedAccount {
  id: string;
  provider: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  user_id: string;
}

const PaymentTransferForm = ({
  accounts,
  userId,
}: PaymentTransferFormProps & { userId: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [providerAccounts, setProviderAccounts] = useState<LinkedAccount[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");

  const [recipientVerificationStatus, setRecipientVerificationStatus] = useState<
    "idle" | "verifying" | "verified" | "error"
  >("idle");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [recipientVerificationError, setRecipientVerificationError] = useState<string | null>(null);
  const [transferResultInfo, setTransferResultInfo] = useState<{ id: string; provider: string } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transferType: "plaid",
      provider: "",
      name: "",
      email: "",
      amount: "",
      senderBank: "",
      senderLinkedAccount: "",
      receiverLinkedAccount: "",
      sharableId: "",
    },
  });

  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      try {
        const accounts = await getLinkedAccounts({ userId });
        setLinkedAccounts(accounts);
      } catch (error) {
        console.error("Failed to fetch linked accounts:", error);
      }
    };

    if (userId) {
      fetchLinkedAccounts();
    }
  }, [userId]);

  const transferType = form.watch("transferType");
  const selectedProviderValue = form.watch("provider");

  useEffect(() => {
    if (transferType === "provider" && selectedProviderValue) {
      const filtered = linkedAccounts.filter(
        (acc) => acc.provider === selectedProviderValue
      );
      setProviderAccounts(filtered);
      setSelectedProvider(selectedProviderValue);
    }
  }, [transferType, selectedProviderValue, linkedAccounts]);

  const verifyRecipient = async () => {
    const sharableId = form.getValues("sharableId");
    if (!sharableId) {
      setRecipientVerificationError("Enter recipient sharable id");
      return;
    }

    setRecipientVerificationStatus("verifying");
    setRecipientVerificationError(null);

    try {
      const res = await fetch("/api/transfer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharableId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setRecipientName(data.accountName || data.account?.account_name || null);
      setRecipientVerificationStatus("verified");
    } catch (err) {
      setRecipientVerificationStatus("error");
      setRecipientVerificationError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      if (data.transferType === "plaid") {
        // Use server API to perform Dwolla/ Plaid transfer
        const response = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "dwolla",
            senderId: userId,
            senderBankId: data.senderBank,
            sharableId: data.sharableId,
            amount: data.amount,
            email: data.email,
            name: data.name,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Transfer failed");
        }

        form.reset();
        router.push("/");
      } else if (data.transferType === "provider") {
        // Provider transfer flow via server
        const response = await fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "provider",
            senderId: userId,
            amount: data.amount,
            email: data.email,
            name: data.name,
            linkedAccountId: data.senderLinkedAccount,
            receiverLinkedAccountId: data.receiverLinkedAccount,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Transfer failed");
        }

        form.reset();
        router.push("/");
      }
    } catch (error) {
      console.error("Transfer error:", error);
      const errorMessage = error instanceof Error ? error.message : "Transfer failed";
      alert(errorMessage);
    }

    setIsLoading(false);
  };

  const plaidAccounts = accounts || [];
  const hasPlaidAccounts = plaidAccounts.length > 0;
  const hasProviderAccounts = linkedAccounts.length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
        {hasPlaidAccounts && hasProviderAccounts && (
          <FormField
            control={form.control}
            name="transferType"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item pb-6 pt-5">
                  <div className="payment-transfer_form-content">
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Transfer Type
                    </FormLabel>
                    <FormDescription className="text-12 font-normal text-gray-600">
                      Choose how you want to transfer funds
                    </FormDescription>
                  </div>
                  <div className="flex w-full flex-col gap-3">
                    <label className="flex items-center gap-3 rounded-lg border border-gray-300 p-3 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="plaid"
                        checked={field.value === "plaid"}
                        onChange={() => field.onChange("plaid")}
                        className="w-4 h-4"
                      />
                      <span className="text-14 text-gray-700">
                        Plaid/Dwolla (US Banks)
                      </span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-gray-300 p-3 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="provider"
                        checked={field.value === "provider"}
                        onChange={() => field.onChange("provider")}
                        className="w-4 h-4"
                      />
                      <span className="text-14 text-gray-700">
                        African Payment Providers (Flutterwave, Paystack, OPay,
                        Monnify)
                      </span>
                    </label>
                  </div>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </FormItem>
            )}
          />
        )}

        {transferType === "plaid" && hasPlaidAccounts && (
          <>
            <FormField
              control={form.control}
              name="senderBank"
              render={() => (
                <FormItem className="border-t border-gray-200">
                  <div className="payment-transfer_form-item pb-6 pt-5">
                    <div className="payment-transfer_form-content">
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Select Source Bank
                      </FormLabel>
                      <FormDescription className="text-12 font-normal text-gray-600">
                        Select the bank account you want to transfer funds from
                      </FormDescription>
                    </div>
                    <div className="flex w-full flex-col">
                      <FormControl>
                        <BankDropdown
                          accounts={plaidAccounts}
                          setValue={form.setValue}
                          otherStyles="!w-full"
                        />
                      </FormControl>
                      <FormMessage className="text-12 text-red-500" />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sharableId"
              render={({ field }) => (
                <FormItem className="border-t border-gray-200">
                  <div className="payment-transfer_form-item pb-5 pt-6">
                    <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                      Receiver&apos;s Plaid Sharable Id
                    </FormLabel>
                    <div className="flex w-full flex-col">
                      <div className="flex gap-2 items-center">
                        <FormControl className="flex-1">
                          <Input
                            placeholder="Enter the public account number"
                            className="input-class"
                            {...field}
                          />
                        </FormControl>
                        <div>
                          <Button type="button" variant="outline" onClick={verifyRecipient} disabled={recipientVerificationStatus === 'verifying'}>
                            {recipientVerificationStatus === 'verifying' ? 'Verifying...' : recipientVerificationStatus === 'verified' ? 'Verified' : 'Verify'}
                          </Button>
                        </div>
                      </div>
                      <FormMessage className="text-12 text-red-500" />

                      {recipientVerificationStatus === 'verified' && recipientName && (
                        <div className="mt-2 text-sm text-green-700">Recipient: {recipientName}</div>
                      )}

                      {recipientVerificationError && (
                        <div className="mt-2 text-sm text-red-600">{recipientVerificationError}</div>
                      )}
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </>
        )}

        {transferType === "provider" && hasProviderAccounts && (
          <>
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem className="border-t border-gray-200">
                  <div className="payment-transfer_form-item pb-6 pt-5">
                    <div className="payment-transfer_form-content">
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Payment Provider
                      </FormLabel>
                      <FormDescription className="text-12 font-normal text-gray-600">
                        Select the payment provider you want to use
                      </FormDescription>
                    </div>
                    <div className="flex w-full flex-col">
                      <FormControl>
                        <select
                          value={field.value}
                          onChange={field.onChange}
                          className="input-class"
                        >
                          <option value="">Select a provider</option>
                          {Array.from(
                            new Set(linkedAccounts.map((acc) => acc.provider))
                          ).map((provider) => (
                            <option key={provider} value={provider}>
                              {provider.charAt(0).toUpperCase() +
                                provider.slice(1)}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-12 text-red-500" />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {selectedProvider && (
              <>
                <FormField
                  control={form.control}
                  name="senderLinkedAccount"
                  render={({ field }) => (
                    <FormItem className="border-t border-gray-200">
                      <div className="payment-transfer_form-item pb-6 pt-5">
                        <div className="payment-transfer_form-content">
                          <FormLabel className="text-14 font-medium text-gray-700">
                            Sender Account
                          </FormLabel>
                          <FormDescription className="text-12 font-normal text-gray-600">
                            Select your account to send from
                          </FormDescription>
                        </div>
                        <div className="flex w-full flex-col">
                          <FormControl>
                            <select
                              value={field.value}
                              onChange={field.onChange}
                              className="input-class"
                            >
                              <option value="">Select account</option>
                              {providerAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.account_name} ({account.account_number})
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage className="text-12 text-red-500" />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receiverLinkedAccount"
                  render={({ field }) => (
                    <FormItem className="border-t border-gray-200">
                      <div className="payment-transfer_form-item pb-6 pt-5">
                        <div className="payment-transfer_form-content">
                          <FormLabel className="text-14 font-medium text-gray-700">
                            Receiver Account
                          </FormLabel>
                          <FormDescription className="text-12 font-normal text-gray-600">
                            Select the account to send to
                          </FormDescription>
                        </div>
                        <div className="flex w-full flex-col">
                          <FormControl>
                            <select
                              value={field.value}
                              onChange={field.onChange}
                              className="input-class"
                            >
                              <option value="">Select account</option>
                              {providerAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.account_name} ({account.account_number})
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage className="text-12 text-red-500" />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}
          </>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Transfer Note (Optional)
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Please provide any additional information or instructions
                    related to the transfer
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Textarea
                      placeholder="Write a short note here"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_form-details">
          <h2 className="text-18 font-semibold text-gray-900">
            Bank account details
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Enter the bank account details of the recipient
          </p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Recipient&apos;s Email Address
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: johndoe@gmail.com"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="border-y border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Amount
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: 5.00"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_btn-box">
          <Button type="submit" className="payment-transfer_btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> &nbsp; Sending...
              </>
            ) : (
              "Transfer Funds"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentTransferForm;
