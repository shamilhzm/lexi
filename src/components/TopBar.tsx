// The primary navigation — a horizontal bar, replacing the 240px sidebar.
//
// ## Why the rail went
//
// It was 240px (64px collapsed) carrying three destinations, Start session and
// the profile. Three destinations do not need a column: on a 1280px laptop the
// rail was 19% of the width, and the content it pushed is already
// `max-w-[1280px] mx-auto`, so on anything wider the rail cost nothing and on
// anything narrower it cost a fifth of the screen. A bar spends ~52px of the
// axis there is more of, and it scales: Games arrives as a fourth destination,
// and four labels fit a bar comfortably where a rail would still be a column.
//
// ## One navigation, two shapes
//
// The bar is the whole navigation from `md` up. Below that it keeps only the
// identity and the profile, and the destinations stay in `BottomNav` where a
// thumb can reach them. The breakpoint moved sm→md when the set went to five:
// five labels plus the mark plus Start session plus the avatar do not fit 640px,
// and a nav that wraps is worse than one that delegates — which is also what let the drawer go entirely. The old sidebar
// doubled as a mobile drawer, with a focus trap, an Escape handler and an
// `inert` dance to keep its seven controls out of the tab order when closed.
// None of that has to be right any more, because none of it exists: the
// hamburger, the overlay, `mobileOpen`, and the `lexi.sidebar.collapsed.v1` key
// all went with it.
//
// ## Start session is not a destination
//
// It sits to the right of the bar, visually separated from the destinations, for
// the same reason it is not in `NAV`: it is an *action*, and the bottom bar
// already learned that lesson once when it was a fifth item raised out of the
// row. Places on the left, the action on the right, the person at the end.
//
// **The bar now follows that rule at every width** (2026-08-26). It used to hold
// the action only from `md`, which left a phone with a floating button over its
// content — see the comment on the button itself, and BACKLOG #31.
import { Play, Sunrise, TrendingUp, LayoutGrid, Dumbbell, BookOpenText, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
 *  **Five, changed 2026-08-26.** The set was three, then four, and the third
 *  version is the one that matches how the app is actually used. The rule has
 *  not changed — *one destination per question a learner asks* — but the
 *  previous set answered five questions with four doors and paid for it by
 *  hiding things:
 *
 *    - *Lesen* and the comprehension meter lived inside a **collapsed accordion
 *      on Today**, two taps from view, while the backlog calls the meter the
 *      flagship.
 *    - The lexicon — 6,600 cards, 274 sectors — was browsable only at
 *      `#/progress/decks/<group>`. Looking a word up meant going to *Progress*,
 *      which is a claim about self-assessment, not about looking things up.
 *    - *Games* was an entire tab spending itself on one card.
 *    - *Grammar* rendered twice: an accordion on Today and the Library tab.
 *
 *  So the doors now match the questions:
 *
 *    Today    — what do I do now?
 *    Words    — what words are there / what does this one mean?
 *    Practice — drill me on something specific
 *    Read     — give me real German to read
 *    Progress — how am I doing?
 *
 *  Five is also what a bottom bar holds comfortably: at 375px each tab gets
 *  75px, which fits a 19px icon over a `text-2xs` label with room to spare. The
 *  labels are chosen one word long for exactly that reason.
 *
 *  Profile is still not here. It is reachable from the avatar at every width,
 *  which is what let the mobile drawer go in the first place. */
export const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'words', label: 'Words', icon: LayoutGrid },
  { id: 'practice', label: 'Practice', icon: Dumbbell },
  { id: 'read', label: 'Read', icon: BookOpenText },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
];

export default function TopBar({ view, onGo, onStartSession, onProfile, name, level, streak }: {
  view: View; onGo: (v: View) => void; onStartSession: () => void;
  onProfile: () => void; name: string; level: string | null; streak: number;
}) {
  const initial = (name || 'L').trim().charAt(0).toUpperCase();

  return (
    // `min-h` rather than `h`, plus safe-top: the notch sits above the bar
    // instead of eating the logo, exactly as the old mobile header did.
    <header className="no-print flex-shrink-0 z-50 bg-panel border-b border-line safe-top
      min-h-[calc(52px_+_env(safe-area-inset-top))] flex items-center gap-1 px-3 sm:px-4">

      <button onClick={() => onGo('today')} aria-label="Lexi — home"
        className="flex items-center gap-2.5 pr-2 sm:pr-4 tap-44 rounded-md hover:opacity-80 transition-opacity">
        <LexiMark size={26} />
        <span className="font-bold text-lg tracking-wide leading-none">Lexi</span>
      </button>

      {/* Destinations. `sm:flex` because on a phone they live in the bottom bar,
          where the thumb is — the bar keeps only identity and the profile. */}
      <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5 ml-1">
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => onGo(n.id)}
              aria-current={active ? 'page' : undefined}
              className={`tap-44 flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                active ? 'bg-panel2 text-accent' : 'text-dim hover:text-txt hover:bg-panel2'}`}>
              <n.icon size={17} strokeWidth={active ? 2.4 : 1.8} className="flex-shrink-0" />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* The action, held apart from the places — **at every width, as of
          2026-08-26.** It used to appear only from `md`, and a phone got a
          floating button above the bottom bar instead.

          That FAB is gone. BACKLOG #31 had it as a real defect twice
          re-confirmed and deliberately unfixed, because all four fixes on the
          table cost something already ruled on: hiding it per-surface removes
          the one-tap route to the *scheduled* session, docking it into the
          bottom bar is the category error `BottomNav` rejects in its own header,
          shrinking the map contradicts the complaint that produced the map, and
          auto-hide leaves the overlap at rest.

          The fifth option was not on the list: **put the action where the app
          already says actions go.** `TopBar`'s own rule is "places on the left,
          the action on the right, the person at the end" — a rule it was only
          following above `md`. Following it at every width removes a
          viewport-anchored 56px circle from on top of scrollable content, which
          is what the defect actually was.

          It also mattered more than when the ruling was made. The FAB covered a
          tile *label* on one surface then; with five destinations it sits over
          **tappable controls** on three — a Study button on Words, a path node in
          the journey, a heatmap tile on Progress. A 56px target underneath a
          56px circle is not a cosmetic problem.

          The label goes below `sm`, where the icon alone carries it. */}
      <button onClick={onStartSession} title="Start today’s session"
        aria-label="Start today’s session"
        className="tap-44 flex items-center gap-2 bg-accent text-bg font-bold rounded-md
          py-2 px-2.5 sm:px-3.5 hover:brightness-105 transition">
        <Play size={15} /> <span className="hidden sm:inline text-sm">Start session</span>
      </button>

      <button onClick={onProfile} title="Profile"
        aria-current={view === 'profile' ? 'page' : undefined}
        className={`tap-44 flex items-center gap-2 ml-1 sm:ml-2 px-1.5 sm:px-2 py-1.5 rounded-md
          hover:bg-panel2 transition-colors ${view === 'profile' ? 'bg-panel2' : ''}`}>
        <span className="grid place-items-center w-8 h-8 rounded-full bg-panel2 text-accent text-xs font-bold flex-shrink-0">{initial}</span>
        <span className="hidden md:block min-w-0 text-left">
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
