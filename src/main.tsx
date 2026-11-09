import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { runFullDiagnostics } from './utils/hardwareDiagnostic.ts';

// Attach hardware diagnostics to window for on-demand inspection without blocking Початковий page paint
if (typeof window !== 'undefined') {
  (window as any).runCinemaNovaDiagnostics = runFullDiagnostics;
}

// Обробка browser-specific play/pause interruptions on HTMLMediaElements, Vite preload errors, and silence benign Vite WebSocket messages
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite dynamic import chunk failed to load, reloading to retrieve latest build...', event);
    const lastReload = sessionStorage.getItem('vite_preload_reloaded_ts');
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 5000) {
      sessionStorage.setItem('vite_preload_reloaded_ts', String(now));
      window.location.reload();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('vite') ||
      reasonStr.includes('closed without opened') ||
      reasonStr.includes('NotAllowedError') ||
      reasonStr.includes('user didn\'t interact') ||
      reasonStr.includes('play()')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  if (window.HTMLMediaElement) {
    const originalPlay = window.HTMLMediaElement.prototype.play;
    window.HTMLMediaElement.prototype.play = function (...args) {
      const promise = originalPlay.apply(this, args);
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err: any) => {
          // Safe to ignore interruptions from quick play/pause, autoplay policies, or component unmounts
          if (
            err &&
            (err.name === 'AbortError' ||
              err.name === 'NotAllowedError' ||
              err.message?.includes('interrupted') ||
              err.message?.includes('interruption') ||
              err.message?.includes('interact') ||
              err.message?.includes('pause') ||
              err.message?.includes('removed'))
          ) {
            // Ignore safely without throwing unhandled rejection
            return;
          }
          console.warn('Playback interrupted or failed:', err);
        });
      }
      return promise;
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
