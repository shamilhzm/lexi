// The observatory — the brain at full size, with the atlas it is built on.
//
// A full-bleed early return like the session desk (DESIGN.md §8): a different
// room for a different activity, and unconditionally dark in both themes
// because a bioluminescent field needs black to be luminous.
//
// The canvas is `aria-hidden`. The accessible surface — and the *useful* one, for
// everyone — is the region list on the right: the same numbers as text, with the
// evidence behind each association and a way to study it.
import { useEffect, useMemo, useState } from 'react';
import { X, Play, ExternalLink, FlaskConical } from 'lucide-react';
import BrainScene from '../components/Brain/BrainScene.tsx';
import { useBrainField } from '../components/Brain/useBrain.ts';
import { REGIONS, REGION_BY_ID, type Confidence } from '../lib/brain/atlas.ts';
import { HEX } from '../lib/brain/palette.ts';
import { WORDS, SECTOR_FINEGROUP } from '../data/index.ts';
import { regionForCardId } from '../lib/brain/atlas.ts';
import { fmt } from '../lib/ui.ts';
import type { Target } from '../types.ts';

const ROLE_LABEL: Record<string, string> = {
  form: 'Form',
  meaning: 'Meaning',
  memory: 'Memory',
  control: 'Control',
};

const CONFIDENCE_NOTE: Record<Confidence, string> = {
  established: 'Replicated and meta-analysed.',
  converging: 'Several independent lines agree; the details are still argued over.',
  illustrative: 'A defensible reading of the evidence, not a finding in itself.',
};

