// German speech. Two engines:
//  - HD: Piper "Thorsten" neural voice via @diffusionstudio/vits-web, running
//    fully in-browser (WASM) and cached in the origin private filesystem, so it
//    works offline after the one-time voice download. Opt-in (it's a ~25 MB DL).
//  - Fallback: the platform's built-in de-DE speech synthesis (speakDe).
// speak() routes to HD when the user has enabled it, else the fallback.
import { hdVoice } from '../store.ts';
import { speakDe } from './ui.ts';

export const HD_VOICE_ID = 'de_DE-thorsten-medium';

// jsDelivr, and the CDN is load-bearing — this is not a matter of taste.
//
// The HD voice was reported stuck, and the timeout added to diagnose it reported
// "downloaded but could not play". It had **never worked, on any device**. The
// esm.sh build of this package is served through a Node-polyfill shim whose `fs`
// is a stub, and `predict()` reaches it:
//
//     Error: [unenv] fs.readFile is not implemented yet!
//       at .../@diffusionstudio/vits-web@1.0.3/es2022/vits-web.mjs
//
// The throw happens somewhere that never rejects the promise we are awaiting, so
// synthesis hung forever rather than failing — which is why this looked like a
// slow download or an iOS audio-permission problem for as long as it did. Measured
// side by side in a browser: **esm.sh still "predicting" after 65s; jsDelivr
// returned a 63,532-byte WAV in 2.56s**, same version, same voice, same page.
//
// `+esm` is jsDelivr's browser ESM build, which does not shim Node built-ins.
// Version-pinned deliberately: the failure mode of the wrong build is a hang, not
// an error, and a hang is the hardest thing to attribute.
const CDN = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm';

let lib: any = null;
let ready = false;
export function hdReady() { return ready; }

async function load(): Promise<any> {
  if (lib) return lib;
  // Loaded from CDN at runtime so its heavy onnxruntime-web dependency never
  // enters the build. Vite must not try to resolve this — hence @vite-ignore.
  lib = await import(/* @vite-ignore */ CDN);
  return lib;
}

const pct = (p: any): number =>
  typeof p === 'number' ? p : (p && p.total ? (p.loaded ?? 0) / p.total : 0);

/** Download the Thorsten voice if needed. Returns once it's ready to speak. */
export async function ensureHdVoice(onProgress?: (fraction: number) => void): Promise<void> {
  const tts = await load();
  const stored: string[] = (await tts.stored?.()) ?? [];
  if (!stored.includes(HD_VOICE_ID)) {
    await tts.download(HD_VOICE_ID, (p: any) => onProgress?.(pct(p)));
  }
  ready = true;
}

/** Unlock audio playback while a user gesture is still in scope.
 *
 *  iOS only allows sound that *begins* inside a tap. The HD-voice setup awaits a
 *  ~25 MB download before it plays its proof-of-life clip, and after the first
 *  await the tap is over as far as WebKit is concerned — so the play was refused
 *  on exactly the device the voice matters most on. Playing (and immediately
 *  pausing) a silent clip during the tap marks the audio context as user-approved,
 *  and later playback inherits that.
 *
 *  Deliberately synchronous and deliberately silent: it must run before any
 *  `await`, and it must make no sound of its own. Failures are swallowed — this is
 *  an optimisation on platforms that do not need it, and it must never be the
 *  reason setup fails.
 *
 *  ⚠️ This was added as the suspected cause of the stuck HD voice and **was not
 *  it** — the real fault was the CDN build above. Kept because the gesture rule it
 *  addresses is real (playback still happens after a multi-second await, which iOS
 *  does restrict), but it is a precaution now, not a fix, and it earned no evidence
 *  of its own. */
let primed = false;
export function primeAudio(): void {
  if (primed || typeof Audio === 'undefined') return;
  primed = true;
  try {
    // A 0.05s silent WAV, small enough to inline.
    const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=');
    a.volume = 0;
    void a.play().then(() => { a.pause(); }).catch(() => { /* not needed here */ });
  } catch { /* never block setup on the unlock */ }
}

let current: HTMLAudioElement | null = null;
/** Synthesize and play with Piper. Throws (with a useful message) on failure. */
export async function speakHd(text: string): Promise<void> {
  const tts = await load();
  const wav: Blob = await tts.predict({ text, voiceId: HD_VOICE_ID });
  if (!(wav instanceof Blob) || wav.size === 0) throw new Error('Voice engine returned no audio.');
  const url = URL.createObjectURL(wav);
  current?.pause();
  const audio = new Audio(url);
  current = audio;
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
}

// The HD voice used to be discoverable only by opening Settings, so the learners
// most in need of it — the ones straining to hear a robotic vowel — were exactly
// the ones who never found it (UX-PATHS F4). Rather than wire an offer into every
// speaker button, the engine reports when it fell back to the system voice and the
// session decides whether that is the moment to mention it.
let onFallback: (() => void) | null = null;
/** Register a listener for "this was spoken with the built-in voice". */
export function onSystemVoice(fn: (() => void) | null): void { onFallback = fn; }

/** Speak German text with the best available engine (HD if enabled, else system). */
export function speak(text: string): void {
  if (!hdVoice()) { speakDe(text); onFallback?.(); return; }
  speakHd(text).catch(() => speakDe(text)); // fall back on any HD failure
}
