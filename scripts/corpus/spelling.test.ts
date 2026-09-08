// The app speaks one English.
//
// `die Farbe` was glossed **color** and defined **colour**. `die Verteidigung`:
// glossed **defense**, defined **defence**. `der Schmuck`: glossed **jewellery**,
// defined **jewelry**. Twenty-five cards contradicted themselves between the line
// on the card and the line in the entry sheet, about the same word, in front of
// the same learner — and across the corpus there was simply no convention: 28 US
// glosses against 63 UK, 46 US example translations against 302.
//
// `corpus:spelling --write` normalised the **authored** fields, which are the
// gloss and the example translations. It deliberately left `def` alone: that is
// machine-sourced from Wiktionary and shown as what the dictionary says, and
// rewriting it would turn a quotation into a paraphrase. So 21 cards still differ
// from their own definition, and that is a maintainer's decision rather than a
// defect this test should hide.
//
// This is the guard on the half that was fixed. It reads the same map the script
// does, so the two cannot drift.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Word } from '../../src/types.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const cards: Word[] = JSON.parse(readFileSync(join(ROOT, 'public/data/vocab.json'), 'utf8'));
const src = readFileSync(join(ROOT, 'scripts/corpus/spelling.ts'), 'utf8');

/** The US forms the normaliser knows about, read out of the script rather than
 *  retyped — a guard that hardcodes what it guards tests nothing. */
const US = (() => {
  const block = src.slice(src.indexOf('const TO_UK: Record<string, string> = {'));
  const body = block.slice(0, block.indexOf('};'));
  return [...body.matchAll(/^\s{2}([a-z]+): '/gm), ...body.matchAll(/, ([a-z]+): '/g)]
    .map((m) => m[1]);
})();

describe('English spelling is British in every authored field', () => {
  it('read the map out of the script', () => {
    // A regex that stopped matching would silently pass every case below.
    expect(US.length).toBeGreaterThan(30);
    expect(US).toContain('color');
    expect(US).toContain('defense');
    expect(US).toContain('organize');
  });

  const hit = (t: string | undefined | null) => t
    ? US.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(t))
    : [];

  it('no gloss uses a US spelling', () => {
    const bad = cards.filter((c) => hit(c.en).length)
      .map((c) => `${c.term}: "${c.en}"`);
    expect(bad).toEqual([]);
  });

  it('no example translation uses a US spelling', () => {
    const bad: string[] = [];
    for (const c of cards) {
      for (const e of c.ex ?? []) {
        const found = hit(e.en);
        if (found.length) bad.push(`${c.term}: "${e.en}" (${found.join(', ')})`);
      }
    }
    expect(bad).toEqual([]);
  });

  // `practice`/`practise` and `licence`/`license` are noun-verb pairs in British
  // English, not spelling variants, so the normaliser must never have touched
  // them. `üben` is a verb and takes the `s`; `die Übung` is a noun and takes `c`.
  it('leaves the noun/verb pairs alone', () => {
    const uben = cards.find((c) => c.term === 'üben');
    const ubung = cards.find((c) => c.term === 'die Übung');
    expect(uben?.en).toContain('practise');
    expect(ubung?.en).toContain('practice');
  });

  // The swap made "organisation, organization" into the same word twice; the
  // script collapses that. A gloss repeating itself is a worse card than the one
  // it replaced.
  it('lists no sense twice', () => {
    const dupes = cards.filter((c) => {
      const parts = (c.en ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
      return parts.length > 1 && new Set(parts).size !== parts.length;
    }).map((c) => `${c.term}: "${c.en}"`);
    expect(dupes).toEqual([]);
  });
});
