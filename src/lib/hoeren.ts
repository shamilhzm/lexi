// Hören's engine: choose the words, make the audio on this phone, play it, and
// keep the lock screen and the mini-player telling the same story.
//
// What plays and why is `lib/listen.ts`. This file is the plumbing, and its one
// hard constraint is iOS: sound may only *start* inside a tap, so the shared audio
// element is unlocked synchronously in `start()` before the first `await`, and the
// rendered programme is later played on that same element. Everything after the
// tap may take a minute (voices, synthesis, the render); the element remembers it
// was allowed.
import { useSyncExternalStore } from 'react';
import { buildBriefing, isSaved, toggleSaved } from '../store.ts';
import { BY_ID } from '../data/index.ts';
import { loadDetailFor } from '../data/detail.ts';
import { feedOrder } from '../views/Feed.tsx';
import { ensureVoice, voiceStored, HD_VOICE_ID, EN_VOICE_ID } from './tts.ts';
import { layout, clipsFor, promptOf, answerOf, type Placed, type WalkItem } from './walk.ts';
import { listenProgram, indexAt, skipTarget, replayTarget, wordsIn, DEFAULT_MINUTES } from './listen.ts';
import { canRenderWalk, missingClips, renderClips, renderTimeline, voiceFor } from './walkAudio.ts';
import { claimAudio, releaseAudio, setInterruptHook } from './player.ts';
import type { Word } from '../types.ts';

export type HoerenPhase = 'idle' | 'consent' | 'preparing' | 'ready' | 'playing' | 'paused' | 'error';

export interface HoerenState {
  phase: HoerenPhase;
  /** 0..1 while preparing. */
  progress: number;
  stage: string;
  error: string;
  minutes: number;
  loop: boolean;
  /** Distinct words in the programme, and its real length in seconds. */
  words: number;
  total: number;
  /** The word being heard now. */
  current: { id: string; de: string; en: string } | null;
  /** Distinct words heard this time — kept in memory and nowhere else. */
  heard: number;
  /** For the one-time consent: megabytes still to download. */
  needMb: number;
}

/** Measured on the wire by `node scripts/costs.ts --live`, 2026-10-02: the
 *  runtime both voices share, and each voice's model. */
const RUNTIME_MB = 11.4;
const VOICE_MB: Record<string, number> = { [HD_VOICE_ID]: 63.2, [EN_VOICE_ID]: 63.5 };
/** Enough words for the longest programme, with room for the queue to be short. */
const MAX_WORDS = 130;

let state: HoerenState = {
  phase: 'idle', progress: 0, stage: '', error: '', minutes: DEFAULT_MINUTES, loop: true,
  words: 0, total: 0, current: null, heard: 0, needMb: 0,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<HoerenState>) => { state = { ...state, ...patch }; listeners.forEach((f) => f()); };

