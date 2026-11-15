// A headword's width, estimated — and what the estimate has to be true of.
//
// The numbers these are held to came off a browser: `scripts/probe/headword-fit.js`
// measures every headword with the display face at the sizes the app sets it, and
// prints the table `fit.ts` carries. A test cannot draw a glyph, so what it can
// hold is the part that goes stale silently: that every character a headword
// contains is one the table has an advance for.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emWidth, widestRun, MEASURED } from './fit.ts';
import { shownTerm } from './focus.ts';

const cards = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'public', 'data', 'cards.json'), 'utf8'));
const rows: { term: string; kind?: string }[] = Array.isArray(cards) ? cards : (cards.cards ?? cards.words ?? Object.values(cards));
const terms = rows.filter((c) => c.kind !== 'grammar').map((c) => shownTerm(c.term.replace(/^(der|die|das)\s+/i, '')));

describe('emWidth', () => {
  // Glyph widths the browser measured at 40px, from the probe; on the page each
  // letter then gives back `.headword`'s 0.01em of tracking.
  it.each([
    ['Bundespräsident', 8.372],
    ['Geschwindigkeitsbeschränkung', 15.677],
    ['zusammenkommen', 9.604],
  ])('%s is within 3%% of what the browser draws, and never under it', (word, glyphs) => {
    const real = glyphs - 0.01 * word.length;
    const est = emWidth(word);
    expect(est).toBeGreaterThanOrEqual(real);
    expect(est / real).toBeLessThan(1.03);
  });

  it('assumes an unmeasured glyph is wide rather than free', () => {
    expect(emWidth('Ж')).toBeGreaterThan(emWidth('m') * 0.8);
  });
});

describe('widestRun', () => {
  it('is the longest word of a phrase, not the phrase', () => {
    expect(widestRun('aus einer Mücke einen Elefanten machen')).toBe(widestRun('Elefanten'));
  });

  it('ends a run at a hyphen the word already has', () => {
    // A line may break after it, so the measure only has to hold one part.
    expect(widestRun('Nord-Süd-Gefälle')).toBeLessThan(emWidth('Nord-Süd-Gefälle'));
    expect(widestRun('Nord-Süd-Gefälle')).toBe(Math.round(emWidth('Gefälle') * 100) / 100);
  });

  it('never hands CSS a zero to divide by', () => {
    expect(widestRun('')).toBe(1);
    expect(widestRun('a')).toBe(1);
    expect(Number.isFinite(widestRun('Ж-'))).toBe(true);
  });
});

describe('the table against the corpus', () => {
  it('has an advance for every character a headword contains', () => {
    // Count the cases in the data first (LESSONS). A new card with a character
    // the table has not met is set a little too small, not broken — but it should
    // be a decision, so the probe is re-run and the table extended.
    const unknown = new Set<string>();
    for (const t of terms) for (const ch of t) if (ch.trim() && !MEASURED.has(ch)) unknown.add(ch);
    expect([...unknown].sort()).toEqual([]);
  });

  it('finds the long words it exists for', () => {
    // At the feed's 46.75px on a 342pt measure, a run over 7.3em does not fit.
    // The browser counted 758 (probe, 2026-11-14). The estimate errs wide by
    // design, so it may find somewhat more — never fewer, and not half as many again.
    const over = terms.filter((t) => widestRun(t) > 342 / 46.75).length;
    expect(over).toBeGreaterThanOrEqual(758);
    expect(over).toBeLessThan(758 * 1.25);
  });
});
