// What every merge pass shares: how two cards' senses combine, what a keeper
// absorbs from the card being retired, and how the schedule migration is written.
//
// Extracted from `merge-dupes.ts` when `merge-forms.ts` needed the same three
// things. Copying them would have made a second, subtly different implementation
// of "what does a merge preserve?" — the exact failure LESSONS §5 records for the
// archaic-spelling rule, where two copies of one check disagreed by a word
// boundary and reported tuna as 19th-century German.
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { writeText } from './lib.ts';
import type { Word, Example } from '../../src/types.ts';

/** A card holds at most this many examples after a merge. */
export const MAX_EXAMPLES = 6;

/**
 * Sectors that mean "we had nowhere better to put this". A keeper chosen by level
 * brings its sector along, and that is sometimes a downgrade: `putzen` keeping
 * A1/**Miscellaneous** over A2/**Home**. Where the keeper landed in a catch-all
 * and a retired copy had a real sector, take the real one.
 */
export const CATCH_ALL = new Set(['Miscellaneous', 'Core Vocabulary', 'Everyday life basics', 'General']);

// ---- senses ----------------------------------------------------------------
// An explicit pair list, not a regex. `/our\b/ -> or` cannot reach *colourful*
// (the suffix is not word-final), and widening it to `/our/` turns *course* into
// *corse* and *four* into *for*. British and American English differ in a closed,
// enumerable set of words; guessing at the morphology is how you corrupt the ones
// that merely look similar.
const GB_US: Record<string, string> = {
  colour: 'color', colours: 'colors', colourful: 'colorful', coloured: 'colored',
  favour: 'favor', favourite: 'favorite', behaviour: 'behavior', neighbour: 'neighbor',
  neighbourhood: 'neighborhood', harbour: 'harbor', labour: 'labor', honour: 'honor',
  theatre: 'theater', centre: 'center', metre: 'meter', litre: 'liter', fibre: 'fiber',
  organise: 'organize', realise: 'realize', recognise: 'recognize', apologise: 'apologize',
  emphasise: 'emphasize', specialise: 'specialize', organisation: 'organization',
  defence: 'defense', licence: 'license', offence: 'offense', practise: 'practice',
  grey: 'gray', cosy: 'cozy', programme: 'program', catalogue: 'catalog',
  dialogue: 'dialog', jewellery: 'jewelry', travelling: 'traveling', traveller: 'traveler',
  cancelled: 'canceled', modelling: 'modeling', enrol: 'enroll', storey: 'story',
  aeroplane: 'airplane', plough: 'plow', tyre: 'tire', kerb: 'curb', pyjamas: 'pajamas',
};

/** A sense reduced to comparable tokens: no parentheticals, no en-GB/en-US drift,
 *  no plural -s, no leading article or infinitive marker. */
export function senseKey(s: string): Set<string> {
  let t = s.toLowerCase().replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '');
  t = t.replace(/^(to|a|an|the)\s+/, '').replace(/[^a-zäöüß ]/g, ' ');
  return new Set(t.split(/\s+/)
    .map((x) => GB_US[x] ?? x)
    .map((x) => x.replace(/e?s$/, ''))
    .filter((x) => x.length > 1));
}

/** Two senses say the same thing if one's words contain the other's, or they
 *  overlap by half. "stop" vs "bus/tram stop"; "sore muscles" vs "muscle soreness". */
export function sameSense(a: string, b: string): boolean {
  const x = senseKey(a); const y = senseKey(b);
  if (!x.size || !y.size) return a.trim().toLowerCase() === b.trim().toLowerCase();
  const shared = [...x].filter((t) => y.has(t)).length;
  if (shared === Math.min(x.size, y.size)) return true;          // subset
  return shared / new Set([...x, ...y]).size >= 0.5;             // half-overlap
}

export const splitSenses = (s: string) => (s || '').split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);

const MAX_SENSES = 4;
/** The keeper's gloss plus any sense the retired copies had that it did not, or
 *  `null` when nothing changes. Keeper's own phrasing always leads: it was
 *  authored against its level. */
