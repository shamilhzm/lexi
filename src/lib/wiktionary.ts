// Wiktionary, read at runtime — facts for the words Lexi does not carry.
//
// ## Why this exists
//
// Measured 2026-09-24: of the content words in 25 Tagesschau articles, **23% are
// not in the corpus at all** — not names only, but `der Fall`, `der Dienst`,
// `das Konzept`, `lauten`, `sogenannt`. The corpus was built from course-book word
// lists, which is everyday German; the news is a different register. A learner
// reading real text will tap those words, and "Lexi doesn't know this one" is the
// answer that makes them close the app.
//
// Growing the corpus to cover the news is the content-volume race VISION refuses.
// Looking the word up is not: the long tail is exactly what a dictionary is for.
//
// ## The rule it keeps
//
// VISION §5: *facts are looked up, never written*. The authoring gate already
// reads de.wiktionary for gender, plural, part of speech and IPA — this is that
// same parser (moved here from `scripts/authoring/verify.ts`, which now imports
// it, so the gate and the app cannot disagree about what a page says). The
// English gloss comes from en.wiktionary. Nothing in a looked-up card is
// generated; the example sentence is the sentence the learner actually met.
//
// ## What goes over the wire
//
// A single word per tap, and — for an article being read — a batched "which of
// these capitalised words are names?" query. Both are public Wikimedia APIs with
// CORS open to any origin. No learner data is sent: a headword is not personal.
// Responses are cached in IndexedDB forever, because a dictionary entry does not
// change on the timescale of a learner.
import { idbGet, idbSet } from './idb.ts';

// ---- the de.wiktionary parser (shared with the authoring gate) --------------

const GENUS: Record<string, 'der' | 'die' | 'das'> = { m: 'der', f: 'die', n: 'das' };

export interface Facts {
  /** *All* genders the page attests, not the first one found.
   *
   *  German has real gender pairs — `das Schild` (a sign) beside `der Schild`
   *  (a shield), `das Alter` (age) beside `der Alter` (colloquial old man),
   *  `der Teil` (a portion) beside `das Teil` (a component). Reading only the
   *  first `Genus=` on the page rejected all three of those as contradicting the
   *  dictionary when they do nothing of the kind. A candidate is contradicted
   *  only when its gender is attested nowhere. */
  genders: Set<'der' | 'die' | 'das'>;
  plurals: string[];
  ipa: string | null;
  /** Which German parts of speech the page attests. */
  pos: Set<string>;
}

/** The German section of a de.wiktionary page. Other languages use the same
 *  templates and would otherwise donate an English noun's gender to a German card. */
export function germanSection(wt: string): string {
  return wt.split(/^==\s*[^=]+\s*\(\{\{Sprache\|/m).find((s) => s.startsWith('Deutsch}}')) ?? wt;
}

/** Pull the facts out of the German section's structured templates. Deliberately
 *  narrow: only the fields that are unambiguous in the markup are read, because a
 *  half-parsed dictionary is worse than no dictionary. */
export function parseFacts(wt: string): Facts {
  const de = germanSection(wt);

  const genders = new Set<'der' | 'die' | 'das'>();
  for (const m of de.matchAll(/\|\s*Genus(?:\s*\d*)?\s*=\s*([mfn])\b/g)) genders.add(GENUS[m[1]]);

  const plurals: string[] = [];
  for (const m of de.matchAll(/\|\s*Nominativ Plural(?:\s*\d+)?\s*=\s*([^\n|}]+)/g)) {
    const pl = m[1].trim();
    if (pl && pl !== '—' && pl !== '-' && !plurals.includes(pl)) plurals.push(pl);
  }

  const ipa = de.match(/\{\{Lautschrift\|([^}|]+)\}\}/);

  const pos = new Set<string>();
  for (const m of de.matchAll(/\{\{Wortart\|([^|}]+)\|Deutsch\}\}/g)) pos.add(m[1].trim());

  return { genders, plurals, ipa: ipa?.[1]?.trim() || null, pos };
}

