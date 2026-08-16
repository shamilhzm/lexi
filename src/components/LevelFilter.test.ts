// The words the collapsed CEFR filter shows on a phone.
//
// It replaces six chips whose state you read off their borders, so it has to be
// right about what is selected — a summary that says "A1–C2" while the scope is
// A1 and C2 would be worse than the chips it stands in for.
import { describe, it, expect } from 'vitest';
import { levelSummary } from './LevelFilter.tsx';
import type { CEFR } from '../types.ts';

const set = (...l: CEFR[]) => new Set<CEFR>(l);

describe('levelSummary', () => {
  it('names the whole range rather than listing it', () => {
    expect(levelSummary(set('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))).toBe('All levels');
  });

  it('reads a contiguous run as a range', () => {
    expect(levelSummary(set('A1', 'A2', 'B1'))).toBe('A1–B1');
    expect(levelSummary(set('B2', 'C1'))).toBe('B2–C1');
  });

  it('names a single level plainly', () => {
    expect(levelSummary(set('B1'))).toBe('B1');
  });

  it('lists a short non-contiguous selection', () => {
    // The case a range would misreport: A1 and C2 are not "A1–C2".
    expect(levelSummary(set('A1', 'C2'))).toBe('A1, C2');
    expect(levelSummary(set('A1', 'B1', 'C1'))).toBe('A1, B1, C1');
  });

  it('falls back to a count when a list would not fit', () => {
    expect(levelSummary(set('A1', 'A2', 'B2', 'C2'))).toBe('4 levels');
  });

  it('is honest about an empty scope', () => {
    // Reachable: every chip can be toggled off, and the map then says so too.
    expect(levelSummary(set())).toBe('No levels');
  });

  it('does not depend on insertion order', () => {
    expect(levelSummary(set('C2', 'A1', 'B1'))).toBe('A1, B1, C2');
  });
});
