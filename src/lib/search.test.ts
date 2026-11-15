// The search box, as somebody on an English keyboard uses it.
import { describe, it, expect } from 'vitest';
import { registerWords } from '../data/index.ts';
import { search, fold, foldDigraph } from './search.ts';
import { undigraph } from './lexicon.ts';
import type { Word } from '../types.ts';

const word = (id: string, term: string, en: string, extra: Partial<Word> = {}): Word => ({
  id, term, en, pos: 'noun', level: 'B1', gender: null, plural: null,
  ipa: null, def: null, syn: [], ant: [], ex: [], field: 'Test', kind: 'word', ...extra,
});

registerWords([
  word('t:limit', 'die Geschwindigkeitsbeschränkung', 'speed limit', { gender: 'die' }),
  word('t:uebung', 'die Übung', 'exercise', { gender: 'die' }),
  word('t:feuer', 'das Feuer', 'fire', { gender: 'das' }),
  word('t:haus', 'das Haus', 'house', { gender: 'das' }),
  word('t:autohaus', 'das Autohaus', 'car dealership', { gender: 'das' }),
  word('t:schoen', 'schön', 'beautiful', { pos: 'adjective' }),
]);

const first = (q: string) => search(q)[0]?.id;

describe('search — umlauts, however they are typed', () => {
  it('with the umlaut', () => expect(first('Geschwindigkeitsbeschränkung')).toBe('t:limit'));
  it('with the umlaut dropped', () => expect(first('Geschwindigkeitsbeschrankung')).toBe('t:limit'));
  it('with the umlaut written out, as the owner’s class lists do', () => {
    expect(first('Geschwindigkeitsbeschraenkung')).toBe('t:limit');
    expect(first('Uebung')).toBe('t:uebung');
    expect(first('schoen')).toBe('t:schoen');
  });
  it('half-typed, written out', () => expect(first('Geschwindigkeitsbeschrae')).toBe('t:limit'));
  it('a real ue is still itself', () => expect(first('Feuer')).toBe('t:feuer'));
  it('the base word still beats its compounds', () => expect(first('haus')).toBe('t:haus'));
});

describe('the two folds', () => {
  it('agree on everything but the umlaut', () => {
    expect(fold('Straße')).toBe(foldDigraph('Straße'));
    expect(fold('Übung')).toBe('ubung');
    expect(foldDigraph('Übung')).toBe('uebung');
  });
});

describe('undigraph — the dictionary’s last retry', () => {
  it('restores each umlaut and keeps the capital', () => {
    expect(undigraph('Geschwindigkeitsbeschraenkung')).toBe('Geschwindigkeitsbeschränkung');
    expect(undigraph('Uebung')).toBe('Übung');
    expect(undigraph('Oel')).toBe('Öl');
  });
  it('leaves a word with no digraph alone', () => expect(undigraph('Haus')).toBe('Haus'));
});
