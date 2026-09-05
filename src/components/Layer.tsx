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
import { useCallback, useEffect, useRef } from 'react';
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

export default function Layer({ children, side, label, back = 'Wort', onClose }: {
  children: React.ReactNode;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      className="absolute inset-0 pointer-events-auto bg-bg outline-none flex flex-col touch-pan-y"
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
      drag="x"
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
          {children}
        </div>
      </div>
      <span className="sr-only">
        Swipe {side === 'left' ? 'left' : 'right'} to go back to the word.
      </span>
    </motion.div>,
    root,
  );
}
