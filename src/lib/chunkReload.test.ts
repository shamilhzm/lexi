// The reload after a chunk fails to load. What matters is that it can never loop.
import { describe, it, expect } from 'vitest';
import { shouldReloadForChunk, CHUNK_RELOAD_KEY, CHUNK_RELOAD_GAP_MS } from './chunkReload.ts';

function mem(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
}

describe('shouldReloadForChunk', () => {
  it('reloads once for a chunk that will not load', () => {
    const s = mem();
    expect(shouldReloadForChunk({ now: 1_000_000, online: true, storage: s })).toBe(true);
    expect(s.getItem(CHUNK_RELOAD_KEY)).toBe('1000000');
  });

  it('never twice within the gap — that is a loop, not a deploy', () => {
    const s = mem();
    shouldReloadForChunk({ now: 1_000_000, online: true, storage: s });
    expect(shouldReloadForChunk({ now: 1_000_000 + 5_000, online: true, storage: s })).toBe(false);
  });

  it('again after the gap — a long-lived tab can outlive a second deploy', () => {
    const s = mem();
    shouldReloadForChunk({ now: 1_000_000, online: true, storage: s });
    expect(shouldReloadForChunk({ now: 1_000_000 + CHUNK_RELOAD_GAP_MS + 1, online: true, storage: s })).toBe(true);
  });

  it('not offline: the reload would find the same missing file', () => {
    expect(shouldReloadForChunk({ now: 1, online: false, storage: mem() })).toBe(false);
  });

  it('not when the attempt cannot be recorded', () => {
    const throws = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(shouldReloadForChunk({ now: 1_000_000, online: true, storage: throws })).toBe(false);
    expect(shouldReloadForChunk({ now: 1_000_000, online: true, storage: null })).toBe(false);
  });
});
