// A missed card, or a first sight, comes back once later in the same session
// (`withRetry`, session.ts) — the learning step FSRS always previewed on the
// button and the session never served. 2026-09-25, from the panel review.
import { describe, it, expect, vi } from 'vitest';
import type { Word } from './types.ts';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
  idbReady: async () => true,
}));

async function fresh() {
  vi.resetModules();
  localStorage.clear();
  const data = await import('./data/index.ts');
  const session = await import('./session.ts');
  const srs = await import('./srs.ts');
  return { data, session, srs };
}

const word = (id: string): Word => ({
  id, term: id, en: id, pos: 'noun', level: 'A1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'S', kind: 'word',
});

describe('once more, from memory', () => {
  const flips = async (n: number) => {
    const { data, session, srs } = await fresh();
    const words = Array.from({ length: n }, (_, i) => word(`w${i}`));
    data.registerWords(words);
    const queue: import('./session.ts').SessionItem[] =
      words.map((w) => ({ type: 'flip' as const, word: w, srsId: w.id, reason: { kind: 'fresh' as const } }));
    return { session, srs, queue };
  };

  it('brings a first sight back once, RETRY_GAP cards later', async () => {
    const { session, srs, queue } = await flips(12);
    const r = session.withRetry(queue, 0, srs.Rating.Good, true)!;
    expect(r.at).toBe(1 + session.RETRY_GAP);
    expect(r.items).toHaveLength(13);
    expect(r.items[r.at]).toMatchObject({ srsId: 'w0', reason: { kind: 'retry', missed: false } });
  });

  it('brings a miss back even when it was not new, and says so', async () => {
    const { session, srs, queue } = await flips(3);
    const r = session.withRetry(queue, 1, srs.Rating.Again, false)!;
    expect(r.at).toBe(3);                                // near the end: it goes last
    expect(r.items[3].reason).toEqual({ kind: 'retry', missed: true });
  });

  it('asks nothing back of a known card, an Easy first sight, or a second showing', async () => {
    const { session, srs, queue } = await flips(10);
    expect(session.withRetry(queue, 0, srs.Rating.Good, false)).toBeNull();
    expect(session.withRetry(queue, 0, srs.Rating.Easy, true)).toBeNull();
    const once = session.withRetry(queue, 0, srs.Rating.Again, false)!;
    expect(session.withRetry(once.items, once.at, srs.Rating.Again, false)).toBeNull();
  });

  it('stops at MAX_RETRIES in one session', async () => {
    const { session, srs, queue } = await flips(40);
    let q = queue;
    let added = 0;
    for (let i = 0; i < 30; i++) {
      const r = session.withRetry(q, i, srs.Rating.Again, false);
      if (r) { q = r.items; added++; }
    }
    expect(added).toBe(session.MAX_RETRIES);
  });

  it('survives an interrupted session', async () => {
    const { session, srs, queue } = await flips(8);
    const r = session.withRetry(queue, 0, srs.Rating.Again, false)!;
    const target = { kind: 'custom' as const, name: 'Today’s session', ids: queue.map((q) => q.srsId) };
    session.saveSession(target, r.items, 2);
    const back = session.loadSession(target)!;
    expect(back.items[r.at].reason).toEqual({ kind: 'retry', missed: true });
  });
});
