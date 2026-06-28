// Üben — the FSRS review loop. Flip a card, grade it (1–4 / keys), watch the
// interval preview update live. Handles vocabulary and grammar cards.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft, Check } from 'lucide-react';
import { buildSession, review, cardOf, levels } from '../store.ts';
import { useStore } from '../useStore.ts';
import { emptyCard, previewInterval, Rating, type Grade } from '../srs.ts';
import { speak } from '../lib/tts.ts';
import LevelFilter from '../components/LevelFilter.tsx';
import type { Word, Target } from '../types.ts';

const GENDER_COLOR: Record<string, string> = { der: 'var(--color-a1)', die: '#f472b6', das: 'var(--color-b1)' };
const GRADES: { g: Grade; key: string; label: string; cls: string }[] = [
  { g: Rating.Again, key: '1', label: 'Again', cls: 'hover:border-red' },
  { g: Rating.Hard, key: '2', label: 'Hard', cls: 'hover:border-amber' },
  { g: Rating.Good, key: '3', label: 'Good', cls: 'hover:border-green' },
  { g: Rating.Easy, key: '4', label: 'Easy', cls: 'hover:border-green' },
];

export default function Review({ target, onExit, onPick }: { target: Target; onExit: () => void; onPick: () => void }) {
  useStore(); // re-render when the CEFR filter changes
  const lvKey = [...levels()].sort().join('');
  const queue = useMemo(() => buildSession(target), [target, lvKey]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  // restart the session when scope (target) or level filter changes
  useEffect(() => { setI(0); setDone(0); setFlipped(false); }, [target, lvKey]);

  const card = queue[i];
  const flip = useCallback(() => setFlipped((f) => !f), []);

  const grade = useCallback((g: Grade) => {
    if (!flipped || !card) return;
    review(card.id, g);
    setDone((d) => d + 1);
    setFlipped(false);
    setI((n) => n + 1);
  }, [flipped, card]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      const hit = GRADES.find((x) => x.key === e.key);
      if (hit) grade(hit.g);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, grade]);

  if (queue.length === 0) return <EmptyState target={target} onExit={onExit} onPick={onPick} />;
  if (!card) return <DoneState target={target} done={done} onExit={onExit} />;

  const fsrs = cardOf(card.id) ?? emptyCard();
  const grammar = card.kind === 'grammar';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      <div className="bg-panel border border-line rounded-[10px]">
        <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
          <button onClick={onExit} className="text-dim hover:text-amber" title="Back to market"><ArrowLeft size={16} /></button>
          <h2 className="text-[14px] font-semibold">{target.name}</h2>
          <span className="text-[10px] text-amber border border-line px-1.5 py-0.5 rounded-full tracking-[1px]">{queue.length - done} OPEN</span>
          <div className="ml-auto flex items-center gap-2.5">
            <LevelFilter compact />
            <span className="text-[11px] text-dim hidden lg:block">Space = flip · 1–4 = grade</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-6 sm:py-8 px-3 sm:px-6 min-h-[400px]">
          <div className="flip w-full max-w-[560px] h-[280px] sm:h-[300px] cursor-pointer" onClick={flip}>
            <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
              {/* FRONT */}
              <div className="flip-face border border-line rounded-2xl bg-panel2 flex flex-col items-center justify-center gap-3 p-5 sm:p-6 text-center">
                <span className="text-[11px] text-dim uppercase tracking-[2px]">{grammar ? 'Grammar' : (card.pos || 'word')} · {card.level}</span>
                <span className={`font-bold leading-tight break-words max-w-full px-2 ${grammar ? 'text-[20px] sm:text-[26px]' : 'text-[30px] sm:text-[40px]'}`}>
                  {card.gender && <span style={{ color: GENDER_COLOR[card.gender] }}>{card.gender} </span>}
                  {stripArticle(card.term, card.gender)}
                </span>
                {card.ipa && <span className="font-mono text-[13px] text-dim">/{card.ipa}/</span>}
                {!grammar && (
                  <button onClick={(e) => { e.stopPropagation(); speak(card.term); }}
                    className="grid place-items-center w-11 h-11 rounded-full bg-panel border border-line text-amber hover:bg-panel2 active:scale-95" title="Pronunciation">
                    <Volume2 size={18} />
                  </button>
                )}
                {card.ex[0] && <span className="text-dim italic text-[13px] sm:text-[14px] max-w-[88%]">{card.ex[0].de}</span>}
              </div>
              {/* BACK */}
              <div className="flip-face flip-back border rounded-2xl flex flex-col items-center justify-center gap-2.5 p-5 sm:p-6 text-center"
                   style={{ background: '#0c1410', borderColor: 'var(--color-green-d)' }}>
                <span className="text-[11px] text-dim uppercase tracking-[2px]">{grammar ? 'Rule' : 'Translation'}</span>
                <span className={`font-bold text-green leading-tight break-words max-w-full px-2 ${grammar ? 'text-[18px] sm:text-[20px]' : 'text-[26px] sm:text-[34px]'}`}>{card.en}</span>
                {card.def && <span className="text-dim text-[13px] max-w-[88%]">{card.def}</span>}
                {!grammar && card.ex[0] && <span className="text-dim italic text-[13px] max-w-[85%]">„{card.ex[0].en || card.ex[0].de}“</span>}
                {card.syn.length > 0 && <span className="text-[12px] text-dim">Synonyms: <span className="text-txt">{card.syn.join(', ')}</span></span>}
              </div>
            </div>
          </div>

          <div className="min-h-[64px] mt-6 flex items-center">
            {flipped ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 sm:gap-2.5 flex-wrap justify-center">
                {GRADES.map((gr) => (
                  <button key={gr.key} onClick={() => grade(gr.g)}
                    className={`border border-line bg-panel rounded-[9px] px-3.5 sm:px-4 py-2.5 min-w-[78px] sm:min-w-[96px] font-semibold transition-colors active:scale-95 ${gr.cls}`}>
                    {gr.label}
                    <small className="block font-normal text-dim text-[10px] mt-0.5">{previewInterval(fsrs, gr.g)}</small>
                  </button>
                ))}
              </motion.div>
            ) : (
              <span className="text-dim text-[12px]">Tap the card to see the {grammar ? 'rule' : 'translation'}</span>
            )}
          </div>
        </div>
      </div>

      <Sidebar word={card} done={done} left={queue.length - done} />
    </div>
  );
}

