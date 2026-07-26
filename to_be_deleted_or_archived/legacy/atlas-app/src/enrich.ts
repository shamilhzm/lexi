// Free enrichment (no API key): German Wiktionary parse API (IPA, definition,
// synonyms, Gegenwörter=antonyms, Charakteristische Wortkombinationen, examples)
// + MyMemory (EN translation). Pure parsers are unit-tested; the fetch path
// degrades gracefully offline. Self-contained (no app imports) so it's testable.

export interface Enriched {
  ipa?: string;
  pos?: string;
  definition?: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  translation?: string;
}

// German Wortart → native-language part of speech (shown on the card front).
const POS_EN: Record<string, string> = {
  Substantiv: 'noun', Verb: 'verb', Adjektiv: 'adjective', Adverb: 'adverb',
  Pronomen: 'pronoun', Personalpronomen: 'pronoun', Demonstrativpronomen: 'pronoun',
  Präposition: 'preposition', Konjunktion: 'conjunction', Artikel: 'article',
  Numerale: 'numeral', Partikel: 'particle', Interjektion: 'interjection'
};
const mapPos = (de: string) => POS_EN[de] || de.toLowerCase();

const WIKT = 'https://de.wiktionary.org/w/api.php';
const MYMEM = 'https://api.mymemory.translated.net/get';

export function cleanWikiMarkup(s: string): string {
  return String(s || '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
    .replace(/'''?/g, '')
    .replace(/\[\d+[a-z]?\]/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\(\s*\)/g, '')          // empty parens left by stripped links/templates
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;.])/g, '$1')     // no space before punctuation
    .replace(/^[\s,;]+|[\s,;]+$/g, '') // stray leading/trailing separators
    .trim();
}

// Split a word-list section (synonyms / antonyms) into individual chips. Not
// used for collocations, whose phrases can contain meaningful commas.
function splitList(entries: string[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    for (const part of e.split(/[,;·]|\s+oder\s+/)) {
      const t = part.trim();
      if (t.length > 1 && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

// Collocations are phrases that may carry a meaningful comma ("unter der
// Voraussetzung, dass …"). Only split a comma-joined entry when EVERY part is
// itself a multi-word phrase — i.e. a genuine list of collocations.
const wordCount = (s: string) => (s.match(/[A-Za-zÄÖÜäöüß]{2,}/g) || []).length;
function splitCollocations(entries: string[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    const parts = e.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => wordCount(p) >= 2)) {
      for (const p of parts) if (!out.includes(p)) out.push(p);
    } else if (!out.includes(e)) out.push(e);
  }
  return out;
}

export function wikiSection(wikitext: string, template: string): string[] {
  const re = new RegExp('\\{\\{' + template + '\\}\\}([\\s\\S]*?)(?=\\n\\{\\{[A-Za-zÄÖÜ]|\\n==|$)');
  const m = String(wikitext || '').match(re);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^:?\s*(\[[\d.,\s–-]*\])?\s*/, '').trim())
    .map(cleanWikiMarkup)
    .filter((s) => s && s.length > 1);
}

export function parseWiktionary(wikitext: string) {
  const wt = String(wikitext || '');
  const ipaM = wt.match(/\{\{Lautschrift\|([^}|]+)\}\}/);
  const posM = wt.match(/\{\{Wortart\|([^}|]+)\|/);
  return {
    ipa: ipaM ? ipaM[1].trim() : '',
    pos: posM ? mapPos(posM[1].trim()) : '',
    definitions: wikiSection(wt, 'Bedeutungen'),
    synonyms: splitList(wikiSection(wt, 'Synonyme')),
    antonyms: splitList(wikiSection(wt, 'Gegenwörter')),
    collocations: splitCollocations(wikiSection(wt, 'Charakteristische Wortkombinationen')),
    examples: wikiSection(wt, 'Beispiele')
  };
}

export function termOf(front: string): string {
  return String(front || '').replace(/^(der|die|das)\s+/i, '').trim();
}

export async function enrichTerm(front: string, hasTranslation: boolean): Promise<Enriched> {
  const out: Enriched = {};
  const term = termOf(front);
  try {
    const r = await fetch(`${WIKT}?action=parse&page=${encodeURIComponent(term)}&prop=wikitext&format=json&origin=*`);
    if (r.ok) {
      const d: any = await r.json();
      const wt = d?.parse?.wikitext?.['*'];
      if (wt) {
        const p = parseWiktionary(wt);
        if (p.ipa) out.ipa = p.ipa;
        if (p.pos) out.pos = p.pos;
        if (p.definitions[0]) out.definition = p.definitions[0];
        if (p.synonyms.length) out.synonyms = p.synonyms.slice(0, 6);
        if (p.antonyms.length) out.antonyms = p.antonyms.slice(0, 6);
        if (p.collocations.length) out.collocations = p.collocations.slice(0, 6);
        if (p.examples[0]) out.example = p.examples[0];
      }
    }
  } catch { /* offline / 404 — keep what we have */ }
  if (!hasTranslation) {
    try {
      const r = await fetch(`${MYMEM}?q=${encodeURIComponent(term)}&langpair=de|en`);
      if (r.ok) {
        const d: any = await r.json();
        const t = d?.responseData?.translatedText;
        if (t && !/MYMEMORY WARNING|QUERY LENGTH|INVALID/i.test(t)) out.translation = t;
      }
    } catch { /* ignore */ }
  }
  return out;
}
