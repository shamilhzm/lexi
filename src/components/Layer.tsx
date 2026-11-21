// A panel that slides in beside the word — not a sheet that covers the app.
//
// ## The filmstrip
//
// Everything horizontal is one strip, with the **word at the centre**:
//
//        [ the entry ]        [ THE WORD ]        [ practice ]
//                             the feed
//
// You drag the strip toward what you want. Dragging **right** pulls the strip
// right, so the panel on the left — the entry — comes into view. Dragging
// **left** brings practice in from the other side.
//
// The consequence is the property that was missing: **the opposite drag always
// takes you back**, because the word never moved. Left from the entry returns to
// it; right from practice returns to it. Nothing is a dead end, and nothing
// depends on finding the × — which stays anyway, because a gesture with no
// visible equivalent is unreachable by keyboard and invisible to anyone who does
// not already know it is there.
//
// ## The chrome does not go anywhere
//
// These used to be `fixed inset-0 z-[200]` portals to `document.body`, which
// covered the bars: opening a word's entry took away the search, the streak, the
// tab bar and any sense of where you were, to show one page of text. There is
// plenty of screen. So a layer renders *inside the shell* at `z-40`, under the
// bars at `z-50`, padded to the space they leave — the frame stays put and the
// content moves within it, which is what makes four surfaces feel like one app
// rather than four.
//
// Not `aria-modal`: the navigation behind is still live and still usable, and
// claiming otherwise would tell a screen reader the opposite of what is true.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/** Travel that commits a dismissal. Matches the feed's `SWIPE_PX`: one number
 *  for "a swipe happened", across every surface that has one. */
const SWIPE_PX = 90;

/** One spring for every layer movement — in, out, and the rubber-band back.
 *
 *  Tuned down from `stiffness 520 / damping 42`, which arrived and left so fast
 *  it read as a cut rather than a movement. Lower stiffness with proportionally
 *  lower damping keeps it critically damped — no overshoot, nothing to wobble —
 *  while giving the eye enough frames to read the panel as *travelling* from
 *  somewhere. That is the difference between a slide and a jump. */
const SPRING = { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.85 };

// ---- the stack ---------------------------------------------------------------
// Every layer and sheet listened for Escape on `window`, so one press closed an
// entry *and* the story under it, or the search *and* the film behind it (losing
// the film's place). And only `#main` went inert, so VoiceOver swiped from an
// entry into the story beneath (persona pass, 2026-11-20). Now the open layers
// form a stack: only the top one answers Escape, and the ones under it are inert.
type Entry = { el: () => HTMLElement | null; parent: Entry | null };
const open: Entry[] = [];
function restack() {
  open.forEach((e, i) => { const el = e.el(); if (el) el.inert = i < open.length - 1; });
}

/** The layer a component is rendered inside, so a layer opened within it (the
 *  search sheet's entry) knows what it sits on. Context flows through portals. */
const Owner = createContext<Entry | null>(null);
export const LayerOwner = Owner.Provider;

/** Where a newly opened layer joins the stack: on top, unless it contains a layer
 *  that is already there. React runs a child's effects before its parent's, so
 *  when a sheet and the entry inside it open in one commit (a word link), the
 *  entry registers first; pushing the sheet after it put an invisible sheet on top
 *  and made the entry `inert`, frozen to taps and scrolling (LESSONS, 2026-11-21). */
export function stackIndex<E extends { parent: E | null }>(stack: readonly E[], me: E): number {
  const i = stack.findIndex((e) => { for (let p = e.parent; p; p = p.parent) if (p === me) return true; return false; });
  return i < 0 ? stack.length : i;
}
/** The topmost open layer's element, or null. For a component inside a layer
 *  that listens on `window` (the film's arrow keys) to know whether it is the
 *  one being looked at. */
export function topLayer(): HTMLElement | null {
  return open.length ? open[open.length - 1].el() : null;
}
/** Join the stack for as long as this component is mounted. `isTop` answers "am I
 *  on top?"; render what the layer holds inside `<LayerOwner value={entry}>`. */
export function useLayerStack(el: () => HTMLElement | null): { isTop: () => boolean; entry: Entry } {
  const parent = useContext(Owner);
  const me = useRef<Entry>({ el, parent }).current;
  me.el = el;
  me.parent = parent;
  useEffect(() => {
    open.splice(stackIndex(open, me), 0, me);
    restack();
    return () => { const i = open.indexOf(me); if (i >= 0) open.splice(i, 1); restack(); };
  }, [me]);
  const isTop = useCallback(() => open[open.length - 1] === me, [me]);
  return { isTop, entry: me };
}

