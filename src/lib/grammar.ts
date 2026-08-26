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
  /** Derived by `corpus:genex` from the corpus rather than written by hand.
   *
   *  Generated items are correct — a gender or a conjugation is a fact, and the
   *  generator refuses anything it cannot prove — but they are correct the way a
   *  table is correct. An authored exercise can teach *why* the answer is what it
   *  is; a generated one can only state it. The flag exists so a surface can
   *  prefer authored items when teaching a concept and generated ones when the
   *  learner just wants volume. */
  gen?: true;
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
  /** **Where this section's rule stops being true.**
   *
   *  A first-class field rather than a sentence inside `body`, because it is the
   *  one thing this project has already been burned by and the only part of a
   *  lesson a machine can nag about. LESSONS class 6: *Mittelfeld* shipped the
   *  flat rule "an Akkusativ noun goes after the Angaben", which is only true of
   *  an **indefinite** one — so a learner holding it marks correct German wrong
   *  and trusts the verdict. The rule that came out of it is the rule here:
   *
   *  > Before shipping a teaching rule, write the sentence it would reject. If
   *  > that sentence is good German, the rule is a default and must say so.
   *
   *  `corpus:lessons` lints for absolutes ("always", "never", "only", "all")
   *  in a `body` that carries no `limit`, so the check is mechanical even though
   *  the judgement is not. Rendered as a distinct block — a caveat that reads
   *  like body text is a caveat nobody reads. */
  limit?: string;
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
/** Concept search (#38): find a grammar point by name, or by what its rule says.
 *
 *  Searches the rule text as well as the title because a learner mostly does not
 *  know the German name of the thing they want — "polite" has to reach Konjunktiv
 *  II and "reported speech" has to reach Konjunktiv I. Title matches rank first,
 *  or the point that *is* the word gets buried under every point that mentions it.
 *
 *  Two characters minimum: one letter matches most of the bank and the result is
 *  a list nobody can use.
 */
export function searchPoints(bank: GrammarByLevel, q: string, levels: readonly CEFR[]):
  { level: CEFR; pi: number; point: GPoint }[] | null {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return null;
  const hits: { level: CEFR; pi: number; point: GPoint; rank: number }[] = [];
  levels.forEach((level, li) => {
    (bank[level] ?? []).forEach((point, pi) => {
      const rank = point.title.toLowerCase().includes(needle) ? 0 : 1;
      if (rank === 0 || `${point.summary ?? ''} ${point.rule ?? ''}`.toLowerCase().includes(needle)) {
        hits.push({ level, pi, point, rank: rank * 100 + li });
      }
    });
  });
  return hits.sort((a, b) => a.rank - b.rank).map(({ level, pi, point }) => ({ level, pi, point }));
}

export const GRAMMAR_COUNTS = { points: 133, exercises: 6217 } as const;

/** Split a `gram:<level>:<title>` vocab-card id into its parts. Titles contain
 *  colons ("Konzessivsätze: obwohl"), so only the first two segments are fixed. */
export function parsePointId(id: string): { level: CEFR; title: string } | null {
  const [prefix, level, ...rest] = id.split(':');
  if (prefix !== 'gram' || !level || rest.length === 0) return null;
  return { level: level as CEFR, title: rest.join(':') };
}

/** Locate an authored point by level + title, returning its index. Returns null
 *  for the ~27 vocab grammar cards that have no exercise set behind them.
 *
 *  The index is for addressing the point in the bank, not for building card ids —
 *  see `gexId` for why those are keyed on the title. */
export function findPoint(g: GrammarByLevel, level: CEFR, title: string): { point: GPoint; pi: number } | null {
  const pi = (g[level] ?? []).findIndex((p) => p.title === title);
  return pi < 0 ? null : { point: g[level][pi], pi };
}

/** The FSRS card id for one exercise.
 *
 *  Keyed on the point's **title**, not its position. It used to be
 *  `gex:<level>:<pointIndex>:<xi>`, where the index was the point's slot in its
 *  level's array — so inserting a point anywhere but the end, reordering two, or
 *  moving one between levels silently re-attached every later learner schedule to
 *  a different exercise. No error and no way to notice; it only never happened
 *  because `corpus:grammar --write` appends and appending preserves indices.
 *  Titles survive all three operations, and `gram:<level>:<title>` cards were
 *  already keyed this way, so this makes the two namespaces consistent.
 *
 *  Titles are unique within a level (asserted in grammar.test.ts). They contain
 *  colons — 43 of them do — which is why the exercise index is read from the end;
 *  `parsePointId` already rejoins on colons for the same reason. */
export function gexId(level: CEFR, title: string, xi: number): string {
  return `gex:${level}:${title}:${xi}`;
}

/** Flatten to individually-schedulable exercise items, optionally level-filtered. */
export function flatten(g: GrammarByLevel, levels: Set<CEFR>): GItem[] {
  const out: GItem[] = [];
  (Object.keys(g) as CEFR[]).forEach((level) => {
    if (!levels.has(level)) return;
    g[level].forEach((point, pi) => point.exercises.forEach((ex, xi) =>
      out.push({ level, point, ex, pi, xi, id: gexId(level, point.title, xi) })));
  });
  return out;
}
