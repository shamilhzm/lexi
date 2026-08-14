// Correct genders and plurals the dictionary audit caught.
//
// `corpus:gender-audit` reports; this repairs. The split is deliberate: the audit
// flagged 11 rows across 848 B2+ nouns and **six of them were defensible** — *der
// Burnout* (Duden allows both genders), *Schlagwörter* beside *Schlagworte* (two
// real plurals for two senses), *Rettungswägen* (southern), a plural of
// *Fachkräftemangel* almost nobody writes. Only the five below were verified by
// hand as unambiguously wrong, and only those five are in this table.
//
// ## A gender fix is a schedule migration
//
// Card ids embed the term **with its article** — `voc:B2:die Vorstand`. Correcting
// the gender therefore changes the id, and a learner's FSRS state is keyed on it.
// So this writes `src/data/idmap.ts` the way `casefix.ts` does, carrying earlier
// entries forward and re-pointing any that aimed at an id this pass has moved.
// Without that the correction would silently reset those cards to new.
//
// Plural-only fixes are free: `plural` is not part of the id.
//
// ## Expect-guarded
//
// Every row states what it expects to find. If the corpus has moved on — someone
// already fixed it, or the card was re-levelled — the run aborts rather than
// overwriting a value nobody predicted. Same contract as
// `scripts/authoring/fix-authored.ts`.
//
//   npm run corpus:genderfix            # dry run
//   npm run corpus:genderfix -- --write
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, loadSectors, readJSON, writeJSON, writeText, fileExists, type Word } from './lib.ts';
import { rebuildSectors } from './sectors.ts';

interface Fix {
  id: string;
  /** What the card must currently say, or the run aborts. */
  expect: { gender?: 'der' | 'die' | 'das'; plural?: string | null };
  set: { gender?: 'der' | 'die' | 'das'; plural?: string };
  why: string;
}

/** The five verified by hand against de.wiktionary and Duden. */
const FIXES: Fix[] = [
  {
    id: 'voc:B2:die Visum',
    expect: { gender: 'die' },
    set: { gender: 'das' },
    why: 'das Visum — a Latin neuter; „die Visum“ is not attested anywhere.',
  },
  {
    id: 'voc:B2:die Vorstand',
    expect: { gender: 'die' },
    set: { gender: 'der' },
    why: 'der Vorstand (board, management).',
  },
  {
    id: 'voc:C1:die Babyboomer',
    expect: { gender: 'die', plural: '(Pl.)' },
    set: { gender: 'der', plural: 'die Babyboomer' },
    why: 'der Babyboomer in the singular; the plural field held the literal string „(Pl.)“, which is not a plural.',
  },
  {
    id: 'voc:C1:das Szenario',
    expect: { plural: '-s' },
    set: { plural: 'die Szenarien' },
    why: 'Latin -ium type: das Szenario → die Szenarien. „Szenarios“ is colloquial.',
  },
  {
    id: 'voc:C1:das Zukunftsszenario',
    expect: { plural: '-s' },
    set: { plural: 'die Zukunftsszenarien' },
    why: 'Same declension as its head noun.',
  },
];

const write = process.argv.includes('--write');
const vocab = loadCorpus(PATHS.vocab) as Word[];
const byId = new Map(vocab.map((w) => [w.id, w]));

// ---- guards ---------------------------------------------------------------
const problems: string[] = [];
for (const f of FIXES) {
  const card = byId.get(f.id);
  if (!card) { problems.push(`${f.id}: no such card`); continue; }
  for (const [k, v] of Object.entries(f.expect) as [keyof Fix['expect'], unknown][]) {
    if (card[k] !== v) problems.push(`${f.id}: expected ${k}=${JSON.stringify(v)}, found ${JSON.stringify(card[k])}`);
  }
}
if (problems.length) {
  console.error('✗ the corpus is not in the state these fixes expect:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nNothing written. Re-verify against the dictionary before editing this table.');
  process.exit(1);
}

// ---- apply ----------------------------------------------------------------
/** The article is part of the term and therefore part of the id. */
const retermed = (term: string, gender: string) => term.replace(/^(der|die|das)\s+/i, `${gender} `);
const renamed: { from: string; to: string }[] = [];

for (const f of FIXES) {
  const card = byId.get(f.id)!;
  if (f.set.plural !== undefined) card.plural = f.set.plural;
  if (f.set.gender) {
    card.gender = f.set.gender;
    const term = retermed(card.term, f.set.gender);
    const id = f.id.replace(/:[^:]*$/, `:${term}`);
    if (id !== card.id) {
      if (byId.has(id)) { console.error(`✗ ${id} already exists — merge required, not a rename`); process.exit(1); }
      renamed.push({ from: card.id, to: id });
      card.term = term;
      card.id = id;
    }
  }
  console.log(`  ${f.id}`);
  console.log(`      ${f.why}`);
}

// ---- the migration --------------------------------------------------------
// Cumulative, exactly as casefix.ts builds it: a learner may hold a schedule
// under an id retired two passes ago, so earlier entries are carried forward and
// any pointing at an id this pass moved are followed to the new target.
const thisPass = new Map(renamed.map(({ from, to }) => [from, to] as const));
const map: Record<string, string> = {};
const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));
for (const [from, to] of Object.entries(ID_MAP as Record<string, string>)) map[from] = thisPass.get(to) ?? to;
for (const [from, to] of thisPass) map[from] = to;

// Only `voc:` targets can be checked here. The map is shared with other passes
// and also carries `gex:` grammar-exercise ids, which live in grammar.json and
// are not cards at all — validating them against the lexicon reports every one of
// them as dangling, which is how the first run of this script failed.
const ids = new Set(vocab.map((w) => w.id));
const dangling = Object.entries(map).filter(([, to]) => to.startsWith('voc:') && !ids.has(to));
if (dangling.length) {
  console.error(`✗ id map would point at cards that do not exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);
  process.exit(1);
}

// provenance.json is the third file that holds a card id.
const provPath = PATHS.provenance;
let provMoved = 0;
const prov = fileExists(provPath) ? readJSON<{ id: string }[]>(provPath) : [];
for (const row of prov) {
  const to = thisPass.get(row.id);
  if (to) { row.id = to; provMoved++; }
}

console.log(`\n${FIXES.length} fix(es) · ${renamed.length} id change(s) · ${provMoved} provenance row(s) · id map ${Object.keys(ID_MAP).length} → ${Object.keys(map).length}`);
for (const r of renamed) console.log(`  rename ${r.from}  →  ${r.to}`);

if (!write) { console.log('\nDry run — re-run with --write to apply.'); process.exit(0); }

writeJSON(PATHS.vocab, vocab);
writeJSON(PATHS.sectors, rebuildSectors(vocab, loadSectors(PATHS.sectors)));
if (prov.length) writeJSON(provPath, prov);
writeText(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'),
  `// Generated by scripts/corpus/casefix.ts and genderfix.ts — do not edit by hand.\n`
  + `// Old card id → the id that replaced it, so a stored FSRS schedule survives a\n`
  + `// corpus correction instead of quietly resetting to new. Cumulative across every\n`
  + `// pass: an entry is only ever added or re-pointed, never dropped.\n`
  + `export const ID_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};\n`);
console.log('\nWrote public/data/{vocab,sectors,provenance}.json and src/data/idmap.ts');
console.log('  Next: npm run corpus:split && npm run corpus:validate && npm test');
