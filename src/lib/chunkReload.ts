// A lazy chunk that will not load, and the one reload that fixes it.
//
// Settings (where Backup lives), the story reader and the text scanner are split
// out of the main bundle. A page that outlives a deploy — an installed app resumed
// from the background days later — still names *its* build's chunk hashes, and the
// server no longer has them. The import 404s, Vite fires `vite:preloadError`, and
// the learner used to get "This view hit an error" at the exact moment they went
// looking for their backup.
//
// A reload is the fix: `sw.js` drops the cached shell when a hashed file 404s, so
// the reload lands on the build the server is actually serving. The guard is the
// part worth testing, because the failure mode of a reload-on-error is a loop.
//
// **Time-boxed rather than once-per-tab.** `lib/build.ts` guards its boot reload
// once per tab, which is right for a check that only runs while booting. This one
// can be needed again the next time a long-lived tab outlives a deploy, days later
// in the same `sessionStorage`, so the rule is *not twice within a minute*: a loop
// retries in seconds, a second deploy arrives in hours.

export const CHUNK_RELOAD_KEY = 'lexi.chunkreload.v1';
export const CHUNK_RELOAD_GAP_MS = 60_000;

/** Whether to reload for a chunk that failed to load. Records the attempt when it
 *  says yes, so the caller only has to act on the answer. Never throws. */
export function shouldReloadForChunk(opts: {
  now: number;
  online: boolean;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
}): boolean {
  const { now, online, storage } = opts;
  // Offline, the reload finds the same missing file; it would only cost the
  // learner where they were. The error view says what happened instead.
  if (!online || !storage) return false;
  try {
    const last = Number(storage.getItem(CHUNK_RELOAD_KEY)) || 0;
    if (now - last < CHUNK_RELOAD_GAP_MS) return false;
    storage.setItem(CHUNK_RELOAD_KEY, String(now));
    return true;
  } catch {
    // Private mode can throw on write. A guard that cannot record is a possible
    // loop, so: do nothing.
    return false;
  }
}
