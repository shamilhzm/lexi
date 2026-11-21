// How much German does an English speaker already own? Measured per card.
//
//   npm run corpus:transfer                       (needs data/raw/kaikki-de.jsonl and
//                                                  data/raw/tatoeba-eng.tsv: npm run corpus:fetch)
//   npm run corpus:transfer -- --write            also writes public/data/transfer.json
//   npm run corpus:transfer -- --list hidden      every A1 card in one class
//   npm run corpus:transfer -- --false-friends    candidates for lib/falseFriends.ts
//
// The instrument behind docs/LEARNING-WEB.md §transfer. Each teachable card gets the
// first class that holds, in this order:
//
//   borrowed   — Wiktionary says German took the word from English (das Team).
//   cognate    — Wiktionary lists an English cognate, and that word is in Lexi's
//                gloss, so the learner can see it (das Haus · house).
//   inferred   — no English word recorded, but the word is inherited and its
//                Proto-West/Proto-Germanic ancestor is spelled close to a word in the
//                gloss (der Bruder ← *brōþer · brother; die Milch ← *meluk · milk).
//   hidden     — Wiktionary lists an English cognate the gloss does not contain:
//                a link the learner owns without knowing it (die Zeit · tide), or a
//                false friend (bekommen · become). The script cannot tell which.
//   lookalike  — no recorded English link, but the headword is spelled like a word
//                in its gloss (die Information · information), mostly shared Latin,
//                French and Greek loans.
//   none
//
// `lookalike` is tried before `hidden`, because a word the reader can see beats a
// link they cannot.
//
// It is a lower bound, not a census: a cognate Wiktionary does not list, or a
// lookalike past the edit-distance threshold (der Kaffee · coffee), counts as none.
// A noun joins only the entries that agree with its gender and plural, because
// *der Tag, die Tage* and the loan *der Tag, die Tags* share a word and a gender
// (LESSONS, *der Tag was "borrowed from English"*). Other parts of speech have no
// such field, so a verb or adjective homograph can still merge.
//
// ## What `--write` ships (VISION, *The transfer line*)
//
// Only what Wiktionary states, never what this script infers: `borrowed`, `cognate`,
// and `hidden` when its English word is common enough to be worth knowing (at least
// HIDDEN_MIN uses in Tatoeba's English sentences, so *woning* and *stead* stay out).
// `inferred` and `lookalike` are measurements, not claims, and are not written.
// A sound correspondence (z ↔ t, ss ↔ t, pf ↔ p…) is named only when it holds over
// RULE_MIN shipped pairs; its examples are shipped pairs too. Cards with a curated
// false-friend note are left to that note.
import { createReadStream, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { FALSE_FRIENDS } from '../../src/lib/falseFriends.ts';

interface Card { id: string; term: string; en: string; pos: string; level: string; kind: string; gender?: string; plural?: string }
type Klass = 'borrowed' | 'cognate' | 'inferred' | 'hidden' | 'lookalike' | 'none';
/** One Wiktionary entry. `genders`/`plural` come from its headword line, when it has one. */
interface Link { borrowed: boolean; from?: string; cognates: Set<string>; /** mentions in a special sense (“to glean”) or hedged (probably) */ weak: Set<string>; senses: Set<string>; ancestors: string[]; genders: Set<string>; plurals: Set<string> }

const RAW = 'scripts/corpus/data/raw/kaikki-de.jsonl';
const ENG = 'scripts/corpus/data/raw/tatoeba-eng.tsv';
for (const f of [RAW, ENG]) if (!existsSync(f)) { console.error(`missing ${f} — run npm run corpus:fetch`); process.exit(1); }
const HIDDEN_MIN = 50; // uses in Tatoeba's ~2M English sentences
const RULE_MIN = 12;   // shipped pairs before a correspondence is named
const arg = (f: string) => process.argv.includes(f);

// How common an English word is, from the English half of the Tatoeba dump the
// corpus already uses for examples. Everyday English, which is the point.
const enFreq = new Map<string, number>();
for await (const line of createInterface({ input: createReadStream(ENG), crlfDelay: Infinity })) {
  const t = line.slice(line.indexOf('\t', line.indexOf('\t') + 1) + 1).toLowerCase();
  for (const w of t.match(/[a-z]+/g) ?? []) enFreq.set(w, (enFreq.get(w) ?? 0) + 1);
}
const ef = (w: string) => enFreq.get(w) ?? 0;

// Words the prose puts after "English" that are not English words: "English word",
// "English dialectal", "English and". Found by reading the hidden class's top captures.
const META = new Set(['word', 'words', 'and', 'or', 'the', 'a', 'an', 'form', 'forms', 'sense', 'senses', 'equivalent',
  'cognate', 'cognates', 'loanword', 'borrowing', 'term', 'terms', 'spelling', 'via', 'from', 'dialectal', 'dialect',
  'dialects', 'obsolete', 'archaic', 'rare', 'slang', 'verb', 'noun', 'adjective', 'is', 'in', 'of', 'as', 'which', 'also',
  'has', 'with', 'by', 'translation', 'cf', 'see', 'compare', 'name', 'language', 'speakers', 'speaking', 'usage', 'it',
  'for', 'more', 'known', 'pretty']);
// A mention is a cognate only when the prose does not deny or qualify it.
const DENIED = /unrelated|not related|not cognate|no relation|not connected|confus|rather than|translat|calque|influence|semantic loan|modelled|modeled|after English/i;
const HEDGED = /probably|possibly|perhaps|uncertain|doubtful|disputed|compared/i;
const cognatesIn = (text: string) => {
  const out = new Set<string>(), weak = new Set<string>();
  for (const m of text.matchAll(/(?<!Middle |Old )English ([A-Za-z]+)/g)) {
    const w = m[1].toLowerCase();
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    const clause = before.slice(before.lastIndexOf('.') + 1);
    if (META.has(w) || DENIED.test(clause)) continue;
    out.add(w);
    // *English lease (“to gather”)*, *English on, ohn (“without”)*: the English word
    // in a sense a reader does not know it by. *probably also English craw*: hedged.
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
    if (/^(?:,\s*[a-z]+)*\s*\(“/.test(after) || HEDGED.test(clause)) weak.add(w);
  }
  return { out, weak };
};

const POS: Record<string, string[]> = {
  noun: ['noun'], verb: ['verb'], adjective: ['adj'], adverb: ['adv'], pronoun: ['pron'],
  interjection: ['intj'], number: ['num'], preposition: ['prep'], conjunction: ['conj'],
  particle: ['particle'], phrase: ['phrase', 'proverb', 'prep_phrase'],
};
// Not `sl`: a semantic loan borrowed a sense, not the word (*saugen* · suck, LESSONS).
const BORROW = new Set(['bor', 'bor+', 'ubor', 'lbor', 'der', 'pseudo-loan']);

const bare = (t: string) => t.normalize('NFC').replace(/^(?:der|die|das)(?:\/(?:der|die|das))*\s+/, '').trim();
const cards = (JSON.parse(readFileSync('public/data/cards.json', 'utf8')) as Card[]).filter((c) => c.kind === 'word');
const wanted = new Set<string>();
for (const c of cards) { const b = bare(c.term); wanted.add(b); wanted.add(b.replace(/^sich\s+/, '')); }

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'something', 'someone', 'sth', 'one', 'that', 'this', 'very', 'not', 'are', 'was', 'been']);
const links = new Map<string, Link[]>(); // key: word|kaikkiPos → every entry, kept apart
const rl = createInterface({ input: createReadStream(RAW), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.includes('"etymology_')) continue;
  let j: { word?: string; pos?: string; lang_code?: string; etymology_text?: string; senses?: { glosses?: string[] }[]; etymology_templates?: { name: string; args: Record<string, string> }[]; head_templates?: { expansion?: string }[] };
  try { j = JSON.parse(line); } catch { continue; }
  if (j.lang_code !== 'de' || !j.word || !wanted.has(j.word)) continue;
  const text = j.etymology_text ?? '';
  const head = j.head_templates?.[0]?.expansion ?? '';
  const borrowTpl = (j.etymology_templates ?? []).find((t) => BORROW.has(t.name) && t.args['1'] === 'de' && t.args['2'] === 'en');
  const borrowProse = /^(?:Borrowed|Unadapted borrowing|Pseudo-anglicism) from English(?: ([A-Za-z]+))?/.exec(text);
  const link: Link = {
    borrowed: !!borrowProse || !!borrowTpl,
    from: (borrowProse?.[1] ?? borrowTpl?.args['3'])?.toLowerCase(),
    // Prose only: a `cog|en` template once named a Dutch word (LESSONS).
    // "English Monday" is capitalised: match the case, then fold it.
    ...(({ out, weak }) => ({ cognates: out, weak }))(cognatesIn(text)),
    senses: new Set((j.senses ?? []).flatMap((x) => x.glosses ?? []).join(' ').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w))),
    // Templates when there are any; some entries carry only an etymology tree in prose.
    ancestors: [
      ...(j.etymology_templates ?? [])
        .filter((t) => t.name === 'inh' && t.args['1'] === 'de' && (t.args['2'] === 'gmw-pro' || t.args['2'] === 'gem-pro') && t.args['3'])
        .map((t) => t.args['3']),
      ...[...text.matchAll(/Proto-(?:West )?Germanic (\*[^\s,.;()]+)/g)].map((m) => m[1]),
    ],
    // "Tag m (strong, genitive Tages or Tags, plural Tage)"
    genders: new Set((head.match(/^\S+ ((?:[mfn]|pl)(?: or (?:[mfn]|pl))*)\b/)?.[1] ?? '').split(' or ').filter(Boolean)),
    // "plural Parks or (less common) Parke": every alternative counts.
    plurals: new Set((head.match(/plural ([^,)]+(?:\)[^,)]*)?)/)?.[1] ?? '').replace(/\([^)]*\)/g, ' ').split(/\s+/).map((w) => w.replace(/[^\p{L}-]/gu, '')).filter((w) => /^\p{Lu}/u.test(w))),
  };
  const key = `${j.word}|${j.pos}`;
  links.set(key, [...(links.get(key) ?? []), link]);
}

