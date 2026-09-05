// Exposures are a count, never a grade.
//
// This file exists to make that structural rather than a matter of everyone
// remembering. The feed is the surface people use most and scrolling is the
// weakest event in the app; if an exposure ever reaches `review()`, every
// interval in the learner's collection silently drifts, and nothing on screen
// says so for weeks. Every assertion below is that separation.
import { describe, it, expect, vi } from 'vitest';
import type { Word } from './types.ts';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
}));

async function fresh() {
  vi.resetModules();
  localStorage.clear();
  const data = await import('./data/index.ts');
  const store = await import('./store.ts');
  const srs = await import('./srs.ts');
  return { data, store, srs };
}

const word = (id: string, field = 'Test', extra: Partial<Word> = {}): Word => ({
  id, term: id, en: id, pos: 'noun', level: 'A1',
  gender: null, plural: null, ipa: null, def: null,
  syn: [], ant: [], ex: [], field, kind: 'word', ...extra,
});

describe('an exposure is not a review', () => {
  it('writes no card, and leaves the word New', async () => {
    const { data, store } = await fresh();
    data.registerWords([word('a'), word('b')]);
    store.noteExposure('a');
    store.noteExposure('a');
    store.noteExposure('a');
    expect(store.exposureOf('a')).toBe(3);
    // The three assertions that matter, in the three vocabularies the app uses
    // to say "untouched".
    expect(store.cardOf('a')).toBeUndefined();
    expect(store.statusOf('a')).toBe('new');
    expect(store.totals().learned).toBe(0);
  });

  it('counts words, not scrolls', async () => {
    const { data, store } = await fresh();
    data.registerWords([word('a'), word('b')]);
    for (let i = 0; i < 20; i++) store.noteExposure('a');
    store.noteExposure('b');
    expect(store.metCount()).toBe(2);        // two words met
    expect(store.exposureOf('a')).toBe(20);  // one of them twenty times
  });

  it('does not move a real card that already exists', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('a')]);
    store.review('a', srs.Rating.Good);
    const before = store.cardOf('a');
    store.noteExposure('a');
    const after = store.cardOf('a');
    expect(after?.due).toEqual(before?.due);
    expect(after?.reps).toBe(before?.reps);
    expect(after?.stability).toBe(before?.stability);
  });
});

describe('what an exposure does earn', () => {
  it('ranks a repeatedly-met word into the next session', async () => {
    const { data, store } = await fresh();
    // Two eligible new words. Nothing distinguishes them but the dwelling.
    data.registerWords([word('plain', 'Zed'), word('lingered', 'Zed')]);
    store.noteExposure('lingered');
    store.noteExposure('lingered');
    const b = store.buildBriefing();
    expect(b.ids).toContain('lingered');
    expect(b.ids.indexOf('lingered')).toBeLessThan(
      b.ids.indexOf('plain') === -1 ? Infinity : b.ids.indexOf('plain'));
    expect(b.weakSectors).toContain('words you kept stopping on');
  });

  it('takes two dwells, not one — a single stop is a bus stop', async () => {
    const { data, store } = await fresh();
    data.registerWords([word('once', 'Zed')]);
    store.noteExposure('once');
    // It may still be taught (it is an eligible new word like any other); what it
    // must not do is claim the preference slot on one look.
    expect(store.buildBriefing().weakSectors).not.toContain('words you kept stopping on');
  });

  it('never promotes a word out of the learner’s level scope', async () => {
    const { data, store } = await fresh();
    data.registerWords([word('deep', 'Zed', { level: 'C2' })]);
    store.setLevels(new Set(['A1'] as const));
    for (let i = 0; i < 5; i++) store.noteExposure('deep');
    expect(store.buildBriefing().ids).not.toContain('deep');
  });
});
