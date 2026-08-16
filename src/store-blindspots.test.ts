// Blind spots rank by miss *rate*, not by raw miss count — BACKLOG #10.
//
// The defect the ranking had: raw count measures exposure as much as weakness.
// Drill a mode ten times and miss three and it outranks a mode you attempted
// twice and failed both — so drilling something makes it look worse and avoiding
// it makes it look fine, which is backwards for a list whose whole job is to say
// what to work on next.
//
// The care needed is in the fallback. Every learner who existed before the attempt
// log has misses with no denominator, and a rate computed from two attempts is
// noise. Both cases fall back to count ordering, so nobody's list reorders until
// there is real evidence.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
}));

/** Module-global miss/attempt logs, so each test needs its own module graph —
 *  the same `fresh()` pattern store-session.test.ts uses. */
async function fresh() {
  vi.resetModules();
  return await import('./store.ts');
}

type Store = Awaited<ReturnType<typeof fresh>>;
const miss = (s: Store, tag: string, n: number) => { for (let i = 0; i < n; i++) s.logMiss(tag); };
const attempt = (s: Store, tag: string, n: number) => { for (let i = 0; i < n; i++) s.logAttempt(tag); };
const order = (s: Store) => s.missStats(30).map((x) => x.tag);

describe('missStats ranking', () => {
  beforeEach(() => { localStorage.clear(); });

  it('ranks the worse rate first even when it has fewer misses', async () => {
    const store = await fresh();
    // Drilled a lot, mostly passed.
    attempt(store, 'Kasus', 40); miss(store, 'Kasus', 8);          // 20%
    // Attempted rarely, failed most of them.
    attempt(store, 'Plural', 10); miss(store, 'Plural', 7);        // 70%
    expect(order(store).slice(0, 2)).toEqual(['Plural', 'Kasus']);
    // and the raw counts genuinely point the other way, which is the bug
    const stats = store.missStats(30);
    expect(stats.find((s) => s.tag === 'Kasus')!.count).toBeGreaterThan(
      stats.find((s) => s.tag === 'Plural')!.count);
  });

  it('reports the rate and the denominator it came from', async () => {
    const store = await fresh();
    attempt(store, 'Kasus', 20); miss(store, 'Kasus', 5);
    const s = store.missStats(30).find((x) => x.tag === 'Kasus')!;
    expect(s.attempts).toBe(20);
    expect(s.rate).toBeCloseTo(0.25, 5);
  });

  it('does not trust a rate built on too few attempts', async () => {
    const store = await fresh();
    // Two attempts, two misses — a 100% rate that means nothing.
    attempt(store, 'Trennbar', 2); miss(store, 'Trennbar', 2);
    const s = store.missStats(30).find((x) => x.tag === 'Trennbar')!;
    expect(s.rate).toBeNull();
    expect(s.attempts).toBe(2);
  });

  it('ranks an unmeasured tag below every measured one', async () => {
    const store = await fresh();
    attempt(store, 'Kasus', 30); miss(store, 'Kasus', 3);          // 10%, measured
    miss(store, 'Legacy', 25);                                     // no attempts at all
    expect(order(store)).toEqual(['Kasus', 'Legacy']);
  });

  it('falls back to count ordering when nothing has a denominator', async () => {
    const store = await fresh();
    // Exactly the pre-existing behaviour, for a learner whose whole log predates
    // the attempt counter.
    miss(store, 'Alpha', 3); miss(store, 'Beta', 9); miss(store, 'Gamma', 5);
    expect(order(store)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('counts only the attempts inside the window', async () => {
    const store = await fresh();
    vi.useFakeTimers();
    try {
      // Old evidence, outside a 30-day window.
      vi.setSystemTime(new Date(2026, 5, 1));
      attempt(store, 'Kasus', 100); miss(store, 'Kasus', 1);
      // Recent evidence: a bad rate that the stale attempts would have diluted to
      // 5/105 if the denominator ignored the window.
      vi.setSystemTime(new Date(2026, 7, 16));
      attempt(store, 'Kasus', 10); miss(store, 'Kasus', 4);
      const s = store.missStats(30).find((x) => x.tag === 'Kasus')!;
      expect(s.attempts).toBe(10);
      expect(s.count).toBe(4);
      expect(s.rate).toBeCloseTo(0.4, 5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('breaks a rate tie with the bigger sample', async () => {
    const store = await fresh();
    attempt(store, 'A', 10); miss(store, 'A', 5);   // 50% of 10
    attempt(store, 'B', 40); miss(store, 'B', 20);  // 50% of 40
    expect(order(store).slice(0, 2)).toEqual(['B', 'A']);
  });
});
