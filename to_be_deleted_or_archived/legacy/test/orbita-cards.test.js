// Unit tests for the open-source card-first Orbita (app/orbita-cards.html),
// run against the real shipped code via the shared vm sandbox.
//
//   npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadOrbita } from '../scripts/orbita-sandbox.mjs';

const V = loadOrbita(new URL('../app/orbita-cards.html', import.meta.url));

test('seedDecks: 4 demo decks at boot, never double-seeds', () => {
  const s = V.deckStats();
  assert.ok(s.decks >= 4, `expected >=4 themed decks, got ${s.decks}`);
  assert.ok(s.cards >= 76, `expected >=76 seeded cards, got ${s.cards}`);
  assert.equal(V.seedDecks(), 0, 'a second seed must add nothing');
  assert.equal(V.deckStats().cards, s.cards);
});

test('srsRate (ported SM-2): interval ladder, ease floor, lapse', () => {
  const c = V.newCard({ deckId: 't', front: 'die Aktie', back: 'stock' });
  V.srsRate(c, 2); // Good
  assert.equal(c.reps, 1); assert.equal(c.interval, 1); assert.equal(c.ease, 2.5);
  V.srsRate(c, 2); assert.equal(c.interval, 6);
  V.srsRate(c, 2); assert.equal(c.interval, 15);

  const d = V.newCard({ deckId: 't', front: 'x', back: 'y' });
  V.srsRate(d, 0); // Again
  assert.equal(d.interval, 0); assert.equal(d.lapses, 1); assert.equal(d.status, 'learning');
  for (let i = 0; i < 12; i++) V.srsRate(d, 0);
  assert.equal(d.ease, 1.3, 'ease floored at 1.3');
});

test('cardsDue: interleaves across decks', () => {
  const due = V.cardsDue(Date.now() + 100 * 86400000); // far future -> everything due
  assert.ok(due.length >= 76);
  const firstFour = [...due.slice(0, 4).map(c => c.deckId)];
  assert.ok(new Set(firstFour).size > 1, 'consecutive cards should span multiple decks');
});

test('parsePaste: front—back lines, multiple separators, skips junk', () => {
  const rows = V.parsePaste('die Sonne — the sun\nder Mond - the moon\nfoo=bar\n\nnoseparator');
  assert.equal(rows.length, 3);
  assert.deepEqual({ ...rows[0] }, { front: 'die Sonne', back: 'the sun' });
  assert.deepEqual({ ...rows[1] }, { front: 'der Mond', back: 'the moon' });
  assert.deepEqual({ ...rows[2] }, { front: 'foo', back: 'bar' });
});

test('cefrIndexOf: explicit level wins, else length heuristic', () => {
  assert.equal(V.cefrIndexOf({ level: 'C1', front: 'x' }), 4);
  assert.equal(V.cefrIndexOf({ level: '', front: 'Tag' }), 0);
  assert.ok(V.cefrIndexOf({ front: 'die Wohnungsgeberbestätigung' }) >= 3);
});

test('export / import JSON round-trips (idempotent merge)', () => {
  const json = V.exportJSON();
  const before = V.deckStats().cards;
  const res = V.importJSON(json);
  assert.equal(V.deckStats().cards, before, 're-importing same data adds nothing');
  assert.equal(res.cards, before);
  const parsed = JSON.parse(json);
  assert.ok(Array.isArray(parsed.cards) && Array.isArray(parsed.decks));
});

// ---- Enrichment + A1–C2 -----------------------------------------------------

test('cefrIndexOf: six levels A1–C2 (C2 = 5)', () => {
  assert.equal(V.cefrIndexOf({ level: 'A1' }), 0);
  assert.equal(V.cefrIndexOf({ level: 'C1' }), 4);
  assert.equal(V.cefrIndexOf({ level: 'C2' }), 5);
  assert.ok(V.cefrIndexOf({ level: '', front: 'Tag' }) <= 1);
});

test('cleanWikiMarkup: strips links, templates, bold, sense markers', () => {
  assert.equal(V.cleanWikiMarkup('[[Gebäude]], [[Bau|Bauwerk]]'), 'Gebäude, Bauwerk');
  assert.equal(V.cleanWikiMarkup("''Haus'' {{ugs.}} [1]"), 'Haus');
});

test('parseWiktionary: pulls ipa + the six field groups from wikitext', () => {
  const wt = [
    '=== {{Wortart|Substantiv|Deutsch}} ===',
    '{{Aussprache}}',
    ':{{IPA}} {{Lautschrift|haʊ̯s}}',
    '{{Bedeutungen}}',
    ':[1] zu einem Zweck erbautes [[Gebäude]]',
    '{{Synonyme}}',
    ':[1] [[Gebäude]], [[Bau]]',
    '{{Gegenwörter}}',
    ':[1] [[Freiland]]',
    '{{Charakteristische Wortkombinationen}}',
    ":[1] ein ''Haus'' [[bauen]]",
    '{{Beispiele}}',
    ':[1] Das Haus ist groß.',
    '{{Referenzen}}'
  ].join('\n');
  const p = V.parseWiktionary(wt);
  assert.equal(p.ipa, 'haʊ̯s');
  assert.match(p.definitions[0], /Gebäude/);
  assert.match(p.synonyms[0], /Gebäude/);
  assert.match(p.antonyms[0], /Freiland/);
  assert.match(p.collocations[0], /Haus bauen/);
  assert.match(p.examples[0], /Das Haus ist groß/);
});

test('seedFreqDecks: six A1–C2 frequency decks at boot, never double-seeds', () => {
  const s = V.deckStats();
  assert.ok(s.decks >= 10, `expected >=10 decks (4 themed + 6 levels), got ${s.decks}`);
  assert.ok(s.cards >= 600, `expected >=600 cards, got ${s.cards}`);
  assert.equal(V.seedFreqDecks(), 0, 'a second freq seed must add nothing');
  assert.equal(V.deckStats().decks, s.decks);
  assert.equal(V.deckStats().cards, s.cards);
});
