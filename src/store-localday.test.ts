// Persona pass, 2026-11-20 ("Jonas", night shifts across timezones). Day keys
// built with `toISOString()` are the UTC date; the learner's day is local.
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined, idbSet: async () => undefined,
  idbUpdate: async () => undefined, idbSetMany: async () => undefined, idbReady: async () => true,
}));

afterEach(() => { vi.useRealTimers(); });

describe('localDayKey', () => {
  it('is the local calendar day, and steps by calendar day across DST', async () => {
    const { localDayKey } = await import('./store.ts');
    const at = new Date(2026, 9, 26, 0, 30);           // local 00:30 the day after Europe's fall-back
    expect(localDayKey(0, at)).toBe('2026-10-26');
    expect(localDayKey(1, at)).toBe('2026-10-25');
    expect(localDayKey(-1, at)).toBe('2026-10-27');
    const late = new Date(2026, 6, 10, 23, 59);        // a local late evening is still that day
    expect(localDayKey(0, late)).toBe('2026-07-10');
  });
});

describe('the backlog peak', () => {
  it('is recorded when the day’s briefing is built, so the burn-down bar can draw', async () => {
    localStorage.clear();
    vi.resetModules();
    const store = await import('./store.ts');
    await store.hydrate();
    store.noteBacklog(0);
    expect(store.backlogPeak()).toBe(0);
    store.buildBriefing();
    expect(store.backlogPeak()).toBe(0);               // nothing due: nothing to burn down

    const data = await import('./data/index.ts');
    data.registerWords([{ id: 'w1', term: 'der Tisch', en: 'table', pos: 'noun', level: 'A1', gender: 'der',
      plural: 'die Tische', ipa: '', def: null, syn: [], ant: [], ex: [], field: 'Home', kind: 'word' } as never]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12));
    store.review('w1', 3);
    vi.setSystemTime(new Date(2026, 3, 1, 12));         // three months away
    store.buildBriefing();
    expect(store.backlogPeak()).toBe(1);
  });
});
