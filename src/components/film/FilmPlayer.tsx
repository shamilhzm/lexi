// The film player — a learner-paced animated lesson, in a layer over the course.
//
// ## Why it is paced by the learner and not by a clock
//
// A video runs at the speed of its editor. A learner reading a second language
// does not — and the evidence on multimedia learning is blunt about it: splitting
// an explanation into learner-paced segments beats a continuous presentation
// (Mayer's *segmenting principle*), and asking for a prediction before showing
// the answer is what turns watching into thinking (the generation effect; it is
// also the owner's own "open the gap before the answer"). So a film is a run of
// beats: each animates in, and the learner moves on when they have it.
//
// ## Rules it keeps (DESIGN §7, VISION)
//
// - **Entrances translate; they never fade or scale content from zero.** A
//   stalled animation leaves everything visible and every key full-size.
// - **Nothing here grades.** A guess is a guess. The unit's Üben session grades.
// - **Every fact about a word comes from its card**, and every pattern is counted
//   from the corpus while the beat plays (`measure.ts`).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ChevronLeft, GraduationCap, RotateCcw, Volume2, X } from 'lucide-react';
import Layer, { topLayer } from '../Layer.tsx';
import Button from '../ui/Button.tsx';
import Kicker from '../ui/Kicker.tsx';
import { GenderTerm, InkedArticle, SpeakButton, fitStyle } from '../Reveal.tsx';
import { cardByTerm, filmTerms } from '../../data/course.ts';
import { loadDetailFor } from '../../data/detail.ts';
import { countEnding } from '../../films/measure.ts';
import { speak } from '../../lib/tts.ts';
import { genderColor, haptic } from '../../lib/ui.ts';
import { shownTerm } from '../../lib/focus.ts';
import { falseFriend } from '../../lib/falseFriends.ts';
import { markFilmSeen } from '../../store.ts';
import { loadTransfer, type TransferData } from '../../lib/transfer.ts';
import type { Beat, Film, Gender } from '../../films/types.ts';
import type { Word } from '../../types.ts';

const ARTICLES: Gender[] = ['der', 'die', 'das'];
const bare = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

/** A beat that asks for a guess holds the film until it is answered. */
const asks = (b: Beat) => b.kind === 'gender' || b.kind === 'choice';

export default function FilmPlayer({ film, unitTitle, wordCount, onStudy, onClose }: {
  film: Film;
  unitTitle: string;
  /** How many words the unit's session would teach — said on the last beat. */
  wordCount: number;
  onStudy: () => void;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState<Record<number, number>>({});
  const beat = film.beats[i];
  const last = i === film.beats.length - 1;
  const canNext = !asks(beat) || answered[i] !== undefined;

  // Examples live in the per-level detail shards; fetch the ones this film needs.
  const [, setReady] = useState(0);
  useEffect(() => {
    const words = filmTerms(film).map(cardByTerm).filter((w): w is Word => !!w);
    void loadDetailFor(words).then(() => setReady((n) => n + 1));
  }, [film]);

  useEffect(() => { if (last) markFilmSeen(film.id); }, [last, film.id]);

  const next = useCallback(() => { if (canNext && !last) setI((n) => n + 1); }, [canNext, last]);
  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // Not with a modifier (Alt/Cmd+← is the browser's Back), not in a field or
      // on a link, and not when a sheet is open over the film: → in the search
      // results advanced the film behind it (2026-11-20).
      if (e.repeat || e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented) return;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable || t.closest('a'))) return;
      const top = topLayer();
      if (!top || !body.current || !top.contains(body.current)) return;
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !(t && t.closest('button')))) { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // After a guess the picked option is disabled and would strand focus: hand it
  // to Weiter, which is what comes next.
  const foot = useRef<HTMLDivElement>(null);
  const answer = (k: number) => {
    if (answered[i] !== undefined) return;
    setAnswered((a) => ({ ...a, [i]: k }));
    requestAnimationFrame(() => foot.current?.querySelector<HTMLButtonElement>('button:last-child')?.focus({ preventScroll: true }));
  };
  // What the live region reads: the beat's own text, once it has rendered.
  const [said, setSaid] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSaid(`Part ${i + 1} of ${film.beats.length}. ${body.current?.querySelector('section')?.textContent ?? ''}`), 60);
    return () => clearTimeout(t);
  }, [i, film.beats.length]);

  return (
    <Layer side="right" label={`Film: ${film.title}`} back="Kurs" onClose={onClose}
      footer={(
        <div ref={foot} className="flex items-center gap-3 max-w-[560px] mx-auto">
          {/* Kept on the last beat too: without it, only the ← key went back
              from the outro, and touch and VoiceOver users could only leave. */}
          <button onClick={prev} disabled={i === 0} aria-label="Previous"
            className="tap-44 grid place-items-center w-[44px] h-[44px] rounded-full text-dim hover:text-txt disabled:opacity-30">
            <ChevronLeft size={20} />
          </button>
          {/* `aria-disabled`, not `disabled`: disabling the focused Weiter on a
              guess beat dropped keyboard and VoiceOver focus to the page body. */}
          {!last && (
            <Button block onClick={next} aria-disabled={!canNext || undefined}
              className={canNext ? '' : 'opacity-40'}>
              {canNext ? <>Weiter <ArrowRight size={16} /></> : 'Guess first'}
            </Button>
          )}
        </div>
      )}>
      <div ref={body} className="pb-4 max-w-[560px] mx-auto">
        <div className="mb-4">
          <Kicker tone="accent" className="block">Film · {unitTitle}</Kicker>
          {/* Where you are, as segments: the film's length is visible before it is long. */}
          <ol className="flex gap-1 mt-2.5" aria-label={`Part ${i + 1} of ${film.beats.length}`}>
            {film.beats.map((_, k) => (
              <li key={k} aria-hidden className={`h-1 flex-1 rounded-full transition-colors ${k <= i ? 'bg-accent' : 'bg-line'}`} />
            ))}
          </ol>
        </div>

        {/* Keyed on the beat, so each one mounts — and animates in — fresh. */}
        <BeatView key={i} beat={beat} picked={answered[i]} onPick={answer}
          wordCount={wordCount} onStudy={onStudy} onDone={onClose} />
        {/* One live region that outlives the beats. The region used to be *on*
            the keyed beat, so it mounted with its content, and a screen reader
            does not announce a region that arrives already filled: Weiter said
            nothing. */}
        <p className="sr-only" aria-live="polite">{said}</p>

      </div>
    </Layer>
  );
}

