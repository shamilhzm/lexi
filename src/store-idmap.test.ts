// The corpus can correct a card id (a capitalised headword fixed, a duplicate
// merged — see scripts/corpus/casefix.ts). When it does, the learner's FSRS
// schedule has to follow: a silent reset to "new" would re-teach words they
// already know and would be invisible until the reviews piled up.
//
// These guard both halves — that the map still describes the shipped corpus,
// and that hydrate() actually moves a stored schedule across it.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ID_MAP } from './data/idmap.ts';
import type { Word } from './types.ts';

const vocab: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const ids = new Set(vocab.map((w) => w.id));

describe('card id migration map', () => {
  it('points every old id at a card the corpus still ships', () => {
    const dangling = Object.entries(ID_MAP).filter(([, to]) => !ids.has(to));
    expect(dangling).toEqual([]);
  });

  it('never maps an id that is still in the corpus', () => {
    const live = Object.keys(ID_MAP).filter((from) => ids.has(from));
    expect(live).toEqual([]);
  });

  it('carries a stored schedule onto the new id', async () => {
    const [from, to] = Object.entries(ID_MAP)[0];
    const stored = {
      'lexi.cards.v1': {
        [from]: { due: new Date(Date.now() - 86_400_000).toISOString(), reps: 7, lapses: 1, state: 2,
          stability: 9, difficulty: 5, elapsed_days: 1, scheduled_days: 3, last_review: new Date().toISOString() },
      },
    } as Record<string, unknown>;

    vi.resetModules();
    vi.doMock('./lib/idb.ts', () => ({
      idbGet: async (key: string) => stored[key],
      idbSet: async (key: string, value: unknown) => { stored[key] = value; },
    }));
    const store = await import('./store.ts');
    await store.hydrate();

    expect(store.statusOf(to)).not.toBe('new');
    expect((stored['lexi.cards.v1'] as Record<string, unknown>)[from]).toBeUndefined();
    vi.doUnmock('./lib/idb.ts');
  });
});
