import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeForReps, sampleDistractors, shuffleOptions, matchTerm, termWarmth } from '../src/recall.ts';

test('modeForReps: recognition → recall → production ladder', () => {
  assert.equal(modeForReps(0), 'flip');
  assert.equal(modeForReps(1), 'flip');
  assert.equal(modeForReps(2), 'mc');
  assert.equal(modeForReps(3), 'mc');
  assert.equal(modeForReps(4), 'reverse');
  assert.equal(modeForReps(5), 'reverse');
  assert.equal(modeForReps(6), 'type');
  assert.equal(modeForReps(20), 'type');
});

test('sampleDistractors: deterministic, excludes the target, no duplicates', () => {
  const pool = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}` }));
  const a = sampleDistractors(pool, 3, 42, (x) => x.id === 's5');
  const b = sampleDistractors(pool, 3, 42, (x) => x.id === 's5');
  assert.deepEqual(a, b);                                  // same seed → same picks
  assert.equal(a.length, 3);
  assert.ok(!a.some((x) => x.id === 's5'));                // excluded
  assert.equal(new Set(a.map((x) => x.id)).size, 3);       // distinct
  const c = sampleDistractors(pool, 3, 43, (x) => x.id === 's5');
  assert.notDeepEqual(a, c);                               // different seed → (almost surely) different
});

test('sampleDistractors: small pool returns what it can', () => {
  const pool = [{ id: 'a' }, { id: 'b' }];
  assert.equal(sampleDistractors(pool, 3, 1, () => false).length, 2);
});

test('shuffleOptions: contains correct answer at reported index, deterministic', () => {
  const { options, answer } = shuffleOptions('right', ['w1', 'w2', 'w3'], 7);
  assert.equal(options.length, 4);
  assert.equal(options[answer], 'right');
  const again = shuffleOptions('right', ['w1', 'w2', 'w3'], 7);
  assert.deepEqual(options, again.options);
});

test('matchTerm: case-insensitive, umlaut-tolerant, article-optional', () => {
  assert.equal(matchTerm('die Frau', 'die Frau'), true);
  assert.equal(matchTerm('frau', 'die Frau'), true);          // article optional
  assert.equal(matchTerm('Die  FRAU', 'die Frau'), true);     // case + whitespace
  assert.equal(matchTerm('ueberraschen', 'überraschen'), true); // umlaut fallback
  assert.equal(matchTerm('der Frau', 'die Frau'), true);      // wrong article still counts the word
  assert.equal(matchTerm('Mann', 'die Frau'), false);
  assert.equal(matchTerm('', 'die Frau'), false);
});

test('termWarmth: prefix near-miss is warm, unrelated is cold', () => {
  assert.equal(termWarmth('Rahmenbeding', 'die Rahmenbedingungen'), 'warm');
  assert.equal(termWarmth('Haus', 'die Frau'), 'cold');
  assert.equal(termWarmth('', 'die Frau'), 'cold');
});
