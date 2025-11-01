"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type Toast = { id: string; title?: string; message: string; type?: 'info' | 'success' | 'error' };

const ToastContext = createContext<{ showToast: (t: Omit<Toast, 'id'>) => void } | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`p-3 rounded shadow-md max-w-xs w-full flex items-start justify-between ${t.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : t.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-white border border-gray-200 text-gray-800'}`}>
            <div className="flex-1">
              {t.title && <div className="font-semibold mb-1">{t.title}</div>}
              <div className="text-sm">{t.message}</div>
            </div>
            <button aria-label="Close notification" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-3 text-gray-500 hover:text-gray-700">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
