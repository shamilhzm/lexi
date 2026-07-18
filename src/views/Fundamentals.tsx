// Grammar Fundamentals — interactive drills with their own spaced-repetition
// track. Four modes: der/die/das gender, noun plurals, verb conjugation (Präsens /
// Präteritum / Perfekt / Futur I / Konjunktiv II / Partizip II via the conjugation
// engine), and cloze from example sentences. Each drilled unit gets an FSRS card
// under a namespaced id, so the drills schedule themselves without touching the
// vocabulary stats.
// NOTE: the persisted card-id prefix stays `gym:` (see `id` below) — it's a stable
// storage namespace, deliberately NOT renamed so existing schedules survive.
import { useMemo, useState, useCallback } from 'react';
import { ArrowLeft, Venus, Mars, CircleDot, Layers3, Cog, AlignLeft, BookOpen, Shuffle, Repeat, Braces, Check, X } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { cardOf, review, levels, logMiss, streak } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue, Rating } from '../srs.ts';
import { haptic, tick } from '../lib/ui.ts';
import { conjugate, canConjugate, PRONOUN, type Person } from '../lib/conjugate.ts';
import GrammarDrill, { OrderItem, TypeItem } from './GrammarDrill.tsx';
import SessionRecap from '../components/SessionRecap.tsx';
import type { Word } from '../types.ts';

export type Mode = 'gender' | 'plural' | 'conj' | 'cloze' | 'order' | 'transform' | 'case';
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
const clozePool = () => WORDS.filter((w) => w.kind === 'word' && w.ex[0]?.de && inLevels(w)
  && new RegExp(`\\b${escapeReg(stripArticle(w.term))}\\b`, 'i').test(w.ex[0].de));
const orderPool = () => WORDS.filter((w) => w.kind === 'word' && inLevels(w) && orderTokens(w.ex[0]?.de).length > 0);
const transformPool = () => WORDS.filter((w) => w.pos === 'verb' && inLevels(w) && canTransform(w.term));
const casePool = () => WORDS.filter((w) => inLevels(w) && caseSafe(w));

function escapeReg(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

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
 *  reflexive (the finite form alone drops the pronoun's "mich"). Grounded
 *  means never showing a sentence fragment that is actually wrong. */
export function canTransform(verb: string): boolean {
  const c = conjugate(verb);
  return c.reliable && !c.separable && !c.reflexive;
}

// ---- Kasus drill: declined articles + weak adjective endings ---------------
// Grounded by construction: every rendered fragment is correct German.
//  - The case is forced by an unambiguous frame (accusative-only / dative-only /
//    genitive prepositions, or "Hier ist …" for nominative) — never a verb
//    whose government the learner can't see.
//  - Genitive only for feminines: masculine/neuter nouns inflect (+-(e)s) and we
//    won't render a form we can't derive reliably.
//  - n-Deklination masculines (der Junge → den Jungen, der Herr → dem Herrn)
//    inflect in every oblique case, so they're excluded wholesale. The suffix
//    test over-excludes a few safe nouns (Monat) — over-exclusion is the safe
//    direction.
type Kase = 'nom' | 'akk' | 'dat' | 'gen';
type Gender = 'der' | 'die' | 'das';
const CASE_LABEL: Record<Kase, string> = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };
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
// Weak declension (after the definite article): -e or -en, fully deterministic.
const WEAK_END: Record<Kase, Record<Gender, string>> = {
  nom: { der: 'e', die: 'e', das: 'e' },
  akk: { der: 'en', die: 'e', das: 'e' },
  dat: { der: 'en', die: 'en', das: 'en' },
  gen: { der: 'en', die: 'en', das: 'en' },
};
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

export interface CaseItemData { prompt: string; sub: string; options: string[]; correct: number; extra: string; }
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
      extra: `${w.term} · ${why} → ${correct}`,
    };
  }
  // Which adjective ending? (weak, after the definite article)
  const adj = CASE_ADJ[Math.floor(rnd() * CASE_ADJ.length)];
  const correct = adj + WEAK_END[kase][g];
  const options = shuffle([`${adj}e`, `${adj}en`, `${adj}er`, `${adj}es`]);
  return {
    prompt: `${frame} ${ARTICLE[kase][g]} ___ ${noun}`,
    sub: `Adjective ending · ${CASE_LABEL[kase]}`,
    options, correct: options.indexOf(correct),
    extra: `${w.term} · ${why} · after the definite article → ${correct}`,
  };
}

