"use client";

import { useEffect, useState } from "react";

interface BankOption {
  code: string;
  name: string;
}

interface ProviderBankSelectProps {
  provider: "flutterwave" | "paystack" | "opay" | "monnify";
  value: string;
  onChange: (value: string, bankName?: string) => void;
  disabled?: boolean;
}

// Bank lists for each provider
const PROVIDER_BANKS: {
  [key: string]: BankOption[];
} = {
  flutterwave: [
    { code: "011", name: "First Bank" },
    { code: "007", name: "Zenith Bank" },
    { code: "008", name: "Eco Bank" },
    { code: "058", name: "Guaranty Trust Bank" },
    { code: "009", name: "Standard Chartered Bank" },
    { code: "033", name: "Access Bank" },
    { code: "050", name: "Fidelity Bank" },
    { code: "070", name: "Fidelity Bank New" },
    { code: "414", name: "UBA" },
    { code: "035", name: "Wema Bank" },
    { code: "106", name: "Sterling Bank" },
    { code: "101", name: "Providus Bank" },
    { code: "215", name: "FCMB" },
    { code: "012", name: "WEMA Bank" },
    { code: "221", name: "Stanbic IBTC" },
  ],
  paystack: [
    { code: "011", name: "First Bank" },
    { code: "007", name: "Zenith Bank" },
    { code: "008", name: "Eco Bank" },
    { code: "058", name: "Guaranty Trust Bank" },
    { code: "009", name: "Standard Chartered Bank" },
    { code: "033", name: "Access Bank" },
    { code: "050", name: "Fidelity Bank" },
    { code: "070", name: "Fidelity Bank New" },
    { code: "414", name: "UBA" },
    { code: "035", name: "Wema Bank" },
    { code: "106", name: "Sterling Bank" },
    { code: "101", name: "Providus Bank" },
    { code: "215", name: "FCMB" },
    { code: "012", name: "WEMA Bank" },
    { code: "221", name: "Stanbic IBTC" },
  ],
  opay: [
    { code: "011", name: "First Bank" },
    { code: "007", name: "Zenith Bank" },
    { code: "008", name: "Eco Bank" },
    { code: "058", name: "Guaranty Trust Bank" },
    { code: "009", name: "Standard Chartered Bank" },
    { code: "033", name: "Access Bank" },
    { code: "050", name: "Fidelity Bank" },
    { code: "070", name: "Fidelity Bank New" },
    { code: "414", name: "UBA" },
    { code: "035", name: "Wema Bank" },
    { code: "106", name: "Sterling Bank" },
    { code: "101", name: "Providus Bank" },
    { code: "215", name: "FCMB" },
    { code: "012", name: "WEMA Bank" },
    { code: "221", name: "Stanbic IBTC" },
  ],
  monnify: [
    { code: "011", name: "First Bank" },
    { code: "007", name: "Zenith Bank" },
    { code: "008", name: "Eco Bank" },
    { code: "058", name: "Guaranty Trust Bank" },
    { code: "009", name: "Standard Chartered Bank" },
    { code: "033", name: "Access Bank" },
    { code: "050", name: "Fidelity Bank" },
    { code: "070", name: "Fidelity Bank New" },
    { code: "414", name: "UBA" },
    { code: "035", name: "Wema Bank" },
    { code: "106", name: "Sterling Bank" },
    { code: "101", name: "Providus Bank" },
    { code: "215", name: "FCMB" },
    { code: "012", name: "WEMA Bank" },
    { code: "221", name: "Stanbic IBTC" },
  ],
};

const ProviderBankSelect = ({
  provider,
  value,
  onChange,
  disabled = false,
}: ProviderBankSelectProps) => {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const providerBanks = PROVIDER_BANKS[provider] || [];
    setBanks(providerBanks);
  }, [provider]);

  const filteredBanks = banks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.code.includes(searchTerm)
  );

  const selectedBankName =
    banks.find((b) => b.code === value)?.name || "Select a bank";

  return (
    <div className="relative w-full">
      <style>{`
        .bank-select-combobox {
          position: relative;
        }
        .bank-select-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        .bank-select-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .bank-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 0.375rem 0.375rem;
          max-height: 300px;
          overflow-y: auto;
          z-index: 50;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .bank-select-option {
          padding: 0.5rem;
          cursor: pointer;
          hover:background: #f3f4f6;
          border-bottom: 1px solid #f3f4f6;
        }
        .bank-select-option:hover {
          background-color: #f3f4f6;
        }
        .bank-select-option.selected {
          background-color: #dbeafe;
        }
      `}</style>

      <div className="bank-select-combobox">
        <input
          type="text"
          className="bank-select-input input-class"
          placeholder="Search bank by name or code..."
          value={isSearching ? searchTerm : selectedBankName}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsSearching(true);
          }}
          onFocus={() => setIsSearching(true)}
          disabled={disabled}
        />

        {isSearching && filteredBanks.length > 0 && (
          <div className="bank-select-dropdown">
            {filteredBanks.map((bank) => (
              <div
                key={bank.code}
                className={`bank-select-option ${
                  value === bank.code ? "selected" : ""
                }`}
                onClick={() => {
                  onChange(bank.code, bank.name);
                  setSearchTerm("");
                  setIsSearching(false);
                }}
              >
                <div className="font-medium text-gray-900">{bank.name}</div>
                <div className="text-xs text-gray-500">Code: {bank.code}</div>
              </div>
            ))}
          </div>
        )}

        {isSearching && filteredBanks.length === 0 && searchTerm && (
          <div className="bank-select-dropdown p-3 text-center text-gray-500">
            No banks found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderBankSelect;
