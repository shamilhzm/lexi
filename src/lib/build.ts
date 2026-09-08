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

/** The app as it ran before the 2026-09-05 redesign — flip-card front door, five
 *  tabs, the grammar room — deployed and kept, so "let me see how it used to
 *  work" costs a link rather than a feature flag, two UIs in one bundle, or a
 *  rollback nobody can undo.
 *
 *  **It is its own Vercel project, and that is not incidental.** The first
 *  attempt pointed at the previous *deployment* URL of the main project, on the
 *  reasoning that Vercel deployment URLs are immutable. They are — and they are
 *  also **protected**: once a deployment stops being production, Vercel
 *  Authentication gates it, so the link served a Vercel login page. It answered
 *  `200`, which is how it survived a status-code check and would have shipped.
 *  A separate project's *production* alias is public by the same rule that makes
 *  the main one public, and it needed no change to anyone's security settings.
 *
 *  **The caveat is the origin.** Browser storage belongs to one address, so the
 *  old build opens with no progress in it: it is a place to compare the
 *  *experience*, not a way back to your history. Settings says so beside the
 *  link and points at Backup/Restore for anyone who wants the comparison with
 *  real data. */
export const PREVIOUS_BUILD = {
  url: 'https://lexi-classic.vercel.app',
  /** What that build was, in one line, so the link is not a mystery door. */
  label: 'before the 2026-09-05 redesign — flip-card home, five tabs, grammar drills',
};

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

/** The reload key, exported so a test can name the thing it is asserting about. */
export const AUTORELOAD_KEY = 'lexi.autoreload.v1';

/** **The other half of a cache-first shell.**
 *
 *  `sw.js` serves the shell from Cache Storage and checks for a newer one on the
 *  way out, so nothing waits on the network — and so the launch after a deploy
 *  paints the previous build. This closes that: ask what the server is serving,
 *  and if the sha moved, reload once.
 *
 *  The *stamp*, not an ETag. `version.json` carries the commit the build was cut
 *  from, which is stable in a way an ETag is not — content negotiation can hand
 *  two encodings of identical bytes two different ETags, and a reload driven off
 *  that would loop forever on a phone.
 *
 *  Three guards, and the loop is the reason for all three:
 *
 *    - **Once per tab.** The flag is set *before* the reload, so if the worker's
 *      background revalidate has not landed yet, the second load finds the same
 *      mismatch and stops. Worst case the learner is one launch behind — exactly
 *      where they were before this existed — and the next launch has it.
 *    - **Only while booting.** Past `WINDOW_MS` somebody is *using* the app, and
 *      yanking the page out from under a session to save them one launch is not
 *      a trade anybody asked for. It waits.
 *    - **Never on a failure.** `unknown` — offline, no stamp, a 500 — is not
 *      evidence of anything and must not reload.
 *
 *  Returns what it decided, so the test does not have to observe a side effect.
 *  Progress is untouched by any of this: it lives in IndexedDB. */
export type ReloadDecision = 'reloaded' | 'current' | 'already-tried' | 'in-session' | 'unknown';

export async function reloadIfBuildMoved(opts: {
  now: () => number;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  reload: () => void;
  check?: () => Promise<UpdateState>;
  windowMs?: number;
} ): Promise<ReloadDecision> {
  const { now, storage, reload, check = checkForUpdate, windowMs = 5000 } = opts;
  try {
    if (storage?.getItem(AUTORELOAD_KEY) === '1') return 'already-tried';
    const state = await check();
    if (state.kind === 'current') return 'current';
    if (state.kind !== 'stale') return 'unknown';
    // Checked *after* the network call: the answer can arrive late, and a reload
    // is judged on when it would happen, not on when it was asked for.
    if (now() > windowMs) return 'in-session';
    storage?.setItem(AUTORELOAD_KEY, '1');
    reload();
    return 'reloaded';
  } catch {
    // Private mode throws on `sessionStorage`. A missing guard is a possible
    // loop, so a throw here means: do nothing.
    return 'unknown';
  }
}
