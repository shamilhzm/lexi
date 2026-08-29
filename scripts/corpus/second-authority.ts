// What should Lexi consult when de.wiktionary has never heard of a word?
//
// The authoring gate treats de.wiktionary as the authority on the four facts a card
// must not guess — gender, plural, part of speech, IPA — and refuses a card the
// dictionary cannot confirm. That is the right instinct and it has a false-negative
// mode: **a missing page is not a missing word.** `die Arbeitsatmosphäre` is
// ordinary German and de.wiktionary has no entry for it, so the card was refused.
//
// This script measures the shape of that gap before anyone buys a way out of it.
// Three questions, in the order worth asking them:
//
//   1. How reliably does the *compound head* predict a compound's gender? If the
//      answer is "almost always", then for the largest class of missing words Lexi
//      already owns the authority — it teaches the rule at B1.
//   2. Of the words de.wiktionary actually lacks, how many are closed by a rule
//      (a derivational suffix, a nominalised infinitive, a compound head) rather
//      than by a lookup?
//   3. For whatever is left, does a second *open* source cover it? `--wikidata`
//      probes Wikidata lexemes, which are CC0 — no attribution, no redistribution
//      restriction, and Lexi ships an MIT corpus loader into a public repo.
//
// Duden is deliberately not probed. Its public API is spellcheck and synonyms and
// exposes no lexical facts at all; the dictionary itself is © Cornelsen, and in
// Germany a database also carries the sui-generis right (§87b UrhG) against
// systematic extraction. Reading it to check a card by hand is fine and always was.
// Harvesting it into a redistributable corpus is not, which is the only use this
// script is about.
//
// Two hazards found while writing this, both already known to the codebase in
// another form:
//
//   * `wbsearchentities` matches a label across **every** language — `Disruption`
//     returns the English lexeme first and `Diskursanalyse` returns Swedish,
//     Norwegian and Danish. Filter on `language === Q188`, exactly as `verify.ts`
//     takes only the `{{Sprache|Deutsch}}` section of a wiktionary page.
//   * Wikidata's noun forms are frequently generated rather than attested, so it
//     will happily hand back `die Datensicherheiten` and `die Mitverantwortungen`.
//     That is the mass-noun plural trap LESSONS already records. A plural from here
//     is a *candidate*, never a fact.
//
// Run: `npm run corpus:second-authority`  ·  add `--wikidata` for the network probe.
import { PATHS } from './config.ts';
import { loadCorpus } from './lib.ts';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Word } from '../../src/types.ts';

const WIKIDATA = process.argv.includes('--wikidata');
const CACHE = join('scripts', 'corpus', 'data', 'wiktionary');
const MISSING = '\0MISSING';
const strip = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** Suffixes whose gender is exceptionless in German, with the plural they take.
 *  This is not a heuristic — it is the rule the course book prints as a TIPP and
 *  the rule Lexi's own A2 Wortbildung topic teaches. */
const SUFFIX: Record<string, { g: string; pl: string }> = {
  ung: { g: 'die', pl: '-en' }, heit: { g: 'die', pl: '-en' }, keit: { g: 'die', pl: '-en' },
  schaft: { g: 'die', pl: '-en' }, ität: { g: 'die', pl: '-en' }, ion: { g: 'die', pl: '-en' },
  ismus: { g: 'der', pl: '-men' }, ling: { g: 'der', pl: '-e' },
  chen: { g: 'das', pl: '—' }, lein: { g: 'das', pl: '—' },
  nis: { g: 'das', pl: '-se' }, tum: { g: 'das', pl: '-tümer' },
};

function build(corpus: Word[]) {
  const words = corpus.filter((w) => w.kind === 'word');
  const nouns = words.filter((w) => w.pos === 'noun' && w.gender && !strip(w.term).includes(' '));
  const heads = new Map<string, Word>();
  for (const n of nouns) {
    const k = strip(n.term).toLowerCase();
    if (!heads.has(k)) heads.set(k, n);
  }
  // A modifier may be a noun, an adjective, or a verb stem — Bratwurst, Weißwurst.
  const mods = new Set<string>();
  for (const w of words) {
    const t = strip(w.term).toLowerCase();
    if (t.includes(' ') || t.length < 3) continue;
    mods.add(t);
    if (w.pos === 'verb') for (const s of ['en', 'n']) {
      if (t.endsWith(s) && t.length - s.length >= 3) mods.add(t.slice(0, -s.length));
    }
  }
  const verbs = new Set(words.filter((w) => w.pos === 'verb').map((w) => strip(w.term).toLowerCase()));

  /** Longest head that leaves a modifier which is itself a known word.
   *
   *  Requiring **both** halves is the whole difference between a measurement and a
   *  coincidence. Head-only matching "decomposed" `Morgen` into `Gen`, `Distanz`
   *  into `Tanz` and `Antwort` into `Wort`, and reported a 95% rule with 53
   *  counter-examples that were not compounds at all. */
  const split = (w: string) => {
    const lw = w.toLowerCase();
    for (let L = w.length - 3; L > 2; L--) {
      const h = heads.get(lw.slice(-L));
      if (!h || strip(h.term).toLowerCase() === lw) continue;
      const mod = lw.slice(0, -L);
      for (const f of ['s', 'es', 'n', 'en', 'er', '']) {
        if (f && !mod.endsWith(f)) continue;
        const base = f ? mod.slice(0, -f.length) : mod;
        if (base.length >= 3 && mods.has(base)) return { head: h, base, fugen: f };
      }
    }
    return null;
  };
  return { nouns, split, verbs };
}

