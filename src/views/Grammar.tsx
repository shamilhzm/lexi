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
// Nothing is locked. Levels you haven’t reached are collapsed, not gated: the
// FSRS scheduler decides what’s due, and a learner who wants to read ahead
// should be able to. The generated word-drills keep a home here as "Quick
// drills", demoted to what they are — practice, not curriculum.
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, GraduationCap, Loader2, Play, Printer } from 'lucide-react';
import { studyLevel, placementLevel, pointStats } from '../store.ts';
import { current as examInProgress } from '../lib/exam-store.ts';
import { useStore } from '../useStore.ts';
import { heat, fmt } from '../lib/ui.ts';
import { loadGrammar, findPoint, GRAMMAR_COUNTS, type GrammarByLevel, type GPoint } from '../lib/grammar.ts';
import GrammarDrill, { type PointScope } from './GrammarDrill.tsx';
import { RuleSectionBlock } from '../components/RulePanel.tsx';
import { Drill, MODES, type Mode } from './Fundamentals.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { ALL_LEVELS, type CEFR } from '../types.ts';

type Route = { kind: 'mode'; mode: Mode } | { kind: 'point'; scope: PointScope } | { kind: 'bank' } | null;

/** How the page can be entered: a word-drill mode, the mixed bank, or a named
 *  concept (a grammar blind spot, which is logged by point title alone). */
export type GrammarInit = Mode | 'grammar' | { point: string } | null;

export default function Grammar({ initial = null, onExam, onPrint }: { initial?: GrammarInit; onExam?: () => void; onPrint?: () => void }) {
  const [route, setRoute] = useState<Route>(
    initial === 'grammar' ? { kind: 'bank' }
      : typeof initial === 'string' ? { kind: 'mode', mode: initial }
      : null,
  );

  // A blind-spot tag is a bare title ("Perfekt") — misses record the point, not
  // its level — so resolving it needs the bank. Search the learner’s own level
  // first, since a handful of titles recur across levels (Präteritum, Genitiv).
  const wanted = typeof initial === 'object' && initial ? initial.point : null;
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    loadGrammar().then((g) => {
      if (!live) return;
      const home = placementLevel();
      const order = home ? [home, ...ALL_LEVELS.filter((l) => l !== home)] : ALL_LEVELS;
      for (const level of order) {
        const hit = findPoint(g, level, wanted);
        if (hit) { setRoute({ kind: 'point', scope: { level, pi: hit.pi, title: wanted } }); return; }
      }
      setRoute({ kind: 'bank' }); // tag has no authored point — fall back
    });
    return () => { live = false; };
  }, [wanted]);

  const back = () => setRoute(null);

  if (route?.kind === 'mode') return <Drill mode={route.mode} onExit={back} />;
  if (route?.kind === 'point') return <GrammarDrill scope={route.scope} onExit={back} />;
  if (route?.kind === 'bank') return <GrammarDrill onExit={back} />;
  return <Syllabus onRoute={setRoute} onExam={onExam} onPrint={onPrint} />;
}

function Syllabus({ onRoute, onExam, onPrint }: { onRoute: (r: Route) => void; onExam?: () => void; onPrint?: () => void }) {
  useStore();
  const [bank, setBank] = useState<GrammarByLevel | null>(null);
  useEffect(() => { loadGrammar().then(setBank); }, []);

  // Open the learner’s own level by default. Falling back to the highest level
  // in the filter means someone who skipped placement still lands somewhere
  // meaningful rather than on a wall of collapsed sections.
  // Was `placed ?? highest-in-filter ?? 'A1'`, which opened the C2 section for
  // anyone unplaced — now the ordinary state, since the first session comes
  // before the placement test. See store.studyLevel.
  const home: CEFR = studyLevel();
  const [open, setOpen] = useState<CEFR | null>(home);
  useEffect(() => { setOpen(home); }, [home]);

  return (
    <div className="w-full max-w-[820px] mx-auto">
      {/* Library is the destination — the place you go to look something up
          rather than to be tested. Grammar is what's in it today; word-level
          reference is not built, so this doesn't promise it. */}
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Library</h1>

      {/* Exam practice sits above the syllabus rather than inside it: a
          certificate paper is not a grammar concept, and for a learner with a
          date in the diary it is the reason they opened the Library at all. */}
      {onExam && <ExamCard onExam={onExam} />}
      {/* Paper sits beside the paper exam, which is where a teacher looks — and
          where a learner who has just been told what they keep getting wrong can
          take it to a lesson. */}
      {onPrint && <PrintCard onPrint={onPrint} />}

      <div className="flex items-center gap-2.5 mb-1">
        <GraduationCap size={20} className="text-amber" />
        <h2 className="text-lg font-bold">Grammar</h2>
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
              concept, this is for "just give me what’s due across everything". */}
          <Card as="button" pad="none" onClick={() => onRoute({ kind: 'bank' })}
            className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-left hover:border-amber transition-colors">
            <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><BookOpen size={18} /></span>
            <span className="flex-1">
              <span className="block text-base font-semibold">Mixed exercise session</span>
              <span className="block text-2xs text-dim">Whatever is due across your levels — {fmt(GRAMMAR_COUNTS.exercises)} exercises in the bank.</span>
            </span>
            <ChevronRight size={16} className="text-dim flex-shrink-0" />
          </Card>
        </>
      )}
    </div>
  );
}

/** The way in to a certificate paper. Announces the sitting in progress, because
 *  an abandoned exam is the one piece of app state a learner will come looking
 *  for and would otherwise have to remember the URL of. */
