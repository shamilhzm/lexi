// Die Galaxie — the whole lexicon as a star map on concentric CEFR rings:
// A1 (inner) → C2 (outer). Every word is a star at a stable hash-angle on its
// level's ring, coloured by FSRS status. Canvas with pan/zoom + level-of-detail
// labels, a search box that flies to a term, and click-to-open its sector.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Maximize2, Network, Search } from 'lucide-react';
import { WORDS } from '../data/index.ts';
import { statusOf, cardOf } from '../store.ts';
import { useStore } from '../useStore.ts';
import { isDue } from '../srs.ts';
import { ALL_LEVELS, type CEFR, type Word, type Target } from '../types.ts';

const STATUS_COLOR = { new: '#39424f', learning: '#ffb000', known: '#16c784' } as const;
const HILITE = '#3b82f6';
// Mirrors the CSS CEFR ramp (index.css :root). Canvas needs literal hex, so the
// values are kept in sync here; none collide with the green/red/amber statuses.
const CEFR_COLOR: Record<CEFR, string> = {
  A1: '#3b82f6', A2: '#0ea5e9', B1: '#14b8a6', B2: '#8b5cf6', C1: '#d946ef', C2: '#fb7185',
};
const stripArticle = (t: string) => t.replace(/^(der|die|das)\s+/i, '');

// FNV-1a → [0,1), stable per id across sessions.
function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return ((h >>> 0) % 100000) / 100000;
}

const RING_BASE = 260;   // A1 radius
const RING_STEP = 300;   // gap between levels
const ringR = (lv: CEFR) => RING_BASE + ALL_LEVELS.indexOf(lv) * RING_STEP;

interface Pt { x: number; y: number; w: Word; }

function buildLayout() {
  const pts: Pt[] = [];
  for (const w of WORDS) {
    const r = ringR(w.level);
    const a = hash01(w.id) * Math.PI * 2;
    const band = (hash01(w.id + '#') - 0.5) * RING_STEP * 0.62; // spread across the ring band
    const rr = r + band;
    pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, w });
  }
  const maxR = ringR('C2') + RING_STEP * 0.5;
  return { pts, maxR };
}

