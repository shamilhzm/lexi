// The placement test's two defences against an inflated result: a filter that
// keeps give-away words out of the probe pool, and invented words that measure
// how much the learner's own "I know it" is worth.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isTransparent } from './Placement.tsx';
import {
  FOILS, PER_LEVEL, FOILS_PER_LEVEL, PASS, TRUST_CEILING,
  correctedRate, trustsSelfReport, selfReportNote,
} from '../lib/placement.ts';

describe('isTransparent', () => {
  it('catches loanwords whose gloss is the word itself', () => {
    expect(isTransparent('das Meeting', 'meeting')).toBe(true);
    expect(isTransparent('das Restaurant', 'restaurant')).toBe(true);
    expect(isTransparent('der Name', 'name')).toBe(true);
    expect(isTransparent('modern', 'modern')).toBe(true);
  });

  it('catches them when the give-away is one gloss among several', () => {
    expect(isTransparent('die Bank', 'bank; bench')).toBe(true);
    expect(isTransparent('die Operation', 'operation, surgery')).toBe(true);
  });

  it('keeps genuine probes, including near-cognates', () => {
    expect(isTransparent('das Haus', 'house')).toBe(false);
    expect(isTransparent('der Beruf', 'profession, job')).toBe(false);
    expect(isTransparent('die Zeitung', 'newspaper')).toBe(false);
    expect(isTransparent('der Motor', 'engine, motor')).toBe(true); // gloss lists it verbatim
  });

  it('ignores the article and surrounding whitespace', () => {
    expect(isTransparent('der Park', '  Park  ')).toBe(true);
  });
});

describe('the foils', () => {
  // The backstop, not the proof. Anything added to FOILS must be checked against
  // a real dictionary first — the corpus is 6,472 words and German is not — but
  // a foil that collides with a word the app itself teaches is unarguably broken,
  // and that is cheap to catch here.
  const corpus: { term: string }[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
  const strip = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
  const real = new Set(corpus.map((w) => strip(w.term)));

  it('are not words the app itself teaches', () => {
    const collisions = FOILS.filter((f) => real.has(strip(f.term)));
    expect(collisions.map((f) => f.term)).toEqual([]);
  });

  it('are all distinct, so one cannot be drawn twice in a test', () => {
    expect(new Set(FOILS.map((f) => strip(f.term))).size).toBe(FOILS.length);
  });

  it('has enough to give every level its own, without replacement', () => {
    // Six CEFR levels × FOILS_PER_LEVEL, drawn from one bag across the whole test.
    expect(FOILS.length).toBeGreaterThanOrEqual(6 * FOILS_PER_LEVEL);
  });

  it('carries an article on exactly the noun-shaped ones', () => {
    for (const f of FOILS) {
      const hasArticle = /^(der|die|das)\s/i.test(f.term);
      expect(hasArticle, f.term).toBe(f.gender !== null);
    }
  });

  it('probes enough real words per level to out-resolve a CEFR band', () => {
    // Was five: on five binary items with a 0.6 cut, three-versus-two moved a
    // learner a whole band. Whatever this becomes, one item must not be worth
    // more than the pass threshold's own granularity.
    expect(PER_LEVEL).toBeGreaterThanOrEqual(7);
    expect(1 / PER_LEVEL).toBeLessThan(1 - PASS);
  });
});

describe('correctedRate — rescaling a claim by what the claim is worth', () => {
  it('leaves an honest learner untouched', () => {
    expect(correctedRate(0.8, 0)).toBeCloseTo(0.8);
    expect(correctedRate(1, 0)).toBe(1);
  });

  it('halves a score that was half noise', () => {
    // Meara: (h − f) / (1 − f). Ticking half the invented words means half the
    // yeses carried no information.
    expect(correctedRate(0.75, 0.5)).toBeCloseTo(0.5);
    expect(correctedRate(0.5, 0.5)).toBe(0);
  });

  it('cannot go negative, however wildly the learner over-claims', () => {
    expect(correctedRate(0.2, 0.8)).toBe(0);
  });

  it('returns nothing recoverable when every invented word was claimed', () => {
    // f === 1 is a division by zero in the formula; it is also the case where
    // the answers carry no signal at all, so 0 is the honest reading.
    expect(correctedRate(1, 1)).toBe(0);
  });

  it('clamps inputs rather than trusting its callers', () => {
    expect(correctedRate(2, 0)).toBe(1);
    expect(correctedRate(-1, 0)).toBe(0);
  });

  it('changes the placement decision, which is the point', () => {
    // Six of seven real words claimed looks like a clear pass — until you see
    // that this learner also claimed both invented ones.
    const raw = 6 / 7;
    expect(raw >= PASS).toBe(true);
    expect(correctedRate(raw, 1) >= PASS).toBe(false);
  });
});

describe('trustsSelfReport — whether to write this into a schedule', () => {
  it('trusts a learner who claimed no invented words', () => {
    expect(trustsSelfReport(0, 4)).toBe(true);
  });

  it('tolerates the occasional one, because that is normal', () => {
    expect(trustsSelfReport(1, 6)).toBe(true);
    expect(TRUST_CEILING).toBeGreaterThan(0);
  });

  it('refuses to seed once the claims stop meaning recognition', () => {
    expect(trustsSelfReport(3, 4)).toBe(false);
    expect(trustsSelfReport(2, 4)).toBe(false);
  });

  it('falls back to trusting when nothing was measured', () => {
    // A learner who skipped out before meeting a foil is not thereby suspect.
    expect(trustsSelfReport(0, 0)).toBe(true);
  });
});

describe('selfReportNote — telling the learner what happened', () => {
  it('says nothing when there is nothing to say', () => {
    expect(selfReportNote(0, 4)).toBeNull();
    expect(selfReportNote(0, 0)).toBeNull();
  });

  it('normalises a small slip rather than scolding', () => {
    const note = selfReportNote(1, 6)!;
    expect(note).toContain('normal');
    expect(note.toLowerCase()).not.toContain('wrong');
  });

  it('explains an empty queue when nothing was seeded', () => {
    const note = selfReportNote(3, 4)!;
    expect(note).toContain('not pre-filled');
  });
});
