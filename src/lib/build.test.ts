// "Is the app on my phone the latest?" — see lib/build.ts.
//
// The question could not be answered before: an offline-first service worker
// serves the shell from cache, so a fix that landed and a fix that did not looked
// identical. The stamp says what is running and `checkForUpdate` asks the server
// what is deployed; this pins the comparison, and especially the cases where the
// honest answer is "I don't know" rather than a reassuring green tick.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BUILD, buildLabel, checkForUpdate, reloadIfBuildMoved, AUTORELOAD_KEY } from './build.ts';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; vi.unstubAllGlobals(); });

const serve = (body: unknown, ok = true, status = 200) => {
  globalThis.fetch = vi.fn(async () => ({
    ok, status, json: async () => body,
  })) as unknown as typeof fetch;
};

describe('buildLabel', () => {
  it('formats a build time day-first', () => {
    // 08/16 vs 16/08 is exactly the ambiguity a version stamp cannot afford.
    expect(buildLabel('2026-08-16T16:34:55.799Z')).toMatch(/16 Aug 2026/);
  });

  it('says "unknown" rather than rendering an Invalid Date', () => {
    expect(buildLabel('not a date')).toBe('unknown');
  });
});

describe('checkForUpdate', () => {
  it('reports current when the server is serving this build', async () => {
    serve({ sha: BUILD.sha, builtAt: BUILD.builtAt });
    expect(await checkForUpdate()).toEqual({ kind: 'current' });
  });

  it('reports stale, and names the build to expect', async () => {
    serve({ sha: 'abc1234', builtAt: '2026-08-16T18:00:00.000Z' });
    expect(await checkForUpdate()).toEqual({
      kind: 'stale', sha: 'abc1234', builtAt: '2026-08-16T18:00:00.000Z',
    });
  });

  it('bypasses every cache, or it would ask the stale worker what is fresh', async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ sha: BUILD.sha }) }));
    globalThis.fetch = spy as unknown as typeof fetch;
    await checkForUpdate();
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.cache).toBe('no-store');
    expect(url).toMatch(/version\.json\?t=\d+/);   // and a cache-busting query
  });

  it('says it does not know rather than claiming current, when the server errors', async () => {
    serve({}, false, 502);
    const r = await checkForUpdate();
    expect(r.kind).toBe('unknown');
  });

  it('says it does not know when the response carries no version', async () => {
    serve({ nope: true });
    expect((await checkForUpdate()).kind).toBe('unknown');
  });

  it('says it does not know when the fetch throws', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network'); }) as unknown as typeof fetch;
    expect((await checkForUpdate()).kind).toBe('unknown');
  });

  it('names being offline as the reason, rather than a generic failure', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const r = await checkForUpdate();
    expect(r.kind).toBe('unknown');
    expect(r.kind === 'unknown' && r.why).toMatch(/offline/i);
  });
});

// A cache-first shell paints the *previous* build on the launch after a deploy.
// This is what closes that gap, and every test here is really one test: it must
// never be able to reload twice, because a reload loop on a phone is not a bug
// you can ask somebody to work around.
describe('reloadIfBuildMoved', () => {
  const stale = async () => ({ kind: 'stale', sha: 'abc1234', builtAt: '' }) as const;
  const current = async () => ({ kind: 'current' }) as const;
  const unknown = async () => ({ kind: 'unknown', why: 'offline' }) as const;

  function store(seed: Record<string, string> = {}) {
    const m = new Map(Object.entries(seed));
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { m.set(k, v); },
      map: m,
    };
  }

  it('reloads once when the deployed sha has moved', async () => {
    let reloads = 0;
    const storage = store();
    const opts = { now: () => 100, storage, reload: () => { reloads++; }, check: stale };
    expect(await reloadIfBuildMoved(opts)).toBe('reloaded');
    expect(reloads).toBe(1);
    expect(storage.map.get(AUTORELOAD_KEY)).toBe('1');
  });

  // The flag is written *before* the reload for exactly this: if the worker's
  // background revalidate has not landed, the next load serves the same shell
  // and finds the same mismatch. It has to stop there.
  it('does not reload a second time when the shell is still the old one', async () => {
    let reloads = 0;
    const storage = store();
    const opts = { now: () => 100, storage, reload: () => { reloads++; }, check: stale };
    await reloadIfBuildMoved(opts);
    expect(await reloadIfBuildMoved(opts)).toBe('already-tried');
    expect(reloads).toBe(1);
  });

  it('leaves a session alone once the boot window has passed', async () => {
    let reloads = 0;
    expect(await reloadIfBuildMoved({
      now: () => 5001, storage: store(), reload: () => { reloads++; }, check: stale,
    })).toBe('in-session');
    expect(reloads).toBe(0);
  });

  it('does nothing when the build is current', async () => {
    let reloads = 0;
    expect(await reloadIfBuildMoved({
      now: () => 0, storage: store(), reload: () => { reloads++; }, check: current,
    })).toBe('current');
    expect(reloads).toBe(0);
  });

  // Offline, no stamp, a 500 — none of these are evidence that anything moved.
  it('does not reload on an inconclusive answer', async () => {
    let reloads = 0;
    expect(await reloadIfBuildMoved({
      now: () => 0, storage: store(), reload: () => { reloads++; }, check: unknown,
    })).toBe('unknown');
    expect(reloads).toBe(0);
  });

  // Private mode throws on sessionStorage. No guard means a possible loop, so a
  // throw has to mean "do nothing" rather than "carry on without the guard".
  it('refuses to reload when it cannot record that it did', async () => {
    let reloads = 0;
    const hostile = {
      getItem: () => null,
      setItem: () => { throw new DOMException('denied'); },
    };
    expect(await reloadIfBuildMoved({
      now: () => 0, storage: hostile, reload: () => { reloads++; }, check: stale,
    })).toBe('unknown');
    expect(reloads).toBe(0);
  });

  it('survives storage being absent entirely', async () => {
    let reloads = 0;
    expect(await reloadIfBuildMoved({
      now: () => 0, storage: null, reload: () => { reloads++; }, check: stale,
    })).toBe('reloaded');
    expect(reloads).toBe(1);
  });
});