const GENDER: Record<string, string> = { der: 'm', die: 'f', das: 'n' };
/** Does this entry describe this card, as far as the entry's headword line can say? */
const agrees = (c: Card, l: Link) => {
  if (c.pos !== 'noun') return true;
  const g = c.gender && GENDER[c.gender];
  if (g && l.genders.size && !l.genders.has(g) && !(c.gender === 'die' && l.genders.has('pl'))) return false;
  const pl = c.plural?.replace(/^die\s+/, '');
  return !(pl && /^\p{Lu}/u.test(pl) && l.plurals.size && !l.plurals.has(pl));
};

const glossWords = (en: string) => en.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w));
const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
const lev = (a: string, b: string) => {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let k = 1; k <= b.length; k++) { const t = d[k]; d[k] = Math.min(d[k] + 1, d[k - 1] + 1, prev + (a[i - 1] === b[k - 1] ? 0 : 1)); prev = t; }
  }
  return d[b.length];
};
/** Spelling folded across the two orthographies: ph/f, th/t, c/k, sch/ch, z/s, y/ie,
 *  doubled letters, a final -e. *Telefon · telephone*, *Familie · family*. */
const norm = (s: string) => fold(s).replace(/ph/g, 'f').replace(/th/g, 't').replace(/sch/g, 'sh').replace(/ch/g, 'sh')
  .replace(/ck/g, 'k').replace(/c/g, 'k').replace(/z/g, 's').replace(/y/g, 'i').replace(/ie/g, 'i')
  .replace(/(.)\1/g, '$1').replace(/e$/, '');
