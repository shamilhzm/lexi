// The client and the build script have to agree about two things, and neither
// disagreement throws — they just quietly look in the wrong file and report
// "not in the dictionary", which is the one answer this layer must never give
// by accident.
//
//   1. the folding rule, which decides the key
//   2. the shard boundaries, which decide the file
//
// So this reads the *shipped* shards off disk and checks the client's arithmetic
// against them, rather than against a fixture that cannot go stale.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fold, exact } from './lexicon.ts';

const DIR = 'public/data/lex';
const have = existsSync(`${DIR}/index.json`);
const manifest: { n: number; forms: number; bounds: string[] } =
  have ? JSON.parse(readFileSync(`${DIR}/index.json`, 'utf8')) : { n: 0, forms: 0, bounds: [] };
const shard = (i: number) => JSON.parse(readFileSync(`${DIR}/${i}.json`, 'utf8')) as
  { e: { w: string; p: string; g: string[]; x?: string; i?: string; f?: string[] }[]; f: Record<string, string> };

/** The same binary search `lookupLex` uses, duplicated here so the test fails on
 *  a boundary bug rather than importing the bug. */
function shardFor(bounds: string[], key: string): number {
  let lo = 0, hi = bounds.length - 1, best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bounds[mid] <= key) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}

describe.skipIf(!have)('the shipped lexicon', () => {
  it('is big enough to be worth the name', () => {
    expect(manifest.n).toBeGreaterThan(80_000);
    expect(manifest.forms).toBeGreaterThan(200_000);
    expect(manifest.bounds.length).toBeGreaterThan(50);
  });

  it('has sorted, unique bounds — the binary search assumes both', () => {
    const sorted = [...manifest.bounds].sort();
    expect(manifest.bounds).toEqual(sorted);
    // Unique matters more than it looks: the search takes the *rightmost* bound
    // at or below the key, so a repeated bound makes an entire shard
    // unreachable. The build packs whole folded-key groups to guarantee it.
    expect(new Set(manifest.bounds).size).toBe(manifest.bounds.length);
  });

  it('never splits one folded key across two shards', () => {
    // If `hauser` and `häuser` landed either side of a cut, the client would
    // fold the query, pick one file, and the answer would be in the other — a
    // miss indistinguishable from "not in the dictionary".
    for (const i of [0, 5, Math.floor(manifest.bounds.length / 2), manifest.bounds.length - 1]) {
      const sh = shard(i);
      const lo = manifest.bounds[i];
      const hi = manifest.bounds[i + 1];
      for (const w of [...sh.e.map((e) => e.w), ...Object.keys(sh.f)]) {
        const f = fold(w);
        expect(f >= lo, `${w} (${f}) below its shard's bound ${lo}`).toBe(true);
        if (hi) expect(f < hi, `${w} (${f}) at or past the next bound ${hi}`).toBe(true);
      }
    }
  });

  it('routes every entry in a sampled shard back to that same shard', () => {
    // The round trip that matters: build put this word here, so the client's
    // fold + search must send a query for it here too.
    for (const i of [0, 1, Math.floor(manifest.bounds.length / 2), manifest.bounds.length - 1]) {
      const sh = shard(i);
      for (const e of sh.e.slice(0, 40)) {
        expect(shardFor(manifest.bounds, fold(e.w)), `${e.w} in shard ${i}`).toBe(i);
      }
      // Pointer keys are *exact* — umlauts kept — while the bounds are folded,
      // so routing one has to fold it first. Getting this wrong in the test is
      // the same mistake the client would make, which is why it is spelled out.
      for (const k of Object.keys(sh.f).slice(0, 40)) {
        expect(shardFor(manifest.bounds, fold(k)), `pointer ${k} in shard ${i}`).toBe(i);
      }
    }
  });

  it('answers the words the corpus was measured to be missing', () => {
    // Every one of these came out of `corpus:dictcheck` as a hole in vocab.json.
    // They are the reason this layer exists, so they are the test.
    const want: Record<string, string> = {
      Schadenfreude: 'malicious', Wimper: 'eyelash', Spaß: 'fun',
      Gott: 'god', Klobürste: 'toilet brush', Löwenzahn: 'dandelion',
    };
    for (const [word, expected] of Object.entries(want)) {
      const key = fold(word);
      const sh = shard(shardFor(manifest.bounds, key));
      const hit = sh.e.find((e) => fold(e.w) === key);
      expect(hit, `${word} is in the lexicon`).toBeTruthy();
      expect(hit!.g.join(' ').toLowerCase(), word).toContain(expected);
    }
  });

  it('resolves an inflection to the right lemma, not merely to something', () => {
    // **This test used to pass while the app was wrong.** It asserted "either the
    // word is here or an arrow points somewhere", and for `Häuser` the first
    // branch was true — the folded key `hauser` matched the surname *Hauser*, so
    // looking up the plural of *Haus* answered "housekeeper". An assertion that
    // accepts any answer cannot catch a wrong one; this one names the lemma.
    for (const [form, lemma] of [['Häuser', 'Haus'], ['ging', 'gehen'], ['Kinder', 'Kind'], ['Bücher', 'Buch']]) {
      const sh = shard(shardFor(manifest.bounds, fold(form)));
      const direct = sh.e.find((e) => exact(e.w) === exact(form));
      const arrow = sh.f[exact(form)];
      expect(direct?.w ?? arrow, `${form} should resolve to ${lemma}`).toBeTruthy();
      expect(exact(arrow ?? direct!.w), `${form} → ${lemma}`).toBe(exact(lemma));
    }
  });

  it('resolves a two-step spelling chain', () => {
    // Grusse → Gruss → Gruß. Flattened, so one hop reaches the entry.
    const sh = shard(shardFor(manifest.bounds, fold('Grusse')));
    expect(exact(sh.f['grusse'] ?? '')).toBe(exact('Gruß'));
  });

  it('keeps a form and a colliding headword apart', () => {
    // The collision that caused the bug, pinned so it cannot come back: both
    // spellings live in the same shard, both are findable, and they are not the
    // same row.
    const sh = shard(shardFor(manifest.bounds, fold('Hauser')));
    expect(sh.e.some((e) => exact(e.w) === 'hauser'), 'the surname Hauser is an entry').toBe(true);
    expect(sh.f['häuser'], 'and häuser still points at Haus').toBe('Haus');
  });

  it('points every arrow at a real entry, in one hop', () => {
    // Chains are flattened at build time so the client never needs a second hop:
    // *Grusse* is a form of *Gruss* which is an alternative spelling of *Gruß*,
    // and the client following only the first arrow found nothing at all.
    for (const i of [0, 11, Math.floor(manifest.bounds.length / 2), manifest.bounds.length - 1]) {
      const sh = shard(i);
      for (const [k, lemma] of Object.entries(sh.f).slice(0, 30)) {
        const target = shard(shardFor(manifest.bounds, fold(lemma)));
        expect(target.e.some((e) => exact(e.w) === exact(lemma)), `${k} → ${lemma} lands nowhere`).toBe(true);
      }
    }
  });

  it('never points a form at itself', () => {
    // A self-referential arrow is the one shape that could loop the single hop.
    for (const i of [0, 7, Math.floor(manifest.bounds.length / 2)]) {
      const sh = shard(i);
      for (const [k, lemma] of Object.entries(sh.f)) {
        expect(exact(lemma), `${k} points at itself`).not.toBe(k);
      }
    }
  });

  it('keeps entries small — this ships to a phone', () => {
    const sh = shard(3);
    for (const e of sh.e) {
      expect(e.g.length).toBeLessThanOrEqual(3);
      for (const g of e.g) expect(g.length).toBeLessThanOrEqual(160);
      expect(e.f?.length ?? 0).toBeLessThanOrEqual(4);
    }
  });
});

describe('the two keys', () => {
  it('fold strips umlauts, so a keyboard without them still finds the word', () => {
    expect(fold('Häuser')).toBe('hauser');
    expect(fold('Spaß')).toBe('spass');
    expect(fold('Grüße')).toBe('grusse');
  });

  it('exact keeps them, so two different words stay two different words', () => {
    expect(exact('Häuser')).toBe('häuser');
    expect(exact('Hauser')).toBe('hauser');
    expect(exact('Häuser')).not.toBe(exact('Hauser'));
    // …while still folding to the same shard, which is the whole arrangement.
    expect(fold('Häuser')).toBe(fold('Hauser'));
  });

  it('both drop everything that is not a letter or a digit', () => {
    expect(exact('zu Hause')).toBe('zuhause');
    expect(fold('E-Mail')).toBe('email');
    expect(exact('  Haus!  ')).toBe('haus');
  });
});
