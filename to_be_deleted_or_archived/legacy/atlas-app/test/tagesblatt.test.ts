import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segment, headwordOf, analyze, buildExercises } from '../src/tagesblatt.ts';
import type { Star } from '../src/model.ts';

const star = (id: string, term: string, translation: string, cefr: Star['cefr'], pos?: string): Star =>
  ({ id, term, translation, cefr, category: '', kind: 'word', pos } as Star);

const STARS: Star[] = [
  star('a', 'die Regierung', 'government', 'B1', 'Nomen'),
  star('b', 'das Wetter', 'weather', 'A1', 'Nomen'),
  star('c', 'die Wahl', 'election', 'B1', 'Nomen'),
  star('d', 'die Schule', 'school', 'A1', 'Nomen'),
  star('e', 'der Bericht', 'report', 'A2', 'Nomen'),
  star('f', 'die Kosten', 'costs', 'B1', 'Nomen')
];

const TEXT = 'Die Regierung plant eine neue Wahl. Das Wetter wird morgen besser. Viele Schulen bleiben heute geschlossen, weil die Kosten gestiegen sind.';

test('segment splits news prose into sentences', () => {
  const s = segment(TEXT);
  assert.equal(s.length, 3);
  assert.ok(s[0].startsWith('Die Regierung'));
});

test('headwordOf strips article, plural hint and parenthetical', () => {
  assert.equal(headwordOf('die Regierung'), 'regierung');
  assert.equal(headwordOf('der Bericht, -e'), 'bericht');
  assert.equal(headwordOf('das Gericht (Essen)'), 'gericht');
});

test('analyze matches text words to stars and tracks known-ness', () => {
  const a = analyze(TEXT, STARS, (id) => id === 'b');
  const ids = a.matched.map((m) => m.star.id).sort();
  assert.deepEqual(ids, ['a', 'b', 'c', 'f']);
  const wetter = a.matched.find((m) => m.star.id === 'b')!;
  assert.equal(wetter.known, true);
  // unknown terms sort before known ones
  assert.equal(a.matched[a.matched.length - 1].star.id, 'b');
  assert.ok(a.uncharted.includes('plant') || a.uncharted.includes('geschlossen'));
});

test('buildExercises is deterministic and respects the per-level cap', () => {
  const a = analyze(TEXT, STARS, () => false);
  const x1 = buildExercises(a, STARS, 4);
  const x2 = buildExercises(a, STARS, 4);
  assert.deepEqual(x1, x2);
  for (const [, list] of x1) {
    assert.ok(list.length <= 4);
    for (const e of list) assert.ok(['mc', 'choose', 'order'].includes(e.ex.kind));
  }
  // every level gets something from a 3-sentence text
  assert.ok((x1.get('A2') || []).length > 0);
  assert.ok((x1.get('C1') || []).length > 0);
});