async function main() {
  const corpus = loadCorpus(PATHS.vocab) as Word[];
  const { nouns, split, verbs } = build(corpus);

  // ---- 1. does the head decide the gender? --------------------------------
  let ok = 0; const mism: string[] = [];
  for (const c of nouns) {
    const s = split(strip(c.term));
    if (!s) continue;
    if (s.head.gender === c.gender) ok++;
    else mism.push(`${c.term} = ${s.base}${s.fugen ? '+' + s.fugen : ''} + ${s.head.term}`);
  }
  const tot = ok + mism.length;
  console.log('1 · the compound head as an authority on gender\n');
  console.log(`  nouns decomposed into modifier + head, both already cards: ${tot}`);
  console.log(`  the head's gender is the compound's: ${ok}  (${((100 * ok) / tot).toFixed(2)}%)`);
  console.log(`  mismatches: ${mism.length}`);
  for (const m of mism) console.log(`     ${m}`);
  console.log('\n  Hand-check the mismatches before believing the rate — most are bad splits.\n');

  // ---- 2. what does de.wiktionary actually lack? ---------------------------
  if (!existsSync(CACHE)) {
    console.log('2 · no wiktionary cache yet — run an authoring batch first.');
    return;
  }
  const absent = readdirSync(CACHE)
    .filter((f) => readFileSync(join(CACHE, f), 'utf8') === MISSING)
    .map((f) => decodeURIComponent(f.replace(/\.txt$/, '')))
    .sort();

  const bucket = { suffix: [] as string[], infinitive: [] as string[], compound: [] as string[], lookup: [] as string[] };
  for (const w of absent) {
    if (w.includes('(') || w.includes(' ')) { bucket.lookup.push(`${w}  (a sense-tagged key, not a headword)`); continue; }
    const lw = w.toLowerCase();
    if (verbs.has(lw) || (lw.endsWith('en') && verbs.has(lw))) { bucket.infinitive.push(w); continue; }
    const suf = Object.keys(SUFFIX).sort((a, b) => b.length - a.length).find((s) => lw.endsWith(s));
    if (suf) { bucket.suffix.push(`${w} → ${SUFFIX[suf].g}, pl. ${SUFFIX[suf].pl}`); continue; }
    const s = split(w);
    if (s) { bucket.compound.push(`${w} → ${s.head.gender} (head ${strip(s.head.term)})`); continue; }
    bucket.lookup.push(w);
  }
  const n = absent.length;
  const pc = (k: string[]) => `${String(k.length).padStart(3)}  ${((100 * k.length) / n).toFixed(0).padStart(3)}%`;
  console.log(`2 · the ${n} pages de.wiktionary does not have\n`);
  console.log(`  ${pc(bucket.suffix)}   closed by a derivational suffix`);
  console.log(`  ${pc(bucket.infinitive)}   closed by the nominalised-infinitive rule`);
  console.log(`  ${pc(bucket.compound)}   closed by a compound head already in the corpus`);
  console.log(`  ${pc(bucket.lookup)}   would need a second source\n`);
  for (const w of bucket.lookup) console.log(`     ${w}`);

  if (!WIKIDATA) { console.log('\n(pass --wikidata to probe the CC0 lexeme set for the remainder)'); return; }

  // ---- 3. does an open second source cover the remainder? ------------------
  const GENDER: Record<string, string> = { Q499327: 'der', Q1775415: 'die', Q1775461: 'das' };
  const UA = { 'user-agent': 'lexi-corpus/1.0 (+https://github.com/shamilhzm/lexi)' };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const probe = absent.filter((w) => !w.includes('(') && !w.includes(' '));
  let found = 0, withGender = 0;
  console.log(`\n3 · Wikidata lexemes (CC0), probed for ${probe.length} words\n`);
  for (const w of probe) {
    const s = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(w)}&language=de&type=lexeme&format=json`, { headers: UA })
      .then((r) => r.json() as Promise<{ search?: { id: string; label: string }[] }>).catch(() => ({}));
    const cands = (s.search ?? []).filter((x) => x.label.toLowerCase() === w.toLowerCase());
    let printed = false;
    for (const c of cands) {
      const d = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${c.id}.json`, { headers: UA })
        .then((r) => r.json() as Promise<{ entities: Record<string, any> }>).catch(() => null);
      const lex = d && Object.values(d.entities)[0];
      // Q188 is German. Without this every label match in every language qualifies.
      if (!lex || lex.language !== 'Q188') continue;
      const g = GENDER[lex.claims?.P5185?.[0]?.mainsnak?.datavalue?.value?.id ?? ''] ?? '?';
      const pl = lex.forms?.find((f: any) => f.grammaticalFeatures?.includes('Q146786'));
      found++; if (g !== '?') withGender++;
      console.log(`     ${g.padEnd(4)} ${w.padEnd(30)} pl. ${pl ? Object.values(pl.representations)[0]!['value'] : '—'}   ${c.id}`);
      printed = true; break;
    }
    if (!printed) console.log(`     —    ${w.padEnd(30)} no German lexeme`);
    await sleep(150);
  }
  console.log(`\n  covered ${found}/${probe.length} (${((100 * found) / probe.length).toFixed(0)}%) · gender stated for ${withGender}`);
  console.log('  A plural from here is a candidate, not a fact — the forms are often generated.');
}

main();
