// Mobile bottom navigation.
//
// Until recently every destination on a phone lived behind a hamburger: for a
// habit app that is the wrong shape — the surface people actually study on hid
// everything except the thing already on screen.
//
// Desktop puts the destinations in the top bar; this is `sm:hidden`. The two
// share `TopBar`'s NAV array so a destination can never exist in one and not the
// other. Profile is reachable from the avatar in the bar at every width, which is
// what let the drawer go entirely.
//
// The start button used to be a fifth item raised out of the bar, splitting two
// destinations either side. With three destinations that split no longer works,
// and embedding an *action* among *places* was always a category error. It's now
// a floating button above the bar — and it hides on Today, where the surface
// already leads with a full-width Start session and a second one would just be
// the same button twice.
import { motion, useReducedMotion } from 'motion/react';
import { Play } from 'lucide-react';
import { NAV } from './TopBar.tsx';
import type { View } from '../App.tsx';

export default function BottomNav({ view, onGo, onStartSession }: {
  view: View; onGo: (v: View) => void; onStartSession: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="sm:hidden flex-shrink-0 relative no-print">
      {view !== 'today' && (
        <motion.button
          onClick={onStartSession}
          aria-label="Start today’s session"
          initial={reduce ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 30 }}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          className="absolute right-4 bottom-[calc(100%+0.75rem)] z-10 grid place-items-center
            w-14 h-14 rounded-full bg-accent text-bg shadow-lg">
          <Play size={22} />
        </motion.button>
      )}

      <nav aria-label="Main" className="bg-panel border-t border-line safe-bottom">
        <div className="flex items-stretch h-[56px]">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button key={n.id} onClick={() => onGo(n.id)} aria-current={active ? 'page' : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full min-w-0 transition-colors ${
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
                <span className="text-2xs leading-none truncate max-w-full px-0.5">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
