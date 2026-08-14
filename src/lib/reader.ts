// Lesen — the reading half of the app.
//
// Everything Lexi does is retrieval: it asks, you answer, it schedules. Nothing
// ever gives the learner *input* — a sentence to simply read and understand. That
// is half of how a language is acquired, and it is the half a flashcard app
// structurally omits.
//
// The material already exists. The corpus ships 16,201 example sentences, and
// `statusOf` already knows which words the learner has met. What was missing is the
// join: which of those sentences can this person read *today*.
//
// The target is deliberately i+1 — a sentence where every word is familiar except
// one. That is the band where meaning is recoverable from context, which is what
// makes reading teach rather than merely test; a sentence with four unknown words
// is a vocabulary list in disguise, and one with none teaches nothing new.
import { WORDS } from '../data/index.ts';
import { conjugate, canConjugate } from './conjugate.ts';
import { pluralForm } from './matcher.ts';
import { appMatcher } from './appMatcher.ts';
import type { Word } from '../types.ts';

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** Word-ish runs, keeping punctuation as separators so a sentence can be
 *  reassembled exactly as written. German letters count as letters — see the
 *  `\b` note in views/Fundamentals.tsx for why this can't use \w. */
export function tokenize(sentence: string): { text: string; isWord: boolean }[] {
  return sentence.split(/([\p{L}\p{N}­-]+)/u)
    .filter((s) => s !== '')
    .map((text) => ({ text, isWord: /[\p{L}\p{N}]/u.test(text) }));
}

// ---- the surface index ----------------------------------------------------
// Reading needs the opposite lookup from the rest of the app: not "what forms does
// this card have" but "which card is this word on the page". German inflects
// heavily, so a bare term index would miss most of a real sentence — `ging` is
// `gehen`, `Bücher` is `das Buch`.
//
// So the index is built from the forms the app can already derive with certainty:
// every headword, every stored plural, and for every conjugable verb its full
// paradigm. Adjective declension is deliberately absent — the app has no reliable
// generator for it, and a guessed form would attach the wrong card to a word.
let exact: Map<string, Word> | null = null;
let lower: Map<string, Word> | null = null;

// What the maps above were built from. The lexicon is not fixed at boot: `initData`
// replaces `WORDS` wholesale, and `registerWords` appends to it whenever a learner
// imports a class pack or mines a word. A build-once index would go stale silently —
// the new words stay invisible to Lesen's i+1 selection until a full page reload —
// and the alternative, making every writer remember to invalidate it, is a rule that
// holds until the next writer. So the cache carries its own provenance and rebuilds
// itself, the same way `useBrain`'s field keys on `WORDS.length`.
let builtFrom: Word[] | null = null;
let builtLen = 0;
const stale = () => !exact || builtFrom !== WORDS || builtLen !== WORDS.length;

function build(): void {
  const e = new Map<string, Word>(), l = new Map<string, Word>();
  // First writer wins: WORDS is level-ordered, so A1 claims the common forms and a
  // rarer homograph can't steal `sie` or `war` from the word a learner means.
  const put = (surface: string, w: Word) => {
    const s = surface.trim();
    if (!s) return;
    if (!e.has(s)) e.set(s, w);
    const k = s.toLowerCase();
    if (!l.has(k)) l.set(k, w);
  };
  for (const w of WORDS) {
    if (w.kind !== 'word') continue;
    put(stripArticle(w.term), w);
    // `pluralForm`, not the raw field. The corpus writes plurals six ways and this
    // used to index whatever the field said: a card reading `¨-e` contributed the
    // literal surface form `"¨-e"` and `Vorschläge` was never indexed at all — 390
    // cards affected. `matcher.ts` had the same bug and was fixed first, which is
    // precisely how Lesen and the meter end up disagreeing about what "known"
    // means. Both indexes now expand through one function; `reader.test.ts` asserts
    // they agree.
    const pl = pluralForm(w.term, w.plural);
    if (pl) put(pl, w);
    if (w.pos === 'verb' && canConjugate(w.term)) {
      const c = conjugate(w.term);
      put(c.infinitive, w);
      put(c.partizip, w);
      for (const tense of [c.praesens, c.praeteritum] as const) for (const f of tense) put(f, w);
      // Perfekt/Futur/Konjunktiv are auxiliary + a form already indexed above, so
      // indexing the phrase would only add multi-word keys a token can never match.
    }
  }
  exact = e; lower = l; builtFrom = WORDS; builtLen = WORDS.length;
}

/** All surface forms, lowercased. Exposed for inspection and tests. */
export function surfaceIndex(): Map<string, Word> {
  if (stale()) build();
  return lower!;
}

/** The card a token on the page belongs to.
 *
 *  Case is checked before the lowercase fallback, because German capitalises nouns
 *  and that is free disambiguation the index would otherwise throw away: without
 *  it `Essen` resolves to the verb `essen`, `Reisen` to the noun `die Reise`, and
 *  a reader would be told the new word in "Das Essen ist gut" is a verb. */
