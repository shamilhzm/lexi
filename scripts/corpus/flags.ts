// Maintainer side of the in-app flag button (UX loop closed here). Learners
// flag suspect cards during sessions; flags ride their backup export under
// settings['lexi.flags.v1']. Feed one or more backup files to this script and
// it lists every flagged card against its current corpus data, ready for
// review — fix the card in the pipeline, never by hand-editing JSON.
//
//   npm run corpus:flags -- path/to/lexi-backup.json [more-backups.json …]
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { readJSON, type Word } from './lib.ts';

interface FlagEvent { id: string; term: string; at: number; }

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log('Usage: npm run corpus:flags -- <backup.json> [more backups …]');
  console.log('Lists cards learners flagged in-app against their current corpus data.');
  process.exit(1);
}

// Collect flags across all provided backups, deduped by card id (earliest wins).
const flags = new Map<string, FlagEvent>();
for (const f of files) {
  let backup: unknown;
  try { backup = JSON.parse(readFileSync(f, 'utf8')); } catch {
    console.error(`! ${f}: not readable JSON — skipped`);
    continue;
  }
  const raw = (backup as { settings?: Record<string, string> })?.settings?.['lexi.flags.v1'];
  if (!raw) { console.error(`! ${f}: no flags in this backup`); continue; }
  try {
    for (const e of JSON.parse(raw) as FlagEvent[]) {
      if (e?.id && !flags.has(e.id)) flags.set(e.id, e);
    }
  } catch { console.error(`! ${f}: flag payload unparsable — skipped`); }
}

if (flags.size === 0) { console.log('No flags found.'); process.exit(0); }

const vocab = readJSON<Word[]>(PATHS.vocab);
const byId = new Map(vocab.map((w) => [w.id, w]));

const found: FlagEvent[] = [];
const missing: FlagEvent[] = [];
for (const e of flags.values()) (byId.has(e.id) ? found : missing).push(e);
const at = (e: FlagEvent) => new Date(e.at).toISOString().slice(0, 10);

console.log(`${flags.size} flagged card(s) across ${files.length} backup(s):\n`);
for (const e of found.sort((a, b) => b.at - a.at)) {
  const w = byId.get(e.id)!;
  console.log(`[${w.level}] ${w.term} — ${w.en}   (flagged ${at(e)})`);
  const bits = [
    w.gender && `gender: ${w.gender}`,
    w.plural && `plural: ${w.plural}`,
    w.ipa && `ipa: /${w.ipa}/`,
  ].filter(Boolean);
  if (bits.length) console.log(`    ${bits.join(' · ')}`);
  if (w.ex[0]?.de) console.log(`    «${w.ex[0].de}»`);
  console.log(`    id: ${e.id}`);
}
if (missing.length) {
  console.log('\nNot in the shipped corpus (user-mined or since-removed):');
  for (const e of missing) console.log(`  ${e.term} (${e.id}, flagged ${at(e)})`);
}
console.log('\nFix via the pipeline (build/enrich/grammar-supplement) and re-validate — never hand-edit public/data/*.json.');
