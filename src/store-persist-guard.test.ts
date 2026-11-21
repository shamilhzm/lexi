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
    // Cloned, as a real read is: handing two tabs the same array made every
    // whole-log write look like a merge, and the log test passed on the bug.
    idbGet: async (key: string) => (idbOk ? structuredClone(stored[key]) : undefined),
    idbSet: async (key: string, value: unknown) => { writes.push(key); stored[key] = value; },
    idbUpdate: async (key: string, fn: (v: unknown) => unknown) => { writes.push(key); stored[key] = fn(structuredClone(stored[key])); },
    idbSetMany: async (kv: [string, unknown][]) => { for (const [k, v] of kv) { writes.push(k); stored[k] = v; } },
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

  // Was "flushes the hydrated map on pagehide". Flushing a map nobody changed is
  // how an idle second tab put its boot-time copy over the other tab's grades
  // (persona pass, 2026-11-20). A tab writes what it changed, and only that.
  it('flushes what this tab changed on pagehide, and nothing when it changed nothing', async () => {
    const store = await boot();
    await store.hydrate();
    hide();
    await Promise.resolve();
    expect(writes).not.toContain(CARDS);
    store.review('voc:A1:der Stuhl', 3);
    hide();
    await Promise.resolve();
    expect(writes).toContain(CARDS);
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(4);
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
    await store.importData(JSON.stringify({ app: 'lexi', cards: { 'voc:A1:der Hund': card(2) } }));
    const after = writes.length;
    hide();
    await Promise.resolve();
    expect(writes.length).toBe(after);
    expect(Object.keys(stored[CARDS] as object)).toEqual(['voc:A1:der Hund']);
  });

  it('two tabs keep each other’s grades', async () => {
    const a = await boot();
    await a.hydrate();
    const b = await boot();
    await b.hydrate();
    a.review('voc:A1:der Stuhl', 3);
    b.review('voc:A1:die Lampe', 3);
    hide();                                  // both tabs flush
    await Promise.resolve();
    expect(Object.keys(stored[CARDS] as object).sort()).toEqual(
      ['voc:A1:das Haus', 'voc:A1:der Stuhl', 'voc:A1:der Tisch', 'voc:A1:die Lampe', 'voc:A1:die Tür']);
    // …and a tab reads back what the other one stored as it writes.
    a.review('voc:A1:der Tisch', 3);
    hide();
    await Promise.resolve();
    expect(a.cardOf('voc:A1:die Lampe')).toBeDefined();
  });

  it('an idle tab closing does not undo a restore made in another tab', async () => {
    const a = await boot();
    await a.hydrate();
    const b = await boot();
    await b.hydrate();
    await a.importData(JSON.stringify({ app: 'lexi', v: 1, cards: { 'voc:A1:der Hund': card(2) } }));
    hide();
    await Promise.resolve();
    expect(Object.keys(stored[CARDS] as object)).toEqual(['voc:A1:der Hund']);
  });

  // Left open by the same pass: the blind-spot log, the attempt log and the visit
  // days were still written whole, so each tab's write dropped the other's.
  it('two tabs keep each other’s misses, attempts and visits', async () => {
    const MISSES = 'lexi.miss.v1', ATTEMPTS = 'lexi.attempts.v1', VISITS = 'lexi.visits.v1';
    stored[MISSES] = [{ tag: 'gender', at: Date.now() - 60_000, term: 'Tisch' }];
    stored[ATTEMPTS] = [{ tag: 'gender', at: Date.now() - 60_000 }];
    stored[VISITS] = ['2026-11-01'];
    const a = await boot();
    await a.hydrate();
    const b = await boot();
    await b.hydrate();
    a.logMiss('plural', 'Stuhl');
    a.logAttempt('plural');
    b.logMiss('gender', 'Lampe');
    b.logAttempt('gender');
    await Promise.resolve(); await Promise.resolve();
    const terms = (stored[MISSES] as { term?: string }[]).map((e) => e.term).sort();
    expect(terms).toEqual(['Lampe', 'Stuhl', 'Tisch']);
    expect(stored[ATTEMPTS] as unknown[]).toHaveLength(3);
    // Both tabs recorded today; the day is stored once and the old day survives.
    expect((stored[VISITS] as string[])[0]).toBe('2026-11-01');
    expect(new Set(stored[VISITS] as string[]).size).toBe((stored[VISITS] as string[]).length);
    // …and a tab reads the other's entries back as it writes.
    a.logMiss('plural', 'Bett');
    await Promise.resolve(); await Promise.resolve();
    expect(a.missStats().some((r) => r.tag === 'gender')).toBe(true);
  });

  it('refuses a file that is not a Lexi backup, and changes nothing', async () => {
    const store = await boot();
    await store.hydrate();
    for (const junk of ['', '\u0089PNG', '{"name":"Umzug","cards":[{"id":1}],"lists":[]}', '{"cards":{}}', '[]']) {
      await expect(store.importData(junk)).rejects.toThrow(/doesn’t look like a Lexi backup/);
    }
    await expect(store.importData(JSON.stringify({ app: 'lexi', v: 99, cards: {} }))).rejects.toThrow(/newer version/);
    expect(writes).toEqual([]);
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(3);
  });

  it('a restore that cannot be written changes nothing and keeps the tab saving', async () => {
    const store = await boot();
    await store.hydrate();
    localStorage.setItem('lexi.profile.name.v1', 'Margit');
    const setItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k: string, v: string) => {
      if (k === 'lexi.texts.v1') throw new DOMException('full', 'QuotaExceededError');
      setItem(k, v);
    };
    try {
      await expect(store.importData(JSON.stringify({ app: 'lexi', v: 1, cards: {},
        settings: { 'lexi.profile.name.v1': 'Someone else', 'lexi.texts.v1': '[]' } }))).rejects.toThrow(/out of storage/);
    } finally { localStorage.setItem = setItem; }
    expect(localStorage.getItem('lexi.profile.name.v1')).toBe('Margit');
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(3);
    store.review('voc:A1:der Stuhl', 3);
    hide();
    await Promise.resolve();
    expect(Object.keys(stored[CARDS] as object)).toHaveLength(4);
  });
});
