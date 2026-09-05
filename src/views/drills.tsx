// The word-fact drills — four of them, generated from lexicon fields.
//
// ## The ruling this file is the result of (2026-09-05)
//
// There were eleven modes. Seven of them tested **rules of the language** —
// conjugation, cloze, word order, tense transformation, Kasus, separable and
// reflexive verbs — and they went, with the 140-point grammar syllabus, the rule
// panels and the linked/remedy machinery that fed them. See docs/VISION.md.
//
// **A drill earns its place here if it tests a property of the word.** That is
// the whole rule, and it is not a compromise: in German a noun without its
// gender and its plural is a half-learned word, so *der Tisch → die Tische* is
// vocabulary, not grammar. What is left:
//
//   gender  der / die / das — the single most useful mark on a German card
//   plural  die Tische, not die Tischen
//   recall  English in, German out. The productive half of knowing a word.
//
// All three are the *same word* asked in a different direction; that is what
// makes them interleave usefully with the flip rather than duplicating it.
//
// **Diktat went on 2026-09-05.** Hear a sentence, type it — the only drill that
// forced spelling, and the only one whose unit was a *sentence* rather than a
// word. That is what decided it: on a feed-first vocabulary app the sentence is
// the odd one out, and a drill that fails when the device's speech synthesis is
// unavailable is a drill that fails silently for a fraction of learners. Its
// machinery is still here — `dictatable` and `drillExample` gate which sentences
// are usable, and `TypeItem` is what recall types into — so bringing it back is
// re-adding one item component and one line in three lists.
//
// Every drilled unit gets its own FSRS card under `gym:<mode>:<wordId>`, so
// recognising a word and producing it schedule apart. NOTE: the `gym:` prefix is
// a storage namespace and is deliberately NOT renamed — existing schedules
// depend on it.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CircleDot, Layers3, PenLine, Venus, Mars, Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { conjugate, canConjugate } from '../lib/conjugate.ts';
import { pluralForm } from '../lib/matcher.ts';
import { cardOf, review, levels, logMiss, logAttempt, streak, statusOf, type MissDetail } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue, Rating } from '../srs.ts';
import { haptic, tick } from '../lib/ui.ts';
import { lookupSurface } from '../lib/surface.ts';
import UmlautBar from '../components/UmlautBar.tsx';
import { GenderTerm } from '../components/Reveal.tsx';
import SessionRecap from '../components/SessionRecap.tsx';
import Surface from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import type { Word, Example } from '../types.ts';

export type Mode = 'gender' | 'plural' | 'recall' | 'reverse' | 'cloze' | 'usage' | 'conjugate' | 'degree' | 'synonym';

/** How every drill item reports its result.
 *
 *  `detail` is the confusion — what the item asked for and what was picked —
 *  supplied by the multiple-choice items, which know both at the moment they
 *  grade. Optional because the typed items have nothing comparable to offer: a
 *  free-text answer is not a choice between named alternatives. */
export type Grade = (ok: boolean, detail?: MissDetail) => void;

/** The headword without its article — *Hose*, not *die Hose*.
 *
 *  Exported because it is a *correctness* rule and not a formatting one: the
 *  article is one of the things these drills ask for, so any surface that prints
 *  the word while a gender question is pending has to strip it or it is printing
 *  the answer. `WordDrill`'s header is the second caller. */
export const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '');
/** Case/whitespace-insensitive. */
const canon = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
/** Additionally folds umlauts and ß, so "schoen" matches "schön". A norm-only
 *  match is a *near miss* — right word, spelling drifted — surfaced
 *  supportively rather than graded wrong. */
const norm = (s: string) => canon(s)
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// ---- typed-answer grading -------------------------------------------------
// Lifted intact from the retired grammar drill, which is where it was written
// and where three of these functions already had their own tests.

/** One insertion, deletion or substitution apart? */
function editDistance1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return false;
  if (a.length === b.length) {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 1) return false;
    return d === 1;
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  let i = 0, j = 0, d = 0;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) { i++; j++; } else if (++d > 1) return false; else j++;
  }
  return true;
}

/** Was this a slipped finger rather than a wrong answer?
 *
 *  Blanket edit-distance-1 tolerance is unusable here, and not marginally: 25% of
 *  the corpus's typed targets have *another real German word* one edit away, and
 *  they are concentrated in exactly the vocabulary a beginner is drilling —
 *  Mutter/Butter, Haus/Hals, Brot/Boot, Uhr/Ohr, Zeit/weit, Kind/Kino. Accepting
 *  "Butter" for "Mutter" would not be kindness; it would be teaching the wrong
 *  word and calling it right.
 *
 *  So the tolerance is guarded: one edit *and* what they typed is not itself a
 *  German word the app knows — which is what the surface index is for, because it
 *  recognises inflections and not only headwords. The learner is still told,
 *  because an error forgiven silently is how it sets. */
export function isTypoFor(typed: string, accept: string[]): boolean {
  const t = norm(typed);
  if (t.length < 4) return false;                 // too short for one edit to be evidence
  if (lookupSurface(typed.trim())) return false;  // a real word is a real answer
  return accept.some((a) => editDistance1(t, norm(a)));
}

/** Name the spelling that drifted on a near miss.
 *
 *  Grading folds ä/ö/ü/ß to their ASCII digraphs so "schoen" is accepted for
 *  "schön" — right, because the learner knew the word. But "Right — just the
 *  spelling: schön" never says *which* part was the spelling, and a learner who
 *  types "schoen" every time is never told. Forgiving an error silently is how it
 *  becomes permanent.
 *
 *  Returns the substitutions actually needed, e.g. "oe → ö". Null when the two
 *  differ some other way (case, spacing), where there is no lesson to name. */
export function spellingDiff(typed: string, canonical: string): string | null {
  const PAIRS: [string, string][] = [['ae', 'ä'], ['oe', 'ö'], ['ue', 'ü'], ['ss', 'ß']];
  const t = canon(typed), c = canon(canonical);
  const found = PAIRS.filter(([ascii, real]) => c.includes(real) && t.includes(ascii));
  if (!found.length) return null;
  return found.map(([ascii, real]) => `${ascii} → ${real}`).join(', ');
}

