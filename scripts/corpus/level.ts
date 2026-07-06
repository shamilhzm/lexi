// CEFR leveling (Goal 4). A defensible blend, in priority order:
//   (a) a published-wordlist ground truth where a lemma appears (loaded from a
//       local reference TSV — used to assign/verify, never redistributed);
//   (b) a frequency-band → level heuristic;
//   (c) an LLM estimate for the remainder (see enrich-llm.ts), merged in build.ts.
// Every assignment records which layer decided it, and the leveling can be
// validated against a held-out slice of the reference.
import { readFileSync } from 'node:fs';
import { FREQ_BANDS } from './config.ts';
import { lemmaKey, fileExists, LEVELS } from './lib.ts';

export type LevelSource = 'reference' | 'frequency' | 'llm';
export interface LevelAssignment { level: string; source: LevelSource; freqRank: number | null; }

/** lemma → CEFR from a local `lemma<TAB>level` reference (optional, not shipped). */
export function loadReference(path: string): Map<string, string> {
  const m = new Map<string, string>();
  if (!fileExists(path)) return m;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [lemma, level] = line.split('\t');
    const lv = (level ?? '').trim().toUpperCase();
    if (lemma && LEVELS.includes(lv as any)) m.set(lemmaKey(lemma), lv);
  }
  return m;
}

/** Frequency-rank → CEFR (layer b). */
export function freqBandLevel(rank: number): string {
  for (const b of FREQ_BANDS) if (rank <= b.maxRank) return b.level;
  return 'C2';
}

/** Assign a level from reference (if known) else the frequency heuristic. The LLM
 *  layer is applied separately in build.ts for lemmas the caller routes to it. */
export function assignLevel(lemma: string, rank: number | null, ref: Map<string, string>): LevelAssignment {
  const fromRef = ref.get(lemmaKey(lemma));
  if (fromRef) return { level: fromRef, source: 'reference', freqRank: rank };
  return { level: rank != null ? freqBandLevel(rank) : 'B1', source: 'frequency', freqRank: rank };
}

/**
 * Validate the frequency heuristic against the reference: exact-match and
 * within-one-level agreement, plus a per-level breakdown. Lets a maintainer see
 * how trustworthy the heuristic is before trusting it for un-referenced lemmas.
 */
export function levelingAgreement(ref: Map<string, string>, rankOf: (lemma: string) => number | null) {
  const idx = (l: string) => LEVELS.indexOf(l as any);
  let n = 0, exact = 0, within1 = 0;
  const byLevel: Record<string, { n: number; exact: number }> = Object.fromEntries(LEVELS.map((l) => [l, { n: 0, exact: 0 }]));
  for (const [lemma, gold] of ref) {
    const rank = rankOf(lemma);
    if (rank == null) continue; // only lemmas we can rank are comparable
    n++;
    const guess = freqBandLevel(rank);
    const d = Math.abs(idx(guess) - idx(gold));
    if (d === 0) { exact++; byLevel[gold].exact++; }
    if (d <= 1) within1++;
    byLevel[gold].n++;
  }
  return {
    n,
    exactPct: n ? +(100 * exact / n).toFixed(1) : 0,
    within1Pct: n ? +(100 * within1 / n).toFixed(1) : 0,
    byLevel,
  };
}
