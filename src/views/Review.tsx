// Üben — the unified session player. Interleaves FSRS flip cards (swipe right
// = knew it, swipe left = didn’t know) with grammar drills (gender / plural /
// conjugation / cloze) for the same words. Handles vocabulary and grammar cards.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useReducedMotion, animate } from 'motion/react';
import { Volume2, VolumeX, ArrowLeft, Check, X, RotateCcw, SkipForward, Flag, Share2 } from 'lucide-react';
import { shareProgress } from '../lib/sharecard.ts';
import { review, restoreCard, cardOf, levels, statusOf, streak, logMiss, checkMilestones, checkCompletions, flagCard, isFlagged, sound, setSound } from '../store.ts';
import { haptic, tick } from '../lib/ui.ts';
import { buildMixedSession } from '../session.ts';
import { GenderItem, PluralItem, ConjItem, ClozeItem, OrderWordItem, TransformItem, CaseItem, MODE_TAG } from './Fundamentals.tsx';
import { GrammarExercise } from './GrammarDrill.tsx';
import { loadGrammar, type GPoint } from '../lib/grammar.ts';
import { useStore } from '../useStore.ts';
// `Card` here is the UI surface; the FSRS card type is aliased so the two
// can coexist in this file.
import { Rating, emptyCard, previewInterval, type Grade, type Card as SrsCard } from '../srs.ts';
import { speak } from '../lib/tts.ts';
import { Illustration } from '../lib/illustration.tsx';
import SessionRecap, { type RecapData } from '../components/SessionRecap.tsx';
import WhyThisCard from '../components/WhyThisCard.tsx';
import { SpeakButton, RevealBlock, ExampleList, TermList, FalseFriendNote, GenderTerm } from '../components/Reveal.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import IconButton from '../components/ui/IconButton.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import type { Target } from '../types.ts';

const DRILL_TAG: Record<string, string> = { gender: 'Gender', plural: 'Plural', conj: 'Conjugation', cloze: 'Cloze', order: 'Word order', transform: 'Transform', case: 'Kasus' };
const SWIPE_PX = 90; // horizontal travel that commits a grade

/** The grade scale.
 *
 *  FSRS takes four ratings and Lexi only ever sent two — `Rating.Hard` and
 *  `Rating.Easy` appeared nowhere outside the tests. That throws away exactly the
 *  signal the scheduler exists to act on: the difference between recalling
 *  something after a struggle and recalling it instantly. Two ratings make every
 *  success identical, so intervals grow at one rate for a word you nearly lost and
 *  a word you will never forget.
 *
 *  `firstSight` is the label for a card the learner has never met, and its absence
 *  is meaningful: a first-sight card is an introduction, not a test, so there was
 *  no retrieval to rate on a difficulty scale and only those two grades are shown.
 *  The button count follows whether recall actually happened. */
const SCALE: { rating: Grade; label: string; firstSight?: string; hover: string }[] = [
  { rating: Rating.Again, label: 'Didn’t know', firstSight: 'Still learning', hover: 'hover:border-red hover:text-red' },
  { rating: Rating.Hard, label: 'Hard', hover: 'hover:border-amber hover:text-amber' },
  { rating: Rating.Good, label: 'Knew it', firstSight: 'Got it', hover: 'hover:border-green hover:text-green' },
  { rating: Rating.Easy, label: 'Easy', hover: 'hover:border-green hover:text-green' },
];

/** Stable per-card pick from a grammar point’s exercises (same card → same drill). */
function pickExercise(point: GPoint, seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return point.exercises[Math.abs(h) % point.exercises.length];
}

