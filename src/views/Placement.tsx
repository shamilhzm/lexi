// Einstufungstest — a quick adaptive placement test. Climbs the CEFR levels,
// showing a handful of words per level; you tap know / don't know. It stops at
// the level where your recognition drops off, seeds the words you know into FSRS
// (so the market reflects reality), and focuses the level filter on your range.
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, GraduationCap, Sparkles } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { review, setLevels, setPlacementLevel } from '../store.ts';
import { Rating } from '../srs.ts';
import { ALL_LEVELS, type CEFR, type Word } from '../types.ts';

const PER_LEVEL = 5;        // words shown per level
const PASS = 0.6;           // recognition rate needed to climb to the next level
const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

function sample(level: CEFR, n: number): Word[] {
  const pool = WORDS.filter((w) => w.kind === 'word' && w.level === level && w.en);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}

export default function Placement({ onDone }: { onDone: () => void }) {
  // Pre-sample a batch per level; we only consume as far as the learner climbs.
  const batches = useMemo(() => ALL_LEVELS.map((l) => sample(l, PER_LEVEL)), []);
  const [li, setLi] = useState(0);          // current level index
  const [qi, setQi] = useState(0);          // index within the level batch
  const [levelKnown, setLevelKnown] = useState(0);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CEFR | null>(null);
  const [seeded, setSeeded] = useState(0);

  const batch = batches[li];
  const word = batch?.[qi];
  const totalAsked = li * PER_LEVEL + qi;

  const finish = (placement: CEFR, knownSet: Set<string>) => {
    // seed recognised words as consolidated, and focus the filter on A1..placement
    let n = 0;
    for (const id of knownSet) { review(id, Rating.Easy); n++; }
    const upto = ALL_LEVELS.slice(0, ALL_LEVELS.indexOf(placement) + 1);
    setLevels(new Set(upto));
    setPlacementLevel(placement);
    setSeeded(n);
    setResult(placement);
  };

  const answer = (knows: boolean) => {
    if (!word) return;
    const nextKnown = new Set(known);
    if (knows) nextKnown.add(word.id);
    setKnown(nextKnown);
    const lk = levelKnown + (knows ? 1 : 0);

    if (qi + 1 < batch.length) { setQi(qi + 1); setLevelKnown(lk); return; }

    // finished this level — decide whether to climb
    const passed = lk / batch.length >= PASS;
    const isLast = li + 1 >= ALL_LEVELS.length;
    if (passed && !isLast && batches[li + 1].length > 0) {
      setLi(li + 1); setQi(0); setLevelKnown(0);
    } else {
      // placement = current level if passed, else the level below (floor A1)
      const idx = passed ? li : Math.max(0, li - 1);
      finish(ALL_LEVELS[idx], nextKnown);
    }
  };

  if (result) {
    return (
      <div className="max-w-[520px] mx-auto">
        <div className="bg-panel border border-line rounded-[14px] px-6 py-10 text-center">
          <div className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}>
            <GraduationCap className="text-green" />
          </div>
          <div className="text-[11px] text-amber uppercase tracking-[2px] mb-1">Your level</div>
          <div className="font-mono font-bold text-[52px] leading-none text-amber mb-3">{result}</div>
          <p className="text-dim text-[14px] mb-6">
            Seeded {seeded} word{seeded === 1 ? '' : 's'} you already know, and focused Lexi on A1–{result}.
            You can change the level filter anytime.
          </p>
          <button onClick={onDone} className="flex items-center gap-2 mx-auto bg-amber text-bg font-bold rounded-[10px] px-6 py-3 hover:brightness-105">
            <Sparkles size={16} /> Start learning
          </button>
        </div>
      </div>
    );
  }

  if (!word) return null;
  const totalMax = ALL_LEVELS.length * PER_LEVEL;

  return (
    <div className="max-w-[520px] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[18px] font-bold">Placement test</h1>
        <button onClick={onDone} className="text-[12px] text-dim hover:text-amber">skip</button>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-amber transition-all" style={{ width: `${(totalAsked / totalMax) * 100}%` }} />
      </div>
      <p className="text-[11px] text-dim mb-4">Testing level {ALL_LEVELS[li]} · do you know this word?</p>

      <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-panel border border-line rounded-[14px] px-6 py-12 text-center mb-4">
        <div className="font-bold text-[34px] sm:text-[40px] leading-tight">{stripArticle(word.term)}</div>
        {word.gender && <div className="text-dim text-[14px] mt-1.5">{word.gender}</div>}
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => answer(false)}
          className="flex items-center justify-center gap-2 rounded-[10px] py-3.5 bg-panel2 border border-line hover:border-red text-[15px] font-semibold">
          <X size={16} className="text-red" /> New to me
        </button>
        <button onClick={() => answer(true)}
          className="flex items-center justify-center gap-2 rounded-[10px] py-3.5 bg-panel2 border border-line hover:border-green text-[15px] font-semibold">
          <Check size={16} className="text-green" /> I know it
        </button>
      </div>
      <p className="text-center text-[11px] text-dim mt-3">Answer honestly — this just calibrates where you start.</p>
    </div>
  );
}
