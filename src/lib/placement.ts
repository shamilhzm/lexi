// The placement test's honesty layer.
//
// Placement asks "do you know this word?" and believes the answer. That is a
// **Yes/No vocabulary test**, an instrument with one well-documented failure mode
// — *overclaiming* — and one standard correction, which Lexi did not have.
//
// The failure matters more here than in a paper test, because the output is not
// only a level: every word the learner ticks is seeded into FSRS as consolidated.
// A confident learner therefore corrupted their own schedule at minute one, and
// a modest one under-placed. Nothing downstream could tell.
//
// ## The correction
//
// Mix in words that do not exist. A learner cannot *know* an invented word, so
// every "I know it" on one is a false alarm, and the false-alarm rate is a direct
// measure of how much the yes-responses are worth. The standard adjustment
// (Meara & Buxton 1987; Mochida & Harrington 2006) rescales the hit rate by it:
//
//     corrected = (hits − falseAlarms) / (1 − falseAlarms)
//
// A learner who ticks nothing invented keeps their raw score. One who ticks half
// the invented words has their score halved, because half of it was noise.
//
// ## Why the foils are authored, not generated
//
// A generator that mutates real words will eventually emit a real word, and
// telling a learner that *Kringel* is invented — then quietly counting their
// correct answer as evidence they overclaim — is the same defect class as a drill
// marking correct German wrong. So the list is hand-written and hand-checked, and
// `placement.test.ts` pins that none of them appear in the shipped corpus. That
// check is a backstop, not a proof: the corpus is 6,472 words and German is not,
// so anything added here must be looked up in a real dictionary first.
//
// The residual risk is bounded and points the safe way. If a foil turned out to
// be a real word, the learner who knows it records one false alarm, which
// *lowers* their corrected score — the test under-places rather than over-places,
// and under-placing costs a learner some easy cards while over-placing costs them
// a schedule full of words they cannot read.

/** German-shaped words that do not exist.
 *
 *  Chosen to be plausible and *not* near-neighbours of real words: a foil one
 *  letter from a real word tests spelling, not vocabulary, and a learner who
 *  ticks it was right about the language and wrong about the typo. Nouns carry an
 *  article so they render exactly like a real prompt. */
export const FOILS: { term: string; gender: 'der' | 'die' | 'das' | null }[] = [
  { term: 'der Trabusch', gender: 'der' },
  { term: 'die Wanklerei', gender: 'die' },
  { term: 'das Krendel', gender: 'das' },
  { term: 'der Flimsel', gender: 'der' },
  { term: 'das Prunzel', gender: 'das' },
  { term: 'die Zwenkung', gender: 'die' },
  { term: 'das Grombel', gender: 'das' },
  { term: 'der Malbicht', gender: 'der' },
  { term: 'die Torgelung', gender: 'die' },
  { term: 'das Ninkel', gender: 'das' },
  { term: 'blaschen', gender: null },
  { term: 'verkrunzeln', gender: null },
  { term: 'tirmen', gender: null },
  { term: 'gnorpfen', gender: null },
  { term: 'plunzen', gender: null },
  { term: 'zerknaupen', gender: null },
  { term: 'grabselig', gender: null },
  { term: 'flanksam', gender: null },
  { term: 'quandelig', gender: null },
  { term: 'twarkig', gender: null },
  { term: 'nurbig', gender: null },
  { term: 'krimbisch', gender: null },
];

/** Real words probed per level.
 *
 *  Was five, which is below the resolution of the decision it makes: on five
 *  binary items with a 60% cut, three-versus-two moves the learner a whole CEFR
 *  band, and one lucky cognate is twenty percentage points. Seven does not make
 *  this a psychometric instrument — it makes the granularity finer than the
 *  band it is reporting, which is the minimum bar.
 *
 *  The cost is length, and it is affordable now for a reason that was not true
 *  when this test was written: the first run leads with a ten-card session and
 *  *then* offers placement, so this is no longer the thing standing between a
 *  cold learner and their first German word. */
export const PER_LEVEL = 7;

/** Invented words mixed into each level's batch. Two per level gives a usable
 *  false-alarm rate by the second level without spending much of the test on
 *  items that teach nothing. */
export const FOILS_PER_LEVEL = 2;

/** Recognition rate needed to climb, applied to the **corrected** score. */
export const PASS = 0.6;

/** False-alarm rate above which the self-report is not evidence.
 *
 *  At a third of invented words ticked, "I know it" has stopped meaning
 *  recognition, and seeding FSRS from it would write a schedule the learner
 *  cannot meet. The level still gets reported — a corrected score is still the
 *  best estimate available — but nothing is seeded from an unreliable claim. */
export const TRUST_CEILING = 1 / 3;

/** Rescale a hit rate by the false-alarm rate that came with it.
 *
 *  Both inputs are rates in 0..1. Returns 0..1. A learner who ticked every
 *  invented word has `f === 1` and no recoverable signal, so the result is 0
 *  rather than a division by zero. */
export function correctedRate(hitRate: number, falseAlarmRate: number): number {
  const h = Math.min(1, Math.max(0, hitRate));
  const f = Math.min(1, Math.max(0, falseAlarmRate));
  if (f >= 1) return 0;
  return Math.min(1, Math.max(0, (h - f) / (1 - f)));
}

/** Is this learner's "I know it" worth writing into their schedule? */
export function trustsSelfReport(falseAlarms: number, foilsSeen: number): boolean {
  if (foilsSeen === 0) return true;      // nothing measured; fall back to trusting
  return falseAlarms / foilsSeen <= TRUST_CEILING;
}

/** How the result should describe the learner's own reporting, or null when
 *  there is nothing worth saying. Kept here so the wording is testable and so
 *  the test never implies the learner cheated — they answered a hard question
 *  about themselves, and the instrument is what has to cope. */
export function selfReportNote(falseAlarms: number, foilsSeen: number): string | null {
  if (foilsSeen === 0 || falseAlarms === 0) return null;
  const rate = falseAlarms / foilsSeen;
  if (rate <= TRUST_CEILING) {
    return `You marked ${falseAlarms} invented word${falseAlarms === 1 ? '' : 's'} as known — that is normal, and your level is adjusted for it.`;
  }
  return `You marked ${falseAlarms} of ${foilsSeen} invented words as known, so we have not pre-filled anything. Your level is an estimate; the app will learn the rest from how you answer.`;
}
