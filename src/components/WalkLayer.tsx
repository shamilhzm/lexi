// Walk mode's surface: choose a length, prepare the audio, put the phone away.
//
// The screen matters least of any surface in the app — it is meant to be in a
// pocket — so it does three honest things and nothing else: say what is about to
// happen and how to answer, show progress while the audio is being made, and
// mirror the headphone controls with two large buttons for anyone walking with the
// screen on. See `lib/walk.ts` for the pedagogy and `lib/walkAudio.ts` for why the
// whole walk is rendered to one file first.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Check, X, Bookmark, Pause, Play } from 'lucide-react';
import { buildBriefing, statusOf, review, isSaved, toggleSaved, studyLevel, cardOf } from '../store.ts';
import { BY_ID, WORDS } from '../data/index.ts';
import { loadDetailFor } from '../data/detail.ts';
import { byFrequency } from '../lib/freq.ts';
import { Rating } from '../srs.ts';
import { ensureVoice, HD_VOICE_ID, EN_VOICE_ID } from '../lib/tts.ts';
import { schedule, layout, clipsFor, pressTarget, promptOf, answerOf, DURATIONS,
  type WalkItem, type Placed } from '../lib/walk.ts';
import { canRenderWalk, renderClips, renderTimeline } from '../lib/walkAudio.ts';
import Layer from './Layer.tsx';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';
import type { Word } from '../types.ts';

type Phase = 'choose' | 'preparing' | 'ready' | 'playing' | 'done' | 'error';

const toItem = (w: Word): WalkItem => ({
  id: w.id, de: answerOf(w.term), en: promptOf(w.en),
  example: w.ex?.[0]?.de, isNew: statusOf(w.id) === 'new',
});

/** The listening lane: words at the learner's level they have never studied,
 *  commonest first — the feed's material, heard instead of scrolled. */
function listenPool(exclude: Set<string>): Word[] {
  const lvl = studyLevel();
  return WORDS.filter((w) => w.level === lvl && !exclude.has(w.id) && !cardOf(w.id))
    .sort(byFrequency).slice(0, 60);
}

