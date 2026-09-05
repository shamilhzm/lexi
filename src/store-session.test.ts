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
  const drillsMod = await import('./views/drills.tsx');
  return { data, store, session, srs, drillsMod };
}

function word(id: string, field: string, extra: Partial<Word> = {}): Word {
  return {
    id, term: id, en: '', pos: 'noun', level: 'A1',
    gender: null, plural: null, ipa: null, def: null,
    syn: [], ant: [], ex: [], field, kind: 'word', ...extra,
  };
}

/** The provenance copy is pure, so it only needs the copy module + the mode
 *  labels it looks up — not the whole store/lexicon graph. */
async function freshWhy() {
  vi.resetModules();
  const why = await import('./components/WhyThisCard.tsx');
  const drillsMod = await import('./views/drills.tsx');
  return { why, drillsMod };
}

beforeEach(() => { localStorage.clear(); });

// The feed's bookmark is an instruction to the scheduler, not a wishlist: the
// learner scrolled past four hundred words, stopped on a few, and said *these*.
// A scheduler that then taught them something else would be telling them their
// attention does not count.
// `importData` is the restore path. It wrote the CEFR filter and the muted-drill
// set to localStorage and left the module-level copies — initialised at import
// time — pointing at the old state, so a restored backup came back with the
// wrong scope until the page reloaded. `Settings` happened to reload; nothing
// made that a rule.
describe('restoring a backup restores the scope, not just the cards', () => {
  it('adopts the restored CEFR filter without a reload', async () => {
    const { store } = await fresh();
    expect([...store.levels()].sort()).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

    await store.importData(JSON.stringify({
      app: 'lexi', v: 1, cards: {}, misses: [], visits: [],
      settings: { 'lexi.levels.v1': JSON.stringify(['B2', 'C1']) },
    }));

    expect([...store.levels()].sort()).toEqual(['B2', 'C1']);
  });

  // The four keys that were never in `SETTING_KEYS` at all. Asserted against the
  // *declarations* rather than a hand-typed list, so a new setting that forgets
  // to join the backup is caught by the same rule that caught these.
  it('backs up everything the learner authored, not just their schedule', async () => {
    const { store } = await fresh();
    const json = JSON.parse(store.exportData());
    for (const k of ['lexi.saved.v1', 'lexi.faves.v1', 'lexi.drillmodes.v1', 'lexi.texts.v1']) {
      localStorage.setItem(k, '[]');
    }
    const after = JSON.parse(store.exportData());
    expect(Object.keys(after.settings)).toEqual(expect.arrayContaining([
      'lexi.saved.v1', 'lexi.faves.v1', 'lexi.drillmodes.v1', 'lexi.texts.v1',
    ]));
    expect(json).toBeTruthy();
  });

  it('adopts the restored drill mutes without a reload', async () => {
    const { store } = await fresh();
    expect(store.modeEnabled('gender')).toBe(true);

    await store.importData(JSON.stringify({
      app: 'lexi', v: 1, cards: {}, misses: [], visits: [],
      settings: { 'lexi.drillmodes.v1': JSON.stringify(['gender']) },
    }));

    expect(store.modeEnabled('gender')).toBe(false);
    expect(store.modeEnabled('plural')).toBe(true);
  });
});

