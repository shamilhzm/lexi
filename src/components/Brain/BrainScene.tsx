// The brain, drawn.
//
// One component at two sizes. The hero on Today is a 240px strip you glance at;
// the room at `#/brain` is full-bleed and can be turned. Same field, same
// projection, same colours — a word is in the same place in both.
//
// Rendering is progressive by design. The first frame is always the 2D
// canvas, which needs nothing but a context; `three` is fetched in the
// background and takes over when it arrives. If it never arrives, or the machine
// has no WebGL, the 2D renderer simply stays — there is no fallback state to
// design because the fallback is what shipped first.
import { useEffect, useRef, useState } from 'react';
import { paintFlat } from '../../lib/brain/flat.ts';
import { VOID } from '../../lib/brain/palette.ts';
import { useBrainField, useFlares, useSubstrate, SUBSTRATE_COUNT } from './useBrain.ts';
import { useMedia } from '../../lib/useMedia.ts';
import type { SceneHandle } from '../../lib/brain/scene.ts';
import { loadBrainMesh } from '../../lib/brain/meshdata.ts';

/** Radians per second of idle rotation. A brain that is perfectly still reads
 *  as a diagram; one that turns fast enough to notice reads as a screensaver. */
const IDLE_SPIN = 0.085;

export interface BrainSceneProps {
  mode: 'hero' | 'room';
  /** Region to highlight; everything else dims. */
  selected?: string | null;
  /** Fired when a region is picked out of the scene (room only). */
  onPickRegion?: (id: string | null) => void;
  /** Preview: fraction of the lexicon to render as consolidated, or null for
   *  real progress. See `simulatedConsolidation` — strictly read-only. */
  simulate?: number | null;
  className?: string;
}

