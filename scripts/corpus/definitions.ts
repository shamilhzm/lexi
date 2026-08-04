// Definition-quality audit. The sibling of examples.ts for the other field the
// reveal shows, and the answer to persona C1 #44: `def` is largely raw
// sense-listing rather than a definition. `das Salz` ships "salt, table salt,
// sal; salt" — four translations and a repeat, where what a learner needs is
// "sodium chloride, used to season food".
//
// The distinction the classes below draw is *enumeration vs. discrimination*. A
// definition tells you which sense you are looking at and what the thing is; a
// list of translations only tells you what else it could be called, which is
// exactly what the `en` gloss already did. So a def that is a bare list adds
// nothing to the card — it takes up the slot where the explanation should be.
//
//   npm run corpus:definitions               # the report
//   npm run corpus:definitions -- --list     # + every card in a class
//   npm run corpus:definitions -- --write    # + authoring batches
import './shim.ts';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { loadCorpus, isGermanDefinition, LEVELS, type Word } from './lib.ts';

const write = process.argv.includes('--write');
const list = process.argv.includes('--list');
const OUT_DIR = 'scripts/authoring/batches/def';
const BATCH_SIZE = 40;

const CLASSES = [
  'echo',        // def says exactly what `en` already said
  'enumeration', // a list of translations, no explanatory clause
  'bare',        // a single synonym standing in for a definition
  'repeat',      // the same term twice in one def
  'german',      // written in German on a card glossed in English
] as const;
type Klass = typeof CLASSES[number];

const norm = (s: string) => s.toLowerCase().replace(/[.;,]/g, '').replace(/\s+/g, ' ').trim();

/** Words that only appear when a definition is actually explaining something. */
const EXPLAINS = /\b(or|such as|one more than|at all|without|who|whom|whose|which|that|where|when|used|serves?|denotes?|refers?|means?|made|consisting|containing|having|able|capable|someone|something|a person|an act|the act|the state|the quality|the process|especially|typically|usually|often|rather than|as opposed|in order)\b/i;

/** Is this segment just a translation term rather than a description? */
function termish(seg: string): boolean {
  const s = seg.trim().replace(/^(to|a|an|the)\s+/i, '');
  if (!s) return false;
  return s.split(/\s+/).length <= 4 && !EXPLAINS.test(s);
}

function classify(w: Word): Klass[] {
  const def = (w.def ?? '').trim();
  const en = (w.en ?? '').trim();
  if (!def) return [];
  const out: Klass[] = [];

  if (norm(def) === norm(en)) out.push('echo');

  // Parentheses are how a good short def discriminates ("country (territory of a
  // nation)"), so their presence exempts a card from the list-shaped classes. A
  // colon does the same job differently — "irregular copula: ich bin, du bist …"
  // is a definition followed by its paradigm, not four ways of saying the word.
  //
  // A definition written as a *sentence* is also exempt. "The number 5, one more
  // than four." and "To move towards the speaker, or to arrive somewhere." both
  // split on commas into short segments and would otherwise read as translation
  // lists — but a scraped enumeration is never capitalised-and-stopped like prose.
  // This pass was added after the classifier flagged definitions authored to fix
  // its own earlier findings.
  const sentenceShaped = /^[A-Z]/.test(def) && /[.!?]$/.test(def);
  const hasGloss = /\(.+\)/.test(def) || def.includes(':') || sentenceShaped;
  const segs = def.split(/[;,]/).map((s) => s.trim()).filter(Boolean);

  if (!hasGloss && !EXPLAINS.test(def)) {
    if (segs.length >= 2 && segs.every(termish)) out.push('enumeration');
    else if (segs.length === 1 && termish(def) && def.split(/\s+/).length <= 3) out.push('bare');
  }

  const seen = new Set<string>();
  for (const s of segs) {
    const k = norm(s);
    if (k && seen.has(k)) { out.push('repeat'); break; }
    seen.add(k);
  }

  // German markers, but only where the card is glossed in English — a German def
  // is a feature at C1/C2 (persona B2 #38) and a bug at A1 in an English-base app.
  //
  // Parentheticals are stripped first, because a good English definition often
  // *quotes* German: "(Feminine die See means the sea.)" is the clearest way to
  // separate der See from die See, and flagging it as a German definition would
  // punish exactly the disambiguation this audit exists to encourage.
  if (isGermanDefinition(def, en)) out.push('german');

  return [...new Set(out)];
}

