// A second opinion on every gender in the corpus, from a source that is CC0.
//
// The corpus has one authority — de.wiktionary, consulted card by card as each was
// authored — and a single authority cannot be wrong out loud. Nothing in the
// pipeline has ever asked a *different* source whether `das Schild` is neuter, so a
// gender that was wrong when it was written would have stayed wrong quietly.
//
// Wikidata lexemes are the right second opinion and were nearly not used:
// ATTRIBUTIONS listed them as *"not yet verified — the SPARQL endpoint returned 502
// when probed on 2026-08-15"*. Probed again on 2026-08-29 the endpoint answers, and
// the German lexeme set turns out to be large and populated:
//
//     noun      188,949   96% with a gender stated   95% with inflected forms
//     verb       20,428                              94% with inflected forms
//     adjective  26,862                              91% with inflected forms
//     adverb      2,656                             100% with inflected forms
//
// That is roughly twenty-eight times Lexi's whole corpus in nouns alone, under CC0
// — no attribution, no share-alike, nothing for ATTRIBUTIONS to carry beyond a
// courtesy note.
//
// ## Two modes
//
//   `--check`   every single-word noun in the corpus, matched by lemma, gender
//               compared. This is the audit: a disagreement is a candidate defect
//               in Lexi, not in Wikidata, until someone looks.
//   `--gaps`    the words de.wiktionary has no page for, looked up here instead.
//               This is the expansion path.
//
// ## Two things learned the hard way, both worth keeping
//
//   * **Match the language-tagged literal, never a `FILTER`.** The first version
//     bound `?lemma` from a plain string and compared with `FILTER(STR(?lem) = ?lemma)`,
//     which forces a scan and returned **502** — the same failure that got this
//     source shelved in the first place. `VALUES ?lem { "Haus"@de }` against
//     `wikibase:lemma` is an index lookup and answers in a second.
//   * **A label match is not a German match.** `wbsearchentities` returns lexemes in
//     every language: `Disruption` gives English first, `Diskursanalyse` gives
//     Swedish, Norwegian and Danish. Bind `dct:language wd:Q188`, exactly as
//     `verify.ts` reads only the `{{Sprache|Deutsch}}` section of a wiktionary page.
//
// Run: `npm run corpus:wikidata -- --check`  ·  `-- --gaps`
import { PATHS } from './config.ts';
import { loadCorpus } from './lib.ts';
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import type { Word } from '../../src/types.ts';

const MODE = process.argv.includes('--gaps') ? 'gaps' : 'check';
const CACHE = join('scripts', 'corpus', 'data', 'wiktionary');
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = {
  'user-agent': 'lexi-corpus/1.0 (+https://github.com/shamilhzm/lexi)',
  accept: 'application/sparql-results+json',
  'content-type': 'application/x-www-form-urlencoded',
};
const GENDER: Record<string, string> = { Q499327: 'der', Q1775415: 'die', Q1775461: 'das' };
const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST, not GET: a 250-lemma VALUES clause is longer than some proxies will pass
 *  in a query string, and a truncated query fails as a syntax error rather than as
 *  a length error, which is a confusing hour. */
async function sparql(query: string, tries = 5): Promise<Record<string, { value: string }>[]> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: UA, body: new URLSearchParams({ query }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json() as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(4000 * (i + 1));
    }
  }
  return [];
}

const qid = (uri: string) => uri.slice(uri.lastIndexOf('/') + 1);

/** Lemma → the genders Wikidata attests, for a batch of words. */
async function gendersFor(lemmas: string[], chunk = 250): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  for (let i = 0; i < lemmas.length; i += chunk) {
    const vals = lemmas.slice(i, i + chunk)
      .map((w) => `"${w.replace(/["\\]/g, '')}"@de`).join(' ');
    const rows = await sparql(
      `SELECT ?lem ?g WHERE { VALUES ?lem { ${vals} } ` +
      `?l wikibase:lemma ?lem ; wikibase:lexicalCategory wd:Q1084 ; wdt:P5185 ?g . }`);
    for (const r of rows) {
      const g = GENDER[qid(r.g.value)];
      if (!g) continue;
      const k = r.lem.value;
      if (!out.has(k)) out.set(k, new Set());
      out.get(k)!.add(g);
    }
    process.stdout.write(`\r  ${Math.min(i + chunk, lemmas.length)}/${lemmas.length} · matched ${out.size}   `);
    await sleep(800);
  }
  process.stdout.write('\n');
  return out;
}

