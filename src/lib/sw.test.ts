// The service worker, driven rather than read.
//
// `public/sw.js` is not imported by the app, so nothing type-checks it and
// nothing exercised it — it was four years of "looks right". It is also the one
// file in the repo that decides whether an installed app opens, so it gets the
// same treatment as the drills: a real scope, a real cache, a controlled
// `fetch`, and assertions about what happens rather than about what it says.
//
// The two properties under test are the two claims in BACKLOG B4:
//
//   1. **Nothing waits on the network.** The old handler was network-first with
//      a cache fallback, which only fires when `fetch` *rejects*. A slow link
//      does not reject — it hangs — so an app holding every byte it needs sat on
//      a white screen. The last test here runs the old handler beside the new
//      one against a `fetch` that never settles, because a guard nobody has seen
//      fail is not a guard.
//   2. **A warm launch writes nothing.** `/data/` re-`put` 5.79 MB into Cache
//      Storage on every load — zero wire bytes, since the HTTP cache answered,
//      but the copy happened anyway. The ETag says when a write is pointless.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('public/sw.js', 'utf8');

/** Cache Storage, small enough to assert against. */
class FakeCache {
  store = new Map<string, Response>();
  puts: string[] = [];
  key(k: Request | string) { return typeof k === 'string' ? k : k.url; }
  async match(k: Request | string) { return this.store.get(this.key(k)); }
  async put(k: Request | string, v: Response) {
    this.puts.push(this.key(k));
    this.store.set(this.key(k), v);
  }
  async keys() { return [...this.store.keys()]; }
}

type Handler = (e: FetchEventLike) => void;
interface FetchEventLike {
  request: Request;
  respondWith(p: Response | Promise<Response>): void;
  waitUntil(p: Promise<unknown>): void;
}

const ORIGIN = 'https://lexi.test';

function load(fetchImpl: (req: Request) => Promise<Response>) {
  const cache = new FakeCache();
  const handlers: Record<string, Handler[]> = {};
  const pending: Promise<unknown>[] = [];
  const fetches: string[] = [];

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t: string, h: Handler) => { (handlers[t] ??= []).push(h); },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  const caches = {
    open: async () => cache,
    match: async (k: Request | string) => cache.match(k),
    keys: async () => ['lexi-v6'],
    delete: async () => true,
  };
  const wrappedFetch = (req: Request | string) => {
    const r = typeof req === 'string' ? new Request(req) : req;
    fetches.push(r.url);
    return fetchImpl(r);
  };

  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', SRC)(self, caches, wrappedFetch);

  /** Dispatch a fetch event and return whatever the worker answers with. */
  function request(url: string, init: { mode?: string } = {}) {
    const req = new Request(new URL(url, ORIGIN), { method: 'GET' });
    // `mode: 'navigate'` cannot be set on a constructed Request, so it is
    // stamped on — the worker only ever reads it.
    Object.defineProperty(req, 'mode', { value: init.mode ?? 'no-cors' });
    let answer: Promise<Response> | undefined;
    const event: FetchEventLike = {
      request: req,
      respondWith: (p) => { answer = Promise.resolve(p); },
      waitUntil: (p) => { pending.push(p); },
    };
    for (const h of handlers.fetch ?? []) h(event);
    return answer;
  }

  /** Let every `waitUntil` finish — the background revalidation. */
  const settle = async () => { await Promise.all(pending.splice(0)); };

  return { cache, request, settle, fetches };
}

const body = (etag: string, text = 'x') =>
  new Response(text, { status: 200, headers: { ETag: etag } });

// `type` is read-only on a real Response and defaults to 'default' off the
// constructor; the worker refuses to cache anything that is not 'basic'.
function basic(res: Response) {
  Object.defineProperty(res, 'type', { value: 'basic' });
  return res;
}

