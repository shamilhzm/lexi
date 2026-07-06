// One-time / repeatable re-sectoring of pipeline-added cards from the curated
// sector map. Only touches cards recorded in provenance.json (i.e. cards this
// pipeline created), so hand-curated built-in cards are never moved. Rebuilds
// sectors.json afterward.
//
//   npm run corpus:resector            # dry run
//   npm run corpus:resector -- --write # apply
import { PATHS } from './config.ts';
import { loadCorpus, loadSectors, readJSON, writeJSON, fileExists, lemmaKey, type Word, type Provenance } from './lib.ts';
import { loadSectorReference, indexSectors, resolveField, rebuildSectors } from './sectors.ts';

const write = process.argv.includes('--write');
const vocab = loadCorpus(PATHS.vocab);
const sectors = loadSectors(PATHS.sectors);
const sIndex = indexSectors(sectors);
const ref = loadSectorReference(PATHS.sectorReference);
const prov: Provenance[] = fileExists(PATHS.provenance) ? readJSON<Provenance[]>(PATHS.provenance) : [];
const pipelineIds = new Set(prov.map((p) => p.id));

const moves: Record<string, number> = {};
let changed = 0;
for (const w of vocab as Word[]) {
  if (w.kind !== 'word' || !pipelineIds.has(w.id)) continue; // only pipeline-added cards
  const proposed = ref.get(lemmaKey(w.term));
  if (!proposed) continue;
  const { field } = resolveField(sIndex, proposed);
  if (field !== w.field) { moves[`${w.field} → ${field}`] = (moves[`${w.field} → ${field}`] ?? 0) + 1; w.field = field; changed++; }
}

const newSectors = rebuildSectors(vocab, sectors);
console.log(`Re-sectored ${changed} card(s).`);
for (const [k, n] of Object.entries(moves).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);
if (write && changed) {
  writeJSON(PATHS.vocab, vocab);
  writeJSON(PATHS.sectors, newSectors);
  console.log('\nWrote public/data/{vocab,sectors}.json.');
} else if (changed) {
  console.log('\nDry run — re-run with --write to apply.');
}
