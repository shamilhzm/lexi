// The half of a card the first paint does not need.
//
// `ex`, `def` and `defDe` are 70.1% of the corpus's field bytes and nothing on the
// boot path reads any of them — not a count, not a completion, not a snapshot. They
// now ship in `detail.json` and arrive after the app is interactive, which takes the
// blocking fetch from 1,126 KB gzipped to 308 KB. See `scripts/corpus/split.ts` for
// why the split is by field rather than by CEFR level.
//
// ## Attached in place, not served through an accessor
//
// `loadDetail()` writes the fields back onto the live `Word` objects in `BY_ID`
// rather than exposing a `detailOf(id)` lookup. That collapses seventeen read sites
// to four, and — the part that actually decides it — keeps `eligibleModes`,
// `clozeExample`, `orderExample` and `drillExample` **synchronous**, because
// `session.ts` calls them inside the synchronous session builder. An accessor would
// have forced that whole path async.
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
import type { Example } from '../types.ts';

interface DetailRow { def?: string; defDe?: string; ex?: Example[] }

let attached = false;
let inflight: Promise<void> | null = null;

/** Has the detail landed? Synchronous, and `false` rather than blocking — callers
 *  that need it await `loadDetail()`; callers that can degrade just render less. */
export function detailLoaded(): boolean {
  return attached;
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
  attached = true;
}

/** Fetch and attach the detail sidecar. Cached, de-duplicated across concurrent
 *  callers, and **never rejects** — a missing or failed fetch leaves cards without
 *  examples, which every consumer already guards for, rather than breaking a
 *  session. Same contract as `loadProvenance`. */
export function loadDetail(): Promise<void> {
  if (attached) return Promise.resolve();
  if (inflight) return inflight;
  const base = import.meta.env.BASE_URL || '/';
  inflight = fetch(base + 'data/detail.json')
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, DetailRow>>) : {}))
    .then((rows) => {
      attachDetail(rows);
      // The parsed map is deliberately not retained: nothing queries it once the
      // fields are on the cards, and holding it would double the memory for the
      // heaviest thing the app loads.
      notifyLexiconChanged();
    })
    .catch(() => { attached = true; });
  return inflight;
}

/** Test seam — forget that detail was loaded. */
export function resetDetail(): void {
  attached = false;
  inflight = null;
}
