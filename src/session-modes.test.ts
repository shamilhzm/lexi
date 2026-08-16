// Choosing what a session is made of.
//
// "Sometimes I just want to casually flick through new words." A mixed session
// weaves generated drills between the flip cards, which is the right default and
// the wrong thing when the learner is browsing — and there was no way to say so.
//
// The two properties that matter, and the reason this file exists rather than a
// hand-check: **switching every drill off must leave a working flip session** (not
// an empty one), and a muted mode must be muted on *every* path into the queue —
// the weave, the blind-spot injection, and the orphan-due sweep, which is the one
// that reaches past the queue's own words.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Word } from './types.ts';

vi.mock('./lib/idb.ts', () => ({
  idbGet: async () => undefined,
  idbSet: async () => undefined,
}));

async function fresh() {
  vi.resetModules();
  const data = await import('./data/index.ts');
  const store = await import('./store.ts');
  const session = await import('./session.ts');
  const fundamentals = await import('./views/Fundamentals.tsx');
  return { data, store, session, fundamentals };
}

function word(id: string, extra: Partial<Word> = {}): Word {
  return {
    id, term: id, en: 'x', pos: 'noun', level: 'A1',
    gender: 'der', plural: `die ${id}n`, ipa: null, def: null,
    syn: [], ant: [], ex: [{ de: `Das ist der ${id}.`, en: `This is the ${id}.`, lvl: 'A1' }],
    field: 'Test', kind: 'word', ...extra,
  };
}

const ALL = ['gender', 'plural', 'conj', 'cloze', 'order', 'transform', 'case', 'separable', 'reflexive', 'dictation', 'recall', 'grammar'];

describe('what a session is made of', () => {
  beforeEach(() => { localStorage.clear(); });

  it('defaults to every drill enabled', async () => {
    const { store } = await fresh();
    expect(store.mutedModes().size).toBe(0);
    for (const m of ALL) expect(store.modeEnabled(m), m).toBe(true);
  });

  it('mutes and unmutes a single mode, and persists it', async () => {
    const { store } = await fresh();
    store.toggleDrillMode('gender');
    expect(store.modeEnabled('gender')).toBe(false);
    expect(store.modeEnabled('plural')).toBe(true);
    expect(JSON.parse(localStorage.getItem('lexi.drillmodes.v1')!)).toEqual(['gender']);
    store.toggleDrillMode('gender');
    expect(store.modeEnabled('gender')).toBe(true);
  });

  it('stores what is OFF, so a mode added later is on by default', async () => {
    // The reason for storing the excluded set: a learner who visited this screen
    // in 2026 must not silently miss a drill invented in 2027.
    localStorage.setItem('lexi.drillmodes.v1', JSON.stringify(['gender']));
    const { store } = await fresh();
    expect(store.modeEnabled('gender')).toBe(false);
    expect(store.modeEnabled('a-mode-that-did-not-exist-yet')).toBe(true);
  });

  it('turns everything off and on in one move', async () => {
    const { store } = await fresh();
    store.setAllDrillModes(ALL, false);
    for (const m of ALL) expect(store.modeEnabled(m), m).toBe(false);
    store.setAllDrillModes(ALL, true);
    expect(store.mutedModes().size).toBe(0);
  });

  it('leaves a working flip session when every drill is off — not an empty one', async () => {
    const { data, store, session } = await fresh();
    data.registerWords(['a', 'b', 'c', 'd', 'e'].map((x) => word(x)));
    const target = { kind: 'all', name: 'All sectors' } as const;

    store.setAllDrillModes(ALL, false);
    const flipsOnly = session.buildMixedSession(target);
    expect(flipsOnly.length).toBeGreaterThan(0);
    expect(flipsOnly.every((it) => it.type === 'flip')).toBe(true);
  });

  it('keeps drills when they are enabled, so the muting is what changed', async () => {
    // Guards against the test above passing for the wrong reason — a builder that
    // never produces drills at all would satisfy it.
    const { data, store, session } = await fresh();
    data.registerWords(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x) => word(x)));
    const target = { kind: 'all', name: 'All sectors' } as const;

    store.setAllDrillModes(ALL, true);
    const mixed = session.buildMixedSession(target);
    expect(mixed.some((it) => it.type !== 'flip')).toBe(true);
  });

  it('mutes grammar cards too — they are not drills, and the filter missed them', async () => {
    // Found by driving a real session with everything off: twelve flips, then two
    // grammar exercises. Grammar points are scheduled cards in their own right, so
    // the per-drill filter never saw them.
    const { data, store, session } = await fresh();
    data.registerWords([
      word('a'), word('b'),
      { ...word('g'), kind: 'grammar' as const, term: 'Wortstellung', pos: 'grammar' },
    ]);
    store.setAllDrillModes(ALL, false);
    const items = session.buildMixedSession({ kind: 'all', name: 'All sectors' });
    expect(items.some((it) => it.word.kind === 'grammar')).toBe(false);

    store.setAllDrillModes(ALL, true);
    const withGrammar = session.buildMixedSession({ kind: 'all', name: 'All sectors' });
    expect(withGrammar.some((it) => it.word.kind === 'grammar')).toBe(true);
  });

  it('never serves a muted mode, even as an orphaned due drill', async () => {
    // The orphan sweep reaches past the queue's own words, so it is the path a
    // mode-level filter is easiest to forget.
    const { data, store, session, fundamentals } = await fresh();
    const words = ['a', 'b', 'c', 'd'].map((x) => word(x));
    data.registerWords(words);
    // Make a gender drill due for a word, then mute gender.
    store.review(fundamentals.gymId('gender', words[0]), 1);
    store.setAllDrillModes(ALL, false);
    const items = session.buildMixedSession({ kind: 'all', name: 'All sectors' });
    expect(items.some((it) => it.type === 'gender')).toBe(false);
  });
});