/** Translate in from the side; never fade (DESIGN §7). */
function useIn(delay = 0) {
  const reduce = useReducedMotion();
  return reduce ? {} : { initial: { x: 18 }, animate: { x: 0 }, transition: { type: 'spring' as const, stiffness: 380, damping: 32, delay } };
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed mb-4 text-balance">{children}</p>;
}

function BeatView({ beat, picked, onPick, wordCount, onStudy, onDone }: {
  beat: Beat; picked?: number; onPick: (k: number) => void;
  wordCount: number; onStudy: () => void; onDone: () => void;
}) {
  const enter = useIn();
  return (
    <motion.section {...enter} className="bg-card border border-line rounded-lg p-5 sm:p-7 min-h-[320px]">
      {render(beat, picked, onPick, wordCount, onStudy, onDone)}
    </motion.section>
  );
}

function render(beat: Beat, picked: number | undefined, onPick: (k: number) => void,
  wordCount: number, onStudy: () => void, onDone: () => void) {
  switch (beat.kind) {
    case 'title': return <TitleBeat title={beat.title} line={beat.line} />;
    case 'words': return <><Line>{beat.line}</Line><WordList terms={beat.terms} /></>;
    case 'gender': return <GenderBeat term={beat.term} line={beat.line} picked={picked} onPick={onPick} />;
    case 'choice': return <ChoiceBeat beat={beat} picked={picked} onPick={onPick} />;
    case 'plural': return <><Line>{beat.line}</Line><PluralBeat terms={beat.terms} /></>;
    case 'trap': return <><Line>{beat.line}</Line><TrapBeat term={beat.term} /></>;
    case 'pattern': return <><Line>{beat.line}</Line><PatternBeat endings={beat.endings} /></>;
    case 'compound': return <><Line>{beat.line}</Line><CompoundBeat parts={beat.parts} whole={beat.whole} glue={beat.glue} /></>;
    case 'order': return <><Line>{beat.line}</Line><OrderBeat rows={beat.rows} slot={beat.slot} label={beat.label} /></>;
    case 'bracket': return <><Line>{beat.line}</Line><BracketBeat tokens={beat.tokens} from={beat.from} to={beat.to} label={beat.label} /></>;
    case 'move': return <><Line>{beat.line}</Line><MoveBeat from={beat.from} to={beat.to} /></>;
    case 'pair': return <><Line>{beat.line}</Line><PairBeat left={beat.left} right={beat.right} split={beat.split} /></>;
    case 'scale': return <><Line>{beat.line}</Line><ScaleBeat steps={beat.steps} /></>;
    case 'example': return <><Line>{beat.line}</Line><ExampleBeat term={beat.term} match={beat.match} mark={beat.mark} /></>;
    case 'say': return <><Line>{beat.line}</Line><SayBeat de={beat.de} en={beat.en} /></>;
    case 'chart': return <><Line>{beat.line}</Line><ChartBeat bars={beat.bars} de={beat.de} en={beat.en} /></>;
    case 'shift': return <><Line>{beat.line}</Line><ShiftBeat rule={beat.rule} terms={beat.terms} /></>;
    case 'outro': return <OutroBeat line={beat.line} wordCount={wordCount} onStudy={onStudy} onDone={onDone} />;
  }
}

