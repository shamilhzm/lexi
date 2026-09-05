// The fixes that came out of persona testing, pinned.
//
// Each of these is a state a real learner reaches and nobody had driven: the
// day after a month away, the day with nothing due, the day after narrowing a
// level filter. They are cheap to assert and were expensive to find.
import { describe, it, expect, vi } from 'vitest';
import type { Word } from './types.ts';

vi.mock('./lib/idb.ts', () => ({ idbGet: async () => undefined, idbSet: async () => undefined }));

async function fresh() {
  vi.resetModules();
  localStorage.clear();
  const data = await import('./data/index.ts');
  const store = await import('./store.ts');
  const session = await import('./session.ts');
  const srs = await import('./srs.ts');
  // Imported inside the same reset graph: `feedOrder` reads the module-level
  // WORDS and card map, so importing it after a second `resetModules()` would
  // hand back a different, empty lexicon and the assertions would pass on -1.
  const feed = await import('./views/Feed.tsx');
  return { data, store, session, srs, feed };
}

const word = (id: string, field = 'Test', extra: Partial<Word> = {}): Word => ({
  id, term: id, en: id, pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field, kind: 'word', ...extra,
});

describe('a session is bounded', () => {
  it('never exceeds the ceiling, however large the backlog', async () => {
    const { data, store, session, srs } = await fresh();
    // 400 cards graded today, then the clock moved on two months: the shape of a
    // learner returning from a long absence, who was served 70 items before this
    // ceiling existed.
    //
    // Built by grading and then advancing time, not by injecting rows — a grade
    // schedules *forward*, so `Rating.Again` is minutes out rather than overdue,
    // and `importData` writes through storage this suite mocks away. Moving the
    // clock is the only way to make a real backlog out of the public API.
    const words = Array.from({ length: 400 }, (_, i) => word(`w${i}`));
    data.registerWords(words);
    for (const w of words) store.review(w.id, srs.Rating.Easy);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 60 * 86_400_000));
    const items = session.buildMixedSession({ kind: 'all', name: 'Today’s session' });
    // Meaningful only if the uncapped session would have been longer — otherwise
    // this passes on an empty queue and guards nothing.
    // Meaningful only if the uncapped session would have been longer — otherwise
    // this passes on an empty queue and guards nothing.
    expect(store.buildBriefing().dueTotal).toBeGreaterThan(session.SESSION_CEILING);
    expect(items.length).toBeLessThanOrEqual(session.SESSION_CEILING);
    expect(items.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('the ceiling is a number a person can finish', async () => {
    const { session } = await fresh();
    // Guards the regression that made the first attempt useless: priced in
    // minutes it came out at 150, more than double the worst real session.
    expect(session.SESSION_CEILING).toBeGreaterThanOrEqual(20);
    expect(session.SESSION_CEILING).toBeLessThanOrEqual(60);
  });
});

describe('progress explains where hidden work went', () => {
  it('counts what the level filter is excluding', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([
      word('a1a', 'T', { level: 'A1' }), word('a1b', 'T', { level: 'A1' }),
      word('c1a', 'T', { level: 'C1' }),
    ]);
    store.review('a1a', srs.Rating.Easy);
    store.review('a1b', srs.Rating.Easy);
    expect(store.knownOutOfScope()).toBe(0);      // nothing hidden yet

    // Narrow to C1 — the one tap that made Fortschritt read "0 known" beside a
    // 120-day streak, with no line saying where the rest went.
    store.setLevels(new Set(['C1'] as const));
    expect(store.totals().learned).toBe(0);
    expect(store.knownOutOfScope()).toBe(2);
  });
});

describe('the feed leads with words you have not met', () => {
  it('puts fresh words ahead of due reviews', async () => {
    const { data, store, srs, feed } = await fresh();
    data.registerWords([
      word('known1', 'Zed'), word('known2', 'Zed'), word('new1', 'Zed'), word('new2', 'Zed'),
    ]);
    store.review('known1', srs.Rating.Again);   // due now
    store.review('known2', srs.Rating.Again);
    const order = feed.feedOrder().map((w) => w.id);
    const firstDue = Math.min(order.indexOf('known1'), order.indexOf('known2'));
    const firstNew = Math.min(order.indexOf('new1'), order.indexOf('new2'));
    // A browse surface must not open on cards marked "known".
    expect(firstNew).toBeLessThan(firstDue);
  });

  it('holds even when the briefing is entirely due', async () => {
    // The case the first fix missed. A learner with a backlog gets a briefing
    // with no fresh words in it at all, so promoting fresh *within* the briefing
    // changed nothing and the feed still opened on a known word.
    const { data, store, srs, feed } = await fresh();
    const due = Array.from({ length: 30 }, (_, i) => word(`d${i}`, 'Zed'));
    const unseen = Array.from({ length: 5 }, (_, i) => word(`u${i}`, 'Zed'));
    data.registerWords([...due, ...unseen]);
    for (const w of due) store.review(w.id, srs.Rating.Easy);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 60 * 86_400_000));
    const order = feed.feedOrder().map((id) => id.id);
    expect(store.buildBriefing().fresh).toBe(0);          // nothing fresh to promote
    expect(order[0].startsWith('u')).toBe(true);          // …and it still leads with unseen
    vi.useRealTimers();
  });
});

describe('the feed does not open on the same word every time', () => {
  it('varies the first slot while keeping common words ahead of rare ones', async () => {
    const { data, feed } = await fresh();
    // 60 unseen words in corpus-frequency order and nothing due — the state most
    // learners are in, and the one where the first fix changed nothing because
    // the briefing returns no fresh picks at all.
    const words = Array.from({ length: 60 }, (_, i) => word(`w${String(i).padStart(2, '0')}`, 'Zed'));
    data.registerWords(words);
    const firsts = new Set(Array.from({ length: 25 }, () => feed.feedOrder()[0].id));
    expect(firsts.size, 'the opening word varies').toBeGreaterThan(1);
    // …and a word from the second band never jumps the first one.
    for (let n = 0; n < 10; n++) {
      const order = feed.feedOrder().map((w) => w.id);
      const firstBand = order.slice(0, 20);
      expect(firstBand.every((id) => Number(id.slice(1)) < 20), 'bands hold').toBe(true);
    }
  });
});
