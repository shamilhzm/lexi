// Settings → "Use Lexi offline". The one place a learner can say *put all of it
// on this phone*, instead of finding out on a train which parts they had never
// opened. See lib/offline.ts for what is fetched and why nothing is cached here.
import { useRef, useState } from 'react';
import { PlaneTakeoff, Check, Loader2, Download, X } from 'lucide-react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { downloadOffline, offlineRecord, type OfflineProgress, type OfflineResult } from '../lib/offline.ts';
import { BUILD, buildLabel } from '../lib/build.ts';

export default function OfflinePack() {
  const [record, setRecord] = useState(offlineRecord);
  const [progress, setProgress] = useState<OfflineProgress | null>(null);
  const [result, setResult] = useState<OfflineResult | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = async (dictionary: boolean) => {
    setResult(null);
    setProgress({ done: 0, total: 1 });
    abort.current = new AbortController();
    const r = await downloadOffline({ dictionary }, BUILD.sha, setProgress, abort.current.signal);
    setProgress(null);
    setResult(r);
    setRecord(offlineRecord());
  };

  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const hasWords = !!record;
  const hasDictionary = !!record?.dictionary;
  // A new build names new screen files; the data mostly carries over, but the
  // honest label for "downloaded under a different build" is "refresh it".
  const stale = !!record && record.sha !== BUILD.sha;

  return (
    <Card as="section" className="mt-4">
      <div className="flex items-center gap-2 mb-1">
        <PlaneTakeoff size={16} className="text-accent" />
        <h2 className="text-base font-semibold">Use Lexi offline</h2>
      </div>
      <p className="text-dim text-xs mb-3 max-w-[60ch]">
        Lexi keeps what you have opened. This puts the rest on this device too — every
        word’s examples at every level, and the screens you have not visited yet — so
        nothing is missing without a connection. The dictionary is separate: a larger
        download, and about 20 MB on the device once unpacked.
      </p>

      {progress ? (
        <div>
          <div className="flex items-center gap-2 text-xs text-dim mb-2" role="status" aria-live="polite">
            <Loader2 size={15} className="animate-spin" />
            Downloading… {progress.done} of {progress.total}
            <button onClick={() => abort.current?.abort()} className="ml-auto text-dim hover:text-red-txt">Stop</button>
          </div>
          <div className="h-1 rounded-full bg-panel2 overflow-hidden" aria-hidden>
            <div className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.round((100 * progress.done) / Math.max(1, progress.total))}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant={hasWords && !stale ? 'secondary' : 'primary'} onClick={() => { void run(false); }} disabled={!online}>
            <Download size={15} /> {hasWords ? 'Refresh the words' : 'Download the words'}
            <span className="font-normal opacity-70">· about 1.5 MB</span>
          </Button>
          <Button variant="secondary" onClick={() => { void run(true); }} disabled={!online}>
            <Download size={14} className="text-accent" /> {hasDictionary ? 'Refresh the dictionary too' : 'Add the dictionary'}
            <span className="font-normal opacity-70">· about 4.5 MB</span>
          </Button>
        </div>
      )}

      {!online && !progress && <p className="text-dim text-xs mt-2">You’re offline — connect to download.</p>}

      {result && result.failed > 0 && (
        <p className="text-red-txt text-xs mt-2 flex items-center gap-1.5">
          <X size={14} /> {result.failed} of {result.fetched + result.failed} files did not arrive. What did is kept — try again on a better connection.
        </p>
      )}
      {result && result.failed === 0 && result.kept !== result.wanted && (
        <p className="text-dim text-xs mt-2 max-w-[60ch]">
          Downloaded, but this browser did not keep the files — it has no offline storage for
          Lexi here (a private window does this). Open Lexi from your Home Screen and try again.
        </p>
      )}
      {record && !progress && (
        <p className="text-xs mt-2 flex items-center gap-1.5 text-green">
          <Check size={14} />
          <span>
            {record.dictionary ? 'Words and dictionary' : 'Words'} on this device since {buildLabel(record.at)}
            {stale && <span className="text-dim"> — from an earlier version; refresh to match this one</span>}
          </span>
        </p>
      )}
      {result && result.failed === 0 && result.kept === result.wanted && result.persisted === false && (
        <p className="text-dim text-2xs mt-1.5 max-w-[60ch]">
          This browser may still clear sites it thinks you have stopped using. Adding Lexi to
          your Home Screen is what prevents that.
        </p>
      )}
    </Card>
  );
}
