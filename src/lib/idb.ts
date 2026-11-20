// Minimal async key–value store over IndexedDB, with a localStorage fallback so
// the app's persistence works everywhere (private mode, older browsers, IDB
// disabled). One database, one object store; values must be structured-cloneable
// (plain JSON-ish objects — which is what the store persists). Why IndexedDB:
// it isn't bound by localStorage's ~5 MB quota and survives larger FSRS histories.
const DB_NAME = 'lexi';
const STORE = 'kv';
/** Append-only review ledger — see lib/ledger.ts. A separate store rather than a
 *  key in `kv` because it is appended to on every grade: holding it as one array
 *  under a key would mean reading, growing and re-cloning the whole ledger on each
 *  write, which is precisely the cost the card-map debounce exists to avoid and
 *  would be far worse here. An auto-incrementing store appends in O(1). */
export const LEDGER_STORE = 'reviews';

let dbp: Promise<IDBDatabase> | null = null;

/** How long to wait for `indexedDB.open` before giving up on it.
 *
 *  **This exists because an open request is not guaranteed to settle.** Every
 *  other failure here is an event we already handle — `onerror`, a synchronous
 *  `SecurityError` — but a request can also simply *never fire anything*:
 *  `onblocked` while another tab holds an older version and never closes it, a
 *  browser or embedding context that denies storage by policy, some private-mode
 *  implementations.
 *
 *  Caught 2026-09-05, in an embedded browser that denies IndexedDB: `hydrate()`
 *  awaits `idbGet`, `idbGet` awaits `open()`, and `open()` awaited an event that
 *  never came — so `main.tsx`'s `Promise.all` never settled and the app sat on
 *  its boot splash **forever**, with no error, no timeout and no reload prompt.
 *  The localStorage fallback three lines below was the correct answer the whole
 *  time and was simply never reached.
 *
 *  A local-first app that cannot start is worse than one that starts without its
 *  history: the history is still on disk, and the learner can at least see that
 *  something is wrong. Two seconds is well past any real open (single-digit
 *  milliseconds) and well short of the point where a person reloads. */
const OPEN_TIMEOUT_MS = 2000;

export function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    // Never let the timer outlive the request, and never let a late event
    // resolve a promise the timeout already rejected.
    let settled = false;
    const done = (fn: () => void) => { if (settled) return; settled = true; clearTimeout(timer); fn(); };
    const timer = setTimeout(() => done(() => reject(new Error('indexeddb-timeout'))), OPEN_TIMEOUT_MS);

    let req: IDBOpenDBRequest;
    // `indexedDB.open` itself throws a SecurityError in some denied contexts,
    // rather than returning a request that errors.
    try {
      // v2 adds the ledger. `onupgradeneeded` runs for v1 databases too, and both
      // creates are guarded, so an existing learner keeps their `kv` contents and
      // simply gains an empty ledger.
      req = indexedDB.open(DB_NAME, 2);
    } catch (err) { done(() => reject(err as Error)); return; }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(LEDGER_STORE)) {
        db.createObjectStore(LEDGER_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => done(() => resolve(req.result));
    req.onerror = () => done(() => reject(req.error ?? new Error('indexeddb-error')));
    // Another tab is holding an older version open. It may close in a moment, so
    // this is not resolved immediately — but the timeout above now bounds it.
    req.onblocked = () => { /* the timer decides */ };
  });
  // A failed open must not be memoised as a permanently broken database: the tab
  // holding the old version may close, and the next read should try again rather
  // than fall back to localStorage for the life of the page.
  dbp.catch(() => { dbp = null; });
  return dbp;
}

/** Close the connection and forget it, so the next call reopens.
 *
 *  Needed because IndexedDB blocks `deleteDatabase` and version upgrades while any
 *  connection is open, and this module memoises one for the life of the page. Used
 *  by the upgrade tests today; the sign-out path in docs/BACKEND.md will want it
 *  too, since dropping a local replica means closing before deleting. */
export async function closeDb(): Promise<void> {
  const p = dbp;
  dbp = null;
  if (!p) return;
  try { (await p).close(); } catch { /* already gone */ }
}

/** Whether IndexedDB opens right now. Never throws.
 *
 *  `store.hydrate()` asks once, at boot. If the answer is no, what it loaded came
 *  from the localStorage fallback — usually nothing — and the real history may
 *  still be sitting in an IndexedDB that a blocking tab will release a second
 *  later. Writing through `idbSet` from then on would put that near-empty map on
 *  top of it, so the store writes to localStorage only for the rest of the page. */
export async function idbReady(): Promise<boolean> {
  try { await open(); return true; } catch { return false; }
}

/** Read a value. Falls back to localStorage if IndexedDB is unavailable. */
export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  }
}

/** Write a value. Falls back to localStorage if IndexedDB is unavailable. */
export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      // A failure at commit (how Chromium reports a full disk) fires only
      // `abort`; without this the promise never settled (2026-11-20).
      tx.onabort = () => reject(tx.error ?? new Error('indexeddb-abort'));
    });
  } catch {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
  }
}

/** Write several values in **one** transaction, all or nothing, and reject on any
 *  failure instead of falling back. For a restore: a backup that half-lands (the
 *  cards failed, the settings did not) is worse than one that is refused, and
 *  `idbSet`'s quiet localStorage fallback left a dead copy of the cards there. */
export async function idbSetMany(entries: [string, unknown][]): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    for (const [k, v] of entries) os.put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('indexeddb-error'));
    tx.onabort = () => reject(tx.error ?? new Error('indexeddb-abort'));
  });
}

/** Read, change and write one value inside a single readwrite transaction.
 *
 *  IndexedDB runs readwrite transactions on a store one at a time, across every
 *  tab of the origin, so two tabs updating the same key cannot interleave. This
 *  is what lets each tab write only what it changed on top of what another tab
 *  stored, instead of its whole (possibly stale) copy (2026-11-20). Rejects on
 *  failure; there is no fallback, so the caller can keep its change and retry. */
export async function idbUpdate<T>(key: string, change: (current: T | undefined) => T): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    const req = os.get(key);
    req.onsuccess = () => {
      try { os.put(change(req.result as T | undefined), key); } catch (err) { tx.abort(); reject(err); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('indexeddb-error'));
    tx.onabort = () => reject(tx.error ?? new Error('indexeddb-abort'));
  });
}

/** Delete a value (best-effort, both backends). */
export async function idbDel(key: string): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch { /* ignore */ }
}