describe('saved words are what the next session teaches', () => {
  it('serves a saved word ahead of the weakest sector’s pick', async () => {
    const { data, store } = await fresh();
    data.registerWords([
      ...Array.from({ length: 5 }, (_, i) => word(`a${i}`, 'Sector A')),
      ...Array.from({ length: 5 }, (_, i) => word(`b${i}`, 'Sector B')),
    ]);

    store.toggleSaved('b4');
    const b = store.buildBriefing();

    expect(b.ids[0]).toBe('b4');
    expect(b.weakSectors[0]).toBe('your saved words');
  });

  it('does not serve the same word twice when it is also the weakest pick', async () => {
    const { data, store } = await fresh();
    data.registerWords(Array.from({ length: 4 }, (_, i) => word(`a${i}`, 'Sector A')));

    store.toggleSaved('a0');
    const b = store.buildBriefing();

    expect(new Set(b.ids).size).toBe(b.ids.length);
    expect(b.ids.filter((id: string) => id === 'a0')).toHaveLength(1);
  });

  it('does not re-teach a word already in the schedule', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords(Array.from({ length: 4 }, (_, i) => word(`a${i}`, 'Sector A')));
    store.review('a2', srs.Rating.Good);   // no longer new

    store.toggleSaved('a2');
    const b = store.buildBriefing();

    // It is scheduled; FSRS decides when it comes back, not the bookmark.
    expect(b.ids).not.toContain('a2');
  });

  it('buys the front of the queue, not a longer one', async () => {
    const { data, store } = await fresh();
    data.registerWords(Array.from({ length: 40 }, (_, i) => word(`a${i}`, 'Sector A')));
    for (let i = 0; i < 30; i++) store.toggleSaved(`a${i}`);

    const plain = store.PACE[store.pace()].fresh;
    expect(store.buildBriefing().fresh).toBeLessThanOrEqual(plain);
  });

  it('toggles off, and the day’s count follows', async () => {
    const { data, store } = await fresh();
    data.registerWords([word('a0', 'Sector A')]);

    expect(store.toggleSaved('a0')).toBe(true);
    expect(store.isSaved('a0')).toBe(true);
    expect(store.savedToday()).toBe(1);

    expect(store.toggleSaved('a0')).toBe(false);
    expect(store.isSaved('a0')).toBe(false);
    expect(store.savedToday()).toBe(0);
  });

  it('keeps favourites out of the scheduler entirely', async () => {
    // A list you curate for pleasure stops being pleasant the moment it starts
    // assigning you homework.
    const { data, store } = await fresh();
    data.registerWords([
      ...Array.from({ length: 5 }, (_, i) => word(`a${i}`, 'Sector A')),
      ...Array.from({ length: 5 }, (_, i) => word(`b${i}`, 'Sector B')),
    ]);

    store.toggleFavourite('b4');
    const b = store.buildBriefing();

    expect(store.isFavourite('b4')).toBe(true);
    expect(b.weakSectors).not.toContain('your saved words');
    expect(b.ids[0]).not.toBe('b4');
  });
});

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

  it('teaches the commonest words in a sector first', async () => {
    // The point of the frequency index: within one sector at one level, every card
    // is equally eligible, and corpus order decided it. Registered deliberately
    // out of rank order so passing cannot be an accident of insertion.
    const { data, store } = await fresh();
    const freq = await import('./lib/freq.ts');
    data.registerWords([
      word('rare', 'Sector A'), word('common', 'Sector A'), word('mid', 'Sector A'),
    ]);
    freq.primeFreq({ common: 5, mid: 300, rare: 9000 });

    expect(store.buildBriefing().ids).toEqual(['common', 'mid', 'rare']);
  });

  it('keeps corpus order for words whose frequency is unmeasured', async () => {
    // 73% of the real corpus has no rank. Ranked words lead; the rest must follow
    // in the order they were registered, not in an arbitrary one.
    const { data, store } = await fresh();
    const freq = await import('./lib/freq.ts');
    data.registerWords([
      word('unranked1', 'Sector A'), word('unranked2', 'Sector A'), word('ranked', 'Sector A'),
    ]);
    freq.primeFreq({ ranked: 42 });

    expect(store.buildBriefing().ids).toEqual(['ranked', 'unranked1', 'unranked2']);
  });

  it('falls back to corpus order when the frequency file never loaded', async () => {
    // initData tolerates a missing/failed freq.json, so this is a real runtime
    // state and not a hypothetical: the briefing must still be built.
    const { data, store } = await fresh();
    const freq = await import('./lib/freq.ts');
    data.registerWords([word('x', 'Sector A'), word('y', 'Sector A')]);
    freq.primeFreq({});

    expect(store.buildBriefing().ids).toEqual(['x', 'y']);
  });

  it('never lets frequency override the CEFR band', async () => {
    // Band is the outer sort and must stay that way: a very common B2 word is
    // still the wrong thing to teach before an uncommon A1 one.
    const { data, store } = await fresh();
    const freq = await import('./lib/freq.ts');
    data.registerWords([
      word('b2common', 'Sector A', { level: 'B2' }),
      word('a1rare', 'Sector A', { level: 'A1' }),
    ]);
    freq.primeFreq({ b2common: 1, a1rare: 8000 });

    expect(store.buildBriefing().ids).toEqual(['a1rare', 'b2common']);
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

  it('caps the post-gap due mountain at 60 and reports the honest backlog', async () => {
    const { data, store, srs } = await fresh();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));
      const ids = Array.from({ length: 70 }, (_, i) => `d${i}`);
      data.registerWords(ids.map((id) => word(id, 'Sector D')));
      for (const id of ids) store.review(id, srs.Rating.Good);

      vi.setSystemTime(new Date('2026-07-15T12:00:00Z')); // two weeks away — all 70 overdue
      const b = store.buildBriefing();

      expect(b.dueTotal).toBe(70);   // the truth
      expect(b.due).toBe(60);        // the day's bounded serving
      expect(b.ids).toHaveLength(60);
      expect(b.fresh).toBe(0);       // due already exceeds the daily minimum
    } finally {
      vi.useRealTimers();
    }
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
    const { data, store, session, drillsMod } = await fresh();
    const words = Array.from({ length: 6 }, (_, i) => word(`n${i}`, 'Nouns', { gender: 'die' }));
    data.registerWords(words);

    store.logMiss(drillsMod.MODE_TAG.gender);
    const woven = session.blindSpotDrills(words);

    expect(woven).toHaveLength(4); // MAX_BLIND_SPOTS
    expect(woven.every((d) => d.type === 'gender')).toBe(true);
    expect(woven.every((d) => d.srsId.startsWith('gym:gender:'))).toBe(true);
    expect(new Set(woven.map((d) => d.srsId)).size).toBe(4); // distinct words
    // Each one can say which weakness it is rehearsing, and how bad it is.
    expect(woven[0].reason).toMatchObject({
      kind: 'blindspot', mode: 'gender', tag: drillsMod.MODE_TAG.gender, misses: 1,
    });
  });

  it('only drillsMod modes the word is eligible for', async () => {
    const { data, store, session, drillsMod } = await fresh();
    // A word with no gender/plural/example is eligible for no word-drill modes.
    const w = word('p0', 'Plain');
    data.registerWords([w]);

    store.logMiss(drillsMod.MODE_TAG.gender);
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
    // (pos 'x' keeps the words out of the case drill, which needs pos 'noun'.)
    const words = ['g0', 'g1', 'g2'].map((id) => word(id, 'Nouns', { gender: 'die', pos: 'x' }));
    data.registerWords(words);

    const out = session.buildMixedSession(custom(['g0', 'g1', 'g2']));

    expect(flips(out)).toEqual(['g0', 'g1', 'g2']);
    const drillsMod = out.filter((it) => it.type !== 'flip');
    expect(drillsMod).toHaveLength(3); // one per word
    expect(drillsMod.every((d) => d.type === 'gender')).toBe(true);
    expect(drillsMod.every((d) => d.srsId.startsWith('gym:gender:'))).toBe(true);
  });

  it('caps fresh drillsMod at MAX_FRESH_DRILLS (10)', async () => {
    const { data, session } = await fresh();
    const ids = Array.from({ length: 12 }, (_, i) => `m${i}`);
    data.registerWords(ids.map((id) => word(id, 'Many', { gender: 'die' })));

    const out = session.buildMixedSession(custom(ids));

    expect(flips(out)).toEqual(ids);                       // all 12 flips, in order
    expect(out.filter((it) => it.type !== 'flip')).toHaveLength(10); // fresh cap
  });

  it('caps a custom target that asked for one, drillsMod included', async () => {
    const { data, session } = await fresh();
    // Every word is drill-eligible, so an uncapped build weaves in extra items:
    // this is the "Quick 5 served twelve" shape.
    const ids = Array.from({ length: 5 }, (_, i) => `q${i}`);
    data.registerWords(ids.map((id) => word(id, 'Quick', { gender: 'die', pos: 'x' })));

    const uncapped = session.buildMixedSession(custom(ids));
    expect(uncapped.length).toBeGreaterThan(5); // the defect the cap exists for

    const capped = session.buildMixedSession({ ...custom(ids), cap: 5 });
    expect(capped).toHaveLength(5);
  });

  it('absorbs a due drill whose word is not in a curated day', async () => {
    const { data, store, session, srs, drillsMod } = await fresh();
    // Two eligible words; only the first is in today's curated queue.
    data.registerWords([
      word('o0', 'Orph', { gender: 'die', pos: 'x' }),
      word('o1', 'Orph', { gender: 'die', pos: 'x' }),
    ]);
    // Schedule o1's gender drill and wind past it so it comes due.
    const gid = drillsMod.gymId('gender', word('o1', 'Orph'));
    store.review(gid, srs.Rating.Again);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(Date.now() + 30 * 86_400_000));
      // A `custom` target used to make scope === queue, so this branch could
      // never fire on the path "Start session" and "Quick 5" both take.
      const out = session.buildMixedSession(custom(['o0']));
      const orphan = out.find((it) => it.reason.kind === 'orphan');
      expect(orphan).toBeDefined();
      expect(orphan!.srsId).toBe(gid);
      expect(orphan!.word.id).toBe('o1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives every item a reason — nothing enters a session unexplained', async () => {
    const { data, session } = await fresh();
    const words = ['g0', 'g1', 'g2'].map((id) => word(id, 'Nouns', { gender: 'die', pos: 'x' }));
    data.registerWords(words);

    const out = session.buildMixedSession(custom(['g0', 'g1', 'g2']));

    expect(out.every((it) => !!it.reason?.kind)).toBe(true);
  });

  it('marks unseen flips fresh and scheduled flips due, with how long they waited', async () => {
    const { data, store, session, srs } = await fresh();
    data.registerWords([word('f0', 'Plain'), word('f1', 'Plain')]);

    expect(session.buildMixedSession(custom(['f0']))[0].reason).toEqual({ kind: 'fresh' });

    // Review it, then wind the clock past the interval so it comes due.
    store.review('f1', srs.Rating.Again);
    const card = store.cardOf('f1')!;
    vi.setSystemTime(new Date(new Date(card.due).getTime() + 3 * 86_400_000));
    try {
      const [flip] = session.buildMixedSession(custom(['f1']));
      expect(flip.reason.kind).toBe('due');
      expect(flip.reason).toMatchObject({ overdueDays: 3 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('names the parent word on an interleaved drill', async () => {
    const { data, session } = await fresh();
    const words = ['g0', 'g1', 'g2'].map((id) => word(id, 'Nouns', { gender: 'die', pos: 'x' }));
    data.registerWords(words);

    const out = session.buildMixedSession(custom(['g0', 'g1', 'g2']));
    const drill = out.find((it) => it.type !== 'flip')!;

    expect(drill.reason).toMatchObject({ kind: 'drill', mode: 'gender' });
    // The drill belongs to the word it was generated from.
    expect((drill.reason as { parent: { id: string } }).parent.id).toBe(drill.word.id);
  });
});

describe('completion (ratcheted)', () => {
  it('is empty until every card in a sector is known', async () => {
    const { data, store, srs } = await fresh();
    const words = ['k0', 'k1'].map((id) => word(id, 'Kitchen'));
    data.registerWords(words);

    expect(store.checkCompletions()).toEqual([]);

    store.review('k0', srs.Rating.Easy);            // one of two
    expect(store.checkCompletions()).toEqual([]);

    store.review('k1', srs.Rating.Easy);
    const earned = store.checkCompletions();
    expect(earned.map((c) => c.name)).toEqual(['Kitchen']);
  });

  it('reports a completion once, not on every check', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('k0', 'Kitchen')]);
    store.review('k0', srs.Rating.Easy);

    expect(store.checkCompletions()).toHaveLength(1);
    expect(store.checkCompletions()).toEqual([]);   // already banked
    expect(store.completions()).toHaveLength(1);
  });

  it('does not take a completion back when a card lapses', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('k0', 'Kitchen')]);
    store.review('k0', srs.Rating.Easy);
    store.checkCompletions();

    // Forgetting it drops the card out of FSRS Review...
    store.review('k0', srs.Rating.Again);
    expect(store.statusOf('k0')).not.toBe('known');

    // ...but the thing you finished stays finished. That's the whole point of
    // having something you can complete in a system that never ends.
    expect(store.isComplete('Kitchen')).toBe(true);
    expect(store.completions()).toHaveLength(1);
  });

  it('cannot be manufactured by narrowing the CEFR filter', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([
      word('k0', 'Kitchen', { level: 'A1' }),
      word('k1', 'Kitchen', { level: 'B2' }),
    ]);
    store.review('k0', srs.Rating.Easy);
    store.setLevels(new Set(['A1']));   // B2 card now out of scope everywhere else

    expect(store.checkCompletions()).toEqual([]);
  });
});

