// Which build is actually running, and whether it is the one that is deployed.
//
// A local-first app with an offline-first service worker has a real problem here:
// the shell is served from cache, so "is the phone running the fix I just shipped?"
// could only be answered by reloading and guessing. That is a bad position to test
// from — a fix that did land and a fix that did not look identical.
//
// Two halves, and both are needed:
//
//   * **What am I running?** `BUILD` is stamped into the bundle at build time by
//     `vite.config.ts` (the commit, and when it was built).
//   * **What is deployed?** `version.json` is emitted beside the bundle with the
//     same stamp, and fetched with `cache: 'no-store'` so neither the HTTP cache
//     nor the service worker can answer for it.
//
// Comparing the two is the only honest way to say "you are up to date", and it is
// why the stamp is emitted as a file rather than committed as a constant.

/** The build this code was compiled into. */
export const BUILD = {
  sha: typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'dev',
  builtAt: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : new Date().toISOString(),
};

/** Human form: "16 Aug 2026, 18:31". Locale-independent order (day first) because
 *  the app's voice is German-facing and 08/16 vs 16/08 is exactly the ambiguity a
 *  version stamp cannot afford. */
export function buildLabel(iso: string = BUILD.builtAt): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export type UpdateState =
  | { kind: 'current' }
  | { kind: 'stale'; sha: string; builtAt: string }
  /** Could not reach the server — offline, or the deploy has no stamp yet. */
  | { kind: 'unknown'; why: string };

/** Ask the server what it is serving. Never throws: this is a diagnostic, and a
 *  diagnostic that can break the settings screen is worse than no diagnostic. */
export async function checkForUpdate(): Promise<UpdateState> {
  if (typeof fetch === 'undefined') return { kind: 'unknown', why: 'not supported here' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { kind: 'unknown', why: 'You’re offline — reconnect to check.' };
  }
  try {
    // `no-store` twice over: the header for the HTTP cache, and a cache-busting
    // query so a service worker that ignores it still cannot answer from cache.
    const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { kind: 'unknown', why: `The server didn’t answer (${res.status}).` };
    const live = await res.json() as { sha?: string; builtAt?: string };
    if (!live?.sha) return { kind: 'unknown', why: 'The server didn’t report a version.' };
    if (live.sha === BUILD.sha) return { kind: 'current' };
    return { kind: 'stale', sha: live.sha, builtAt: live.builtAt ?? '' };
  } catch {
    return { kind: 'unknown', why: 'Couldn’t reach the server.' };
  }
}

/** Take the newest build: drop every cache, drop the service worker, reload.
 *
 *  A plain reload is not enough — the worker serves the shell and will hand back
 *  the same one. Unregistering leaves the next load to install a fresh worker.
 *  Progress is *not* saved here and does not need to be: everything lives in
 *  IndexedDB, which none of this touches. */
export async function updateNow(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* a failed clear must still fall through to the reload */ }
  location.reload();
}
