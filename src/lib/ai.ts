// Thin client for any OpenAI-compatible chat API (OpenRouter, OpenAI, Mistral,
// Ollama…). Config comes from the store (base URL + model + key). Shared by
// sentence-mining enrichment and the AI tutor.
export interface AiConfig { baseUrl: string; model: string; key: string; }

export async function chat(messages: { role: string; content: string }[], cfg: AiConfig, opts: { temperature?: number } = {}): Promise<string> {
  if (!cfg.key) throw new Error('No API key set. Add one in Settings → AI provider.');
  const url = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: cfg.model, messages, temperature: opts.temperature ?? 0.3 }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
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