export function lookupSurface(token: string): Word | null {
  if (stale()) build();
  // The maps above answer first, and that ordering is the whole design: they carry
  // the case disambiguation the matcher does not have, so `Essen` stays the noun
  // and `Morgen` stays the morning. Measured over one example per card, the two
  // indexes disagree on 520 of 32,713 tokens and the reader is right about the
  // capitalised ones.
  //
  // The matcher then catches what the maps miss — **2,076 tokens, 6.3%** — because
  // it generates adjective declension, dative plurals and `-in` feminines that this
  // index never did: `große`, `Hunden` and `Lehrerin` were all reported to the
  // learner as words they do not know. Fallback rather than replacement, so nothing
  // that resolves today can start resolving differently.
  const hit = exact!.get(token) ?? lower!.get(token.toLowerCase());
  if (hit) return hit;
  return appMatcher().annotate(token).find((s) => s.isWord)?.word ?? null;
}

/** Force the next lookup to rebuild. Only tests need this — production growth of
 *  the lexicon is picked up by `stale()` — but a test can swap the lexicon for one
 *  of the same length, which identity alone would miss. */
export function resetSurfaceIndex() { exact = null; lower = null; builtFrom = null; builtLen = 0; }

export interface ReadToken {
  text: string;
  isWord: boolean;
  /** The card this token belongs to, when the index recognises it. */
  word: Word | null;
  /** A recognised word the learner has not started yet. */
  unknown: boolean;
}

export interface Readable {
  /** The card the sentence was taken from. */
  source: Word;
  de: string;
  en: string;
  tokens: ReadToken[];
  /** Recognised words the learner hasn't met, de-duplicated. */
  unknownWords: Word[];
}

/** Annotate a sentence against what the learner has already met.
 *
 *  `familiar` decides membership rather than a status enum, so the caller owns the
 *  definition — Today counts "learning" as familiar, because a word you are
 *  currently studying is exactly the one you want to meet in a sentence. */
export function annotate(sentence: string, familiar: (w: Word) => boolean): ReadToken[] {
  return tokenize(sentence).map(({ text, isWord }) => {
    const word = isWord ? lookupSurface(text) : null;
    return { text, isWord, word, unknown: !!word && !familiar(word) };
  });
}

export interface PickOptions {
  /** True when the learner has already met this word. */
  familiar: (w: Word) => boolean;
  /** True when this card is in scope (the CEFR filter). */
  inScope: (w: Word) => boolean;
  /** How many sentences to return. */
  limit?: number;
  /** The i+1 target: at most this many unrecognised-but-known-to-the-corpus words. */
  maxUnknown?: number;
  /** Sentences shorter than this teach nothing; longer ones stop being readable. */
  minTokens?: number;
  maxTokens?: number;
  /** How many words the index may fail to recognise before the sentence is
   *  dropped. Unrecognised is not the same as unknown — it is the app's blind
   *  spot, not the learner's — but a sentence full of them is being advertised as
   *  easier than it is, so the hidden difficulty has to stay bounded. Two keeps
   *  about two thirds of the corpus in play. */
  maxUnrecognised?: number;
  rnd?: () => number;
}

/** Sentences the learner can almost read, hardest-but-still-readable first.
 *
 *  "Almost" is the whole point: a sentence with zero unknown words is a victory lap
 *  and a sentence with four is a vocabulary list, so the default band is one or two
 *  — and one is preferred, which is why the sort is by unknown count ascending
 *  *after* the zero-unknown ones are dropped. */
export function pickReadable(opts: PickOptions): Readable[] {
  const {
    familiar, inScope, limit = 6, maxUnknown = 2,
    minTokens = 4, maxTokens = 14, maxUnrecognised = 2, rnd = Math.random,
  } = opts;

  const out: Readable[] = [];
  for (const w of WORDS) {
    if (w.kind !== 'word' || !inScope(w)) continue;
    for (const ex of w.ex ?? []) {
      if (!ex.de) continue;
      const tokens = annotate(ex.de, familiar);
      const words = tokens.filter((t) => t.isWord);
      if (words.length < minTokens || words.length > maxTokens) continue;

      // A token the corpus has never heard of (a name, a declined adjective) is
      // the app's blind spot rather than the learner's, so it does not count as a
      // *new word* — but too many of them mean the sentence is harder than the
      // count claims, so they are capped separately.
      if (words.filter((t) => !t.word).length > maxUnrecognised) continue;

      const unknown: Word[] = [];
      for (const t of words) {
        if (t.unknown && t.word && !unknown.some((u) => u.id === t.word!.id)) unknown.push(t.word);
      }
      if (unknown.length === 0 || unknown.length > maxUnknown) continue;

      out.push({ source: w, de: ex.de, en: ex.en ?? '', tokens, unknownWords: unknown });
    }
  }

  // Shuffle, then stable-sort by difficulty: the learner gets a different set each
  // time, but always the most readable of it first.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  out.sort((a, b) => a.unknownWords.length - b.unknownWords.length);
  return out.slice(0, limit);
}
