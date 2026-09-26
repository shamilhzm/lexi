// Install nudge — the friend-readiness step. Progress is local-first, and
// Safari evicts script-writable storage (incl. IndexedDB) for sites unused for
// ~7 days; a Home Screen app is exempt from that rule and works offline. Shown once on Today (dismissible), only when not already installed
// and there’s a real action to offer: the captured Chromium install prompt, or
// Add-to-Home-Screen instructions on iOS. A backup link is the escape hatch.
import { useState } from 'react';
import { X, ArrowDownToLine, Share } from 'lucide-react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import IconButton from './ui/IconButton.tsx';

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
// iPadOS 13+ reports itself as a Mac; a Mac with a touch screen is an iPad.
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent)
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/** In-app browsers keep their own storage, apart from Safari's or Chrome's, and
 *  can discard it whenever the host app likes — so a learner who arrives from a
 *  link in Instagram and studies there is building on sand. The honest advice is
 *  not "install" (these views cannot) but "open this in your browser". */
const inAppBrowser = () =>
  /\b(FBAN|FBAV|Instagram|Line\/|LinkedInApp|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|Twitter)\b/i
    .test(navigator.userAgent);

export default function InstallNudge({ onBackup }: { onBackup: () => void }) {
  const [gone, setGone] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  if (gone || isStandalone()) return null;
  const ios = isIOS();
  const inApp = inAppBrowser();
  if (!inApp && !ios && !deferredPrompt) return null; // no honest action to offer

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* */ }
    setGone(true);
  };

  return (
    <Card pad="none" className="px-4 py-3.5 mb-4 flex items-start gap-3">
      <span className="grid place-items-center w-[36px] h-[36px] rounded-md bg-panel2 text-accent flex-shrink-0 mt-0.5"><ArrowDownToLine size={18} /></span>
      <div className="flex-1 min-w-0">
        {/* The old line promised installing "keeps the browser from ever clearing
            them". It does not: an installed app is spared Safari's seven-day rule,
            but storage can still be reclaimed when the phone runs out of space, and
            deleting the app deletes its data. Say what installing does, and keep the
            backup beside it as the thing that actually survives. */}
        <p className="text-base font-semibold">
          {inApp ? 'Open Lexi in your browser to keep your words' : 'Install Lexi to protect your progress'}
        </p>
        <p className="text-xs text-dim mt-0.5">
          {inApp
            ? 'This in-app browser keeps its own storage and can forget it. Use “Open in browser” from its menu, then add Lexi to your Home Screen.'
            : 'Your words live on this device only. Installed, Lexi is spared the browser’s habit of clearing sites you have not opened for a week, and works offline. A backup is the copy that survives anything.'}
        </p>
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          {inApp ? null : ios ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-txt">
              <Share size={14} className="text-accent" /> Share&nbsp;→&nbsp;<b>Add to Home Screen</b>
            </span>
          ) : (
            <Button size="sm" onClick={() => deferredPrompt?.prompt()}>Install</Button>
          )}
          <button onClick={onBackup} className="text-xs text-dim underline underline-offset-2 hover:text-accent">
            or export a backup
          </button>
        </div>
      </div>
      <IconButton label="Dismiss" pull onClick={dismiss}><X size={15} /></IconButton>
    </Card>
  );
}
