// Üben — the practice room. Everything that drills you on one thing.
//
// ## What merged, and why
//
// This was *Library* (the grammar syllabus, the exam paper, worksheets,
// Redemittel, quick drills) with *Games* sitting beside it as a fourth
// destination holding **one card**. Two tabs, one question: "drill me on
// something specific". A typing race and a Konjunktiv II exercise are the same
// answer to it — the difference is mood, not kind, and mood is what sections
// are for.
//
// The syllabus itself is unchanged and still the centre of the page. It replaced
// the old "Fundamentals" landing, which bucketed work by exercise *mechanic*
// (der/die/das, Plurals, Cloze, Kasus…) and never stated what the grammar of a
// level actually consists of — a learner arriving at A1 could be asked to choose
// between den/dem/der/des without the app ever having said what Nominativ is. So
// it leads with the concepts: every authored point at every CEFR level, with its
// plain-English summary, its rule, and how far through it you are.
//
// Nothing is locked. Levels you haven’t reached are collapsed, not gated: the
// FSRS scheduler decides what’s due, and a learner who wants to read ahead
// should be able to. The generated word-drills keep a home here as "Quick
// drills", demoted to what they are — practice, not curriculum.
//
// ## Ordered by commitment, not by importance
//
//   Grammar      the syllabus — the reason most people open this tab
//   Quick drills generated from your own vocabulary, thirty seconds each
//   Exam         a full certificate paper, an hour, a date in the diary
//   Redemittel · Worksheets · Tipprennen — the rest, one row each
//
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, GraduationCap, Keyboard, Loader2, MessagesSquare, Play, Printer, Search, Trophy, X } from 'lucide-react';
import { studyLevel, placementLevel, pointStats } from '../store.ts';
import { raceBests } from '../lib/exam-store.ts';
import Race from './games/Race.tsx';
import { current as examInProgress } from '../lib/exam-store.ts';
import { useStore } from '../useStore.ts';
import { heat, fmt } from '../lib/ui.ts';
import { loadRedemittel } from '../lib/redemittel.ts';
import { loadGrammar, findPoint, searchPoints, GRAMMAR_COUNTS, type GrammarByLevel, type GPoint } from '../lib/grammar.ts';
import GrammarDrill, { type PointScope } from './GrammarDrill.tsx';
import { RuleSectionBlock } from '../components/RulePanel.tsx';
import { Drill, MODES, type Mode } from './Fundamentals.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { ALL_LEVELS, type CEFR } from '../types.ts';

type Route = { kind: 'mode'; mode: Mode } | { kind: 'point'; scope: PointScope } | { kind: 'bank' }
  | { kind: 'race'; level: CEFR } | null;

/** How the page can be entered: a word-drill mode, the mixed bank, or a named
 *  concept (a grammar blind spot, which is logged by point title alone). */
export type PracticeInit = Mode | 'grammar' | { point: string } | null;

export default function Practice({ initial = null, onExam, onPrint, onRedemittel }: { initial?: PracticeInit; onExam?: () => void; onPrint?: () => void; onRedemittel?: () => void }) {
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
  if (route?.kind === 'race') return <Race level={route.level} onExit={back} />;
  return <Syllabus onRoute={setRoute} onExam={onExam} onPrint={onPrint} onRedemittel={onRedemittel} />;
}

