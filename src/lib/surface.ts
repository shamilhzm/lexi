// The surface index — "which card is this word on the page?"
//
// The opposite lookup from the rest of the app: not "what forms does this card
// have" but "which card does this token belong to". German inflects heavily, so
// a bare headword index would miss most of a real sentence — `ging` is `gehen`,
// `Bücher` is `das Buch`.
//
// The index is built from the forms the app can derive with certainty: every
// headword, every stored plural, and for every conjugable verb its full
// paradigm. Adjective declension is deliberately absent here — the app has no
// reliable generator for it, and a guessed form would attach the wrong card to a
// word. `appMatcher` is the fallback that does generate those, so the two are
// layered rather than duplicated.
//
// Two consumers, both about correctness rather than presentation: the typed-drill
// typo guard (a real German word is never forgiven as a slipped finger) and the
// text-coverage meter.
//
// *Was `lib/reader.ts` until the 2026-09-05 refocus, where it also held
// `pickReadable` — the i+1 sentence picker for the reading list that went with
// the Read room. What is left is the index, which is not about reading at all.*

import { WORDS } from '../data/index.ts';
import { conjugate, canConjugate } from './conjugate.ts';
import { pluralForm } from './matcher.ts';
import { appMatcher } from './appMatcher.ts';
import type { Word } from '../types.ts';

const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '').trim();

/** Word-ish runs, keeping punctuation as separators so a sentence can be
 *  reassembled exactly as written. German letters count as letters — see the
 *  `\b` note in views/drills.tsx for why this can't use \w. */
export function tokenize(sentence: string): { text: string; isWord: boolean }[] {
  return sentence.split(/([\p{L}\p{N}­-]+)/u)
    .filter((s) => s !== '')
    .map((text) => ({ text, isWord: /[\p{L}\p{N}]/u.test(text) }));
}

// ---- the surface index ----------------------------------------------------
// Reading needs the opposite lookup from the rest of the app: not "what forms does
// this card have" but "which card is this word on the page". German inflects
// heavily, so a bare term index would miss most of a real sentence — `ging` is
// `gehen`, `Bücher` is `das Buch`.
//
// So the index is built from the forms the app can already derive with certainty:
// every headword, every stored plural, and for every conjugable verb its full
// paradigm. Adjective declension is deliberately absent — the app has no reliable
// generator for it, and a guessed form would attach the wrong card to a word.
let exact: Map<string, Word> | null = null;
let lower: Map<string, Word> | null = null;

// What the maps above were built from. The lexicon is not fixed at boot: `initData`
// replaces `WORDS` wholesale, and `registerWords` appends to it whenever a learner
// imports a class pack or mines a word. A build-once index would go stale silently —
// the new words stay invisible until a full page reload — and the alternative,
// making every writer remember to invalidate it, is a rule that holds until the
// next writer. So the cache carries its own provenance and rebuilds itself.
let builtFrom: Word[] | null = null;
let builtLen = 0;
const stale = () => !exact || builtFrom !== WORDS || builtLen !== WORDS.length;

function build(): void {
  const e = new Map<string, Word>(), l = new Map<string, Word>();
  // First writer wins: WORDS is level-ordered, so A1 claims the common forms and a
  // rarer homograph can't steal `sie` or `war` from the word a learner means.
  const put = (surface: string, w: Word) => {
    const s = surface.trim();
    if (!s) return;
    if (!e.has(s)) e.set(s, w);
    const k = s.toLowerCase();
    if (!l.has(k)) l.set(k, w);
  };
  for (const w of WORDS) {
    if (w.kind !== 'word') continue;
    put(stripArticle(w.term), w);
    // `pluralForm`, not the raw field. The corpus writes plurals six ways and this
    // used to index whatever the field said: a card reading `¨-e` contributed the
    // literal surface form `"¨-e"` and `Vorschläge` was never indexed at all — 390
    // cards affected. `matcher.ts` had the same bug and was fixed first, which is
    // precisely how two indexes end up disagreeing about what "known" means.
    // Both expand through one function now.
    const pl = pluralForm(w.term, w.plural);
    if (pl) put(pl, w);
    if (w.pos === 'verb' && canConjugate(w.term)) {
      const c = conjugate(w.term);
      put(c.infinitive, w);
      put(c.partizip, w);
      for (const tense of [c.praesens, c.praeteritum] as const) for (const f of tense) put(f, w);
      // Perfekt/Futur/Konjunktiv are auxiliary + a form already indexed above, so
      // indexing the phrase would only add multi-word keys a token can never match.
    }
  }
  exact = e; lower = l; builtFrom = WORDS; builtLen = WORDS.length;
}

/** All surface forms, lowercased. Exposed for inspection and tests. */
export function surfaceIndex(): Map<string, Word> {
  if (stale()) build();
  return lower!;
}

/** The card a token on the page belongs to.
 *
 *  Case is checked before the lowercase fallback, because German capitalises nouns
 *  and that is free disambiguation the index would otherwise throw away: without
 *  it `Essen` resolves to the verb `essen`, `Reisen` to the noun `die Reise`, and
 *  a reader would be told the new word in "Das Essen ist gut" is a verb. */
export function lookupSurface(token: string): Word | null {
  if (stale()) build();
  // The maps above answer first, and that ordering is the whole design: they carry
  // the case disambiguation the matcher does not have, so `Essen` stays the noun
  // and `Morgen` stays the morning. Measured over one example per card, the two
  // indexes disagree on 520 of 32,713 tokens and the reader is right about the
  // capitalised ones.
  //
  // The matcher then catches what the maps miss — **2,076 tokens, 6.3%** — because
  // it generates adjective declension, dative plurals and `-in` feminines that this
  // index never did: `große`, `Hunden` and `Lehrerin` were all reported to the
  // learner as words they do not know. Fallback rather than replacement, so nothing
  // that resolves today can start resolving differently.
  const hit = exact!.get(token) ?? lower!.get(token.toLowerCase());
  if (hit) return hit;
  return appMatcher().annotate(token).find((s) => s.isWord)?.word ?? null;
}

/** Force the next lookup to rebuild. Only tests need this — production growth of
 *  the lexicon is picked up by `stale()` — but a test can swap the lexicon for one
 *  of the same length, which identity alone would miss. */
export function resetSurfaceIndex() { exact = null; lower = null; builtFrom = null; builtLen = 0; }
