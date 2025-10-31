"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

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
import ProviderBankSelect from "./ProviderBankSelect";

const formSchema = z.object({
  provider: z.enum(["flutterwave", "paystack", "opay", "monnify"], {
    errorMap: () => ({ message: "Please select a valid provider" }),
  }),
  accountNumber: z
    .string()
    .min(8, "Account number must be at least 8 digits")
    .max(20, "Account number cannot exceed 20 characters")
    .regex(/^\d+$/, "Account number must contain only digits"),
  bankCode: z.string().min(1, "Please select a bank"),
  accountName: z.string().optional(),
});

interface LinkedAccountFormProps {
  provider: "flutterwave" | "paystack" | "opay" | "monnify";
  userId: string;
  banks: any[];
  onSuccess?: () => void;
}

const LinkedAccountForm = ({
  provider,
  userId,
  banks,
  onSuccess,
}: LinkedAccountFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "verified" | "error"
  >("idle");
  const [verificationError, setVerificationError] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      provider,
      accountNumber: "",
      bankCode: "",
      accountName: "",
    },
  });

  const verifyAccount = async () => {
    const accountNumber = form.getValues("accountNumber");
    const bankCode = form.getValues("bankCode");

    if (!accountNumber || !bankCode) {
      setVerificationError("Please fill in account number and bank code");
      return;
    }

    setVerificationStatus("verifying");
    setVerificationError("");

    try {
      const response = await fetch(
        `/api/bank/${provider}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountNumber, bankCode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Account verification failed");
      }

      form.setValue("accountName", data.accountName);
      setVerificationStatus("verified");
    } catch (error) {
      setVerificationStatus("error");
      setVerificationError(
        error instanceof Error ? error.message : "Verification failed"
      );
    }
  };

  const submit = async (data: z.infer<typeof formSchema>) => {
    if (verificationStatus !== "verified") {
      setVerificationError("Please verify your account first");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/linked-account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          provider: data.provider,
          accountNumber: data.accountNumber,
          bankCode: data.bankCode,
          accountName: data.accountName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to link account");
      }

      form.reset();
      setVerificationStatus("idle");
      onSuccess?.();
    } catch (error) {
      console.error("Error linking account:", error);
      setVerificationError(
        error instanceof Error ? error.message : "Failed to link account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="bankCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-14 font-medium text-gray-700">
                Bank
              </FormLabel>
              <FormDescription className="text-12 font-normal text-gray-600">
                Search and select your bank
              </FormDescription>
              <FormControl>
                <ProviderBankSelect
                  provider={provider}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={verificationStatus === "verifying" || isLoading}
                />
              </FormControl>
              <FormMessage className="text-12 text-red-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-14 font-medium text-gray-700">
                Account Number
              </FormLabel>
              <FormDescription className="text-12 font-normal text-gray-600">
                Enter your account number
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="e.g., 0123456789"
                  className="input-class"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-12 text-red-500" />
            </FormItem>
          )}
        />

        <Button
          type="button"
          variant="outline"
          onClick={verifyAccount}
          disabled={verificationStatus === "verifying" || isLoading}
          className="w-full"
        >
          {verificationStatus === "verifying" ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Verifying...
            </>
          ) : verificationStatus === "verified" ? (
            "✓ Verified"
          ) : (
            "Verify Account"
          )}
        </Button>

        {verificationStatus === "verified" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-12 text-green-700">
              <strong>Account Name:</strong> {form.getValues("accountName")}
            </p>
          </div>
        )}

        {verificationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-12 text-red-700">{verificationError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || verificationStatus !== "verified"}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Linking Account...
            </>
          ) : (
            "Link Account"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default LinkedAccountForm;