function Syllabus({ onRoute, onExam, onPrint, onRedemittel }: { onRoute: (r: Route) => void; onExam?: () => void; onPrint?: () => void; onRedemittel?: () => void }) {
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

  // Finding a concept by name (#38). Before this, reaching *Konjunktiv II* meant
  // knowing which of six levels it was filed under, expanding that level and
  // scrolling — for a bank of 140 points, on a surface whose whole job is
  // look-up.
  //
  // Searches the rule text as well as the title, because a learner mostly does
  // not know the German name of the thing they are looking for: "polite" has to
  // find Konjunktiv II and "reported speech" has to find Konjunktiv I. Title
  // matches still rank first, or every point whose rule mentions the word buries
  // the point that *is* the word.
  const [q, setQ] = useState('');
  const results = useMemo(() => (bank ? searchPoints(bank, q, ALL_LEVELS) : null), [q, bank]);

  return (
    <div className="w-full max-w-[820px] mx-auto">
      <h1 lang="de" className="display text-3xl sm:text-4xl mb-1">Üben</h1>
      <p className="text-dim text-xs mb-4">
        Drill one thing on purpose — a grammar concept, your own vocabulary, a full exam paper.
        The daily session on <span className="text-txt">Today</span> decides for you; this is where you decide.
      </p>

      {/* Exam practice sits above the syllabus rather than inside it: a
          certificate paper is not a grammar concept, and for a learner with a
          date in the diary it is the reason they opened this tab at all. It is
          the one row here that keeps its place above the heading. */}
      {onExam && <ExamCard onExam={onExam} />}

      <div className="flex items-center gap-2.5 mb-1">
        <GraduationCap size={20} className="text-accent" />
        <h2 className="text-lg font-bold">Grammar</h2>
      </div>
      <p className="text-dim text-xs mb-4">
        Every concept from A1 to C2 — what it is, the rule, and how far you are through it.
        Nothing is locked; read ahead whenever you like.
      </p>

      <QuickDrills onPick={(m) => onRoute({ kind: 'mode', mode: m })} />

      <div className="relative mb-4">
        <label className="sr-only" htmlFor="gram-search">Search grammar concepts</label>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
        <input
          id="gram-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search"
          placeholder="Find a concept — Konjunktiv, passive, word order…"
          className="w-full tap-44 rounded-md bg-panel2 border border-line pl-9 pr-9 py-2.5 text-sm
                     outline-none focus:border-accent" />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2 tap-44 grid place-items-center text-dim hover:text-fg">
            <X size={16} />
          </button>
        )}
      </div>

      {!bank ? (
        <div className="grid place-items-center min-h-[240px] text-dim"><Loader2 className="animate-spin" /></div>
      ) : (
        <>
          {results ? (
            <SearchResults hits={results} q={q}
              onPractise={(level, pi, point) => onRoute({ kind: 'point', scope: { level, pi, title: point.title } })} />
          ) : (
          <>
          {ALL_LEVELS.map((level) => (
            <LevelSection key={level} level={level} points={bank[level] ?? []}
              isHome={level === home} open={open === level}
              onToggle={() => setOpen((o) => (o === level ? null : level))}
              onPractise={(pi, point) => onRoute({ kind: 'point', scope: { level, pi, title: point.title } })} />
          ))}
          </>
          )}

          {/* The mixed bank stays reachable: the syllabus is for finding a
              concept, this is for "just give me what’s due across everything". */}
          <Card as="button" pad="none" onClick={() => onRoute({ kind: 'bank' })}
            className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-left hover:border-accent transition-colors">
            <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><BookOpen size={18} /></span>
            <span className="flex-1">
              <span className="block text-base font-semibold">Mixed exercise session</span>
              <span className="block text-2xs text-dim">Whatever is due across your levels — {fmt(GRAMMAR_COUNTS.exercises)} exercises in the bank.</span>
            </span>
            <ChevronRight size={16} className="text-dim flex-shrink-0" />
          </Card>
        </>
      )}

      {/* The rest. One heading rather than three loose rows above the fold:
          these are the things you come here *knowing* you want, so they do not
          need to compete with the syllabus for a first glance. */}
      <section aria-labelledby="more-practice" className="mt-8">
        <h2 id="more-practice" className="text-lg font-bold mb-1">Also here</h2>
        <p className="text-dim text-xs mb-3">Speaking phrases, paper, and one game.</p>
        {onRedemittel && <RedemittelCardEntry onStudy={onRedemittel} />}
        {onPrint && <PrintCard onPrint={onPrint} />}
        <RaceCard onPlay={(level) => onRoute({ kind: 'race', level })} />
      </section>
    </div>
  );
}

/** Tipprennen — the one game, and formerly an entire destination.
 *
 *  `Games.tsx` was a tab holding a single card, a level picker and a paragraph
 *  of German explaining that WPM is not a measure of your German. All three
 *  survive; the tab does not. The level picker stays *local* for the reason it
 *  always was: choosing to race at A2 for fun must not silently re-scope the
 *  study session waiting on Today. */
