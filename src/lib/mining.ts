// Sentence mining — turn pasted German text into review cards. Tokenise, match
// against the lexicon, and split into words you already know, words in the
// lexicon you haven't learned yet, and words not in the lexicon at all. The last
// group can be auto-enriched into user cards via an optional LLM API key.
import { WORDS } from '../data/index.ts';
import type { Word, CEFR } from '../types.ts';

const stripArticle = (term: string) => term.replace(/^(der|die|das)\s+/i, '');

let index: Map<string, Word> | null = null;
/** lowercased form (full term, article-stripped, first token) -> Word. */
function lexIndex(): Map<string, Word> {
  if (index) return index;
  const m = new Map<string, Word>();
  for (const w of WORDS) {
    const keys = [w.term.toLowerCase(), stripArticle(w.term).toLowerCase()];
    for (const k of keys) if (k && !m.has(k)) m.set(k, w);
  }
  index = m;
  return m;
}
/** Invalidate the cached index (after user words are added). */
export function resetMiningIndex() { index = null; }

/** Unique tokens in reading order, with a display form (as first seen). */
export function tokenize(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = text.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g) ?? [];
  for (const raw of matches) {
    if (raw.length < 2) continue;
    const lc = raw.toLowerCase();
    if (seen.has(lc)) continue;
    seen.add(lc);
    out.push(raw);
  }
  return out;
}

export interface Analysis {
  inLexicon: { token: string; word: Word }[]; // token matched a lexicon entry
  unknown: string[];                          // not in lexicon (display form)
}

export function analyze(text: string): Analysis {
  const idx = lexIndex();
  const inLexicon: { token: string; word: Word }[] = [];
  const unknown: string[] = [];
  for (const tok of tokenize(text)) {
    const w = idx.get(tok.toLowerCase());
    if (w) inLexicon.push({ token: tok, word: w });
    else unknown.push(tok);
  }
  return { inLexicon, unknown };
}

// ---- optional LLM enrichment ---------------------------------------------
export interface Enriched {
  term: string; en: string; pos: string; level: CEFR;
  gender: 'der' | 'die' | 'das' | null; plural: string | null;
  ipa: string | null; example_de: string; example_en: string;
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

/** Enrich out-of-lexicon words into Word cards via an OpenAI-compatible API. */
export async function enrich(tokens: string[], apiKey: string): Promise<Word[]> {
  const prompt = `For each German word below, return a JSON array. Each item: {"input": the word as given, "term": dictionary form (nouns include article der/die/das), "en": short English gloss, "pos": one of noun|verb|adjective|adverb|other, "level": CEFR A1-C2 estimate, "gender": der|die|das or null, "plural": plural form with article or null, "ipa": IPA without slashes or null, "example_de": one short example sentence, "example_en": its English translation}. Return ONLY the JSON array.\n\nWords:\n${tokens.join('\n')}`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '[]';
  const parsed = JSON.parse(content);
  const arr: any[] = Array.isArray(parsed) ? parsed : (parsed.words ?? parsed.items ?? parsed.result ?? []);

  return arr.map((e): Word => ({
    id: `usr:${(e.term || e.input || '').toLowerCase()}`,
    term: e.term || e.input,
    en: e.en || '',
    pos: e.pos || '',
    level: (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(e.level) ? e.level : 'B1') as CEFR,
    gender: ['der', 'die', 'das'].includes(e.gender) ? e.gender : null,
    plural: e.plural || null,
    ipa: e.ipa || null,
    def: null,
    syn: [], ant: [],
    ex: e.example_de ? [{ de: e.example_de, en: e.example_en || '', lvl: e.level || 'B1' }] : [],
    field: 'Mein Wortschatz',
    kind: 'word',
  })).filter((w) => w.term);
}
