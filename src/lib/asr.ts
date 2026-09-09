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

  function teardown() {
    if (!rec) return;
    rec.onresult = rec.onerror = rec.onend = rec.onaudiostart = null;
    try { rec.abort(); } catch { /* already dead */ }
    rec = null;
  }

  return {
    active: () => rec !== null,
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
      r.continuous = false;
      r.maxAlternatives = 5;
      t0 = now();
      r.onaudiostart = () => opts.onOpen?.();

      r.onresult = (e) => {
        const res = e.results[e.results.length - 1];
        if (!res) return;
        const alternatives: string[] = [];
        for (let i = 0; i < res.length; i++) alternatives.push((res[i]?.transcript ?? '').trim());
        opts.onHeard({
          text: alternatives[0] ?? '',
          alternatives,
          final: res.isFinal,
          at: Math.round(now() - t0),
        });
      };
      r.onerror = (e) => {
        // `no-speech` and `aborted` are how a normal turn ends when nobody spoke or
        // the caller moved on. Neither is worth telling a learner about.
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        opts.onError?.(e.error);
      };
      r.onend = () => { rec = null; opts.onEnd?.(); };

      try { r.start(); } catch { opts.onError?.('start-failed'); teardown(); }
    },
  };
}
