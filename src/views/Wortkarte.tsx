// Wortkarte — a semantic map of one sector. The sector is the hub; words orbit
// it on rings grouped by word class. Node colour = FSRS status; synonym pairs in
// view are linked. Click a node to hear it; study the whole sector from here.
//
// Two things this used to get wrong:
//  1. Every colour was a hardcoded dark hex, so the whole view stayed dark when
//     the rest of the app went light. It is now token-driven like everything else.
//  2. The viewBox was a fixed 900×560 landscape. On a phone that scaled to
//     ~0.39, which both wasted half the box and rendered the labels at roughly
//     four physical pixels. It was then a fixed portrait box, which fitted the
//     phone and not the drawing; since 2026-11-14 it is cut to the drawing (see
//     `WIDE` below).
import { useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { WORDS_BY_SECTOR, SECTORS } from '../data/index.ts';
import { statusOf } from '../store.ts';
import { useStore } from '../useStore.ts';
import { speak } from '../lib/tts.ts';
import { conceptForSector, conceptPaths, SHOW_ILLUSTRATIONS } from '../lib/illustration.tsx';
import Card from '../components/ui/Card.tsx';
import { useIsNarrow } from '../lib/useMedia.ts';
import { shownTerm } from '../lib/focus.ts';
import type { Target, Word } from '../types.ts';

const STATUS_COLOR: Record<string, string> = {
  new: 'var(--color-dim)',
  learning: 'var(--color-accent)',
  known: 'var(--color-green)',
};
const STATUS_LABEL: Record<string, string> = { new: 'new', learning: 'learning', known: 'known' };
const POS_RING = ['noun', 'verb', 'adjective', 'adverb'];

/** Type and spacing, in viewBox units.
 *
 *  **The box is cut to the drawing** *(2026-11-14)*, so these set proportions,
 *  not screen sizes. The old layout fixed the box (560×720 on a phone) and the
 *  node (r = 30), and then neither fitted the other: a word map of sixteen nodes
 *  sat in the middle of a box with 100pt of nothing above it, its terms ran across
 *  their own circles ("Nachricht", "Communication" in the hub), and the glosses
 *  came out at 7px. Now each node is as large as its word, the rings are packed by
 *  the room each node actually takes, and the viewBox is whatever that drew — so
 *  the type lands as large as the phone allows.
 *
 *  A phone gets no gloss inside the node: at the scale sixteen words allow it
 *  could not be read, and tapping a node puts the gloss in the line under the map. */
const WIDE = { max: 30, term: 11, gloss: 9, gap: 7, pad: 4, minR: 22, hubR: 40, hubTerm: 14, hubSub: 10 };
const NARROW = { max: 16, term: 15, gloss: 0, gap: 6, pad: 5, minR: 24, hubR: 44, hubTerm: 18, hubSub: 12 };

/** Width of a label in viewBox units, read off the face the map is drawn in — the
 *  system sans, which is installed rather than downloaded, so the reading is
 *  never taken before the font arrives. A plain estimate where there is no canvas
 *  (the tests). One context for the module: it is a ruler, not state. */
let ruler: CanvasRenderingContext2D | null | undefined;
function measure(text: string, size: number, weight = 400): number {
  if (ruler === undefined) ruler = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!ruler) return text.length * size * 0.58;
  ruler.font = `${weight} ${size}px ${getComputedStyle(document.body).fontFamily}`;
  return ruler.measureText(text).width;
}

/** A node's word: no article (the colour is the status, not the gender), no case
 *  notation, and only a very long compound shortened — `slice(0, 12)` used to cut
 *  *Kommunikation* to "Kommunikatio". */