/** Word-by-word alignment of what was typed against the answer, for reading back
 *  a miss. Umlaut-folded, because the fold is what makes „moechte“ acceptable —
 *  marking it red would contradict the grade just given. */
export function typedDiff(typed: string, answer: string): { text: string; ok: boolean }[] {
  const t = typed.trim().split(/\s+/).filter(Boolean);
  const a = answer.trim().split(/\s+/).filter(Boolean);
  return t.map((w, i) => ({ text: w, ok: i < a.length && norm(w) === norm(a[i]) }));
}

/** Progressive hint ladder: shape → first letter → first half. A graceful path
 *  between a blind guess and giving up; taking a hint never changes the grade. */
export function hintText(answer: string, level: number): string {
  const words = answer.split(/\s+/).filter(Boolean);
  if (level <= 1) return words.length > 1
    ? `${words.length} words · ${answer.replace(/\s+/g, '').length} letters`
    : `${answer.length} letters`;
  if (level === 2) return `starts with “${answer[0]}”`;
  return `“${answer.slice(0, Math.ceil(answer.length / 2))}…”`;
}

// ---- eligibility ----------------------------------------------------------

/** A plural the drill may ask for: a full „die …“ form, never a marker or a
 *  shorthand. */
export function askablePlural(w: Word): string | null {
  const p = (w.plural ?? '').trim();
  return /^(der|die|das)\s+[A-Za-zÄÖÜäöüß]/.test(p) ? p : null;
}

