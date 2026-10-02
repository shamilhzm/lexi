// Render a walk to one audio file, on the phone, before it starts.
//
// **Why one file.** The walk has to keep going with the phone locked in a pocket,
// and a web page cannot reliably do anything once it is: timers stall, WASM stops,
// and whether a media element may swap to its next source in the background is
// something iOS has changed its mind about. A single file that is *already
// playing* is the one thing every platform lets continue. So the whole walk —
// prompts, cue tones, pauses to speak into, answers — is laid on one timeline and
// rendered before the first word, and the headphone buttons are read against the
// clock (`walk.pressTarget`) rather than against anything that has to run.
//
// **Why here and not at build time.** Pre-rendering every card's audio at build
// time was estimated at 200–700 MB by the panel's finance review, which does not fit
// the host. Rendering on the device costs a minute of "preparing", ships nothing,
// works offline once the two voices are cached, and — since the audio is made on
// the learner's phone from CC0/public-domain voice data — redistributes nothing.
//
// 16 kHz mono, 16-bit: speech keeps everything up to 8 kHz, which is where German
// keeps *s*, *sch* and *z*; an hour is ~115 MB of PCM, built in five-minute chunks
// so the float buffers alive at any moment stay small.
import { synthesize, HD_VOICE_ID, EN_VOICE_ID } from './tts.ts';
import { TONE_SECONDS, type Segment } from './walk.ts';
import { readClips, writeClip, pruneClips } from './clipCache.ts';

const RATE = 16000;
const CHUNK_SECONDS = 300;

type Ctor = typeof OfflineAudioContext;
const Offline: Ctor | undefined = typeof window === 'undefined'
  ? undefined
  : (window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: Ctor }).webkitOfflineAudioContext);

export function canRenderWalk(): boolean { return !!Offline; }

/** The voice a clip key is spoken in: `de:` keys in Thorsten, `en:` in Cori. */
export function voiceFor(key: string): string { return key.startsWith('en:') ? EN_VOICE_ID : HD_VOICE_ID; }

/** What a clip is cached under — the voice as well as the text, so a new voice
 *  can never be served an old one's recording. */
const cacheKey = (key: string) => `${voiceFor(key)}\u0000${key.slice(3)}`;

/** The clip keys that would have to be synthesised — not yet on this device. */
export async function missingClips(keys: string[]): Promise<string[]> {
  const have = await readClips(keys.map(cacheKey));
  return keys.filter((k) => !have.has(cacheKey(k)));
}

/** Synthesise and decode every clip, from the device's cache where it can
 *  (`lib/clipCache.ts`). `onProgress` gets 0..1. */
export async function renderClips(keys: string[], onProgress?: (f: number) => void): Promise<Map<string, AudioBuffer>> {
  if (!Offline) throw new Error('This browser cannot render audio offline.');
  const decoder = new Offline(1, 1, RATE);
  const out = new Map<string, AudioBuffer>();
  const cached = await readClips(keys.map(cacheKey));
  let done = 0;
  for (const key of keys) {
    const hit = cached.get(cacheKey(key));
    if (hit) {
      const buf = decoder.createBuffer(1, Math.max(1, hit.length), RATE);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < hit.length; i++) ch[i] = hit[i] / 0x8000;
      out.set(key, buf);
    } else {
      const wav = await synthesize(key.slice(3), voiceFor(key));
      const buf = await decoder.decodeAudioData(await wav.arrayBuffer());
      out.set(key, buf);
      void writeClip(cacheKey(key), toInt16(buf.getChannelData(0)));
    }
    onProgress?.(++done / keys.length);
  }
  void pruneClips();
  return out;
}

function toInt16(f32: Float32Array): Int16Array<ArrayBuffer> {
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const v = Math.max(-1, Math.min(1, f32[i]));
    i16[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return i16;
}

/** Lay the segments on the clock and render them to a WAV blob URL. */
export async function renderTimeline(segments: Segment[], clips: Map<string, AudioBuffer>, total: number,
                                     onProgress?: (f: number) => void): Promise<string> {
  if (!Offline) throw new Error('This browser cannot render audio offline.');
  const parts: ArrayBuffer[] = [];
  let samples = 0;
  for (let from = 0; from < total; from += CHUNK_SECONDS) {
    const len = Math.min(CHUNK_SECONDS, total - from);
    const ctx = new Offline(1, Math.ceil(len * RATE), RATE);
    for (const s of segments) {
      const buf = s.clip ? clips.get(s.clip) : undefined;
      const dur = buf ? buf.duration : s.tone ? TONE_SECONDS : 0;
      if (s.at + dur <= from || s.at >= from + len) continue;
      const when = Math.max(0, s.at - from);
      const offset = Math.max(0, from - s.at);
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(when, offset);
      } else if (s.tone) {
        // A soft two-note cue: "your turn". Enveloped so it never clicks.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(660, when);
        osc.frequency.setValueAtTime(880, when + TONE_SECONDS / 2);
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(0.18, when + 0.02);
        gain.gain.linearRampToValueAtTime(0, when + TONE_SECONDS);
        osc.connect(gain).connect(ctx.destination);
        osc.start(when);
        osc.stop(when + TONE_SECONDS);
      }
    }
    const rendered = await ctx.startRendering();
    const i16 = toInt16(rendered.getChannelData(0));
    parts.push(i16.buffer);
    samples += i16.length;
    onProgress?.(Math.min(1, (from + len) / total));
  }
  return URL.createObjectURL(new Blob([wavHeader(samples), ...parts], { type: 'audio/wav' }));
}

function wavHeader(samples: number): ArrayBuffer {
  const bytes = samples * 2;
  const h = new DataView(new ArrayBuffer(44));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); h.setUint32(4, 36 + bytes, true); str(8, 'WAVE');
  str(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, RATE, true); h.setUint32(28, RATE * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true);
  str(36, 'data'); h.setUint32(40, bytes, true);
  return h.buffer;
}
