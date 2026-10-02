// Focus — Lexi does one thing: it grows the German words you know.
//
// Decided with the owner on 2026-10-02 (VISION, *Focus*; `lib/focus.ts`). What
// this pins: with the shipped flags a learner meets no drill that tests a rule of
// the language, and no setting they cannot see quietly governs them — while
// everything the hidden features stored is kept, so flipping a flag back restores
// it exactly. The machinery itself is still guarded, with every flag on, by
// `session-modes`, `session-bounds`, `store-budget` and `store-session`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Word } from './types.ts';

const CARDS = 'lexi.cards.v1';
let stored: Record<string, unknown>;

async function boot() {
  vi.resetModules();
  vi.doMock('./lib/idb.ts', () => ({
    idbGet: async (key: string) => stored[key],
    idbSet: async (key: string, value: unknown) => { stored[key] = value; },
    idbReady: async () => true,
  }));
  const data = await import('./data/index.ts');
  const store = await import('./store.ts');
  const drills = await import('./views/drills.tsx');
  const srs = await import('./srs.ts');
  const conj = await import('./lib/conjugate.ts');
  return { data, store, drills, srs, conj };
}

function word(id: string, extra: Partial<Word> = {}): Word {
  return {
    id, term: id, en: 'x', pos: 'noun', level: 'A1',
    gender: null, plural: null, ipa: null, def: null,
    syn: [], ant: [], ex: [{ de: `Ich sage ${id}.`, en: `I say ${id}.`, lvl: 'A1' }],
    field: 'Test', kind: 'word', ...extra,
  };
}

const card = (reps: number) => ({
  due: new Date(Date.now() + 86_400_000).toISOString(), reps, lapses: 0, state: 2,
  stability: 9, difficulty: 5, elapsed_days: 1, scheduled_days: 3, last_review: new Date().toISOString(),
});

// Vitest runs in Node; the store hangs its `pagehide` flush on `window`.
const g = globalThis as unknown as { window?: EventTarget };

beforeEach(() => { g.window = new EventTarget(); localStorage.clear(); stored = {}; });
afterEach(() => { vi.doUnmock('./lib/idb.ts'); delete g.window; });

describe('focus: vocabulary only', () => {
  it('ships with grammar, speaking, writing and tuning out of focus', async () => {
    const { FOCUS } = await import('./lib/focus.ts');
    // A decision walked back by accident should fail a test, not drift. Flipping
    // a flag on purpose means changing this line and VISION's *Focus* ruling.
    expect(FOCUS).toEqual({ grammar: false, speaking: false, writing: false, tuning: false });
  });

  it('never offers verb forms or comparison — and they were really on offer', async () => {
    const { data, drills, conj } = await boot();
    const gehen = word('gehen', { pos: 'verb' });
    const schnell = word('schnell', { pos: 'adjective' });
    data.registerWords([gehen, schnell]);
    // Not vacuous: without the filter, both would qualify (drills.tsx pushes
    // `conjugate` for a conjugable verb and `degree` for an adjective with forms).
    expect(conj.canConjugate('gehen')).toBe(true);
    expect(drills.practiceModes(gehen)).not.toContain('conjugate');
    expect(drills.practiceModes(schnell, ['schneller', 'am schnellsten'])).not.toContain('degree');
    // The rest of the bank is untouched.
    expect(drills.practiceModes(gehen)).toContain('reverse');
  });

  it('keeps der/die/das and plurals — they are part of a German noun', async () => {
    const { data, drills } = await boot();
    const tisch = word('tisch', { term: 'der Tisch', gender: 'der', plural: 'die Tische' });
    data.registerWords([tisch]);
    expect(drills.eligibleModes(tisch)).toEqual(expect.arrayContaining(['gender', 'plural']));
  });

  it('serves every vocabulary drill whatever was muted, and keeps the mutes', async () => {
    const muted = JSON.stringify(['gender', 'plural']);
    localStorage.setItem('lexi.drillmodes.v1', muted);
    const { store } = await boot();
    for (const m of ['gender', 'plural', 'recall']) expect(store.modeEnabled(m), m).toBe(true);
    for (const m of ['conjugate', 'degree']) expect(store.modeEnabled(m), m).toBe(false);
    expect(localStorage.getItem('lexi.drillmodes.v1')).toBe(muted);
  });

  it('applies the default pace and retention, and keeps the stored choices', async () => {
    localStorage.setItem('lexi.pace.v1', 'intense');
    localStorage.setItem('lexi.retention.v1', '0.95');
    const { store } = await boot();
    expect(store.pace()).toBe('steady');
    expect(store.retention()).toBe(store.DEFAULT_RETENTION);
    expect(localStorage.getItem('lexi.pace.v1')).toBe('intense');
    expect(localStorage.getItem('lexi.retention.v1')).toBe('0.95');
  });

  it('keeps the schedule of a drill it hides, through a session and a flush', async () => {
    // A learner who drilled verb forms before the focus keeps every one of those
    // rows: never delete a schedule because a feature moved (VISION).
    stored[CARDS] = { 'gym:conjugate:gehen': card(4), 'gym:degree:schnell': card(2), 'gehen': card(6) };
    const { data, store } = await boot();
    data.registerWords([word('gehen', { pos: 'verb' }), word('schnell', { pos: 'adjective' })]);
    await store.hydrate();
    store.buildBriefing();
    g.window!.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();
    const after = stored[CARDS] as Record<string, { reps: number }>;
    expect(after['gym:conjugate:gehen']?.reps).toBe(4);
    expect(after['gym:degree:schnell']?.reps).toBe(2);
    expect(store.cardOf('gym:conjugate:gehen')).toBeTruthy();
  });
});
