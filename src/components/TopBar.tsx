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
// The bar is the whole navigation on sm+. On a phone it keeps only the identity
// and the profile, and the destinations stay in `BottomNav` where a thumb can
// reach them — which is also what let the drawer go entirely. The old sidebar
// doubled as a mobile drawer, with a focus trap, an Escape handler and an
// `inert` dance to keep its seven controls out of the tab order when closed.
// None of that has to be right any more, because none of it exists: the
// hamburger, the overlay, `mobileOpen`, and the `lexi.sidebar.collapsed.v1` key
// all went with it.
//
// ## Start session is not a destination
//
// It sits to the right of the bar, visually separated from the three
// destinations, for the same reason it is not in `NAV`: it is an *action*, and
// the bottom bar already learned that lesson once when it was a fifth item
// raised out of the row. Same rule here — places on the left, the action on the
// right, the person at the end.
import { Play, Sunrise, TrendingUp, Library, Gamepad2, Flame } from 'lucide-react';
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
 *  Three, not five. The old set — Home / Explore / Grammar / Stats — plus the
 *  Decks and Wortkarte surfaces underneath Explore was nine places answering
 *  four questions, and mirrored `store.ts` rather than a learner’s day. These
 *  are the questions:
 *    Today    — what do I do now?
 *    Progress — how am I doing? (absorbs Explore, Stats, KPIs, Blind Spots)
 *    Library  — what does this mean / how does this work?
 *    Games    — I do not want to study today, and I am still here.
 *
 *  The fourth is what the bar was chosen for: four labels fit across the top
 *  where a 240px rail would still have been a column. */
export const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'games', label: 'Games', icon: Gamepad2 },
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
      <nav aria-label="Primary" className="hidden sm:flex items-center gap-0.5 ml-1">
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => onGo(n.id)}
              aria-current={active ? 'page' : undefined}
              className={`tap-44 flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? 'bg-panel2 text-accent' : 'text-dim hover:text-txt hover:bg-panel2'}`}>
              <n.icon size={17} strokeWidth={active ? 2.4 : 1.8} className="flex-shrink-0" />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* The action, held apart from the places. Label hidden on the narrowest
          phones, where the bottom bar carries its own floating start button. */}
      <button onClick={onStartSession} title="Start today’s session"
        className="tap-44 hidden sm:flex items-center gap-2 bg-accent text-bg font-bold rounded-md
          py-2 px-3.5 hover:brightness-105 transition">
        <Play size={15} /> <span className="text-sm">Start session</span>
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
