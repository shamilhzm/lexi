// The microphone, behind one door.
//
// Everything the Web Speech API is bad at is contained here: it is prefixed on
// Safari, absent outside a secure origin, silent about permission until you ask,
// inconsistent about whether `onaudiostart` fires, and it ends sessions on its own
// schedule. The rest of the game sees one object with one event shape, so the
// matcher and the round engine are testable without any of it — and so a paid
// streaming recogniser could replace this file without touching them.
//
// ## It is not local, and that is a decision, not a footnote
//
// Safari sends the audio to Apple; Chrome sends it to Google. Lexi is a local-first
// app with no backend — a commitment in VISION, not an implementation detail — and
// this is the first thing in it that sends anything a learner produces off the
// device. `support()` reports that fact so the UI can say it **before** the
// microphone opens rather than leaving the browser's permission sheet to imply it.
//
// See `docs/SPEAKING.md`.

export interface AsrSupport {
  available: boolean;
  /** Why not, in words a learner can act on. Null when it is available. */
  reason: string | null;
  /** Always true where this API exists. Named so no caller can forget it. */
  sendsAudioOffDevice: boolean;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
}
type Ctor = new () => SpeechRecognitionLike;

function ctor(): Ctor | null {
  const w = globalThis as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function support(): AsrSupport {
  // Order matters. Outside a secure origin the constructor is *absent*, so checking
  // for the API first reports "your browser cannot do this" to somebody whose
  // browser can — the origin is the problem, and it is the one they can fix.
  if (typeof globalThis !== 'undefined' && 'isSecureContext' in globalThis
      && !(globalThis as { isSecureContext?: boolean }).isSecureContext) {
    return {
      available: false,
      reason: 'Speech needs a secure connection (https). This page is not on one.',
      sendsAudioOffDevice: true,
    };
  }
  if (!ctor()) {
    return {
      available: false,
      reason: 'This browser cannot listen. Safari 14.5 and later, Chrome, or Edge can.',
      sendsAudioOffDevice: true,
    };
  }
  return { available: true, reason: null, sendsAudioOffDevice: true };
}

/** One utterance's worth of recogniser output. */
export interface Heard {
  text: string;
  alternatives: string[];
  final: boolean;
  /** ms from `listen()` to this event. The pacing number — see gate 1. */
  at: number;
}

export interface Listener {
  /** Open the microphone. Safe to call again; the previous session is torn down. */
  listen(): void;
  /** Close it and emit nothing further. */
  stop(): void;
  /** Whether a session is currently open. */
  active(): boolean;
  /** Sessions started, sessions ended, results seen, and the last error string.
   *
   *  Not decoration. A recogniser that never hears anything, one that is refused a
   *  language, one that ends instantly on every start, and one that was never
   *  granted a microphone all look the same on screen: a word, and nothing
   *  happening. These four numbers separate them. */
  stats(): {
    starts: number; ends: number; results: number;
    last: string | null; continuous: boolean;
  };
}

export interface ListenerOpts {
  onHeard(h: Heard): void;
  /** The microphone is open and audio is arriving.
   *
   *  Load-bearing, not diagnostic. Between `listen()` and this event iOS shows up to
   *  **two** system dialogs — Speech Recognition, then Microphone — and a caller that
   *  starts its clock at `listen()` runs the whole time the learner is reading them.
   *  Measured on the Simulator: a 12-word run reached word 8 before the second
   *  dialog was answered. */
  onOpen?(): void;
  /** Fired once per session when the recogniser stops on its own. */
  onEnd?(): void;
  /** A permission refusal, or anything else the caller must surface. */
  onError?(error: string): void;
  lang?: string;
  /** Injected in tests. */
  now?: () => number;
  Recognition?: Ctor;
}

export function createListener(opts: ListenerOpts): Listener {
  const Rec = opts.Recognition ?? ctor();
  const now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  let rec: SpeechRecognitionLike | null = null;
  let t0 = 0;
  // Diagnostics. A speech recogniser fails silently in four different ways and they
  // are indistinguishable on screen; these are what `SagEs` shows in dev.
  let starts = 0, ends = 0, results = 0;
  let last: string | null = null;
  let continuous = true;
  let emptyQuickEnds = 0;
  let sessionStart = 0;
  let sessionResults = 0;

  function teardown() {
    if (!rec) return;
    rec.onresult = rec.onerror = rec.onend = rec.onaudiostart = null;
    try { rec.abort(); } catch { /* already dead */ }
    rec = null;
  }

  return {
    active: () => rec !== null,
    stats: () => ({ starts, ends, results, last, continuous }),
    stop: teardown,
    listen() {
      if (!Rec) { opts.onError?.('unsupported'); return; }
      teardown();
      const r = new Rec();
      rec = r;
      r.lang = opts.lang ?? 'de-DE';
      // Interim results are the game. A final-only recogniser hands back an answer
      // after the learner has stopped speaking, which is a beat too late to print
      // over a word that is still moving.
      r.interimResults = true;
      // Ask for a session that survives a pause. iOS ends a non-continuous session
      // within a second or two of silence, and a game whose learner is still reading
      // the word is deaf by the time they speak.
      //
      // **And give up on it if it does not work.** `continuous` is honoured by
      // Chrome, ignored by some builds and actively harmful on others — a session
      // that ends instantly, every time, with nothing heard. There is no capability
      // flag to ask, so this asks by *trying*: two consecutive sessions that end
      // within a second having produced nothing, and the next one drops the flag.
      // Self-correcting beats a user-agent test that is wrong next release.
      r.continuous = continuous;
      r.maxAlternatives = 5;
      t0 = now();
      sessionStart = t0;
      sessionResults = 0;
      r.onaudiostart = () => opts.onOpen?.();

      r.onresult = (e) => {
        const res = e.results[e.results.length - 1];
        if (!res) return;
        const alternatives: string[] = [];
        for (let i = 0; i < res.length; i++) alternatives.push((res[i]?.transcript ?? '').trim());
        results += 1;
        sessionResults += 1;
        opts.onHeard({
          text: alternatives[0] ?? '',
          alternatives,
          final: res.isFinal,
          at: Math.round(now() - t0),
        });
      };
      r.onerror = (e) => {
        last = e.error;
        // `no-speech` and `aborted` are how a normal turn ends when nobody spoke or
        // the caller moved on. Neither is worth telling a learner about — but they
        // are still recorded, because "it never hears anything" and "it errors every
        // time" look identical from the outside and need different fixes.
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        opts.onError?.(e.error);
      };
      r.onend = () => {
        rec = null;
        ends += 1;
        if (sessionResults === 0 && now() - sessionStart < 1000) {
          emptyQuickEnds += 1;
          if (emptyQuickEnds >= 2 && continuous) { continuous = false; emptyQuickEnds = 0; }
        } else {
          emptyQuickEnds = 0;
        }
        opts.onEnd?.();
      };

      try { r.start(); starts += 1; }
      catch (err) {
        // Safari throws here when asked to start a recogniser that is already
        // running, and iOS can refuse a start that is not inside a user gesture.
        // Swallowing it left the game alive on screen and deaf — the exact symptom
        // this counter exists to tell apart from "nobody spoke".
        last = `start-failed: ${(err as Error)?.name ?? 'unknown'}`;
        opts.onError?.('start-failed');
        teardown();
      }
    },
  };
}
