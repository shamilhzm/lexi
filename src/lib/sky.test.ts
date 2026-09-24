import { describe, it, expect } from 'vitest';
import { layout, sowingOrder, ringAt, firstLight, memoryCurve, reachCurve, GOLDEN } from './sky.ts';
import { emptyCard, schedule, Rating, State } from '../srs.ts';
import type { ReviewEvent } from './ledger.ts';
import type { Word } from '../types.ts';

const w = (id: string, level: Word['level'] = 'A1'): Word => ({
  id, term: id, en: '', pos: 'noun', level, gender: null, plural: null, ipa: null, def: null,
  syn: [], ant: [], ex: [], field: 'T', kind: 'word',
});

describe('the sowing order', () => {
  it('puts the commonest words first and unranked ones at the edge, by level', () => {
    const ranks: Record<string, number> = { b: 5, a: 900 };
    const order = sowingOrder([w('x', 'B1'), w('a'), w('y', 'A1'), w('b')], (id) => ranks[id] ?? null);
    expect(order.map((x) => x.id)).toEqual(['b', 'a', 'y', 'x']);
  });
});

describe('the layout', () => {
  const stars = layout(Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })));
  it('stays inside the unit disk and grows outward in order', () => {
    for (const s of stars) expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(1 + 1e-9);
    expect(stars[0].r).toBeLessThan(stars[999].r);
  });
  it('turns by the golden angle, so the spiral has no spokes', () => {
    const a0 = Math.atan2(stars[1].y, stars[1].x) - Math.atan2(stars[0].y, stars[0].x);
    expect(Math.abs(Math.cos(a0) - Math.cos(GOLDEN))).toBeLessThan(1e-9);
  });
  it('gives equal counts equal area — the ring for half the words is at √½', () => {
    expect(ringAt(500, 1000)).toBeCloseTo(Math.SQRT1_2, 9);
    expect(ringAt(5000, 1000)).toBe(1);
  });
});

describe('first light', () => {
  it('takes the earliest review, falls back to the last one, and skips unreviewed words', () => {
    const events: ReviewEvent[] = [
      { id: 'a', g: Rating.Good, at: 300 }, { id: 'a', g: Rating.Good, at: 100 },
      { id: 'gym:x', g: Rating.Good, at: 50 },
    ];
    const pre = schedule(emptyCard(new Date(200)), Rating.Good, new Date(200));
    const cards = new Map([['b', pre], ['c', emptyCard()]]);
    const out = firstLight(events, cards, new Set(['a', 'b', 'c']));
    expect(out.map((e) => e.id)).toEqual(['a', 'b']);
    expect(out[0].at).toBe(100);
    expect(cards.get('c')!.state).toBe(State.New);
  });
});

describe('a memory curve', () => {
  const day = 86_400_000;
  const t0 = Date.UTC(2026, 5, 1);
  const events: ReviewEvent[] = [
    { id: 'a', g: Rating.Good, at: t0 },
    { id: 'a', g: Rating.Good, at: t0 + 3 * day },
    { id: 'a', g: Rating.Good, at: t0 + 15 * day },
  ];
  const c = memoryCurve(events, t0 + 60 * day);
  it('returns to full at every review and falls between them', () => {
    // Two points share each review's time: the value just before it, and the jump
    // back to 1 — the vertical edge of the sawtooth.
    for (const rv of c.reviews) {
      expect(c.points.filter((p) => p.t === rv.t).some((p) => p.r === 1)).toBe(true);
    }
    const before = c.points.filter((p) => p.t === c.reviews[1].t);
    expect(Math.min(...before.map((p) => p.r))).toBeLessThan(1);
    const gap = c.points.filter((p) => p.t > t0 && p.t < t0 + 3 * day);
    expect(gap[gap.length - 1].r).toBeLessThan(gap[0].r);
  });
  it('falls more slowly after each successful review — the spacing effect', () => {
    expect(c.stabilities[1]).toBeGreaterThan(c.stabilities[0]);
    expect(c.stabilities[2]).toBeGreaterThan(c.stabilities[1]);
  });
  it('is empty for a word never reviewed', () => {
    expect(memoryCurve([]).points).toEqual([]);
  });
});

describe('the replay camera', () => {
  it('widens as the sky fills, and ignores one far star', () => {
    const radii = [0.1, 0.12, 0.11, 0.9, 0.13, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5];
    const reach = reachCurve(radii, 4);
    expect(reach).toHaveLength(5);
    for (let j = 1; j < reach.length; j++) expect(reach[j]).toBeGreaterThanOrEqual(reach[j - 1] - 0.05);
    expect(reach[1]).toBeLessThan(0.9);
    expect(reach[4]).toBeLessThanOrEqual(0.9);
  });
  it('is empty for an empty sky', () => expect(reachCurve([])).toEqual([]));
});
