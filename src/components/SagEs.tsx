// Sag es — say the word, and keep saying it until the machine gets it.
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
  startRun, heard as onHeard, tick, skip, tally, progress, isPlayable, startClock,
  secondsLeft, LOOKAHEAD, type Run,
} from '../lib/sages.ts';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Word, CEFR } from '../types.ts';

/** Words in the pool, not words in a run. A run is a minute long and nobody clears
 *  forty; this is a floor so the queue cannot run dry, not a target. */
const POOL = 40;

/** Pick a run. Shuffled rather than ordered, and inside the learner's own level
 *  filter — the game is not a place to meet C2 vocabulary you have not chosen. */
function pickWords(levelFilter: Set<CEFR>): Word[] {
  const pool = WORDS.filter((w) => levelFilter.has(w.level) && isPlayable(w));
  const out: Word[] = [];
  const seen = new Set<number>();
  while (out.length < POOL && seen.size < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(pool[i]);
  }
  return out;
}

type Phase = 'intro' | 'playing' | 'done' | 'blocked';

/** `?debug=1` turns on a live readout while playing.
 *
 *  In the **production** build on purpose. A speech recogniser misbehaves on a
 *  specific device, in a specific browser, in a room with specific noise in it, and
 *  none of that reproduces on a simulator that has no microphone at all. A flag that
 *  only works in `npm run dev` is a flag that cannot debug the only environment that
 *  matters. Off unless asked for, so it costs nobody anything. */
