// `?ref=` — which post a stranger came from, known only to the host's log.
//
// ## The whole mechanism is that this file does almost nothing *(2026-09-25)*
//
// Lexi has no telemetry and will not have any (VISION §3), so "did the Reddit
// post work?" has one honest answer: the host already logs the request for the
// page, and a link like `lexi…/?ref=r-german` makes that request countable per
// channel. That is aggregate, it exists whether or not Lexi reads it, and it
// needs no code in the app at all.
//
// What the app *does* owe is to keep the tag from travelling any further:
//
//   * **Never stored.** Not in localStorage, not in IndexedDB, not in a backup.
//   * **Never sent.** No fetch carries it; nothing reads it but this function.
//   * **Removed from the address bar** on arrival, with `replaceState`, so it
//     cannot ride along when the learner bookmarks the page, installs it to the
//     home screen or shares the link — which would count one post's traffic under
//     another channel and, worse, turn a campaign tag into something that follows
//     a person around.
//
// Only `ref` is removed; every other parameter (`?seed=` in development, the
// hash route) is left exactly as it arrived.

/** The same URL without its `ref` parameter, or `null` if it had none. Pure, so
 *  the rule is testable without a window. */
export function withoutRef(href: string): string | null {
  let url: URL;
  try { url = new URL(href); } catch { return null; }
  if (!url.searchParams.has('ref')) return null;
  url.searchParams.delete('ref');
  return url.toString();
}

/** Drop `?ref=` from the address bar. Called once at boot, before anything else
 *  reads `location`. Replaces rather than pushes, so Back does not return to the
 *  tagged URL. A browser that refuses `replaceState` keeps the tag visible, which
 *  costs nothing: it is still stored and sent nowhere. */
export function dropRefParam(): void {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const clean = withoutRef(location.href);
  if (!clean) return;
  try { history.replaceState(history.state, '', clean); } catch { /* sandboxed frame */ }
}
