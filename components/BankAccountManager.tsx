"use client";

import { useState } from "react";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";

interface BankAccountManagerProps {
  accounts: Account[];
  userId: string;
  onAccountRemoved?: () => void;
}

const BankAccountManager = ({
  accounts,
  userId,
  onAccountRemoved,
}: BankAccountManagerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleAccounts, setVisibleAccounts] = useState<Set<string>>(new Set());

  const toggleVisibility = (accountId: string) => {
    const newVisible = new Set(visibleAccounts);
    if (newVisible.has(accountId)) {
      newVisible.delete(accountId);
    } else {
      newVisible.add(accountId);
    }
    setVisibleAccounts(newVisible);
  };

  const handleDisconnect = async (bankId: string, accountName: string) => {
    if (
      !confirm(
        `Are you sure you want to disconnect "${accountName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId, userId }),
      });

      if (response.ok) {
        onAccountRemoved?.();
      } else {
        alert("Failed to disconnect account");
      }
    } catch (error) {
      console.error("Error disconnecting account:", error);
      alert("Error disconnecting account");
    } finally {
      setIsLoading(false);
    }
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No bank accounts connected yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div
          key={account.appwriteItemId}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div
            className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
            onClick={() =>
              setExpandedId(
                expandedId === account.appwriteItemId
                  ? null
                  : account.appwriteItemId
              )
            }
          >
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{account.name}</h3>
              <p className="text-sm text-gray-600">{account.officialName}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                ${(account.currentBalance / 100).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">Available Balance</p>
            </div>
          </div>

          {expandedId === account.appwriteItemId && (
            <div className="p-4 border-t border-gray-200 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Account Type</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {account.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Sub Type</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {account.subtype}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-2">Account Number</p>
                <div className="flex items-center gap-2">
                  {visibleAccounts.has(account.appwriteItemId) ? (
                    <code className="font-mono bg-gray-100 px-3 py-2 rounded text-sm flex-1">
                      {account.mask}
                    </code>
                  ) : (
                    <code className="font-mono bg-gray-100 px-3 py-2 rounded text-sm flex-1">
                      ••••••••••••{account.mask?.slice(-4)}
                    </code>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleVisibility(account.appwriteItemId)
                    }
                  >
                    {visibleAccounts.has(account.appwriteItemId) ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Available Balance</p>
                  <p className="font-medium text-green-600">
                    ${(account.availableBalance / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Current Balance</p>
                  <p className="font-medium text-gray-900">
                    ${(account.currentBalance / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  handleDisconnect(account.appwriteItemId, account.name)
                }
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Trash2 size={16} />
                Disconnect Account
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BankAccountManager;
