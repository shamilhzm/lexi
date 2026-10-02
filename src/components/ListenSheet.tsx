// Hören's sheet — what it does, how long, and the one-time voice download.
//
// The ▶ in the top bar starts Hören without opening this; the sheet is for the
// three things a single tap cannot say: how long, whether to loop, and — once,
// before 138 MB leaves somebody's data plan — what is about to download. Practise
// aloud (walk mode) lives here too: same voices, the opposite shape — it asks.
import { useState } from 'react';
import { Play, Square, Repeat, Mic } from 'lucide-react';
import { useHoeren, start, stop, setLoop } from '../lib/hoeren.ts';
import { LISTEN_DURATIONS } from '../lib/listen.ts';
import Layer from './Layer.tsx';
import Button from './ui/Button.tsx';
import Kicker from './ui/Kicker.tsx';

export default function ListenSheet({ onClose, onPractise }: { onClose: () => void; onPractise: () => void }) {
  const h = useHoeren();
  const [minutes, setMinutes] = useState<number>(h.minutes);
  const busy = h.phase === 'preparing';
  const live = h.phase === 'playing' || h.phase === 'paused' || h.phase === 'ready';

  return (
    <Layer side="right" label="Hören" back="where you were" onClose={onClose}>
      <div className="pb-16 max-w-[520px]">
        <Kicker className="block mb-0.5">Hören</Kicker>
        <h1 className="display text-3xl mb-2">German in the background</h1>
        <p className="text-dim text-sm leading-relaxed max-w-[42ch] mb-5">
          Press play and carry on with your day. Lexi says each word in German, in English, then
          in a sentence — and brings it back a few minutes later, in German only. No headphones
          needed, nothing to tap, nothing graded.
        </p>

        <div role="radiogroup" aria-label="Length" className="flex flex-wrap gap-2 mb-3">
          {LISTEN_DURATIONS.map((m) => (
            <button key={m} role="radio" aria-checked={minutes === m} onClick={() => setMinutes(m)}
              className={`tap-44 rounded-full border px-3.5 py-1.5 text-sm tabular-nums ${minutes === m
                ? 'border-accent text-accent' : 'border-line text-dim'}`}>
              {m === 60 ? '1 hour' : `${m} min`}
            </button>
          ))}
        </div>
        <button role="switch" aria-checked={h.loop} onClick={() => setLoop(!h.loop)}
          className="tap-44 inline-flex items-center gap-2 text-sm mb-6">
          <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${h.loop ? 'bg-accent' : 'bg-line'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg transition-[left] ${h.loop ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
          <Repeat size={14} aria-hidden /> Start again when it ends
        </button>

        {h.phase === 'consent' ? (
          <div className="mb-6">
            <p className="text-sm leading-relaxed max-w-[42ch] mb-3">
              Hören makes its audio on this phone, so Lexi hosts none. The first time, it downloads a
              German and an English voice — <strong className="tabular-nums">{h.needMb} MB</strong>, once —
              and after that it works offline. Wi-Fi recommended.
            </p>
            <Button onClick={() => start({ minutes, loop: h.loop, consented: true })}>
              <Play size={14} /> Download the voices and play
            </Button>
          </div>
        ) : busy ? (
          <div className="mb-6" aria-live="polite">
            <p className="text-sm mb-2">{h.stage}…</p>
            <div className="h-1.5 rounded-full bg-line overflow-hidden" role="progressbar"
              aria-label="Preparing" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(h.progress * 100)}>
              <div className="h-full bg-accent transition-[width]" style={{ width: `${h.progress * 100}%` }} />
            </div>
            <p className="text-dim text-xs mt-2 max-w-[42ch]">
              Keep Lexi open until it starts — about a minute the first time, quicker each day after,
              because every word it has said once is kept on this phone.
            </p>
          </div>
        ) : live ? (
          <div className="mb-6">
            <p className="text-sm mb-3 tabular-nums">
              {h.words} words · {Math.round(h.total / 60)} min{h.heard ? ` · ${h.heard} heard so far` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {minutes !== h.minutes && (
                <Button onClick={() => start({ minutes, loop: h.loop })}><Play size={14} /> Start again with {minutes === 60 ? '1 hour' : `${minutes} min`}</Button>
              )}
              <Button variant="secondary" onClick={stop}><Square size={13} /> Stop</Button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            {h.phase === 'error' && <p className="text-sm mb-3">{h.error}</p>}
            <Button size="lg" onClick={() => start({ minutes, loop: h.loop })}>
              <Play size={16} /> Play {minutes === 60 ? '1 hour' : `${minutes} min`}
            </Button>
          </div>
        )}

        <div className="border-t border-line pt-5 mt-2">
          <h2 className="text-base font-semibold mb-1">Want to answer instead?</h2>
          <p className="text-dim text-sm leading-relaxed max-w-[42ch] mb-3">
            <em>Practise aloud</em> is for a walk with headphones in: you hear the English, say the German
            before Lexi does, and press your headphones to grade it.
          </p>
          <Button variant="secondary" onClick={onPractise}><Mic size={14} /> Practise aloud</Button>
        </div>

        <p className="text-dim text-2xs mt-6 max-w-[42ch]">
          Hören plays your saved words first, then the day’s words, then the feed’s. It never grades
          and records nothing — the bookmark on the player saves a word, and Üben teaches it next.
        </p>
      </div>
    </Layer>
  );
}
