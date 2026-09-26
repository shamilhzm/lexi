// The backup carries the history, not only its compression.
//
// Until 2026-09-25 (panel review) a backup held the card map and dropped the two
// records that explain it: the attempt log `missStats` ranks blind spots by, and
// the review ledger — the one thing that can rebuild a card, and what a merge
// between two devices would need (docs/BACKEND.md §4). A restore on a new phone
// brought the schedule back and started both from nothing.
//
// Against a real IndexedDB (fake-indexeddb), because the ledger is cursor and
// transaction mechanics and a mock would only echo what the code calls.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { Rating } from './srs.ts';

async function clearLedger() {
  await new Promise<void>((resolve) => {
    const req = indexedDB.open('lexi', 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('reviews')) db.createObjectStore('reviews', { autoIncrement: true });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['reviews', 'kv'], 'readwrite');
      tx.objectStore('reviews').clear();
      tx.objectStore('kv').clear();
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  });
}

async function fresh() {
  vi.resetModules();
  const store = await import('./store.ts');
  const ledger = await import('./lib/ledger.ts');
  return { store, ledger };
}

beforeEach(async () => { localStorage.clear(); await clearLedger(); });

describe('the backup file', () => {
  it('carries the review ledger and the attempt log', async () => {
    const { store, ledger } = await fresh();
    await ledger.logReview('voc:A1:der Tisch', Rating.Good, 1000);
    await ledger.logReview('voc:A1:die Tür', Rating.Again, 2000, { r: 0.8, s: 3 });
    store.logAttempt('gender');

    const b = JSON.parse(await store.exportBackup());
    expect(b.ledger).toEqual([
      { id: 'voc:A1:der Tisch', g: Rating.Good, at: 1000 },
      { id: 'voc:A1:die Tür', g: Rating.Again, at: 2000, r: 0.8, s: 3 },
    ]);
    expect(b.attempts).toHaveLength(1);
  });

  it('restores the ledger in the order it was written', async () => {
    const { store, ledger } = await fresh();
    for (const [i, id] of ['c', 'a', 'b'].entries()) await ledger.logReview(id, Rating.Good, 5000 - i);
    const json = await store.exportBackup();

    await clearLedger();
    const next = await fresh();
    await next.store.importData(json);
    expect((await next.ledger.loadLedger()).map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('an older backup, with no ledger in it, leaves this device’s ledger alone', async () => {
    const { store, ledger } = await fresh();
    await ledger.logReview('voc:A1:das Haus', Rating.Good, 1000);
    await store.importData(JSON.stringify({ cards: {}, misses: [], visits: [] }));
    expect(await ledger.loadLedger()).toHaveLength(1);
  });

  it('drops rows that are not review events rather than storing them', async () => {
    const { store, ledger } = await fresh();
    await store.importData(JSON.stringify({
      cards: {}, ledger: [{ id: 'ok', g: 3, at: 1 }, { id: 5 }, null, 'x', { id: 'no-grade', at: 2 }],
    }));
    expect((await ledger.loadLedger()).map((e) => e.id)).toEqual(['ok']);
  });
});
