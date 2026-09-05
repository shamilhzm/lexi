// The words the collapsed CEFR filter shows on a phone.
//
// It replaces six chips whose state you read off their borders, so it has to be
// right about what is selected — a summary that says "A1–C2" while the scope is
// A1 and C2 would be worse than the chips it stands in for.
import { describe, it, expect } from 'vitest';
import { levelSummary } from './LevelFilter.tsx';
import { workingEdge } from './LevelProgress.tsx';
import { ALL_LEVELS, type CEFR } from '../types.ts';

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

// The "… means being able to" panel used to describe the **highest** level in the
// filter. The filter defaults to all six and the first session now comes before
// the placement test, so the ordinary state — an unplaced learner on their first
// visit — was told what **C2** means above a row of six 0% bars.
describe('workingEdge — which level the descriptors describe', () => {
  const stats = (learned: Partial<Record<CEFR, number>>) =>
    ALL_LEVELS.map((level) => ({ level, learned: learned[level] ?? 0 }));
  const all = new Set(ALL_LEVELS);

  it('does not say C2 to someone who has studied nothing', () => {
    expect(ALL_LEVELS[workingEdge(stats({}), all, 'A1')]).toBe('A1');
  });

  it('follows the placement when nothing is started yet', () => {
    expect(ALL_LEVELS[workingEdge(stats({}), all, 'B1')]).toBe('B1');
  });

  it('is the highest level you have actually touched', () => {
    expect(ALL_LEVELS[workingEdge(stats({ A1: 40, A2: 12 }), all, 'A1')]).toBe('A2');
  });

  it('never names a level outside the filter — the lit tile and the panel must agree', () => {
    const focus = new Set<CEFR>(['A1', 'A2']);
    // B1 has progress but is filtered out; the placement points at C1, also out.
    expect(ALL_LEVELS[workingEdge(stats({ A1: 5, B1: 90 }), focus, 'C1')]).toBe('A1');
  });

  it('falls back to the lowest focused level when the placement is filtered out', () => {
    const focus = new Set<CEFR>(['B1', 'B2']);
    expect(ALL_LEVELS[workingEdge(stats({}), focus, 'A1')]).toBe('B1');
  });
});
