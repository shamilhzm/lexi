import { describe, it, expect } from 'vitest';
import { makeHeatScale, fmt } from './ui.ts';

// The ten theme groups of a real mid-B1 learner. This is the distribution the
// old linear-over-0–100% scale collapsed into a single colour, so it is the
// case worth pinning.
const REAL = [0.39, 0.33, 0.31, 0.45, 0.26, 0.35, 0.34, 0.29, 0.42, 0.28];

describe('makeHeatScale', () => {
  it('spreads a compressed range across all five classes', () => {
    const s = makeHeatScale(REAL);
    const used = new Set(REAL.map((p) => s.classOf(p)));
    expect(used.size).toBe(5);
    // Quantile with 10 values over 5 classes: two per class.
    for (let k = 0; k < 5; k++) {
      expect(REAL.filter((p) => s.classOf(p) === k)).toHaveLength(2);
    }
  });

  it('is monotonic — more known never means a lower class', () => {
    const s = makeHeatScale(REAL);
    const sorted = [...REAL].sort((a, b) => a - b);
    const classes = sorted.map((p) => s.classOf(p));
    expect(classes).toEqual([...classes].sort((a, b) => a - b));
  });

  it('reports the observed domain, not 0–100%', () => {
    const s = makeHeatScale(REAL);
    expect(s.domain).toEqual([0.26, 0.45]);
    expect(s.breaks).toHaveLength(4);
  });

  it('resolves fill and ink to paired tokens of the same class', () => {
    const s = makeHeatScale(REAL);
    // The pairing is the point: ink is chosen per class in CSS, so a fill can
    // never end up with ink from a different class.
    for (const p of REAL) {
      const k = s.classOf(p);
      expect(s.fill(p)).toBe(`var(--heat-${k})`);
      expect(s.ink(p)).toBe(`var(--heat-ink-${k})`);
    }
  });

  it('degrades rather than throwing when there is nothing to classify', () => {
    for (const input of [[], [0.4], [0.4, 0.4, 0.4]]) {
      const s = makeHeatScale(input);
      expect(s.breaks).toEqual([]);            // too few distinct values
      const k = s.classOf(0.4);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(4);
      expect(s.fill(0.4)).toMatch(/^var\(--heat-[0-4]\)$/);
    }
  });

  it('gives identical displayed percentages identical classes', () => {
    // Regression: three territories rendered "42%" and the raw floats put them
    // either side of a quantile break, so the map showed the same number in two
    // different colours. Classification now runs on the rounded percentage.
    const near = [0.23, 0.36, 0.41, 0.4204, 0.4198, 0.4201, 0.44, 0.45, 0.56, 0.62];
    const s = makeHeatScale(near);
    const fortyTwos = near.filter((p) => Math.round(p * 100) === 42);
    expect(fortyTwos).toHaveLength(3);
    expect(new Set(fortyTwos.map((p) => s.classOf(p))).size).toBe(1);
  });

  it('never colours a lower percentage above a higher one', () => {
    const near = [0.23, 0.36, 0.41, 0.4204, 0.4198, 0.4201, 0.44, 0.45, 0.56, 0.62];
    const s = makeHeatScale(near);
    const sorted = [...near].sort((a, b) => a - b).map((p) => s.classOf(p));
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
  });

  it('clamps out-of-range input to a real class', () => {
    const s = makeHeatScale(REAL);
    for (const p of [-1, 0, 1, 99, NaN]) {
      expect(s.fill(p)).toMatch(/^var\(--heat-[0-4]\)$/);
    }
  });
});

describe('fmt', () => {
  // Regression: this was toLocaleString('de-DE'), which renders the app's
  // headline number as "2.320" — read as two-point-three-two by the English
  // reader the surface language is written for.
  it('groups digits for an English-language UI', () => {
    expect(fmt(2320)).toBe('2,320');
    expect(fmt(6618)).toBe('6,618');
    expect(fmt(1705)).toBe('1,705');
  });

  it('leaves small numbers alone', () => {
    expect(fmt(0)).toBe('0');
    expect(fmt(999)).toBe('999');
  });
});
