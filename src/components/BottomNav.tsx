// Mobile bottom navigation.
//
// Until recently every destination on a phone lived behind a hamburger: for a
// habit app that is the wrong shape — the surface people actually study on hid
// everything except the thing already on screen.
//
// Desktop puts the destinations in the top bar; this is `md:hidden`. The two
// share `TopBar`'s NAV array so a destination can never exist in one and not the
// other. Profile is reachable from the avatar in the bar at every width, which is
// what let the drawer go entirely.
//
// ## There is no start button here, and no longer one floating above it
//
// It was an item raised out of the row once — embedding an *action* among
// *places*, which is a category error. The fix at the time was to float it above
// the bar instead. That was still wrong, just wrong somewhere else: a
// viewport-anchored 56px circle sat on top of scrollable content, and it landed
// on **tappable controls** — a Study button on Words, a heatmap tile on
// Progress.
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
    // **A floating capsule, in glass.** *2026-09-05.* It was a full-width opaque
    // bar welded to the bottom edge; iOS 26's tab bar is an object resting on the
    // page, with the page visible around and behind it. Inset from all three
    // edges so it reads as one, and `absolute` so there is something behind it —
    // a translucent bar with nothing under it is just a grey rectangle.
    //
    // The bottom inset is on the *wrapper*, not the capsule: the home indicator
    // should push the capsule up, not stretch it into a shape with 34px of dead
    // glass along the bottom.
    //
    // **It is the safe-area inset minus 14px, and the subtraction is the point.**
    // The first version cleared the full `env(safe-area-inset-bottom)` — 34pt on
    // a 16 Pro Max — which is the correct rule for a bar *welded* to the bottom
    // edge and the wrong one for a capsule floating above it: the inset already
    // exists to keep content off the home indicator, and a floating object that
    // clears the whole band leaves a visible strip of nothing under it. On a real
    // 16 Pro Max in standalone that read as a nav bar hovering in the middle of
    // the bezel. 20pt puts the capsule's bottom edge seven points clear of the
    // indicator (a 5pt bar sitting ~8pt off the edge) — floating, not stranded.
    // The `max()` floor keeps 8px on a device that reports no inset at all.
    <div className="md:hidden absolute bottom-0 inset-x-0 z-50 no-print px-[12px] pb-[max(8px,calc(env(safe-area-inset-bottom)_-_14px))] pointer-events-none">
      <nav aria-label="Main" className="glass glass-bar rounded-full pointer-events-auto overflow-hidden">
        <div className="flex items-stretch h-[58px]">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button key={n.id} onClick={() => onGo(n.id)} aria-current={active ? 'page' : undefined}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full min-w-0 px-0.5 transition-colors ${
                  active ? 'text-accent' : 'text-dim active:text-txt'}`}>
                {/* The active tab was signalled by colour and stroke weight alone.
                    A shared-layout rule slides between tabs, so the change reads
                    as one object moving rather than two colour flips. */}
                {/* The active pill, not a bar across the top edge. A capsule has
                    no top edge to hang a rule off — and iOS 26 signals the
                    selected tab by seating it in its own recessed capsule, which
                    is also the honest thing here: it is a *place you are*, not a
                    boundary. Shared-layout, so it slides between tabs as one
                    object rather than two colour flips. */}
                {active && (
                  <motion.span layoutId="bottomnav-active" aria-hidden
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
                    // Opaque, not `/80`. The pill is the active tab's *plate*: it is what stops
                    // `--color-accent` being read against whatever is sliding under the bar.
                    // At 80% it still let 20% of a headword through and measured **4.40**
                    // against it in light — under AA by a tenth. Solid, it is 4.62 and 8.13,
                    // and it is the same colour it always looked like anyway.
                    className="absolute inset-y-1.5 inset-x-1 rounded-full bg-panel2" />
                )}
                <span className="relative flex flex-col items-center gap-0.5">
                <n.icon size={19} strokeWidth={active ? 2.4 : 1.8} className="tab-icon flex-shrink-0" />
                {/* Four tabs at 375px is ~94px each — *Fortschritt* is the long
                    one and fits at `text-2xs` with room to spare, which is why
                    the labels can be the German surface names in full rather
                    than one clipped English word. */}
                {/* **`leading-[1.35]`, and the 0.35 is the umlaut.** `truncate` is
                    `overflow: hidden`, and with `line-height: 1` the line box is
                    exactly 1em while the font's own is ~1.2 — so 0.1em is cut off
                    the top, and at 11px that is the diaeresis on a *capital*: the
                    tab read **Uben**. Lowercase ö survived because its dots sit at
                    cap height, which is why *Wörter* looked fine next to it and the
                    bug looked like nothing.
                    This was found once before, fixed, and withdrawn on a bad test —
                    the check was `scrollHeight === clientHeight`, which compares
                    layout boxes and knows nothing about ink outside them, and it was
                    run against the deployed build rather than the one carrying the
                    fix. Both mistakes are in `docs/LESSONS.md`. */}
                <span lang="de" className="text-2xs leading-[1.35] tracking-tight truncate max-w-full">{n.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
