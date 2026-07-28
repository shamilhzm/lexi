import { useEffect, useRef, useState } from 'react';
import { fmt } from '../lib/ui.ts';

/** Animates a number toward `value` with an ease-out ramp. Honors reduced
 *  motion. Pass `from` to also animate the initial mount (recap tiles count up
 *  from 0, the Known headline counts up from what you last saw); omitted, only
 *  subsequent value changes animate. */
export default function CountUp({ value, format, suffix = '', duration = 650, from: fromProp }:
  { value: number; format?: (n: number) => string; suffix?: string; duration?: number; from?: number }) {
  const [n, setN] = useState(fromProp ?? value);
  const from = useRef(fromProp ?? value);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || from.current === value) { from.current = value; setN(value); return; }
    const start = performance.now();
    const a = from.current, b = value;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(a + (b - a) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    // rAF is paused in a hidden tab, and this component is the one place in the
    // app where a stalled frame callback leaves a *wrong number* on screen
    // rather than merely an unanimated one — it would sit at `from` forever.
    // Timers keep running, so one backstop past the ramp guarantees the truth.
    const settle = setTimeout(() => { from.current = b; setN(b); }, duration + 80);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(settle); };
  }, [value, duration]);

  // Default formatting is the app's, not the browser's. This used to be an
  // inline `toLocaleString('de-DE')`, so the Known headline rendered "2.320"
  // directly beside a `fmt()`-formatted "6,618" — two groupings, one row.
  const shown = format ? format(n) : fmt(Math.round(n));
  return <>{shown}{suffix}</>;
}
