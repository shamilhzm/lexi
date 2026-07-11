// Gender/plural cross-check (validation). Compares the corpus's noun gender and
// plural against the INDEPENDENT German Categorized Wordlist (CC BY 4.0) to surface
// likely Wiktextract-derived errors. Reports the agreement rate and lists every
// conflict for human review — it does not mutate the corpus. Nouns the wordlist
// files under more than one gender (der/die See) are skipped, not flagged.
//
//   npm run corpus:crosscheck                 # full report
//   npm run corpus:crosscheck -- --limit=50   # cap the printed conflict list
//
// No-op with a hint if the wordlist hasn't been fetched (`npm run corpus:fetch`).
import './shim.ts';
import { PATHS } from './config.ts';
import { loadCorpus, stripArticle, type Word } from './lib.ts';
import { loadWordlist, type Wordlist } from './sources/wordlist.ts';

export interface CrossCheck {
  checked: number;                                          // nouns present in both
  agree: number;
  conflicts: { term: string; corpus: string; wordlist: string }[];
  plChecked: number;
  plAttested: number;
  plMissing: { term: string; plural: string }[];
}

/** Pure comparison so it can be self-tested without touching the filesystem. */
export function crossCheck(nouns: Word[], wl: Wordlist): CrossCheck {
  let checked = 0, agree = 0, plChecked = 0, plAttested = 0;
  const conflicts: CrossCheck['conflicts'] = [];
  const plMissing: CrossCheck['plMissing'] = [];

  for (const w of nouns) {
    const key = stripArticle(w.term).toLowerCase();
    if (wl.genderAmbig.has(key)) continue;                  // legitimately two-gendered
    const g = wl.gender.get(key);
    if (g && w.gender) {
      checked++;
      if (g === w.gender) agree++;
      else conflicts.push({ term: w.term, corpus: w.gender, wordlist: g });
    }
    // Plural attestation (soft): the wordlist lists plural FORMS, not singular→plural
    // pairs, so this only asks "is this plural a known plural?" — a typo signal.
    if (w.plural && /^die\s/i.test(w.plural)) {
      const pk = stripArticle(w.plural).toLowerCase();
      plChecked++;
      if (wl.plural.has(pk)) plAttested++;
      else plMissing.push({ term: w.term, plural: w.plural });
    }
  }
  return { checked, agree, conflicts, plChecked, plAttested, plMissing };
}

function opt(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split('=')[1] : undefined;
}

function main() {
  const wl = loadWordlist(PATHS.wordlistDir);
  if (!wl.gender.size) {
    console.error(`No wordlist under ${PATHS.wordlistDir}. Run \`npm run corpus:fetch\` first.`);
    process.exit(1);
  }
  const nouns = loadCorpus(PATHS.vocab).filter((w) => w.kind === 'word' && w.pos === 'noun');
  const r = crossCheck(nouns, wl);
  const limit = opt('limit') ? parseInt(opt('limit')!, 10) : 40;
  const pct = (n: number, d: number) => (d ? (100 * n / d).toFixed(1) : '—') + '%';

  console.log(`\n=== Gender/plural cross-check vs. German Categorized Wordlist ===`);
  console.log(`Corpus nouns: ${nouns.length} · wordlist genders: ${wl.gender.size} (+${wl.genderAmbig.size} two-gendered)`);
  console.log(`Gender — overlap ${r.checked} · agree ${r.agree} (${pct(r.agree, r.checked)}) · conflicts ${r.conflicts.length}`);
  console.log(`Plural — checked ${r.plChecked} · attested ${r.plAttested} (${pct(r.plAttested, r.plChecked)}) · unattested ${r.plMissing.length}`);

  if (r.conflicts.length) {
    console.log(`\n--- gender conflicts (corpus vs. wordlist — review each; either side can be wrong) ---`);
    for (const c of r.conflicts.slice(0, limit)) console.log(`  ${c.term}  corpus=${c.corpus}  wordlist=${c.wordlist}`);
    if (r.conflicts.length > limit) console.log(`  … +${r.conflicts.length - limit} more (raise --limit=)`);
  }
  if (r.plMissing.length) {
    console.log(`\n--- plurals not attested in the wordlist (possible typos or rare forms) ---`);
    for (const m of r.plMissing.slice(0, limit)) console.log(`  ${m.term} → ${m.plural}`);
    if (r.plMissing.length > limit) console.log(`  … +${r.plMissing.length - limit} more`);
  }
  console.log(`\nInformational only — no files changed.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
