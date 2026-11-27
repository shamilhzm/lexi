// Wortbau: two words, a guess, and one press that makes them one *(2026-11-27)*.
//
// The slot shows the parts of a German compound as the dictionary has them (*die
// Hand*, *der Schuh*) and what each one means, with a blank where the whole's
// meaning goes. The learner guesses, then presses *Put them together*. The first
// part's article fades, the last part's article moves to the front, and the two
// become one word. That movement is the rule a compound follows, shown rather than
// stated. The blank fills in, in ink.
//
// **It never grades**, like a story or Jetzt: no `data-word`, so the dwell observer
// cannot see it, and nothing records the guess. The only thing it writes is the
// bookmark, when the learner asks for it (wortbau.test.ts holds the source to both).
// The rows are hand-picked and checked against the cards: `data/wortbau.ts`.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { BookmarkPlus, Check, Info } from 'lucide-react';
import { WORDS, LEVELS } from '../data/index.ts';
import {
  resolveWortbau, rankWortbau, siblingsOf, meaningOf, bareTerm, type Built, type Join,
} from '../data/wortbau.ts';
import { isSaved, toggleSaved, statusOf, levels } from '../store.ts';
import { useStore } from '../useStore.ts';
import { haptic, genderColor, markColor } from '../lib/ui.ts';
import { flyToUeben } from '../lib/flight.ts';
import { fitStyle } from './Reveal.tsx';
import { cardForTerm } from './JetztSlot.tsx';
import Kicker from './ui/Kicker.tsx';
import Button from './ui/Button.tsx';
import type { Word } from '../types.ts';

/** The day's order, made once and shared by every Wortbau slot in the feed, so the
 *  second slot shows the next compound rather than the first one again. It holds
 *  still for the day: back on Wörter this evening, the same compounds are where
 *  they were. */
let placed: { key: string; order: Built[]; all: Built[] } | null = null;
function dayOrder(): { order: Built[]; all: Built[] } {
  const key = `${new Date().toDateString()} ${WORDS.length}`;
  if (!placed || placed.key !== key) {
    const all = resolveWortbau(cardForTerm);
    const scope = levels();
    const order = rankWortbau(all, {
      status: statusOf, inScope: (l) => scope.size === 0 || scope.has(l), seed: key, levels: LEVELS,
    });
    placed = { key, order, all };
  }
  return placed;
}

const ART = /^(der|die|das)\s+/;
type Phase = 'apart' | 'closing' | 'joined';