// ---- the beats ------------------------------------------------------------

function TitleBeat({ title, line }: { title: string; line: string }) {
  const tabs = useIn(0.1);
  return (
    <div className="pt-6 pb-4">
      {/* The card box's three tabs — der, die, das — as the film's mark. */}
      <motion.div {...tabs} aria-hidden className="flex gap-1.5 mb-5">
        {ARTICLES.map((g) => <span key={g} className="h-2 w-10 rounded-full" style={{ background: genderColor(g) }} />)}
      </motion.div>
      <h2 lang="de" className="headword font-bold text-3xl sm:text-4xl leading-tight mb-3 text-balance">{title}</h2>
      <p className="text-dim text-base leading-relaxed text-balance">{line}</p>
    </div>
  );
}

/** A card as a row: the term in its ink, the gloss, tap to hear. */
function WordRow({ term, delay = 0 }: { term: string; delay?: number }) {
  const w = cardByTerm(term);
  const enter = useIn(delay);
  if (!w) return null;
  return (
    <motion.li {...enter}>
      <button onClick={() => speak(w.term)} className="w-full text-left flex items-baseline gap-3 py-2.5 border-b border-line last:border-0">
        <GenderTerm term={w.term} gender={w.gender} className="headword text-xl font-bold" />
        <span className="text-dim text-sm truncate flex-1">{w.en}</span>
        <Volume2 size={14} className="text-accent flex-shrink-0 self-center" aria-hidden />
      </button>
    </motion.li>
  );
}

function WordList({ terms }: { terms: string[] }) {
  return <ul>{terms.map((t, k) => <WordRow key={t} term={t} delay={0.08 * k} />)}</ul>;
}