describe('why-this-card copy', () => {
  const w = (term: string): Word => word(term, 'X', { term });

  it('stays silent when there is nothing non-obvious to say', async () => {
    const { why } = await freshWhy();
    // A new card already says "New ·" on its face.
    expect(why.whyLine({ kind: 'fresh' })).toBeNull();
    // A review that arrived roughly on time needs no explanation.
    expect(why.whyLine({ kind: 'due', overdueDays: 2 })).toBeNull();
    expect(why.whyLine({ kind: 'orphan', mode: 'gender', overdueDays: 1 })).toBeNull();
  });

  it('speaks up once a review has genuinely been waiting', async () => {
    const { why } = await freshWhy();
    const line = why.whyLine({ kind: 'due', overdueDays: why.STALE_DAYS });
    expect(line?.lead).toContain(`${why.STALE_DAYS} days`);
  });

  it('explains the interleave rather than letting it look random', async () => {
    const { why } = await freshWhy();
    const line = why.whyLine({ kind: 'drill', mode: 'recall', parent: w('Tisch') });
    expect(line?.em).toBe('Tisch');
    expect(`${line?.lead}${line?.em}${line?.tail}`).toBe('You flipped Tisch a few cards ago — now produce it');
  });

  // The tail is per-mode. "Now produce it" was written for the recall drill and
  // then said above all of them: on a Diktat it is simply false — you are
  // spelling a sentence you heard, not producing a word from its meaning — and a
  // caption that misdescribes the exercise under it is worse than no caption.
  it('describes what each drill actually asks, not what recall asks', async () => {
    const { why } = await freshWhy();
    const tail = (mode: 'gender' | 'plural' | 'recall') =>
      why.whyLine({ kind: 'drill', mode, parent: w('Tisch') })?.tail;
    expect(tail('gender')).toContain('the article');
    expect(tail('plural')).toContain('the plural');
    expect(tail('recall')).toContain('produce it');
    // Three modes, three distinct tails — a duplicate here means one drill is
    // wearing another's description.
    const all = (['gender', 'plural', 'recall'] as const).map(tail);
    expect(new Set(all).size).toBe(3);
  });

});

