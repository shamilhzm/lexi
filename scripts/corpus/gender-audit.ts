// Check the gender and plural of cards that are already shipped.
//
// `scripts/authoring/verify.ts` refuses to write a *new* card whose gender the
// dictionary disagrees with. It has never been pointed at the cards that were
// already there — and 559 of the 848 B2+ nouns are hand-curated, so nothing has
// ever machine-checked them.
//
// Two were found by hand on 2026-08-13: **`die Vorstand`** (it is *der*) and
// **`die Babyboomer`** (also *der*). A wrong gender is not a missing feature; it
// is a fact the learner memorises and then has to unlearn, and it is exactly what
// the authoring gate exists to prevent going forward.
//
// ## Report only
//
// This never writes to the corpus. It emits a list to review, because a
// dictionary disagreement is evidence and not a verdict — see the nominalised
// adjectives below, where the dictionary is right and so is the card.
//
// ## The false-positive classes, excluded by name
//
// **Nominalised adjectives take all three genders.** *der Einzelne* and *die
// Einzelne* are both correct; de.wiktionary documents the lemma under one of
// them, so a naive comparison reports the card as wrong. This was measured: of
// two disagreements in a 90-card sample, one was `die Babyboomer` (real) and one
// was `der Einzelne` (the check being wrong). The same applies to *der Bekannte*,
// *die Angestellte*, *der Deutsche*, *der Verwandte*.
//
// So a page that declares adjectival declension is reported as `ambiguous`, never
// as a mismatch — the same reasoning `caseSafe` uses to exclude n-Deklination
// masculines from the Kasus drill.
//
// ## Resumable
//
// Every page fetched is cached under the gitignored `scripts/corpus/data/`, so a
// re-run costs nothing for anything already seen and the audit can be stopped and
// restarted. de.wiktionary rate-limits: a 429 backs off and retries rather than
// counting as a miss, because a network hiccup that silently became "no entry for
// Fahrer" is a bug this pipeline has had before.
//
//   npm run corpus:gender-audit                    # every level
//   npm run corpus:gender-audit -- --level=B2,C1,C2
//   npm run corpus:gender-audit -- --limit=100
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { loadCorpus, type Word } from './lib.ts';

const CACHE = join('scripts', 'corpus', 'data', 'wiktionary');
const OUT = join('scripts', 'corpus', 'gender-audit.tsv');

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const levels = new Set((arg('level') ?? 'A1,A2,B1,B2,C1,C2').split(',').map((s) => s.trim()));
const limit = Number(arg('limit') ?? '0') || Infinity;

const GENUS: Record<string, 'der' | 'die' | 'das'> = { m: 'der', f: 'die', n: 'das' };
const strip = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();
const deumlaut = (t: string) => t.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

mkdirSync(CACHE, { recursive: true });

/** Wikitext for a page. Disk-cached; `''` means the page genuinely does not
 *  exist, `null` means the fetch failed and the card is left undecided. */
