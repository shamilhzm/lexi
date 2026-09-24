// The optional tutor — reopened 2026-09-24. See VISION, "Settled decisions".
//
// ## What it is, and what it is not
//
// Two jobs, both about **language the learner has already met**:
//
//   explain  — a sentence from an article they are reading: what it says, and
//              the grammar that makes it hard (Konjunktiv I, a separable verb
//              split across a clause, a genitive).
//   correct  — what the learner wrote back about that article: the minimum edits
//              to make it right, each named, and one thing to practise.
//
// It is **not** a chatbot, and it never writes a fact onto a card. Cards stay
// looked-up (`lib/wiktionary.ts`) and observed (the learner's own sentence).
// Feedback is advice, shown once, stored in the learner's journal, and never
// feeds FSRS, readiness, Known or any other number — the refusal it reopens was
// "a drill that marks correct German wrong is worse than no drill", and the
// answer to that is: nothing here marks anything. It suggests, and says it can be
// wrong.
//
// ## No backend, still
//
// Bring-your-own-key. The key is stored in this browser's localStorage and sent
// only to the provider the learner chose, directly from the browser. It is never
// in the backup export. Lexi has no server to see it, and with no key set, no
// text leaves the device.
import type Anthropic from '@anthropic-ai/sdk';

export type Provider = 'anthropic' | 'openrouter';
export interface AiConfig { provider: Provider; model: string }

/** Provider and model: an ordinary setting, and in the backup. */
export const AI_CONFIG_KEY = 'lexi.ai.v1';
/** The key: a secret, and deliberately *not* in SETTING_KEYS. */
const AI_SECRET_KEY = 'lexi.ai.key.v1';

export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-opus-5',
  openrouter: 'anthropic/claude-opus-5',
};

export function aiConfig(): AiConfig | null {
  try {
    const v = JSON.parse(localStorage.getItem(AI_CONFIG_KEY) || 'null') as AiConfig | null;
    return v && (v.provider === 'anthropic' || v.provider === 'openrouter') && typeof v.model === 'string' ? v : null;
  } catch { return null; }
}
function aiSecret(): string | null {
  try { return localStorage.getItem(AI_SECRET_KEY) || null; } catch { return null; }
}
export function aiReady(): boolean { return !!aiConfig() && !!aiSecret(); }
/** The last four characters, for "key ending …a1b2" in Settings. Never the key. */
export function aiKeyHint(): string | null {
  const k = aiSecret();
  return k ? k.slice(-4) : null;
}
export function setAi(cfg: AiConfig | null, key?: string | null) {
  try {
    if (!cfg) { localStorage.removeItem(AI_CONFIG_KEY); localStorage.removeItem(AI_SECRET_KEY); return; }
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg));
    if (key !== undefined) {
      if (key) localStorage.setItem(AI_SECRET_KEY, key.trim()); else localStorage.removeItem(AI_SECRET_KEY);
    }
  } catch { /* quota */ }
}

export class AiError extends Error {
  constructor(message: string, readonly kind: 'no-key' | 'auth' | 'rate' | 'network' | 'refused' | 'bad-output' | 'other') {
    super(message);
  }
}

// ---- the two calls ----------------------------------------------------------------

export interface Explanation {
  /** Natural English. */
  translation: string;
  /** The parts that make the sentence hard, each explained. At most four. */
  points: { de: string; note: string }[];
}

const EXPLAIN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['translation', 'points'],
  properties: {
    translation: { type: 'string' },
    points: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['de', 'note'],
        properties: { de: { type: 'string' }, note: { type: 'string' } },
      },
    },
  },
};

export async function explainSentence(args: { sentence: string; paragraph: string; title: string; level: string }): Promise<Explanation> {
  const system = [
    `You help an English-speaking learner of German at CEFR level ${args.level} read real German news.`,
    'They tapped one sentence and want to understand it. Reply in English.',
    '"translation": a natural English translation of the sentence.',
    '"points": up to four chunks of the German sentence that a learner at this level would find hard, each with a short note: what it means here and the grammar behind it (case, verb position, separable verbs, Konjunktiv I in reported speech, participle constructions, idioms, compounds broken into parts). Quote each chunk exactly as it appears. Skip anything easy.',
    'Explain the language only. Do not add facts about the news story.',
  ].join('\n');
  const user = `Article: ${args.title}\n\nParagraph:\n${args.paragraph}\n\nSentence to explain:\n${args.sentence}`;
  const out = await complete<Explanation>(system, user, EXPLAIN_SCHEMA, 'low');
  return { translation: String(out.translation ?? ''), points: Array.isArray(out.points) ? out.points.slice(0, 4) : [] };
}

export interface CorrectionResult {
  corrected: string;
  natural: string;
  verdict: string;
  issues: { original: string; fix: string; why: string; kind: string }[];
  tip: string;
}

const CORRECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['corrected', 'natural', 'verdict', 'issues', 'tip'],
  properties: {
    corrected: { type: 'string' },
    natural: { type: 'string' },
    verdict: { type: 'string' },
    tip: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['original', 'fix', 'why', 'kind'],
        properties: {
          original: { type: 'string' }, fix: { type: 'string' }, why: { type: 'string' },
          kind: { type: 'string', enum: ['gender', 'case', 'verb', 'word-order', 'spelling', 'word-choice', 'preposition', 'other'] },
        },
      },
    },
  },
};

export async function correctWriting(args: { text: string; title: string; level: string; targets: string[] }): Promise<CorrectionResult> {
  const system = [
    `You are a German writing coach for an English-speaking adult learner at CEFR level ${args.level}.`,
    'They read a news article and wrote a short response in German. Correct it.',
    '"corrected": their text with only the changes needed for correct German. Keep their meaning, their ideas and their word choices wherever those are correct.',
    `"natural": how a native speaker might say the same thing, still readable at ${args.level}.`,
    '"issues": one entry per real error, in the order it appears: the original fragment, the fixed fragment, one sentence in English naming the rule (for example: "wegen takes the genitive in written German: wegen des Wetters"), and its kind. Style preferences are not errors. Correct German that you would merely phrase differently is not an error. If there are no errors, return an empty list.',
    '"verdict": one honest sentence in English. No flattery, no scores.',
    '"tip": the single most useful thing for this learner to practise next, based on these errors, in one sentence.',
    'If words they were trying to use are listed, check that any they used were used correctly; do not mention ones they did not use.',
  ].join('\n');
  const user = [
    `Article: ${args.title}`,
    args.targets.length ? `Words they were trying to use: ${args.targets.join(', ')}` : '',
    '',
    'Their text:',
    args.text,
  ].filter((l) => l !== '').join('\n');
  const out = await complete<CorrectionResult>(system, user, CORRECT_SCHEMA, 'medium');
  return {
    corrected: String(out.corrected ?? ''),
    natural: String(out.natural ?? ''),
    verdict: String(out.verdict ?? ''),
    tip: String(out.tip ?? ''),
    issues: Array.isArray(out.issues) ? out.issues : [],
  };
}

// ---- transport -------------------------------------------------------------------

async function complete<T>(system: string, user: string, schema: Record<string, unknown>, effort: 'low' | 'medium'): Promise<T> {
  const cfg = aiConfig();
  const key = aiSecret();
  if (!cfg || !key) throw new AiError('No AI key set', 'no-key');
  const text = cfg.provider === 'anthropic'
    ? await viaAnthropic(cfg.model, key, system, user, schema, effort)
    : await viaOpenRouter(cfg.model, key, system, user, schema);
  try { return JSON.parse(text) as T; } catch { /* fall through */ }
  // A provider that ignored the schema may still have wrapped JSON in prose.
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]) as T; } catch { /* fall through */ } }
  throw new AiError('The reply was not in the expected shape', 'bad-output');
}

async function viaAnthropic(model: string, apiKey: string, system: string, user: string,
  schema: Record<string, unknown>, effort: 'low' | 'medium'): Promise<string> {
  const { default: Client } = await import('@anthropic-ai/sdk');
  const client = new Client({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort, format: { type: 'json_schema', schema } },
      // On a policy decline the API re-runs the request on its default fallback
      // model instead of returning nothing — a correction is not worth failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } catch (e) {
    if (e instanceof Client.AuthenticationError || e instanceof Client.PermissionDeniedError) throw new AiError('The API key was not accepted', 'auth');
    if (e instanceof Client.RateLimitError) throw new AiError('Rate limited — try again in a moment', 'rate');
    if (e instanceof Client.APIConnectionError) throw new AiError('Could not reach Anthropic', 'network');
    if (e instanceof Client.APIError) throw new AiError(`Anthropic error ${e.status ?? ''}`.trim(), 'other');
    throw e;
  }
  if (res.stop_reason === 'refusal') throw new AiError('The model declined this one', 'refused');
  const block = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
  if (!block) throw new AiError('Empty reply', 'bad-output');
  return block.text;
}

async function viaOpenRouter(model: string, apiKey: string, system: string, user: string,
  schema: Record<string, unknown>): Promise<string> {
  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Lexi',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema } },
      }),
    });
  } catch { throw new AiError('Could not reach OpenRouter', 'network'); }
  if (res.status === 401 || res.status === 403) throw new AiError('The API key was not accepted', 'auth');
  if (res.status === 429) throw new AiError('Rate limited — try again in a moment', 'rate');
  if (!res.ok) throw new AiError(`OpenRouter error ${res.status}`, 'other');
  const j = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = j.choices?.[0]?.message?.content;
  if (!text) throw new AiError('Empty reply', 'bad-output');
  return text;
}

/** A cheap round-trip for Settings' "Test" button. */
export async function testAi(): Promise<void> {
  await explainSentence({ sentence: 'Das ist ein Test.', paragraph: 'Das ist ein Test.', title: 'Test', level: 'A1' });
}
