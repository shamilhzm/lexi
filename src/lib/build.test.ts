// "Is the app on my phone the latest?" — see lib/build.ts.
//
// The question could not be answered before: an offline-first service worker
// serves the shell from cache, so a fix that landed and a fix that did not looked
// identical. The stamp says what is running and `checkForUpdate` asks the server
// what is deployed; this pins the comparison, and especially the cases where the
// honest answer is "I don't know" rather than a reassuring green tick.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BUILD, buildLabel, checkForUpdate } from './build.ts';

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
