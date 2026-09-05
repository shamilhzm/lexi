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
import { motion, useMotionValue, useReducedMotion, animate } from 'motion/react';
import { X } from 'lucide-react';

/** Travel that commits a dismissal. Matches the feed's `SWIPE_PX`: one number
 *  for "a swipe happened", across every surface that has one. */
const SWIPE_PX = 90;

export default function Layer({ children, side, label, onClose }: {
  children: React.ReactNode;
  /** Which edge this panel lives on. `left` slides in from the left and is
   *  dismissed by swiping back left; `right` is the mirror. */
  side: 'left' | 'right';
  label: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const root = typeof document === 'undefined' ? null : document.getElementById('layer-root');
  const reduce = useReducedMotion();
  const away = side === 'left' ? -1 : 1;
  const x = useMotionValue(away * 40);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus({ preventScroll: true });
    animate(x, 0, reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, x, reduce]);

  // Dismissal is the *reverse* of the entry direction, so the strip metaphor
  // holds: the word is still on the side it came from.
  const settle = useCallback((offset: number, velocity: number) => {
    const flick = Math.abs(velocity) > 460 && Math.abs(offset) > 32;
    const back = away === -1 ? offset < -SWIPE_PX || (flick && velocity < 0)
      : offset > SWIPE_PX || (flick && velocity > 0);
    if (back) onClose();
    else animate(x, 0, reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34, velocity });
  }, [away, onClose, x, reduce]);

  if (!root) return null;

  return createPortal(
    <motion.div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label={label}
      // `pointer-events-auto` because the root that holds it is inert, so the
      // bars above stay clickable through the gaps.
      className="absolute inset-0 pointer-events-auto bg-bg outline-none flex flex-col touch-pan-y"
      style={{ x }}
      drag="x"
      dragDirectionLock
      dragElastic={0.5}
      onDragEnd={(_, info) => settle(info.offset.x, info.velocity.x)}>
      {/* The bars sit above this at z-50; the padding is what stops content
          hiding underneath them. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain
        pt-[var(--bar-t)] pb-[var(--bar-b)]">
        <div className="mx-auto w-full max-w-[620px] px-5 pt-3">
          <button onClick={onClose} aria-label="Close"
            className="tap-44 grid place-items-center w-11 h-11 rounded-full glass
              text-txt active:scale-95 transition mb-3">
            <X size={20} />
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
