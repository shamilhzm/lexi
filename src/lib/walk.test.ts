import { describe, it, expect } from 'vitest';
import { schedule, layout, pressTarget, promptOf, answerOf, clipsFor, EST_SECONDS, MAX_LISTEN,
  type WalkItem } from './walk.ts';

const item = (n: number, isNew = false): WalkItem =>
  ({ id: `voc:A1:w${n}`, de: `das Wort${n}`, en: `word ${n}`, example: `Das ist Wort${n}.`, isNew });

const est = (pres: ReturnType<typeof schedule>) => pres.reduce((s, p) => s + EST_SECONDS[p.mode], 0);

describe('walk schedule', () => {
  it('fills the minutes asked for, and no more than one presentation over', () => {
    for (const m of [5, 10, 30]) {
      const pres = schedule([item(1), item(2, true)], Array.from({ length: 50 }, (_, i) => item(100 + i)), m);
      expect(est(pres)).toBeGreaterThanOrEqual(m * 60);
      expect(est(pres) - m * 60).toBeLessThan(13);
    }
  });

  it('teaches a new word before it ever tests it, then tests it again later', () => {
    const pres = schedule([item(1, true)], [item(9)], 10);
    const mine = pres.map((p, i) => ({ ...p, i })).filter((p) => p.lane === 'practice' && p.item === 0);
    expect(mine[0].mode).toBe('teach');
    expect(mine.slice(1).every((p) => p.mode === 'test')).toBe(true);
    expect(mine.length).toBe(4);
    // Expanding gaps: each retest further from the last than the one before.
    const gaps = mine.slice(1).map((p, k) => p.i - mine[k].i);
    expect(gaps[1]).toBeGreaterThan(gaps[0]);
    expect(gaps[2]).toBeGreaterThan(gaps[1]);
  });

  it('opens a review card with a test — it is already known', () => {
    const pres = schedule([item(1)], [], 5);
    expect(pres[0]).toEqual({ item: 0, lane: 'practice', mode: 'test' });
  });

  it('never grades from the listening lane, and cycles rather than drawing without end', () => {
    const listen = Array.from({ length: 200 }, (_, i) => item(i));
    const pres = schedule([], listen, 60);
    expect(pres.every((p) => p.mode === 'listen')).toBe(true);
    expect(new Set(pres.map((p) => p.item)).size).toBe(MAX_LISTEN);
  });

  it('stops when there is nothing to say', () => {
    expect(schedule([], [], 30)).toEqual([]);
  });
});

describe('what is said', () => {
  it('prompts with the first sense, without asides', () => {
    expect(promptOf('to manage, to get done; to create')).toBe('to manage, to get done');
    expect(promptOf('(with machen) to undo, to cancel')).toBe('to undo, to cancel');
  });

  it('answers without notation', () => {
    expect(answerOf('warten auf + A')).toBe('warten auf');
    expect(answerOf('der/die Erwachsene')).toBe('der Erwachsene');
    expect(answerOf('die Beratungsstelle')).toBe('die Beratungsstelle');
  });
});

describe('walk timeline', () => {
  const practice = [item(1), item(2, true)];
  const pres = schedule(practice, [item(9)], 5);
  const { segments, placed, total } = layout(pres, practice, [item(9)], () => 1);

  it('lays every segment inside the walk, in order', () => {
    for (let i = 1; i < segments.length; i++) expect(segments[i].at).toBeGreaterThanOrEqual(segments[i - 1].at);
    expect(segments[segments.length - 1].at).toBeLessThan(total);
    expect(placed.length).toBe(pres.length);
  });

  it('leaves a spoken pause between prompt and answer on a test', () => {
    const test = placed.find((p) => p.mode === 'test')!;
    expect(test.answerAt - test.start).toBeGreaterThan(3);
  });

  it('grades the word just answered, even once the next prompt has begun', () => {
    const i = placed.findIndex((p) => p.mode === 'test');
    const p = placed[i];
    expect(pressTarget(placed, p.answerAt - 0.5)).not.toBe(i);
    expect(pressTarget(placed, p.answerAt + 0.1)).toBe(i);
    const nextTest = placed.findIndex((q, k) => k > i && q.mode === 'test');
    expect(pressTarget(placed, placed[nextTest].start + 0.5)).toBe(i);
  });

  it('asks for each clip once', () => {
    const keys = clipsFor(pres, practice, [item(9)]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('en:word 1');
    expect(keys).toContain('de:das Wort2');
  });
});
