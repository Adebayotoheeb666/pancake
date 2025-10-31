"use client";

import { useState, useMemo } from "react";
import TransactionsTable from "./TransactionsTable";
import TransactionFilters from "./TransactionFilters";
import { filterTransactions } from "@/lib/utils/transaction-filter";

interface RecentTransactionsFilteredProps {
  transactions: Transaction[];
}

const RecentTransactionsFiltered = ({
  transactions,
}: RecentTransactionsFilteredProps) => {
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    type: undefined as "debit" | "credit" | undefined,
  });

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
      <TransactionFilters onFilterChange={handleFilterChange} />
      
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
