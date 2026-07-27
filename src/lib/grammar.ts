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
  /** type → an authored hint ladder (up to 3 rungs), preferred over the generic
   *  letter-counting fallback in `hintText`. The generated transformation drill
   *  supplies one that names the construction instead; see `transformHints`. */
  hints?: string[];
  /** Extra teaching content for the moment after answering. A drill used to state
   *  a bare verdict ("Answer: du wirst müssen"), which says *what* without ever
   *  saying *why* — on the one screen where the learner is already paying full
   *  attention. See components/Reveal.tsx. */
  reveal?: RevealData;
}

/** The teaching beats a resolved exercise can show. Both are derived from data the
 *  app already computed and discarded — `conjugate()` returns all six persons of
 *  every tense and the drills used exactly one. */
export interface RevealData {
  /** How the answer is built, as a formula: ["wirst", "müssen"] → "wirst + müssen". */
  derivation?: string[];
  /** A note under the formula ("the infinitive goes last"). */
  note?: string;
  /** A labelled six-person paradigm: [pronoun, form] pairs in ich…sie order. */
  paradigm?: { label: string; rows: [string, string][] };
}
/** One block of a rule.
 *
 *  127 of the bank's 128 rules ship as a single unbroken paragraph — up to 547
 *  characters — and `RuleCard` has rendered `whitespace-pre-line` the whole time,
 *  waiting for newlines the data never contained. The worst offenders are not even
 *  prose: *Pluralbildung* is a five-item list with two worked examples each, set as
 *  one paragraph on a phone.
 *
 *  Structure rather than markup, so the renderer can align the arrow column and
 *  keep German in `lang="de"` — neither of which a `\n` would give us. */
export interface RuleSection {
  /** A mono kicker naming the pattern, particle or case slot. */
  label?: string;
  /** Prose for this block. */
  body?: string;
  /** Transformation pairs, rendered with the arrow column-aligned. */
  pairs?: { from: string; to: string }[];
  /** Standalone German examples, each optionally glossed. */
  examples?: { de: string; en?: string }[];
}

export interface GPoint {
  title: string;
  summary: string;
  rule: string;
  /** Present on the rules that are structurally lists; `rule` stays the fallback
   *  (and the accessible full text) for the ones that are genuinely prose. */
  sections?: RuleSection[];
  exercises: GExercise[];
}

/** Beyond this a rule is a wall of text on a phone and must be sectioned.
 *  Enforced by grammar.test.ts so it cannot regress. */
export const MAX_UNSECTIONED_RULE = 280;
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
export const GRAMMAR_COUNTS = { points: 131, exercises: 805 } as const;

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
