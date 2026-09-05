// Build the **lookup layer** — the half of Lexi that is a dictionary.
//
// ## Why this is a second file and not more cards
//
// `vocab.json` is what Lexi *teaches*: every row machine-verified by
// `authoring:new` against de.wiktionary, carrying a level, a sector, an example
// proved to contain a real inflection, and an FSRS schedule. That gate is the
// reason 6,520 cards can be trusted, and it does not survive being run 150,000
// times.
//
// This file is what Lexi can *answer*. An entry makes one claim — "Wiktionary
// says this means that" — which needs no gate because it is not a teaching
// claim. See docs/DICTIONARY.md for the measurement that decided the split:
// 11.7% of dictionary nouns are compounds the matcher already decomposes, and
// 79.2% are things a dictionary should hold and a trainer should never teach
// (`Aborigine, VB, NC, MM, Mercedes, Popsicle`).
//
// ## Sharded, because the whole point is that it costs nothing at boot
//
// The lexicon is an order of magnitude larger than the corpus and is consulted
// once in a while rather than on every frame. Loading it at startup would trade
// the app's fast first paint for a feature most sessions never touch. So it is
// split by the first two letters of the folded headword: a lookup fetches one
// small file, and a learner who never searches downloads none of them.
//
// Folded — umlauts stripped — for two reasons. It lets someone type `Hauser`
// and reach `Häuser`, and it keeps most inflections in the same shard as their
// lemma, because German inflection umlauts far more often than it changes the
// first two consonants.
//
// **The prefix length is adaptive, and it has to be.** A flat two letters puts
// 13,797 entries in `ve` and 6 in the median shard — a 1.3 MB download for one
// lookup of *verstehen* and a wasted request for everything else. Any bucket
// over `SHARD_CAP` is split by taking one more letter, recursively, so shards
// come out roughly even whatever German's prefix distribution does. The manifest
// records exactly which keys exist and the client walks from longest to
// shortest, so it never guesses.
//
// ## Two kinds of row, because 68.9% of the source is not a word
//
// Measured: of 367,157 glossed entries, **253,151 are inflected forms**
// (*abdominales*, "strong/mixed nominative/accusative neuter singular of
// abdominal") and only **114,006 are lemmas**. Storing the inflections as full
// entries would triple the file to say the same thing three hundred thousand
// times.
//
// So they become pointers. Wiktionary marks them structurally — `form_of[].word`
// — on 274,835 senses, so this needs no gloss parsing and cannot misread one.
// The pointer is filed under the *form's* own key, which is what makes typing
// `Häuser` find *Haus*: the shard you fetch for the query already contains the
// arrow.
import './shim.ts';
import { PATHS } from './config.ts';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(PATHS.raw, 'kaikki-de.jsonl');
const OUT = join(process.cwd(), 'public', 'data', 'lex');

/** Wiktionary part-of-speech → the short codes the app renders. Anything not
 *  listed is kept under its own name rather than dropped: an unknown pos is a
 *  gap in this map, not a reason to lose a word. */
const POS: Record<string, string> = {
  noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', name: 'name',
  pron: 'pronoun', prep: 'preposition', conj: 'conjunction', num: 'number',
  intj: 'interjection', particle: 'particle', article: 'article',
  phrase: 'phrase', proverb: 'phrase', prefix: 'prefix', suffix: 'suffix',
  character: 'character', abbrev: 'abbreviation', contraction: 'contraction',
};

const GENDER: Record<string, string> = {
  masculine: 'der', feminine: 'die', neuter: 'das',
};

/** How many entries a shard may hold before it is split one letter deeper.
 *  The number trades two costs against each other. Smaller shards download
 *  faster; more shards means more files in the repo, and the split is recursive
 *  so a low cap fragments hard — 600 produced 4,837 files with a *median of 22
 *  rows*, which is a lot of near-empty files to carry for no gain. 1,500 rows is
 *  ~110 KB raw and ~30 KB over the wire, still fast on a phone. */
const SHARD_CAP = 1500;
const MIN_KEY = 2;

