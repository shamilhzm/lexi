// Reading an article aloud, paragraph by paragraph, reporting which one is being
// spoken so the reader can mark it. Listening while reading is the cheapest
// listening practice there is — the text removes the guesswork, the audio the
// spelling-pronunciation.
import { hdVoice } from '../../store.ts';
import { speakHdToEnd, stopHd } from '../tts.ts';
import { interrupt } from '../player.ts';

/** Start reading `texts`; `onIndex(i)` fires as paragraph `i` starts and with -1
 *  when done or stopped. Returns a stop function. */
export function readAloud(texts: string[], onIndex: (i: number) => void): () => void {
  let stopped = false;
  // One interruption for the whole article: Hören stays paused between paragraphs
  // rather than leaping back in during each one's synthesis (lib/player.ts).
  const resume = interrupt();
  const done = (i: number) => { onIndex(i); if (i < 0) resume(); };
  if (hdVoice()) {
    void (async () => {
      for (let i = 0; i < texts.length && !stopped; i++) {
        onIndex(i);
        try { await speakHdToEnd(texts[i]); } catch { break; }
      }
      done(-1);
    })();
    return () => { stopped = true; stopHd(); done(-1); };
  }
  if (typeof speechSynthesis === 'undefined') { done(-1); return () => {}; }
  speechSynthesis.cancel();
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('de'));
  texts.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'de-DE';
    u.rate = 0.95;
    if (voice) u.voice = voice;
    u.onstart = () => { if (!stopped) onIndex(i); };
    if (i === texts.length - 1) u.onend = () => done(-1);
    speechSynthesis.speak(u);
  });
  return () => { stopped = true; speechSynthesis.cancel(); done(-1); };
}
