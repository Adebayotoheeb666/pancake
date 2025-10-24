'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    description: 'Fast, secure transfers and account linking',
    supported: true,
  },
  {
    id: 'paystack',
    name: 'Paystack',
    description: 'Payment processing and account verification',
    supported: true,
  },
  {
    id: 'opay',
    name: 'Opay',
    description: 'Mobile money and bank transfers',
    supported: true,
  },
  {
    id: 'monnify',
    name: 'Monnify',
    description: 'Bank account verification and transfers',
    supported: true,
  },
];

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  country,
  onProviderSelect,
  selectedProvider,
}) => {
  const [selected, setSelected] = useState<BankProvider | undefined>(selectedProvider);

  const COUNTRY_PROVIDERS: Record<Country, BankProvider[]> = {
    US: ['plaid'],
    NG: ['flutterwave', 'paystack', 'opay', 'monnify'],
    GH: ['flutterwave', 'paystack'],
    KE: ['flutterwave', 'paystack'],
  };

  const availableProviders = COUNTRY_PROVIDERS[country] || [];
  const filteredProviders = PROVIDER_OPTIONS.filter(
    (p) => availableProviders.includes(p.id) || p.id === 'plaid'
  );

  const handleSelect = (provider: BankProvider) => {
    setSelected(provider);
    onProviderSelect(provider);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2">
        <label className="text-14 font-medium text-gray-700">
          Choose Your Payment Provider
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleSelect(provider.id)}
            disabled={!provider.supported}
            className={`flex flex-col gap-2 p-4 rounded-lg border-2 transition-all ${
              selected === provider.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            } ${!provider.supported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-16 font-semibold text-gray-900">
                {provider.name}
              </h3>
              {selected === provider.id && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-14 text-gray-600">{provider.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProviderSelector;
