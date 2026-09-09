// Sag es — say the word before it goes past.
//
// The mechanic is lifted from the meme this came from (*"impossible for a Scottish
// person"*), and two details of it are load-bearing rather than decorative:
//
//   1. **The words come on a track and the next one is already visible.** Pacing
//      comes from the queue moving, not from a timer that starts once the previous
//      word resolves — so the learner is never waiting on the recogniser, and the
//      game feels fast on an engine that is not.
//   2. **The transcript is printed over the target.** `JUNE` across `JANUARY` is the
//      joke, and it is also the whole of the feedback: the app shows what the machine
//      heard and lets the learner judge it.
//
// ## The rule this screen exists to obey
//
// VISION open decision 8: **speech is not scored.** This game does not score it. It
// reports what a recogniser did, it never writes an FSRS card (same rule as the feed,
// same reason), and its copy never says the learner mispronounced anything — the word
// was *not caught*, which is a fact about the machine. The users are non-native
// speakers and the recogniser is the less reliable party in the exchange; an app that
// tells somebody with an accent they said their own language wrong is worse than one
// that occasionally counts a near miss.
//
// ## And it is the first thing in Lexi that leaves the device
//
// Safari sends the audio to Apple, Chrome to Google. That is disclosed here, before
// the microphone opens, rather than left to the browser's permission sheet to imply.
// See `docs/SPEAKING.md`.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, X, RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { WORDS } from '../data/index.ts';
import { levels } from '../store.ts';
import { support, createListener, type Listener } from '../lib/asr.ts';
import {
  startRun, heard as onHeard, tick, skip, tally, progress, isPlayable, resetDeadline,
  LOOKAHEAD, type Run,
} from '../lib/sages.ts';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Word, CEFR } from '../types.ts';

const RUN_LENGTH = 12;

/** Pick a run. Shuffled rather than ordered, and inside the learner's own level
 *  filter — the game is not a place to meet C2 vocabulary you have not chosen. */
function pickWords(levelFilter: Set<CEFR>): Word[] {
  const pool = WORDS.filter((w) => levelFilter.has(w.level) && isPlayable(w));
  const out: Word[] = [];
  const seen = new Set<number>();
  while (out.length < RUN_LENGTH && seen.size < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(pool[i]);
  }
  return out;
}

type Phase = 'intro' | 'playing' | 'done' | 'blocked';

