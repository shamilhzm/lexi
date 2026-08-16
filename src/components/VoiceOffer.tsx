// Offered once, in context, the first time a learner asks to hear a word and gets
// the platform's built-in voice (UX-PATHS F4). The old placement — a toggle in
// Settings — meant the people most in need of a better voice were the least likely
// to find it: you go to Settings to change something you already know exists.
//
// Shown at the moment of the tap, dismissible, and never raised again either way.
import { useState } from 'react';
import { Volume2, Loader2, X } from 'lucide-react';
import { markHdOffered } from '../store.ts';
import { useHdVoice } from '../lib/useHdVoice.ts';
import Button from './ui/Button.tsx';
import IconButton from './ui/IconButton.tsx';

export default function VoiceOffer({ onClose }: { onClose: () => void }) {
  const { percent, phase, error, enable } = useHdVoice();
  const [done, setDone] = useState(false);

  const dismiss = () => { markHdOffered(); onClose(); };
  const accept = async () => {
    await enable();
    // enable() only turns the voice on if it actually spoke, so treating this as
    // "offered and settled" either way is safe: a failure leaves the message up.
    markHdOffered();
    setDone(true);
  };

  return (
    <div className="mx-auto max-w-[46ch] rounded-lg border border-line bg-panel px-4 py-3 text-left">
      <div className="flex items-start gap-2">
        <Volume2 size={16} className="text-amber mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          {done && !error ? (
            <p className="text-xs text-green">That’s the HD voice — every word from here on uses it.</p>
          ) : (
            <>
              <p className="text-sm font-semibold leading-snug">That was your device’s built-in voice.</p>
              <p className="text-dim text-xs mt-1 leading-relaxed">
                Lexi can use a native-German neural voice instead — it downloads once
                (~25 MB, so use wi-fi) and then works offline. Much closer to how the
                word actually sounds.
              </p>
            </>
          )}
          {error && <p className="text-red-txt text-xs mt-2">{error}</p>}
          {!done && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {phase !== null ? (
                <span className="flex items-center gap-1.5 text-xs text-dim">
                  <Loader2 size={14} className="animate-spin" />{' '}
                  {phase === 'downloading' ? `Downloading… ${percent ?? 0}%`
                    : phase === 'preparing' ? 'Unpacking the voice…'
                    : 'Testing the voice…'}
                </span>
              ) : (
                <>
                  <Button onClick={accept}>Use the better voice</Button>
                  <Button variant="quiet" onClick={dismiss}>Not now</Button>
                </>
              )}
            </div>
          )}
        </div>
        <IconButton label="Dismiss" onClick={dismiss}><X size={14} /></IconButton>
      </div>
    </div>
  );
}