const debugOn = () => {
  try { return new URLSearchParams(location.search).has('debug'); } catch { return false; }
};

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
  /** Has the recogniser produced a single transcript this run?
   *
   *  Its own state because the honest thing to show when the answer is *no* after
   *  several seconds is **"nothing is reaching the microphone"**, not *Listening…*.
   *  A game that pretends to hear you while erroring twenty-four times is worse than
   *  one that admits it is deaf. */
  const [everHeard, setEverHeard] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const debug = useMemo(() => debugOn(), []);
  /** The last few transcripts, newest first — what the recogniser actually sent. */
  const [trace, setTrace] = useState<string[]>([]);

  const listener = useRef<Listener | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;
  const armedRef = useRef(false);
  const debugRef = useRef(false);
  debugRef.current = debug;
  /** The transcript as it stood when the current word came up.
   *
   *  A `continuous` session hands back one string that **keeps growing** — the
   *  recording showed `Rudern Juden Juden Juden Juden wurden` under a single word.
   *  Matching against the whole of it means a word can be cleared by something the
   *  learner said thirty seconds ago, for a word that has already gone by. Only the
   *  part appended since this word came up is evidence about this word. */
  const baseline = useRef('');
  /** Consecutive recogniser failures. Reset whenever audio actually arrives. */
  const failures = useRef(0);

  /** Start the track. Idempotent and once per run: the recogniser restarts after
   *  every pause, so re-arming per session would hand out a fresh five seconds each
   *  time the learner stopped talking. */
  const arm = useCallback(() => {
    if (armedRef.current) return;
    armedRef.current = true;
    setArmed(true);
    setRun((r) => (r ? startClock(r, performance.now()) : r));
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
    setEverHeard(false);
    setQuiet(false);
    failures.current = 0;
    baseline.current = '';
    setTrace([]);
    setPhase('playing');

    // One long-lived listener, restarted when the engine ends a turn. A recogniser
    // stops on its own after a pause, and re-`start()`ing it is the only way to keep
    // a run going — the alternative is one session per word, which pays the
    // microphone warm-up twelve times.
    const l = createListener({
      onHeard: (h) => {
        failures.current = 0;
        setEverHeard(true);
        setQuiet(false);
        arm(); // some engines never fire `onaudiostart`; hearing something proves it

        // Only what has been said *since this word came up*.
        const full = h.text ?? '';
        const fresh = full.startsWith(baseline.current)
          ? full.slice(baseline.current.length).trim()
          : full.trim();
        setLive(fresh);

        const cur = runRef.current;
        if (debugRef.current) {
          const want = cur?.slots[cur.index]?.say ?? '—';
          setTrace((t) => [
            `${h.final ? 'F' : 'i'} want=${want} fresh=${JSON.stringify(fresh)} full=${JSON.stringify(full)}`,
            ...t,
          ].slice(0, 6));
        }
        if (!cur || cur.done) return;
        const next = onHeard(cur, fresh, h.alternatives);
        if (next === cur) return;
        if (next.index !== cur.index) {
          // A new word: everything heard so far belongs to the last one.
          baseline.current = full;
          setLive('');
        }
        setRun(next);
      },
      // Arm once per run, not once per session: the recogniser stops after every
      // pause and is restarted below, so a per-session reset would hand the learner
      // a fresh clock every time they stopped talking.
      // **Arming is not proof.** The first version cleared the failure counter here,
      // and the microphone opening is exactly what a broken capture does before it
      // fails: measured on the Simulator, 25 starts and 24 ends in twenty seconds,
      // `audio-capture` every time, counter reset to zero on every one of them, and
      // the screen saying *Listening…* throughout. Only a transcript proves audio is
      // reaching the recogniser, so only a transcript clears the count.
      onOpen: () => arm(),
      // **Restart on a timer, not inside the event.** Safari throws
      // `InvalidStateError` when `start()` lands too close to the `end` that
      // preceded it, and the throw used to be swallowed — leaving the game on
      // screen, saying *Listening…*, and completely deaf. A short gap and a
      // failure count is the difference between a recogniser that is resting and
      // one that has died.
      onEnd: () => {
        if (runRef.current?.done || !listener.current) return;
        window.setTimeout(() => {
          if (listener.current === l && !runRef.current?.done) l.listen();
        }, 300);
      },
      onError: (e) => {
        if (e === 'not-allowed' || e === 'service-not-allowed') {
          setError('Lexi needs the microphone for this one. Allow it in your browser settings and start again.');
          setPhase('blocked');
          return;
        }
        if (e === 'audio-capture') {
          setError('No audio is reaching the microphone. On a simulator that is normal — '
            + 'on a phone, check that nothing else is using the mic.');
          setPhase('blocked');
          return;
        }
        if (e === 'language-not-supported') {
          setError('This device has no German speech recognition installed, so Lexi cannot hear German here.');
          setPhase('blocked');
          return;
        }
        // Everything else: give it a few goes, then say so rather than sitting there
        // pretending to listen.
        failures.current += 1;
        if (failures.current >= 4) {
          setError(`The recogniser keeps stopping (${e}). That is the browser, not you — try again, or use Chrome.`);
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

  // Say so if nothing is arriving. Six seconds of an armed run with no transcript at
  // all is not a slow learner, it is a microphone that is not working.
  useEffect(() => {
    if (phase !== 'playing' || !armed || everHeard) return;
    const t = setTimeout(() => setQuiet(true), 6000);
    return () => clearTimeout(t);
  }, [phase, armed, everHeard]);

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
          <p className="text-dim mb-4">{error ?? cap.reason}</p>
          <Stats listener={listener.current} className="mb-6" />
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
          {/* Not "before it goes past" any more: a word no longer expires, because a
              word that expires is the recogniser's failure charged to the learner.
              The clock belongs to the run. */}
          <h2 className="text-2xl font-bold mb-2">Clear as many words as you can</h2>
          <p className="text-dim mb-4">
            One minute. A word stays until the recogniser catches it, and the word
            fills up as it gets closer — so you can see it closing in. Clear as many
            as you can.
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
            {t.cleared} {t.cleared === 1 ? 'word' : 'words'} cleared
          </h2>
          <p className="text-dim mb-5">
            {t.skipped > 0
              ? `${t.skipped} skipped — here is what the recogniser heard on those.`
              : 'Everything you reached, it caught.'}
          </p>
          <ul className="mb-6 border-t border-line">
            {run.slots.slice(0, run.index).map((s) => (
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
  const left = secondsLeft(run, now);
  const current = run.slots[run.index];
  const ahead = run.slots.slice(run.index + 1, run.index + 1 + LOOKAHEAD);
  const close = current?.closeness ?? 0;

  return (
    <Frame onExit={onExit}>
      <div className="w-full max-w-[640px]">
        <div className="flex items-baseline justify-between mb-3">
          {/* The score is the count of words cleared, and it is the only number the
              game keeps. No percentage: a rate reads as a mark for the learner's
              mouth, which is the thing this game refuses to give. */}
          <span className="text-2xl font-extrabold tabular-nums">
            {run.cleared}
            <span className="text-sm font-semibold text-dim ml-1.5">cleared</span>
          </span>
          <span className={`text-sm font-mono tabular-nums ${left <= 10 ? 'text-red' : 'text-dim'}`}>
            {armed ? `${left}s` : '—'}
          </span>
        </div>

        {/* The clock, and it belongs to the *run*. A word has no deadline: a word
            that expires is the recogniser's failure charged to the learner. */}
        <div className="h-[3px] bg-panel2 rounded-full overflow-hidden mb-7" aria-hidden>
          <div
            className="h-full bg-accent rounded-full"
            style={{ width: `${(1 - p) * 100}%`, transition: reduce ? 'width .25s linear' : 'none' }}
          />
        </div>

        <div className="relative min-h-[128px]">
          {/* **The word fills up as the recogniser closes in.**
              
              This is the only feedback while a word is live, and it is a gauge rather
              than a mark: it says *how near the transcript has come*, which is a fact
              about the machine, not a verdict on a mouth. It is a high-water mark, so
              it only ever rises — a bar that falls back when you say a second thing is
              reporting noise as failure.

              Painted with `background-clip: text` over a two-stop gradient at double
              width, so the fill is a *background-position* and can be transitioned;
              animating a gradient stop directly does not interpolate. The text stays
              real text underneath — selectable, and read out as itself. */}
          <p
            lang="de"
            className="text-[clamp(34px,9vw,68px)] font-extrabold leading-[1.05] tracking-[-0.03em] break-words"
            style={{
              backgroundImage: 'linear-gradient(90deg, var(--color-accent) 50%, var(--color-txt) 50%)',
              backgroundSize: '200% 100%',
              backgroundPosition: `${(1 - close) * 100}% 0`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              transition: reduce ? 'none' : 'background-position 160ms ease-out',
            }}
          >
            {current?.say}
          </p>
          {/* **The transcript sits under the word, not across it.**
              
              It was overlaid, offset by a tenth of an em and in the same accent
              colour as the fill — and on a real phone the two were one unreadable
              smear: `rudern` under `Rudern Juden Juden Juden Juden wurden`, neither
              legible. The joke only works if you can read both halves of it. Below,
              smaller, in the warning colour, and marked as what it is. */}
          {live && (
            <p aria-hidden className="mt-2 text-[clamp(19px,5vw,30px)] font-bold leading-[1.15]
              tracking-[-0.02em] break-words text-red/85">
              {live}
            </p>
          )}
        </div>

        {/* The same transcript again, plainly, for anyone the overlay does not reach —
            it is `aria-hidden` above because two overlapping words read as gibberish. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {live ? `heard: ${live}` : ''}
        </p>

        <div className="mt-5 flex items-baseline gap-4 opacity-45" aria-hidden>
          {ahead.map((s) => (
            <span key={s.word.id} lang="de" className="text-lg font-bold truncate">{s.say}</span>
          ))}
        </div>

        {/* **Shipped, not dev-only, and only when something is wrong.**
            
            Four different silent failures look identical on this screen: no audio
            reaching the mic, no German language pack, a `start()` that throws, a
            permission never granted. Measured on the Simulator, the game ran for
            twenty seconds saying *Listening…* while the recogniser started 25 times,
            ended 24, and returned `audio-capture` on every one.
            
            A learner cannot fix that, but they can *report* it, and a line of counts
            is the difference between "it doesn't work" and something actionable.
            It appears only once the app has admitted it is deaf. */}
        {quiet && <Stats listener={listener.current} />}

        {debug && (
          <div className="mt-4 font-mono text-[10px] text-dim leading-[1.45] break-all">
            <Stats listener={listener.current} />
            <div>idx {run.index} · cleared {run.cleared} · close {close.toFixed(2)}
              {' '}· caught {String(current?.caught)} · base {JSON.stringify(baseline.current.slice(-28))}</div>
            {trace.map((t, i) => <div key={i}>{t}</div>)}
          </div>
        )}

        <div className="mt-7 flex items-center gap-2">
          {/* Free, and it clears nothing. Charging time for a skip would charge the
              learner for the recogniser refusing a word. */}
          <Button
            variant="secondary"
            onClick={() => {
              // The baseline moves with the word, or the next one inherits this
              // word's speech and can be cleared by it.
              baseline.current += (baseline.current ? ' ' : '') + live;
              setRun(skip(run));
              setLive('');
            }}
          >
            Skip
          </Button>
          <span className={`text-xs ${quiet ? 'text-red' : 'text-dim'}`}>
            {!armed ? 'Waiting for the microphone…'
              : quiet ? 'Not hearing anything — is the mic blocked?'
              : live ? '' : 'Listening…'}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/** What the recogniser actually did. Shown only in a failure state — see the call
 *  site — because it is a bug report, not a readout. */
function Stats({ listener, className = '' }: { listener: Listener | null; className?: string }) {
  const st = listener?.stats();
  if (!st) return null;
  return (
    <p className={`font-mono text-[11px] text-dim leading-[1.5] ${className}`}>
      started {st.starts} · ended {st.ends} · heard {st.results}
      {st.continuous ? '' : ' · single-shot'}
      {st.last ? ` · ${st.last}` : ''}
    </p>
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