function PrintCard({ onPrint }: { onPrint: () => void }) {
  return (
    <Card as="button" pad="none" onClick={onPrint}
      className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:border-amber transition-colors">
      <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><Printer size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="text-base font-semibold block">Worksheets</span>
        <span className="block text-2xs text-dim">
          A printable sheet and answer key from any deck or grammar point — or your own error
          log, to take to a lesson. Generated here; nothing is sent anywhere.
        </span>
      </span>
      <ChevronRight size={16} className="text-dim flex-shrink-0" />
    </Card>
  );
}

function ExamCard({ onExam }: { onExam: () => void }) {
  const running = examInProgress();
  return (
    <Card as="button" pad="none" accent onClick={onExam}
      className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:border-amber transition-colors">
      <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><ClipboardList size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold">Exam practice</span>
          {running && <Chip>sitting in progress</Chip>}
        </span>
        <span className="block text-2xs text-dim">
          telc Deutsch B1 — a full paper in the real format, with the oral rehearsed against model
          answers at three levels.
        </span>
      </span>
      <ChevronRight size={16} className="text-dim flex-shrink-0" />
    </Card>
  );
}

/** The seven generated word-drills — practice, not curriculum, so they sit
 *  above the syllabus as a compact strip rather than owning the page. */
function QuickDrills({ onPick }: { onPick: (m: Mode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <Card as="button" pad="none" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-amber transition-colors">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-amber flex-shrink-0"><Play size={16} /></span>
        <span className="flex-1">
          <span className="block text-base font-semibold">Quick drills</span>
          <span className="block text-2xs text-dim">Gender, plurals, conjugation and cases, generated from your own vocabulary.</span>
        </span>
        <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Card>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="qd" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {MODES.map(({ m, label, icon: Icon }) => (
                <Card as="button" key={m} nested pad="none" onClick={() => onPick(m)}
                  className="flex items-center gap-2 px-2.5 py-2.5 text-left hover:border-amber transition-colors">
                  <Icon size={15} className="text-amber flex-shrink-0" />
                  <span className="text-xs font-semibold truncate">{label}</span>
                </Card>
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
  const stats = useMemo(() => points.map((p) => pointStats(level, p.title, p.exercises.length)), [points, level]);
  const started = stats.filter((s) => s.started).length;
  const due = stats.reduce((n, s) => n + s.due, 0);
  const mastery = stats.length
    ? stats.reduce((n, s) => n + s.mastery, 0) / stats.length
    : 0;

  return (
    <div className="mb-2.5">
      <Card as="button" pad="none" accent={isHome} onClick={onToggle} aria-expanded={open}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isHome ? 'hover:border-amber' : 'hover:border-dim'}`}>
        <span className={`grid place-items-center w-10 h-10 rounded-md font-mono font-bold text-sm flex-shrink-0 ${
          isHome ? 'bg-panel2 text-amber' : 'bg-panel2 text-dim'}`}>{level}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold">
            {points.length} concept{points.length === 1 ? '' : 's'}
            {isHome && <Kicker tone="accent" className="ml-2">your level</Kicker>}
          </span>
          <span className="block text-2xs text-dim font-mono">
            {started}/{points.length} started{due > 0 && ` · ${due} due`}
          </span>
        </span>
        {/* The mastery bar used to be hidden below sm, which removed the only
            progress signal from the surface people actually study on. */}
        <span className="w-10 sm:w-16 flex-shrink-0">
          <span className="block h-1.5 rounded-full bg-bg overflow-hidden">
            <span className="block h-full transition-[width] duration-500" style={{ width: `${Math.max(Math.round(mastery * 100), 2)}%`, background: heat(mastery) }} />
          </span>
        </span>
        <ChevronDown size={16} className={`text-dim flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Card>

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
    <Card pad="none">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-panel2 transition-colors rounded-lg">
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{point.title}</span>
            {stat.due > 0 && <Chip>{stat.due} due</Chip>}
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
          {/* A concept met through the session loop has been *taught* but not
              *drilled*, and "0/7" would read as seven failures. The dot says
              met-not-drilled without pretending either more or less happened. */}
          <span className="text-2xs font-mono text-dim tabular-nums w-10 text-right"
            title={stat.metInSession ? 'Met in a session — not drilled here yet' : undefined}>
            {stat.metInSession ? '·seen' : stat.started ? `${stat.known}/${stat.count}` : '—'}
          </span>
          <ChevronDown size={14} className={`text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="rule" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 pt-0.5">
              {/* A rule that has been given structure renders as structure here
                  too — this is the surface built for reading one. `rule` stays the
                  fallback for the rules that are genuinely prose.
                  whitespace-pre-line: several of those are multi-line conjugation
                  tables (sein/haben), and losing the breaks makes them unreadable. */}
              <div className="text-sm bg-panel2 border border-line rounded-md p-3">
                {point.sections?.length
                  ? point.sections.map((s, i) => <RuleSectionBlock key={i} s={s} />)
                  : <p className="text-txt whitespace-pre-line leading-relaxed">{point.rule}</p>}
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                <Button size="sm" onClick={onPractise}><Play size={13} /> Practise</Button>
                <span className="text-2xs text-dim font-mono">
                  {point.exercises.length} exercise{point.exercises.length === 1 ? '' : 's'}
                  {stat.metInSession
                    ? ' · met in a session'
                    : stat.started && ` · ${stat.seen} seen · ${stat.known} consolidated`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
