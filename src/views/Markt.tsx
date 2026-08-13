// Die Wörterbörse — the dictionary market as a drill-down treemap. Level 1 is the
// theme GROUPS; tap a tile to zoom into that group’s SECTORS (level 2), with an
// in-place back. Every tile: AREA = cards in it, COLOUR = % known (slate→green),
// and the % is the primary glyph so it reads on a phone. A Markt/Liste toggle
// swaps the treemap for a plain ranked list on the smallest screens; the CEFR
// filter rescopes the whole terminal.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, ArrowLeft, LayoutGrid, List } from 'lucide-react';
import { groupStats, sectorStats, groupDeltas, lastSeen, markSeen, totals } from '../store.ts';
import { useStore } from '../useStore.ts';
import { squarify, type Tile } from '../lib/treemap.ts';
import { heat, heatText, makeHeatScale, heatFill, fmt } from '../lib/ui.ts';
import { Illustration } from '../lib/illustration.tsx';
import type { Target } from '../types.ts';
import LevelFilter from '../components/LevelFilter.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import IconButton from '../components/ui/IconButton.tsx';

interface Cell { name: string; count: number; known: number; due: number; coverage: number; sub: string; }

export default function Markt({ onStudy, onStudyGroup, onStudyAll, onOpenGroup }:
  { onStudy: (t: Target) => void; onStudyGroup: (g: string) => void; onStudyAll: () => void; onOpenGroup: (g: string) => void }) {
  const v = useStore();
  const [zoom, setZoom] = useState<string | null>(null);   // the group being drilled into
  const [list, setList] = useState(false);                  // Markt (treemap) / Liste (list)
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 560 });
  const [hover, setHover] = useState<{ c: Cell; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;                       // list mode: the treemap box isn’t mounted
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [list]);

  const deltas = useMemo(() => groupDeltas(7), [v]);

  const cells: Cell[] = useMemo(() => {
    if (zoom) return sectorStats(zoom).map((s) => ({ name: s.name, count: s.count, known: s.known, due: s.due, coverage: s.coverage, sub: s.levels.join('/') }));
    return groupStats().map((s) => ({ name: s.name, count: s.count, known: s.known, due: s.due, coverage: s.coverage, sub: `${s.sectors} sectors` }));
  }, [zoom, v]);

  const tiles: Tile<Cell>[] = useMemo(
    () => squarify(cells.map((c) => ({ value: c.count, data: c })), 0, 0, size.w, size.h),
    [cells, size.w, size.h]);

  /** The quantity a tile is painted and labelled with: share of the tile that
   *  is *Known*. Deliberately not `Stat.coverage`, which counts cards that have
   *  merely left the New state — classifying one and painting the other put the
   *  whole ramp above the data and rendered every tile in class 0. One function,
   *  used by the scale, the tiles and the list, so they cannot drift apart. */
  const known = (c: Cell) => (c.count ? c.known / c.count : 0);

  // The scale is built from the cells *currently on screen*, so drilling into a
  // group reclassifies against that group's own sectors. The alternative —
  // one global scale — is what made every tile the same colour: a group whose
  // sectors all sit between 20% and 30% should still show which is thinnest.
  const scale = useMemo(() => makeHeatScale(cells.map((c) => (c.count ? c.known / c.count : 0))), [cells]);

  // What the map looked like the last time this learner opened it. Captured
  // once, on mount, *before* anything is recorded — so the tiles that moved
  // since can travel from the colour they were. Only at group level: sector
  // coverage isn't in the seen-state, and inventing a baseline for it would
  // animate a lie.
  const seenAtMount = useRef(zoom ? null : lastSeen());
  // One paint at the old colours, then the truth. Driven by a timer rather than
  // a frame callback precisely so a paused tab cannot leave the map showing
  // last week's colours as if they were current.
  const [atOldColours, setAtOldColours] = useState(!zoom && !!seenAtMount.current);
  useEffect(() => {
    if (!atOldColours) return;
    const t = setTimeout(() => setAtOldColours(false), 50);
    return () => clearTimeout(t);
  }, [atOldColours]);

  useEffect(() => {
    if (zoom || cells.length === 0) return;
    // A timeout, not a rAF: the record must happen even in a tab whose frame
    // callbacks are paused, or the next visit would replay this same animation
    // against a stale baseline forever.
    const t = setTimeout(() => {
      const groups: Record<string, number> = {};
      for (const c of cells) groups[c.name] = c.count ? c.known / c.count : 0;
      // `totals().known`, not the sum of the cells: that is the number the
      // headline renders, and the two must animate from one baseline.
      markSeen(totals().known, groups);
    }, 1000);
    return () => clearTimeout(t);
  }, [zoom, cells]);

  // Tap: at group level zoom in; at sector level study it. Right-click: study.
  const tap = (c: Cell) => { if (zoom) onStudy({ kind: 'sector', name: c.name }); else { setZoom(c.name); setHover(null); } };
  const study = (c: Cell) => (zoom ? onStudy({ kind: 'sector', name: c.name }) : onStudyGroup(c.name));

  // "Study this group directly" used to be right-click only — an affordance
  // that does not exist on a phone, described in a hint that was itself hidden
  // on phones. Long-press is the touch equivalent; one timer is enough because
  // only one tile can be under a finger at a time.
  const reduce = useReducedMotion();
  // The shared element's escape hatch. See the block comment where it renders.
  const sharedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduce || !zoom) return;
    // The same backstop `CountUp` runs, for the same reason and against the same
    // failure. rAF is throttled in a hidden tab, and a framer `layout` animation
    // then freezes on its `from` projection: measured here at
    // `matrix(0.254, 0, 0, 0.936, -399.5, 0)` a full second after the drill-in,
    // with `getAnimations()` empty and the layout box already correct at
    // 1098×516. Only the transform was wrong, and nothing was going to fix it.
    //
    // Timers keep running when rAF does not, so one pass past the duration
    // guarantees the resting geometry is the true one — which is the rule the
    // rest of §7 gets by being transform-only, and which a layout animation
    // cannot get that way because the transform *is* the mechanism.
    const id = setTimeout(() => {
      const el = sharedRef.current;
      if (el && el.style.transform && el.style.transform !== 'none') el.style.transform = 'none';
    }, 360);
    return () => clearTimeout(id);
  }, [zoom, reduce]);
  const pressTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const pressStart = (c: Cell) => {
    longFired.current = false;
    pressTimer.current = window.setTimeout(() => { longFired.current = true; study(c); }, 500);
  };
  const pressEnd = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  return (
    <div>
      <Card pad="none">
        <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
          {zoom ? (
            <>
              <IconButton label="Back to groups" pull onClick={() => { setZoom(null); setHover(null); }}><ArrowLeft size={18} /></IconButton>
              <h2 className="text-xs sm:text-base font-semibold truncate max-w-[38vw] sm:max-w-none">{zoom}</h2>
            </>
          ) : (
            <>
              <span className="live-dot" title="Live — reflects your FSRS progress" />
              <h2 className="text-xs sm:text-base font-semibold">Knowledge Heatmap</h2>
            </>
          )}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Toggle list={list} onChange={setList} />
            <LevelFilter />
            {zoom
              ? <Button size="sm" onClick={() => onStudyGroup(zoom)}><Play size={13} /> Study {shortName(zoom)}</Button>
              : <Button size="sm" onClick={onStudyAll}><Play size={13} /> Study all</Button>}
          </div>
        </div>

        {list ? (
          <ListView cells={[...cells].sort((a, b) => (b.due - a.due) || (a.coverage - b.coverage))} zoom={!!zoom} onTap={tap} onStudy={study} />
        ) : (
          <div ref={boxRef} className="relative w-full" style={{ height: 'min(60vh, 580px)' }}>
            {/* color-mix keeps the glow on the accent token, so it follows the
                theme instead of re-encoding Glacier cyan as a literal. */}
            <div className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--color-amber) 6%, transparent), transparent 70%)' }} />
            {tiles.length === 0 && (
              <div className="absolute inset-0 grid place-items-center text-dim text-xs px-6 text-center">No sectors at the selected CEFR levels — widen the filter.</div>
            )}

            {/* Shared-element continuity, tile → sector (DESIGN.md §7).
                Drilling in used to be a hard swap: ten group tiles vanished and
                twenty-three sector tiles appeared, and nothing said the second
                set lived *inside* the first. This is the same object on both
                sides — the group's own frame, expanding from the tile you tapped
                to enclose the sectors it contains.

                **It is a backdrop, never a control, and that is deliberate.**
                A `layout` animation drives position and size with transforms, so
                a stalled one leaves whatever it drives in the wrong place. This
                file's own history says what that costs: `.desk-in` was caught
                holding every 44px control in the session at 43.34px because an
                entrance stalled on its `from` frame. Putting the shared element
                on the tiles themselves would repeat that with a far bigger
                displacement. Here the worst case is a decorative outline in the
                wrong place, with every tile exactly where it belongs and fully
                interactive. */}
            {!reduce && zoom && (
              <motion.div
                ref={sharedRef}
                layoutId={`zoom-${zoom}`}
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-sm z-0"
                style={{ outline: '2px solid var(--color-amber)', outlineOffset: -2 }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              />
            )}
            {tiles.map((t, idx) => {
              const c = t.data, p = known(c), big = t.w > 118 && t.h > 62, mid = t.w > 76 && t.h > 42;
              // The subline is two facts joined by a separator, and at `big`
              // the second one was being cut mid-word ("22 secto…"). A count
              // sliced in half is worse than a count omitted, so the sector
              // tally only appears once there is genuinely room for it.
              const wide = t.w > 190;
              const ink = scale.ink(p);
              const d = !zoom ? (deltas?.get(c.name) ?? 0) : 0;
              // Only tiles that actually crossed a class boundary animate. A
              // territory that gained two words and stayed in the same band has
              // nothing to show, and colouring it anyway would be theatre.
              const was = seenAtMount.current?.groups[c.name];
              const shifted = was !== undefined && scale.classOf(was) !== scale.classOf(p);
              return (
                <button key={c.name}
                  onClick={() => { if (longFired.current) { longFired.current = false; return; } tap(c); }}
                  onContextMenu={(e) => { e.preventDefault(); study(c); }}
                  onPointerDown={() => pressStart(c)}
                  onPointerUp={pressEnd}
                  onPointerLeave={() => { pressEnd(); setHover(null); }}
                  onPointerCancel={pressEnd}
                  onMouseMove={(e) => setHover({ c, x: e.clientX, y: e.clientY })}
                  // `active:` completes the affordance the stylesheet was already dressed
                  // for: `.tile` has declared `transition: filter .1s` since it was
                  // written and nothing ever moved a filter on press, so a tile
                  // acknowledged the pointer on the way in and went dead under it.
                  // Brightness rather than scale — tiles are laid edge to edge, and
                  // scaling one opens a gap to its neighbours.
                  className={`tile ${shifted ? '' : 'tile-in'} absolute overflow-hidden border border-bg hover:brightness-105 active:brightness-90 hover:outline hover:outline-2 hover:outline-amber hover:z-10 text-left`}
                  style={{
                    left: t.x, top: t.y, width: t.w, height: t.h,
                    // The old colour for exactly one paint, then the real one.
                    background: shifted && atOldColours ? heatFill(scale.classOf(was!)) : scale.fill(p),
                    animationDelay: shifted ? '0ms' : `${Math.min(idx * 14, 240)}ms`,
                  }}>
                  {/* The other half of the shared element. Only at group level:
                      a sector tile drills into nothing, so it has no twin. */}
                  {!reduce && !zoom && (
                    <motion.span
                      layoutId={`zoom-${c.name}`}
                      aria-hidden
                      className="absolute inset-0 pointer-events-none rounded-sm"
                      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                    />
                  )}
                  {/* No text-shadow any more. It existed to rescue a single ink
                      colour guessed against an arbitrary fill; ink is now paired
                      to its class in the stylesheet, so the contrast is decided
                      rather than compensated for. */}
                  <span className="absolute inset-0 p-2 flex flex-col justify-between pointer-events-none" style={{ color: ink }}>
                    <span className="font-semibold leading-tight" style={{ fontSize: big ? 12 : 11 }}>
                      {mid ? c.name : shortName(c.name)}
                    </span>
                    <span className="flex items-end justify-between gap-1">
                      <span className="min-w-0">
                        <span className="font-mono font-bold block leading-none" style={{ fontSize: big ? 26 : mid ? 18 : 13 }}>{Math.round(p * 100)}%</span>
                        {big && <span className="block font-mono opacity-80 mt-1 truncate" style={{ fontSize: 11 }}>{fmt(c.known)}/{fmt(c.count)}{wide ? ` · ${c.sub}` : ''}</span>}
                      </span>
                      {mid && d > 0 && <span className="font-mono font-semibold flex-shrink-0 opacity-80" style={{ fontSize: 11 }}>▲{d}</span>}
                    </span>
                  </span>
                </button>
              );
            })}

            {hover && (
              <Card tone="card" nested pad="none" accent
                className="fixed z-50 pointer-events-none px-3 py-2.5 text-xs shadow-2xl"
                style={{ left: Math.min(hover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 250), top: hover.y + 14, width: 230 }}>
                <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><Illustration sector={hover.c.name} size={15} className="text-amber flex-shrink-0" /> {hover.c.name}</h4>
                <Row k="Cards" val={`${fmt(hover.c.count)} · ${hover.c.sub}`} />
                <Row k="Known" val={`${fmt(hover.c.known)}`} />
                <Row k="Coverage" val={`${Math.round(hover.c.coverage * 100)}%`} valColor={heatText(hover.c.coverage)} />
                <Row k="Due today" val={`${fmt(hover.c.due)}`} />
                <div className="mt-1.5 text-amber">{zoom ? '▸ click = study · right-click = study' : '▸ click = open sectors · right-click = study'}</div>
              </Card>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-line text-2xs text-dim flex-wrap">
          {/* A classed key, not a gradient — because the map is now classed.
              Built from the live scale, so it can never drift from what the
              tiles are painted with, and it states the range it actually covers
              instead of implying a 0–100% span the data never uses. */}
          <span className="font-mono">{Math.round(scale.domain[0] * 100)}%</span>
          <span className="flex rounded-sm overflow-hidden" aria-hidden>
            {[0, 1, 2, 3, 4].map((k) => (
              <span key={k} className="h-2.5 w-8" style={{ background: heatFill(k) }} />
            ))}
          </span>
          <span className="font-mono">{Math.round(scale.domain[1] * 100)}%</span>
          <span>known · {scale.breaks.length ? 'five classes, equal count' : 'proportional'}</span>
          {/* Was hidden below sm — which removed the only explanation of the
              interaction from the screens that have no right-click at all. */}
          <span className="ml-auto">{zoom ? 'Tap a sector to study it' : 'Tap a group to drill in · long-press to study it directly'}</span>
          {zoom && <button onClick={() => onOpenGroup(zoom)} className="text-amber hover:underline sm:ml-3">All decks →</button>}
        </div>
      </Card>
    </div>
  );
}

function Toggle({ list, onChange }: { list: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex rounded-md border border-line overflow-hidden">
      {/* The labels used to be hidden below sm, leaving two unlabelled icons on
          exactly the screens where the list view matters most. */}
      <button onClick={() => onChange(false)} aria-label="Treemap view" aria-pressed={!list}
        className={`tap-44 flex items-center gap-1 px-2 py-1.5 text-xs ${!list ? 'bg-panel2 text-amber' : 'text-dim hover:text-txt'}`}><LayoutGrid size={13} /> Markt</button>
      <button onClick={() => onChange(true)} aria-label="List view" aria-pressed={list}
        className={`tap-44 flex items-center gap-1 px-2 py-1.5 text-xs border-l border-line ${list ? 'bg-panel2 text-amber' : 'text-dim hover:text-txt'}`}><List size={13} /> Liste</button>
    </div>
  );
}

function ListView({ cells, zoom, onTap, onStudy }: { cells: Cell[]; zoom: boolean; onTap: (c: Cell) => void; onStudy: (c: Cell) => void }) {
  if (cells.length === 0) {
    return <div className="grid place-items-center py-16 text-dim text-xs px-6 text-center">No sectors at the selected CEFR levels — widen the filter.</div>;
  }
  return (
    <div className="divide-y divide-[var(--color-line)] max-h-[min(60vh,580px)] overflow-y-auto">
      {cells.map((c) => {
        const p = c.count ? c.known / c.count : 0;
        return (
          <div key={c.name} className="flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-panel2">
            <button onClick={() => onTap(c)} className="flex-1 min-w-0 text-left" title={zoom ? 'Study sector' : 'Open sectors'}>
              <div className="flex items-baseline gap-2">
                <Illustration sector={c.name} size={16} className="text-amber flex-shrink-0" />
                <span className="text-sm font-semibold truncate">{c.name}</span>
                <span className="text-2xs text-dim font-mono flex-shrink-0">{c.sub}</span>
              </div>
              <div className="relative h-1.5 bg-panel2 rounded-sm mt-1.5 overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${Math.max(2, p * 100)}%`, background: heat(p) }} />
              </div>
            </button>
            <span className="font-mono font-bold text-base tabular-nums w-12 text-right" style={{ color: heatText(p) }}>{Math.round(p * 100)}%</span>
            <IconButton label={`Study ${c.name}`} onClick={() => onStudy(c)} className="hover:text-green"><Play size={16} /></IconButton>
          </div>
        );
      })}
    </div>
  );
}

function shortName(s: string) { return s.split(/[ ,&]/)[0]; }

function Row({ k, val, valColor }: { k: string; val: string; valColor?: string }) {
  return (
    <div className="flex justify-between gap-4 font-mono text-dim">
      <span>{k}</span><b style={{ color: valColor ?? 'var(--color-txt)' }}>{val}</b>
    </div>
  );
}
