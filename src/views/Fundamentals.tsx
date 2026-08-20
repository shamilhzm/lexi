// The generated word-drill engine — seven modes (der/die/das gender, noun
// plurals, verb conjugation via the conjugation engine, cloze from example
// sentences, sentence builder, tense transformation, Kasus), each generated on
// the fly from lexicon fields rather than authored. Every drilled unit gets its
// own FSRS card under a namespaced id, so drills schedule themselves without
// touching the vocabulary stats.
//
// This file is a library, not a destination: Grammar.tsx owns the page and
// routes here for its "Quick drills" strip, and Review.tsx imports the item
// components to interleave drills into mixed sessions.
//
// NOTE: the persisted card-id prefix stays `gym:` (see `id` below) — it’s a stable
// storage namespace, deliberately NOT renamed so existing schedules survive.
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ArrowLeft, Venus, Mars, CircleDot, Layers3, Cog, AlignLeft, Shuffle, Repeat, Braces, Split, RefreshCw, Ear, PenLine, Volume2, Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { cardOf, review, levels, logMiss, logAttempt, streak, statusOf, focusTense, type Status, type MissDetail } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue, Rating } from '../srs.ts';
import { haptic, tick } from '../lib/ui.ts';
import { speak } from '../lib/tts.ts';
import { conjugate, canConjugate, PRONOUN, type Person, type Conjugation } from '../lib/conjugate.ts';
import { OrderItem, TypeItem, hintText } from './GrammarDrill.tsx';
import { RevealBlock, Paradigm, useChoiceKeys, GenderTerm } from '../components/Reveal.tsx';
import type { RevealData } from '../lib/grammar.ts';
import WhyLink, { DrillHeader } from '../components/RulePanel.tsx';
import SessionRecap from '../components/SessionRecap.tsx';
import Surface from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import type { Word, Example } from '../types.ts';

export type Mode = 'gender' | 'plural' | 'conj' | 'cloze' | 'order' | 'transform' | 'case' | 'separable' | 'reflexive' | 'dictation' | 'recall';

/** How every drill item reports its result.
 *
 *  `detail` is the confusion — what the item asked for and what was picked —
 *  supplied by the multiple-choice items, which know both at the moment they
 *  grade and used to discard both. Optional because the typed items have nothing
 *  comparable to offer: a free-text answer is not a choice between named
 *  alternatives, and recording "wanted 'die Fakultät', chose 'fakultat'" would
 *  fill the confusion table with spellings rather than errors. */
export type Grade = (ok: boolean, detail?: MissDetail) => void;
const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '');
// Grading is umlaut-tolerant: fold ä/ö/ü/ß to their ASCII digraphs on both
// sides, so "schoen" == "schön" and "weiss" == "weiß".
const norm = (s: string) => s.trim().toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/\s+/g, ' ');

// ---- pools (lazy, level-filtered at use) ---------------------------------
function inLevels(w: Word) { return levels().has(w.level); }
const genderPool = () => WORDS.filter((w) => w.kind === 'word' && w.gender && inLevels(w));
const pluralPool = () => WORDS.filter((w) => w.kind === 'word' && w.plural && inLevels(w));
const conjPool = () => WORDS.filter((w) => w.pos === 'verb' && inLevels(w) && canConjugate(w.term));
const clozePool = () => WORDS.filter((w) => w.kind === 'word' && inLevels(w) && clozeExample(w));
const orderPool = () => WORDS.filter((w) => w.kind === 'word' && inLevels(w) && orderExample(w));
const transformPool = () => WORDS.filter((w) => w.pos === 'verb' && inLevels(w) && canTransform(w.term));
const casePool = () => WORDS.filter((w) => inLevels(w) && caseSafe(w));
const separablePool = () => WORDS.filter((w) => w.pos === 'verb' && inLevels(w) && isSeparable(w.term));
const reflexivePool = () => WORDS.filter((w) => w.pos === 'verb' && inLevels(w) && isReflexive(w.term));
const dictationPool = () => WORDS.filter((w) => w.kind === 'word' && inLevels(w) && drillExample(w, dictatable));
const recallPool = () => WORDS.filter((w) => inLevels(w) && recallSafe(w));

// ---- recall: the productive direction ------------------------------------
// Every other track in this app shows German and asks what it means. `known`
// therefore measures *recognition*, on every card, always — a learner can hold
// 2,000 known words and be unable to produce one of them (PEDAGOGY L2, finding
// #1). This mode is the other direction: the English gloss is the prompt and the
// German is the answer, typed, with the article for nouns because the article is
// most of what "knowing a German noun" means.
//
// It costs nothing architecturally: drills already schedule under
// `gym:<mode>:<wordId>` with their own FSRS card, which is precisely so that
// recognising a word and producing it can be scheduled apart. That split existed
// and had never been used for the thing it was built for.
//
// ## The gate, and why it is deliberately strict
//
// Reversing a gloss is not symmetrical with reading one. "die Sprache → language"
// is always fair; "language → ?" is only fair when exactly one German card
// answers it. Three ways it can be unfair, all excluded:
//
//   1. **The gloss is a list.** "station, depot, terminus" gives the learner no
//      way to know which word is wanted. (2,043 cards.)
//   2. **The gloss is transparent.** "hotel" → `das Hotel` tests nothing but
//      confidence. Same reasoning as `isTransparent` in the placement test.
//      (323 cards.)
//   3. **Two cards share the gloss.** `table` is *der Tisch* **and** *die
//      Tabelle*; `to eat` is *essen* and *fressen*. Asking for "table" and
//      marking *die Tabelle* wrong would be the one thing this codebase never
//      does — render a verdict that is itself wrong German. (529 cards.)
//
// What survives is 3,675 cards — A1 712 · A2 802 · B1 1,295 · B2 442 · C1 308 ·
// C2 116, of which 2,237 are nouns and so require the article — more than enough
// to drill, and spread across every level.
// Rule 1 is the blunt one: many list-glosses have a dominant first sense and
// could be admitted by taking it. That is left undone on purpose, because
// picking the dominant sense is a judgement a script cannot make, and the cost
// of being wrong is marking correct German incorrect.
const glossKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const GLOSS_IS_LIST = /[,;/]|\bor\b/;

/** Cards per gloss, used only to find collisions.
 *
 *  Keyed on `WORDS.length` rather than built once, because the lexicon grows at
 *  runtime: importing a class pack calls `registerWords`, and a cache built at
 *  boot would keep admitting a gloss that a newly-imported card has just made
 *  ambiguous. Rebuilding on a length change is cheap (one pass over ~6.5k rows,
 *  and only when the count actually moves) and cannot go stale, which is worth
 *  more here than the saved milliseconds — a stale entry's failure mode is
 *  marking correct German wrong. */
let glossIndex: Map<string, number> | null = null;
let glossIndexFor = -1;
function glossCount(g: string): number {
  if (!glossIndex || glossIndexFor !== WORDS.length) {
    glossIndex = new Map();
    for (const w of WORDS) {
      if (w.kind !== 'word' || !w.en) continue;
      const k = glossKey(w.en);
      glossIndex.set(k, (glossIndex.get(k) ?? 0) + 1);
    }
    glossIndexFor = WORDS.length;
  }
  return glossIndex.get(glossKey(g)) ?? 0;
}

/** Does this card's English gloss point back at exactly one German answer?
 *  Exported for the test that pins the three exclusions above. */
export function recallSafe(w: Word): boolean {
  if (w.kind !== 'word' || !w.en || !w.term) return false;
  if (GLOSS_IS_LIST.test(w.en)) return false;
  if (glossKey(stripArticle(w.term)) === glossKey(w.en)) return false; // transparent
  return glossCount(w.en) === 1;
}

/** Did the learner produce the right noun and the wrong article — or none?
 *
 *  Returns the lesson to show, or null when this isn't what happened. Graded
 *  wrong either way: in German the article is not an accessory to the noun, and a
 *  learner who says "Fakultät ist groß" has said something no native speaker
 *  would. But *wrong for a nameable reason* is a different message from "no", and
 *  the app already knows which one this is.
 *
 *  Exported for the test that pins the three shapes: bare noun, wrong article,
 *  and an actually-wrong word (which must return null so it is not excused). */
export function articleMiss(typed: string, w: Word): string | null {
  if (!w.gender) return null;
  const bare = norm(stripArticle(w.term));
  const t = norm(typed);
  if (t === bare) return `The word is right — German needs the article: ${w.term}.`;
  const m = /^(der|die|das)\s+(.*)$/.exec(t);
  if (m && m[2] === bare) return `Right word, wrong gender: it is ${w.term}, not „${typed.trim()}“.`;
  return null;
}

/** The hint ladder for a recall card.
 *
 *  Deliberately not `hintText`'s generic shape → first letter → first half. For a
 *  noun the most useful first rung is the **gender**: a learner who has the word
 *  but not the article has a different problem from one who has neither, and
 *  naming the gender first separates them. The article is never given away —
 *  "feminine" still requires knowing that feminine means *die*. */
