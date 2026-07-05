// Grammatik-Studio — interactive drills with their own spaced-repetition track.
// Four modes: der/die/das gender, noun plurals, verb conjugation (Präsens /
// Präteritum / Partizip II via the conjugation engine), and cloze from example
// sentences. Each drilled unit gets an FSRS card under a namespaced id, so the
// gym schedules itself without touching the vocabulary stats.
import { useMemo, useState, useCallback } from 'react';
import { ArrowLeft, Venus, Mars, CircleDot, Layers3, Cog, AlignLeft, BookOpen } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { cardOf, review, levels, logMiss, streak } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue, Rating } from '../srs.ts';
import { haptic } from '../lib/ui.ts';
import { conjugate, canConjugate, PRONOUN, type Person } from '../lib/conjugate.ts';
import GrammarDrill from './GrammarDrill.tsx';
import SessionRecap from '../components/SessionRecap.tsx';
import type { Word } from '../types.ts';

export type Mode = 'gender' | 'plural' | 'conj' | 'cloze';
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

function escapeReg(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
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
  return out;
}
export const MODE_TAG: Record<Mode, string> = {
  gender: 'Gender (der/die/das)', plural: 'Noun plurals', conj: 'Verb conjugation', cloze: 'Cloze (word in context)',
};

/** Words for a mode, due-first then unseen, shuffled within each band. */
function queue(mode: Mode): Word[] {
  const pool = mode === 'gender' ? genderPool() : mode === 'plural' ? pluralPool() : mode === 'conj' ? conjPool() : clozePool();
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

const MODES: { m: Mode; label: string; icon: any; desc: string }[] = [
  { m: 'gender', label: 'der / die / das', icon: CircleDot, desc: 'Nail the gender of every noun.' },
  { m: 'plural', label: 'Plurals', icon: Layers3, desc: 'Pick the right plural.' },
  { m: 'conj', label: 'Conjugation', icon: Cog, desc: 'Präsens · Präteritum · Partizip II.' },
  { m: 'cloze', label: 'Cloze', icon: AlignLeft, desc: 'Pick the missing word in a real sentence.' },
];

export default function Gym({ initial = null }: { initial?: Mode | 'grammar' | null }) {
  const [mode, setMode] = useState<Mode | 'grammar' | null>(initial);
  if (mode === 'grammar') return <GrammarDrill onExit={() => setMode(null)} />;
  if (mode) return <Drill mode={mode} onExit={() => setMode(null)} />;
  return <Landing onPick={setMode} />;
}

function Landing({ onPick }: { onPick: (m: Mode | 'grammar') => void }) {
  useStore();
  const counts = useMemo(() => ({
    gender: genderPool().length, plural: pluralPool().length, conj: conjPool().length, cloze: clozePool().length,
  }), [levels()]);
  return (
    <div className="max-w-[820px] mx-auto">
      <div className="flex items-center gap-2.5 mb-1">
        <Cog size={20} className="text-amber" />
        <h1 className="text-[20px] sm:text-[22px] font-bold">Grammar gym</h1>
      </div>
      <p className="text-dim text-[13px] mb-4">Targeted drills with their own spaced-repetition schedule.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map(({ m, label, icon: Icon, desc }) => (
          <button key={m} onClick={() => onPick(m)}
            className="bg-panel border border-line rounded-[16px] p-4 text-left hover:border-amber transition-colors group">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber"><Icon size={18} /></span>
              <span className="font-semibold text-[15px]">{label}</span>
            </div>
            <p className="text-dim text-[13px]">{desc}</p>
            <p className="text-[11px] text-dim mt-2 font-mono">{counts[m].toLocaleString('de-DE')} items</p>
          </button>
        ))}
        <button onClick={() => onPick('grammar')}
          className="bg-panel border border-line rounded-[16px] p-4 text-left hover:border-amber transition-colors sm:col-span-2">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber"><BookOpen size={18} /></span>
            <span className="font-semibold text-[15px]">Grammar exercises</span>
          </div>
          <p className="text-dim text-[13px]">74 points · 444 authored exercises (cloze, case &amp; article, sentence builder, transformation, error-spotting). A1–C2.</p>
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
    </Shell>
  );
}