async function check() {
  const corpus = loadCorpus(PATHS.vocab) as Word[];
  // Multi-word and hyphenated headwords are Lexi's own notation, not lemmas any
  // dictionary indexes, so they are out of scope rather than counted as misses.
  const nouns = corpus.filter((w) => w.pos === 'noun' && w.gender
    && !stripArticle(w.term).includes(' ') && !stripArticle(w.term).includes('-'));
  const lemmas = [...new Set(nouns.map((w) => stripArticle(w.term)))].sort();
  console.log(`gender cross-check · ${nouns.length} single-word nouns\n`);

  const wd = await gendersFor(lemmas);
  const agree: Word[] = [], disagree: [Word, string][] = [];
  for (const w of nouns) {
    const g = wd.get(stripArticle(w.term));
    if (!g?.size) continue;
    if (g.has(w.gender!)) agree.push(w);
    else disagree.push([w, [...g].sort().join('/')]);
  }
  const cov = agree.length + disagree.length;
  console.log(`\n  covered by a Wikidata lexeme: ${cov}/${nouns.length} (${((100 * cov) / nouns.length).toFixed(1)}%)`);
  console.log(`  agree:    ${agree.length}  (${((100 * agree.length) / cov).toFixed(2)}%)`);
  console.log(`  DISAGREE: ${disagree.length}\n`);
  for (const [w, g] of disagree) console.log(`     Lexi ${w.gender!.padEnd(4)} ${w.term.padEnd(32)} Wikidata ${g}`);
  console.log('\n  A disagreement is a candidate defect in Lexi until someone looks — but check');
  console.log('  first whether the card is plural-only, where "die" is the plural article and');
  console.log('  not a gender, and the two sources are describing different forms.');
}

async function gaps() {
  if (!existsSync(CACHE)) { console.log('no wiktionary cache — run an authoring batch first.'); return; }
  const absent = readdirSync(CACHE)
    .filter((f) => readFileSync(join(CACHE, f), 'utf8') === '\0MISSING')
    .map((f) => decodeURIComponent(f.replace(/\.txt$/, '')))
    .filter((w) => !w.includes('(') && !w.includes(' '))
    .sort();
  console.log(`the ${absent.length} words de.wiktionary has no page for, looked up on Wikidata\n`);
  const wd = await gendersFor(absent);
  for (const w of absent) {
    const g = wd.get(w);
    console.log(`     ${(g ? [...g].join('/') : '—').padEnd(5)} ${w}`);
  }
  console.log(`\n  covered ${wd.size}/${absent.length} (${((100 * wd.size) / absent.length).toFixed(0)}%)`);
  console.log('  Gender only. Wikidata\'s noun *forms* are frequently generated rather than');
  console.log('  attested — it offers "die Datensicherheiten" without hesitation — so a plural');
  console.log('  from here is a candidate for a human ruling, never a fact.');
}

// Importing this file must not query anything. `compose-ipa` learned the same
// lesson the hard way — a module that does its work at import time has no safe
// consumer — and `verify.ts` now imports `wikidataGender` from here.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await (MODE === 'gaps' ? gaps() : check());
}

// ---- the per-card lookup, for the authoring gate ---------------------------

const LEX_CACHE = join('scripts', 'corpus', 'data', 'wikidata');
/** A lemma the query ran for and found nothing under. Cached like a `missingtitle`
 *  from wiktionary, and for the same reason: "no lexeme" is a durable fact, where a
 *  network failure is not and must never be written down as one. */
const NONE = '\0NONE';

/** The genders Wikidata attests for a German noun lemma, or `null` if it has no
 *  German noun lexeme. Throws if the endpoint cannot be reached — unreachable is
 *  not the same as unattested, which is the distinction `verify.ts` already draws
 *  for wiktionary and the one worth getting right in both places. */
export async function wikidataGender(lemma: string): Promise<string[] | null> {
  mkdirSync(LEX_CACHE, { recursive: true });
  const file = join(LEX_CACHE, `${encodeURIComponent(lemma)}.txt`);
  if (existsSync(file)) {
    const raw = readFileSync(file, 'utf8');
    return raw === NONE ? null : raw.split(',').filter(Boolean);
  }
  const rows = await sparql(
    `SELECT ?g WHERE { VALUES ?lem { "${lemma.replace(/["\\]/g, '')}"@de } ` +
    `?l wikibase:lemma ?lem ; dct:language wd:Q188 ; wikibase:lexicalCategory wd:Q1084 ; wdt:P5185 ?g . }`, 3);
  const genders = [...new Set(rows.map((r) => GENDER[qid(r.g.value)]).filter(Boolean))];
  writeFileSync(file, genders.length ? genders.join(',') : NONE);
  return genders.length ? genders : null;
}
