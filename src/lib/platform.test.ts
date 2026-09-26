import { describe, it, expect, beforeEach, vi } from 'vitest';

// The store switch has two inputs — a build flag and, for a TWA, the referrer of the
// first navigation — and one rule: a store copy carries no stories and no support
// link until `docs/STORES.md`'s conditions are met. The web copy must never lose them.

describe('platform — store copies', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    // Node's own Web Storage depends on the Node version CI runs; a Map is enough.
    const m = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { m.set(k, v); },
    });
  });

  it('recognises only an Android app referrer as a TWA', async () => {
    const { isTwaReferrer } = await import('./platform.ts');
    expect(isTwaReferrer('android-app://app.lexi.twa/')).toBe(true);
    expect(isTwaReferrer('')).toBe(false);
    expect(isTwaReferrer('https://www.google.com/')).toBe(false);
    expect(isTwaReferrer('https://example.test/?r=android-app://x')).toBe(false);
  });

  it('a web copy keeps stories and the support link', async () => {
    vi.stubGlobal('document', { referrer: 'https://www.reddit.com/' });
    const p = await import('./platform.ts');
    expect(p.isStoreCopy()).toBe(false);
    expect(p.storiesAvailable()).toBe(true);
    expect(p.supportLinkShown()).toBe(true);
  });

  it('a bundled store build turns both off', async () => {
    vi.stubEnv('VITE_STORE_BUILD', '1');
    const p = await import('./platform.ts');
    expect(p.isStoreCopy()).toBe(true);
    expect(p.storiesAvailable()).toBe(false);
    expect(p.supportLinkShown()).toBe(false);
  });

  it('a TWA launch turns both off, and stays off after the referrer is gone', async () => {
    vi.stubGlobal('document', { referrer: 'android-app://app.lexi.twa/' });
    const p = await import('./platform.ts');
    expect(p.storiesAvailable()).toBe(false);
    // A reload inside the TWA (or the build auto-reload) can arrive with no referrer.
    vi.stubGlobal('document', { referrer: '' });
    expect(p.storiesAvailable()).toBe(false);
    expect(p.supportLinkShown()).toBe(false);
  });
});