/** Glosses are prose written by many hands; some run to a paragraph. Three
 *  senses is what a pocket dictionary gives and what a phone can show. */
const MAX_SENSES = 3;
const MAX_GLOSS = 160;

/** The forms worth carrying. A full inflection table is what makes this file
 *  huge and is not what someone looking a word up wants to see; the plural of a
 *  noun and the principal parts of a verb are. Diminutives, superlatives and the
 *  forty dialect variants Wiktionary records are dropped. */
const KEEP_TAGS = new Set([
  'plural', 'genitive',
  'past', 'participle', 'preterite', 'perfect', 'present', 'auxiliary',
]);
const DROP_TAGS = new Set([
  'diminutive', 'rare', 'archaic', 'dialectal', 'obsolete', 'colloquial',
  'error-unknown-tag', 'table-tags', 'inflection-template', 'class',
]);
const MAX_FORMS = 4;

interface Entry {
  w: string;            // headword, as written
  p: string;            // part of speech
  g: string[];          // glosses, first sense first
  x?: string;           // der/die/das, nouns only
  i?: string;           // IPA
  f?: string[];         // a few notable forms
}

/** Entries land in buckets keyed by their full folded headword; the shard
 *  boundaries are decided afterwards, once the distribution is known. */
const byWord = new Map<string, Entry[]>();
/** folded form → the lemma it points at, as written. */
const pointers = new Map<string, string>();
let read = 0, kept = 0, noGloss = 0;
let formRows = 0;

/** Exact key: lowercase, punctuation out, **umlauts kept**. This is what an
 *  answer is matched on. */
export function exact(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
}

/** Folded key: `exact`, plus umlauts down and ß → ss.
 *
 *  **Used to decide the shard and as a last-resort match, never as the identity
 *  of a word.** Folding is what lets someone type `Hauser` on a keyboard without
 *  umlauts and reach `Häuser` — and it is also what made *Häuser* answer
 *  "der Hauser, housekeeper", because folding collapses it onto a real and
 *  unrelated headword. Two keys, and the exact one wins. */
