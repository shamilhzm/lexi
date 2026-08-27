// Transcribe a compound from its parts, rather than writing one out.
//
// Six cards carry no IPA and no de.wiktionary entry, because they are compounds
// and dictionaries do not list every compound a language can form. The obvious
// shortcut is to type the transcription myself — I can, and CLAUDE.md forbids it:
// facts are never generated. So this derives one instead, from parts that *are*
// attested, by a rule the corpus can be checked against.
//
// The rule, read off Lexi's own data rather than off a phonology textbook:
//   ˈkʁaŋkn̩ˌhaʊ̯s · ˈfluːkˌhaːfn̩ · ˈʁaʊ̯sˌkɔmən · ˈʊnˌklaːɐ̯
// primary stress on the first constituent, secondary on the next, and any stress
// *inside* a constituent demoted away. `Einbau` is ˈaɪ̯nˌbaʊ̯ alone and contributes
// ˈaɪ̯nbaʊ̯ to `Einbauschrank` — a compound has one primary stress, not two.
//
// Two guards, because a segmentation is a claim about a word:
//   · the parts, concatenated, must spell the headword exactly — a wrong split
//     cannot survive it (`Ski`+`Jacke` yes, `Skij`+`acke` no)
//   · every part must have an attested transcription; one miss refuses the card
//
// Nothing here is written by hand except the split, and the split is checked
// against the spelling it claims to describe.
//
//   node scripts/authoring/compose-ipa.ts [--out batch.json]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PATHS } from '../corpus/config.ts';
import { loadCorpus, lookupLemma } from '../corpus/lib.ts';
import { wikitext, parseFacts } from './verify.ts';
import type { Word } from '../../src/types.ts';

/** card id → the constituents it is built from, as de.wiktionary lemmas. */
const SEGMENTS: Record<string, string[]> = {
  'voc:B2:der Einbauschrank':   ['Einbau', 'Schrank'],
  'voc:A2:die Skijacke':        ['Ski', 'Jacke'],
  'voc:A2:das Snowboardfahren': ['Snowboard', 'fahren'],
  'voc:A2:reinkommen':          ['rein', 'kommen'],
  'voc:A2:reingehen':           ['rein', 'gehen'],
  'voc:A2:unpraktisch':         ['un-', 'praktisch'],
};

const arg = (n: string): string | undefined => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const OUT = arg('--out') ?? 'scripts/authoring/batches/ipa-composed-01.json';

/** One primary stress, on the first constituent; secondary on the rest. */
export function compose(parts: string[]): string {
  return parts.map((raw, i) => {
    const s = raw.replace(/ˌ/g, '');
    if (i === 0) return /ˈ/.test(s) ? s : `ˈ${s}`;
    const demoted = s.replace(/ˈ/g, 'ˌ');
    return /ˌ/.test(demoted) ? demoted : `ˌ${demoted}`;
  }).join('');
}

/** A prefix is written with its hyphen (`un-`); the spelling check drops it. */
const spell = (p: string) => p.replace(/-$/, '');

// Importing this file must not fetch anything or write anything: the unit test
// imports `compose`, and on the first run it pulled six wiktionary pages and
// overwrote the batch as a side effect of `vitest`. A module that does its work
// at import time has no safe consumer.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();

async function main() {
const corpus = loadCorpus(PATHS.vocab) as Word[];
const byId = new Map(corpus.map((w) => [w.id, w]));
const rows: { id: string; expect: { ipa: string | null }; ipa: string; src: string }[] = [];
const refused: string[] = [];

for (const [id, parts] of Object.entries(SEGMENTS)) {
  const w = byId.get(id);
  if (!w) { refused.push(`${id} — no such card`); continue; }
  if ((w.ipa ?? '').trim()) { refused.push(`${id} — already has an ipa`); continue; }

  const joined = parts.map(spell).join('').toLowerCase();
  const head = lookupLemma(w.term).replace(/\s+/g, '').toLowerCase();
  if (joined !== head) { refused.push(`${id} — ${parts.join('+')} spells "${joined}", not "${head}"`); continue; }

  const got: string[] = [];
  let missing = '';
  for (const p of parts) {
    let wt: string | null = null;
    try { wt = await wikitext(p); } catch { missing = `${p} (unreachable)`; break; }
    const ipa = wt ? parseFacts(wt).ipa : null;
    if (!ipa) { missing = p; break; }
    got.push(ipa);
  }
  if (missing) { refused.push(`${id} — no attested transcription for "${missing}"`); continue; }

  rows.push({
    id, expect: { ipa: null }, ipa: compose(got),
    src: parts.map((p, i) => `${p} /${got[i]}/`).join(' + '),
  });
}

writeFileSync(OUT, JSON.stringify(rows, null, 2) + '\n');
console.log(`composed ${rows.length} · refused ${refused.length}`);
for (const r of rows) console.log(`   ${r.id.padEnd(30)} ${r.ipa.padEnd(22)} ← ${r.src}`);
for (const r of refused) console.log(`   ✗ ${r}`);
console.log(`\n✓ wrote ${OUT}`);
}
