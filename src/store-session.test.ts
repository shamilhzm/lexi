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

  it('floats interest-group sectors to the front', async () => {
    const { data, store } = await fresh();
    // "Big" has more cards (so it leads by default); "Small" is in a chosen topic.
    data.registerWords([
      word('big0', 'Big'), word('big1', 'Big'),
      word('sm0', 'Small'),
    ]);
    data.SECTOR_FINEGROUP.set('Big', 'Work & Economy');
    data.SECTOR_FINEGROUP.set('Small', 'Food & Drink');

    const before = store.weakestSectors(10).map((s) => s.name);
    expect(before.indexOf('Big')).toBeLessThan(before.indexOf('Small')); // default: by size

    store.setInterests(new Set(['Food & Drink']));
    const after = store.weakestSectors(10).map((s) => s.name);
    expect(after.indexOf('Small')).toBeLessThan(after.indexOf('Big'));   // interest wins
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

describe('buildMixedSession', () => {
  const flips = (items: { type: string; word: { id: string } }[]) =>
    items.filter((it) => it.type === 'flip').map((it) => it.word.id);
  const custom = (ids: string[]) => ({ kind: 'custom' as const, name: 'test', ids });

  it('is pure flips, in order, when no word qualifies for a drill', async () => {
    const { data, session } = await fresh();
    // Plain words: no gender/plural/verb/example -> no eligible modes.
    const words = ['p0', 'p1', 'p2'].map((id) => word(id, 'Plain'));
    data.registerWords(words);

    const out = session.buildMixedSession(custom(['p0', 'p1', 'p2']));

    expect(out).toHaveLength(3);
    expect(out.every((it) => it.type === 'flip')).toBe(true);
    expect(flips(out)).toEqual(['p0', 'p1', 'p2']); // order preserved
  });

  it('weaves one fresh drill per eligible word, keeping flip order', async () => {
    const { data, session } = await fresh();
    // gender-only eligibility -> the fresh-mode pick is deterministic.
    const words = ['g0', 'g1', 'g2'].map((id) => word(id, 'Nouns', { gender: 'die' }));
    data.registerWords(words);

    const out = session.buildMixedSession(custom(['g0', 'g1', 'g2']));

    expect(flips(out)).toEqual(['g0', 'g1', 'g2']);
    const drills = out.filter((it) => it.type !== 'flip');
    expect(drills).toHaveLength(3); // one per word
    expect(drills.every((d) => d.type === 'gender')).toBe(true);
    expect(drills.every((d) => d.srsId.startsWith('gym:gender:'))).toBe(true);
  });

  it('caps fresh drills at MAX_FRESH_DRILLS (10)', async () => {
    const { data, session } = await fresh();
    const ids = Array.from({ length: 12 }, (_, i) => `m${i}`);
    data.registerWords(ids.map((id) => word(id, 'Many', { gender: 'die' })));

    const out = session.buildMixedSession(custom(ids));

    expect(flips(out)).toEqual(ids);                       // all 12 flips, in order
    expect(out.filter((it) => it.type !== 'flip')).toHaveLength(10); // fresh cap
  });
});

describe('vocabulary→grammar loop', () => {
  const custom = (ids: string[]) => ({ kind: 'custom' as const, name: 'test', ids });
  const gpoint = (id: string, term: string, level: Word['level'] = 'B1'): Word =>
    word(id, 'Grammar', { kind: 'grammar', term, level, pos: 'grammar' });

  it('weaves a linked grammar point in after its trigger word', async () => {
    const { data, session } = await fresh();
    const trigger = word('w0', 'Connectors', { term: 'obwohl' });
    const point = gpoint('gram:B1:Konzessivsätze: obwohl', 'Konzessivsätze: obwohl');
    data.registerWords([trigger, point]);

    const out = session.buildMixedSession(custom(['w0']));

    const at = out.findIndex((it) => it.srsId === point.id);
    expect(at).toBeGreaterThan(out.findIndex((it) => it.srsId === 'w0')); // after the word
    expect(out.filter((it) => it.srsId === point.id)).toHaveLength(1);    // no duplicate
  });

  it('stops linking once the point is comfortably scheduled', async () => {
    const { data, store, session, srs } = await fresh();
    const trigger = word('w0', 'Connectors', { term: 'obwohl' });
    const point = gpoint('gram:B1:Konzessivsätze: obwohl', 'Konzessivsätze: obwohl');
    data.registerWords([trigger, point]);

    store.review(point.id, srs.Rating.Easy); // scheduled into the future

    expect(session.linkedGrammar([trigger])).toEqual([]);
  });

  it('injects a remediation point after repeated misses in a mode', async () => {
    const { data, store, session, fundamentals } = await fresh();
    const point = gpoint('gram:A1:Artikel & Genus', 'Artikel & Genus', 'A1');
    data.registerWords([point]);

    store.logMiss(fundamentals.MODE_TAG.gender);
    store.logMiss(fundamentals.MODE_TAG.gender);
    expect(session.remedyGrammar()).toEqual([]); // below threshold (3)

    store.logMiss(fundamentals.MODE_TAG.gender);
    const out = session.remedyGrammar();
    expect(out).toHaveLength(1);
    expect(out[0].srsId).toBe(point.id);
  });

  it('maps only to grammar-point ids that exist in the shipped lexicon', async () => {
    // Guards the WORD_POINT / MODE_REMEDY maps against title drift in vocab.json.
    const fs = await import('node:fs');
    const vocab = JSON.parse(fs.readFileSync('public/data/vocab.json', 'utf8')) as Word[];
    const ids = new Set(vocab.filter((w) => w.kind === 'grammar').map((w) => w.id));
    const src = fs.readFileSync('src/session.ts', 'utf8');
    const referenced = [...src.matchAll(/'(gram:[^']+)'/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) expect(ids, `missing grammar card: ${id}`).toContain(id);
  });
});

describe('streak / visits', () => {
  it('is 0 with no visits and 1 after visiting today', async () => {
    const { store } = await fresh();
    expect(store.streak()).toBe(0);
    store.recordVisit();
    expect(store.streak()).toBe(1);
    store.recordVisit(); // same day -> idempotent
    expect(store.streak()).toBe(1);
  });

  it('counts consecutive days', async () => {
    const { store } = await fresh();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-09T12:00:00Z'));
      store.recordVisit();
      vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));
      store.recordVisit();
      vi.setSystemTime(new Date('2026-07-11T12:00:00Z'));
      store.recordVisit();
      expect(store.streak()).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('breaks the streak on a skipped day', async () => {
    const { store } = await fresh();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-09T12:00:00Z'));
      store.recordVisit();
      vi.setSystemTime(new Date('2026-07-11T12:00:00Z')); // skipped the 10th
      store.recordVisit();
      expect(store.streak()).toBe(1); // only today counts
    } finally {
      vi.useRealTimers();
    }
  });
});
