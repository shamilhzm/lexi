// The engines Lexi has looked at, as data: what each is, where it would run, its
// licence, and the verdict. Nothing here is downloaded, imported or switched on.
// An entry is a decision record with a shape the policy can check.
//
// Checked 2026-11-27. Licences move (Piper's did in 2025), so `engines.test.ts`
// holds every verdict to `policy.ts`, and docs/LOCAL-AI.md says what would promote
// a `watch` to a `candidate`.
import { LEARNER_SUPPLIED } from './policy.ts';
import type { EngineKind, EngineSpec } from './types.ts';

export const ENGINES: readonly EngineSpec[] = [
  // ---- voice -------------------------------------------------------------------
  {
    id: 'piper-thorsten-clips', kind: 'voice', name: 'Piper with the Thorsten voice', by: 'Open Home Foundation; Thorsten Müller',
    where: 'build-time', ships: 'build-time',
    licence: { code: 'GPL-3.0-or-later', weights: 'CC0-1.0' },
    needs: [],
    german: 'A German voice recorded for open use. Rendered to clips on a maintainer’s machine, so the device only plays audio.',
    source: 'https://github.com/OHF-Voice/piper1-gpl',
    status: 'candidate',
  },
  {
    id: 'piper-thorsten-browser', kind: 'voice', name: 'Piper with the Thorsten voice, in the browser', by: 'Open Home Foundation',
    where: 'device', ships: 'download',
    licence: { code: 'GPL-3.0-or-later', weights: 'CC0-1.0' },
    needs: ['wasm'],
    german: 'The same voice, live. It would ship espeak-ng and Piper, both GPL, inside an MIT app.',
    source: 'https://github.com/OHF-Voice/piper1-gpl',
    status: 'refused',
  },
  {
    id: 'piper-plus', kind: 'voice', name: 'piper-plus', by: 'ayutaz',
    where: 'device', ships: 'download',
    licence: { code: 'MIT', weights: 'CC0-1.0' },
    needs: ['wasm'],
    german: 'An MIT fork that says it drops espeak-ng. The claim and its German phonemes are unverified.',
    source: 'https://github.com/ayutaz/piper-plus',
    status: 'watch',
  },
  {
    id: 'voxtral-tts', kind: 'voice', name: 'Voxtral 4B TTS', by: 'Mistral AI',
    where: 'device', ships: 'download',
    licence: { code: 'Apache-2.0', weights: 'CC-BY-NC-4.0' },
    needs: ['webgpu', 'storage-1gb'],
    german: 'Speaks German well, under weights that forbid commercial use.',
    source: 'https://huggingface.co/mistralai/Voxtral-4B-TTS-2603',
    status: 'refused',
  },

  // ---- ears --------------------------------------------------------------------
  {
    id: 'whisper-web', kind: 'ears', name: 'Whisper, through Transformers.js', by: 'OpenAI; Hugging Face',
    where: 'device', ships: 'download',
    licence: { code: 'Apache-2.0', weights: 'MIT' },
    needs: ['wasm'],
    german: 'Multilingual, German among its stronger languages. The small models trade accuracy for size, and WebGPU makes them fast.',
    source: 'https://huggingface.co/docs/transformers.js',
    status: 'candidate',
  },
  {
    id: 'parakeet-v3', kind: 'ears', name: 'Parakeet TDT 0.6B v3', by: 'NVIDIA',
    where: 'device', ships: 'download',
    licence: { code: 'MIT', weights: 'CC-BY-4.0' },
    needs: ['webgpu', 'storage-1gb'],
    german: '25 European languages including German. Its model card says CC-BY-4.0 and one NVIDIA page names another licence, so it waits for that to agree.',
    source: 'https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3',
    status: 'watch',
  },

  // ---- tutor -------------------------------------------------------------------
  {
    id: 'local-openai', kind: 'tutor', name: 'Your own model server', by: 'the learner',
    where: 'local-server', ships: 'external',
    licence: { code: LEARNER_SUPPLIED, weights: LEARNER_SUPPLIED },
    needs: ['local-server'],
    german: 'As good as the model the learner runs: Ollama, LM Studio and llama.cpp all speak the same OpenAI-style API.',
    source: 'https://github.com/ollama/ollama/blob/main/docs/openai.md',
    status: 'candidate',
  },
  {
    id: 'webllm-qwen', kind: 'tutor', name: 'Qwen2.5 1.5B Instruct, through WebLLM', by: 'Alibaba Qwen; MLC',
    where: 'device', ships: 'download',
    licence: { code: 'Apache-2.0', weights: 'Apache-2.0' },
    needs: ['webgpu', 'storage-1gb'],
    german: 'Answers in German, but a model this small explains grammar unreliably. It waits until one this size passes the tutor’s checks.',
    source: 'https://github.com/mlc-ai/web-llm',
    status: 'watch',
  },
  {
    id: 'webllm-llama', kind: 'tutor', name: 'Llama, through WebLLM', by: 'Meta; MLC',
    where: 'device', ships: 'download',
    licence: { code: 'Apache-2.0', weights: 'LicenseRef-Llama-Community' },
    needs: ['webgpu', 'storage-1gb'],
    german: 'Capable in German, under a licence with use restrictions and a user cap.',
    source: 'https://github.com/mlc-ai/web-llm',
    status: 'refused',
  },
];

export const enginesFor = (kind: EngineKind) => ENGINES.filter((e) => e.kind === kind);
