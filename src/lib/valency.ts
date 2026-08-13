// Verb government — `warten auf` + Akkusativ.
//
// Which preposition a verb takes, and which case that preposition then governs,
// is most of what separates comprehension from production at B1+. A learner who
// knows *warten* and not *warten auf + A* cannot say the sentence. The critique
// put it as: **1,199 verb cards that do not know their own preposition.**
//
// ## The thing that does not work, recorded so it is not tried again
//
// The obvious move is to mine it from the corpus's own 16,000 example sentences:
// find the verb, look for a preposition after it. Measured on 2026-08-13, that
// fires on 238 verbs (20%) and is **almost entirely wrong**, because German
// sentences are full of prepositional phrases that have nothing to do with the
// verb's government:
//
//   gehen nach     ← "Ich gehe nach Hause."          directional adverbial
//   trinken bei    ← "Trink genug Wasser bei der Hitze."   circumstantial
//   heißen auf     ← "Wie heißt das auf Deutsch?"    fixed adverbial phrase
//   verstehen bei  ← "Ich verstehe dich nicht bei dem Lärm."
//   denken an      ← "Ich denke an dich."            ✅ actually valency
//
// Roughly one in twelve is real. A mined field would attach wrong grammar to
// hundreds of cards and a drill built on it would teach *"trinken bei"* — which
// is the one thing this codebase never does. So nothing here is mined. See
// docs/LESSONS.md class 2.
//
// ## What is derivable
//
// Two things, both facts rather than inferences:
//
//   1. **The authored headwords.** 33 cards already say `verzichten auf + A` in
//      their own term. That is verified data sitting in a string the app cannot
//      use; parsing it costs nothing and loses nothing.
//   2. **The case, for one-way prepositions only.** `aus/bei/mit/nach/von/zu/seit`
//      are always dative and `für/um/durch/gegen/ohne` are always accusative, so a
//      card reading `beitragen zu` can be completed to `+ D` by rule. The
//      **two-way** prepositions (an, auf, in, über, unter, vor, neben, hinter,
//      zwischen) cannot: which case they take *is* the verb's government, and
//      that is exactly the fact we are missing. Those are refused, not guessed.
import type { Word } from '../types.ts';

export type Kase = 'Akkusativ' | 'Dativ';

export interface Valency {
  /** The verb without its preposition — "warten". */
  verb: string;
  /** The preposition it governs — "auf". */
  prep: string;
  /** The case, when it is known. Null for a two-way preposition with no
   *  authored marker, because guessing it is the whole error. */
  kase: Kase | null;
}

/** Prepositions whose case never depends on the verb. */
const ALWAYS_DATIVE = new Set(['aus', 'bei', 'mit', 'nach', 'von', 'zu', 'seit', 'gegenüber', 'ab']);
const ALWAYS_ACCUSATIVE = new Set(['für', 'um', 'durch', 'gegen', 'ohne', 'bis']);
/** Two-way: the case is the verb's government, which is the fact being sought. */
const TWO_WAY = new Set(['an', 'auf', 'in', 'über', 'unter', 'vor', 'neben', 'hinter', 'zwischen']);

/** Every preposition this module recognises at the end of a headword. */
const PREPS = new Set([...ALWAYS_DATIVE, ...ALWAYS_ACCUSATIVE, ...TWO_WAY]);

const CASE_OF: Record<string, Kase> = { A: 'Akkusativ', D: 'Dativ' };

/** Read a verb card's government out of its headword.
 *
 *  Handles both shapes the corpus actually contains:
 *    `verzichten auf + A`  — authored, case explicit
 *    `beitragen zu`        — preposition only; case filled by rule where the
 *                            preposition allows it, left null where it does not.
 *
 *  Returns null for a verb with no preposition, which is most of them. */
export function parseValency(term: string): Valency | null {
  const t = term.trim();
  // Explicit marker first — an authored "+ A" always wins over the rule below,
  // because a two-way preposition's case is only ever knowable this way.
  const marked = /^(.*?)\s+([a-zäöüß]+)\s*\+\s*([AD])$/i.exec(t);
  if (marked) {
    const prep = marked[2].toLowerCase();
    if (!PREPS.has(prep)) return null;
    return { verb: marked[1].trim(), prep, kase: CASE_OF[marked[3].toUpperCase()] };
  }

  const bare = /^(.*?)\s+([a-zäöüß]+)$/i.exec(t);
  if (!bare) return null;
  const prep = bare[2].toLowerCase();
  if (!PREPS.has(prep)) return null;
  const verb = bare[1].trim();
  // A one-word "term" like "auf" is a preposition card, not a verb + preposition.
  if (!verb || !/\s|[a-zäöüß]{3}/i.test(verb)) return null;

  const kase = ALWAYS_DATIVE.has(prep) ? 'Dativ'
    : ALWAYS_ACCUSATIVE.has(prep) ? 'Akkusativ'
    : null; // two-way, and nothing authored it — refuse rather than guess
  return { verb, prep, kase };
}

/** The government of a card, or null when it has none or is not a verb. */
export function valencyOf(w: Word): Valency | null {
  if (w.kind !== 'word' || w.pos !== 'verb') return null;
  return parseValency(w.term);
}

/** How to say it on a card: "warten auf + Akkusativ", or "beitragen zu + Dativ",
 *  or just "zurückführen auf" when the case is not known.
 *
 *  Deliberately never prints a case it had to guess — a learner reading a case
 *  off a card will believe it, and a wrong one here is worse than a missing one. */
export function valencyLabel(v: Valency): string {
  return v.kase ? `${v.verb} ${v.prep} + ${v.kase}` : `${v.verb} ${v.prep}`;
}
