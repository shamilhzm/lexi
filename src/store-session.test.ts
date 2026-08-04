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

/** The provenance copy is pure, so it only needs the copy module + the mode
 *  labels it looks up — not the whole store/lexicon graph. */
async function freshWhy() {
  vi.resetModules();
  const why = await import('./components/WhyThisCard.tsx');
  const fundamentals = await import('./views/Fundamentals.tsx');
  return { why, fundamentals };
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
    const { data, store, session, fundamentals } = await fresh();
    const words = Array.from({ length: 6 }, (_, i) => word(`n${i}`, 'Nouns', { gender: 'die' }));
    data.registerWords(words);

    store.logMiss(fundamentals.MODE_TAG.gender);
    const drills = session.blindSpotDrills(words);

    expect(drills).toHaveLength(4); // MAX_BLIND_SPOTS
    expect(drills.every((d) => d.type === 'gender')).toBe(true);
    expect(drills.every((d) => d.srsId.startsWith('gym:gender:'))).toBe(true);
    expect(new Set(drills.map((d) => d.srsId)).size).toBe(4); // distinct words
    // Each one can say which weakness it is rehearsing, and how bad it is.
    expect(drills[0].reason).toMatchObject({
      kind: 'blindspot', mode: 'gender', tag: fundamentals.MODE_TAG.gender, misses: 1,
    });
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
    // (pos 'x' keeps the words out of the case drill, which needs pos 'noun'.)
    const words = ['g0', 'g1', 'g2'].map((id) => word(id, 'Nouns', { gender: 'die', pos: 'x' }));
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

  it('caps a custom target that asked for one, drills included', async () => {
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
    const { data, store, session, srs, fundamentals } = await fresh();
    // Two eligible words; only the first is in today's curated queue.
    data.registerWords([
      word('o0', 'Orph', { gender: 'die', pos: 'x' }),
      word('o1', 'Orph', { gender: 'die', pos: 'x' }),
    ]);
    // Schedule o1's gender drill and wind past it so it comes due.
    const gid = fundamentals.gymId('gender', word('o1', 'Orph'));
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

  it('names the trigger word on a linked grammar point', async () => {
    const { data, session } = await fresh();
    const trigger = word('w0', 'Connectors', { term: 'obwohl' });
    const point = gpoint('gram:B1:Konzessivsätze: obwohl', 'Konzessivsätze: obwohl');
    data.registerWords([trigger, point]);

    const [linked] = session.linkedGrammar([trigger]);

    expect(linked.reason.kind).toBe('linked');
    // The whole point: the learner can be told *why* this appeared.
    expect(linked.reason).toMatchObject({ kind: 'linked', trigger: { term: 'obwohl' } });
  });

  it('cites the miss count on a remediation point', async () => {
    const { data, store, session, fundamentals } = await fresh();
    const point = gpoint('gram:A1:Artikel & Genus', 'Artikel & Genus', 'A1');
    data.registerWords([point]);

    for (let i = 0; i < 4; i++) store.logMiss(fundamentals.MODE_TAG.gender);
    const [remedy] = session.remedyGrammar();

    expect(remedy.reason).toMatchObject({
      kind: 'remedy', mode: 'gender', tag: fundamentals.MODE_TAG.gender, misses: 4,
    });
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

  it('names the trigger word, in German', async () => {
    const { why } = await freshWhy();
    const line = why.whyLine({ kind: 'linked', trigger: w('obwohl') });
    expect(line?.lead).toBe('Because you just learned ');
    expect(line?.em).toBe('„obwohl“');
    expect(line?.emLang).toBe('de'); // or a screen reader says it in English
  });

  it('explains the interleave rather than letting it look random', async () => {
    const { why } = await freshWhy();
    const line = why.whyLine({ kind: 'drill', mode: 'gender', parent: w('Tisch') });
    expect(line?.em).toBe('Tisch');
    expect(`${line?.lead}${line?.em}${line?.tail}`).toBe('You flipped Tisch a few cards ago — now produce it');
  });

  it('cites the miss count and offers the rule for a weakness', async () => {
    const { why, fundamentals } = await freshWhy();
    const line = why.whyLine({
      kind: 'remedy', mode: 'gender', tag: fundamentals.MODE_TAG.gender, misses: 4,
    });
    expect(`${line?.lead}${line?.em}${line?.tail}`).toBe(`You’ve missed ${fundamentals.MODE_TAG.gender} 4× this month`);
    // The line that names a weakness is also the way into the rule.
    expect(line?.rulePoint).toBe(fundamentals.MODE_REMEDY.gender[0]);
  });
});

describe('production drills (order / transform)', () => {
  it('orderTokens: strips terminal punctuation, splits, gates 4–10 tokens', async () => {
    const { fundamentals } = await fresh();
    expect(fundamentals.orderTokens('Ich gehe heute ins Kino.')).toEqual(['Ich', 'gehe', 'heute', 'ins', 'Kino']);
    expect(fundamentals.orderTokens('Wo ist das?')).toEqual([]);          // 3 tokens: too short
    expect(fundamentals.orderTokens(undefined)).toEqual([]);
    expect(fundamentals.orderTokens('a b c d e f g h i j k')).toEqual([]); // 11 tokens: too long
  });

  it('canTransform: excludes separable and reflexive verbs, keeps plain ones', async () => {
    const { fundamentals } = await fresh();
    expect(fundamentals.canTransform('machen')).toBe(true);
    expect(fundamentals.canTransform('ankommen')).toBe(false);    // separable: prefix detaches
    expect(fundamentals.canTransform('sich freuen')).toBe(false); // reflexive: finite form drops "mich"
  });

  it('buildTransform: accepts the form with or without every pronoun variant', async () => {
    const { fundamentals } = await fresh();
    const ich = fundamentals.buildTransform('machen', 0, 'perfekt', 'Perfekt');
    expect(ich.prompt).toBe('„ich mache“ → Perfekt');
    expect(ich.accept).toContain('ich habe gemacht');
    expect(ich.accept).toContain('habe gemacht');

    const er = fundamentals.buildTransform('gehen', 2, 'perfekt', 'Perfekt');
    expect(er.prompt).toBe('„er geht“ → Perfekt');
    for (const a of ['er ist gegangen', 'sie ist gegangen', 'es ist gegangen', 'ist gegangen']) {
      expect(er.accept).toContain(a);
    }
  });

  it('eligibleModes: examples license order, conjugable verbs license transform', async () => {
    const { fundamentals } = await fresh();
    const noun = word('w0', 'F', { ex: [{ de: 'Das Haus ist sehr groß.', en: '', lvl: 'A1' }] });
    expect(fundamentals.eligibleModes(noun)).toContain('order');
    const verb = word('w1', 'F', { term: 'machen', pos: 'verb' });
    expect(fundamentals.eligibleModes(verb)).toContain('transform');
    expect(fundamentals.eligibleModes(word('w2', 'F'))).toEqual([]); // plain word: nothing
  });
});

describe('Kasus drill (case & endings)', () => {
  const noun = (term: string, gender: 'der' | 'die' | 'das') =>
    word(term, 'F', { term: `${gender} ${term}`, gender, pos: 'noun' });

  it('caseSafe: plain nouns yes; n-Deklination, multiword, non-nouns no', async () => {
    const { fundamentals } = await fresh();
    expect(fundamentals.caseSafe(noun('Tisch', 'der'))).toBe(true);
    expect(fundamentals.caseSafe(noun('Lampe', 'die'))).toBe(true);
    expect(fundamentals.caseSafe(noun('Junge', 'der'))).toBe(false);   // -e masculine
    expect(fundamentals.caseSafe(noun('Student', 'der'))).toBe(false); // -ent
    expect(fundamentals.caseSafe(noun('Herr', 'der'))).toBe(false);    // listed
    expect(fundamentals.caseSafe(noun('Herz', 'das'))).toBe(false);    // listed neuter
    expect(fundamentals.caseSafe(word('w', 'F', { term: 'der gute Rat', gender: 'der', pos: 'noun' }))).toBe(false); // multiword
    expect(fundamentals.caseSafe(word('w2', 'F', { gender: 'die', pos: 'adjective' }))).toBe(false);
  });

  it('builds correct article items (rnd pinned: Nominativ, article flavor)', async () => {
    const { fundamentals } = await fresh();
    const d = fundamentals.buildCaseItem(noun('Tisch', 'der'), () => 0);
    expect(d.prompt).toBe('Hier ist ___ Tisch');
    expect(d.options[d.correct]).toBe('der');
  });

  it('builds correct adjective-ending items (rnd pinned high: Dativ, adjective)', async () => {
    const { fundamentals } = await fresh();
    // rnd=0.99 → masc cases[2]=dat, prep 'bei', flavor adjective, adj 'jung',
    // and the last declension offered for a countable noun, which is mixed.
    const d = fundamentals.buildCaseItem(noun('Tisch', 'der'), () => 0.99);
    expect(d.prompt).toBe('bei einem ___ Tisch');
    expect(d.options[d.correct]).toBe('jungen');
  });

  // German declines an adjective three ways and the drill used to teach only the
  // weak table, which is nearly all -en — so a learner could score well on it and
  // still write "ein gute Mann". Each declension is pinned by call order:
  // kase → article/adjective → preposition → adjective → declension.
  it('teaches all three declensions, with the right ending for each', async () => {
    const { fundamentals } = await fresh();
    const pin = (v: number[]) => { const q = [...v]; return () => q.shift() ?? 0; };
    // masc, Nominativ ("Hier ist"), adjective flavour, adj 'alt' (index 0).
    const weak = fundamentals.buildCaseItem(noun('Tisch', 'der'), pin([0, 0.9, 0, 0]));
    expect(weak.prompt).toBe('Hier ist der ___ Tisch');
    expect(weak.options[weak.correct]).toBe('alte');          // weak nom masc → -e

    const mixed = fundamentals.buildCaseItem(noun('Tisch', 'der'), pin([0, 0.9, 0, 0.6]));
    expect(mixed.prompt).toBe('Hier ist ein ___ Tisch');
    expect(mixed.options[mixed.correct]).toBe('alter');       // mixed nom masc → -er

    // Strong needs a bare noun, which is only grammatical on a mass noun.
    const strong = fundamentals.buildCaseItem(noun('Wasser', 'das'), pin([0, 0.9, 0, 0.9]));
    expect(strong.prompt).toBe('Hier ist ___ Wasser');
    expect(strong.options[strong.correct]).toBe('altes');     // strong nom neut → -es
  });

  it('never declines a countable noun strong, which would be ungrammatical', async () => {
    const { fundamentals } = await fresh();
    // "alter Tisch" is not German — a countable singular needs an article. Roll
    // the drill hard over a countable noun and assert an article always precedes.
    for (let i = 0; i < 200; i++) {
      const d = fundamentals.buildCaseItem(noun('Tisch', 'der'));
      if (!d.sub.startsWith('Adjective')) continue;
      expect(d.prompt, d.prompt).toMatch(/(der|den|dem|des|ein|einen|einem|eines) ___ Tisch$/);
    }
  });

  it('always offers the correct ending among the options', async () => {
    const { fundamentals } = await fresh();
    for (const [term, gender] of [['Tisch', 'der'], ['Lampe', 'die'], ['Wasser', 'das']] as const) {
      for (let i = 0; i < 150; i++) {
        const d = fundamentals.buildCaseItem(noun(term, gender));
        expect(d.correct, `${term}: ${d.prompt}`).toBeGreaterThanOrEqual(0);
        expect(new Set(d.options).size).toBe(d.options.length); // no repeated option
      }
    }
  });

  it('bare-noun dative article items always use "mit" (von/bei would contract)', async () => {
    const { fundamentals } = await fresh();
    // rnd sequence: 0.7 → cases[2]=dat, 0.3 → article flavor, frame forced 'mit'
    const seq = [0.7, 0.3];
    const d = fundamentals.buildCaseItem(noun('Tisch', 'der'), () => seq.shift() ?? 0);
    expect(d.prompt).toBe('mit ___ Tisch');
    expect(d.options[d.correct]).toBe('dem');
  });

  it('genitive only for feminines, and the noun is never inflected', async () => {
    const { fundamentals } = await fresh();
    // fem, rnd=0.99 → cases[3]=gen, adjective flavor, prep 'trotz', adj 'jung'
    const fem = fundamentals.buildCaseItem(noun('Lampe', 'die'), () => 0.99);
    expect(fem.prompt).toBe('trotz einer ___ Lampe');
    expect(fem.options[fem.correct]).toBe('jungen');
    // masc/neut never see genitive (would need noun +-(e)s); spot-check many rolls
    for (let i = 0; i < 50; i++) {
      const d = fundamentals.buildCaseItem(noun('Tisch', 'der'));
      expect(d.sub).not.toContain('Genitiv');
      expect(d.correct).toBeGreaterThanOrEqual(0); // options always include the answer
    }
  });
});

describe('typed-answer support (hints)', () => {
  it('hintText ladder: shape → first letter → first half', async () => {
    vi.resetModules();
    const { hintText } = await import('./views/GrammarDrill.tsx');
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

describe('pointStats (grammar syllabus mastery)', () => {
  it('reports an untouched point as not started', async () => {
    const { store } = await fresh();
    const s = store.pointStats('A1', 0, 6);
    expect(s).toMatchObject({ count: 6, seen: 0, known: 0, due: 0, started: false });
    expect(s.mastery).toBe(0);
  });

  it('counts only the exercises belonging to that point', async () => {
    const { store, srs } = await fresh();
    // Two exercises of A1 point 0, plus a decoy in point 1 and another level.
    store.review('gex:A1:0:0', srs.Rating.Good);
    store.review('gex:A1:0:1', srs.Rating.Good);
    store.review('gex:A1:1:0', srs.Rating.Good);
    store.review('gex:A2:0:0', srs.Rating.Good);

    const s = store.pointStats('A1', 0, 6);
    expect(s.seen).toBe(2);
    expect(store.pointStats('A1', 1, 6).seen).toBe(1);
    expect(store.pointStats('B1', 0, 6).seen).toBe(0);
  });

  // The vocabulary→grammar loop grades the point's own `gram:` card, not its
  // `gex:` exercises. Counting only the latter meant a learner who had met a
  // dozen concepts mid-session still read "0/40 started" — the loop taught the
  // concept and the Library denied it had happened.
  it('counts a concept met through the session loop as started', async () => {
    const { store, srs } = await fresh();
    store.review('gram:A1:Artikel & Genus', srs.Rating.Good);

    const s = store.pointStats('A1', 0, 6, 'Artikel & Genus');
    expect(s.started).toBe(true);
    expect(s.metInSession).toBe(true);
    // Meeting is not drilling: mastery stays a measure of the exercises.
    expect(s.seen).toBe(0);
    expect(s.mastery).toBe(0);
  });

  it('prefers drilled progress over the met-in-session marker', async () => {
    const { store, srs } = await fresh();
    store.review('gram:A1:Artikel & Genus', srs.Rating.Good);
    store.review('gex:A1:0:0', srs.Rating.Good);

    const s = store.pointStats('A1', 0, 6, 'Artikel & Genus');
    expect(s.started).toBe(true);
    expect(s.metInSession).toBe(false);   // it has actually been drilled now
    expect(s.seen).toBe(1);
  });

  it('matches the card by title, not by position', async () => {
    const { store, srs } = await fresh();
    store.review('gram:A1:Artikel & Genus', srs.Rating.Good);
    // Same index, different point: must not inherit the other card's status.
    expect(store.pointStats('A1', 0, 6, 'sein & haben').started).toBe(false);
    // Same title, different level.
    expect(store.pointStats('A2', 0, 6, 'Artikel & Genus').started).toBe(false);
  });

  it('without a title, behaves exactly as before', async () => {
    const { store, srs } = await fresh();
    store.review('gram:A1:Artikel & Genus', srs.Rating.Good);
    expect(store.pointStats('A1', 0, 6).started).toBe(false);
  });

  it('mastery is known/count, and a lapse leaves the point started but unmastered', async () => {
    const { store, srs } = await fresh();
    for (let xi = 0; xi < 4; xi++) store.review(`gex:A1:0:${xi}`, srs.Rating.Easy);
    const s = store.pointStats('A1', 0, 4);
    expect(s.known).toBe(4);
    expect(s.mastery).toBe(1);

    store.review('gex:A1:0:0', srs.Rating.Again);
    const after = store.pointStats('A1', 0, 4);
    expect(after.started).toBe(true);
    expect(after.known).toBe(3);
    expect(after.mastery).toBeCloseTo(0.75, 5);
  });

  it('handles a point with no exercises without dividing by zero', async () => {
    const { store } = await fresh();
    expect(store.pointStats('C2', 0, 0).mastery).toBe(0);
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

    // The normal session interleaves drills; the teaching one must not.
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
// bad proxy: this builder expands words into flips *plus* drills, and a typed
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

// Lesen. Everything else in the app is retrieval; this is the only thing that
// hands the learner German to *understand*. The band is the whole design: zero
// unknown words teaches nothing, four is a vocabulary list in disguise.
describe('reader', () => {
  async function withCorpus() {
    vi.resetModules();
    const data = await import('./data/index.ts');
    const store = await import('./store.ts');
    const reader = await import('./lib/reader.ts');
    reader.resetSurfaceIndex();
    data.registerWords([
      word('voc:A1:der Hund', 'Animals', { term: 'der Hund', en: 'dog', gender: 'der', plural: 'die Hunde',
        ex: [{ de: 'Der Hund schläft im Garten.', en: 'The dog sleeps in the garden.', lvl: 'A1' }] }),
      word('voc:A1:der Garten', 'Home', { term: 'der Garten', en: 'garden', gender: 'der', plural: 'die Gärten', ex: [] }),
      word('voc:A1:schlafen', 'Core', { term: 'schlafen', en: 'to sleep', pos: 'verb', ex: [] }),
      word('voc:A1:im', 'Grammar', { term: 'im', en: 'in the', pos: 'preposition', ex: [] }),
    ]);
    return { data, store, reader };
  }

  it('resolves inflected forms back to their card', async () => {
    const { reader } = await withCorpus();
    const idx = reader.surfaceIndex();
    // A plural and a conjugated form — a bare term index would miss both, and most
    // of any real sentence with them.
    expect(idx.get('hunde')?.id).toBe('voc:A1:der Hund');
    expect(idx.get('schläft')?.id).toBe('voc:A1:schlafen');
    expect(idx.get('geschlafen')?.id).toBe('voc:A1:schlafen');
  });

  it('marks only the words the learner has never met', async () => {
    const { reader, store, srs } = { ...await withCorpus(), srs: await import('./srs.ts') };
    store.review('voc:A1:der Hund', srs.Rating.Good);   // met
    const toks = reader.annotate('Der Hund schläft im Garten.',
      (w: any) => store.statusOf(w.id) !== 'new');
    const unknown = toks.filter((t: any) => t.unknown).map((t: any) => t.text);
    expect(unknown).not.toContain('Hund');
    expect(unknown).toContain('Garten');
  });

  it('reassembles the sentence exactly, punctuation and all', async () => {
    const { reader } = await withCorpus();
    const de = 'Der Hund schläft im Garten.';
    expect(reader.annotate(de, () => true).map((t: any) => t.text).join('')).toBe(de);
  });

  it('offers nothing when every word is already known — that teaches nothing', async () => {
    const { reader } = await withCorpus();
    const out = reader.pickReadable({ familiar: () => true, inScope: () => true });
    expect(out).toEqual([]);
  });

  it('offers nothing when the sentence is too far out of reach', async () => {
    const { reader } = await withCorpus();
    // Nothing familiar at all: 3+ unknown words is a vocabulary list, not reading.
    const out = reader.pickReadable({ familiar: () => false, inScope: () => true, maxUnknown: 1 });
    expect(out).toEqual([]);
  });

  it('finds the i+1 sentence and names what is new in it', async () => {
    const { reader, store, srs } = { ...await withCorpus(), srs: await import('./srs.ts') };
    for (const id of ['voc:A1:der Hund', 'voc:A1:schlafen', 'voc:A1:im']) store.review(id, srs.Rating.Good);
    const out = reader.pickReadable({
      familiar: (w: any) => store.statusOf(w.id) !== 'new',
      inScope: () => true, minTokens: 3,
    });
    expect(out).toHaveLength(1);
    expect(out[0].unknownWords.map((w: any) => w.id)).toEqual(['voc:A1:der Garten']);
    expect(out[0].en).toBe('The dog sleeps in the garden.');
  });

  it('respects the level filter', async () => {
    const { reader, store, srs } = { ...await withCorpus(), srs: await import('./srs.ts') };
    for (const id of ['voc:A1:der Hund', 'voc:A1:schlafen', 'voc:A1:im']) store.review(id, srs.Rating.Good);
    const out = reader.pickReadable({
      familiar: (w: any) => store.statusOf(w.id) !== 'new',
      inScope: () => false, minTokens: 3,
    });
    expect(out).toEqual([]);
  });

  it('puts the most readable sentence first', async () => {
    const { reader } = await withCorpus();
    const out = reader.pickReadable({
      familiar: () => false, inScope: () => true, minTokens: 3, maxUnknown: 4,
    });
    for (let i = 1; i < out.length; i++) {
      expect(out[i].unknownWords.length).toBeGreaterThanOrEqual(out[i - 1].unknownWords.length);
    }
  });
});

// Lexi was a testing app that never taught: a beginner could be asked
// `der Vater → die ___` before anything had said what a plural is. The rule was one
// tap away the whole time, behind a link a learner has no reason to tap when they
// don't yet know what the word on it means.
describe('teach before test', () => {
  const target = { kind: 'all' as const, name: 'All' };

  async function withNouns() {
    const { data, store, session, srs, fundamentals } = await fresh();
    data.registerWords(Array.from({ length: 8 }, (_, i) =>
      word(`t${i}`, 'Nouns', { gender: 'der', plural: 'die Ts', pos: 'noun' })));
    return { store, session, srs, fundamentals };
  }

  it('marks the first drill of a mode the learner has never answered', async () => {
    const { session } = await withNouns();
    const drills = session.buildMixedSession(target).filter((it: any) => it.type !== 'flip');
    expect(drills.length).toBeGreaterThan(0);
    for (const mode of new Set(drills.map((d: any) => d.type))) {
      const inMode = drills.filter((d: any) => d.type === mode);
      // Exactly one introduction per mode per session, on whichever card reaches
      // it first — an intro on every card would be a lecture, not a lesson.
      expect(inMode.filter((d: any) => d.teach), `mode ${mode}`).toHaveLength(1);
      expect(inMode[0].teach, `mode ${mode} — the first one`).toBe(true);
    }
  });

  it('stops introducing a mode once it has actually been answered', async () => {
    const { session, store, srs, fundamentals } = await withNouns();
    // Grading any drill in the mode is what counts as having met it.
    const first = session.buildMixedSession(target).find((it: any) => it.type !== 'flip')!;
    store.review(first.srsId, srs.Rating.Good);

    const again = session.buildMixedSession(target)
      .filter((it: any) => it.type === first.type);
    expect(again.every((d: any) => !d.teach), `${first.type} was re-introduced`).toBe(true);
    void fundamentals;
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
// is fine, my production isn't." It turns out the app already separates them —
// the flip card is keyed on the word id and every drill mode gets its own
// `gym:<mode>:<wordId>` track — so this is a property to pin rather than a feature
// to build. Untested, it is one refactor away from silently collapsing back into
// a single schedule, which would re-teach a word you can already recognise.
describe('recognition and production are scheduled separately', () => {
  it('reviewing the flip card leaves the word’s drill tracks untouched', async () => {
    const { data, store, srs, fundamentals } = await fresh();
    const w = word('voc:A1:nehmen', 'Sector A', { pos: 'verb', term: 'nehmen' });
    data.registerWords([w]);
    const drill = fundamentals.gymId('transform', w);

    store.review(w.id, srs.Rating.Good);

    expect(store.statusOf(w.id)).not.toBe('new');   // recognition moved
    expect(store.statusOf(drill)).toBe('new');      // production did not
    expect(store.cardOf(drill)).toBeUndefined();
  });

  it('reviewing a drill leaves recognition untouched', async () => {
    const { data, store, srs, fundamentals } = await fresh();
    const w = word('voc:A1:beharrlich', 'Sector A', { pos: 'adjective', term: 'beharrlich' });
    data.registerWords([w]);
    const drill = fundamentals.gymId('cloze', w);

    store.review(drill, srs.Rating.Again);

    expect(store.statusOf(drill)).not.toBe('new');
    expect(store.statusOf(w.id)).toBe('new');
  });

  it('gives each production mode its own track, not one shared "production" one', async () => {
    const { data, store, srs, fundamentals } = await fresh();
    const w = word('voc:A1:geben', 'Sector A', { pos: 'verb', term: 'geben' });
    data.registerWords([w]);
    const conj = fundamentals.gymId('conj', w);
    const order = fundamentals.gymId('order', w);

    store.review(conj, srs.Rating.Good);

    expect(conj).not.toBe(order);
    expect(store.statusOf(conj)).not.toBe('new');
    expect(store.statusOf(order)).toBe('new');
  });
});