const close = (a: string, b: string, max: number, min: number) =>
  a.length >= min && b.length >= min && lev(a, b) / Math.max(a.length, b.length) <= max;
const looksLike = (c: Card) => {
  let g = bare(c.term).replace(/^sich\s+/, '');
  if (g.includes(' ')) return false;
  if (c.pos === 'verb') g = g.replace(/e?n$/, '');
  const ng = norm(g);
  return glossWords(c.en).some((w) => close(ng, norm(w), 0.25, 4));
};
/** A Proto-(West-)Germanic reconstruction, spelled like a modern word: *brōþer → broter. */
const ancestral = (r: string) => norm(r.replace(/^\*/, '').replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/ƀ/g, 'b').replace(/ǥ/g, 'g')
  .normalize('NFD').replace(/\p{M}/gu, '')).replace(/(?:az|iz|uz|ja|jo|o|u|a|i)$/, '');

interface Verdict { k: Klass; cog?: string; from?: string; weak?: boolean }
const memo = new Map<string, Verdict>();
const classify = (c: Card): Verdict => {
  const hit = memo.get(c.id);
  if (hit) return hit;
  const v = classify1(c);
  memo.set(c.id, v);
  return v;
};
const classify1 = (c: Card): Verdict => {
  const b = bare(c.term);
  const entries: Link[] = [];
  for (const w of new Set([b, b.replace(/^sich\s+/, '')])) for (const p of POS[c.pos] ?? []) {
    for (const l of links.get(`${w}|${p}`) ?? []) if (agrees(c, l)) entries.push(l);
  }
  // Homographs the headword line cannot separate (*der Enkel*, grandchild and the
  // obsolete ankle): keep the entries whose senses share a word with the gloss.
  const gl = new Set(glossWords(c.en));
  const meant = entries.filter((l) => [...l.senses].some((w) => gl.has(w)));
  if (meant.length && meant.length < entries.length) entries.splice(0, entries.length, ...meant);
  // Borrowed only when every entry that could be this card says so: *der Pass* has
  // four entries with one gender and one plural, and only the football pass is English.
  if (entries.length && entries.every((l) => l.borrowed)) return { k: 'borrowed', from: entries.find((l) => l.from)?.from };
  const cognates = new Set(entries.flatMap((l) => [...l.cognates]));
  const gw = new Set(c.en.toLowerCase().split(/[^a-z]+/).filter(Boolean)); // "to go" keeps "go"
  // "speaking" in the gloss shows "speak"; a short word must match whole.
  const stem = (x: string) => [...gw].find((g) => x.length >= 4 && g.startsWith(x) && g.length - x.length <= 3);
  const seen = [...cognates].find((x) => gw.has(x) || stem(x));
  // *gestern · yester*: show the gloss's *yesterday* when the recorded form is not a word.
  if (seen) return { k: 'cognate', cog: gw.has(seen) || ef(seen) >= HIDDEN_MIN ? seen : stem(seen) };
  for (const r of entries.flatMap((l) => l.ancestors)) {
    const a = ancestral(r);
    const hit = glossWords(c.en).find((w) => close(a, norm(w), 0.4, 3));
    if (hit) return { k: 'inferred', cog: `${hit} ← ${r}` };
  }
  if (looksLike(c)) return { k: 'lookalike' };
  const strong = [...cognates].filter((x) => !entries.some((l) => l.weak.has(x)));
  if (cognates.size) return { k: 'hidden', cog: (strong.length ? strong : [...cognates]).sort((a, b) => ef(b) - ef(a))[0], weak: !strong.length };
  return { k: 'none' };
};

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const KS: Klass[] = ['borrowed', 'cognate', 'inferred', 'lookalike', 'hidden', 'none'];
const VISIBLE: Klass[] = ['borrowed', 'cognate', 'inferred', 'lookalike'];
const tally: Record<string, Record<Klass, number>> = {};
const examples = Object.fromEntries(KS.map((k) => [k, [] as string[]])) as Record<Klass, string[]>;
for (const lv of [...LEVELS, 'all']) tally[lv] = Object.fromEntries(KS.map((k) => [k, 0])) as Record<Klass, number>;
for (const c of cards) {
  const { k, cog } = classify(c);
  tally[c.level][k]++; tally.all[k]++;
  if (examples[k].length < 8 && c.level <= 'A2') examples[k].push(`${c.term} (${c.en.slice(0, 32)}${cog ? ` · ${cog}` : ''})`);
}
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`level   cards${KS.map((k) => k.padStart(10)).join('')}   visible`);
for (const lv of [...LEVELS, 'all']) {
  const t = tally[lv]; const n = KS.reduce((s, k) => s + t[k], 0);
  console.log(`${lv.padEnd(6)}${String(n).padStart(7)}${KS.map((k) => pct(t[k], n).padStart(10)).join('')}   ${pct(VISIBLE.reduce((s, k) => s + t[k], 0), n).padStart(6)}`);
}
console.log('\nvisible = borrowed + cognate + inferred + lookalike: a word an English reader can recognise.');
for (const k of KS.slice(0, 5)) console.log(`\n${k}: ${examples[k].join(' · ')}`);

