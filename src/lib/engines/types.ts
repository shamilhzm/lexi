// The seam for models that run on the learner's own machine (2026-11-27).
//
// Lexi is silent (VISION, refusal *A closed voice*) and its tutor runs on Lexi's
// server. Both are waiting on the same thing: open models good enough at German
// to run on a phone or a laptop. They are arriving: Whisper and Parakeet hear
// German in a browser tab, Piper speaks it from a CC0 voice, small instruction
// models answer in it. When one is good enough, adding it should be an
// implementation, not a rewrite. These contracts are that implementation's shape.
//
// Three jobs, named for what they do for a learner:
//
//   voice  — say a German word or sentence           (text → audio)
//   ears   — hear what the learner said              (audio → text)
//   tutor  — explain a sentence, correct a write-back (text → text)
//
// What an engine may never do is written into the contracts rather than left to
// review: none of them takes a card, a schedule or a grade, so none of them can
// write one. A tutor's answer is advice; ears produce a transcript, and scoring a
// transcript is the drill's job, through the same grading as a typed answer.

export type EngineKind = 'voice' | 'ears' | 'tutor';

/** Where the model runs. There is deliberately no `'cloud'`: a model somebody else
 *  hosts is the settled tutor (`lib/ai.ts`, behind Lexi's server and the learner's
 *  consent), not an engine. */
export type Where =
  /** In this browser tab, downloaded once and cached. */
  | 'device'
  /** A server the learner runs on their own machine (Ollama, LM Studio, a
   *  whisper.cpp server). Lexi ships none of it and never starts it. */
  | 'local-server'
  /** Run by a maintainer at build time; only its output ships (audio clips). */
  | 'build-time';

/** How the engine's code reaches the learner. GPL code may run on a maintainer's
 *  machine, but it may not travel inside Lexi's MIT bundle or its downloads. */
export type Ships = 'bundle' | 'download' | 'external' | 'build-time';

/** SPDX identifiers where one exists. `weights` is the model, or the voice data. */
export interface Licence { code: string; weights: string }

/** What a device needs for an engine to run. Detected, never asked for: probing
 *  never raises a permission prompt (see `probe.ts`). */
export type Need = 'webgpu' | 'wasm' | 'wasm-threads' | 'storage-1gb' | 'microphone' | 'local-server';

export interface EngineSpec {
  id: string;
  kind: EngineKind;
  /** The model's own name, for the credits. Never a door, button or tab label. */
  name: string;
  by: string;
  where: Where;
  ships: Ships;
  licence: Licence;
  needs: Need[];
  /** What is known about its German, in a sentence, with the source in `source`. */
  german: string;
  source: string;
  /** `candidate` is admissible and worth building; `watch` is admissible but not
   *  yet good or small enough; `refused` stays in the registry so the reason for
   *  refusing it is kept where the next person will look. */
  status: 'candidate' | 'watch' | 'refused';
}

export interface Voice {
  spec: EngineSpec;
  /** Audio for German text. `slow` is the learner's request to hear it again,
   *  slower, and never a property of the card. */
  speak(text: string, o?: { slow?: boolean; signal?: AbortSignal }): Promise<Blob>;
}

export interface Ears {
  spec: EngineSpec;
  /** A transcript, nothing more. `expect` biases recognition toward the word the
   *  drill asked for. It is a hint, and the drill still grades the transcript. */
  transcribe(audio: Blob, o?: { expect?: string; signal?: AbortSignal }): Promise<{ text: string }>;
}

export interface Tutor {
  spec: EngineSpec;
  /** One completion. The prompts are Lexi's (the same two jobs as `lib/ai.ts`), and
   *  article text goes in as data, never as instructions. */
  complete(system: string, user: string, o?: { json?: boolean; signal?: AbortSignal }): Promise<string>;
}

export type Engine = Voice | Ears | Tutor;
