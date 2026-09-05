// A compound is decomposable, not understood.
//
// The matcher resolves an unlisted compound to its **head** — *Gruppenticket* to
// *das Ticket* — on the reasoning that a learner who knows both parts can read
// it. That is true for the productive compounds German invents by the thousand,
// and false for the lexicalised ones: Schadenfreude is not a kind of joy.
//
// Returning the head as though it were the lemma turns those into confident
// wrong answers, and this file exists because a wrong answer is worse than a
// miss — a miss is visible.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerWords } from '../data/index.ts';
import { buildMatcher } from './matcher.ts';
import { coverageOf, resetCoverageIndex } from './coverage.ts';
import type { Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
registerWords(corpus);
resetCoverageIndex();
const m = buildMatcher(corpus);
const seg = (tok: string) => m.annotate(tok)[0];

describe('the matcher says which kind of match it made', () => {
  it('flags a compound resolved through its head', () => {
    const s = seg('Schadenfreude');
    expect(s.word?.term).toBe('die Freude');   // still resolved — it is useful
    expect(s.viaCompound).toBe(true);          // but never mistaken for the lemma
  });

  it('does not flag a word that is its own lemma', () => {
    for (const t of ['Handschuh', 'Kühlschrank', 'Steckdose']) {
      const s = seg(t);
      expect(s.word, t).toBeTruthy();
      expect(s.viaCompound, `${t} is a real card`).toBeFalsy();
    }
  });

  it('does not flag an inflection', () => {
    // Whatever else changes, an ordinary plural must not start reading as a
    // compound — that would quietly move real vocabulary out of the known count.
    const s = seg('Häuser');
    expect(s.word?.term).toBe('das Haus');
    expect(s.viaCompound).toBeFalsy();
  });
});

describe('the reading meter does not score a compound as read', () => {
  const known = () => 'known' as const;

  it('counts it, but not as known — and offers no unlock for it', () => {
    const cov = coverageOf('Die Schadenfreude war groß.', { stateOf: known });
    const tok = cov.tokens.find((t) => t.text === 'Schadenfreude');
    expect(tok?.state).toBe('compound');
    expect(tok?.counted).toBe(true);
    // The unlock plan promises "learn these and the text opens up". Learning
    // *die Freude* does not open up *Schadenfreude*, so it must not be offered.
    expect(cov.unlocks.some((u) => u.word.term === 'die Freude')).toBe(false);
  });

  it('a real card in the same sentence still counts as known', () => {
    const cov = coverageOf('Das Haus war groß.', { stateOf: known });
    expect(cov.tokens.find((t) => t.text === 'Haus')?.state).toBe('known');
    expect(cov.known).toBeGreaterThan(0);
  });
});
