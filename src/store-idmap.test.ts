// The corpus can correct a card id (a capitalised headword fixed, a duplicate
// merged — see scripts/corpus/casefix.ts). When it does, the learner's FSRS
// schedule has to follow: a silent reset to "new" would re-teach words they
// already know and would be invisible until the reviews piled up.
//
// These guard both halves — that the map still describes the shipped corpus,
// and that hydrate() actually moves a stored schedule across it.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ID_MAP } from './data/idmap.ts';
import type { Word } from './types.ts';

const vocab: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const grammar: Record<string, { title: string; exercises: unknown[] }[]> =
  JSON.parse(readFileSync('public/data/grammar.json', 'utf8'));

/** Every id the app can legitimately schedule a card under.
 *
 *  Not just `vocab.json`: exercise cards (`gex:<level>:<title>:<xi>`) are minted
 *  from the grammar bank and never appear in the corpus, so a guard that only knew
 *  about vocab reported all 24 of the 2026-08-06 level-move entries as dangling.
 *  The map is allowed to retire a grammar exercise, so the guard has to know where
 *  those live. */
const ids = new Set<string>(vocab.map((w) => w.id));
for (const [level, points] of Object.entries(grammar)) {
  for (const p of points) {
    for (let xi = 0; xi < p.exercises.length; xi++) ids.add(`gex:${level}:${p.title}:${xi}`);
  }
}

/** Mirrors store.ts. Kept local rather than exported: the debounce is an internal
 *  scheduling detail, and the test only needs to outwait it. */
const PERSIST_DEBOUNCE_MS = 400;

describe('card id migration map', () => {
  it('points every old id at a card the corpus still ships', () => {
    const dangling = Object.entries(ID_MAP).filter(([, to]) => !ids.has(to));
    expect(dangling).toEqual([]);
  });

  it('never maps an id that is still in the corpus', () => {
    const live = Object.keys(ID_MAP).filter((from) => ids.has(from));
    expect(live).toEqual([]);
  });

  it('carries a stored schedule onto the new id', async () => {
    const [from, to] = Object.entries(ID_MAP)[0];
    const stored = {
      'lexi.cards.v1': {
        [from]: { due: new Date(Date.now() - 86_400_000).toISOString(), reps: 7, lapses: 1, state: 2,
          stability: 9, difficulty: 5, elapsed_days: 1, scheduled_days: 3, last_review: new Date().toISOString() },
      },
    } as Record<string, unknown>;

    vi.resetModules();
    vi.doMock('./lib/idb.ts', () => ({
      idbGet: async (key: string) => stored[key],
      idbSet: async (key: string, value: unknown) => { stored[key] = value; },
    }));
    vi.useFakeTimers();
    const store = await import('./store.ts');
    await store.hydrate();

    // In memory, immediately: this is what the session actually reads.
    expect(store.statusOf(to)).not.toBe('new');

    // On disk, one debounce later. `persistCards` batches writes on a 400ms timer
    // (store.ts PERSIST_DEBOUNCE_MS), so the write-back that drops the old id does
    // not land inside hydrate(). Losing that write is survivable by construction —
    // `migrateIds` re-runs on every hydrate and is a no-op once the old ids are
    // gone — but it must land, or the map would be re-walked forever.
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 100);
    expect((stored['lexi.cards.v1'] as Record<string, unknown>)[from]).toBeUndefined();

    vi.useRealTimers();
    vi.doUnmock('./lib/idb.ts');
  });
});

// Grammar exercise cards used to be keyed positionally —
// `gex:<level>:<pointIndex>:<xi>` — so a learner's schedule pointed at an array
// slot. Inserting or reordering a point would have re-attached it to a different
// exercise, silently. Ids are keyed on the point's title now, and this is the
// one-time walk that carries existing learners across.
//
// Worth testing carefully because the failure is invisible: a dropped schedule
// looks like an untouched card, and a *wrongly* moved one looks like progress on
// a concept the learner never studied.
describe('grammar exercise ids move off array positions', () => {
  it('carries a positional schedule onto the title-keyed id', async () => {
    const { GEX_POINT_ORDER } = await import('./data/gexmap.ts');
    const title = GEX_POINT_ORDER['A1:0'];
    expect(title, 'snapshot must cover A1:0').toBeTruthy();

    const stored = {
      'lexi.cards.v1': {
        'gex:A1:0:2': { due: new Date(Date.now() - 86_400_000).toISOString(), reps: 5, lapses: 0, state: 2,
          stability: 7, difficulty: 5, elapsed_days: 1, scheduled_days: 3, last_review: new Date().toISOString() },
      },
    } as Record<string, unknown>;

    vi.resetModules();
    vi.doMock('./lib/idb.ts', () => ({
      idbGet: async (key: string) => stored[key],
      idbSet: async (key: string, value: unknown) => { stored[key] = value; },
    }));
    const store = await import('./store.ts');
    await store.hydrate();

    // Read through the public accessor rather than poking at ids: this is the
    // question a learner would ask — "is my progress on this concept still here?"
    expect(store.pointStats('A1', title, 6).seen).toBe(1);

    vi.doUnmock('./lib/idb.ts');
  });

  it('drops an index the snapshot does not cover rather than guessing', async () => {
    // An index beyond the frozen snapshot can only come from a bank newer than
    // it, where the position means something this code cannot know. Losing one
    // exercise's schedule is recoverable; attaching it to the wrong concept is
    // the exact bug the change exists to prevent.
    const stored = {
      'lexi.cards.v1': {
        'gex:A1:999:0': { due: new Date().toISOString(), reps: 3, lapses: 0, state: 2,
          stability: 7, difficulty: 5, elapsed_days: 1, scheduled_days: 3, last_review: new Date().toISOString() },
      },
    } as Record<string, unknown>;

    vi.resetModules();
    vi.doMock('./lib/idb.ts', () => ({
      idbGet: async (key: string) => stored[key],
      idbSet: async (key: string, value: unknown) => { stored[key] = value; },
    }));
    const store = await import('./store.ts');
    await store.hydrate();

    // Nothing anywhere claims it.
    const { GEX_POINT_ORDER } = await import('./data/gexmap.ts');
    for (const title of Object.values(GEX_POINT_ORDER)) {
      expect(store.pointStats('A1', title, 6).seen, `${title} must not inherit it`).toBe(0);
    }

    vi.doUnmock('./lib/idb.ts');
  });

  it('leaves an already-migrated id alone', async () => {
    // The migration runs on every hydrate. It must be idempotent, or the second
    // launch would re-walk cards that are already correct.
    const { GEX_POINT_ORDER } = await import('./data/gexmap.ts');
    const title = GEX_POINT_ORDER['A1:0'];
    const stored = {
      'lexi.cards.v1': {
        [`gex:A1:${title}:0`]: { due: new Date().toISOString(), reps: 9, lapses: 0, state: 2,
          stability: 7, difficulty: 5, elapsed_days: 1, scheduled_days: 3, last_review: new Date().toISOString() },
      },
    } as Record<string, unknown>;

    vi.resetModules();
    vi.doMock('./lib/idb.ts', () => ({
      idbGet: async (key: string) => stored[key],
      idbSet: async (key: string, value: unknown) => { stored[key] = value; },
    }));
    const store = await import('./store.ts');
    await store.hydrate();

    expect(store.pointStats('A1', title, 6).seen).toBe(1);
    vi.doUnmock('./lib/idb.ts');
  });
});