export default function Galaxy({ onOpenSector, onStudySector }:
  { onOpenSector: (name: string) => void; onStudySector: (t: Target) => void }) {
  const v = useStore();
  const layout = useMemo(buildLayout, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cam = useRef({ k: 0.12, tx: 0, ty: 0 });
  const size = useRef({ w: 1, h: 1 });
  const [hover, setHover] = useState<{ p: Pt; sx: number; sy: number } | null>(null);
  const [query, setQuery] = useState('');
  const [matchId, setMatchId] = useState<string | null>(null);

  const colors = useMemo(() => layout.pts.map((p) => {
    const st = statusOf(p.w.id);
    const c = cardOf(p.w.id);
    const due = c && isDue(c, Date.now());
    return due ? HILITE : STATUS_COLOR[st];
  }), [layout, v]);

  const fit = useCallback(() => {
    const span = layout.maxR * 2;
    const w = size.current.w, h = size.current.h;
    const k = Math.min(w, h) / span * 0.95;
    cam.current = { k, tx: w / 2, ty: h / 2 };
  }, [layout]);

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { w, h } = size.current, { k, tx, ty } = cam.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // rings + level badges
    ctx.lineWidth = 1;
    for (const lv of ALL_LEVELS) {
      const r = ringR(lv) * k;
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(22,199,132,0.28)'; ctx.stroke();
      // badge at top of ring
      const bx = tx, by = ty - r;
      if (by > 8 && by < h - 8 && r > 12) {
        ctx.fillStyle = '#0a0d12'; ctx.strokeStyle = CEFR_COLOR[lv]; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect?.(bx - 13, by - 9, 26, 18, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = CEFR_COLOR[lv]; ctx.font = '600 10px ui-sans-serif, system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lv, bx, by);
      }
    }

    // stars
    const r = Math.max(0.7, Math.min(3.4, k * 16));
    const pts = layout.pts;
    for (let i = 0; i < pts.length; i++) {
      const sx = pts[i].x * k + tx, sy = pts[i].y * k + ty;
      if (sx < -4 || sy < -4 || sx > w + 4 || sy > h + 4) continue;
      ctx.fillStyle = colors[i];
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }

    // search match: ring it + label
    if (matchId) {
      const m = pts.find((p) => p.w.id === matchId);
      if (m) {
        const sx = m.x * k + tx, sy = m.y * k + ty;
        ctx.strokeStyle = HILITE; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#e9eff6'; ctx.font = '600 12px ui-sans-serif, system-ui'; ctx.textAlign = 'center';
        ctx.fillText(m.w.term, sx, sy - 14);
      }
    }

    // LOD word labels (skip when zoomed far out)
    if (k >= 0.5) {
      ctx.font = '500 11px ui-sans-serif, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let drawn = 0;
      for (let i = 0; i < pts.length && drawn < 200; i++) {
        const sx = pts[i].x * k + tx, sy = pts[i].y * k + ty;
        if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
        ctx.fillStyle = colors[i] === STATUS_COLOR.new ? '#6b7686' : '#cfd8e3';
        ctx.fillText(stripArticle(pts[i].w.term), sx, sy - r - 6);
        drawn++;
      }
    }
  }, [layout, colors, matchId]);

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

  // search: fly to the best matching term
  const runSearch = (q: string) => {
    setQuery(q);
    const s = q.trim().toLowerCase();
    if (!s) { setMatchId(null); return; }
    const hit = layout.pts.find((p) => stripArticle(p.w.term).toLowerCase().startsWith(s))
      || layout.pts.find((p) => p.w.term.toLowerCase().includes(s));
    if (!hit) { setMatchId(null); return; }
    setMatchId(hit.w.id);
    const k = 1.4;
    cam.current = { k, tx: size.current.w / 2 - hit.x * k, ty: size.current.h / 2 - hit.y * k };
    draw();
  };

  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const onWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const c = cam.current;
    const wx = (mx - c.tx) / c.k, wy = (my - c.ty) / c.k;
    const k2 = Math.max(0.05, Math.min(6, c.k * (e.deltaY < 0 ? 1.12 : 0.89)));
    cam.current = { k: k2, tx: mx - wx * k2, ty: my - wy * k2 };
    draw();
  };
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, tx: cam.current.tx, ty: cam.current.ty, moved: false }; };
  const onMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (drag.current) {
      const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
      cam.current.tx = drag.current.tx + dx; cam.current.ty = drag.current.ty + dy;
      draw(); return;
    }
    const c = cam.current, tol = 9 / c.k;
    let best: Pt | null = null, bd = tol * tol;
    const wx = (mx - c.tx) / c.k, wy = (my - c.ty) / c.k;
    for (const p of layout.pts) { const dx = p.x - wx, dy = p.y - wy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = p; } }
    setHover(best ? { p: best, sx: mx, sy: my } : null);
  };
  const onUp = () => { const wasDrag = drag.current?.moved; drag.current = null; if (!wasDrag && hover) onOpenSector(hover.p.w.field); };
  const reset = () => { fit(); setMatchId(null); setQuery(''); draw(); };

  return (
    <div>
      <div className="flex items-center gap-2.5 px-1 mb-3 flex-wrap">
        <Network size={18} className="text-amber" />
        <h1 className="text-[20px] sm:text-[24px] font-bold">The lexicon galaxy</h1>
        <span className="text-[13px] text-dim hidden sm:inline">{WORDS.length.toLocaleString('de-DE')} words · A1→C2 rings</span>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-panel2 border border-line rounded-full px-2.5 py-1">
            <Search size={13} className="text-dim" />
            <input value={query} onChange={(e) => runSearch(e.target.value)} placeholder="Search word…"
              className="bg-transparent outline-none text-[13px] w-28 sm:w-40" />
          </div>
          <button onClick={reset} className="flex items-center gap-1 text-[11px] text-dim hover:text-amber"><Maximize2 size={12} /> Fit</button>
        </div>
      </div>
      <div ref={wrapRef} className="relative w-full bg-panel2 border border-line rounded-[16px] overflow-hidden" style={{ height: 'min(72vh, 680px)' }}>
        <canvas ref={canvasRef}
          onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onMouseLeave={() => { drag.current = null; setHover(null); }}
          onContextMenu={(e) => { if (hover) { e.preventDefault(); onStudySector({ kind: 'sector', name: hover.p.w.field }); } }}
          className="block cursor-grab active:cursor-grabbing" />
        {hover && (
          <div className="absolute z-20 pointer-events-none bg-[#06080c] border border-amber rounded-lg px-3 py-2 text-[13px] shadow-2xl"
            style={{ left: Math.min(hover.sx + 14, size.current.w - 210), top: hover.sy + 14, width: 196 }}>
            <div className="font-semibold text-[13px]">{hover.p.w.term}</div>
            <div className="text-dim">{hover.p.w.en}</div>
            <div className="text-dim mt-1 text-[11px]">{hover.p.w.field} · {hover.p.w.level} · <span style={{ color: STATUS_COLOR[statusOf(hover.p.w.id)] }}>{statusOf(hover.p.w.id)}</span></div>
            <div className="text-amber mt-1 text-[11px]">▸ click = open sector</div>
          </div>
        )}
        <div className="absolute bottom-2.5 left-3 text-[11px] text-dim pointer-events-none">A1 inner → C2 outer · scroll to zoom · drag to pan</div>
      </div>
    </div>
  );
}
