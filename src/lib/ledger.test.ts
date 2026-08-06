// The review ledger, tested against a real IndexedDB implementation rather than a
// mock of one.
//
// That choice is the point: almost all of `ledger.ts` is cursor mechanics — walk
// backwards to find the newest row for a card, walk forwards to drop the oldest —
// and a mock would only assert that I called the methods I wrote. `fake-indexeddb`
// is a devDependency and ships nowhere.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { Rating } from '../srs.ts';

/** A clean ledger per test.
 *
 *  The store is *cleared* rather than the database deleted: `deleteDatabase` blocks
 *  while any connection is open, and both `idb.ts` and `ledger.ts` memoise theirs —
 *  the first draft of this helper hung every test after the first for exactly that
 *  reason. Clearing needs no exclusive lock. */
async function fresh() {
  vi.resetModules();
  const l = await import('./ledger.ts');
  await l.loadLedger(); // forces the open, which creates the stores on a cold db
  await new Promise<void>((resolve) => {
    const req = indexedDB.open('lexi', 2);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('reviews')) { db.close(); resolve(); return; }
      const tx = db.transaction('reviews', 'readwrite');
      tx.objectStore('reviews').clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    };
    req.onerror = () => resolve();
  });
  l.resetLedgerState();
  return l;
}

let ledger: Awaited<ReturnType<typeof fresh>>;
beforeEach(async () => { ledger = await fresh(); });
afterEach(() => { vi.useRealTimers(); });

describe('the review ledger', () => {
  it('records what was reviewed, when, and how', async () => {
    // The three things `lexi.reviewlog.v1` does not record, and the reason this
    // exists: daily counts cannot rebuild a card.
    await ledger.logReview('voc:A1:Haus', Rating.Good, 1000);

    const rows = await ledger.loadLedger();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ id: 'voc:A1:Haus', g: Rating.Good, at: 1000 });
  });

  it('keeps events in the order they happened', async () => {
    // Replay-merge folds events in order, so the ledger has to return them in one.
    // Deliberately not awaited: this is how `review()` calls it, and IndexedDB
    // guarantees transactions on one connection run in the order they were
    // created — so ordering must hold even under fire-and-forget.
    for (let i = 0; i < 5; i++) ledger.logReview(`c${i}`, Rating.Good, 1000 + i);

    expect((await ledger.loadLedger()).map((e) => e.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
  });

  it('keeps every review of the same card, not just the last', async () => {
    // The whole difference from card state: three reviews are three events.
    await ledger.logReview('voc:A1:Haus', Rating.Again, 1);
    await ledger.logReview('voc:A1:Haus', Rating.Hard, 2);
    await ledger.logReview('voc:A1:Haus', Rating.Good, 3);

    expect((await ledger.loadLedger()).map((e) => e.g)).toEqual([Rating.Again, Rating.Hard, Rating.Good]);
  });
});

describe('undo removes the review it wrote', () => {
  it('drops the newest event for that card', async () => {
    await ledger.logReview('a', Rating.Good, 1);
    await ledger.logReview('a', Rating.Again, 2);
    await ledger.dropLastReview('a');

    const rows = await ledger.loadLedger();
    expect(rows).toHaveLength(1);
    expect(rows[0].g, 'the earlier review survives').toBe(Rating.Good);
  });

  it('drops that card’s event even when another card was graded after it', async () => {
    // The reason this is scoped to an id rather than "delete the last row": a
    // session interleaves flips and drills, so the newest row is routinely not the
    // one the learner just undid. Deleting blindly would rewind someone else's card.
    await ledger.logReview('flip', Rating.Good, 1);
    await ledger.logReview('drill', Rating.Good, 2);
    await ledger.dropLastReview('flip');

    expect((await ledger.loadLedger()).map((e) => e.id)).toEqual(['drill']);
  });

  it('does nothing when the card has no events', async () => {
    await ledger.logReview('a', Rating.Good, 1);
    await ledger.dropLastReview('never-graded');

    expect(await ledger.loadLedger()).toHaveLength(1);
  });

  it('does nothing on an empty ledger', async () => {
    await ledger.dropLastReview('a');
    expect(await ledger.loadLedger()).toEqual([]);
  });
});

describe('when IndexedDB is unavailable', () => {
  it('reports itself unavailable and never throws', async () => {
    // `idb.ts` falls back to localStorage for key–value data, but an append-only
    // log there would exhaust the ~5 MB quota within weeks. Having no ledger and
    // saying so is the honest answer — merge falls back to reps-wins, which is
    // where we started.
    const real = globalThis.indexedDB;
    // @ts-expect-error — deliberately removing it, as private mode effectively does
    delete globalThis.indexedDB;
    try {
      vi.resetModules();
      const l = await import('./ledger.ts');
      await expect(l.logReview('a', Rating.Good)).resolves.toBeUndefined();
      await expect(l.loadLedger()).resolves.toEqual([]);
      expect(l.ledgerAvailable()).toBe(false);
    } finally {
      globalThis.indexedDB = real;
    }
  });
});
