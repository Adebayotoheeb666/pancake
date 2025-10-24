'use client';

import React, { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const FlutterwaveLink: React.FC<FlutterwaveLinkProps> = ({
  user,
  variant = 'primary',
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [showForm, setShowForm] = useState(false);

  const handleVerifyAccount = async () => {
    if (!accountNumber || !bankCode) {
      alert('Please enter account number and select a bank');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/bank/flutterwave/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          bankCode,
          userId: user.$id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || 'Account verification failed');
        return;
      }

      setAccountName(data.accountName);
      alert('Account verified successfully!');
      router.push('/');
    } catch (error) {
      console.error('Verification error:', error);
      alert('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const response = await fetch('/api/bank/flutterwave/banks');
      const data = await response.json();
      setBanks(data.banks || []);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  React.useEffect(() => {
    if (showForm && banks.length === 0) {
      loadBanks();
    }
  }, [showForm]);

  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => setShowForm(true)}
          className="flutterwavelink-primary"
        >
          Connect with Flutterwave
        </Button>
      ) : variant === 'ghost' ? (
        <Button onClick={() => setShowForm(true)} variant="ghost" className="flutterwavelink-ghost">
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className="text-[16px] font-semibold text-black-2">
            Connect with Flutterwave
          </p>
        </Button>
      ) : (
        <Button onClick={() => setShowForm(true)} className="flutterwavelink-default">
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className="text-[16px] font-semibold text-black-2">
            Connect with Flutterwave
          </p>
        </Button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-20 font-semibold text-gray-900 mb-4">
              Link Your Bank Account
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-14 font-medium text-gray-700">
                  Select Bank
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose your bank</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-14 font-medium text-gray-700">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter your account number"
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {accountName && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-14 text-gray-700">
                    <span className="font-medium">Account Name:</span> {accountName}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyAccount}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Connect'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlutterwaveLink;