function escapeReg(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Match a German surface form as a whole word, with a boundary that understands
 *  German letters. JavaScript's `\b` is ASCII-only, so `/\bgroß\b/` cannot match
 *  "groß" at all — 135 cards including groß, Fuß, weiß, süß, Übung and Öl were
 *  silently ineligible before this. Unicode property escapes hold. */
export function wholeWordRe(surface: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(${escapeReg(surface)})(?![\\p{L}\\p{N}])`, 'iu');
}

/** Which of a card's examples a drill should use.
 *
 *  The flip face always shows `ex[0]`, and an interleaved drill lands about three
 *  items after its word's flip — so a drill built on `ex[0]` asks the learner to
 *  reconstruct a sentence they have just finished reading. Prefer a later
 *  example; fall back to `ex[0]` only when there is nothing else. */
export function drillExample(w: Word, ok: (de: string) => boolean): Example | null {
  const ex = w.ex ?? [];
  for (let i = 1; i < ex.length; i++) if (ex[i]?.de && ok(ex[i].de)) return ex[i];
  return ex[0]?.de && ok(ex[0].de) ? ex[0] : null;
}

/** Whether a sentence could be dictated: long enough to require holding a clause
 *  in your head, short enough to type on a phone before the audio goes stale, and
 *  free of anything nobody could spell from hearing it once.
 *
 *  Nothing in the app calls this any more — the Diktat drill it gated went on
 *  2026-09-05 — but it is the only place these thresholds are written down, and
 *  it is what the drill's return would be built on. Kept, and tested. */
export function dictatable(de?: string): boolean {
  if (!de) return false;
  const t = de.trim();
  if (t.length < 12 || t.length > 70) return false;
  const words = t.split(/\s+/).length;
  if (words < 3 || words > 9) return false;
  return !/[0-9(){}[\]<>«»„"]|\b[A-ZÄÖÜ]{2,}\b/.test(t);
}

// ---- recall: the productive direction -------------------------------------
// Every other track shows German and asks what it means, so `known` measures
// *recognition* on every card, always — a learner can hold 2,000 known words and
// produce none of them. This mode is the other direction: the English gloss is
// the prompt, the German is the answer, typed, with the article for nouns
// because the article is most of what "knowing a German noun" means.
//
// ## The gate, and why it is deliberately strict
//
// Reversing a gloss is not symmetrical with reading one. "die Sprache → language"
// is always fair; "language → ?" is only fair when exactly one German card
// answers it. Three ways it can be unfair, all excluded:
//
//   1. **The gloss is a list.** "station, depot, terminus" gives no way to know
//      which word is wanted.
//   2. **The gloss is transparent.** "hotel" → `das Hotel` tests confidence.
//   3. **Two cards share the gloss.** `table` is *der Tisch* **and** *die
//      Tabelle*. Marking *die Tabelle* wrong would be the one thing this
//      codebase never does — render a verdict that is itself wrong German.
const glossKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const GLOSS_IS_LIST = /[,;/]|\bor\b/;

/** Cards per gloss, used only to find collisions. Keyed on `WORDS.length` rather
 *  than built once: the lexicon grows at runtime, and a stale entry's failure
 *  mode is marking correct German wrong. */
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

/** Does this card's English gloss point back at exactly one German answer? */
export function recallSafe(w: Word): boolean {
  if (w.kind !== 'word' || !w.en || !w.term) return false;
  if (GLOSS_IS_LIST.test(w.en)) return false;
  if (glossKey(stripArticle(w.term)) === glossKey(w.en)) return false; // transparent
  return glossCount(w.en) === 1;
}

/** Did the learner produce the right noun and the wrong article — or none?
 *
 *  Graded wrong either way: in German the article is not an accessory to the
 *  noun. But *wrong for a nameable reason* is a different message from "no", and
 *  the app already knows which one this is. Null when this isn't what happened,
 *  so an actually-wrong word is never excused. */
export function articleMiss(typed: string, w: Word): string | null {
  if (!w.gender) return null;
  const bare = norm(stripArticle(w.term));
  const t = norm(typed);
  if (t === bare) return `The word is right — German needs the article: ${w.term}.`;
  const m = /^(der|die|das)\s+(.*)$/.exec(t);
  if (m && m[2] === bare) return `Right word, wrong gender: it is ${w.term}, not „${typed.trim()}“.`;
  return null;
}

/** The hint ladder for a recall card. Deliberately not `hintText`'s generic
 *  shape → letter → half: for a noun the most useful first rung is the
 *  **gender**, because a learner who has the word but not the article has a
 *  different problem from one who has neither. The article is never given away —
 *  "feminine" still requires knowing that feminine means *die*. */
export function recallHints(w: Word): string[] {
  const bare = stripArticle(w.term);
  const GENDER_WORD: Record<string, string> = { der: 'masculine', die: 'feminine', das: 'neuter' };
  const first = w.gender
    ? `${GENDER_WORD[w.gender]} · ${bare.length} letters`
    : `${w.pos || 'word'} · ${bare.length} letters`;
  return [first, `starts with “${bare[0]}”`, `“${bare.slice(0, Math.ceil(bare.length / 2))}…”`];
}

// ---- pools (lazy, level-filtered at use) ----------------------------------
function inLevels(w: Word) { return levels().has(w.level); }
const genderPool = () => WORDS.filter((w) => w.kind === 'word' && w.gender && inLevels(w));
const pluralPool = () => WORDS.filter((w) => w.kind === 'word' && askablePlural(w) && inLevels(w));
const recallPool = () => WORDS.filter((w) => inLevels(w) && recallSafe(w));

/** FSRS card id for a word's drill in a given mode. */
export const gymId = (m: Mode, w: Word) => `gym:${m}:${w.id}`;

/** Drill modes a single word qualifies for **in a scheduled session**.
 *
 *  Deliberately still the original three. These are the modes with their own
 *  pools, their own FSRS tracks and their own place in `buildMixedSession`, and
 *  widening this is not free: `reverse` and `cloze` apply to every card, so
 *  adding them here weaves a drill into every flip and turns a forty-item day
 *  into mostly drills. The bank belongs to the thing the learner *asked* for.
 *
 *  See `practiceModes` for the other half of the split. */
export function eligibleModes(w: Word): Mode[] {
  const out: Mode[] = [];
  if (w.kind === 'word' && w.gender) out.push('gender');
  if (w.kind === 'word' && askablePlural(w)) out.push('plural');
  // Recall is the one mode gated on the learner rather than on the card.
  //
  // Producing a word requires a form–meaning link that recognising it builds, so
  // asking for production before that link exists is not a desirable difficulty
  // — it is a retrieval attempt on something not yet encoded, and it returns a
  // failure and an FSRS lapse for a word the learner never had. A word becomes
  // eligible for recall only once its *flip* card has reached Review.
  //
  // Choosing the Recall drill by name bypasses this: asking for a thing is the
  // licence for it.
  if (recallSafe(w) && statusOf(w.id) === 'known') out.push('recall');
  return out;
}

/** Everything a word can be practised with when somebody has asked for it.
 *
 *  The scheduler's three plus the five that only make sense on demand. Split
 *  from `eligibleModes` because the two answer different questions: *what should
 *  ride along in today's queue* and *what can I do with this word right now*.
 *  Merging them was tried and it flooded the session — every card qualifies for
 *  `reverse` and `cloze`, so every flip grew a drill.
 *
 *  `attested` is the Wiktionary inflection table for this card, when it has
 *  loaded. `degree` and the sentence gap both need real forms and neither is
 *  offered without them; absent, the word simply qualifies for fewer things. */
export function practiceModes(w: Word, attested: string[] = []): Mode[] {
  const out: Mode[] = ['reverse'];
  // The gap when it can be found, and recognising the sentence when it cannot —
  // between them every card has a third exercise.
  if (clozeParts(w, attested)) out.push('cloze'); else out.push('usage');
  if (w.kind === 'word' && w.gender) out.push('gender');
  if (w.kind === 'word' && askablePlural(w)) out.push('plural');
  if (w.pos === 'verb' && canConjugate(stripArticle(w.term))) out.push('conjugate');
  if (w.pos === 'adjective' && attested.length > 0) out.push('degree');
  if (w.syn.some((t) => /^(der |die |das )?[A-Za-zÄÖÜäöüß-]+$/.test(t))) out.push('synonym');
  // Production last and gated exactly as the scheduler gates it: asking for a
  // word cold before the form–meaning link exists is a lapse on nothing.
  if (recallSafe(w) && statusOf(w.id) === 'known') out.push('recall');
  return out;
}

/** The label a miss is logged under — the blind-spot table's key. */
export const MODE_TAG: Record<Mode, string> = {
  gender: 'Gender (der/die/das)',
  plural: 'Noun plurals',
  recall: 'Recall (English → German)',
  reverse: 'Recognition (English → German)',
  cloze: 'The word in a sentence',
  usage: 'Where the word belongs',
  conjugate: 'Verb forms',
  degree: 'Comparative and superlative',
  synonym: 'Words that mean the same',
};

export const MODES: { m: Mode; label: string; icon: LucideIcon; desc: string }[] = [
  { m: 'gender', label: 'der / die / das', icon: CircleDot, desc: 'Nail the gender of every noun.' },
  { m: 'plural', label: 'Plurals', icon: Layers3, desc: 'Pick the right plural.' },
  { m: 'recall', label: 'Recall', icon: PenLine, desc: 'English in, German out — with the article. The half of knowing a word that recognition never proves.' },
];

/** Words for a mode, due-first then unseen, shuffled within each band. */
function queue(mode: Mode): Word[] {
  const pool = mode === 'gender' ? genderPool() : mode === 'plural' ? pluralPool() : recallPool();
  const now = Date.now();
  const due: Word[] = [], fresh: Word[] = [];
  for (const w of pool) {
    const c = cardOf(gymId(mode, w));
    if (!c) fresh.push(w);
    else if (isDue(c, now)) due.push(w);
  }
  return [...shuffle(due), ...shuffle(fresh)].slice(0, 20);
}

/** One drill, played to completion. Reached by name from Blind spots — the only
 *  place in the app that says "you keep getting this wrong", and therefore the
 *  only place that has earned the right to offer a run of it. */
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
    review(gymId(mode, word), ok ? Rating.Good : Rating.Again);
    haptic(ok ? 'grade' : 'wrong');
    tick(ok ? 'good' : 'wrong');
    logAttempt(MODE_TAG[mode]);
    if (!ok) logMiss(MODE_TAG[mode], word.term, detail);
    setDone((d) => d + 1); setCorrect((c) => c + (ok ? 1 : 0)); setI((n) => n + 1);
  }, [word, mode]);

  const title = MODES.find((m) => m.m === mode)?.label ?? MODE_TAG[mode];
  if (q.length === 0) return <Shell title={title} onExit={onExit}><Empty /></Shell>;
  if (!word) return <Shell title={title} onExit={onExit}><Summary done={done} correct={correct} /></Shell>;

  return (
    <Shell title={title} onExit={onExit} progress={`${done}/${q.length}`} score={done ? Math.round((correct / done) * 100) : null}>
      {mode === 'gender' && <GenderItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'plural' && <PluralItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'recall' && <RecallItem key={word.id} word={word} onGrade={advance} />}
    </Shell>
  );
}

function Shell({ children, title, onExit, progress, score }: {
  children: React.ReactNode; title: string; onExit: () => void; progress?: string; score?: number | null;
}) {
  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <IconButton label="Back" pull onClick={onExit}><ArrowLeft size={18} /></IconButton>
        <span className="text-base font-semibold ml-1.5 truncate">{title}</span>
        {progress && <span className="text-xs text-dim font-mono ml-1.5 flex-shrink-0">{progress}</span>}
        {score !== null && score !== undefined && <span className="ml-auto text-xs font-mono text-green flex-shrink-0">{score}% correct</span>}
      </div>
      {children}
    </div>
  );
}

// ---- the four items -------------------------------------------------------

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
    // is the shape of a learner's gender error.
    setTimeout(() => onGrade(g === word.gender, { asked: word.gender ?? '', chose: g }), 750);
  };
  return (
    <Card>
      <Prompt small="Which article goes with it?" gloss={word.en}>{stripArticle(word.term)}</Prompt>
      <div className="grid grid-cols-3 gap-2.5">
        {GENDER.map(({ g, color }) => {
          const state = !picked ? 'idle' : g === word.gender ? 'right' : g === picked ? 'wrong' : 'idle';
          return (
            <button key={g} onClick={() => choose(g)} disabled={!!picked}
              className={`rounded-md py-4 font-bold text-xl border transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt'
                : 'bg-panel2 border-line hover:border-accent'}`}
              style={state === 'idle' ? { color } : undefined}>
              {g}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

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

/** Plausible wrong plural forms of one noun: the common German plural patterns
 *  applied to the singular. The caller excludes the correct form. */
function pluralVariants(singular: string): string[] {
  const endsE = /e$/i.test(singular);
  const stem = endsE ? singular.slice(0, -1) : singular;
  const us = umlaut(stem);
  return [endsE ? singular + 'n' : singular + 'e', stem + 'en', stem + 'er', stem + 's', us + 'e', us + 'er', umlaut(singular), singular];
}

function MCItem({ prompt, sub, hint, options, correct, askedLabel, optLang = 'de', big = false, onGrade }: {
  prompt: React.ReactNode; sub?: string; hint?: string; options: string[]; correct: number;
  /** Display size for the prompt. Small by default: a plural or a gender item
   *  prints the word *and* four German forms, and two display sizes in one card
   *  is a card with two subjects. The meaning item has only the word. */
  big?: boolean;
  /** Name the thing being asked for, when it is not the correct option itself. */
  askedLabel?: string;
  /** What language the *options* are in. Every drill here but one asks for German
   *  back, so `de` is the default — but `lang` is not decoration: it is what
   *  decides which voice reads the option aloud and which hyphenation and quote
   *  rules apply to it, and English glosses marked as German get both wrong. */
  optLang?: 'de' | 'en';
  onGrade: Grade;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const settle = (i: number) => onGrade(i === correct, { asked: askedLabel ?? options[correct], chose: options[i] });
  useChoiceKeys({
    count: options.length,
    answered: picked !== null,
    onPick: setPicked,
    onNext: () => picked !== null && settle(picked),
  });
  return (
    <Card>
      <Prompt small={sub} gloss={hint} big={big}>{prompt}</Prompt>
      <div className="grid gap-2.5">
        {options.map((o, i) => {
          const state = picked === null ? 'idle' : i === correct ? 'right' : i === picked ? 'wrong' : 'idle';
          return (
            <button key={i} onClick={() => picked === null && setPicked(i)} disabled={picked !== null}
              className={`rounded-md py-3.5 px-4 border text-base text-center transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green font-semibold'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt'
                : 'bg-panel2 border-line hover:border-accent'}`}>
              {/* The key that picks this option, so the shortcut is discoverable
                  rather than folklore. Hidden on touch. */}
              <kbd aria-hidden className="hidden sm:inline-block font-mono text-2xs text-dim mr-2 tabular-nums">{i + 1}</kbd>
              {/* icon + colour: right/wrong never rides on colour alone */}
              {state === 'right' && <Check size={14} className="inline -mt-0.5 mr-1.5" />}
              {state === 'wrong' && <X size={14} className="inline -mt-0.5 mr-1.5" />}
              <span lang={optLang}>{o}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={() => settle(picked)}>Next →</Button></div>}
    </Card>
  );
}

export function PluralItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  // Always a full "die …" form: `askablePlural` is both the pool's gate and
  // eligibility's, so the item cannot be reached with a marker or a shorthand.
  const correct = askablePlural(word)!;
  const singular = stripArticle(word.term);
  const mc = useMemo(() => {
    // Near-miss plurals of the *same* noun, so every option is a `die …` form of
    // the word being asked about — there is no shape to pick the answer on.
    let distract = pickN(pluralVariants(singular), 3, new Set([norm(stripArticle(correct))])).map((n) => `die ${n}`);
    if (distract.length < 3) {
      const pad = pluralPool().filter((w) => w.id !== word.id).map((w) => askablePlural(w)!);
      distract = distract.concat(pickN(pad, 3 - distract.length, new Set([norm(correct), ...distract.map(norm)])));
    }
    return buildMC(correct, distract);
  }, [word.id]);
  return <MCItem prompt={<GenderTerm term={word.term} gender={word.gender} />}
    sub="Which form is the plural?" hint={word.en} options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

/** German in, English out — recognition, asked as a choice.
 *
 *  ## Why this is not in `MODES`, and grades a different card
 *
 *  The other three drills each test a *fact about a word* and get their own FSRS
 *  card under `gym:<mode>:<id>`. This one tests the thing the **flip** tests —
 *  do you know what this word means — so it grades `word.id`, the flip's own
 *  card, and logs no miss, exactly as the flip logs none. Anything else would
 *  give one learner two independent schedules for one piece of knowledge.
 *
 *  It exists because of `WordDrill`: *drill this word* has to have an answer for
 *  every word, and `eligibleModes` returns nothing at all for a verb or an
 *  adjective the learner has not learned yet — no gender, no plural, and recall
 *  gated on the flip being known. Recognition is the drill that word needs, and
 *  it is the one that unlocks the rest.
 *
 *  There is no run of these in the drill picker, deliberately: a run of
 *  recognition items *is* a session, and Üben already builds a better one.
 *
 *  **A four-way choice is easier than the flip's self-report** — a guess is right
 *  one time in four. That is worth knowing and not worth fixing here: the flip's
 *  alternative is a learner grading themselves, which is not obviously stricter,
 *  and the distractors below are drawn from the same part of speech precisely so
 *  the shape of the options gives nothing away. */
export function MeaningItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const mc = useMemo(() => meaningOptions(word), [word.id]);

  // One real option and no distractors is not a question. Only reachable for a
  // part of speech with a single member, which the corpus does not currently
  // have — but a corpus is a moving thing and a 1-option quiz is a free pass.
  if (mc.options.length < 2) return null;

  // **The article is stripped, and that is not cosmetic.** `WordDrill` asks this
  // first and the gender item second, so a prompt reading a pink *die* Hose
  // prints the answer to the next question above the current one. `GenderItem`
  // strips for exactly the same reason; this matches it.
  return <MCItem prompt={stripArticle(word.term)} big
    sub="What does it mean?" options={mc.options} correct={mc.correct} optLang="en" onGrade={onGrade} />;
}

/** The four glosses, one of them right. Exported for the test that sweeps the
 *  whole corpus through it — the distractor rules below are the kind that hold
 *  for the first hundred words you try by hand and fail on the two hundredth. */
export function meaningOptions(word: Word): { options: string[]; correct: number } {
  // Two independent ways a "wrong" option can actually be right, and both have
  // to be closed or the drill punishes a learner for knowing more than the card:
  //
  //   the English side  *das Auto* "car" against a distractor "the car"
  //   the German side   *anfangen* "to start" against *beginnen* "to begin"
  //
  // `glossOverlap` closes the first by sharing a content word. It cannot close
  // the second — "start" and "begin" have no token in common — so the corpus's
  // own synonym field does, which is the only thing in the data that knows the
  // two German words mean the same thing.
  const syn = synKeys(word);
  const same = WORDS.filter((w) => w.kind === 'word' && w.id !== word.id
    && w.pos === word.pos && w.en
    && !glossOverlap(w.en, word.en)
    && !syn.has(canon(stripArticle(w.term)))
    && !synKeys(w).has(canon(stripArticle(word.term))));
  // Same band first, so the options are four words a learner of this level could
  // plausibly confuse — not one A1 noun among three C2 ones.
  const near = same.filter((w) => w.level === word.level);
  let distract = pickN(near.map((w) => w.en), 3, new Set([norm(word.en)]));
  if (distract.length < 3) {
    distract = distract.concat(
      pickN(same.map((w) => w.en), 3 - distract.length, new Set([norm(word.en), ...distract.map(norm)])),
    );
  }
  return buildMC(word.en, distract);
}

/** A card's synonyms, keyed the way a headword compares.
 *
 *  The field is written both ways round across the corpus — *der Name* lists
 *  *die Bezeichnung*, and plenty of cards list a synonym that does not list them
 *  back — so `meaningOptions` asks in both directions rather than trusting it to
 *  be symmetric. Articles are stripped because half the entries carry one. */
function synKeys(w: Word): Set<string> {
  return new Set(w.syn.map((t) => canon(stripArticle(t))));
}

/** Do two English glosses share a content word?
 *
 *  A distractor has to be *wrong*, and "the car" is not a wrong answer for *das
 *  Auto* just because the card says "car". Content words only: the function words
 *  are what every gloss shares, and matching on those would reject every
 *  candidate. This is a *lexical* test and makes no claim to catch synonymy with
 *  no word in common — see the note in `meaningOptions` for what does. */
export function glossOverlap(a: string, b: string): boolean {
  // Two letters is a content word here — *to go* against *to go out* is exactly
  // the pair this has to catch, and a length cutoff of 3 let it through. The
  // function words are named in the list instead, which is the only way that
  // does not also throw away `go`, `do`, `be` and `eat`.
  const words = (s: string) => new Set(
    s.toLowerCase().split(/[^a-zäöüß]+/).filter((t) => t.length > 1 && !GLOSS_STOP.has(t)));
  const A = words(a), B = words(b);
  for (const t of A) if (B.has(t)) return true;
  return false;
}

const GLOSS_STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'you', 'your',
  'something', 'someone', 'sth', 'sb', 'one', 'each', 'any', 'not',
  // Two-letter function words, listed rather than filtered by length. `out` and
  // `off` are deliberately *absent*: in an English gloss they are the particle
  // that distinguishes one German verb from another.
  'to', 'of', 'in', 'on', 'at', 'by', 'it', 'is', 'as', 'an', 'or', 'so', 'no', 'my',
]);

/** English in, German out — the productive direction, typed.
 *
 *  Nouns must carry the article, because that is what knowing a German noun
 *  means. Grading is umlaut-folded and typo-tolerant only when the near miss is
 *  not itself a real German word, with the drifted spelling named rather than
 *  silently forgiven. The card's own example is withheld until after the answer,
 *  because it contains the target. */
export function RecallItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const ex = useMemo(() => ({
    prompt: word.en,
    // Only the canonical form is accepted. The pool gate guarantees no *other*
    // card answers this gloss, so no correct German is being marked wrong.
    accept: [word.term],
    hints: recallHints(word),
    explain: word.ex[0]?.de ? `${word.ex[0].de} — ${word.ex[0].en}` : undefined,
  }), [word.id]);

  return (
    <>
      <p className="text-2xs text-dim text-center mb-2">
        {word.gender ? 'Type the German — with its article' : 'Type the German'}
      </p>
      <TypeItem ex={ex} onGrade={onGrade} promptLang="en"
        noteFor={(typed, ok) => (ok ? undefined : articleMiss(typed, word) ?? undefined)} />
    </>
  );
}

// ---- the rest of the bank --------------------------------------------------
//
// **Why these and not the grammar drills that were retired.**
//
// `docs/VISION.md` rules that a drill earns its place if it tests a *property of
// the word* and goes if it tests a *rule of the language*. That ruling stands,
// and it is what shapes this list rather than contradicting it:
//
//   reverse    which German word carries this meaning — the word's identity
//   cloze      the sentence this word actually lives in — its collocation
//   conjugate  *this verb's* forms, which in German is where irregularity lives
//   degree     *this adjective's* comparative — `gut → besser` is not a rule
//   synonym    what else the corpus says means this
//
// The ones that stayed retired are the ones that are the same for every word:
// adjective declension is `-e -em -en -er -es` on any stem, Kasus is a table, and
// drilling either teaches German grammar rather than this vocabulary. Conjugation
// is the interesting boundary and it lands inside, because *which* verb is strong
// is a fact about the verb and nothing else.
//
// Three of these apply to every card — meaning, reverse, cloze — which is what
// takes the floor from one exercise to three.

/** English in, German out, as a choice. The recognition half of `recall`.
 *
 *  Distinct from `recall` and deliberately duplicated in direction: recall is
 *  typed and gated on the word already being known, because production before
 *  the form–meaning link exists is a lapse on something never learned. Choosing
 *  from four has no such cost, so it can run on a word met a minute ago. */
export function ReverseItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const mc = useMemo(() => {
    const same = WORDS.filter((w) => w.kind === 'word' && w.id !== word.id && w.pos === word.pos
      && !glossOverlap(w.en, word.en) && !synKeys(word).has(canon(stripArticle(w.term))));
    const near = same.filter((w) => w.level === word.level);
    const pool = (near.length >= 3 ? near : same).map((w) => w.term);
    return buildMC(word.term, pickN(pool, 3, new Set([norm(word.term)])));
  }, [word.id]);
  if (mc.options.length < 2) return null;
  return <MCItem prompt={word.en} big sub="Which word is it?"
    options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

/** The card's own example with the word taken out.
 *
 *  Every card has an example, so this is the third universal exercise — and it
 *  is the only one that asks the word to do a job rather than sit in a list.
 *  The blank is found by matching the headword or one of its **attested**
 *  inflections, never by substring: «Er braut Bier» must not blank for *die
 *  Braut*, which is the same trap `headwordEvidence` was written for. */
export function clozeParts(word: Word, forms: string[]): { before: string; blank: string; after: string } | null {
  const de = word.ex[0]?.de;
  if (!de) return null;
  const bare = stripArticle(word.term).toLowerCase();
  const known = new Set([bare, ...forms.map((f) => f.toLowerCase())]);

  // **The attested table is not always there, and the example rarely uses the
  // bare headword.** An adjective turns up declined — *ein unbefristeter
  // Vertrag* — so with no forms loaded this found nothing and ten cards fell
  // below a three-exercise run. So the app's own generators fill in: regular
  // adjective endings, which are regular precisely because German makes them so,
  // and the conjugator for verbs. Both are the same machinery `matcher.ts` uses
  // to read a sentence, and neither is a substring test — a token still has to
  // *equal* a form we can name, which is what keeps «Er braut Bier» away from
  // *die Braut*.
  if (word.pos === 'adjective') {
    for (const suf of ['e', 'em', 'en', 'er', 'es', 'ere', 'eren', 'erer', 'eres', 'sten', 'ste']) {
      known.add(bare + suf);
    }
  } else if (word.pos === 'verb' && canConjugate(stripArticle(word.term))) {
    try {
      const c = conjugate(stripArticle(word.term));
      for (const f of [...c.praesens, ...c.praeteritum, c.partizip]) {
        if (f && !f.includes(' ')) known.add(f.toLowerCase());
      }
    } catch { /* the bare form is still in the set */ }
  } else if (word.pos === 'noun') {
    const pl = pluralForm(word.term, word.plural);
    if (pl) known.add(stripArticle(pl).toLowerCase());
  }
  // A German noun is always capitalised, so a lowercase token cannot be one —
  // the orthographic rule the authoring gate already leans on.
  const noun = word.pos === 'noun';
  for (const m of de.matchAll(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g)) {
    const tok = m[0];
    if (!known.has(tok.toLowerCase())) continue;
    if (noun && tok[0] !== tok[0].toUpperCase()) continue;
    return { before: de.slice(0, m.index), blank: tok, after: de.slice(m.index! + tok.length) };
  }
  return null;
}

export function ClozeItem({ word, forms, onGrade }: { word: Word; forms: string[]; onGrade: Grade }) {
  const parts = useMemo(() => clozeParts(word, forms), [word.id, forms]);
  const mc = useMemo(() => {
    if (!parts) return null;
    const same = WORDS.filter((w) => w.kind === 'word' && w.id !== word.id && w.pos === word.pos
      && w.level === word.level);
    const pool = same.map((w) => stripArticle(w.term));
    return buildMC(parts.blank, pickN(pool, 3, new Set([norm(parts.blank)])));
  }, [word.id, parts]);
  if (!parts || !mc || mc.options.length < 2) return null;
  return (
    <MCItem
      prompt={<span lang="de">{parts.before}<span className="text-accent">·····</span>{parts.after}</span>}
      sub="Which word fills the gap?" hint={word.ex[0]?.en}
      options={mc.options} correct={mc.correct} onGrade={onGrade} />
  );
}

/** Which sentence is this word's.
 *
 *  **The exercise that works when the gap cannot.** `cloze` needs to find a
 *  single token equal to the headword or one of its forms, which is impossible
 *  for the 212 cards whose headword is a phrase or a separable verb — *aus
 *  Holz*, *sich abwechseln*, *Es war einmal …* — because the thing being taught
 *  is not one token and, split across a clause, is not contiguous either.
 *
 *  Recognising the sentence a word lives in tests the same knowledge from the
 *  other end and needs no tokenising at all, so this is what puts a floor of
 *  three under *every* card rather than under 97% of them. The distractors are
 *  other cards' examples at the same level, so nothing is answerable on register
 *  or length. */
export function UsageItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const mc = useMemo(() => {
    const mine = word.ex[0]?.de;
    if (!mine) return null;
    const pool = WORDS
      .filter((w) => w.id !== word.id && w.level === word.level && w.ex[0]?.de
        // A distractor sentence must not itself contain the word, or there are
        // two right answers and the learner is marked wrong for finding one.
        && !new RegExp(`\\b${stripArticle(word.term).slice(0, 6)}`, 'i').test(w.ex[0].de))
      .map((w) => w.ex[0].de);
    const distract = pickN(pool, 3, new Set([norm(mine)]));
    if (distract.length < 2) return null;
    return buildMC(mine, distract);
  }, [word.id]);
  if (!mc) return null;
  return <MCItem prompt={<span lang="de">{stripArticle(word.term)}</span>} big
    sub="Which sentence uses it?" hint={word.en}
    options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

/** One of *this verb's* forms. German puts its irregularity in the verb, so
 *  which form a particular verb takes is a fact about that verb. */
const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

export function ConjugateItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const mc = useMemo(() => {
    const inf = stripArticle(word.term);
    if (!canConjugate(inf)) return null;
    try {
      const c = conjugate(inf);
      // Single-token forms only: a separable verb conjugates to "rufe an", and a
      // two-word answer among one-word distractors is answerable without German.
      const forms = c.praesens.map((f, i) => ({ f, i })).filter((x) => x.f && !x.f.includes(' '));
      if (forms.length < 3) return null;
      const pick = forms[Math.floor(Math.random() * forms.length)];
      const others = forms.filter((x) => norm(x.f) !== norm(pick.f)).map((x) => x.f);
      const distract = pickN(others, 3, new Set([norm(pick.f)]));
      if (distract.length < 2) return null;
      return { person: PERSONS[pick.i], ...buildMC(pick.f, distract) };
    } catch { return null; }
  }, [word.id]);
  if (!mc) return null;
  return <MCItem prompt={<span lang="de">{mc.person} <span className="text-accent">·····</span></span>}
    big sub={`Which form of ${stripArticle(word.term)}?`} hint={word.en}
    options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

/** *gut → besser.* Not derivable by any rule, which is exactly why it is here
 *  and why regular declension is not. Needs the attested table. */
export function DegreeItem({ word, forms, onGrade }: { word: Word; forms: string[]; onGrade: Grade }) {
  const mc = useMemo(() => {
    const target = forms[0];
    if (!target) return null;
    const others = WORDS.filter((w) => w.pos === 'adjective' && w.id !== word.id)
      .map((w) => stripArticle(w.term) + 'er');
    const distract = pickN(others, 3, new Set([norm(target)]));
    if (distract.length < 2) return null;
    return buildMC(target, distract);
  }, [word.id, forms]);
  if (!mc) return null;
  return <MCItem prompt={<span lang="de">{stripArticle(word.term)} → <span className="text-accent">·····</span></span>}
    big sub="Which is the comparative?" hint={word.en}
    options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

/** What else the corpus says means this. Only where the card names one. */
export function SynonymItem({ word, onGrade }: { word: Word; onGrade: Grade }) {
  const mc = useMemo(() => {
    const syns = word.syn.map((t) => stripArticle(t)).filter((t) => /^[A-Za-zÄÖÜäöüß-]+$/.test(t));
    if (!syns.length) return null;
    const target = syns[0];
    const others = WORDS.filter((w) => w.pos === word.pos && w.id !== word.id)
      .map((w) => stripArticle(w.term));
    const distract = pickN(others, 3, new Set([norm(target), norm(stripArticle(word.term))]));
    if (distract.length < 2) return null;
    return buildMC(target, distract);
  }, [word.id]);
  if (!mc) return null;
  return <MCItem prompt={<span lang="de">{stripArticle(word.term)}</span>} big
    sub="Which word means the same?" hint={word.en}
    options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

// ---- the typed-answer widget ----------------------------------------------

interface TypeEx {
  prompt: string;
  accept: string[];
  hints?: string[];
  explain?: string;
}

export function TypeItem({ ex, onGrade, promptLang = 'de', noteFor }: {
  ex: TypeEx; onGrade: (ok: boolean) => void;
  /** Language of the *prompt*. Every drill but recall asks in German, so `de` is
   *  the default — a screen reader handed English inside `lang="de"` reads it in
   *  a German voice, which is the exact defect `lang` exists to prevent. */
  promptLang?: 'de' | 'en';
  /** Say something more specific than right/wrong about *this* attempt. Typing
   *  "Fakultät" for "die Fakultät" is a **gender** miss wearing a vocabulary
   *  miss's clothes. Returning a note never changes the grade. */
  noteFor?: (typed: string, ok: boolean) => string | undefined;
}) {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [near, setNear] = useState(false); // right word, spelling drifted
  const [hint, setHint] = useState(0);     // 0 = none, 1..n = ladder
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const accepts = useMemo(() => new Set(ex.accept.map(norm)), [ex]);
  const canonical = ex.accept[0] ?? '';
  const rung = (n: number) => ex.hints?.[n - 1] ?? hintText(canonical, n);
  const rungs = ex.hints?.length ?? 3;
  const submit = () => {
    if (result !== null) return;
    const exact = accepts.has(norm(val));
    const typo = !exact && isTypoFor(val, ex.accept);
    const ok = exact || typo;
    setNear(ok && !ex.accept.some((a) => canon(a) === canon(val)));
    setResult(ok);
  };
  const note = near
    ? spellingDiff(val, canonical)
      ? `Right — just the spelling: ${canonical} (${spellingDiff(val, canonical)})`
      // A typo and an umlaut fold are both near misses and are not the same
      // lesson: one is a slipped finger, the other is a spelling the learner may
      // believe is correct. Naming which is the whole point.
      : `Right — just a typo: ${canonical}`
    // The caller's note only gets a say when there is no near miss to report.
    : noteFor?.(val, result ?? false);

  return (
    <Card>
      {ex.prompt && <p lang={promptLang} className="headword text-xl sm:text-2xl font-bold text-center mb-4 leading-snug">{ex.prompt}</p>}
      <label className="sr-only" htmlFor="drill-answer">Your answer</label>
      <input id="drill-answer" lang="de" ref={ref}
        // iOS autocapitalises and autocorrects German by default, then the drill
        // marks the learner wrong for the phone's edit. Grading lowercases, so
        // the capital was only ever noise; the autocorrect was changing words.
        autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done"
        value={val} disabled={result !== null} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { if (result === null) submit(); else onGrade(result); } }}
        placeholder="Type your answer…"
        className={`w-full bg-panel2 border rounded-md px-4 py-3 text-xl outline-none text-center ${
          result === null ? 'border-line focus:border-accent' : result ? 'border-green text-green' : 'border-red'}`} />
      {result === null && <div className="mt-2 flex justify-center"><UmlautBar targetRef={ref} value={val} onChange={setVal} /></div>}
      {result === null && hint > 0 && <p className="text-accent text-xs mt-2 text-center leading-relaxed">Hint: {rung(hint)}</p>}
      {/* Read back what they typed, wrapped and in full — the input above clips
          it and stays clipped once disabled. Only on a miss. */}
      {result === false && val.trim() && canonical && (
        <p className="mt-3 text-sm text-center leading-relaxed" lang="de">
          <span className="text-dim text-xs">You wrote: </span>
          {typedDiff(val, canonical).map((seg, i) => (
            <span key={i} className={seg.ok ? 'text-dim' : 'text-red-txt font-semibold underline decoration-dotted underline-offset-2'}>
              {seg.text}{' '}
            </span>
          ))}
        </p>
      )}
      {result !== null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center" role="status" aria-live="polite">
          {result
            ? <p className="text-green font-semibold flex items-center justify-center gap-1.5"><Check size={16} /> Correct</p>
            : <p className="text-base"><X size={15} className="inline text-red -mt-0.5 mr-1" /> Answer: <span lang="de" className="text-green font-bold">{canonical}</span></p>}
          {note && <p className="text-accent text-xs mt-1">{note}</p>}
          {ex.explain && <p className="text-dim text-xs mt-1.5">{ex.explain}</p>}
        </motion.div>
      )}
      {result === null
        ? <div className="mt-5 flex items-center justify-center gap-3">
            <Button onClick={submit} disabled={!val.trim()}>Check</Button>
            {canonical && hint < rungs && (
              <button onClick={() => setHint((h) => h + 1)} className="text-dim text-xs underline underline-offset-2 hover:text-accent">
                {hint === 0 ? 'Hint' : 'More'}
              </button>
            )}
          </div>
        : <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={() => onGrade(result)}>Next →</Button></div>}
    </Card>
  );
}

// ---- shared bits ----------------------------------------------------------

/** Keyboard for a multiple-choice item: 1–n picks an option, Enter advances.
 *  Ignores keys while a control or text field has focus — Enter belongs to the
 *  focused button first. */
function useChoiceKeys({ count, answered, onPick, onNext }: {
  count: number; answered: boolean; onPick: (i: number) => void; onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter') {
        if (t && (t.tagName === 'BUTTON' || t.closest?.('button, a, select'))) return;
        if (answered) { e.preventDefault(); onNext(); }
        return;
      }
      if (answered) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= count) { e.preventDefault(); onPick(n - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, answered, onPick, onNext]);
}

/** The drill surface. Same material as the flip card — an exercise is the same
 *  kind of object as a card, so it gets the card ground, grain and radius rather
 *  than looking like another panel in the chrome. */
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-line rounded-lg p-6 sm:p-8">{children}</div>;
}

function Prompt({ children, small, gloss, big = true }: {
  children: React.ReactNode; small?: string; gloss?: string; big?: boolean;
}) {
  return (
    <div className="text-center mb-5">
      {/* Sentence case, dim — deliberately *not* a second accent kicker. The
          session already prints the mode as an uppercase accent kicker above the
          card, and two tracked uppercase lines stacked read as one label repeated.
          Category above the card, instruction inside it. */}
      {small && <p className="text-xs text-dim mb-2">{small}</p>}
      {/* The German being *tested* is a headword too, so an exercise prompt reads
          as the subject of the app rather than as data inside it. */}
      <div lang="de" className={`headword font-bold leading-snug ${big ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>{children}</div>
      {gloss && <p className="text-dim text-xs mt-2">{gloss}</p>}
    </div>
  );
}

function Empty() {
  return (
    <Surface pad="none" className="px-8 py-12 text-center">
      <h2 className="text-xl font-bold mb-1">Nothing queued</h2>
      <p className="text-dim">No items due in this drill for the levels you’re studying. Try another one, or widen the level filter.</p>
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