export default function BrainScene({ mode, selected, simulate = null, className }: BrainSceneProps) {
  // Two canvases, stacked, not one.
  //
  // A canvas can only ever hand out one kind of context. The 2D renderer paints
  // the first frame immediately, which means it must call `getContext('2d')`
  // before the `three` chunk has even arrived — and that permanently poisons the
  // element, so the WebGLRenderer built on it later always threw and the scene
  // silently stayed 2D forever. Separate elements remove the race instead of
  // trying to time it.
  const flatCanvas = useRef<HTMLCanvasElement>(null);
  const glCanvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const still = useMedia('(prefers-reduced-motion: reduce)');

  const { field, positions, lum, revision } = useBrainField(simulate);
  const substrate = useSubstrate(SUBSTRATE_COUNT[mode]);
  const { flares, step } = useFlares(field);

  const [gl, setGl] = useState<SceneHandle | null>(null);
  const [dragging, setDragging] = useState(false);

  // View state lives in a ref, not in React state: it changes every frame and
  // nothing in the tree needs to re-render when it does.
  const view = useRef({ yaw: mode === 'hero' ? 0.55 : 0.7, pitch: 0.22, spin: true });
  const size = useRef({ w: 0, h: 0, dpr: 1 });

  // ---- 3D, when and if it arrives ----------------------------------------
  // Reduced motion is honoured by *not moving* — no idle spin, no breath, and a
  // loop that stops once nothing is changing. It is not a reason to fall back to
  // the 2D renderer: someone who asked for less animation still wants to see
  // their lexicon, and giving them the lesser picture would be reading the
  // preference as "show me less".
  useEffect(() => {
    let dead = false;
    let handle: SceneHandle | null = null;

    // The only dynamic import in the app. It is what keeps `three` out of the
    // entry chunk, so Today's first paint never waits on it.
    import('../../lib/brain/scene.ts')
      .then((m) => m.createScene(glCanvas.current!, mode))
      .then((h) => {
        if (dead || !h) { h?.dispose(); return; }
        handle = h;
        setGl(h);
      })
      .catch(() => { /* no WebGL, or the chunk failed: 2D carries on */ });

    return () => { dead = true; handle?.dispose(); setGl(null); };
  }, [mode]);

  // ---- the real cortical surface -----------------------------------------
  // Room only. The hero sits on Today, which is the app's first paint, and a
  // 0.6MB surface has no business on the boot path for a 210px strip where its
  // detail would not survive the downscale anyway. The room is somewhere you
  // chose to go.
  //
  // Fetched independently of the `three` chunk so the two download in parallel.
  useEffect(() => {
    if (mode !== 'room' || !gl) return;
    let dead = false;
    loadBrainMesh().then((m) => { if (m && !dead) gl.setMesh(m); });
    return () => { dead = true; };
  }, [mode, gl]);

  // ---- sizing -------------------------------------------------------------
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // Called synchronously as well as from the observer. The first paint happens
    // in the loop effect below, which runs *before* any ResizeObserver callback
    // fires — so measuring only in the callback left the canvas at 0×0 and
    // `createImageData` threw IndexSizeError on the very first frame.
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      // Capped: a 4K room at dpr 3 is 12M pixels of additive blending for a
      // point cloud that gains nothing from it.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { w: Math.round(r.width * dpr), h: Math.round(r.height * dpr), dpr };
      // Only the backing store is set here. Display size is CSS (100% of the
      // grid cell), so nothing has to be kept in sync with a re-render.
      for (const cv of [flatCanvas.current, glCanvas.current]) {
        if (!cv) continue;
        cv.width = size.current.w;
        cv.height = size.current.h;
      }
      gl?.resize(size.current.w, size.current.h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gl]);

  // ---- upload on data change ---------------------------------------------
  useEffect(() => {
    gl?.upload(positions, lum, field.region);
  }, [gl, positions, lum, field, revision, simulate]);

  useEffect(() => { gl?.setSelected(selected ?? null); }, [gl, selected]);

  // ---- the loop -----------------------------------------------------------
  useEffect(() => {
    if (!substrate) return;

    if (gl) gl.setSubstrate(substrate);

    let raf = 0;
    let last = performance.now();
    // Only ever taken on the 2D element, and only while WebGL is not live.
    const ctx2d = gl ? null : flatCanvas.current?.getContext('2d') ?? null;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const lit = step(now);
      if (view.current.spin && !dragging && !still) view.current.yaw += IDLE_SPIN * dt;

      // Nothing to draw into yet — the wrapper has no layout on the very first
      // synchronous pass in some flex arrangements.
      if (size.current.w < 2 || size.current.h < 2) { raf = requestAnimationFrame(frame); return; }

      if (gl) {
        // `now` is frozen under reduced motion so the slow breath in the scene
        // resolves to a constant.
        gl.render(view.current.yaw, view.current.pitch, flares.current, still ? 0 : now);
      } else if (ctx2d) {
        paintFlat(ctx2d, size.current.w, size.current.h, {
          substrate: substrate.position, positions, region: field.region, lum,
          yaw: view.current.yaw, pitch: view.current.pitch, flare: flares.current,
          dpr: size.current.dpr,
        });
      }

      // Under reduced motion the brain is painted once and then only when
      // something actually changes — no idle loop at all.
      if (!still || lit) raf = requestAnimationFrame(frame);
    };

    // Paint synchronously before scheduling. rAF does not fire in a backgrounded
    // tab, so a brain whose first frame waited on one showed a black rectangle
    // until the tab was focused — and under `prefers-reduced-motion`, where the
    // loop deliberately draws once, forever.
    frame(last);

    // A backgrounded tab stops getting rAF anyway; this stops the *catch-up*
    // burst of flare maths when it returns.
    const onVis = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
    // `selected` is a dependency so that picking a region repaints. It only
    // changes a shader uniform, which the idle loop would pick up on its next
    // frame — but under reduced motion there is no next frame, so highlighting a
    // region would have done nothing at all for the people most likely to be
    // using the rail rather than the canvas.
  }, [gl, substrate, positions, lum, field, still, dragging, step, flares, revision, selected]);

  // ---- drag to turn (room only) ------------------------------------------
  useEffect(() => {
    if (mode !== 'room') return;
    const cv = glCanvas.current;
    if (!cv) return;
    let id: number | null = null;
    let last = [0, 0];

    const down = (e: PointerEvent) => {
      id = e.pointerId; last = [e.clientX, e.clientY];
      setDragging(true);
      view.current.spin = false;
      cv.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      view.current.yaw += (e.clientX - last[0]) * 0.008;
      view.current.pitch = Math.max(-1.1, Math.min(1.1, view.current.pitch + (e.clientY - last[1]) * 0.006));
      last = [e.clientX, e.clientY];
    };
    const up = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      id = null;
      setDragging(false);
      cv.releasePointerCapture?.(e.pointerId);
    };

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    return () => {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
  }, [mode]);

  return (
    // Positioning is left entirely to the caller. An inline `position: relative`
    // here beat the `absolute inset-0` the room passes in — inline styles win
    // over classes — so the wrapper fell out of its stretch box and collapsed to
    // the canvas's intrinsic 300×150, and the room rendered a blank strip.
    // A grid with both canvases in cell 1/1 stacks them without either element
    // needing `position`. Setting `position: relative` inline here instead would
    // beat the `absolute inset-0` the room passes through `className` — inline
    // styles win over classes — and collapse the wrapper, which is exactly how
    // the room first rendered as a blank 300×150 strip.
    <div ref={wrap} className={className} style={{ background: VOID, display: 'grid', overflow: 'hidden' }}>
      {/* Opaque to assistive tech on purpose. A WebGL canvas cannot be read, so
          it does not pretend to be: the accessible surface is the region list,
          which carries the same numbers as real text. */}
      <canvas
        ref={flatCanvas}
        aria-hidden="true"
        style={{ gridArea: '1/1', width: '100%', height: '100%', display: gl ? 'none' : 'block' }}
      />
      <canvas
        ref={glCanvas}
        aria-hidden="true"
        style={{
          gridArea: '1/1', width: '100%', height: '100%', display: 'block',
          touchAction: mode === 'room' ? 'none' : undefined,
          cursor: mode === 'room' ? (dragging ? 'grabbing' : 'grab') : undefined,
        }}
      />
    </div>
  );
}
