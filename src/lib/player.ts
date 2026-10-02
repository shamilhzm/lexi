// Who is playing Lexi's long audio, and what a short sound does to it.
//
// Two things in Lexi play for minutes at a time — Hören (`lib/hoeren.ts`) and
// Practise aloud (`components/WalkLayer.tsx`) — and many things play a second of
// speech: a speaker button, a session's word, an article read aloud. Two rules:
//
//   1. **Only one long programme plays.** Starting one stops the other. Its
//      lock-screen buttons belong to whoever holds the audio now, so a layer that
//      closes must not clear handlers it no longer owns.
//   2. **A short sound interrupts, then gives the programme back.** Tapping the
//      speaker on a word while Hören plays pauses Hören, and Hören resumes when
//      that word has been said — the listener asked for one thing, not for the
//      programme to end.
//
// No imports, on purpose: `tts.ts`, `ui.ts` and `audio.ts` call `interrupt()`, and
// Hören imports them, so anything heavier here would be an import cycle.

export type AudioOwner = 'hoeren' | 'walk';

let owner: AudioOwner | null = null;
let stopOwner: (() => void) | null = null;

/** Take the long-audio slot, stopping whoever had it. */
export function claimAudio(next: AudioOwner, stop: () => void): void {
  if (owner && owner !== next) {
    const prev = stopOwner;
    owner = null; stopOwner = null;
    try { prev?.(); } catch { /* a failing stop must not block the new owner */ }
  }
  owner = next;
  stopOwner = stop;
}

/** Give the slot back — only if `who` still holds it. */
export function releaseAudio(who: AudioOwner): void {
  if (owner === who) { owner = null; stopOwner = null; }
}

export function audioOwner(): AudioOwner | null { return owner; }

/** True while a long programme is playing or being prepared. A reload for a
 *  deploy waits for this to be false: it would end the programme in a pocket. */
export function audioBusy(): boolean { return owner !== null; }

// ---- interruptions -----------------------------------------------------------

let hook: (() => (() => void)) | null = null;

/** Registered by Hören: pause now, return a function that resumes. */
export function setInterruptHook(fn: (() => (() => void)) | null): void { hook = fn; }

/** A short sound is about to play. Pauses the long programme if one is playing,
 *  and returns a function to call when that sound ends — safe to call more than
 *  once, and a no-op if the listener has since paused, skipped or stopped. */
export function interrupt(): () => void {
  try { return hook ? hook() : noop; } catch { return noop; }
}
const noop = () => {};
