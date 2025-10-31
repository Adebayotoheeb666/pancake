export const filterTransactions = (
  transactions: any[],
  filters: {
    search?: string;
    startDate?: string;
    endDate?: string;
    type?: "debit" | "credit";
  }
): any[] => {
  if (!transactions) return [];

  let filtered = [...transactions];

  // Search filter (by transaction name)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter((t) =>
      t.name?.toLowerCase().includes(searchLower)
    );
  }

  // Date range filter
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter((t) => new Date(t.date) >= startDate);
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((t) => new Date(t.date) <= endDate);
  }

  // Transaction type filter
  if (filters.type) {
    filtered = filtered.filter((t) => {
      if (filters.type === "debit") {
        return t.type === "debit" || (typeof t.amount === "number" && t.amount < 0);
      } else if (filters.type === "credit") {
        return t.type === "credit" || (typeof t.amount === "number" && t.amount >= 0);
      }
      return true;
    });
  }

  return filtered;
};

export const sortTransactionsByDate = (
  transactions: any[],
  order: "asc" | "desc" = "desc"
): any[] => {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return order === "desc" ? dateB - dateA : dateA - dateB;
  });
};

export const getTransactionStats = (transactions: any[]) => {
  const totalTransactions = transactions.length;
  const totalIncome = transactions
    .filter((t) => t.type === "credit" || (typeof t.amount === "number" && t.amount >= 0))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "debit" || (typeof t.amount === "number" && t.amount < 0))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  return {
    totalTransactions,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
};
