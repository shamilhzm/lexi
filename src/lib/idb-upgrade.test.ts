// The upgrade an existing learner actually goes through.
//
// In its own file on purpose: `ledger.test.ts` calls `vi.resetModules()` per test,
// so each of its cases holds a separate, unreachable IndexedDB connection — and
// IndexedDB blocks both deletes and version upgrades while any connection is open.
// Vitest isolates by file, so this one starts with none.
import { describe, it, expect, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { Rating } from '../srs.ts';

// The upgrade an existing learner actually goes through. Everyone already using
// Lexi has a v1 database holding their entire progress under `kv`; adding the
// ledger bumps to v2, and `onupgradeneeded` fires for them too. If that path
// dropped `kv` it would delete every card they have ever studied — the single
// most destructive thing in this change, and invisible until someone reopens the
// app to find themselves a beginner.
describe('upgrading a v1 database', () => {
  it('adds the ledger without touching existing progress', async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('lexi');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });

    // A v1 database exactly as it exists on a learner's device today.
    const card = {
      due: new Date().toISOString(), reps: 11, lapses: 1, state: 2,
      stability: 9, difficulty: 5, elapsed_days: 1, scheduled_days: 3,
      last_review: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('lexi', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('kv'); };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put({ 'voc:A1:Haus': card }, 'lexi.cards.v1');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });

    // Opening through the app's own code performs the upgrade.
    vi.resetModules();
    const idb = await import('./idb.ts');
    const db = await idb.open();
    expect(db.version).toBe(2);
    expect([...db.objectStoreNames].sort()).toEqual(['kv', 'reviews']);

    // The progress is still there.
    const cards = await idb.idbGet<Record<string, unknown>>('lexi.cards.v1');
    expect(cards, 'a v1 learner keeps every card').toBeTruthy();
    expect(Object.keys(cards!)).toEqual(['voc:A1:Haus']);

    // And the ledger works from the first grade after the upgrade.
    const l = await import('./ledger.ts');
    await l.logReview('voc:A1:Haus', Rating.Good, 42);
    expect(await l.loadLedger()).toEqual([{ id: 'voc:A1:Haus', g: Rating.Good, at: 42 }]);
  });
});

// A boot that cannot finish is the worst failure a local-first app has: the
// learner's history is on disk and unreachable, and the splash says nothing.
// Found 2026-09-05 in an embedded browser that denies IndexedDB by policy —
// `indexedDB.open` returned a request that fired no event at all, so `open()`
// awaited forever, `idbGet` awaited `open()`, `hydrate()` awaited `idbGet`, and
// `main.tsx`'s `Promise.all` never settled. The localStorage fallback was right
// there and was never reached.
describe('a denied or blocked IndexedDB cannot hang the boot', () => {
  it('falls back to localStorage when open never fires an event', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const real = globalThis.indexedDB;
    // A request that resolves never — exactly what the denied context returned.
    (globalThis as { indexedDB: unknown }).indexedDB = {
      open: () => ({ onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }),
    };
    localStorage.setItem('boot-probe', JSON.stringify({ hi: 1 }));

    const { idbGet } = await import('./idb.ts');
    const read = idbGet<{ hi: number }>('boot-probe');
    await vi.advanceTimersByTimeAsync(2500);
    expect(await read).toEqual({ hi: 1 });

    vi.useRealTimers();
    (globalThis as { indexedDB: unknown }).indexedDB = real;
    vi.resetModules();
  });

  it('gives up rather than throwing when open raises SecurityError', async () => {
    vi.resetModules();
    const real = globalThis.indexedDB;
    (globalThis as { indexedDB: unknown }).indexedDB = {
      open: () => { throw new DOMException('denied', 'SecurityError'); },
    };
    localStorage.setItem('boot-probe-2', JSON.stringify({ hi: 2 }));

    const { idbGet } = await import('./idb.ts');
    expect(await idbGet<{ hi: number }>('boot-probe-2')).toEqual({ hi: 2 });

    (globalThis as { indexedDB: unknown }).indexedDB = real;
    vi.resetModules();
  });
});
