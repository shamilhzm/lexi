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
  it('always opens with meaning, and never on its own', async () => {
    const { data, drill, surface } = await fresh();
    data.registerWords([HUND, LAUFEN]);
    surface.resetSurfaceIndex();
    // A brand-new verb has no gender, no plural, and recall is gated on the flip
    // being known — it used to get **one** multiple-choice question, which is a
    // poor answer to "practise this word". `reverse` and the sentence gap apply
    // to every card, which is what puts a floor under it.
    for (const w of [LAUFEN, HUND]) {
      const steps = drill.stepsFor(w, ['läuft']);
      expect(steps[0], `${w.term} opens on meaning`).toBe('meaning');
      expect(steps.length, `${w.term} gets a real run`).toBeGreaterThanOrEqual(3);
      expect(new Set(steps).size, `${w.term} repeats no step`).toBe(steps.length);
    }
  });

  it('caps the run, however much a word qualifies for', async () => {
    const { data, drill, surface, store, srs } = await fresh();
    // A noun with everything: gender, plural, synonyms, an example, and known.
    const rich = word('reich', 'der Freund', {
      en: 'friend', gender: 'der', plural: 'die Freunde',
      syn: ['der Kumpel'], ex: [{ de: 'Mein Freund kommt.', en: 'My friend is coming.', lvl: 'A1' }],
    });
    data.registerWords([rich, word('other', 'der Baum', { en: 'tree', gender: 'der' })]);
    surface.resetSurfaceIndex();
    store.review('reich', srs.Rating.Easy);
    const all = (await import('../views/drills.tsx')).practiceModes(rich, ['Freundes']);
    expect(all.length, 'this word qualifies for plenty').toBeGreaterThan(4);
    expect(drill.stepsFor(rich, ['Freundes']).length, 'the run is still bounded').toBeLessThanOrEqual(4);
  });

  it('adds recall once the word is known, and not before', async () => {
    const { data, store, srs, drill, surface } = await fresh();
    data.registerWords([HUND, LAUFEN, word('gehen', 'gehen', { en: 'to go', pos: 'verb' })]);
    surface.resetSurfaceIndex();

    expect(drill.stepsFor(LAUFEN)).not.toContain('recall');
    // One good answer leaves New but lands in Learning, which is not enough:
    // production before the form–meaning link exists is a lapse on a word the
    // learner never had. See the note in `practiceModes`.
    store.review('laufen', srs.Rating.Good);
    expect(drill.stepsFor(LAUFEN)).not.toContain('recall');

    store.review('gehen', srs.Rating.Easy);   // Easy goes straight to Review
    const known = drill.stepsFor(data.BY_ID.get('gehen')!);
    expect(known).toContain('recall');
    // …and it closes the run: typing a word cold from its English is the hardest
    // thing in the bank and belongs after the rest has warmed the learner up.
    expect(known[known.length - 1]).toBe('recall');
  });

  it('pins the ends and varies the middle', async () => {
    const { data, store, srs, drill, surface } = await fresh();
    data.registerWords([HUND, word('katze', 'die Katze', { en: 'cat', gender: 'die', plural: 'die Katzen' })]);
    surface.resetSurfaceIndex();
    store.review('hund', srs.Rating.Easy);
    // The order is the assertion at the ends and deliberately *not* in between:
    // a word met three times should not be the same three questions three times,
    // which is the whole point of having a bank.
    const runs = Array.from({ length: 12 }, () => drill.stepsFor(HUND, ['Hundes']));
    for (const r of runs) {
      expect(r[0]).toBe('meaning');
      if (r.includes('recall')) expect(r[r.length - 1]).toBe('recall');
    }
    const middles = new Set(runs.map((r) => r.slice(1, -1).join(',')));
    expect(middles.size, 'the middle actually varies').toBeGreaterThan(1);
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
    expect(opened).not.toContain('recall');
    store.review('hund', srs.Rating.Easy);
    expect(drill.stepsFor(HUND)).toContain('recall');   // the trap is real
    expect(opened).not.toContain('recall');             // the snapshot is not
  });
});
