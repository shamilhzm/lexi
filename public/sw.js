// Lexi service worker — offline-first. Precaches the shell; caches hashed assets
// (cache-first, safe because filenames are content-hashed) and the lexicon JSON
// (network-first, so data updates are picked up without a cache bump). Bump
// CACHE to invalidate everything.
const CACHE = 'lexi-v6';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // SPA navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))));
    return;
  }

  // Lexicon data: network-first so content updates apply immediately; fall back
  // to cache when offline. (Prevents a stale cached lexicon from sticking.)
  if (new URL(req.url).pathname.includes('/data/')) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req)),
    );
    return;
  }

  // Hashed assets + shell: cache-first, then network (and cache the result).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
    ),
  );
});
