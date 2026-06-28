// Die Wörterbörse — the dictionary market. A squarified treemap where every
// tile is a theme GROUP: AREA = cards in the group, COLOUR = % learned
// (red→amber→green). Hover for detail; click to drill into its sectors; or
// study the whole group. A CEFR filter rescopes the entire terminal.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { groupStats } from '../store.ts';
import { useStore } from '../useStore.ts';
import { squarify, type Tile } from '../lib/treemap.ts';
import { heat, tileInk, fmt } from '../lib/ui.ts';
import type { GroupStat } from '../types.ts';
import Kpis from '../components/Kpis.tsx';
import LevelFilter from '../components/LevelFilter.tsx';

export default function Markt({ onOpenGroup, onStudyGroup, onStudyAll }:
  { onOpenGroup: (g: string) => void; onStudyGroup: (g: string) => void; onStudyAll: () => void }) {
  const v = useStore();
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 560 });
  const [hover, setHover] = useState<{ s: GroupStat; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const tiles: Tile<GroupStat>[] = useMemo(() => {
    const stats = groupStats();
    return squarify(stats.map((s) => ({ value: s.count, data: s })), 0, 0, size.w, size.h);
  }, [size.w, size.h, v]);

  return (
    <div>
      <Kpis />
      <div className="bg-panel border border-line rounded-[10px]">
        <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
          <span className="live-dot" title="Live — reflects your FSRS progress" />
          <h2 className="text-[13px] sm:text-[14px] font-semibold">The Word Exchange · German Dictionary Market</h2>
          <span className="text-[10px] text-amber border border-line px-1.5 py-0.5 rounded-full tracking-[1px] hidden sm:inline">THEME HEATMAP</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <LevelFilter />
            <button onClick={onStudyAll} className="flex items-center gap-1.5 bg-amber text-bg font-bold rounded-md px-3 py-1.5 text-[12px] hover:brightness-105">
              <Play size={13} /> Study all
            </button>
          </div>
        </div>

        <div ref={boxRef} className="relative w-full" style={{ height: 'min(60vh, 580px)' }}>
          {/* soft glow behind the floor */}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(255,176,0,.06), transparent 70%)' }} />
          {tiles.map((t, idx) => {
            const s = t.data, p = s.coverage, big = t.w > 120 && t.h > 64, mid = t.w > 78 && t.h > 44;
            const ink = tileInk(p);
            return (
              <button key={s.name}
                onClick={() => onOpenGroup(s.name)}
                onContextMenu={(e) => { e.preventDefault(); onStudyGroup(s.name); }}
                onMouseMove={(e) => setHover({ s, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHover(null)}
                className="tile-in absolute overflow-hidden border border-[#05070b] transition-[filter,transform] duration-100 hover:brightness-115 hover:outline hover:outline-2 hover:outline-amber hover:z-10 text-left"
                style={{ left: t.x, top: t.y, width: t.w, height: t.h, background: heat(p), animationDelay: `${Math.min(idx * 14, 240)}ms` }}>
                <span className="absolute inset-0 p-2 flex flex-col justify-between pointer-events-none" style={{ color: ink }}>
                  <span className="font-bold leading-tight" style={{ fontSize: big ? 14 : 11, textShadow: '0 1px 2px rgba(0,0,0,.45)' }}>
                    {mid ? s.name : s.name.split(/[ ,&]/)[0]}
                  </span>
                  <span>
                    {big && <span className="block font-mono opacity-90" style={{ fontSize: 11 }}>{fmt(s.learned)}/{fmt(s.count)} · {s.sectors} sectors</span>}
                    <span className="font-mono font-bold" style={{ fontSize: big ? 19 : 12, textShadow: '0 1px 2px rgba(0,0,0,.45)' }}>{Math.round(p * 100)}%</span>
                  </span>
                </span>
              </button>
            );
          })}

          {hover && (
            <div className="fixed z-50 pointer-events-none bg-[#06080c] border border-amber rounded-lg px-3 py-2.5 text-[12px] shadow-2xl"
              style={{ left: Math.min(hover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 250), top: hover.y + 14, width: 230 }}>
              <h4 className="text-[13px] font-semibold mb-1.5">{hover.s.name}</h4>
              <Row k="Cards" val={`${fmt(hover.s.count)} · ${hover.s.sectors} sectors`} />
              <Row k="Learned" val={`${fmt(hover.s.learned)}`} />
              <Row k="Consolidated" val={`${fmt(hover.s.known)}`} />
              <Row k="Coverage" val={`${Math.round(hover.s.coverage * 100)}%`} valColor={heat(hover.s.coverage)} />
              <Row k="Due today" val={`${fmt(hover.s.due)}`} />
              <div className="mt-1.5 text-amber">▸ click = sectors · right-click = study</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-line text-[11px] text-dim flex-wrap">
          <span>0%</span>
          <span className="h-2.5 w-40 rounded" style={{ background: 'linear-gradient(90deg,#ea3943,#ffb000,#16c784)' }} />
          <span>100% learned</span>
          <span className="ml-auto hidden md:inline">Click opens a group's sectors · right-click starts a study session</span>
        </div>
      </div>
    </div>
  );
}

function Row({ k, val, valColor }: { k: string; val: string; valColor?: string }) {
  return (
    <div className="flex justify-between gap-4 font-mono text-dim">
      <span>{k}</span><b style={{ color: valColor ?? 'var(--color-txt)' }}>{val}</b>
    </div>
  );
}