// `-- --list none` prints every A1 card in one class, for hand-checking the misses.
const list = process.argv.indexOf('--list');
if (list > 0) {
  const k = process.argv[list + 1] as Klass;
  console.log(`\nA1 · ${k}: ${cards.filter((c) => c.level === 'A1' && classify(c).k === k).map((c) => bare(c.term)).join(', ')}`);
}

// Sound correspondences: a rule holds for a pair when rewriting the German side
// moves it strictly closer to the English word. Both sides are folded the same way
// first (ä→a, ß→ss, ck/c→k), and a verb loses its infinitive ending.
interface Rule { id: string; de: string; en: string; re: RegExp; to: string; /** what the English side must have */ has: RegExp;
  /** What a film marks in each word, as RegExp sources (German case-insensitive). */ mark: [string, string] }
const RULES: Rule[] = [
  { id: 'z-t', de: 'z', en: 't', re: /tz|z/g, to: 't', has: /t/, mark: ['tz|z', 't'] },
  { id: 'ss-t', de: 'ss, ß', en: 't', re: /ss/g, to: 't', has: /t/, mark: ['ss|ß', 't'] },
  { id: 'pf-p', de: 'pf', en: 'p', re: /pf/g, to: 'p', has: /p/, mark: ['pf', 'p'] },
  { id: 'f-p', de: 'f', en: 'p', re: /(?<=.)ff?/g, to: 'p', has: /p/, mark: ['(?<=.)ff?', 'p'] },
  { id: 'cht-ght', de: 'cht', en: 'ght', re: /cht/g, to: 'ght', has: /ght/, mark: ['cht', 'ght'] },
  // English spells the k sound k, ck or c: *make, duck, cook*. Never -ly (*freundlich · friendly*).
  { id: 'ch-k', de: 'ch', en: 'k', re: /(?<=.)ch(?!t)/g, to: 'k', has: /k|c(?!h)/, mark: ['(?<=.)ch(?!t)', 'ck|k|c(?!h)'] },
  { id: 'd-th', de: 'd', en: 'th', re: /d/g, to: 'th', has: /th/, mark: ['d', 'th'] },
  { id: 't-d', de: 't', en: 'd', re: /t/g, to: 'd', has: /d/, mark: ['t', 'd'] },
  // *Schwester · sister*, not *scheinen · shine*, which is sch ↔ sh.
  { id: 'sch-s', de: 'sch', en: 's', re: /^sch/, to: 's', has: /^s[^h]/, mark: ['^sch', '^s'] },
  { id: 'b-v', de: 'b', en: 'v', re: /(?<=.)b/g, to: 'v', has: /v/, mark: ['(?<=.)b', 'v'] },
  { id: 'g-y', de: 'g', en: 'y', re: /g/g, to: 'y', has: /y/, mark: ['g', 'y'] },
];
const light = (s: string) => fold(s).replace(/ck/g, 'k').replace(/c(?!h)/g, 'k');
const deSide = (c: Card) => {
  let w = bare(c.term).replace(/^sich\s+/, '');
  if (c.pos === 'verb') w = w.replace(/e?n$/, '');
  return light(w);
};
/** How much a rule closes the gap for this pair: 0 when it does not apply. */
const gain = (r: Rule, de: string, en: string) => {
  const to = de.replace(r.re, r.to);
  if (to === de || !r.has.test(en)) return 0;
  const before = lev(de, light(en)), after = lev(light(to), light(en));
  return after < before && after / Math.max(to.length, en.length) <= 0.5 ? before - after : 0;
};

