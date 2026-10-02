// The mini-player: Hören, while it plays, from every surface.
//
// Part of the chrome, not of a page — it sits with the bars at `z-50`, above the
// tab bar on a phone and at the foot of the window on a desktop, and layers slide
// *under* it like they slide under the bars. `App` grows `--bar-b` by its height
// while it is up, so nothing scrolls to a stop behind it.
//
// It shows the word being heard, because the one thing a glance at a phone on a
// kitchen counter should tell you is what that word was. The bookmark saves it —
// the feed's one honest signal, from the speaker — and the rest are a player's
// controls. Tapping the word opens the sheet.
import { Bookmark, BookmarkCheck, Pause, Play, SkipForward, X, RotateCcw } from 'lucide-react';
import { useHoeren, pause, resume, skip, stop, saveCurrent, start } from '../lib/hoeren.ts';
import { isSaved } from '../store.ts';
import { useStore } from '../useStore.ts';

/** Height of the capsule plus the gap above it — what `--bar-b` grows by. */
export const LISTEN_BAR_SPACE = '64px';

export default function ListenBar({ onOpen }: { onOpen: () => void }) {
  const h = useHoeren();
  useStore();   // the bookmark follows a save made anywhere
  if (h.phase === 'idle' || h.phase === 'consent') return null;

  const playing = h.phase === 'playing';
  const saved = !!h.current && isSaved(h.current.id);
  const btn = 'tap-44 grid place-items-center w-[40px] h-[40px] rounded-full hover:bg-panel2/70 active:scale-95 transition flex-shrink-0';

  return (
    <div className="no-print absolute inset-x-0 z-50 px-[12px] pointer-events-none
      bottom-[calc(58px_+_max(8px,env(safe-area-inset-bottom)_-_14px)_+_8px)] md:bottom-[max(12px,env(safe-area-inset-bottom))]">
      <div role="region" aria-label="Hören"
        className="glass glass-bar rounded-[22px] pointer-events-auto max-w-[560px] mx-auto
          flex items-center gap-0.5 h-[56px] pl-4 pr-1.5">
        <button onClick={onOpen} className="flex-1 min-w-0 text-left py-1" aria-label="Open Hören">
          {h.phase === 'preparing' ? (
            <>
              <span className="block text-xs truncate">{h.stage}…</span>
              <span className="block h-1 mt-1.5 mr-3 rounded-full bg-line overflow-hidden" role="progressbar"
                aria-label="Preparing" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(h.progress * 100)}>
                <span className="block h-full bg-accent transition-[width]" style={{ width: `${h.progress * 100}%` }} />
              </span>
            </>
          ) : h.phase === 'error' ? (
            <span className="block text-xs text-dim line-clamp-2">{h.error}</span>
          ) : h.current ? (
            <>
              <span lang="de" className="block font-semibold leading-tight truncate">{h.current.de}</span>
              <span className="block text-2xs text-dim truncate">{h.current.en}</span>
            </>
          ) : (
            <>
              <span lang="de" className="block font-semibold leading-tight">Hören</span>
              <span className="block text-2xs text-dim truncate">
                {h.phase === 'ready' ? `Ready · ${h.words} words — press play` : `${h.words} words · ${h.minutes} min`}
              </span>
            </>
          )}
        </button>

        {(h.phase === 'playing' || h.phase === 'paused') && h.current && (
          <button onClick={() => saveCurrent()} aria-pressed={saved}
            aria-label={saved ? `${h.current.de} is saved` : `Save ${h.current.de}`}
            className={`${btn} ${saved ? 'text-accent' : ''}`}>
            {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
          </button>
        )}
        {(h.phase === 'playing' || h.phase === 'paused' || h.phase === 'ready') && (
          <button onClick={() => (playing ? pause() : resume())} aria-label={playing ? 'Pause' : 'Play'} className={btn}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
        )}
        {(h.phase === 'playing' || h.phase === 'paused') && (
          <button onClick={skip} aria-label="Next word" className={btn}><SkipForward size={19} /></button>
        )}
        {h.phase === 'error' && (
          <button onClick={() => start()} aria-label="Try again" className={btn}><RotateCcw size={18} /></button>
        )}
        <button onClick={stop} aria-label="Stop Hören" className={`${btn} text-dim`}><X size={18} /></button>
      </div>
    </div>
  );
}
