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

export function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    // v2 adds the ledger. `onupgradeneeded` runs for v1 databases too, and both
    // creates are guarded, so an existing learner keeps their `kv` contents and
    // simply gains an empty ledger.
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(LEDGER_STORE)) {
        db.createObjectStore(LEDGER_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
    });
  } catch {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
  }
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
    });
  } catch { /* ignore */ }
}
