// Install nudge — the friend-readiness step. Progress is local-first, and
// Safari evicts script-writable storage (incl. IndexedDB) for sites unused for
// ~7 days; installing to the home screen makes storage durable and enables
// offline. Shown once on Today (dismissible), only when not already installed
// and there's a real action to offer: the captured Chromium install prompt, or
// Add-to-Home-Screen instructions on iOS. A backup link is the escape hatch.
import { useState } from 'react';
import { X, ArrowDownToLine, Share } from 'lucide-react';

const DISMISS_KEY = 'lexi.installnudge.v1';

// beforeinstallprompt fires early (often before React mounts) — capture it at
// module scope so the button can re-fire it later.
let deferredPrompt: { prompt: () => Promise<unknown> } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as unknown as { prompt: () => Promise<unknown> };
  });
}

const isStandalone = () =>
  (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches)
  || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent);

export default function InstallNudge({ onBackup }: { onBackup: () => void }) {
  const [gone, setGone] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  if (gone || isStandalone()) return null;
  const ios = isIOS();
  if (!ios && !deferredPrompt) return null; // no honest action to offer

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* */ }
    setGone(true);
  };

  return (
    <div className="bg-panel border border-line rounded-[16px] px-4 py-3.5 mb-4 flex items-start gap-3">
      <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber flex-shrink-0 mt-0.5"><ArrowDownToLine size={18} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold">Install Lexi to protect your progress</p>
        <p className="text-[13px] text-dim mt-0.5">
          Your words live on this device only. Installing keeps the browser from ever
          clearing them, and works offline.
        </p>
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          {ios ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-txt">
              <Share size={14} className="text-amber" /> Share&nbsp;→&nbsp;<b>Add to Home Screen</b>
            </span>
          ) : (
            <button onClick={() => deferredPrompt?.prompt()}
              className="bg-amber text-bg font-bold rounded-[10px] px-4 py-2 text-[13px] hover:brightness-105">
              Install
            </button>
          )}
          <button onClick={onBackup} className="text-[13px] text-dim underline underline-offset-2 hover:text-amber">
            or export a backup
          </button>
        </div>
      </div>
      <button onClick={dismiss} title="Dismiss"
        className="grid place-items-center w-8 h-8 -m-1 text-dim hover:text-amber flex-shrink-0"><X size={15} /></button>
    </div>
  );
}
