// The primary navigation — a horizontal bar, replacing the 240px sidebar.
//
// ## Why the rail went
//
// It was 240px (64px collapsed) carrying three destinations, Start session and
// the profile. Three destinations do not need a column: on a 1280px laptop the
// rail was 19% of the width, and the content it pushed is already
// `max-w-[1280px] mx-auto`, so on anything wider the rail cost nothing and on
// anything narrower it cost a fifth of the screen. A bar spends ~52px of the
// axis there is more of.
//
// ## One navigation, two shapes
//
// The bar is the whole navigation from `md` up. Below that it keeps only the
// identity and the profile, and the destinations stay in `BottomNav` where a
// thumb can reach them. The old sidebar doubled as a mobile drawer, with a focus
// trap, an Escape handler and an `inert` dance to keep its seven controls out of
// the tab order when closed. None of that has to be right any more, because none
// of it exists: the hamburger, the overlay, `mobileOpen`, and the
// `lexi.sidebar.collapsed.v1` key all went with it.
//
// ## One action, and it is not Start
//
// The Start button is gone with the briefing page it launched sessions from
// (2026-09-05): the app opens on a word, so starting is not something you do.
//
// **Search took its slot**, and passes the test Start failed. "What does this
// word mean?" is asked in the middle of a book, a chat, a lecture — from
// wherever you already are — so making it a *destination* costs a tap, and the
// thing it is competing with is a translator that is one tap from everywhere.
// A place you have to travel to loses that race by construction.
//
// The rule holds either way: places on the left, the action on the right, the
// person at the end.
import { Layers, TrendingUp, LayoutGrid, GraduationCap, Flame, Bookmark, Check, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { savedToday, DAILY_SAVE_GOAL } from '../store.ts';
import type { View } from '../App.tsx';

export function LexiMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 150 150" width={size} height={size} role="img" aria-label="Lexi" className={`flex-shrink-0 ${className}`}>
      <rect width="150" height="150" rx="34" fill="#0e1722" />
      <rect x="52" y="40" width="20" height="72" rx="3" fill="#38cde8" />
      <rect x="52" y="92" width="60" height="20" rx="3" fill="#38cde8" />
      <rect x="88" y="40" width="20" height="22" rx="3" fill="#38cde8" />
    </svg>
  );
}

/** The primary destinations, shared with the mobile bottom bar so the two
 *  navigations can’t drift apart.
 *
 *  **Three, changed 2026-09-05.** The set was three, then four, then five, and
 *  five was the high-water mark of a different app: *Practice* opened a
 *  140-point grammar syllabus with an exam room and a worksheet printer behind
 *  it, and *Read* opened a comprehension surface with its own reading list.
 *  Neither made anybody know more German words, which is the only thing this app
 *  claims to do.
 *
 *  **Four, and the first one is a feed.** The doors match the questions a
 *  vocabulary learner actually asks, in the order they ask them:
 *
 *    Wörter       show me German words — the feed, and where the app opens
 *    Themen       what words are there / what does this one mean?
 *    Üben         test me on what I've met
 *    Fortschritt  how far have I come, and what do I keep missing?
 *
 *  *Wörter* and *Üben* are two halves of one loop and are deliberately not one
 *  tab: browsing asks nothing of you and testing asks everything, and a single
 *  door onto both would have to pick which mood you were in. Bookmarking in the
 *  feed is what connects them — it is the learner telling the scheduler what to
 *  teach next.
 *
 *  There is no *Start session* button anywhere. Both halves are places.
 *
 *  Three tabs at 375px is 125px each, which is why the labels can be the German
 *  surface names in full rather than one clipped English word. Those names are
 *  the ones on the pages they open — the five-tab set had *Words* in the bar and
 *  *Wortschatz* on the page, which taught nothing and matched nothing.
 *
 *  Profile is still not here. It is reachable from the avatar at every width,
 *  which is what let the mobile drawer go in the first place. */
export const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'feed', label: 'Wörter', icon: Layers },
  { id: 'words', label: 'Themen', icon: LayoutGrid },
  { id: 'session', label: 'Üben', icon: GraduationCap },
  { id: 'progress', label: 'Fortschritt', icon: TrendingUp },
];

/** The day's goal.
 *
 *  **It stops being a fraction once it is met.** Caught on a real device: nine
 *  saves against a goal of five printed **“9/5”** — arithmetic that reads as a
 *  bug rather than as an achievement, above a bar that was already full. A goal
 *  you have beaten is not a ratio, it is a done thing with a number after it, so
 *  past the goal it says `✓ 9 saved` and the bar goes.
 *
 *  The goal is not raised to meet the count, and the count is not capped to meet
 *  the goal. Both would be lies of a different kind — one moves the finish line
 *  under somebody who just crossed it, the other tells them they saved five when
 *  they saved nine. */
