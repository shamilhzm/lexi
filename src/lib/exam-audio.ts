// The Hörverstehen player.
//
// No recordings ship with Lexi and none can: a telc listening CD is licensed
// material, and the twenty-odd minutes of German this paper needs would be a
// bigger download than the app. So the scripts are spoken by the device.
//
// **Deliberately the platform voice, not the HD one.** `lib/tts.ts` routes
// through Piper when a learner has enabled it, and Piper is the better voice —
// but it synthesises a clip per call, cannot be queued, and would put a ~25 MB
// download in the middle of a timed listening part for anyone who had not
// fetched it yet. `speechSynthesis` has a real queue, so a fifteen-turn interview
// plays as one continuous track with natural gaps between turns, and its `rate`
// is adjustable, which matters more in a listening exam than timbre does.
//
// What this is not: it is not a substitute for the exam's own audio. One voice
// reads every speaker, and no synthetic voice reproduces the overlapping,
// hesitating, regionally-coloured German of a real recording. The UI says so
// rather than letting a learner infer that they are ready.

export interface Line { who?: string; text: string }

let queue: SpeechSynthesisUtterance[] = [];
let onDone: (() => void) | null = null;
let watchdog: ReturnType<typeof setInterval> | null = null;

function voice(): SpeechSynthesisVoice | undefined {
  try {
    const all = speechSynthesis.getVoices();
    // Prefer a German voice that isn't the lowest-quality fallback; any de-* is
    // still far better than reading English phonemes over German text.
    return all.find((v) => v.lang === 'de-DE') ?? all.find((v) => v.lang.startsWith('de'));
  } catch { return undefined; }
}

export function audioAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined';
}

/**
 * Speak a whole track, in order, resolving when the last line finishes.
 *
 * `rate` is the one control a listening drill genuinely needs: 1 for the exam
 * pace, ~0.75 for the "langsam" replay that turns a failed item into a lesson.
 */
export function playTrack(lines: Line[], rate = 1, onEnd?: () => void): void {
  stopTrack();
  if (!audioAvailable()) { onEnd?.(); return; }
  onDone = onEnd ?? null;
  const v = voice();
  queue = lines.map((l) => {
    const u = new SpeechSynthesisUtterance(l.text);
    u.lang = 'de-DE';
    u.rate = rate;
    if (v) u.voice = v;
    return u;
  });
  const last = queue[queue.length - 1];
  if (!last) { finished(); return; }
  // `end` fires on cancel as well as on completion, so the handler is cleared
  // by stopTrack() before the cancel rather than guarding here. `error` matters
  // as much: a voice that fails mid-track must still hand control back.
  last.addEventListener('end', finished, { once: true });
  last.addEventListener('error', finished, { once: true });
  for (const u of queue) speechSynthesis.speak(u);

  // The watchdog exists because `end` is not reliable. Chrome drops the event if
  // the tab is backgrounded mid-track, iOS Safari silently refuses to start
  // without a gesture it recognises, and some engines simply never fire on the
  // last utterance of a long queue. Any of those would strand the button on
  // "Stop" with no audio and no way to replay — during a timed listening part.
  // Polling the engine's own `speaking`/`pending` is the only honest answer.
  //
  // The first few polls are skipped: `speak()` is asynchronous in starting, and
  // an engine that has not yet reported `speaking` is not the same as one that
  // has finished. Two seconds of grace is longer than any engine takes to start
  // and shorter than the shortest track here.
  let grace = 3;
  watchdog = setInterval(() => {
    if (isPlaying()) { grace = 0; return; }
    if (grace > 0) { grace--; return; }
    finished();
  }, 700);
}

function finished(): void {
  const f = onDone;
  onDone = null;
  queue = [];
  if (watchdog) { clearInterval(watchdog); watchdog = null; }
  f?.();
}

export function stopTrack(): void {
  onDone = null;
  queue = [];
  if (watchdog) { clearInterval(watchdog); watchdog = null; }
  try { speechSynthesis?.cancel(); } catch { /* */ }
}

export function isPlaying(): boolean {
  try { return !!speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending); }
  catch { return false; }
}
