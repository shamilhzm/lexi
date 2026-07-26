// The flip face shows ex[0], so the first example *is* the card. Coverage and
// corruption are handled elsewhere (examples.ts); this is about what the learner
// reads first, where a technically-valid row can still be the wrong one to lead
// with: a fragment with no verb, a sentence that opens mid-quotation, a news
// paragraph three lines long.
//
// Most of these need no authoring at all. A card carrying two examples usually has
// a clean one further down — promoting it costs nothing and loses nothing, because
// the scraped row stays on the card, just no longer first. Only what cannot be
// fixed by reordering is worth a human's time, and that list is printed at the end.
//
// What reordering cannot fix takes an authored sentence, given as `id ⇥ de ⇥ en`
// and *prepended* rather than substituted: the scraped row is poor as a card face
// but it is still German the card can carry, and dropping it would push the card
// back under the two-example standard.
//
//   node scripts/corpus/frontfix.ts [--lead <tsv>] [--write]
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { readJSON, writeJSON, leadProblems } from './lib.ts';
import type { Word, Example } from '../../src/types.ts';

const write = process.argv.includes('--write');
const leadPath = process.argv[process.argv.indexOf('--lead') + 1];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const vocab = readJSON<Word[]>(PATHS.vocab);
const byId = new Map(vocab.map((w) => [w.id, w]));

// ---- authored leads -------------------------------------------------------
let led = 0;
const leadRejects: string[] = [];
if (leadPath && process.argv.includes('--lead')) {
  for (const line of readFileSync(leadPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [id, de, en] = t.split('\t').map((s) => (s ?? '').trim());
    const w = byId.get(id);
    if (!w) { leadRejects.push(`${id}: no such card`); continue; }
    if (!de || !en) { leadRejects.push(`${id}: needs both de and en`); continue; }
    const problems = leadProblems({ de, en, lvl: w.level } as Example);
    if (problems.length) { leadRejects.push(`${id}: the authored lead itself trips — ${problems.join(', ')}`); continue; }
    if ((w.ex ?? []).some((e) => e.de.trim() === de)) { leadRejects.push(`${id}: already on the card`); continue; }
    w.ex = [{ de, en, lvl: w.level }, ...(w.ex ?? [])];
    led++;
  }
  console.log(`authored leads applied: ${led}${leadRejects.length ? `  ·  rejected ${leadRejects.length}` : ''}`);
  for (const r of leadRejects) console.log(`  reject ${r}`);
}

const promoted: { id: string; why: string; from: string; to: string }[] = [];
const residue: { id: string; level: string; why: string; de: string }[] = [];

for (const w of vocab) {
  if (w.kind !== 'word') continue;
  const ex = w.ex ?? [];
  if (!ex.length) continue;
  const why = leadProblems(ex[0]);
  if (!why.length) continue;

  // Prefer a clean example at or below the card's level; a higher-level clean
  // sentence still beats a scraped one, so it is the fallback rather than excluded.
  const clean = ex.map((e, i) => ({ e, i })).slice(1).filter(({ e }) => !leadProblems(e).length);
  const atLevel = clean.filter(({ e }) => LEVELS.indexOf(e.lvl ?? w.level) <= LEVELS.indexOf(w.level));
  const pick = (atLevel[0] ?? clean[0]);

  if (!pick) { residue.push({ id: w.id, level: w.level, why: why.join(' · '), de: ex[0].de }); continue; }

  promoted.push({ id: w.id, why: why.join(' · '), from: ex[0].de, to: pick.e.de });
  w.ex = [pick.e, ...ex.filter((_, i) => i !== pick.i)];
}

for (const p of promoted) {
  console.log(`  ${p.id}\n    was (${p.why}): ${p.from.slice(0, 90)}${p.from.length > 90 ? '…' : ''}\n    now: ${p.to}`);
}
console.log(`\npromoted ${promoted.length} card(s); ${residue.length} need authoring:\n`);
for (const r of residue) console.log(`  [${r.level}] ${r.id}  (${r.why})\n     ${r.de.slice(0, 120)}${r.de.length > 120 ? '…' : ''}`);

if (write) { writeJSON(PATHS.vocab, vocab); console.log(`\nWrote ${PATHS.vocab}`); }
else console.log('\nDry run — re-run with --write.');
