import { describe, it, expect } from 'vitest';
import { listenProgram, indexAt, skipTarget, replayTarget, wordsIn, RETURNS_AT, LISTEN_DURATIONS } from './listen.ts';
import { layout, clipsFor, EST_SECONDS, deKey, enKey, type WalkItem, type Presentation } from './walk.ts';

const item = (n: number, example = true): WalkItem =>
  ({ id: `voc:A1:w${n}`, de: `das Wort${n}`, en: `word ${n}`, example: example ? `Das ist Wort${n}.` : undefined, isNew: true });
const many = (n: number) => Array.from({ length: n }, (_, i) => item(i));
const est = (pres: Presentation[]) => pres.reduce((s, p) => s + EST_SECONDS[p.mode], 0);
/** Estimated start time of each presentation, the clock the planner uses. */
const starts = (pres: Presentation[]) => {
  let t = 0;
  return pres.map((p) => { const at = t; t += EST_SECONDS[p.mode]; return at; });
};

describe('Hören program', () => {
  it('fills the minutes asked for, and at most one presentation over', () => {
    for (const m of LISTEN_DURATIONS) {
      const pres = listenProgram(many(400), m);
      expect(est(pres)).toBeGreaterThanOrEqual(m * 60);
      expect(est(pres) - m * 60).toBeLessThan(EST_SECONDS.hear + 1);
    }
  });

  it('never asks anything — every presentation is heard, none is a test', () => {
    const pres = listenProgram(many(400), 60);
    expect(pres.every((p) => p.mode === 'hear' || p.mode === 'again')).toBe(true);
    expect(pres.every((p) => p.lane === 'listen')).toBe(true);
  });

  it('introduces each word once, then brings it back on an expanding schedule', () => {
    const pres = listenProgram(many(400), 60);
    const at = starts(pres);
    const first = pres.findIndex((p) => p.item === 0);
    expect(pres[first].mode).toBe('hear');
    const back = pres.map((p, i) => ({ p, i })).filter(({ p, i }) => p.item === 0 && i !== first);
    expect(back.every(({ p }) => p.mode === 'again')).toBe(true);
    expect(back).toHaveLength(RETURNS_AT.length);
    // Each return is no earlier than asked, and each gap is wider than the last.
    back.forEach(({ i }, k) => expect(at[i] - at[first]).toBeGreaterThanOrEqual(RETURNS_AT[k]));
    const gaps = back.map(({ i }, k) => at[i] - (k === 0 ? at[first] : at[back[k - 1].i]));
    for (let k = 1; k < gaps.length; k++) expect(gaps[k]).toBeGreaterThan(gaps[k - 1]);
  });

  it('takes the queue in order — saved and due words are heard first', () => {
    const pres = listenProgram(many(400), 30);
    const firsts = pres.filter((p) => p.mode === 'hear').map((p) => p.item);
    expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
    expect(firsts[0]).toBe(0);
  });

  it('turns a short queue into denser returns rather than silence', () => {
    const pres = listenProgram(many(3), 15);
    expect(wordsIn(pres)).toBe(3);
    // Three words cannot fill fifteen minutes; the program ends when their returns do.
    expect(pres).toHaveLength(3 * (1 + RETURNS_AT.length));
  });

  it('is empty for an empty queue', () => {
    expect(listenProgram([], 30)).toEqual([]);
  });

  it('plays the English on a first hearing and drops it on a return', () => {
    const items = [item(0)];
    const pres: Presentation[] = [{ item: 0, lane: 'listen', mode: 'hear' }, { item: 0, lane: 'listen', mode: 'again' }];
    const { segments } = layout(pres, [], items, () => 1);
    const clips = segments.map((s) => s.clip);
    const firstEnd = clips.indexOf(deKey('Das ist Wort0.'));
    expect(clips.slice(0, firstEnd + 1)).toEqual([deKey('das Wort0'), enKey('word 0'), deKey('das Wort0'), deKey('Das ist Wort0.')]);
    expect(clips.slice(firstEnd + 1)).toEqual([deKey('das Wort0'), deKey('Das ist Wort0.')]);
    expect(segments.some((s) => s.tone)).toBe(false);
  });

  it('asks for no English clip that only returns would use', () => {
    const items = [item(0), item(1)];
    const pres: Presentation[] = [{ item: 0, lane: 'listen', mode: 'hear' }, { item: 1, lane: 'listen', mode: 'again' }];
    const keys = clipsFor(pres, [], items);
    expect(keys).toContain(enKey('word 0'));
    expect(keys).not.toContain(enKey('word 1'));
  });
});

describe('Hören controls — skip and replay, read against the clock', () => {
  const items = many(3).map((it) => ({ ...it, example: undefined }));
  const pres: Presentation[] = [0, 1, 2].map((i) => ({ item: i, lane: 'listen', mode: 'hear' }));
  const { placed } = layout(pres, [], items, () => 1);

  it('finds the word playing at a moment', () => {
    expect(indexAt(placed, 0)).toBe(-1);
    expect(indexAt(placed, placed[1].start + 0.1)).toBe(1);
  });

  it('skips to the next word, and has nowhere to skip from the last', () => {
    expect(skipTarget(placed, placed[0].start + 0.5)).toBe(placed[1].start);
    expect(skipTarget(placed, placed[2].start + 0.5)).toBeNull();
  });

  it('replays the word playing, or the one before if it has only just begun', () => {
    expect(replayTarget(placed, placed[1].start + 3)).toBe(placed[1].start);
    expect(replayTarget(placed, placed[1].start + 0.5)).toBe(placed[0].start);
    expect(replayTarget(placed, 0)).toBe(0);
  });
});
