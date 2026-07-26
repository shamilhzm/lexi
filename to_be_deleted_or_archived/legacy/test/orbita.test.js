// Unit tests for Orbita's riskiest pure logic, run against the real orbita.html
// <script> (loaded via scripts/orbita-sandbox.mjs). These guard the retention
// algorithm and the deck so future refactors can't silently break them.
//
//   npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadOrbita, newCard } from '../scripts/orbita-sandbox.mjs';

const V = loadOrbita();

test('srsCardId normalizes case and whitespace so duplicates dedupe', () => {
  assert.equal(V.srsCardId('vocab', 'de', '  Das   Haus '), 'vocab:de:das haus');
  assert.equal(V.srsCardId('cloze', 'de', 'X'), 'cloze:de:x');
});

test('srsRate: SM-2 interval grows on successive Good ratings', () => {
  const c = newCard();
  V.srsRate(c, 2); // Good
  assert.equal(c.reps, 1);
  assert.equal(c.interval, 1);
  assert.equal(c.status, 'review');
  assert.equal(c.ease, 2.5); // Good leaves ease unchanged
  assert.equal(c.history.length, 1);

  V.srsRate(c, 2); // Good
  assert.equal(c.reps, 2);
  assert.equal(c.interval, 6);

  V.srsRate(c, 2); // Good -> round(6 * 2.5)
  assert.equal(c.reps, 3);
  assert.equal(c.interval, 15);
});

test('srsRate: Again lapses the card and lowers ease, clamped at 1.3', () => {
  const c = newCard();
  V.srsRate(c, 0); // Again
  assert.equal(c.interval, 0);
  assert.equal(c.lapses, 1);
  assert.equal(c.reps, 0);
  assert.equal(c.status, 'learning');
  assert.ok(Math.abs(c.ease - 2.18) < 1e-6, `ease was ${c.ease}`);

  for (let i = 0; i < 10; i++) V.srsRate(c, 0); // hammer Again
  assert.equal(c.ease, 1.3, 'ease must never fall below 1.3');
});

test('srsRate: Hard on the second rep yields a 3-day interval', () => {
  const c = newCard();
  V.srsRate(c, 1); // Hard, first rep -> interval forced to 1
  assert.equal(c.interval, 1);
  V.srsRate(c, 1); // Hard, second rep -> 3
  assert.equal(c.interval, 3);
});

test('srsRate: due date advances by interval days and logs history', () => {
  const c = newCard();
  const t0 = Date.now();
  V.srsRate(c, 3); // Easy, first rep -> interval 1
  assert.equal(c.interval, 1);
  assert.ok(c.due >= t0 + 86400000 - 5000 && c.due <= Date.now() + 86400000 + 5000);
  assert.equal(c.history.length, 1);
  assert.equal(c.history[0].rating, 3);
});

test('cefrIndexOf: explicit level wins, case-insensitive', () => {
  assert.equal(V.cefrIndexOf({ payload: { level: 'A1' } }), 0);
  assert.equal(V.cefrIndexOf({ payload: { level: 'b1' } }), 2);
  assert.equal(V.cefrIndexOf({ payload: { level: 'C1' } }), 4);
  assert.equal(V.cefrIndexOf({ payload: { level: 'C2' } }), 4);
});

test('cefrIndexOf: length heuristic when no explicit level', () => {
  assert.equal(V.cefrIndexOf({ payload: { term: 'Tag' } }), 0); // len 3
  assert.equal(V.cefrIndexOf({ payload: { term: 'der Haus' } }), 0); // strips article -> "Haus"
  assert.equal(V.cefrIndexOf({ payload: { term: 'Donaudampfschifffahrt' } }), 4); // len > 13
  assert.ok(V.cefrIndexOf({ payload: {} }) >= 0); // empty term stays defined
});

test('hashStr: deterministic uint32, case-sensitive', () => {
  const a = V.hashStr('Batterie');
  assert.equal(a, V.hashStr('Batterie'));
  assert.notEqual(a, V.hashStr('batterie'));
  assert.ok(Number.isInteger(a) && a >= 0 && a < 2 ** 32);
});

test('seedDecks: seeded once at boot, never double-seeds', () => {
  const before = V.srsStats('de').total;
  assert.ok(before >= 46, `expected >= 46 seeded cards, got ${before}`);
  assert.equal(V.seedDecks(), 0, 'a second seed must add nothing');
  assert.equal(V.srsStats('de').total, before, 'card count unchanged after re-seed');
});

// ---- Blind Spots (Feature A) --------------------------------------------

test('normalizeBlindspotTag: canonicalizes variants, unknown -> untagged', () => {
  assert.equal(V.normalizeBlindspotTag('Konj-II'), 'konj-ii');
  assert.equal(V.normalizeBlindspotTag('konjunktiv ii'), 'konj-ii');
  assert.equal(V.normalizeBlindspotTag('passive'), 'passiv');
  assert.equal(V.normalizeBlindspotTag('Wortstellung'), 'konnektoren');
  assert.equal(V.normalizeBlindspotTag('kasus-dekl'), 'kasus-dekl');
  assert.equal(V.normalizeBlindspotTag('quantum-physics'), 'untagged');
  assert.equal(V.normalizeBlindspotTag(''), 'untagged');
});