export function recallHints(w: Word): string[] {
  const bare = stripArticle(w.term);
  const GENDER_WORD: Record<string, string> = { der: 'masculine', die: 'feminine', das: 'neuter' };
  const first = w.gender
    ? `${GENDER_WORD[w.gender]} · ${bare.length} letters`
    : `${w.pos || 'word'} · ${bare.length} letters`;
  return [first, `starts with “${bare[0]}”`, `“${bare.slice(0, Math.ceil(bare.length / 2))}…”`];
}

function escapeReg(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Match a German surface form as a whole word, with a boundary that understands
 *  German letters. Capture group 1 is the match, so callers can blank it.
 *
 *  JavaScript's `\b` is ASCII-only — `\w` is `[A-Za-z0-9_]`, so `ß`, `ä`, `ö`, `ü`
 *  and their capitals are *non-word* characters. `/\bgroß\b/` therefore cannot
 *  match "groß" at all: between `ß` and the following space there is no
 *  word→non-word transition, because neither side is a word character. The same
 *  failure hits any headword that *starts* with an umlaut (Übung, Öl).
 *
 *  Measured against the shipped corpus: 135 cards — including groß, Fuß, weiß,
 *  süß, Übung and Öl, i.e. some of the most common words an A1 learner meets —
 *  were silently ineligible for the cloze and sentence-builder drills, and the
 *  blanking regex could never have fired for them either. Unicode property escapes
 *  under the `u` flag give a boundary that actually holds. */
export function wholeWordRe(surface: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(${escapeReg(surface)})(?![\\p{L}\\p{N}])`, 'iu');
}

/** Which of a card's examples a drill should use.
 *
 *  The flip face always shows `ex[0]`, and an interleaved drill lands about three
 *  items after its word's flip — so a cloze or sentence-builder built on `ex[0]`
 *  was asking the learner to reconstruct a sentence they had just finished
 *  reading. That is a memory test wearing a syntax test's clothes.
 *
 *  So: prefer any later example that satisfies the drill's own constraint, and fall
 *  back to `ex[0]` only when there is nothing else. 91% of cards carry a second
 *  example, so most drills now show a sentence the learner has not just seen.
 *
 *  Used by both the eligibility check and the item itself, deliberately — if they
 *  chose differently a word could be declared drillable and then render nothing. */
export function drillExample(w: Word, ok: (de: string) => boolean): Example | null {
  const ex = w.ex ?? [];
  for (let i = 1; i < ex.length; i++) if (ex[i]?.de && ok(ex[i].de)) return ex[i];
  return ex[0]?.de && ok(ex[0].de) ? ex[0] : null;
}

// ---- production drills: shared pure helpers (exported for tests) ----------
/** Tiles for the sentence builder from an example sentence: terminal punctuation
 *  stripped, whitespace-split. Empty when the sentence is missing or its length
 *  is outside 4–10 tokens (too short = trivial, too long = unwieldy on a phone). */
export function orderTokens(sentence?: string): string[] {
  if (!sentence) return [];
  const t = sentence.trim().replace(/[.!?…]+$/, '').split(/\s+/).filter(Boolean);
  return t.length >= 4 && t.length <= 10 ? t : [];
}

/** Transform drills only render forms we can print verbatim: reliable, and
 *  neither separable (the prefix detaches in Präsens: "ich komme … an") nor
 *  reflexive (the finite form alone drops the pronoun’s "mich"). Grounded
 *  means never showing a sentence fragment that is actually wrong. */
export function canTransform(verb: string): boolean {
  const c = conjugate(verb);
  return c.reliable && !c.separable && !c.reflexive;
}

/** A verb whose prefix detaches, and which the engine can render confidently.
 *  The exact complement of what `canTransform` refuses on those grounds. */
export function isSeparable(verb: string): boolean {
  const c = conjugate(verb);
  return c.reliable && !!c.separable && !c.reflexive;
}

/** A reflexive verb — the other class `canTransform` refuses, and for the same
 *  reason: its bare finite form drops the pronoun the verb cannot do without. */
export function isReflexive(verb: string): boolean {
  const c = conjugate(verb);
  return c.reliable && c.reflexive && !c.separable;
}

// The reflexive pronouns, in PERSONS_I order. `conjugate` strips "sich" before
// conjugating, so the present tense comes back as a bare finite verb and the
// pronoun has to be put back — which is the whole point of the drill: an English
// speaker's error is leaving it out, not conjugating it wrong.
const REFLEX = ['mich', 'dich', 'sich', 'uns', 'euch', 'sich'];

/** Build one reflexive exercise. Präsens puts the pronoun back after the verb;
 *  Perfekt comes from the engine, which already places it. */
export function buildReflexive(verb: string, shape: 'praesens' | 'perfekt', pIdx: number) {
  const c = conjugate(verb);
  const pronoun = PRONOUN[PERSONS_I[pIdx]].split('/')[0];
  const refl = REFLEX[pIdx];
  const form = shape === 'perfekt' ? c.perfekt[pIdx] : `${c.praesens[pIdx]} ${refl}`;
  const label = shape === 'perfekt' ? 'Perfekt' : 'Präsens';
  return {
    prompt: `„sich ${c.infinitive}“ → ${label} · ${pronoun}`,
    accept: [`${pronoun} ${form}`, form],
    hints: shape === 'perfekt'
      ? [`${c.aux} + „${refl}“ + the Partizip II`, `${pronoun} ${c.perfekt[pIdx].split(' ')[0]} ${refl} …`, hintText(`${pronoun} ${form}`, 3)]
      : [`The verb, then „${refl}“ — the pronoun changes with the person`,
         REFLEX.map((r, i) => `${PRONOUN[PERSONS_I[i]].split('/')[0]} ${r}`).join(' · '),
         hintText(`${pronoun} ${form}`, 3)],
    reveal: {
      derivation: form.split(' '),
      note: `„${refl}“ is not optional — the verb means nothing without it.`,
      paradigm: {
        label: `${label} · all persons`,
        rows: PERSONS_I.map((p, i) => [
          PRONOUN[p].split('/')[0],
          shape === 'perfekt' ? c.perfekt[i] : `${c.praesens[i]} ${REFLEX[i]}`,
        ]) as [string, string][],
      },
    },
    label,
  };
}

// ---- Kasus drill: declined articles + weak adjective endings ---------------
// Grounded by construction: every rendered fragment is correct German.
//  - The case is forced by an unambiguous frame (accusative-only / dative-only /
//    genitive prepositions, or "Hier ist …" for nominative) — never a verb
//    whose government the learner can’t see.
//  - Genitive only for feminines: masculine/neuter nouns inflect (+-(e)s) and we
//    won’t render a form we can’t derive reliably.
//  - n-Deklination masculines (der Junge → den Jungen, der Herr → dem Herrn)
//    inflect in every oblique case, so they’re excluded wholesale. The suffix
//    test over-excludes a few safe nouns (Monat) — over-exclusion is the safe
//    direction.
type Kase = 'nom' | 'akk' | 'dat' | 'gen';
type Gender = 'der' | 'die' | 'das';
const CASE_LABEL: Record<Kase, string> = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };
/** The point that teaches the case an item actually asks about.
 *
 *  `MODE_REMEDY.case[0]` is Akkusativ, and a Kasus item picks its case at random
 *  from three or four — so a Genitiv question used to open the Akkusativ rule.
 *  See TENSE_POINT for the same bug in the tense drills. */
export const CASE_POINT: Record<Kase, string> = {
  nom: 'gram:A1:Personalpronomen (Nominativ)',
  akk: 'gram:A2:Akkusativ',
  dat: 'gram:A2:Präpositionen mit Dativ (aus, bei, mit, nach, seit, von, zu)',
  gen: 'gram:B1:Genitiv',
};
const CASE_PREPS: Record<Exclude<Kase, 'nom'>, string[]> = {
  akk: ['für', 'ohne', 'gegen', 'durch'],
  dat: ['mit', 'von', 'bei'],
  // no "während": it only takes temporal nouns ("während der Lampe" is nonsense);
  // wegen/trotz read plausibly with almost any noun.
  gen: ['wegen', 'trotz'],
};
const ARTICLE: Record<Kase, Record<Gender, string>> = {
  nom: { der: 'der', die: 'die', das: 'das' },
  akk: { der: 'den', die: 'die', das: 'das' },
  dat: { der: 'dem', die: 'der', das: 'dem' },
  gen: { der: 'des', die: 'der', das: 'des' },
};
// German declines an adjective three ways depending on what stands in front of
// it, and this drill used to teach only the first — which is the easy one. The
// weak table is nearly all -en, so a learner can score well on it while still
// producing "ein guter Mann" as "ein gute Mann". The hard cases were exactly the
// excluded ones (persona B2 #36).
//
// Weak — after a definite article (der/die/das), which has already marked the
// case, so the adjective only has to agree: -e or -en, fully deterministic.
const WEAK_END: Record<Kase, Record<Gender, string>> = {
  nom: { der: 'e', die: 'e', das: 'e' },
  akk: { der: 'en', die: 'e', das: 'e' },
  dat: { der: 'en', die: 'en', das: 'en' },
  gen: { der: 'en', die: 'en', das: 'en' },
};
// Mixed — after ein/kein/mein, which is *ambiguous* in three slots (ein is both
// masculine nominative and neuter), so the adjective carries the marking the
// article failed to: "ein guter Mann" but "der gute Mann".
const MIXED_END: Record<Kase, Record<Gender, string>> = {
  nom: { der: 'er', die: 'e', das: 'es' },
  akk: { der: 'en', die: 'e', das: 'es' },
  dat: { der: 'en', die: 'en', das: 'en' },
  gen: { der: 'en', die: 'en', das: 'en' },
};
const INDEF: Record<Kase, Record<Gender, string>> = {
  nom: { der: 'ein', die: 'eine', das: 'ein' },
  akk: { der: 'einen', die: 'eine', das: 'ein' },
  dat: { der: 'einem', die: 'einer', das: 'einem' },
  gen: { der: 'eines', die: 'einer', das: 'eines' },
};
// Strong — no article at all, so the adjective takes over the article's own
// endings: "kalter Wein", "mit kaltem Wein".
const STRONG_END: Record<Kase, Record<Gender, string>> = {
  nom: { der: 'er', die: 'e', das: 'es' },
  akk: { der: 'en', die: 'e', das: 'es' },
  dat: { der: 'em', die: 'er', das: 'em' },
  gen: { der: 'en', die: 'er', das: 'en' },
};
// Strong declension is only grammatical on a bare *singular* noun when that noun
// is a mass noun: "kaltes Wasser" is German, "alter Tisch" is not — a countable
// singular needs an article. So the strong flavour is gated to a curated list
// rather than inferred, which is the same over-exclusion `caseSafe` already
// prefers: a drill that prints wrong German teaches wrong German.
const MASS_NOUNS = new Set([
  'Wasser', 'Brot', 'Geld', 'Wein', 'Milch', 'Musik', 'Luft', 'Käse', 'Zucker',
  'Salz', 'Fleisch', 'Papier', 'Holz', 'Glück', 'Zeit', 'Arbeit', 'Hilfe', 'Kaffee', 'Tee',
]);
// Regularly-declining adjectives only (no -el/-er contraction, no "hoch").
const CASE_ADJ = ['alt', 'neu', 'klein', 'gut', 'lang', 'jung'];
const ARTICLE_OPTIONS: Record<Gender, string[]> = {
  der: ['der', 'den', 'dem', 'des'],
  die: ['die', 'der', 'den', 'dem'], // den/dem: the classic learner errors
  das: ['das', 'dem', 'des', 'den'],
};
const N_DEKLINATION = new Set(['Herr', 'Mensch', 'Nachbar', 'Bauer', 'Held', 'Prinz', 'Fürst', 'Graf', 'Bär', 'Herz', 'Name', 'Gedanke', 'Buchstabe', 'Friede', 'Wille', 'Glaube']);
/** A noun this drill may render uninflected in any allowed case. */
export function caseSafe(w: Word): boolean {
  if (w.kind !== 'word' || !w.gender || w.pos !== 'noun') return false;
  const s = stripArticle(w.term);
  if (/[\s-]/.test(s)) return false; // single plain nouns only
  if (N_DEKLINATION.has(s)) return false;
  if (w.gender === 'der' && /(e|ent|ist|at|oge|and|ant|ad|it)$/.test(s)) return false;
  return true;
}

/** `kase` rides along so the item can open the rule for the case it actually
 *  asked about rather than the mode's default. */
export interface CaseItemData { prompt: string; sub: string; options: string[]; correct: number; why: string; answer: string; kase: Kase; }
/** Which declension the item is asking for — named on the card, because "adjective
 *  ending" is three different systems and the learner needs to know which one. */
export type Declension = 'weak' | 'mixed' | 'strong';
const DECL_LABEL: Record<Declension, string> = {
  weak: 'after the definite article', mixed: 'after ein/eine', strong: 'no article',
};
/** Build one Kasus item: article choice or weak adjective ending, in a frame
 *  that forces the case. `rnd` injectable for tests. */
export function buildCaseItem(w: Word, rnd: () => number = Math.random): CaseItemData {
  const g = w.gender as Gender;
  const noun = stripArticle(w.term);
  const cases: Kase[] = g === 'die' ? ['nom', 'akk', 'dat', 'gen'] : ['nom', 'akk', 'dat'];
  const kase = cases[Math.floor(rnd() * cases.length)];
  const article = rnd() < 0.5;
  // Naturalness: with a bare noun, von/bei + dem contract in normal German
  // (vom/beim Tisch) — only "mit dem" is the unmarked full form. With an
  // adjective the full article is natural again (bei dem alten Tisch), so the
  // adjective flavor keeps all three dative preps.
  const frame = kase === 'nom' ? 'Hier ist'
    : kase === 'dat' && article ? 'mit'
    : CASE_PREPS[kase][Math.floor(rnd() * CASE_PREPS[kase].length)];
  const why = kase === 'nom' ? 'subject position → Nominativ' : `${frame} + ${CASE_LABEL[kase]}`;
  if (article) {
    // Which article?
    const correct = ARTICLE[kase][g];
    const options = shuffle(ARTICLE_OPTIONS[g]);
    return {
      prompt: `${frame} ___ ${noun}`,
      sub: `Which article? · ${CASE_LABEL[kase]}`,
      options, correct: options.indexOf(correct),
      why, answer: correct,
      kase,
    };
  }
  // Which adjective ending? One of the three declensions — strong only where a
  // bare noun is grammatical, i.e. a mass noun.
  const adj = CASE_ADJ[Math.floor(rnd() * CASE_ADJ.length)];
  const flavours: Declension[] = MASS_NOUNS.has(noun)
    ? ['weak', 'mixed', 'strong']
    : ['weak', 'mixed'];
  const decl = flavours[Math.floor(rnd() * flavours.length)];
  const END = decl === 'weak' ? WEAK_END : decl === 'mixed' ? MIXED_END : STRONG_END;
  const correct = adj + END[kase][g];
  const before = decl === 'weak' ? `${ARTICLE[kase][g]} ` : decl === 'mixed' ? `${INDEF[kase][g]} ` : '';
  // All five endings are live once strong declension is in play (-em only ever
  // appears there), so the distractors are drawn from the full set rather than a
  // fixed four — otherwise the right answer would sometimes not be on offer.
  const distractors = ['e', 'en', 'er', 'es', 'em'].map((e) => adj + e).filter((o) => o !== correct);
  const options = shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
  return {
    prompt: `${frame} ${before}___ ${noun}`,
    sub: `Adjective ending · ${CASE_LABEL[kase]}`,
    options, correct: options.indexOf(correct),
    why: `${why} · ${DECL_LABEL[decl]}`, answer: correct,
    kase,
  };
}

/** Every tense the conjugation and transformation drills can ask for. */
export type TenseKey = 'praesens' | 'praeteritum' | 'perfekt' | 'futur1' | 'konjunktiv2' | 'pp';
/** The four a transformation drill can target (Präsens is the *source*, and
 *  Partizip II is a form rather than a tense). */
export type TransformKey = Exclude<TenseKey, 'praesens' | 'pp'>;

/** The point that teaches the tense an item actually asks about.
 *
 *  This is the fix for a bug that made the rule link actively misleading. Both
 *  tense drills pick their target at random — `TransformItem` from four tenses,
 *  `ConjItem` from six — and the rule shown came from `modeRulePoint(mode)`, i.e.
 *  `MODE_REMEDY[mode][0]`: a single static entry per *mode*. So a card asking for
 *  Futur I opened the Perfekt rule, and a Konjunktiv II conjugation opened
 *  Präsens. The right rule was in the bank the whole time; nothing looked it up.
 *
 *  Partizip II maps to Perfekt: it is only ever drilled as that tense's second
 *  half, and no separate point teaches it. `grammar.test.ts` pins every id here
 *  to an authored point with a non-empty rule. */
export const TENSE_POINT: Record<TenseKey, string> = {
  praesens:    'gram:A1:Präsens (regelmäßig)',
  praeteritum: 'gram:A2:Präteritum',
  perfekt:     'gram:A1:Perfekt',
  pp:          'gram:A1:Perfekt',
  futur1:      'gram:B1:Futur I',
  konjunktiv2: 'gram:B1:Konjunktiv II (würde)',
};

/** Pick a drill's grammatical target, biased toward what the learner said they are
 *  working on this week.
 *
 *  0.6 rather than 1.0 on purpose: a focus is a lean, not a filter. Serving only
 *  the focused tense would stop rehearsing everything else, and the learner would
 *  quietly lose the three tenses they weren't thinking about. Exported for tests. */
export function pickFocused<T extends { key: string }>(
  options: T[], focus: string | null, rnd: () => number = Math.random,
): T {
  const wanted = focus ? options.find((o) => o.key === focus) : undefined;
  if (wanted && rnd() < 0.6) return wanted;
  return options[Math.floor(rnd() * options.length)];
}

const TRANSFORM_TARGETS: { key: TransformKey; label: string }[] = [
  { key: 'praeteritum', label: 'Präteritum' },
  { key: 'perfekt', label: 'Perfekt' },
  { key: 'futur1', label: 'Futur I' },
  { key: 'konjunktiv2', label: 'Konjunktiv II' },
];

/** A helper verb's six present-tense forms as one readable row:
 *  "ich werde · du wirst · er wird · wir werden · ihr werdet · sie werden". */
function paradigmRow(forms: readonly string[]): string {
  return PERSONS_I.map((p, i) => `${PRONOUN[p].split('/')[0]} ${forms[i]}`).join(' · ');
}

/** Structure-first hints for a tense transformation.
 *
 *  The generic ladder in `hintText` counts letters, then reveals the first
 *  character. But a transform prompt already prints the pronoun — „du musst“ →
 *  Futur I — so for "du wirst müssen" rung 1 read "3 words · 13 letters" and rung
 *  2 read 'starts with „d“'. Two of three rungs told the learner nothing they
 *  could not already see, on the one drill in the app that asks them to *produce*
 *  a form rather than recognise it.
 *
 *  These name the construction first; then, rather than leaking one character,
 *  show the *helper verb's whole paradigm* — which is the gap a learner stuck on
 *  "→ Futur I" actually has, and which makes locating their own person the
 *  retrieval. The shape fallback stays as the last resort. Taking a hint still
 *  never changes the grade. */
export function transformHints(c: Conjugation, pIdx: number, targetKey: TransformKey): string[] {
  const inf = c.infinitive;
  const shape = hintText(`${PRONOUN[PERSONS_I[pIdx]].split('/')[0]} ${c[targetKey][pIdx]}`, 3);
  switch (targetKey) {
    case 'futur1':
      return [
        `werden (conjugated) + „${inf}“ — the infinitive goes last`,
        paradigmRow(conjugate('werden').praesens),
        shape,
      ];
    case 'perfekt':
      return [
        `${c.aux} (conjugated) + the Partizip II of „${inf}“, which goes last`,
        paradigmRow(conjugate(c.aux).praesens),
        shape,
      ];
    case 'praeteritum':
      return [
        'One word — the Präteritum takes no helper verb',
        c.source === 'irregular'
          ? 'A strong verb: the stem vowel changes, and ich / er take no ending'
          : 'A weak verb: -te- sits between the stem and the ending',
        shape,
      ];
    case 'konjunktiv2':
      // sein / haben / werden / the modals / wissen keep the synthetic one-word
      // forms that are the ones actually spoken; everything else is analytic.
      return c.konjunktiv2[pIdx].includes(' ')
        ? [
            `würde (conjugated) + „${inf}“ — the infinitive goes last`,
            paradigmRow(conjugate('werden').konjunktiv2),
            shape,
          ]
        : [
            `One word — „${inf}“ has its own Konjunktiv II form, like „wäre“ and „hätte“`,
            'Built on the Präteritum stem: umlaut where possible, then -e endings',
            shape,
          ];
  }
}

// ---- dictation --------------------------------------------------------------
// Everything in Lexi is recognition or a single produced form. There is no writing
// anywhere, and writing is where spelling, word order and the umlauts a learner
// keeps fudging all become unavoidable at once.
//
// Full free writing can't be graded honestly without a model, and a drill that
// marks correct German wrong is worse than no drill. Dictation is the one form of
// written production that *can* be graded exactly: the learner hears a sentence and
// types it, and the target is known to the character. It reuses the corpus's own
// sentences and the speech engine that already ships.
//
// Bounded deliberately: long enough to require holding a clause in your head, short
// enough to type on a phone without the audio going stale.
/** Whether a sentence is worth dictating. */
/** The example a cloze should blank: one that actually contains the headword. */
export function clozeExample(w: Word): Example | null {
  return drillExample(w, (de) => wholeWordRe(stripArticle(w.term)).test(de));
}
/** The example the sentence builder should scramble. */
export function orderExample(w: Word): Example | null {
  return drillExample(w, (de) => orderTokens(de).length > 0);
}

export function dictatable(de?: string): boolean {
  if (!de) return false;
  const t = de.trim();
  if (t.length < 12 || t.length > 70) return false;
  const words = t.split(/\s+/).length;
  if (words < 3 || words > 9) return false;
  // Nothing a learner can't be expected to spell from hearing it once.
  return !/[0-9(){}[\]<>«»„"]|\b[A-ZÄÖÜ]{2,}\b/.test(t);
}

// ---- separable verbs -------------------------------------------------------
// `canTransform` excludes separable verbs on purpose: the bare finite form of
// "ankommen" is "komme", and printing that as the answer would be teaching wrong
// German. Correct — and it meant the app never drilled the single system English
// speakers get wrong most, because their language has nothing like it.
//
// A dedicated drill can render them correctly, and more usefully can test the part
// that actually confuses: the prefix *moves*. It detaches to the end of a main
// clause in the present, wraps around -ge- in the participle, and stays attached in
// the infinitive. Three shapes, one system.
export type SepShape = 'praesens' | 'partizip' | 'perfekt';
const SEP_LABEL: Record<SepShape, string> = {
  praesens: 'Präsens', partizip: 'Partizip II', perfekt: 'Perfekt',
};

/** Build one separable-verb exercise. `rnd` injectable for tests. */
export function buildSeparable(verb: string, shape: SepShape, pIdx: number) {
  const c = conjugate(verb);
  const prefix = c.separable ?? '';
  const pronoun = PRONOUN[PERSONS_I[pIdx]].split('/')[0];
  const bare = c.infinitive;

  if (shape === 'partizip') {
    return {
      prompt: `„${bare}“ → Partizip II`,
      accept: [c.partizip],
      hints: [
        `The prefix stays in front and -ge- goes between it and the verb`,
        `${prefix}ge…`,
        hintText(c.partizip, 3),
      ],
      reveal: {
        derivation: [prefix, 'ge', c.partizip.slice(prefix.length + 2)],
        note: 'A separable prefix wraps around the -ge-, rather than losing it.',
      },
      label: SEP_LABEL.partizip,
    };
  }
  if (shape === 'perfekt') {
    const form = c.perfekt[pIdx];               // "habe angerufen"
    return {
      prompt: `„${bare}“ → Perfekt · ${pronoun}`,
      accept: [`${pronoun} ${form}`, form],
      hints: [
        `${c.aux} (conjugated) + the Partizip II`,
        paradigmRow(conjugate(c.aux).praesens),
        hintText(`${pronoun} ${form}`, 3),
      ],
      reveal: {
        derivation: form.split(' '),
        note: 'The participle stays whole here — nothing detaches in the Perfekt.',
        paradigm: { label: 'Perfekt · all persons', rows: paradigmRows(c.perfekt) },
      },
      label: SEP_LABEL.perfekt,
    };
  }
  const form = c.praesens[pIdx];                // "rufe an"
  return {
    prompt: `„${bare}“ → Präsens · ${pronoun}`,
    accept: [`${pronoun} ${form}`, form],
    hints: [
      `The prefix „${prefix}“ detaches and goes to the end`,
      paradigmRow(c.praesens),
      hintText(`${pronoun} ${form}`, 3),
    ],
    reveal: {
      derivation: form.split(' '),
      note: `„${prefix}“ leaves the verb and closes the clause.`,
      paradigm: { label: 'Präsens · all persons', rows: paradigmRows(c.praesens) },
    },
    label: SEP_LABEL.praesens,
  };
}

/** The six [pronoun, form] pairs of one tense, for the reveal's paradigm table. */
export function paradigmRows(forms: readonly string[]): [string, string][] {
  return PERSONS_I.map((p, i) => [PRONOUN[p].split('/')[0], forms[i]] as [string, string]);
}

/** Build one transformation exercise: a Präsens form → a target tense, typed.
 *  Accepts the form with or without its pronoun ("hat gemacht" / "er hat
 *  gemacht" / "sie hat gemacht" / "es hat gemacht").
 *
 *  Returns `targetKey` alongside the copy so the caller can open the rule for the
 *  tense it actually asked for, and a `reveal` so a miss teaches the construction
 *  instead of only naming the form. Exported for tests. */
export function buildTransform(verb: string, pIdx: number, targetKey: TransformKey, label: string) {
  const c = conjugate(verb);
  const pronouns = PRONOUN[PERSONS_I[pIdx]].split('/'); // "er/sie/es" → variants
  const source = `${pronouns[0]} ${c.praesens[pIdx]}`;
  const form = c[targetKey][pIdx];
  // A compound tense splits into helper + non-finite part; the Präteritum and the
  // synthetic Konjunktiv II are one word, so there is no formula to show.
  const words = form.split(' ');
  return {
    prompt: `„${source}“ → ${label}`,
    accept: [`${pronouns[0]} ${form}`, form, ...pronouns.slice(1).map((p) => `${p} ${form}`)],
    targetKey,
    hints: transformHints(c, pIdx, targetKey),
    reveal: {
      derivation: words.length > 1 ? words : undefined,
      note: words.length > 1
        ? (targetKey === 'perfekt' ? 'The Partizip II goes to the end.' : 'The infinitive goes to the end.')
        : undefined,
      paradigm: { label: `${label} · all persons`, rows: paradigmRows(c[targetKey]) },
    },
  };
}
// Legacy storage namespace: kept as `gym:` so learners' existing drill schedules
// carry through the "Gym → Fundamentals" rename. Do not change this prefix.
const id = (m: Mode, w: Word) => `gym:${m}:${w.id}`;
/** FSRS card id for a word’s drill in a given mode (shared with mixed sessions). */
export const gymId = id;
/** Drill modes a single word qualifies for (mirrors the pool predicates). */
export function eligibleModes(w: Word): Mode[] {
  const out: Mode[] = [];
  if (w.kind === 'word' && w.gender) out.push('gender');
  if (w.kind === 'word' && w.plural) out.push('plural');
  if (w.pos === 'verb' && canConjugate(w.term)) out.push('conj');
  if (w.kind === 'word' && clozeExample(w)) out.push('cloze');
  if (w.kind === 'word' && orderExample(w)) out.push('order');
  if (w.pos === 'verb' && canTransform(w.term)) out.push('transform');
  if (w.pos === 'verb' && isSeparable(w.term)) out.push('separable');
  if (w.pos === 'verb' && isReflexive(w.term)) out.push('reflexive');
  if (w.kind === 'word' && drillExample(w, dictatable)) out.push('dictation');
  // Recall is the one mode gated on the learner rather than on the card.
  //
  // Producing a word requires a form–meaning link that recognising it builds, so
  // asking for production before that link exists is not a desirable difficulty —
  // it is a retrieval attempt on something not yet encoded, and it returns a
  // failure and an FSRS lapse for a word the learner never had. So a word becomes
  // eligible for recall only once its *flip* card has reached Review: recognition
  // is what unlocks production, which is also the honest relationship between the
  // two numbers on Today.
  //
  // Choosing the Recall drill from Fundamentals deliberately bypasses this — it
  // draws from `recallPool` instead, on the same reasoning that a scoped grammar
  // drill ignores the CEFR filter: asking for a thing is the licence for it.
  if (recallSafe(w) && statusOf(w.id) === 'known') out.push('recall');
  if (caseSafe(w)) out.push('case');
  return out;
}
export const MODE_TAG: Record<Mode, string> = {
  gender: 'Gender (der/die/das)', plural: 'Noun plurals', conj: 'Verb conjugation', cloze: 'Cloze (word in context)',
  order: 'Word order (sentence builder)', transform: 'Tense transformation', case: 'Cases & endings (Kasus)',
  separable: 'Separable verbs (trennbare Verben)',
  reflexive: 'Reflexive verbs (sich …)',
  dictation: 'Dictation (hearing to spelling)',
  recall: 'Recall (English → German)',
};

/** The authored grammar point that teaches the system each generated drill
 *  tests, as `gram:<level>:<title>` ids. Ordered easiest-first (Processability:
 *  canonical forms before complex ones).
 *
 *  Two consumers, one map: session.ts picks the first candidate that is unseen
 *  or due for miss-triggered remediation, and the drills show `[0]` as the rule
 *  behind a wrong answer. It lives here because `Mode` does — session.ts already
 *  imports from this file, so keeping it here avoids a circular import. */
export const MODE_REMEDY: Record<Mode, string[]> = {
  gender: ['gram:A1:Artikel & Genus', 'gram:A1:Artikelwörter & kein'],
  plural: ['gram:A1:Pluralbildung (die Nomen im Plural)'],
  conj: ['gram:A1:Präsens (regelmäßig)', 'gram:A1:Perfekt', 'gram:A2:Präteritum', 'gram:B1:Konjunktiv II (würde)'],
  cloze: [], // vocabulary-in-context, not a structural system
  order: ['gram:A1:Wortstellung & Fragen', 'gram:C1:TeKaMoLo & Satzklammer'],
  transform: ['gram:A1:Perfekt', 'gram:A2:Präteritum', 'gram:B1:Futur I', 'gram:B1:Konjunktiv II (würde)'],
  case: ['gram:A2:Akkusativ', 'gram:A2:Präpositionen mit Dativ (aus, bei, mit, nach, seit, von, zu)', 'gram:A2:Adjektivdeklination: nach bestimmtem Artikel (schwach)', 'gram:B1:Genitiv'],
  separable: ['gram:A1:Trennbare Verben'],
  reflexive: ['gram:A2:Reflexive Verben'],
  // Spelling from sound isn't one grammatical system, so there is no rule to open.
  dictation: [],
  // Producing a word you have only ever recognised is a retrieval problem, not a
  // grammatical one — there is no rule that fixes it. The one system it *does*
  // expose is gender, and `RecallItem` opens that point itself when the card is a
  // noun, so a mode-level default here would be wrong for every verb.
  recall: [],
};

/** The point that explains the **sentence a word-order drill actually built**.
 *
 *  Third instance of one bug, and the first two are documented above: `TENSE_POINT`
 *  exists because a Futur I card opened the Perfekt rule, `CASE_POINT` because a
 *  Genitiv question opened the Akkusativ rule. The sentence builder had the same
 *  defect and kept it — every item opened `MODE_REMEDY.order[0]`, *Wortstellung &
 *  Fragen*, whatever the sentence was.
 *
 *  Reported from a real session: the rule card explained W-questions ("W-word
 *  first, verb second", worked through with *Wo wohnst du?*) above a tile exercise
 *  whose answer was **„Können Sie mir bitte Ihren Namen buchstabieren?“** — a
 *  yes/no modal question whose whole difficulty is the bracket, the modal in
 *  position 1 and its infinitive at the very end. The learner is shown a rule that
 *  does not describe the sentence in front of them, which is worse than showing no
 *  rule at all.
 *
 *  The sentences come from each card's own examples, so the shape cannot be fixed
 *  at the mode level — it has to be read off the string. Ordered most specific
 *  first: a subordinate clause with a modal is a subordinate clause.
 *
 *  Exported and pure so `grammar.test.ts` can pin every id to an authored point,
 *  the way it already does for the two maps above. */
const SUBORDINATORS = /\b(weil|dass|damit|obwohl|wenn|falls|während|bevor|nachdem|sobald|ob)\b/i;
const W_WORDS = /^(wo|was|wer|wen|wem|wann|wie|warum|wieso|weshalb|welche[rsnm]?|wohin|woher)\b/i;
const MODALS = /\b(kann|kannst|können|könnt|könnte[nst]?|muss|musst|müssen|müsst|darf|darfst|dürfen|dürft|will|willst|wollen|wollt|soll|sollst|sollen|sollt|mag|magst|mögen|möchte[nst]?)\b/i;
const PERFEKT = /\b(habe|hast|hat|haben|habt|bin|bist|ist|sind|seid)\b.*\b(ge\w+[tn]|\w+iert)\b/i;

export function orderPoint(sentence: string | undefined): string {
  const s = (sentence ?? '').trim();
  if (!s) return 'gram:A1:Wortstellung & Fragen';
  // A subordinate clause sends its verb to the end — that is the rule being tested,
  // regardless of what else the sentence contains.
  if (SUBORDINATORS.test(s)) return 'gram:B1:Nebensätze (weil/dass)';
  // A W-question really is the W-question rule, and it is the one case the old
  // static point was right about.
  if (W_WORDS.test(s)) return 'gram:A1:Wortstellung & Fragen';
  // The reported case: a modal opens the bracket and parks its infinitive at the
  // end. `Können Sie mir bitte Ihren Namen buchstabieren?`
  if (MODALS.test(s)) return 'gram:A1:Modalverben';
  if (PERFEKT.test(s)) return 'gram:A1:Perfekt';
  // Statement V2 and yes/no inversion are both what Wortstellung & Fragen teaches.
  return 'gram:A1:Wortstellung & Fragen';
}

/** The point whose rule explains a drill mode, for the "Why?" link. */
export const modeRulePoint = (m: Mode): string | null => MODE_REMEDY[m][0] ?? null;

/** Words for a mode, due-first then unseen, shuffled within each band. */
function queue(mode: Mode): Word[] {
  const pool = mode === 'gender' ? genderPool() : mode === 'plural' ? pluralPool() : mode === 'conj' ? conjPool()
    : mode === 'order' ? orderPool() : mode === 'transform' ? transformPool() : mode === 'case' ? casePool()
    : mode === 'separable' ? separablePool() : mode === 'reflexive' ? reflexivePool()
    : mode === 'dictation' ? dictationPool() : mode === 'recall' ? recallPool() : clozePool();
  const now = Date.now();
  const due: Word[] = [], fresh: Word[] = [];
  for (const w of pool) {
    const c = cardOf(id(mode, w));
    if (!c) fresh.push(w);
    else if (isDue(c, now)) due.push(w);
  }
  return [...shuffle(due), ...shuffle(fresh)].slice(0, 30);
}
function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export const MODES: { m: Mode; label: string; icon: LucideIcon; desc: string }[] = [
  { m: 'gender', label: 'der / die / das', icon: CircleDot, desc: 'Nail the gender of every noun.' },
  { m: 'plural', label: 'Plurals', icon: Layers3, desc: 'Pick the right plural.' },
  { m: 'conj', label: 'Conjugation', icon: Cog, desc: 'Präsens · Präteritum · Perfekt · Futur I · Konjunktiv II.' },
  { m: 'cloze', label: 'Cloze', icon: AlignLeft, desc: 'Pick the missing word in a real sentence.' },
  { m: 'order', label: 'Sentence builder', icon: Shuffle, desc: 'Rebuild a real sentence from tiles — V2 and verb-final word order.' },
  { m: 'transform', label: 'Transformation', icon: Repeat, desc: 'Type a verb form in another tense. Production, not recognition.' },
  { m: 'case', label: 'Kasus', icon: Braces, desc: 'Declined articles & adjective endings — Nominativ · Akkusativ · Dativ · Genitiv.' },
  { m: 'separable', label: 'Trennbare Verben', icon: Split, desc: 'Where the prefix goes — anrufen → ich rufe an, angerufen.' },
  { m: 'reflexive', label: 'Reflexive Verben', icon: RefreshCw, desc: 'The pronoun that isn’t optional — sich freuen → ich freue mich.' },
  { m: 'dictation', label: 'Diktat', icon: Ear, desc: 'Hear a sentence, write it. The only drill that makes you spell.' },
  { m: 'recall', label: 'Recall', icon: PenLine, desc: 'English in, German out — with the article. The only drill that asks you to produce a word rather than recognise one.' },
];

/** One generated word-drill, played to completion. The landing that used to sit
 *  above this now lives in Grammar.tsx, which owns the syllabus and routes here
 *  for the "Quick drills" strip. */
export function Drill({ mode, onExit }: { mode: Mode; onExit: () => void }) {
  useStore();
  const lvKey = [...levels()].sort().join('');
  const q = useMemo(() => queue(mode), [mode, lvKey]);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);

  const word = q[i];
  const advance = useCallback<Grade>((ok, detail) => {
    if (!word) return;
    review(id(mode, word), ok ? Rating.Good : Rating.Again);
    haptic(ok ? 'grade' : 'wrong');
    tick(ok ? 'good' : 'wrong');
    logAttempt(MODE_TAG[mode]);
    if (!ok) logMiss(MODE_TAG[mode], word.term, detail);
    setDone((d) => d + 1); setCorrect((c) => c + (ok ? 1 : 0)); setI((n) => n + 1);
  }, [word, mode]);

  if (q.length === 0) return <Shell onExit={onExit}><Empty /></Shell>;
  if (!word) return <Shell onExit={onExit}><Summary done={done} correct={correct} /></Shell>;

  return (
    <Shell onExit={onExit} progress={`${done}/${q.length}`} score={done ? Math.round((correct / done) * 100) : null}>
      {/* The rule header is the item's own now (see DrillHeader): a mode-level
          header could only ever name the mode, and three of these seven modes
          pick a different grammatical target on every card. */}
      {mode === 'gender' && <GenderItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'plural' && <PluralItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'conj' && <ConjItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'cloze' && <ClozeItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'order' && <OrderWordItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'transform' && <TransformItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'case' && <CaseItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'separable' && <SeparableItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'reflexive' && <ReflexiveItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'dictation' && <DictationItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'recall' && <RecallItem key={word.id} word={word} onGrade={advance} />}
    </Shell>
  );
}

// ---- shells & shared bits ------------------------------------------------
function Shell({ children, onExit, progress, score }: { children: React.ReactNode; onExit: () => void; progress?: string; score?: number | null }) {
  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <IconButton label="Back" pull onClick={onExit}><ArrowLeft size={18} /></IconButton>
        {progress && <span className="text-xs text-dim font-mono ml-1.5">{progress}</span>}
        {score !== null && score !== undefined && <span className="ml-auto text-xs font-mono text-green">{score}% correct</span>}
      </div>
      {children}
    </div>
  );
}

const GENDER = [
  { g: 'der' as const, color: 'var(--color-der)', icon: Mars },
  { g: 'die' as const, color: 'var(--color-die)', icon: Venus },
  { g: 'das' as const, color: 'var(--color-das)', icon: CircleDot },
];
export function GenderItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const [picked, setPicked] = useState<string | null>(null);
  const choose = (g: string) => {
    if (picked) return;
    setPicked(g);
    // The confusion, not just the failure: "wanted die, chose der" over a month
    // is the shape of a learner's gender error, and it is exactly what an
    // ending-rule lesson would fix.
    setTimeout(() => onGrade(g === word.gender, { asked: word.gender ?? '', chose: g }), 750);
  };
  return (
    <>
      <DrillHeader pointRef={modeRulePoint('gender')} label={MODE_TAG.gender} />
    <Card>
      <Prompt small="Which article?" gloss={word.en}>{stripArticle(word.term)}</Prompt>
      <div className="grid grid-cols-3 gap-2.5">
        {GENDER.map(({ g, color }) => {
          const state = !picked ? 'idle' : g === word.gender ? 'right' : g === picked ? 'wrong' : 'idle';
          return (
            <button key={g} onClick={() => choose(g)} disabled={!!picked}
              className={`rounded-md py-4 font-bold text-xl border transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt'
                : 'bg-panel2 border-line hover:border-amber'}`}
              style={state === 'idle' ? { color } : undefined}>
              {g}
            </button>
          );
        })}
      </div>
    </Card>
    </>
  );
}

// ---- multiple-choice item + distractor helpers ---------------------------
/** Pick up to n distinct strings from pool, excluding (by normalised key). */
function pickN(pool: string[], n: number, exclude: Set<string>): string[] {
  const out: string[] = []; const seen = new Set(exclude);
  for (const s of shuffle(pool)) { const k = norm(s); if (!s || seen.has(k)) continue; seen.add(k); out.push(s); if (out.length >= n) break; }
  return out;
}
/** Shuffle correct + distractors into options; return options and correct index. */
function buildMC(correct: string, distractors: string[]): { options: string[]; correct: number } {
  const opts = shuffle([correct, ...distractors.slice(0, 3)]);
  return { options: opts, correct: opts.indexOf(correct) };
}

/** Give a distractor the same initial case the answer picked up from the sentence.
 *
 *  A cloze takes its answer from the surface *as it appears* — so a sentence-initial
 *  blank yields "Nur" — while distractors are drawn as citation forms, which for
 *  everything except nouns are lowercase. The answer was therefore the only
 *  capitalised option, and «_____ Mut.» could be solved by a learner who reads no
 *  German at all. Measured over the shipped corpus with this file's own
 *  `drillExample` and `wholeWordRe`: **261 of 5,684 cloze-eligible cards (4.6%)**,
 *  and concentrated exactly where it does most damage — 70 at A1, including the
 *  whole question-word paradigm (wer, was, wo, wann, wie, warum).
 *
 *  Raising the distractors rather than lowering the answer, because the answer has
 *  to be the string that actually goes in the blank: "nur Mut" is not a sentence.
 *  Nouns are unaffected — their citation form is already capitalised, so `target`
 *  and `citation` agree and nothing moves. */
export function matchInitialCase(target: string, citation: string, distractor: string): string {
  if (!target || !citation || !distractor) return distractor;
  const raised = target[0] !== citation[0] && target[0] === target[0].toUpperCase();
  return raised ? distractor[0].toUpperCase() + distractor.slice(1) : distractor;
}

// Umlaut the first stem vowel (a/o/u/au), preserving case and skipping the 'eu'
// diphthong — used to fabricate believable-but-wrong plural forms.
function umlaut(s: string): string {
  const low = s.toLowerCase();
  const au = low.indexOf('au');
  if (au >= 0) return s.slice(0, au) + (s[au] === s[au].toUpperCase() ? 'Äu' : 'äu') + s.slice(au + 2);
  for (let i = 0; i < s.length; i++) {
    const c = low[i];
    if (c === 'u' && low[i - 1] === 'e') continue; // don’t split 'eu'
    const up = s[i] !== low[i];
    const u = c === 'a' ? (up ? 'Ä' : 'ä') : c === 'o' ? (up ? 'Ö' : 'ö') : c === 'u' ? (up ? 'Ü' : 'ü') : '';
    if (u) return s.slice(0, i) + u + s.slice(i + 1);
  }
  return s;
}
/** Plausible wrong plural forms of one noun: apply the common German plural
 *  patterns (-e, -en, -er, -s, umlaut±e/er, no-change) to the singular. The
 *  caller excludes the correct form; de-duping happens in pickN. */
function pluralVariants(singular: string): string[] {
  const endsE = /e$/i.test(singular);
  const stem = endsE ? singular.slice(0, -1) : singular;
  const us = umlaut(stem);
  return [endsE ? singular + 'n' : singular + 'e', stem + 'en', stem + 'er', stem + 's', us + 'e', us + 'er', umlaut(singular), singular];
}

function MCItem({ prompt, sub, hint, options, correct, extra, bigPrompt = true, mode, rulePoint, ruleLabel, reveal, askedLabel, onGrade }:
  { prompt: React.ReactNode; sub?: string; hint?: string; options: string[]; correct: number; extra?: React.ReactNode; bigPrompt?: boolean;
    mode?: Mode; rulePoint?: string | null; ruleLabel?: string; reveal?: RevealData;
    /** Name the thing being asked for, when it is not the correct option itself.
     *
     *  The Kasus drill's options are surface forms — den, dem, der — and the
     *  question behind them is a case. Logging "wanted dem, chose den" is true
     *  and nearly useless, because the same pair means something different on a
     *  masculine noun than on a plural; logging "wanted Dativ, chose den" is the
     *  diagnosis. Mapping the *chosen* form back to a case is deliberately not
     *  attempted — `den` is accusative masculine **and** dative plural, so the
     *  inference would be wrong often enough to poison the table. */
    askedLabel?: string;
    onGrade: Grade }) {
  const [picked, setPicked] = useState<number | null>(null);
  // The rule for what this item actually tests. `rulePoint` is the item's own
  // target (the Genitiv of *this* Kasus item, the Präteritum of *this* conjugation);
  // the mode default is the fallback for modes whose items are all one system.
  const point = rulePoint !== undefined ? rulePoint : mode ? modeRulePoint(mode) : null;
  /** Report the result *and* the substitution that produced it. */
  const settle = (i: number) =>
    onGrade(i === correct, { asked: askedLabel ?? options[correct], chose: options[i] });
  useChoiceKeys({
    count: options.length,
    answered: picked !== null,
    onPick: setPicked,
    onNext: () => picked !== null && settle(picked),
  });
  return (
    <>
      {ruleLabel && <DrillHeader pointRef={point} label={ruleLabel} />}
    <Card>
      <Prompt small={sub} gloss={hint} big={bigPrompt}>{prompt}</Prompt>
      <div className="grid gap-2.5">
        {options.map((o, i) => {
          const state = picked === null ? 'idle' : i === correct ? 'right' : i === picked ? 'wrong' : 'idle';
          return (
            <button key={i} onClick={() => picked === null && setPicked(i)} disabled={picked !== null}
              className={`rounded-md py-3.5 px-4 border text-base text-center transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green font-semibold'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt'
                : 'bg-panel2 border-line hover:border-amber'}`}>
              {/* The key that picks this option, shown so the shortcut is
                  discoverable rather than folklore. Hidden on touch, where there
                  is no keyboard to hint at. */}
              <kbd aria-hidden className="hidden sm:inline-block font-mono text-2xs text-dim mr-2 tabular-nums">{i + 1}</kbd>
              {/* icon + colour: right/wrong never rides on colour alone */}
              {state === 'right' && <Check size={14} className="inline -mt-0.5 mr-1.5" />}
              {state === 'wrong' && <X size={14} className="inline -mt-0.5 mr-1.5" />}
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && extra && <p className="text-dim text-xs mt-3 text-center font-mono">{extra}</p>}
      {/* On a miss, teach: the paradigm this form belongs to. `conjugate()` had all
          six persons the whole time and the drill showed one, then discarded them. */}
      {picked !== null && picked !== correct && reveal?.paradigm && (
        <div className="mt-3 mx-auto max-w-[19rem] text-left">
          <RevealBlock label={reveal.paradigm.label}><Paradigm rows={reveal.paradigm.rows} /></RevealBlock>
        </div>
      )}
      {/* `extra` states the verdict as a formula ("subject position → Nominativ
          → der"). On a miss that isn’t an explanation, so offer the rule. */}
      {picked !== null && picked !== correct && point && (
        <div className="mt-1 flex justify-center"><WhyLink pointRef={point} /></div>
      )}
      {picked !== null && <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={() => settle(picked)}>Next →</Button></div>}
    </Card>
    </>
  );
}

export function PluralItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const correct = word.plural!;
  const singular = stripArticle(word.term);
  const mc = useMemo(() => {
    // For a full "die …" plural, fabricate near-miss plurals of the *same* noun.
    // Shorthand/marker plurals ("-en", "nur Singular", "—") fall back to other
    // nouns' plurals (unchanged behaviour), since there’s no stem to inflect.
    const isFull = /^(der|die|das)\s+[A-Za-zÄÖÜäöüß]/.test(correct);
    let distract: string[];
    if (isFull) {
      distract = pickN(pluralVariants(singular), 3, new Set([norm(stripArticle(correct))])).map((n) => `die ${n}`);
      if (distract.length < 3) {
        const pad = pluralPool().filter((w) => w.id !== word.id).map((w) => w.plural!);
        distract = distract.concat(pickN(pad, 3 - distract.length, new Set([norm(correct), ...distract.map(norm)])));
      }
    } else {
      distract = pickN(pluralPool().filter((w) => w.id !== word.id).map((w) => w.plural!), 3, new Set([norm(correct)]));
    }
    return buildMC(correct, distract);
  }, [word.id]);
  return <MCItem prompt={<GenderTerm term={word.term} gender={word.gender} />}
    sub="Choose the plural" hint={word.en} options={mc.options} correct={mc.correct}
    ruleLabel={MODE_TAG.plural} mode="plural" onGrade={onGrade} />;
}

const TENSES: { key: TenseKey; label: string }[] = [
  { key: 'praesens', label: 'Präsens' },
  { key: 'praeteritum', label: 'Präteritum' },
  { key: 'perfekt', label: 'Perfekt' },
  { key: 'futur1', label: 'Futur I' },
  { key: 'konjunktiv2', label: 'Konjunktiv II' },
  { key: 'pp', label: 'Partizip II' },
];
const PERSONS_I: Person[] = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

/** Which grammatical person to ask about.
 *
 *  This was a uniform `Math.random() * 6`, so a learner meeting a verb for the
 *  first time could be asked for „ihr werdet müssen“ before they had ever produced
 *  „ich werde“. 2nd person plural is both the rarest form in speech and the last
 *  one any textbook introduces — a coin flip is not a curriculum.
 *
 *  PERSONS_I is already in teaching order, so an unconsolidated card draws from
 *  the three singular persons and a known one draws from all six. The card earns
 *  the harder forms rather than being handed them. */
export function pickPersonIndex(status: Status, rnd: () => number = Math.random): number {
  return Math.floor(rnd() * (status === 'known' ? 6 : 3));
}
export function ConjItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const conj = useMemo(() => conjugate(word.term), [word.id]);
  const data = useMemo(() => {
    const tense = pickFocused(TENSES, focusTense());
    const pIdx = pickPersonIndex(statusOf(id('conj', word)));
    const formOf = (c: typeof conj, idx: number) => tense.key === 'pp' ? c.partizip : c[tense.key][idx];
    const answer = formOf(conj, pIdx);
    // The header names the tense (and opens its rule), so the kicker carries only
    // the person — it used to repeat the tense the header had just stated.
    const kicker = tense.key === 'pp' ? 'Partizip II' : PRONOUN[PERSONS_I[pIdx]];
    // Distractors stay in the SAME tense — the verb’s other persons first, then
    // other verbs' same tense/person — so a phrasal answer (Perfekt / Futur I /
    // Konjunktiv II) isn’t given away by being the only multi-word option.
    const otherPersons = tense.key === 'pp' ? [] : conj[tense.key].filter((_, idx) => idx !== pIdx);
    let distract = pickN(otherPersons, 3, new Set([norm(answer)]));
    if (distract.length < 3) {
      const others = conjPool().filter((w) => w.id !== word.id).slice(0, 16)
        .map((w) => formOf(conjugate(w.term), pIdx));
      distract = distract.concat(pickN(others, 3 - distract.length, new Set([norm(answer), ...distract.map(norm)])));
    }
    // The paradigm for the reveal. Partizip II is a single form, so there is no
    // six-person table behind it — the Perfekt one is what teaches it.
    const paradigm = tense.key === 'pp'
      ? { label: 'Perfekt · all persons', rows: paradigmRows(conj.perfekt) }
      : { label: `${tense.label} · all persons`, rows: paradigmRows(conj[tense.key]) };
    return { ...buildMC(answer, distract), verb: stripArticle(word.term), kicker, tense, paradigm };
  }, [word.id]);
  return <MCItem prompt={data.verb} sub={data.kicker} hint={word.en} options={data.options} correct={data.correct}
    extra={`Hilfsverb: ${conj.aux}${conj.separable ? ` · trennbar (${conj.separable}-)` : ''}`}
    rulePoint={TENSE_POINT[data.tense.key]} ruleLabel={data.tense.label}
    reveal={{ paradigm: data.paradigm }} mode="conj" onGrade={onGrade} />;
}

export function ClozeItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const surface = stripArticle(word.term);
  const ex = clozeExample(word)!;
  const re = wholeWordRe(surface);
  const m = re.exec(ex.de);
  const target = m ? m[1] : surface;
  const blanked = ex.de.replace(re, '_____');
  const mc = useMemo(() => {
    // Prefer same-part-of-speech words closest in length to the answer, so the
    // options read as genuine candidates rather than the one word that fits.
    const samePos = WORDS.filter((w) => w.pos === word.pos && w.id !== word.id && inLevels(w));
    let base: Word[];
    if (samePos.length >= 6) {
      const tl = target.length;
      base = [...samePos].sort((a, b) => Math.abs(stripArticle(a.term).length - tl) - Math.abs(stripArticle(b.term).length - tl)).slice(0, 24);
    } else {
      base = WORDS.filter((w) => w.id !== word.id && inLevels(w));
    }
    const distract = pickN(base.map((w) => matchInitialCase(target, surface, stripArticle(w.term))), 3,
      new Set([norm(target)]));
    return buildMC(target, distract);
  }, [word.id]);
  return <MCItem prompt={blanked} sub="Choose the missing word" hint={ex.en || word.en} bigPrompt={false}
    options={mc.options} correct={mc.correct} ruleLabel={MODE_TAG.cloze} mode="cloze" onGrade={onGrade} />;
}

// ---- production drills (reuse the authored-exercise widgets) --------------
/** Sentence builder over the card’s own example sentence — no new content
 *  needed, and real sentences carry real V2 / verb-final word order. */
export function OrderWordItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const ex = useMemo(() => {
    const src = orderExample(word);
    return {
      kind: 'order' as const,
      prompt: src?.en || `A sentence with „${stripArticle(word.term)}“`,
      tiles: orderTokens(src?.de),
      de: src?.de,
    };
  }, [word.id]);
  // The rule for *this sentence*, not for the mode. See orderPoint.
  return <OrderItem ex={ex} onGrade={onGrade} rulePoint={orderPoint(ex.de)} ruleLabel={MODE_TAG.order} />;
}

/** Kasus: declined articles & weak adjective endings in case-forcing frames. */
export function CaseItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const d = useMemo(() => buildCaseItem(word), [word.id]);
  return <MCItem prompt={d.prompt} sub={d.sub} hint={word.en} bigPrompt={false}
    options={d.options} correct={d.correct}
    extra={<><GenderTerm term={word.term} gender={word.gender} /> · {d.why} → {d.answer}</>}
    // The case is the question; the article is only how it is spelled here.
    askedLabel={d.kase}
    rulePoint={CASE_POINT[d.kase]} ruleLabel={CASE_LABEL[d.kase]} mode="case" onGrade={onGrade} />;
}

/** Tense transformation, typed: „ich mache“ → Perfekt. Production, not
 *  recognition — the other half of the conjugation drill. */
export function TransformItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const built = useMemo(() => {
    const t = pickFocused(TRANSFORM_TARGETS, focusTense());
    const pIdx = pickPersonIndex(statusOf(id('transform', word)));
    const { prompt, accept, hints } = buildTransform(word.term, pIdx, t.key, t.label);
    return { ex: { kind: 'type' as const, prompt, accept, hints, explain: word.en }, target: t };
  }, [word.id]);
  // The header names the tense this card asks for and opens *that* rule — the
  // whole point of TENSE_POINT. It used to read "Tense transformation" and open
  // Perfekt whatever the prompt said.
  return <TypeItem ex={built.ex} onGrade={onGrade}
    rulePoint={TENSE_POINT[built.target.key]} ruleLabel={built.target.label} />;
}

/** Separable verbs, typed. Three shapes drawn per card, because the system is that
 *  the prefix *moves*: off to the end in the present, around -ge- in the participle,
 *  and nowhere at all in the Perfekt's auxiliary construction. */
export function SeparableItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const built = useMemo(() => {
    const shapes: SepShape[] = ['praesens', 'praesens', 'partizip', 'perfekt'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const pIdx = pickPersonIndex(statusOf(id('separable', word)));
    const { prompt, accept, hints, reveal, label } = buildSeparable(word.term, shape, pIdx);
    return { ex: { kind: 'type' as const, prompt, accept, hints, reveal, explain: word.en }, label };
  }, [word.id]);
  return <TypeItem ex={built.ex} onGrade={onGrade}
    rulePoint={modeRulePoint('separable')} ruleLabel={built.label} />;
}

/** Reflexive verbs, typed. The error this catches is omission: an English speaker
 *  says "I remember" and writes „ich erinnere“, because English has no pronoun
 *  there to forget. */
export function ReflexiveItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const built = useMemo(() => {
    const shape = Math.random() < 0.65 ? 'praesens' as const : 'perfekt' as const;
    const pIdx = pickPersonIndex(statusOf(id('reflexive', word)));
    const { prompt, accept, hints, reveal, label } = buildReflexive(word.term, shape, pIdx);
    return { ex: { kind: 'type' as const, prompt, accept, hints, reveal, explain: word.en }, label };
  }, [word.id]);
  return <TypeItem ex={built.ex} onGrade={onGrade}
    rulePoint={modeRulePoint('reflexive')} ruleLabel={built.label} />;
}

/** Recall — the English gloss is the prompt, the German is the answer.
 *
 *  The only drill in the app that asks the learner to *produce* a word rather than
 *  recognise, transform or transcribe one. For a noun the article is part of the
 *  answer: "Tisch" is not knowing the word, and the whole reason German nouns are
 *  hard is the three-way article that English has no slot for.
 *
 *  Grading is `TypeItem`'s, unchanged — umlaut-folded, typo-tolerant only when the
 *  near-miss is not itself a real German word, with the drifted spelling named
 *  rather than silently forgiven. The card's own example is withheld until after
 *  the answer, because it contains the target. */
export function RecallItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const ex = useMemo(() => ({
    kind: 'type' as const,
    prompt: word.en,
    // Only the canonical form is accepted. The pool gate guarantees no *other*
    // card answers this gloss, so there is no correct German being marked wrong —
    // see `recallSafe`.
    accept: [word.term],
    hints: recallHints(word),
    // Shown after grading: the sentence is the payoff, and before grading it
    // would print the answer.
    explain: word.ex[0]?.de ? `${word.ex[0].de} — ${word.ex[0].en}` : undefined,
  }), [word.id]);

  return (
    <>
      <p className="text-2xs text-dim text-center mb-2">
        {word.gender
          ? 'Type the German — with its article'
          : 'Type the German'}
      </p>
      <TypeItem ex={ex} onGrade={onGrade} promptLang="en"
        noteFor={(typed, ok) => (ok ? undefined : articleMiss(typed, word) ?? undefined)}
        rulePoint={word.gender ? modeRulePoint('gender') : null}
        ruleLabel={MODE_TAG.recall} />
    </>
  );
}

/** Diktat — hear a sentence, write it.
 *
 *  The only writing in the app, and the only drill where spelling is unavoidable:
 *  umlauts, capitalisation, and where the words break. Graded exactly, because the
 *  target is known to the character — and umlaut-tolerantly, like every other typed
 *  answer, so „schoen“ is a near miss that gets named rather than a failure.
 *
 *  The sentence is never shown before answering. It is spoken on mount and can be
 *  replayed as often as the learner likes — replaying is not cheating, it is the
 *  exercise — and there is an escape for a device whose speech doesn't work, which
 *  reveals the text and grades the attempt as unknown rather than stranding them. */
export function DictationItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const src = drillExample(word, dictatable);
  const sentence = src?.de ?? '';
  const gloss = src?.en ?? '';
  const [gaveUp, setGaveUp] = useState(false);

  // Speak on arrival: the prompt *is* the audio, so waiting for a tap would leave
  // the learner staring at an empty box wondering what the exercise is.
  useEffect(() => { if (sentence) speak(sentence); }, [sentence]);

  const ex = useMemo(() => ({
    kind: 'type' as const,
    prompt: '',                       // the audio is the prompt
    accept: [sentence],
    hints: [
      `${sentence.split(/\s+/).length} words`,
      `Starts with „${sentence.split(/\s+/)[0]}“`,
      hintText(sentence, 3),
    ],
    explain: gloss,
  }), [sentence, gloss]);

  if (!sentence) return null;
  return (
    <>
      <DrillHeader pointRef={null} label={MODE_TAG.dictation} />
      <div className="flex flex-col items-center gap-2 mb-3">
        <button onClick={() => speak(sentence)}
          className="grid place-items-center w-16 h-16 rounded-full bg-panel border border-line text-amber
            hover:bg-panel2 active:scale-95 transition-transform"
          aria-label="Play the sentence again">
          <Volume2 size={26} />
        </button>
        <p className="text-2xs text-dim">Play as often as you like — that’s the exercise</p>
        {gaveUp
          ? <p lang="de" className="text-sm text-txt mt-1">{sentence}</p>
          : <button onClick={() => setGaveUp(true)} className="text-2xs text-dim hover:text-amber underline underline-offset-2">
              Can’t hear it? Show the sentence
            </button>}
      </div>
      <TypeItem key={word.id} ex={ex} onGrade={(ok) => onGrade(ok && !gaveUp)} />
    </>
  );
}

/** The drill surface. Same material as the flip card — an exercise is the same
 *  kind of object as a card, so it gets the card ground, grain and radius rather
 *  than looking like another panel in the chrome. */
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-line rounded-lg p-6 sm:p-8">{children}</div>;
}
function Prompt({ children, small, gloss, big = true }: { children: React.ReactNode; small?: string; gloss?: string; big?: boolean }) {
  return (
    <div className="text-center mb-5">
      {small && <div className="text-2xs text-amber font-mono uppercase tracking-widest mb-2 font-semibold">{small}</div>}
      {/* `.headword` (Fraunces) was scoped to the flip faces — two lines per screen,
          on the app's only warm typeface. The German being *tested* is a headword
          too, so an exercise prompt now reads as the subject of the app rather than
          as data inside it. `lang="de"` for the same reason it's on the flip. */}
      <div lang="de" className={`headword font-bold leading-snug ${big ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>{children}</div>
      {gloss && <p className="text-dim text-xs mt-2">{gloss}</p>}
    </div>
  );
}
function Empty() {
  return (
    <Surface pad="none" className="px-8 py-12 text-center">
      <h2 className="text-xl font-bold mb-1">Nothing queued</h2>
      <p className="text-dim">No items due in this drill for the selected levels. Try another mode or widen your CEFR filter.</p>
    </Surface>
  );
}
function Summary({ done, correct }: { done: number; correct: number }) {
  return (
    <div className="grid place-items-center pt-4">
      <SessionRecap title="Drill complete" data={{ drills: done, drillsCorrect: correct, streak: streak() }} />
    </div>
  );
}