// ── What ships ─────────────────────────────────────────────────────────────────
// A link is shown only when a reader can see it: the two words, once the named
// correspondences are allowed, differ by at most half their letters. *drehen ·
// throw* passes through d ↔ th; *arbeiten · orphan* (a link through Proto-Indo-
// European) and prose noise (*Muster · english*) do not.
const RESEMBLE = 0.5;
const RESEMBLE_SHOWN = 0.75;
const resemblance = (c: Card, en: string) => {
  const de = deSide(c), e = norm(en);
  const ways = [de, ...RULES.filter((r) => r.has.test(light(en))).map((r) => de.replace(r.re, r.to))];
  return Math.min(...ways.map((x) => lev(norm(x), e) / Math.max(norm(x).length, e.length)));
};
// Tatoeba's own characters (Tom, Mary, Ken) are frequent and are not vocabulary.
const capsMid = new Map<string, number>();
for await (const line of createInterface({ input: createReadStream(ENG), crlfDelay: Infinity })) {
  const t = line.slice(line.indexOf('\t', line.indexOf('\t') + 1) + 1);
  for (const m of t.matchAll(/(?<=[a-z,;] )([A-Z][a-z]+)/g)) { const w = m[1].toLowerCase(); capsMid.set(w, (capsMid.get(w) ?? 0) + 1); }
}
const isName = (w: string) => (capsMid.get(w) ?? 0) * 2 > ef(w);

