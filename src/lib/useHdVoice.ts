// Setting up the HD voice: download, prove it actually speaks, then switch it on.
// Shared because it is now offered in two places — Settings, and in context at the
// first pronunciation tap (UX-PATHS F4) — and the failure handling is the
// interesting part. Two copies would drift, and the copy that drifts is the one
// that stops distinguishing "you're offline" from "this device can't run it".
//
// ## Reported stuck at "Downloading… 100%", on a real iPhone
//
// Three separate things were wrong, and only the first is cosmetic:
//
//  1. **The label lied after the bytes arrived.** `percent` covered the download
//     only, but the work after it — model init, then a full synthesis to prove the
//     voice runs — takes seconds more on a phone. Sitting at "Downloading… 100%"
//     tells the learner the network is stuck when it has already finished.
//  2. **There was no timeout anywhere.** If `download`, `predict` or `play` never
//     settled, the UI waited forever with no way out and nothing to report. Any of
//     the three can hang on a memory-tight device.
//  3. **The CDN build was broken, and that was the actual fault.** See the `CDN`
//     constant in tts.ts: esm.sh serves this package through a Node-polyfill shim
//     whose `fs.readFile` throws, `predict()` reaches it, and the throw never
//     rejects the promise we await — so synthesis hung rather than failed. The HD
//     voice had **never worked, on any device**.
//
// The order those were found in is the lesson. The first guess was the iOS audio
// gesture — plausible, documented, and wrong. `primeAudio()` stays as a precaution
// but earned no evidence. What actually found the bug was **the timeout added to
// make the failure legible**: it turned an eternal spinner into "downloaded but
// could not play", which pointed at synthesis rather than the network, which is
// what led to running `predict()` by hand and reading the console.
//
// A diagnostic that narrows the search is worth more than a fix for the most
// likely cause.
import { useState } from 'react';
import { ensureHdVoice, speakHd, primeAudio } from './tts.ts';
import { setHdVoice } from '../store.ts';

/** What the setup is doing right now. `null` when idle. */
export type HdPhase = 'downloading' | 'preparing' | 'testing';

export interface HdVoiceSetup {
  /** Download progress 0–100 while downloading, else null. */
  percent: number | null;
  /** Which stage is running, so the UI can stop saying "downloading" once the
   *  bytes are in. */
  phase: HdPhase | null;
  error: string;
  enable: () => Promise<void>;
}

/** Generous, but finite. A 25 MB download on a slow connection is legitimately
 *  minutes; a synthesis that has not produced a sound in this long is not coming. */
const DOWNLOAD_MS = 5 * 60_000;
// The *first* synthesis loads and warms the model as well as speaking, and it is
// the one this flow runs. Measured end to end through `ensureHdVoice` + `speakHd`
// on a fast desktop: **6.9s**. A phone is several times slower and a cold cache
// slower again, so 45s was tight enough to fail a working setup; 2 minutes is
// generous without being indistinguishable from a hang.
const SPEAK_MS = 120_000;

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(what)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); },
           (e) => { clearTimeout(t); reject(e); });
  });
}

export function useHdVoice(): HdVoiceSetup {
  const [percent, setPercent] = useState<number | null>(null);
  const [phase, setPhase] = useState<HdPhase | null>(null);
  const [error, setError] = useState('');

  const enable = async () => {
    // First, synchronously, while we are still inside the tap: unlock audio.
    // Everything below is awaited, and after the first await this is no longer a
    // user gesture as far as iOS is concerned.
    primeAudio();

    setError(''); setPercent(0); setPhase('downloading');
    // Being offline is temporary and the learner can act on it; the device not
    // being able to run the voice is not. Saying "something went wrong" for both
    // sends someone to look for a problem that isn't theirs.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setPercent(null); setPhase(null);
      setError('You’re offline — the HD voice has to download once before it can work without a connection.');
      return;
    }
    try {
      await withTimeout(
        ensureHdVoice((f) => {
          const p = Math.round(f * 100);
          setPercent(p);
          // The bytes are in; what follows is unpacking and model init, which is
          // seconds more on a phone and is not the network's fault.
          if (p >= 100) setPhase('preparing');
        }),
        DOWNLOAD_MS,
        'The voice download didn’t finish. Check your connection and try again.',
      );
      setPhase('testing');
      setPercent(null);
      // Only switch it on once synthesis has actually produced sound here: a
      // toggle that claims a voice this device cannot run is worse than no toggle.
      await withTimeout(
        speakHd('Hallo! Das ist die neue deutsche Stimme.'),
        SPEAK_MS,
        'The voice downloaded but could not play on this device. Your browser may be blocking sound, or the device may be short of memory.',
      );
      setHdVoice(true);
      setPercent(null); setPhase(null);
    } catch (e) {
      setPercent(null); setPhase(null);
      setError(e instanceof Error ? e.message : 'The voice could not be set up on this device.');
    }
  };

  return { percent, phase, error, enable };
}
