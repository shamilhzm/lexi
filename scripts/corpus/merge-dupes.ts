// Merge the cards that are the same word twice.
//
// BACKLOG Now #3: **874 terms sit on more than one card; 1,021 cards are
// redundant — 14% of the corpus.** Each copy carries its own FSRS schedule, so a
// learner meets and re-learns `die Mutter` at A1 in *Family* and again at B1 in
// *Family relationships*. It is also what made the 2026-08-11 A1 probe lie: a
// lookup keyed on the term returned whichever copy came last.
//
// ## Every duplicate merges — the question was the wrong one
//
// The first pass merged only byte-identical glosses (516 groups) and left 358 for
// a human, on the theory that a gloss heuristic would destroy homographs. Working
// through those 358 by hand showed the framing was wrong. The question is not
// *"is this a homograph?"* but *"should one German word have two cards?"*, and the
// corpus already answers it: `die Bank` is a single A1 card glossed "bank; bench".
//
// So `der Zug` (train / move-in-a-game), `der Kurs` (course / share price) and
// `der Satz` (sentence / set of reps) merge like the rest, with their senses
// *unioned* onto the keeper. That beats the status quo in both directions: the
// learner meets the word once, and keeps both meanings. Splitting a form across
// two FSRS schedules was never the way to teach polysemy.
//
// The two disagreement classes resolved the same way. A part-of-speech split is a
// tagging inconsistency — German adjectives and adverbs share a form, so
// `regelmäßig` tagged adjective at A2 and adverb at B1 is one word filed twice —
// and the single gender split is `der/die Bekannte`, which genuinely takes both.
// `der See` / `die See` is safe by construction: the term carries its article, so
// the two were never in one group.
//
// ## Merging is a schedule migration
//
// Same three foreign keys as `relevel-a1.ts`: vocab.json, provenance.json and
// `src/data/idmap.ts`, with cards.json/detail.json following via `corpus:split`.
// The keeper also *absorbs* what the retired copies had and it lacked — a
// definition, an IPA, a plural, extra examples — so a merge never loses content.
//
// Run: npm run corpus:dupes              (report + both TSVs + the id map)
//      npm run corpus:dupes -- --write   (apply)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, writeJSON } from './lib.ts';
import type { Word, CEFR, Example, SectorMeta } from '../../src/types.ts';

const WRITE = process.argv.includes('--write');
const MERGED = 'scripts/corpus/dupe-rulings.tsv';
const MAX_EXAMPLES = 6;

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const rank = (l: CEFR) => LEVELS.indexOf(l);

// ---- senses ----------------------------------------------------------------
// The first pass merged only byte-identical glosses and left 358 groups for a
// human. Working through them, the premise turned out to be wrong: the question
// is not *"is this a homograph?"* but *"should one German word have two cards?"* —
// and the corpus already answers that. `die Bank` is a single A1 card glossed
// "bank; bench". One form, one card, one FSRS schedule, both senses.
//
// So `der Zug` (train / move-in-a-game), `der Kurs` (course / share price) and
// `der Satz` (sentence / set of reps) merge like everything else — their senses
// are *unioned* onto the keeper instead of one being thrown away. That is strictly
// better than the status quo, where the second sense lived on a card the learner
// met separately and re-learned from scratch.
//
// `der See` / `die See` cannot collide here: the term string carries the article,
// so they were never in the same group to begin with.

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
function senseKey(s: string): Set<string> {
  let t = s.toLowerCase().replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '');
  t = t.replace(/^(to|a|an|the)\s+/, '').replace(/[^a-zäöüß ]/g, ' ');
  return new Set(t.split(/\s+/)
    .map((x) => GB_US[x] ?? x)
    .map((x) => x.replace(/e?s$/, ''))
    .filter((x) => x.length > 1));
}
/** Two senses say the same thing if one's words contain the other's, or they
 *  overlap by half. "stop" vs "bus/tram stop"; "sore muscles" vs "muscle soreness". */
function sameSense(a: string, b: string): boolean {
  const x = senseKey(a); const y = senseKey(b);
  if (!x.size || !y.size) return a.trim().toLowerCase() === b.trim().toLowerCase();
  const shared = [...x].filter((t) => y.has(t)).length;
  if (shared === Math.min(x.size, y.size)) return true;          // subset
  return shared / new Set([...x, ...y]).size >= 0.5;             // half-overlap
}
const splitSenses = (s: string) => (s || '').split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);

const MAX_SENSES = 4;
/** The keeper's gloss plus any sense the retired copies had that it did not.
 *  Keeper's own phrasing always leads: it was authored against its level. */
