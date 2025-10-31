"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import LinkedAccountForm from "./LinkedAccountForm";
import { Plus } from "lucide-react";

interface BankList {
  [provider: string]: {
    provider: "flutterwave" | "paystack" | "opay" | "monnify";
    banks: Array<{ code: string; name: string }>;
  };
}

// Bank lists for each provider
const BANK_LISTS: BankList = {
  flutterwave: {
    provider: "flutterwave",
    banks: [
      { code: "011", name: "First Bank" },
      { code: "007", name: "Zenith Bank" },
      { code: "008", name: "Eco Bank" },
      { code: "058", name: "Guaranty Trust Bank" },
      { code: "009", name: "Standard Chartered Bank" },
      { code: "033", name: "Access Bank" },
      { code: "050", name: "Fidelity Bank" },
      { code: "070", name: "Fidelity Bank" },
    ],
  },
  paystack: {
    provider: "paystack",
    banks: [
      { code: "011", name: "First Bank" },
      { code: "007", name: "Zenith Bank" },
      { code: "008", name: "Eco Bank" },
      { code: "058", name: "Guaranty Trust Bank" },
      { code: "009", name: "Standard Chartered Bank" },
      { code: "033", name: "Access Bank" },
      { code: "050", name: "Fidelity Bank" },
      { code: "070", name: "Fidelity Bank" },
    ],
  },
  opay: {
    provider: "opay",
    banks: [
      { code: "011", name: "First Bank" },
      { code: "007", name: "Zenith Bank" },
      { code: "008", name: "Eco Bank" },
      { code: "058", name: "Guaranty Trust Bank" },
      { code: "009", name: "Standard Chartered Bank" },
      { code: "033", name: "Access Bank" },
      { code: "050", name: "Fidelity Bank" },
      { code: "070", name: "Fidelity Bank" },
    ],
  },
  monnify: {
    provider: "monnify",
    banks: [
      { code: "011", name: "First Bank" },
      { code: "007", name: "Zenith Bank" },
      { code: "008", name: "Eco Bank" },
      { code: "058", name: "Guaranty Trust Bank" },
      { code: "009", name: "Standard Chartered Bank" },
      { code: "033", name: "Access Bank" },
      { code: "050", name: "Fidelity Bank" },
      { code: "070", name: "Fidelity Bank" },
    ],
  },
};

interface AddLinkedAccountModalProps {
  userId: string;
  onSuccess?: () => void;
}

const AddLinkedAccountModal = ({
  userId,
  onSuccess,
}: AddLinkedAccountModalProps) => {
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<keyof BankList | null>(null);

  const handleSuccess = () => {
    setOpen(false);
    setSelectedProvider(null);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus size={16} />
          Add International Account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link International Bank Account</DialogTitle>
          <DialogDescription>
            Connect your bank account for international transfers
          </DialogDescription>
        </DialogHeader>

        {!selectedProvider ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {(
              Object.keys(BANK_LISTS) as Array<keyof typeof BANK_LISTS>
            ).map((provider) => (
              <Button
                key={provider}
                variant="outline"
                onClick={() =>
                  setSelectedProvider(provider)
                }
                className="h-auto flex flex-col items-center gap-2 p-4"
              >
                <div className="text-lg font-semibold capitalize">
                  {provider}
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <>
            <Button
              variant="ghost"
              className="justify-start mb-4"
              onClick={() => setSelectedProvider(null)}
            >
              ← Back
            </Button>
            <LinkedAccountForm
              provider={BANK_LISTS[selectedProvider].provider}
              userId={userId}
              banks={BANK_LISTS[selectedProvider].banks}
              onSuccess={handleSuccess}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddLinkedAccountModal;
