// The day's new-word budget and the forecast the recap reads — engagement fixes
// from the 2026-09-25 panel review.
//
// Each pins a way the old behaviour misled a learner: new words that reset on every
// tap of Üben and stalled at twenty due, and a "waiting tomorrow" that counted
// cards nothing would ever serve.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Word } from './types.ts';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
  idbReady: async () => true,
}));

async function fresh() {
  vi.resetModules();
  const data = await import('./data/index.ts');
  const store = await import('./store.ts');
  const srs = await import('./srs.ts');
  return { data, store, srs };
}

const word = (id: string, extra: Partial<Word> = {}): Word => ({
  id, term: id, en: id, pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'S', kind: 'word', ...extra,
});

beforeEach(() => { localStorage.clear(); });

describe('the new-word budget is per day', () => {
  it('does not reset when Üben is opened again', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords(Array.from({ length: 80 }, (_, i) => word(`w${i}`)));
    const perDay = store.PACE[store.pace()].fresh;

    // Three sittings in one day: build, grade every new word, build again.
    let taught = 0;
    for (let sitting = 0; sitting < 3; sitting++) {
      const b = store.buildBriefing();
      for (const id of b.ids) if (store.statusOf(id) === 'new') { store.review(id, srs.Rating.Good); taught++; }
    }
    expect(taught).toBe(perDay);
    expect(store.introducedToday()).toBe(perDay);
    expect(store.buildBriefing().fresh).toBe(0);
  });

  it('does not stall at twenty due — new words still arrive beside a normal backlog', async () => {
    const { data, store, srs } = await fresh();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));
      const due = Array.from({ length: 25 }, (_, i) => word(`d${i}`));
      data.registerWords([...due, ...Array.from({ length: 30 }, (_, i) => word(`n${i}`))]);
      for (const w of due) store.review(w.id, srs.Rating.Good);
      vi.setSystemTime(new Date('2026-07-20T12:00:00Z'));
      store.toggleSaved('n7');

      const b = store.buildBriefing();
      expect(b.due).toBe(25);
      expect(b.fresh).toBe(store.PACE[store.pace()].fresh);  // was 0 from 20 due upward
      expect(b.ids[0]).toBe('n7');                             // saved words lead the whole queue
    } finally {
      vi.useRealTimers();
    }
  });

  it('closes the day to all but a few saved words when the backlog is past two days', async () => {
    const { data, store, srs } = await fresh();
    vi.useFakeTimers();
    try {
      store.setPace('gentle');   // serves 30 due, so past 60 closes the day
      vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));
      const due = Array.from({ length: 70 }, (_, i) => word(`d${i}`));
      const fresh = Array.from({ length: 20 }, (_, i) => word(`n${i}`));
      data.registerWords([...due, ...fresh]);
      for (const w of due) store.review(w.id, srs.Rating.Good);
      vi.setSystemTime(new Date('2026-07-20T12:00:00Z'));
      for (let i = 0; i < 8; i++) store.toggleSaved(`n${i}`);

      const b = store.buildBriefing();
      expect(store.freshBudget(b.dueTotal).closed).toBe(true);
      expect(b.fresh).toBe(store.SAVED_BYPASS);
      expect(b.ids.slice(0, store.SAVED_BYPASS).every((id) => id.startsWith('n'))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not spend the budget on a word marked Easy at first sight, and an undo gives one back', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('a'), word('b')]);

    store.review('a', srs.Rating.Easy);        // "I knew this already" — placement's grade
    expect(store.introducedToday()).toBe(0);

    store.review('b', srs.Rating.Good);
    expect(store.introducedToday()).toBe(1);
    store.restoreCard('b', undefined);          // undone: new again
    expect(store.introducedToday()).toBe(0);
  });

  it('never counts a drill as a new word', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('a')]);
    store.review('gym:gender:a', srs.Rating.Good);
    expect(store.introducedToday()).toBe(0);
  });
});

describe('the forecast counts only what a session can serve', () => {
  it('leaves out the retired syllabus and words outside the level filter', async () => {
    const { data, store, srs } = await fresh();
    data.registerWords([word('a1'), word('b2', { level: 'B2' })]);
    store.review('a1', srs.Rating.Good);
    store.review('b2', srs.Rating.Good);
    store.review('gex:perfekt-1', srs.Rating.Good);   // inert, kept, never served
    store.review('gram:kasus', srs.Rating.Good);
    store.review('gym:gender:a1', srs.Rating.Good);

    expect(store.dueForecast(2)[0]).toBe(3);          // a1, b2 and the drill
    store.setLevels(new Set(['A1']));
    expect(store.dueForecast(2)[0]).toBe(2);          // a1 and its drill
    store.toggleDrillMode('gender');                  // muted: not served either
    expect(store.dueForecast(2)[0]).toBe(1);
  });
});
