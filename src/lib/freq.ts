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
// build. `public/data/freq.json` is the projection scheduling needs, emitted by
// `npm run corpus:freq`, and since 2026-11-21 it is positional (see the end of
// this file): 27 KB gzipped, where the id-keyed map was 89.
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

// ## The file, by position *(2026-11-21)*
//
// `freq.json` was an id → rank map, 89 KB gzipped and on the boot path, and its
// bytes were nearly all the card ids, which `cards.json` already carries in the same
// fetch. So it is now the ranks alone, by position in `cards.json` (0 = unranked),
// with the count and a hash of the id order they were written against. `cards.json`
// is a positional twin of `vocab.json` (`scripts/corpus/split.ts`), which is the
// order `corpus:freq` writes in.
//
// A file written against another id order would put every rank on the wrong card,
// so `decodeFreq` refuses it: the app falls back to corpus order, exactly as for a
// failed fetch, and `freq.test.ts` fails CI on the shipped pair before that can
// ship. The old map shape still decodes, so a cached old file and a new app, or the
// reverse, cannot break a boot during a deploy.

export interface FreqFile { v: 2; n: number; hash: string; ranks: number[] }

/** FNV-1a over the ids in order, as 8 hex digits. */
export function idsHash(ids: readonly string[]): string {
  let h = 0x811c9dc5;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= 10; h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** The file `corpus:freq` writes: one rank per id, in `ids`' order. */
export function encodeFreq(ids: readonly string[], rankOf: Readonly<Record<string, number>>): FreqFile {
  return { v: 2, n: ids.length, hash: idsHash(ids), ranks: ids.map((id) => rankOf[id] ?? 0) };
}

/** The id → rank map, or `null` when the file was written against other ids. */
export function decodeFreq(raw: unknown, ids: readonly string[]): Record<string, number> | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Partial<FreqFile>;
  if (f.v !== 2) return raw as Record<string, number>;   // the pre-2026-11-21 map
  if (!Array.isArray(f.ranks) || f.n !== ids.length || f.ranks.length !== ids.length || f.hash !== idsHash(ids)) return null;
  const out: Record<string, number> = {};
  for (let i = 0; i < ids.length; i++) if (f.ranks[i] > 0) out[ids[i]] = f.ranks[i];
  return out;
}

/** For scripts and tests, which must fail loudly where the app falls back. */
export function ranksOrThrow(raw: unknown, words: readonly { id: string }[]): Record<string, number> {
  const r = decodeFreq(raw, words.map((w) => w.id));
  if (!r) throw new Error('freq.json was written against another card order: run npm run corpus:freq');
  return r;
}
