// Lexi service worker — offline-first, and *nothing waits on the network*.
//
// ## What it was, and what that cost *(rewritten 2026-09-07)*
//
// Navigations were network-first with a cache fallback, and `/data/` was
// network-first with a cache fallback. Both are the textbook answer and both
// have the same flaw: the fallback only fires when `fetch` **rejects**. A dead
// connection rejects fast, so airplane mode was fine. A *slow* one — a train, a
// hotel captive portal, a 3G cell at the edge of a cell — does not reject at
// all; it hangs, and an installed app that has every byte it needs on the device
// sits on a white screen waiting for permission to show them.
//
// Measured on the live build, warm, worker in control: the launch made **one**
// network request that mattered, the navigation, at 8,156 bytes and 59 ms on
// wifi. Fifty-nine milliseconds is not the problem. The problem is that the
// number is unbounded, and it is unbounded on the one screen the learner opens
// several times a day.
//
// So: **everything is served from the cache first, and checked afterwards.**
//
// ## The write, which was the other half
//
// `/data/` also re-`put` every response into Cache Storage on every single load
// — six files, 5.79 MB decoded, of which `detail.json` alone is 3.45 MB. Not
// downloaded: the HTTP cache answered, so the wire cost was zero. But the *copy
// into Cache Storage* happened regardless, every launch, on a phone.
//
// The fix is to write only when the bytes changed, and the server already tells
// us: every asset carries a strong `ETag` and answers a conditional request with
// **304, 0 bytes**. We do not send the conditional ourselves — the HTTP cache is
// already doing that under `max-age=0, must-revalidate`, and adding a second
// `If-None-Match` on top of the browser's own only invites the two to disagree.
// We compare the ETag we got back against the ETag on the copy we are holding,
// and skip the `put` when they match. A warm launch now writes nothing.
//
// ## What this costs, and what pays for it
//
// Cache-first on the shell means the launch *after* a deploy paints the previous
// build. That is the honest trade and it is not left dangling: `main.tsx` asks
// `/version.json` after first paint — a stamp, not an ETag, so no content
// negotiation can make two equal builds look different — and reloads once if the
// sha moved. One-shot, guarded, and bounded: if the background revalidate has
// not landed yet the reload serves the same shell, the guard stops there, and
// the next launch has it. Never a loop.
//
// `CACHE` is deliberately **not** bumped for this change. Bumping is how you
// invalidate content; this is a change of strategy, and the old entries are
// still correct — they carry their ETags, which is all the new code needs. A
// bump here would delete up to 19 MB of lexicon shards a learner has
// accumulated for offline use, to fix nothing.
const CACHE = 'lexi-v6';
const INDEX = './index.html';
const CORE = [
  './', INDEX, './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png',
];

/** What a first launch needs before it can paint, besides the shell's own files. */
const BOOT_DATA = ['./data/cards.json', './data/sectors.json', './data/freq.json'];

/** A file Vite emitted: `name-HASH.ext`, flat in `assets/`. The hash may itself
 *  contain `-` and `_` (`index-C2-rQNTW.js`, `node.browser-DovLY4l_.js`). */
const HASHED = /[\w.-]+-[\w-]{8}\.(?:js|css|woff2?)/g;

const scopeUrl = () => (self.registration && self.registration.scope) || `${self.location.origin}/`;
const isAsset = (url) => new URL(url, scopeUrl()).pathname.includes('/assets/');