export default function BrainRoom({ onExit, onStudy }: { onExit: () => void; onStudy: (t: Target) => void }) {
  // The preview scrubber. Hidden until you ask for it with `g`, because it is a
  // maker's tool: it answers "what does 5,000 words look like" without anybody
  // having to learn 5,000 words, and it is the only way to see the far end of
  // the design. It substitutes the consolidation function and never touches the
  // store, so no amount of scrubbing can damage real progress — but a control
  // that shows numbers which are not yours has to say so, loudly, whenever it
  // is on.
  const [sim, setSim] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'g' && e.key !== 'G') return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      setSim((s) => (s === null ? 0.35 : null));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { field, progress } = useBrainField(sim);
  const [sel, setSel] = useState<string | null>(null);

  const rows = useMemo(() => REGIONS
    .map((r) => ({ r, p: progress.get(r.id) ?? { total: 0, touched: 0, known: 0, sum: 0 } }))
    .filter(({ r, p }) => p.total > 0 || r.role === 'memory' || r.role === 'control')
    .sort((a, b) => b.p.known - a.p.known), [progress]);

  const total = useMemo(() => {
    let touched = 0, known = 0, all = 0;
    for (const { p } of rows) { touched += p.touched; known += p.known; all += p.total; }
    return { touched, known, all };
  }, [rows]);

  /** Study a region: every card the atlas files there, in frequency order.
   *  A region spans many sectors, so this is a custom target — `poolFor` in
   *  store.ts already plays an explicit id list whole. */
  const studyRegion = (id: string) => {
    const ids = WORDS
      .filter((w) => regionForCardId(w.id, w, SECTOR_FINEGROUP.get(w.field)) === id)
      .map((w) => w.id);
    const name = REGION_BY_ID.get(id)?.short ?? 'Region';
    onStudy({ kind: 'custom', name, ids, cap: 20 });
  };

  return (
    <div className="brain-room h-[100dvh] w-full flex flex-col lg:flex-row overflow-hidden">
      <div className="relative flex-1 min-h-[46vh] lg:min-h-0">
        <BrainScene mode="room" selected={sel} simulate={sim} className="absolute inset-0" />

        <div className="absolute top-0 left-0 right-0 flex items-start gap-3 p-4 sm:p-5 pointer-events-none safe-top">
          <div className="pointer-events-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-none">Dein Wortschatz</h1>
            <p className="text-white/55 text-xs mt-2 max-w-[46ch] leading-relaxed">
              {fmt(total.known)} of {fmt(total.all)} words consolidated. Each point is one card,
              placed where the literature puts its meaning. New words sit in the hippocampus at the
              centre and move outward as they stick.
            </p>
          </div>
          <button
            onClick={onExit}
            aria-label="Close"
            className="pointer-events-auto ml-auto tap-44 grid place-items-center w-11 h-11 rounded-md
              text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {sim !== null && (
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 pb-16 safe-bottom">
            <div className="pointer-events-auto max-w-[420px] rounded-md bg-white/[0.08] backdrop-blur px-4 py-3
              border border-amber-300/25">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical size={13} className="text-amber-300 flex-shrink-0" />
                <span className="text-amber-300 text-2xs font-mono uppercase tracking-wider">Preview — not your progress</span>
                <button onClick={() => setSim(null)}
                  className="ml-auto text-white/50 hover:text-white text-2xs underline">exit</button>
              </div>
              <label className="flex items-center gap-3">
                <span className="sr-only">Words consolidated</span>
                <input
                  type="range" min={0} max={1000} value={Math.round(sim * 1000)}
                  onChange={(e) => setSim(Number(e.target.value) / 1000)}
                  className="flex-1 accent-amber-300"
                />
                <span className="font-mono text-white text-xs tabular-nums w-[5.5ch] text-right">
                  {fmt(Math.round(sim * field.ids.length))}
                </span>
              </label>
            </div>
          </div>
        )}

        <p className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white/35 text-2xs leading-relaxed pointer-events-none safe-bottom">
          A map of the published literature, not a map of your head — nobody has scanned you.
          Drag to turn.{sim === null && <span className="text-white/20"> · press G to preview any size of lexicon</span>}
        </p>
      </div>

      {/* The real interactive surface. Everything the canvas shows is here as text. */}
      <aside className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 safe-bottom">
        <h2 className="sr-only">Regions</h2>
        <ul className="divide-y divide-white/[0.07]">
          {rows.map(({ r, p }) => {
            const on = sel === r.id;
            const pct = p.total ? Math.round((p.known / p.total) * 100) : 0;
            return (
              <li key={r.id}>
                <button
                  onClick={() => setSel(on ? null : r.id)}
                  aria-expanded={on}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${on ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
                  <span className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: HEX[r.id], boxShadow: `0 0 8px ${HEX[r.id]}` }} />
                    <span className="font-semibold text-white text-sm">{r.short}</span>
                    <span className="ml-auto font-mono text-xs text-white/45 tabular-nums flex-shrink-0">
                      {p.total ? <>{fmt(p.known)}<span className="text-white/25">/{fmt(p.total)}</span></> : '—'}
                    </span>
                  </span>
                  <span className="block text-white/45 text-xs mt-1.5 leading-relaxed">{r.blurb}</span>
                  {p.total > 0 && (
                    <span className="block mt-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
                      <span className="block h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${Math.max(pct, p.known ? 2 : 0)}%`, background: HEX[r.id] }} />
                    </span>
                  )}
                </button>

                {on && (
                  <div className="px-4 pb-4 -mt-1">
                    <p className="text-white/40 text-2xs">
                      {r.name} · {ROLE_LABEL[r.role]} · MNI {r.mni.join(', ')}
                    </p>
                    <p className="text-white/55 text-2xs mt-2 leading-relaxed">
                      <b className="text-white/75 capitalize">{r.confidence}.</b> {CONFIDENCE_NOTE[r.confidence]}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {r.sources.map((s) => (
                        <li key={s} className="text-white/35 text-2xs leading-relaxed flex gap-1.5">
                          <ExternalLink size={11} className="mt-0.5 flex-shrink-0 opacity-60" aria-hidden="true" />{s}
                        </li>
                      ))}
                    </ul>
                    {p.total > 0 && (
                      <button
                        onClick={() => studyRegion(r.id)}
                        className="tap-44 mt-3 inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-xs font-semibold
                          bg-white/10 text-white hover:bg-white/[0.16] transition-colors">
                        <Play size={13} /> Study this region
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="px-4 py-5 text-white/30 text-2xs leading-relaxed">
          {fmt(field.ids.length)} cards mapped across {REGIONS.length} regions. Filing a
          vocabulary sector under a region is an interpretation laid over the cited work —
          see <span className="text-white/45">docs/BRAIN.md</span> for the full mapping.
        </p>
      </aside>
    </div>
  );
}
