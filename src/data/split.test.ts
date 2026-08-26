// The projection must not go stale.
//
// `cards.json` and `detail.json` are generated from `vocab.json` by
// `npm run corpus:split`. Nothing forces a maintainer to re-run it, and every
// authoring pass — `corpus:enrich`, `authoring:apply`, `fix-authored` — writes
// `vocab.json` directly. So the realistic failure is not a bug in the split, it is
// someone landing forty new definitions and shipping a `detail.json` that predates
// them. Silent, and it degrades the card face rather than throwing.
//
// This is the guard. CI runs `npm test`, so the moment the projection drifts the
// build goes red and the fix is one command. Same idea as `GRAMMAR_COUNTS` in
// `lib/grammar.ts`: an invariant asserted against the real shipped files rather
// than a fixture.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanExamples } from '../lib/examples.ts';
import type { Word, Example } from '../types.ts';

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

const vocab = read<Word[]>('public/data/vocab.json');
const cards = read<Omit<Word, 'ex' | 'def' | 'defDe'>[]>('public/data/cards.json');
const detail = read<Record<string, { def?: string; defDe?: string; ex?: Example[] }>>(
  'public/data/detail.json');

const HEAVY = ['ex', 'def', 'defDe'] as const;

describe('the corpus projection is in step with the corpus', () => {
  it('ships one card per corpus entry, in the same order', () => {
    // Positional, not set-equal: `cards.json` is a twin of `vocab.json` and the
    // field comparison below indexes into both.
    expect(cards.length).toBe(vocab.length);
    expect(cards.map((c) => c.id)).toEqual(vocab.map((w) => w.id));
  });

  it('carries none of the heavy fields in the boot file', () => {
    // The whole point. A single card keeping its examples would be invisible;
    // all 6,622 keeping them would silently restore the multi-megabyte boot.
    const leaked = cards.filter((c) => HEAVY.some((k) => k in c));
    expect(leaked.map((c) => c.id)).toEqual([]);
  });

  it('preserves every other field verbatim', () => {
    for (let i = 0; i < vocab.length; i++) {
      const { ex: _e, def: _d, defDe: _dd, ...rest } = vocab[i];
      expect(cards[i], `card ${vocab[i].id}`).toEqual(rest);
    }
  });

  it('holds the heavy fields, cleaned, in the sidecar', () => {
    for (const w of vocab) {
      const d = detail[w.id] ?? {};
      expect(d.ex ?? [], `ex for ${w.id}`).toEqual(cleanExamples(w.ex ?? []));
      expect(d.def ?? null, `def for ${w.id}`).toBe(w.def ?? null);
      expect(d.defDe ?? null, `defDe for ${w.id}`).toBe(w.defDe ?? null);
    }
  });

  it('has no sidecar entry for a card the corpus no longer ships', () => {
    const live = new Set(vocab.map((w) => w.id));
    expect(Object.keys(detail).filter((id) => !live.has(id))).toEqual([]);
  });

  it('ships examples that are already a fixed point of cleanExamples', () => {
    // Stronger than what could be asserted before the split: cleaning happens at
    // build time now, so the bytes on the wire are the cleaned bytes. If this
    // holds, `src/data/index.ts` never needs to scan examples at boot again.
    for (const [id, d] of Object.entries(detail)) {
      if (!d.ex) continue;
      expect(cleanExamples(d.ex), `already clean: ${id}`).toEqual(d.ex);
    }
  });
});