function RaceCard({ onPlay }: { onPlay: (level: CEFR) => void }) {
  useStore();
  const start = (placementLevel() as CEFR | null) ?? (studyLevel() as CEFR | null) ?? 'A1';
  const [level, setLevel] = useState<CEFR>(start);
  const best = useMemo(() => raceBests()[level], [level]);

  return (
    <Card pad="none" className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0">
          <Keyboard size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span lang="de" className="text-base font-semibold">Tipprennen</span>
            {best && <Chip tone="good"><Trophy size={11} /> {best.wpm} WPM</Chip>}
          </div>
          <p className="text-2xs text-dim leading-relaxed">
            Three sentences from your own cards, against two opponents at a fixed pace. Capitals,
            umlauts and ß all count — which is exactly what costs marks in the exam. Typing speed is
            not a measure of your German; the number is only there to bring you back.
          </p>
          <div className="flex items-center gap-1 flex-wrap mt-2.5">
            {ALL_LEVELS.map((l) => (
              <button key={l} onClick={() => setLevel(l as CEFR)} aria-pressed={level === l}
                className={`tap-44-sq inline-flex items-center justify-center font-mono text-2xs px-2 py-1
                  rounded-md border transition-colors ${
                    level === l ? 'border-accent text-accent bg-panel2' : 'border-line text-dim hover:text-txt'}`}>
                {l}
              </button>
            ))}
            <Button size="sm" className="ml-auto" onClick={() => onPlay(level)}><Play size={13} /> Race</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** The way in to a certificate paper. Announces the sitting in progress, because
 *  an abandoned exam is the one piece of app state a learner will come looking
 *  for and would otherwise have to remember the URL of. */
function RedemittelCardEntry({ onStudy }: { onStudy: () => void }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => { loadRedemittel().then((c) => setN(c.length)).catch(() => setN(null)); }, []);
  return (
    <Card as="button" pad="none" onClick={onStudy}
      className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:border-accent transition-colors">
      <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><MessagesSquare size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span lang="de" className="text-base font-semibold">Redemittel</span>
          {n !== null && <Chip>{n} phrases</Chip>}
        </span>
        <span className="block text-2xs text-dim">
          The phrases that start a sentence — agreeing, objecting, weighing up. Grouped by what
          they <em>do</em>, and now scheduled like everything else.
        </span>
      </span>
      <ChevronRight size={16} className="text-dim flex-shrink-0" />
    </Card>
  );
}

function PrintCard({ onPrint }: { onPrint: () => void }) {
  return (
    <Card as="button" pad="none" onClick={onPrint}
      className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:border-accent transition-colors">
      <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><Printer size={18} /></span>
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
      className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:border-accent transition-colors">
      <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><ClipboardList size={18} /></span>
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
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-accent transition-colors">
        <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><Play size={16} /></span>
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
                  className="flex items-center gap-2 px-2.5 py-2.5 text-left hover:border-accent transition-colors">
                  <Icon size={15} className="text-accent flex-shrink-0" />
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
          isHome ? 'hover:border-accent' : 'hover:border-dim'}`}>
        <span className={`grid place-items-center w-10 h-10 rounded-md font-mono font-bold text-sm flex-shrink-0 ${
          isHome ? 'bg-panel2 text-accent' : 'bg-panel2 text-dim'}`}>{level}</span>
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

/** Flat, cross-level results for the concept search.
 *
 *  Deliberately not the accordion with non-matches hidden: a search result is a
 *  different thing from a syllabus entry, and it has to say which level the point
 *  belongs to — that is half of what the learner came to find out. */
function SearchResults({ hits, q, onPractise }: {
  hits: { level: CEFR; pi: number; point: GPoint }[];
  q: string;
  onPractise: (level: CEFR, pi: number, point: GPoint) => void;
}) {
  if (!hits.length) {
    return (
      <Card className="px-4 py-6 text-center">
        <p className="text-sm text-dim">Nothing matches “{q}”.</p>
        <p className="text-2xs text-dim mt-1">Try the English name — “passive”, “relative clause”, “word order”.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-2xs text-dim">{hits.length} concept{hits.length === 1 ? '' : 's'} match “{q}”.</p>
      {hits.map(({ level, pi, point }) => (
        <Card key={`${level}:${pi}`} as="button" pad="none"
          onClick={() => onPractise(level, pi, point)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:border-accent transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent text-2xs font-bold flex-shrink-0">{level}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-semibold truncate">{point.title}</span>
            <span className="block text-2xs text-dim truncate">{point.summary}</span>
          </span>
          <ChevronRight size={16} className="text-dim flex-shrink-0" />
        </Card>
      ))}
    </div>
  );
}