/** de.wiktionary's part-of-speech names → the corpus vocabulary. */
export const POS_MAP: Record<string, string> = {
  Substantiv: 'noun', Verb: 'verb', Adjektiv: 'adjective', Adverb: 'adverb',
  Pronomen: 'pronoun', Präposition: 'preposition', Konjunktion: 'conjunction',
  // de.wiktionary's category is *Numerale*; the corpus has always written `number`
  // (17 cards, `null` through `zwölf`). The map said 'numeral', which matches no
  // card and no `ALLOWED_POS` entry, so the gate could not author a single
  // numeral — caught trying to add `tausend`, which the corpus is missing.
  Numerale: 'number', Zahlwort: 'number', Interjektion: 'interjection', Partikel: 'particle',
  Subjunktion: 'conjunction', Artikel: 'article',
};

/** Parts of speech that mark a proper name rather than vocabulary. */
const NAME_POS = new Set(['Vorname', 'Nachname', 'Toponym', 'Eigenname', 'Familienname']);

/** The lemma an inflected-form page points at — `Konzepte` → `Konzept`,
 *  `lautet` → `lauten`. `null` when the page is itself a lemma. */
export function baseFormOf(wt: string): string | null {
  const de = germanSection(wt);
  const ref = de.match(/\{\{Grundformverweis[^|}]*\|([^}|]+)/);
  if (ref) return ref[1].trim();
  // Older pages carry only the prose line: "* Nominativ Plural des Substantivs '''[[Konzept]]'''".
  if (/\{\{Wortart\|(Deklinierte|Konjugierte) Form\|Deutsch\}\}/.test(de)) {
    const m = de.match(/'''\[\[([^\]|]+)(?:\|[^\]]*)?\]\]'''/);
    if (m) return m[1].trim();
  }
  return null;
}

/** Is this page's German entry a name and nothing else? A page that is both
 *  (*Koch* is a surname *and* a cook) is not treated as a name: the learner may
 *  be looking at the common noun. */
export function isNameOnly(wt: string): boolean {
  const pos = parseFacts(wt).pos;
  if (!pos.size) return false;
  return [...pos].every((p) => NAME_POS.has(p));
}

/** Classify a page from its de.wiktionary categories (the batched query returns
 *  categories, not wikitext). */
export type TokenKind = 'name' | 'form' | 'lemma' | 'missing';
export function kindFromCategories(cats: string[], missing: boolean): TokenKind {
  if (missing) return 'missing';
  const de = cats.filter((c) => c.endsWith('(Deutsch)')).map((c) => c.replace(/^Kategorie:/, '').replace(/\s*\(Deutsch\)$/, ''));
  // A common noun always carries a *gendered* category — `Substantiv f (Deutsch)`.
  // Surnames often carry a bare `Substantiv (Deutsch)` too (*Wadephul*, *Trump*),
  // so the bare one is not evidence of vocabulary.
  const vocab = de.some((c) => /^(Substantiv [mfn]\b|Verb|Adjektiv|Adverb|Deklinierte Form|Konjugierte Form)/.test(c));
  const name = de.some((c) => NAME_POS.has(c) || c === 'Ortsname');
  if (name && !vocab) return 'name';
  if (de.some((c) => /^(Deklinierte|Konjugierte) Form/.test(c))) return 'form';
  return de.length ? 'lemma' : 'missing';
}

// ---- the en.wiktionary gloss ----------------------------------------------

export interface EnSense {
  pos: string;          // "Noun", "Verb", …
  defs: string[];       // plain-text definitions, best first
  /** Set when every definition on the page is "inflection of X". */
  formOf: string | null;
}

/** Strip the REST API's HTML to readable text. Regex, not DOMParser, so it runs in
 *  the node test environment and in a worker alike; the markup is machine-made and
 *  regular enough. */
export function stripHtml(html: string): string {
  return html
    .replace(/<ol[\s\S]*?<\/ol>/g, '')            // nested usage lists and examples
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*$/, '')
    .trim();
}

/** German senses from an en.wiktionary `page/definition` response. */
export function parseEnDefinitions(json: unknown): EnSense[] {
  const de = (json as { de?: { partOfSpeech: string; definitions: { definition: string }[] }[] } | null)?.de;
  if (!Array.isArray(de)) return [];
  return de.map((entry) => {
    const raw = (entry.definitions ?? []).map((d) => d.definition ?? '');
    let formOf: string | null = null;
    const defs: string[] = [];
    for (const html of raw) {
      if (/form-of-definition/.test(html)) {
        const link = html.match(/form-of-definition-link[\s\S]*?title="([^"]+)"/);
        if (link && !formOf) formOf = link[1];
        continue;
      }
      const t = stripHtml(html);
      if (t) defs.push(t);
    }
    return { pos: entry.partOfSpeech, defs: defs.slice(0, 4), formOf: defs.length ? null : formOf };
  }).filter((s) => s.defs.length || s.formOf);
}

