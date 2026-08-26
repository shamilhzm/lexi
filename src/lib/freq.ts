// How common a word is, as a rank, available synchronously.
//
// The scheduler picks fresh vocabulary by CEFR band. Within a band it used to take
// whatever order the corpus happened to be in, which meant an A1 learner's first ten
// cards were an accident of the build rather than the ten commonest A1 words. Band
// is a coarse instrument: "A1" spans several thousand ranks, and the difference
// between the 90th commonest German word and the 4,000th is most of the value of
// studying either.
//
// `provenance.json` has carried these ranks all along but is 609 KB and lazily
// fetched — right for a detail view, wrong for something consulted on every session
// build. `public/data/freq.json` is the projection scheduling needs (49 KB), emitted
// by `npm run corpus:freq`.
//
// ## The honest limit
//
// It covers 1,986 of 6,622 cards (30%). The rest predate the provenance log. That
// is not a random 27%: those cards were *discovered through the frequency list*, so
// having a rank correlates with being common. Ordering ranked-before-unranked is
// therefore mildly self-fulfilling, and it is still the right call — a card known to
// be the 93rd commonest German word genuinely should precede one whose commonness
// nobody has measured. What it must not do is *hide* the unranked ones, so they
// follow in their existing order rather than being filtered out. As coverage grows
// (backlog Now #2 Phase 0), the ordering sharpens and nothing else has to change.

let ranks: Map<string, number> = new Map();

/** Populate the rank index. Called by initData; safe to call more than once. */
export function primeFreq(rows: Record<string, number>): void {
  ranks = new Map(Object.entries(rows));
}

/** Rank of a card, 1 = commonest. `null` when the word's frequency is unmeasured. */
export function freqRankOf(id: string): number | null {
  return ranks.get(id) ?? null;
}

/** How many cards carry a rank — for tests and diagnostics. */
export function rankedCount(): number {
  return ranks.size;
}

/** Sort comparator: commonest first, unmeasured last, ties left to the caller's
 *  existing order (callers use a stable sort, so this preserves it). */
export function byFrequency(a: { id: string }, b: { id: string }): number {
  const ra = ranks.get(a.id);
  const rb = ranks.get(b.id);
  if (ra == null && rb == null) return 0;
  if (ra == null) return 1;
  if (rb == null) return -1;
  return ra - rb;
}
