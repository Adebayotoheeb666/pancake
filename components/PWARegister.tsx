"use client";
import { useEffect } from 'react';

const PWARegister = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Add manifest link
    const existing = document.querySelector('link[rel="manifest"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('Service worker registered');
      }).catch((err) => console.error('Service worker registration failed', err));
    }
  }, []);

  return null;
};

export default PWARegister;
