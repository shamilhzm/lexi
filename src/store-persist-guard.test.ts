// The write guard in store.ts. A local-first app holds the only copy of a
// learner's history, so each of these is a path that used to replace a real card
// map with a shorter one — found by reading the code, never by a report, because
// nobody reports a loss they cannot see.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const CARDS = 'lexi.cards.v1';
const card = (reps: number) => ({
  due: new Date(Date.now() + 86_400_000).toISOString(), reps, lapses: 0, state: 2,
  stability: 9, difficulty: 5, elapsed_days: 1, scheduled_days: 3, last_review: new Date().toISOString(),
});

let stored: Record<string, unknown>;
let writes: string[];

async function boot(idbOk = true) {
  vi.resetModules();
  vi.doMock('./lib/idb.ts', () => ({
    idbGet: async (key: string) => (idbOk ? stored[key] : undefined),
    idbSet: async (key: string, value: unknown) => { writes.push(key); stored[key] = value; },
    idbReady: async () => idbOk,
  }));
  return import('./store.ts');
}

// Vitest runs in Node (see vitest.config.ts). The store only needs something to
// hang its `pagehide` listener on, so a bare EventTarget stands in for `window`.
const g = globalThis as unknown as { window?: EventTarget };
const hide = () => g.window!.dispatchEvent(new Event('pagehide'));

beforeEach(() => {
  g.window = new EventTarget();
  localStorage.clear();
  stored = { [CARDS]: { 'voc:A1:der Tisch': card(5), 'voc:A1:die Tür': card(3), 'voc:A1:das Haus': card(8) } };
  writes = [];
});
afterEach(() => { vi.doUnmock('./lib/idb.ts'); delete g.window; });

describe('the card-map write guard', () => {
  it('writes nothing before hydrate has read what is stored', async () => {
    await boot();
    hide();
    expect(writes).not.toContain(CARDS);
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(3);
  });

  it('flushes the hydrated map on pagehide', async () => {
    const store = await boot();
    await store.hydrate();
    hide();
    await Promise.resolve();
    expect(writes).toContain(CARDS);
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(3);
  });

  it('never writes a map smaller than the one it loaded', async () => {
    const store = await boot();
    await store.hydrate();
    store.restoreCard('voc:A1:der Tisch', undefined);
    hide();
    await Promise.resolve();
    expect(writes).not.toContain(CARDS);
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(3);
  });

  it('after a boot that could not open IndexedDB, writes to localStorage only', async () => {
    const store = await boot(false);
    await store.hydrate();
    store.review('voc:A1:der Stuhl', 3);
    hide();
    await Promise.resolve();
    expect(writes).not.toContain(CARDS);
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(3);
    expect(JSON.parse(localStorage.getItem(CARDS)!)).toHaveProperty(['voc:A1:der Stuhl']);
  });

  it('does not flush the old map over a restore', async () => {
    const store = await boot();
    await store.hydrate();
    await store.importData(JSON.stringify({ cards: { 'voc:A1:der Hund': card(2) } }));
    const after = writes.length;
    hide();
    await Promise.resolve();
    expect(writes.length).toBe(after);
    expect(Object.keys(stored[CARDS] as object)).toEqual(['voc:A1:der Hund']);
  });
});
