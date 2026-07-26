// Gap check — a quick per-Lektion diagnostic: a handful of vocab recognition
// items plus one exercise per linked grammar point. The verdict ('secure' or
// 'gap') drives lesson state. This module is pure (no DOM, no store) so it can
// run under node --test; the overlay UI lives in gapcheckview.ts.
import { hashStr, type Star, type Exercise } from './model.ts';
import type { Lektion } from './curriculum.ts';

export interface VocabItem { kind: 'vocab'; starId: string; term: string; options: string[]; answer: number; }
export interface GrammarItem { kind: 'grammar'; starId: string; title: string; exercise: Exercise; }
export type GapItem = VocabItem | GrammarItem;

export const GAP_VOCAB_COUNT = 6;
// Tunable pass thresholds: secure iff vocab ≥ 75% AND grammar ≥ 70%.
export const VOCAB_PASS = 0.75;
export const GRAMMAR_PASS = 0.7;

// Deterministic pseudo-shuffle: stable for a given (key, seed), no Math.random.
function pick<T>(arr: T[], n: number, key: (t: T) => string, seed: number): T[] {
  return [...arr].sort((a, b) => hashStr(key(a) + ':' + seed) - hashStr(key(b) + ':' + seed)).slice(0, n);
}

// Build the item list for one lesson. `lessonStars` are the lesson's stars;
// `distractorPool` is a wider word pool (e.g. all words of that CEFR level)
// used for wrong options so small lessons still get plausible distractors.
export function buildGapItems(lesson: Lektion, lessonStars: Star[], distractorPool: Star[], seed = 0): GapItem[] {
  const words = lessonStars.filter((s) => s.kind === 'word' && s.translation);
  const grammar = lessonStars.filter((s) => s.kind === 'grammar' && s.exercises?.length);

  const chosen = pick(words, GAP_VOCAB_COUNT, (s) => s.id, seed);
  const items: GapItem[] = chosen.map((s) => {
    // Dedupe the pool by translation so two distractors never read the same —
    // the lexikon legitimately contains synonyms across lessons.
    const seen = new Set<string>([s.translation]);
    const candidates = distractorPool.filter((d) => {
      if (d.kind !== 'word' || !d.translation || d.id === s.id || seen.has(d.translation)) return false;
      seen.add(d.translation);
      return true;
    });
    const wrong = pick(candidates, 3, (d) => d.id, hashStr(s.id) + seed).map((d) => d.translation);
    const options = [s.translation, ...wrong];
    // Deterministic answer position so reloads look identical.
    const slot = hashStr(s.id + ':slot:' + seed) % options.length;
    [options[0], options[slot]] = [options[slot], options[0]];
    return { kind: 'vocab', starId: s.id, term: s.term, options, answer: options.indexOf(s.translation) };
  });

  for (const g of grammar) {
    const ex = g.exercises![hashStr(g.id + ':' + seed) % g.exercises!.length];
    items.push({ kind: 'grammar', starId: g.id, title: g.term, exercise: ex });
  }
  return items;
}

export interface GapAnswer { item: GapItem; correct: boolean; }
export interface GapScore {
  correct: number; total: number;
  vocabPct: number; grammarPct: number;   // 0..1; 1 when a part has no items
  verdict: 'gap' | 'secure';
  missedStarIds: string[];
  correctStarIds: string[];
}

export function scoreGapCheck(answers: GapAnswer[]): GapScore {
  const part = (kind: 'vocab' | 'grammar') => {
    const xs = answers.filter((a) => a.item.kind === kind);
    return xs.length ? xs.filter((a) => a.correct).length / xs.length : 1;
  };
  const vocabPct = part('vocab');
  const grammarPct = part('grammar');
  return {
    correct: answers.filter((a) => a.correct).length,
    total: answers.length,
    vocabPct, grammarPct,
    verdict: vocabPct >= VOCAB_PASS && grammarPct >= GRAMMAR_PASS ? 'secure' : 'gap',
    missedStarIds: answers.filter((a) => !a.correct).map((a) => a.item.starId),
    correctStarIds: answers.filter((a) => a.correct).map((a) => a.item.starId)
  };
}
