// Source-backed field enrichment (offline, no API). Fills the gaps the app's
// cards show — def, synonyms, plural, IPA, gender, a second example — for A1–B2
// vocabulary from the local Wiktextract dump (CC BY-SA 4.0 + GFDL; see
// ATTRIBUTIONS.md). Only ever FILLS an empty field; never overwrites a curated
// value, so re-running is idempotent and the diff stays surgical.
//
// A verify pass sanity-checks every value it writes and cross-checks gender
// against the card's existing value; anything low-confidence is flagged in
// data/out/enrich-report.md. Whatever the dump can't cover is written to
// data/out/enrich-todo.json for the LLM-polish step (`corpus:polish`) to author.
//
//   node scripts/corpus/enrich-fields.ts [--dry]
//
// --dry writes the report but leaves vocab.json untouched.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { readJSON, writeJSON, writeText, lemmaKey, stripArticle, fileExists } from './lib.ts';
import type { Word, Example } from '../../src/types.ts';

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);
const OPEN_CLASS = new Set(['noun', 'verb', 'adjective', 'adverb']);
const WIKT_PATH = join(PATHS.raw, 'kaikki-de.jsonl');

// ── Wiktextract extraction (self-contained: needs multi-sense glosses + synonyms
//    that the shared sources/wiktextract.ts parser deliberately drops) ──────────
const POS_MAP: Record<string, string> = {
  noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb',
};
const GENDER: Record<string, 'der' | 'die' | 'das'> = {
  m: 'der', masculine: 'der', f: 'die', feminine: 'die', n: 'das', neuter: 'das',
};
const FORM_GLOSS_RE = /\b(inflection|inflected\s+form|forms?|spelling|misspelling|abbreviation|plural|singular|genitive|dative|accusative|nominative|participle|comparative|superlative)\s+of\b/i;

interface Extract {
  pos: string;
  gender: 'der' | 'die' | 'das' | null;
  plural: string | null;
  ipa: string | null;
  glosses: string[];
  syn: string[];
  ex: { de: string; en: string }[];
  form: boolean;
}

function detectForm(e: any): boolean {
  const senses: any[] = e.senses ?? [];
  if (!senses.length) return false;
  return senses.every((s) =>
    (Array.isArray(s.form_of) && s.form_of.length > 0) ||
    (s.tags ?? []).includes('form-of') ||
    (Array.isArray(s.glosses) && s.glosses.length > 0 && s.glosses.every((g: string) => FORM_GLOSS_RE.test(g))));
}
function detectGender(e: any): 'der' | 'die' | 'das' | null {
  for (const t of e.tags ?? []) if (GENDER[t]) return GENDER[t];
  for (const ht of e.head_templates ?? []) {
    const a = ht.args ?? {};
    for (const v of [a.g, a.g1, a['1']]) {
      const key = String(v ?? '').split('-')[0];
      if (GENDER[key]) return GENDER[key];
    }
  }
  for (const f of e.forms ?? []) for (const t of f.tags ?? []) if (GENDER[t] && f.form === e.word) return GENDER[t];
  return null;
}
function detectPlural(e: any): string | null {
  for (const f of e.forms ?? []) {
    const tags: string[] = f.tags ?? [];
    if (!tags.includes('plural')) continue;
    if (tags.includes('genitive') || tags.includes('dative') || tags.includes('singular')) continue;
    const form = String(f.form ?? '').trim();
    if (!form || form === '-' || /no|error|:/i.test(form)) continue;
    return form;
  }
  return null;
}
function detectIpa(e: any): string | null {
  for (const s of e.sounds ?? []) {
    if (typeof s.ipa === 'string' && s.ipa.trim()) return s.ipa.replace(/[/[\]]/g, '').trim() || null;
  }
  return null;
}
function detectGlosses(e: any): string[] {
  const out: string[] = [];
  for (const s of e.senses ?? []) {
    if (Array.isArray(s.form_of) && s.form_of.length) continue;
    if ((s.tags ?? []).includes('form-of')) continue;
    if ((s.tags ?? []).includes('obsolete') || (s.tags ?? []).includes('archaic')) continue;
    const g = (s.glosses ?? [])[0];
    if (typeof g === 'string' && g.trim() && !FORM_GLOSS_RE.test(g)) out.push(g.trim());
  }
  return out;
}
function detectSyn(e: any): string[] {
  const out: string[] = [];
  const push = (w: any) => { if (w && typeof w.word === 'string') out.push(w.word.trim()); };
  for (const s of e.senses ?? []) for (const sy of s.synonyms ?? []) push(sy);
  for (const sy of e.synonyms ?? []) push(sy);
  return out;
}
function detectExamples(e: any, cap = 6): { de: string; en: string }[] {
  const out: { de: string; en: string }[] = [];
  for (const s of e.senses ?? []) {
    for (const ex of s.examples ?? []) {
      const de = String(ex.text ?? '').trim();
      const en = String(ex.english ?? ex.translation ?? '').trim();
      if (de && en) out.push({ de, en });
      if (out.length >= cap) return out;
    }
  }
  return out;
}

