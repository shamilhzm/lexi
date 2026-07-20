// LLM polish (build-time, on a maintainer's machine — needs network). Authors the
// A1–B2 fields the offline source-backed pass (enrich-fields.ts) could not cover:
// learner definitions and synonyms. Reads the residual handoff at
// data/out/enrich-todo.json, asks an OpenAI-compatible model (OpenRouter free tier
// by default; key from openrouter.key.local), VERIFIES every answer, and fills
// only empty fields in public/data/vocab.json. Idempotent.
//
//   npm run corpus:polish              # author def + syn for all residual cards
//   npm run corpus:polish -- --limit 100 --dry
//
// Flags: --limit N (cap cards, for a cheap trial) · --dry (report only, no write).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from './config.ts';
import { readJSON, writeJSON, writeText, fileExists, stripArticle } from './lib.ts';
import { loadAiConfig } from './enrich-llm.ts';
import { chat, parseLooseJSON } from '../../src/lib/ai.ts';
import type { Word } from '../../src/types.ts';

interface Todo { id: string; term: string; en: string; level: string; pos: string; need: string[]; }

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const limIdx = args.indexOf('--limit');
const limit = limIdx >= 0 ? Number(args[limIdx + 1]) : Infinity;

const cfg = loadAiConfig();
if (!cfg) {
  console.error('No OpenRouter key. Put it in openrouter.key.local (or set OPENROUTER_KEY). See ATTRIBUTIONS.md.');
  process.exit(1);
}

const todoPath = join(PATHS.out, 'enrich-todo.json');
if (!fileExists(todoPath)) {
  console.error(`Missing ${todoPath}. Run \`npm run corpus:enrich\` first.`);
  process.exit(1);
}

const vocab = readJSON<Word[]>(PATHS.vocab);
const byId = new Map(vocab.map((c) => [c.id, c]));
const todo = readJSON<Todo[]>(todoPath)
  .filter((t) => t.need.includes('def') || t.need.includes('syn'))
  .slice(0, limit);

const chunk = <T>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const norm = (s: string) => s.toLowerCase().replace(/[.,;:!?()\s]+/g, ' ').trim();

const system = [
  'You are a lexicographer writing for English-speaking learners of German (CEFR A1–B2).',
  'For each German entry you receive its English gloss, part of speech and level.',
  'Return, per entry:',
  '- "def": ONE concise English learner definition (a sentence fragment, 4–18 words). Describe the meaning; do NOT just repeat the gloss verbatim. Match the sense given by the gloss — never a different homograph sense.',
  '- "syn": 0–4 common German synonyms (bare words, no articles), [] if none are natural. Only for open-class words; never invent.',
  'Be accurate above all. If unsure of a synonym, return []. Output ONLY a JSON array, one object per line, in order.',
].join('\n');

// ── verification ──────────────────────────────────────────────────────────────
function verifyDef(def: unknown, t: Todo): string | null {
  if (typeof def !== 'string') return null;
  const d = def.trim().replace(/\s+/g, ' ');
  const words = d.split(' ').length;
  if (words < 2 || words > 24) return null;                 // too terse / rambling
  if (norm(d) === norm(t.en)) return null;                  // just the gloss again
  if (norm(d) === norm(stripArticle(t.term))) return null;  // echoed the headword
  if (/^\s*(i (don'?t|do not) know|n\/?a|none|unknown)/i.test(d)) return null;
  return d;
}
function verifySyn(syn: unknown, t: Todo): string[] {
  if (!Array.isArray(syn)) return [];
  const lemma = stripArticle(t.term).toLowerCase();
  const out: string[] = [];
  const seen = new Set([lemma]);
  for (const raw of syn) {
    if (typeof raw !== 'string') continue;
    const w = raw.replace(/^(der|die|das)\s+/i, '').trim();
    if (!/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]{1,28}$/.test(w)) continue; // one bare German word
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length >= 4) break;
  }
  return out;
}

// ── run ─────────────────────────────────────────────────────────────────────
let defFilled = 0, synFilled = 0, rejected = 0, batchFail = 0;
const batches = chunk(todo, 25);
console.log(`Polishing ${todo.length} cards in ${batches.length} batches (model ${cfg.model})${dry ? ' [DRY]' : ''} …`);

for (let b = 0; b < batches.length; b++) {
  const batch = batches[b];
  const rows = batch.map((t, i) => `${i + 1}. ${t.term} [${t.pos}, ${t.level}] — gloss: ${t.en}`).join('\n');
  const user = `Return ONLY a JSON array of ${batch.length} objects: {"i": number (1-based), "def": string, "syn": string[]}.\n\n${rows}`;
  let parsed: any;
  try {
    const content = await chat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      cfg,
      { temperature: 0.2, maxTokens: Math.min(4000, 300 + batch.length * 60) },
    );
    parsed = parseLooseJSON(content);
  } catch (e) {
    batchFail++;
    console.warn(`  batch ${b + 1} failed (${(e as Error).message}); skipping ${batch.length}`);
    continue;
  }
  const arr: any[] = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
  const byIndex = new Map<number, any>();
  arr.forEach((o, k) => byIndex.set(typeof o?.i === 'number' ? o.i : k + 1, o));

  batch.forEach((t, i) => {
    const o = byIndex.get(i + 1);
    if (!o) return;
    const card = byId.get(t.id);
    if (!card) return;
    if (t.need.includes('def') && !card.def) {
      const d = verifyDef(o.def, t);
      if (d) { card.def = d; defFilled++; } else rejected++;
    }
    if (t.need.includes('syn') && (!card.syn || card.syn.length === 0)) {
      const s = verifySyn(o.syn, t);
      if (s.length) { card.syn = s; synFilled++; }
    }
  });
  if ((b + 1) % 10 === 0 || b === batches.length - 1) console.log(`  ${b + 1}/${batches.length} batches · def ${defFilled} · syn ${synFilled}`);
}

const report = [
  '# LLM polish report',
  `Generated ${new Date().toISOString()} · model ${cfg.model}${dry ? ' · DRY RUN' : ''}`,
  '',
  `Cards attempted: ${todo.length}`,
  `Definitions authored: ${defFilled}`,
  `Synonyms authored: ${synFilled}`,
  `Definitions rejected by verify (kept empty): ${rejected}`,
  `Batches failed: ${batchFail}`,
  '',
].join('\n');
writeText(join(PATHS.out, 'polish-report.md'), report);
if (!dry) writeJSON(PATHS.vocab, vocab);

console.log(`\n${report}`);
console.log(dry ? 'DRY RUN — vocab.json unchanged.' : `Wrote ${PATHS.vocab}`);