export function unionGloss(keep: Word, drop: Word[]): string | null {
  const out = splitSenses(keep.en);
  for (const d of drop) {
    for (const s of splitSenses(d.en)) {
      if (out.length >= MAX_SENSES) break;
      if (!out.some((have) => sameSense(have, s))) out.push(s);
    }
  }
  const joined = out.join('; ');
  return joined === keep.en ? null : joined;
}

// ---- absorb ----------------------------------------------------------------
/** Fields a keeper may inherit when it has none of its own. `def` is deliberately
 *  not in the default set — see `absorb`. */
const FILLABLE = ['defDe', 'ipa', 'plural'] as const;

/**
 * Fill anything the keeper lacks from the copies being retired, so a merge is
 * never a content loss. Examples are unioned and capped; the keeper's own come
 * first because they were authored against its level.
 *
 * `def` moves only when the caller asks. A definition is written *about a
 * headword*, so it does not always travel with the content: `die Daten` is
 * defined as "Facts and figures collected for study or reference", which is a
 * definition of the plural sense and not of `das Datum`, the card it merges into.
 * `merge-dupes.ts` passes `def: true` because its groups are the same headword
 * twice; `merge-forms.ts` decides per row.
 *
 * `syn` is the same story one field over. `die Nudeln` carries four synonyms for
 * the *verb* nudeln — herunternudeln, durchnudeln, ausnudeln — which belong to
 * nothing on the noun card they would merge into.
 */
export function absorb(keep: Word, drop: Word[], opts: { def?: boolean; syn?: boolean } = {}): string[] {
  const gained: string[] = [];
  const fields = opts.def ? (['def', ...FILLABLE] as const) : FILLABLE;
  for (const d of drop) {
    for (const f of fields) {
      if (!keep[f] && d[f]) { (keep as Record<string, unknown>)[f] = d[f]; gained.push(f); }
    }
    for (const f of ['syn', 'ant'] as const) {
      if (opts.syn === false) continue;
      const before = keep[f].length;
      keep[f] = [...new Set([...keep[f], ...(d[f] ?? [])])];
      if (keep[f].length > before) gained.push(f);
    }
    const seen = new Set(keep.ex.map((e) => e.de));
    const extra = (d.ex ?? []).filter((e: Example) => !seen.has(e.de));
    if (extra.length && keep.ex.length < MAX_EXAMPLES) {
      keep.ex = [...keep.ex, ...extra].slice(0, MAX_EXAMPLES);
      gained.push('ex');
    }
  }
  return [...new Set(gained)];
}

// ---- the schedule migration ------------------------------------------------
/**
 * Carry `src/data/idmap.ts` forward over a set of id moves.
 *
 * Cumulative in both directions, which is the whole point: a learner may hold a
 * schedule under an id retired two passes ago, so earlier entries stay; and an
 * earlier entry pointing at an id *this* pass moved is followed to the new
 * target, so one hop is always enough at read time.
 */
export function carryIdMap(prior: Record<string, string>, moves: Map<string, string>): { map: Record<string, string>; repointed: number } {
  const map: Record<string, string> = {};
  let repointed = 0;
  for (const [from, to] of Object.entries(prior)) {
    const follow = moves.get(to);
    if (follow) repointed++;
    map[from] = follow ?? to;
  }
  for (const [from, to] of moves) map[from] = to;
  return { map, repointed };
}

/**
 * Every `voc:` target must be a card that exists. Only `voc:` — the map is shared
 * with the grammar passes and also carries `gex:` exercise ids, which live in
 * grammar.json and are not cards at all. Validating those against the lexicon
 * reports every one of them as dangling, which is how the first run of
 * `genderfix.ts` failed.
 */
export function danglingTargets(map: Record<string, string>, liveIds: Set<string>): [string, string][] {
  return Object.entries(map).filter(([, to]) => to.startsWith('voc:') && !liveIds.has(to));
}

export function writeIdMap(map: Record<string, string>): void {
  writeText(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'),
    `// Generated by scripts/corpus/casefix.ts, genderfix.ts, merge-dupes.ts and\n`
    + `// merge-forms.ts — do not edit by hand.\n`
    + `// Old card id → the id that replaced it, so a stored FSRS schedule survives a\n`
    + `// corpus correction instead of quietly resetting to new. Cumulative across every\n`
    + `// pass: an entry is only ever added or re-pointed, never dropped.\n`
    + `export const ID_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};\n`);
}