const termOf = (w: Word) => {
  const t = shownTerm(w.term.replace(/^(der|die|das)\s+/i, ''));
  return t.length > 18 ? `${t.slice(0, 16)}…` : t;
};
/** The first sense of the gloss, cut at a word rather than inside one. */
const glossOf = (w: Word) => {
  const g = w.en.split(/[,;(]/)[0].trim();
  if (g.length <= 16) return g;
  const cut = g.slice(0, 16).lastIndexOf(' ');
  return `${g.slice(0, cut > 6 ? cut : 15)}…`;
};

type Placed = { w: Word; term: string; gloss: string; r: number; x: number; y: number };

export default function Wortkarte({ initialSector, onStudy }: { initialSector: string | null; onStudy: (t: Target) => void }) {
  const v = useStore();
  const sorted = useMemo(() => SECTORS.filter((s) => s.count > 0).sort((a, b) => b.count - a.count), []);
  const [sel, setSel] = useState<string>(initialSector ?? sorted[0].name);
  const [active, setActive] = useState<string | null>(null);

  // The layout has to know the real breakpoint, not guess from the viewBox.
  const narrow = useIsNarrow();
  const L = narrow ? NARROW : WIDE;

  const { nodes, links, hub, box, total } = useMemo(() => {
    const all = WORDS_BY_SECTOR.get(sel) ?? [];
    const words = all.slice(0, L.max);
    const groups = new Map<string, Word[]>();
    for (const w of words) {
      const ring = POS_RING.includes(w.pos) ? w.pos : 'other';
      if (!groups.has(ring)) groups.set(ring, []);
      groups.get(ring)!.push(w);
    }
    // Word classes stay contiguous, so a ring reads as nouns, then verbs…
    const ordered = [...POS_RING, 'other'].flatMap((r) => groups.get(r) ?? []);

    // Every node as large as its own word — and no larger than the floor needs.
    const textH = L.gloss ? L.term + L.gloss + 2 : L.term;
    const sized = ordered.map((w) => {
      const term = termOf(w);
      const gloss = L.gloss ? glossOf(w) : '';
      const wide = Math.max(measure(term, L.term, 600), gloss ? measure(gloss, L.gloss) : 0);
      return { w, term, gloss, r: Math.max(L.minR, Math.hypot(wide / 2, textH / 2) + L.pad) };
    });
    const label = sel.split(/[ &,]/)[0];
    const hubR = Math.max(L.hubR, Math.hypot(measure(label, L.hubTerm, 700) / 2, (L.hubTerm + L.hubSub) / 2) + L.pad);

    // Rings, packed by the angle each node actually needs at that radius. A ring
    // takes nodes until they would overlap, and its radius grows with the largest
    // node in it, which is what keeps a long word from landing on its neighbour.
    const span = (r: number, R: number) => 2 * Math.asin(Math.min(1, (r + L.gap / 2) / R));
    const placed: Placed[] = [];
    let inner = hubR, k = 0, ring = 0;
    while (k < sized.length) {
      const members: typeof sized = [];
      let R = 0;
      while (k < sized.length) {
        const next = [...members, sized[k]];
        const radius = inner + L.gap + Math.max(...next.map((n) => n.r));
        if (members.length && next.reduce((s, n) => s + span(n.r, radius), 0) > 2 * Math.PI) break;
        members.push(sized[k++]);
        R = radius;
      }
      // What is left of the circle is shared out evenly between the nodes, and
      // each ring starts a little further round so nodes don't line up as spokes.
      const spans = members.map((n) => span(n.r, R));
      const slack = (2 * Math.PI - spans.reduce((a, b) => a + b, 0)) / members.length;
      let a = -Math.PI / 2 + ring * 0.6;
      members.forEach((n, j) => {
        const mid = a + spans[j] / 2;
        placed.push({ ...n, x: Math.cos(mid) * R, y: Math.sin(mid) * R });
        a += spans[j] + slack;
      });
      inner = R + Math.max(...members.map((n) => n.r));
      ring++;
    }

    const at = new Map(placed.map((n) => [n.w.term, n]));
    const links: { a: Placed; b: Placed }[] = [];
    for (const n of placed) for (const s of n.w.syn) { const t = at.get(s); if (t) links.push({ a: n, b: t }); }

    // The box is the drawing, plus room for a stroke.
    const m = 6;
    const minX = Math.min(-hubR, ...placed.map((n) => n.x - n.r)) - m;
    const maxX = Math.max(hubR, ...placed.map((n) => n.x + n.r)) + m;
    const minY = Math.min(-hubR, ...placed.map((n) => n.y - n.r)) - m;
    const maxY = Math.max(hubR, ...placed.map((n) => n.y + n.r)) + m;
    return {
      nodes: placed, links, total: all.length,
      hub: { r: hubR, label },
      box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    };
  }, [sel, v, L]);

  return (
    <Card pad="none">
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-line flex-wrap">
        <h2 className="text-base font-semibold">Word Map</h2>
        <label className="sr-only" htmlFor="wortkarte-sector">Sector</label>
        <select id="wortkarte-sector" value={sel} onChange={(e) => { setSel(e.target.value); setActive(null); }}
          className="flex-1 min-w-0 sm:flex-none bg-panel2 border border-line rounded-md text-xs px-2 py-1.5 text-txt outline-none focus:border-accent sm:max-w-[260px]">
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
          <button onClick={() => onStudy({ kind: 'sector', name: sel })} className="text-accent hover:underline">Study sector →</button>
        </span>
      </div>

      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="w-full block mx-auto my-3"
        style={{ aspectRatio: `${box.w} / ${box.h}`, maxHeight: narrow ? 'min(62vh, 560px)' : 'min(60vh, 560px)' }}
        role="img" aria-label={`Word map of ${sel}: ${nodes.length} of ${total} words, on rings by word class`}>
        {links.map((l, i) => <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="var(--color-line)" strokeWidth={1.5} />)}
        {nodes.map((n) => <line key={'h' + n.w.id} x1={0} y1={0} x2={n.x} y2={n.y} stroke="var(--color-line)" strokeWidth={1} opacity={0.5} />)}

        <g>
          <circle cx={0} cy={0} r={hub.r} fill="var(--color-panel2)" stroke="var(--color-accent)" strokeWidth={1.5} />
          {SHOW_ILLUSTRATIONS && <g transform="translate(-11 -30) scale(0.92)" fill="none" stroke="var(--color-accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: conceptPaths(conceptForSector(sel)) }} />}
          <text x={0} y={-1} textAnchor="middle" fill="var(--color-accent)" fontSize={L.hubTerm} fontWeight={700}>{hub.label}</text>
          <text x={0} y={L.hubSub + 4} textAnchor="middle" fill="var(--color-dim)" fontSize={L.hubSub} fontFamily="var(--font-mono)">
            {nodes.length < total ? `${nodes.length} of ${total}` : `${total} words`}
          </text>
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
              aria-label={`${n.w.term}, ${n.w.en}. ${STATUS_LABEL[st]}. Activate to hear it.`}
              onClick={() => { setActive(n.w.id); speak(n.w.term); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(n.w.id); speak(n.w.term); } }}>
              <circle cx={n.x} cy={n.y} r={n.r} fill="var(--color-panel)" stroke={STATUS_COLOR[st]} strokeWidth={on ? 2.5 : 1.4} />
              <text lang="de" x={n.x} y={n.gloss ? n.y - 1 : n.y + L.term * 0.35} textAnchor="middle"
                fill="var(--color-txt)" fontSize={L.term} fontWeight={600}>{n.term}</text>
              {n.gloss && <text x={n.x} y={n.y + L.gloss + 2} textAnchor="middle" fill="var(--color-dim)" fontSize={L.gloss}>{n.gloss}</text>}
            </g>
          );
        })}
      </svg>

      <div className="px-4 py-2.5 border-t border-line text-2xs text-dim flex items-center gap-2" role="status" aria-live="polite">
        {active ? <ActiveInfo id={active} /> : <span>Node = word · line to centre = sector · line between nodes = synonym. Tap a node to hear it.</span>}
        <Volume2 size={13} className="ml-auto text-accent flex-shrink-0" />
      </div>
    </Card>
  );
}

function ActiveInfo({ id }: { id: string }) {
  const w = useMemo(() => [...WORDS_BY_SECTOR.values()].flat().find((x) => x.id === id), [id]);
  if (!w) return null;
  return <span className="text-txt"><b lang="de" className="text-accent">{w.term}</b> · {w.en}{w.ipa ? ` · /${w.ipa}/` : ''}{w.ex[0] ? <> · <span lang="de">„{w.ex[0].de}“</span></> : ''}</span>;
}
const Dot = ({ c }: { c: string }) => <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: c }} />;
