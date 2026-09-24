// Sprechen — the pronunciation game's logic. Pure; the microphone lives in
// `lib/speech.ts` and the screen in `views/games/Sprechen.tsx`.
//
// ## What the score is, said plainly
//
// VISION.md refused speech-recognition scoring until 2026-09-17, because
// consumer ASR marks accented-but-correct German wrong. That risk did not go
// away when the refusal was lifted, so this module is built around it:
//
//   - The score is **string similarity between the word and what the recogniser
//     heard**, nothing more. It is not a phonetic judgement and the screen says so.
//   - It takes the **best** of the recogniser's alternatives, so a word heard
//     correctly as a second guess still counts.
//   - A noun is accepted with or without its article: saying *Tisch* for
//     *der Tisch* is not a pronunciation error.
//   - Nothing is stored. There is no pronunciation grade in the learner's
//     record, because a number a machine cannot mark fairly must not follow
//     them around.
import type { CEFR, Word } from '../types.ts';

export interface Heard { transcript: string; confidence: number }

/** Lowercase, strip punctuation, collapse spaces. Umlauts and ß are kept:
 *  *schon* for *schön* is exactly the error this game exists to show. */
export function normalise(s: string): string {
  return s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

const ARTICLE = /^(der|die|das) /;

/** Levenshtein distance, two-row. Words here are short; no need for more. */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1 — 1 is an exact match. */
export function similarity(target: string, heard: string): number {
  const t = normalise(target), h = normalise(heard);
  if (!t || !h) return 0;
  const ratio = (a: string, b: string) => 1 - distance(a, b) / Math.max(a.length, b.length);
  // Accept the bare noun, and a transcript that dropped or added the article.
  const tBare = t.replace(ARTICLE, ''), hBare = h.replace(ARTICLE, '');
  return Math.max(ratio(t, h), ratio(tBare, hBare));
}

/** Best similarity across the recogniser's alternatives. Confidence is ignored
 *  on purpose: engines report it inconsistently, and some report 0 for all. */
export function scoreAttempt(target: string, heard: Heard[]): { score: number; best: string } {
  let score = 0, best = '';
  for (const h of heard) {
    const s = similarity(target, h.transcript);
    if (s > score) { score = s; best = h.transcript; }
  }
  return { score, best };
}

export type Verdict = 'clear' | 'close' | 'again';
export const CLEAR = 0.9;
export const CLOSE = 0.6;

export function verdict(score: number): Verdict {
  return score >= CLEAR ? 'clear' : score >= CLOSE ? 'close' : 'again';
}

/** The riso offset, in px, for a score. A clear word is in register (0); below
 *  that the colour passes drift apart in proportion to the miss. */
export const MAX_OFFSET = 10;
export function registration(score: number): number {
  if (score >= CLEAR) return 0;
  return Math.round(MAX_OFFSET * (1 - Math.max(0, score)) * 10) / 10;
}

function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Words to say. Only vocabulary at exactly this level — the game is about the
 *  mouth, not about meeting new words — and only single words (plus a noun's
 *  article), because a recogniser in `command` mode is built for short input. */
export function pickWords(corpus: Word[], level: CEFR, seed: number, n = 8): Word[] {
  const pool = corpus.filter((w) => w.kind === 'word' && w.level === level
    && /^((der|die|das) )?[A-Za-zÄÖÜäöüß-]{2,24}$/.test(w.term));
  const r = rng(seed);
  const out: Word[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < Math.min(n, pool.length) && guard++ < 1000) {
    const w = pool[Math.floor(r() * pool.length)];
    if (seen.has(w.term)) continue;
    seen.add(w.term);
    out.push(w);
  }
  return out;
}