// Lines the gate passes and a reader caught. Each carries its reason; keep it short.
const REFUSE: Record<string, string> = {
  'der Held': 'the entry gives English health as the heir of Old English hæleþ (hero); health comes from hǣlþ',
};
type Ship = { k: 'b' | 'c' | 'h'; en?: string; rule?: string };
const ship = new Map<Card, Ship>();
const refused: string[] = [];
for (const c of cards) {
  if (FALSE_FRIENDS[bare(c.term).toLowerCase()] || REFUSE[c.term]) continue; // the curated note says it better
  const v = classify(c);
  if (v.k === 'borrowed') {
    // *Keks · cakes* and *Schal · shawl* are worth naming; *T-Shirt · t* is a fragment.
    const f = v.from, head = bare(c.term).toLowerCase();
    ship.set(c, { k: 'b', en: f && !META.has(f) && ef(f) && f !== head && resemblance(c, f) <= RESEMBLE ? f : undefined });
  } else if (v.k === 'cognate' || (v.k === 'hidden' && v.cog && !v.weak && ef(v.cog) >= HIDDEN_MIN && !isName(v.cog))) {
    // A cognate the gloss already shows needs less: the learner sees the English
    // word on the card, so *gehen · go* and *Auge · eye* are confirmed, not found.
    if (resemblance(c, v.cog!) <= (v.k === 'cognate' ? RESEMBLE_SHOWN : RESEMBLE)) ship.set(c, { k: v.k === 'cognate' ? 'c' : 'h', en: v.cog });
    else refused.push(`${bare(c.term)} · ${v.cog}${v.k === 'hidden' ? '' : ' (in gloss)'}`);
  }
}

const pairs = [...ship].filter(([, s]) => s.k !== 'b' && s.en && !s.en.includes(' '));
const byRule = new Map<string, [Card, string, number][]>();
for (const [c, s] of pairs) for (const r of RULES) {
  const g = gain(r, deSide(c), s.en!);
  if (g) byRule.set(r.id, [...(byRule.get(r.id) ?? []), [c, s.en!, g]]);
}
const named = RULES.filter((r) => (byRule.get(r.id)?.length ?? 0) >= RULE_MIN);
const RANK = Object.fromEntries(named.map((r) => [r.id, byRule.get(r.id)!.length]));
for (const [c, s] of pairs) {
  const best = named.map((r) => [r.id, gain(r, deSide(c), s.en!)] as const).filter(([, g]) => g)
    .sort((a, b) => b[1] - a[1] || RANK[b[0]] - RANK[a[0]])[0];
  if (best) s.rule = best[0];
}
// Examples a learner can use: the English word is the card's own gloss (*zehn · ten*
// before *Schmerz · smart*), met early, left closest by the rule (*Salz · salt* before
// *jetzt · yet*), commonest English first; one card per English word.
const LV = (c: Card) => Math.min(LEVELS.indexOf(c.level), 2);
const left = (r: Rule, c: Card, en: string) => lev(light(deSide(c).replace(r.re, r.to)), light(en));
const rules = Object.fromEntries(named.map((r) => {
  const ex = byRule.get(r.id)!
    .filter(([c]) => ship.get(c)?.rule === r.id && !bare(c.term).includes(' '))
    .sort((a, b) => Number(ship.get(a[0])!.k === 'h') - Number(ship.get(b[0])!.k === 'h') || LV(a[0]) - LV(b[0])
      || left(r, a[0], a[1]) - left(r, b[0], b[1]) || ef(b[1]) - ef(a[1]))
    .filter(([, en], i, all) => all.findIndex(([, e]) => e === en) === i)
    .slice(0, 6).map(([c, en]) => [bare(c.term), en]);
  return [r.id, { de: r.de, en: r.en, n: byRule.get(r.id)!.length, ex, mark: r.mark }];
}));

