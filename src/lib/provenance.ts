// Where a card came from, and how common its word actually is.
//
// `provenance.json` has shipped since the corpus pipeline was built — 609 KB
// recording, per card, which source supplied the gloss, the facts and the example,
// how the level was decided, and the word's corpus frequency rank. The app has
// never loaded a byte of it. Three separate findings all reduce to that: a C1
// learner asking "is this word actually used?", and a teacher asking "where did
// this sentence come from, and what does B1 mean here?".
//
// Loaded lazily, exactly like the grammar bank: the file is already deployed, so
// this costs nothing until a learner opens the detail, and nothing at all for the
// ones who never do. Folding the fields into vocab.json instead would have made
// every learner pay for a maintainer's answer on every session.
//
// Two honest limits, both surfaced rather than papered over:
//   - It covers 1,986 of 7,402 cards (27%). The rest predate the provenance log,
//     so most cards have nothing to show and the UI shows nothing.
//   - `levelSource` is "reference" for 98% and `exampleSource` is Tatoeba for
//     99.4%. Per-card those are near-constant and close to noise; what carries
//     information is the *example id*, which is a checkable citation.
import type { CEFR } from '../types.ts';

export interface Provenance {
  id: string;
  lemma: string;
  level: CEFR;
  /** How the CEFR level was decided: a reference word list, or corpus frequency. */
  levelSource: string;
  /** `tatoeba:<sentenceId>` or `wiktextract:<file>`. */
  exampleSource: string;
  glossSource: string;
  factsSource: string;
  fieldSource: string;
  /** Rank in the frequency list — 1 is the commonest word in the corpus. */
  freqRank: number;
}

let cache: Map<string, Provenance> | null = null;
let inflight: Promise<Map<string, Provenance>> | null = null;

/** Load (once) and index the provenance log. Resolves to an empty map if the file
 *  is missing — provenance is a detail view, never a requirement. */
export function loadProvenance(): Promise<Map<string, Provenance>> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  const base = import.meta.env.BASE_URL || '/';
  inflight = fetch(base + 'data/provenance.json')
    .then((r) => r.json() as Promise<Provenance[]>)
    .then((rows) => {
      cache = new Map(rows.map((r) => [r.id, r]));
      return cache;
    })
    .catch(() => {
      cache = new Map();
      return cache;
    });
  return inflight;
}

/** How common a word is, as a band rather than a rank.
 *
 *  A bare "#4,663" invites false precision: the ranks come from one corpus, they
 *  are noisy in the tail, and the difference between 4,600 and 4,900 means nothing
 *  to anyone. The question a learner is actually asking is whether the word is
 *  worth the effort, and a band answers exactly that much. */
export function freqBand(rank: number): { label: string; note: string } | null {
  if (!Number.isFinite(rank) || rank <= 0) return null;
  if (rank <= 500) return { label: 'Very common', note: 'in the 500 most frequent words' };
  if (rank <= 2000) return { label: 'Common', note: 'in the top 2,000' };
  if (rank <= 6000) return { label: 'Moderate', note: 'in the top 6,000' };
  if (rank <= 20000) return { label: 'Uncommon', note: 'outside the top 6,000' };
  return { label: 'Rare', note: 'far down the frequency list' };
}

/** A checkable citation for the example sentence, where one exists.
 *
 *  Tatoeba ids resolve to a public page, which is the difference between claiming
 *  a sentence is sourced and letting a teacher go and look. */
export function exampleCitation(source: string): { label: string; url?: string } | null {
  if (!source) return null;
  const [kind, ref] = source.split(':');
  if (kind === 'tatoeba' && /^\d+$/.test(ref ?? '')) {
    return { label: `Tatoeba #${ref}`, url: `https://tatoeba.org/en/sentences/show/${ref}` };
  }
  if (kind === 'wiktextract') return { label: 'Wiktionary (via Wiktextract)' };
  return { label: source };
}

/** Plain English for how a card's level was decided. */
export function levelBasis(levelSource: string): string {
  if (levelSource === 'reference') return 'placed by a published CEFR word list';
  if (levelSource === 'frequency') return 'estimated from how common the word is';
  return levelSource;
}
