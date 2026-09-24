// Dein Deutsch — every word Lexi teaches, as a sky you light.
//
// ## What it shows, and why this shape
//
// Fortschritt answered "how am I doing?" with a number, a treemap and a table. All
// true, and none of them *looks like* learning a language. This does: every one of
// the words is a point, sown like the seeds of a sunflower in order of how common
// the word is — so the centre is the German in every sentence and the rim is the
// German you meet once a year (`lib/sky.ts`). A word you have studied is lit.
//
// **Brightness is memory, now.** A known word glows as brightly as FSRS says you
// would recall it today, and grows with how long it will last, so the sky is not a
// trophy case: stars dim between reviews, and the ones that have fallen below your
// retention target pulse softly — which is the scheduler's reason for putting them
// in front of you, made visible. Words reviewed in the last day glint.
//
// **Coverage, in rings.** The rings mark the 100, 500, 1,000 and 3,000 commonest
// words, and each carries an arc that closes as its words are lit — the number a
// reader cares about ("how much of ordinary German have I got?"), drawn where it is.
//
// **The process, not just the state.** Replay runs your review history as a
// time-lapse: the camera starts close on your first words and pulls back as the
// vocabulary widens, each word lighting on the day you first met it. Tapping any
// star draws that word's memory curve from your own reviews: it falls, you review,
// it jumps back, and each fall is slower than the last. That sawtooth is the
// spacing effect, and it is the one idea about learning this app is built on.
//
// ## The rules it keeps (DESIGN §7)
//
// Nothing animates content into view: the canvas always paints a correct frame,
// and the replay is driven by timestamps with a timer backstop, so a tab that
// stalls rAF lands on the finished sky rather than a half-lit one. Everything is
// static under reduced motion. The numbers under it are the same honest ones the
// rest of the app uses — lit means FSRS has seen it, known means it reached Review.
// The painter is `skyPaint.ts`; the finished sky is cached, so the breathing and
// the glints cost a blit and a few hundred arcs a frame, not the whole sky.
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { Play, Bookmark, BookmarkCheck, Info } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { cardOf, statusOf, retention, isSaved, toggleSaved } from '../store.ts';
import { useStore } from '../useStore.ts';
import { retrievability } from '../srs.ts';
import { freqRankOf } from '../lib/freq.ts';
import { loadLedger, type ReviewEvent } from '../lib/ledger.ts';
import { firstLight, memoryCurve, reachCurve, type Star, type MemoryCurve } from '../lib/sky.ts';
import { paintSky, place, token, type Look, type Placed, type Scene } from './skyPaint.ts';
import { skyGeometry, looksFor, type Lens } from './skyModel.ts';
import { fmt, haptic } from '../lib/ui.ts';
import { GenderTerm } from './Reveal.tsx';
import WordDetail from './WordDetail.tsx';
import CountUp from './CountUp.tsx';
import type { Card } from '../srs.ts';
import type { Target, Word } from '../types.ts';

const LENSES: { id: Lens; label: string }[] = [
  { id: 'memory', label: 'Memory' },
  { id: 'level', label: 'Level' },
  { id: 'gender', label: 'der · die · das' },
];
/** A replay of months, in seven seconds. Off the narrative tier on purpose — it
 *  is a time-lapse the learner asked for, not a transition. */
const REPLAY_MS = 7000;
const RINGS = [100, 500, 1000, 3000];
const SPARK_MS = 900;
const DAY = 86_400_000;
const REPLAYED_KEY = 'lexi.sky.replayed.v1';

interface Plan {
  when: Float64Array;
  ats: number[];
  reach: number[];
  t0: number;
  t1: number;
}

