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
import { buildMatcher, isNeutralWord, isLikelyEntity, type Matcher } from './matcher.ts';
import { WORDS } from '../data/index.ts';
import { freqRankOf } from './freq.ts';
import type { Word } from '../types.ts';

// The lexicon is not fixed at boot — `initData` replaces `WORDS` and
// `registerWords` appends — so the index carries its own provenance and rebuilds
// itself, the same pattern `reader.ts` uses for the same reason.
let cached: Matcher | null = null;
let builtFrom: Word[] | null = null;
let builtLen = 0;
function matcher(): Matcher {
  if (!cached || builtFrom !== WORDS || builtLen !== WORDS.length) {
    cached = buildMatcher(WORDS);
    builtFrom = WORDS;
    builtLen = WORDS.length;
  }
  return cached;
}
/** Force a rebuild. Tests need this when swapping a lexicon of the same length. */
export function resetCoverageIndex() { cached = null; builtFrom = null; builtLen = 0; }

/** Hu & Nation's bands. 98% reads independently; 95% reads with support. */
export const INDEPENDENT = 0.98;
export const ASSISTED = 0.95;

/** What the learner has done with a word, independent of how it is stored.
 *  Injected rather than read from the store, the way `reader.annotate` takes
 *  `familiar` — the caller owns the definition and the logic stays testable. */
export type WordState = 'known' | 'learning' | 'new';

export type TokenState =
  | WordState              // the corpus knows this word
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

/** How many counted tokens short of `target` this text is. */
const shortfall = (known: number, counted: number, target: number) =>
  Math.max(0, Math.ceil(target * counted - known));

export interface CoverageOptions {
  /** What the learner has done with a word the corpus knows. */
  stateOf: (w: Word) => WordState;
  /** Tokens shorter than this are skipped, matching the corpus scripts. */
  minLength?: number;
}

export function coverageOf(text: string, opts: CoverageOptions): Coverage {
  const { stateOf, minLength = 3 } = opts;
  const tokens: CoverageToken[] = [];
  const excluded = { neutral: 0, entity: 0 };
  let counted = 0, known = 0, learning = 0, fresh = 0, absent = 0;
  // Occurrences are counted per *card*, not per surface form: `Vorschlag` and
  // `Vorschläge` in one text are one word to learn, worth two occurrences.
  const occurrences = new Map<string, { word: Word; n: number }>();

  for (const seg of matcher().annotate(text)) {
    const tok = seg.text;
    if (!seg.isWord) { tokens.push({ text: tok, isWord: false, word: null, counted: false, state: null }); continue; }

    const skip = excludedReason(tok);
    if (skip || /^\d/.test(tok) || tok.length < minLength) {
      if (skip) excluded[skip]++;
      tokens.push({ text: tok, isWord: true, word: null, counted: false, state: null });
      continue;
    }

    const word = seg.word;
    const state: TokenState = word ? stateOf(word) : 'absent';
    counted++;
    if (state === 'known') known++;
    else if (state === 'learning') learning++;
    else if (state === 'new') fresh++;
    else absent++;

    if (word && state !== 'known') {
      const e = occurrences.get(word.id) ?? { word, n: 0 };
      e.n++;
      occurrences.set(word.id, e);
    }
    tokens.push({ text: tok, isWord: true, word, counted: true, state });
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
