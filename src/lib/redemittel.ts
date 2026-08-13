// Redemittel — the phrases that do the work of speaking.
//
// Every DaF course ends a chapter with a box of them: *Ich würde sagen, dass …*,
// *Das kommt darauf an*, *Widersprechen, ohne unhöflich zu werden*. They are
// formulaic sequences, they are most of what fluency actually is above A2, and
// they are the thing a learner reaches for when a sentence has to start.
//
// ## The finding, corrected
//
// [PEDAGOGY](../../docs/PEDAGOGY.md) said Lexi had almost none — "152 phrase
// cards, 2.3% of the corpus". That measured the *card corpus* and missed where
// the content actually lives: **129 Redemittel across 27 groups already ship**,
// authored to a high standard, inside the exam speaking labs. *"Widersprechen,
// ohne unhöflich zu werden"*, *"Nachgeben, ohne einzuknicken"*, *"Zahlen deuten,
// nicht vorlesen"* — this is better functional material than most textbooks
// print.
//
// The real defect is what happens to it: **nothing schedules it.** `redemittel`
// appears in the exam data, `Speaking.tsx` and `Exam.tsx`, and nowhere else — no
// `review()`, no FSRS card, no id. A learner meets these three levels deep inside
// `#/exam`, reads them once, and the app that exists to make things stick does
// not make these stick.
//
// So this module does not author phrases. It gives the ones that exist an
// identity the rest of the app can act on.
//
// ## Ids are content-keyed, deliberately
//
// `red:<level>:<german>` rather than a position. The `gex:` ids are
// `<level>:<pointIndex>:<exerciseIndex>` and that is a live hazard in the backlog
// — reordering a paper's groups would silently re-point every learner's schedule.
// A phrase's own text is stable in a way its position in a list is not, which is
// the same reasoning `gram:<level>:<title>` cards already use.
import type { CEFR, Word } from '../types.ts';
import type { Redemittel } from './exam.ts';

/** One phrase, with the function it performs and an id the scheduler can hold. */
export interface RedemittelCard {
  id: string;
  /** The communicative function — "Widersprechen, ohne unhöflich zu werden". */
  group: string;
  de: string;
  en: string;
  level: CEFR;
}

/** Where the phrases live. Loaded on demand, because the speaking modules also
 *  carry the topics and model answers, and nothing on the boot path wants those. */
const SOURCES: { level: CEFR; load: () => Promise<Redemittel[]> }[] = [
  { level: 'A1', load: () => import('../data/exams/goethe-a1-speaking.ts').then((m) => m.A1_REDEMITTEL) },
  { level: 'A2', load: () => import('../data/exams/goethe-a2-speaking.ts').then((m) => m.A2_REDEMITTEL) },
  // telc's module predates the per-level naming and exports the bare name.
  { level: 'B1', load: () => import('../data/exams/telc-b1-speaking.ts').then((m) => m.REDEMITTEL) },
  { level: 'B2', load: () => import('../data/exams/goethe-b2-speaking.ts').then((m) => m.B2_REDEMITTEL) },
  { level: 'C1', load: () => import('../data/exams/goethe-c1-speaking.ts').then((m) => m.C1_REDEMITTEL) },
  { level: 'C2', load: () => import('../data/exams/goethe-c2-speaking.ts').then((m) => m.C2_REDEMITTEL) },
];

export const redemittelId = (level: CEFR, de: string) => `red:${level}:${de.trim()}`;

/** Flatten a paper's Redemittel groups into cards. Pure, so the shape can be
 *  tested without loading a module. */
export function flattenRedemittel(groups: Redemittel[], level: CEFR): RedemittelCard[] {
  const out: RedemittelCard[] = [];
  for (const g of groups) {
    for (const p of g.phrases ?? []) {
      const de = (p.de ?? '').trim();
      const en = (p.en ?? '').trim();
      // A phrase with no German is not a card; a phrase with no gloss cannot be
      // prompted from English, which is the only direction worth drilling here.
      if (!de || !en) continue;
      out.push({ id: redemittelId(level, de), group: g.group, de, en, level });
    }
  }
  return out;
}