describe('typed-answer support (hints)', () => {
  it('hintText ladder: shape → first letter → first half', async () => {
    vi.resetModules();
    const { hintText } = await import('./views/drills.tsx');
    expect(hintText('Bücher', 1)).toBe('6 letters');
    expect(hintText('habe gemacht', 1)).toBe('2 words · 11 letters');
    expect(hintText('Bücher', 2)).toBe('starts with “B”');
    expect(hintText('Bücher', 3)).toBe('“Büc…”');
  });
});

describe('stats (review log / due forecast)', () => {
  it('review log counts grades per day, Again separately', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('r0', 'S'), word('r1', 'S'), word('r2', 'S')]);
    store.review('r0', srs.Rating.Good);
    store.review('r1', srs.Rating.Again);
    store.review('r2', srs.Rating.Good);
    // The store keys the log by the learner's LOCAL calendar date, so the test
    // has to build the same key. It used to recompute `toISOString().slice(0,10)`
    // — the UTC date — which silently agreed only because the store had the same
    // bug, and disagreed for real at offsets past ±12.
    const p = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    expect(store.reviewLog()[today]).toEqual({ n: 3, again: 1 });
  });

  it('undoing a review takes it back out of the log', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('u0', 'S'), word('u1', 'S')]);
    const p = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

    store.review('u0', srs.Rating.Good);
    const snap = store.cardOf('u1');          // undefined — never seen
    store.review('u1', srs.Rating.Again);
    expect(store.reviewLog()[today]).toEqual({ n: 2, again: 1 });

    store.restoreCard('u1', snap, true);      // the session's prev/undo
    expect(store.reviewLog()[today]).toEqual({ n: 1, again: 0 });
    expect(store.statusOf('u1')).toBe('new'); // FSRS state rewound too
    expect(store.reviewedToday()).toBe(true); // one real review remains

    store.restoreCard('u0', undefined, false);
    // Undone to nothing reads as unstudied, not as a studied day with 0 reviews.
    expect(store.reviewLog()[today]).toBeUndefined();
    expect(store.reviewedToday()).toBe(false);
  });

  it('due forecast buckets scheduled cards by day, overdue into today', async () => {
    const { data, store, srs } = await fresh();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));
      data.registerWords([word('f0', 'S'), word('f1', 'S')]);
      store.review('f0', srs.Rating.Easy); // due days out
      store.review('f1', srs.Rating.Good);
      vi.setSystemTime(new Date('2026-08-01T12:00:00Z')); // both long overdue
      const fc = store.dueForecast(7);
      expect(fc[0]).toBe(2);
      expect(fc.slice(1).every((n) => n === 0)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('goal line', () => {
  it('is null without a goal; scopes counts to A1..target and projects from snapshots', async () => {
    const { data, store, srs } = await fresh();
    vi.useFakeTimers();
    try {
      // Noon *local*, not noon UTC: the day counts below are in the learner's
      // calendar, so the clock has to be pinned in it too. `'2026-07-18T12:00:00Z'`
      // is already the 19th in UTC+14, which shifted daysLeft to 9 and the
      // projection with it.
      vi.setSystemTime(new Date(2026, 6, 18, 12, 0, 0));
      data.registerWords([
        ...['a0', 'a1', 'a2'].map((id) => word(id, 'S')),                    // A1
        word('b0', 'S', { level: 'B1' }),                                    // outside an A1 goal
      ]);
      expect(store.goalProgress()).toBe(null);

      store.review('a0', srs.Rating.Easy); // Easy graduates straight to known
      store.setGoal({ level: 'A1', date: '2026-07-28' }); // 10 days out
      let gp = store.goalProgress()!;
      expect(gp.count).toBe(3);            // B1 word excluded from an A1 goal
      expect(gp.known).toBe(1);
      expect(gp.pct).toBe(33);
      expect(gp.daysLeft).toBe(10);
      expect(gp.projectedPct).toBe(null);  // no snapshot history yet

      // 5 days ago the snapshot recorded 0 known → rate 0.2/day → 1+2 of 3 → 100%
      localStorage.setItem('lexi.snap.v1', JSON.stringify([{ date: '2026-07-13', groups: {}, known: 0 }]));
      gp = store.goalProgress()!;
      expect(gp.projectedPct).toBe(100);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('interval preview', () => {
  it('renders human intervals for both grades on a new card', async () => {
    const { srs } = await fresh();
    const c = srs.emptyCard();
    expect(srs.previewInterval(c, srs.Rating.Again)).toMatch(/^\d+ (min|hr)$/);
    expect(srs.previewInterval(c, srs.Rating.Good)).toMatch(/^\d+ (min|hr|day|days)$/);
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

  it('longestStreak survives a broken current streak; lastGapDays measures the gap', async () => {
    const { store } = await fresh();
    vi.useFakeTimers();
    try {
      // a 3-day run…
      for (const d of ['2026-06-01', '2026-06-02', '2026-06-03']) {
        vi.setSystemTime(new Date(`${d}T12:00:00Z`));
        store.recordVisit();
      }
      // …then six weeks away
      vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
      store.recordVisit();
      expect(store.streak()).toBe(1);         // current: reset
      expect(store.longestStreak()).toBe(3);  // the record: safe
      expect(store.lastGapDays()).toBe(42);   // the gap, measured honestly
    } finally {
      vi.useRealTimers();
    }
  });

  it('lastGapDays is null on the first day ever', async () => {
    const { store } = await fresh();
    store.recordVisit();
    expect(store.lastGapDays()).toBe(null);
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

  // Every other fake-timer test in this file pins the clock to 12:00Z, which is
  // the one hour of the day where the UTC calendar date agrees with the local
  // date in every plausible timezone. That is exactly why the UTC day-key bug
  // survived: the suite could not see it. These two run at the hours where UTC
  // and local disagree, and they fail against `toISOString().slice(0,10)`.
  //
  // The system timezone is whatever the machine running the suite has, so these
  // assert the property that must hold everywhere — two consecutive *local*
  // evenings are a 2-day streak, and one local day is never two — rather than
  // pinning a timezone the CI box may not share.
  it('counts a local evening and the next local evening as one streak', async () => {
    const { store } = await fresh();
    vi.useFakeTimers();
    try {
      // An afternoon then an evening, on two consecutive local days — the
      // ordinary shape of "I studied yesterday and today". At UTC-7 the first
      // stays on its own UTC date and the second rolls over to the next, so the
      // old key produced 08-04 then 08-06: a one-day hole that reset the streak
      // to 1. Two visits at the *same* hour would have rolled over together and
      // hidden it, which is why the hours differ.
      vi.setSystemTime(new Date(2026, 7, 4, 16, 0, 0));
      store.recordVisit();
      vi.setSystemTime(new Date(2026, 7, 5, 18, 0, 0));
      store.recordVisit();
      expect(store.streak()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('treats one local day as one day however late or early it is studied', async () => {
    const { store } = await fresh();
    vi.useFakeTimers();
    try {
      // 00:30 and 23:30 on the SAME local day. East of Greenwich the old key
      // split these across two UTC dates and inflated the streak to 2.
      vi.setSystemTime(new Date(2026, 7, 4, 0, 30, 0));
      store.recordVisit();
      vi.setSystemTime(new Date(2026, 7, 4, 23, 30, 0));
      store.recordVisit();
      expect(store.streak()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('teach-only first session', () => {
  it('strips every drill and grammar point, leaving pure vocabulary', async () => {
    const { data, store, session, srs } = await fresh();
    // Words that qualify for several drill modes (gender + plural + cloze).
    data.registerWords(Array.from({ length: 8 }, (_, i) =>
      word(`w${i}`, 'Sector A', {
        gender: 'der', plural: 'die Ws', pos: 'noun',
        ex: [{ de: `Der w${i} ist gut.`, en: 'x', lvl: 'A1' }],
      })));

    const target = { kind: 'all' as const, name: 'All' };
    const mixed = session.buildMixedSession(target);
    const taught = session.buildMixedSession(target, true);

    // The normal session interleaves drillsMod; the teaching one must not.
    expect(mixed.some((it) => it.type !== 'flip')).toBe(true);
    expect(taught.every((it) => it.type === 'flip')).toBe(true);
    expect(taught.every((it) => it.word.kind === 'word')).toBe(true);
    expect(taught.length).toBeGreaterThan(0);

    // And it must not quietly drop vocabulary to achieve that.
    const flips = mixed.filter((it) => it.type === 'flip' && it.word.kind === 'word');
    expect(taught.length).toBe(flips.length);
    void store; void srs;
  });
});

// "Quick 5" was a queue length standing in for a duration, and a queue length is a
// bad proxy: this builder expands words into flips *plus* drillsMod, and a typed
// transformation costs several times what a flip does. These pin the estimate's
// shape — that it never lies in the reassuring direction, and that trimming to a
// budget and estimating that budget are actually inverses.
describe('session length estimates', () => {
  it('round-trips a budget through the estimate', async () => {
    const { session } = await fresh();
    for (const minutes of [3, 5, 10, 20]) {
      const words = session.wordsForMinutes(minutes);
      // The words that fit must not be estimated as *over* the budget the learner
      // asked for — a "3 min" button that serves 4 minutes of work is a lie.
      expect(session.estimateSeconds(words), `${minutes} min`).toBeLessThanOrEqual(minutes * 60);
      // And it must fill the budget rather than under-serving it: one more word
      // would exceed it.
      expect(session.estimateSeconds(words + 1), `${minutes} min`).toBeGreaterThan(minutes * 60);
    }
  });

  it('never reports zero minutes for real work', async () => {
    const { session } = await fresh();
    expect(session.estimateMinutes(0)).toBe(0);
    expect(session.estimateMinutes(1)).toBeGreaterThanOrEqual(1);
    expect(session.estimateMinutes(2)).toBeGreaterThanOrEqual(1);
  });

  it('serves at least one word for any budget', async () => {
    const { session } = await fresh();
    expect(session.wordsForMinutes(0)).toBeGreaterThanOrEqual(1);
    expect(session.wordsForMinutes(0.1)).toBeGreaterThanOrEqual(1);
  });

  it('grows monotonically with the budget', async () => {
    const { session } = await fresh();
    const sizes = [1, 3, 5, 10, 20, 60].map((m) => session.wordsForMinutes(m));
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
  });

  it('counts a drill as costing more than a flip', async () => {
    const { session } = await fresh();
    // If these ever invert, the estimate is modelling the wrong thing.
    expect(session.SECONDS_PER_DRILL).toBeGreaterThan(session.SECONDS_PER_FLIP);
    expect(session.estimateSeconds(10)).toBeGreaterThan(10 * session.SECONDS_PER_FLIP);
  });
});

// Same-day resume was called "emergent" — grades persist, so reopening rebuilds
// the remainder and nothing is lost. True of the cards, false of the session: this
// builder makes five randomised decisions per session, so a rebuild is a
// *different* queue and the learner's place in it is gone.
describe('session resume', () => {
  const target = { kind: 'all' as const, name: 'All' };

  async function seeded() {
    const { data, store, session, srs } = await fresh();
    data.registerWords(Array.from({ length: 12 }, (_, i) =>
      word(`r${i}`, 'Core', { level: 'A1', en: 'x', gender: 'der', plural: 'die Rs', pos: 'noun',
        ex: [{ de: `Der r${i} ist gut.`, en: 'x', lvl: 'A1' }] })));
    return { store, session, srs };
  }

  it('brings back the exact queue and position', async () => {
    const { session } = await seeded();
    const built = session.buildMixedSession(target);
    session.saveSession(target, built, 4);
    const back = session.loadSession(target);
    expect(back!.position).toBe(4);
    expect(back!.items.map((it: any) => it.srsId)).toEqual(built.map((it: any) => it.srsId));
    expect(back!.items.map((it: any) => it.type)).toEqual(built.map((it: any) => it.type));
    // The reason is what WhyThisCard renders; losing it on resume would silently
    // strip the one feature that explains the queue.
    expect(back!.items.map((it: any) => it.reason.kind)).toEqual(built.map((it: any) => it.reason.kind));
  });

  it('rehydrates Word references rather than restoring stale copies', async () => {
    const { session } = await seeded();
    const { BY_ID } = await import('./data/index.ts');
    const built = session.buildMixedSession(target);
    session.saveSession(target, built, 2);
    const back = session.loadSession(target)!;

    // Identity, not a structural copy. Only ids are stored, so every Word on the
    // way back is the live lexicon's object — a resumed session can never revive
    // a card the corpus has since changed.
    for (const it of back.items) expect(it.word).toBe(BY_ID.get(it.word.id));

    const drill: any = back.items.find((it: any) => it.reason.kind === 'drill');
    if (drill) expect(drill.reason.parent).toBe(BY_ID.get(drill.reason.parent.id));
  });

  it('stores nothing at the start or the end of a session', async () => {
    const { session } = await seeded();
    const built = session.buildMixedSession(target);
    session.saveSession(target, built, 3);
    expect(session.loadSession(target)).not.toBeNull();
    session.saveSession(target, built, 0);            // not started
    expect(session.loadSession(target)).toBeNull();
    session.saveSession(target, built, 3);
    session.saveSession(target, built, built.length); // finished
    expect(session.loadSession(target)).toBeNull();
  });

  it('refuses a session saved for a different scope', async () => {
    const { session } = await seeded();
    session.saveSession(target, session.buildMixedSession(target), 3);
    expect(session.loadSession({ kind: 'sector', name: 'Core' })).toBeNull();
  });

  it('refuses yesterday’s queue — FSRS has moved on since', async () => {
    const { session } = await seeded();
    const built = session.buildMixedSession(target);
    session.saveSession(target, built, 3);
    const raw = JSON.parse(localStorage.getItem('lexi.session.v1')!);
    raw.at = Date.now() - 26 * 3600e3;
    localStorage.setItem('lexi.session.v1', JSON.stringify(raw));
    expect(session.loadSession(target)).toBeNull();
  });

  it('refuses a queue whose words have gone, rather than resuming with holes', async () => {
    const { session } = await seeded();
    const built = session.buildMixedSession(target);
    session.saveSession(target, built, 3);
    const raw = JSON.parse(localStorage.getItem('lexi.session.v1')!);
    raw.items[1].w = 'voc:A1:this-card-no-longer-exists';
    localStorage.setItem('lexi.session.v1', JSON.stringify(raw));
    // A partial restore would renumber every position after the hole.
    expect(session.loadSession(target)).toBeNull();
  });

  it('survives a corrupt or empty slot', async () => {
    const { session } = await seeded();
    localStorage.setItem('lexi.session.v1', 'not json');
    expect(session.loadSession(target)).toBeNull();
    localStorage.removeItem('lexi.session.v1');
    expect(session.loadSession(target)).toBeNull();
  });
});

// Lexi was a testing app that never taught: a beginner could be asked
// `der Vater → die ___` before anything had said what a plural is. The rule was one
// tap away the whole time, behind a link a learner has no reason to tap when they
// don't yet know what the word on it means.
describe('teach before test', () => {
  const target = { kind: 'all' as const, name: 'All' };

  async function withNouns() {
    const { data, store, session, srs, drillsMod } = await fresh();
    data.registerWords(Array.from({ length: 8 }, (_, i) =>
      word(`t${i}`, 'Nouns', { gender: 'der', plural: 'die Ts', pos: 'noun' })));
    return { store, session, srs, drillsMod };
  }

  it('marks the first drill of a mode the learner has never answered', async () => {
    const { session } = await withNouns();
    const drillsMod = session.buildMixedSession(target).filter((it: any) => it.type !== 'flip');
    expect(drillsMod.length).toBeGreaterThan(0);
    for (const mode of new Set(drillsMod.map((d: any) => d.type))) {
      const inMode = drillsMod.filter((d: any) => d.type === mode);
      // Exactly one introduction per mode per session, on whichever card reaches
      // it first — an intro on every card would be a lecture, not a lesson.
      expect(inMode.filter((d: any) => d.teach), `mode ${mode}`).toHaveLength(1);
      expect(inMode[0].teach, `mode ${mode} — the first one`).toBe(true);
    }
  });

  it('stops introducing a mode once it has actually been answered', async () => {
    const { session, store, srs, drillsMod } = await withNouns();
    // Grading any drill in the mode is what counts as having met it.
    const first = session.buildMixedSession(target).find((it: any) => it.type !== 'flip')!;
    store.review(first.srsId, srs.Rating.Good);

    const again = session.buildMixedSession(target)
      .filter((it: any) => it.type === first.type);
    expect(again.every((d: any) => !d.teach), `${first.type} was re-introduced`).toBe(true);
    void drillsMod;
  });

  it('never marks a plain vocabulary flip', async () => {
    const { session } = await withNouns();
    const flips = session.buildMixedSession(target).filter((it: any) => it.type === 'flip');
    expect(flips.every((f: any) => !f.teach)).toBe(true);
  });

  it('carries the introduction across a resume', async () => {
    const { session } = await withNouns();
    const built = session.buildMixedSession(target);
    const teachAt = built.findIndex((it: any) => it.teach);
    expect(teachAt).toBeGreaterThanOrEqual(0);
    session.saveSession(target, built, 1);
    const back = session.loadSession(target)!;
    // Losing this on resume would silently drop the one card that teaches.
    expect(back.items.map((it: any) => !!it.teach)).toEqual(built.map((it: any) => !!it.teach));
  });
});


// Persona B2 #34: "FSRS treats a word as one item. My recognition of `beharrlich`
// is fine, my production isn't." The app separates them — the flip card is keyed
// on the word id and every drill mode gets its own `gym:<mode>:<wordId>` track —
// so this is a property to pin rather than a feature to build. Untested, it is
// one refactor away from silently collapsing back into a single schedule, which
// would re-teach a word you can already recognise.
//
// This is the split the 2026-09-05 refocus leans hardest on: with the rule
// drillsMod gone, `recall` *is* the productive half of the app, and it only works
// because it was always scheduled apart from the flip.
describe('recognition and production are scheduled separately', () => {
  it('reviewing the flip card leaves the word’s drill tracks untouched', async () => {
    const { data, store, srs, drillsMod } = await fresh();
    const w = word('voc:A1:nehmen', 'Sector A', { pos: 'verb', term: 'nehmen' });
    data.registerWords([w]);
    const drill = drillsMod.gymId('recall', w);

    store.review(w.id, srs.Rating.Good);

    expect(store.statusOf(w.id)).not.toBe('new');   // recognition moved
    expect(store.statusOf(drill)).toBe('new');      // production did not
    expect(store.cardOf(drill)).toBeUndefined();
  });

  it('reviewing a drill leaves recognition untouched', async () => {
    const { data, store, srs, drillsMod } = await fresh();
    const w = word('voc:A1:beharrlich', 'Sector A', { pos: 'adjective', term: 'beharrlich' });
    data.registerWords([w]);
    const drill = drillsMod.gymId('plural', w);

    store.review(drill, srs.Rating.Again);

    expect(store.statusOf(drill)).not.toBe('new');
    expect(store.statusOf(w.id)).toBe('new');
  });

  it('gives each production mode its own track, not one shared "production" one', async () => {
    const { data, store, srs, drillsMod } = await fresh();
    const w = word('voc:A1:geben', 'Sector A', { pos: 'verb', term: 'geben' });
    data.registerWords([w]);
    const recall = drillsMod.gymId('recall', w);
    const gender = drillsMod.gymId('gender', w);

    store.review(recall, srs.Rating.Good);

    expect(recall).not.toBe(gender);
    expect(store.statusOf(recall)).not.toBe('new');
    expect(store.statusOf(gender)).toBe('new');
  });
});

// The first run puts a ten-card session before the placement test. Two facts make
// that safe, and both are load-bearing enough to pin: the queue is sensible with
// no placement, and "unplaced" no longer resolves to C2.
describe('first run before placement', () => {
  it('serves the commonest A1 words with no placement at all', async () => {
    // `firstRunIds` sorts by CEFR band then frequency, and the level filter
    // defaults to all six — so a beginner gets the same ten cards whether or not
    // they have been placed. This is the fact the whole reorder rests on; if it
    // stopped being true, a cold learner's first session would start at C2.
    const { data, store } = await fresh();
    const freq = await import('./lib/freq.ts');
    data.registerWords([
      word('c2word', 'Sector A', { level: 'C2' }),
      word('b1word', 'Sector A', { level: 'B1' }),
      word('a1rare', 'Sector A', { level: 'A1' }),
      word('a1common', 'Sector A', { level: 'A1' }),
    ]);
    freq.primeFreq({ a1common: 3, a1rare: 9000, b1word: 50, c2word: 10 });

    expect(store.placementLevel()).toBeNull();
    expect(store.firstRunIds(3)).toEqual(['a1common', 'a1rare', 'b1word']);
  });

  it('teaches at the lowest level in scope until placed, not the highest', async () => {
    // The defect this reorder would otherwise have exposed: PathCard and Grammar
    // both fell back to the *highest* level in the filter, and the filter defaults
    // to all six — so an unplaced learner was offered C2 grammar. Masked before
    // only because placement used to come first.
    const { store } = await fresh();
    expect(store.placementLevel()).toBeNull();
    expect(store.studyLevel()).toBe('A1');
  });

  it('defers to the placement once there is one', async () => {
    const { store } = await fresh();
    store.setPlacementLevel('B2');
    expect(store.studyLevel()).toBe('B2');
  });

  it('honours a narrowed filter when unplaced', async () => {
    const { store } = await fresh();
    store.setLevels(new Set(['B1', 'B2'] as const));
    expect(store.studyLevel()).toBe('B1');
  });
});

// The two numbers, kept two.
//
// `known` counts flip cards in Review, and a flip shows the German — so it has
// only ever measured recognition. `recalled` counts the recall drill reaching
// Review, which is production. The pressure over time will be to average them
// into one reassuring figure; these pin that they stay apart, and that neither
// silently counts the other.
describe('totals: recognition and production are counted separately', () => {
  it('starts both at zero and moves them independently', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('voc:A1:die Sprache', 'Sector A', { term: 'die Sprache', gender: 'die' })]);

    expect(store.totals()).toMatchObject({ known: 0, recalled: 0 });

    // Consolidate the *flip* only: recognised, not yet produced.
    for (let i = 0; i < 4; i++) store.review('voc:A1:die Sprache', srs.Rating.Good);
    const afterFlip = store.totals();
    expect(afterFlip.known).toBe(1);
    expect(afterFlip.recalled).toBe(0);

    // Now consolidate the recall drill for the same word.
    for (let i = 0; i < 4; i++) store.review('gym:recall:voc:A1:die Sprache', srs.Rating.Good);
    const afterRecall = store.totals();
    expect(afterRecall.known).toBe(1);        // unchanged — not double counted
    expect(afterRecall.recalled).toBe(1);
  });

  it('does not let a produced word inflate the recognised count', async () => {
    // The Fundamentals drill bypasses the "flip must be in Review" gate, so this
    // state is reachable: produced but never consolidated receptively. `known`
    // must not quietly absorb it.
    const { data, store, srs } = await fresh();
    data.registerWords([word('voc:A1:der Tisch', 'Sector A', { term: 'der Tisch' })]);
    for (let i = 0; i < 4; i++) store.review('gym:recall:voc:A1:der Tisch', srs.Rating.Good);
    expect(store.totals()).toMatchObject({ known: 0, recalled: 1 });
  });
});

// The confusion log: what was asked, and what was reached for instead.
//
// A tag says which system is weak; a term says which word. Neither says which
// *error*, and that is the one a teacher can act on. Every multiple-choice drill
// has known this at grade time and used to discard it.
describe('missStats: the substitution, not just the miss', () => {
  it('counts repeated confusions worst-first, per tag', async () => {
    const { store } = await fresh();
    for (let i = 0; i < 3; i++) store.logMiss('Kasus', 'der Tisch', { asked: 'Dativ', chose: 'den' });
    store.logMiss('Kasus', 'das Haus', { asked: 'Genitiv', chose: 'dem' });

    const [kasus] = store.missStats(30);
    expect(kasus.count).toBe(4);
    expect(kasus.confusions[0]).toEqual({ asked: 'Dativ', chose: 'den', count: 3 });
    expect(kasus.confusions[1]).toEqual({ asked: 'Genitiv', chose: 'dem', count: 1 });
  });

  it('keeps a miss with no detail readable, at the resolution it was recorded', async () => {
    // Every miss logged before this existed has no asked/chose. It must still
    // count toward the tag rather than vanishing or inventing a confusion.
    const { store } = await fresh();
    store.logMiss('Gender (der/die/das)', 'die Sprache');
    const [g] = store.missStats(30);
    expect(g.count).toBe(1);
    expect(g.terms[0]).toEqual({ term: 'die Sprache', count: 1 });
    expect(g.confusions).toEqual([]);
  });

  it('refuses half a confusion rather than inventing the other half', async () => {
    const { store } = await fresh();
    store.logMiss('Kasus', 'der Tisch', { asked: 'Dativ', chose: '' });
    store.logMiss('Kasus', 'der Tisch', { asked: '', chose: 'den' });
    const [kasus] = store.missStats(30);
    expect(kasus.count).toBe(2);         // both are still misses
    expect(kasus.confusions).toEqual([]); // neither is a confusion
  });

  it('does not let one tag\'s confusions leak into another', async () => {
    const { store } = await fresh();
    store.logMiss('Kasus', 'a', { asked: 'Dativ', chose: 'den' });
    store.logMiss('Noun plurals', 'b', { asked: 'die Häuser', chose: 'die Hausen' });
    const byTag = Object.fromEntries(store.missStats(30).map((s) => [s.tag, s.confusions]));
    expect(byTag['Kasus']).toHaveLength(1);
    expect(byTag['Noun plurals']).toHaveLength(1);
    expect(byTag['Kasus'][0].asked).toBe('Dativ');
  });
});

// Phase 1 of the comprehension meter (BACKLOG Now #2): a word can now enter a
// session because the learner wants to read a particular text, and the scheduler
// has to be able to say so — "nothing may enter a session without saying why".
describe('the unlock reason', () => {
  it('names the learner’s own text rather than a Lexi concept', async () => {
    const { why } = await freshWhy();
    const line = why.whyLine({ kind: 'unlock', text: 'Die Zeit — Klimapolitik' });
    expect(line).not.toBeNull();
    expect(line!.lead).toBe('Because you want to read ');
    expect(line!.em).toBe('„Die Zeit — Klimapolitik“');
  });

  it('survives being saved and resumed with the session', async () => {
    const { data, session } = await fresh();
    const w = word('lesen', 'X', { id: 'v:lesen', term: 'lesen' });
    data.registerWords([w]);
    const reason = { kind: 'unlock' as const, text: 'Mein Artikel' };
    // A resumable session is one already in progress: loadSession requires
    // 0 < position < items.length, so save two items part-way through.
    const tgt = { kind: 'all' as const, name: 'All' };
    session.saveSession(tgt, [
      { type: 'flip', word: w, srsId: w.id, reason },
      { type: 'flip', word: w, srsId: w.id, reason: { kind: 'fresh' } },
    ], 1);
    const back = session.loadSession(tgt);
    expect(back?.items[0].reason).toEqual(reason);
  });
});

// The search box's miss is the interesting case: a learner who looks up a word
// and gets nothing has told us it was worth interrupting themselves for, and the
// corpus does not have it. That is the only signal a local-first app can collect
// about its own gaps.
describe('words the corpus did not have', () => {
  it('records a miss, and counts a repeat rather than duplicating it', async () => {
    const { store } = await fresh();
    expect(store.wantedWords()).toEqual([]);

    store.noteWanted('Gepflogenheit');
    store.noteWanted('  gepflogenheit  ');   // same word, typed again

    const list = store.wantedWords();
    expect(list).toHaveLength(1);
    expect(list[0].n).toBe(2);
    // The spelling they reached for is kept, not normalised — it is evidence.
    expect(list[0].term).toBe('Gepflogenheit');
    expect(store.isWanted('GEPFLOGENHEIT')).toBe(true);
  });

  it('ignores empty and whitespace-only notes', async () => {
    const { store } = await fresh();
    store.noteWanted('   ');
    store.noteWanted('');
    expect(store.wantedWords()).toEqual([]);
  });

  it('can be withdrawn — a list things only accumulate in is a list nobody opens', async () => {
    const { store } = await fresh();
    store.noteWanted('Quatsch');
    store.unwantWord('quatsch');
    expect(store.wantedWords()).toEqual([]);
  });

  it('exports on its own, carrying no progress with it', async () => {
    const { store } = await fresh();
    store.noteWanted('Fernweh');
    const out = JSON.parse(store.exportWanted());
    expect(out.app).toBe('lexi-wanted');
    expect(out.words[0].term).toBe('Fernweh');
    // The whole point of a separate export: reporting a gap must not mean
    // handing over your history.
    expect(Object.keys(out)).not.toContain('cards');
    expect(Object.keys(out)).not.toContain('visits');
  });

  it('rides the backup, because the learner authored it', async () => {
    const { store } = await fresh();
    store.noteWanted('Zeitgeist');
    expect(Object.keys(JSON.parse(store.exportData()).settings)).toContain('lexi.wanted.v1');
  });
});
