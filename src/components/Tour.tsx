// A first-visit tour: a few bubbles, each pointing at a real control.
//
// **An overlay, never a block in the page.** The inline coach marks this replaces
// spent their height out of the card below them, and on a short phone that pushed
// the grade buttons under the tab bar (BACKLOG #32, B2). A bubble over a dimmed
// screen takes nothing from the layout, so the screen it explains is exactly the
// screen the learner will use.
//
// A step with no target, or whose target is not on screen, is a centred card. A
// step marked `demo` asks its target to perform its own gesture (`DEMO_EVENT`),
// which teaches a swipe better than a sentence about one.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, type MotionValue } from 'motion/react';
import Button from './ui/Button.tsx';
import { DEMO_EVENT, DEMO_STOP, markTourSeen, tourSeen, type TourId } from '../lib/hints.ts';

export interface TourStep {
  title: string;
  body: React.ReactNode;
  /** A selector, resolved when the step shows. */
  target?: string;
  /** Ask an element to demonstrate its swipe, now and every few seconds: the
   *  target itself, or the element this selector names (the spotlight can sit on
   *  a headword while the whole slot it belongs to moves). */
  demo?: boolean | string;
  /** Where the bubble would rather sit. It falls back to the other side, then to
   *  the bottom of the screen, when it does not fit. */
  prefer?: 'above' | 'below';
}

const PAD = 8;
const GAP = 14;