const TRANSFORM_TARGETS: { key: 'praeteritum' | 'perfekt' | 'futur1' | 'konjunktiv2'; label: string }[] = [
  { key: 'praeteritum', label: 'Präteritum' },
  { key: 'perfekt', label: 'Perfekt' },
  { key: 'futur1', label: 'Futur I' },
  { key: 'konjunktiv2', label: 'Konjunktiv II' },
];
/** Build one transformation exercise: a Präsens form → a target tense, typed.
 *  Accepts the form with or without its pronoun ("hat gemacht" / "er hat
 *  gemacht" / "sie hat gemacht" / "es hat gemacht"). Exported for tests. */
export function buildTransform(verb: string, pIdx: number, targetKey: 'praeteritum' | 'perfekt' | 'futur1' | 'konjunktiv2', label: string) {
  const c = conjugate(verb);
  const pronouns = PRONOUN[PERSONS_I[pIdx]].split('/'); // "er/sie/es" → variants
  const source = `${pronouns[0]} ${c.praesens[pIdx]}`;
  const form = c[targetKey][pIdx];
  return {
    prompt: `„${source}“ → ${label}`,
    accept: [`${pronouns[0]} ${form}`, form, ...pronouns.slice(1).map((p) => `${p} ${form}`)],
  };
}
// Legacy storage namespace: kept as `gym:` so learners' existing drill schedules
// carry through the "Gym → Fundamentals" rename. Do not change this prefix.
const id = (m: Mode, w: Word) => `gym:${m}:${w.id}`;
/** FSRS card id for a word's drill in a given mode (shared with mixed sessions). */
export const gymId = id;
/** Drill modes a single word qualifies for (mirrors the pool predicates). */
export function eligibleModes(w: Word): Mode[] {
  const out: Mode[] = [];
  if (w.kind === 'word' && w.gender) out.push('gender');
  if (w.kind === 'word' && w.plural) out.push('plural');
  if (w.pos === 'verb' && canConjugate(w.term)) out.push('conj');
  if (w.kind === 'word' && w.ex[0]?.de && new RegExp(`\\b${escapeReg(stripArticle(w.term))}\\b`, 'i').test(w.ex[0].de)) out.push('cloze');
  if (w.kind === 'word' && orderTokens(w.ex[0]?.de).length > 0) out.push('order');
  if (w.pos === 'verb' && canTransform(w.term)) out.push('transform');
  if (caseSafe(w)) out.push('case');
  return out;
}
export const MODE_TAG: Record<Mode, string> = {
  gender: 'Gender (der/die/das)', plural: 'Noun plurals', conj: 'Verb conjugation', cloze: 'Cloze (word in context)',
  order: 'Word order (sentence builder)', transform: 'Tense transformation', case: 'Cases & endings (Kasus)',
};

