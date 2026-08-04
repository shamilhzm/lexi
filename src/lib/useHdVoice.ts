// Setting up the HD voice: download, prove it actually speaks, then switch it on.
// Shared because it is now offered in two places — Settings, and in context at the
// first pronunciation tap (UX-PATHS F4) — and the failure handling is the
// interesting part. Two copies would drift, and the copy that drifts is the one
// that stops distinguishing "you're offline" from "this device can't run it".
import { useState } from 'react';
import { ensureHdVoice, speakHd } from './tts.ts';
import { setHdVoice } from '../store.ts';

export interface HdVoiceSetup {
  /** Download progress 0–100 while running, else null. */
  percent: number | null;
  error: string;
  enable: () => Promise<void>;
}

export function useHdVoice(): HdVoiceSetup {
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState('');

  const enable = async () => {
    setError(''); setPercent(0);
    // Being offline is temporary and the learner can act on it; the device not
    // being able to run the voice is not. Saying "something went wrong" for both
    // sends someone to look for a problem that isn't theirs.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setPercent(null);
      setError('You’re offline — the HD voice has to download once before it can work without a connection.');
      return;
    }
    try {
      await ensureHdVoice((f) => setPercent(Math.round(f * 100)));
      // Only switch it on once synthesis has actually produced sound here: a
      // toggle that claims a voice this device cannot run is worse than no toggle.
      await speakHd('Hallo! Das ist die neue deutsche Stimme.');
      setHdVoice(true);
      setPercent(null);
    } catch (e) {
      setPercent(null);
      setError(e instanceof Error ? e.message : 'The voice could not be set up on this device.');
    }
  };

  return { percent, error, enable };
}