async function buildIndex(wanted: Set<string>): Promise<Map<string, Extract[]>> {
  const idx = new Map<string, Extract[]>();
  const rl = createInterface({ input: createReadStream(WIKT_PATH, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    // cheap pre-filter before the JSON parse (the dump is ~1 GB)
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    const word = String(e.word ?? '').trim();
    if (!word) continue;
    const key = word.toLowerCase();
    if (!wanted.has(key)) continue;
    if (e.lang_code && e.lang_code !== 'de') continue;
    const pos = POS_MAP[e.pos];
    if (!pos) continue;
    const rec: Extract = {
      pos,
      gender: pos === 'noun' ? detectGender(e) : null,
      plural: pos === 'noun' ? detectPlural(e) : null,
      ipa: detectIpa(e),
      glosses: detectGlosses(e),
      syn: detectSyn(e),
      ex: detectExamples(e),
      form: detectForm(e),
    };
    (idx.get(key) ?? idx.set(key, []).get(key)!).push(rec);
  }
  return idx;
}

function pick(entries: Extract[] | undefined, pos: string): Extract | null {
  if (!entries || !entries.length) return null;
  const score = (x: Extract) => (x.form ? 0 : 8) + (x.pos === pos ? 10 : 0) + x.glosses.length + (x.gender ? 2 : 0) + (x.plural ? 1 : 0) + (x.ipa ? 1 : 0) + x.syn.length;
  return [...entries].sort((a, b) => score(b) - score(a))[0];
}

// ── field builders + validators ──────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/[.,;:!?()\s]+/g, ' ').trim();

const headTokens = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length >= 4));
const firstWord = (s: string) => norm(s).split(' ')[0] ?? '';

/** True when two glosses describe the same sense — they share the head word or a
 *  significant token. Prevents pulling an unrelated homograph sense into the def
 *  (e.g. Mutter "mother" must never gain the "nut (for a bolt)" sense). */
function related(a: string, b: string): boolean {
  if (firstWord(a) && firstWord(a) === firstWord(b)) return true;
  const ta = headTokens(a), tb = headTokens(b);
  for (const t of ta) if (tb.has(t)) return true;
  return false;
}

/** A learner definition built from the PRIMARY sense, optionally elaborated by a
 *  second sense that clearly belongs to the same word. Returns null when it would
 *  only repeat the English gloss already on the card (→ left for LLM polish). */
function buildDef(ex: Extract, en: string): string | null {
  if (!ex.glosses.length) return null;
  const primary = ex.glosses[0];
  const parts = [primary];
  for (const g of ex.glosses.slice(1)) {
    if (norm(g) === norm(primary)) continue;
    if (!related(primary, g)) continue; // never cross into an unrelated sense
    parts.push(g);
    break;
  }
  const def = parts.join('; ').replace(/\s+/g, ' ').trim();
  if (norm(def) === norm(en)) return null; // redundant with the gloss already shown
  return def;
}