const counts = { b: 0, c: 0, h: 0 };
for (const s of ship.values()) counts[s.k]++;
console.log(`\nships: ${ship.size} cards · borrowed ${counts.b} · cognate ${counts.c} · hidden (English word ≥${HIDDEN_MIN} uses) ${counts.h}`);
const droppedHidden = cards.filter((c) => classify(c).k === 'hidden' && !ship.has(c) && !FALSE_FRIENDS[bare(c.term).toLowerCase()]);
console.log(`refused as not visibly alike (${refused.length}): ${refused.slice(0, 40).join(', ')}`);
const upper = arg('--upper');
if (arg('--shipped')) for (const k of ['h', 'c', 'b'] as const) console.log(`\nshipped ${k}: ${[...ship].filter(([c, s]) => s.k === k && (upper ? c.level > 'A2' : c.level <= 'A2')).map(([c, s]) => `${bare(c.term)}·${s.en ?? '–'}`).join(', ')}`);
console.log(`hidden left out as too rare in English: ${droppedHidden.length}; e.g. ${droppedHidden.filter((c) => c.level <= 'A2').slice(0, 8).map((c) => `${bare(c.term)} · ${classify(c).cog}`).join(', ')}`);
console.log(`\ncorrespondences (named at ≥${RULE_MIN} pairs):`);
for (const r of RULES) {
  const n = byRule.get(r.id)?.length ?? 0;
  const shown = rules[r.id]?.ex.map(([d, e]: string[]) => `${d} · ${e}`).join(', ') ?? byRule.get(r.id)?.slice(0, 4).map(([c, e]) => `${bare(c.term)} · ${e}`).join(', ');
  console.log(`  ${(n >= RULE_MIN ? '✓' : ' ')} ${r.de.padEnd(6)} ↔ ${r.en.padEnd(4)} ${String(n).padStart(4)}   ${shown ?? ''}`);
}

if (arg('--write')) {
  const words: Record<string, (string | 0)[]> = {};
  for (const [c, s] of [...ship].sort((a, b) => (a[0].term < b[0].term ? -1 : 1))) {
    // [kind, english?, rule?] — 0 holds the place of an absent English word.
    words[c.term] = s.rule ? [s.k, s.en ?? 0, s.rule] : s.en ? [s.k, s.en] : [s.k];
  }
  const out = { v: 1, source: 'English Wiktionary etymologies via Wiktextract (CC BY-SA 4.0); English frequencies from Tatoeba (CC BY 2.0 FR)', rules, words };
  writeFileSync('public/data/transfer.json', JSON.stringify(out) + '\n');
  console.log(`\nwrote public/data/transfer.json: ${Object.keys(words).length} words, ${named.length} rules, ${(JSON.stringify(out).length / 1024).toFixed(1)} KB`);
}