export default function Review({ target, onExit, onPick, onDrills, firstRun = false }: { target: Target; onExit: () => void; onPick: () => void; onDrills: () => void; firstRun?: boolean }) {
  useStore(); // re-render when the CEFR filter changes
  const lvKey = [...levels()].sort().join('');
  const queue = useMemo(() => buildMixedSession(target, firstRun), [target, lvKey, firstRun]);
  const minedCount = useMemo(() => new Set(queue.filter((it) => it.word.id.startsWith('usr:')).map((it) => it.word.id)).size, [queue]);
  // Counted from the queue's own provenance, so the recap can describe what the
  // scheduler did rather than only how the learner scored.
  const composition = useMemo(() => queue.reduce(
    (acc, it) => {
      if (it.reason.kind === 'blindspot') acc.blindspot++;
      else if (it.reason.kind === 'linked') acc.linked++;
      else if (it.reason.kind === 'remedy') acc.remedy++;
      else if ((it.reason.kind === 'due' || it.reason.kind === 'orphan') && it.reason.overdueDays >= 7) acc.overdue++;
      return acc;
    },
    { blindspot: 0, linked: 0, remedy: 0, overdue: 0 },
  ), [queue]);
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [again, setAgain] = useState(0);       // lapses this session
  const [newLearned, setNewLearned] = useState(0); // cards that left the New state
  const [gmap, setGmap] = useState<Map<string, GPoint> | null>(null); // grammar point → exercises
  // Per-session action log so prev/undo can reverse a grade (restore FSRS state)
  // or a skip, and rewind counters + position exactly.
  const history = useRef<{ i: number; kind: 'grade' | 'skip'; srsId?: string; prevCard?: SrsCard; dAgain?: number; dNew?: number }[]>([]);
  // Which way the outgoing card flies: +1 knew it, -1 didn’t, 0 neutral (skip/
  // prev). Set by every grade path, so swipes, buttons and arrow keys all share
  // one physical vocabulary: right = knew, left = missed.
  const exitDir = useRef(0);

  // Feel layer: the comeback of the day (a word you’d missed ≥2 times before
  // and got right today), and the miss-streak circuit breaker (F3): after 4
  // straight misses, offer a graceful out — once per session, never nagging.
  const [comeback, setComeback] = useState<{ term: string; lapses: number } | null>(null);
  const missRun = useRef(0);
  // Misses tagged in *this* session, so the recap can name the one concept that
  // tripped the learner up most today rather than their 30-day average.
  const sessionMisses = useRef(new Map<string, number>());
  const noteMiss = (tag: string) => {
    logMiss(tag);
    sessionMisses.current.set(tag, (sessionMisses.current.get(tag) ?? 0) + 1);
  };
  const [breather, setBreather] = useState(false);
  const breatherShown = useRef(false);
  const noteResult = (ok: boolean, srsIdBefore?: SrsCard, term?: string) => {
    if (ok) {
      missRun.current = 0;
      tick('good');
      const lapses = srsIdBefore?.lapses ?? 0;
      if (term && lapses >= 2) setComeback((c) => (!c || lapses > c.lapses ? { term, lapses } : c));
      return;
    }
    tick('wrong');
    if (++missRun.current >= 4 && !breatherShown.current) {
      breatherShown.current = true;
      setBreather(true);
    }
  };

  // restart the session when scope (target) or level filter changes
  useEffect(() => {
    setI(0); setDone(0); setAgain(0); setNewLearned(0); setFlipped(false); history.current = [];
    setComeback(null); missRun.current = 0; setBreather(false); breatherShown.current = false;
    sessionMisses.current.clear();
  }, [target, lvKey]);

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
  // the scheduler earns trust — machinery, not magic (Anki’s oldest lesson).
  const preview = useMemo(() => {
    if (!item || item.type !== 'flip') return null;
    const c = cardOf(item.srsId) ?? emptyCard();
    // One entry per rating, so every button can state its own consequence rather
    // than only the two extremes being honest about theirs.
    return new Map(SCALE.map((s) => [s.rating, previewInterval(c, s.rating)]));
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
    exitDir.current = g === Rating.Again ? -1 : 1;
    noteResult(g !== Rating.Again, cardOf(item.srsId), item.word.term);
    review(item.srsId, g);
    haptic(g === Rating.Again ? 'wrong' : 'grade');
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
    exitDir.current = ok ? 1 : -1;
    noteResult(ok);
    review(item.srsId, ok ? Rating.Good : Rating.Again);
    haptic(ok ? 'grade' : 'wrong');
    if (!ok) noteMiss(MODE_TAG[item.type]);
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
    exitDir.current = ok ? 1 : -1;
    noteResult(ok);
    review(item.srsId, ok ? Rating.Good : Rating.Again);
    haptic(ok ? 'grade' : 'wrong');
    if (!ok) noteMiss(item.word.term);
    setAgain((a) => a + dAgain);
    setNewLearned((n) => n + dNew);
    setDone((d) => d + 1);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  // Skip: advance without grading — the card stays due for a later session.
  // A skipped exercise is a "zu steil" (too steep) signal: you couldn’t attempt
  // it, which is blind-spot information — so it feeds the miss log that ranks
  // weak modes and triggers remediation, while FSRS stays untouched (a skip is
  // never a lapse). Plain word flips log nothing: skipping a word isn’t
  // structural.
  const skip = useCallback(() => {
    if (!item) return;
    exitDir.current = 0;
    history.current.push({ i, kind: 'skip' });
    if (item.type !== 'flip') noteMiss(MODE_TAG[item.type]);
    else if (item.word.kind === 'grammar') noteMiss(item.word.term);
    setFlipped(false);
    setI((n) => n + 1);
  }, [item, i]);

  // Prev: undo the last action. On a grade, restore the FSRS state and rewind
  // counters; on a skip, just step back. Position returns to that card.
  const prev = useCallback(() => {
    const e = history.current.pop();
    if (!e) return;
    exitDir.current = 0;
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
      const t = e.target as HTMLElement | null;
      // Never hijack keys while the learner is typing an answer — Space must
      // insert a space in "habe gemacht", not flip the card.
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      // Nor while a control has focus: Space is that control’s own activation
      // key, and this listener used to fire *as well*, so pressing Space on
      // "Didn’t know" both graded the card and flipped the next one.
      if (t && (t.tagName === 'BUTTON' || t.closest?.('button, a, select'))) {
        if (e.code === 'Space' || e.key === 'Enter') return;
      }
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      // ←/→ stay as the two-way shortcut the swipe mirrors; 1–4 reach the full
      // scale, which is otherwise mouse-only. A new card has no 2 or 4 to press.
      if (e.key === 'ArrowLeft') grade(Rating.Again);
      if (e.key === 'ArrowRight') grade(Rating.Good);
      if (e.key >= '1' && e.key <= '4') {
        const s = SCALE[Number(e.key) - 1];
        const firstSight = !!item && statusOf(item.srsId) === 'new';
        if (s && (!firstSight || s.firstSight)) grade(s.rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, grade, item]);

  if (queue.length === 0) return <EmptyState target={target} onExit={onExit} onPick={onPick} onDrills={onDrills} />;
  if (!item) return <DoneState done={done} again={again} newLearned={newLearned} minedCount={minedCount} comeback={comeback} firstRun={firstRun}
    weakest={[...sessionMisses.current.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]}
    composition={composition}
    onExit={onExit} onPick={onPick} />;

  const card = item.word;
  const drill = item.type !== 'flip';
  const grammar = card.kind === 'grammar';
  const isNew = statusOf(item.srsId) === 'new';
  // A grammar card renders as a practical exercise when its point is in the bank.
  const gpoint = grammar && gmap ? gmap.get(`${card.level}::${card.term}`) : undefined;
  const grammarEx = gpoint && gpoint.exercises.length ? pickExercise(gpoint, item.srsId) : null;
  const asExercise = drill || !!grammarEx;

  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 flex flex-col justify-center">
      <CoachMarks />
      {/* Circuit breaker (F3): four straight misses isn’t failure, it’s a hard
          patch. Offer a graceful stop at a natural break — once, then quiet. */}
      {breather && (
        <Card accent pad="none" role="status"
          className="px-4 py-3 mb-2.5 flex items-center gap-3 flex-wrap">
          <p className="text-xs flex-1 min-w-[200px]">
            Rough patch — that’s the system finding your edge. These come back easier tomorrow.
          </p>
          <div className="flex gap-2">
            <Button variant="quiet" size="sm"
              onClick={() => { setBreather(false); setI(queue.length); tick('done'); }}>Stop here</Button>
            <Button size="sm" onClick={() => setBreather(false)}>Keep going</Button>
          </div>
        </Card>
      )}
      <Card pad="none">
        {/* min-w on the title stops it from being crushed to nothing: when the
            four controls no longer fit beside it, the cluster wraps to its own
            line instead of truncating the deck name to two characters. */}
        <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 flex-wrap">
          <IconButton label="Back to Today" pull onClick={onExit}><ArrowLeft size={16} /></IconButton>
          <h1 className="text-base font-semibold truncate flex-1 min-w-[7rem]">{target.name}</h1>
          <Chip aria-label={`${queue.length - i} cards left in this session`}>{queue.length - i} left</Chip>
          {/* Prev (undo) + skip — the only in-session controls; levels live on Home, keys in onboarding. */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            {/* Flag: "something’s wrong with this card" — the feedback loop for a
                solo-maintained corpus. Local, deduped, exports with the backup. */}
            <IconButton
              onClick={() => item && flagCard(item.word.id, item.word.term)}
              label={item && isFlagged(item.word.id) ? 'Card flagged — it exports with your backup' : 'Flag a problem with this card'}
              aria-pressed={!!(item && isFlagged(item.word.id))}
              active={!!(item && isFlagged(item.word.id))}>
              <Flag size={15} fill={item && isFlagged(item.word.id) ? 'currentColor' : 'none'} />
            </IconButton>
            {/* Sound is on by default now, so muting has to be reachable from
                inside the session — not three taps away in Settings. */}
            <IconButton onClick={() => setSound(!sound())}
              label={sound() ? 'Mute sound' : 'Unmute sound'}
              aria-pressed={!sound()} active={!sound()}>
              {sound() ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </IconButton>
            <IconButton label="Previous card" onClick={prev} disabled={i === 0}><RotateCcw size={16} /></IconButton>
            <IconButton label="Skip this card" onClick={skip}><SkipForward size={16} /></IconButton>
          </div>
        </div>
        {/* Slim session progress — tracks position through the queue. */}
        <div className="h-0.5 bg-panel2" role="progressbar" aria-label="Session progress"
          aria-valuenow={i} aria-valuemin={0} aria-valuemax={queue.length}
          aria-valuetext={`${i} of ${queue.length} done`}>
          <div className="relative h-full bg-amber transition-[width] duration-300" style={{ width: `${queue.length ? (i / queue.length) * 100 : 0}%` }}>
            {/* The cursor rides the tip of the bar — the terminal writes your session. */}
            {i > 0 && <span aria-hidden className="absolute -right-px top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-amber" style={{ boxShadow: '0 0 8px 2px var(--color-amber)' }} />}
          </div>
        </div>

        {/* The card swaps in place, so nothing here is ever re-announced without
            a live region — Placement and the drills each got one, and the
            primary loop was the surface that didn’t. */}
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 px-3 sm:px-6 min-h-[400px]"
          role="region" aria-live="polite" aria-label="Current card">
          <AnimatePresence mode="wait" custom={exitDir.current}>
          <motion.div key={item.srsId} custom={exitDir.current} className="w-full flex flex-col items-center"
            variants={{
              initial: { opacity: 0, scale: 0.97, y: 12 },
              enter: { opacity: 1, scale: 1, y: 0 },
              // A graded card leaves the way it was judged — continuing the
              // swipe’s motion (or lending buttons/keys the same physics).
              // Neutral exits (skip, prev, drills swapping in) just dissolve.
              exit: (dir: number) => (reduce || !dir)
                ? { opacity: 0, scale: 0.98, transition: { duration: reduce ? 0 : 0.15, ease: 'easeOut' } }
                : { opacity: 0, x: dir * 340, rotate: dir * 5, transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } },
            }}
            initial="initial" animate="enter" exit="exit"
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34, mass: 0.8 }}>
          {/* The payoff of carrying provenance: the scheduler shows its work. */}
          <WhyThisCard reason={item.reason} />

          {asExercise ? (
            <div className="relative w-full max-w-[580px]">
              <span className="absolute -top-2.5 right-3 z-10 text-2xs text-amber bg-panel2 border border-line rounded-full px-2 py-0.5 font-mono uppercase tracking-widest">{grammarEx ? 'Grammar' : (DRILL_TAG[item.type] ?? 'Drill')}</span>
              {/* A drill can arrive mid-session without the learner ever having
                  chosen the concept — this is the screen where a beginner meets
                  "Nominativ" cold. Name it, and make the name open the rule.
                  That header is now the *item's* (see DrillHeader): deriving it
                  here from `item.type` could only ever name the mode, and three
                  of the seven modes pick a different grammatical target on every
                  card — so a Futur I prompt offered the Perfekt rule. */}
              {grammarEx
                ? <GrammarExercise key={item.srsId} ex={grammarEx} onGrade={gradeGrammar} point={{ level: card.level, title: card.term }} />
                : item.type === 'gender' ? <GenderItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'plural' ? <PluralItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'conj' ? <ConjItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'order' ? <OrderWordItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'transform' ? <TransformItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : item.type === 'case' ? <CaseItem key={item.srsId} word={card} onGrade={gradeDrill} />
                : <ClozeItem key={item.srsId} word={card} onGrade={gradeDrill} />}
            </div>
          ) : (<>
          <SwipeCard key={item.srsId} onFlip={flip} onGrade={grade} behind={Math.min(2, queue.length - i - 1)}>
            <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
              {/* FRONT — the prompt: word + German context, no translation to spoil
                  the test. Except on first sight: a card the learner has never met
                  is an introduction, not a test. Hiding the meaning there just asks
                  them to fail at recalling something nobody taught them, so a new
                  card shows its gloss and the grade becomes "did that land?".
                  Retrieval starts at the next review, which FSRS schedules minutes
                  later. */}
              {/* The terminal is the room; the card is the thing in your hand —
                  but it's the same *palette* as the room, distinguished by
                  material: grain, the larger radius, a deeper lift, and the
                  serif headword. The earlier warm-cream version changed the
                  brand hue by 153° on entry, which is why it read as foreign. */}
              <div className="flip-face relative border border-line rounded-lg bg-card flex flex-col items-center justify-center gap-3 p-6 sm:p-8 text-center overflow-y-auto">
                <StatusPip id={item.srsId} />
                <span className="text-2xs text-dim font-mono uppercase tracking-widest">
                  {isNew && <span className="text-amber">New · </span>}
                  {grammar ? 'Grammar' : (card.pos || 'word')} · {card.level}{!grammar && card.field ? ` · ${card.field}` : ''}
                </span>
                {!grammar && <Illustration word={card} size={68} className="text-amber select-none" />}
                {/* lang="de" on every German string: without it a screen reader
                    pronounces the entire lexicon of a German app in an English
                    voice, which is the one thing this surface must not do. */}
                <GenderTerm term={card.term} gender={card.gender}
                  className={`headword font-bold leading-tight break-words max-w-full px-2 ${grammar ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl'}`} />
                {card.ipa && <span className="font-mono text-base text-dim">/{card.ipa}/</span>}
                {isNew && !grammar && (
                  <span className="text-green font-semibold text-xl sm:text-2xl leading-tight max-w-[92%]">{card.en}</span>
                )}
                {!grammar && (
                  <button onClick={(e) => { e.stopPropagation(); speak(card.term); }}
                    className="grid place-items-center w-11 h-11 rounded-full bg-panel border border-line text-amber hover:bg-panel2 active:scale-95" title="Pronunciation">
                    <Volume2 size={18} />
                  </button>
                )}
                {card.ex[0] && (
                  <span className="max-w-[90%] flex items-baseline justify-center gap-1.5">
                    <span lang="de" className="text-dim italic text-base leading-relaxed">{card.ex[0].de}</span>
                    {/* Hearing the word *in a sentence* is how pronunciation is
                        actually learned; the only speaker used to be on the bare
                        headword. */}
                    <SpeakButton text={card.ex[0].de} label={`Hear the example “${card.ex[0].de}”`} />
                  </span>
                )}
                {isNew && card.ex[0]?.en && <span className="text-dim text-sm leading-relaxed max-w-[90%]">{card.ex[0].en}</span>}
              </div>
              {/* BACK — the reveal.
                  Four things were wrong with the previous face, and all four came
                  from the same idea: that the back is a different *thing*.

                  1. It set `background: var(--color-green-d)` inline and so never
                     applied `.bg-card` — no grain, no top-light gradient, only the
                     `.flip-face` shadow. Turning the card over changed what it was
                     made of, which is DESIGN.md §3 broken by the app's own hero
                     object, and the `.paper` mistake in a different costume.
                  2. Green is documented as the *status* colour ("gains / mastered").
                     Painting the whole answer face in it delivers a verdict before
                     any grading has happened — on a card you may be about to fail —
                     and it collides with the drills' own green "correct" surface.
                     Green now survives as an edge rule, the kicker and the ink.
                  3. Three alignments in one 400px face: the face was `items-center
                     text-center`, the examples block `text-left`, and the synonyms
                     centred again. Nothing shared an edge.
                  4. `justify-center` with `overflow-y-auto` scrolls from the middle,
                     so a C1 card (definition + two bilingual examples + synonyms +
                     antonyms) silently clipped at the top.

                  The front is centred because it presents one object; the back is
                  flush-left because it is an entry you read. That asymmetry is
                  deliberate, and it replaces an accidental one. */}
              <div className="flip-face flip-back bg-card border border-line border-l-4 rounded-lg
                              flex flex-col items-stretch text-left p-5 sm:p-7 overflow-y-auto"
                   style={{ borderLeftColor: 'var(--color-green)' }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Kicker tone="reward">{grammar ? 'Rule' : 'Answer'}</Kicker>
                  {!grammar && (
                    <>
                      {/* The German stays in view at the reveal: seeing the pair
                          together is the encoding, and the front's term vanished
                          the instant you learned what it meant. */}
                      <span aria-hidden className="text-dim text-2xs">·</span>
                      {/* Gender ink survives the flip now. It used to live only on
                          the front, so the article's colour — the most useful mark
                          on a German card — vanished the moment you turned it. */}
                      <GenderTerm term={card.term} gender={card.gender}
                        className="font-mono text-2xs text-dim truncate" />
                    </>
                  )}
                  <span className="ml-auto flex items-center flex-shrink-0">
                    <SpeakButton text={card.term} label={`Hear “${card.term}” in German`} />
                  </span>
                </div>
                <span className={`headword font-bold text-green leading-tight break-words ${grammar ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'}`}>{card.en}</span>
                <Kicker className="block mt-1.5">
                  {grammar ? 'Grammar' : card.pos} · {card.level}{!grammar && card.field ? ` · ${card.field}` : ''}
                </Kicker>
                {card.def && (
                  <RevealBlock label={grammar ? 'How it works' : 'Definition'}>
                    <p className="text-txt text-sm leading-relaxed whitespace-pre-line">{card.def}</p>
                  </RevealBlock>
                )}
                {!grammar && <FalseFriendNote term={card.term} />}
                {!grammar && card.ex.length > 0 && (
                  <RevealBlock label="In use"><ExampleList items={card.ex} /></RevealBlock>
                )}
                {(card.syn.length > 0 || card.ant.length > 0) && (
                  <RevealBlock className="space-y-1.5">
                    <TermList label="Syn" terms={card.syn} />
                    <TermList label="Opp" terms={card.ant} tone="red" />
                  </RevealBlock>
                )}
              </div>
            </div>
          </SwipeCard>

          {/* Grade from either face — flipping is optional. First-sight cards
              can’t be "known", so new cards ask "keep it or got it" instead of
              framing an inevitable miss as failure. */}
          <div className="min-h-[64px] mt-6 flex flex-col items-center justify-center gap-2 w-full">
            {/* Two grades on a first-sight card, four once there was something to
                recall. Four columns don't fit a phone, so they wrap 2×2 — which
                also puts the two familiar verdicts on the first row. */}
            <div className={`grid gap-2 sm:gap-2.5 w-full max-w-[580px] ${
              isNew ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {SCALE.filter((s) => !isNew || s.firstSight).map((s) => {
                const label = (isNew && s.firstSight) ? s.firstSight : s.label;
                const when = preview?.get(s.rating);
                return (
                  // Explicit label: without it the accessible name runs the
                  // interval preview straight onto the verdict ("Knew it 2 mo").
                  <button key={s.rating} onClick={() => grade(s.rating)}
                    aria-label={`${label}${when ? ` — back in ${when}` : ''}`}
                    className={`flex flex-col items-center border border-line bg-panel rounded-md px-3 py-2
                      justify-center font-semibold transition-colors active:scale-95 ${s.hover}`}>
                    <span className="flex items-center gap-1.5 text-sm sm:text-base">
                      {s.rating === Rating.Again && <X size={15} className="flex-shrink-0" />}
                      {s.rating === Rating.Good && <Check size={15} className="flex-shrink-0" />}
                      {label}
                    </span>
                    {when && <span className="text-2xs text-dim font-mono font-normal mt-0.5">{when}</span>}
                  </button>
                );
              })}
            </div>
            <span className={`text-dim text-xs h-4 leading-4 transition-opacity ${flipped ? 'opacity-0' : ''}`}>
              {isNew && !grammar
                ? 'First time seeing this — take it in, then say how it landed'
                : `Space to flip · 1–4 to grade`}
            </span>
          </div>
          </>)}
          </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

/** Draggable flip-card. Tap flips; swipe right = knew it (Good), swipe left =
 *  didn’t know (Again). Commits on travel OR a confident flick (velocity with
 *  real distance behind it); below threshold the card is handed back with the
 *  release velocity, so the return reads as the gesture settling — not a reset.
 *
 *  `behind` draws the rest of the queue as a physical stack. "35 left" is a
 *  number standing in for something that should be *seen*: the pile thins as you
 *  work, and the last card has nothing behind it, so finishing is visible before
 *  it is announced. */
function SwipeCard({ children, onFlip, onGrade, behind = 0 }:
  { children: React.ReactNode; onFlip: () => void; onGrade: (g: Grade) => void; behind?: number }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const yes = useTransform(x, [20, SWIPE_PX], [0, 1]);
  const no = useTransform(x, [-20, -SWIPE_PX], [0, 1]);
  const reduce = useReducedMotion();
  const dragged = useRef(false);
  return (
    <div className="relative w-full max-w-[580px] h-[clamp(340px,52vh,460px)]">
      {/* Static, aria-hidden, and behind the drag surface: this is scenery, not
          content. Rendered outermost-first so the nearest sits on top. */}
      {Array.from({ length: behind }, (_, k) => behind - 1 - k).map((depth) => (
        <div key={depth} aria-hidden
          className="absolute inset-x-0 top-0 h-full rounded-lg border border-line bg-card"
          style={{
            transform: `translateY(${(depth + 1) * 7}px) scale(${1 - (depth + 1) * 0.025})`,
            opacity: 1 - (depth + 1) * 0.28,
          }} />
      ))}
    <motion.div
      // The card is a control, not a div with a click handler: it was never
      // focusable, so its only keyboard path was a global window listener.
      role="button"
      tabIndex={0}
      aria-label="Flashcard — activate to flip, or use the grade buttons below"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip(); }
      }}
      // Fluid height: this was a fixed 360/420px with overflow-y-auto faces, so
      // a C1 card (definition + two bilingual examples + synonyms + antonyms) at
      // the "Larger" text scale silently scrolled inside a drag surface.
      // Absolute so it sits exactly on top of the stack behind it.
      className="absolute inset-0 cursor-pointer touch-pan-y rounded-lg"
      style={{ x, rotate: reduce ? 0 : rotate }}
      drag="x"
      dragElastic={0.6}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        const { offset, velocity } = info;
        const flick = Math.abs(velocity.x) > 480 && Math.abs(offset.x) > 36;
        if (offset.x > SWIPE_PX || (flick && velocity.x > 0)) onGrade(Rating.Good);
        else if (offset.x < -SWIPE_PX || (flick && velocity.x < 0)) onGrade(Rating.Again);
        else animate(x, 0, { type: 'spring', stiffness: 420, damping: 30, velocity: velocity.x });
        setTimeout(() => { dragged.current = false; }, 0);
      }}
      onClick={() => { if (!dragged.current) onFlip(); }}
    >
      <div className="flip w-full h-full">{children}</div>
      <motion.span style={{ opacity: yes }}
        className="absolute top-3 right-3 flex items-center gap-1.5 text-green font-bold text-xs border border-green rounded-full px-3 py-1 bg-[var(--color-green-d)] pointer-events-none">
        <Check size={14} /> Knew it
      </motion.span>
      <motion.span style={{ opacity: no }}
        className="absolute top-3 left-3 flex items-center gap-1.5 text-red-txt font-bold text-xs border border-red rounded-full px-3 py-1 bg-[var(--color-red-d)] pointer-events-none">
        <X size={14} /> Didn’t know
      </motion.span>
    </motion.div>
    </div>
  );
}

/** One-time first-session tips (Karl, S6): flip / grade / skip, then gone. */
function CoachMarks() {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem('lexi.coach.session.v1') !== '1'; } catch { return false; }
  });
  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem('lexi.coach.session.v1', '1'); } catch { /* */ }
    setShow(false);
  };
  return (
    <Card pad="none" className="px-4 py-3 mb-2.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-dim">
      <span><b className="text-txt font-semibold">Tap</b> the card to flip it</span>
      <span aria-hidden>·</span>
      <span><b className="text-txt font-semibold">Swipe</b> or use the buttons to grade</span>
      <span aria-hidden>·</span>
      {/* The keyboard path existed but was never stated anywhere in the UI — and
          what it stated only ever worked on the flip card. The drills now take
          1–4 and Enter too, so one line covers every card type. */}
      <span className="hidden sm:inline">
        <kbd className="text-txt font-semibold">Space</kbd> flips,{' '}
        <kbd className="text-txt font-semibold">1</kbd>–<kbd className="text-txt font-semibold">4</kbd> grade or answer,{' '}
        <kbd className="text-txt font-semibold">Enter</kbd> continues
      </span>
      <span aria-hidden className="hidden sm:inline">·</span>
      <span><b className="text-txt font-semibold">Skip</b> is always free</span>
      <button onClick={dismiss} className="ml-auto text-amber font-semibold hover:brightness-110">Got it</button>
    </Card>
  );
}


/** Unobtrusive mastery dot on the card front: dim = new, amber = learning, green = known. */
function StatusPip({ id }: { id: string }) {
  const st = statusOf(id);
  const color = st === 'known' ? 'var(--color-green)' : st === 'learning' ? 'var(--color-amber)' : 'var(--color-dim)';
  const label = st === 'known' ? 'Known' : st === 'learning' ? 'Learning' : 'New';
  return <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full" style={{ background: color }} title={label} aria-label={`Status: ${label}`} />;
}

function DoneState({ done, again, newLearned, minedCount, comeback, firstRun, weakest, composition, onExit, onPick }:
  { done: number; again: number; newLearned: number; minedCount: number; comeback: { term: string; lapses: number } | null; firstRun: boolean; weakest?: string;
    composition?: RecapData['composition']; onExit: () => void; onPick: () => void }) {
  const recall = done > 0 ? Math.round(((done - again) / done) * 100) : 0;
  // Fire milestones + the closing cue once, from the final state. Crossing a
  // milestone earns the triad; an ordinary finish gets the plain two-note rise,
  // so the bigger sound stays rare enough to still mean something.
  const [milestone] = useState(() => {
    const m = checkMilestones();
    tick(m ? 'milestone' : 'done');
    return m;
  });
  // Finishing a sector is the one thing in this app you can actually complete.
  // Checked once, from the final state, like the milestone above it.
  const [finished] = useState(() => checkCompletions());
  return (
    <div className="grid place-items-center min-h-[440px]">
      <SessionRecap data={{ reviewed: done, recall: done > 0 ? recall : undefined, newLearned, minedCount, milestone, weakest, composition, streak: streak() }}>
        {finished.length > 0 && (
          <p className="text-sm mb-5">
            You finished <span lang="de" className="text-green font-bold">{finished.map((f) => f.name).join(', ')}</span> — every card in it is yours.
          </p>
        )}
        {comeback && (
          <p className="text-xs text-dim mb-5">
            Comeback of the day: <span className="text-green font-semibold">{comeback.term}</span> — missed {comeback.lapses} times before, yours today.
          </p>
        )}
        {firstRun && newLearned > 0 && (
          <p className="text-base mb-5">These {newLearned} words come back tomorrow — that’s the whole system.</p>
        )}
        <div className="flex gap-2.5 justify-center flex-wrap">
          {!firstRun && <Button variant="secondary" onClick={onPick}>Another deck</Button>}
          <Button onClick={onExit}>{firstRun ? 'Got it' : 'Back to Today'}</Button>
        </div>
        {/* The pride moment — the market as a designed image, not a cropped
            screenshot. Word-of-mouth is a local-first app’s only channel. */}
        {!firstRun && (
          <button onClick={() => shareProgress()}
            className="mt-3 mx-auto flex items-center gap-1.5 text-xs text-dim hover:text-amber underline underline-offset-2">
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
      <Card pad="none" className="text-center px-10 py-12 max-w-md">
        <h2 className="text-xl font-bold mb-1">Nothing due in {target.name}</h2>
        <p className="text-dim mb-6">No reviews are due and the new-card budget is used up. Try targeted drills, another deck, or a different CEFR level.</p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          <Button variant="secondary" onClick={onDrills}>Targeted drills</Button>
          <Button variant="secondary" onClick={onPick}>Open decks</Button>
          <Button onClick={onExit}>Done</Button>
        </div>
      </Card>
    </div>
  );
}