/** Words for a mode, due-first then unseen, shuffled within each band. */
function queue(mode: Mode): Word[] {
  const pool = mode === 'gender' ? genderPool() : mode === 'plural' ? pluralPool() : mode === 'conj' ? conjPool()
    : mode === 'order' ? orderPool() : mode === 'transform' ? transformPool() : mode === 'case' ? casePool() : clozePool();
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

export const MODES: { m: Mode; label: string; icon: any; desc: string }[] = [
  { m: 'gender', label: 'der / die / das', icon: CircleDot, desc: 'Nail the gender of every noun.' },
  { m: 'plural', label: 'Plurals', icon: Layers3, desc: 'Pick the right plural.' },
  { m: 'conj', label: 'Conjugation', icon: Cog, desc: 'Präsens · Präteritum · Perfekt · Futur I · Konjunktiv II.' },
  { m: 'cloze', label: 'Cloze', icon: AlignLeft, desc: 'Pick the missing word in a real sentence.' },
  { m: 'order', label: 'Sentence builder', icon: Shuffle, desc: 'Rebuild a real sentence from tiles — V2 and verb-final word order.' },
  { m: 'transform', label: 'Transformation', icon: Repeat, desc: 'Type a verb form in another tense. Production, not recognition.' },
  { m: 'case', label: 'Kasus', icon: Braces, desc: 'Declined articles & adjective endings — Nominativ · Akkusativ · Dativ · Genitiv.' },
];

export default function Fundamentals({ initial = null }: { initial?: Mode | 'grammar' | null }) {
  const [mode, setMode] = useState<Mode | 'grammar' | null>(initial);
  if (mode === 'grammar') return <GrammarDrill onExit={() => setMode(null)} />;
  if (mode) return <Drill mode={mode} onExit={() => setMode(null)} />;
  return <Landing onPick={setMode} />;
}

function Landing({ onPick }: { onPick: (m: Mode | 'grammar') => void }) {
  useStore();
  const counts = useMemo(() => ({
    gender: genderPool().length, plural: pluralPool().length, conj: conjPool().length, cloze: clozePool().length,
    order: orderPool().length, transform: transformPool().length, case: casePool().length,
  }), [levels()]);
  return (
    <div className="max-w-[820px] mx-auto">
      <div className="flex items-center gap-2.5 mb-1">
        <Cog size={20} className="text-amber" />
        <h1 className="text-[1.25rem] sm:text-[1.375rem] font-bold">Grammar Fundamentals</h1>
      </div>
      <p className="text-dim text-[0.8125rem] mb-4">Targeted drills with their own spaced-repetition schedule.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map(({ m, label, icon: Icon, desc }) => (
          <button key={m} onClick={() => onPick(m)}
            className="bg-panel border border-line rounded-[16px] p-4 text-left hover:border-amber transition-colors group">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber"><Icon size={18} /></span>
              <span className="font-semibold text-[0.9375rem]">{label}</span>
            </div>
            <p className="text-dim text-[0.8125rem]">{desc}</p>
            <p className="text-[0.6875rem] text-dim mt-2 font-mono">{counts[m].toLocaleString('de-DE')} items</p>
          </button>
        ))}
        <button onClick={() => onPick('grammar')}
          className="bg-panel border border-line rounded-[16px] p-4 text-left hover:border-amber transition-colors sm:col-span-2">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber"><BookOpen size={18} /></span>
            <span className="font-semibold text-[0.9375rem]">Grammar exercises</span>
          </div>
          <p className="text-dim text-[0.8125rem]">99 points · 571 authored exercises (cloze, case &amp; article, sentence builder, transformation, error-spotting). A1–C2.</p>
        </button>
      </div>
    </div>
  );
}

function Drill({ mode, onExit }: { mode: Mode; onExit: () => void }) {
  useStore();
  const lvKey = [...levels()].sort().join('');
  const q = useMemo(() => queue(mode), [mode, lvKey]);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);

  const word = q[i];
  const advance = useCallback((ok: boolean) => {
    if (!word) return;
    review(id(mode, word), ok ? Rating.Good : Rating.Again);
    haptic();
    if (ok) tick('good');
    if (!ok) logMiss(MODE_TAG[mode]);
    setDone((d) => d + 1); setCorrect((c) => c + (ok ? 1 : 0)); setI((n) => n + 1);
  }, [word, mode]);

  if (q.length === 0) return <Shell onExit={onExit}><Empty /></Shell>;
  if (!word) return <Shell onExit={onExit}><Summary done={done} correct={correct} /></Shell>;

  return (
    <Shell onExit={onExit} progress={`${done}/${q.length}`} score={done ? Math.round((correct / done) * 100) : null}>
      {mode === 'gender' && <GenderItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'plural' && <PluralItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'conj' && <ConjItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'cloze' && <ClozeItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'order' && <OrderWordItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'transform' && <TransformItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'case' && <CaseItem key={word.id} word={word} onGrade={advance} />}
    </Shell>
  );
}

// ---- shells & shared bits ------------------------------------------------
function Shell({ children, onExit, progress, score }: { children: React.ReactNode; onExit: () => void; progress?: string; score?: number | null }) {
  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={onExit} className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber" title="Back"><ArrowLeft size={18} /></button>
        {progress && <span className="text-[0.8125rem] text-dim font-mono">{progress}</span>}
        {score !== null && score !== undefined && <span className="ml-auto text-[0.8125rem] font-mono text-green">{score}% correct</span>}
      </div>
      {children}
    </div>
  );
}

