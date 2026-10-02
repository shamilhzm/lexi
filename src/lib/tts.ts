// German speech. Two engines:
//  - HD: Piper "Thorsten" neural voice via @diffusionstudio/vits-web, running
//    fully in-browser (WASM) and cached in the origin private filesystem, so it
//    works offline after the one-time voice download. Opt-in: 74.6 MB on the wire
//    (a 63.2 MB model plus the runtime), measured by `node scripts/costs.ts --live`.
//  - Fallback: the platform's built-in de-DE speech synthesis (speakDe).
// speak() routes to HD when the user has enabled it, else the fallback.
import { hdVoice } from '../store.ts';
import { useEffect, useState } from 'react';
import { speakDe, hasGermanVoice } from './ui.ts';
import { interrupt } from './player.ts';

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

/** The English voice walk mode prompts in. Piper "cori", trained on LibriVox
 *  recordings (public domain); British, to match the app's spelling. Only walk
 *  mode loads it — nothing else in Lexi speaks English. */
export const EN_VOICE_ID = 'en_GB-cori-medium';

/** Whether a voice is already in the origin's cache (no download needed). */
export async function voiceStored(id: string): Promise<boolean> {
  const tts = await load();
  const stored: string[] = (await tts.stored?.()) ?? [];
  return stored.includes(id);
}

/** Download any Piper voice once; a stored voice returns immediately. */
export async function ensureVoice(id: string, onProgress?: (fraction: number) => void): Promise<void> {
  if (id === HD_VOICE_ID) return ensureHdVoice(onProgress);
  const tts = await load();
  if (!(await voiceStored(id))) await tts.download(id, (p: any) => onProgress?.(pct(p)));
}

// ---- synthesis, with one ONNX session per voice ----------------------------------
//
// **`predict()` leaks a voice per call, so Lexi does not call it.** The library's
// `predict` reads the 63 MB model out of storage and builds a *new*
// `InferenceSession` every time, and never releases it — each one keeps the
// model's weights in onnxruntime's WebAssembly heap. A word tap now and then hides
// that; Hören does not. Driven on the iPhone simulator on 2026-10-02, a 30-minute
// programme (~150 clips) died part-way with *"Can't create a session. failed to
// allocate a buffer of size 63531379"* — the English voice, refused memory.
//
// So synthesis is done here with the same parts the library uses — its pinned
// onnxruntime and phonemizer builds, the voice files it already stored — and a
// session is created **once per voice** and kept. Phonemization still makes a fresh
// Emscripten instance per text, as the library does, because `callMain` is not
// re-entrant; that instance is garbage the moment it has printed.

const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/+esm';
const PHONEMIZE_URL = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/piper-DeOu3H9E.js/+esm';

interface VoiceModel { session: any; config: any; ort: any }
const models = new Map<string, Promise<VoiceModel>>();
let ortLib: Promise<any> | null = null;
let phonemizeLib: Promise<any> | null = null;
/** One synthesis at a time: a session must not run twice at once, and a word tap
 *  mid-preparation simply waits its turn. */
let queue: Promise<unknown> = Promise.resolve();

async function storedFile(name: string): Promise<Blob | null> {
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('piper');
    return await (await dir.getFileHandle(name)).getFile();
  } catch { return null; }
}

function model(voiceId: string): Promise<VoiceModel> {
  let m = models.get(voiceId);
  if (m) return m;
  m = (async () => {
    const lib = await load();
    const path: string | undefined = lib.PATH_MAP?.[voiceId];
    if (!path) throw new Error(`Unknown voice: ${voiceId}`);
    if (!(await voiceStored(voiceId))) await lib.download(voiceId);
    const name = path.split('/').at(-1)!;
    // The library writes its downloads without awaiting the write, so a file can
    // be missing for a moment after `download` resolves; the URL is then the
    // browser's cache, not a second download.
    const get = async (file: string, url: string) => (await storedFile(file)) ?? (await (await fetch(url)).blob());
    const [onnx, json] = await Promise.all([
      get(name, `${lib.HF_BASE}/${path}`),
      get(`${name}.json`, `${lib.HF_BASE}/${path}.json`),
    ]);
    const ort = await (ortLib ??= import(/* @vite-ignore */ ORT_URL));
    ort.env.wasm.numThreads = navigator.hardwareConcurrency;
    ort.env.wasm.wasmPaths = lib.ONNX_BASE;
    const session = await ort.InferenceSession.create(await onnx.arrayBuffer());
    return { session, config: JSON.parse(await json.text()), ort };
  })();
  models.set(voiceId, m);
  m.catch(() => models.delete(voiceId));   // a failed load may be retried
  return m;
}

