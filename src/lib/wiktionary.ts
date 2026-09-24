// de.wiktionary, read at runtime — for one question the offline lexicon cannot
// answer cheaply: which capitalised words in an article are *names*.
//
// `lib/lexicon.ts` answers "what does this word mean" offline, from 93,000
// Wiktionary entries shipped as shards. Classifying fifty capitalised tokens in a
// news article against it would fetch dozens of shards; one batched categories
// query to de.wiktionary answers all fifty in a single request, and the answer is
// cached per token forever. No learner data is sent — a headword is not personal —
// and the API is open to any origin.
//
// A name leaves the comprehension meter's denominator: *Klopp* is not a German
// word the learner failed to know. The direction of error matters more than the
// rate — see `missingLooksLikeName`.
import { idbGet, idbSet } from './idb.ts';

/** Parts of speech that mark a proper name rather than vocabulary. */
const NAME_POS = new Set(['Vorname', 'Nachname', 'Toponym', 'Eigenname', 'Familienname', 'Ortsname']);

export type TokenKind = 'name' | 'form' | 'lemma' | 'missing';

/** Classify a page from its de.wiktionary categories (the batched query returns
 *  categories, not wikitext). */
export function kindFromCategories(cats: string[], missing: boolean): TokenKind {
  if (missing) return 'missing';
  const de = cats.filter((c) => c.endsWith('(Deutsch)')).map((c) => c.replace(/^Kategorie:/, '').replace(/\s*\(Deutsch\)$/, ''));
  // A common noun always carries a *gendered* category — `Substantiv f (Deutsch)`.
  // Surnames often carry a bare `Substantiv (Deutsch)` too (*Wadephul*, *Trump*),
  // so the bare one is not evidence of vocabulary.
  const vocab = de.some((c) => /^(Substantiv [mfn]\b|Verb|Adjektiv|Adverb|Deklinierte Form|Konjugierte Form)/.test(c));
  const name = de.some((c) => NAME_POS.has(c));
  if (name && !vocab) return 'name';
  if (de.some((c) => /^(Deklinierte|Konjugierte) Form/.test(c))) return 'form';
  return de.length ? 'lemma' : 'missing';
}

const DE_API = 'https://de.wiktionary.org/w/api.php';
const CACHE_PREFIX = 'wikt:v1:kind:';

/** Which of these capitalised tokens are names? One request per 50 titles,
 *  cached per token. A token absent from de.wiktionary is reported as `missing`
 *  — the caller decides what that means. Offline, it classifies nothing, and the
 *  meter simply stays conservative. */
export async function classifyTokens(tokens: string[]): Promise<Map<string, TokenKind>> {
  const out = new Map<string, TokenKind>();
  const todo: string[] = [];
  for (const t of [...new Set(tokens)]) {
    try {
      const hit = await idbGet<TokenKind>(CACHE_PREFIX + t);
      if (hit) { out.set(t, hit); continue; }
    } catch { /* fall through to fetch */ }
    todo.push(t);
  }
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const url = `${DE_API}?action=query&prop=categories&cllimit=max&format=json&formatversion=2&origin=*`
      + `&titles=${encodeURIComponent(batch.join('|'))}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = await res.json() as {
        query?: { pages?: { title: string; missing?: boolean; categories?: { title: string }[] }[]; normalized?: { from: string; to: string }[] };
      };
      // The API normalises titles (first letter upper-cased); map back.
      const back = new Map((j.query?.normalized ?? []).map((n) => [n.to, n.from]));
      for (const p of j.query?.pages ?? []) {
        const kind = kindFromCategories((p.categories ?? []).map((c) => c.title), !!p.missing);
        const key = back.get(p.title) ?? p.title;
        out.set(key, kind);
        try { await idbSet(CACHE_PREFIX + key, kind); } catch { /* quota */ }
      }
    } catch { /* offline */ }
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