/** `src="…"`, `href="…"` and `url(…)` references into `assets/`, resolved. */
function assetRefs(text, base) {
  const out = new Set();
  for (const m of text.matchAll(/(?:src=|href=|url\()["']?([^"')\s>]+)/g)) {
    let u;
    try { u = new URL(m[1], base); } catch { continue; }
    if (u.origin === self.location.origin && isAsset(u.href)) out.add(u.href);
  }
  return [...out];
}

/** The cached copy, or a fresh one put into the cache. Null when the network has
 *  nothing usable — never an SPA fallback page (see `isSpaFallback`). */
async function cacheCopy(cache, url) {
  const hit = await cache.match(url);
  if (hit && !(hit.headers.get('Content-Type') || '').includes('text/html')) return hit;
  let res;
  try { res = await fetch(url); } catch { return null; }
  if (!res.ok || res.type !== 'basic' || (res.headers.get('Content-Type') || '').includes('text/html')) return null;
  await cache.put(url, res.clone());
  return res;
}

/** **Make the build a shell names launchable, and forget every other build.**
 *
 *  Two gaps closed here, both found in the panel review (2026-09-25).
 *
 *  *The first offline launch.* The worker registers on `load`, after the first
 *  visit has already fetched its bundle, stylesheet and lexicon outside its
 *  control — so Cache Storage held the shell and the icons and nothing the shell
 *  points at. Install to the Home Screen, open it on the U-Bahn, and the cached
 *  shell asked for a bundle nobody had kept: a splash that never ends. The boot
 *  set (the shell's entry script and stylesheet, the fonts that stylesheet names)
 *  is now fetched and kept whenever a shell is adopted.
 *
 *  *A cache that only grows.* `CACHE` is never bumped (see above), and hashed files
 *  are cache-first with no expiry, so every build a learner ever launched stayed —
 *  roughly 0.9 MB of script and style each. On a phone short of space the biggest
 *  origin is the one the OS reclaims, and this origin holds the only copy of a
 *  learner's history. So everything under `assets/` that the new build does not
 *  name — directly, or from its entry script and stylesheet — is deleted.
 *
 *  A lazy chunk of the *outgoing* build that is still running can be pruned out
 *  from under it. It then misses, the server 404s, `asset()` drops the shell, and
 *  `main.tsx`'s one-shot `vite:preloadError` reload lands on the new build — the
 *  same place the version check would have taken it. */
async function adoptShell(cache, html) {
  const shellUrl = new URL(INDEX, scopeUrl()).href;
  const keep = new Set();
  for (const url of assetRefs(html, shellUrl)) {
    keep.add(url);
    const res = await cacheCopy(cache, url);
    if (!res) continue;
    const text = await res.clone().text();
    if (url.endsWith('.css')) {
      for (const font of assetRefs(text, url)) { keep.add(font); await cacheCopy(cache, font); }
    }
    // Chunks this build may ask for later: kept if a copy happens to be cached,
    // never fetched ahead — a learner who never opens Settings never pays for it.
    for (const m of text.matchAll(HASHED)) keep.add(new URL(m[0], url).href);
  }
  for (const req of await cache.keys()) {
    const url = typeof req === 'string' ? req : req.url;
    if (isAsset(url) && !keep.has(url)) await cache.delete(req);
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // Best effort, deliberately: an install must never fail because an extra could
    // not be fetched. Whatever is missing is filled in by the next launch.
    try {
      const shell = await c.match(INDEX);
      if (shell) await adoptShell(c, await shell.clone().text());
      await Promise.all(BOOT_DATA.map((p) => cacheCopy(c, new URL(p, scopeUrl()).href)));
    } catch { /* see above */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** An SPA server answers *everything* with `index.html` and a 200 — that is how
 *  `/#/session` works — so a request for an asset that is no longer on the server
 *  comes back as a successful HTML page rather than as a 404.
 *
 *  Caching that is how the app bricked itself. Found on a rebuilt `dist/`: Cache
 *  Storage held `<!doctype html>` under `/assets/index-D1_oJJIa.js`, status 200,
 *  `content-type: text/html`, and the module loader refused it on MIME grounds
 *  every single launch. Nothing could recover, because the code that recovers is
 *  the code that would not load.
 *
 *  It was cacheable before this change too — `res.ok && res.type === 'basic'` is
 *  true of an SPA fallback — but the shell used to be network-first, so the next
 *  launch fetched an `index.html` naming *different* hashes and walked around the
 *  poisoned entry. Cache-first on the shell removed that accident, so the check
 *  has to be deliberate. */
function isSpaFallback(req, res) {
  if (req.destination === '' || req.destination === 'document') return false;
  return (res.headers.get('Content-Type') || '').includes('text/html');
}

/** Fetch, and write to the cache **only if the bytes actually changed**.
 *
 *  `key` is separate from `req` because a navigation to `/#/session` and one to
 *  `/` are the same document, and the SPA has exactly one shell — they share the
 *  `INDEX` entry rather than accumulating one per route.
 *
 *  Returns `null` when the network is unreachable, which is the caller's signal
 *  to stay on what it has. Any other failure (a 500, an opaque response) returns
 *  the response without caching it: serving a cached copy is right, and
 *  overwriting a good copy with an error page is not. */
async function revalidate(cache, req, key, hit, event) {
  let res;
  try { res = await fetch(req); } catch { return null; }
  if (!res.ok || res.type !== 'basic') return res;
  const before = hit && hit.headers.get('ETag');
  const after = res.headers.get('ETag');
  // No ETag on either side means we cannot tell, so we write — a redundant copy
  // is a wasted millisecond and a missed one is a learner stuck on old data.
  if (!before || !after || before !== after) {
    await cache.put(key, res.clone());
    // A new shell is a new build: keep what it needs, drop what it doesn't. Off
    // the response path — a navigation must never wait on 800 KB of script.
    if (key === INDEX && event) {
      const copy = res.clone();
      event.waitUntil(copy.text().then((html) => adoptShell(cache, html)).catch(() => {}));
    }
  }
  return res;
}

/** Answer from the cache now; check for a newer copy on the way out.
 *
 *  `waitUntil`, not a floating promise: the revalidation has to be allowed to
 *  finish after the response has been handed over, and a worker that is not told
 *  about it may be killed mid-write. */
async function staleWhileRevalidate(event, req, key) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key);
  if (hit) {
    event.waitUntil(revalidate(cache, req, key, hit, event));
    return hit;
  }
  return (await revalidate(cache, req, key, null, event)) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // The build stamp is the one thing that must never come from a cache — it is
  // the question "am I stale?", and a cached answer to that is always "no".
  // `main.tsx` asks with `cache: 'no-store'` and a buster; this makes it true
  // even if some future caller forgets.
  if (new URL(req.url).pathname.endsWith('/version.json')) return;

  // A navigation to a document that is *not* the app — `legal.html`, the one
  // static page — is that document, cached under its own URL. Before this
  // branch existed every navigation was answered with the shell, and the
  // revalidation then fetched `/legal.html` and stored it *as* `INDEX`: the page
  // could never be opened from an installed app, and opening it once replaced
  // the app with it on the next launch (panel review, 2026-09-25).
  if (req.mode === 'navigate' && !isShellPath(new URL(req.url).pathname)) {
    e.respondWith(staleWhileRevalidate(e, req, req));
    return;
  }

  // SPA navigations: the shell, instantly, then checked.
  if (req.mode === 'navigate') {
    e.respondWith(
      staleWhileRevalidate(e, req, INDEX)
        .catch(() => caches.match(INDEX).then((r) => r || caches.match('./'))),
    );
    return;
  }

  // Lexicon data: same rule. It used to be network-first "so content updates
  // apply immediately", which was a real concern answered in the wrong place —
  // the data changes when the *build* changes, and the build stamp already
  // triggers a reload. Waiting on 5.79 MB of already-present JSON to be
  // re-authorised on every launch was the price of a check that had a cheaper
  // version available all along.
  if (new URL(req.url).pathname.includes('/data/')) {
    e.respondWith(staleWhileRevalidate(e, req, req));
    return;
  }

  // Hashed assets: cache-first with no revalidation at all, because the
  // filename *is* the version. Nothing to check.
  e.respondWith(asset(e, req));
});

/** The SPA has one document; its routes live in the hash, so every path that
 *  names the app is the scope root or `index.html`. Anything else ending in
 *  `.html` is a separate page. */
function isShellPath(pathname) {
  return !/\.html$/.test(pathname) || /\/index\.html$/.test(pathname);
}

async function asset(event, req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit && !isSpaFallback(req, hit)) return hit;

  // Either nothing was cached, or what was cached is the poison above. Either
  // way the entry is worthless: drop it, and drop the shell that named it. The
  // shell is the reason a stale hash was asked for at all, so leaving it would
  // ask for the same missing file on the next launch and every launch after.
  if (hit) {
    await cache.delete(req);
    await cache.delete(INDEX);
  }

  let res;
  try { res = await fetch(req); } catch { return hit || Response.error(); }
  if (isSpaFallback(req, res)) {
    // The server does not have this file. Say so honestly rather than handing a
    // module loader a page — and make sure the next navigation goes and gets a
    // shell that names files which exist.
    await cache.delete(INDEX);
    return new Response('', { status: 404, statusText: 'Not Found' });
  }
  // The same, from a host that answers a missing file with a real 404 — which is
  // what Vercel does. A page that outlived a deploy asks for a chunk of its own
  // build; the cached shell still names that build, so without this the
  // `vite:preloadError` reload in `main.tsx` would land on the same shell and fail
  // the same way. Hashed files only: a stray 404 for some other path (a browser
  // probing `/favicon.ico`) must not cost every launch its cached shell.
  if (res.status === 404 && isAsset(req.url)) {
    await cache.delete(INDEX);
    return res;
  }
  if (res.ok && res.type === 'basic') event.waitUntil(cache.put(req, res.clone()));
  return res;
}
