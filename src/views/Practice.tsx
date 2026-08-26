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
import { BookOpen, Check, ChevronDown, ChevronRight, ClipboardList, Keyboard, Loader2, MessagesSquare, Play, Printer, Search, Trophy, X } from 'lucide-react';
import { studyLevel, placementLevel, pointStats } from '../store.ts';
import { raceBests } from '../lib/exam-store.ts';
import Race from './games/Race.tsx';
import { current as examInProgress } from '../lib/exam-store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import { loadRedemittel } from '../lib/redemittel.ts';
import { loadGrammar, findPoint, searchPoints, GRAMMAR_COUNTS, type GrammarByLevel, type GPoint } from '../lib/grammar.ts';
import GrammarDrill, { type PointScope } from './GrammarDrill.tsx';
import { RuleSectionBlock } from '../components/RulePanel.tsx';
import { Drill, MODES, type Mode } from './Fundamentals.tsx';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { CAN_DO } from '../lib/candos.ts';
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
  // Where the journey resumes. Recomputed on every store change, because
  // finishing a point has to move the marker without a reload.
  const v = useStore();
  const next = useMemo(() => (bank ? nextStep(bank, home) : null), [bank, home, v]);

  return (
    <div className="w-full max-w-[820px] mx-auto">
      <h1 lang="de" className="display text-3xl sm:text-4xl mb-1">Üben</h1>
      <p className="text-dim text-xs mb-4">
        Drill one thing on purpose — a grammar concept, your own vocabulary, a full exam paper.
        The daily session on <span className="text-txt">Today</span> decides for you; this is where you decide.
      </p>

      {/* The next step, named. The reference app opens its Journey with exactly
          this card — CHAPTER · STEP, the thing itself, and a Play button — and it
          is the single most useful control on the surface: it removes the choice
          on the day you do not want to make one. */}
      {bank && <ContinueCard bank={bank} home={home}
        onGo={(level, pi, point) => onRoute({ kind: 'point', scope: { level, pi, title: point.title } })} />}

      <div className="relative mb-6">
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

      {/* Six chapters and ~140 nodes is roughly 15,000px of path. That length is
          the honest shape of "the grammar of a language" and worth showing — but
          it is only navigable with a way to jump, which is why the reference
          carries a chapter pill of its own. Anchors rather than scroll-spy: a
          spy is a second source of truth about where you are, and the browser
          already has one. */}
      {bank && !results && <ChapterJump home={home} bank={bank} />}

      {!bank ? (
        <div className="grid place-items-center min-h-[240px] text-dim"><Loader2 className="animate-spin" /></div>
      ) : results ? (
        <SearchResults hits={results} q={q}
          onPractise={(level, pi, point) => onRoute({ kind: 'point', scope: { level, pi, title: point.title } })} />
      ) : (
        <>
          {ALL_LEVELS.map((level, ci) => (
            <Chapter key={level} n={ci + 1} level={level} points={bank[level] ?? []}
              isHome={level === home}
              next={next && next.level === level ? next.pi : null}
              open={open === level}
              onToggleRules={() => setOpen((o) => (o === level ? null : level))}
              onGo={(pi, point) => onRoute({ kind: 'point', scope: { level, pi, title: point.title } })} />
          ))}
        </>
      )}

      {/* The rest. One heading rather than three loose rows above the fold:
          these are the things you come here *knowing* you want, so they do not
          need to compete with the syllabus for a first glance. */}
      <section aria-labelledby="more-practice" className="mt-8">
        <h2 id="more-practice" className="text-lg font-bold mb-1">Also here</h2>
        <p className="text-dim text-xs mb-3">Everything that isn’t the path: a full exam paper, generated drills, speaking phrases, worksheets, and one game.</p>
        {onExam && <ExamCard onExam={onExam} />}
        <QuickDrills onPick={(m) => onRoute({ kind: 'mode', mode: m })} />
        {/* The mixed bank: the journey is for working *a* concept, this is for
            "just give me whatever is due across everything". */}
        <Card as="button" pad="none" onClick={() => onRoute({ kind: 'bank' })}
          className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-left hover:border-accent transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-md bg-panel2 text-accent flex-shrink-0"><BookOpen size={18} /></span>
          <span className="flex-1">
            <span className="block text-base font-semibold">Mixed exercise session</span>
            <span className="block text-2xs text-dim">Whatever is due across your levels — {fmt(GRAMMAR_COUNTS.exercises)} exercises in the bank.</span>
          </span>
          <ChevronRight size={16} className="text-dim flex-shrink-0" />
        </Card>
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

/* ── The journey ───────────────────────────────────────────────────────────────
 *
 * The syllabus used to be six collapsed accordions. That is a *filing cabinet*:
 * it answers "where is Konjunktiv II" and says nothing about where you are, what
 * you finished, or what comes next — and a learner opening it saw six closed
 * grey rows, one of which they were supposed to know was theirs.
 *
 * It is now a path. Chapter = CEFR level, node = one grammar concept, in the
 * order the bank authors them. That mapping is the honest one: a level *is* the
 * unit a learner progresses through, the concepts inside it *are* ordered, and
 * both facts already existed in the data and were rendered nowhere.
 *
 * ## The geometry has exactly one source of truth
 *
 * Node positions and the connecting curve are computed from the same `nodeX/nodeY`
 * pair, in pixels, inside a fixed-width column. A percentage layout with an SVG
 * overlay would need `preserveAspectRatio="none"`, which distorts stroke width and
 * makes the connector disagree with the nodes at some widths — a class of bug you
 * only see on one device. The column is 300px at every viewport, which is also
 * what the reference does: the path is a fixed ribbon, not a fluid grid.
 *
 * ## What is deliberately not borrowed
 *
 * The reference's nodes are unlabelled isometric tiles, and they can be, because
 * its chapters are the content ("Insults with Class") and the nodes are just
 * games. Lexi's nodes are *concepts*, and an unlabelled node would undo the one
 * thing this surface was built for — its own header comment: "a learner arriving
 * at A1 could be asked to choose between den/dem/der/des without the app ever
 * having said what Nominativ is." So every node carries its title, and each
 * chapter keeps a "read the rules" list underneath.
 */
const PATH_W = 300;   // the ribbon, at every viewport
const AMP = 78;       // horizontal swing — bounded so a 120px label stays inside
const ROW_H = 112;    // tile + label + breathing room
const NODE = 56;

/** Period 6, like the reference's six-node chapters. */
const nodeX = (i: number) => PATH_W / 2 + AMP * Math.sin((i * Math.PI) / 3);
const nodeY = (i: number) => NODE / 2 + i * ROW_H;

/** Reserved height of a node's caption: two lines of `text-2xs` plus its top
 *  margin. The connector has to clear it, so it is a constant rather than a
 *  measurement — a layout that queried the DOM would reflow on every font swap. */
const LABEL_H = 34;

/** The connectors, as **stubs between tiles** rather than one continuous ribbon.
 *
 *  The first version drew a single curve through every node centre, which is the
 *  obvious thing and is wrong here: Lexi's nodes carry captions, so a continuous
 *  ribbon runs straight through the words. Measured on screen, not reasoned about
 *  — "sein & haben" had a 3px line through it.
 *
 *  Each segment therefore starts *below* one node's caption and ends *above* the
 *  next node's tile, which is also what the reference actually draws: short links,
 *  not a ribbon. Both handles sit on the segment midline so the stub leans the way
 *  the path is going. */
function connectors(n: number): string {
  let d = '';
  for (let i = 1; i < n; i++) {
    const x0 = nodeX(i - 1), x1 = nodeX(i);
    const y0 = nodeY(i - 1) + NODE / 2 + LABEL_H;   // clear of the caption
    const y1 = nodeY(i) - NODE / 2;                  // top of the next tile
    if (y1 <= y0) continue;                          // no room: draw nothing
    const my = ((y0 + y1) / 2).toFixed(1);
    d += ` M ${x0.toFixed(1)},${y0.toFixed(1)} C ${x0.toFixed(1)},${my} ${x1.toFixed(1)},${my} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d.trim();
}

type NodeState = 'done' | 'due' | 'started' | 'next' | 'new';

function stateOf(s: ReturnType<typeof pointStats>, isNext: boolean): NodeState {
  if (s.count > 0 && s.known === s.count) return 'done';
  if (isNext) return 'next';
  if (s.due > 0) return 'due';
  if (s.seen > 0 || s.metInSession) return 'started';
  return 'new';
}

/** Where the journey resumes: the first unfinished concept in the learner's own
 *  level, and once that level is finished, the first in the next one up.
 *
 *  Deliberately *not* "the first unfinished concept anywhere", which would send a
 *  B1 learner back to A1 article gender forever. Nothing is locked either way —
 *  every node on every chapter stays tappable, which is the rule this surface has
 *  always had. */
function nextStep(bank: GrammarByLevel, home: CEFR): { level: CEFR; pi: number; point: GPoint } | null {
  const order = ALL_LEVELS.slice(ALL_LEVELS.indexOf(home)).concat(ALL_LEVELS.slice(0, ALL_LEVELS.indexOf(home)));
  for (const level of order) {
    const pts = bank[level] ?? [];
    for (let pi = 0; pi < pts.length; pi++) {
      const st = pointStats(level, pts[pi].title, pts[pi].exercises.length);
      if (!(st.count > 0 && st.known === st.count)) return { level, pi, point: pts[pi] };
    }
  }
  return null;
}

/** The resume card. */
function ContinueCard({ bank, home, onGo }: {
  bank: GrammarByLevel; home: CEFR;
  onGo: (level: CEFR, pi: number, point: GPoint) => void;
}) {
  const v = useStore();
  const next = useMemo(() => nextStep(bank, home), [bank, home, v]);
  if (!next) {
    return (
      <Card pad="none" className="flex items-center gap-3 px-4 py-3.5 mb-4">
        <span className="grid place-items-center w-9 h-9 rounded-md flex-shrink-0"
          style={{ background: 'var(--color-green-d)' }}><Trophy size={18} className="text-green" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold">Every concept finished</span>
          <span className="block text-2xs text-dim">All six chapters complete. The mixed bank below keeps them from fading.</span>
        </span>
      </Card>
    );
  }
  const chapter = ALL_LEVELS.indexOf(next.level) + 1;
  return (
    <Card accent pad="none" className="mb-4 px-4 py-3.5">
      <Kicker tone="accent" className="block mb-1.5">
        Kapitel {chapter} · {next.level} · Schritt {next.pi + 1}
      </Kicker>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[12rem]">
          <p lang="de" className="text-lg font-semibold leading-tight">{next.point.title}</p>
          <p className="text-xs text-dim mt-0.5">{next.point.summary}</p>
        </div>
        <Button onClick={() => onGo(next.level, next.pi, next.point)}>
          <Play size={14} /> Üben
        </Button>
      </div>
    </Card>
  );
}

/** Jump to a chapter. Marks the learner's own level, and nothing else — a bar
 *  that also tried to say which chapter you were *scrolled into* would be a
 *  second, lagging answer to a question the scrollbar already answers. */
function ChapterJump({ home, bank }: { home: CEFR; bank: GrammarByLevel }) {
  return (
    <nav aria-label="Chapters" className="flex items-center justify-center gap-1.5 flex-wrap mb-8">
      {ALL_LEVELS.map((l, i) => {
        const n = (bank[l] ?? []).length;
        if (!n) return null;
        return (
          <a key={l} href={`#kapitel-${l}`}
            onClick={(e) => {
              // The app is hash-routed, so a bare `#kapitel-A1` href would be
              // parsed as a route and land the learner on Today. Scroll by hand
              // and leave the URL alone.
              e.preventDefault();
              document.getElementById(`kapitel-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`tap-44 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-2xs transition-colors ${
              l === home ? 'border-accent text-accent bg-panel2' : 'border-line text-dim hover:text-txt'}`}>
            <span className="opacity-60">{i + 1}</span> {l}
          </a>
        );
      })}
    </nav>
  );
}

function Chapter({ n, level, points, isHome, next, open, onToggleRules, onGo }: {
  n: number; level: CEFR; points: GPoint[]; isHome: boolean;
  /** Index of the resume node, when it falls in this chapter. */
  next: number | null;
  open: boolean; onToggleRules: () => void;
  onGo: (pi: number, point: GPoint) => void;
}) {
  const v = useStore();
  const stats = useMemo(
    () => points.map((p) => pointStats(level, p.title, p.exercises.length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- v is the store version
    [points, level, v],
  );
  const done = stats.filter((s) => s.count > 0 && s.known === s.count).length;
  const due = stats.reduce((a, s) => a + s.due, 0);
  if (points.length === 0) return null;

  return (
    <section id={`kapitel-${level}`} aria-labelledby={`chapter-${level}`} className="mb-10 scroll-mt-4">
      <header className="text-center mb-5">
        <Kicker tone={isHome ? 'accent' : 'dim'} className="block">
          Kapitel {n}{isHome && ' · dein Niveau'}
        </Kicker>
        <h2 id={`chapter-${level}`} className="display text-2xl sm:text-3xl mt-1">{level}</h2>
        {/* What the level *is*, in the Council of Europe's own framing. Never a
            claim about the learner — see lib/candos.ts. */}
        <p className="text-xs text-dim mt-1.5 max-w-[34ch] mx-auto leading-relaxed">{CAN_DO[level][0]}</p>
        <p className="font-mono text-2xs text-dim mt-2 tabular-nums">
          {done}/{points.length} finished{due > 0 && ` · ${due} due`}
        </p>
      </header>

      <div className="relative mx-auto" style={{ width: PATH_W, height: points.length * ROW_H }}>
        <svg width={PATH_W} height={points.length * ROW_H} aria-hidden
          className="absolute inset-0 pointer-events-none">
          <path d={connectors(points.length)} fill="none" stroke="var(--color-line)"
            strokeWidth={3} strokeLinecap="round" />
        </svg>
        {points.map((p, i) => (
          <PathNode key={p.title + i} i={i} point={p} stat={stats[i]}
            state={stateOf(stats[i], next === i)} onGo={() => onGo(i, p)} />
        ))}
      </div>

      {/* The syllabus, kept. A path is for *doing*; this is for reading what a
          concept is without starting a drill, which is the question this surface
          was originally built to answer. */}
      <div className="max-w-[560px] mx-auto mt-5">
        <button onClick={onToggleRules} aria-expanded={open}
          className="tap-44 w-full flex items-center justify-center gap-1.5 text-xs text-dim hover:text-accent transition-colors">
          <BookOpen size={14} />
          {open ? 'Regeln ausblenden' : `Alle ${points.length} Regeln lesen`}
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="rules" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
              <div className="pt-3 space-y-1.5">
                {points.map((p, pi) => (
                  <PointRow key={p.title + pi} point={p} stat={stats[pi]} onPractise={() => onGo(pi, p)} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/** One concept on the path.
 *
 *  The tile carries state; the label carries meaning. `title` on the button so a
 *  clamped label is still recoverable, and the accessible name says what tapping
 *  does rather than just naming the concept. */
function PathNode({ i, point, stat, state, onGo }: {
  i: number; point: GPoint; stat: ReturnType<typeof pointStats>; state: NodeState; onGo: () => void;
}) {
  const SKIN: Record<NodeState, string> = {
    done: 'bg-green-d border-green/50 text-green',
    next: 'bg-accent border-accent text-bg shadow-lg',
    due: 'bg-panel border-accent text-accent',
    started: 'bg-panel border-line text-txt',
    new: 'bg-panel2 border-line text-dim',
  };
  return (
    <div className="absolute flex flex-col items-center"
      style={{ left: nodeX(i) - 60, top: nodeY(i) - NODE / 2, width: 120 }}>
      {state === 'next' && (
        <Kicker tone="accent" className="absolute -top-4 whitespace-nowrap">Start</Kicker>
      )}
      <button onClick={onGo} title={point.title}
        aria-label={`${point.title} — ${state === 'done' ? 'finished' : state === 'next' ? 'continue here' : 'practise'}`}
        className={`grid place-items-center w-14 h-14 rounded-lg border-2 font-mono font-bold text-sm
          transition-[filter,transform] hover:brightness-105 active:scale-95 ${SKIN[state]}`}>
        {state === 'done' ? <Check size={22} strokeWidth={2.6} />
          : state === 'next' ? <Play size={20} />
          : i + 1}
      </button>
      <span lang="de" className="mt-1.5 text-2xs text-center leading-tight line-clamp-2 text-txt font-medium">
        {point.title}
      </span>
      {stat.due > 0 && state !== 'next' && (
        <span className="mt-0.5 font-mono text-2xs text-accent tabular-nums">{stat.due} due</span>
      )}
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
