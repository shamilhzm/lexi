// Human recordings for example sentences, with synthetic speech underneath.
//
// Lexi has shipped two German voices for months and could never test whether you
// *understood* one — `Known` has always meant "recognised in print". This is the
// layer that makes an ear-based drill possible.
//
// Three sources, in order of preference:
//   1. a real human recording from Tatoeba, cached on this device
//   2. the Piper "Thorsten" neural voice (already shipped, already cached)
//   3. the platform's built-in de-DE synthesis
//
// **The fallback is the design, not a safety net.** Only a minority of cards have
// a human recording, so if listening depended on one the feature would be full of
// holes and empty states. Instead every card can be heard from the first launch,
// and a human voice quietly upgrades the ones that have it. Nothing in the UI
// ever has to say "audio unavailable".
//
// Caching mirrors `tts.ts`: fetch once, keep in the origin private filesystem,
// work offline afterwards. Same reason, same shape — a learner on a tram should
// not re-download a clip they heard yesterday.
import { speak } from './tts.ts';

/** One usable recording, as `corpus:audio` records it. */
export interface AudioEntry {
  audioId: string;
  license: string;
  attribution: string;
  by: string;
}

const MANIFEST_URL = `${import.meta.env.BASE_URL}data/audio.json`;
const CLIP_URL = (audioId: string) => `https://tatoeba.org/audio/download/${audioId}`;
const DIR = 'tatoeba-audio';

let manifest: Record<string, AudioEntry> | null = null;
let loading: Promise<Record<string, AudioEntry>> | null = null;

/** Load the manifest once. A missing file is not an error — it means this build
 *  simply has no human recordings, and everything falls through to speech. */
export function loadAudioManifest(): Promise<Record<string, AudioEntry>> {
  if (manifest) return Promise.resolve(manifest);
  loading ??= fetch(MANIFEST_URL)
    .then((r) => (r.ok ? r.json() : {}))
    .then((m): Record<string, AudioEntry> => {
      manifest = (m && typeof m === 'object') ? m as Record<string, AudioEntry> : {};
      return manifest;
    })
    .catch((): Record<string, AudioEntry> => { manifest = {}; return manifest; });
  return loading;
}

/** Is a human recording available for this card? Synchronous, so callers can
 *  decide layout without awaiting; returns false until the manifest has loaded,
 *  which only ever costs a card its *badge*, never its audio. */
export function hasHumanAudio(cardId: string): boolean {
  return !!(manifest && manifest[cardId]);
}

/** Attribution for a card's recording, for the credit line. */
export function creditFor(cardId: string): AudioEntry | null {
  return (manifest && manifest[cardId]) || null;
}

// ---- the cache -------------------------------------------------------------
// OPFS where available. Every failure path here is non-fatal: a device that
// refuses storage still plays audio, it just re-fetches it.

async function cacheDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage?.getDirectory?.();
    if (!root) return null;
    return await root.getDirectoryHandle(DIR, { create: true });
  } catch { return null; }
}

async function fromCache(audioId: string): Promise<Blob | null> {
  try {
    const dir = await cacheDir();
    if (!dir) return null;
    const fh = await dir.getFileHandle(`${audioId}.mp3`);
    const f = await fh.getFile();
    return f.size > 0 ? f : null;
  } catch { return null; }   // not cached yet
}

async function toCache(audioId: string, blob: Blob): Promise<void> {
  try {
    const dir = await cacheDir();
    if (!dir) return;
    const fh = await dir.getFileHandle(`${audioId}.mp3`, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
  } catch { /* a full or unavailable OPFS costs a re-fetch, nothing more */ }
}

let current: HTMLAudioElement | null = null;

/** Play a blob, resolving when it ends. Mirrors `speakHd`'s object-URL discipline. */
function playBlob(blob: Blob, rate = 1): Promise<void> {
  const url = URL.createObjectURL(blob);
  current?.pause();
  const audio = new Audio(url);
  audio.playbackRate = rate;
  current = audio;
  return new Promise<void>((resolve, reject) => {
    audio.addEventListener('ended', () => { URL.revokeObjectURL(url); resolve(); }, { once: true });
    audio.addEventListener('error', () => { URL.revokeObjectURL(url); reject(new Error('playback failed')); }, { once: true });
    audio.play().catch(reject);
  });
}

/**
 * Say this sentence — human voice if we have one, synthesis otherwise.
 *
 * `rate` below 1 is the slow replay a dictation drill needs. It applies to human
 * audio only; the synthetic path keeps its own rate, because Piper re-synthesises
 * rather than resampling and already speaks at a learner-friendly 0.95.
 */
export async function sayExample(cardId: string, text: string, rate = 1): Promise<void> {
  const entry = (await loadAudioManifest())[cardId];
  if (!entry) { speak(text); return; }

  try {
    const cached = await fromCache(entry.audioId);
    if (cached) { await playBlob(cached, rate); return; }

    const res = await fetch(CLIP_URL(entry.audioId));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob.size === 0) throw new Error('empty clip');
    // Cache first so an interrupted playback still leaves the file behind.
    await toCache(entry.audioId, blob);
    await playBlob(blob, rate);
  } catch {
    // Offline, blocked, or a bad clip — the learner still hears the sentence.
    speak(text);
  }
}

/** Stop whatever is playing (leaving a session, skipping an item). */
export function stopAudio(): void {
  current?.pause();
  current = null;
}
