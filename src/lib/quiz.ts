// Quizzes, generated — so every level has tests on day one.
//
// The exam surface shipped as one authored telc B1 paper, which shaped the whole
// room around a 150-minute commitment at a single level. Two things were wrong
// with that. A learner who has twenty minutes cannot use it at all, and A1, A2,
// B2, C1 and C2 got an empty shelf and an apology.
//
// This is the other half: short tests **generated from the corpus and the grammar
// bank**, so a learner at any level can be tested today, and an authored paper
// becomes the deep end rather than the only end. The five kinds below map onto
// what certificate exams actually test — recognition, production, gender,
// contextual choice, and grammar in context — but nothing here is telc-shaped.
//
// ## Deterministic by construction
//
// Every builder takes a seeded RNG. A quiz is reproducible from its seed, which
// is what lets the tests below assert real behaviour instead of "it returned five
// things", and what lets a learner retry *the same* quiz rather than a new one
// that happens to be easier.
import type { CEFR, Word } from '../types.ts';
import type { GExercise, GrammarByLevel } from './grammar.ts';
import { gexId } from './grammar.ts';

export type QuizKind = 'de-en' | 'en-de' | 'gender' | 'cloze' | 'grammar';

export interface QuizItem {
  /** Stable within a quiz; the card or exercise id it came from. */
  id: string;
  kind: QuizKind;
  /** What the learner reads. German for de-en/cloze/grammar, English for en-de. */
  prompt: string;
  /** Secondary line: the sentence a cloze came from, the concept a grammar item
   *  drills. Never the answer. */
  sub?: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** Shown after answering. The app's whole posture is that a wrong answer is a
   *  teaching moment, so no item ships without one. */
  why: string;
  level: CEFR;
}