async function phonemize(text: string, espeakVoice: string): Promise<number[]> {
  const lib = await load();
  const mod = await (phonemizeLib ??= import(/* @vite-ignore */ PHONEMIZE_URL));
  let ids: number[] | null = null;
  let lastErr = '';
  const inst = await mod.createPiperPhonemize({
    print: (line: string) => { try { ids = JSON.parse(line).phoneme_ids; } catch { /* not the result line */ } },
    printErr: (line: string) => { lastErr = line; },
    locateFile: (f: string) => (f.endsWith('.wasm') ? `${lib.WASM_BASE}.wasm` : f.endsWith('.data') ? `${lib.WASM_BASE}.data` : f),
  });
  inst.callMain(['-l', espeakVoice, '--input', JSON.stringify([{ text: text.trim() }]), '--espeak_data', '/espeak-ng-data']);
  if (!ids) throw new Error(lastErr || 'The phonemizer returned nothing.');
  return ids;
}

/** 16-bit mono WAV, which is what every caller of the library's `predict` got. */
function wav(samples: Float32Array, rate: number): Blob {
  const h = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) h.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); h.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true);
  str(36, 'data'); h.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    h.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([h.buffer], { type: 'audio/wav' });
}

/** Synthesise without playing — Hören and Practise aloud lay hundreds of these on
 *  one timeline, which is why the session is kept (see above). */
export function synthesize(text: string, voiceId: string): Promise<Blob> {
  const run = async () => {
    const { session, config, ort } = await model(voiceId);
    const ids = await phonemize(text, config.espeak.voice);
    const inf = config.inference;
    const feeds: Record<string, unknown> = {
      input: new ort.Tensor('int64', ids, [1, ids.length]),
      input_lengths: new ort.Tensor('int64', [ids.length]),
      scales: new ort.Tensor('float32', [inf.noise_scale, inf.length_scale, inf.noise_w]),
    };
    if (Object.keys(config.speaker_id_map ?? {}).length) feeds.sid = new ort.Tensor('int64', [0]);
    const { output } = await session.run(feeds);
    return wav(output.data as Float32Array, config.audio.sample_rate);
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

/** Unlock audio playback while a user gesture is still in scope.
 *
 *  iOS only allows sound that *begins* inside a tap. The HD-voice setup awaits a
 *  ~75 MB download before it plays its proof-of-life clip, and after the first
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
  const clip = await synthesize(text, HD_VOICE_ID);
  if (!(clip instanceof Blob) || clip.size === 0) throw new Error('Voice engine returned no audio.');
  const url = URL.createObjectURL(clip);
  current?.pause();
  const audio = new Audio(url);
  current = audio;
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  // Hören pauses for the word and picks up after it (lib/player.ts).
  const resume = interrupt();
  for (const ev of ['ended', 'pause', 'error'] as const) audio.addEventListener(ev, resume, { once: true });
  try { await audio.play(); } catch (e) { resume(); throw e; }
}

/** Speak with Piper and resolve when the audio has *finished* — `speakHd`
 *  resolves when playback starts, which is right for a word and wrong for reading
 *  an article aloud paragraph by paragraph. */
export async function speakHdToEnd(text: string): Promise<void> {
  await speakHd(text);
  const a = current;
  if (!a || a.ended) return;
  await new Promise<void>((resolve) => {
    a.addEventListener('ended', () => resolve(), { once: true });
    a.addEventListener('pause', () => resolve(), { once: true });
  });
}

/** Stop whatever the HD voice is saying. */
export function stopHd(): void { current?.pause(); }

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

/** Whether this device can say a German word at all, as a hook.
 *
 *  Voices load asynchronously — `getVoices()` is empty on first call in every
 *  browser that fires `voiceschanged` — so this cannot be a one-shot read at
 *  render time. It subscribes, and re-answers when the list arrives.
 *
 *  The HD voice is its own answer: if the learner has enabled it, Lexi carries a
 *  German voice with it and the platform's inventory is irrelevant.
 *
 *  Used to *not offer* the speaker rather than to explain it afterwards. A
 *  control that cannot do its job should say so before it is pressed, not after —
 *  and a German word read by an English voice is worse than silence, which is the
 *  whole of `speakDe`'s refusal. */
export function useGermanVoice(): boolean {
  const [ok, setOk] = useState(() => hdVoice() || hasGermanVoice());
  useEffect(() => {
    if (ok || typeof speechSynthesis === 'undefined') return;
    const check = () => { if (hdVoice() || hasGermanVoice()) setOk(true); };
    check();
    speechSynthesis.addEventListener?.('voiceschanged', check);
    return () => speechSynthesis.removeEventListener?.('voiceschanged', check);
  }, [ok]);
  return ok;
}
