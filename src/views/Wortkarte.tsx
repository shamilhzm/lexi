// Wortkarte — a semantic map of one sector. The sector is the hub; words orbit
// it on rings grouped by word class. Node colour = FSRS status; synonym pairs in
// view are linked. Click a node to hear it; study the whole sector from here.
//
// Two things this used to get wrong:
//  1. Every colour was a hardcoded dark hex, so the whole view stayed dark when
//     the rest of the app went light. It is now token-driven like everything else.
//  2. The viewBox was a fixed 900×560 landscape. On a phone that scaled to
//     ~0.39, which both wasted half the box and rendered the labels at roughly
//     four physical pixels. The layout is now portrait and thinner on narrow
//     screens, and the type scales with it.
import { useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { WORDS_BY_SECTOR, SECTORS } from '../data/index.ts';
import { statusOf } from '../store.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import { conceptForSector, conceptPaths, SHOW_ILLUSTRATIONS } from '../lib/illustration.tsx';
import Card from '../components/ui/Card.tsx';
import { useIsNarrow } from '../lib/useMedia.ts';
import type { Target } from '../types.ts';

const STATUS_COLOR: Record<string, string> = {
  new: 'var(--color-dim)',
  learning: 'var(--color-amber)',
  known: 'var(--color-green)',
};
const STATUS_LABEL: Record<string, string> = { new: 'new', learning: 'learning', known: 'known' };
const POS_RING = ['noun', 'verb', 'adjective', 'adverb'];

/** Layout constants per breakpoint. Narrow screens get a portrait box, fewer
 *  nodes and larger type, so the labels stay readable instead of scaling to
 *  illegibility inside a landscape viewBox. */
const WIDE = { w: 900, h: 560, max: 30, hub: 44, node: 22, ring0: 95, ringStep: 78, term: 9.5, gloss: 8, hubTerm: 12, hubSub: 10 };
const NARROW = { w: 560, h: 720, max: 16, hub: 56, node: 30, ring0: 120, ringStep: 104, term: 15, gloss: 12, hubTerm: 18, hubSub: 14 };

export default function Wortkarte({ initialSector, onStudy }: { initialSector: string | null; onStudy: (t: Target) => void }) {
  const v = useStore();
  const sorted = useMemo(() => [...SECTORS].sort((a, b) => b.count - a.count), []);
  const [sel, setSel] = useState<string>(initialSector ?? sorted[0].name);
  const [active, setActive] = useState<string | null>(null);

  // The layout has to know the real breakpoint, not guess from the viewBox.
  const narrow = useIsNarrow();
  const L = narrow ? NARROW : WIDE;

  const { nodes, links, hub } = useMemo(() => {
    const cx = L.w / 2, cy = L.h / 2;
    const words = (WORDS_BY_SECTOR.get(sel) ?? []).slice(0, L.max);
    const groups = new Map<string, typeof words>();
    for (const w of words) {
      const ring = POS_RING.includes(w.pos) ? w.pos : 'other';
      if (!groups.has(ring)) groups.set(ring, []);
      groups.get(ring)!.push(w);
    }
    const ringOrder = [...POS_RING, 'other'].filter((r) => groups.has(r));

    // A ring only holds as many nodes as its circumference allows. Sectors
    // dominated by one part of speech (Adjectives, Core verbs) put every word in
    // a single group, and the old layout dropped all of them onto one radius —
    // thirty 22px nodes fighting over a 95px circle, drawn as an illegible
    // wreath. Pack into as many rings as the words need...
    const capacity = (radius: number) =>
      Math.max(3, Math.floor((2 * Math.PI * radius) / (L.node * 2 + 8)));

    const buckets: typeof words[] = [];
    for (const ring of ringOrder) {
      let queue = groups.get(ring)!;
      while (queue.length) {
        const nominal = L.ring0 + buckets.length * L.ringStep;
        const take = Math.min(queue.length, capacity(nominal));
        buckets.push(queue.slice(0, take));
        queue = queue.slice(take);
      }
    }

    // ...then fit those rings inside the box, so a word-rich sector can’t push
    // its outermost ring off the canvas.
    const maxR = Math.min(cx, cy) - L.node - 10;
    const step = buckets.length > 1
      ? Math.min(L.ringStep, (maxR - L.ring0) / (buckets.length - 1))
      : 0;

    const nodes = buckets.flatMap((slice, ri) => {
      const radius = L.ring0 + ri * step;
      return slice.map((w, k) => {
        // Offset each ring so nodes don’t line up into visual spokes.
        const ang = (k / slice.length) * Math.PI * 2 + ri * 0.6;
        return { w, x: cx + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius, r: L.node };
      });
    });
    const pos = new Map(nodes.map((n) => [n.w.term, n]));
    const links: { a: typeof nodes[number]; b: typeof nodes[number] }[] = [];
    for (const n of nodes) for (const s of n.w.syn) { const tn = pos.get(s); if (tn) links.push({ a: n, b: tn }); }
    return { nodes, links, hub: { x: cx, y: cy } };
  }, [sel, v, L]);

  return (
    <Card pad="none">
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
        <h2 className="text-base font-semibold">Word Map</h2>
        <label className="sr-only" htmlFor="wortkarte-sector">Sector</label>
        <select id="wortkarte-sector" value={sel} onChange={(e) => { setSel(e.target.value); setActive(null); }}
          className="bg-panel2 border border-line rounded-md text-xs px-2 py-1.5 text-txt outline-none focus:border-amber max-w-[200px] sm:max-w-[260px]">
          {sorted.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
        </select>
        <span className="ml-auto text-2xs text-dim flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* The colour key used to be hidden below sm, leaving three unlabelled
              dots on the screens where the map is hardest to read. */}
          <span className="flex items-center gap-1.5">
            {(['new', 'learning', 'known'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <Dot c={STATUS_COLOR[k]} /> {STATUS_LABEL[k]}
              </span>
            ))}
          </span>
          <button onClick={() => onStudy({ kind: 'sector', name: sel })} className="text-amber hover:underline">Study sector →</button>
        </span>
      </div>

      <svg viewBox={`0 0 ${L.w} ${L.h}`} className="w-full block"
        style={{ height: narrow ? 'min(70vh, 620px)' : 'min(60vh, 560px)' }}
        role="img" aria-label={`Word map of ${sel}: ${nodes.length} words on rings by word class`}>
        {links.map((l, i) => <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="var(--color-line)" strokeWidth={1.5} />)}
        {nodes.map((n) => <line key={'h' + n.w.id} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} stroke="var(--color-line)" strokeWidth={1} opacity={0.5} />)}

        <g>
          <circle cx={hub.x} cy={hub.y} r={L.hub} fill="var(--color-panel2)" stroke="var(--color-amber)" strokeWidth={1.5} />
          {SHOW_ILLUSTRATIONS && <g transform={`translate(${hub.x - 11} ${hub.y - 30}) scale(0.92)`} fill="none" stroke="var(--color-amber)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: conceptPaths(conceptForSector(sel)) }} />}
          <text x={hub.x} y={hub.y + 6} textAnchor="middle" fill="var(--color-amber)" fontSize={L.hubTerm} fontWeight={700}>{sel.split(/[ &,]/)[0]}</text>
          <text x={hub.x} y={hub.y + 6 + L.hubSub + 2} textAnchor="middle" fill="var(--color-dim)" fontSize={L.hubSub} fontFamily="var(--font-mono)">{nodes.length} words</text>
        </g>

        {nodes.map((n) => {
          const st = statusOf(n.w.id);
          const on = active === n.w.id;
          return (
            // Focusable and operable by keyboard — these were <g onClick> with
            // no role, no tabIndex and no accessible name, so every node was
            // mouse-only.
            <g key={n.w.id} className="node-in"
              style={{ cursor: 'pointer' }}
              role="button" tabIndex={0}
              aria-label={`${n.w.term} — ${n.w.en}. ${STATUS_LABEL[st]}. Activate to hear it.`}
              onClick={() => { setActive(n.w.id); speak(n.w.term); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(n.w.id); speak(n.w.term); } }}>
              <circle cx={n.x} cy={n.y} r={n.r} fill="var(--color-panel)" stroke={STATUS_COLOR[st]} strokeWidth={on ? 2.5 : 1.4} />
              <text lang="de" x={n.x} y={n.y - 1} textAnchor="middle" fill="var(--color-txt)" fontSize={L.term}>{short(n.w.term)}</text>
              <text x={n.x} y={n.y + L.gloss + 2} textAnchor="middle" fill="var(--color-dim)" fontSize={L.gloss}>{n.w.en.split(/[,;]/)[0].slice(0, 12)}</text>
            </g>
          );
        })}
      </svg>

      <div className="px-4 py-2.5 border-t border-line text-2xs text-dim flex items-center gap-2" role="status" aria-live="polite">
        {active ? <ActiveInfo id={active} /> : <span>Node = word · line to centre = sector · line between nodes = synonym. Tap a node to hear it.</span>}
        <Volume2 size={13} className="ml-auto text-amber flex-shrink-0" />
      </div>
    </Card>
  );
}

function ActiveInfo({ id }: { id: string }) {
  const w = useMemo(() => [...WORDS_BY_SECTOR.values()].flat().find((x) => x.id === id), [id]);
  if (!w) return null;
  return <span className="text-txt"><b lang="de" className="text-amber">{w.term}</b> — {w.en}{w.ipa ? ` · /${w.ipa}/` : ''}{w.ex[0] ? <> · <span lang="de">„{w.ex[0].de}“</span></> : ''}</span>;
}
const Dot = ({ c }: { c: string }) => <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: c }} />;
const short = (t: string) => t.replace(/^(der|die|das)\s+/i, '').slice(0, 12);
