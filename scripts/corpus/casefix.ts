// German writes adjectives, verbs and adverbs lowercase. A legacy import batch
// entered ~90 of them capitalised ("Rot", "Wütend", "Packen") under its own
// sector names ("Colors" vs "Colours") — and two thirds of those duplicate a
// correct lowercase card the learner already studies. A capitalised headword is
// not cosmetic here: the card face is where the learner reads the spelling.
//
// This pass is deterministic, not editorial:
//   · capitalised card whose lowercase lemma already exists → delete it
//   · otherwise → lowercase the term and rebuild the id
// Multi-word headwords are left alone: "Rad fahren" and "Bezug nehmen auf" open
// with a noun and are correctly capitalised.
//
// The id map it writes feeds src/data/idmap.ts so a learner's FSRS schedule
// follows the rename instead of silently resetting.
//
// Function words are NOT mechanical and are not inferred here. A pronoun or a
// particle can be legitimately capitalised (polite "Ihr", the noun "Verzeihung"
// used interjectionally), and a card carrying no `pos` at all cannot be
// classified by rule — most of those turned out to be ordinary nouns, which are
// *correctly* capitalised. Every one of those is ruled on by hand in
// case-rulings.tsv and applied from there, so the decision is reviewable as a
// decision rather than buried in a regex.
//
//   node scripts/corpus/casefix.ts [--write]
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { readJSON, writeJSON, writeText } from './lib.ts';
import { rebuildSectors } from './sectors.ts';
import type { Word } from '../../src/types.ts';

const write = process.argv.includes('--write');
const CASED_POS = new Set(['adjective', 'verb', 'adverb']);
const RULINGS = join(PATHS.corpusDir, 'case-rulings.tsv');