export function fold(word: string): string {
  return word.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

const rl = createInterface({ input: createReadStream(SRC) });
for await (const line of rl) {
  read++;
  let j: {
    word?: string; pos?: string;
    senses?: {
      glosses?: string[]; tags?: string[];
      form_of?: { word?: string }[]; alt_of?: { word?: string }[];
    }[];
    sounds?: { ipa?: string }[];
    forms?: { form?: string; tags?: string[] }[];
  };
  try { j = JSON.parse(line); } catch { continue; }
  if (!j.word || !j.pos) continue;

  // **A word can be both a lemma and an inflected form**, and an early version of
  // this dropped 754 real entries by assuming otherwise: it skipped anything
  // carrying a `form_of` sense, which threw away every headword that also happens
  // to be an inflection of something else. The test is not "does it have a
  // form_of sense" but "does it have a sense that is *not* one".
  //
  // The arrow itself comes from `form_of` rather than from the gloss text: the
  // gloss says "strong/mixed nominative/accusative neuter singular of abdominal"
  // and the structure just says `abdominal`.
  const target = j.senses?.find((s) => s.form_of?.[0]?.word || s.alt_of?.[0]?.word);

  const glosses: string[] = [];
  const tags = new Set<string>();
  for (const s of j.senses ?? []) {
    if (s.form_of?.[0]?.word || s.alt_of?.[0]?.word) continue;   // that is a pointer, not a sense
    for (const t of s.tags ?? []) tags.add(t);
    const g = s.glosses?.[0];
    if (!g) continue;
    const clean = g.trim().slice(0, MAX_GLOSS);
    // Wiktionary repeats a gloss across senses more often than you would think.
    if (clean && !glosses.includes(clean)) glosses.push(clean);
    if (glosses.length >= MAX_SENSES) break;
  }
  // Nothing but pointer senses: file the arrow and move on.
  if (!glosses.length && target) {
    const lemma = (target.form_of?.[0] ?? target.alt_of?.[0])!.word!;
    // **Keyed exactly, not folded.** The first version keyed pointers by the
    // folded form and skipped any that collided with an entry, which silently
    // dropped `häuser → Haus` because the surname *Hauser* folds to the same
    // string. A form and an unrelated headword can share a folded key; they
    // cannot share an exact one.
    const ek = exact(j.word);
    if (ek && ek !== exact(lemma) && !pointers.has(ek)) { pointers.set(ek, lemma); formRows++; }
    continue;
  }
  // An entry with neither a gloss nor a target answers nothing. It is the only
  // other filter here, because every kind of oddity — an abbreviation, a brand,
  // a proper noun — is something a dictionary is *supposed* to hold.
  if (!glosses.length) { noGloss++; continue; }

  const e: Entry = { w: j.word, p: POS[j.pos] ?? j.pos, g: glosses };

  if (e.p === 'noun') {
    for (const [tag, art] of Object.entries(GENDER)) if (tags.has(tag)) { e.x = art; break; }
  }

  const ipa = j.sounds?.find((s) => s.ipa)?.ipa;
  if (ipa) e.i = ipa.replace(/^[[/]|[\]/]$/g, '');

  const forms: string[] = [];
  for (const f of j.forms ?? []) {
    if (!f.form || f.form === '-' || f.form.length > 32) continue;
    const ft = f.tags ?? [];
    if (ft.some((t) => DROP_TAGS.has(t))) continue;
    if (!ft.some((t) => KEEP_TAGS.has(t))) continue;
    // A form identical to the headword is not a form. Wiktionary tags plenty of
    // them — an uninflected genitive, a plural that matches the singular — and
    // rendered they read as "Schadenfreude · Schadenfreude".
    if (f.form === j.word || forms.includes(f.form)) continue;
    forms.push(f.form);
    if (forms.length >= MAX_FORMS) break;
  }
  if (forms.length) e.f = forms;

  const key = exact(j.word);
  if (!key) continue;
  const bucket = byWord.get(key) ?? [];
  bucket.push(e);
  byWord.set(key, bucket);
  kept++;
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

// ---- decide the shard boundaries -------------------------------------------
//
// **Greedy packing over sorted keys, not prefix trees.** Splitting by prefix and
// recursing on whatever overflowed was the obvious approach and it balances
// badly: German's density is nothing like uniform, so `ver` fragments into
// dozens of children while `xy` stays alone. Measured, at two different caps, it
// produced 4,837 and then 2,474 files with a **median of 22 and 28 rows** — a
// couple of thousand near-empty files carried for no gain.
//
// Walking the sorted keys and cutting a new shard every `SHARD_CAP` rows gives
// near-perfect balance and the minimum number of files, and costs the client
// nothing: shard *i* holds every key from `bounds[i]` up to `bounds[i+1]`, so a
// lookup is a binary search over a sorted array of strings. Files are numbered
// rather than named after their boundary, because a boundary is an arbitrary
// German substring and filenames are not the place to find that out.
interface Shard { e: Entry[]; f: Record<string, string> }

// ---- flatten pointer chains ------------------------------------------------
//
// Wiktionary chains arrows: *Grusse* is a form of *Gruss*, which is itself an
// alternative spelling of *Gruß*, which is the entry. The client follows exactly
// one hop — a pointer chain is a data bug rather than a language feature, and
// following one far enough to notice is how a lookup becomes a loop on
// somebody's phone — so the chains are collapsed here instead, where a cycle can
// be detected once rather than on every device.
let chained = 0, dropped = 0;
for (const [k, target] of pointers) {
  let t = target;
  const seen = new Set([k]);
  let hops = 0;
  while (!byWord.has(exact(t)) && pointers.has(exact(t)) && hops++ < 4) {
    if (seen.has(exact(t))) break;
    seen.add(exact(t));
    t = pointers.get(exact(t))!;
  }
  // A chain that comes back to where it started leaves the arrow pointing at its
  // own key. Harmless — the client matches entries before pointers — but it is
  // dead weight, and a self-pointer is the one shape that could loop a client
  // that ever grew a second hop.
  if (!byWord.has(exact(t)) || exact(t) === k) { pointers.delete(k); dropped++; continue; }
  if (t !== target) { pointers.set(k, t); chained++; }
}
formRows = pointers.size;

// Rows are keyed exactly and *sorted and sharded* by the folded key, so a word
// and its umlaut-free spelling land in the same file — which is what makes a
// keyboard without umlauts work in one request.
const rows = new Map<string, { e: Entry[]; p?: string }>();
for (const [k, list] of byWord) rows.set(k, { e: list });
for (const [k, lemma] of pointers) {
  const r = rows.get(k);
  if (r) { r.p ??= lemma; continue; }   // same exact spelling: entry and arrow can coexist
  rows.set(k, { e: [], p: lemma });
}
const sorted = [...rows.keys()].sort((a, b) => (fold(a) < fold(b) ? -1 : fold(a) > fold(b) ? 1 : a < b ? -1 : 1));

// **A folded key may never straddle a shard boundary.** The client folds the
// query to choose one file, so if `hauser` (the surname) and `häuser` (the form)
// landed either side of a cut, the binary search would find one file and the
// answer would be in the other — a miss that looks exactly like "not in the
// dictionary". So the packing works in folded-key *groups*, and a group is
// indivisible however large it gets.
const groups: { fk: string; keys: string[]; size: number }[] = [];
for (const k of sorted) {
  const r = rows.get(k)!;
  const size = r.e.length + (r.p ? 1 : 0);
  const fk = fold(k);
  const last = groups[groups.length - 1];
  if (last && last.fk === fk) { last.keys.push(k); last.size += size; }
  else groups.push({ fk, keys: [k], size });
}

const bounds: string[] = [];
const shards: Shard[] = [];
let cur: Shard | null = null;
let load = 0;
for (const g of groups) {
  if (!cur || load + g.size > SHARD_CAP) {
    cur = { e: [], f: {} };
    shards.push(cur);
    // The boundary is the *folded* key, because that is what the client binary
    // searches: it folds the query to pick a file, then matches exactly inside.
    bounds.push(g.fk);
    load = 0;
  }
  for (const k of g.keys) {
    const r = rows.get(k)!;
    cur.e.push(...r.e);
    if (r.p) cur.f[k] = r.p;
  }
  load += g.size;
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

let bytes = 0;
shards.forEach((sh, i) => {
  sh.e.sort((a, b) => a.w.localeCompare(b.w, 'de'));
  const json = JSON.stringify(sh);
  writeFileSync(join(OUT, `${i}.json`), json);
  bytes += json.length;
});

// The manifest is what makes a miss free. Without it, looking up a word in an
// empty region is a 404 round-trip — and on a flaky connection a 404 is
// indistinguishable from "not in the dictionary", which is the one claim this
// layer must never make by accident.
writeFileSync(join(OUT, 'index.json'), JSON.stringify({
  n: kept, forms: formRows, bounds,
}));

const mb = (n: number) => (n / 1024 / 1024).toFixed(1) + ' MB';
const sizes = shards.map((s) => s.e.length + Object.keys(s.f).length).sort((a, b) => b - a);
console.log(`read           ${read.toLocaleString()}`);
console.log(`lemma entries  ${kept.toLocaleString()}   (dropped ${noGloss.toLocaleString()} with no gloss)`);
console.log(`form pointers  ${formRows.toLocaleString()}   (${chained.toLocaleString()} chains flattened, ${dropped.toLocaleString()} dangling dropped)`);
console.log(`shards         ${shards.length}`);
console.log(`total          ${mb(bytes)}`);
console.log(`largest shard  ${sizes[0].toLocaleString()} rows`);
console.log(`median shard   ${sizes[Math.floor(sizes.length / 2)].toLocaleString()} rows`);
console.log(`mean file      ${(bytes / shards.length / 1024).toFixed(0)} KB`);
console.log(`\u2192 ${OUT}`);
