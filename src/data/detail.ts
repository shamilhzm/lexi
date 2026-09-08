// The half of a card the first paint does not need — and the part of *that* the
// first screen does not need either.
//
// `ex`, `def` and `defDe` are 70.1% of the corpus's field bytes and nothing on the
// boot path reads any of them — not a count, not a completion, not a snapshot. They
// ship separately from `cards.json`, which took the blocking fetch from 1,116 KB
// gzipped to 294 KB. See `scripts/corpus/split.ts` for why that split is by field
// rather than by CEFR level.
//
// ## Then a second cut, by level *(2026-09-08)*
//
// One `detail.json` was **857 KB gzipped**, fetched in full on every first visit, on
// every device — 54% of everything a cold boot downloaded. It is now six files, one
// per CEFR level: A1 172 / A2 183 / B1 275 / B2 111 / C1 76 / C2 25 KB gz.
//
// The level split is safe here for exactly the reason it was refused for `cards.json`
// (see `split.ts`): the objection there is that completions ratchet and snapshots
// scan, so a partial corpus writes numbers that cannot be taken back. **Not one of
// those paths reads these three fields** — that is why they could be deferred at all.
// Detail is already optional by contract: a failed fetch leaves cards without
// examples, which every consumer guards for. Something optional can also be partial.
//
// So the app fetches the level it is about to show. An A1 learner's first visit
// drops from 857 KB to 172, and the other five arrive if and when that learner
// reaches them.
//
// ## Attached in place, not served through an accessor
//
// `attachDetail` writes the fields back onto the live `Word` objects in `BY_ID`
// rather than exposing a `detailOf(id)` lookup. That collapses seventeen read sites
// to four, and — the part that actually decides it — keeps `eligibleModes`,
// `clozeExample`, `orderExample` and `drillExample` **synchronous**, because
// `session.ts` calls them inside the synchronous session builder. An accessor would
// have forced that whole path async, and sharding does not change it: a shard that
// has not arrived leaves `w.ex` empty, which is the state those functions already
// handle.
//
// Mutating objects that are already rendered is the obvious objection to this. It is
// already how the module works — `data/index.ts` mutates `w.ex` and `s.group` on the
// same objects — and re-render is driven by the store version rather than by object
// identity, so React never has to notice the difference.
//
// Learner-supplied `usr:` cards carry their own examples inline and are persisted
// whole; there are no rows here for their ids, so they are left alone. That falls
// out of attaching in place, and would have needed an explicit branch otherwise.
import { BY_ID } from './index.ts';
import { notifyLexiconChanged } from '../store.ts';
import type { Example, CEFR } from '../types.ts';

interface DetailRow { def?: string; defDe?: string; ex?: Example[] }

export const DETAIL_LEVELS: readonly CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Which levels have landed. A `Map` to the in-flight promise, so concurrent
 *  callers for the same shard share one fetch — the feed asks per word, and a
 *  scroll can ask twenty times before the first answer arrives. */
const shards = new Map<CEFR, Promise<void>>();
const done = new Set<CEFR>();

/** Has *any* detail landed? Kept for the callers that only ask "is there anything
 *  to render yet", and false rather than blocking. */
export function detailLoaded(): boolean {
  return done.size > 0;
}

/** Has this level's detail landed? */
export function detailLoadedFor(level: CEFR): boolean {
  return done.has(level);
}

/** Merge detail onto the live lexicon. Exported for tests and for any future
 *  incremental path; safe to call more than once. */
export function attachDetail(rows: Record<string, DetailRow>): void {
  for (const [id, d] of Object.entries(rows)) {
    const w = BY_ID.get(id);
    if (!w) continue;
    if (d.def !== undefined) w.def = d.def;
    if (d.defDe !== undefined) w.defDe = d.defDe;
    if (d.ex !== undefined) w.ex = d.ex;
  }
}

/** Fetch and attach one level's shard. Cached, de-duplicated across concurrent
 *  callers, and **never rejects** — a missing or failed fetch leaves those cards
 *  without examples rather than breaking a session. Same contract as
 *  `loadProvenance`, and the same contract the single-file version had.
 *
 *  A failure marks the level done. That is deliberate: retrying on every scroll
 *  of a feed that cannot reach the network is a request storm on top of an outage,
 *  and the app is fully usable without examples. The next launch tries again. */
export function loadDetailLevel(level: CEFR): Promise<void> {
  const existing = shards.get(level);
  if (existing) return existing;
  const base = import.meta.env.BASE_URL || '/';
  const p = fetch(`${base}data/detail/${level}.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, DetailRow>>) : {}))
    .then((rows) => {
      attachDetail(rows);
      done.add(level);
      // The parsed map is deliberately not retained: nothing queries it once the
      // fields are on the cards, and holding it would double the memory for the
      // heaviest thing the app loads.
      notifyLexiconChanged();
    })
    .catch(() => { done.add(level); });
  shards.set(level, p);
  return p;
}

/** Fetch whatever levels these cards need, and nothing else.
 *
 *  This is the call site shape that makes the split worth having: the feed passes
 *  the words it is about to show, the session passes its queue, and each of them
 *  ends up asking for one or two shards rather than all six. Already-loaded levels
 *  cost nothing — no fetch, and a resolved promise. */
export function loadDetailFor(words: Iterable<{ level?: CEFR }>): Promise<void> {
  const want = new Set<CEFR>();
  for (const w of words) if (w.level && !done.has(w.level)) want.add(w.level);
  if (want.size === 0) return Promise.resolve();
  return Promise.all([...want].map(loadDetailLevel)).then(() => undefined);
}

/** Every level, for the surfaces that genuinely range over the whole corpus — the
 *  word map, a full-corpus export. Sequential rather than parallel: six fetches at
 *  once on a phone is 842 KB of contention against whatever the learner is actually
 *  doing, and nothing here is urgent by definition. */
export async function loadAllDetail(): Promise<void> {
  for (const level of DETAIL_LEVELS) await loadDetailLevel(level);
}

/** Test seam — forget what was loaded. */
export function resetDetail(): void {
  shards.clear();
  done.clear();
}