function GenderBeat({ term, line, picked, onPick }: { term: string; line: string; picked?: number; onPick: (k: number) => void }) {
  const w = cardByTerm(term);
  const reduce = useReducedMotion();
  if (!w || !w.gender) return <Line>{line}</Line>;
  const right = ARTICLES.indexOf(w.gender as Gender);
  const word = shownTerm(bare(w.term));
  return (
    <>
      <Line>{line}</Line>
      <div className="hw-box text-center my-6">
        <div lang="de" className="headword hw-answer hw-fit font-bold" style={fitStyle(`${w.gender} ${word}`)}>
          {/* The space stays outside the inline-block: trailing whitespace inside
              one collapses, and the reveal read "dasAbendessen" (simulator, 2026-11-19). */}
          {picked === undefined
            ? <span className="text-dim">___</span>
            : <motion.span initial={reduce ? undefined : { x: -14 }} animate={{ x: 0 }} style={{ color: genderColor(w.gender), display: 'inline-block' }}>{w.gender}</motion.span>}
          {' '}{word}
        </div>
        {picked !== undefined && <p className="text-dim text-sm mt-2">{w.en}</p>}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {ARTICLES.map((g, k) => {
          const state = picked === undefined ? 'idle' : k === right ? 'right' : k === picked ? 'wrong' : 'idle';
          return (
            <button key={g} disabled={picked !== undefined}
              onClick={() => { onPick(k); haptic(k === right ? 'grade' : 'wrong'); }}
              className={`key rounded-key py-3 font-bold text-xl ${state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt' : 'bg-card'}`}
              style={state === 'idle' ? { color: genderColor(g) } : undefined}>
              {g}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ChoiceBeat({ beat, picked, onPick }: { beat: Extract<Beat, { kind: 'choice' }>; picked?: number; onPick: (k: number) => void }) {
  return (
    <>
      <Line>{beat.line}</Line>
      <p lang="de" className="headword text-xl font-bold leading-snug mb-4 text-balance">{beat.prompt}</p>
      <div className="grid gap-2.5">
        {beat.options.map((o, k) => {
          const state = picked === undefined ? 'idle' : k === beat.answer ? 'right' : k === picked ? 'wrong' : 'idle';
          return (
            <button key={o} disabled={picked !== undefined}
              onClick={() => { onPick(k); haptic(k === beat.answer ? 'grade' : 'wrong'); }}
              className={`key rounded-key py-3 px-5 text-base text-left ${state === 'right' ? 'bg-[var(--color-green-d)] border-green text-green font-semibold'
                : state === 'wrong' ? 'bg-[var(--color-red-d)] border-red text-red-txt' : 'bg-card'}`}>
              {state === 'right' && <Check size={14} className="inline -mt-0.5 mr-1.5" />}
              {state === 'wrong' && <X size={14} className="inline -mt-0.5 mr-1.5" />}
              <span lang="de">{o}</span>
            </button>
          );
        })}
      </div>
      {picked !== undefined && <p className="mt-4 text-sm leading-relaxed text-balance">{beat.reveal}</p>}
    </>
  );
}

/** The corpus, counted as the beat plays. A stacked bar per ending; the
 *  exceptions are named, because a rule with its exceptions is a rule you trust. */
function PatternBeat({ endings }: { endings: string[] }) {
  const counts = useMemo(() => endings.map(countEnding), [endings]);
  const reduce = useReducedMotion();
  return (
    <ul className="space-y-4">
      {counts.map((c, k) => {
        const share = c.total ? c[c.majority] / c.total : 0;
        return (
          <li key={c.ending}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span lang="de" className="headword text-lg font-bold">-{c.ending}</span>
              <span className="text-sm">
                <b className="font-mono tabular-nums">{c[c.majority]}</b>
                <span className="text-dim"> of {c.total} are </span>
                <b lang="de" style={{ color: genderColor(c.majority) }}>{c.majority}</b>
              </span>
            </div>
            <motion.div className="flex h-3 rounded-full overflow-hidden bg-panel2 origin-left" aria-hidden
              initial={reduce ? undefined : { scaleX: 0.08 }} animate={{ scaleX: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.15 + k * 0.12 }}>
              {ARTICLES.map((g) => c[g] > 0 && (
                <span key={g} style={{ flexGrow: c[g], background: genderColor(g) }} />
              ))}
            </motion.div>
            {c.exceptions.length > 0 && (
              <p className="text-2xs text-dim mt-1.5">
                {share === 1 ? '' : 'Exceptions: '}<span lang="de">{c.exceptions.slice(0, 6).join(', ')}</span>
                {c.exceptions.length > 6 && ` and ${c.exceptions.length - 6} more`}
              </p>
            )}
            {c.exceptions.length === 0 && <p className="text-2xs text-dim mt-1.5">No exceptions in Lexi.</p>}
          </li>
        );
      })}
    </ul>
  );
}

function CompoundBeat({ parts, whole, glue }: { parts: string[]; whole: string; glue?: string }) {
  const cards = parts.map(cardByTerm);
  const w = cardByTerm(whole);
  const reduce = useReducedMotion();
  const lastPart = cards[cards.length - 1];
  return (
    <div className="text-center">
      <div className="flex items-center justify-center flex-wrap gap-2 mb-5">
        {cards.map((c, k) => c && (
          <span key={c.id} className="contents">
            {k > 0 && (glue
              ? <span className="font-mono text-accent text-lg">+ {glue} +</span>
              : <span className="text-dim text-lg">+</span>)}
            <motion.span initial={reduce ? undefined : { x: k === 0 ? -24 : 24 }} animate={{ x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 * k }}
              className="rounded-md border border-line bg-panel px-3 py-2">
              <GenderTerm term={c.term} gender={c.gender} className="headword text-lg font-bold" />
            </motion.span>
          </span>
        ))}
      </div>
      {w && (
        <motion.div initial={reduce ? undefined : { y: 14 }} animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.45 }}>
          <GenderTerm term={w.term} gender={w.gender} fit className="headword hw-answer font-bold" />
          <p className="text-dim text-sm mt-1">{w.en}</p>
          {lastPart && lastPart.gender && lastPart.gender === w.gender && (
            <p className="text-sm mt-3"><Check size={14} className="inline -mt-0.5 mr-1 text-green" />
              The article comes from the last part: <span lang="de" style={{ color: genderColor(lastPart.gender) }}>{lastPart.gender}</span> <span lang="de">{bare(lastPart.term)}</span>.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

/** Sentences stacked on a grid so the slot column lines up: before | slot | after. */
function OrderBeat({ rows, slot, label }: { rows: string[][]; slot: number; label: string }) {
  return (
    <div lang="de">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-3 items-center">
        <span />
        <Kicker tone="accent" className="text-center">{label}</Kicker>
        <span />
        {rows.map((r, k) => <OrderRow key={k} row={r} slot={slot} delay={0.12 * k} />)}
      </div>
    </div>
  );
}
function OrderRow({ row, slot, delay }: { row: string[]; slot: number; delay: number }) {
  const enter = useIn(delay);
  return (
    <>
      <motion.span {...enter} className="text-right text-lg">{row.slice(0, slot).join(' ')}</motion.span>
      <motion.span {...enter} className="rounded-md bg-key text-key-ink font-bold text-lg px-2.5 py-1">{row[slot]}</motion.span>
      <motion.span {...enter} className="text-left text-lg">{row.slice(slot + 1).join(' ')}</motion.span>
    </>
  );
}

/** An arc over a sentence, from one word to another — measured, not guessed. */
function BracketBeat({ tokens, from, to, label }: { tokens: string[]; from: number; to: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [arc, setArc] = useState<{ x1: number; x2: number; y: number } | null>(null);
  const measure = useCallback(() => {
    const b = box.current?.getBoundingClientRect();
    const a = refs.current[from]?.getBoundingClientRect();
    const z = refs.current[to]?.getBoundingClientRect();
    if (!b || !a || !z || Math.abs(a.top - z.top) > 4) { setArc(null); return; }   // wrapped: no arc, the marks still show
    setArc({ x1: a.left + a.width / 2 - b.left, x2: z.left + z.width / 2 - b.left, y: a.top - b.top });
  }, [from, to]);
  useLayoutEffect(() => { measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }, [measure]);
  const reduce = useReducedMotion();
  return (
    <div ref={box} className="relative pt-12">
      {arc && (
        <svg className="absolute left-0 top-0 w-full h-12 overflow-visible" aria-hidden>
          <motion.path d={`M ${arc.x1} ${arc.y + 40} C ${arc.x1} ${arc.y}, ${arc.x2} ${arc.y}, ${arc.x2} ${arc.y + 40}`}
            fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinecap="round"
            initial={reduce ? undefined : { pathLength: 0.05 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: 0.2 }} />
          <text x={(arc.x1 + arc.x2) / 2} y={arc.y + 12} textAnchor="middle" fill="var(--color-accent)" fontSize={12} fontWeight={700}>{label}</text>
        </svg>
      )}
      <p lang="de" className="text-xl leading-loose flex flex-wrap gap-x-2">
        {tokens.map((t, k) => (
          <span key={k} ref={(el) => { refs.current[k] = el; }}
            className={k === from || k === to ? 'rounded-md bg-key text-key-ink font-bold px-1.5' : ''}>{t}</span>
        ))}
      </p>
    </div>
  );
}

/** One sentence becomes another. Shared words carry a layout id and glide. */
function MoveBeat({ from, to }: { from: string[]; to: string[] }) {
  const [after, setAfter] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => { const t = setTimeout(() => setAfter(true), reduce ? 0 : 900); return () => clearTimeout(t); }, [reduce]);
  const key = (t: string) => t.toLowerCase().replace(/[^a-zäöüß]/g, '');
  const row = after ? to : from;
  return (
    <div>
      <LayoutGroup>
        <p lang="de" className="text-xl leading-loose flex flex-wrap gap-x-2 min-h-[3.5rem]">
          {row.map((t) => {
            const shared = from.some((f) => key(f) === key(t)) && to.some((f) => key(f) === key(t));
            return (
              <motion.span layout={!reduce} layoutId={key(t)} key={key(t)}
                initial={after && !shared && !reduce ? { y: -10 } : undefined} animate={{ y: 0 }}
                className={after && !shared ? 'text-accent font-bold' : ''}>{t}</motion.span>
            );
          })}
        </p>
      </LayoutGroup>
      <button onClick={() => { setAfter(false); setTimeout(() => setAfter(true), 600); }}
        className="tap-44 mt-2 inline-flex items-center gap-1.5 text-xs text-accent">
        <RotateCcw size={13} /> Again
      </button>
    </div>
  );
}

/** One side of a pair. A card is set like a headword, in its ink; a phrase
 *  (*nachdem das Projekt abgeschlossen ist*) in the text face, because the
 *  display face at headword size wraps a clause into a tower. */
function Item({ text }: { text: string }) {
  const w = cardByTerm(text);
  const phrase = !w && /\s/.test(text.trim());
  return (
    <button onClick={() => speak(w?.term ?? text)} className="block text-left max-w-full">
      <span lang="de" className={phrase ? 'block text-base font-semibold leading-snug' : 'block headword text-lg font-bold leading-tight break-words'}>
        {w ? <InkedArticle term={w.term} gender={w.gender} /> : text}
      </span>
    </button>
  );
}

/** Rows, each its own grid and top-aligned. One grid with baseline alignment
 *  was the first version, and on iOS Safari wrapped items did not grow their
 *  rows: three clauses printed over each other (2026-11-19, on the simulator). */
function PairBeat({ left, right, split }: { left: { label: string; items: string[] }; right: { label: string; items: string[] }; split?: boolean }) {
  const n = Math.max(left.items.length, right.items.length);
  return (
    <div>
      <div className="grid grid-cols-[1fr_1.25rem_1fr] gap-x-3 mb-1.5">
        <Kicker>{left.label}</Kicker><span /><Kicker>{right.label}</Kicker>
      </div>
      <ul className={split ? '' : 'space-y-3'}>
        {Array.from({ length: n }, (_, k) => <PairRow key={k} l={left.items[k]} r={right.items[k]} delay={0.1 * k} split={split} />)}
      </ul>
    </div>
  );
}
function PairRow({ l, r, delay, split }: { l?: string; r?: string; delay: number; split?: boolean }) {
  const a = useIn(delay); const b = useIn(delay + 0.18);
  return (
    <li className={`grid grid-cols-[1fr_1.25rem_1fr] gap-x-3 items-start ${split ? 'py-1.5' : ''}`}>
      <motion.div {...a} className="min-w-0">{l && <Item text={l} />}</motion.div>
      {/* An arrow reads as "becomes"; parallel lists get a rule instead. */}
      {split
        ? <span className="justify-self-center self-stretch w-px bg-line" aria-hidden />
        : <span className="text-dim text-center leading-7" aria-hidden>→</span>}
      <motion.div {...b} className="min-w-0">{r && <Item text={r} />}</motion.div>
    </li>
  );
}

function ScaleBeat({ steps }: { steps: { label: string; de: string; term?: string }[] }) {
  return (
    <ol className="relative border-l-2 border-line ml-2 space-y-4">
      {steps.map((s, k) => <ScaleRow key={s.label} step={s} delay={0.15 * k} />)}
    </ol>
  );
}
function ScaleRow({ step, delay }: { step: { label: string; de: string; term?: string }; delay: number }) {
  const enter = useIn(delay);
  return (
    <motion.li {...enter} className="pl-4 relative">
      <span aria-hidden className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-accent" />
      <Kicker className="block">{step.label}</Kicker>
      <button onClick={() => speak(step.de)} lang="de" className="headword text-xl font-bold text-left">{step.de}</button>
    </motion.li>
  );
}

/** How a plural is built from its singular: which letters took an umlaut, and
 *  the ending. `null` when the plural is not the singular plus an ending
 *  (das Museum → die Museen), which the beat then shows without marks. */
export function pluralShape(singular: string, plural: string): { umlaut: number[]; ending: string } | null {
  const flat = (s: string) => s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/Ä/g, 'A').replace(/Ö/g, 'O').replace(/Ü/g, 'U');
  const sg = bare(singular), pl = bare(plural);
  if (!flat(pl).startsWith(flat(sg))) return null;
  const umlaut: number[] = [];
  for (let i = 0; i < sg.length; i++) if (pl[i] !== sg[i]) umlaut.push(i);
  return { umlaut, ending: pl.slice(sg.length) };
}

function PluralBeat({ terms }: { terms: string[] }) {
  return <ul>{terms.map((t, k) => <PluralRow key={t} term={t} delay={0.12 * k} />)}</ul>;
}
function PluralRow({ term, delay }: { term: string; delay: number }) {
  const w = cardByTerm(term);
  const a = useIn(delay); const b = useIn(delay + 0.2);
  if (!w?.plural || !/^die\s/.test(w.plural)) return null;
  const shape = pluralShape(w.term, w.plural);
  const pl = bare(w.plural);
  const tag = shape ? `${shape.umlaut.length ? '¨ ' : ''}${shape.ending ? `+${shape.ending}` : shape.umlaut.length ? '' : 'no ending'}` : '';
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-x-3 py-2.5 border-b border-line last:border-0">
      <motion.span {...a} className="min-w-0">
        <button onClick={() => speak(w.term)} className="text-left">
          <GenderTerm term={w.term} gender={w.gender} className="headword text-lg font-bold" />
        </button>
      </motion.span>
      <span className="text-dim" aria-hidden>→</span>
      <motion.span {...b} className="min-w-0 flex items-baseline gap-2 flex-wrap">
        {/* The plural's article in plain ink: die here is not the feminine die,
            and colouring it pink would teach that it is. */}
        <button onClick={() => speak(w.plural!)} lang="de" className="headword text-lg font-bold text-left">
          <span className="text-dim font-semibold">die </span>
          {shape
            ? <>{[...pl.slice(0, pl.length - shape.ending.length)].map((c, i) => shape.umlaut.includes(i)
                ? <span key={i} className="text-accent">{c}</span> : <span key={i}>{c}</span>)}
                <span className="text-accent">{shape.ending}</span></>
            : pl}
        </button>
        {tag && <span className="font-mono text-2xs text-dim">{tag}</span>}
      </motion.span>
    </li>
  );
}

/** A false friend, from the app's own list. */
function TrapBeat({ term }: { term: string }) {
  const w = cardByTerm(term);
  const f = falseFriend(term);
  const a = useIn(0); const b = useIn(0.25); const c = useIn(0.5);
  if (!w || !f) return null;
  return (
    <div className="space-y-3">
      {/* w-full: a button shrink-wraps even as a block, and the fitted headword
          is a size container with no intrinsic width — without it the measure was
          0 and "das Menü" printed one letter per line (simulator, 2026-11-19). */}
      <motion.button {...a} onClick={() => speak(w.term)} className="block w-full text-left">
        <GenderTerm term={w.term} gender={w.gender} fit className="headword hw-answer font-bold" />
      </motion.button>
      <motion.p {...b} className="text-base">
        <span className="text-dim">Looks like </span>
        <span className="line-through decoration-2 decoration-[var(--color-red)]">{f.looksLike}</span>
        <span className="text-dim">, but means </span><span className="font-semibold">{f.actually}</span>
      </motion.p>
      <motion.p {...c} className="text-sm">
        <span className="text-dim">For “{f.looksLike}”, say </span>
        <span lang="de" className="font-semibold">{f.insteadSay}</span>
      </motion.p>
    </div>
  );
}

/** The card's own sentence, with the part that matters marked. */
function ExampleBeat({ term, match, mark }: { term: string; match: string; mark: string[] }) {
  const w = cardByTerm(term);
  const ex = w?.ex?.find((e) => e.de.includes(match));
  if (!w) return null;
  if (!ex) return <p className="text-dim text-sm">Loading the example…</p>;
  const parts = splitMarks(ex.de, mark);
  return (
    <div>
      <p lang="de" className="text-xl leading-relaxed">
        {parts.map((p, k) => p.on
          ? <mark key={k} className="bg-key text-key-ink rounded px-1 font-semibold">{p.t}</mark>
          : <span key={k}>{p.t}</span>)}
        {' '}<SpeakButton text={ex.de} label="Hear the sentence:" />
      </p>
      {ex.en && <p className="text-dim text-sm italic mt-2">{ex.en}</p>}
      <p className="text-2xs text-dim mt-3">From the card for <span lang="de" className="text-txt">{shownTerm(w.term)}</span>.</p>
    </div>
  );
}

/** Split a sentence around the marked substrings, first occurrence of each. */
export function splitMarks(s: string, marks: string[]): { t: string; on: boolean }[] {
  const spans: [number, number][] = [];
  for (const m of marks) {
    const at = s.indexOf(m);
    if (at >= 0) spans.push([at, at + m.length]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const out: { t: string; on: boolean }[] = [];
  let pos = 0;
  for (const [a, b] of spans) {
    if (a < pos) continue;
    if (a > pos) out.push({ t: s.slice(pos, a), on: false });
    out.push({ t: s.slice(a, b), on: true });
    pos = b;
  }
  if (pos < s.length) out.push({ t: s.slice(pos), on: false });
  return out;
}

/** Split a word around every match of a pattern, for marking a sound shift. */
export function markSpans(s: string, source: string | undefined, flags = 'g'): { t: string; on: boolean }[] {
  if (!source) return [{ t: s, on: false }];
  const out: { t: string; on: boolean }[] = [];
  let pos = 0;
  for (const m of s.matchAll(new RegExp(source, flags.includes('g') ? flags : flags + 'g'))) {
    if (!m[0]) continue;
    if (m.index > pos) out.push({ t: s.slice(pos, m.index), on: false });
    out.push({ t: m[0], on: true });
    pos = m.index + m[0].length;
  }
  if (pos < s.length) out.push({ t: s.slice(pos), on: false });
  return out;
}

function Marked({ text, source, flags }: { text: string; source?: string; flags?: string }) {
  return <>{markSpans(text, source, flags).map((p, k) => p.on
    ? <span key={k} className="text-accent underline decoration-2 underline-offset-4">{p.t}</span>
    : <span key={k}>{p.t}</span>)}</>;
}

/** German beside English, one sound correspondence marked in both. Everything but
 *  the German comes from `transfer.json`, fetched when the beat plays; until it
 *  arrives the English side waits and the German is already there to hear. */
function ShiftBeat({ rule, terms }: { rule: string; terms: string[] }) {
  const [data, setData] = useState<TransferData | null>(null);
  useEffect(() => {
    let live = true;
    void loadTransfer().then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, []);
  const r = data?.rules[rule];
  return (
    <div>
      <ul>
        {terms.map((t, k) => (
          <ShiftRow key={t} term={t} en={data?.words[t]?.[1] || undefined} mark={r?.mark} delay={0.12 * k} />
        ))}
      </ul>
      {r && (
        <p className="text-2xs text-dim mt-3">
          German <b lang="de" className="text-txt">{r.de}</b>, English <b className="text-txt">{r.en}</b>:{' '}
          {r.n} pairs among the words Lexi teaches.
        </p>
      )}
    </div>
  );
}
function ShiftRow({ term, en, mark, delay }: { term: string; en?: string; mark?: [string, string]; delay: number }) {
  const w = cardByTerm(term);
  const a = useIn(delay); const b = useIn(delay + 0.2);
  if (!w) return null;
  const art = /^(der|die|das)\s+/i.exec(w.term)?.[1];
  return (
    <li className="grid grid-cols-[1fr_1.25rem_1fr] gap-x-3 items-baseline py-2.5 border-b border-line last:border-0">
      <motion.button {...a} onClick={() => speak(w.term)} lang="de"
        className="headword text-xl font-bold text-left min-w-0 break-words">
        {art && <span style={w.gender ? { color: genderColor(w.gender) } : undefined}>{art} </span>}
        <Marked text={bare(w.term)} source={mark?.[0]} flags="gi" />
      </motion.button>
      <span className="text-dim text-center" aria-hidden>→</span>
      <motion.span {...b} className="headword text-xl font-bold min-w-0 break-words">
        {en ? <Marked text={en} source={mark?.[1]} /> : <span className="text-dim" aria-hidden>…</span>}
      </motion.span>
    </li>
  );
}

function SayBeat({ de, en }: { de: string; en?: string }) {
  return (
    <div className="text-center py-4">
      <p lang="de" className="headword text-2xl font-bold leading-snug text-balance">{de}</p>
      {en && <p className="text-dim text-sm mt-2">{en}</p>}
      <button onClick={() => speak(de)} className="tap-44 mt-3 inline-flex items-center gap-1.5 text-sm text-accent">
        <Volume2 size={15} /> Hear it
      </button>
    </div>
  );
}

function ChartBeat({ bars, de, en }: { bars: { label: string; value: number }[]; de: string; en: string }) {
  const max = Math.max(...bars.map((b) => b.value));
  const reduce = useReducedMotion();
  return (
    <div>
      <div className="flex items-end gap-3 h-36 border-b border-line px-2" aria-hidden>
        {bars.map((b, k) => (
          <div key={b.label} className="flex-1 flex flex-col items-center justify-end h-full">
            <motion.div className="w-full rounded-t-md origin-bottom"
              style={{ height: `${(b.value / max) * 100}%`, background: k === bars.length - 1 ? 'var(--color-accent)' : 'var(--color-line)' }}
              initial={reduce ? undefined : { scaleY: 0.08 }} animate={{ scaleY: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.1 * k }} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 px-2 mt-1">
        {bars.map((b) => <span key={b.label} className="flex-1 text-center font-mono text-2xs text-dim">{b.label}</span>)}
      </div>
      <p lang="de" className="headword text-xl font-bold leading-snug mt-4 text-balance">{de}</p>
      <p className="text-dim text-sm mt-1">{en}</p>
    </div>
  );
}

function OutroBeat({ line, wordCount, onStudy, onDone }: { line: string; wordCount: number; onStudy: () => void; onDone: () => void }) {
  return (
    <div className="text-center py-6">
      <span className="grid place-items-center w-[56px] h-[56px] rounded-full mx-auto mb-4" style={{ background: 'var(--color-green-d)' }}>
        <Check size={24} className="text-green" />
      </span>
      <p className="text-base leading-relaxed mb-6 text-balance">{line}</p>
      <div className="flex flex-col gap-2.5 items-center">
        {wordCount > 0 && <Button onClick={onStudy}><GraduationCap size={16} /> Learn the {wordCount} words</Button>}
        <Button variant="secondary" onClick={onDone}>Back to the course</Button>
      </div>
    </div>
  );
}