async function wikitext(page: string): Promise<string | null> {
  const file = join(CACHE, `${encodeURIComponent(page)}.txt`);
  if (existsSync(file)) return readFileSync(file, 'utf8');

  const url = 'https://de.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json'
    + `&page=${encodeURIComponent(page)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'lexi-corpus/1.0 (+https://github.com/shamilhzm/lexi)' } });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const json = await res.json() as { parse?: { wikitext?: { '*': string } }; error?: { code: string } };
      const text = json?.parse?.wikitext?.['*'];
      if (text) { writeFileSync(file, text); return text; }
      // A real "no such page" is cached as empty so it is not re-fetched forever.
      if (json?.error?.code === 'missingtitle') { writeFileSync(file, ''); return ''; }
    } catch { /* fall through to the backoff */ }
    await sleep(900 * (attempt + 1));
  }
  return null; // undecided, and deliberately not cached
}

/** Adjectival nouns decline for all three genders, so the dictionary's single
 *  headword is not evidence against the card. */
const isAdjectivalNoun = (wt: string) =>
  /adjektivische[rn]?\s+Deklination|substantiviert/i.test(wt);

/** The corpus writes plurals **five** ways, not the two this file first assumed:
 *  2,766 full (`die Namen`), 208 suffix (`-en`), 102 `nur Singular`, 75 `—`, and
 *  11 `nur Plural`. The last three are not plurals to compare — they are the card
 *  *asserting there is nothing useful to teach here*, and the dictionary almost
 *  always has a technical form anyway: `die Märze`, `die Milche`, `die Baumwollen`,
 *  `die Gemüse`. Comparing against those flagged 29 of the first 31 A1 rows, every
 *  one of them a correct card. They are counted and skipped, never flagged.
 *
 *  See docs/LESSONS.md class 2 — this is the same mistake as the first version of
 *  the suffix check, made again one notation later.
 *
 *  A lone ASCII `-` is **not** one of them: 14 cards use it for an unchanged plural
 *  (`der Pullover` → `die Pullover`) and that comparison works. Only the em dash
 *  `—` (61 cards) means "no plural". */
const isAssertion = (p: string) => /^nur\s/i.test(p.trim()) || p.trim() === '—';

/** A plurale tantum card carries the **plural** article: `die Eltern`, `die Leute`,
 *  `die Geschwister`. The dictionary documents the singular (`das Geschwister`), so
 *  a gender comparison is not wrong about the card — it is asking the wrong
 *  question. Same reasoning as the adjectival nouns above. */
const isPluraleTantum = (p: string | null | undefined) =>
  (p ?? '').trim().toLowerCase() === 'nur plural';

type Row = { term: string; id: string; level: string; kind: string; detail: string };

const corpus = loadCorpus(PATHS.vocab) as Word[];
const nouns = corpus.filter((w) => w.kind === 'word' && w.pos === 'noun' && w.gender && levels.has(w.level));

console.log(`auditing ${Math.min(nouns.length, limit)} of ${nouns.length} noun(s) · levels ${[...levels].join(',')}`);

const rows: Row[] = [];
let agree = 0, ambiguous = 0, noEntry = 0, undecided = 0, done = 0;
let pluraleTantum = 0, pluralAsserted = 0;

for (const w of nouns) {
  if (done >= limit) break;
  done++;
  const wt = await wikitext(strip(w.term));
  if (wt === null) { undecided++; continue; }
  if (wt === '') { noEntry++; continue; }

  if (isAdjectivalNoun(wt)) { ambiguous++; continue; }
  if (isPluraleTantum(w.plural)) { pluraleTantum++; continue; }

  const genders = new Set<string>();
  for (const m of wt.matchAll(/\|\s*Genus(?:\s*\d*)?\s*=\s*([mfn])\b/g)) genders.add(GENUS[m[1]]);
  if (genders.size === 0) { noEntry++; continue; }
  // A noun that genuinely has more than one gender (der/das Teil) cannot be wrong.
  if (genders.size > 1) { genders.has(w.gender!) ? agree++ : rows.push({ term: w.term, id: w.id, level: w.level, kind: 'gender', detail: `wiktionary: ${[...genders].join(' / ')}` }); continue; }

  const want = [...genders][0];
  if (want === w.gender) agree++;
  else rows.push({ term: w.term, id: w.id, level: w.level, kind: 'gender', detail: `wiktionary: ${want}` });

  // Plural, only where the card claims one and the page states one.
  //
  // **The corpus writes plurals five ways**, which a naive comparison does not
  // survive: 2,766 cards carry the full form (`die Namen`), 208 a suffix (`-en`,
  // `-s`, `-gänge`), 14 a lone `-` for an unchanged plural, and 163 an assertion
  // that there is no plural to teach (`nur Singular`, `nur Plural`, `—`) — see
  // `isAssertion` above, which skips those. The first version of this check
  // compared the raw strings and flagged 8 of the first 12 cards; the second knew
  // two notations and flagged 29 of the first 31 A1 rows. Every one was correct.
  // See docs/LESSONS.md class 2.
  //
  // A suffix matches if the dictionary's plural *ends with* it, which covers the
  // appending cases (`Zuständigkeit` + `-en`) and the stem-changing ones
  // (`Werdegang` → `-gänge` → `Werdegänge`) without having to model umlaut.
  if (w.plural && isAssertion(w.plural)) pluralAsserted++;
  if (w.plural && !isAssertion(w.plural)) {
    // **All** the plurals the page lists, not the first one. `Picknick` documents
    // `Picknicke` *and* `Picknicks`, `Balkon` documents `Balkons` *and* `Balkone`,
    // and `Bank` carries two entries with `Bänke` and `Banken` — a card matching
    // the second was reported wrong by a check reading only the first. This is the
    // same allowance the gender half already makes for `der/das Teil`; the plural
    // half never got it. It was 3 of the 4 rows left after the notation fix.
    const wants = [...wt.matchAll(/\|\s*Nominativ Plural(?:\s*\d*)?\s*=\s*([^\n|}]+)/g)]
      .map((m) => m[1].trim())
      .filter((v) => v && v !== '—' && v !== '-');
    const have = w.plural.replace(/^die\s+/i, '').trim();
    const singular = strip(w.term);
    const matches = (want: string) => {
      const wl = want.toLowerCase();
      // `¨-e`, `¨-er`, `¨-` — the umlaut notation, a sixth way the corpus writes a
      // plural and the last one this check learned. It flagged `der Rock` "¨-e"
      // against „Röcke“ and `der Mantel` "¨-" against „Mäntel“: correct cards
      // every time. Undo the umlaut, strip the suffix, and what is left must be
      // the singular.
      if (have.startsWith('¨')) {
        const suffix = have.replace(/^¨-?/, '').toLowerCase();
        const stem = deumlaut(wl).slice(0, wl.length - suffix.length);
        return deumlaut(wl).endsWith(suffix) && stem === singular.toLowerCase();
      }
      return have.startsWith('-')
        ? (have === '-' ? wl === singular.toLowerCase() : wl.endsWith(have.slice(1).toLowerCase()))
        : wl === have.toLowerCase();
    };
    if (wants.length && !wants.some(matches)) {
      rows.push({ term: w.term, id: w.id, level: w.level, kind: 'plural', detail: `card "${have}" · wiktionary "${wants.join('" / "')}"` });
    }
  }

  if (done % 25 === 0) console.log(`  … ${done} checked · ${rows.length} flagged`);
}

const decided = agree + rows.filter((r) => r.kind === 'gender').length;
console.log(`\nchecked ${done} · decided ${decided} · agree ${agree}`);
console.log(`flagged ${rows.length} (gender ${rows.filter((r) => r.kind === 'gender').length} · plural ${rows.filter((r) => r.kind === 'plural').length})`);
console.log(`adjectival nouns skipped ${ambiguous} · plurale tantum skipped ${pluraleTantum} · no dictionary entry ${noEntry} · fetch undecided ${undecided}`);
console.log(`plural not compared (card asserts „nur Singular“ / „nur Plural“ / „—“): ${pluralAsserted}`);
if (decided) console.log(`gender disagreement rate: ${(rows.filter((r) => r.kind === 'gender').length / decided * 100).toFixed(1)}%`);

if (rows.length) {
  writeFileSync(OUT, ['term\tid\tlevel\tkind\tdetail', ...rows.map((r) => `${r.term}\t${r.id}\t${r.level}\t${r.kind}\t${r.detail}`)].join('\n') + '\n');
  console.log(`\nwrote ${OUT}`);
  console.log('\n--- flagged ---');
  for (const r of rows) console.log(`  [${r.level}] ${r.kind.padEnd(6)} ${r.term} — ${r.detail}`);
}
console.log('\nReport only — nothing was written to the corpus. Verify each row by hand before fixing:');
console.log('a dictionary disagreement is evidence, not a verdict (see the header of this file).');
