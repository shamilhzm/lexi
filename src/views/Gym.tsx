// Grammatik-Studio — interactive drills with their own spaced-repetition track.
// Four modes: der/die/das gender, noun plurals, verb conjugation (Präsens /
// Präteritum / Partizip II via the conjugation engine), and cloze from example
// sentences. Each drilled unit gets an FSRS card under a namespaced id, so the
// gym schedules itself without touching the vocabulary stats.
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, X, Venus, Mars, CircleDot, Layers3, Cog, AlignLeft, BookOpen } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { cardOf, review, levels, logMiss } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue, Rating } from '../srs.ts';
import { conjugate, canConjugate, PRONOUN, type Person } from '../lib/conjugate.ts';
import UmlautBar from '../components/UmlautBar.tsx';
import GrammarDrill from './GrammarDrill.tsx';
import type { Word } from '../types.ts';

type Mode = 'gender' | 'plural' | 'conj' | 'cloze';
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
const MODE_TAG: Record<Mode, string> = {
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
  { m: 'plural', label: 'Plurals', icon: Layers3, desc: 'Type the plural form.' },
  { m: 'conj', label: 'Conjugation', icon: Cog, desc: 'Präsens · Präteritum · Partizip II.' },
  { m: 'cloze', label: 'Cloze', icon: AlignLeft, desc: 'Fill the gap in a real sentence.' },
];

