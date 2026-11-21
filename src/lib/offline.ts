// Everything Lexi teaches, on this device, in one deliberate step.
//
// The service worker keeps what a learner has *visited*: the boot set on install,
// then each detail level, lazy screen and dictionary shard the first time it is
// asked for. That is the right default — nobody pays for a screen they never open
// — and it is the wrong answer to "I am about to get on a plane". A learner who
// placed at A2 and went offline had no examples for B1, no text scanner if they
// had never opened it, and a dictionary holding only the pages they had looked
// up (*added 2026-11-10*).
//
// So this fetches the rest on request. It does not cache anything itself: every
// URL goes through `fetch`, the worker's cache-first handler stores the answer,
// and one copy of the caching rules stays in `public/sw.js`. Without a worker
// (dev, or a browser that refused it) the fetches still succeed and simply are not
// kept — which is why the result is read back from `caches`, not from the fetches.
//
// Two sizes, because they are different promises:
//
//   the words        every card's examples and definitions, the inflection table,
//                    the pictograms, the screens that load on demand
//   the dictionary   the 93,046-headword lookup layer, 232 shards
//
// Measured on the 2026-11-14 build, gzipped as a host serves them: **1.43 MB** for
// the words, **4.40 MB** for the dictionary (19.8 MB once stored). The first labels
// on the buttons said 2 and 29, which were a guess and a `du`.
//
// The voice is not here: it has its own switch in Settings and its own 75 MB.

export interface OfflineOptions { dictionary: boolean }
export interface OfflineProgress { done: number; total: number }
export interface OfflineResult {
  fetched: number;
  failed: number;
  /** How many of the data files are in Cache Storage afterwards — the claim the
   *  screen makes. `null` where the browser has no Cache Storage to ask. */
  kept: number | null;
  /** The data files asked for, so `kept` has a denominator. */
  wanted: number;
  persisted: boolean | null;
}

const DETAIL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const PICTO = ['index.json', 'A1.json', 'A2.json'] as const;
const KEY = 'lexi.offline.v1';

/** The data URLs a complete offline copy needs beyond the boot set. Pure, so the
 *  list can be tested against what is actually in `public/data/`. */
export function offlineUrls(base: string, opts: OfflineOptions & { shards?: number }): string[] {
  const d = `${base}data/`;
  const out = [
    ...DETAIL_LEVELS.map((l) => `${d}detail/${l}.json`),
    `${d}inflections.json`,
    `${d}provenance.json`,
    `${d}transfer.json`,
    `${d}audio.json`,
    ...PICTO.map((f) => `${d}picto/${f}`),
    `${d}lex/index.json`,
  ];
  if (opts.dictionary) for (let i = 0; i < (opts.shards ?? 0); i++) out.push(`${d}lex/${i}.json`);
  return out;
}

/** The screens that are separate chunks. Importing one is how its file is
 *  fetched (and so cached); the modules themselves are discarded. */
const lazyScreens = (): Promise<unknown>[] => [
  import('../views/TextGaps.tsx'),
  import('../components/reader/ArticleLayer.tsx'),
  import('./ai.ts'),
  // The course: Themen draws its band from this chunk, and a phone that went
  // offline after a deploy could not draw the tab at all (2026-11-20).
  import('../views/Kurs.tsx'),
];

export interface OfflineRecord { at: string; dictionary: boolean; sha: string }

/** What the last completed download covered, or null. Device state, not learner
 *  state: deliberately absent from the backup, because a restore onto another
 *  phone has not downloaded anything. */
export function offlineRecord(): OfflineRecord | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || 'null') as OfflineRecord | null;
    return r && typeof r.at === 'string' ? r : null;
  } catch { return null; }
}

/** Fetch everything, six at a time. Never throws: a failed file is counted and
 *  the rest carry on, because 231 of 232 shards is worth having on a bad
 *  connection. Only a run with no failures is recorded as complete. */
export async function downloadOffline(
  opts: OfflineOptions,
  sha: string,
  onProgress: (p: OfflineProgress) => void = () => {},
  signal?: AbortSignal,
): Promise<OfflineResult> {
  const base = import.meta.env.BASE_URL || '/';
  let shards = 0;
  if (opts.dictionary) {
    try {
      const m = await fetch(`${base}data/lex/index.json`).then((r) => (r.ok ? r.json() : null)) as { bounds?: unknown[] } | null;
      shards = m?.bounds?.length ?? 0;
    } catch { /* counted as a failure below, when index.json is fetched again */ }
  }
  const urls = offlineUrls(base, { ...opts, shards });
  const screens = lazyScreens();
  const total = urls.length + screens.length;
  let done = 0, failed = 0;
  const tick = () => onProgress({ done: ++done, total });

  await Promise.all(screens.map((p) => p.then(tick, () => { failed++; tick(); })));

  let next = 0;
  const worker = async () => {
    while (next < urls.length && !signal?.aborted) {
      const url = urls[next++];
      try {
        const r = await fetch(url, { signal });
        if (!r.ok) failed++;
        else await r.arrayBuffer();     // drain it: a body left unread may never be stored
      } catch { failed++; }
      tick();
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  // Ask the browser not to evict this origin. It already holds the learner's
  // history; now it also holds the thing that makes that history usable offline.
  let persisted: boolean | null = null;
  try { persisted = (await navigator.storage?.persist?.()) ?? null; } catch { /* unsupported */ }

  // **Report what is on the device, not what was downloaded.** With no worker in
  // control — a dev server, a private window, a browser that refused it — every
  // fetch above succeeds and nothing is kept, and "Words on this device" would
  // be false in exactly the case the learner most needs it to be true.
  let kept: number | null = null;
  if (typeof caches !== 'undefined') {
    try {
      const hits = await Promise.all(urls.map((u) => caches.match(u).then((r) => !!r, () => false)));
      kept = hits.filter(Boolean).length;
    } catch { kept = null; }
  }

  if (!failed && !signal?.aborted && kept === urls.length) {
    try { localStorage.setItem(KEY, JSON.stringify({ at: new Date().toISOString(), dictionary: opts.dictionary, sha })); }
    catch { /* a full or blocked localStorage loses the label, not the download */ }
  }
  return { fetched: total - failed, failed, kept, wanted: urls.length, persisted };
}
