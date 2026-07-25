// Mobile bottom navigation.
//
// Until now every destination on a phone lived behind a hamburger: Grammar,
// Explore and Stats were one tap further away than Home, and invisible from a
// standing start. For a habit app that is the wrong shape — the surface people
// actually study on hid everything except the thing already on screen.
//
// Desktop keeps the sidebar; this is `sm:hidden`. The two share Sidebar's NAV
// array so a destination can never exist in one and not the other. The drawer
// stays for Profile and Settings, which aren't primary.
import { Play } from 'lucide-react';
import { NAV } from './Sidebar.tsx';
import type { View } from '../App.tsx';

export default function BottomNav({ view, onGo, onStartSession }: {
  view: View; onGo: (v: View) => void; onStartSession: () => void;
}) {
  // Split around the central action: two destinations, Start, two destinations.
  const left = NAV.slice(0, 2);
  const right = NAV.slice(2);

  const item = (n: typeof NAV[number]) => {
    const active = view === n.id;
    return (
      <button key={n.id} onClick={() => onGo(n.id)} aria-current={active ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full min-w-0 transition-colors ${
          active ? 'text-amber' : 'text-dim active:text-txt'}`}>
        <n.icon size={19} strokeWidth={active ? 2.4 : 1.8} className="flex-shrink-0" />
        <span className="text-2xs leading-none truncate max-w-full px-0.5">{n.label}</span>
      </button>
    );
  };

  return (
    <nav aria-label="Main" className="sm:hidden flex-shrink-0 bg-panel border-t border-line safe-bottom">
      <div className="flex items-stretch h-[56px]">
        {left.map(item)}
        {/* The primary action sits in the thumb's natural arc, raised out of the
            bar so it reads as an action rather than a fifth destination. */}
        <div className="flex-shrink-0 w-[68px] grid place-items-center">
          <button onClick={onStartSession} aria-label="Start today's session"
            className="grid place-items-center w-12 h-12 -mt-4 rounded-full bg-amber text-bg shadow-lg active:scale-95 transition-transform">
            <Play size={20} />
          </button>
        </div>
        {right.map(item)}
      </div>
    </nav>
  );
}
