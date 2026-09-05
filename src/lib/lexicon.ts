// The lookup layer — the half of Lexi that is a dictionary.
//
// ## What it is, and what it is deliberately not
//
// `data/index.ts` loads the **corpus**: 6,520 cards Lexi teaches, every one
// machine-verified by `authoring:new`, carrying a level, a sector, an example and
// an FSRS schedule. This loads the **lexicon**: ~93,000 headwords Lexi can
// *answer*, imported wholesale from Wiktionary and gated only on having a gloss.
//
// The two must never look alike on screen. An entry makes one claim —
// "Wiktionary says this means that" — which needs no gate because it is not a
// teaching claim. The moment an unverified gloss can be drilled, the thing that
// makes the corpus worth trusting is gone. See docs/DICTIONARY.md.
//
// ## Nothing is loaded until somebody asks
//
// The lexicon is 18.7 MB across 225 shards of ~85 KB. Loading it at boot would
// trade the app's first paint for a feature most sessions never touch, so a
// lookup fetches exactly one file and a learner who never searches downloads
// none of them. Shards are cached in memory for the session; the service worker
// keeps whichever ones have been visited, which is an honest offline story —
// the words you have looked at, not the dictionary.
//
// ## Why the shards are numbered rather than named
//
// `bounds[i]` is the first folded key in shard *i*, so shard *i* holds every key
// from `bounds[i]` up to `bounds[i+1]` and a lookup is a binary search over a
// sorted array of strings. The build script packs them greedily to 1,500 rows
// each — perfectly even, 225 files — where prefix-named shards came out at 2,474
// files with a median of 28 rows. The boundary is an arbitrary German substring;
// filenames are not the place to discover that.

/** One dictionary entry. Short keys because there are 93,000 of them and the
 *  difference is megabytes. Mirrors the `Entry` written by
 *  `scripts/corpus/lexicon.ts` — the two have to move together. */
export interface LexEntry {
  /** headword, as written */         w: string;
  /** part of speech */               p: string;
  /** glosses, first sense first */   g: string[];
  /** der/die/das, nouns only */      x?: string;
  /** IPA */                          i?: string;
  /** a few notable inflections */    f?: string[];
}

interface Shard { e: LexEntry[]; f: Record<string, string> }
interface Manifest { n: number; forms: number; bounds: string[] }

/** **Two keys, and the exact one wins.**
 *
 *  `exact` keeps umlauts and is what an answer is matched on. `fold` strips them
 *  and decides which file to look in, and is only ever a last-resort match.
 *
 *  The distinction is not fussiness. The first version matched on the folded key
 *  alone, and looking up *Häuser* answered **"der Hauser — housekeeper"**: the
 *  plural of *Haus* folds onto a real and unrelated surname. Folding is how a
 *  keyboard without umlauts reaches a word; it is not what a word *is*.
 *
 *  Both must match `exact()` and `fold()` in `scripts/corpus/lexicon.ts` — the
 *  shard boundaries were computed with them, and a divergence does not throw, it
 *  silently looks in the wrong file. */
export function exact(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
}
export function fold(word: string): string {
  return exact(word)
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

const base = () => (import.meta.env.BASE_URL || '/') + 'data/lex/';

let manifest: Manifest | null = null;
let manifestP: Promise<Manifest | null> | null = null;
const shards = new Map<number, Promise<Shard | null>>();

/** Load the manifest once. Returns null rather than throwing when the lexicon is
 *  not deployed — the app has to keep working with only the corpus, which is
 *  what it did before this file existed. */
async function loadManifest(): Promise<Manifest | null> {
  if (manifest) return manifest;
  manifestP ??= fetch(base() + 'index.json')
    .then((r) => (r.ok ? r.json() as Promise<Manifest> : null))
    .then((m) => { manifest = m; return m; })
    .catch(() => null);
  return manifestP;
}

/** Which shard holds this key. Rightmost bound that is <= key. */
function shardFor(bounds: string[], key: string): number {
  let lo = 0, hi = bounds.length - 1, best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bounds[mid] <= key) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}

async function loadShard(i: number): Promise<Shard | null> {
  let p = shards.get(i);
  if (!p) {
    p = fetch(`${base()}${i}.json`)
      .then((r) => (r.ok ? r.json() as Promise<Shard> : null))
      .catch(() => null);
    shards.set(i, p);
  }
  return p;
}

/** How many headwords the dictionary holds, once the manifest is in. 0 until
 *  then, so copy that prints it should check. */
export function lexiconSize(): number { return manifest?.n ?? 0; }

/** Warm the manifest without fetching any shard — one small request, so the
 *  first real lookup is a single round-trip rather than two. */
export function primeLexicon(): void { void loadManifest(); }

/**
 * Look a German word up in the dictionary layer.
 *
 * Returns every entry for the headword — a word is often several parts of speech
 * — or an empty array. An inflected form resolves through the pointer map: the
 * shard fetched for `Häuser` already contains the arrow to *Haus*, because
 * pointers are filed under the *form's* own folded key rather than the lemma's.
 *
 * `via` names the form that got here when the answer came through an arrow, so
 * the UI can say *Häuser → das Haus* instead of silently answering a different
 * question than the one that was typed.
 */
export async function lookupLex(term: string): Promise<{ entries: LexEntry[]; via?: string }> {
  const ek = exact(term);
  const fk = fold(term);
  if (!ek) return { entries: [] };
  const m = await loadManifest();
  if (!m) return { entries: [] };

  const shard = await loadShard(shardFor(m.bounds, fk));
  if (!shard) return { entries: [] };

  // 1. The word itself, spelled the way it was typed.
  const exactHits = shard.e.filter((e) => exact(e.w) === ek);
  if (exactHits.length) return { entries: exactHits };

  // 2. An inflection of it, resolved through the arrow filed under that exact
  //    spelling. One hop, never two: a pointer chain is a data bug rather than a
  //    language feature, and following it far enough to notice is how a lookup
  //    becomes a loop on somebody's phone.
  const hop = async (lemma: string) => {
    const lk = exact(lemma);
    const lf = fold(lemma);
    const target = lf === fk ? shard : await loadShard(shardFor(m.bounds, lf));
    const found = target?.e.filter((e) => exact(e.w) === lk) ?? [];
    return found.length ? { entries: found, via: term } : null;
  };
  if (shard.f[ek]) { const r = await hop(shard.f[ek]); if (r) return r; }

  // 3. Only now, the folded fallback — someone typing `Hauser` for `Häuser` on a
  //    keyboard without umlauts. Last because it is the step that can answer a
  //    different question than the one asked.
  const near = shard.e.filter((e) => fold(e.w) === fk);
  if (near.length) return { entries: near };
  const arrowKey = Object.keys(shard.f).find((k) => fold(k) === fk);
  if (arrowKey) { const r = await hop(shard.f[arrowKey]); if (r) return r; }

  return { entries: [] };
}