// ── False-friend candidates ────────────────────────────────────────────────────
// Two pools, and a person decides (lib/falseFriends.ts stays the curated list):
//  - a recorded cognate the gloss does not show, spelled like the headword
//    (bekommen · become): the English word pulls toward the wrong meaning;
//  - a headword spelled like a common English word that is neither in its gloss nor
//    a recorded cognate (aktuell · actual): mostly shared Latin with drifted meaning.
if (arg('--false-friends')) {
  // Spelled the same once umlauts, c/k and a final -e are set aside, or once a
  // Latinate ending is mapped: aktuell · actual (-ell/-al), Realität · reality.
  // Not `norm`, which folds doubled letters and turned *Herr* into *her*.
  const key = (s: string) => light(s).replace(/e$/, '');
  const variants = (n: string) => [n, n.replace(/ell$/, 'al'), n.replace(/itat$/, 'ity')];
  const byNorm = new Map<string, string[]>();
  for (const [w, n] of enFreq) if (n >= 100 && w.length >= 3 && !isName(w)) byNorm.set(key(w), [...(byNorm.get(key(w)) ?? []), w]);
  const rows: string[] = [];
  for (const c of cards) {
    const head = bare(c.term).replace(/^sich\s+/, '');
    if (head.includes(' ') || FALSE_FRIENDS[head.toLowerCase()]) continue;
    const gloss = c.en.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const glossNorm = new Set(gloss.map(key));
    const v = classify(c);
    let w = head; if (c.pos === 'verb') w = w.replace(/e?n$/, '');
    const nh = norm(w);
    if (v.k === 'hidden' && v.cog && ef(v.cog) >= HIDDEN_MIN && close(nh, norm(v.cog), 0.34, 3)) {
      rows.push(`cognate\t${c.level}\t${c.term}\t${v.cog}\t${ef(v.cog)}\t${c.en}`);
      continue;
    }
    if (v.k !== 'none' && v.k !== 'hidden') continue;
    const kh = key(w);
    if (kh.length < 3 || variants(kh).some((x) => glossNorm.has(x))) continue;
    const near = variants(kh).flatMap((x) => byNorm.get(x) ?? []).filter((e) => !gloss.includes(e)).sort((a, b) => ef(b) - ef(a))[0];
    if (near) rows.push(`lookalike\t${c.level}\t${c.term}\t${near}\t${ef(near)}\t${c.en}`);
  }
  rows.sort((a, b) => a.split('\t')[1].localeCompare(b.split('\t')[1]) || Number(b.split('\t')[4]) - Number(a.split('\t')[4]));
  const f = 'scripts/corpus/data/out/false-friend-candidates.tsv';
  writeFileSync(f, `pool\tlevel\tterm\tenglish\tenglish_uses\tgloss\n${rows.join('\n')}\n`);
  const lk = rows.filter((r) => r.startsWith('lookalike'));
  console.log(`\nfalse-friend candidates: ${rows.length} (${rows.length - lk.length} cognate, ${lk.length} lookalike) → ${f}`);
  for (const r of lk.slice(0, 30)) console.log(`  ${r.split('\t').slice(1, 5).join(' · ')}  [${r.split('\t')[5].slice(0, 40)}]`);
}

// ── Compounds of known parts ──────────────────────────────────────────────────
// A noun is counted when it splits into two cards' headwords (with a linking -s-,
// -n-, -en-, -e- or -er- between) and its last part is a noun card. Lower bound:
// three-part compounds and verb stems (Schlafzimmer ← schlafen) are not split.
{
  const heads = new Map<string, Card>();
  for (const c of cards) { const b = bare(c.term).replace(/^sich\s+/, ''); if (!b.includes(' ')) heads.set(b.toLowerCase(), c); }
  const nouns = cards.filter((c) => c.pos === 'noun' && !bare(c.term).includes(' '));
  let compounds = 0, allVisible = 0, oneVisible = 0;
  const ex: string[] = [];
  const vis = (c: Card) => VISIBLE.includes(classify(c).k);
  for (const c of nouns) {
    const w = bare(c.term).toLowerCase();
    let split: [Card, Card] | null = null;
    for (let i = w.length - 3; i >= 3 && !split; i--) {
      const tail = heads.get(w.slice(i));
      if (!tail || tail.pos !== 'noun') continue;
      for (const link of ['', 's', 'n', 'en', 'e', 'er']) {
        const front = w.slice(0, i);
        if (link && !front.endsWith(link)) continue;
        const head = heads.get(front.slice(0, front.length - link.length));
        if (head && head !== c && front.length - link.length >= 3) { split = [head, tail]; break; }
      }
    }
    if (!split) continue;
    compounds++;
    const v = split.filter(vis).length;
    if (v === 2) { allVisible++; if (ex.length < 10 && c.level <= 'A2') ex.push(`${bare(c.term)} = ${bare(split[0].term)} + ${bare(split[1].term)}`); }
    if (v >= 1) oneVisible++;
  }
  console.log(`\ncompounds of two cards: ${compounds} of ${nouns.length} single-word nouns · both parts visible ${allVisible} · at least one ${oneVisible}`);
  console.log(`  e.g. ${ex.join(' · ')}`);
}
