// Authored grammar exercises (98 points · 564 exercises, A1–C2), loaded at
// runtime from /public/data/grammar.json. Five widget kinds: choose, mc, type,
// order, error. Ported from the prior Atlas build.
import type { CEFR } from '../types.ts';

export interface GExercise {
  kind: 'choose' | 'mc' | 'type' | 'order' | 'error';
  prompt: string;
  options?: string[];  // choose / mc
  answer?: number;     // choose / mc → correct option index; error → wrong-token index
  accept?: string[];   // type → accepted answers (first is canonical)
  tiles?: string[];    // order → tiles in correct order
  fix?: string;        // error → the correction
  explain?: string;
}
export interface GPoint { title: string; summary: string; rule: string; exercises: GExercise[]; }
export type GrammarByLevel = Record<CEFR, GPoint[]>;

export interface GItem { level: CEFR; point: GPoint; ex: GExercise; pi: number; xi: number; id: string; }

let cache: GrammarByLevel | null = null;
export async function loadGrammar(): Promise<GrammarByLevel> {
  if (cache) return cache;
  const base = import.meta.env.BASE_URL || '/';
  const g = await fetch(base + 'data/grammar.json').then((r) => r.json() as Promise<GrammarByLevel>);
  cache = g;
  return g;
}

/** Flatten to individually-schedulable exercise items, optionally level-filtered. */
export function flatten(g: GrammarByLevel, levels: Set<CEFR>): GItem[] {
  const out: GItem[] = [];
  (Object.keys(g) as CEFR[]).forEach((level) => {
    if (!levels.has(level)) return;
    g[level].forEach((point, pi) => point.exercises.forEach((ex, xi) =>
      out.push({ level, point, ex, pi, xi, id: `gex:${level}:${pi}:${xi}` })));
  });
  return out;
}
