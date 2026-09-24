// The microphone. A thin adapter over the Web Speech API's SpeechRecognition.
//
// ## Where the audio goes
//
// Lexi has no backend and says so. The browser's recogniser may not share that
// promise: Chrome's default sends audio to Google, Safari's to Apple. So:
//
//   1. If the browser can recognise German **on the device** (`processLocally`,
//      Chrome 139+), that is used and nothing leaves the machine.
//   2. If an on-device German pack can be downloaded, the screen offers it.
//   3. Otherwise the screen asks, in words, before the first recording — and
//      never records without that yes. Lexi itself never receives the audio.
import type { Heard } from './pronounce.ts';

const LANG = 'de-DE';

// The API is not in TypeScript's DOM lib yet; this is the slice we use.
interface Rec {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  processLocally?: boolean;
  start(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface RecCtor {
  new (): Rec;
  available?: (o: { langs: string[]; processLocally?: boolean }) => Promise<string>;
  install?: (o: { langs: string[]; processLocally?: boolean }) => Promise<boolean>;
}

function ctor(): RecCtor | null {
  const w = globalThis as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** `local` — on-device, ready. `downloadable` — on-device after a download.
 *  `remote` — only the browser's cloud service. `none` — no recogniser at all. */
export type SpeechMode = 'local' | 'downloadable' | 'remote' | 'none';

export async function speechMode(): Promise<SpeechMode> {
  const C = ctor();
  if (!C) return 'none';
  if (!C.available) return 'remote';
  try {
    const local = await C.available({ langs: [LANG], processLocally: true });
    if (local === 'available') return 'local';
    if (local === 'downloadable' || local === 'downloading') return 'downloadable';
    const any = await C.available({ langs: [LANG], processLocally: false });
    return any === 'available' ? 'remote' : 'none';
  } catch {
    return 'remote';
  }
}

export async function installLocal(): Promise<boolean> {
  try { return (await ctor()?.install?.({ langs: [LANG], processLocally: true })) ?? false; }
  catch { return false; }
}

let active: Rec | null = null;

/** Listen for one short utterance. Resolves with every alternative heard (empty
 *  if nothing was), rejects with the recogniser's error code. */
export function listen(local: boolean): Promise<Heard[]> {
  const C = ctor();
  if (!C) return Promise.reject(new Error('unsupported'));
  active?.abort();
  const rec = new C();
  rec.lang = LANG;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 5;
  if (local) rec.processLocally = true;
  active = rec;
  return new Promise((resolve, reject) => {
    let heard: Heard[] = [];
    rec.onresult = (e) => {
      const first = e.results[0];
      heard = first ? Array.from(first, (a) => ({ transcript: a.transcript, confidence: a.confidence })) : [];
    };
    rec.onerror = (e) => { if (e.error === 'no-speech') resolve([]); else reject(new Error(e.error)); };
    rec.onend = () => { if (active === rec) active = null; resolve(heard); };
    rec.start();
  });
}

export function stopListening(): void {
  active?.abort();
  active = null;
}