export function subscribeHoeren(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function hoerenState(): HoerenState { return state; }
/** Re-render on every change of Hören's state. */
export function useHoeren(): HoerenState { return useSyncExternalStore(subscribeHoeren, hoerenState, hoerenState); }

let el: HTMLAudioElement | null = null;
let url: string | null = null;
let plan: { placed: Placed[]; items: WalkItem[] } | null = null;
let heardIds = new Set<string>();
/** Bumped by every start and stop, so a slow preparation that has been
 *  superseded can tell, and drop its result. */
let generation = 0;

// A 0.05 s silent WAV — the same unlock `tts.primeAudio` uses.
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

function element(): HTMLAudioElement {
  if (el) return el;
  el = new Audio();
  el.preload = 'auto';
  el.addEventListener('timeupdate', onTime);
  el.addEventListener('play', () => { if (plan) set({ phase: 'playing' }); });
  el.addEventListener('pause', () => { if (plan && state.phase === 'playing') set({ phase: 'paused' }); });
  el.addEventListener('ended', () => { if (plan && !el?.loop) finish(); });
  return el;
}

/** Ask the system for playback audio — iOS 16.4+ — so the programme keeps going
 *  with the ring switch on silent and with the phone locked. */
function playbackSession() {
  try {
    const s = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (s) s.type = 'playback';
  } catch { /* older engines play anyway */ }
}

/** Unlock the shared element while a tap is still in scope. Synchronous, and
 *  only on an element holding no programme — `start` frees the old one first. */
function unlock() {
  const a = element();
  try {
    a.src = SILENCE;
    a.muted = true;
    // Paused only if nothing real has been loaded since: a fully cached programme
    // can be ready before this promise settles, and must not be stopped by it.
    void a.play().then(() => { if (!plan) a.pause(); a.muted = false; }).catch(() => { a.muted = false; });
  } catch { /* the Play button on the mini-player is the fallback */ }
}

/** What still has to download before the first programme can be made. */
async function voicesNeeded(): Promise<number> {
  const missing = await Promise.all([HD_VOICE_ID, EN_VOICE_ID].map(async (id) => (await voiceStored(id)) ? 0 : VOICE_MB[id]));
  const mb = missing.reduce((a, b) => a + b, 0);
  const runtime = missing.every((m) => m > 0) ? RUNTIME_MB : 0;
  return Math.round((mb + runtime) * 10) / 10;
}

// ---- the queue -----------------------------------------------------------------

/** The example a listener can follow: the shortest of a card's first three. */
function exampleOf(w: Word): string | undefined {
  const ex = (w.ex ?? []).slice(0, 3).map((e) => e.de).filter(Boolean);
  return ex.sort((a, b) => a.length - b.length)[0];
}

/** Saved words first, then the day's due and fresh words — the briefing's own
 *  order — then the feed's. Hearing a due word is what the feed already does
 *  (meaning shown, nothing graded), so Hören follows its precedent. */
async function queue(): Promise<WalkItem[]> {
  const ids: string[] = [];
  const seen = new Set<string>();
  const take = (id: string) => { if (!seen.has(id) && ids.length < MAX_WORDS) { seen.add(id); ids.push(id); } };
  for (const id of buildBriefing().ids) take(id);
  for (const w of feedOrder()) { if (ids.length >= MAX_WORDS) break; take(w.id); }
  const words = ids.map((id) => BY_ID.get(id)).filter((w): w is Word => !!w && w.kind === 'word');
  await loadDetailFor(words);
  return words.map((w) => ({ id: w.id, de: answerOf(w.term), en: promptOf(w.en), example: exampleOf(w), isNew: false }));
}

// ---- controls ------------------------------------------------------------------

/** Start a programme. Call from a tap. Without `consented`, a first-time listener
 *  is asked before 138 MB of voices download; the sheet asks and calls again. */
export function start(opts: { minutes?: number; loop?: boolean; consented?: boolean } = {}): void {
  const gen = ++generation;
  const minutes = opts.minutes ?? state.minutes;
  const loop = opts.loop ?? state.loop;
  stopPlayback();     // free any programme already loaded…
  unlock();           // …then unlock, still inside the tap: nothing above awaits
  playbackSession();
  claimAudio('hoeren', stop);
  heardIds = new Set();
  set({ phase: 'preparing', progress: 0, stage: 'Choosing your words', error: '', minutes, loop,
    current: null, heard: 0, words: 0, total: 0 });
  void prepare(gen, minutes, loop, !!opts.consented);
}

async function prepare(gen: number, minutes: number, loop: boolean, consented: boolean) {
  const live = () => gen === generation;
  try {
    if (!canRenderWalk()) throw new Error('This browser can’t make audio offline, so Hören isn’t available here.');
    const items = await queue();
    const pres = listenProgram(items, minutes);
    if (!pres.length) throw new Error('No words at your level to play yet.');
    const keys = clipsFor(pres, [], items);
    if (!live()) return;

    const missing = await missingClips(keys);
    if (!live()) return;
    if (missing.length) {
      const voices = [...new Set(missing.map(voiceFor))];
      const stored = await Promise.all(voices.map(voiceStored));
      if (!stored.every(Boolean) && !consented) {
        set({ phase: 'consent', needMb: await voicesNeeded() });
        releaseAudio('hoeren');
        return;
      }
      set({ stage: 'Getting the voices ready' });
      for (let i = 0; i < voices.length; i++) {
        await ensureVoice(voices[i], (f) => live() && set({ progress: ((i + f) / voices.length) * 0.2 }));
      }
    }
    if (!live()) return;
    set({ stage: missing.length ? `Speaking ${wordsIn(pres)} words` : 'Putting it together', progress: 0.2 });
    const clips = await renderClips(keys, (f) => live() && set({ progress: 0.2 + f * 0.7 }));
    if (!live()) return;
    const { segments, placed, total } = layout(pres, [], items, (k) => clips.get(k)?.duration ?? 0);
    set({ stage: 'Putting it together' });
    const made = await renderTimeline(segments, clips, total, (f) => live() && set({ progress: 0.9 + f * 0.1 }));
    if (!live()) { URL.revokeObjectURL(made); return; }
    url = made;
    plan = { placed, items };
    set({ words: wordsIn(pres), total });
    play(loop);
  } catch (e) {
    if (!live()) return;
    releaseAudio('hoeren');
    set({ phase: 'error', error: (e as Error).message || 'Something went wrong making the audio.' });
  }
}

function play(loop: boolean) {
  const a = element();
  if (!url) return;
  a.muted = false;
  a.loop = loop;
  a.src = url;
  wireSession();
  a.play().then(() => set({ phase: 'playing' })).catch(() => {
    // The tap's permission did not carry this far (an older engine, or a long
    // preparation): the mini-player's Play button is one more tap away.
    set({ phase: 'ready' });
  });
}

/** Play after `ready`, or after a pause. Call from a tap. */
export function resume(): void {
  const a = element();
  if (!plan) return;
  playbackSession();
  claimAudio('hoeren', stop);
  void a.play().then(() => set({ phase: 'playing' })).catch(() => set({ phase: 'ready' }));
}

export function pause(): void {
  el?.pause();
  interrupted = null;
}

export function skip(): void {
  const a = el;
  if (!a || !plan) return;
  const to = skipTarget(plan.placed, a.currentTime);
  if (to === null) { a.currentTime = a.loop ? 0 : a.duration; return; }
  a.currentTime = to;
  onTime();
}

export function replay(): void {
  const a = el;
  if (!a || !plan) return;
  a.currentTime = replayTarget(plan.placed, a.currentTime);
  onTime();
}

export function setLoop(loop: boolean): void {
  if (el) el.loop = loop;
  set({ loop });
}

/** Save the word being heard — the feed's one honest signal, from the speaker.
 *  Never unsaves: a second press while the same word plays is not a change of mind. */
export function saveCurrent(): boolean {
  const c = state.current;
  if (!c) return false;
  if (!isSaved(c.id)) toggleSaved(c.id);
  return true;
}

/** End the programme and free everything it held. */
export function stop(): void {
  generation++;
  stopPlayback();
  releaseAudio('hoeren');
  set({ phase: 'idle', progress: 0, stage: '', current: null, words: 0, total: 0 });
}

function stopPlayback() {
  interrupted = null;
  if (el) {
    el.pause();
    el.removeAttribute('src');
    try { el.load(); } catch { /* */ }
  }
  if (url) { URL.revokeObjectURL(url); url = null; }
  plan = null;
  clearSession();
}

function finish() {
  stopPlayback();
  releaseAudio('hoeren');
  set({ phase: 'idle', current: null });
}

// ---- the clock: current word, tally, lock screen ---------------------------------

function onTime() {
  const a = el;
  if (!a || !plan) return;
  const i = indexAt(plan.placed, a.currentTime);
  if (i < 0) return;
  const it = plan.items[plan.placed[i].item];
  if (state.current?.id === it.id) return;
  heardIds.add(it.id);
  set({ current: { id: it.id, de: it.de, en: it.en }, heard: heardIds.size });
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: it.de, artist: `Hören · ${it.en}`, album: 'Lexi',
        // Absolute: the lock screen does not resolve a path against the page.
        artwork: [{ src: new URL(`${import.meta.env.BASE_URL}icon-512.png`, location.href).href, sizes: '512x512', type: 'image/png' }],
      });
      if (a.duration && isFinite(a.duration)) {
        navigator.mediaSession.setPositionState({ duration: a.duration, position: Math.min(a.currentTime, a.duration), playbackRate: 1 });
      }
    } catch { /* metadata is decoration */ }
  }
}

