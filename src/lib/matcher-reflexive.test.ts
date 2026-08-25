// A reflexive governed pattern needs its pronoun, and the pronoun has to agree.
//
// `sich erinnern an + A` was claiming «Das Lied erinnert mich an meine Kindheit» —
// a transitive sentence with no reflexive in it — because *erinnert* is a form of
// the lemma and *an* is somewhere in the clause. Two costs: a learner is credited
// with a reflexive pattern card on a sentence that does not contain it, which is
// the inflation `patIndex` exists to prevent; and the plain `erinnern` card became
// unillustratable, because the authoring gate refused every example written for it.
//
// The test is **person agreement**, not "is there a pronoun": *mich* is reflexive
// after *ich erinnere* and an ordinary accusative object after *das Lied erinnert*.
import { describe, it, expect } from 'vitest';
import { buildMatcher } from './matcher.ts';
import type { Word } from '../types.ts';

const v = (id: string, term: string, en: string): Word => ({
  id, term, en, pos: 'verb', level: 'B1', gender: null, plural: null, ipa: null,
  def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word',
});

const REFL = v('t:sich-erinnern', 'sich erinnern an + A', 'to remember');
const PLAIN = v('t:erinnern', 'erinnern', 'to remind');
const WARTEN = v('t:warten', 'warten auf + A', 'to wait for');
const m = buildMatcher([REFL, PLAIN, WARTEN]);

const who = (s: string, tok: string) =>
  m.annotate(s).find((g) => g.isWord && g.text.toLowerCase() === tok)?.word?.id ?? null;

describe('a reflexive governed pattern requires an agreeing pronoun', () => {
  it('gives the transitive sentence to the plain verb', () => {
    // The sentence that shipped on the plain card and resolved to the reflexive.
    expect(who('Das Lied erinnert mich an meine Kindheit.', 'erinnert')).toBe('t:erinnern');
    expect(who('Der Kalender soll mich an wichtige Termine erinnern.', 'erinnern')).toBe('t:erinnern');
  });

  it('still claims a genuine reflexive, in every person', () => {
    expect(who('Ich erinnere mich an das Fest.', 'erinnere')).toBe('t:sich-erinnern');
    expect(who('Erinnerst du dich an unseren Urlaub?', 'erinnerst')).toBe('t:sich-erinnern');
    expect(who('Sie erinnert sich gern an die Schulzeit.', 'erinnert')).toBe('t:sich-erinnern');
  });

  it('accepts the perfect, where the participle carries no person', () => {
    // *erinnert* is the Partizip II as well as the 3rd singular, so the person is
    // unknowable there — any reflexive counts, but only with an auxiliary present.
    expect(who('Ich habe mich gut an das Fest erinnert.', 'erinnert')).toBe('t:sich-erinnern');
  });

  it('leaves non-reflexive patterns exactly as they were', () => {
    expect(who('Ich warte auf den Bus.', 'warte')).toBe('t:warten');
    expect(who('Sie wartet seit Monaten auf ihr Visum.', 'wartet')).toBe('t:warten');
  });

  it('does not claim the verb when the preposition is absent', () => {
    // The original contract: a bare «Ich warte» must not credit the pattern card.
    expect(who('Ich warte.', 'warte')).toBeNull();
  });
});
