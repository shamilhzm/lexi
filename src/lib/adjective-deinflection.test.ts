// Adjective cards de-inflect; adverb cards do not.
//
// German's adverbs are, overwhelmingly, adjectives used uninflected — so carding
// one as an adverb is not wrong about the *word*. It is wrong about what the app
// can then do with it: only `adjIndex` gets the de-inflection path, so on an
// adverb card «ein plötzlicher Regen», «die gegenseitige Hilfe» and «unabhängige
// Medien» resolved to nothing at all, and an example written that way was refused
// by the authoring gate.
//
// Eleven cards were re-posed on 2026-08-25. The test is over the shipped corpus,
// because the thing worth pinning is that a learner reading real German gets
// credit for the word they know.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildMatcher } from './matcher.ts';
import type { Word } from '../types.ts';

const corpus = JSON.parse(readFileSync('public/data/vocab.json', 'utf8')) as Word[];
const m = buildMatcher(corpus.filter((w) => w.kind === 'word'));

const resolves = (sentence: string, token: string) =>
  m.annotate(sentence).find((s) => s.isWord && s.text.toLowerCase() === token)?.word?.id ?? null;

describe('inflected adjectives resolve to their card', () => {
  const cases: [string, string, string][] = [
    ['Ein plötzlicher Regen überraschte uns.', 'plötzlicher', 'voc:A2:plötzlich'],
    ['Die gegenseitige Hilfe war wichtig.', 'gegenseitige', 'voc:B1:gegenseitig'],
    ['Unabhängige Medien sind wichtig.', 'unabhängige', 'voc:B1:unabhängig'],
    ['Das ist der eigentliche Grund.', 'eigentliche', 'voc:A2:eigentlich'],
    ['Sie hat einen systematischen Fehler gemacht.', 'systematischen', 'voc:C1:systematisch'],
    ['Heute war ein ganz normaler Tag.', 'normaler', 'voc:A1:normal'],
  ];
  for (const [sentence, token, id] of cases) {
    it(`«${sentence}» → ${id}`, () => expect(resolves(sentence, token)).toBe(id));
  }

  it('leaves a genuine adverb alone', () => {
    // `ziemlich` and `letztendlich` stay adverbs: their cards teach the
    // intensifier, which is the reading a learner needs, and the adjective use is
    // marginal. Re-posing everything that *could* be an adjective would be the
    // pattern-instead-of-lexicon mistake.
    const ziemlich = corpus.find((w) => w.id === 'voc:A1:ziemlich');
    expect(ziemlich?.pos).toBe('adverb');
  });
});