export default function WortbauSlot({ k, onOpen, onSaved, onAnnounce }: {
  /** Which Wortbau slot this is in the feed: the first takes the day's first compound. */
  k: number;
  onOpen: (w: Word) => void;
  /** A save happened: the ready slot counts it. */
  onSaved: () => void;
  onAnnounce: (message: string) => void;
}) {
  useStore();
  const reduce = useReducedMotion();
  const [{ order, all }] = useState(dayOrder);
  const [cur, setCur] = useState<Built | undefined>(() => (order.length ? order[k % order.length] : undefined));
  const [phase, setPhase] = useState<Phase>('apart');
  const head = useRef<HTMLHeadingElement>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const siblings = useMemo(() => (cur ? siblingsOf(cur, all) : null), [cur, all]);
  if (!cur) return null;

  const [a, b] = cur.parts;
  const [[segA, , senseA], [segB, , senseB]] = cur.item.parts;
  const whole = cur.whole;
  const meaning = meaningOf(whole);
  const both = statusOf(a.id) === 'known' && statusOf(b.id) === 'known';
  const saved = isSaved(whole.id);
  const joined = phase === 'joined';
  const hid = `feed-wortbau-${k}`;
  // A layoutId per slot and per compound: two Wortbau slots never trade words, and
  // a sibling swapped in does not fly out of the word that was there.
  const lid = (s: string) => (reduce ? undefined : `wb${k}-${cur.item.whole}-${s}`);
  const glue = cur.joins[0].kind === 'glue' ? cur.joins[0].glue : '';
  const stemA = glue ? segA.slice(0, segA.length - glue.length) : segA;

  const together = () => {
    const hadFocus = document.activeElement instanceof HTMLElement && document.activeElement.dataset.wortbau === 'go';
    const finish = () => {
      setPhase('joined');
      // The button is gone; the word it made is the next thing to read.
      if (hadFocus) requestAnimationFrame(() => head.current?.focus());
    };
    haptic('grade');
    onAnnounce(`${whole.term}. ${senseA} plus ${senseB}: ${meaning}.`);
    if (reduce) finish();
    else { setPhase('closing'); timer.current = window.setTimeout(finish, 220); }
  };

  const another = (next: Built) => {
    window.clearTimeout(timer.current);
    setCur(next);
    setPhase('apart');
    requestAnimationFrame(() => head.current?.focus());
  };

  const onSave = () => {
    const now = toggleSaved(whole.id);
    haptic(now ? 'grade' : 'wrong');
    if (now && head.current) flyToUeben(head.current, bareTerm(whole.term));
    onAnnounce(now
      ? `${whole.term} saved, ${statusOf(whole.id) === 'learning' ? 'already in your sessions' : 'your next session will teach it'}`
      : `${whole.term} removed from your saved words`);
    onSaved();
  };

  const fade = (on: boolean) => (reduce ? {} : { animate: { opacity: on ? 1 : 0 }, transition: { duration: 0.18 } });
  const after = (delay: number) => (reduce ? {} : {
    initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 },
    transition: { type: 'spring' as const, stiffness: 260, damping: 26, delay },
  });

  return (
    <section aria-labelledby={hid}
      className="feed-slot snap-start snap-always h-full flex-shrink-0 w-full flex flex-col items-center justify-safe-center px-6
      pt-[var(--bar-t)] pb-[var(--bar-b)]">
      <div className="w-full max-w-[460px] text-center">
        <Kicker tone="accent" className="block">
          <span lang="de" translate="no">Wortbau</span>
          <span className="text-dim font-semibold"> · {both ? 'you know both halves' : 'words made of words'}</span>
        </Kicker>

        <LayoutGroup id={`wortbau-${k}`}>
          {/* The heading is the slot's subject in both states: the two parts, then
              the word they made. Focusable so a keyboard lands on it after the press. */}
          <h2 id={hid} ref={head} tabIndex={-1} lang="de" translate="no" className="mt-4 outline-none"
            // Joined, the word is four spans (article, parts, glue); its name is one word.
            aria-label={joined ? whole.term : undefined}>
            {!joined ? (
              <span className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-2">
                <Tile card={a} phase={phase} artId={undefined} wordId={lid('a')} reduce={!!reduce} />
                <motion.span className="text-dim text-xl" {...fade(phase === 'apart')}>+</motion.span>
                <Tile card={b} phase={phase} artId={lid('art')} wordId={lid('b')} reduce={!!reduce} />
              </span>
            ) : (
              <span className="hw-box">
                <span className="block headword hw-feed hw-fit leading-[1.08]" style={fitStyle(bareTerm(whole.term))}>
                  <motion.span layoutId={lid('art')} className="swash hw-article"
                    style={{ '--swash': markColor(whole.gender) } as CSSProperties}>{whole.gender}</motion.span>
                  <motion.span layoutId={lid('a')} className="inline-block">{stemA}</motion.span>
                  {glue && <motion.span className="inline-block text-accent" {...after(0.3)}>{glue}</motion.span>}
                  <motion.span layoutId={lid('b')} className="inline-block">{segB}</motion.span>
                </span>
              </span>
            )}
          </h2>
        </LayoutGroup>

        {/* The equation, with a gap to fill: a Lücke on the line, as in an exercise
            book. The meaning is written into it in ink once the parts are joined. */}
        <p className="mt-5 text-xl sm:text-2xl font-medium leading-snug text-balance">
          {senseA} <span className="text-dim">+</span> {senseB} <span className="text-dim">=</span>{' '}
          {joined
            ? <motion.b className="font-semibold text-accent" {...after(0.25)}>{meaning}</motion.b>
            : <span className="inline-block w-20 border-b-2 border-line align-baseline">&nbsp;<span className="sr-only">blank</span></span>}
        </p>

        {!joined ? (
          <>
            <p className="mt-3 text-sm text-dim">Guess it first, then put them together.</p>
            <div className="mt-6 min-h-11 flex items-center justify-center">
              <Button data-wortbau="go" onClick={together} disabled={phase !== 'apart'}>Put them together</Button>
            </div>
          </>
        ) : (
          <motion.div {...after(0.4)}>
            <p className="mt-3 text-sm text-dim text-balance max-w-[38ch] mx-auto">
              The last word picks the article:{' '}
              <span lang="de" translate="no"><b className="font-semibold" style={{ color: genderColor(b.gender) }}>{b.gender}</b> {bareTerm(b.term)}</span>.
              {' '}<JoinNote join={cur.joins[0]} seg={segA} part={a} />
            </p>

            {siblings && (
              <div className="mt-5 pt-4 border-t border-line">
                <Kicker className="block">More with <span lang="de" translate="no" className="normal-case tracking-normal">{bareTerm(siblings.via.term)}</span></Kicker>
                <p className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                  {siblings.list.map((s) => (
                    // Another gap, not an answer: the chip names the word and
                    // nothing it means, and a tap sets it up to be built.
                    <button key={s.item.whole} type="button" onClick={() => another(s)}
                      aria-label={`Build ${s.item.whole} next`}
                      className="tap-44 inline-flex items-center rounded-full border border-line bg-card px-3 py-1 text-[15px] active:bg-panel2 transition-colors">
                      <span lang="de" translate="no">{bareTerm(s.item.whole)}</span>
                    </button>
                  ))}
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={onSave} aria-pressed={saved}>
                {saved ? <Check size={15} aria-hidden /> : <BookmarkPlus size={15} aria-hidden />}
                {saved ? 'Saved for Üben' : 'Save for Üben'}
              </Button>
              <Button variant="quiet" size="sm" onClick={() => onOpen(whole)}>
                <Info size={15} aria-hidden /> Entry
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/** One part as the dictionary has it, on a slip that fades when the parts close up. */
function Tile({ card, phase, artId, wordId, reduce }: {
  card: Word; phase: Phase; artId?: string; wordId?: string; reduce: boolean;
}) {
  const art = ART.exec(card.term)?.[1];
  const word = card.term.replace(ART, '');
  const on = phase === 'apart';
  return (
    <span className="relative inline-flex items-baseline gap-1.5 px-3.5 py-2">
      <motion.span aria-hidden className="absolute inset-0 rounded-lg border border-line bg-card"
        animate={reduce ? undefined : { opacity: on ? 1 : 0 }} transition={{ duration: 0.18 }} />
      {art && (
        // The first part's article has nowhere to go and fades; the last part's
        // moves to the front of the word (`artId`), because it is the whole's.
        <motion.span layoutId={artId} className="relative inline-block text-lg font-semibold"
          style={{ color: genderColor(card.gender) }}
          animate={reduce || artId ? undefined : { opacity: on ? 1 : 0 }} transition={{ duration: 0.18 }}>{art}</motion.span>
      )}
      <motion.span layoutId={wordId} className="relative inline-block headword text-2xl">{word}</motion.span>
    </span>
  );
}

/** What the first part did on its way in, in one sentence, or nothing. */
function JoinNote({ join, seg, part }: { join: Join; seg: string; part: Word }) {
  const p = <i lang="de" translate="no">{bareTerm(part.term)}</i>;
  switch (join.kind) {
    case 'glue': return <>An <b lang="de" translate="no" className="font-semibold text-accent">{join.glue}</b> joins them.</>;
    case 'plural': return <><i lang="de" translate="no">{seg}</i> is the plural of {p}.</>;
    case 'elided': return <>{p} drops its <i>e</i>.</>;
    case 'stem': return <><i lang="de" translate="no">{seg}</i> is the stem of {p}.</>;
    default: return null;
  }
}
