import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// --- One-time domain migration for existing installed/bookmarked users ---
// tofly-accountant.vercel.app now redirects (308) to accounts.toflymediaa.com at
// the Vercel edge, but users who already installed the PWA or have a stale
// service worker never reach the edge redirect - the service worker answers
// navigation requests from its own cache first. This runs once on the old
// domain, tears down the stale service worker + caches, then forces the move.
// Safe to remove this block a few weeks after the migration once old
// installs have died out.
const OLD_HOST = 'tofly-accountant.vercel.app';
const NEW_HOST = 'accounts.toflymediaa.com';

if (window.location.hostname === OLD_HOST) {
  (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (err) {
      console.error('Migration cleanup failed, redirecting anyway:', err);
    } finally {
      const target = `https://${NEW_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    }
  })();
} else {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}