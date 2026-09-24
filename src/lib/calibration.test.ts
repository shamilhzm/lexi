import { describe, it, expect } from 'vitest';
import { calibration, recalled, MIN_N } from './calibration.ts';
import { Rating, type Grade } from '../srs.ts';
import type { ReviewEvent } from './ledger.ts';

/** `n` rows in one band, `hits` of them recalled. */
function rows(n: number, r: number, hits: number, at = 1_000): ReviewEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `voc:A1:w${i}`,
    g: (i < hits ? Rating.Good : Rating.Again) as Grade,
    at,
    r,
  }));
}

describe('recalled', () => {
  it('counts everything except Again, the same line FSRS draws', () => {
    expect(recalled(Rating.Again as Grade)).toBe(false);
    expect(recalled(Rating.Hard as Grade)).toBe(true);
    expect(recalled(Rating.Good as Grade)).toBe(true);
    expect(recalled(Rating.Easy as Grade)).toBe(true);
  });
});

describe('calibration', () => {
  it('reports the gap between what was predicted and what happened', () => {
    // 40 reviews FSRS was 90% sure of; 36 recalled. Perfectly calibrated.
    const c = calibration(rows(40, 0.9, 36));
    const b = c.bands.find((x) => x.label === '85–93%')!;
    expect(b.n).toBe(40);
    expect(b.predicted).toBeCloseTo(0.9, 5);
    expect(b.actual).toBeCloseTo(0.9, 5);
    expect(c.overall.actual).toBeCloseTo(0.9, 5);
  });

  it('shows an overconfident scheduler as a gap, not as a low score', () => {
    // Predicted 0.95, only 70% recalled: the actual column must fall below the
    // predicted one. This is the reading the daily recall bar cannot produce.
    const c = calibration(rows(50, 0.95, 35));
    const b = c.bands.find((x) => x.label === 'over 93%')!;
    expect(b.predicted!).toBeGreaterThan(b.actual!);
    expect(b.actual).toBeCloseTo(0.7, 5);
  });

  it('refuses to state a rate under the evidence floor, but keeps the count', () => {
    const thin = calibration(rows(MIN_N - 1, 0.9, 5));
    const b = thin.bands.find((x) => x.label === '85–93%')!;
    expect(b.n).toBe(MIN_N - 1);
    expect(b.predicted).toBeNull();
    expect(b.actual).toBeNull();
  });

  it('separates rows carrying no prediction instead of scoring them as misses', () => {
    // First sights, and every row written before the ledger recorded predictions.
    const legacy: ReviewEvent[] = [
      { id: 'voc:A1:a', g: Rating.Good as Grade, at: 1 },
      { id: 'voc:A1:b', g: Rating.Again as Grade, at: 2 },
    ];
    const c = calibration([...legacy, ...rows(40, 0.9, 36)]);
    expect(c.unscored).toBe(2);
    expect(c.scored).toBe(40);
    expect(c.overall.actual).toBeCloseTo(0.9, 5);
  });

  it('keeps a genuine prediction of zero rather than reading it as absent', () => {
    // The bug this guards: `if (!e.r)` would discard every 0 as "no prediction",
    // silently deleting the band where the scheduler is least confident and most
    // worth checking.
    const c = calibration(rows(MIN_N, 0, 0));
    expect(c.unscored).toBe(0);
    expect(c.bands.find((x) => x.label === 'under 60%')!.n).toBe(MIN_N);
  });

  it('honours the since floor', () => {
    const old = rows(40, 0.9, 36, 100);
    const recent = rows(40, 0.5, 20, 9_000);
    const c = calibration([...old, ...recent], 5_000);
    expect(c.scored).toBe(40);
    expect(c.bands.find((x) => x.label === '85–93%')!.n).toBe(0);
  });

  it('puts every band boundary on exactly one side', () => {
    // An off-by-one at a boundary double-counts or drops rows, and the totals are
    // the only place that shows: bands must sum to `scored`.
    const evts = [0, 0.59, 0.6, 0.74, 0.75, 0.84, 0.85, 0.92, 0.93, 1]
      .flatMap((r) => rows(1, r, 1));
    const c = calibration(evts);
    expect(c.bands.reduce((a, b) => a + b.n, 0)).toBe(c.scored);
    expect(c.scored).toBe(10);
  });
});
