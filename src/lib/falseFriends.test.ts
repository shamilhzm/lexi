// A false-friend entry for a word the corpus doesn't teach is dead weight that
// nothing would ever surface, and nothing would ever fail. Pin every key to a real
// card, and pin the copy's shape — the third line (what to say instead) is the one
// that does the work, so an entry without it is only half a correction.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FALSE_FRIENDS, falseFriend } from './falseFriends.ts';
import type { Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const strip = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();
const lemmas = new Set(corpus.filter((w) => w.kind === 'word').map((w) => strip(w.term).toLowerCase()));

describe('false friends', () => {
  it('only names words the corpus actually teaches', () => {
    const orphans = Object.keys(FALSE_FRIENDS).filter((k) => !lemmas.has(k));
    expect(orphans, 'entries with no card behind them').toEqual([]);
  });

  it('is keyed by a bare lemma, lowercased', () => {
    for (const k of Object.keys(FALSE_FRIENDS)) {
      expect(k, `${k} should be lowercase`).toBe(k.toLowerCase());
      expect(k, `${k} should carry no article`).not.toMatch(/^(der|die|das)\s/);
    }
  });

  it('gives every entry all three parts', () => {
    for (const [k, ff] of Object.entries(FALSE_FRIENDS)) {
      expect(ff.looksLike?.trim(), `${k}: no English word to warn about`).toBeTruthy();
      expect(ff.actually?.trim(), `${k}: no real meaning`).toBeTruthy();
      // Without this the learner is told they're wrong and left with no word.
      expect(ff.insteadSay?.trim(), `${k}: no replacement for the English sense`).toBeTruthy();
    }
  });

  it('never suggests the trap word as its own replacement', () => {
    for (const [k, ff] of Object.entries(FALSE_FRIENDS)) {
      expect(strip(ff.insteadSay).toLowerCase(), `${k} points at itself`).not.toBe(k);
    }
  });

  it('resolves a term with or without its article', () => {
    expect(falseFriend('das Gymnasium')?.actually).toContain('secondary school');
    expect(falseFriend('Gymnasium')?.actually).toContain('secondary school');
    expect(falseFriend('bekommen')?.insteadSay).toBe('werden');
    expect(falseFriend('der Chef')?.insteadSay).toBe('der Koch');
  });

  it('returns null for an ordinary word', () => {
    expect(falseFriend('das Haus')).toBeNull();
    expect(falseFriend('gehen')).toBeNull();
  });

  it('covers the traps a beginner meets first', () => {
    // These three are the canonical English-speaker errors; if a refactor ever
    // drops them the feature has lost its point.
    for (const k of ['bekommen', 'also', 'gift'].filter((x) => x !== 'gift' || lemmas.has('gift'))) {
      expect(FALSE_FRIENDS[k], `${k} missing`).toBeDefined();
    }
  });
});
