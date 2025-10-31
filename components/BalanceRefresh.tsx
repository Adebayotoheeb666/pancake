"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { RotateCw } from "lucide-react";

interface BalanceRefreshProps {
  accountId: string;
  onRefresh?: (data: any) => void;
  lastUpdated?: Date;
}

const BalanceRefresh = ({
  accountId,
  onRefresh,
  lastUpdated,
}: BalanceRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/bank/refresh-balance?accountId=${accountId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh balance");
      }

      setMessage("Balance updated successfully");
      onRefresh?.(data.account);

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to refresh balance";
      setError(errorMsg);
      console.error("Balance refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : "Never";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="gap-2"
      >
        <RotateCw
          size={16}
          className={isRefreshing ? "animate-spin" : ""}
        />
        {isRefreshing ? "Updating..." : "Refresh Balance"}
      </Button>

      {message && (
        <span className="text-xs text-green-600 font-medium">{message}</span>
      )}

      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}

      <span className="text-xs text-gray-500">Last updated: {formattedTime}</span>
    </div>
  );
};

export default BalanceRefresh;
