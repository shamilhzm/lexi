// What the graduation cap opens, as the learner's own progress changes it.
//
// `stepsFor` reads FSRS state through `eligibleModes`, so the interesting cases
// are not properties of a word — they are properties of a word *and* a learner.
// The corpus sweep in views/word-drill.test.ts cannot see them: it runs with an
// empty card map, where nothing is known and recall never appears.
import { describe, it, expect, vi } from 'vitest';
import type { Word } from '../types.ts';

vi.mock('../lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
}));

async function fresh() {
  vi.resetModules();
  const data = await import('../data/index.ts');
  const store = await import('../store.ts');
  const srs = await import('../srs.ts');
  const drill = await import('./WordDrill.tsx');
  const surface = await import('../lib/surface.ts');
  return { data, store, srs, drill, surface };
}

const word = (id: string, term: string, extra: Partial<Word> = {}): Word => ({
  id, term, en: id, pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...extra,
});

const HUND = word('hund', 'der Hund', { en: 'dog', gender: 'der', plural: 'die Hunde' });
const LAUFEN = word('laufen', 'laufen', { en: 'to run', pos: 'verb' });

describe('stepsFor', () => {
  it('always opens with meaning, so no word opens an empty sheet', async () => {
    const { data, drill, surface } = await fresh();
    data.registerWords([HUND, LAUFEN]);
    surface.resetSurfaceIndex();
    // A brand-new verb: no gender, no plural, and recall is gated on the flip
    // being known. Without the meaning step this is the empty sheet.
    expect(drill.stepsFor(LAUFEN)).toEqual(['meaning']);
    expect(drill.stepsFor(HUND)).toEqual(['meaning', 'gender', 'plural']);
  });

  it('adds recall once the word is known, and not before', async () => {
    const { data, store, srs, drill, surface } = await fresh();
    data.registerWords([HUND, LAUFEN, word('gehen', 'gehen', { en: 'to go', pos: 'verb' })]);
    surface.resetSurfaceIndex();

    expect(drill.stepsFor(LAUFEN)).toEqual(['meaning']);
    // One good answer leaves New but lands in Learning, which is not enough:
    // production before the form–meaning link exists is a lapse on a word the
    // learner never had. See the note in `eligibleModes`.
    store.review('laufen', srs.Rating.Good);
    expect(drill.stepsFor(LAUFEN)).toEqual(['meaning']);

    store.review('gehen', srs.Rating.Easy);   // Easy goes straight to Review
    expect(drill.stepsFor(data.BY_ID.get('gehen')!)).toEqual(['meaning', 'recall']);
  });

  it('asks a known noun for all four, in teaching order', async () => {
    const { data, store, srs, drill, surface } = await fresh();
    data.registerWords([HUND, word('katze', 'die Katze', { en: 'cat', gender: 'die', plural: 'die Katzen' })]);
    surface.resetSurfaceIndex();
    store.review('hund', srs.Rating.Easy);
    // Recognise it, then its grammatical properties, then produce it — and the
    // order is the assertion, not just the membership.
    expect(drill.stepsFor(HUND)).toEqual(['meaning', 'gender', 'plural', 'recall']);
  });

  it('does not grow the run underneath a learner who is doing well', async () => {
    // `WordDrill` fixes the list when the sheet opens. If it recomputed per item,
    // getting the meaning right on a new word could push its status to Learning
    // and — one more review later — grow a fourth question onto a three-question
    // run. A run that gets longer the better you do is a punishment.
    const { data, store, srs, drill, surface } = await fresh();
    data.registerWords([HUND]);
    surface.resetSurfaceIndex();
    const opened = drill.stepsFor(HUND);
    store.review('hund', srs.Rating.Easy);
    expect(drill.stepsFor(HUND).length).toBeGreaterThan(opened.length);  // the trap is real
    expect(opened).toEqual(['meaning', 'gender', 'plural']);             // the snapshot is not
  });
});
