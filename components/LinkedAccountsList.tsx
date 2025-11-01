"use client";

import { useEffect, useState } from "react";
import { Trash2, Edit2 } from "lucide-react";
import { Button } from "./ui/button";
import AddLinkedAccountModal from "./AddLinkedAccountModal";
import EditLinkedAccountModal from './EditLinkedAccountModal';

interface LinkedAccount {
  id: string;
  provider: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  created_at: string;
}

interface LinkedAccountsListProps {
  userId: string;
}

const LinkedAccountsList = ({ userId }: LinkedAccountsListProps) => {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<LinkedAccount | null>(null);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`/api/linked-accounts?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to fetch linked accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [userId]);

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to unlink this account?")) {
      return;
    }

    try {
      const response = await fetch(`/api/linked-account/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId }),
      });

      if (response.ok) {
        setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  if (isLoading) {
    return <div className="text-14 text-gray-600">Loading accounts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-16 font-semibold text-gray-900">
          International Accounts
        </h3>
        <AddLinkedAccountModal userId={userId} onSuccess={fetchAccounts} />
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <p className="text-14 text-gray-600 mb-4">
            No international accounts linked yet
          </p>
          <AddLinkedAccountModal userId={userId} onSuccess={fetchAccounts} />
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-12 font-bold text-blue-600">
                      {account.provider.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-14 font-medium text-gray-900">
                      {account.account_name}
                    </p>
                    <p className="text-12 text-gray-600">
                      {account.bank_name} • ••••{account.account_number.slice(-4)}
                    </p>
                    <p className="text-11 text-gray-500 capitalize">
                      {account.provider}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingAccount(account)} className="hover:bg-gray-50">
                  <Edit2 size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(account.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingAccount && (
        <EditLinkedAccountModal
          account={editingAccount}
          onSuccess={() => {
            setEditingAccount(null);
            fetchAccounts();
          }}
          onCancel={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
};

export default LinkedAccountsList;