/** **The strip laid flat** *(2026-11-21, LEARNING-WEB §3).* At 1280px and wider
 *  the feed's word sits in a 560px column with a third of the screen empty on
 *  either side, so a `beside` layer takes its side of the strip instead of the
 *  whole frame: `[ entry ] [ THE WORD ]` both on screen, the phone's one axis drawn
 *  at full size rather than a second layout. Its width is what the word's column
 *  leaves (`100vw − 600px`, halved), between 340 and 480px, so it never reaches the
 *  word. Below 1280px nothing changes.
 *
 *  **Never for a layer that grades.** Practice was laid flat too, on the right, and
 *  the meaning drill could be answered by reading the gloss beside it; the reverse
 *  and recall drills ask for the headword the feed shows in the middle. A test
 *  beside its own answer is not a test, so practice still covers the word. */
const BESIDE = {
  left: 'min-[1280px]:right-auto min-[1280px]:border-r',
  right: 'min-[1280px]:left-auto min-[1280px]:border-l',
} as const;
const BESIDE_W = 'min-[1280px]:w-[clamp(340px,calc((100vw-600px)/2),480px)] min-[1280px]:border-line';

export default function Layer({ children, side, label, back = 'Wort', onClose, footer, arrowBack = false, beside = false }: {
  children: React.ReactNode;
  /** Opened from a word that stays on screen (the feed's): at a wide viewport the
   *  panel sits beside that word rather than over it. See `BESIDE`. */
  beside?: boolean;
  /** The arrow key pointing back at the word closes the panel (→ for a panel on
   *  the left), the keyboard's version of the opposite drag. Opt-in, because a
   *  film uses both arrows to move between its beats. */
  arrowBack?: boolean;
  /** Controls that stay put while the content scrolls — the film's *Weiter*.
   *  Positioned against the layer itself, which is the box the tab bar sits in,
   *  rather than made `sticky` inside the scroller: on iOS Safari a sticky offset
   *  is measured inside the scroller's padding, which already clears the bar, so
   *  `bottom: var(--bar-b)` floated 80pt above it (2026-11-19). */
  footer?: React.ReactNode;
  /** What the back button says it returns to. Defaults to the word, because most
   *  layers *are* a step off a word — but a global list is not, and telling
   *  somebody they are going back to a word they were never on is worse than an
   *  unlabelled arrow. */
  back?: string;
  /** Which side of the word this panel sits on. `left` slides in from the left
   *  (you dragged right to reveal it) and leaves the same way. */
  side: 'left' | 'right';
  label: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const root = typeof document === 'undefined' ? null : document.getElementById('layer-root');
  const reduce = useReducedMotion();
  const away = side === 'left' ? '-100%' : '100%';
  // **Draggable once it has arrived** *(2026-11-19, on the simulator).* A drag
  // gesture stops the running animation on pointer-down, and a tap never becomes
  // a drag — so a tap during the slide-in (a learner pressing *Weiter* the moment
  // a film opened) froze the panel a third of the way across the screen, with
  // nothing left to finish the move. Until the entrance completes there is
  // nothing to drag anyway.
  const [arrived, setArrived] = useState(!!reduce);

  // **Where focus goes back to, and what is behind** *(2026-09-25 panel).*
  //
  // The panel took focus on open and gave nothing back on close, so a keyboard or
  // VoiceOver user who opened a word's ⓘ landed at the top of the document when
  // they closed it — in a feed ten thousand words long. The opener is remembered
  // here, before the effect below moves focus into the panel, and handed focus
  // back on the way out if focus has not gone somewhere deliberate meanwhile.
  //
  // And the route underneath is `inert` while a layer is up. Not `aria-modal` —
  // the bars stay live, which is the point of layers (see the header) — but the
  // page the panel *covers* was still in the accessibility tree, so swiping
  // through with VoiceOver read feed words hidden behind an open entry. `#main`
  // is the route column only; the bars are its siblings. Counted, because an
  // entry can open a drill over itself and the first close must not wake the page.
  // Declared before the focusing effect so the opener is read first.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const main = document.getElementById('main');
    if (main) {
      main.dataset.layers = String(Number(main.dataset.layers ?? 0) + 1);
      main.inert = true;
    }
    return () => {
      if (main) {
        const left = Math.max(0, Number(main.dataset.layers ?? 1) - 1);
        main.dataset.layers = String(left);
        if (left === 0) main.inert = false;
      }
      const now = document.activeElement;
      const stranded = !now || now === document.body || now.closest?.('#layer-root') !== null;
      if (opener && opener.isConnected && stranded) opener.focus({ preventScroll: true });
    };
  }, []);

  const { isTop, entry } = useLayerStack(() => panel.current);
  // Read through a ref: an inline `onClose` is a new function on every parent
  // render, and this effect used to re-run, and re-focus the panel, each time.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const backKey = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') { close.current(); return; }
      const t = e.target as HTMLElement | null;
      if (!arrowBack || e.key !== backKey || e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented) return;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTop, arrowBack, side]);

  // Dismissal is the *reverse* of the entry direction, so the strip metaphor
  // holds: the word is still on the side it came from. Closing hands off to the
  // exit transition rather than snapping — see the note on `SPRING`.
  const settle = useCallback((offset: number, velocity: number) => {
    const flick = Math.abs(velocity) > 420 && Math.abs(offset) > 28;
    const back = side === 'left' ? offset < -SWIPE_PX || (flick && velocity < 0)
      : offset > SWIPE_PX || (flick && velocity > 0);
    if (back) onClose();
  }, [side, onClose]);

  if (!root) return null;
  const BackArrow = side === 'left' ? ArrowRight : ArrowLeft;

  return createPortal(
    <motion.div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label={label}
      // `pointer-events-auto` because the root that holds it is inert, so the
      // bars above stay clickable through the gaps.
      className={`absolute inset-0 pointer-events-auto bg-bg outline-none flex flex-col touch-pan-y${
        beside ? ` ${BESIDE[side]} ${BESIDE_W}` : ''}`}
      // **A full slide, in and out.** The first version entered from 40px away
      // and left by simply unmounting, which is why it read as twitchy rather
      // than as part of one canvas: the panel appeared to blink into place and
      // vanish. A strip that travels its own width, both ways, is the whole
      // metaphor made visible. `AnimatePresence` in the caller is what lets the
      // exit run at all — without it React removes the node and there is nothing
      // left to animate.
      initial={reduce ? false : { x: away }}
      animate={{ x: 0 }}
      exit={reduce ? { x: away, transition: { duration: 0 } } : { x: away }}
      transition={SPRING}
      drag={arrived ? 'x' : false}
      onAnimationComplete={() => setArrived(true)}
      dragDirectionLock
      dragElastic={0.12}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => settle(info.offset.x, info.velocity.x)}>
      {/* The bars sit above this at z-50; the padding is what stops content
          hiding underneath them. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain
        pt-[var(--bar-t)] pb-[var(--bar-b)]">
        <div className="mx-auto w-full max-w-[620px] px-5 pt-3">
          {/* **An arrow at the word, not an ×.** A cross says "destroy this";
              nothing is being destroyed, you are moving one step along a strip.
              It points at where the word actually is — right from the entry,
              left from practice — so the button and the gesture describe the
              same geometry even though your thumb travels the other way, which
              is how every carousel in the world already works. */}
          <button onClick={onClose} aria-label={`Back to ${back}`}
            className="tap-44 inline-flex items-center gap-1.5 rounded-full glass pl-2.5 pr-3.5 h-11
              text-txt active:scale-95 transition mb-3 text-sm font-semibold">
            <BackArrow size={18} />
            <span lang={back === 'Wort' ? 'de' : undefined}>{back}</span>
          </button>
          <LayerOwner value={entry}>{children}</LayerOwner>
          {footer && <div aria-hidden className="h-24" />}
        </div>
      </div>
      {footer && (
        <div className="absolute inset-x-0 bottom-[var(--bar-b)] z-10
          bg-[linear-gradient(to_bottom,transparent,var(--color-bg)_35%)]">
          <div className="mx-auto w-full max-w-[620px] px-5 pt-4 pb-2"><LayerOwner value={entry}>{footer}</LayerOwner></div>
        </div>
      )}
      <span className="sr-only">
        {/* Says where back goes, as the button does: "the word" was read out
            over the saved list, the settings and the films alike. */}
        Swipe {side === 'left' ? 'left' : 'right'} to go back to {back === 'Wort' ? 'the word' : back}.
      </span>
    </motion.div>,
    root,
  );
}
