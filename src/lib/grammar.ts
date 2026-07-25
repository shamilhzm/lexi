// Authored grammar exercises (A1–C2), loaded at runtime from
// /public/data/grammar.json. Five widget kinds: choose, mc, type, order, error.
// Ported from the prior Atlas build.
//
// Every point carries a plain-English `summary` and a `rule` — the teaching text
// the Grammar surface renders. Every exercise carries an `explain` shown after
// answering. Coverage is asserted in grammar.test.ts.
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

/** Points + exercises in the bank, for copy that has the file loaded. */
export function grammarCounts(g: GrammarByLevel): { points: number; exercises: number } {
  let points = 0, exercises = 0;
  for (const level of Object.keys(g) as CEFR[]) {
    points += g[level].length;
    for (const p of g[level]) exercises += p.exercises.length;
  }
  return { points, exercises };
}

/** The same counts for copy that must render before (or without) the fetch —
 *  Today's drills accordion. grammar.test.ts asserts these against the shipped
 *  file, so the numbers cannot drift out of sync again. */
export const GRAMMAR_COUNTS = { points: 128, exercises: 774 } as const;

/** Split a `gram:<level>:<title>` vocab-card id into its parts. Titles contain
 *  colons ("Konzessivsätze: obwohl"), so only the first two segments are fixed. */
export function parsePointId(id: string): { level: CEFR; title: string } | null {
  const [prefix, level, ...rest] = id.split(':');
  if (prefix !== 'gram' || !level || rest.length === 0) return null;
  return { level: level as CEFR, title: rest.join(':') };
}

/** Locate an authored point by level + title, returning its index so callers can
 *  address its exercises (`gex:<level>:<pi>:<xi>`) and its mastery. Returns null
 *  for the ~27 vocab grammar cards that have no exercise set behind them. */
export function findPoint(g: GrammarByLevel, level: CEFR, title: string): { point: GPoint; pi: number } | null {
  const pi = (g[level] ?? []).findIndex((p) => p.title === title);
  return pi < 0 ? null : { point: g[level][pi], pi };
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
