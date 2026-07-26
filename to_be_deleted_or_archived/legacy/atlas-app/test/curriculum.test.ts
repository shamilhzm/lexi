import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEKTIONEN, LESSON_LEVELS, lektionByN, lessonsFor } from '../src/curriculum.ts';
import { LESSON_TAGS } from '../src/lessonmap.ts';
import { starById, allStars } from '../src/model.ts';

test('curriculum: 30 Lektionen with stable numbering and level bands', () => {
  assert.equal(LEKTIONEN.length, 30);
  const ns = LEKTIONEN.map((l) => l.n).sort((a, b) => a - b);
  assert.deepEqual(ns, Array.from({ length: 30 }, (_, i) => i + 1));
  for (const l of LEKTIONEN) {
    const band = l.n <= 8 ? 'A1' : l.n <= 18 ? 'A2' : 'B1';
    assert.equal(l.cefr, band, `Lektion ${l.n} should be ${band}`);
    assert.ok(l.title.length > 0 && l.short.length > 0);
    assert.equal(l.subsections.length, 3);
    assert.ok(l.grammatik.length > 0, `Lektion ${l.n} needs grammar topics`);
    assert.ok(l.felder.length > 0, `Lektion ${l.n} needs vocab fields`);
  }
  assert.deepEqual(LESSON_LEVELS.A1, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(LESSON_LEVELS.B1.length, 12);
  assert.equal(lektionByN(7)?.cefr, 'A1');
  assert.equal(lessonsFor('A2').length, 10);
});

test('curriculum: every Lektion has Redemittel and at least one grammar table', () => {
  for (const l of LEKTIONEN) {
    assert.ok(l.redemittel.length >= 2, `Lektion ${l.n} needs Redemittel`);
    for (const r of l.redemittel) assert.ok(r.situation && r.a, `Lektion ${l.n}: malformed Redemittel`);
    assert.ok((l.tables?.length ?? 0) >= 1, `Lektion ${l.n} needs a grammar table`);
    for (const t of l.tables!) {
      assert.ok(t.head.length > 0, `Lektion ${l.n}: table "${t.title}" has no head`);
      for (const row of t.rows) assert.equal(row.length, t.head.length, `Lektion ${l.n}: table "${t.title}" row width mismatch`);
    }
  }
});

test('curriculum: every grammarStarIds entry resolves to a real grammar star', () => {
  for (const l of LEKTIONEN) {
    for (const id of l.grammarStarIds) {
      const s = starById(id);
      assert.ok(s, `Lektion ${l.n}: unresolved grammar star "${id}"`);
      assert.equal(s!.kind, 'grammar', `Lektion ${l.n}: "${id}" is not a grammar star`);
    }
  }
});

test('lessonmap: every tag resolves and matches the lesson level', () => {
  for (const id in LESSON_TAGS) {
    const tag = LESSON_TAGS[id];
    const star = starById(id);
    assert.ok(star, `tagged star does not exist: "${id}"`);
    const lesson = lektionByN(tag.lektion);
    assert.ok(lesson, `tag points at missing Lektion ${tag.lektion} (star "${id}")`);
    assert.equal(star!.cefr, lesson!.cefr, `level mismatch: ${id} (${star!.cefr}) → Lektion ${tag.lektion} (${lesson!.cefr})`);
  }
});

test('lessonmap: tags are applied onto stars and every A1–B1 lesson has content', () => {
  const tagged = allStars().filter((s) => s.lektion);
  assert.ok(tagged.length >= 200, `expected broad tagging, got ${tagged.length}`);
  for (let n = 1; n <= 30; n++) {
    const stars = allStars().filter((s) => s.lektion === n);
    assert.ok(stars.length >= 3, `Lektion ${n} has only ${stars.length} tagged stars`);
  }
});

// FSRS survival: these id strings are persisted in localStorage review state.
// They derive from grammar point titles — renaming a title breaks them.
const LEGACY_GRAMMAR_IDS = [
  'gram-A1:artikel-&-genus', 'gram-A1:sein-&-haben', 'gram-A1:präsens-(regelmäßig)',
  'gram-A2:perfekt', 'gram-A2:modalverben', 'gram-A2:akkusativ', 'gram-A2:trennbare-verben', 'gram-A2:imperativ',
  'gram-B1:dativ', 'gram-B1:konjunktiv-ii-(würde)', 'gram-B1:nebensätze-(weil/dass)', 'gram-B1:genitiv', 'gram-B1:komparativ-&-superlativ',
  'gram-B2:passiv', 'gram-B2:adjektivdeklination', 'gram-B2:konnektoren-(deshalb/trotzdem)', 'gram-B2:relativsätze',
  'gram-C1:konjunktiv-i-(indirekte-rede)', 'gram-C1:partizipialattribute', 'gram-C1:funktionsverbgefüge',
  'gram-C2:modalpartikeln', 'gram-C2:nominalstil'
];
test('model: legacy grammar star ids are pinned (FSRS state must survive)', () => {
  for (const id of LEGACY_GRAMMAR_IDS) assert.ok(starById(id), `legacy id missing: "${id}"`);
});

test('model: legacy deck/freq id schemes are intact', () => {
  assert.ok(starById('freq-A1:der Mann'));
  assert.ok(starById('finanz:die Aktie'));
  assert.ok(starById('rad:das Rennrad'));
});