describe('a warm launch writes nothing', () => {
  let sw: ReturnType<typeof load>;
  beforeEach(() => {
    sw = load(async () => basic(body('"same"')));
    sw.cache.store.set(`${ORIGIN}/data/detail/A1.json`, basic(body('"same"')));
    sw.cache.puts.length = 0;
  });

  it('serves the cached copy without waiting for the check', async () => {
    const res = await sw.request('/data/detail/A1.json');
    expect(await res!.text()).toBe('x');
    // Answered before the revalidation has even been allowed to run.
    expect(sw.cache.puts).toEqual([]);
  });

  it('skips the write when the ETag is unchanged', async () => {
    await sw.request('/data/detail/A1.json');
    await sw.settle();
    expect(sw.fetches).toEqual([`${ORIGIN}/data/detail/A1.json`]);
    expect(sw.cache.puts).toEqual([]);
  });

  it('writes exactly once when the ETag moves', async () => {
    const moved = load(async () => basic(body('"new"', 'fresh')));
    moved.cache.store.set(`${ORIGIN}/data/detail/A1.json`, basic(body('"old"')));
    moved.cache.puts.length = 0;
    await moved.request('/data/detail/A1.json');
    await moved.settle();
    expect(moved.cache.puts).toEqual([`${ORIGIN}/data/detail/A1.json`]);
    expect(await (await moved.cache.match(`${ORIGIN}/data/detail/A1.json`))!.text()).toBe('fresh');
  });

  it('never overwrites a good copy with a server error', async () => {
    const broken = load(async () => basic(new Response('nope', { status: 503 })));
    broken.cache.store.set(`${ORIGIN}/data/detail/A1.json`, basic(body('"good"', 'keep')));
    broken.cache.puts.length = 0;
    await broken.request('/data/detail/A1.json');
    await broken.settle();
    expect(broken.cache.puts).toEqual([]);
    expect(await (await broken.cache.match(`${ORIGIN}/data/detail/A1.json`))!.text()).toBe('keep');
  });
});

describe('the shell', () => {
  it('answers every route from one entry', async () => {
    const sw = load(async () => basic(body('"same"')));
    sw.cache.store.set('./index.html', basic(body('"same"', 'shell')));
    const res = await sw.request('/', { mode: 'navigate' });
    expect(await res!.text()).toBe('shell');
    // Not one cache entry per route: the SPA has exactly one document.
    await sw.settle();
    expect(await sw.cache.keys()).toEqual(['./index.html']);
  });

  it('leaves the build stamp alone so it can never be answered stale', async () => {
    const sw = load(async () => basic(body('"same"')));
    expect(sw.request('/version.json')).toBeUndefined();
  });

  it('does not revalidate a hashed asset it already holds', async () => {
    const sw = load(async () => basic(body('"same"')));
    sw.cache.store.set(`${ORIGIN}/assets/index-abc123.js`, basic(body('"same"', 'js')));
    const res = await sw.request('/assets/index-abc123.js');
    expect(await res!.text()).toBe('js');
    await sw.settle();
    // The filename is the version. There is nothing to check.
    expect(sw.fetches).toEqual([]);
  });

  it('ignores cross-origin requests entirely', async () => {
    const sw = load(async () => basic(body('"same"')));
    expect(sw.request('https://cdn.example.com/voice.mp3')).toBeUndefined();
  });
});

// The property the rewrite exists for, proved by running the thing it replaced.
describe('nothing waits on the network', () => {
  /** A `fetch` that neither resolves nor rejects — a slow link, not a dead one. */
  const hangs = () => new Promise<Response>(() => {});

  /** Did `p` settle within a few microtasks? */
  async function settledFast(p: Promise<unknown> | undefined) {
    if (!p) return false;
    let done = false;
    void p.then(() => { done = true; });
    for (let i = 0; i < 20; i++) await Promise.resolve();
    return done;
  }

  it('serves the shell while the network hangs', async () => {
    const sw = load(hangs);
    sw.cache.store.set('./index.html', basic(body('"e"', 'shell')));
    expect(await settledFast(sw.request('/', { mode: 'navigate' }))).toBe(true);
  });

  it('serves the lexicon while the network hangs', async () => {
    const sw = load(hangs);
    sw.cache.store.set(`${ORIGIN}/data/cards.json`, basic(body('"e"', 'cards')));
    expect(await settledFast(sw.request('/data/cards.json'))).toBe(true);
  });

  // The defect, injected. This is the handler that shipped, and it fails the two
  // tests above — the fallback is on `.catch`, and a hang is not a rejection.
  it('and the strategy it replaced does not', async () => {
    const cache = new Map([['./index.html', basic(body('"e"', 'shell'))]]);
    const old = (): Promise<Response> =>
      hangs().catch(() => cache.get('./index.html')!);
    expect(await settledFast(old())).toBe(false);
  });
});
