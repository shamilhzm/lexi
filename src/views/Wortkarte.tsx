// Wortkarte — a semantic map of one sector. The sector is the hub; words orbit
// it on rings grouped by word class. Node colour = FSRS status; synonym pairs in
// view are linked. Click a node to hear it; study the whole sector from here.
import { useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { WORDS_BY_SECTOR, SECTORS } from '../data/index.ts';
import { statusOf } from '../store.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import { conceptForSector, conceptPaths, SHOW_ILLUSTRATIONS } from '../lib/illustration.tsx';
import type { Target } from '../types.ts';

const STATUS_COLOR: Record<string, string> = { new: '#5b6573', learning: '#38cde8', known: '#16c784' };
const POS_RING = ['noun', 'verb', 'adjective', 'adverb'];

export default function Wortkarte({ initialSector, onStudy }: { initialSector: string | null; onStudy: (t: Target) => void }) {
  const v = useStore();
  const sorted = useMemo(() => [...SECTORS].sort((a, b) => b.count - a.count), []);
  const [sel, setSel] = useState<string>(initialSector ?? sorted[0].name);
  const [active, setActive] = useState<string | null>(null);

  const { nodes, links, hub } = useMemo(() => {
    const W = 900, H = 560, cx = W / 2, cy = H / 2;
    const words = (WORDS_BY_SECTOR.get(sel) ?? []).slice(0, 30);
    const groups = new Map<string, typeof words>();
    for (const w of words) {
      const ring = POS_RING.includes(w.pos) ? w.pos : 'other';
      if (!groups.has(ring)) groups.set(ring, []);
      groups.get(ring)!.push(w);
    }
    const ringOrder = [...POS_RING, 'other'].filter((r) => groups.has(r));
    const nodes = ringOrder.flatMap((ring, ri) => {
      const list = groups.get(ring)!;
      const radius = 95 + ri * 78;
      return list.map((w, k) => {
        const ang = (k / list.length) * Math.PI * 2 + ri * 0.6;
        return { w, x: cx + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius, r: 22 };
      });
    });
    const pos = new Map(nodes.map((n) => [n.w.term, n]));
    const links: { a: any; b: any }[] = [];
    for (const n of nodes) for (const s of n.w.syn) { const tn = pos.get(s); if (tn) links.push({ a: n, b: tn }); }
    return { nodes, links, hub: { x: cx, y: cy } };
  }, [sel, v]);

  return (
    <div className="bg-panel border border-line rounded-md">
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
        <h2 className="text-base font-semibold">Word Map</h2>
        <select value={sel} onChange={(e) => setSel(e.target.value)}
          className="bg-panel2 border border-line rounded-md text-xs px-2 py-1 text-txt outline-none focus:border-amber max-w-[200px] sm:max-w-[260px]">
          {sorted.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
        </select>
        <span className="ml-auto text-2xs text-dim flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="hidden sm:inline"><Dot c="#5b6573" /> new <Dot c="#38cde8" /> learning <Dot c="#16c784" /> known</span>
          <button onClick={() => onStudy({ kind: 'sector', name: sel })} className="text-amber hover:underline">Study sector →</button>
        </span>
      </div>

      <svg viewBox="0 0 900 560" className="w-full block" style={{ height: 'min(60vh, 560px)' }}>
        {links.map((l, i) => <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="#243042" strokeWidth={1} />)}
        {nodes.map((n) => <line key={'h' + n.w.id} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} stroke="#161d27" strokeWidth={1} />)}

        <g>
          <circle cx={hub.x} cy={hub.y} r={44} fill="#0f2230" stroke="#38cde8" strokeWidth={1.5} />
          {SHOW_ILLUSTRATIONS && <g transform={`translate(${hub.x - 11} ${hub.y - 30}) scale(0.92)`} fill="none" stroke="#38cde8" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: conceptPaths(conceptForSector(sel)) }} />}
          <text x={hub.x} y={hub.y + 6} textAnchor="middle" fill="#38cde8" fontSize={12} fontWeight={700}>{sel.split(/[ &,]/)[0]}</text>
          <text x={hub.x} y={hub.y + 20} textAnchor="middle" fill="#8b97a7" fontSize={10} fontFamily="monospace">{nodes.length} words</text>
        </g>

        {nodes.map((n) => {
          const st = statusOf(n.w.id);
          const on = active === n.w.id;
          return (
            <g key={n.w.id} style={{ cursor: 'pointer' }} onClick={() => { setActive(n.w.id); speak(n.w.term); }}>
              <circle cx={n.x} cy={n.y} r={n.r} fill="#0d1219" stroke={STATUS_COLOR[st]} strokeWidth={on ? 2.5 : 1.4} />
              <text x={n.x} y={n.y - 1} textAnchor="middle" fill="#e6edf3" fontSize={9.5}>{short(n.w.term)}</text>
              <text x={n.x} y={n.y + 10} textAnchor="middle" fill="#8b97a7" fontSize={8}>{n.w.en.split(/[,;]/)[0].slice(0, 12)}</text>
            </g>
          );
        })}
      </svg>

      <div className="px-4 py-2.5 border-t border-line text-2xs text-dim flex items-center gap-2">
        {active ? <ActiveInfo id={active} /> : <span>Node = word · line to centre = sector · line between nodes = synonym. Tap a node to hear it.</span>}
        <Volume2 size={13} className="ml-auto text-amber" />
      </div>
    </div>
  );
}

function ActiveInfo({ id }: { id: string }) {
  const w = useMemo(() => [...WORDS_BY_SECTOR.values()].flat().find((x) => x.id === id), [id]);
  if (!w) return null;
  return <span className="text-txt"><b className="text-amber">{w.term}</b> — {w.en}{w.ipa ? ` · /${w.ipa}/` : ''}{w.ex[0] ? ` · „${w.ex[0].de}“` : ''}</span>;
}
const Dot = ({ c }: { c: string }) => <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: c }} />;
const short = (t: string) => t.replace(/^(der|die|das)\s+/i, '').slice(0, 12);
