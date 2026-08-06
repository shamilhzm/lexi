// The review ledger — what was reviewed, when, and how.
//
// Nothing in the app recorded this. `lexi.reviewlog.v1` sounds like it does and
// does not: it is `Record<date, { n, again }>`, daily counts capped at 60 days,
// with no card ids, no grades and no timestamps. It draws the Stats chart and
// nothing else can be rebuilt from it.
//
// ## Why it matters beyond Stats
//
// FSRS card state is not a value, it is the result of a history. That makes it
// mergeable only if the history exists: two devices that studied offline are
// reconciled by replaying both event lists in timestamp order, because `ts-fsrs` is
// deterministic and the same events in the same order give the same card. Without a
// ledger the best available merge is "higher `reps` wins", which can silently
// discard a real review. See docs/BACKEND.md §4 — this is step 1 of that sequence
// and deliberately has nothing to do with servers.
//
// ## Shape
//
// One row per graded review: `{ id, g, at }`. Appended to a dedicated
// auto-incrementing IndexedDB store, so a write is O(1) and never re-clones the
// ledger. Undo removes the row it wrote, because a rewound review did not happen —
// the same reasoning `unbumpReviewLog` already applies to the daily counts.
//
// ## What it deliberately is not
//
// Not a sync queue, not analytics, and not something the app reads on the hot path.
// It is written on grade and read only when something asks for history. Every
// operation is fire-and-forget: a ledger failure must never break a session, so
// errors are swallowed and the worst case is a merge that falls back to reps-wins.
import { open, LEDGER_STORE } from './idb.ts';
import type { Grade } from '../srs.ts';

export interface ReviewEvent {
  /** The card id — `voc:…`, `gym:…` or `gex:…`. */
  id: string;
  /** FSRS rating, 1–4. */
  g: Grade;
  /** Epoch ms. */
  at: number;
}

/** Roughly two years of heavy study. Past this the oldest rows are dropped: exact
 *  replay is lost for the cards involved and merge falls back to reps-wins for
 *  them, which is the same place we start from — an unbounded ledger on a phone is
 *  the worse failure, because storage pressure evicts the whole origin, progress
 *  included. */
const MAX_EVENTS = 50_000;
/** Appends between size checks. Counting on every write would double the writes. */
const PRUNE_EVERY = 1_000;

let sinceCheck = 0;
let available: boolean | null = null;

/** Whether a ledger exists at all. `false` where IndexedDB is unavailable (private
 *  mode, older browsers) — `idb.ts` falls back to localStorage for the key–value
 *  store, but an append-only log there would exhaust the ~5 MB quota within weeks,
 *  so the honest answer is to have no ledger and say so. */
export function ledgerAvailable(): boolean {
  return available !== false;
}

/** Record a graded review.
 *
 *  Returns a promise that **never rejects**, so callers can ignore it — `review()`
 *  does — while tests and any future sync flush can await it. Fire-and-forget was
 *  the intent; returning nothing was just a way of making it untestable. */
export function logReview(id: string, g: Grade, at = Date.now()): Promise<void> {
  return (async () => {
    try {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(LEDGER_STORE, 'readwrite');
        tx.objectStore(LEDGER_STORE).add({ id, g, at } satisfies ReviewEvent);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      available = true;
      if (++sinceCheck >= PRUNE_EVERY) { sinceCheck = 0; await prune(); }
    } catch { available = false; }
  })();
}

/** Remove the most recent event for a card — the undo path.
 *
 *  Scoped to the id rather than "delete the last row" because a session can
 *  interleave a flip and a drill, so the newest row is not necessarily the one the
 *  learner just undid. */
export function dropLastReview(id: string): Promise<void> {
  return (async () => {
    try {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(LEDGER_STORE, 'readwrite');
        // Reverse cursor: the first match walking backwards is the newest.
        const req = tx.objectStore(LEDGER_STORE).openCursor(null, 'prev');
        req.onsuccess = () => {
          const cur = req.result;
          if (!cur) { resolve(); return; }
          if ((cur.value as ReviewEvent).id === id) { cur.delete(); resolve(); return; }
          cur.continue();
        };
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* a ledger that misses one deletion is still better than none */ }
  })();
}

/** Every event, oldest first. Only for history views and (later) sync. */
export async function loadLedger(): Promise<ReviewEvent[]> {
  try {
    const db = await open();
    return await new Promise<ReviewEvent[]>((resolve, reject) => {
      const req = db.transaction(LEDGER_STORE, 'readonly').objectStore(LEDGER_STORE).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as ReviewEvent[]);
      req.onerror = () => reject(req.error);
    });
  } catch { available = false; return []; }
}

/** Drop the oldest rows once the ledger is over `MAX_EVENTS`. */
async function prune(): Promise<void> {
  try {
    const db = await open();
    const count = await new Promise<number>((resolve, reject) => {
      const req = db.transaction(LEDGER_STORE, 'readonly').objectStore(LEDGER_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count <= MAX_EVENTS) return;
    let toDrop = count - MAX_EVENTS;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LEDGER_STORE, 'readwrite');
      const req = tx.objectStore(LEDGER_STORE).openCursor(); // ascending = oldest first
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur || toDrop <= 0) { resolve(); return; }
        cur.delete();
        toDrop--;
        cur.continue();
      };
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* pruning is maintenance; failing it costs space, not correctness */ }
}

/** Test seam. */
export function resetLedgerState(): void {
  sinceCheck = 0;
  available = null;
}
