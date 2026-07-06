// Offline LLM layer (Goal 4c) — build-time only, never in the shipped app. For
// lemmas the frequency/reference layers can't confidently level or place, ask an
// OpenAI-compatible model (OpenRouter by default) for a CEFR level and the best
// existing sector. The key is read from the git-ignored openrouter.key.local and
// is never embedded anywhere. Gated behind `--llm`; a run without it (or without
// a key) simply skips this layer. Reuses the app's own `chat`/`parseLooseJSON`.
import { readFileSync } from 'node:fs';
import { PATHS } from './config.ts';
import { fileExists, LEVELS } from './lib.ts';
import { chat, parseLooseJSON, type AiConfig } from '../../src/lib/ai.ts';

export interface LlmSuggestion { level?: string; field?: string; }
export interface LlmCandidate { key: string; lemma: string; pos: string; gloss?: string | null; }

const DEFAULT_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

/** Read the AI config from env/openrouter.key.local, or null if no key is present. */
export function loadAiConfig(): AiConfig | null {
  const key = (process.env.OPENROUTER_KEY ?? (fileExists(PATHS.keyFile) ? readFileSync(PATHS.keyFile, 'utf8') : '')).trim();
  if (!key) return null;
  return { baseUrl: process.env.OR_BASE || DEFAULT_BASE, model: process.env.OR_MODEL || DEFAULT_MODEL, key };
}

const chunk = <T>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

/**
 * Suggest {level, field} for each candidate. `fields` is the list of existing
 * sector names the model must choose from (unknown suggestions are dropped later
 * by resolveField). Batched; failures on a batch are logged and skipped so one
 * bad response never aborts the build.
 */
export async function llmEnrich(cands: LlmCandidate[], cfg: AiConfig, fields: string[], batchSize = 40): Promise<Map<string, LlmSuggestion>> {
  const out = new Map<string, LlmSuggestion>();
  const fieldList = fields.join(', ');
  const system = `You assign German vocabulary to a CEFR level and a semantic sector. Levels: ${LEVELS.join(', ')}. Choose the sector from EXACTLY this list (verbatim), else use "Miscellaneous":\n${fieldList}`;
  let done = 0;
  for (const batch of chunk(cands, batchSize)) {
    const rows = batch.map((c) => `${c.lemma} [${c.pos}]${c.gloss ? ` — ${c.gloss}` : ''}`).join('\n');
    const user = `Return ONLY a JSON array, one object per input line, in order: {"lemma": string, "level": one of ${LEVELS.join('|')}, "field": one sector from the allowed list}.\n\n${rows}`;
    let parsed: any;
    try {
      const content = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], cfg, { temperature: 0.2, maxTokens: Math.min(4000, 200 + batch.length * 40) });
      parsed = parseLooseJSON(content);
    } catch (e) {
      console.warn(`  llm batch failed (${(e as Error).message}); skipping ${batch.length} lemmas`);
      continue;
    }
    const arr: any[] = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
    // Align by lemma when present, else positionally.
    const byLemma = new Map<string, any>();
    for (const o of arr) if (o?.lemma) byLemma.set(String(o.lemma).toLowerCase(), o);
    batch.forEach((c, i) => {
      const o = byLemma.get(c.lemma.toLowerCase()) ?? arr[i];
      if (!o) return;
      const level = LEVELS.includes(String(o.level).toUpperCase() as any) ? String(o.level).toUpperCase() : undefined;
      const field = typeof o.field === 'string' ? o.field.trim() : undefined;
      out.set(c.key, { level, field });
    });
    done += batch.length;
    console.log(`  llm leveled ${done}/${cands.length}`);
  }
  return out;
}
