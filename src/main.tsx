import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initData } from './data/index.ts';
import { applyTheme, watchSystemTheme } from './theme.ts';

applyTheme();
watchSystemTheme();

const root = createRoot(document.getElementById('root')!);

initData()
  .then(() => root.render(<StrictMode><App /></StrictMode>))
  .catch((err) => {
    console.error('Failed to load lexicon', err);
    root.render(
      <div style={{ display: 'grid', placeItems: 'center', height: '100dvh', padding: 24, textAlign: 'center', color: '#e6edf3', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#8b97a7' }}>Couldn’t load the lexicon. Check your connection and reload.</p>
      </div>,
    );
  });

// Register the service worker for offline use (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
