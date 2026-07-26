// Tagesblatt — the daily dispatch (COHESION-PLAN Phase 5a). Paste the
// transcript of „tagesschau in Einfacher Sprache" (or any German text) and the
// module segments it, diffs its words against the Atlas (lexikon + FSRS
// state), and builds Karte exercises for each level A1–C2 — all client-side,
// no LLM. Pure logic: no DOM, no store import (known-ness is injected), so it
// runs under node --test. The view lives in tagesblattview.ts.
import { hashStr, wortartRank, type Star, type Exercise, type CEFR } from './model.ts';
import { sampleDistractors, shuffleOptions } from './recall.ts';

export interface TagesblattAnalysis {
  sentences: string[];
  /** stars whose term appears in the text */
  matched: MatchedTerm[];
  /** words (normalized) that exist in no star — uncharted territory */
  uncharted: string[];
  wordCount: number;
}
export interface MatchedTerm { star: Star; count: number; known: boolean; sentence?: string; }
export interface TagesblattExercise { level: CEFR; ex: Exercise; starId?: string; }

const strip = (w: string) => w.toLowerCase().replace(/[^a-zäöüß-]/g, '');
const ARTICLE = /^(der|die|das)\s+/i;
/** headword of a star term: drop article, plural hint, parenthetical */
export function headwordOf(term: string): string {
  return strip(term.replace(ARTICLE, '').replace(/\(.*?\)/g, '').split(',')[0].trim().split(' ')[0]);
}

// Split text into sentences (rough but robust for news prose).
export function segment(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"])/)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 3);
}

// Diff the text against the star field. `isKnown` injects FSRS state.
export function analyze(text: string, stars: Star[], isKnown: (id: string) => boolean): TagesblattAnalysis {
  const sentences = segment(text);
  const words = text.split(/\s+/).map(strip).filter((w) => w.length > 2);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

  const byHead = new Map<string, Star>();
  for (const s of stars) {
    if (s.kind !== 'word') continue;
    const h = headwordOf(s.term);
    if (h && !byHead.has(h)) byHead.set(h, s);
  }
  const matched: MatchedTerm[] = [];
  const matchedHeads = new Set<string>();
  for (const [w, count] of freq) {
    const star = byHead.get(w);
    if (!star) continue;
    matchedHeads.add(w);
    const sentence = sentences.find((s) => s.toLowerCase().includes(w));
    matched.push({ star, count, known: isKnown(star.id), sentence });
  }
  matched.sort((a, b) => Number(a.known) - Number(b.known) || b.count - a.count);
  const uncharted = [...freq.keys()].filter((w) => !matchedHeads.has(w) && w.length > 3);
  return { sentences, matched, uncharted, wordCount: words.length };
}

// Sentence-length bands per level: an order exercise is "too steep" when the
// sentence is far above the band, trivial below it.
const BAND: Record<CEFR, [number, number]> = {
  A1: [3, 6], A2: [4, 8], B1: [6, 11], B2: [8, 14], C1: [10, 18], C2: [12, 26]
};
const LEVELS_ALL: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Build exercises for every level from one analysis. Deterministic per text.
export function buildExercises(a: TagesblattAnalysis, stars: Star[], perLevel = 6): Map<CEFR, TagesblattExercise[]> {
  const out = new Map<CEFR, TagesblattExercise[]>();
  const seed = hashStr(a.sentences[0] || 'leer');
  const wordStars = stars.filter((s) => s.kind === 'word' && s.translation);

  for (const lvl of LEVELS_ALL) {
    const list: TagesblattExercise[] = [];
    // 1) vocab mc — text terms at/below this level, unknown first
    const candidates = a.matched.filter((m) => m.star.cefr === lvl || (!m.known && LEVELS_ALL.indexOf(m.star.cefr) <= LEVELS_ALL.indexOf(lvl)));
    for (const m of candidates.slice(0, Math.ceil(perLevel / 2))) {
      const pool = wordStars.filter((s) => s.cefr === m.star.cefr && s.id !== m.star.id);
      const distractors = sampleDistractors(pool, 3, seed + hashStr(m.star.id), (s) => s.translation === m.star.translation).map((s) => s.translation);
      if (distractors.length < 3) continue;
      const { options, answer } = shuffleOptions(m.star.translation, distractors, seed + hashStr(m.star.id));
      list.push({ level: lvl, starId: m.star.id, ex: { kind: 'mc', prompt: `Aus dem Tagesblatt: Was bedeutet „${m.star.term}“?`, options, answer, explain: m.sentence ? `Im Text: „${m.sentence}“` : undefined } });
    }
    // 2) cloze — blank the matched term inside its sentence
    for (const m of candidates.filter((c) => c.sentence).slice(0, 2)) {
      const head = headwordOf(m.star.term);
      const re = new RegExp(`\\b[\\wäöüßÄÖÜ-]*${head}[\\wäöüßÄÖÜ-]*\\b`, 'i');
      const hit = m.sentence!.match(re);
      if (!hit) continue;
      const prompt = m.sentence!.replace(re, '___');
      if (prompt.split(' ').length > BAND[lvl][1] + 6) continue;
      const pool = wordStars.filter((s) => s.cefr === m.star.cefr && wortartRank(s.pos) === wortartRank(m.star.pos) && s.id !== m.star.id);
      const distractors = sampleDistractors(pool, 2, seed + hashStr(m.star.id + ':cz'), (s) => headwordOf(s.term) === head).map((s) => s.term.replace(ARTICLE, ''));
      if (distractors.length < 2) continue;
      const { options, answer } = shuffleOptions(hit[0], distractors, seed + hashStr(m.star.id + ':cz'));
      list.push({ level: lvl, starId: m.star.id, ex: { kind: 'choose', prompt, options, answer, explain: `„${m.star.term}“ — ${m.star.translation}` } });
    }
    // 3) order — rebuild a sentence in this level's length band
    const fitting = a.sentences.filter((s) => { const n = s.split(' ').length; return n >= BAND[lvl][0] && n <= BAND[lvl][1]; });
    for (const s of fitting.slice(0, perLevel - list.length)) {
      const tiles = s.replace(/[„“"]/g, '').split(' ');
      if (tiles.length < 3) continue;
      list.push({ level: lvl, ex: { kind: 'order', prompt: 'Setze den Satz aus dem Tagesblatt zusammen:', tiles, explain: s } });
    }
    out.set(lvl, list.slice(0, perLevel));
  }
  return out;
}