/** One frame of the replay: which stars are lit, and where the camera is. */
function replayFrame(plan: Plan, elapsed: number) {
  const p = Math.max(0, Math.min(1, elapsed / REPLAY_MS));
  const e = 1 - Math.pow(1 - p, 2.2);             // eases into the present
  const tNow = plan.t0 + (plan.t1 - plan.t0) * e;
  let lo = 0, hi = plan.ats.length;               // stars lit by tNow
  while (lo < hi) { const m = (lo + hi) >> 1; if (plan.ats[m] <= tNow) lo = m + 1; else hi = m; }
  const count = lo;
  const f = (count / plan.ats.length) * (plan.reach.length - 1);
  const j = Math.floor(f);
  const q = plan.reach[j] + ((plan.reach[Math.min(j + 1, plan.reach.length - 1)] ?? plan.reach[j]) - plan.reach[j]) * (f - j);
  const fit = Math.max(1, Math.min(3.2, 0.9 / Math.max(0.1, q || 0.1)));
  // The last fifth pulls all the way back, so the replay ends on the whole sky —
  // the part still dark included — which is the same frame the page rests on.
  const settle = p < 0.8 ? 0 : (p - 0.8) / 0.2;
  const scale = 1 + (fit - 1) * (1 - settle * settle * (3 - 2 * settle));
  const rot = (1 - e) * 1.1;
  const span = (plan.t1 - plan.t0) * (SPARK_MS / REPLAY_MS);
  return {
    p, tNow, count, scale, rot,
    lit: (i: number) => plan.when[i] <= tNow,
    spark: (i: number) => { const a = plan.when[i]; return a > tNow ? 0 : Math.max(0, 1 - (tNow - a) / span); },
  };
}

