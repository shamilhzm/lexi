// What share of a text can this learner actually read?
//
// BACKLOG Now #2 Phase 1. The 95/98% lexical coverage thresholds (Hu & Nation;
// Kremmel et al. 2023) are the most robust finding in reading-based SLA: below 95%
// a text needs help, at 98% it can be read independently. Every competitor
// approximates them — by CEFR band, by a word-form counter their own staff calls
// "the mechanical rabbit at a dog race", by a population average. FSRS state is a
// forgetting-aware per-lemma model, so Lexi can compute the number honestly, and
// honesty is the entire competitive claim.
//
// ## The denominator is where honesty lives
//
// Three decisions, because each one is a way to make the number flattering:
//
//  1. **Function words, ordinals and spelled-out cardinals are excluded.** Knowing
//     *und* or *achtzig* is not vocabulary knowledge, and counting them inflates
//     every text toward the same score. `isNeutralWord` already decides this.
//  2. **Structural proper nouns are excluded** via `isLikelyEntity` — but only the
//     structural ones (two or more capitals). **A capitalised-and-unresolvable
//     rule was measured and rejected**: German capitalises every noun, so it
//     reclassifies unresolved common nouns as names. Tried against the exam
//     papers it swept up `Vorschläge`, `Prüferin` and `Lesesaal` — 328 distinct
//     tokens, most of them real vocabulary — and raised the reported figure ~2.9
//     points while making it less true. See BACKLOG.
//  3. **A word the corpus has never heard of still counts against you.** It is a
//     word on the page the learner cannot read; excluding it would quietly rebase
//     the score on Lexi's own coverage and report the corpus's ignorance as the
//     learner's fluency. This is the single most important line in the file.
//
// ## Which index — measured, not assumed
//
// BACKLOG Now #2 says to build Phase 1 *on* Lesen "or the app ends up with two
// reading surfaces that disagree". The intent is one shared definition of *known*;
// building on `reader.ts`'s index would not have delivered it, because that index
// is strictly thinner than the matcher's. Measured head to head:
//
//   große / großen  matcher: groß        reader: (nothing)   adjective declension
//   Hunden          matcher: der Hund    reader: (nothing)   dative plural
//   Lehrerin        matcher: der Lehrer  reader: (nothing)   -in feminine
//
// A meter on the reader's index would report every inflected adjective and every
// feminine as a word the learner cannot read. So resolution goes through
// `buildMatcher` — which Phase 0 ported app-side for exactly this reason, "one
// implementation, so the meter and `corpus:coverage` cannot disagree about what
// known means". The remaining duplication is `reader.ts`'s own index, which should
// converge on the matcher; that is tracked in BACKLOG rather than done here,
// because it changes what Lesen selects as i+1 and deserves its own measurement.
import { isNeutralWord, isLikelyEntity } from './matcher.ts';
import { appMatcher, resetAppMatcher } from './appMatcher.ts';
import { freqRankOf } from './freq.ts';
import type { Word } from '../types.ts';

/** Kept as a named re-export so callers and tests do not need to know that the
 *  index is shared with the reading surface. */
export const resetCoverageIndex = resetAppMatcher;

/** Hu & Nation's bands. 98% reads independently; 95% reads with support. */
export const INDEPENDENT = 0.98;
export const ASSISTED = 0.95;

/** What the learner has done with a word, independent of how it is stored.
 *  Injected rather than read from the store, the way `reader.annotate` takes
 *  `familiar` — the caller owns the definition and the logic stays testable. */
export type WordState = 'known' | 'learning' | 'new';

export type TokenState =
  | WordState              // the corpus knows this word
  | 'compound'             // the corpus knows its *parts*, not the word itself
  | 'absent';              // the corpus does not — counted, never unlockable

export interface CoverageToken {
  text: string;
  isWord: boolean;
  /** The card this token belongs to, when the index recognises it. */
  word: Word | null;
  /** Whether this token is in the denominator. */
  counted: boolean;
  /** `null` for punctuation and excluded tokens. */
  state: TokenState | null;
  /** Set when the token only resolved after its umlauts were put back —
   *  *verfugung* read as *Verfügung*. The spelling it was read as, so the screen
   *  can say what it assumed. See `respell`. */
  respelled?: string;
}

export interface Unlock {
  word: Word;
  /** How often it appears in *this* text. */
  occurrences: number;
  /** Leipzig rank, lower is commoner. `null` when unranked. */
  rank: number | null;
  /** Recurrence here × how common it is generally. Higher is worth more. */
  score: number;
}

