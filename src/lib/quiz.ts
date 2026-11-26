// Quizzes, generated — so every level has tests on day one.
//
// The exam surface shipped as one authored telc B1 paper, which shaped the whole
// room around a 150-minute commitment at a single level. Two things were wrong
// with that. A learner who has twenty minutes cannot use it at all, and A1, A2,
// B2, C1 and C2 got an empty shelf and an apology.
//
// This is the other half: short tests **generated from the corpus**, so a learner at any level can be tested today, and an authored paper
// becomes the deep end rather than the only end. The five kinds below map onto
// what certificate exams actually test — recognition, production, gender and
// contextual choice — and every one tests a property of a word, which is the
// vocabulary ruling (VISION). The grammar kind went with the grammar bank on
// 2026-09-05 and did not come back with the room on 2026-11-26.
//
// ## Deterministic by construction
//
// Every builder takes a seeded RNG. A quiz is reproducible from its seed, which
// is what lets the tests below assert real behaviour instead of "it returned five
// things", and what lets a learner retry *the same* quiz rather than a new one
// that happens to be easier.
import type { CEFR, Word } from '../types.ts';

export type QuizKind = 'de-en' | 'en-de' | 'gender' | 'cloze';

export interface QuizItem {
  /** Stable within a quiz; the card or exercise id it came from. */
  id: string;
  kind: QuizKind;
  /** What the learner reads. German for de-en/cloze, English for en-de. */
  prompt: string;
  /** Secondary line: the translation a cloze came from, the gloss of a gender
   *  item. Never the answer. */
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

// ---- the builders ----------------------------------------------------------

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const sensesOf = (en: string) => new Set((en || '').split(/\s*[;,/]\s*/).map(key).filter(Boolean));

/** A band word with the keys the builders compare on, computed once per band. */
interface Rival { w: Word; first: string; senses: Set<string>; bare: string; syn: Set<string> }
const rival = (w: Word): Rival => ({
  w, first: key(firstSense(w.en)), senses: sensesOf(w.en), bare: key(stripArticle(w.term)),
  syn: new Set((w.syn ?? []).map((t) => key(stripArticle(t)))),
});

/** The band a quiz draws wrong answers from, whole and by part of speech. */
interface Band { all: Rival[]; byPos: Map<string, Rival[]> }

/** Can `x` stand beside `me` as a wrong answer without being a second right one?
 *  Not the same word, nothing glossed with one of its senses, and none of its
 *  synonyms, asked both ways round because the corpus often lists a synonym on one
 *  card only. Two cards glossed "to start" make an en-de item with two keys. */
const fits = (me: Rival, x: Rival) => x.w.id !== me.w.id && x.bare !== me.bare
  && !me.senses.has(x.first) && !x.senses.has(me.first)
  && !me.syn.has(x.bare) && !x.syn.has(me.bare);

/**
 * Three wrong answers for `w`, as the options will show them (2026-11-26).
 *
 * **The same part of speech.** On the phone, *Nigeria* stood among "to do a
 * doctorate", "post-war period" and "to mark": the one name among verbs and
 * phrases, so the shape of the options gave the answer away. The meaning drill has
 * always kept to one part of speech (`meaningOptions`), and the quiz had not. The
 * whole band is a fallback for a part of speech too thin to fill an item, except
 * in a gap, where a word of another class is a giveaway in itself (`strict`).
 *
 * **Drawn, not shuffled.** A band is thousands of words and an item needs three.
 * Shuffling the whole band for every item, as this did, made a quiz take seconds.
 */
function rivalsFor(w: Word, band: Band, show: (x: Rival) => string, correct: string,
  r: () => number, strict = false): string[] {
  const me = rival(w);
  const out: string[] = [];
  const seen = new Set([key(correct)]);
  const draw = (list: Rival[]) => {
    for (let tries = 0; tries < 60 && out.length < 3 && list.length; tries++) {
      const x = list[Math.floor(r() * list.length)];
      if (!fits(me, x)) continue;
      const text = show(x);
      if (!text || seen.has(key(text))) continue;
      seen.add(key(text));
      out.push(text);
    }
  };
  draw(band.byPos.get(w.pos) ?? []);
  if (!strict) draw(band.all);
  return out;
}

function vocabItem(w: Word, band: Band, dir: 'de-en' | 'en-de', r: () => number): QuizItem | null {
  const gloss = firstSense(w.en);
  if (!gloss) return null;
  // Spelled the same in both languages (*Nigeria*, *das Hotel*): the item asks
  // nothing in either direction, so it is not asked.
  if (key(stripArticle(w.term)) === key(gloss)) return null;
  if (dir === 'de-en') {
    const { options, answer } = mc(gloss, rivalsFor(w, band, (x) => firstSense(x.w.en), gloss, r), r);
    return {
      id: w.id, kind: 'de-en', level: w.level, prompt: w.term, options, answer,
      why: [`${w.term} — ${w.en}`, shortDef(w.def)].filter(Boolean).join('. '),
    };
  }
  const { options, answer } = mc(w.term, rivalsFor(w, band, (x) => x.w.term, w.term, r), r);
  return {
    id: w.id, kind: 'en-de', level: w.level, prompt: gloss, options, answer,
    why: `${w.term} — ${w.en}`,
  };
}

const GENDER_WHY: Record<string, string> = {
  der: 'masculine', die: 'feminine', das: 'neuter',
};

// Always der · die · das, in that order — the order of the drills' gender keys,
// so the hand learns where each article lives. Shuffling three options per item
// (as this did until 2026-11-26) made every question a reading test first.
function genderItem(w: Word): QuizItem | null {
  if (w.pos !== 'noun' || !w.gender) return null;
  const options = ['der', 'die', 'das'];
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
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function clozeItem(w: Word, band: Band, r: () => number): QuizItem | null {
  const surface = stripArticle(w.term);
  if (surface.length < 3) return null;
  // As a whole word, not a substring (2026-11-26): `includes` blanked "Rat" inside
  // "Ratgeber" and left "____e" where the sentence had "Tische" — an item whose gap
  // was not the word. An inflected example is skipped rather than half-blanked.
  const whole = new RegExp(`(?<!\\p{L})${escapeRe(surface)}(?!\\p{L})`, 'u');
  const ex = (w.ex ?? []).find((e) => e.de && whole.test(e.de));
  if (!ex) return null;
  const gapped = ex.de.replace(whole, '____');
  if (gapped === ex.de) return null;
  // A synonym would fit the gap as well as the key, so `fits` keeps it out.
  const { options, answer } = mc(surface, rivalsFor(w, band, (x) => stripArticle(x.w.term), surface, r, true), r);
  return {
    id: `${w.id}#cloze`, kind: 'cloze', level: w.level,
    prompt: gapped, sub: ex.en || undefined, options, answer,
    why: `${ex.de}${ex.en ? ` — ${ex.en}` : ''}`,
  };
}

// ---- the mixer -------------------------------------------------------------

/** The band at or below a level, keyed once and kept: the room builds a quiz on
 *  every tap, and the corpus does not change between them. */
let bandCache: { words: Word[]; max: number; band: Band } | null = null;
function bandFor(words: Word[], max: number): Band {
  if (bandCache?.words === words && bandCache.max === max) return bandCache.band;
  const all = words.filter((w) => w.kind === 'word' && LEVELS.indexOf(w.level) <= max).map(rival);
  const byPos = new Map<string, Rival[]>();
  for (const x of all) {
    const list = byPos.get(x.w.pos);
    if (list) list.push(x); else byPos.set(x.w.pos, [x]);
  }
  bandCache = { words, max, band: { all, byPos } };
  return bandCache.band;
}

export interface QuizSources {
  words: Word[];
}

/**
 * Build a quiz. Draws round-robin across the requested kinds so a ten-item quiz
 * is a mix rather than ten of whatever was most abundant, and degrades quietly:
 * a card set with no examples, or no nouns, simply
 * yields fewer of that kind rather than failing.
 */
export function buildQuiz(spec: QuizSpec, src: QuizSources): QuizItem[] {
  const r = rng(spec.seed ?? 1);
  const kinds = spec.kinds?.length ? spec.kinds : (['de-en', 'en-de', 'gender', 'cloze'] as QuizKind[]);
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
  const band = bandFor(src.words, max);

  const byKind: Record<QuizKind, QuizItem[]> = { 'de-en': [], 'en-de': [], gender: [], cloze: [] };
  const shuffled = shuffle(scope, r);
  for (const w of shuffled) {
    if (kinds.includes('de-en')) { const i = vocabItem(w, band, 'de-en', r); if (i) byKind['de-en'].push(i); }
    if (kinds.includes('en-de')) { const i = vocabItem(w, band, 'en-de', r); if (i) byKind['en-de'].push(i); }
    if (kinds.includes('gender')) { const i = genderItem(w); if (i) byKind.gender.push(i); }
    if (kinds.includes('cloze')) { const i = clozeItem(w, band, r); if (i) byKind.cloze.push(i); }
    // Enough candidates of each *requested* kind to fill the quiz several times
    // over. Until 2026-11-26 this asked all four kinds, so a quiz of fewer kinds
    // never stopped early and built an item from every card in the band.
    if (kinds.every((k) => byKind[k].length >= spec.n * 2)) break;
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
  { key: 'mixed', label: 'Gemischt', n: 12, minutes: 5, kinds: ['de-en', 'en-de', 'gender', 'cloze'],
    blurb: 'A bit of everything at your level — meaning both ways, gender and words in context.' },
  { key: 'vocab', label: 'Wortschatz', n: 10, minutes: 3, kinds: ['de-en', 'en-de'],
    blurb: 'Recognition and production, both directions.' },
  { key: 'gender', label: 'Der, die, das', n: 12, minutes: 3, kinds: ['gender'],
    blurb: 'The single most-tested thing in German, and the cheapest to lose marks on.' },
  { key: 'context', label: 'Im Kontext', n: 10, minutes: 4, kinds: ['cloze'],
    blurb: 'A gapped sentence and four real candidates — how Sprachbausteine actually works.' },
];
