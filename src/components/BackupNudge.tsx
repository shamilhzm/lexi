// Backup nudge (UX-PATHS S3). Export has always existed and has always been
// passive: nothing ever suggested it, so the learners who most need it are the
// ones who have never opened Settings. A cleared cache with no backup is not a
// setback, it is everything.
//
// Deliberately late and quiet. Asking on day one is asking someone to insure a
// thing they do not own yet — the nudge waits until there is something behind it,
// then asks once. Taking a backup, or dismissing it, both end it forever.
//
// *"Late" was a week and a hundred words until 2026-09-25* (panel review). Safari
// may clear a site's storage after seven days without a visit, so a learner who
// studied for five days and then went on holiday could lose everything before the
// app ever mentioned a backup — the nudge's own threshold outlived the thing it
// insures against. Three days and twenty words is still after the learner owns
// something, and before the first window in which they could lose it.
//
// The button saves the file itself (lib/backup.ts) rather than sending the learner
// to Settings to find it: one tap is the difference between a backup and an
// intention. `onBackup` stays in the signature for callers that pass it.
import { useState } from 'react';
import { X, Archive } from 'lucide-react';
import { visitCount, lastBackup, totals } from '../store.ts';
import { downloadBackup } from '../lib/backup.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import IconButton from './ui/IconButton.tsx';

const DISMISS_KEY = 'lexi.backupnudge.v1';
const AFTER_VISITS = 3;   // distinct days, not a streak — a streak resets
const AFTER_KNOWN = 20;   // enough words that losing them would already hurt

export default function BackupNudge(_props: { onBackup?: () => void }) {
  const [gone, setGone] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const known = totals().known;
  if (gone || lastBackup()) return null;
  if (visitCount() < AFTER_VISITS || known < AFTER_KNOWN) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* quota */ }
    setGone(true);
  };

  return (
    <Card pad="none" className="px-4 py-3.5 mb-4 flex items-start gap-3">
      <span className="grid place-items-center w-[36px] h-[36px] rounded-md bg-panel2 text-accent flex-shrink-0 mt-0.5">
        <Archive size={18} aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">You know {known} words. Keep a copy.</p>
        <p className="text-dim text-xs mt-1 leading-relaxed max-w-[52ch]">
          Everything you’ve learned lives on this device and nowhere else — which is
          how Lexi stays account-free, and also means clearing your browser data
          would take it with it. A backup is one file.
        </p>
        <div className="mt-2.5 flex gap-2 flex-wrap">
          <Button onClick={() => { void downloadBackup(); dismiss(); }}>Save a backup</Button>
          <Button variant="quiet" onClick={dismiss}>Not now</Button>
        </div>
      </div>
      <IconButton label="Dismiss" onClick={dismiss}><X size={14} /></IconButton>
    </Card>
  );
}
