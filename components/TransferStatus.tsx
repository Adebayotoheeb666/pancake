"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Clock, Loader } from "lucide-react";

interface TransferStatusProps {
  transferId: string;
  provider: string;
}

const TransferStatus = ({ transferId, provider }: TransferStatusProps) => {
  const [status, setStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | "loading"
  >("loading");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/transfer/status?transferId=${transferId}&provider=${provider}`
        );
        const data = await response.json();
        setStatus(data.status || "pending");
        setStatusMessage(data.message || "");
      } catch (error) {
        console.error("Failed to fetch transfer status:", error);
        setStatus("failed");
        setStatusMessage("Failed to fetch status");
      }
    };

    if (transferId) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [transferId, provider]);

  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Pending",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    processing: {
      icon: Loader,
      label: "Processing",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    completed: {
      icon: Check,
      label: "Completed",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    loading: {
      icon: Loader,
      label: "Loading...",
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg}`}>
      <div className="flex items-center gap-3">
        <Icon className={`${config.color} ${status === "processing" ? "animate-spin" : ""}`} size={20} />
        <div>
          <p className={`text-14 font-medium ${config.color}`}>{config.label}</p>
          {statusMessage && (
            <p className="text-12 text-gray-600">{statusMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferStatus;
