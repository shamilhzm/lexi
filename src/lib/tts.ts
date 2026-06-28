// German speech. Two engines:
//  - HD: Piper "Thorsten" neural voice via @diffusionstudio/vits-web, running
//    fully in-browser (WASM) and cached in the origin private filesystem, so it
//    works offline after the one-time voice download. Opt-in (it's a ~25 MB DL).
//  - Fallback: the platform's built-in de-DE speech synthesis (speakDe).
// speak() routes to HD when the user has enabled it, else the fallback.
import { hdVoice } from '../store.ts';
import { speakDe } from './ui.ts';

export const HD_VOICE_ID = 'de_DE-thorsten-medium';

const CDN = 'https://esm.sh/@diffusionstudio/vits-web@1.0.3';

let lib: any = null;
let ready = false;
export function hdReady() { return ready; }

async function load(): Promise<any> {
  if (lib) return lib;
  // Loaded from CDN at runtime so its heavy onnxruntime-web dependency never
  // enters the build. Vite must not try to resolve this — hence @vite-ignore.
  lib = await import(/* @vite-ignore */ CDN);
  return lib;
}

const pct = (p: any): number =>
  typeof p === 'number' ? p : (p && p.total ? (p.loaded ?? 0) / p.total : 0);

/** Download the Thorsten voice if needed. Returns once it's ready to speak. */
export async function ensureHdVoice(onProgress?: (fraction: number) => void): Promise<void> {
  const tts = await load();
  const stored: string[] = (await tts.stored?.()) ?? [];
  if (!stored.includes(HD_VOICE_ID)) {
    await tts.download(HD_VOICE_ID, (p: any) => onProgress?.(pct(p)));
  }
  ready = true;
}

let current: HTMLAudioElement | null = null;
async function speakHd(text: string): Promise<void> {
  const tts = await load();
  const wav: Blob = await tts.predict({ text, voiceId: HD_VOICE_ID });
  const url = URL.createObjectURL(wav);
  current?.pause();
  const audio = new Audio(url);
  current = audio;
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
}

/** Speak German text with the best available engine (HD if enabled, else system). */
export function speak(text: string): void {
  if (!hdVoice()) { speakDe(text); return; }
  speakHd(text).catch(() => speakDe(text)); // fall back on any HD failure
}