export interface Coverage {
  tokens: CoverageToken[];
  /** The denominator: content tokens, after exclusions. */
  counted: number;
  /** The numerator: counted tokens whose word is `known`. */
  known: number;
  learning: number;
  /** Recognised by the corpus, never studied — the unlockable ones. */
  fresh: number;
  /** Not in the corpus at all. Counts against coverage and cannot be unlocked. */
  absent: number;
  excluded: { neutral: number; entity: number };
  /** `known / counted`, or 0 for a text with no content tokens. */
  ratio: number;
  band: 'independent' | 'assisted' | 'frustrational';
  /** Counted tokens that must become known to reach each band. */
  toAssisted: number;
  toIndependent: number;
  /** Ranked best-first: study these to move the number most. */
  unlocks: Unlock[];
  /** The ratio if every unlockable word were known — capped by `absent`.
   *  Stated because a text can be unreachable and the learner deserves to know. */
  ceiling: number;
}

/** Tokens excluded from the denominator, and why. Exported so the read-back view
 *  can grey them out with the same rule the number uses. */
export function excludedReason(tok: string): 'neutral' | 'entity' | null {
  if (isNeutralWord(tok)) return 'neutral';
  if (isLikelyEntity(tok)) return 'entity';
  return null;
}

/** Part of a web or mail address — `www.glueckskette.ch`, `info@dw.com`. Real
 *  articles end with them, and "glueckskette" is not a German word the learner
 *  failed to know. Decided from the separators touching the token: a dot, `@`,
 *  colon or slash with no space, between two word tokens. */
const ADDRESS_SEP = /^[.@/:]$/;
function inAddress(segs: { text: string; isWord: boolean }[], i: number): boolean {
  const prev = segs[i - 1], next = segs[i + 1];
  if (prev && !prev.isWord && ADDRESS_SEP.test(prev.text) && segs[i - 2]?.isWord) return true;
  if (next && !next.isWord && ADDRESS_SEP.test(next.text) && segs[i + 2]?.isWord) return true;
  return false;
}

/** How many counted tokens short of `target` this text is. */
const shortfall = (known: number, counted: number, target: number) =>
  Math.max(0, Math.ceil(target * counted - known));

/** What an English keyboard does to a German word: *verfugung*, *einschatzung*,
 *  *uberrumpelt*, *strasse*, *fuer*. Every spelling reachable by putting one or
 *  two umlauts (or an ß) back, nearest first.
 *
 *  This exists because of how the app's first learner actually used it
 *  (2026-11-14): the word lists from a German class were typed on a US keyboard
 *  and pasted into a chat, not into Lexi, because Lexi called a third of them
 *  *not in the corpus*. They were in the corpus. */
export function respellings(tok: string): string[] {
  const spots: { at: number; len: number; to: string }[] = [];
  const lower = tok.toLowerCase();
  const up = (i: number, ch: string) => (tok[i] !== lower[i] ? ch.toUpperCase() : ch);
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i], two = lower.slice(i, i + 2);
    if (two === 'ae' || two === 'oe' || two === 'ue') spots.push({ at: i, len: 2, to: up(i, two === 'ae' ? 'ä' : two === 'oe' ? 'ö' : 'ü') });
    if (two === 'ss') spots.push({ at: i, len: 2, to: 'ß' });
    if (c === 'a' || c === 'o' || c === 'u') spots.push({ at: i, len: 1, to: up(i, c === 'a' ? 'ä' : c === 'o' ? 'ö' : 'ü') });
  }
  if (spots.length === 0 || spots.length > 8) return [];
  const apply = (picks: typeof spots) => {
    let out = tok;
    for (const p of [...picks].sort((a, b) => b.at - a.at)) out = out.slice(0, p.at) + p.to + out.slice(p.at + p.len);
    return out;
  };
  const out: string[] = spots.map((p) => apply([p]));
  for (let i = 0; i < spots.length; i++) {
    for (let j = i + 1; j < spots.length; j++) {
      if (spots[j].at < spots[i].at + spots[i].len) continue;      // overlapping (the u of «ue»)
      out.push(apply([spots[i], spots[j]]));
    }
  }
  return [...new Set(out)].filter((v) => v !== tok);
}

/** The one card a mistyped token can only mean, or null.
 *
 *  Asked only of a token the corpus could not read as written — so *schon* is
 *  never turned into *schön*, nor *fordern* into *fördern*: a spelling that is a
 *  word stays that word. And it must be unambiguous: where two respellings reach
 *  two different cards, the token stays unread rather than guessed. */
