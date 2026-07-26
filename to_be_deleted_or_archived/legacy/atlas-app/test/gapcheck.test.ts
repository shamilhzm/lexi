import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGapItems, scoreGapCheck, GAP_VOCAB_COUNT, type GapAnswer, type GapItem } from '../src/gapcheck.ts';
import { lektionByN } from '../src/curriculum.ts';
import { starsForLesson, allStars } from '../src/model.ts';

const lesson = lektionByN(1)!;
const stars = starsForLesson(1, lesson.grammarStarIds);
const pool = allStars().filter((s) => s.cefr === 'A1');

test('buildGapItems: vocab items + one exercise per grammar point, deterministic', () => {
  const items = buildGapItems(lesson, stars, pool, 7);
  const vocab = items.filter((i) => i.kind === 'vocab');
  const grammar = items.filter((i) => i.kind === 'grammar');
  assert.equal(vocab.length, GAP_VOCAB_COUNT);
  assert.equal(grammar.length, stars.filter((s) => s.kind === 'grammar' && s.exercises?.length).length);
  for (const v of vocab) {
    assert.equal(v.kind, 'vocab');
    if (v.kind !== 'vocab') continue;
    assert.equal(v.options.length, 4);
    assert.equal(new Set(v.options).size, 4, 'options must be distinct');
    assert.ok(v.answer >= 0 && v.answer < 4);
  }
  // Same seed → identical build (resume-safe); different seed → different mix.
  assert.deepEqual(items, buildGapItems(lesson, stars, pool, 7));
  assert.notDeepEqual(items, buildGapItems(lesson, stars, pool, 8));
});

function answers(items: GapItem[], correctVocab: number, correctGrammar: number): GapAnswer[] {
  let v = 0, g = 0;
  return items.map((item) => ({
    item,
    correct: item.kind === 'vocab' ? v++ < correctVocab : g++ < correctGrammar
  }));
}

test('scoreGapCheck: secure needs vocab ≥75% AND grammar ≥70%', () => {
  const items = buildGapItems(lesson, stars, pool, 1);
  const nGram = items.filter((i) => i.kind === 'grammar').length;

  const all = scoreGapCheck(answers(items, GAP_VOCAB_COUNT, nGram));
  assert.equal(all.verdict, 'secure');
  assert.equal(all.correct, all.total);
  assert.equal(all.missedStarIds.length, 0);

  const weakVocab = scoreGapCheck(answers(items, 3, nGram)); // 3/6 = 50%
  assert.equal(weakVocab.verdict, 'gap');
  assert.ok(weakVocab.missedStarIds.length > 0);

  const weakGrammar = scoreGapCheck(answers(items, GAP_VOCAB_COUNT, 0));
  assert.equal(weakGrammar.verdict, nGram ? 'gap' : 'secure');
});

test('scoreGapCheck: a part with no items counts as passed', () => {
  const s = scoreGapCheck([]);
  assert.equal(s.verdict, 'secure');
  assert.equal(s.vocabPct, 1);
  assert.equal(s.grammarPct, 1);
});