function cleanSyn(raw: string[], lemma: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>([lemma.toLowerCase()]);
  for (const w of raw) {
    const t = w.trim();
    if (!/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-  ]{1,28}$/.test(t)) continue; // German word/short phrase
    if (/,|;|\(|\)/.test(t)) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}

function validPlural(pl: string, _lemma: string): boolean {
  // NB: a plural identical to the singular is valid German (der Computer → die
  // Computer, das Zimmer → die Zimmer); only the article changes. So we accept
  // equality and just guard against junk tokens.
  if (!pl || /\d|:|error/i.test(pl)) return false;
  return pl.length <= 40;
}

// ── main ──────────────────────────────────────────────────────────────────────
const dry = process.argv.includes('--dry');

if (!fileExists(WIKT_PATH)) {
  console.error(`Missing ${WIKT_PATH}. Run \`npm run corpus:fetch\` first (see ATTRIBUTIONS.md).`);
  process.exit(1);
}

const vocab = readJSON<Word[]>(PATHS.vocab);
const targets = vocab.filter((c) => LEVELS.has(c.level) && c.kind !== 'grammar');

// only stream entries we actually need
const wanted = new Set<string>();
for (const c of targets) wanted.add(lemmaKey(c.term));

console.log(`Indexing Wiktextract for ${wanted.size} A1–B2 lemmas …`);
const idx = await buildIndex(wanted);
console.log(`  indexed ${idx.size} lemmas`);

type LevelKey = 'A1' | 'A2' | 'B1' | 'B2';
const FIELDS = ['def', 'syn', 'plural', 'ipa', 'gender', 'ex'] as const;
const filled: Record<string, Record<LevelKey, number>> = {};
const residual: Record<string, Record<LevelKey, number>> = {};
for (const f of FIELDS) { filled[f] = { A1: 0, A2: 0, B1: 0, B2: 0 }; residual[f] = { A1: 0, A2: 0, B1: 0, B2: 0 }; }
const flags: string[] = [];
const todo: { id: string; term: string; en: string; level: string; pos: string; need: string[] }[] = [];

for (const c of targets) {
  const lvl = c.level as LevelKey;
  const lemma = stripArticle(c.term);
  const ex = pick(idx.get(lemmaKey(c.term)), c.pos);
  const need: string[] = [];

  // def
  if (!c.def) {
    const def = ex ? buildDef(ex, c.en) : null;
    if (def) { c.def = def; filled.def[lvl]++; } else { residual.def[lvl]++; need.push('def'); }
  }
  // synonyms (open class only — synonyms for function words are noise)
  if ((!c.syn || c.syn.length === 0) && OPEN_CLASS.has(c.pos)) {
    const syn = ex ? cleanSyn(ex.syn, lemma) : [];
    if (syn.length) { c.syn = syn; filled.syn[lvl]++; } else { residual.syn[lvl]++; need.push('syn'); }
  }
  // plural (nouns)
  if (c.pos === 'noun' && !c.plural) {
    if (ex && ex.plural && validPlural(ex.plural, lemma)) {
      c.plural = ex.plural.startsWith('die ') ? ex.plural : `die ${ex.plural}`;
      filled.plural[lvl]++;
    } else {
      residual.plural[lvl]++; need.push('plural');
      if (ex && ex.plural && !validPlural(ex.plural, lemma)) flags.push(`plural? ${c.term} → "${ex.plural}" rejected (looks invalid)`);
    }
  }
  // ipa
  if (!c.ipa) {
    if (ex && ex.ipa) { c.ipa = ex.ipa; filled.ipa[lvl]++; } else { residual.ipa[lvl]++; need.push('ipa'); }
  }
  // gender (nouns) + cross-check
  if (c.pos === 'noun') {
    if (!c.gender && ex && ex.gender) { c.gender = ex.gender; filled.gender[lvl]++; }
    else if (!c.gender) { residual.gender[lvl]++; need.push('gender'); }
    else if (ex && ex.gender && ex.gender !== c.gender) flags.push(`gender mismatch: ${c.term} has "${c.gender}", Wiktextract says "${ex.gender}"`);
  }
  // examples — top up to 2
  if ((c.ex ?? []).length < 2 && ex && ex.ex.length) {
    const have = new Set((c.ex ?? []).map((e) => e.de.trim()));
    const add: Example[] = [];
    for (const e of ex.ex) {
      if (have.has(e.de.trim())) continue;
      add.push({ de: e.de, en: e.en, lvl: c.level });
      if ((c.ex?.length ?? 0) + add.length >= 2) break;
    }
    if (add.length) { c.ex = [...(c.ex ?? []), ...add]; filled.ex[lvl]++; }
    else if ((c.ex ?? []).length < 2) { residual.ex[lvl]++; need.push('ex'); }
  } else if ((c.ex ?? []).length < 2) { residual.ex[lvl]++; need.push('ex'); }

  if (need.length) todo.push({ id: c.id, term: c.term, en: c.en, level: c.level, pos: c.pos, need });
}

