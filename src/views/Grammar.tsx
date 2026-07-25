// Grammar — the syllabus. Replaces the old "Fundamentals" landing, which
// bucketed work by exercise *mechanic* (der/die/das, Plurals, Cloze, Kasus…)
// and never stated what the grammar of a level actually consists of. A learner
// arriving at A1 could be asked to choose between den/dem/der/des without the
// app ever having said what Nominativ is.
//
// So this page leads with the concepts: every authored point at every CEFR
// level, with its plain-English summary, its rule, and how far through it you
// are. The `summary` and `rule` fields have shipped in grammar.json since the
// bank was written and were rendered nowhere — this is their surface.
//
// Nothing is locked. Levels you haven't reached are collapsed, not gated: the
// FSRS scheduler decides what's due, and a learner who wants to read ahead
// should be able to. The generated word-drills keep a home here as "Quick
// drills", demoted to what they are — practice, not curriculum.
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronDown, ChevronRight, GraduationCap, Loader2, Play } from 'lucide-react';
import { levels, placementLevel, pointStats } from '../store.ts';
import { useStore } from '../useStore.ts';
import { heat } from '../lib/ui.ts';
import { loadGrammar, GRAMMAR_COUNTS, type GrammarByLevel, type GPoint } from '../lib/grammar.ts';
import GrammarDrill, { type PointScope } from './GrammarDrill.tsx';
import { Drill, MODES, type Mode } from './Fundamentals.tsx';
import { ALL_LEVELS, type CEFR } from '../types.ts';

type Route = { kind: 'mode'; mode: Mode } | { kind: 'point'; scope: PointScope } | { kind: 'bank' } | null;

export default function Grammar({ initial = null }: { initial?: Mode | 'grammar' | null }) {
  const [route, setRoute] = useState<Route>(
    initial === 'grammar' ? { kind: 'bank' } : initial ? { kind: 'mode', mode: initial } : null,
  );
  const back = () => setRoute(null);

  if (route?.kind === 'mode') return <Drill mode={route.mode} onExit={back} />;
  if (route?.kind === 'point') return <GrammarDrill scope={route.scope} onExit={back} />;
  if (route?.kind === 'bank') return <GrammarDrill onExit={back} />;
  return <Syllabus onRoute={setRoute} />;
}

function Syllabus({ onRoute }: { onRoute: (r: Route) => void }) {
  useStore();
  const [bank, setBank] = useState<GrammarByLevel | null>(null);
  useEffect(() => { loadGrammar().then(setBank); }, []);

  // Open the learner's own level by default. Falling back to the highest level
  // in the filter means someone who skipped placement still lands somewhere
  // meaningful rather than on a wall of collapsed sections.
  const placed = placementLevel();
  const filter = levels();
  const home: CEFR = placed
    ?? [...ALL_LEVELS].reverse().find((l) => filter.has(l))
    ?? 'A1';
  const [open, setOpen] = useState<CEFR | null>(home);
  useEffect(() => { setOpen(home); }, [home]);

  return (
    <div className="max-w-[820px] mx-auto">
      <div className="flex items-center gap-2.5 mb-1">
        <GraduationCap size={20} className="text-amber" />
        <h1 className="text-xl sm:text-2xl font-bold">Grammar</h1>
      </div>
      <p className="text-dim text-xs mb-4">
        Every concept from A1 to C2 — what it is, the rule, and how far you are through it.
        Nothing is locked; read ahead whenever you like.
      </p>

      <QuickDrills onPick={(m) => onRoute({ kind: 'mode', mode: m })} />

      {!bank ? (
        <div className="grid place-items-center min-h-[240px] text-dim"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          {ALL_LEVELS.map((level) => (
            <LevelSection key={level} level={level} points={bank[level] ?? []}
              isHome={level === home} open={open === level}
              onToggle={() => setOpen((o) => (o === level ? null : level))}
              onPractise={(pi, point) => onRoute({ kind: 'point', scope: { level, pi, title: point.title } })} />
          ))}

          {/* The mixed bank stays reachable: the syllabus is for finding a
              concept, this is for "just give me what's due across everything". */}
          <button onClick={() => onRoute({ kind: 'bank' })}
            className="w-full flex items-center gap-3 bg-panel border border-line rounded-md px-4 py-3 mt-4 text-left hover:border-amber transition-colors">
            <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><BookOpen size={18} /></span>
            <span className="flex-1">
              <span className="block text-base font-semibold">Mixed exercise session</span>
              <span className="block text-2xs text-dim">Whatever is due across your levels — {GRAMMAR_COUNTS.exercises.toLocaleString('de-DE')} exercises in the bank.</span>
            </span>
            <ChevronRight size={16} className="text-dim flex-shrink-0" />
          </button>
        </>
      )}
    </div>
  );
}