function GoalPill({ onOpen }: { onOpen: () => void }) {
  const saved = savedToday();
  const met = saved >= DAILY_SAVE_GOAL;
  const label = met
    ? `Daily goal met — ${saved} ${saved === 1 ? 'word' : 'words'} saved today. Open your saved words`
    : `${saved} of ${DAILY_SAVE_GOAL} words saved today. Open your saved words`;
  // **A counter that advertises a list has to open it.** This was a `<div role
  //="status">`: it told you a number was going up and gave you nowhere to go,
  // which is most of why bookmarking felt like it did nothing. See
  // `components/SavedWords`.
  return (
    <button onClick={onOpen} aria-label={label}
      className={`goal-pill tap-44 flex items-center gap-2 rounded-full border px-3 py-1.5 mr-1 transition-colors ${
        met ? 'bg-green-d border-green/40' : 'bg-panel2/70 border-line/60 hover:border-line'}`}>
      {met
        ? <Check size={13} className="text-green flex-shrink-0" aria-hidden />
        : <Bookmark size={13} className="text-dim flex-shrink-0" aria-hidden />}
      <span aria-hidden className={`font-mono text-2xs tabular-nums ${met ? 'text-green font-bold' : ''}`}>
        {met ? saved : `${saved}/${DAILY_SAVE_GOAL}`}
      </span>
      {!met && (
        <span aria-hidden className="hidden sm:block h-1.5 w-16 rounded-full bg-bg overflow-hidden">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${(saved / DAILY_SAVE_GOAL) * 100}%` }} />
        </span>
      )}
    </button>
  );
}

export default function TopBar({ view, onGo, onSearch, onProfile, onSaved, name, level, streak }: {
  view: View; onGo: (v: View) => void;
  /** Opens the saved-words layer — the list the pill's number refers to. */
  onSaved: () => void;
  /** The one thing in the bar that is an *action* rather than a place. It earns
   *  that on the only ground the removed Start button could not: "what does this
   *  word mean?" is asked from wherever you already are, so it cannot be a
   *  destination without costing the tap that loses the race with a translator. */
  onSearch: () => void;
  onProfile: () => void; name: string; level: string | null; streak: number;
}) {
  const initial = (name || 'L').trim().charAt(0).toUpperCase();

  return (
    // **Glass, and floating.** *2026-09-05.* It was an opaque `bg-panel` bar with
    // a hard bottom border, sitting *above* the content as a flex sibling. Two
    // things changed and they are the same change:
    //
    //   - the material is `.glass`, so the page shows through it
    //   - it is `absolute`, so there is something behind it to show
    //
    // The second is the part that is easy to skip and impossible to fake: a
    // translucent bar with an opaque strip of nothing behind it is a grey
    // rectangle. `App` pays for this with scroll padding on the content, so a
    // headword passes *under* the bar instead of stopping at it.
    //
    // `min-h` rather than `h`, plus safe-top: on a 16 Pro Max the Dynamic Island
    // sits above the bar rather than eating the wordmark.
    <header className="no-print absolute top-0 inset-x-0 z-50 glass glass-bar safe-top
      rounded-b-[22px] border-x-0 border-t-0
      min-h-[calc(52px_+_env(safe-area-inset-top))] flex items-center gap-1 px-3 sm:px-4 top-bar">

      <button onClick={() => onGo('session')} aria-label="Lexi — home"
        className="home-btn flex items-center gap-2.5 pr-2 sm:pr-4 tap-44 rounded-full hover:opacity-80 transition-opacity">
        <LexiMark size={26} />
        <span className="wordmark font-bold text-lg tracking-wide leading-none">Lexi</span>
      </button>

      {/* Destinations. Hidden on a phone, where they live in the bottom bar and
          the thumb is — the bar keeps only identity and the profile. */}
      <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5 ml-1">
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => onGo(n.id)}
              aria-current={active ? 'page' : undefined}
              className={`tap-44 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors ${
                active ? 'bg-panel2 text-accent' : 'text-dim hover:text-txt hover:bg-panel2/60'}`}>
              <n.icon size={17} strokeWidth={active ? 2.4 : 1.8} className="flex-shrink-0" />
              <span lang="de">{n.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* The day's goal, on the feed and nowhere else.
          It counts **saves**, not scrolls, and that is the only number a feed can
          honestly produce: scrolling past a word is not evidence that anything
          happened, and pressing bookmark is. Small, right-aligned, next to the
          person it belongs to — a goal is a fact about you, not a scoreboard. */}
      {view === 'feed' && <GoalPill onOpen={onSaved} />}

      <button onClick={onSearch} aria-label="Look up a word"
        className="tap-44 grid place-items-center w-[40px] h-[40px] rounded-full text-txt
          hover:bg-panel2/70 active:scale-95 transition flex-shrink-0">
        <Search size={19} />
      </button>

      {/* The streak, at every width. It used to live in the daily briefing's
          greeting and appear here only from `md`; with the briefing gone, a phone
          had nowhere left to see it at all. Small and beside the person it
          belongs to — it is a fact about you, not a scoreboard. */}
      <button onClick={onProfile} title="Profile"
        aria-label={`Profile — ${name || 'you'}${level ? `, ${level}` : ''}, ${streak}-day streak`}
        aria-current={view === 'profile' ? 'page' : undefined}
        className={`profile-btn tap-44 flex items-center gap-2 ml-1 sm:ml-2 px-1.5 sm:px-2 py-[6px] rounded-full
          hover:bg-panel2/70 transition-colors ${view === 'profile' ? 'bg-panel2/80' : ''}`}>
        <span aria-hidden className="streak-chip flex items-center gap-1 font-mono font-bold text-sm text-accent md:hidden">
          <Flame size={14} /> {streak}
        </span>
        <span className="grid place-items-center w-[32px] h-[32px] rounded-full bg-panel2 text-accent text-[12px] leading-none font-bold flex-shrink-0">{initial}</span>
        <span aria-hidden className="hidden md:block min-w-0 text-left">
          <span className="block text-xs font-semibold truncate max-w-[9rem]">{name || 'Your profile'}</span>
          <span className="flex items-center gap-1 text-2xs text-dim">
            {level && <span>{level} ·</span>}
            <Flame size={11} className="text-accent" /> {streak}
          </span>
        </span>
      </button>
    </header>
  );
}
