// The data-change rule (DESIGN.md §7) needs one thing to be true: each surface
// must animate from what *it* last showed. Getting that wrong is silent — the
// number is right either way, and all that is lost is the movement the rule
// exists to produce — so it is worth pinning.
import { describe, it, expect, beforeEach } from 'vitest';

// A minimal localStorage; the suite runs in node.
class Mem implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
}
globalThis.localStorage = new Mem();

const { lastSeen, markSeen, markTodaySeen } = await import('./store.ts');

describe('what each surface last saw', () => {
  beforeEach(() => localStorage.clear());

  it('reports nothing on a first visit, so a count-up renders flat', () => {
    // Not zero: counting up from zero would be a small lie about what just
    // happened. `undefined` makes CountUp render the value with no travel.
    expect(lastSeen()).toBeNull();
  });

  it('round-trips the map and Today independently', () => {
    markSeen(120, { 'Daily Life': 40 });
    markTodaySeen(120);
    const s = lastSeen()!;
    expect(s.known).toBe(120);
    expect(s.groups['Daily Life']).toBe(40);
    expect(s.today).toBe(120);
  });

  // The reason `today` is a separate field rather than a reuse of `known`.
  // `markSeen` fires when the treemap paints, so if the two shared a number, a
  // learner who studied and then opened Progress first would consume the change
  // there — and Today's headline would sit at a value that had silently already
  // moved, which is exactly what the rule is meant to prevent.
  it('does not let the map consume Today’s pending change', () => {
    markSeen(100, {});
    markTodaySeen(100);
    // …the learner studies, then opens Progress. The map records the new state.
    markSeen(140, { 'Daily Life': 50 });
    // Today has still not been looked at, so it still has 40 words to report.
    expect(lastSeen()!.today).toBe(100);
    expect(lastSeen()!.known).toBe(140);
  });

  it('does not let Today clobber the map’s groups', () => {
    markSeen(100, { 'Daily Life': 50 });
    markTodaySeen(180);
    const s = lastSeen()!;
    expect(s.groups['Daily Life']).toBe(50);
    expect(s.known).toBe(100);
    expect(s.today).toBe(180);
  });

  it('survives a corrupt record as a first visit rather than throwing', () => {
    localStorage.setItem('lexi.mapseen.v1', '{not json');
    expect(lastSeen()).toBeNull();
    // …and writing over it recovers.
    markTodaySeen(7);
    expect(lastSeen()!.today).toBe(7);
  });

  it('writes Today’s value even with no map record yet', () => {
    markTodaySeen(12);
    const s = lastSeen()!;
    expect(s.today).toBe(12);
    expect(s.groups).toEqual({});
  });
});
