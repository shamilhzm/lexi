import { useEffect, useRef, useState } from 'react';

/** Animates a number toward `value` with an ease-out ramp. Honors reduced
 *  motion. Pass `from` to also animate the initial mount (recap tiles count up
 *  from 0); omitted, only subsequent value changes animate (live KPIs). */
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
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  const shown = format ? format(n) : Math.round(n).toLocaleString('de-DE');
  return <>{shown}{suffix}</>;
}
