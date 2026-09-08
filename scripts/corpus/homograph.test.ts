// The five cards a homograph had quietly taken over.
//
// `corpus:homograph` reads every example against the card it sits on, and the
// worst thing it found was not a near-miss. Five cards carried a sentence about a
// *different word that happens to be spelled alike*, scraped from the wrong
// Wiktionary entry and never read since:
//
//   räumen   to clear          « Er fegte alle Räume. »        He swept all the rooms.
//   hauen    to thrust, slash  « Die Haut ist sanft. »         The skin is soft.
//   gewiss   certain           « Du hast kein Gewissen! »      You have no conscience!
//   dürr     dried up          « Es herrscht Dürre. »          There's a drought.
//   bar      bare              « Wo ist die Bar? »             Where is the bar?
//
// A learner meeting `hauen` was shown a sentence about skin. The card teaches the
// word by showing it in use, so an example about another word teaches the wrong
// word — and it does it on the one line the learner is most likely to read.
//
// The repair is in `batches/homograph-01.json`. This is the pin: every example on
// these cards must contain a real inflection of its own headword, proved with the
// app's matcher rather than by substring, so `Haut` cannot pass for `hauen` again.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildMatcher } from '../../src/lib/matcher.ts';
import type { Word } from '../../src/types.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const cards: Word[] = JSON.parse(readFileSync(join(ROOT, 'public/data/vocab.json'), 'utf8'));
const matcher = buildMatcher(cards);

/** The cards the detector caught, by id, so a rename cannot silently drop one. */
const REPAIRED = ['voc:B1:räumen', 'voc:B1:hauen', 'voc:B1:gewiss', 'voc:C1:dürr', 'voc:A1:bar'];

describe('a homograph does not get to keep somebody else’s card', () => {
  it('still has all five cards', () => {
    // A test that quietly matched nothing would pass for ever.
    const found = REPAIRED.filter((id) => cards.some((c) => c.id === id));
    expect(found).toEqual(REPAIRED);
  });

  it.each(REPAIRED)('%s: every example names its own headword', (id) => {
    const card = cards.find((c) => c.id === id)!;
    expect(card.ex?.length ?? 0).toBeGreaterThan(0);
    for (const ex of card.ex ?? []) {
      const named = matcher.annotate(ex.de)
        .some((s) => s.word?.id === card.id && !s.viaCompound);
      expect(named, `${card.term}: « ${ex.de} » does not contain a form of "${card.term}"`).toBe(true);
    }
  });

  // The exact sentences that shipped, named so nobody restores one from an old
  // Wiktionary pass without the test going red.
  it.each([
    ['Er fegte alle Räume.', 'voc:B1:räumen'],
    ['Die Haut ist sanft.', 'voc:B1:hauen'],
    ['Haut ab, Kinder!', 'voc:B1:hauen'],
    ['Du hast kein Gewissen!', 'voc:B1:gewiss'],
    ['Es herrscht Dürre.', 'voc:C1:dürr'],
    ['Wo ist die Bar?', 'voc:A1:bar'],
  ])('« %s » is gone from %s', (de, id) => {
    const card = cards.find((c) => c.id === id)!;
    expect((card.ex ?? []).map((e) => e.de)).not.toContain(de);
  });
});
