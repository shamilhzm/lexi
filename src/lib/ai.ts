// Thin client for any OpenAI-compatible chat API (OpenRouter, OpenAI, Mistral,
// Ollama…). Config comes from the store (base URL + model + key). Shared by
// sentence-mining enrichment and the AI tutor.
export interface AiConfig { baseUrl: string; model: string; key: string; }

/** A categorised API failure so callers can show a specific, actionable message. */
export type AiErrorKind =
  | 'no-key' | 'auth' | 'rate-limit' | 'model' | 'credits' | 'network' | 'server' | 'bad-response';
export class AiError extends Error {
  kind: AiErrorKind;
  status?: number;
  constructor(kind: AiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AiError';
    this.kind = kind;
    this.status = status;
  }
}
/** Errors after which pointing the user at Settings is the fix. */
export const isSettingsError = (e: unknown): boolean =>
  e instanceof AiError && (e.kind === 'no-key' || e.kind === 'auth' || e.kind === 'model');

// A base URL is "local" (Ollama etc.) when it points at the loopback host — those
// providers need no API key.
const isLocalBase = (base: string) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(base);

// OpenRouter uses these optional headers for app attribution; harmless elsewhere.
// HTTP-Referer is a custom name (not the forbidden `Referer`), so browsers allow it.
function attributionHeaders(): Record<string, string> {
  const referer = typeof location !== 'undefined' && location.origin ? location.origin : 'http://localhost';
  return { 'HTTP-Referer': referer, 'X-Title': 'Lexi' };
}

function errorForStatus(status: number, body: string): AiError {
  if (status === 401 || status === 403) return new AiError('auth', 'API key rejected. Check the key in Settings → AI provider.', status);
  if (status === 402) return new AiError('credits', 'Out of credits for this model. Add credits, or switch to a free model in Settings.', status);
  if (status === 404) return new AiError('model', 'Model not found. Check the model name in Settings, or pick a preset.', status);
  if (status === 429) return new AiError('rate-limit', 'Rate limit reached. Wait a moment and retry — free models are capped per day.', status);
  if (status >= 500) return new AiError('server', `Provider error (${status}). Try again shortly.`, status);
  return new AiError('server', `API ${status}: ${body.slice(0, 200)}`, status);
}

export interface ChatOpts {
  temperature?: number;
  /** Cap the reply length (cost + latency safety). */
  maxTokens?: number;
  /** When set, the reply is streamed and each text delta is passed here. */
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
}

export async function chat(
  messages: { role: string; content: string }[],
  cfg: AiConfig,
  opts: ChatOpts = {},
): Promise<string> {
  if (!cfg.key && !isLocalBase(cfg.baseUrl)) throw new AiError('no-key', 'No API key set. Add one in Settings → AI provider.');
  const url = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions';
  const stream = !!opts.onToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...attributionHeaders() };
  if (cfg.key) headers.Authorization = `Bearer ${cfg.key}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 1024,
        ...(stream ? { stream: true } : {}),
      }),
      signal: opts.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new AiError('network', 'Could not reach the AI provider. Check your connection and the base URL in Settings.');
  }
  if (!res.ok) throw errorForStatus(res.status, await res.text().catch(() => ''));

  if (stream) return readSse(res, opts.onToken!);
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new AiError('bad-response', 'The provider returned an unexpected response shape.');
  return content;
}

/** Read an OpenAI-style SSE stream, forwarding content deltas and returning the full text. */
async function readSse(res: Response, onToken: (delta: string) => void): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) { const t = await res.text(); onToken(t); return t; }
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? ''; // keep the (possibly partial) last line for the next chunk
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith('data:')) continue; // skip SSE comments/keep-alives
      const payload = l.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) { full += delta; onToken(delta); }
      } catch { /* ignore a frame we can't parse */ }
    }
  }
  return full;
}

/** Parse a JSON object/array from a model reply that may wrap it in prose/fences. */
export function parseLooseJSON(content: string): any {
  let c = content.replace(/```json\s*|```/g, '').trim();
  const obj = c.indexOf('{'), objEnd = c.lastIndexOf('}');
  const arr = c.indexOf('['), arrEnd = c.lastIndexOf(']');
  // prefer whichever bracket type appears first
  if (arr >= 0 && (obj < 0 || arr < obj)) return JSON.parse(c.slice(arr, arrEnd + 1));
  if (obj >= 0) return JSON.parse(c.slice(obj, objEnd + 1));
  return JSON.parse(c);
}
