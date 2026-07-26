// Die Wörterbörse — the dictionary market as a drill-down treemap. Level 1 is the
// theme GROUPS; tap a tile to zoom into that group’s SECTORS (level 2), with an
// in-place back. Every tile: AREA = cards in it, COLOUR = % known (slate→green),
// and the % is the primary glyph so it reads on a phone. A Markt/Liste toggle
// swaps the treemap for a plain ranked list on the smallest screens; the CEFR
// filter rescopes the whole terminal.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Play, ArrowLeft, LayoutGrid, List } from 'lucide-react';
import { groupStats, sectorStats, groupDeltas } from '../store.ts';
import { useStore } from '../useStore.ts';
import { squarify, type Tile } from '../lib/treemap.ts';
import { heat, heatText, tileInk, fmt } from '../lib/ui.ts';
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

  // Tap: at group level zoom in; at sector level study it. Right-click: study.
  const tap = (c: Cell) => { if (zoom) onStudy({ kind: 'sector', name: c.name }); else { setZoom(c.name); setHover(null); } };
  const study = (c: Cell) => (zoom ? onStudy({ kind: 'sector', name: c.name }) : onStudyGroup(c.name));

  // "Study this group directly" used to be right-click only — an affordance
  // that does not exist on a phone, described in a hint that was itself hidden
  // on phones. Long-press is the touch equivalent; one timer is enough because
  // only one tile can be under a finger at a time.
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
            {tiles.map((t, idx) => {
              const c = t.data, p = c.count ? c.known / c.count : 0, big = t.w > 118 && t.h > 62, mid = t.w > 76 && t.h > 42;
              const ink = tileInk(p);
              const d = !zoom ? (deltas?.get(c.name) ?? 0) : 0;
              return (
                <button key={c.name}
                  onClick={() => { if (longFired.current) { longFired.current = false; return; } tap(c); }}
                  onContextMenu={(e) => { e.preventDefault(); study(c); }}
                  onPointerDown={() => pressStart(c)}
                  onPointerUp={pressEnd}
                  onPointerLeave={() => { pressEnd(); setHover(null); }}
                  onPointerCancel={pressEnd}
                  onMouseMove={(e) => setHover({ c, x: e.clientX, y: e.clientY })}
                  className="tile-in absolute overflow-hidden border border-bg transition-[filter,transform] duration-100 hover:brightness-115 hover:outline hover:outline-2 hover:outline-amber hover:z-10 text-left"
                  style={{ left: t.x, top: t.y, width: t.w, height: t.h, background: heat(p), animationDelay: `${Math.min(idx * 14, 240)}ms` }}>
                  <span className="absolute inset-0 p-2 flex flex-col justify-between pointer-events-none" style={{ color: ink }}>
                    <span className="font-semibold leading-tight" style={{ fontSize: big ? 12 : 11, textShadow: '0 1px 2px rgba(0,0,0,.45)' }}>
                      {mid ? c.name : shortName(c.name)}
                    </span>
                    <span className="flex items-end justify-between gap-1">
                      <span className="min-w-0">
                        <span className="font-mono font-bold block leading-none" style={{ fontSize: big ? 26 : mid ? 18 : 13, textShadow: '0 1px 2px rgba(0,0,0,.45)' }}>{Math.round(p * 100)}%</span>
                        {big && <span className="block font-mono opacity-90 mt-1 truncate" style={{ fontSize: 11 }}>{fmt(c.known)}/{fmt(c.count)} · {c.sub}</span>}
                      </span>
                      {mid && d > 0 && <span className="font-mono font-semibold flex-shrink-0" style={{ fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,.45)' }}>▲{d}</span>}
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
                <Row k="Coverage" val={`${Math.round(hover.c.coverage * 100)}%`} valColor={heat(hover.c.coverage)} />
                <Row k="Due today" val={`${fmt(hover.c.due)}`} />
                <div className="mt-1.5 text-amber">{zoom ? '▸ click = study · right-click = study' : '▸ click = open sectors · right-click = study'}</div>
              </Card>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-line text-2xs text-dim flex-wrap">
          <span>0%</span>
          {/* Built from heat() itself, so the key can never drift from the scale
              it documents (it used to be three hand-copied hex stops). */}
          <span className="h-2.5 w-40 rounded-sm"
            style={{ background: `linear-gradient(90deg, ${heat(0)}, ${heat(0.5)}, ${heat(1)})` }} />
          <span>100% known</span>
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
        className={`flex items-center gap-1 px-2 py-1.5 text-xs ${!list ? 'bg-panel2 text-amber' : 'text-dim hover:text-txt'}`}><LayoutGrid size={13} /> Markt</button>
      <button onClick={() => onChange(true)} aria-label="List view" aria-pressed={list}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs border-l border-line ${list ? 'bg-panel2 text-amber' : 'text-dim hover:text-txt'}`}><List size={13} /> Liste</button>
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
