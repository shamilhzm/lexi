// How loud you are, straight off the microphone.
//
// The recogniser can tell you what it *understood*. It cannot tell you whether it
// heard anything at all — and that is the question a learner asks first when nothing
// is happening. A transcript that stays empty looks identical whether the mic is
// muted, the room is loud, the browser refused, or the German simply was not
// recognised. A level meter separates the first three from the fourth.
//
// So this is a second, independent read on the same microphone: `getUserMedia` into
// an `AnalyserMode`, RMS per frame, nothing stored and nothing sent anywhere. It is
// the only part of this game that is genuinely local.
//
// ## It must never take the game down with it
//
// Two audio consumers on one microphone is ordinary on desktop and less certain on
// iOS, where the audio session is shared. Every failure path here returns `null` and
// the game carries on without a meter: a missing bar is a cosmetic loss, and a
// recogniser that stops working because of a decoration is not a trade worth making.
// The caller treats it as optional by construction — same contract as `loadDetail`.

export interface Meter {
  /** 0..1, smoothed. Read it from a render loop; it does not allocate. */
  level(): number;
  stop(): void;
}

/** Attack fast, release slow — a meter that drops as fast as speech does reads as a
 *  flicker rather than a voice. */
const RISE = 0.55;
const FALL = 0.12;

export async function startMeter(): Promise<Meter | null> {
  try {
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) return null;
    const stream = await md.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const Ctx: typeof AudioContext = window.AudioContext
      ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) { stream.getTracks().forEach((t) => t.stop()); return null; }

    const ctx = new Ctx();
    // Safari starts contexts suspended outside a gesture; this is called from the
    // Start press, so the resume lands. If it does not, the meter reads zero rather
    // than throwing.
    void ctx.resume().catch(() => {});
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    src.connect(analyser);
    // Deliberately **not** connected to the destination: routing the microphone to
    // the speakers is a feedback loop with a phone's speaker six centimetres away.

    const buf = new Float32Array(analyser.fftSize);
    let smoothed = 0;
    let live = true;

    return {
      level() {
        if (!live) return 0;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        // Speech RMS sits around 0.02–0.2. The curve spends its resolution there
        // rather than on the top half of a range nobody reaches.
        const scaled = Math.min(1, Math.sqrt(rms * 8));
        smoothed += (scaled - smoothed) * (scaled > smoothed ? RISE : FALL);
        return smoothed;
      },
      stop() {
        live = false;
        try { src.disconnect(); } catch { /* already gone */ }
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => {});
      },
    };
  } catch {
    // Permission refused, no device, a browser that will not share the mic twice.
    // All the same answer: no meter, and the game is unaffected.
    return null;
  }
}