export default function Tour({ id, steps, ready = true }: { id: TourId; steps: TourStep[]; ready?: boolean }) {
  const [open, setOpen] = useState(() => !tourSeen(id));
  const [k, setK] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Where the bubble is placed from. On a demo step the target moves on purpose:
  // the spotlight follows it, the bubble holds still.
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const anchored = useRef(false);
  const primary = useRef<HTMLButtonElement>(null);
  const step = steps[k];
  const show = open && ready && !!step;
  const bubble = useRef<HTMLDivElement>(null);
  // The bubble's own height, measured after it renders: placement is a second
  // pass, so it never guesses how tall a step's copy wraps at this text size.
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = bubble.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    setH(el.offsetHeight);
    return () => ro.disconnect();
  }, [show, k]);

  const finish = useCallback(() => { markTourSeen(id); setOpen(false); }, [id]);
  const next = useCallback(() => { if (k + 1 < steps.length) setK(k + 1); else finish(); }, [k, steps.length, finish]);

  const targetEl = useCallback(() => (step?.target ? document.querySelector<HTMLElement>(step.target) : null), [step]);

  // Where the target is. Re-measured on resize and scroll, and once shortly after
  // the step shows, because a target can still be settling its own entrance.
  useLayoutEffect(() => {
    if (!show) return;
    anchored.current = false;
    // An off-screen target is brought to the middle, once per step and from
    // inside the poll: a surface can restore its own scroll position after the
    // tour mounts, and the check has to see where the page finally settles.
    let scrolled = false;
    const measure = () => {
      const el = targetEl();
      const r = el?.getBoundingClientRect();
      if (el && r && !scrolled && r.height > 0 && (r.top < 0 || r.bottom > window.innerHeight)) {
        scrolled = true;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const next = r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight ? r : null;
      // Same box, same object: the poll must not re-render a still page.
      setRect((prev) => (prev && next && prev.left === next.left && prev.top === next.top
        && prev.width === next.width && prev.height === next.height) ? prev : next);
      if (!step?.demo || !anchored.current) {
        setAnchor(next);
        anchored.current = !!next;
      }
    };
    measure();
    // Polled too, slowly: a target can move without a scroll or a resize (a
    // demo settling, a font arriving), and four reads a second is nothing.
    const t = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [show, k, targetEl, step]);

  useEffect(() => {
    if (!show || !step?.demo) return;
    const el = () => (typeof step.demo === 'string' ? document.querySelector(step.demo) : targetEl());
    const fire = () => el()?.dispatchEvent(new CustomEvent(DEMO_EVENT));
    const first = window.setTimeout(fire, 650);
    const loop = window.setInterval(fire, 3600);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
      // Leaving the step puts the word back where it lives.
      el()?.dispatchEvent(new CustomEvent(DEMO_STOP));
    };
  }, [show, step, targetEl]);

  useEffect(() => {
    if (!show) return;
    // Focus only where there is a keyboard: on a phone, programmatic focus paints
    // a ring on "Next" that reads as a pressed state.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) primary.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      // Keep the page's own shortcuts (Space flips, ←/→ grade) from firing under
      // the tour; Enter and Space still press the focused button.
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [show, k, finish]);

  if (!show) return null;

  // Below or above the target, whichever the step prefers and fits; docked to the
  // bottom of the screen when neither does; centred when there is no target.
  const vw = window.innerWidth, vh = window.innerHeight;
  const width = Math.min(340, vw - 32);
  const M = 12;
  let style: React.CSSProperties;
  let arrow: { left: number; side: 'top' | 'bottom' } | null = null;
  const at = anchor ?? rect;
  if (rect && at) {
    const cx = at.left + at.width / 2;
    const left = Math.max(16, Math.min(vw - width - 16, cx - width / 2));
    const fitsBelow = at.bottom + PAD + GAP + h + M <= vh;
    const fitsAbove = at.top - PAD - GAP - h - M >= 0;
    const order = step.prefer === 'above' ? ['above', 'below'] : ['below', 'above'];
    const side = order.find((o) => (o === 'below' ? fitsBelow : fitsAbove));
    if (side === 'below') {
      style = { left, width, top: at.bottom + PAD + GAP };
      arrow = { left: Math.max(18, Math.min(width - 18, cx - left)), side: 'top' };
    } else if (side === 'above') {
      style = { left, width, top: at.top - PAD - GAP - h };
      arrow = { left: Math.max(18, Math.min(width - 18, cx - left)), side: 'bottom' };
    } else {
      // A target too tall to leave room either side: no arrow, which would point
      // into its own spotlight.
      style = { left, width, bottom: M };
    }
  } else {
    style = { left: (vw - width) / 2, width, top: Math.max(M, (vh - h) / 2) };
  }
  // First pass, before the height is known: render unseen, then place.
  if (!h) style = { ...style, visibility: 'hidden' };

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* The scrim, with a hole over the target when there is one. A tap on it
          moves on, so nobody is trapped behind a bubble they cannot read. */}
      {rect ? (
        <div aria-hidden onClick={next}
          className="tour-spot fixed rounded-xl pointer-events-auto"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      ) : (
        <div aria-hidden onClick={next} className="tour-scrim fixed inset-0" />
      )}
      {/* The hole is see-through but not touch-through: the tour is read, then
          dismissed, and the real gesture comes after. */}
      {rect && <div aria-hidden onClick={next} className="fixed inset-0" />}
      <div key={k} ref={bubble} role="dialog" aria-modal="true" aria-labelledby={`tour-${id}-t`}
        className="tour-bubble tour-in fixed bg-card border border-line rounded-lg shadow-xl px-4 pt-3 pb-2.5" style={style}>
        {arrow && (
          <span aria-hidden className="absolute w-3 h-3 bg-card border-line rotate-45"
            style={{
              left: arrow.left - 6,
              ...(arrow.side === 'top'
                ? { top: -7, borderLeftWidth: 1, borderTopWidth: 1 }
                : { bottom: -7, borderRightWidth: 1, borderBottomWidth: 1 }),
            }} />
        )}
        <h2 id={`tour-${id}-t`} className="text-[0.9375em] font-semibold leading-snug mb-0.5">{step.title}</h2>
        <div className="text-[0.8125em] text-dim leading-snug">{step.body}</div>
        <div className="mt-2 flex items-center gap-3">
          {steps.length > 1 && (
            <span className="text-2xs font-mono text-dim">{k + 1} / {steps.length}</span>
          )}
          {k + 1 < steps.length && (
            <button onClick={finish} className="tap-44 ml-auto text-xs text-dim font-semibold hover:text-txt">Skip</button>
          )}
          <Button ref={primary} size="sm" onClick={next} className={k + 1 < steps.length ? '' : 'ml-auto'}>
            {k + 1 < steps.length ? 'Next' : 'Got it'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Makes a swipeable element answer `DEMO_EVENT` with its own gesture: a nudge
 *  toward *right*, a pause, then *left*, then home. Driven through the element's
 *  own `x`, so its drag labels light up exactly as they do under a thumb.
 *  Reduced motion keeps the bubble's words and drops the movement. */
export function useSwipeDemo(ref: React.RefObject<HTMLElement | null>, x: MotionValue<number>, reduce: boolean | null, reach = 72) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    let playing: { stop: () => void } | undefined;
    const run = () => {
      playing = animate(x, [0, reach, reach, 0, -reach, -reach, 0], {
        duration: 2.6, times: [0, 0.16, 0.36, 0.5, 0.66, 0.86, 1], ease: 'easeInOut',
      });
    };
    const stop = () => { playing?.stop(); animate(x, 0, { duration: 0.18 }); };
    el.addEventListener(DEMO_EVENT, run);
    el.addEventListener(DEMO_STOP, stop);
    return () => {
      el.removeEventListener(DEMO_EVENT, run);
      el.removeEventListener(DEMO_STOP, stop);
      playing?.stop();
    };
  }, [ref, x, reduce, reach]);
}