function respell(tok: string): { word: Word; as: string } | null {
  let hit: { word: Word; as: string } | null = null;
  for (const v of respellings(tok)) {
    const seg = appMatcher().annotate(v).find((s) => s.isWord);
    if (!seg?.word || seg.viaCompound) continue;
    if (hit && hit.word.id !== seg.word.id) return null;
    hit ??= { word: seg.word, as: v };
  }
  return hit;
}

/** One edit apart: a letter dropped, added, swapped for another, or two
 *  neighbours transposed. */
function withinOne(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;                                   // substitution
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);    // transposition
  }
  const [short, long] = la < lb ? [a, b] : [b, a];
  return short.slice(i) === long.slice(i + 1);                                             // one letter more
}

/** The one headword a token is a single slip away from — *erforden* → *erfordern*,
 *  *betreung* → *die Betreuung* — or null.
 *
 *  **A suggestion, never a reading.** `respell` may read a token on the learner's
 *  behalf because an umlaut typed as its base vowel is one keyboard's habit and
 *  the word it makes is not otherwise a word. A dropped letter is a guess: the
 *  token may be a real word Lexi simply does not teach, one letter from a card it
 *  does. So this is offered for a tap and counted as *absent* until taken.
 *
 *  Unique or nothing, headwords only, five letters and up — a short token is one
 *  edit from too many things (*zeck*: *Zweck*, *Zeck*, *Zecke*, *Deck*). */
export function nearHeadword(tok: string, pool: readonly Word[]): Word | null {
  const t = tok.toLowerCase();
  if (t.length < 5) return null;
  let hit: Word | null = null;
  // Only heads within one letter of the token's length can be one edit away.
  // Bucketed once per pool (2026-11-20): the scan stripped and lower-cased all
  // 11,220 terms for every missing token, a second for a long text.
  const byLen = headsByLength(pool);
  for (const len of [t.length - 1, t.length, t.length + 1]) {
    for (const { head, w } of byLen.get(len) ?? []) {
      if (!withinOne(t, head)) continue;
      if (hit && hit.term !== w.term) return null;
      hit ??= w;
    }
  }
  return hit;
}

const headCache = new WeakMap<readonly Word[], { size: number; byLen: Map<number, { head: string; w: Word }[]> }>();
function headsByLength(pool: readonly Word[]) {
  const c = headCache.get(pool);
  if (c && c.size === pool.length) return c.byLen;   // WORDS grows when a class pack lands
  const byLen = new Map<number, { head: string; w: Word }[]>();
  for (const w of pool) {
    if (w.kind !== 'word') continue;
    const head = w.term.replace(/^(der\/die|der|die|das|sich)\s+/i, '').toLowerCase();
    if (head.includes(' ')) continue;
    const list = byLen.get(head.length) ?? [];
    list.push({ head, w });
    byLen.set(head.length, list);
  }
  headCache.set(pool, { size: pool.length, byLen });
  return byLen;
}

/** The sentence of `text` that `tok` occurs in, flattened and trimmed — what a
 *  noted word carries as the place it was met. The scanner used to attach the
 *  text's first eighty characters to every word, which rarely held the word. */
