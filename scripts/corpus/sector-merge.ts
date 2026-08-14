// Merge sectors that are the same sector spelled twice.
//
// The corpus carries `Body & health` (33 cards) *and* `Body and health` (27), and
// six more pairs like it. Nothing is wrong with either name; what is wrong is
// that they are both there, because a sector is a **tile on the treemap** and a
// **deck in the list**, so a split name shows one topic as two smaller things and
// makes the map lie about where the learner actually is. It also feeds
// `weakestSectors()`, which picks tomorrow's fresh vocabulary — two half-sized
// sectors rank differently from one whole one.
//
// `src/lib/brain/atlas.ts` is the evidence this was already being felt: it
// normalises sector names before mapping them to a cortical region, and its
// comments name these exact pairs as the reason. The atlas survives this merge
// untouched — normalising a name that is now unique is harmless — but it should
// not have had to.
//
// ## Why this is safe, and where the danger actually is
//
// **A card's id does not contain its field** (`voc:A1:der Name`), so re-sectoring
// is *not* a schedule migration — unlike a relevel, which changes the id and needs
// `ID_MAP` entries. That is the whole reason this can be done mechanically.
//
// The real hazard is a merge that crosses a **theme group**: sectors roll up into
// the 16 groups the treemap draws, so merging a Work sector into a Health one
// would move cards between tiles silently. This refuses to do that.
//
//   npm run corpus:sector-merge            # dry run
//   npm run corpus:sector-merge -- --write # apply
import { readFileSync, writeFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, loadSectors, writeJSON, type Word } from './lib.ts';
import { rebuildSectors } from './sectors.ts';

/** The judgement half: which spelling survives.
 *
 *  House style across the corpus is `Xxx & yyy` — *Food & drink*, *Town & travel*,
 *  *Money & shopping*, *Weather & nature* — so the ampersand wins and only the
 *  first word is capitalised. `Colours` over `Colors` because the app's English is
 *  British throughout its own prose.
 *
 *  Every target must already exist in `sectors.json`; the guard below enforces it
 *  rather than trusting this table. */
const MERGES: Record<string, string> = {
  'Body and health': 'Body & health',
  'Hobbies & Leisure': 'Hobbies & leisure',
  'Hobbies and leisure': 'Hobbies & leisure',
  'Work & Profession': 'Work & profession',
  'Colors': 'Colours',
  'At the Bank': 'At the bank',
  'Festivals & Customs': 'Festivals & customs',
  'Employment Contract': 'Employment contract',
  // A German sector name in an otherwise-English taxonomy, noticed by the VHS
  // teacher in PERSONAS. `Ailments` already exists and means the same thing.
  'Beschwerden': 'Ailments',
};

/** Sectors that exist on cards but have no row in `sectors.json`.
 *
 *  Found while merging: **118 cards across six field names carry no sector row at
 *  all.** Every one of them is a *theme group* name used as a sector — "Society &
 *  Politics", "Travel & Transport", "Media & Arts" — so somebody authored the
 *  coarse label into the fine field. `rebuildSectors` would file them under
 *  `DEFAULT_GROUP`, which is how they would quietly appear on a treemap tile they
 *  do not belong to, so each one is given its real group here instead of being
 *  left to a fallback.
 *
 *  Registered rather than renamed: the names are decent sectors, and renaming the
 *  field on 118 cards to merge them into an existing sector is a judgement about
 *  each card's topic, which is a different job from this one. */
const ADOPT: Record<string, string> = {
  'Work & Study': 'Work & Economy',
  'Society & Politics': 'Society & Politics',
  'Everyday Life': 'Home & Daily Life',
  'Science & Technology': 'Tech & Science',
  'Travel & Transport': 'Travel & Transport',
  'Media & Arts': 'Arts, Media & Leisure',
};