// ── report ────────────────────────────────────────────────────────────────────
const sum = (r: Record<LevelKey, number>) => r.A1 + r.A2 + r.B1 + r.B2;
const row = (label: string, r: Record<string, Record<LevelKey, number>>) =>
  `| ${label} | ${FIELDS.map((f) => sum(r[f])).join(' | ')} |`;
const lines = [
  '# A1–B2 source-backed enrichment report',
  '',
  `Generated ${new Date().toISOString()} from Wiktextract (CC BY-SA 4.0 + GFDL).`,
  dry ? '\n> DRY RUN — vocab.json not written.\n' : '',
  `Cards in scope (A1–B2 words): **${targets.length}**`,
  '',
  '## Fields filled (this run)',
  '',
  `| level | ${FIELDS.join(' | ')} |`,
  `|---|${FIELDS.map(() => '---').join('|')}|`,
  ...(['A1', 'A2', 'B1', 'B2'] as LevelKey[]).map((L) => `| ${L} | ${FIELDS.map((f) => filled[f][L]).join(' | ')} |`),
  row('**total**', filled),
  '',
  '## Residual gaps (→ corpus:polish / manual)',
  '',
  `| level | ${FIELDS.join(' | ')} |`,
  `|---|${FIELDS.map(() => '---').join('|')}|`,
  ...(['A1', 'A2', 'B1', 'B2'] as LevelKey[]).map((L) => `| ${L} | ${FIELDS.map((f) => residual[f][L]).join(' | ')} |`),
  row('**total**', residual),
  '',
  `## Flags (${flags.length}) — review these`,
  '',
  ...(flags.length ? flags.slice(0, 300).map((f) => `- ${f}`) : ['- none']),
  flags.length > 300 ? `- … and ${flags.length - 300} more` : '',
  '',
  `Handoff for LLM polish: **${todo.length}** cards → \`data/out/enrich-todo.json\``,
  '',
];
writeText(join(PATHS.out, 'enrich-report.md'), lines.filter((l) => l !== '').join('\n') + '\n');
writeJSON(join(PATHS.out, 'enrich-todo.json'), todo);

if (!dry) writeJSON(PATHS.vocab, vocab);

console.log(`\nFilled — ${FIELDS.map((f) => `${f}:${sum(filled[f])}`).join('  ')}`);
console.log(`Residual — ${FIELDS.map((f) => `${f}:${sum(residual[f])}`).join('  ')}`);
console.log(`Flags: ${flags.length}  |  Polish todo: ${todo.length}`);
console.log(dry ? 'DRY RUN — vocab.json unchanged.' : `Wrote ${PATHS.vocab}`);