/** De-duplicate by id, keeping the first — the lower level wins, because a
 *  phrase taught at A2 and reused at B2 is the same phrase and the learner met
 *  it first at A2. */
export function dedupe(cards: RedemittelCard[]): RedemittelCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

let cache: Promise<RedemittelCard[]> | null = null;

/** Every Redemittel the app ships, lowest level first. */
export function loadRedemittel(): Promise<RedemittelCard[]> {
  if (!cache) {
    cache = Promise.all(
      SOURCES.map(({ level, load }) =>
        load()
          .then((groups) => flattenRedemittel(groups ?? [], level))
          // One unreachable module must not cost the other five. A missing paper
          // is a smaller list, never a rejected promise.
          .catch(() => [] as RedemittelCard[])),
    ).then((lists) => dedupe(lists.flat()));
  }
  return cache;
}

/** Project Redemittel into the lexicon's own card shape.
 *
 *  This is what makes them *studiable* rather than merely readable. Everything
 *  downstream — FSRS, the session builder, decks, the treemap, the worksheet —
 *  is written against `Word`, so a phrase that becomes a Word inherits all of it
 *  without a second scheduler being invented. Registered at runtime through
 *  `registerWords`, the same door mined words and class packs already use, so
 *  nothing is written into `public/data/*.json` and the corpus rule holds.
 *
 *  **The sector is the communicative function.** "Widersprechen, ohne unhöflich
 *  zu werden" is a far better deck than *Miscellaneous*, and it is exactly the
 *  kind of unit the taxonomy finding says the corpus is missing.
 *
 *  `pos: 'phrase'` on purpose: it keeps them out of the gender, plural,
 *  conjugation, case, separable and reflexive drill pools, every one of which
 *  would produce nonsense from a multi-word chunk. */
export function toWords(cards: RedemittelCard[]): Word[] {
  return cards.map((c) => ({
    id: c.id,
    term: c.de,
    en: c.en,
    pos: 'phrase',
    level: c.level,
    gender: null,
    plural: null,
    ipa: null,
    def: null,
    syn: [],
    ant: [],
    // **No example, deliberately.** The first version set the example to the
    // phrase itself — a Redemittel *is* the usable unit — and the card then
    // printed the same German twice, once as the headword and once under "In
    // use". It also matters beyond the cosmetics: `eligibleModes` reads `ex` to
    // decide whether a card can carry a cloze, a sentence-builder or a dictation,
    // and every one of those would have been the chunk gapped against itself.
    ex: [],
    field: c.group,
    kind: 'word' as const,
  }));
}

/** Group cards back into their communicative functions, for display and for the
 *  worksheet — the function is the teaching unit, not the individual phrase. */
export function byGroup(cards: RedemittelCard[]): { group: string; level: CEFR; items: RedemittelCard[] }[] {
  const m = new Map<string, { group: string; level: CEFR; items: RedemittelCard[] }>();
  for (const c of cards) {
    const key = `${c.level}:${c.group}`;
    const cur = m.get(key) ?? { group: c.group, level: c.level, items: [] };
    cur.items.push(c);
    m.set(key, cur);
  }
  return [...m.values()];
}

/** Make the Redemittel first-class: register them into the live lexicon.
 *
 *  Idempotent — `registerWords` skips ids it already holds — and deliberately
 *  *not* `addUserWords`, which persists to localStorage. These are shipped
 *  content rebuilt from static modules on every boot, not something the learner
 *  authored, so persisting them would create a second copy that could drift from
 *  the papers.
 *
 *  Returns the cards, so a caller can immediately build a session from them. */
export async function registerRedemittel(): Promise<RedemittelCard[]> {
  const cards = await loadRedemittel();
  const { registerWords } = await import('../data/index.ts');
  registerWords(toWords(cards));
  return cards;
}