/** `id ⇥ action ⇥ detail ⇥ reason` — one human decision per line. */
interface Ruling { action: 'lowercase' | 'noun' | 'drop' | 'keep'; detail: string; reason: string; }
const rulings = new Map<string, Ruling>();
for (const line of readFileSync(RULINGS, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const [id, action, detail, reason] = t.split('\t').map((s) => (s ?? '').trim());
  rulings.set(id, { action: action as Ruling['action'], detail, reason });
}

const vocab = readJSON<Word[]>(PATHS.vocab);
const sectors = readJSON<Parameters<typeof rebuildSectors>[1]>(PATHS.sectors);

// Lowercase lemma → the canonical card that already carries it.
const canonical = new Map<string, Word>();
for (const w of vocab) if (w.term === w.term.toLowerCase()) canonical.set(w.term, w);

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const dropped: { from: string; to: string }[] = [];
const renamed: { from: string; to: string }[] = [];
const demoted: { id: string; from: string; to: string }[] = [];
const kept: Word[] = [];

// A duplicate pair can disagree about level ("Nah" at A1, "nah" at A2). The
// earlier claim wins: these are core early words, and a learner should not lose
// one from A1 because a capitalised twin got deleted.
const levelOf = new Map<string, string>();
for (const w of vocab) {
  if (!CASED_POS.has(w.pos) || w.term.includes(' ') || !/^[A-ZÄÖÜ]/.test(w.term)) continue;
  const survivor = canonical.get(w.term.toLowerCase());
  if (survivor && LEVELS.indexOf(w.level) < LEVELS.indexOf(survivor.level)) levelOf.set(survivor.id, w.level);
}

const ruled: string[] = [];

for (const w of vocab) {
  // A hand ruling wins over every inference below.
  const r = rulings.get(w.id);
  if (r) {
    if (r.action === 'keep') { ruled.push(`keep      ${w.id} — ${r.reason}`); kept.push(w); continue; }
    if (r.action === 'drop') {
      if (!vocab.some((o) => o.id === r.detail)) throw new Error(`${w.id}: ruled a duplicate of ${r.detail}, which is not in the corpus`);
      ruled.push(`drop      ${w.id} → ${r.detail} — ${r.reason}`);
      dropped.push({ from: w.id, to: r.detail });
      continue;
    }
    if (r.action === 'lowercase') {
      const lower = w.term.toLowerCase();
      const id = `voc:${w.level}:${lower}`;
      ruled.push(`lowercase ${w.id} → ${lower} (${r.detail}) — ${r.reason}`);
      renamed.push({ from: w.id, to: id });
      kept.push({ ...w, term: lower, id, pos: r.detail || w.pos });
      continue;
    }
    if (r.action === 'noun') {
      // `detail` is `<term with article>|<plural or empty>`; the capital was right
      // all along and what was missing is the pos, the article and the gender.
      const [term, plural] = r.detail.split('|').map((s) => s.trim());
      const gender = term.split(' ')[0] as 'der' | 'die' | 'das';
      if (!['der', 'die', 'das'].includes(gender)) throw new Error(`${w.id}: ruled a noun but "${term}" carries no article`);
      const id = `voc:${w.level}:${term}`;
      ruled.push(`noun      ${w.id} → ${term} — ${r.reason}`);
      renamed.push({ from: w.id, to: id });
      kept.push({ ...w, term, id, pos: 'noun', gender, plural: plural || w.plural });
      continue;
    }
    throw new Error(`${w.id}: unknown ruling "${r.action}"`);
  }

  const miscased = CASED_POS.has(w.pos) && !w.term.includes(' ') && /^[A-ZÄÖÜ]/.test(w.term);
  if (miscased) {
    const lower = w.term.toLowerCase();
    const survivor = canonical.get(lower);
    if (survivor) {
      const level = levelOf.get(survivor.id) ?? survivor.level;
      dropped.push({ from: w.id, to: `voc:${level}:${lower}` });
      continue;
    }
    const id = `voc:${w.level}:${lower}`;
    renamed.push({ from: w.id, to: id });
    kept.push({ ...w, term: lower, id });
    continue;
  }
  const level = levelOf.get(w.id);
  if (level) {
    const id = `voc:${level}:${w.term}`;
    demoted.push({ id, from: w.level, to: level });
    renamed.push({ from: w.id, to: id });
    kept.push({ ...w, level: level as Word['level'], id });
    continue;
  }
  kept.push(w);
}

// Sector counts are stored, so they have to follow the deletions. Only the
// counts move: the file keeps its existing order so the diff stays readable.
const fresh = new Map(rebuildSectors(kept, sectors).map((s) => [s.name, s]));
const newSectors = sectors.map((s) => fresh.get(s.name) ?? { ...s, count: 0, levels: [] })
  .filter((s) => s.count > 0);

console.log(`dropped ${dropped.length} duplicates · renamed ${renamed.length} · corpus ${vocab.length} → ${kept.length}`);
for (const d of demoted) console.log(`  level  ${d.id}: ${d.from} → ${d.to} (kept the earlier claim)`);
if (ruled.length) { console.log(`\nhand rulings (case-rulings.tsv), ${ruled.length}:`); for (const r of ruled) console.log('  ' + r); console.log(); }
for (const d of dropped) console.log(`  drop   ${d.from}  →  ${d.to}`);
for (const r of renamed) console.log(`  rename ${r.from}  →  ${r.to}`);

// The map is cumulative, not a snapshot of this run. A learner may be carrying a
// schedule under an id retired two passes ago, so regenerating the file from
// scratch would silently strip the migration that was keeping it alive. Earlier
// entries are carried forward, and any that pointed at an id *this* pass has now
// moved are followed to the new target, so one hop is always enough at runtime.
const thisPass = new Map([...dropped, ...renamed].map(({ from, to }) => [from, to] as const));
const map: Record<string, string> = {};
try {
  const { ID_MAP } = await import(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'));
  for (const [from, to] of Object.entries(ID_MAP as Record<string, string>)) {
    map[from] = thisPass.get(to) ?? to;
  }
} catch { /* first run — no map yet */ }
for (const [from, to] of thisPass) map[from] = to;

const dangling = Object.entries(map).filter(([, to]) => !kept.some((w) => w.id === to));
if (dangling.length) throw new Error(`id map points at cards that no longer exist: ${dangling.slice(0, 5).map(([f, t]) => `${f}→${t}`).join(', ')}`);

const migration = `// Generated by scripts/corpus/casefix.ts — do not edit by hand.
// Old card id → the id that replaced it, so a stored FSRS schedule survives a
// corpus correction instead of quietly resetting to new. Cumulative across every
// pass: an entry is only ever added or re-pointed, never dropped.
export const ID_MAP: Record<string, string> = ${JSON.stringify(map, null, 2)};
`;

if (write) {
  writeJSON(PATHS.vocab, kept);
  writeJSON(PATHS.sectors, newSectors);
  writeText(join(PATHS.repoRoot, 'src', 'data', 'idmap.ts'), migration);
  console.log('Wrote public/data/{vocab,sectors}.json and src/data/idmap.ts');
} else {
  console.log('Dry run — re-run with --write.');
}
