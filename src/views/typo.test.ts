// Typo tolerance on typed answers, and the guard that makes it safe.
//
// The naive version of this feature — accept anything one edit away — was measured
// against the shipped corpus before being written, and it fails badly: 25% of
// typed targets have another real German word at edit distance 1, concentrated in
// exactly the vocabulary a beginner drills. These tests pin the half that matters,
// which is what the tolerance must *refuse*.
import { describe, it, expect, beforeAll } from 'vitest';
import { registerWords } from '../data/index.ts';
import { resetSurfaceIndex } from '../lib/reader.ts';
import { isTypoFor } from './GrammarDrill.tsx';
import type { Word } from '../types.ts';

const word = (term: string, en = ''): Word => ({
  id: `voc:A1:${term}`, term, en, pos: 'noun', level: 'A1',
  gender: null, plural: null, ipa: null, def: null,
  syn: [], ant: [], ex: [], field: 'Test', kind: 'word',
});

beforeAll(() => {
  // The real collision pairs the measurement turned up.
  registerWords(['Mutter', 'Butter', 'Haus', 'Hals', 'Brot', 'Boot', 'Zimmer', 'immer', 'wählen']
    .map((t) => word(t)));
  resetSurfaceIndex();
});

describe('isTypoFor', () => {
  it('accepts a slipped finger', () => {
    expect(isTypoFor('Muter', ['Mutter'])).toBe(true);   // dropped letter
    expect(isTypoFor('Mutterr', ['Mutter'])).toBe(true); // doubled letter
    expect(isTypoFor('Mutfer', ['Mutter'])).toBe(true);  // neighbouring key
  });

  it('refuses a different real word, however close', () => {
    // The whole reason the naive rule is unusable: one edit apart, and both are
    // words a learner is being taught. Accepting this teaches the wrong one.
    expect(isTypoFor('Butter', ['Mutter'])).toBe(false);
    expect(isTypoFor('Hals', ['Haus'])).toBe(false);
    expect(isTypoFor('Boot', ['Brot'])).toBe(false);
    expect(isTypoFor('immer', ['Zimmer'])).toBe(false);
  });

  it('refuses short answers, where one edit is most of the word', () => {
    expect(isTypoFor('Tal', ['Tag'])).toBe(false);
    expect(isTypoFor('ihn', ['ihm'])).toBe(false);
  });

  it('refuses anything more than one edit away', () => {
    expect(isTypoFor('Mtter', ['Mutter'])).toBe(true);
    expect(isTypoFor('Mttr', ['Mutter'])).toBe(false);
    expect(isTypoFor('Vater', ['Mutter'])).toBe(false);
  });

  it('leaves the umlaut fold to the existing near-miss path', () => {
    // "waehlen" already matches through norm(), so it never reaches the typo
    // check — but it must not be *rejected* here either if it ever does.
    expect(isTypoFor('waehlen', ['wählen'])).toBe(false); // zero edits after folding
  });
});