export default function Gym() {
  const [mode, setMode] = useState<Mode | 'grammar' | null>(null);
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
            className="bg-panel border border-line rounded-[12px] p-4 text-left hover:border-amber transition-colors group">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber"><Icon size={18} /></span>
              <span className="font-semibold text-[15px]">{label}</span>
            </div>
            <p className="text-dim text-[12.5px]">{desc}</p>
            <p className="text-[11px] text-dim mt-2 font-mono">{counts[m].toLocaleString('de-DE')} items</p>
          </button>
        ))}
        <button onClick={() => onPick('grammar')}
          className="bg-panel border border-line rounded-[12px] p-4 text-left hover:border-amber transition-colors sm:col-span-2">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-panel2 text-amber"><BookOpen size={18} /></span>
            <span className="font-semibold text-[15px]">Grammar exercises</span>
          </div>
          <p className="text-dim text-[12.5px]">74 points · 444 authored exercises (cloze, case &amp; article, sentence builder, transformation, error-spotting). A1–C2.</p>
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
    if (!ok) logMiss(MODE_TAG[mode]);
    setDone((d) => d + 1); setCorrect((c) => c + (ok ? 1 : 0)); setI((n) => n + 1);
  }, [word, mode]);

  if (q.length === 0) return <Shell onExit={onExit}><Empty /></Shell>;
  if (!word) return <Shell onExit={onExit}><Summary done={done} correct={correct} /></Shell>;

  return (
    <Shell onExit={onExit} progress={`${done}/${q.length}`} score={done ? Math.round((correct / done) * 100) : null}>
      {mode === 'gender' && <GenderItem key={word.id} word={word} onGrade={advance} />}
      {mode === 'plural' && <TypeItem key={word.id} prompt={`Plural von „${stripArticle(word.term)}“`} hint={word.en} answer={word.plural!} accept={[stripArticle(word.plural!)]} onGrade={advance} />}
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
        <button onClick={onExit} className="text-dim hover:text-amber"><ArrowLeft size={18} /></button>
        {progress && <span className="text-[12px] text-dim font-mono">{progress}</span>}
        {score !== null && score !== undefined && <span className="ml-auto text-[12px] font-mono text-green">{score}% correct</span>}
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
function GenderItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
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
              className={`rounded-[10px] py-4 font-bold text-[18px] border transition-colors ${
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

const TENSES: { key: 'praesens' | 'praeteritum' | 'pp'; label: string }[] = [
  { key: 'praesens', label: 'Präsens' }, { key: 'praeteritum', label: 'Präteritum' }, { key: 'pp', label: 'Partizip II' },
];
const PERSONS_I: Person[] = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
function ConjItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const conj = useMemo(() => conjugate(word.term), [word.id]);
  const pick = useMemo(() => {
    const tense = TENSES[Math.floor(Math.random() * TENSES.length)];
    const pIdx = Math.floor(Math.random() * 6);
    if (tense.key === 'pp') return { tense, answer: conj.partizip, prompt: 'Partizip II', sub: '' };
    const person = PERSONS_I[pIdx];
    return { tense, answer: conj[tense.key][pIdx], prompt: `${PRONOUN[person]} …`, sub: tense.label };
  }, [word.id]);
  return (
    <TypeItem prompt={pick.prompt} sub={`${stripArticle(word.term)} · ${pick.sub || 'Partizip II'}`} hint={word.en}
      answer={pick.answer} extra={`Perfekt: ${conj.perfekt[0]} · aux ${conj.aux}`} onGrade={onGrade} />
  );
}

function ClozeItem({ word, onGrade }: { word: Word; onGrade: (ok: boolean) => void }) {
  const surface = stripArticle(word.term);
  const ex = word.ex[0];
  const re = new RegExp(`\\b(${escapeReg(surface)})\\b`, 'i');
  const m = re.exec(ex.de);
  const target = m ? m[1] : surface;
  const blanked = ex.de.replace(re, '_____');
  return (
    <TypeItem prompt={blanked} sub="Fill the gap" hint={ex.en || word.en} answer={target} bigPrompt={false} onGrade={onGrade} />
  );
}

/** Type-in item with exact (normalised) grading and reveal-on-wrong. */
function TypeItem({ prompt, sub, hint, answer, accept = [], extra, bigPrompt = true, onGrade }:
  { prompt: string; sub?: string; hint?: string; answer: string; accept?: string[]; extra?: string; bigPrompt?: boolean; onGrade: (ok: boolean) => void }) {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<null | boolean>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const accepts = useMemo(() => new Set([answer, ...accept].map(norm)), [answer, accept]);
  const submit = () => {
    if (result !== null) return;
    setResult(accepts.has(norm(val)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (result === null) submit(); else onGrade(result);
  };
  return (
    <Card>
      <Prompt small={sub} big={bigPrompt}>{prompt}</Prompt>
      {hint && <p className="text-dim text-[13px] mb-4">{hint}</p>}
      <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={onKey}
        disabled={result !== null} placeholder="Type your answer…"
        className={`w-full bg-panel2 border rounded-[10px] px-4 py-3 text-[18px] outline-none text-center ${
          result === null ? 'border-line focus:border-amber' : result ? 'border-green text-green' : 'border-red'}`} />
      {result === null && <div className="mt-2 flex justify-center"><UmlautBar targetRef={inputRef} value={val} onChange={setVal} /></div>}

      {result !== null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
          {result
            ? <p className="text-green font-semibold flex items-center justify-center gap-1.5"><Check size={16} /> Correct</p>
            : <p className="text-[15px]"><X size={15} className="inline text-red -mt-0.5 mr-1" /> Answer: <span className="text-green font-bold">{answer}</span></p>}
          {extra && <p className="text-dim text-[12px] mt-1.5 font-mono">{extra}</p>}
        </motion.div>
      )}

      <div className="mt-5 flex justify-center">
        {result === null
          ? <button onClick={submit} disabled={!val.trim()} className="bg-amber text-bg font-bold rounded-[10px] px-6 py-2.5 disabled:opacity-40">Check</button>
          : <button onClick={() => onGrade(result)} className="bg-panel2 border border-line rounded-[10px] px-6 py-2.5 hover:border-amber font-semibold">Next →</button>}
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-panel border border-line rounded-[14px] p-5 sm:p-7">{children}</div>;
}
function Prompt({ children, small, big = true }: { children: React.ReactNode; small?: string; big?: boolean }) {
  return (
    <div className="text-center mb-2">
      {small && <div className="text-[11px] text-amber uppercase tracking-[2px] mb-2 font-semibold">{small}</div>}
      <div className={`font-bold leading-snug ${big ? 'text-[26px] sm:text-[32px]' : 'text-[18px] sm:text-[20px]'}`}>{children}</div>
    </div>
  );
}
function Empty() {
  return (
    <div className="bg-panel border border-line rounded-2xl px-8 py-12 text-center">
      <h2 className="text-xl font-bold mb-1">Nothing queued 🎉</h2>
      <p className="text-dim">No items due in this drill for the selected levels. Try another mode or widen your CEFR filter.</p>
    </div>
  );
}
function Summary({ done, correct }: { done: number; correct: number }) {
  const pct = done ? Math.round((correct / done) * 100) : 0;
  return (
    <div className="bg-panel border border-line rounded-2xl px-8 py-12 text-center">
      <div className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}><Check className="text-green" /></div>
      <h2 className="text-2xl font-bold mb-1">Drill complete</h2>
      <p className="text-dim">{correct}/{done} correct · {pct}%. Scheduled for review.</p>
    </div>
  );
}