export interface QuizSpec {
  level: CEFR;
  /** How many items. */
  n: number;
  /** Which kinds to draw from; defaults to all five. */
  kinds?: QuizKind[];
  /** Restrict to these card ids — the hook for "quiz me on what I got wrong". */
  ids?: string[];
  /** Include everything at or below `level` rather than only that band. Exams
   *  test cumulatively, so this is the default. */
  cumulative?: boolean;
  seed?: number;
}

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Mulberry32 — small, fast, and good enough that a shuffle looks shuffled.
 *  Seeded so a quiz is reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(a: T[], r: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** First sense only. A four-option question whose options are each three senses
 *  long is a reading test, not a vocabulary test. */
export function firstSense(en: string): string {
  return (en || '').split(/\s*[;/]\s*/)[0].split(/\s*,\s*/)[0].trim();
}

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

/** Definitions are the corpus's weakest field — 1,493 are still flagged as raw
 *  sense-enumerations (BACKLOG Now #5), and some run to three lines of
 *  parenthesised Wiktionary apparatus. A quiz explanation is read in two seconds
 *  between questions, so it takes the first sentence and stops. */
function shortDef(def: string | null | undefined): string {
  if (!def) return '';
  const first = def.split(/(?<=[.;])\s+/)[0].trim();
  return first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
}

/** Options with the correct answer shuffled in. Returns the answer's index. */
function mc(correct: string, distractors: string[], r: () => number): { options: string[]; answer: number } {
  const opts = shuffle([correct, ...distractors.slice(0, 3)], r);
  return { options: opts, answer: opts.indexOf(correct) };
}

/** Distinct distractors that aren't the answer and aren't each other. */
function pickDistractors(pool: string[], correct: string, n: number, r: () => number): string[] {
  const seen = new Set([correct.toLowerCase()]);
  const out: string[] = [];
  for (const s of shuffle(pool, r)) {
    const k = s.toLowerCase();
    if (!s || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

// ---- the builders ----------------------------------------------------------

function vocabItem(w: Word, pool: Word[], dir: 'de-en' | 'en-de', r: () => number): QuizItem | null {
  const gloss = firstSense(w.en);
  if (!gloss) return null;
  if (dir === 'de-en') {
    const { options, answer } = mc(gloss, pickDistractors(pool.map((x) => firstSense(x.en)), gloss, 3, r), r);
    return {
      id: w.id, kind: 'de-en', level: w.level, prompt: w.term, options, answer,
      why: [`${w.term} — ${w.en}`, shortDef(w.def)].filter(Boolean).join('. '),
    };
  }
  const { options, answer } = mc(w.term, pickDistractors(pool.map((x) => x.term), w.term, 3, r), r);
  return {
    id: w.id, kind: 'en-de', level: w.level, prompt: gloss, options, answer,
    why: `${w.term} — ${w.en}`,
  };
}

const GENDER_WHY: Record<string, string> = {
  der: 'masculine', die: 'feminine', das: 'neuter',
};

function genderItem(w: Word, r: () => number): QuizItem | null {
  if (w.pos !== 'noun' || !w.gender) return null;
  const options = shuffle(['der', 'die', 'das'], r);
  return {
    id: w.id, kind: 'gender', level: w.level,
    prompt: stripArticle(w.term),
    sub: firstSense(w.en),
    options, answer: options.indexOf(w.gender),
    why: `${w.term} — ${GENDER_WHY[w.gender]}.${w.plural ? ` Plural: ${w.plural}.` : ''}`,
  };
}

/** Blank the headword in one of its own example sentences. The distractors are
 *  real words of the same part of speech, so the item tests meaning in context
 *  rather than which option looks like a word. */
function clozeItem(w: Word, pool: Word[], r: () => number): QuizItem | null {
  const surface = stripArticle(w.term);
  const ex = (w.ex ?? []).find((e) => e.de && e.de.includes(surface));
  if (!ex || surface.length < 3) return null;
  const gapped = ex.de.replace(surface, '____');
  if (gapped === ex.de) return null;
  const same = pool.filter((x) => x.pos === w.pos).map((x) => stripArticle(x.term));
  const { options, answer } = mc(surface, pickDistractors(same, surface, 3, r), r);
  return {
    id: `${w.id}#cloze`, kind: 'cloze', level: w.level,
    prompt: gapped, sub: ex.en || undefined, options, answer,
    why: `${ex.de}${ex.en ? ` — ${ex.en}` : ''}`,
  };
}

/** A grammar-bank exercise, narrowed to the kinds that are already four-option
 *  questions. `type` and `order` need their own widgets and belong in the
 *  Library's drill, not in a quiz that promises one interaction. */
function grammarItem(level: CEFR, title: string, pi: number, xi: number, ex: GExercise, r: () => number): QuizItem | null {
  if ((ex.kind !== 'choose' && ex.kind !== 'mc') || !ex.options?.length || ex.answer == null) return null;
  const correct = ex.options[ex.answer];
  if (correct == null) return null;
  const options = shuffle(ex.options, r);
  return {
    id: gexId(level, title, xi), kind: 'grammar', level,
    prompt: ex.prompt, sub: title, options, answer: options.indexOf(correct),
    why: ex.explain || `${title}: ${correct}`,
    ...(pi >= 0 ? {} : {}),
  };
}

// ---- the mixer -------------------------------------------------------------

export interface QuizSources {
  words: Word[];
  grammar?: GrammarByLevel | null;
}

/**
 * Build a quiz. Draws round-robin across the requested kinds so a ten-item quiz
 * is a mix rather than ten of whatever was most abundant, and degrades quietly:
 * a level with no grammar bank loaded, or a card set with no examples, simply
 * yields fewer of that kind rather than failing.
 */
export function buildQuiz(spec: QuizSpec, src: QuizSources): QuizItem[] {
  const r = rng(spec.seed ?? 1);
  const kinds = spec.kinds?.length ? spec.kinds : (['de-en', 'en-de', 'gender', 'cloze', 'grammar'] as QuizKind[]);
  const max = LEVELS.indexOf(spec.level);
  const cumulative = spec.cumulative !== false;

  let scope = src.words.filter((w) => w.kind === 'word'
    && (cumulative ? LEVELS.indexOf(w.level) <= max : w.level === spec.level));
  if (spec.ids?.length) {
    const want = new Set(spec.ids);
    const picked = scope.filter((w) => want.has(w.id));
    if (picked.length) scope = picked;
  }
  if (!scope.length) return [];

  // The distractor pool is the *band*, not the picked set: drawing wrong answers
  // from five cards a learner keeps getting wrong makes every option plausible
  // and the item unfair.
  const pool = src.words.filter((w) => w.kind === 'word' && LEVELS.indexOf(w.level) <= max);

  const byKind: Record<QuizKind, QuizItem[]> = { 'de-en': [], 'en-de': [], gender: [], cloze: [], grammar: [] };
  const shuffled = shuffle(scope, r);
  for (const w of shuffled) {
    if (kinds.includes('de-en')) { const i = vocabItem(w, pool, 'de-en', r); if (i) byKind['de-en'].push(i); }
    if (kinds.includes('en-de')) { const i = vocabItem(w, pool, 'en-de', r); if (i) byKind['en-de'].push(i); }
    if (kinds.includes('gender')) { const i = genderItem(w, r); if (i) byKind.gender.push(i); }
    if (kinds.includes('cloze')) { const i = clozeItem(w, pool, r); if (i) byKind.cloze.push(i); }
    // Enough candidates of each kind to fill the quiz several times over.
    if (Object.values(byKind).every((a) => a.length >= spec.n * 2)) break;
  }

  if (kinds.includes('grammar') && src.grammar) {
    const levels = cumulative ? LEVELS.slice(0, max + 1) : [spec.level];
    for (const level of levels) {
      for (const [pi, p] of (src.grammar[level] ?? []).entries()) {
        for (const [xi, ex] of p.exercises.entries()) {
          const i = grammarItem(level, p.title, pi, xi, ex, r);
          if (i) byKind.grammar.push(i);
        }
      }
    }
    byKind.grammar = shuffle(byKind.grammar, r);
  }

  // Round-robin, so the mix holds even when one kind is thin.
  const out: QuizItem[] = [];
  const cursors = new Map<QuizKind, number>(kinds.map((k) => [k, 0]));
  const seenIds = new Set<string>();
  let exhausted = false;
  while (out.length < spec.n && !exhausted) {
    exhausted = true;
    for (const k of kinds) {
      if (out.length >= spec.n) break;
      const list = byKind[k];
      let i = cursors.get(k)!;
      while (i < list.length && seenIds.has(list[i].id)) i++;
      cursors.set(k, i + 1);
      if (i >= list.length) continue;
      exhausted = false;
      seenIds.add(list[i].id);
      out.push(list[i]);
    }
  }
  return out;
}

/** The catalogue the test centre offers. Kept beside the builder so a new quiz
 *  kind cannot be added without deciding how it is described to a learner. */
export interface QuizPreset {
  key: string;
  label: string;
  blurb: string;
  kinds: QuizKind[];
  n: number;
  minutes: number;
}

export const PRESETS: QuizPreset[] = [
  { key: 'mixed', label: 'Mixed test', n: 12, minutes: 5, kinds: ['de-en', 'en-de', 'gender', 'cloze', 'grammar'],
    blurb: 'A bit of everything at your level — the closest short thing to a real paper.' },
  { key: 'vocab', label: 'Vocabulary', n: 10, minutes: 3, kinds: ['de-en', 'en-de'],
    blurb: 'Recognition and production, both directions.' },
  { key: 'gender', label: 'Der, die, das', n: 12, minutes: 3, kinds: ['gender'],
    blurb: 'The single most-tested thing in German, and the cheapest to lose marks on.' },
  { key: 'context', label: 'Words in context', n: 10, minutes: 4, kinds: ['cloze'],
    blurb: 'A gapped sentence and four real candidates — how Sprachbausteine actually works.' },
  { key: 'grammar', label: 'Grammar', n: 12, minutes: 4, kinds: ['grammar'],
    blurb: 'Drawn from every concept you have met at or below your level.' },
];
