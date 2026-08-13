// What goes on the page.
//
// A worksheet is the one thing in this app that cannot be corrected after it is
// handed out, so the failure modes are worse than on screen: a gap-fill that
// still shows its answer is not a question, and an exercise transcribed from an
// interaction is a question nobody can answer with a pen. These pin both.
import { describe, it, expect } from 'vitest';
import {
  blankExample, buildVocabSheet, buildClozeSheet, buildGrammarSheet, buildMissSheet,
} from './worksheet.ts';
import type { Word } from '../types.ts';
import type { GPoint } from './grammar.ts';
import type { MissStat } from '../store.ts';

const w = (term: string, en: string, extra: Partial<Word> = {}): Word => ({
  id: `voc:A1:${term}`, term, en, pos: 'noun', level: 'A1', gender: 'die', plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...extra,
});

describe('blankExample', () => {
  it('blanks the headword out of its own sentence', () => {
    expect(blankExample('Ich lerne die deutsche Sprache.', 'die Sprache'))
      .toBe('Ich lerne die deutsche __________.');
  });

  it('blanks the noun and leaves its article standing', () => {
    // Deliberate: the gap asks for the noun, and the article in front of it is
    // context the learner reads rather than an answer they are given. Blanking
    // both would make the item a gender question wearing a vocabulary question's
    // clothes — and the answer key would then have to accept "das Haus" for a
    // gap that is one word wide.
    expect(blankExample('Das Haus ist groß.', 'das Haus')).toBe('Das __________ ist groß.');
  });

  it('refuses when the word is not in the sentence, rather than returning it unchanged', () => {
    // A card whose example does not contain its own headword is a known corpus
    // defect (~71 of them). It must produce no item, not an item with no gap.
    expect(blankExample('Meine Tochter möchte gern reiten lernen.', 'das Pferd')).toBeNull();
  });

  it('does not blank a word that merely contains the headword', () => {
    // "Haus" inside "Hausaufgabe" is not the target, and blanking it would ask
    // for a word the sentence never had.
    expect(blankExample('Die Hausaufgabe ist fertig.', 'das Haus')).toBeNull();
  });

  it('respects German letters at the boundary', () => {
    // \b is ASCII-only, so a naive regex treats "ä" as a boundary and blanks
    // half a word. This is the same trap wholeWordRe exists for.
    expect(blankExample('Die Universität ist groß.', 'die Uni')).toBeNull();
  });

  it('declines targets too short to make a fair gap', () => {
    expect(blankExample('Er ist da.', 'da')).toBeNull();
  });
});

describe('buildVocabSheet', () => {
  const words = [w('die Sprache', 'language'), w('das Haus', 'house', { gender: 'das' })];

  it('asks for the German, with the article, in the productive direction', () => {
    const s = buildVocabSheet(words, 'en-de');
    expect(s.items[0]).toEqual({ prompt: 'language', answer: 'die Sprache', hint: 'with the article' });
    expect(s.note).toContain('der/die/das');
  });

  it('asks for the English in the receptive direction, with no article hint', () => {
    const s = buildVocabSheet(words, 'de-en');
    expect(s.items[0]).toEqual({ prompt: 'die Sprache', answer: 'language' });
  });

  it('skips cards with nothing to ask, rather than printing a blank row', () => {
    const s = buildVocabSheet([...words, w('kaputt', '')], 'en-de');
    expect(s.items).toHaveLength(2);
  });

  it('honours the limit', () => {
    expect(buildVocabSheet(words, 'en-de', 1).items).toHaveLength(1);
  });
});

describe('buildClozeSheet', () => {
  it('uses only cards whose example can actually carry a gap', () => {
    const good = w('die Sprache', 'language', { ex: [{ de: 'Ich lerne die Sprache.', en: 'I am learning the language.', lvl: 'A1' }] });
    const bad = w('das Pferd', 'horse', { ex: [{ de: 'Meine Tochter möchte reiten.', en: 'My daughter wants to ride.', lvl: 'A1' }] });
    const none = w('der Tisch', 'table');
    const s = buildClozeSheet([good, bad, none]);
    expect(s.items).toHaveLength(1);
    expect(s.items[0].prompt).toContain('__________');
    expect(s.items[0].answer).toBe('Sprache');
  });

  it('never leaves the answer visible in the prompt', () => {
    const cards = [w('die Sprache', 'language', { ex: [{ de: 'Ich lerne die Sprache.', en: '', lvl: 'A1' }] })];
    for (const it of buildClozeSheet(cards).items) {
      expect(it.prompt.toLowerCase()).not.toContain(it.answer.toLowerCase());
    }
  });
});

describe('buildGrammarSheet', () => {
  const point: GPoint = {
    title: 'Artikel & Genus',
    summary: 'Every noun has a gender.',
    rule: '…',
    exercises: [
      { kind: 'choose', prompt: '___ Mann ist groß.', options: ['Der', 'Die', 'Das'], answer: 0 },
      { kind: 'type', prompt: '___ Sonne scheint.', accept: ['Die', 'die'] },
      { kind: 'order', prompt: 'Build it', tiles: ['Der', 'Mann', 'ist', 'groß'] },
      { kind: 'error', prompt: 'Die Mann ist groß.', answer: 0, fix: 'Der' },
    ],
  };

  it('keeps the kinds that survive paper and drops the ones that do not', () => {
    const s = buildGrammarSheet(point, 'A1');
    // order (drag tiles) and error (tap a word) are interactions, not questions.
    expect(s.items).toHaveLength(2);
    expect(s.items.map((i) => i.answer)).toEqual(['Der', 'Die']);
  });

  it('prints the options as lettered choices without giving the answer away', () => {
    const s = buildGrammarSheet(point, 'A1');
    expect(s.items[0].hint).toBe('a) Der   b) Die   c) Das');
    expect(s.items[0].hint).not.toContain('correct');
  });

  it('carries the rule summary as the sheet note', () => {
    expect(buildGrammarSheet(point, 'A1').note).toBe('Every noun has a gender.');
  });
});

describe('buildMissSheet', () => {
  const stats: MissStat[] = [
    {
      tag: 'Cases & endings (Kasus)', count: 4, last: Date.now(),
      terms: [{ term: 'der Tisch', count: 3 }],
      confusions: [{ asked: 'Dativ', chose: 'den', count: 3 }],
    },
    {
      tag: 'Noun plurals', count: 2, last: Date.now(),
      terms: [{ term: 'das Haus', count: 2 }],
      confusions: [],
    },
  ];

  it('leads with the confusion, because that is the teachable line', () => {
    const s = buildMissSheet(stats);
    expect(s.items[0].answer).toContain('reaches for “den”');
    expect(s.items[0].answer).toContain('“Dativ”');
    expect(s.items[0].hint).toContain('der Tisch');
  });

  it('falls back to a count when no confusion was recorded', () => {
    expect(buildMissSheet(stats).items[1].answer).toContain('2×');
  });

  it('says on the page that nothing was sent anywhere', () => {
    // The whole reason this sheet is allowed to exist under the project's
    // refusals. If the note goes, so does the argument.
    expect(buildMissSheet(stats).note).toContain('Nothing was sent anywhere');
  });
});
