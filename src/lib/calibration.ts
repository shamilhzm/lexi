// Was the scheduler right about you?
//
// FSRS does not only pick a date — it makes a falsifiable claim every time a card
// comes up: *there is an R% chance you still know this*. `store.review()` records
// that claim on the ledger before it learns the answer (see lib/ledger.ts), so the
// two can be compared afterwards without either one having been able to influence
// the other. That comparison is calibration, and it is the only measurement in the
// app that can tell a learner their settings are wrong rather than their memory.
//
// ## Why this is the honest number and the daily counter is not
//
// `Stats`'s recall bar already reports *"% graded correct"* from the 60-day
// `lexi.reviewlog.v1` blob. That number moves for reasons that have nothing to do
// with the scheduler: a week of easy cards lifts it, a backlog of hard ones sinks
// it, and neither says whether FSRS predicted the outcome. **Calibration cannot be
// flattered by studying easier material** — pick only easy cards and the predicted
// column rises with the actual one, and the gap, which is the whole reading, stays
// where it was. It is the mechanical-rabbit test applied to Lexi's own scheduler:
// a number that goes up only when the thing it names actually improved.
//
// ## What it deliberately refuses to say
//
// A percentage over nine reviews is noise wearing a decimal point. A band under
// `MIN_N` returns `null` for both columns and keeps its `n`, so the surface can
// say "not enough yet" and never print a figure the evidence does not carry.
import { Rating, type Grade } from '../srs.ts';
import type { ReviewEvent } from './ledger.ts';

/** Reviews a band needs before its rates are worth stating. Under this the band
 *  reports its count and nothing else — see the note above. */
export const MIN_N = 30;

/** The predicted-recall bands, low to high.
 *
 *  Uneven on purpose: at a 0.9 retention target most reviews land above 0.85, so
 *  equal-width deciles would put four-fifths of the evidence in one bucket and
 *  leave the interesting tail — the cards FSRS is least sure about — too thin to
 *  read. These widen downward for the same reason a log axis does. */
const BANDS: { lo: number; hi: number; label: string }[] = [
  { lo: 0,    hi: 0.6,  label: 'under 60%' },
  { lo: 0.6,  hi: 0.75, label: '60–75%' },
  { lo: 0.75, hi: 0.85, label: '75–85%' },
  { lo: 0.85, hi: 0.93, label: '85–93%' },
  { lo: 0.93, hi: 1.01, label: 'over 93%' },
];

export interface Band {
  label: string;
  /** Reviews in this band, always reported. */
  n: number;
  /** Mean predicted recall, 0..1 — `null` under `MIN_N`. */
  predicted: number | null;
  /** Share actually recalled, 0..1 — `null` under `MIN_N`. */
  actual: number | null;
}

export interface Calibration {
  bands: Band[];
  /** Every review carrying a prediction, pooled. `null` rates under `MIN_N`. */
  overall: Band;
  /** Rows with a prediction. Below `MIN_N` overall, the surface should say the
   *  measurement has not started rather than draw an empty table. */
  scored: number;
  /** Rows without one: first sights, and everything logged before 2026-09-09.
   *  Reported rather than hidden, so a thin table is explained by its input. */
  unscored: number;
}

/** A grade counts as recall unless it was `Again` — the same line FSRS itself
 *  draws, and the same one `bumpReviewLog` already draws for the daily counter, so
 *  the two numbers cannot disagree about what "correct" means. */
export function recalled(g: Grade): boolean {
  return g !== Rating.Again;
}

function band(label: string, rows: { r: number; ok: boolean }[]): Band {
  const n = rows.length;
  if (n < MIN_N) return { label, n, predicted: null, actual: null };
  return {
    label,
    n,
    predicted: rows.reduce((a, x) => a + x.r, 0) / n,
    actual: rows.filter((x) => x.ok).length / n,
  };
}

/** Compare what the scheduler predicted against what happened.
 *
 *  `since` is an epoch-ms floor; omit it to use the whole ledger. Pure — the
 *  caller loads the events, so this is testable without IndexedDB. */
export function calibration(events: ReviewEvent[], since = 0): Calibration {
  let unscored = 0;
  const scored: { r: number; ok: boolean }[] = [];
  for (const e of events) {
    if (e.at < since) continue;
    // `typeof`, not a truthiness check: a genuine prediction of 0 is meaningful
    // and must not be discarded as "no prediction".
    if (typeof e.r !== 'number' || !Number.isFinite(e.r)) { unscored++; continue; }
    scored.push({ r: e.r, ok: recalled(e.g) });
  }
  return {
    bands: BANDS.map((b) => band(b.label, scored.filter((x) => x.r >= b.lo && x.r < b.hi))),
    overall: band('all reviews', scored),
    scored: scored.length,
    unscored,
  };
}
