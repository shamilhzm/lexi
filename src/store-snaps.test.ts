// Snapshots are the only persisted history the heatmap's delta arrows and the goal
// line's pace are derived from, and until 2026-08-26 the only validation on them was
// `Array.isArray`.
//
// A row without `groups` reached `groupDeltas`, which calls
// `Object.keys(base.groups)`. That throws, the exception leaves `<Markt>`, and the
// **whole Progress surface renders its error boundary instead of the heatmap** — for
// good, with no way for the learner to clear it from the UI. Lexi is local-first and
// holds the only copy; one malformed row is not cosmetic.
//
// How it can happen for real, none of which requires a bug in this file:
//   · a quota-truncated `setItem` writing a partial array
//   · a hand-edited or truncated backup restored through `restore()` —
//     `lexi.snap.v1` is in SETTING_KEYS, so it travels in backups
//   · a schema older than the field
//
// Pinned here because the fix is one filter and the failure is invisible until the
// day it isn't.
import { describe, it, expect, beforeEach } from 'vitest';

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

const { groupDeltas } = await import('./store.ts');

const KEY = 'lexi.snap.v1';
/** Yesterday, so the row counts as `past` — `groupDeltas` ignores today's. */
const past = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

describe('malformed snapshots cannot take out the heatmap', () => {
  beforeEach(() => localStorage.clear());

  it('survives a row with no groups at all', () => {
    localStorage.setItem(KEY, JSON.stringify([{ date: past, known: 40 }]));
    // The bug: this threw "Cannot convert undefined or null to object".
    expect(() => groupDeltas(7)).not.toThrow();
    // With every row dropped there is no history, and null is the honest answer —
    // the same one a brand-new learner gets. Silence beats a fabricated delta.
    expect(groupDeltas(7)).toBeNull();
  });

  it.each([
    ['groups is null', { date: past, groups: null }],
    ['groups is a string', { date: past, groups: 'nope' }],
    ['groups is an array', { date: past, groups: [] }],
    ['date is missing', { groups: { Daily: 1 } }],
    ['the row is null', null],
    ['the row is a number', 7],
  ])('drops a row where %s', (_label, row) => {
    localStorage.setItem(KEY, JSON.stringify([row]));
    expect(() => groupDeltas(7)).not.toThrow();
  });

  it('keeps the good rows when only some are broken', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { date: past, groups: null },                       // dropped
      { date: past, groups: { 'Daily Life': 3 }, known: 9 }, // kept
    ]));
    const d = groupDeltas(7);
    // A surviving row means real history, so the answer is a Map rather than null.
    expect(d).not.toBeNull();
    expect(d).toBeInstanceOf(Map);
  });

  it('is unbothered by junk in the key itself', () => {
    for (const junk of ['{not json', 'null', '"a string"', '{}', '[]']) {
      localStorage.setItem(KEY, junk);
      expect(() => groupDeltas(7), junk).not.toThrow();
    }
  });
});