/** The seven generated word-drills — practice, not curriculum, so they sit
 *  above the syllabus as a compact strip rather than owning the page. */
function QuickDrills({ onPick }: { onPick: (m: Mode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-3 bg-panel border border-line rounded-md px-4 py-3 text-left hover:border-amber transition-colors">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><Play size={16} /></span>
        <span className="flex-1">
          <span className="block text-base font-semibold">Quick drills</span>
          <span className="block text-2xs text-dim">Gender, plurals, conjugation and cases, generated from your own vocabulary.</span>
        </span>
        <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="qd" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {MODES.map(({ m, label, icon: Icon }) => (
                <button key={m} onClick={() => onPick(m)}
                  className="flex items-center gap-2 bg-panel border border-line rounded-md px-2.5 py-2.5 text-left hover:border-amber transition-colors">
                  <Icon size={15} className="text-amber flex-shrink-0" />
                  <span className="text-xs font-semibold truncate">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LevelSection({ level, points, isHome, open, onToggle, onPractise }: {
  level: CEFR; points: GPoint[]; isHome: boolean; open: boolean;
  onToggle: () => void; onPractise: (pi: number, p: GPoint) => void;
}) {
  const stats = useMemo(() => points.map((p, pi) => pointStats(level, pi, p.exercises.length)), [points, level]);
  const started = stats.filter((s) => s.started).length;
  const due = stats.reduce((n, s) => n + s.due, 0);
  const mastery = stats.length
    ? stats.reduce((n, s) => n + s.mastery, 0) / stats.length
    : 0;

  return (
    <div className="mb-2.5">
      <button onClick={onToggle} aria-expanded={open}
        className={`w-full flex items-center gap-3 bg-panel border rounded-md px-4 py-3 text-left transition-colors ${
          isHome ? 'border-amber/50 hover:border-amber' : 'border-line hover:border-dim'}`}>
        <span className={`grid place-items-center w-10 h-10 rounded-md font-mono font-bold text-sm flex-shrink-0 ${
          isHome ? 'bg-panel2 text-amber' : 'bg-panel2 text-dim'}`}>{level}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold">
            {points.length} concept{points.length === 1 ? '' : 's'}
            {isHome && <span className="text-amber text-2xs font-mono uppercase tracking-widest ml-2">your level</span>}
          </span>
          <span className="block text-2xs text-dim font-mono">
            {started}/{points.length} started{due > 0 && ` · ${due} due`}
          </span>
        </span>
        <span className="w-16 flex-shrink-0 hidden sm:block">
          <span className="block h-1.5 rounded-full bg-bg overflow-hidden">
            <span className="block h-full" style={{ width: `${Math.max(Math.round(mastery * 100), 2)}%`, background: heat(mastery) }} />
          </span>
        </span>
        <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key={level} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <div className="pt-2 space-y-1.5">
              {points.map((p, pi) => (
                <PointRow key={p.title + pi} point={p} stat={stats[pi]} onPractise={() => onPractise(pi, p)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PointRow({ point, stat, onPractise }: {
  point: GPoint; stat: ReturnType<typeof pointStats>; onPractise: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-panel border border-line rounded-md">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-panel2 transition-colors rounded-md">
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{point.title}</span>
            {stat.due > 0 && <span className="text-2xs font-mono text-amber border border-line rounded-full px-1.5 tabular-nums">{stat.due} due</span>}
          </span>
          {/* The summary is the whole point of this row: an English one-liner
              for a concept the learner has only ever met as a German label. */}
          <span className="block text-xs text-dim mt-0.5">{point.summary}</span>
        </span>
        {/* known/count, not a percentage. One correct answer puts a card in
            FSRS *Learning*, not *Review*, so mastery is legitimately still 0 —
            but "0%" reads as a score of zero for work you just did, whereas
            "0/6" reads as progress through something finite. */}
        <span className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <span className="text-2xs font-mono text-dim tabular-nums w-10 text-right">
            {stat.started ? `${stat.known}/${stat.count}` : '—'}
          </span>
          <ChevronDown size={14} className={`text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="rule" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 pt-0.5">
              {/* whitespace-pre-line: several rules are multi-line conjugation
                  tables (sein/haben), and losing the breaks makes them unreadable. */}
              <p className="text-sm text-txt bg-panel2 border border-line rounded-md p-3 whitespace-pre-line leading-relaxed">{point.rule}</p>
              <div className="flex items-center gap-3 mt-2.5">
                <button onClick={onPractise}
                  className="flex items-center gap-1.5 bg-amber text-bg font-bold rounded-md px-4 py-2 text-xs hover:brightness-105">
                  <Play size={13} /> Practise
                </button>
                <span className="text-2xs text-dim font-mono">
                  {point.exercises.length} exercise{point.exercises.length === 1 ? '' : 's'}
                  {stat.started && ` · ${stat.seen} seen · ${stat.known} consolidated`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
