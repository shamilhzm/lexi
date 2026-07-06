// Live end-to-end smoke test against a real OpenRouter key. Runs on YOUR machine
// only — the app itself never needs this. It reads the key from a git-ignored
// file so no secret is ever committed.
//
//   1) echo -n "sk-or-v1-…" > openrouter.key.local      (repo root; *.local is git-ignored)
//   2) node scripts/or-smoke.ts                          (Node ≥ 22.18 strips types natively)
//      npx tsx scripts/or-smoke.ts                        (fallback on older Node)
//
// Optional overrides:  OPENROUTER_KEY=… OR_MODEL=… OR_BASE=… node scripts/or-smoke.ts
//
// Prints: connection latency, one enriched card, one tutor feedback. Never loops.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Stubs so the app modules (tutor.ts → store.ts) import cleanly under plain Node.
(globalThis as any).localStorage ??= {
  getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {},
};

const DEFAULT_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const here = dirname(fileURLToPath(import.meta.url));
function readKey(): string {
  if (process.env.OPENROUTER_KEY) return process.env.OPENROUTER_KEY.trim();
  try {
    return readFileSync(join(here, '..', 'openrouter.key.local'), 'utf8').trim();
  } catch {
    console.error('No key found. Put it in openrouter.key.local (repo root) or set OPENROUTER_KEY.');
    process.exit(1);
  }
}

const cfg = { baseUrl: process.env.OR_BASE || DEFAULT_BASE, model: process.env.OR_MODEL || DEFAULT_MODEL, key: readKey() };

const { chat } = await import('../src/lib/ai.ts');
const { enrich } = await import('../src/lib/mining.ts');
const { buildMessages, parseFeedback, streamingFeedbackText } = await import('../src/lib/tutor.ts');

const ms = (t0: number) => `${Math.round(performance.now() - t0)} ms`;
console.log(`\n▶ OpenRouter smoke test\n  base : ${cfg.baseUrl}\n  model: ${cfg.model}\n  key  : ${cfg.key.slice(0, 10)}…${cfg.key.slice(-4)}\n`);

// 1) Connection ping (what the Settings "Test connection" button does).
try {
  const t0 = performance.now();
  await chat([{ role: 'user', content: 'ping' }], cfg, { maxTokens: 1, temperature: 0 });
  console.log(`① connection  OK · ${ms(t0)}`);
} catch (e: any) {
  console.error(`① connection  FAILED · ${e?.kind ?? 'error'}: ${e?.message ?? e}`);
  process.exit(1);
}

// 2) Enrichment on unknowns from a real news-style paragraph.
try {
  const t0 = performance.now();
  const unknowns = ['Klimaschutzgesetz', 'Verkehrswende', 'Ministerpräsidentin', 'Wasserstofftechnologie', 'nachhaltige'];
  const cards = await enrich(unknowns, cfg);
  console.log(`② enrichment  ${cards.length}/${unknowns.length} valid cards · ${ms(t0)}`);
  if (cards[0]) {
    const c = cards[0];
    console.log(`   e.g. ${c.term} (${c.pos}, ${c.level}${c.gender ? ', ' + c.gender : ''}${c.plural ? ', pl. ' + c.plural : ''}) — ${c.en}`);
    if (c.ex[0]) console.log(`        „${c.ex[0].de}“ — ${c.ex[0].en}`);
  }
} catch (e: any) {
  console.error(`② enrichment  FAILED · ${e?.kind ?? 'error'}: ${e?.message ?? e}`);
}

// 3) Tutor feedback (streamed), then parsed.
try {
  const t0 = performance.now();
  let buf = '', ticks = 0;
  const content = await chat(
    buildMessages('Beschreibe deinen letzten Urlaub.', 'Letztes Jahr ich gefahren nach Italien mit meine Familie. Es war sehr schön aber das Wetter war nicht gut.'),
    cfg,
    { temperature: 0.4, maxTokens: 1024, onToken: (d) => { buf += d; ticks++; streamingFeedbackText(buf); } },
  );
  const fb = parseFeedback(content);
  console.log(`③ tutor       OK · streamed ${ticks} chunks · ${ms(t0)}`);
  console.log(`   CEFR: ${fb.cefr} · ${fb.corrections.length} correction(s)`);
  console.log(`   ${fb.feedback}`);
  if (fb.corrections[0]) console.log(`   fix: „${fb.corrections[0].original}“ → „${fb.corrections[0].fixed}“ (${fb.corrections[0].tag ?? '—'})`);
  if (fb.natural) console.log(`   natural: „${fb.natural}“`);
} catch (e: any) {
  console.error(`③ tutor       FAILED · ${e?.kind ?? 'error'}: ${e?.message ?? e}`);
}

console.log('\n✓ done\n');