/** Sectors filed under the *Miscellaneous* theme group that plainly belong
 *  somewhere else.
 *
 *  The group is a **tile on the treemap**, and it was carrying 36 sectors / 714
 *  cards — of which 501 are the single unclassified `Miscellaneous` sector and the
 *  rest have perfectly good names sitting on the wrong tile. *Elections* is
 *  politics, *Laundry* is daily life, *Visual Arts* is art. A learner looking at
 *  the map was told 714 cards were uncategorisable when 213 of them were already
 *  categorised and merely misfiled.
 *
 *  Only the group moves; no card's `field` changes, so nothing here touches a
 *  deck's identity. Judgement authored here, applied mechanically, and every
 *  target checked against the sixteen groups that already exist. */
const REGROUP: Record<string, string> = {
  'Hobbies & leisure': 'Arts, Media & Leisure',
  'Visual Arts': 'Arts, Media & Leisure',
  'Taste & Judgement': 'Arts, Media & Leisure',
  'Elections': 'Society & Politics',
  'History of Berlin': 'Society & Politics',
  'Emigration & immigration': 'Society & Politics',
  'Individual & System': 'Society & Politics',
  'Volunteering': 'Society & Politics',
  'Manipulation & Propaganda': 'Society & Politics',
  'Moral Judgements': 'Society & Politics',
  'Global Challenges': 'Society & Politics',
  'Future & Forecast': 'Society & Politics',
  'Scenarios & Forecasts': 'Society & Politics',
  'At the bank': 'Work & Economy',
  'Working Life': 'Work & Economy',
  'Cash Machine': 'Work & Economy',
  'The Advertisement': 'Work & Economy',
  'Real Estate & Moving': 'Home & Daily Life',
  'Urban Planning & Future': 'Home & Daily Life',
  'Laundry': 'Home & Daily Life',
  'Social Networks': 'Tech & Science',
  'Getting Around & Communication': 'Travel & Transport',
  'Border & Commuting': 'Travel & Transport',
  'Ailments': 'Health & Body',
  'Care & doctor': 'Health & Body',
  'Doctor & Pharmacy': 'Health & Body',
  'Limits of Knowledge': 'Education & Language',
  'The report': 'Education & Language',
  'University & Appointments': 'Education & Language',
  'Contact & Communication': 'Education & Language',
  'Studies': 'Education & Language',
  'Shopping & Quantities': 'Shopping & Clothing',
  'Materials': 'Shopping & Clothing',
  'Months & Seasons': 'Language Building Blocks',
};

const write = process.argv.includes('--write');
const vocab = loadCorpus(PATHS.vocab) as Word[];
const sectors = loadSectors(PATHS.sectors);

const groupOf = new Map(sectors.map((s) => [s.name, s.group]));
const known = new Set(sectors.map((s) => s.name));

