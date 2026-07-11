// Store + session math: the daily briefing, weakest-sector ranking, and the
// blind-spot drill weaving. These read the live lexicon and FSRS card state, so
// each test loads a fresh module graph (empty WORDS + card map) and seeds fixtures
// via registerWords. IndexedDB is mocked; localStorage is shimmed in test-setup.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Word } from './types.ts';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
}));

/** Reset the module registry so module-global lexicon + card state don't leak
 *  between tests, then import the (shared) fresh graph. */
async function fresh() {
  vi.resetModules();
  const data = await import('./data/index.ts');
  const store = await import('./store.ts');
  const session = await import('./session.ts');
  const srs = await import('./srs.ts');
  const fundamentals = await import('./views/Fundamentals.tsx');
  return { data, store, session, srs, fundamentals };
}

function word(id: string, field: string, extra: Partial<Word> = {}): Word {
  return {
    id, term: id, en: '', pos: 'noun', level: 'A1',
    gender: null, plural: null, ipa: null, def: null,
    syn: [], ant: [], ex: [], field, kind: 'word', ...extra,
  };
}

beforeEach(() => { localStorage.clear(); });

describe('buildBriefing', () => {
  it('fills fresh cards from the weakest sectors when nothing is due', async () => {
    const { data, store } = await fresh();
    data.registerWords([
      ...Array.from({ length: 5 }, (_, i) => word(`a${i}`, 'Sector A')),
      ...Array.from({ length: 5 }, (_, i) => word(`b${i}`, 'Sector B')),
    ]);

    const b = store.buildBriefing();

    expect(b.due).toBe(0);
    expect(b.fresh).toBe(10);              // all new; the 20-card target isn't reached
    expect(b.ids).toHaveLength(10);
    expect(new Set(b.ids).size).toBe(10);  // no duplicates
    expect(b.weakSectors.length).toBeGreaterThan(0);
    for (const id of b.ids) expect(store.statusOf(id)).toBe('new');
  });

  it('excludes cards that have been touched but are not yet due', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords(Array.from({ length: 6 }, (_, i) => word(`c${i}`, 'Sector C')));

    store.review('c0', srs.Rating.Easy); // leaves New; next due is in the future

    expect(store.statusOf('c0')).not.toBe('new');
    const b = store.buildBriefing();
    expect(b.ids).not.toContain('c0');     // not fresh (touched) and not due
    expect(b.ids).toContain('c1');         // still-new siblings remain eligible
  });
});

describe('weakestSectors', () => {
  it('ranks lower-coverage sectors first', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([
      word('lo0', 'Low'), word('lo1', 'Low'),
      word('hi0', 'High'), word('hi1', 'High'),
    ]);

    store.review('hi0', srs.Rating.Easy); // "High" is now partly covered

    const ranked = store.weakestSectors(10).map((s) => s.name);
    expect(ranked).toContain('Low');
    expect(ranked).toContain('High');
    expect(ranked.indexOf('Low')).toBeLessThan(ranked.indexOf('High'));
  });

  it('skips sectors with nothing new and nothing due', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('d0', 'Done')]);

    store.review('d0', srs.Rating.Easy); // no new cards, not due -> nothing to offer

    expect(store.weakestSectors(10).map((s) => s.name)).not.toContain('Done');
  });
});

describe('blindSpotDrills (weakModes)', () => {
  it('is empty when there are no logged misses', async () => {
    const { data, session } = await fresh();
    const w = word('g0', 'G', { gender: 'die' });
    data.registerWords([w]);

    expect(session.blindSpotDrills([w])).toEqual([]);
  });

  it('weaves drills for the modes you miss most, capped and de-duplicated', async () => {
    const { data, store, session, fundamentals } = await fresh();
    const words = Array.from({ length: 6 }, (_, i) => word(`n${i}`, 'Nouns', { gender: 'die' }));
    data.registerWords(words);

    store.logMiss(fundamentals.MODE_TAG.gender);
    const drills = session.blindSpotDrills(words);

    expect(drills).toHaveLength(4); // MAX_BLIND_SPOTS
    expect(drills.every((d) => d.type === 'gender')).toBe(true);
    expect(drills.every((d) => d.srsId.startsWith('gym:gender:'))).toBe(true);
    expect(new Set(drills.map((d) => d.srsId)).size).toBe(4); // distinct words
  });

  it('only drills modes the word is eligible for', async () => {
    const { data, store, session, fundamentals } = await fresh();
    // A word with no gender/plural/example is eligible for no word-drill modes.
    const w = word('p0', 'Plain');
    data.registerWords([w]);

    store.logMiss(fundamentals.MODE_TAG.gender);
    expect(session.blindSpotDrills([w])).toEqual([]);
  });
});