// ---- shells & shared bits ------------------------------------------------
function Shell({ children, onExit, progress, score }: { children: React.ReactNode; onExit: () => void; progress?: string; score?: number | null }) {
  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={onExit} className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber" title="Back"><ArrowLeft size={18} /></button>
        {progress && <span className="text-[13px] text-dim font-mono">{progress}</span>}
        {score !== null && score !== undefined && <span className="ml-auto text-[13px] font-mono text-green">{score}% correct</span>}
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
      <Prompt small="Which article?">{stripArticle(word.term)}</Prompt>
      <p className="text-dim text-[13px] mb-5">{word.en}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {GENDER.map(({ g, color }) => {
          const state = !picked ? 'idle' : g === word.gender ? 'right' : g === picked ? 'wrong' : 'idle';
          return (
            <button key={g} onClick={() => choose(g)} disabled={!!picked}
              className={`rounded-[10px] py-4 font-bold text-[20px] border transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red'
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

function MCItem({ prompt, sub, hint, options, correct, extra, bigPrompt = true, onGrade }:
  { prompt: string; sub?: string; hint?: string; options: string[]; correct: number; extra?: string; bigPrompt?: boolean; onGrade: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Card>
      <Prompt small={sub} big={bigPrompt}>{prompt}</Prompt>
      {hint && <p className="text-dim text-[13px] mb-4 text-center">{hint}</p>}
      <div className="grid gap-2.5">
        {options.map((o, i) => {
          const state = picked === null ? 'idle' : i === correct ? 'right' : i === picked ? 'wrong' : 'idle';
          return (
            <button key={i} onClick={() => picked === null && setPicked(i)} disabled={picked !== null}
              className={`rounded-[10px] py-3.5 px-4 border text-[15px] text-center transition-colors ${
                state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green font-semibold'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red'
                : 'bg-panel2 border-line hover:border-amber'}`}>{o}</button>
          );
        })}
      </div>
      {picked !== null && extra && <p className="text-dim text-[13px] mt-3 text-center font-mono">{extra}</p>}
      {picked !== null && <div className="mt-5 flex justify-center"><button onClick={() => onGrade(picked === correct)} className="bg-panel2 border border-line rounded-[10px] px-6 py-2.5 hover:border-amber font-semibold">Next →</button></div>}
    </Card>
  );
}

export function PluralItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const correct = word.plural!;
  const mc = useMemo(() => {
    const distract = pickN(pluralPool().filter((w) => w.id !== word.id).map((w) => w.plural!), 3, new Set([norm(correct)]));
    return buildMC(correct, distract);
  }, [word.id]);
  return <MCItem prompt={`Plural von „${stripArticle(word.term)}“`} sub="Choose the plural" hint={word.en} options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

const TENSES: { key: 'praesens' | 'praeteritum' | 'pp'; label: string }[] = [
  { key: 'praesens', label: 'Präsens' }, { key: 'praeteritum', label: 'Präteritum' }, { key: 'pp', label: 'Partizip II' },
];
const PERSONS_I: Person[] = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
export function ConjItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const conj = useMemo(() => conjugate(word.term), [word.id]);
  const data = useMemo(() => {
    const tense = TENSES[Math.floor(Math.random() * TENSES.length)];
    const pIdx = Math.floor(Math.random() * 6);
    const answer = tense.key === 'pp' ? conj.partizip : conj[tense.key][pIdx];
    const prompt = tense.key === 'pp' ? 'Partizip II' : `${PRONOUN[PERSONS_I[pIdx]]} …`;
    // Strongest distractors: the verb's *other* forms; pad from other verbs if needed.
    const sameVerb = [...conj.praesens, ...conj.praeteritum, conj.partizip];
    let distract = pickN(sameVerb, 3, new Set([norm(answer)]));
    if (distract.length < 3) {
      const others = conjPool().filter((w) => w.id !== word.id).slice(0, 14)
        .map((w) => { const c = conjugate(w.term); return tense.key === 'pp' ? c.partizip : c[tense.key][pIdx]; });
      distract = distract.concat(pickN(others, 3 - distract.length, new Set([norm(answer), ...distract.map(norm)])));
    }
    return { ...buildMC(answer, distract), prompt, sub: `${stripArticle(word.term)} · ${tense.label}` };
  }, [word.id]);
  return <MCItem prompt={data.prompt} sub={data.sub} hint={word.en} options={data.options} correct={data.correct}
    extra={`Perfekt: ${conj.perfekt[0]} · aux ${conj.aux}`} onGrade={onGrade} />;
}

export function ClozeItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const surface = stripArticle(word.term);
  const ex = word.ex[0];
  const re = new RegExp(`\\b(${escapeReg(surface)})\\b`, 'i');
  const m = re.exec(ex.de);
  const target = m ? m[1] : surface;
  const blanked = ex.de.replace(re, '_____');
  const mc = useMemo(() => {
    const samePos = WORDS.filter((w) => w.pos === word.pos && w.id !== word.id && inLevels(w));
    const base = samePos.length >= 6 ? samePos : WORDS.filter((w) => w.id !== word.id && inLevels(w));
    const distract = pickN(base.map((w) => stripArticle(w.term)), 3, new Set([norm(target)]));
    return buildMC(target, distract);
  }, [word.id]);
  return <MCItem prompt={blanked} sub="Choose the missing word" hint={ex.en || word.en} bigPrompt={false} options={mc.options} correct={mc.correct} onGrade={onGrade} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-line rounded-[16px] p-6 sm:p-8">{children}</div>;
}
function Prompt({ children, small, big = true }: { children: React.ReactNode; small?: string; big?: boolean }) {
  return (
    <div className="text-center mb-2">
      {small && <div className="text-[11px] text-amber uppercase tracking-[2px] mb-2 font-semibold">{small}</div>}
      <div className={`font-bold leading-snug ${big ? 'text-[26px] sm:text-[32px]' : 'text-[20px] sm:text-[24px]'}`}>{children}</div>
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