// ---- guards ---------------------------------------------------------------
const problems: string[] = [];
const alreadyMerged: string[] = [];
for (const [from, to] of Object.entries(MERGES)) {
  if (from === to) problems.push(`${from}: merges into itself`);
  // Re-runnable: a `from` that no longer exists is a merge that has already been
  // applied, not an error. Corpus scripts here are expected to be repeatable, and
  // a second run of a landed merge should be a no-op rather than a failure.
  if (!known.has(from)) { alreadyMerged.push(from); continue; }
  // The target may be a *rename* rather than an existing row (Hobbies & leisure),
  // so it only has to exist if it is not itself produced by this table.
  const targetIsNew = !known.has(to) && Object.values(MERGES).includes(to);
  if (!known.has(to) && !targetIsNew) problems.push(`${to}: no such sector, and nothing in this table creates it`);
  const gFrom = groupOf.get(from);
  const gTo = groupOf.get(to);
  if (gFrom && gTo && gFrom !== gTo) {
    problems.push(`${from} → ${to}: crosses a theme group (${gFrom} → ${gTo}); cards would move tile`);
  }
}
if (problems.length) {
  console.error('✗ refusing to merge:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

// ---- apply ----------------------------------------------------------------
const moved: Record<string, number> = {};
for (const w of vocab) {
  const to = MERGES[w.field];
  if (!to) continue;
  moved[`${w.field} → ${to}`] = (moved[`${w.field} → ${to}`] ?? 0) + 1;
  w.field = to;
}
const total = Object.values(moved).reduce((a, b) => a + b, 0);

// The curated lemma→sector map must not keep pointing at a retired name, or the
// next `corpus:resector` run would put cards straight back into it.
const refPath = PATHS.sectorReference;
const refBefore = readFileSync(refPath, 'utf8');
let refAfter = refBefore;
let refLines = 0;
for (const [from, to] of Object.entries(MERGES)) {
  const re = new RegExp(`\\t${from.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'gm');
  const hits = refAfter.match(re);
  if (hits) { refLines += hits.length; refAfter = refAfter.replace(re, `\t${to}`); }
}

// Give the orphaned names their group *before* the rebuild, so `priorGroupOf`
// finds them and none of them falls through to DEFAULT_GROUP.
const withAdopted = [...sectors];
const adopted: string[] = [];
for (const [name, group] of Object.entries(ADOPT)) {
  if (sectors.some((s) => s.name === name)) continue;
  withAdopted.push({ name, count: 0, levels: [], group });
  adopted.push(`${name} → ${group}`);
}

// Regroup before the rebuild, for the same reason as ADOPT: `rebuildSectors`
// reads the group off the prior rows.
const validGroups = new Set(sectors.map((s) => s.group));
const badGroup = Object.entries(REGROUP).filter(([, g]) => !validGroups.has(g));
if (badGroup.length) {
  console.error('✗ regroup target is not one of the existing theme groups:');
  for (const [n, g] of badGroup) console.error(`  ${n} → ${g}`);
  process.exit(1);
}
const regrouped: string[] = [];
for (const row of withAdopted) {
  const g = REGROUP[MERGES[row.name] ?? row.name];
  if (!g || row.group === g) continue;
  regrouped.push(`${row.name}: ${row.group} → ${g}`);
  row.group = g;
}

const nextSectors = rebuildSectors(vocab, withAdopted)
  // A merged-away name has no cards left; drop the empty row rather than ship a
  // sector the treemap would draw at zero.
  .filter((s) => !(s.count === 0 && MERGES[s.name]));

console.log(`Merged ${Object.keys(MERGES).length - alreadyMerged.length} sector name(s) · ${total} card(s) moved`
  + (alreadyMerged.length ? ` · ${alreadyMerged.length} already applied` : ''));
for (const [k, n] of Object.entries(moved).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);
console.log(`sectors ${sectors.length} → ${nextSectors.length} · sector-reference.tsv rows updated: ${refLines}`);
if (regrouped.length) {
  console.log(`\nRegrouped ${regrouped.length} sector(s) off the Miscellaneous tile:`);
  for (const r of regrouped) console.log(`  ${r}`);
}
if (adopted.length) {
  console.log(`\nAdopted ${adopted.length} sector(s) that had cards but no row (would have fallen to the default group):`);
  for (const a of adopted) console.log(`  ${a}`);
}
// Nothing may reach the rebuild without a real group, or it lands on a tile it
// does not belong to and no test would notice.
const stranded = nextSectors.filter((s) => !sectors.some((p) => p.group === s.group));
if (stranded.length) {
  console.error(`\n✗ ${stranded.length} sector(s) landed in a group that did not exist before:`);
  for (const s of stranded) console.error(`  ${s.name} → ${s.group}`);
  process.exit(1);
}

if (!write) { console.log('\nDry run — re-run with --write to apply.'); process.exit(0); }
writeJSON(PATHS.vocab, vocab);
writeJSON(PATHS.sectors, nextSectors);
if (refAfter !== refBefore) writeFileSync(refPath, refAfter);
console.log('\nWrote public/data/{vocab,sectors}.json' + (refAfter !== refBefore ? ' + sector-reference.tsv' : ''));
console.log('  Next: npm run corpus:split && npm run corpus:validate && npm test');
