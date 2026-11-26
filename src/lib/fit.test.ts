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
  // Glyph widths the browser measured at 40px, from the probe (Bricolage Grotesque
  // 700, 2026-11-26); on the page each letter then gives back `.headword`'s 0.02em
  // of tracking. 4%, not 3%: this face's opsz range is wider than Fraunces', so
  // MARGIN is 3.1% and the tracking it is applied before makes the ratio a little more.
  it.each([
    ['Bundespräsident', 8.144],
    ['Geschwindigkeitsbeschränkung', 15.249],
    ['zusammenkommen', 9.369],
  ])('%s is within 4%% of what the browser draws, and never under it', (word, glyphs) => {
    const real = glyphs - 0.02 * word.length;
    const est = emWidth(word);
    expect(est).toBeGreaterThanOrEqual(real);
    expect(est / real).toBeLessThan(1.04);
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
    // At the feed's 59.5px (text-6xl at a 17px root, 2026-11-26) on a 342pt
    // measure, a run over 5.75em does not fit. The browser counted 1,920 (probe,
    // 2026-11-26; Fraunces at 46.75px was 758). The estimate errs wide by design, and
    // at this size by more than it did: one table serves 24–60px, MARGIN is set for
    // the widest end (24px, +3%), and at 60px the face draws 6% under the table — so
    // the estimate counted 2,583, and a word near the line is set up to ~9% smaller
    // than it could be. Never fewer than the browser, and under 1.4× of it.
    const over = terms.filter((t) => widestRun(t) > 342 / 59.5).length;
    expect(over).toBeGreaterThanOrEqual(1920);
    expect(over).toBeLessThan(1920 * 1.4);
  });
});
