# Local AI: open models on the learner's machine

*Written 2026-11-27. Status: the seam is built and tested, and nothing is switched on.
Three decisions below are the owner's.*

Lexi went silent on 2026-11-26 (VISION, refusal *A closed voice*). Its tutor runs on
Lexi's server, behind an access code and the learner's consent (`lib/ai.ts`). Both
wait on the same thing: open models that are good enough at German to run on a phone
or a laptop. Those models are arriving. Whisper and Parakeet transcribe German in a
browser tab, Piper speaks it from a CC0 voice, and small instruction models answer in
it. WebGPU is on by default in Safari 26 and current Chrome. When one of these is good
enough, adding it should be an implementation, not a rewrite. This document and
`src/lib/engines/` are that implementation's shape.

## The seam

| File | What it holds |
|---|---|
| `lib/engines/types.ts` | Three contracts: `Voice` (text → audio), `Ears` (audio → transcript), `Tutor` (text → text). None of them takes a card, a schedule or a grade, so none of them can write one. |
| `lib/engines/policy.ts` | `admissible(spec)`: the licence rules below, as a function. |
| `lib/engines/registry.ts` | Every engine looked at, with its licence, where it runs and a verdict: `candidate`, `watch` or `refused`. Refusals stay listed, with their reasons. |
| `lib/engines/probe.ts` | What this device could run (WebGPU, WebAssembly, free storage, whether a microphone exists). Feature detection only: no permission prompt, no download, no request. |
| `components/OnThisDevice.tsx` | The readout in Settings: what the learner's device is ready for, and that nothing is installed. |
| `lib/engines/engines.test.ts` | Holds every registry verdict to the policy, keeps `installed()` empty, and keeps `speechSynthesis` and `SpeechRecognition` out of `src/`. |

## The policy

1. **Open weights or nothing.** Weights that forbid commercial use or derivatives, or
   that carry use restrictions, are refused. An MIT app cannot pass non-commercial
   weights on to a fork that sells lessons. This is the closed-voice ruling, applied
   to every model.
2. **Open code.** The runtime that executes in the browser has a permissive licence.
   The exception is a server the learner runs themselves, which Lexi neither ships
   nor starts.
3. **No GPL in the bundle or its downloads.** Lexi's code is MIT. A GPL program may
   run on a maintainer's machine to render clips, and the clips may ship.
4. **Nothing in the cloud.** `Where` has no cloud value. The hosted tutor is a
   separate, settled thing with its own consent.

The device's own speech synthesis and recognition are closed models. They are refused
by having no spec at all, and the test keeps them out of the code.

## What was looked at (2026-11-27)

| Engine | Job | Licence (code · weights) | Verdict | What would change it |
|---|---|---|---|---|
| Piper + Thorsten, clips rendered at build time | voice | GPL-3.0 · CC0-1.0 | candidate | The owner's decision 1 |
| Piper + Thorsten, in the browser | voice | GPL-3.0 · CC0-1.0 | refused | It would ship GPL code (Piper and espeak-ng) inside the app |
| piper-plus | voice | MIT · CC0-1.0 | watch | Verify the claim that it drops espeak-ng, and its German phonemes |
| Voxtral 4B TTS | voice | Apache-2.0 · CC-BY-NC-4.0 | refused | Only a licence change |
| Whisper via Transformers.js | ears | Apache-2.0 · MIT | candidate | The owner's decision 2 |
| Parakeet TDT 0.6B v3 | ears | MIT · CC-BY-4.0 | watch | NVIDIA's pages disagree on its licence; wait for them to agree |
| The learner's own model server (Ollama, LM Studio, llama.cpp) | tutor | the learner's | candidate | The owner's decision 3 |
| Qwen2.5 1.5B via WebLLM | tutor | Apache-2.0 · Apache-2.0 | watch | A model this size that passes the tutor's checks in German |
| Llama via WebLLM | tutor | Apache-2.0 · Llama Community | refused | Only a licence change |

Sources are in `registry.ts`. Piper moved from MIT (`rhasspy/piper`, archived in 2025)
to GPL (`OHF-Voice/piper1-gpl`), which is why the in-browser route is refused and the
clip route is not.

## The owner's decisions

Each one is a Reserved matter: it reopens a VISION refusal, changes a security header,
or changes what leaves the device.

### 1. Give Lexi a voice through clips (Piper + Thorsten, CC0)

A maintainer renders every card's headword, and the examples worth hearing, on their
own machine. Lexi ships the audio files, never Piper. This does not breach *A closed
voice*: the voice is CC0 and the engine is open source. VISION would record that the
condition for silence has been met.

- **Cost.** Clips are data. The boot budget is unaffected if they are fetched per card
  and cached by the service worker, as `detail/` is. The total size is unmeasured: run
  a render of one level before deciding, and record the number from that run.
- **Security.** The CSP has `media-src 'none'`, so it needs `'self'`.
- **What comes back.** Hören in the exam papers (`SILENT` in `lib/exam.ts`), a
  play button on a card, and listening drills, all graded as before.

### 2. Let Lexi hear the learner (Whisper, on the device)

An opt-in download, a few hundred MB depending on the model, that runs in the tab.
The microphone permission is asked for when the learner first chooses to speak, never
before. A spoken answer becomes a transcript, and the transcript is graded through the
same path as a typed answer, so *Sag es* can return without a closed recogniser.

- **Acceptance.** Transcribe the corpus's own example sentences, read aloud, and
  measure the word error rate per level before shipping. A1 has to work.

### 3. Let a learner use their own local model as the tutor

The tutor's two jobs (explain, correct) through an OpenAI-compatible server on the
learner's machine. Their text never leaves the device.

- **Work.** Move the prompts out of `api/tutor.ts` into a module both the server and
  the browser import, so the two can never drift. Add a "local server" transport
  beside the access code in Settings.
- **Security.** Add `connect-src` entries for the default local ports only, e.g.
  `http://localhost:11434` (Ollama) and `http://127.0.0.1:1234` (LM Studio). Never a
  wildcard. The learner must also allow Lexi's origin on their server (Ollama's
  `OLLAMA_ORIGINS`), and Chrome asks them before a public page may reach a local
  address. That is two separate yeses, both the learner's.
- **Honesty.** The tutor's answers are still advice, never a card fact, and a small
  model is told so on screen.

## What an engine must never do

- **Write FSRS.** Ears produce a transcript, a drill grades it, and the drill alone
  writes the schedule. A voice or tutor writes nothing.
- **Run before the learner asks.** No model downloads on boot, and no microphone
  opens without a tap.
- **Send audio anywhere.** Rule 4 above. A model that needs a server is the learner's
  server, or it is not an engine.
