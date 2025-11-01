"use client";

import { useEffect, useState } from "react";
import { useToast } from './ToastProvider';

interface TransferStatusPollerProps {
  transferId: string;
  provider: string;
  intervalMs?: number;
}

const TransferStatusPoller = ({ transferId, provider, intervalMs = 5000 }: TransferStatusPollerProps) => {
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timer: any;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/transfer/status?transferId=${transferId}&provider=${provider}`);
        const data = await res.json();
        if (!mounted) return;
        if (data?.status) {
          setStatus(data.status);
          setMessage(data.message || null);
        }
      } catch (err) {
        console.error('Failed to fetch transfer status', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStatus();
    timer = setInterval(fetchStatus, intervalMs);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [transferId, provider, intervalMs]);

  if (loading) return <div className="text-sm text-gray-600">Checking transfer status...</div>;

  return (
    <div>
      <p className="text-sm">Status: <strong className="capitalize">{status || 'unknown'}</strong></p>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default TransferStatusPoller;
