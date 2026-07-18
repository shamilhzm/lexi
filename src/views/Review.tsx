// Üben — the unified session player. Interleaves FSRS flip cards (swipe right
// = knew it, swipe left = didn't know) with grammar drills (gender / plural /
// conjugation / cloze) for the same words. Handles vocabulary and grammar cards.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useReducedMotion } from 'motion/react';
import { Volume2, ArrowLeft, Check, X, RotateCcw, SkipForward, Flag, Share2 } from 'lucide-react';
import { shareProgress } from '../lib/sharecard.ts';
import { review, restoreCard, cardOf, levels, statusOf, streak, logMiss, checkMilestones, flagCard, isFlagged } from '../store.ts';
import { haptic } from '../lib/ui.ts';
import { buildMixedSession } from '../session.ts';
import { GenderItem, PluralItem, ConjItem, ClozeItem, OrderWordItem, TransformItem, CaseItem, MODE_TAG } from './Fundamentals.tsx';
import { GrammarExercise } from './GrammarDrill.tsx';
import { loadGrammar, type GPoint } from '../lib/grammar.ts';
import { useStore } from '../useStore.ts';
import { Rating, emptyCard, previewInterval, type Grade, type Card } from '../srs.ts';
import { speak } from '../lib/tts.ts';
import SessionRecap from '../components/SessionRecap.tsx';
import type { Target } from '../types.ts';

const GENDER_COLOR: Record<string, string> = { der: 'var(--color-a1)', die: '#f472b6', das: 'var(--color-b1)' };
const DRILL_TAG: Record<string, string> = { gender: 'Gender', plural: 'Plural', conj: 'Conjugation', cloze: 'Cloze', order: 'Word order', transform: 'Transform', case: 'Kasus' };
const SWIPE_PX = 90; // horizontal travel that commits a grade

/** Stable per-card pick from a grammar point's exercises (same card → same drill). */
function pickExercise(point: GPoint, seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return point.exercises[Math.abs(h) % point.exercises.length];
}