test('blindspotTally: ranks by recent frequency within the window', () => {
  const now = 1000 * 86400000;
  const day = 86400000;
  const events = [
    { tag: 'passiv', ts: now - 1 * day },
    { tag: 'passiv', ts: now - 2 * day },
    { tag: 'konj-ii', ts: now - 3 * day },
    { tag: 'konj-ii', ts: now - 4 * day },
    { tag: 'konj-ii', ts: now - 100 * day }, // outside 30d window
    { tag: 'kasus-dekl', ts: now - 40 * day }, // outside window
  ];
  const tally = V.blindspotTally(events, now, 30);
  // konj-ii: 2 recent / 3 total beats passiv: 2 recent / 2 total on the total tiebreak
  assert.equal(tally[0].tag, 'konj-ii');
  assert.equal(tally[0].recentCount, 2);
  assert.equal(tally[0].count, 3);
  assert.equal(tally.find(t => t.tag === 'passiv').recentCount, 2);
  const kasus = tally.find(t => t.tag === 'kasus-dekl');
  assert.equal(kasus.recentCount, 0);
  assert.equal(kasus.count, 1);
});

test('blindspotTopFocus: <=3, recent only, drops untagged', () => {
  const tally = [
    { tag: 'passiv', recentCount: 5, count: 5 },
    { tag: 'konj-ii', recentCount: 3, count: 3 },
    { tag: 'untagged', recentCount: 9, count: 9 },
    { tag: 'kasus-dekl', recentCount: 1, count: 1 },
    { tag: 'konnektoren', recentCount: 0, count: 4 },
  ];
  assert.deepEqual(V.blindspotTopFocus(tally, 3).map(f => f.tag), ['passiv', 'konj-ii', 'kasus-dekl']);
});

// ---- Vocab capture from definition/example (Feature B) -------------------

test('tokenizeClickable: wraps words >=3 chars, escapes the rest, preserves order', () => {
  const html = V.tokenizeClickable('Der große Hund, ja!');
  const words = [...html.matchAll(/data-w="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(words, ['Der', 'große', 'Hund']); // 'ja' is too short to wrap
  assert.ok(!/data-w="ja"/.test(html));
  assert.ok(V.tokenizeClickable('a & b').includes('&amp;')); // non-word chunks are html-escaped
});

// ---- Vocab decks (Feature C) --------------------------------------------

test('deckOf: explicit deck wins, missing -> General', () => {
  assert.equal(V.deckOf({ deck: 'energy' }), 'energy');
  assert.equal(V.deckOf({ text: 'x' }), 'General');
  assert.equal(V.deckOf({}), 'General');
});

test('groupVocabByDeck: themed first, General last, others alpha; indices preserved', () => {
  const items = [
    { text: 'a', deck: 'Zeitung' },
    { text: 'b' },                 // -> General
    { text: 'c', deck: 'energy' },
    { text: 'd', deck: 'Apfel' },
    { text: 'e', deck: 'energy' },
  ];
  const groups = V.groupVocabByDeck(items);
  // Spread vm-realm arrays into test-realm arrays so deepEqual compares by value.
  assert.deepEqual([...groups.map(g => g.deck)], ['energy', 'Apfel', 'Zeitung', 'General']);
  const energy = groups.find(g => g.deck === 'energy');
  assert.deepEqual([...energy.entries.map(e => e.v.text)], ['c', 'e']);
  assert.deepEqual([...energy.entries.map(e => e.i)], [2, 4]); // original indices for click mapping
  assert.deepEqual([...groups.find(g => g.deck === 'General').entries.map(e => e.v.text)], ['b']);
});

// ---- C1 Lesen module --------------------------------------------------------

test('renderGappedText: splits [[n]], interleaves controls, escapes surrounding text', () => {
  const html = V.renderGappedText('A [[1]] b <x> [[2]].', n => `<i>${n}</i>`);
  assert.ok(html.includes('<i>1</i>') && html.includes('<i>2</i>'));
  assert.ok(html.includes('&lt;x&gt;'));                       // non-gap text is escaped
  assert.ok(html.indexOf('<i>1</i>') < html.indexOf('<i>2</i>')); // order preserved
  assert.equal(V.renderGappedText('no gaps', () => 'X'), 'no gaps');
});

test('lesenScore: item-weighted /100, pass at >=60%', () => {
  const s = V.lesenScore({ teil1: { correct: 6, total: 8 }, teil2: { correct: 5, total: 6 }, teil3: { correct: 3, total: 5 }, teil4: { correct: 4, total: 4 } });
  assert.equal(s.got, 18);
  assert.equal(s.max, 23);
  assert.equal(s.total, Math.round(18 / 23 * 100)); // 78
  assert.equal(s.pass, true);
  const fail = V.lesenScore({ teil1: { correct: 1, total: 8 } });
  assert.equal(fail.pass, false);
  assert.equal(V.lesenScore({}).total, 0);
  assert.equal(V.lesenScore({}).pass, false);
});
