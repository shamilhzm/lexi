// The typing race. ASCII track, fixed-pace rivals, German at your level.
//
// The logic — text selection, the keystroke reducer, WPM, pacing — is all in
// `lib/race.ts` and tested there. This file is the track and the keyboard.
//
// ## Two things this screen must not do
//
// It must not imply the WPM figure measures German. It says so under the number,
// every time, not in a help page nobody opens.
//
// And it must not let the typing *look* like it worked when it did not. The
// reducer refuses to advance past a wrong key, so the caret is always sitting on
// the character actually being waited for — which is why the text renders
// per-character with the caret drawn in, rather than as an input box you could
// paste a sentence into.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import Chip from '../../components/ui/Chip.tsx';
import { WORDS } from '../../data/index.ts';
import { bestWpm, recordRace } from '../../lib/exam-store.ts';
import {
  accuracy, buildRace, freshTyped, keystroke, paceAt, pacers, wpm,
  type RaceText, type Typed,
} from '../../lib/race.ts';
import type { CEFR } from '../../types.ts';

/** A car, drawn the way the track is: in characters. */
const CAR = '▄▀▄';

export default function Race({ level, onExit }: { level: CEFR; onExit: () => void }) {
  const reduce = useReducedMotion();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const race: RaceText = useMemo(() => buildRace(WORDS, level, seed), [level, seed]);

  const [typed, setTyped] = useState<Typed>(freshTyped);
  const pending = useRef('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [beatRecord, setBeatRecord] = useState(false);
  const filed = useRef(false);

  const best = useMemo(() => bestWpm(), [seed]);
  const rivals = useMemo(() => pacers(best), [best]);

  const elapsed = startedAt === null ? 0 : now - startedAt;
  const liveWpm = Math.round(wpm(typed.correct, elapsed));

  // The clock ticks in an interval rather than inside the keystroke handler, so
  // the rivals keep moving while the learner is stuck on a character — which is
  // the entire tension of a race and would otherwise freeze with them.
  useEffect(() => {
    if (startedAt === null || typed.done) return;
    const id = setInterval(() => setNow(Date.now()), 60);
    return () => clearInterval(id);
  }, [startedAt, typed.done]);

  // File the result once, on the transition into `done`.
  useEffect(() => {
    if (!typed.done || filed.current || !elapsed) return;
    filed.current = true;
    setBeatRecord(recordRace({
      level, wpm: Math.round(wpm(typed.correct, elapsed)),
      accuracy: accuracy(typed), digraphs: typed.digraphs, at: Date.now(),
    }));
  }, [typed, elapsed, level]);

  const reset = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1e9));
    setTyped(freshTyped());
    pending.current = '';
    setStartedAt(null);
    setBeatRecord(false);
    filed.current = false;
  }, []);

  /** Feed one character through the reducer, starting the clock on the first. */
  const feed = useCallback((chars: string) => {
    if (!chars || typed.done) return;
    if (startedAt === null) { const t = Date.now(); setStartedAt(t); setNow(t); }
    let next = typed;
    let p = pending.current;
    for (const ch of chars) ({ next, pending: p } = keystroke(race.text, next, ch, p));
    pending.current = p;
    setTyped(next);
  }, [race.text, typed, startedAt]);

  // Input arrives through a real (visually hidden) `<input>` rather than a
  // window keydown listener.
  //
  // A keydown listener works beautifully on a laptop and makes the game
  // **unplayable on a phone**: with nothing focusable on screen, the on-screen
  // keyboard never opens, so the race starts, the rivals drive off, and the
  // learner cannot type a single character. An input is the one element that
  // makes a mobile keyboard appear, and reading its value covers desktop and
  // touch with the same code path.
  //
  // The four attributes are not boilerplate. iOS will autocapitalise and
  // autocorrect German by default and then the race marks the learner wrong for
  // what the phone did — the same defect the backlog already records against the
  // session's typed-answer input.
  const inputRef = useRef<HTMLInputElement>(null);
  const focus = useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => { focus(); }, [focus, seed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onExit(); return; }
      if (typed.done && e.key === 'Enter') { e.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [typed.done, reset, onExit]);

  const progress = race.text.length ? typed.at / race.text.length : 0;

  return (
    <div className="w-full max-w-[900px] mx-auto">
      {/* Focusable and effectively invisible — not `hidden` or `display:none`,
          either of which stops a phone opening its keyboard for it. */}
      <input
        ref={inputRef}
        value=""
        onChange={(e) => { feed(e.target.value); e.target.value = ''; }}
        // Keep the keyboard while a race is running — but never steal focus back
        // from a control the learner just reached for, or Zurück becomes a button
        // that cannot be clicked.
        onBlur={(e) => {
          const to = e.relatedTarget as HTMLElement | null;
          if (!typed.done && !to) setTimeout(focus, 0);
        }}
        aria-label="Tippen Sie den Text"
        autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
        inputMode="text" enterKeyHint="done"
        className="absolute w-px h-px opacity-0 -z-10 pointer-events-none"
      />
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={onExit}
          className="tap-44 flex items-center gap-1.5 text-2xs font-mono uppercase tracking-widest text-dim hover:text-amber">
          <ArrowLeft size={13} /> Zurück
        </button>
        <span className="font-mono text-2xs uppercase tracking-widest text-dim">
          Rennen · {level} · {startedAt === null ? 'bereit' : `${(elapsed / 1000).toFixed(1)}s`}
        </span>
      </div>

      {/* ---- the track ---- */}
      <Card pad="md" className="mb-3 overflow-hidden">
        <Lane label="DU" tone="text-cyan" progress={progress} wpm={liveWpm} live />
        {rivals.map((r) => (
          <Lane key={r.id} label={r.label.toUpperCase()} tone="text-red-txt"
            progress={startedAt === null ? 0 : paceAt(r, elapsed, race.text.length)}
            wpm={r.wpm} />
        ))}
      </Card>

      {/* ---- the text ---- */}
      <Card pad="md" className="mb-3">
        <p className="font-mono text-base sm:text-lg leading-relaxed break-words" aria-label="Text zum Tippen">
          {[...race.text].map((ch, i) => (
            <span key={i}
              className={
                i < typed.at ? 'text-green'
                  : i === typed.at ? 'bg-amber text-bg rounded-[2px]'
                    : 'text-dim'}>
              {ch}
            </span>
          ))}
        </p>
        {startedAt === null && !typed.done && (
          <p className="text-xs text-dim mt-3">
            Tippen Sie los — die Uhr startet mit der ersten Taste.
            <span className="sm:hidden"> Tippen Sie auf den Text, wenn die Tastatur nicht erscheint.</span>
          </p>
        )}
      </Card>

      {typed.done ? (
        <Finish typed={typed} elapsed={elapsed} race={race} beatRecord={beatRecord} onAgain={reset} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-2xs font-mono uppercase tracking-widest text-dim">
          <span className="text-cyan">{liveWpm} WPM</span>
          <span>·</span>
          <span>{Math.round(accuracy(typed) * 100)}% genau</span>
          <span>·</span>
          <span>{typed.errors} Fehler</span>
          <span className="ml-auto normal-case tracking-normal">
            ä ö ü ß können Sie auch als ae oe ue ss tippen
          </span>
        </div>
      )}
    </div>
  );

  function Lane({ label, tone, progress, wpm: w, live }: {
    label: string; tone: string; progress: number; wpm: number; live?: boolean;
  }) {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <span className={`font-mono text-2xs w-12 flex-shrink-0 ${live ? tone : 'text-dim'}`}>{label}</span>
        <span className="relative flex-1 h-5">
          <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" aria-hidden />
          <motion.span
            className={`absolute top-0 font-mono text-sm ${tone}`}
            style={{ left: 0 }}
            animate={{ x: `calc(${Math.min(progress, 1) * 100}% - ${progress * 22}px)` }}
            transition={reduce ? { duration: 0 } : { type: 'tween', ease: 'linear', duration: 0.08 }}>
            {CAR}
          </motion.span>
        </span>
        <span className="font-mono text-2xs text-dim w-16 text-right flex-shrink-0 tabular-nums">{w} WPM</span>
      </div>
    );
  }
}