export default function SagEs({ onExit }: { onExit: () => void }) {
  const cap = useMemo(() => support(), []);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(cap.available ? 'intro' : 'blocked');
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [live, setLive] = useState('');
  const [now, setNow] = useState(0);
  /** Is the microphone actually open?
   *
   *  **The track does not move until it is**, and this is the single most important
   *  thing on this screen. Between pressing Start and audio arriving, iOS shows up to
   *  two system dialogs — Speech Recognition, then Microphone — and the first version
   *  ran its clock through both: driven on the Simulator, a twelve-word run was on
   *  word 8 by the time the second dialog was answered. Seven words "missed", none of
   *  them by the learner. That is the exact failure this game is built to never
   *  produce, arriving from the app's own clock rather than from a recogniser. */
  const [armed, setArmed] = useState(false);

  const listener = useRef<Listener | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;
  const armedRef = useRef(false);

  /** Start the track. Idempotent and once per run: the recogniser restarts after
   *  every pause, so re-arming per session would hand out a fresh five seconds each
   *  time the learner stopped talking. */
  const arm = useCallback(() => {
    if (armedRef.current) return;
    armedRef.current = true;
    setArmed(true);
    setRun((r) => (r ? resetDeadline(r, performance.now()) : r));
  }, []);

  const stopAll = useCallback(() => {
    listener.current?.stop();
    listener.current = null;
  }, []);
  useEffect(() => stopAll, [stopAll]);

  const begin = useCallback(() => {
    const words = pickWords(levels());
    const t = performance.now();
    setRun(startRun(words, t));
    setNow(t);
    setLive('');
    setError(null);
    setArmed(false);
    armedRef.current = false;
    setPhase('playing');

    // One long-lived listener, restarted when the engine ends a turn. A recogniser
    // stops on its own after a pause, and re-`start()`ing it is the only way to keep
    // a run going — the alternative is one session per word, which pays the
    // microphone warm-up twelve times.
    const l = createListener({
      onHeard: (h) => {
        setLive(h.text);
        arm(); // some engines never fire `onaudiostart`; hearing something proves it
        const cur = runRef.current;
        if (!cur || cur.done) return;
        const next = onHeard(cur, h.text, h.alternatives, performance.now());
        if (next !== cur) {
          if (next.index !== cur.index) setLive('');
          setRun(next);
        }
      },
      // Arm once per run, not once per session: the recogniser stops after every
      // pause and is restarted below, so a per-session reset would hand the learner
      // a fresh five seconds every time they stopped talking.
      onOpen: () => arm(),
      onEnd: () => { if (!runRef.current?.done) l.listen(); },
      onError: (e) => {
        if (e === 'not-allowed' || e === 'service-not-allowed') {
          setError('Lexi needs the microphone for this one. Allow it in your browser settings and start again.');
          setPhase('blocked');
        }
      },
    });
    listener.current = l;
    l.listen();
  }, []);

  // The track's clock. rAF rather than an interval so the bar and the queue move on
  // the same frame; `now` is state so the reducer stays pure and the render is a
  // function of it.
  useEffect(() => {
    if (phase !== 'playing' || !armed) return;
    let raf = 0;
    const frame = () => {
      const t = performance.now();
      setNow(t);
      const cur = runRef.current;
      if (cur && !cur.done) {
        const next = tick(cur, t);
        if (next !== cur) { setRun(next); setLive(''); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, armed]);

  // Not every engine fires `onaudiostart`. If none arrives, arm on the first thing
  // heard, and failing that on a timer — a game that waits forever for an event the
  // browser may never send is worse than one that starts a beat late.
  useEffect(() => {
    if (phase !== 'playing' || armed) return;
    const t = setTimeout(arm, 8000);
    return () => clearTimeout(t);
  }, [phase, armed, arm]);

  useEffect(() => {
    if (run?.done && phase === 'playing') { stopAll(); setPhase('done'); }
  }, [run?.done, phase, stopAll]);

  // ---- states that are not the game ---------------------------------------
  if (phase === 'blocked') {
    return (
      <Frame onExit={onExit}>
        <div className="max-w-[460px]">
          <span className="grid place-items-center w-[48px] h-[48px] rounded-full bg-panel2 mb-4">
            <MicOff size={22} className="text-dim" />
          </span>
          <h2 className="text-xl font-bold mb-2">This one needs a microphone</h2>
          <p className="text-dim mb-6">{error ?? cap.reason}</p>
          <Button variant="secondary" onClick={onExit}>Back to Üben</Button>
        </div>
      </Frame>
    );
  }

  if (phase === 'intro') {
    return (
      <Frame onExit={onExit}>
        <div className="max-w-[460px]">
          <Kicker tone="accent" className="block mb-1.5">Sag es</Kicker>
          <h2 className="text-2xl font-bold mb-2">Say the word before it goes past</h2>
          <p className="text-dim mb-4">
            Twelve words, one after another. Whatever the recogniser hears gets printed
            over the top — which is the fun of it, and usually not your fault.
          </p>
          {/* The disclosure, before the microphone opens rather than after. Lexi keeps
              everything else on this device; this is the exception and it says so. */}
          <p className="text-xs text-dim mb-6 leading-[1.55] border-l-2 border-line pl-3">
            <b className="text-txt">Your voice leaves this device for this game.</b> Speech
            recognition runs on Apple’s or Google’s servers depending on your browser —
            Lexi has no say in it, and nothing else in the app works this way. Nothing is
            recorded here, and no result is saved to your progress.
          </p>
          <Button onClick={begin}><Mic size={16} /> Start</Button>
        </div>
      </Frame>
    );
  }

  if (phase === 'done' && run) {
    const t = tally(run);
    return (
      <Frame onExit={onExit}>
        <div className="max-w-[520px] w-full">
          <Kicker tone="accent" className="block mb-1.5">Fertig</Kicker>
          {/* Counts, never a percentage. A rate presented as a result reads as a mark
              for the learner's mouth, and this game does not give one. */}
          <h2 className="text-2xl font-bold mb-1">
            {t.caught} of {t.total} caught
          </h2>
          <p className="text-dim mb-5">
            Longest run {t.best}. The ones it missed are below with what it heard instead.
          </p>
          <ul className="mb-6 border-t border-line">
            {run.slots.map((s) => (
              <li key={s.word.id} className="flex items-baseline gap-3 py-2 border-b border-line">
                <span lang="de" className={`flex-1 min-w-0 truncate ${s.state === 'caught' ? '' : 'text-dim'}`}>
                  {s.say}
                </span>
                <span className="font-mono text-xs text-dim truncate max-w-[45%] text-right">
                  {s.state === 'caught' ? 'caught' : s.heard || 'nothing heard'}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button onClick={begin}><RotateCcw size={16} /> Again</Button>
            <Button variant="secondary" onClick={onExit}>Done</Button>
          </div>
        </div>
      </Frame>
    );
  }

  if (!run) return null;

  const p = progress(run, now);
  const current = run.slots[run.index];
  const ahead = run.slots.slice(run.index + 1, run.index + 1 + LOOKAHEAD);

  return (
    <Frame onExit={onExit}>
      <div className="w-full max-w-[640px]">
        <div className="flex items-baseline justify-between mb-3">
          <Kicker tone="accent">{run.index + 1} / {run.slots.length}</Kicker>
          <span className="text-xs text-dim font-mono tabular-nums">
            {run.streak > 1 ? `${run.streak} in a row` : ''}
          </span>
        </div>

        {/* The track. The bar is the deadline made visible — the word is not being
            timed *by* something, it is moving *past* you. */}
        <div className="h-[3px] bg-panel2 rounded-full overflow-hidden mb-7" aria-hidden>
          <div
            className="h-full bg-accent rounded-full"
            style={{ width: `${(1 - p) * 100}%`, transition: reduce ? 'width .2s linear' : 'none' }}
          />
        </div>

        <div className="relative min-h-[190px]">
          {/* The word, and the transcript across it. Both in the same box, both
              centred on the same baseline, so the overlap is the point. */}
          <p lang="de" className="text-[clamp(34px,9vw,68px)] font-extrabold leading-[1.05] tracking-[-0.03em] break-words">
            {current?.say}
          </p>
          {live && (
            <p
              aria-hidden
              className="absolute inset-x-0 top-0 text-[clamp(30px,8vw,60px)] font-extrabold leading-[1.05]
                tracking-[-0.03em] break-words text-accent/70 pointer-events-none translate-y-[0.18em] translate-x-[0.1em]"
            >
              {live}
            </p>
          )}
        </div>

        {/* The same transcript again, plainly, for anyone the overlay does not reach —
            it is `aria-hidden` above because two overlapping words read as gibberish. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {live ? `heard: ${live}` : ''}
        </p>

        <div className="mt-8 flex items-baseline gap-4 opacity-45" aria-hidden>
          {ahead.map((s) => (
            <span key={s.word.id} lang="de" className="text-lg font-bold truncate">{s.say}</span>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setRun(skip(run, performance.now())); setLive(''); }}>
            Skip
          </Button>
          <span className="text-xs text-dim">
            {!armed ? 'Waiting for the microphone…' : live ? '' : 'Listening…'}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/** The shell every phase shares: a close control that is always reachable, and a
 *  centred column. Not a `Layer` — this is a run, not a panel beside a word. */
function Frame({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="flex justify-end mb-2">
        <button
          onClick={onExit}
          aria-label="Leave the game"
          className="grid place-items-center w-[44px] h-[44px] rounded-full text-dim hover:bg-panel2"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 grid place-items-center">{children}</div>
    </div>
  );
}
