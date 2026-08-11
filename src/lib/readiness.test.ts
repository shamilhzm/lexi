// The readiness read is the one place the app tells a learner whether they are
// going to pass. Its central rule — never blend preparation into performance —
// is the same rule the result screen enforces for telc's two halves, and it is
// what stops a learner with 90% vocabulary and no measured listening believing
// they are ready.
import { describe, expect, it } from 'vitest';
import { PASS_MARK, daysUntil, readiness } from './readiness.ts';

const base = { level: 'B1' as const, vocab: { known: 600, count: 1000 }, grammar: 0.5 };

describe('readiness', () => {
  it('reports preparation and performance separately, never averaged', () => {
    const r = readiness(base);
    expect(r.preparation).toBeCloseTo(0.6);
    expect(r.performance).toBe(null);          // nothing measured
  });

  it('leaves an unmeasured strand null rather than scoring it zero', () => {
    const r = readiness(base);
    const reading = r.strands.find((s) => s.key === 'reading')!;
    expect(reading.score).toBe(null);
    expect(reading.basis).toMatch(/not measured/);
  });

  it('averages performance only over strands that were actually measured', () => {
    const r = readiness({ ...base, measured: { reading: 0.8, listening: 0.4 } });
    expect(r.performance).toBeCloseTo(0.6);    // not diluted by the two unsat parts
  });

  it('leads with "sit a paper" while four strands are unknown', () => {
    expect(readiness(base).actions[0].to).toEqual({ kind: 'paper' });
  });

  it('once measured, leads with the weakest strand under the pass mark', () => {
    const r = readiness({ ...base, measured: { reading: 0.9, listening: 0.35, writing: 0.7, speaking: 0.8 } });
    expect(r.actions[0].label).toContain('Hörverstehen');
    expect(r.actions[0].why).toContain('35%');
  });

  it('sends a weak oral to the scripts, not to a vocabulary quiz', () => {
    const r = readiness({ ...base, measured: { reading: 0.9, listening: 0.9, writing: 0.9, speaking: 0.3 } });
    expect(r.actions[0].to).toEqual({ kind: 'speaking' });
  });

  it('surfaces a repeated blind spot, but only once it is a pattern', () => {
    const one = readiness({ ...base, measured: { reading: 0.9, listening: 0.9, writing: 0.9, speaking: 0.9 },
      blindSpots: [{ tag: 'Kasus', count: 2 }] });
    expect(one.actions.some((a) => a.label.includes('Kasus'))).toBe(false);
    const many = readiness({ ...base, measured: { reading: 0.9, listening: 0.9, writing: 0.9, speaking: 0.9 },
      blindSpots: [{ tag: 'Kasus', count: 6 }] });
    expect(many.actions.some((a) => a.label.includes('Kasus'))).toBe(true);
  });

  it('names the gap when grammar trails vocabulary', () => {
    const r = readiness({ ...base, vocab: { known: 900, count: 1000 }, grammar: 0.3,
      measured: { reading: 0.9, listening: 0.9, writing: 0.9, speaking: 0.9 } });
    expect(r.actions.some((a) => a.label.includes('Grammar is behind'))).toBe(true);
  });

  it('switches to the oral in the last fortnight', () => {
    const r = readiness({ ...base, measured: { reading: 0.9, listening: 0.9, writing: 0.9, speaking: 0.9 },
      examDate: '2026-08-18', today: new Date(2026, 7, 11, 12, 0) });
    expect(r.daysLeft).toBe(7);
    expect(r.actions.some((a) => a.to.kind === 'speaking')).toBe(true);
  });

  it('always returns at least one thing to do', () => {
    const r = readiness({ ...base, vocab: { known: 1000, count: 1000 }, grammar: 0.95,
      measured: { reading: 0.9, listening: 0.9, writing: 0.9, speaking: 0.9 } });
    expect(r.actions.length).toBeGreaterThan(0);
  });

  it('survives an empty corpus without dividing by zero', () => {
    const r = readiness({ level: 'A1', vocab: { known: 0, count: 0 }, grammar: null });
    expect(r.preparation).toBe(0);
    expect(Number.isFinite(r.preparation)).toBe(true);
  });

  it('uses the 60% both big certificates set', () => {
    expect(PASS_MARK).toBe(0.6);
  });
});

describe('daysUntil', () => {
  it('counts whole days and goes negative once past', () => {
    // Local components, not a Z timestamp: 23:30Z on the 11th is already the
    // 12th in Berlin, and `daysUntil` compares *calendar dates in the learner's
    // own timezone* — which is the correct behaviour and made the first version
    // of this test fail everywhere east of London.
    const today = new Date(2026, 7, 11, 23, 30);
    expect(daysUntil('2026-08-11', today)).toBe(0);
    expect(daysUntil('2026-08-18', today)).toBe(7);
    expect(daysUntil('2026-08-09', today)).toBe(-2);
  });
});
