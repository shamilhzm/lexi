// Move named cards to a lower CEFR level, from a reviewed rulings file.
//
// `relevel-a1.ts` promotes what the Goethe A1 list examines. This is the general
// case: a person reads a card and rules that it belongs lower — *verlieren* is
// Goethe A2, *Deutschland* is a lesson-one word — and the ruling, with its reason,
// is the input. It exists because the obvious mechanical rule was measured and
// refused (2026-09-25 panel, Germanist): promoting every B1+ card in the top 1,500
// of the Kernwortschatz would have been wrong about 85% of the time — newspaper
// words (*Regierung*, *Partei*) rank high, and nouns inherit ranks from same-
// spelled verbs (*der Leisten* 580, *die Gerade* 186). Rank nominates; a reader
// rules.
//
// Promotion only, for the reason `relevel-a1.ts` gives: the level filter is
// cumulative, so moving a card down adds it for the lower learner and takes it
// from nobody. A ruling that would raise a level is refused, as is one whose
// target id already exists (that is a duplicate to merge, not a relevel).
//
// A card id is a foreign key held in three places, and all three move here:
// vocab.json, provenance.json, and src/data/idmap.ts — new entries appended, and
// any existing entry that pointed at a moved id re-pointed, so a learner migrated
// once already still arrives.
//
//   node scripts/corpus/relevel-cards.ts <rulings.tsv>           (dry run)
//   node scripts/corpus/relevel-cards.ts <rulings.tsv> --write
//
// Rulings file: `card_id <TAB> to_level <TAB> reason`, `#` comments allowed. Applied
// rulings are appended to scripts/corpus/relevel-rulings.tsv, the durable record.
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, writeJSON } from './lib.ts';
import type { CEFR } from '../../src/types.ts';

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RECORD = 'scripts/corpus/relevel-rulings.tsv';
const IDMAP = 'src/data/idmap.ts';

const [input] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WRITE = process.argv.includes('--write');
if (!input || !existsSync(input)) {
  console.error('Usage: node scripts/corpus/relevel-cards.ts <rulings.tsv> [--write]');
  process.exit(1);
}

const rulings = readFileSync(input, 'utf8').split('\n')
  .filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('card_id\t'))
  .map((l) => { const [id, to, ...why] = l.split('\t'); return { id: id.trim(), to: to.trim() as CEFR, why: why.join(' ').trim() }; });

const corpus = loadCorpus(PATHS.vocab);
const byId = new Map(corpus.map((w) => [w.id, w]));
const move = new Map<string, string>();
const refused: string[] = [];

for (const r of rulings) {
  const w = byId.get(r.id);
  if (!w) { refused.push(`${r.id}: no such card`); continue; }
  if (!LEVELS.includes(r.to)) { refused.push(`${r.id}: unknown level ${r.to}`); continue; }
  if (!r.why) { refused.push(`${r.id}: no reason given`); continue; }
  if (LEVELS.indexOf(r.to) >= LEVELS.indexOf(w.level as CEFR)) { refused.push(`${r.id}: ${w.level} → ${r.to} is not a promotion`); continue; }
  const to = w.id.replace(/^voc:[A-C][12]:/, `voc:${r.to}:`);
  if (byId.has(to) || [...move.values()].includes(to)) { refused.push(`${r.id}: ${to} already exists — merge, don't relevel`); continue; }
  move.set(w.id, to);
}

console.log(`${rulings.length} rulings · ${move.size} to apply · ${refused.length} refused`);
for (const [from, to] of move) console.log(`  ${from}  →  ${to}`);
for (const r of refused) console.log(`  ✗ ${r}`);
if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

for (const w of corpus) {
  const to = move.get(w.id);
  if (!to) continue;
  w.id = to;
  w.level = to.split(':')[1] as CEFR;
}
writeJSON(PATHS.vocab, corpus);

const prov = JSON.parse(readFileSync(PATHS.provenance, 'utf8')) as { id: string }[];
let pn = 0;
for (const row of prov) { const to = move.get(row.id); if (to) { row.id = to; pn++; } }
writeJSON(PATHS.provenance, prov);

let src = readFileSync(IDMAP, 'utf8');
let repointed = 0;
src = src.replace(/("[^"]+":\s*)"([^"]+)"/g, (m, head: string, target: string) => {
  const now = move.get(target);
  if (!now) return m;
  repointed++;
  return `${head}"${now}"`;
});
const tail = src.lastIndexOf('};');
const entries = [...move].map(([from, to]) => `  ${JSON.stringify(from)}: ${JSON.stringify(to)}`).join(',\n');
src = src.slice(0, tail).replace(/,?\s*$/, ',\n') + entries + '\n};\n';
writeFileSync(IDMAP, src);

// A fourth holder, found by the first run: `form-rulings.ts` names cards by id
// (`keep voc:A1:warten` beside `voc:B1:warten auf + A`), and a ruling left pointing
// at a retired id stops ruling — validate then fails on the very collision it had
// settled. Historical batch files also carry ids and are left alone: they record
// what was applied, when.
const RULING_FILES = ['scripts/corpus/form-rulings.ts'];
let rn = 0;
for (const f of RULING_FILES) {
  let text = readFileSync(f, 'utf8');
  for (const [from, to] of move) {
    const q = new RegExp(`(['"])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');
    text = text.replace(q, (_m, quote: string) => { rn++; return `${quote}${to}${quote}`; });
  }
  writeFileSync(f, text);
}
if (rn) console.log(`✓ re-pointed ${rn} ids in ${RULING_FILES.join(', ')}`);

const stamp = new Date().toISOString().slice(0, 10);
if (!existsSync(RECORD)) writeFileSync(RECORD, '# Generated by scripts/corpus/relevel-cards.ts — every reviewed level change.\n# date\tfrom_id\tto_id\treason\n');
appendFileSync(RECORD, [...move].map(([from, to]) => `${stamp}\t${from}\t${to}\t${rulings.find((r) => r.id === from)!.why}`).join('\n') + '\n');

console.log(`\n✓ ${move.size} cards moved · ${pn} provenance ids · ${move.size} id-map entries added · ${repointed} re-pointed`);
console.log('  Next: npm run corpus:split && npm run corpus:validate && npm test');
