// Attested inflections, fetched in the background.
//
// ## Why this is not part of the boot fetch
//
// `matcher.ts` generates inflections from rules, and `scripts/corpus/inflections.ts`
// extracts the ones Wiktionary attests — 21,532 forms across 5,000 cards, 370 KB.
// That is small, and it is still not worth putting on the boot path: nothing on
// the feed uses the matcher. It is built lazily by `appMatcher()`, on the first
// reading-meter or typed-answer call, which on most sessions never happens.
//
// So the file is requested *after* first paint and the matcher rebuilds itself
// when it lands — the same self-invalidating pattern `appMatcher` already uses
// for a lexicon that grows after boot, rather than a second rule for everyone to
// remember.
//
// ## Failing to load is a supported outcome
//
// If the fetch fails the matcher keeps its generated forms and the app behaves
// exactly as it did before this file existed. That is the whole reason the rules
// stay: attestation is an improvement on a working system, not a dependency of
// one.

/** cardId → the inflected forms Wiktionary attests for it, lowercased. */
export type Inflections = Record<string, string[]>;

let table: Inflections | null = null;
let version = 0;
let started = false;

/** What is loaded, or null. Callers must work when it is null. */
export function inflections(): Inflections | null { return table; }

/** Bumped once, when the table arrives. `appMatcher` watches this to know its
 *  index is stale — an index built before the forms landed is not wrong, just
 *  poorer, so there is nothing to invalidate eagerly. */
export function inflectionsVersion(): number { return version; }

/** Fetch once per session, after first paint. Safe to call repeatedly. */
export function loadInflections(): void {
  if (started) return;
  started = true;
  const base = import.meta.env.BASE_URL || '/';
  fetch(base + 'data/inflections.json')
    .then((r) => (r.ok ? r.json() as Promise<Inflections> : null))
    .then((t) => { if (t) { table = t; version++; } })
    .catch(() => { /* the generated forms are still there */ });
}

/** Tests swap the table directly; production never does. */
export function setInflections(t: Inflections | null) { table = t; version++; }
