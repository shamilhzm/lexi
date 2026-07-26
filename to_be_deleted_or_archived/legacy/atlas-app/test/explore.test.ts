import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPLORE_SECTIONS, allExploreDecks, starIdsOf } from '../src/explore-decks.ts';
import { galaxies, allStars, starById, resetModelCache, LEVELS } from '../src/model.ts';
import { setDeckAdded } from '../src/prefs.ts';

test('explore data: well-formed decks (unique ids, valid levels, non-empty cards)', () => {
  const decks = allExploreDecks();
  const ids = new Set(decks.map((d) => d.id));
  assert.equal(ids.size, decks.length, 'deck ids must be unique');
  for (const d of decks) {
    assert.ok(/^xp-[a-z0-9-]+$/.test(d.id), `bad id: ${d.id}`);
    assert.ok(d.cards.length > 0, `deck ${d.id} has no cards`);
    assert.ok((LEVELS as string[]).includes(d.defaultLevel), `deck ${d.id} bad defaultLevel ${d.defaultLevel}`);
    const terms = new Set(d.cards.map((c) => c.de.toLowerCase()));
    assert.equal(terms.size, d.cards.length, `deck ${d.id} has duplicate terms`);
    for (const c of d.cards) {
      assert.ok(c.de.trim().length > 0 && c.en.trim().length > 0, `deck ${d.id}: empty card field`);
    }
  }
  // every section deck appears exactly once across sections
  const sectionDecks = EXPLORE_SECTIONS.flatMap((s) => s.decks.map((d) => d.id));
  assert.equal(sectionDecks.length, new Set(sectionDecks).size, 'a deck appears in two sections');
});

test('explore decks join the galaxy when added, leave when removed', () => {
  const deck = allExploreDecks()[0];
  if (!deck) return; // placeholder data — nothing to integrate yet
  const before = allStars().length;

  setDeckAdded(deck.id, true);
  resetModelCache();
  assert.equal(allStars().length, before + deck.cards.length);
  const star = starById(starIdsOf(deck)[0]);
  assert.ok(star, 'added deck star resolvable by id');
  assert.equal(star!.category, deck.name);
  assert.ok(galaxies().some((g) => g.stars.some((s) => s.id.startsWith(`xp:${deck.id}:`))));

  setDeckAdded(deck.id, false);
  resetModelCache();
  assert.equal(allStars().length, before);
});
