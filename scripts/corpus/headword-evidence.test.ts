// `headwordEvidence` — does the example actually contain the word it teaches?
//
// The matcher indexes lowercased surface forms, which is right for reading and
// wrong as *evidence*. Under the old rule — "some token resolves to this card" —
// all four of these shipped, and all four passed the authoring gate:
//
//   die Braut   «Er braut Bier.»          the verb brauen
//   der Schritt «Wer schritt ein?»        the preterite of einschreiten
//   die Naht    «Das Ende naht!»          the verb nahen
//   der Samt    «…eine Orange samt Schale» the preposition samt
//
// German settles every one of them without judgement: a noun is capitalised, so a
// lowercase token cannot be the noun. 49 such examples were in the corpus when
// this was written and every one was a defect (CHANGELOG 2026-08-24).
import { describe, it, expect } from 'vitest';
import { buildMatcher } from '../../src/lib/matcher.ts';
import { headwordEvidence } from './lib.ts';
import type { Word } from '../../src/types.ts';

const card = (over: Partial<Word>): Word => ({
  id: `t:${over.term}`, term: '', en: '', pos: 'noun', level: 'B1', gender: null,
  plural: null, ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test',
  kind: 'word', ...over,
});

const BRAUT = card({ term: 'die Braut', pos: 'noun', gender: 'die', plural: 'die Bräute', en: 'bride' });
const SCHRITT = card({ term: 'der Schritt', pos: 'noun', gender: 'der', plural: 'die Schritte', en: 'step' });
const TANZEN = card({ term: 'tanzen', pos: 'verb', en: 'to dance' });
const ROT = card({ term: 'rot', pos: 'adjective', en: 'red' });
const corpus = [BRAUT, SCHRITT, TANZEN, ROT];
const m = buildMatcher(corpus);

describe('headwordEvidence', () => {
  it('accepts a noun proved by a capitalised token', () => {
    expect(headwordEvidence(m, BRAUT, 'Die Braut trug ein weißes Kleid.')).toEqual({ ok: true, token: 'Braut' });
    expect(headwordEvidence(m, SCHRITT, 'Machen Sie einen Schritt nach vorn.').ok).toBe(true);
  });

  it('accepts a noun in its plural, and sentence-initially', () => {
    expect(headwordEvidence(m, SCHRITT, 'Seine Schritte waren laut.').ok).toBe(true);
    expect(headwordEvidence(m, BRAUT, 'Braut und Bräutigam kamen zu spät.').ok).toBe(true);
  });

  it('refuses the homograph — the defect this rule exists for', () => {
    // The two sentences that actually shipped on these cards.
    expect(headwordEvidence(m, BRAUT, 'Er braut Bier.')).toEqual({ ok: false, why: 'miscased', token: 'braut' });
    expect(headwordEvidence(m, SCHRITT, 'Wer schritt ein?')).toEqual({ ok: false, why: 'miscased', token: 'schritt' });
  });

  it('separates "the word is absent" from "the word is miscased"', () => {
    expect(headwordEvidence(m, BRAUT, 'Der Mann trank ein Bier.')).toEqual({ ok: false, why: 'absent' });
  });

  it('leaves verbs and adjectives alone — a nominalisation is ordinary German', () => {
    // The mirror rule is deliberately NOT enforced: «beim Tanzen» and «bei Rot»
    // teach their words fine, and nothing mechanical tells them apart from the
    // occasional genuine drift (`wild` illustrated with «Seid ihr Wilde?»).
    expect(headwordEvidence(m, TANZEN, 'Beim Tanzen vergisst sie alle Sorgen.').ok).toBe(true);
    expect(headwordEvidence(m, ROT, 'Bei Rot muss man stehen bleiben.').ok).toBe(true);
    expect(headwordEvidence(m, TANZEN, 'Wir tanzen jeden Freitag.').ok).toBe(true);
  });
});

// A verb's own Perfekt, where an adjective card owns the participle.
//
// 48 verb cards have a Partizip II that is also an adjective card — wohnen/gewohnt,
// schicken/geschickt, öffnen/geöffnet — and the matcher gives the adjective its own
// term on purpose: a learner meeting «Das Geschäft ist geöffnet» needs the
// adjective. The cost fell on authoring, where a Perfekt example written for the
// verb resolved to the adjective and was refused, pushing the author toward a
// worse sentence. It blocked three cards on 2026-08-25 alone.
describe('headwordEvidence — a verb proved by its own Perfekt', () => {
  const VERLETZEN = card({ term: 'verletzen', pos: 'verb', en: 'to injure' });
  const VERLETZT = card({ term: 'verletzt', pos: 'adjective', en: 'hurt, offended' });
  const m2 = buildMatcher([VERLETZEN, VERLETZT]);

  it('accepts the participle when an auxiliary makes it a Perfekt', () => {
    // Refused before the widening; the adjective card owns the token.
    expect(headwordEvidence(m2, VERLETZEN, 'Der Hund hat das Kind am Arm verletzt.').ok).toBe(true);
    expect(headwordEvidence(m2, VERLETZEN, 'Sie ist beim Sport verletzt worden.').ok).toBe(true);
  });

  it('still refuses the participle with no auxiliary — that is the adjective', () => {
    // «Er wirkt verletzt» is the adjective, and the verb card must not claim it.
    expect(headwordEvidence(m2, VERLETZEN, 'Er wirkt verletzt und still.')).toEqual({ ok: false, why: 'absent' });
  });

  it('does not widen anything for nouns', () => {
    // The noun rule is untouched: a lowercase token still disproves a noun.
    expect(headwordEvidence(m, BRAUT, 'Er braut Bier.')).toEqual({ ok: false, why: 'miscased', token: 'braut' });
    expect(headwordEvidence(m, BRAUT, 'Der Mann trank ein Bier.')).toEqual({ ok: false, why: 'absent' });
  });
});
