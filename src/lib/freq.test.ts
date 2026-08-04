// The frequency index and its comparator. The interesting cases are all about
// *absence*: 73% of cards have no rank, so the degradation path is the common path,
// not the edge case.
import { describe, it, expect, beforeEach } from 'vitest';
import { primeFreq, freqRankOf, rankedCount, byFrequency } from './freq.ts';

const id = (s: string) => ({ id: s });

describe('the frequency index', () => {
  beforeEach(() => primeFreq({ a: 10, b: 2, c: 500 }));

  it('reports a rank, and null for an unmeasured word', () => {
    expect(freqRankOf('b')).toBe(2);
    expect(freqRankOf('zzz')).toBeNull();
  });

  it('re-priming replaces rather than merges', () => {
    primeFreq({ x: 1 });
    expect(rankedCount()).toBe(1);
    expect(freqRankOf('a')).toBeNull();
  });

  it('survives an empty index, which is what a failed fetch produces', () => {
    primeFreq({});
    expect(rankedCount()).toBe(0);
    expect(freqRankOf('a')).toBeNull();
    // Every pair ties, so a stable sort leaves the caller's order untouched.
    expect([id('a'), id('b')].sort(byFrequency).map((w) => w.id)).toEqual(['a', 'b']);
  });
});

describe('byFrequency', () => {
  beforeEach(() => primeFreq({ a: 10, b: 2, c: 500 }));

  it('puts the commonest word first', () => {
    expect([id('a'), id('c'), id('b')].sort(byFrequency).map((w) => w.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts unranked words after every ranked one', () => {
    const out = [id('unranked'), id('c'), id('b')].sort(byFrequency).map((w) => w.id);
    expect(out).toEqual(['b', 'c', 'unranked']);
  });

  it('leaves two unranked words in their original order', () => {
    // The guarantee the store relies on: unranked cards keep corpus order rather
    // than being shuffled into an arbitrary one.
    expect([id('y'), id('x')].sort(byFrequency).map((w) => w.id)).toEqual(['y', 'x']);
  });

  it('is a valid comparator — antisymmetric on every pair', () => {
    // A comparator that reports a < b AND b < a will sort differently depending on
    // the engine's pivot choice, which is exactly the bug that never reproduces.
    // `Math.sign` is avoided deliberately: it returns -0 for 0, and Object.is
    // (which `toBe` uses) says -0 !== 0, so the assertion would fail on every
    // equal pair for a reason that has nothing to do with the comparator.
    const sgn = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
    const ids = ['a', 'b', 'c', 'unranked1', 'unranked2'];
    for (const p of ids) {
      for (const q of ids) {
        expect(sgn(byFrequency(id(p), id(q)))).toBe(-sgn(byFrequency(id(q), id(p))) || 0);
      }
    }
  });
});
