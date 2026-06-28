// Die Galaxie — the whole lexicon as one constellation. Every star is a word,
// clustered sector-by-sector inside its theme group. Colour = your FSRS status,
// so the map greens up as you learn. Canvas with pan/zoom and level-of-detail
// labels (groups → sectors → words). Click a star to open its sector map.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Maximize2, Network } from 'lucide-react';
import { WORDS, GROUP_SECTORS, WORDS_BY_SECTOR } from '../data/index.ts';
import { statusOf, groupStats } from '../store.ts';
import { useStore } from '../useStore.ts';
import { heat } from '../lib/ui.ts';
import type { Target, Word } from '../types.ts';

const STATUS_COLOR = { new: '#39424f', learning: '#ffb000', known: '#16c784' } as const;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

interface Pt { x: number; y: number; w: Word; sector: string; group: string; }
interface GroupBlob { name: string; x: number; y: number; r: number; }

/** Deterministic group→sector→word layout. Pure geometry, no simulation. */
function buildLayout() {
  const groups = [...GROUP_SECTORS.keys()];
  const RG = 2600;                 // radius of the ring of groups
  const pts: Pt[] = [];
  const blobs: GroupBlob[] = [];
  const sectorCenters: { name: string; x: number; y: number }[] = [];

  groups.forEach((group, gi) => {
    const ga = (gi / groups.length) * Math.PI * 2;
    const gx = Math.cos(ga) * RG, gy = Math.sin(ga) * RG;
    const sectors = (GROUP_SECTORS.get(group) ?? []).filter((s) => (WORDS_BY_SECTOR.get(s)?.length ?? 0) > 0);
    const RS = 360 + sectors.length * 24; // sector sub-ring grows with sector count
    let maxR = 0;
    sectors.forEach((sector, si) => {
      const sa = (si / Math.max(sectors.length, 1)) * Math.PI * 2 + gi;
      const sx = gx + Math.cos(sa) * RS, sy = gy + Math.sin(sa) * RS;
      sectorCenters.push({ name: sector, x: sx, y: sy });
      const words = WORDS_BY_SECTOR.get(sector) ?? [];
      const spacing = 13;
      words.forEach((w, k) => {
        const r = spacing * Math.sqrt(k + 0.5);
        const a = k * GOLDEN;
        pts.push({ x: sx + Math.cos(a) * r, y: sy + Math.sin(a) * r, w, sector, group });
      });
      const dist = RS + Math.sqrt(words.length) * spacing;
      maxR = Math.max(maxR, dist);
    });
    blobs.push({ name: group, x: gx, y: gy, r: maxR || 400 });
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { pts, blobs, sectorCenters, bounds: { minX, minY, maxX, maxY } };
}

export default function Galaxy({ onOpenSector, onStudySector }:
  { onOpenSector: (name: string) => void; onStudySector: (t: Target) => void }) {
  const v = useStore();
  const layout = useMemo(buildLayout, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cam = useRef({ k: 0.1, tx: 0, ty: 0 });
  const size = useRef({ w: 1, h: 1 });
  const [hover, setHover] = useState<{ p: Pt; sx: number; sy: number } | null>(null);

  // status colour per point, refreshed when the store changes
  const colors = useMemo(() => layout.pts.map((p) => STATUS_COLOR[statusOf(p.w.id)]), [layout, v]);
  const groupCov = useMemo(() => { const m = new Map<string, number>(); for (const g of groupStats()) m.set(g.name, g.coverage); return m; }, [v]);

  const fit = useCallback(() => {
    const { minX, minY, maxX, maxY } = layout.bounds;
    const w = size.current.w, h = size.current.h;
    const k = Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.9;
    cam.current = { k, tx: w / 2 - ((minX + maxX) / 2) * k, ty: h / 2 - ((minY + maxY) / 2) * k };
  }, [layout]);

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { w, h } = size.current, { k, tx, ty } = cam.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // far zoom: soft group halos coloured by coverage
    if (k < 0.16) {
      for (const b of layout.blobs) {
        const sx = b.x * k + tx, sy = b.y * k + ty, sr = b.r * k;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        const c = heat(groupCov.get(b.name) ?? 0);
        g.addColorStop(0, c + '55'); g.addColorStop(1, c + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
    }

    // stars
    const r = Math.max(0.7, Math.min(3.2, k * 14));
    const pts = layout.pts;
    for (let i = 0; i < pts.length; i++) {
      const sx = pts[i].x * k + tx, sy = pts[i].y * k + ty;
      if (sx < -4 || sy < -4 || sx > w + 4 || sy > h + 4) continue;
      ctx.fillStyle = colors[i];
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }

    // labels by level of detail
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (k < 0.16) {
      ctx.font = '600 13px ui-sans-serif, system-ui'; ctx.fillStyle = '#e9eff6';
      for (const b of layout.blobs) ctx.fillText(b.name, b.x * k + tx, b.y * k + ty);
    } else if (k < 0.5) {
      ctx.font = '500 11px ui-sans-serif, system-ui'; ctx.fillStyle = '#97a4b4';
      for (const s of layout.sectorCenters) {
        const sx = s.x * k + tx, sy = s.y * k + ty;
        if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
        ctx.fillText(s.name, sx, sy);
      }
    } else {
      ctx.font = '500 11px ui-sans-serif, system-ui';
      let drawn = 0;
      for (let i = 0; i < pts.length && drawn < 160; i++) {
        const sx = pts[i].x * k + tx, sy = pts[i].y * k + ty;
        if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
        ctx.fillStyle = colors[i] === STATUS_COLOR.new ? '#6b7686' : '#e9eff6';
        ctx.fillText(pts[i].w.term, sx, sy - r - 6);
        drawn++;
      }
    }
  }, [layout, colors, groupCov]);

  // resize + initial fit
  useEffect(() => {
    const wrap = wrapRef.current, cv = canvasRef.current; if (!wrap || !cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth === 0 || wrap.clientHeight === 0) return;
      size.current = { w: wrap.clientWidth, h: wrap.clientHeight };
      cv.width = size.current.w * dpr; cv.height = size.current.h * dpr;
      cv.style.width = size.current.w + 'px'; cv.style.height = size.current.h + 'px';
      if (cam.current.tx === 0 && cam.current.ty === 0) fit();
      draw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fit, draw]);

  useEffect(() => { draw(); }, [draw]);

  // interaction: pan, zoom, hover, click
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const onWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const c = cam.current;
    const wx = (mx - c.tx) / c.k, wy = (my - c.ty) / c.k;
    const k2 = Math.max(0.04, Math.min(6, c.k * (e.deltaY < 0 ? 1.12 : 0.89)));
    cam.current = { k: k2, tx: mx - wx * k2, ty: my - wy * k2 };
    draw();
  };
  const onDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, tx: cam.current.tx, ty: cam.current.ty, moved: false };
  };
  const onMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (drag.current) {
      const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
      cam.current.tx = drag.current.tx + dx; cam.current.ty = drag.current.ty + dy;
      draw();
      return;
    }
    // hover hit-test (nearest star within tolerance)
    const c = cam.current, tol = 9 / c.k;
    let best: Pt | null = null, bd = tol * tol;
    const wx = (mx - c.tx) / c.k, wy = (my - c.ty) / c.k;
    for (const p of layout.pts) { const dx = p.x - wx, dy = p.y - wy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = p; } }
    setHover(best ? { p: best, sx: mx, sy: my } : null);
  };
  const onUp = () => {
    const wasDrag = drag.current?.moved; drag.current = null;
    if (wasDrag) return;
    if (hover) onOpenSector(hover.p.sector);
  };

  const reset = () => { fit(); draw(); };

  return (
    <div>
      <div className="flex items-center gap-2.5 px-1 mb-3 flex-wrap">
        <Network size={18} className="text-amber" />
        <h1 className="text-[18px] sm:text-[20px] font-bold">The lexicon galaxy</h1>
        <span className="text-[12px] text-dim">{WORDS.length.toLocaleString('de-DE')} words · {layout.blobs.length} groups</span>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-dim">
          <Legend c={STATUS_COLOR.new} label="new" />
          <Legend c={STATUS_COLOR.learning} label="learning" />
          <Legend c={STATUS_COLOR.known} label="known" />
          <button onClick={reset} className="flex items-center gap-1 hover:text-amber"><Maximize2 size={12} /> Fit</button>
        </div>
      </div>
      <div ref={wrapRef} className="relative w-full bg-panel2 border border-line rounded-[12px] overflow-hidden"
        style={{ height: 'min(72vh, 680px)' }}>
        <canvas ref={canvasRef}
          onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { drag.current = null; setHover(null); }}
          onContextMenu={(e) => { if (hover) { e.preventDefault(); onStudySector({ kind: 'sector', name: hover.p.sector }); } }}
          className="block cursor-grab active:cursor-grabbing" />
        {hover && (
          <div className="absolute z-20 pointer-events-none bg-[#06080c] border border-amber rounded-lg px-3 py-2 text-[12px] shadow-2xl"
            style={{ left: Math.min(hover.sx + 14, size.current.w - 210), top: hover.sy + 14, width: 196 }}>
            <div className="font-semibold text-[13px]">{hover.p.w.term}</div>
            <div className="text-dim">{hover.p.w.en}</div>
            <div className="text-dim mt-1 text-[11px]">{hover.p.sector} · {hover.p.w.level} · <span style={{ color: STATUS_COLOR[statusOf(hover.p.w.id)] }}>{statusOf(hover.p.w.id)}</span></div>
            <div className="text-amber mt-1 text-[11px]">▸ click = open sector</div>
          </div>
        )}
        <div className="absolute bottom-2.5 left-3 text-[11px] text-dim pointer-events-none">Scroll to zoom · drag to pan · click a star</div>
      </div>
    </div>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{label}</span>;
}