function Finish({ typed, elapsed, race, beatRecord, onAgain }: {
  typed: Typed; elapsed: number; race: RaceText; beatRecord: boolean; onAgain: () => void;
}) {
  const final = Math.round(wpm(typed.correct, elapsed));
  return (
    <Card accent pad="md">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
        <div>
          <Kicker tone="accent" className="block mb-1">Ziel</Kicker>
          <p className="text-3xl font-bold tabular-nums">
            {final}<span className="text-dim text-lg font-normal"> WPM</span>
          </p>
          {/* The honesty line. Not a footnote — the number is meaningless without it. */}
          <p className="text-2xs text-dim mt-1 max-w-[34rem] leading-relaxed">
            Tippgeschwindigkeit ist <em>kein</em> Maß für Ihr Deutsch: In allen sechs Prüfungen wird
            Schreiben mit der Hand geschrieben. Die Zahl ist zum Wiederkommen da — was zählt, steht rechts.
          </p>
        </div>
        <div className="text-right">
          <Kicker className="block mb-1">Genauigkeit</Kicker>
          <p className="text-xl font-bold tabular-nums">{Math.round(accuracy(typed) * 100)}%</p>
          <p className="text-2xs text-dim">{typed.errors} Fehler</p>
        </div>
      </div>

      {beatRecord && (
        <Chip tone="good" className="mb-3"><Trophy size={11} /> Persönliche Bestzeit</Chip>
      )}

      {typed.digraphs > 0 && (
        <div className="rounded-md bg-panel2 px-3 py-2.5 mb-3">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">{typed.digraphs}×</span> haben Sie einen Umlaut oder ß als{' '}
            <span className="font-mono">ae/oe/ue/ss</span> getippt. Im Rennen zählt das — in der Prüfung
            ist jedes davon ein Rechtschreibfehler.
          </p>
        </div>
      )}

      <p className="text-2xs text-dim mb-3">
        Die Sätze stammen aus Ihren eigenen Karten: {race.sources.join(' · ')}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onAgain}><RotateCcw size={14} /> Noch einmal</Button>
        <span className="self-center text-2xs font-mono text-dim">oder Enter</span>
      </div>
    </Card>
  );
}
