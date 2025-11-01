"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Props {
  account: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EditLinkedAccountModal = ({ account, onSuccess, onCancel }: Props) => {
  const [open, setOpen] = useState(true);
  const [accountName, setAccountName] = useState(account.account_name || '');
  const [bankName, setBankName] = useState(account.bank_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/linked-account/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, accountName, bankName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) onCancel?.(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Linked Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">{isLoading ? 'Saving...' : 'Save'}</Button>
            <Button variant="ghost" onClick={() => { setOpen(false); onCancel?.(); }}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLinkedAccountModal;
