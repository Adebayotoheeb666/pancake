'use client';

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from './ui/button';

const COUNTRY_OPTIONS: CountryBankOption[] = [
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    providers: ['plaid', 'dwolla'],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    providers: ['flutterwave', 'paystack', 'opay', 'monnify'],
  },
  {
    code: 'GH',
    name: 'Ghana',
    currency: 'GHS',
    providers: ['flutterwave', 'paystack'],
  },
  {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    providers: ['flutterwave', 'paystack'],
  },
];

const CountryBankSelector: React.FC<CountryBankSelectorProps> = ({
  onCountrySelect,
  selectedCountry,
}) => {
  const [country, setCountry] = useState<Country | undefined>(selectedCountry);

  const handleSelect = (value: string) => {
    setCountry(value as Country);
    onCountrySelect(value as Country);
  };

  const selectedCountryData = COUNTRY_OPTIONS.find((c) => c.code === country);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2">
        <label className="text-14 font-medium text-gray-700">
          Select Your Country
        </label>
        <Select value={country || ''} onValueChange={handleSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose your country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_OPTIONS.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                <span className="flex items-center gap-2">
                  {option.name} ({option.currency})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCountryData && (
        <div className="flex flex-col gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-14 font-medium text-gray-700">
            Available payment providers:
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCountryData.providers.map((provider) => (
              <span
                key={provider}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-12 font-medium"
              >
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryBankSelector;
