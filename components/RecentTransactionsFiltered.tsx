"use client";

import { useState, useMemo } from "react";
import TransactionsTable from "./TransactionsTable";
import TransactionFilters from "./TransactionFilters";
import { filterTransactions } from "@/lib/utils/transaction-filter";

interface RecentTransactionsFilteredProps {
  transactions: Transaction[];
  userId?: string;
}

const RecentTransactionsFiltered = ({
  transactions,
  userId,
}: RecentTransactionsFilteredProps) => {
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    type: undefined as "debit" | "credit" | undefined,
  });

  const handleExport = () => {
    if (!userId) {
      // fallback: try to call export without userId (will error server-side)
      window.location.href = `/api/transactions/export`;
      return;
    }

    // Navigate to CSV export endpoint; browser will handle the download via Content-Disposition
    const url = `/api/transactions/export?userId=${encodeURIComponent(userId)}`;
    // open in same tab to trigger download
    window.location.href = url;
  };

  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, filters);
  }, [transactions, filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      search: newFilters.search || "",
      startDate: newFilters.startDate || "",
      endDate: newFilters.endDate || "",
      type: newFilters.type,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <TransactionFilters onFilterChange={handleFilterChange} />
        <div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {filteredTransactions.length > 0 ? (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </p>
          <TransactionsTable transactions={filteredTransactions} />
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No transactions match your filters</p>
        </div>
      )}
    </div>
  );
};

export default RecentTransactionsFiltered;
