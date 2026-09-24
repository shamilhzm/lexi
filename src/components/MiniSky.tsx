// Today, in your sky — the session recap's view of the words it just worked on.
//
// The recap used to end in numbers (reviewed, recall, new). This puts the session
// where it lives: the same sky as Fortschritt (`WordSky`), small, with every word
// from this session ringed. Each one flares in the order you met it, then they
// glint for as long as the recap is open. It is the one moment the sky and the
// study loop touch — the words you just did, visibly part of the whole.
//
// DESIGN §7: the rings are drawn on the first frame and every frame after; the
// flares and glints are additive, and none of it runs under reduced motion.
import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { paintSky, place, token } from './skyPaint.ts';
import { skyGeometry, looksFor } from './skyModel.ts';
import { fmt } from '../lib/ui.ts';

const FLARE_MS = 900;

export default function MiniSky({ ids, size = 240 }: { ids: string[]; size?: number }) {
  const reduce = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const { order, stars, index } = skyGeometry();
  const looks = useMemo(() => looksFor(order, 'memory'), [order]);
  const placed = useMemo(() => place(size, stars), [size, stars]);
  const hi = useMemo(() => ids.map((id) => index.get(id)).filter((i): i is number => i !== undefined), [ids, index]);
  const lit = useMemo(() => looks.filter((l) => l.lit).length, [looks]);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    cv.width = px; cv.height = px;
    const dark = document.documentElement.classList.contains('dark');
    const base = document.createElement('canvas');
    base.width = px; base.height = px;
    const b = base.getContext('2d');
    if (!b) return;
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintSky(b, { size, stars, looks, dark, rings: [] }, (i) => looks[i].lit, placed, document.createElement('canvas'));

    const accent = token('--color-accent');
    const glint = dark ? '#ffffff' : accent;
    const { xs, ys } = placed;
    const dot = Math.max(1.1, placed.dot);
    const stagger = hi.length ? Math.min(90, 1600 / hi.length) : 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = now - t0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, px, px);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Today's words, ringed — the content, drawn every frame.
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.1;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      for (const i of hi) { ctx.moveTo(xs[i] + dot * 2.6, ys[i]); ctx.arc(xs[i], ys[i], dot * 2.6, 0, Math.PI * 2); }
      ctx.stroke();
      if (reduce) { ctx.globalAlpha = 1; return; }
      // Flares, in the order met.
      ctx.fillStyle = accent;
      if (dark) ctx.globalCompositeOperation = 'lighter';
      hi.forEach((i, k) => {
        const f = (t - k * stagger) / FLARE_MS;
        if (f < 0 || f > 1) return;
        ctx.globalAlpha = 0.7 * (1 - f) * (1 - f);
        ctx.beginPath(); ctx.arc(xs[i], ys[i], dot * (2 + 9 * f), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      // Then they glint.
      if (hi.length && t > hi.length * stagger) {
        ctx.strokeStyle = glint; ctx.fillStyle = glint; ctx.lineCap = 'round'; ctx.lineWidth = 0.9;
        const slots = Math.min(6, hi.length);
        for (let s = 0; s < slots; s++) {
          const period = 2200 + s * 191, tt = t + s * 733;
          const i = hi[(Math.floor(tt / period) * 7919 + s * 104_729) % hi.length];
          const amp = Math.sin(Math.PI * ((tt % period) / period)) ** 2;
          const L = dot * (2 + 4.5 * amp);
          ctx.globalAlpha = 0.9 * amp;
          ctx.beginPath();
          ctx.moveTo(xs[i] - L, ys[i]); ctx.lineTo(xs[i] + L, ys[i]);
          ctx.moveTo(xs[i], ys[i] - L); ctx.lineTo(xs[i], ys[i] + L);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    draw(t0);
    if (reduce) return;
    let raf = 0, last = 0;
    const tick = (now: number) => {
      if (now - last > 30) { last = now; draw(now); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, stars, looks, placed, hi, reduce]);

  if (!hi.length) return null;
  return (
    <figure className="mb-5">
      <canvas ref={canvas} role="img" style={{ width: size, height: size }} className="block mx-auto"
        aria-label={`Your sky: ${fmt(lit)} of ${fmt(stars.length)} words lit. Today’s ${hi.length} are ringed.`} />
      <figcaption className="mt-1 text-xs text-dim">
        Today’s <b className="text-accent">{hi.length}</b> {hi.length === 1 ? 'word' : 'words'}, in your sky of <b className="text-txt font-mono tabular-nums">{fmt(lit)}</b> lit
      </figcaption>
    </figure>
  );
}