const GENDER = [
  { g: 'der' as const, color: 'var(--color-a1)', icon: Mars },
  { g: 'die' as const, color: '#f472b6', icon: Venus },
  { g: 'das' as const, color: 'var(--color-b1)', icon: CircleDot },
];
export function GenderItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const choose = (g: string) => {
    if (picked) return;
    setPicked(g);
    setTimeout(() => onGrade(g === word.gender), 750);
  };
  return (
    <Card>
      <Prompt small="Which article?" gloss={word.en}>{stripArticle(word.term)}</Prompt>
      <div className="grid grid-cols-3 gap-2.5">
        {GENDER.map(({ g, color }) => {
          const state = !picked ? 'idle' : g === word.gender ? 'right' : g === picked ? 'wrong' : 'idle';
          return (
            <button key={g} onClick={() => choose(g)} disabled={!!picked}
              className={`rounded-[10px] py-4 font-bold text-[1.25rem] border transition-colors ${
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

// Umlaut the first stem vowel (a/o/u/au), preserving case and skipping the 'eu'
// diphthong — used to fabricate believable-but-wrong plural forms.
function umlaut(s: string): string {
  const low = s.toLowerCase();
  const au = low.indexOf('au');
  if (au >= 0) return s.slice(0, au) + (s[au] === s[au].toUpperCase() ? 'Äu' : 'äu') + s.slice(au + 2);
  for (let i = 0; i < s.length; i++) {
    const c = low[i];
    if (c === 'u' && low[i - 1] === 'e') continue; // don't split 'eu'
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

function MCItem({ prompt, sub, hint, options, correct, extra, bigPrompt = true, onGrade }:
  { prompt: string; sub?: string; hint?: string; options: string[]; correct: number; extra?: string; bigPrompt?: boolean; onGrade: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Card>
      <Prompt small={sub} gloss={hint} big={bigPrompt}>{prompt}</Prompt>
      <div className="grid gap-2.5">
        {options.map((o, i) => {
          const state = picked === null ? 'idle' : i === correct ? 'right' : i === picked ? 'wrong' : 'idle';
          return (
            <button key={i} onClick={() => picked === null && setPicked(i)} disabled={picked !== null}
              className={`rounded-[10px] py-3.5 px-4 border text-[0.9375rem] text-center transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green font-semibold'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt'
                : 'bg-panel2 border-line hover:border-amber'}`}>
              {/* icon + colour: right/wrong never rides on colour alone */}
              {state === 'right' && <Check size={14} className="inline -mt-0.5 mr-1.5" />}
              {state === 'wrong' && <X size={14} className="inline -mt-0.5 mr-1.5" />}
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && extra && <p className="text-dim text-[0.8125rem] mt-3 text-center font-mono">{extra}</p>}
      {picked !== null && <div className="mt-5 flex justify-center"><button onClick={() => onGrade(picked === correct)} className="bg-panel2 border border-line rounded-[10px] px-6 py-2.5 hover:border-amber font-semibold">Next →</button></div>}
    </Card>
  );
}

export function PluralItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const correct = word.plural!;
  const singular = stripArticle(word.term);
  const mc = useMemo(() => {
    // For a full "die …" plural, fabricate near-miss plurals of the *same* noun.
    // Shorthand/marker plurals ("-en", "nur Singular", "—") fall back to other
    // nouns' plurals (unchanged behaviour), since there's no stem to inflect.
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
  return <MCItem prompt={singular} sub="Choose the plural" hint={word.en} options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

const TENSES: { key: 'praesens' | 'praeteritum' | 'perfekt' | 'futur1' | 'konjunktiv2' | 'pp'; label: string }[] = [
  { key: 'praesens', label: 'Präsens' },
  { key: 'praeteritum', label: 'Präteritum' },
  { key: 'perfekt', label: 'Perfekt' },
  { key: 'futur1', label: 'Futur I' },
  { key: 'konjunktiv2', label: 'Konjunktiv II' },
  { key: 'pp', label: 'Partizip II' },
];
const PERSONS_I: Person[] = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
export function ConjItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const conj = useMemo(() => conjugate(word.term), [word.id]);
  const data = useMemo(() => {
    const tense = TENSES[Math.floor(Math.random() * TENSES.length)];
    const pIdx = Math.floor(Math.random() * 6);
    const formOf = (c: typeof conj, idx: number) => tense.key === 'pp' ? c.partizip : c[tense.key][idx];
    const answer = formOf(conj, pIdx);
    // Kicker states the grammatical target; the verb itself is the hero text.
    const kicker = tense.key === 'pp' ? 'Partizip II' : `${tense.label} · ${PRONOUN[PERSONS_I[pIdx]]}`;
    // Distractors stay in the SAME tense — the verb's other persons first, then
    // other verbs' same tense/person — so a phrasal answer (Perfekt / Futur I /
    // Konjunktiv II) isn't given away by being the only multi-word option.
    const otherPersons = tense.key === 'pp' ? [] : conj[tense.key].filter((_, idx) => idx !== pIdx);
    let distract = pickN(otherPersons, 3, new Set([norm(answer)]));
    if (distract.length < 3) {
      const others = conjPool().filter((w) => w.id !== word.id).slice(0, 16)
        .map((w) => formOf(conjugate(w.term), pIdx));
      distract = distract.concat(pickN(others, 3 - distract.length, new Set([norm(answer), ...distract.map(norm)])));
    }
    return { ...buildMC(answer, distract), verb: stripArticle(word.term), kicker };
  }, [word.id]);
  return <MCItem prompt={data.verb} sub={data.kicker} hint={word.en} options={data.options} correct={data.correct}
    extra={`Hilfsverb: ${conj.aux}${conj.separable ? ` · trennbar (${conj.separable}-)` : ''}`} onGrade={onGrade} />;
}

export function ClozeItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const surface = stripArticle(word.term);
  const ex = word.ex[0];
  const re = new RegExp(`\\b(${escapeReg(surface)})\\b`, 'i');
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
    const distract = pickN(base.map((w) => stripArticle(w.term)), 3, new Set([norm(target)]));
    return buildMC(target, distract);
  }, [word.id]);
  return <MCItem prompt={blanked} sub="Choose the missing word" hint={ex.en || word.en} bigPrompt={false} options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

// ---- production drills (reuse the authored-exercise widgets) --------------
/** Sentence builder over the card's own example sentence — no new content
 *  needed, and real sentences carry real V2 / verb-final word order. */
export function OrderWordItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const ex = useMemo(() => {
    const tiles = orderTokens(word.ex[0]?.de);
    return {
      kind: 'order' as const,
      prompt: word.ex[0]?.en || `A sentence with „${stripArticle(word.term)}“`,
      tiles,
    };
  }, [word.id]);
  return <OrderItem ex={ex} onGrade={onGrade} />;
}

/** Kasus: declined articles & weak adjective endings in case-forcing frames. */
export function CaseItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const d = useMemo(() => buildCaseItem(word), [word.id]);
  return <MCItem prompt={d.prompt} sub={d.sub} hint={word.en} bigPrompt={false}
    options={d.options} correct={d.correct} extra={d.extra} onGrade={onGrade} />;
}

/** Tense transformation, typed: „ich mache“ → Perfekt. Production, not
 *  recognition — the other half of the conjugation drill. */
export function TransformItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const ex = useMemo(() => {
    const t = TRANSFORM_TARGETS[Math.floor(Math.random() * TRANSFORM_TARGETS.length)];
    const pIdx = Math.floor(Math.random() * 6);
    const { prompt, accept } = buildTransform(word.term, pIdx, t.key, t.label);
    return { kind: 'type' as const, prompt, accept, explain: word.en };
  }, [word.id]);
  return <TypeItem ex={ex} onGrade={onGrade} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-line rounded-[16px] p-6 sm:p-8">{children}</div>;
}
function Prompt({ children, small, gloss, big = true }: { children: React.ReactNode; small?: string; gloss?: string; big?: boolean }) {
  return (
    <div className="text-center mb-5">
      {small && <div className="text-[0.6875rem] text-amber uppercase tracking-[2px] mb-2 font-semibold">{small}</div>}
      <div className={`font-bold leading-snug ${big ? 'text-[1.625rem] sm:text-[2rem]' : 'text-[1.25rem] sm:text-[1.5rem]'}`}>{children}</div>
      {gloss && <p className="text-dim text-[0.8125rem] mt-2">{gloss}</p>}
    </div>
  );
}
function Empty() {
  return (
    <div className="bg-panel border border-line rounded-2xl px-8 py-12 text-center">
      <h2 className="text-xl font-bold mb-1">Nothing queued</h2>
      <p className="text-dim">No items due in this drill for the selected levels. Try another mode or widen your CEFR filter.</p>
    </div>
  );
}
function Summary({ done, correct }: { done: number; correct: number }) {
  return (
    <div className="grid place-items-center pt-4">
      <SessionRecap title="Drill complete" data={{ drills: done, drillsCorrect: correct, streak: streak() }} />
    </div>
  );
}