function unionGloss(keep: Word, drop: Word[]): string | null {
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

const corpus = loadCorpus(PATHS.vocab);
const groups = new Map<string, Word[]>();
for (const w of corpus) {
  if (w.kind !== 'word') continue;
  const k = w.term.toLowerCase();
  (groups.get(k) ?? groups.set(k, []).get(k)!).push(w);
}

interface Merge { keep: Word; drop: Word[] }
const merges: Merge[] = [];

for (const [, ws] of groups) {
  if (ws.length < 2) continue;
  // A part-of-speech disagreement is a tagging inconsistency, not a homograph:
  // German adjectives and adverbs are the same form, so `regelmäßig` tagged
  // adjective at A2 and adverb at B1 is one word filed twice. All ten cases were
  // that. The one gender disagreement is `der/die Bekannte`, a nominalised
  // adjective that genuinely takes both — also one word.
  const sorted = [...ws].sort((a, b) => rank(a.level) - rank(b.level));
  merges.push({ keep: sorted[0], drop: sorted.slice(1) });
}

/**
 * Sectors that mean "we had nowhere better to put this". The keeper is chosen by
 * *level*, which is right — the lowest copy is the one an early learner can reach
 * — but its sector comes along for the ride, and that is sometimes a downgrade:
 * `putzen` keeps A1/**Miscellaneous** over A2/**Home**, `das Publikum`
 * A1/Miscellaneous over B1/Free time. Where the keeper landed in a catch-all and
 * a retired copy had a real sector, take the real one.
 *
 * Deliberately not more clever than that. `die Handschuhe` is A2/*Skiing and
 * snowboarding* and B1/*Clothing*, and both are "real" sectors — deciding that
 * one is better is a judgement call, so every disagreement is flagged in the
 * rulings file for `corpus:resector` instead of being guessed at here.
 */
const CATCH_ALL = new Set(['Miscellaneous', 'Core Vocabulary', 'Everyday life basics', 'General']);

// ---- absorb ----------------------------------------------------------------
/** Fill anything the keeper lacks from the copies being retired, so a merge is
 *  never a content loss. Examples are unioned and capped; the keeper's own come
 *  first because they were authored against its level. */
function absorb(keep: Word, drop: Word[]): string[] {
  const gained: string[] = [];
  for (const d of drop) {
    for (const f of ['def', 'defDe', 'ipa', 'plural'] as const) {
      if (!keep[f] && d[f]) { (keep as Record<string, unknown>)[f] = d[f]; gained.push(f); }
    }
    for (const f of ['syn', 'ant'] as const) {
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

// ---- report ----------------------------------------------------------------
const dropCount = merges.reduce((n, m) => n + m.drop.length, 0);
console.log(`duplicate terms      ${[...groups.values()].filter((g) => g.length > 1).length}`);
console.log(`  merged             ${merges.length} groups, retiring ${dropCount} cards`);


if (!WRITE) {
  console.log(`\n(dry run — pass --write to apply)`);
  process.exit(0);
}

// ---- apply -----------------------------------------------------------------
const retire = new Map<string, string>();   // dropped id -> keeper id
const rulings: string[] = [];
let resectored = 0;
let glossUnions = 0;
let flagged = 0;
for (const m of merges) {
  const gained = absorb(m.keep, m.drop);
  // Union the senses before anything else: this is what lets `der Zug` merge
  // without losing *move (in a game)*.
  const merged = unionGloss(m.keep, m.drop);
  if (merged) { m.keep.en = merged; gained.push('en'); glossUnions++; }
  // Rescue the keeper from a catch-all sector; flag any other disagreement.
  const fields = new Set([m.keep.field, ...m.drop.map((d) => d.field)]);
  let note = '';
  if (fields.size > 1) {
    if (CATCH_ALL.has(m.keep.field)) {
      const better = m.drop.find((d) => !CATCH_ALL.has(d.field));
      if (better) { note = `re-sectored from ${m.keep.field}`; m.keep.field = better.field; resectored++; }
    }
    if (!note) { note = 'sector differs — resector?'; flagged++; }
  }
  for (const d of m.drop) retire.set(d.id, m.keep.id);
  rulings.push(`${m.keep.term}\t${m.keep.level}/${m.keep.field}\t${m.drop.map((d) => `${d.level}/${d.field}`).join(', ')}\t${gained.join('+') || '—'}\t${note}`);
}
console.log(`  glosses unioned:               ${glossUnions}`);
console.log(`  re-sectored out of a catch-all: ${resectored}`);
console.log(`  sector disagreements flagged:   ${flagged}`);

const kept = corpus.filter((w) => !retire.has(w.id));
writeJSON(PATHS.vocab, kept);
console.log(`\n✓ ${corpus.length} → ${kept.length} cards`);

// provenance: re-point rather than drop, so the keeper inherits its sourcing.
const prov = JSON.parse(readFileSync(PATHS.provenance, 'utf8')) as { id: string }[];
const liveIds = new Set(kept.map((w) => w.id));
let pn = 0;
const provOut = prov.filter((r) => {
  const to = retire.get(r.id);
  if (to) { r.id = to; pn++; }
  return liveIds.has(r.id);
});
// A keeper can now hold two provenance rows (its own and an absorbed one); keep
// the first, which is the keeper's own.
const seenProv = new Set<string>();
writeJSON(PATHS.provenance, provOut.filter((r) => !seenProv.has(r.id) && seenProv.add(r.id)));
console.log(`✓ re-pointed ${pn} provenance ids`);

// sectors.json carries a count and a level list per sector; both move.
const sectors = JSON.parse(readFileSync(PATHS.sectors, 'utf8')) as SectorMeta[];
const bySector = new Map<string, Word[]>();
for (const w of kept) (bySector.get(w.field) ?? bySector.set(w.field, []).get(w.field)!).push(w);
const emptied: string[] = [];
for (const s of sectors) {
  const ws = bySector.get(s.name) ?? [];
  if (!ws.length) emptied.push(s.name);
  s.count = ws.length;
  s.levels = LEVELS.filter((l) => ws.some((w) => w.level === l));
}
writeJSON(PATHS.sectors, sectors.filter((s) => s.count > 0));
console.log(`✓ refreshed sectors.json${emptied.length ? ` (${emptied.length} emptied: ${emptied.join(', ')})` : ''}`);

// Cumulative, for the same reason ID_MAP is: once a group is merged the duplicate
// is gone, so a later run cannot re-derive the row. Truncating to the current
// pass would have replaced 358 rulings with the one the 2026-08-14 gender fix
// created. An entry is only ever added.
const priorRulings = existsSync(MERGED)
  ? readFileSync(MERGED, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'))
  : [];
writeFileSync(MERGED, [
  '# Generated by scripts/corpus/merge-dupes.ts — every group merged, and what the keeper gained.',
  '# Only groups whose copies agreed on gender, part of speech and gloss are here.',
  '# Cumulative across every pass: a merged duplicate cannot be re-derived, so rows are never dropped.',
  '# kept\tkept level/sector\tretired\tabsorbed\tnote',
  ...[...new Set([...priorRulings, ...rulings])].sort(),
].join('\n') + '\n');
console.log(`✓ rulings → ${MERGED}`);

// ---- the migration --------------------------------------------------------
// Written, not printed. This used to end with "paste the entries above into
// src/data/idmap.ts", which asks a human to hand-edit a file whose own header
// says not to — and a forgotten paste does not fail loudly, it silently resets
// every affected learner's schedule to new. Same cumulative build as
// genderfix.ts: earlier entries are carried forward, and any pointing at an id
// this pass retired are followed to the keeper, so one hop is always enough.
const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));
const map: Record<string, string> = {};
let repointed = 0;
for (const [from, to] of Object.entries(ID_MAP as Record<string, string>)) {
  const follow = retire.get(to);
  if (follow) repointed++;
  map[from] = follow ?? to;
}
for (const [from, to] of retire) map[from] = to;

const keptIds = new Set(kept.map((w) => w.id));
const dangling = Object.entries(map).filter(([, to]) => to.startsWith('voc:') && !keptIds.has(to));
if (dangling.length) {
  console.error(`\n✗ id map would point at cards that do not exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);
  process.exit(1);
}

writeFileSync('src/data/idmap.ts',
  `// Generated by scripts/corpus/casefix.ts, genderfix.ts and merge-dupes.ts — do not edit by hand.\n`
  + `// Old card id → the id that replaced it, so a stored FSRS schedule survives a\n`
  + `// corpus correction instead of quietly resetting to new. Cumulative across every\n`
  + `// pass: an entry is only ever added or re-pointed, never dropped.\n`
  + `export const ID_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};\n`);
console.log(`✓ id map → src/data/idmap.ts (${Object.keys(ID_MAP).length} → ${Object.keys(map).length}, ${retire.size} new, ${repointed} re-pointed)`);

console.log('\n  Next: npm run corpus:split && npm run corpus:validate && npm test');
