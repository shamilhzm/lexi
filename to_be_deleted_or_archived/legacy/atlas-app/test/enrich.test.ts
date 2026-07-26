import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWiktionary, cleanWikiMarkup, termOf } from '../src/enrich.ts';

test('cleanWikiMarkup: strips links, templates, bold, sense markers', () => {
  assert.equal(cleanWikiMarkup('[[Gebäude]], [[Bau|Bauwerk]]'), 'Gebäude, Bauwerk');
  assert.equal(cleanWikiMarkup("''Haus'' {{ugs.}} [1]"), 'Haus');
});

test('termOf: strips the article', () => {
  assert.equal(termOf('die Aktie'), 'Aktie');
  assert.equal(termOf('arbeiten'), 'arbeiten');
});

test('cleanWikiMarkup: drops empty parens and stray separators', () => {
  assert.equal(cleanWikiMarkup('eine {{u}}Voraussetzung ()'), 'eine Voraussetzung');
  assert.equal(cleanWikiMarkup(', [[Bau]] ,'), 'Bau');
});

test('parseWiktionary: splits synonym/antonym word-lists into individual chips', () => {
  const wt = [
    '{{Synonyme}}', ':[1] [[Bedingung]], [[Erfordernis]]; [[Prämisse]]',
    '{{Gegenwörter}}', ':[1] [[Folge]] oder [[Resultat]]',
    '{{Charakteristische Wortkombinationen}}', ':[1] unter der Voraussetzung, dass'
  ].join('\n');
  const p = parseWiktionary(wt);
  assert.deepEqual(p.synonyms, ['Bedingung', 'Erfordernis', 'Prämisse']);
  assert.deepEqual(p.antonyms, ['Folge', 'Resultat']);
  // collocations keep their internal comma (one phrase, not split)
  assert.equal(p.collocations[0], 'unter der Voraussetzung, dass');
});

test('parseWiktionary: splits a comma-joined list of multi-word collocations', () => {
  const wt = [
    '{{Charakteristische Wortkombinationen}}',
    ':[1] eine notwendige Voraussetzung, eine wesentliche Voraussetzung',
    ':[2] unter der Voraussetzung, dass'
  ].join('\n');
  const p = parseWiktionary(wt);
  // first line is a genuine list → split; second is one phrase → kept whole
  assert.deepEqual(p.collocations, [
    'eine notwendige Voraussetzung',
    'eine wesentliche Voraussetzung',
    'unter der Voraussetzung, dass'
  ]);
});

test('parseWiktionary: extracts ipa + the field groups', () => {
  const wt = [
    '{{Aussprache}}', ':{{IPA}} {{Lautschrift|haʊ̯s}}',
    '{{Bedeutungen}}', ':[1] zu einem Zweck erbautes [[Gebäude]]',
    '{{Synonyme}}', ':[1] [[Gebäude]], [[Bau]]',
    '{{Gegenwörter}}', ':[1] [[Freiland]]',
    '{{Charakteristische Wortkombinationen}}', ":[1] ein ''Haus'' [[bauen]]",
    '{{Beispiele}}', ':[1] Das Haus ist groß.', '{{Referenzen}}'
  ].join('\n');
  const p = parseWiktionary(wt);
  assert.equal(p.ipa, 'haʊ̯s');
  assert.match(p.definitions[0], /Gebäude/);
  assert.match(p.antonyms[0], /Freiland/);
  assert.match(p.collocations[0], /Haus bauen/);
  assert.match(p.examples[0], /Das Haus ist groß/);
});
