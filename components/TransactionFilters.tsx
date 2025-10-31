"use client";

import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { X, Filter } from "lucide-react";

interface TransactionFiltersProps {
  onFilterChange: (filters: {
    search?: string;
    startDate?: string;
    endDate?: string;
    type?: "all" | "debit" | "credit";
  }) => void;
}

const TransactionFilters = ({ onFilterChange }: TransactionFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"all" | "debit" | "credit">("all");
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const handleApplyFilters = () => {
    const filters = {
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      type: type === "all" ? undefined : type,
    };

    let count = 0;
    if (search) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (type !== "all") count++;

    setActiveFiltersCount(count);
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setType("all");
    setActiveFiltersCount(0);
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Filter size={16} />
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
      </div>

      {isOpen && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <div className="flex gap-3">
              {["all", "debit", "credit"].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={option}
                    checked={type === option}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 capitalize">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApplyFilters}
              className="flex-1"
            >
              Apply Filters
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearFilters}
                className="gap-2"
              >
                <X size={16} />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;
