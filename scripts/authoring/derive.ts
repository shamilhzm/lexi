// The facts a dictionary does not have to state, because German states them.
//
// `verify.ts` refuses a card whose facts de.wiktionary cannot confirm, and that is
// the right default: a gender is not an opinion and must never be generated. But a
// **missing page is not a missing word.** `die Arbeitsatmosphäre` is ordinary German
// that no dictionary lists, because no dictionary lists every compound a language
// can form. Measured over the 65 pages de.wiktionary lacks
// (`npm run corpus:second-authority`), 36 of them — 55% — are settled by two rules
// that this app already *teaches*:
//
//   **the suffix rule.** Every noun in `-ung`, `-heit`, `-keit`, `-schaft`, `-ität`
//   is feminine, with no exceptions to find. Lexi teaches it in A2's
//   `Wortbildung: Nomen & Diminutiv`; Schritte plus Neu 6 prints it as a TIPP on
//   LWS 53.
//
//   **the compound rule.** A compound takes the gender of its last noun. Lexi
//   teaches it in B1's `Wortbildung: Komposita (Nomen)`. Measured across the
//   corpus it holds for **741 of 746** nouns that decompose into a head and a
//   modifier both already carded, and four of the five misses are bad splits
//   rather than real exceptions.
//
// So this is not a relaxation of the gate. It is the gate consulting a second
// authority that happens to be a rule rather than a book — and one whose accuracy
// is measured, re-derivable, and printed beside every fact it supplies.
//
// ## What it deliberately will not do
//
// **It never supplies a plural from the suffix rule.** `-ung` fixes the gender and
// says nothing about whether the noun *has* a plural a learner should meet, which
// is a question about meaning. Getting this wrong is how `die Anzahlen` and
// `die Gebäcke` reached the corpus, and how a guard once refused 111 correct
// plurals for the same suffix — both are in LESSONS.
//
// **It never overrides the dictionary.** A derivation only fills a fact nothing
// attests. Where wiktionary and the rule disagree, `verify.ts` still rejects: two
// sources contradicting each other is a reason to stop, not to hold a vote.
//
// **It refuses a split it cannot spell.** The modifier and the head must both be
// words the corpus already holds, and concatenated they must spell the headword
// exactly. Head-only matching "decomposes" `Morgen` into `Gen` and `Distanz` into
// `Tanz`, and reports a confident 95% built on words that are not compounds.
import type { Word } from '../../src/types.ts';

export interface Derivation {
  gender: 'der' | 'die' | 'das';
  /** Only ever from a compound head, never from a suffix. `null` = say nothing. */
  plural: string | null;
  /** The constituents, for `compose-ipa` and for the report. `null` for a suffix. */
  parts: string[] | null;
  /** The linking element between them, spelled — `s` in Arbeit+s+atmosphäre. It is
   *  part of the word and therefore part of its transcription, and it belongs to
   *  neither constituent's own dictionary entry. */
  fugen: string;
  /** Printed beside the fact, so a rule-derived gender never reads as an attested one. */
  why: string;
}

/** Suffixes whose gender has no exceptions in standard German. Kept short on
 *  purpose: a suffix belongs here only if I cannot find a counter-example, because
 *  the whole value of the rule is that it does not need a lookup. */
const SUFFIX_GENDER: Record<string, 'der' | 'die' | 'das'> = {
  ung: 'die', heit: 'die', keit: 'die', schaft: 'die', ität: 'die', ion: 'die',
  ismus: 'der', ling: 'der',
  chen: 'das', lein: 'das', tum: 'das',
};

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Linking elements, longest first so `-es` is tried before `-s`. */
const FUGEN = ['es', 'en', 'er', 's', 'n', ''];

export interface Index {
  /** lowercased headword → the card, for compound heads. */
  heads: Map<string, Word>;
  /** every lowercased word the corpus knows, plus verb stems (Brat-, Weiß-). */
  mods: Set<string>;
}

export function buildIndex(corpus: Word[]): Index {
  const heads = new Map<string, Word>();
  const mods = new Set<string>();
  for (const w of corpus) {
    if (w.kind !== 'word') continue;
    const t = stripArticle(w.term).toLowerCase();
    if (t.includes(' ') || t.length < 3) continue;
    if (w.pos === 'noun' && w.gender && !heads.has(t)) heads.set(t, w);
    mods.add(t);
    // `braten` + `Wurst` → `Bratwurst`: the modifier is the stem, not the infinitive.
    if (w.pos === 'verb') {
      for (const s of ['en', 'n']) {
        if (t.endsWith(s) && t.length - s.length >= 3) mods.add(t.slice(0, -s.length));
      }
    }
  }
  return { heads, mods };
}

