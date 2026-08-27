// Mobile bottom navigation.
//
// Until recently every destination on a phone lived behind a hamburger: for a
// habit app that is the wrong shape — the surface people actually study on hid
// everything except the thing already on screen.
//
// Desktop puts the destinations in the top bar; this is `md:hidden` (it was
// `sm:hidden` until the set went to five — see TopBar). The two
// share `TopBar`'s NAV array so a destination can never exist in one and not the
// other. Profile is reachable from the avatar in the bar at every width, which is
// what let the drawer go entirely.
//
// ## There is no start button here, and no longer one floating above it
//
// It was a fifth item raised out of the row once — embedding an *action* among
// *places*, which is a category error. The fix at the time was to float it above
// the bar instead. That was still wrong, just wrong somewhere else: a
// viewport-anchored 56px circle sat on top of scrollable content, and with five
// destinations it landed on **tappable controls** — a Study button on Words, a
// path node in the journey, a heatmap tile on Progress.
//
// Start session now lives in `TopBar` at every width, which is where that file
// has always said actions belong. This component holds places and nothing else.
// See BACKLOG #31.
import { motion, useReducedMotion } from 'motion/react';
import { NAV } from './TopBar.tsx';
import type { View } from '../App.tsx';

export default function BottomNav({ view, onGo }: {
  view: View; onGo: (v: View) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="md:hidden flex-shrink-0 no-print">
      <nav aria-label="Main" className="bg-panel border-t border-line safe-bottom">
        <div className="flex items-stretch h-[56px]">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button key={n.id} onClick={() => onGo(n.id)} aria-current={active ? 'page' : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full min-w-0 px-0.5 transition-colors ${
                  active ? 'text-accent' : 'text-dim active:text-txt'}`}>
                {/* The active tab was signalled by colour and stroke weight alone.
                    A shared-layout rule slides between tabs, so the change reads
                    as one object moving rather than two colour flips. */}
                {active && (
                  <motion.span layoutId="bottomnav-active" aria-hidden
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />
                )}
                <n.icon size={19} strokeWidth={active ? 2.4 : 1.8} className="flex-shrink-0" />
                {/* Five tabs at 375px is 75px each. `px-0` and a tracking-tight label keep
                    *Progress* and *Practice* — the two longest — off the truncation. */}
                <span className="text-2xs leading-none tracking-tight truncate max-w-full">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