export default function WordSky({ onStudy }: { onStudy: (t: Target) => void }) {
  const v = useStore();
  const reduce = useReducedMotion();
  const [lens, setLens] = useState<Lens>('memory');
  const [events, setEvents] = useState<ReviewEvent[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [entry, setEntry] = useState<Word | null>(null);
  const [replay, setReplay] = useState<{ start: number } | null>(null);
  const [clock, setClock] = useState<{ at: number; lit: number } | null>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [size, setSize] = useState(320);
  const [visible, setVisible] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bloom = useRef<HTMLCanvasElement | null>(null);
  const cache = useRef<{ scene: Scene | null; dpr: number; cv: HTMLCanvasElement | null }>({ scene: null, dpr: 0, cv: null });
  const moving = useRef<Placed | undefined>(undefined);

  // ---- the sky's fixed geometry -------------------------------------------------
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { order, stars } = useMemo(() => skyGeometry(), [WORDS.length]);
  const n = stars.length;
  const grid = useMemo(() => buildGrid(stars), [stars]);

  useEffect(() => { void loadLedger().then(setEvents); }, [v]);

  // Theme and size. The palette is read from the tokens at paint time, so a theme
  // switch repaints rather than keeping a stale ink.
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(Math.max(240, Math.min(560, Math.floor(el.clientWidth)))));
    ro.observe(el);
    const io = new IntersectionObserver((e) => setVisible(e.some((x) => x.isIntersecting)), { threshold: 0.25 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  // ---- what each star looks like today -------------------------------------------
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const looks = useMemo<Look[]>(() => looksFor(order, lens), [order, lens, v]);

  const counts = useMemo(() => {
    let lit = 0, known = 0, fading = 0;
    order.forEach((w, i) => {
      if (looks[i].lit) lit++;
      if (statusOf(w.id) === 'known') known++;
      if (looks[i].fading) fading++;
    });
    return { lit, known, fading, dark: n - lit };
  }, [looks, order, n]);

  const scene = useMemo<Scene>(() => ({ size, stars, looks, dark, rings: RINGS }), [size, stars, looks, dark]);
  const placed = useMemo(() => place(size, stars), [size, stars]);

  // When each star was first lit, and the replay's plan built from it.
  const plan = useMemo<Plan | null>(() => {
    if (!events) return null;
    const ids = new Set(order.map((w) => w.id));
    const cards = new Map<string, Card>();
    for (const w of order) { const c = cardOf(w.id); if (c) cards.set(w.id, c); }
    const idx = new Map(order.map((w, i) => [w.id, i]));
    const fl = firstLight(events, cards, ids).filter((e) => idx.has(e.id));
    if (!fl.length) return null;
    const when = new Float64Array(n).fill(Infinity);
    for (const e of fl) when[idx.get(e.id)!] = e.at;
    const ats = fl.map((e) => e.at);
    return { when, ats, reach: reachCurve(fl.map((e) => stars[idx.get(e.id)!].r)), t0: ats[0], t1: Math.max(ats[ats.length - 1], ats[0] + DAY) };
    // `v` stands for the cards read through `cardOf`, which the linter cannot see.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, order, stars, n, v]);

  // Words reviewed in the last day — they glint.
  const recent = useMemo(() => {
    if (!events) return [];
    const since = Date.now() - DAY;
    const idx = new Map(order.map((w, i) => [w.id, i]));
    const out = new Set<number>();
    for (const e of events) {
      if (e.at < since) continue;
      const i = idx.get(e.id);
      if (i !== undefined && looks[i].lit) out.add(i);
    }
    return [...out];
  }, [events, order, looks]);

  // ---- painting -----------------------------------------------------------------
  const paint = useCallback((now: number) => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(size * dpr)) { cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    bloom.current ??= document.createElement('canvas');

    if (replay && plan) {
      const f = replayFrame(plan, now - replay.start);
      const p = moving.current = place(size, stars, f.scale, f.rot, moving.current);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      paintSky(ctx, scene, f.lit, p, bloom.current);
      // Sparks: a star that has just lit flares and settles.
      ctx.save();
      ctx.beginPath(); ctx.arc(p.c, p.c, p.R + 9, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = token('--color-accent');
      if (dark) ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const k = f.spark(i);
        if (k <= 0) continue;
        ctx.globalAlpha = 0.5 * k * k;
        ctx.beginPath();
        ctx.arc(p.xs[i], p.ys[i], p.dot * (1 + 2.6 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // The finished sky, cached — repainted only when what it shows has changed.
    const c = cache.current;
    if (c.scene !== scene || c.dpr !== dpr || !c.cv) {
      c.cv ??= document.createElement('canvas');
      c.cv.width = Math.round(size * dpr); c.cv.height = Math.round(size * dpr);
      const o = c.cv.getContext('2d');
      if (!o) return;
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintSky(o, scene, (i) => looks[i].lit, placed, bloom.current);
      c.scene = scene; c.dpr = dpr;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(c.cv, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { xs, ys, dot } = placed;

    if (lens === 'memory' && !reduce) {
      // Fading stars breathe — a ring that swells and fades, about every two seconds.
      const phase = (now % 2200) / 2200;
      ctx.strokeStyle = token('--color-accent');
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55 * (1 - phase);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (!looks[i].fading) continue;
        const rr = dot * (1.6 + 3 * phase);
        ctx.moveTo(xs[i] + rr, ys[i]);
        ctx.arc(xs[i], ys[i], rr, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Today's words glint: a few at a time, each a four-point flare that opens
      // and closes. Chosen by the clock, so there is no state to keep.
      if (recent.length) {
        ctx.strokeStyle = ctx.fillStyle = dark ? '#ffffff' : token('--color-accent');
        ctx.lineCap = 'round';
        const slots = Math.min(10, recent.length);
        for (let s = 0; s < slots; s++) {
          const period = 2400 + s * 173;
          const t = now + s * 911;
          const cyc = Math.floor(t / period);
          const ph = (t % period) / period;
          const i = recent[(cyc * 7919 + s * 104_729) % recent.length];
          const amp = Math.sin(Math.PI * ph) ** 2;
          const L = dot * (2 + 5.5 * amp);
          ctx.globalAlpha = 0.9 * amp;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(xs[i] - L, ys[i]); ctx.lineTo(xs[i] + L, ys[i]);
          ctx.moveTo(xs[i], ys[i] - L); ctx.lineTo(xs[i], ys[i] + L);
          ctx.stroke();
          ctx.beginPath(); ctx.arc(xs[i], ys[i], dot * 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // Pointed-at and chosen stars.
    ctx.globalAlpha = 1;
    ctx.strokeStyle = token('--color-txt');
    for (const [i, w] of [[hover, 1], [selected, 1.5]] as const) {
      if (i === null) continue;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(xs[i], ys[i], Math.max(5, dot * 4), 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [size, n, stars, looks, scene, placed, replay, plan, dark, lens, reduce, selected, hover, recent]);

  // One loop for the replay, the breathing and the glints, and only while there is
  // something to move, the sky is on screen and the tab is visible.
  const animating = !!replay || (lens === 'memory' && !reduce && (counts.fading > 0 || recent.length > 0));
  useEffect(() => {
    // A correct frame first, always — before any loop, and whether or not the tab
    // is visible. The first version gated its paint on `document.hidden`, and a sky
    // mounted in a background tab painted nothing at all (caught in the browser
    // pane, which runs hidden). rAF does its own throttling; this must not.
    paint(performance.now());
    const onVis = () => paint(performance.now());
    document.addEventListener('visibilitychange', onVis);
    if (!animating || !visible) return () => document.removeEventListener('visibilitychange', onVis);
    let raf = 0, last = 0;
    const tick = (t: number) => {
      if (t - last > 30) {
        last = t;
        paint(t);
        if (replay && plan) {
          const f = replayFrame(plan, t - replay.start);
          setClock({ at: f.tNow, lit: f.count });
          if (f.p >= 1) { setReplay(null); setClock(null); }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  }, [animating, visible, paint, replay, plan]);

  // The backstop: rAF stalls in a hidden tab, timers do not. Whatever happens to
  // the frames, the replay ends and the finished sky is painted.
  useEffect(() => {
    if (!replay) return;
    const t = setTimeout(() => { setReplay(null); setClock(null); }, REPLAY_MS + 300);
    return () => clearTimeout(t);
  }, [replay]);

  // Replay once a day, on its own, the first time the sky is on screen, for a
  // learner with a history worth replaying.
  const canReplay = !!plan && plan.ats.length >= 12;
  useEffect(() => {
    if (!canReplay || reduce || !visible || document.hidden) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(REPLAYED_KEY) === today) return;
      localStorage.setItem(REPLAYED_KEY, today);
    } catch { return; }
    setReplay({ start: performance.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReplay, visible]);

  // ---- pointing at a star --------------------------------------------------------
  const at = (e: RPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const R = size / 2 - 10;
    const ux = (e.clientX - rect.left - size / 2) / R, uy = (e.clientY - rect.top - size / 2) / R;
    return nearest(grid, stars, ux, uy, Math.max(0.02, 2.2 / Math.sqrt(n)));
  };
  const pick = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (replay) { setReplay(null); setClock(null); return; }   // a tap skips to now
    const i = at(e);
    if (i !== null) { setSelected(i); haptic('grade'); }
  };
  const point = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'mouse' || replay) return;
    const i = at(e);
    if (i !== hover) setHover(i);
  };

  const word = selected !== null ? order[selected] : null;
  const fadingIds = useMemo(() => order.filter((_, i) => looks[i].fading).map((w) => w.id), [order, looks]);
  const hovered = hover !== null ? order[hover] : null;

  return (
    <section aria-labelledby="sky-h" className="mb-6">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-2">
        <div>
          <h2 id="sky-h" lang="de" className="headword text-2xl font-bold leading-tight">Dein Deutsch</h2>
          <p className="text-xs text-dim mt-0.5 max-w-[52ch]">
            Every word Lexi teaches — the commonest at the centre. The ones you’ve studied are lit, as brightly as you’d remember them today.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Colour the sky by">
          {LENSES.map((l) => (
            <button key={l.id} onClick={() => setLens(l.id)} aria-pressed={lens === l.id}
              className={`tap-44 rounded-full px-3 h-9 text-xs font-semibold transition active:scale-95
                ${lens === l.id ? 'bg-accent text-bg' : 'glass text-txt'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrap} className="relative w-full max-w-[560px] mx-auto">
        <canvas ref={canvas} onPointerDown={pick} onPointerMove={point} onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`${fmt(counts.lit)} of ${fmt(n)} words lit, ${fmt(counts.fading)} fading.`}
          style={{ width: size, height: size }}
          className={`block mx-auto touch-manipulation ${replay ? 'cursor-pointer' : 'cursor-crosshair'}`} />
        {clock && (
          <div className="absolute left-2 top-2 glass rounded-2xl px-3.5 py-2 pointer-events-none">
            <div className="font-mono text-2xs text-dim tabular-nums">
              {new Date(clock.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="text-lg font-bold tabular-nums leading-tight">{fmt(clock.lit)} <span className="text-xs font-semibold text-dim">words</span></div>
          </div>
        )}
        {clock && (
          <p className="absolute inset-x-0 bottom-1 text-center text-2xs text-dim pointer-events-none">tap to skip</p>
        )}
        {canReplay && !replay && !reduce && (
          <button onClick={() => { setSelected(null); setReplay({ start: performance.now() }); }}
            className="absolute right-1 top-1 tap-44 inline-flex items-center gap-1.5 rounded-full glass px-3 h-9 text-xs font-semibold active:scale-95 transition">
            <Play size={12} className="text-accent" /> Replay
          </button>
        )}
        {hovered && hover !== null && !replay && (
          <HoverChip word={hovered} x={placed.xs[hover]} y={placed.ys[hover]} />
        )}
      </div>

      {word && selected !== null ? (
        <StarDetail key={word.id} word={word} rank={freqRankOf(word.id)} events={events ?? []}
          onEntry={() => setEntry(word)} onClose={() => setSelected(null)} />
      ) : counts.lit === 0 ? (
        <p className="mt-2 text-center text-sm text-dim">Nothing lit yet. Your first session lights the centre — the words in every German sentence.</p>
      ) : (
        <p className="mt-2 text-center text-2xs text-dim">Tap a star to see that word’s memory — how it fades, and how each review makes it fade more slowly.</p>
      )}

      {/* The numbers the picture is made of, said in words. */}
      <div className="mt-3 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1 text-sm">
        <span><b className="font-mono tabular-nums"><CountUp value={counts.lit} format={fmt} /></b> <span className="text-dim">lit</span></span>
        {lens === 'memory' && <span><b className="font-mono tabular-nums text-green">{fmt(counts.known)}</b> <span className="text-dim">known</span></span>}
        {lens === 'memory' && counts.fading > 0 && <span><b className="font-mono tabular-nums text-accent">{fmt(counts.fading)}</b> <span className="text-dim">fading</span></span>}
        <span><b className="font-mono tabular-nums">{fmt(counts.dark)}</b> <span className="text-dim">still dark</span></span>
      </div>
      <Legend lens={lens} glints={recent.length > 0} fading={counts.fading > 0} />
      {lens === 'memory' && counts.fading > 0 && (
        <div className="mt-3 flex justify-center">
          <button onClick={() => onStudy({ kind: 'custom', name: 'Fading words', ids: fadingIds.slice(0, 60) })}
            className="tap-44 inline-flex items-center gap-2 rounded-full bg-accent text-bg font-bold text-sm px-5 h-11 active:scale-95 transition">
            Relight the {fmt(Math.min(60, counts.fading))} fading {counts.fading === 1 ? 'word' : 'words'}
          </button>
        </div>
      )}


      <AnimatePresence>
        {entry && <WordDetail key="sky-entry" word={entry} onClose={() => setEntry(null)} />}
      </AnimatePresence>
    </section>
  );
}

/** What a star is, on hover — mouse only; a tap opens the full detail below. */
function HoverChip({ word, x, y }: { word: Word; x: number; y: number }) {
  const st = statusOf(word.id);
  const c = cardOf(word.id);
  const r = c ? retrievability(c) : undefined;
  const above = y > 70;
  return (
    <div className="absolute z-10 pointer-events-none glass rounded-xl px-3 py-2 shadow-lg max-w-[220px]"
      style={{ left: x, top: y, transform: `translate(-50%, ${above ? 'calc(-100% - 14px)' : '14px'})` }}>
      <GenderTerm term={word.term} gender={word.gender} className="headword text-base font-bold leading-tight block" />
      <div className="text-2xs text-dim truncate">{word.en}</div>
      <div className="text-2xs font-mono tabular-nums mt-0.5">
        {st === 'new' ? <span className="text-dim">not met yet</span>
          : st === 'known' ? <span className="text-green">{r !== undefined ? `${Math.round(r * 100)}% recall` : 'known'}</span>
            : <span className="text-accent">learning</span>}
      </div>
    </div>
  );
}

function Legend({ lens, glints, fading }: { lens: Lens; glints: boolean; fading: boolean }) {
  const dot = (ink: string, label: string, alpha = 1) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-[8px] h-[8px] rounded-full" style={{ background: `var(${ink})`, opacity: alpha }} />
      {label}
    </span>
  );
  return (
    <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-2xs text-dim">
      {lens === 'memory' && <>
        {dot('--color-green', 'known — brighter recalls better, bigger lasts longer')}{dot('--color-accent', 'learning')}{dot('--color-line', 'not met yet')}
        {fading && <span className="inline-flex items-center gap-1.5"><span className="inline-block w-[9px] h-[9px] rounded-full border border-accent" />fading — due again</span>}
        {glints && <span className="inline-flex items-center gap-1.5"><span className="text-accent">✦</span>reviewed today</span>}
      </>}
      {lens === 'level' && <>{(['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const).map((l) => <span key={l}>{dot(`--color-${l}`, l.toUpperCase())}</span>)}</>}
      {lens === 'gender' && <>{dot('--color-der', 'der')}{dot('--color-die', 'die')}{dot('--color-das', 'das')}{dot('--color-dim', 'not a noun', 0.5)}</>}
      <span>rings: the 100 · 500 · 1k · 3k commonest words — the arc is how many you’ve lit</span>
    </p>
  );
}

// ---- one word's memory ---------------------------------------------------------------

function StarDetail({ word, rank, events, onEntry, onClose }: {
  word: Word; rank: number | null; events: ReviewEvent[]; onEntry: () => void; onClose: () => void;
}) {
  useStore();
  const card = cardOf(word.id);
  const status = statusOf(word.id);
  const r = card ? retrievability(card) : undefined;
  const mine = useMemo(() => events.filter((e) => e.id === word.id), [events, word.id]);
  const curve = useMemo<MemoryCurve>(() => memoryCurve(mine), [mine]);
  const saved = isSaved(word.id);
  const stability = curve.stabilities[curve.stabilities.length - 1] ?? card?.stability;
  const next = card && status !== 'new' ? Math.round((new Date(card.due).getTime() - Date.now()) / DAY) : null;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, []);

  return (
    <div ref={box} className="mt-3 mx-auto max-w-[560px] rounded-xl glass px-4 py-4 scroll-mb-28">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <GenderTerm as="h3" term={word.term} gender={word.gender} className="headword text-2xl font-bold leading-tight" />
          <p className="text-sm mt-0.5"><span className="text-dim">({word.pos})</span> {word.en}</p>
          <p className="mt-1 text-2xs text-dim font-mono">
            {rank ? `#${fmt(rank)} most common` : 'beyond the frequency list'} · {word.level}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-dim hover:text-txt text-2xs underline decoration-dotted">close</button>
      </div>

      {status === 'new' ? (
        <p className="mt-3 text-sm text-dim">Not met yet. Save it and Üben will teach it to you next.</p>
      ) : (
        <>
          <p className="mt-3 text-sm">
            <b className="font-mono tabular-nums">{r !== undefined ? Math.round(r * 100) : '—'}%</b>{' '}
            <span className="text-dim">chance you’d recall it today</span>
            {curve.reviews.length > 0 && <> · <span className="text-dim">{curve.reviews.length} review{curve.reviews.length === 1 ? '' : 's'}</span></>}
            {next !== null && <> · <span className="text-dim">{next <= 0 ? 'due now' : `next in ${next} day${next === 1 ? '' : 's'}`}</span></>}
          </p>
          {curve.points.length > 1 && <Curve curve={curve} />}
          <p className="mt-1 text-2xs text-dim leading-relaxed">
            Each review sends it back to 100%, and it falls more slowly after every one — that’s why the gaps between reviews keep growing.
            {stability ? <> It now stays above 90% for about <b className="text-txt">{stability < 1 ? 'a day' : `${Math.round(stability)} days`}</b>.</> : null}
            {' '}Reconstructed from your reviews with today’s scheduler settings.
          </p>
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => { toggleSaved(word.id); haptic('grade'); }} aria-pressed={saved}
          className={`tap-44 inline-flex items-center gap-1.5 rounded-full px-3.5 h-10 text-sm font-semibold active:scale-95 transition
            ${saved ? 'bg-accent text-bg' : 'glass text-accent'}`}>
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {saved ? 'Saved' : 'Save'}
        </button>
        <button onClick={onEntry} className="tap-44 inline-flex items-center gap-1.5 rounded-full glass px-3.5 h-10 text-sm font-semibold active:scale-95 transition">
          <Info size={15} className="text-accent" /> Entry
        </button>
      </div>
    </div>
  );
}

/** The sawtooth. Drawn as SVG so it is crisp, themed by tokens and readable by the
 *  same accessibility tree as the rest of the page. It does not draw itself in: a
 *  stroke that animates from invisible is content hidden by a stalled frame
 *  (DESIGN §7). The motion is additive — a ring pulsing at today's point.
 *
 *  The vertical axis runs from 100% down to just below the lowest point the memory
 *  reached, not to 0: FSRS reviews a word at around 90%, and on a 0–100 axis the
 *  whole sawtooth is a flat line along the top. The floor is labelled. */
function Curve({ curve }: { curve: MemoryCurve }) {
  const W = 320, H = 110, padL = 26, padR = 8, padT = 8, padB = 16;
  const t0 = curve.points[0].t;
  const t1 = curve.points[curve.points.length - 1].t;
  const target = retention();
  const low = Math.min(target, ...curve.points.map((p) => p.r));
  const floor = Math.max(0, Math.min(0.7, Math.floor((low - 0.05) * 10) / 10));
  const x = (t: number) => padL + ((t - t0) / Math.max(1, t1 - t0)) * (W - padL - padR);
  const y = (r: number) => padT + ((1 - r) / (1 - floor)) * (H - padT - padB);
  const d = curve.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.r).toFixed(1)}`).join(' ');
  const area = `${d} L${x(t1).toFixed(1)},${H - padB} L${x(t0).toFixed(1)},${H - padB} Z`;
  const last = curve.points[curve.points.length - 1];
  const date = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const mono = { fontSize: 8, fill: 'var(--color-dim)', fontFamily: 'var(--font-mono)' } as const;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full h-auto" role="img"
      aria-label={`Memory over ${Math.max(1, Math.round((t1 - t0) / DAY))} days and ${curve.reviews.length} reviews; ${Math.round(last.r * 100)}% today`}>
      <defs>
        <linearGradient id="sky-curve-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-green)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-green)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sky-curve-fill)" />
      <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke="var(--color-line)" strokeDasharray="3 4" />
      <text x={padL - 4} y={y(1) + 3} textAnchor="end" {...mono}>100%</text>
      <text x={padL - 4} y={y(target) + 3} textAnchor="end" {...mono}>{Math.round(target * 100)}%</text>
      {floor < target - 0.08 && <text x={padL - 4} y={y(floor) + 1} textAnchor="end" {...mono}>{Math.round(floor * 100)}%</text>}
      <text x={padL} y={H - 4} {...mono}>{date(t0)}</text>
      <text x={W - padR} y={H - 4} textAnchor="end" {...mono}>today</text>
      <path d={d} fill="none" stroke="var(--color-green)" strokeWidth="1.75" strokeLinejoin="round" />
      {curve.reviews.map((rv, i) => (
        <circle key={i} cx={x(rv.t)} cy={y(1)} r="3"
          fill={rv.g === 1 ? 'var(--color-red)' : 'var(--color-green)'} stroke="var(--color-panel)" strokeWidth="1" />
      ))}
      <circle className="sky-now" cx={x(last.t)} cy={y(last.r)} r="5" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
      <circle cx={x(last.t)} cy={y(last.r)} r="3" fill="var(--color-accent)" />
    </svg>
  );
}

// ---- nearest-star lookup ---------------------------------------------------------------

interface Grid { cells: Map<string, number[]>; cell: number }
function buildGrid(stars: Star[]): Grid {
  const cell = Math.max(0.02, 2.5 / Math.sqrt(Math.max(1, stars.length)));
  const cells = new Map<string, number[]>();
  stars.forEach((s, i) => {
    const k = `${Math.floor(s.x / cell)},${Math.floor(s.y / cell)}`;
    const a = cells.get(k);
    if (a) a.push(i); else cells.set(k, [i]);
  });
  return { cells, cell };
}
function nearest(g: Grid, stars: Star[], ux: number, uy: number, maxD: number): number | null {
  const cx = Math.floor(ux / g.cell), cy = Math.floor(uy / g.cell);
  let best: number | null = null, bd = maxD * maxD;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    for (const i of g.cells.get(`${cx + dx},${cy + dy}`) ?? []) {
      const s = stars[i];
      const d = (s.x - ux) ** 2 + (s.y - uy) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}