// ---- runtime lookups --------------------------------------------------------

export interface Lookup {
  /** The surface form the learner tapped. */
  surface: string;
  /** The dictionary headword it belongs to. */
  lemma: string;
  /** Corpus part of speech, or the raw de.wiktionary one when unmapped. */
  pos: string | null;
  gender: 'der' | 'die' | 'das' | null;
  plural: string | null;
  ipa: string | null;
  /** English, from en.wiktionary. Empty when en.wiktionary has no German entry. */
  glosses: string[];
  /** A proper name — excluded from the meter, never offered as a card. */
  isName: boolean;
}

const DE_API = 'https://de.wiktionary.org/w/api.php';
const EN_REST = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
const CACHE_PREFIX = 'wikt:v1:';
const MISSING = '\u0000missing';

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await idbGet<T>(CACHE_PREFIX + key);
    if (hit !== undefined) return hit;
  } catch { /* no IDB — just fetch */ }
  const v = await load();
  try { await idbSet(CACHE_PREFIX + key, v); } catch { /* quota — fine */ }
  return v;
}

/** de.wiktionary wikitext, or `null` when the page does not exist. Throws on a
 *  network failure so that a hiccup is never cached as "no such word" — the same
 *  distinction `verify.ts` learned the hard way. */
async function deWikitext(page: string): Promise<string | null> {
  const v = await cached<string>(`de:${page}`, async () => {
    const url = `${DE_API}?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=${encodeURIComponent(page)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`de.wiktionary ${res.status}`);
    const j = await res.json() as { parse?: { wikitext?: string }; error?: { code?: string } };
    if (j.parse?.wikitext) return j.parse.wikitext;
    if (j.error?.code === 'missingtitle') return MISSING;
    throw new Error('de.wiktionary: unexpected response');
  });
  return v === MISSING ? null : v;
}

async function enSenses(page: string): Promise<EnSense[]> {
  return cached<EnSense[]>(`en:${page}`, async () => {
    const res = await fetch(EN_REST + encodeURIComponent(page));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`en.wiktionary ${res.status}`);
    return parseEnDefinitions(await res.json());
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Everything the dictionary can say about a surface form, following an
 *  inflected form to its lemma. `null` when neither Wiktionary has it. */
export async function lookupWord(surface: string): Promise<Lookup | null> {
  // A sentence-initial token is capitalised whatever its class, and a noun is
  // capitalised always — so try the form as written first, then its twin.
  const tries = [surface, surface === cap(surface) ? low(surface) : cap(surface)];
  let page: string | null = null, wt: string | null = null;
  for (const t of tries) {
    wt = await deWikitext(t);
    if (wt && /\{\{Sprache\|Deutsch\}\}/.test(wt)) { page = t; break; }
    wt = null;
  }
  if (!page || !wt) {
    // de.wiktionary does not know it; en.wiktionary sometimes does (recent loans).
    const en = await enSenses(surface);
    if (!en.length) return null;
    const lemma = en.find((s) => s.formOf)?.formOf ?? surface;
    const senses = lemma === surface ? en : await enSenses(lemma);
    return {
      surface, lemma, pos: senses[0]?.pos.toLowerCase() ?? null, gender: null, plural: null, ipa: null,
      glosses: senses.flatMap((s) => s.defs).slice(0, 4), isName: false,
    };
  }

  const base = baseFormOf(wt);
  const lemma = base ?? page;
  const lemmaWt = base ? (await deWikitext(base)) ?? wt : wt;
  const facts = parseFacts(lemmaWt);
  const rawPos = [...facts.pos].find((p) => POS_MAP[p]) ?? [...facts.pos][0] ?? null;
  const pos = rawPos ? (POS_MAP[rawPos] ?? rawPos.toLowerCase()) : null;
  const isName = isNameOnly(lemmaWt);

  let glosses: string[] = [];
  try {
    const senses = await enSenses(lemma);
    // Prefer the sense whose part of speech matches the German page's.
    const want = pos === 'noun' ? 'Noun' : pos === 'verb' ? 'Verb' : pos === 'adjective' ? 'Adjective' : null;
    const ordered = want ? [...senses.filter((s) => s.pos === want), ...senses.filter((s) => s.pos !== want)] : senses;
    glosses = ordered.flatMap((s) => s.defs).slice(0, 4);
  } catch { /* a gloss is a nice-to-have; the facts still stand */ }

  const gender = pos === 'noun' && facts.genders.size === 1 ? [...facts.genders][0] : null;
  return {
    surface, lemma, pos, gender,
    plural: pos === 'noun' ? facts.plurals[0] ?? null : null,
    ipa: facts.ipa, glosses, isName,
  };
}

/** Which of these capitalised tokens are names? One request per 50 titles,
 *  cached per token. A token absent from de.wiktionary is reported as
 *  `missing` — the caller decides what that means (for a capitalised,
 *  unresolvable token in running news prose, it is almost always a surname). */
export async function classifyTokens(tokens: string[]): Promise<Map<string, TokenKind>> {
  const out = new Map<string, TokenKind>();
  const todo: string[] = [];
  for (const t of [...new Set(tokens)]) {
    try {
      const hit = await idbGet<TokenKind>(`${CACHE_PREFIX}kind:${t}`);
      if (hit) { out.set(t, hit); continue; }
    } catch { /* fall through to fetch */ }
    todo.push(t);
  }
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const url = `${DE_API}?action=query&prop=categories&cllimit=max&format=json&formatversion=2&origin=*`
      + `&titles=${encodeURIComponent(batch.join('|'))}`;
    let pages: { title: string; missing?: boolean; categories?: { title: string }[] }[] = [];
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = await res.json() as { query?: { pages?: typeof pages; normalized?: { from: string; to: string }[] } };
      pages = j.query?.pages ?? [];
      // The API normalises titles (first letter upper-cased); map back.
      const back = new Map((j.query?.normalized ?? []).map((n) => [n.to, n.from]));
      for (const p of pages) {
        const kind = kindFromCategories((p.categories ?? []).map((c) => c.title), !!p.missing);
        const key = back.get(p.title) ?? p.title;
        out.set(key, kind);
        try { await idbSet(`${CACHE_PREFIX}kind:${key}`, kind); } catch { /* quota */ }
      }
    } catch { /* offline — classify nothing, the meter just stays conservative */ }
  }
  return out;
}

/** A capitalised token de.wiktionary has no page for, met mid-sentence in news
 *  prose, is nearly always a surname or a place — *Klopp*, *Kaepernick*. But a
 *  long compound, or a noun built with a productive suffix, is vocabulary the
 *  dictionary happens to lack, and must stay counted. This errs toward counting:
 *  a missed name costs the learner a point of coverage, a noun passed off as a
 *  name would flatter them, and the meter's claim is that it does not flatter. */
export function missingLooksLikeName(tok: string, isKnownWord?: (s: string) => boolean): boolean {
  if (tok.length > 14 || tok.length < 3 || tok.endsWith('-')) return false;
  if (/(ung|ungen|heit|keit|schaft|tion|tionen|ität|ismus|nis|nisse|tum|chen|lein|ling|ment|ik|ie|ien|ur|enz|anz|eur|ist|isten|ent|enten|ant|anten|er|ern|in|innen|e|en|um|s)$/.test(tok)) return false;
  // A compound the dictionary lacks — *Fachaufsicht*, *Reformagenda*,
  // *Dialogforum* — still contains a word the learner could know. Measured on 11
  // live articles (2026-09-24): eight of the first rule's "names" were these.
  if (isKnownWord) {
    const lc = tok.toLowerCase();
    for (let i = 3; i <= lc.length - 4; i++) {
      if (isKnownWord(lc.slice(i)) || (i >= 4 && isKnownWord(lc.slice(0, i)))) return false;
    }
  }
  return true;
}

/** A link to the full entry, for attribution and for the curious. */
export const wiktionaryUrl = (lemma: string) => `https://de.wiktionary.org/wiki/${encodeURIComponent(lemma)}`;