export function sentenceAround(text: string, tok: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ');
  const m = new RegExp(`(?<!\\p{L})${tok.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}(?!\\p{L})`, 'u').exec(flat);
  if (!m) return flat.slice(0, max).trim();
  const start = Math.max(0, ...['. ', '! ', '? ', '; '].map((p) => flat.lastIndexOf(p, m.index) + p.length).filter((i) => i > 0 && i <= m.index));
  const ends = ['.', '!', '?', ';'].map((p) => flat.indexOf(p, m.index + tok.length)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : flat.length;
  const s = flat.slice(start, end).trim();
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}

export interface CoverageOptions {
  /** What the learner has done with a word the corpus knows. */
  stateOf: (w: Word) => WordState;
  /** Tokens shorter than this are skipped, matching the corpus scripts. */
  minLength?: number;
  /** Surface forms known to be proper names — looked up, not guessed (see
   *  `lib/news/names.ts`). Excluded like the structural entities above, but only
   *  when the corpus does not resolve the token: a name that is also a word the
   *  learner has (*Koch*) stays counted. The capitalised-and-unresolvable rule was
   *  rejected for sweeping up nouns; a dictionary saying "Nachname" is evidence, a
   *  capital letter is not. */
  names?: ReadonlySet<string>;
}

export function coverageOf(text: string, opts: CoverageOptions): Coverage {
  const { stateOf, minLength = 3, names } = opts;
  const tokens: CoverageToken[] = [];
  const excluded = { neutral: 0, entity: 0 };
  let counted = 0, known = 0, learning = 0, fresh = 0, absent = 0;
  // Occurrences are counted per *card*, not per surface form: `Vorschlag` and
  // `Vorschläge` in one text are one word to learn, worth two occurrences.
  const occurrences = new Map<string, { word: Word; n: number }>();

  const segs = appMatcher().annotate(text);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const tok = seg.text;
    if (!seg.isWord) { tokens.push({ text: tok, isWord: false, word: null, counted: false, state: null }); continue; }

    const skip = excludedReason(tok)
      ?? (!seg.word && names?.has(tok) ? 'entity' : null)
      ?? (inAddress(segs, i) ? 'entity' : null);
    // `Vor-` in *Vor- und Nachteile* is half of a word the text spells out next
    // to it (an Ergänzungsstrich), not a missing word to count or note.
    if (skip || /^\d/.test(tok) || tok.length < minLength || tok.endsWith('-')) {
      if (skip) excluded[skip]++;
      tokens.push({ text: tok, isWord: true, word: null, counted: false, state: null });
      continue;
    }

    // Read as written first; only a token nothing could read gets its umlauts back.
    const fixed = seg.word ? null : respell(tok);
    const word = seg.word ?? fixed?.word ?? null;
    // A compound the matcher could only decompose is its own state, and it is
    // **not** `known` however well the learner knows the head. *Schadenfreude* is
    // not a kind of joy; scoring it as read because *Freude* is read is the
    // meter telling somebody they understood a sentence they did not. It is not
    // `absent` either — they can get most of the way there — so it counts toward
    // the denominator and is shown as its own thing. See `Segment.viaCompound`.
    const state: TokenState = !word ? 'absent' : seg.viaCompound && !fixed ? 'compound' : stateOf(word);
    counted++;
    if (state === 'known') known++;
    else if (state === 'learning') learning++;
    else if (state === 'new') fresh++;
    else absent++;

    // No occurrence row for a compound: the unlock plan's promise is "learn these
    // cards and the text opens up", and learning *die Freude* does not unlock
    // *Schadenfreude*. Offering it would be the same wrong claim, priced as work.
    if (word && state !== 'known' && state !== 'compound') {
      const e = occurrences.get(word.id) ?? { word, n: 0 };
      e.n++;
      occurrences.set(word.id, e);
    }
    tokens.push({ text: tok, isWord: true, word, counted: true, state, ...(fixed ? { respelled: fixed.as } : {}) });
  }

  // Rank the unlockable words. "Frequency × recurrence in this text": recurrence
  // is what makes a word worth learning *for this text*, and general frequency
  // breaks ties toward words that will pay off in the next one too. An unranked
  // word scores on recurrence alone rather than being pushed to the bottom — 73%
  // of cards are unranked (BACKLOG Phase 0), so treating unranked as rarest would
  // sort most of the corpus by an accident of which cards predate the freq log.
  const unlocks: Unlock[] = [...occurrences.values()]
    .map(({ word, n }) => {
      const rank = freqRankOf(word.id);
      const commonness = rank ? 1 + 1 / Math.log10(rank + 10) : 1;
      return { word, occurrences: n, rank, score: n * commonness };
    })
    .sort((a, b) => b.score - a.score
      || (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
      || a.word.term.localeCompare(b.word.term));

  const ratio = counted ? known / counted : 0;
  const reachable = counted ? (counted - absent) / counted : 0;
  return {
    tokens, counted, known, learning, fresh, absent, excluded, ratio,
    band: ratio >= INDEPENDENT ? 'independent' : ratio >= ASSISTED ? 'assisted' : 'frustrational',
    toAssisted: shortfall(known, counted, ASSISTED),
    toIndependent: shortfall(known, counted, INDEPENDENT),
    unlocks,
    ceiling: reachable,
  };
}

/** The fewest words that carry the text to `target`, best-first.
 *
 *  Greedy over the ranked list, which is optimal here because every unlock adds
 *  its own occurrences and nothing interacts: taking the largest first always
 *  reaches the threshold in the fewest picks. Returns every unlock when the target
 *  is out of reach, so the caller can say "and it still would not be enough"
 *  rather than silently returning a set that does not do what it claims. */
export function unlocksToReach(cov: Coverage, target = ASSISTED): { picks: Unlock[]; reaches: boolean } {
  const need = shortfall(cov.known, cov.counted, target);
  if (need <= 0) return { picks: [], reaches: true };
  const picks: Unlock[] = [];
  let gained = 0;
  for (const u of cov.unlocks) {
    if (gained >= need) break;
    picks.push(u);
    gained += u.occurrences;
  }
  return { picks, reaches: gained >= need };
}