/** Lock-screen buttons. Next skips a word and previous replays it — they never
 *  mean "knew it" here; that is Practise aloud's grammar, not Hören's. */
function wireSession() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  const on = (a: MediaSessionAction, fn: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, fn); } catch { /* unsupported */ } };
  on('play', () => resume());
  on('pause', () => pause());
  on('nexttrack', () => skip());
  on('previoustrack', () => replay());
  on('stop', () => stop());
  // Without these the lock screen offers ±10 s, which lands mid-word.
  on('seekforward', null);
  on('seekbackward', null);
}

function clearSession() {
  if (!('mediaSession' in navigator)) return;
  for (const a of ['play', 'pause', 'nexttrack', 'previoustrack', 'stop'] as MediaSessionAction[]) {
    try { navigator.mediaSession.setActionHandler(a, null); } catch { /* */ }
  }
  try { navigator.mediaSession.metadata = null; } catch { /* */ }
}

// ---- interruptions: a speaker tap pauses Hören, and gives it back ----------------

let interrupted: symbol | null = null;

setInterruptHook(() => {
  if (!el || !plan || state.phase !== 'playing') return () => {};
  const token = Symbol('interrupt');
  interrupted = token;
  el.pause();
  return () => {
    if (interrupted !== token) return;   // the listener did something since
    interrupted = null;
    if (plan && el && state.phase === 'paused') void el.play().catch(() => set({ phase: 'ready' }));
  };
});