const corpus = loadCorpus(PATHS.vocab).filter((w) => w.kind === 'word');
const byClass = new Map<Klass, Word[]>(CLASSES.map((c) => [c, []]));
for (const w of corpus) for (const k of classify(w)) byClass.get(k)!.push(w);

const withDef = corpus.filter((w) => w.def);
const pct = (n: number) => `${((n / withDef.length) * 100).toFixed(1)}%`;

console.log(`\nDefinition audit — ${withDef.length} cards carry a def (of ${corpus.length})\n`);
console.log('  class          count    share   example');
console.log('  ' + '-'.repeat(78));
for (const k of CLASSES) {
  const f = byClass.get(k)!;
  const eg = f[0] ? `${f[0].term} → "${(f[0].def ?? '').slice(0, 34)}"` : '';
  console.log(`  ${k.padEnd(13)} ${String(f.length).padStart(5)}   ${pct(f.length).padStart(6)}   ${eg}`);
}

const flagged = new Set(CLASSES.flatMap((k) => byClass.get(k)!.map((w) => w.id)));
console.log(`\n  ${flagged.size} distinct cards flagged · ${withDef.length - flagged.size} read as real definitions`);

// Cards carrying no English definition at all. This became a real state when the
// German definitions moved to `defDe` (corpus:germandef) — reported so that the
// migration shows up as a queue rather than disappearing from the numbers.
const missing = corpus.filter((w) => !w.def);
const withGerman = missing.filter((w) => w.defDe).length;
if (missing.length) {
  console.log(`  ${missing.length} card(s) carry no English definition` +
    (withGerman ? ` — ${withGerman} of them have a German one waiting in defDe` : ''));
}

console.log('\n  By level:');
for (const lv of LEVELS) {
  const at = withDef.filter((w) => w.level === lv);
  if (!at.length) continue;
  const bad = at.filter((w) => flagged.has(w.id)).length;
  console.log(`    ${lv}  ${String(bad).padStart(4)} of ${String(at.length).padStart(4)}  ${pct(bad).padStart(7)}`.replace(pct(bad), `${((bad / at.length) * 100).toFixed(1)}%`));
}

if (list) {
  for (const k of CLASSES) {
    const f = byClass.get(k)!;
    if (!f.length) continue;
    console.log(`\n── ${k} (${f.length})`);
    for (const w of f) console.log(`  [${w.level}] ${w.id}\n      en:  ${w.en}\n      def: ${w.def}`);
  }
}

if (!write) { console.log('\nPass --write to emit authoring batches into ' + OUT_DIR + '\n'); process.exit(0); }

// Batches: worst first, one row per card, never twice.
mkdirSync(OUT_DIR, { recursive: true });
const ORDER: Klass[] = ['echo', 'repeat', 'bare', 'enumeration', 'german'];
const seen = new Set<string>();
let files = 0;
for (const k of ORDER) {
  const rows = byClass.get(k)!.filter((w) => !seen.has(w.id) && (seen.add(w.id), true));
  let seq = 1;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const slice = rows.slice(i, i + BATCH_SIZE);
    let name = `${OUT_DIR}/${k}-${String(seq).padStart(2, '0')}.json`;
    while (existsSync(name)) name = `${OUT_DIR}/${k}-${String(++seq).padStart(2, '0')}.json`;
    seq++;
    writeFileSync(name, JSON.stringify({
      _README: [
        `${slice.length} definition(s) classified "${k}".`,
        'Author "def": what the thing IS, in one learner-facing clause — not a list',
        'of other translations, which the `en` gloss already gives. Match the sense',
        'in `en`; never drift to another homograph.',
        '"expect" is what the corpus holds now; fix-authored.ts refuses a stale row.',
        'Then: node scripts/authoring/fix-authored.ts <this file> --dry',
      ],
      rows: slice.map((w) => ({
        id: w.id, level: w.level, en: w.en, pos: w.pos,
        expect: { def: w.def ?? '' },
        def: '',
      })),
    }, null, 2) + '\n');
    files++;
    console.log(`  wrote ${name}  (${slice.length} rows)`);
  }
}
console.log(`\n✓ ${files} batch file(s) in ${OUT_DIR}. Nothing in public/data was touched.\n`);
