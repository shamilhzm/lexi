// Spoken clips, kept on the device, so each programme waits only for the words
// Lexi has never said to you before.
//
// Synthesis is the slow part of preparing Hören or Practise aloud: every clip is a
// neural voice running in WebAssembly on the phone. Most of a day's programme
// repeats yesterday's — saved words, words coming due, the same examples — so the
// clips are kept here, decoded, at the rate the timeline is rendered at.
//
// **Its own IndexedDB database, not Cache Storage.** `sw.js` deletes every cache
// that is not its own on activate, which would empty this one on every deploy.
// And not the app's `lexi` database either: this is derived data that rebuilds
// itself, it has no place in a backup, and a learner's history should not share
// a quota line with a few hundred sentences of audio.
//
// Every failure is non-fatal and silent. A device that refuses storage still
// plays; it just synthesises again.

const DB_NAME = 'lexi-clips';
const PCM = 'pcm';    // key → Int16 samples (ArrayBuffer)
const META = 'meta';  // key → { size, at } — read without loading any audio
/** About 30 minutes of speech at 16 kHz. Enough for a week of overlapping
 *  programmes; small enough that nobody's storage notices. */
export const CLIP_CACHE_CAP = 60 * 1024 * 1024;
/** `indexedDB.open` is not guaranteed to settle — see `lib/idb.ts`. */
const OPEN_TIMEOUT_MS = 2000;

interface Meta { size: number; at: number }

let dbp: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    let settled = false;
    const done = (d: IDBDatabase | null) => { if (!settled) { settled = true; resolve(d); } };
    if (typeof indexedDB === 'undefined') { done(null); return; }
    setTimeout(() => done(null), OPEN_TIMEOUT_MS);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(PCM)) d.createObjectStore(PCM);
        if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
      };
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(null);
      req.onblocked = () => done(null);
    } catch { done(null); }
  });
  return dbp;
}

function finished(t: IDBTransaction): Promise<void> {
  return new Promise((resolve) => {
    t.oncomplete = () => resolve();
    t.onerror = () => resolve();
    t.onabort = () => resolve();
  });
}

/** Read every clip that is cached, and mark each one used now. */
export async function readClips(keys: string[]): Promise<Map<string, Int16Array>> {
  const out = new Map<string, Int16Array>();
  const d = await db();
  if (!d || keys.length === 0) return out;
  try {
    const t = d.transaction([PCM, META], 'readwrite');
    const pcm = t.objectStore(PCM);
    const meta = t.objectStore(META);
    const now = Date.now();
    for (const key of keys) {
      const r = pcm.get(key);
      r.onsuccess = () => {
        const buf = r.result as ArrayBuffer | undefined;
        if (!buf) return;
        out.set(key, new Int16Array(buf));
        meta.put({ size: buf.byteLength, at: now } satisfies Meta, key);
      };
    }
    await finished(t);
  } catch { /* an unreadable cache is an empty one */ }
  return out;
}

/** Keep one clip. */
export async function writeClip(key: string, samples: Int16Array): Promise<void> {
  const d = await db();
  if (!d) return;
  try {
    const t = d.transaction([PCM, META], 'readwrite');
    const buf = samples.slice().buffer;
    t.objectStore(PCM).put(buf, key);
    t.objectStore(META).put({ size: buf.byteLength, at: Date.now() } satisfies Meta, key);
    await finished(t);
  } catch { /* full or unavailable: the clip is synthesised again next time */ }
}

/** Drop the least recently used clips until the cache is under `cap` bytes. */
export async function pruneClips(cap = CLIP_CACHE_CAP): Promise<void> {
  const d = await db();
  if (!d) return;
  try {
    const rows: { key: string; size: number; at: number }[] = [];
    const t = d.transaction(META, 'readonly');
    const req = t.objectStore(META).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      const m = c.value as Meta;
      rows.push({ key: String(c.key), size: m.size, at: m.at });
      c.continue();
    };
    await finished(t);
    let total = rows.reduce((n, r) => n + r.size, 0);
    if (total <= cap) return;
    rows.sort((a, b) => a.at - b.at);
    const w = d.transaction([PCM, META], 'readwrite');
    for (const r of rows) {
      if (total <= cap) break;
      w.objectStore(PCM).delete(r.key);
      w.objectStore(META).delete(r.key);
      total -= r.size;
    }
    await finished(w);
  } catch { /* pruning is housekeeping; it can wait for the next programme */ }
}
