// Attested inflections: what they add, and what they must never take away.
//
// The matcher has three sources of forms and they are ranked. Lemmas first, so a
// real headword always beats another word's inflection. Then Wiktionary's
// attested tables, because a fact beats a guess. Then the generated rules, which
// still carry everything Wiktionary does not cover — 15% of cards, and every
// card added since the extract was downloaded.
//
// The tests that matter are the negative ones. Adding 21,532 forms to an index
// is an easy way to start claiming the wrong lemma, and a wrong lemma is
// invisible where a miss is not.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { buildMatcher } from './matcher.ts';
import type { Word } from '../types.ts';

const corpus: Word[] = JSON.parse(readFileSync('public/data/vocab.json', 'utf8'));
const FILE = 'public/data/inflections.json';
const have = existsSync(FILE);
const attested: Record<string, string[]> = have ? JSON.parse(readFileSync(FILE, 'utf8')) : {};

const plain = buildMatcher(corpus);
const rich = buildMatcher(corpus, attested);
const hit = (m: ReturnType<typeof buildMatcher>, tok: string) => m.annotate(tok)[0]?.word?.term ?? null;
const card = (term: string) => corpus.find((w) => w.term === term)!;

describe.skipIf(!have)('what the table adds', () => {
  it('resolves the forms the rules were missing', () => {
    // Every one of these came out of `corpus:tokencov` as dark before the table
    // and lights up after it. `hause` is the case that named the seam: the
    // generated dative `-e` rule requires a capitalised token, so a lowercased
    // *hause* missed although *das Haus* is an A1 card.
    for (const [form, lemma] of [
      ['hause', 'das Haus'],
      ['hab', 'haben'],
      ['könne', 'können'],
      ['müsse', 'müssen'],
    ] as const) {
      expect(hit(rich, form), `${form} → ${lemma}`).toBe(lemma);
    }
  });

  it('reaches an irregular comparative, and its declensions through it', () => {
    // *gut → besser* is not derivable by any suffix rule. Putting the degree
    // stems in `adjIndex` — rather than only in the surface index — is what lets
    // suffix-stripping carry the declined forms too, which is why the extractor
    // can drop the 56 rows of regular positive declension.
    expect(hit(rich, 'besser')).toBe('gut');
    expect(hit(rich, 'bessere')).toBe('gut');
    expect(hit(rich, 'besserem')).toBe('gut');
  });

  it('measurably widens the index', () => {
    const sample = ['hause', 'hab', 'könne', 'müsse', 'besser', 'häusern', 'arztes'];
    const before = sample.filter((t) => hit(plain, t)).length;
    const after = sample.filter((t) => hit(rich, t)).length;
    expect(after).toBeGreaterThan(before);
  });
});

describe.skipIf(!have)('what it must not take away', () => {
  it('never lets an attested form outrank a real headword', () => {
    // *bitte* is the imperative of *bitten* and also the noun *die Bitte*;
    // *land* is the imperative of *landen* and also *das Land*. Both facts are
    // true, and 327 such collisions exist in the shipped table — all of them
    // genuine German homographs.
    //
    // The assertion is **agreement with the plain matcher, not a named lemma.**
    // The first version named one, and failed: `Bitte` resolves to the *bitte*
    // card rather than *die Bitte*, because the index is first-wins over corpus
    // order and `bitte` comes first. That predates this change — plain and rich
    // give the identical answer — so asserting the lemma tested the corpus's
    // ordering under the name of a regression guard. What this file is entitled
    // to claim is that adding forms moved nothing.
    for (const term of ['die Bitte', 'das Land', 'die Zahl', 'der Glaube', 'das Bad']) {
      const bare = card(term).term.replace(/^(der|die|das)\s+/i, '');
      expect(hit(rich, bare), `${bare} moved`).toBe(hit(plain, bare));
      // …and the token still belongs to *a* card, capitalised or not.
      expect(hit(rich, bare)).toBeTruthy();
      expect(hit(rich, bare.toLowerCase())).toBeTruthy();
    }
  });

  it('does not hand a verb’s token to a noun that shares it', () => {
    // *Besuchen* really is the dative plural of *der Besuch*. It is also the verb.
    // Attested noun forms join `pluralOnly` exactly as generated plurals do, so
    // the verb reading keeps the token.
    expect(hit(rich, 'besuchen')).toBe('besuchen');
    expect(hit(rich, 'räumen')).toBe('räumen');
  });

  it('changes no answer the rules already got right', () => {
    // The regression guard. Anywhere the plain matcher had an opinion, the rich
    // one must agree — the table is allowed to fill gaps, never to move answers.
    const moved: string[] = [];
    for (const w of corpus.slice(0, 1500)) {
      const bare = w.term.replace(/^(der|die|das)\s+/i, '');
      const a = hit(plain, bare);
      const b = hit(rich, bare);
      if (a && a !== b) moved.push(`${bare}: ${a} → ${b}`);
    }
    expect(moved).toEqual([]);
  });

  it('works at all with no table — the rules are not deleted', () => {
    expect(hit(plain, 'Häuser')).toBe('das Haus');
    expect(hit(buildMatcher(corpus, null), 'Häuser')).toBe('das Haus');
  });
});

describe.skipIf(!have)('the shipped table', () => {
  it('carries no auxiliary rows', () => {
    // `können`'s Wiktionary table lists *haben* under `["auxiliary"]`. Indexing it
    // would make every "haben" in a text resolve to *können*.
    const k = corpus.find((w) => w.term === 'können');
    expect(k && attested[k.id]).toBeTruthy();
    expect(attested[k!.id]).not.toContain('haben');
  });

  it('carries no gender derivations', () => {
    // *Ärztin* is a separate card, not a form of *der Arzt*.
    const arzt = corpus.find((w) => w.term === 'der Arzt')!;
    expect(attested[arzt.id]).toBeTruthy();
    expect(attested[arzt.id]).not.toContain('ärztin');
    expect(attested[arzt.id]).toContain('ärzte');       // the declension is still there
  });

  it('holds only open-class cards', () => {
    // Wiktionary's function-word tables are paradigm tables — `er`'s lists *du*,
    // *es*, *euch* — which produced 566 forms that were another card's headword.
    const byId = new Map(corpus.map((w) => [w.id, w]));
    const open = new Set(['noun', 'verb', 'adjective', 'adverb']);
    for (const id of Object.keys(attested)) {
      expect(open.has(byId.get(id)?.pos ?? '?'), `${byId.get(id)?.term} is closed class`).toBe(true);
    }
  });

  it('never lists the lemma as its own form', () => {
    const byId = new Map(corpus.map((w) => [w.id, w]));
    for (const [id, forms] of Object.entries(attested)) {
      const bare = byId.get(id)!.term.replace(/^(der|die|das)\s+/i, '').toLowerCase();
      expect(forms, byId.get(id)!.term).not.toContain(bare);
    }
  });
});