function stripArticle(term: string, gender: string | null) {
  if (!gender) return term;
  return term.replace(/^(der|die|das)\s+/i, '');
}

function Sidebar({ word, done, left }: { word: Word; done: number; left: number }) {
  return (
    <div className="bg-panel border border-line rounded-[10px] self-start">
      <div className="px-4 py-3 border-b border-line"><h2 className="text-[14px] font-semibold">Session</h2></div>
      <Stat k="Reviewed" v={`${done}`} />
      <Stat k="Remaining" v={`${left}`} />
      <Stat k="Sector" v={word.field} />
      {word.ex.length > 0 && <div className="px-4 py-3 border-y border-line"><h2 className="text-[14px] font-semibold">Examples</h2></div>}
      <div className="px-4 py-3 space-y-2.5">
        {word.ex.slice(0, 3).map((e, k) => (
          <div key={k} className="text-[12.5px]">
            <div className="text-txt">{e.de}</div>
            {e.en && <div className="text-dim italic">{e.en}</div>}
          </div>
        ))}
        {word.ant.length > 0 && <div className="text-[12px] text-dim pt-1">Opposite: <span className="text-red">{word.ant.join(', ')}</span></div>}
      </div>
    </div>
  );
}
function Stat({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between px-4 py-2.5 border-b border-line text-[13px]"><span className="text-dim">{k}</span><span className="font-mono text-amber">{v}</span></div>;
}

function DoneState({ target, done, onExit }: { target: Target; done: number; onExit: () => void }) {
  return (
    <div className="grid place-items-center min-h-[440px]">
      <div className="text-center bg-panel border border-line rounded-2xl px-10 py-12 max-w-md">
        <div className="grid place-items-center w-14 h-14 rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}><Check className="text-green" /></div>
        <h2 className="text-2xl font-bold mb-1">Session complete</h2>
        <p className="text-dim mb-6">Reviewed {done} cards in {target.name}. Nice work.</p>
        <button onClick={onExit} className="bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 hover:brightness-105">Back to market</button>
      </div>
    </div>
  );
}
function EmptyState({ target, onExit, onPick }: { target: Target; onExit: () => void; onPick: () => void }) {
  return (
    <div className="grid place-items-center min-h-[440px]">
      <div className="text-center bg-panel border border-line rounded-2xl px-10 py-12 max-w-md">
        <h2 className="text-xl font-bold mb-1">Nothing due in {target.name} 🎉</h2>
        <p className="text-dim mb-6">No reviews are due and the new-card budget is used up. Try another deck or a different CEFR level.</p>
        <div className="flex gap-2.5 justify-center">
          <button onClick={onPick} className="bg-panel2 border border-line rounded-[10px] px-5 py-2.5 hover:border-amber">Open decks</button>
          <button onClick={onExit} className="bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5">To market</button>
        </div>
      </div>
    </div>
  );
}