/** Longest head that leaves a modifier the corpus also knows. */
export function splitCompound(term: string, ix: Index): { head: Word; modifier: string; fugen: string } | null {
  const w = stripArticle(term);
  if (w.includes(' ') || w.includes('-')) return null;
  const lw = w.toLowerCase();
  // A head of at least 3 characters, leaving a modifier of at least 3.
  for (let L = w.length - 3; L > 2; L--) {
    const head = ix.heads.get(lw.slice(-L));
    if (!head || stripArticle(head.term).toLowerCase() === lw) continue;
    const mod = lw.slice(0, -L);
    for (const f of FUGEN) {
      if (f && !mod.endsWith(f)) continue;
      const base = f ? mod.slice(0, -f.length) : mod;
      if (base.length >= 3 && ix.mods.has(base)) return { head, modifier: base, fugen: f };
    }
  }
  return null;
}

const suffixGenderOf = (term: string): { gender: 'der' | 'die' | 'das'; suffix: string } | null => {
  const lw = stripArticle(term).toLowerCase();
  const s = Object.keys(SUFFIX_GENDER).sort((a, b) => b.length - a.length).find((k) => lw.endsWith(k));
  return s ? { gender: SUFFIX_GENDER[s], suffix: s } : null;
};

/** The compound's plural is the head's, with the modifier in front.
 *
 *  Mechanical and safe, because German pluralises the *head*: `der Schrank` →
 *  `die Schränke` gives `der Einbauschrank` → `die Einbauschränke`, umlaut and all.
 *  The head's own absences travel too — a head marked `nur Singular` makes the
 *  compound `nur Singular`, which is the right answer and not a guess. */
function transferPlural(term: string, head: Word, ): string | null {
  const pl = head.plural;
  if (!pl) return null;
  if (!pl.startsWith('die ')) return pl;              // "nur Singular", "—"
  const w = stripArticle(term);
  const prefix = w.slice(0, w.length - stripArticle(head.term).length);
  if (!prefix) return null;
  return `die ${prefix}${lowerFirst(stripArticle(pl))}`;
}

/** Derive what German itself determines. `null` when no rule applies, or when two
 *  rules disagree — a disagreement is a reason to ask a human, not to pick one. */
export function deriveNoun(term: string, ix: Index): Derivation | null {
  const compound = splitCompound(term, ix);
  const suffix = suffixGenderOf(term);

  if (compound && suffix && compound.head.gender !== suffix.gender) return null;

  if (compound) {
    const head = compound.head;
    return {
      gender: head.gender as 'der' | 'die' | 'das',
      plural: transferPlural(term, head),
      parts: [
        compound.modifier.charAt(0).toUpperCase() + compound.modifier.slice(1),
        stripArticle(head.term),
      ],
      fugen: compound.fugen,
      why: `compound: ${compound.modifier}${compound.fugen ? '+' + compound.fugen : ''} + ${head.term}`,
    };
  }
  if (suffix) {
    // No plural, deliberately: the suffix fixes the gender and says nothing about
    // whether this noun has a plural a learner should meet.
    return { gender: suffix.gender, plural: null, parts: null, fugen: '', why: `suffix rule: -${suffix.suffix} is always ${suffix.gender}` };
  }
  return null;
}

/** One primary stress, on the first constituent; secondary on the rest.
 *
 *  Lived in `compose-ipa.ts` until 2026-08-29, and moved here when `verify.ts`
 *  needed it: `compose-ipa` imports `wikitext` *from* verify, so verify importing
 *  back would have closed a cycle. The rule is unchanged and its test still runs
 *  against the re-export.
 *
 *  Read off Lexi's own transcriptions rather than a phonology textbook:
 *  ˈkʁaŋkn̩ˌhaʊ̯s · ˈfluːkˌhaːfn̩ · ˈʁaʊ̯sˌkɔmən · ˈʊnˌklaːɐ̯ — primary stress on the
 *  first constituent, secondary on the next, any stress *inside* a constituent
 *  demoted. `Einbau` is ˈaɪ̯nˌbaʊ̯ alone and contributes ˈaɪ̯nbaʊ̯ to `Einbauschrank`:
 *  a compound has one primary stress, not two. */
export function compose(parts: string[]): string {
  return parts.map((raw, i) => {
    const s = raw.replace(/ˌ/g, '');
    if (i === 0) return /ˈ/.test(s) ? s : `ˈ${s}`;
    const demoted = s.replace(/ˈ/g, 'ˌ');
    return /ˌ/.test(demoted) ? demoted : `ˌ${demoted}`;
  }).join('');
}

/** What a linking element sounds like.
 *
 *  Caught by looking at the output: `compose` concatenates the constituents'
 *  transcriptions, and the Fugen-s belongs to neither of them, so
 *  `Arbeit`+`Atmosphäre` produced /ˈaʁbaɪ̯tatmoˌsfɛːʁə/ for a word that is spelled
 *  and said with an s. The six existing compositions had no linking element, so
 *  nothing had ever exercised this. */
export function fugenIpa(fugen: string): string {
  return ({ s: 's', es: 'əs', n: 'n', en: 'ən', er: 'ɐ' } as Record<string, string>)[fugen] ?? '';
}