export default function Review({ target, onExit, onPick, onDrills, firstRun = false }: { target: Target; onExit: () => void; onPick: () => void; onDrills: () => void; firstRun?: boolean }) {
  useStore(); // re-render when the CEFR filter changes
  const lvKey = [...levels()].sort().join('');
  const queue = useMemo(() => buildMixedSession(target), [target, lvKey]);
  const minedCount = useMemo(() => new Set(queue.filter((it) => it.word.id.startsWith('usr:')).map((it) => it.word.id)).size, [queue]);
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [again, setAgain] = useState(0);       // lapses this session
  const [newLearned, setNewLearned] = useState(0); // cards that left the New state
  const [gmap, setGmap] = useState<Map<string, GPoint> | null>(null); // grammar point → exercises
  // Per-session action log so prev/undo can reverse a grade (restore FSRS state)
  // or a skip, and rewind counters + position exactly.
  const history = useRef<{ i: number; kind: 'grade' | 'skip'; srsId?: string; prevCard?: Card; dAgain?: number; dNew?: number }[]>([]);

  // restart the session when scope (target) or level filter changes
  useEffect(() => { setI(0); setDone(0); setAgain(0); setNewLearned(0); setFlipped(false); history.current = []; }, [target, lvKey]);

  // Load the exercise bank once, so grammar cards can render as drills.
  useEffect(() => {
    loadGrammar().then((g) => {
      const m = new Map<string, GPoint>();
      Object.entries(g).forEach(([lv, pts]) => (pts as GPoint[]).forEach((p) => m.set(`${lv}::${p.title}`, p)));
      setGmap(m);
    }).catch(() => { /* fall back to rule cards */ });
  }, []);

  const item = queue[i];
  const flip = useCallback(() => setFlipped((f) => !f), []);

  // Interval preview: show when each grade brings the card back. This is how
  // the scheduler earns trust — machinery, not magic (Anki's oldest lesson).
  const preview = useMemo(() => {
    if (!item || item.type !== 'flip') return null;
    const c = cardOf(item.srsId) ?? emptyCard();
    return { again: previewInterval(c, Rating.Again), good: previewInterval(c, Rating.Good) };
  }, [item?.srsId]);

  // Record the pre-review FSRS state + the exact counter deltas this grade
  // applied, so prev/undo can reverse it precisely.
  const pushGrade = (dAgain: number, dNew: number) => {
    if (!item) return;
    const snap = cardOf(item.srsId);
    history.current.push({ i, kind: 'grade', srsId: item.srsId, prevCard: snap ? { ...snap } : undefined, dAgain, dNew });
  };

  // Grade a flip card directly — no reveal required. Flipping stays optional
  // (Space) for when you want to check the translation first.
  const grade = useCallback((g: Grade) => {
    if (!item || item.type !== 'flip') return;
    const wasNew = statusOf(item.srsId) === 'new';
    const dAgain = g === Rating.Again ? 1 : 0;
    const dNew = g !== Rating.Again && wasNew ? 1 : 0;
    pushGrade(dAgain, dNew);
    review(item.srsId, g);
    haptic();
    setDone((d) => d + 1);
    setAgain((a) => a + dAgain);
    setNewLearned((n) => n + dNew);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  const gradeDrill = useCallback((ok: boolean) => {
    if (!item || item.type === 'flip') return;
    const dAgain = ok ? 0 : 1;
    pushGrade(dAgain, 0);
    review(item.srsId, ok ? Rating.Good : Rating.Again);
    haptic();
    if (!ok) logMiss(MODE_TAG[item.type]);
    setAgain((a) => a + dAgain);
    setDone((d) => d + 1);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  // Grammar cards are graded like drills (answer, not flip).
  const gradeGrammar = useCallback((ok: boolean) => {
    if (!item) return;
    const wasNew = statusOf(item.srsId) === 'new';
    const dAgain = ok ? 0 : 1;
    const dNew = ok && wasNew ? 1 : 0;
    pushGrade(dAgain, dNew);
    review(item.srsId, ok ? Rating.Good : Rating.Again);
    haptic();
    if (!ok) logMiss(item.word.term);
    setAgain((a) => a + dAgain);
    setNewLearned((n) => n + dNew);
    setDone((d) => d + 1);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  // Skip: advance without grading — the card stays due for a later session.
  // A skipped exercise is a "zu steil" (too steep) signal: you couldn't attempt
  // it, which is blind-spot information — so it feeds the miss log that ranks
  // weak modes and triggers remediation, while FSRS stays untouched (a skip is
  // never a lapse). Plain word flips log nothing: skipping a word isn't
  // structural.
  const skip = useCallback(() => {
    if (!item) return;
    history.current.push({ i, kind: 'skip' });
    if (item.type !== 'flip') logMiss(MODE_TAG[item.type]);
    else if (item.word.kind === 'grammar') logMiss(item.word.term);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  // Prev: undo the last action. On a grade, restore the FSRS state and rewind
  // counters; on a skip, just step back. Position returns to that card.
  const prev = useCallback(() => {
    const e = history.current.pop();
    if (!e) return;
    if (e.kind === 'grade' && e.srsId) {
      restoreCard(e.srsId, e.prevCard);
      setDone((d) => Math.max(0, d - 1));
      setAgain((a) => Math.max(0, a - (e.dAgain ?? 0)));
      setNewLearned((n) => Math.max(0, n - (e.dNew ?? 0)));
    }
    setFlipped(false);
    setI(e.i);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never hijack keys while the learner is typing an answer — Space must
      // insert a space in "habe gemacht", not flip the card.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      if (e.key === 'ArrowLeft') grade(Rating.Again);
      if (e.key === 'ArrowRight') grade(Rating.Good);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, grade]);

  if (queue.length === 0) return <EmptyState target={target} onExit={onExit} onPick={onPick} onDrills={onDrills} />;
  if (!item) return <DoneState done={done} again={again} newLearned={newLearned} minedCount={minedCount} firstRun={firstRun} onExit={onExit} onPick={onPick} />;

  const card = item.word;
  const drill = item.type !== 'flip';
  const grammar = card.kind === 'grammar';
  // A grammar card renders as a practical exercise when its point is in the bank.
  const gpoint = grammar && gmap ? gmap.get(`${card.level}::${card.term}`) : undefined;
  const grammarEx = gpoint && gpoint.exercises.length ? pickExercise(gpoint, item.srsId) : null;
  const asExercise = drill || !!grammarEx;

  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 flex flex-col justify-center">
      <div className="bg-panel border border-line rounded-[10px]">
        <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3">
          <button onClick={onExit} className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber" title="Back to Today"><ArrowLeft size={16} /></button>
          <h2 className="text-[15px] font-semibold truncate">{target.name}</h2>
          <span className="text-[11px] text-amber border border-line px-1.5 py-0.5 rounded-full tracking-[1px] tabular-nums flex-shrink-0">{queue.length - i} left</span>
          {/* Prev (undo) + skip — the only in-session controls; levels live on Home, keys in onboarding. */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            {/* Flag: "something's wrong with this card" — the feedback loop for a
                solo-maintained corpus. Local, deduped, exports with the backup. */}
            <button onClick={() => item && flagCard(item.word.id, item.word.term)}
              title={item && isFlagged(item.word.id) ? 'Flagged — thanks, it exports with your backup' : 'Something wrong with this card? Flag it'}
              className={`grid place-items-center w-9 h-9 rounded-md transition-colors ${item && isFlagged(item.word.id) ? 'text-amber' : 'text-dim hover:text-amber'}`}>
              <Flag size={15} fill={item && isFlagged(item.word.id) ? 'currentColor' : 'none'} />
            </button>
            <button onClick={prev} disabled={i === 0} title="Previous card"
              className="grid place-items-center w-9 h-9 rounded-md text-dim hover:text-amber disabled:opacity-30 disabled:hover:text-dim transition-colors"><RotateCcw size={16} /></button>
            <button onClick={skip} title="Skip for now"
              className="grid place-items-center w-9 h-9 rounded-md text-dim hover:text-amber transition-colors"><SkipForward size={16} /></button>
          </div>
        </div>
        {/* Slim session progress — tracks position through the queue. */}
        <div className="h-0.5 bg-panel2" role="progressbar" aria-valuenow={i} aria-valuemin={0} aria-valuemax={queue.length}>
          <div className="h-full bg-amber transition-[width] duration-300" style={{ width: `${queue.length ? (i / queue.length) * 100 : 0}%` }} />
        </div>

        <div className="flex flex-col items-center justify-center py-6 sm:py-8 px-3 sm:px-6 min-h-[400px]">
          <AnimatePresence mode="wait">
          <motion.div key={item.srsId} className="w-full flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}>
          {asExercise ? (
            <div className="relative w-full max-w-[580px]">
              <span className="absolute -top-2.5 right-3 z-10 text-[11px] text-amber bg-panel2 border border-line rounded-full px-2 py-0.5 uppercase tracking-[1px]">{grammarEx ? 'Grammar' : (DRILL_TAG[item.type] ?? 'Drill')}</span>
              {grammarEx
                ? <GrammarExercise key={item.srsId} ex={grammarEx} onGrade={gradeGrammar} />
                : item.type === 'gender' ? <GenderItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'plural' ? <PluralItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'conj' ? <ConjItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'order' ? <OrderWordItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'transform' ? <TransformItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'case' ? <CaseItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : <ClozeItem key={item.srsId} word={card} onGrade={gradeDrill} />}
            </div>
          ) : (<>
          <SwipeCard key={item.srsId} onFlip={flip} onGrade={grade}>
            <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
              {/* FRONT — the prompt: word + German context, no translation to spoil the test */}
              <div className="flip-face relative border border-line rounded-2xl bg-card flex flex-col items-center justify-center gap-3 p-6 sm:p-8 text-center overflow-y-auto">
                <StatusPip id={item.srsId} />
                <span className="text-[11px] text-dim uppercase tracking-[2px]">{grammar ? 'Grammar' : (card.pos || 'word')} · {card.level}{!grammar && card.field ? ` · ${card.field}` : ''}</span>
                <span className={`headword font-bold leading-tight break-words max-w-full px-2 ${grammar ? 'text-[22px] sm:text-[28px]' : 'text-[34px] sm:text-[46px]'}`}>
                  {card.gender && <span style={{ color: GENDER_COLOR[card.gender] }}>{card.gender} </span>}
                  {stripArticle(card.term, card.gender)}
                </span>
                {card.ipa && <span className="font-mono text-[15px] text-dim">/{card.ipa}/</span>}
                {!grammar && (
                  <button onClick={(e) => { e.stopPropagation(); speak(card.term); }}
                    className="grid place-items-center w-11 h-11 rounded-full bg-panel border border-line text-amber hover:bg-panel2 active:scale-95" title="Pronunciation">
                    <Volume2 size={18} />
                  </button>
                )}
                {card.ex[0] && <span className="text-dim italic text-[15px] leading-relaxed max-w-[90%]">{card.ex[0].de}</span>}
              </div>
              {/* BACK — the reveal: translation + definition + worked examples + synonyms */}
              <div className="flip-face flip-back border rounded-2xl flex flex-col items-center justify-center gap-2.5 p-6 sm:p-8 text-center overflow-y-auto"
                   style={{ background: 'var(--color-green-d)', borderColor: 'var(--color-green)' }}>
                <span className="text-[11px] text-dim uppercase tracking-[2px]">{grammar ? 'Rule' : 'Translation'}</span>
                <span className={`headword font-bold text-green leading-tight break-words max-w-full px-2 ${grammar ? 'text-[20px] sm:text-[22px]' : 'text-[26px] sm:text-[34px]'}`}>{card.en}</span>
                {card.def && <span className="text-txt text-[14px] leading-relaxed max-w-[92%]">{card.def}</span>}
                {!grammar && card.ex.length > 0 && (
                  <div className="w-full max-w-[94%] text-left mt-1 space-y-2">
                    {card.ex.slice(0, 2).map((e, k) => (
                      <div key={k} className="text-[14px] leading-relaxed">
                        <div className="text-txt">{e.de}</div>
                        {e.en && <div className="text-dim italic">{e.en}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {card.syn.length > 0 && <span className="text-[13px] text-dim">Synonyms: <span className="text-txt">{card.syn.join(', ')}</span></span>}
                {card.ant.length > 0 && <span className="text-[13px] text-dim">Opposite: <span className="text-red-txt">{card.ant.join(', ')}</span></span>}
              </div>
            </div>
          </SwipeCard>

          {/* Grade from either face — flipping is optional. First-sight cards
              can't be "known", so new cards ask "keep it or got it" instead of
              framing an inevitable miss as failure. */}
          <div className="min-h-[64px] mt-6 flex flex-col items-center justify-center gap-2">
            <div className="flex gap-2.5 sm:gap-3 justify-center">
              <button onClick={() => grade(Rating.Again)}
                className="flex flex-col items-center border border-line bg-panel rounded-[10px] px-4 sm:px-5 py-2 min-w-[130px] justify-center font-semibold transition-colors active:scale-95 hover:border-red hover:text-red">
                <span className="flex items-center gap-2"><X size={16} /> {statusOf(item.srsId) === 'new' ? 'Still learning' : 'Didn’t know'}</span>
                {preview && <span className="text-[11px] text-dim font-mono font-normal mt-0.5">{preview.again}</span>}
              </button>
              <button onClick={() => grade(Rating.Good)}
                className="flex flex-col items-center border border-line bg-panel rounded-[10px] px-4 sm:px-5 py-2 min-w-[130px] justify-center font-semibold transition-colors active:scale-95 hover:border-green hover:text-green">
                <span className="flex items-center gap-2"><Check size={16} /> {statusOf(item.srsId) === 'new' ? 'Got it' : 'Knew it'}</span>
                {preview && <span className="text-[11px] text-dim font-mono font-normal mt-0.5">{preview.good}</span>}
              </button>
            </div>
            <span className={`text-dim text-[12px] h-4 leading-4 transition-opacity ${flipped ? 'opacity-0' : ''}`}>
              Space to flip and check the {grammar ? 'rule' : 'translation'}
            </span>
          </div>
          </>)}
          </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** Draggable flip-card. Tap flips; once flipped, swipe right = knew it (Good),
 *  swipe left = didn't know (Again). Snaps back below the threshold. */
function SwipeCard({ children, onFlip, onGrade }:
  { children: React.ReactNode; onFlip: () => void; onGrade: (g: Grade) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const yes = useTransform(x, [20, SWIPE_PX], [0, 1]);
  const no = useTransform(x, [-20, -SWIPE_PX], [0, 1]);
  const reduce = useReducedMotion();
  const dragged = useRef(false);
  return (
    <motion.div
      className="relative w-full max-w-[580px] h-[360px] sm:h-[420px] cursor-pointer touch-pan-y"
      style={{ x, rotate: reduce ? 0 : rotate }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.6}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_PX) onGrade(Rating.Good);
        else if (info.offset.x < -SWIPE_PX) onGrade(Rating.Again);
        setTimeout(() => { dragged.current = false; }, 0);
      }}
      onClick={() => { if (!dragged.current) onFlip(); }}
    >
      <div className="flip w-full h-full">{children}</div>
      <motion.span style={{ opacity: yes }}
        className="absolute top-3 right-3 flex items-center gap-1.5 text-green font-bold text-[13px] border border-green rounded-full px-3 py-1 bg-[var(--color-green-d)] pointer-events-none">
        <Check size={14} /> Knew it
      </motion.span>
      <motion.span style={{ opacity: no }}
        className="absolute top-3 left-3 flex items-center gap-1.5 text-red-txt font-bold text-[13px] border border-red rounded-full px-3 py-1 bg-[var(--color-red-d)] pointer-events-none">
        <X size={14} /> Didn’t know
      </motion.span>
    </motion.div>
  );
}

function stripArticle(term: string, gender: string | null) {
  if (!gender) return term;
  return term.replace(/^(der|die|das)\s+/i, '');
}

/** Unobtrusive mastery dot on the card front: dim = new, amber = learning, green = known. */
function StatusPip({ id }: { id: string }) {
  const st = statusOf(id);
  const color = st === 'known' ? 'var(--color-green)' : st === 'learning' ? 'var(--color-amber)' : 'var(--color-dim)';
  const label = st === 'known' ? 'Known' : st === 'learning' ? 'Learning' : 'New';
  return <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full" style={{ background: color }} title={label} aria-label={`Status: ${label}`} />;
}

function DoneState({ done, again, newLearned, minedCount, firstRun, onExit, onPick }:
  { done: number; again: number; newLearned: number; minedCount: number; firstRun: boolean; onExit: () => void; onPick: () => void }) {
  const recall = done > 0 ? Math.round(((done - again) / done) * 100) : 0;
  // Fire milestones once, from this session's final state.
  const [milestone] = useState(() => checkMilestones());
  return (
    <div className="grid place-items-center min-h-[440px]">
      <SessionRecap data={{ reviewed: done, recall: done > 0 ? recall : undefined, newLearned, minedCount, milestone, streak: streak() }}>
        {firstRun && newLearned > 0 && (
          <p className="text-[15px] mb-5">These {newLearned} words come back tomorrow — that’s the whole system.</p>
        )}
        <div className="flex gap-2.5 justify-center flex-wrap">
          {!firstRun && <button onClick={onPick} className="bg-panel2 border border-line rounded-[10px] px-5 py-2.5 hover:border-amber">Another deck</button>}
          <button onClick={onExit} className="bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5 hover:brightness-105">{firstRun ? 'Got it' : 'Back to Today'}</button>
        </div>
        {/* The pride moment — the market as a designed image, not a cropped
            screenshot. Word-of-mouth is a local-first app's only channel. */}
        {!firstRun && (
          <button onClick={() => shareProgress()}
            className="mt-3 mx-auto flex items-center gap-1.5 text-[13px] text-dim hover:text-amber underline underline-offset-2">
            <Share2 size={13} /> Share your progress
          </button>
        )}
      </SessionRecap>
    </div>
  );
}
function EmptyState({ target, onExit, onPick, onDrills }: { target: Target; onExit: () => void; onPick: () => void; onDrills: () => void }) {
  return (
    <div className="grid place-items-center min-h-[440px]">
      <div className="text-center bg-panel border border-line rounded-2xl px-10 py-12 max-w-md">
        <h2 className="text-xl font-bold mb-1">Nothing due in {target.name}</h2>
        <p className="text-dim mb-6">No reviews are due and the new-card budget is used up. Try targeted drills, another deck, or a different CEFR level.</p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          <button onClick={onDrills} className="bg-panel2 border border-line rounded-[10px] px-5 py-2.5 hover:border-amber">Targeted drills</button>
          <button onClick={onPick} className="bg-panel2 border border-line rounded-[10px] px-5 py-2.5 hover:border-amber">Open decks</button>
          <button onClick={onExit} className="bg-amber text-bg font-bold rounded-[10px] px-5 py-2.5">Done</button>
        </div>
      </div>
    </div>
  );
}