export default function WalkLayer({ onClose }: { onClose: () => void }) {
  const [minutes, setMinutes] = useState<number>(10);
  const [phase, setPhase] = useState<Phase>('choose');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tally, setTally] = useState({ knew: 0, missed: 0, saved: 0 });

  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const plan = useRef<{ placed: Placed[]; practice: WalkItem[]; listen: WalkItem[]; total: number } | null>(null);
  const pressed = useRef(new Set<number>());
  const reviewed = useRef(new Set<string>());

  const briefing = useMemo(() => buildBriefing(), []);
  const counts = { due: briefing.due, fresh: briefing.fresh };

  // Release the rendered file and the lock-screen controls when the layer goes.
  useEffect(() => () => {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    if ('mediaSession' in navigator) {
      for (const a of ['nexttrack', 'previoustrack'] as MediaSessionAction[]) {
        try { navigator.mediaSession.setActionHandler(a, null); } catch { /* unsupported */ }
      }
    }
  }, []);

  async function prepare() {
    setPhase('preparing'); setProgress(0); setError('');
    try {
      const practiceWords = briefing.ids.map((id) => BY_ID.get(id)).filter((w): w is Word => !!w);
      const listenWords = listenPool(new Set(briefing.ids));
      await loadDetailFor([...practiceWords, ...listenWords]);
      const practice = practiceWords.map(toItem);
      const listen = listenWords.map(toItem);
      const pres = schedule(practice, listen, minutes);
      if (!pres.length) throw new Error('Nothing to practise or listen to at your level yet.');

      setStage('Voices'); // one-time downloads, cached for offline use afterwards
      await ensureVoice(HD_VOICE_ID, (f) => setProgress(f * 0.15));
      await ensureVoice(EN_VOICE_ID, (f) => setProgress(0.15 + f * 0.15));

      setStage('Speaking the words');
      const keys = clipsFor(pres, practice, listen);
      const clips = await renderClips(keys, (f) => setProgress(0.3 + f * 0.6));
      const { segments, placed, total } = layout(pres, practice, listen, (k) => clips.get(k)?.duration ?? 0);

      setStage('Putting the walk together');
      url.current = await renderTimeline(segments, clips, total, (f) => setProgress(0.9 + f * 0.1));
      plan.current = { placed, practice, listen, total };
      setPhase('ready');
    } catch (e) {
      setError((e as Error).message || 'Something went wrong preparing the walk.');
      setPhase('error');
    }
  }

  /** A deliberate press — headphone or on-screen. `knew` is ignored when the
   *  target is a listening item: there a press only ever saves the word. */
  function press(knew: boolean) {
    const p = plan.current;
    const el = audio.current;
    if (!p || !el) return;
    const i = pressTarget(p.placed, el.currentTime);
    if (i < 0 || pressed.current.has(i)) return;
    const at = p.placed[i];
    if (at.mode === 'listen') {
      if (!knew) return;
      pressed.current.add(i);
      const id = p.listen[at.item].id;
      if (!isSaved(id)) toggleSaved(id);
      setTally((t) => ({ ...t, saved: t.saved + 1 }));
      return;
    }
    pressed.current.add(i);
    const id = p.practice[at.item].id;
    // One schedule write per card per walk: the first graded retrieval is the
    // evidence; later presentations in the same walk are practice, and grading
    // them too would tell FSRS a card was reviewed five times in ten minutes.
    if (!reviewed.current.has(id)) {
      reviewed.current.add(id);
      review(id, knew ? Rating.Good : Rating.Again);
    }
    setTally((t) => (knew ? { ...t, knew: t.knew + 1 } : { ...t, missed: t.missed + 1 }));
  }

  function start() {
    if (!url.current) return;
    const el = new Audio(url.current);
    audio.current = el;
    el.addEventListener('timeupdate', () => setNow(el.currentTime));
    el.addEventListener('ended', () => setPhase('done'));
    el.addEventListener('pause', () => setPaused(true));
    el.addEventListener('play', () => setPaused(false));
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: `Lexi walk · ${minutes} min`, artist: 'Lexi', album: 'Deutsch' });
      try {
        navigator.mediaSession.setActionHandler('nexttrack', () => press(true));
        navigator.mediaSession.setActionHandler('previoustrack', () => press(false));
      } catch { /* the buttons on screen still work */ }
    }
    void el.play();
    setPhase('playing');
  }

  const current = (() => {
    const p = plan.current;
    if (!p) return null;
    let k = -1;
    for (let i = 0; i < p.placed.length; i++) if (p.placed[i].start <= now) k = i;
    if (k < 0) return null;
    const at = p.placed[k];
    const it = (at.lane === 'practice' ? p.practice : p.listen)[at.item];
    return { at, it, revealed: now >= at.answerAt };
  })();

  return (
    <Layer side="right" label="Walk" back="the feed" onClose={onClose}>
      <div className="pb-16">
        <Kicker className="block mb-0.5">Walk</Kicker>
        <h1 className="display text-3xl mb-2">Lexi in your ears</h1>

        {phase === 'choose' && (
          <>
            <p className="text-dim text-sm leading-relaxed max-w-[40ch] mb-4">
              Headphones in. You hear the English, a soft tone, and then you <em>say the German
              out loud</em> before Lexi does. Double-press your headphones if you knew it,
              triple-press if you didn’t. No press, no grade — only an answer you vouch for counts.
            </p>
            <div role="radiogroup" aria-label="Length" className="flex flex-wrap gap-2 mb-4">
              {DURATIONS.map((m) => (
                <button key={m} role="radio" aria-checked={minutes === m} onClick={() => setMinutes(m)}
                  className={`tap-44 rounded-full border px-3 py-1.5 text-sm tabular-nums ${minutes === m
                    ? 'border-accent text-accent' : 'border-line text-dim'}`}>
                  {m === 60 ? '1 hr' : `${m} min`}
                </button>
              ))}
            </div>
            <p className="text-dim text-xs mb-4">
              {counts.due} to review · {counts.fresh} new{counts.fresh ? ' (taught, then tested twice more on the way)' : ''}
              {' '}· then listening, which never grades — a double-press saves the word.
            </p>
            {canRenderWalk()
              ? <Button onClick={prepare}><Headphones size={14} /> Prepare the walk</Button>
              : <p className="text-sm">This browser can’t make offline audio, so walk mode isn’t available here.</p>}
            <p className="text-dim text-2xs mt-3 max-w-[40ch]">
              The audio is made on this phone. The first walk downloads a German and an English voice
              once; after that it works offline.
            </p>
          </>
        )}

        {phase === 'preparing' && (
          <div aria-live="polite">
            <p className="text-sm mb-2">{stage}…</p>
            <div className="h-1.5 rounded-full bg-line overflow-hidden" role="progressbar"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-dim text-xs mt-2">Keep the screen on until it’s ready.</p>
          </div>
        )}

        {phase === 'ready' && plan.current && (
          <>
            <p className="text-sm mb-4">
              Ready: {Math.round(plan.current.total / 60)} minutes,{' '}
              {new Set(plan.current.placed.map((p) => `${p.lane}:${p.item}`)).size} words.
              Start it, lock your phone, and go.
            </p>
            <Button onClick={start}><Play size={14} /> Start walking</Button>
          </>
        )}

        {phase === 'playing' && (
          <>
            <div className="min-h-[9rem] mt-4 mb-6" aria-live="polite">
              {current && (
                <>
                  <Kicker className="block mb-1">
                    {current.at.mode === 'test' ? 'Say it in German' : current.at.mode === 'teach' ? 'New word' : 'Listening'}
                  </Kicker>
                  <p className="text-lg text-dim">{current.it.en}</p>
                  {(current.revealed || current.at.mode !== 'test') && (
                    <p lang="de" className="headword text-3xl font-semibold mt-1">{current.it.de}</p>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" onClick={() => press(false)}><X size={16} /> Didn’t</Button>
              <Button size="lg" onClick={() => press(true)}>
                {current?.at.mode === 'listen' ? <><Bookmark size={16} /> Save</> : <><Check size={16} /> Knew it</>}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-5 text-xs text-dim tabular-nums">
              <span>{tally.knew} knew · {tally.missed} didn’t · {tally.saved} saved</span>
              <button className="tap-44 inline-flex items-center gap-1" onClick={() => {
                const el = audio.current; if (!el) return; if (el.paused) void el.play(); else el.pause();
              }}>{paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}</button>
              <button className="tap-44" onClick={() => { audio.current?.pause(); setPhase('done'); }}>End</button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <p className="text-sm mb-1">{tally.knew + tally.missed} answers you vouched for — {tally.knew} knew, {tally.missed} didn’t.</p>
            <p className="text-dim text-sm mb-4">{tally.saved ? `${tally.saved} word${tally.saved === 1 ? '' : 's'} saved for Üben.` : 'Nothing saved from the listening lane.'}</p>
            <Button onClick={onClose}>Done</Button>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="text-sm mb-4">{error}</p>
            <Button variant="secondary" onClick={() => setPhase('choose')}>Back</Button>
          </>
        )}
      </div>
    </Layer>
  );
}
