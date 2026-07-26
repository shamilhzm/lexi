import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blindspotTally, blindspotTopFocus, normalizeBlindspotTag, type BlindspotEvent } from '../src/blindspots.ts';

test('normalizeBlindspotTag: canonicalizes synonyms and fuzzy input', () => {
  assert.equal(normalizeBlindspotTag('Konjunktiv II'), 'konj-ii');
  assert.equal(normalizeBlindspotTag('dativ'), 'kasus-dekl');
  assert.equal(normalizeBlindspotTag('passive'), 'passiv');
  assert.equal(normalizeBlindspotTag(undefined), 'untagged');
  assert.equal(normalizeBlindspotTag('something-random'), 'untagged');
});

test('blindspotTally: recency-weighted ranking with a 30-day window', () => {
  const now = Date.UTC(2026, 5, 12);
  const day = 86_400_000;
  const events: BlindspotEvent[] = [
    { tag: 'kasus-dekl', type: 'cloze', ts: now - 2 * day },
    { tag: 'kasus-dekl', type: 'cloze', ts: now - 3 * day },
    { tag: 'konj-ii', type: 'transform', ts: now - 1 * day },
    { tag: 'kasus-dekl', type: 'cloze', ts: now - 90 * day }, // outside window
  ];
  const tally = blindspotTally(events, now);
  const kasus = tally.find((t) => t.tag === 'kasus-dekl')!;
  assert.equal(kasus.count, 3);
  assert.equal(kasus.recentCount, 2); // the 90-day-old one excluded
  assert.equal(tally[0].tag, 'kasus-dekl'); // ranked first by recentCount
  assert.equal(blindspotTopFocus(tally)[0].label, 'Kasus & Deklination');
});
