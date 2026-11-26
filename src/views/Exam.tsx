// Prüfung — the testing room, A1 to C2. Restored 2026-11-26.
//
// Two surfaces in one file because they are one thing: you come here to take a
// short test now, to sit a paper when you have the afternoon, or to work the
// oral on its own. The level tabs drive all three.
//
// **What the room is for.** The exam room went on 2026-09-05 with the ruling that
// Lexi is a vocabulary trainer, not exam prep, and VISION still holds that for
// the *scheduler*: nothing here writes an FSRS card, and no exam date ranks any
// work (ruled 2026-11-21). It returned because a learner at a level wants to know
// what that level *feels like on paper* — the formats, the timing, the 60% line —
// and that is something a vocabulary app can show honestly once it stops
// pretending to predict a result. The short tests are generated from the cards;
// the papers are authored, in the published structure of telc and the
// Goethe-Institut, with texts written for Lexi.
//
// **Lexi is silent.** Hören is not set while there is no open voice to set it
// with (VISION, *Lexi is silent*). The paper says so on its cover, the runner
// leaves the Hören blocks out, and the result is scored against what was sat.
//
// The runner is a *sheet*, not a wizard. Every item of a Teil is on one surface
// and you move between Teile freely, because that is how a real candidate works:
// skip 14, do 15–20, come back. The clock is per block, as the exam runs it.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, ClipboardCheck, Clock, FileText, Languages, Loader2, LogOut,
  MessagesSquare, PenLine, Play, Shuffle, TextCursorInput, Timer, Trash2, VolumeX,
} from 'lucide-react';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import { Band } from '../components/ui/Band.tsx';
import PartView from './exam/Parts.tsx';
import SpeakingView from './exam/Speaking.tsx';
import WritingView from './exam/Writing.tsx';
import Results from './exam/Results.tsx';
import Rich from './exam/Rich.tsx';
import Quiz from './exam/Quiz.tsx';
import { PRESETS, buildQuiz, type QuizPreset } from '../lib/quiz.ts';
import { LEVEL_INK, markColor } from '../lib/ui.ts';
import { WORDS } from '../data/index.ts';
import { levelStats, studyLevel } from '../store.ts';
import { useStore } from '../useStore.ts';
import * as ex from '../lib/exam-store.ts';
import {
  MAX, PAPERS, fmtPoints as fmt, loadPaper, papersFor, scoreExam, sittable, sittableBlocks, writingClock,
  type ExamPaper, type PaperMeta, type Part, type Provider, type Sitting, type SpeakingMarks, type WritingMarks,
} from '../lib/exam.ts';
import { ALL_LEVELS, type CEFR, type Target } from '../types.ts';

function useExam(): number {
  return useSyncExternalStore(ex.subscribeExam, ex.examVersion, ex.examVersion);
}

export default function Exam({ onStudy }: { onStudy: (t: Target) => void }) {
  useExam();
  const attempt = ex.current();
  if (attempt) return <Runner attempt={attempt} />;
  return <Room onStudy={onStudy} />;
}

/** The provider as the cover prints it — a format, never a claim of origin. */
const FORMAT: Record<Provider, string> = { telc: 'telc-Format', goethe: 'Goethe-Format' };

const seed = () => Math.floor(Math.random() * 1e9);

// ---- the room --------------------------------------------------------------

function Room({ onStudy }: { onStudy: (t: Target) => void }) {
  useStore();
  const [level, setLevel] = useState<CEFR>(() => studyLevel());
  const [lab, setLab] = useState<string | null>(null);
  // `run` remounts the quiz: "the same questions" is the same seed and a fresh
  // sheet, and without a new key React kept the finished one on screen.
  const [quiz, setQuiz] = useState<{ preset: QuizPreset; seed: number; run: number } | null>(null);
  const papers = papersFor(level);
  const top = useRef<HTMLDivElement>(null);

  const items = useMemo(() => (quiz
    ? buildQuiz({ level, n: quiz.preset.n, kinds: quiz.preset.kinds, seed: quiz.seed }, { words: WORDS })
    : []), [quiz, level]);

  useEffect(() => { top.current?.scrollIntoView({ block: 'start' }); }, [quiz?.run, lab]);

  if (lab) {
    return <div ref={top} className="scroll-mt-4"><SpeakingLab paperId={lab} onExit={() => setLab(null)} /></div>;
  }
  if (quiz) {
    return (
      <div ref={top} className="scroll-mt-4">
        <Quiz key={`${quiz.preset.key}-${quiz.seed}-${quiz.run}`}
          preset={quiz.preset} items={items} level={level}
          onExit={() => setQuiz(null)}
          onRetry={() => setQuiz({ ...quiz, run: quiz.run + 1 })}
          onNew={() => setQuiz({ preset: quiz.preset, seed: seed(), run: quiz.run + 1 })}
          onPractise={(ids) => onStudy({ kind: 'custom', name: `Aus dem Test · ${quiz.preset.label}`, ids })} />
      </div>
    );
  }

  return (
    <div ref={top} className="w-full max-w-[820px] mx-auto scroll-mt-4">
      <header className="mb-5">
        <Kicker tone="accent">Testraum · A1–C2</Kicker>
        <h1 className="display text-5xl sm:text-6xl leading-none mt-1.5">Prüfung</h1>
        <p className="text-sm text-dim leading-relaxed mt-3 max-w-[56ch]">
          Short tests built from the cards you are learning, and a full paper at every level in the
          telc and Goethe formats. A test reports; it never touches your schedule.
        </p>
      </header>

      <LevelTabs level={level} onChange={setLevel} />
      <Standing level={level} />

      <section className="mt-6" aria-labelledby="paper-h">
        <h2 id="paper-h" className="text-lg font-bold mb-2.5">Die Prüfung</h2>
        {papers.map((meta) => <Cover key={meta.id} meta={meta} onLab={() => setLab(meta.id)} />)}
      </section>

      <section className="mt-8" aria-labelledby="quiz-h">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h2 id="quiz-h" className="text-lg font-bold">Kurze Tests</h2>
          <span className="font-mono text-2xs text-dim">3–5 min</span>
        </div>
        <p className="text-xs text-dim leading-relaxed mb-3">
          Generated from Lexi’s cards at {level} and below, so every level has them. Answer, find out,
          move on.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <QuizTile key={p.key} preset={p} level={level}
              onClick={() => setQuiz({ preset: p, seed: seed(), run: 0 })} />
          ))}
        </div>
      </section>

      <History />

      <p className="text-2xs text-dim leading-relaxed mt-10 pt-4 border-t border-line">
        Lexi is not affiliated with telc gGmbH or the Goethe-Institut, and these are not their
        papers. The structure, item counts, timing and mark schemes follow what both publish; every
        text is written for Lexi. Sit the real Modellsätze before the day.
      </p>
    </div>
  );
}

/** Six levels, one highlighter — the same pressed key the bottom bar uses. */
function LevelTabs({ level, onChange }: { level: CEFR; onChange: (l: CEFR) => void }) {
  return (
    <div role="tablist" aria-label="Niveau" className="grid grid-cols-6 gap-1 p-1 rounded-key bg-panel2">
      {ALL_LEVELS.map((l) => {
        const on = l === level;
        return (
          <button key={l} role="tab" aria-selected={on} onClick={() => onChange(l)}
            className={`tap-44 rounded-key py-2 display text-base transition-colors
              ${on ? 'bg-key text-key-ink' : 'text-dim hover:text-txt'}`}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

/** Where the cards stand, cumulatively — a certificate tests everything up to its
 *  level. A count of what Lexi measured, never a prediction of a grade. */
function Standing({ level }: { level: CEFR }) {
  const upTo = ALL_LEVELS.slice(0, ALL_LEVELS.indexOf(level) + 1);
  const s = levelStats().filter((x) => upTo.includes(x.level))
    .reduce((a, x) => ({ learned: a.learned + x.learned, count: a.count + x.count }), { learned: 0, count: 0 });
  if (!s.count) return null;
  const share = s.learned / s.count;
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="flex-1 h-1.5 rounded-full bg-panel2 overflow-hidden">
        <span className="block h-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(share * 100, s.learned ? 1 : 0)}%` }} />
      </span>
      <span className="font-mono text-2xs text-dim tabular-nums">
        {s.learned.toLocaleString('de-DE')} / {s.count.toLocaleString('de-DE')} Karten bis {level}
      </span>
    </div>
  );
}

/** The paper's cover sheet: squared paper, the level in its band ink, what is
 *  in it and what is not, and the two ways to sit it. */
function Cover({ meta, onLab }: { meta: PaperMeta; onLab: () => void }) {
  const best = ex.best(meta.id);
  const minutes = meta.minutes - meta.silentMinutes;
  const parts = SUBTESTS[meta.provider];
  return (
    <article className="karo relative overflow-hidden rounded-lg border border-line shadow-[0_18px_40px_-28px_rgba(22,24,31,0.45)]">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Kicker>{FORMAT[meta.provider]}</Kicker>
            <p className="display text-7xl leading-[0.9] mt-2" style={{ color: LEVEL_INK[meta.level] }}>
              {meta.level}
            </p>
            <h3 className="text-base font-bold mt-2 leading-snug">{meta.title}</h3>
          </div>
          {best && (
            <span className={`stamp text-xs mt-1 flex-shrink-0 ${
              best.provisional ? 'text-accent' : best.passed ? 'text-green' : 'text-red-txt'}`}
              aria-label={`Bestes Ergebnis ${fmt(best.total)} von ${fmt(best.max)}`}>
              Bestes<br />{fmt(best.total)}/{fmt(best.max)}
            </span>
          )}
        </div>

        <p className="text-sm text-dim leading-relaxed mt-3 max-w-[60ch]">{meta.blurb}</p>

        <ul className="flex flex-wrap gap-1.5 mt-4" aria-label="Teile">
          {parts.map((p) => (
            <li key={p} className="rounded-key border border-line bg-card px-2.5 py-1 text-xs font-semibold">{p}</li>
          ))}
          <li className="inline-flex items-center gap-1 rounded-key border border-dashed border-line bg-card px-2.5 py-1 text-xs text-dim">
            <VolumeX size={12} aria-hidden /> <s>Hören</s> ruht
          </li>
        </ul>
        <p className="font-mono text-2xs text-dim tabular-nums mt-2">
          ~{minutes} min ohne Hören · {meta.minutes} min im Original
        </p>

        <div className="mt-5 grid sm:grid-cols-2 gap-2">
          <Mode title="Übungsmodus" sub="Check each Teil as you finish it and read why every key is the key."
            icon={<Play size={14} />} primary onClick={() => ex.start(meta.id, 'practice')} />
          <Mode title="Prüfungsmodus" sub="Timed. Each block locks when it runs out; nothing is marked until you hand in."
            icon={<Timer size={14} />} onClick={() => ex.start(meta.id, 'exam')} />
        </div>
        <button onClick={onLab}
          className="tap-44 mt-2 w-full flex items-center gap-3 rounded-md border border-line bg-card px-3.5 py-3 text-left hover:border-accent transition-colors">
          <MessagesSquare size={16} className="text-accent flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Sprechen — Aufgaben und Modelle</span>
            <span className="block text-2xs text-dim">The oral on its own, with model answers at three strengths. No sitting needed.</span>
          </span>
          <ArrowRight size={15} className="text-dim flex-shrink-0" />
        </button>
      </div>
    </article>
  );
}

/** What a sitting here contains, by board. Hören is listed apart, as resting. */
const SUBTESTS: Record<Provider, string[]> = {
  telc: ['Lesen', 'Sprachbausteine', 'Schreiben', 'Sprechen'],
  goethe: ['Lesen', 'Schreiben', 'Sprechen'],
};

function Mode({ title, sub, icon, onClick, primary = false }: {
  title: string; sub: string; icon: ReactNode; onClick: () => void; primary?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`key tap-44 w-full rounded-md px-4 py-3 text-left transition-colors
        ${primary ? 'bg-key text-key-ink' : 'bg-card text-txt'}`}>
      <span className="flex items-center gap-2 text-sm font-bold">{icon}{title}</span>
      <span className={`block text-2xs leading-relaxed mt-1 ${primary ? '' : 'text-dim'}`}>{sub}</span>
    </button>
  );
}

/** One short test: what it asks, how long, and the best run at this level. */
function QuizTile({ preset, level, onClick }: { preset: QuizPreset; level: CEFR; onClick: () => void }) {
  const best = ex.quizResults()[`${preset.key}:${level}`];
  const pct = best ? Math.round((100 * best.correct) / best.total) : null;
  return (
    <button onClick={onClick}
      className="tap-44 w-full rounded-md border border-line bg-card p-3.5 text-left hover:border-accent transition-colors flex flex-col">
      <span className="flex items-center justify-between gap-2">
        <Glyph k={preset.key} />
        <span className="font-mono text-2xs text-dim tabular-nums whitespace-nowrap">{preset.n} · {preset.minutes}′</span>
      </span>
      <span className="block text-sm font-bold mt-3 leading-snug">{preset.label}</span>
      <span className="block text-2xs text-dim leading-relaxed mt-1 flex-1">{preset.blurb}</span>
      <span className={`block font-mono text-2xs tabular-nums mt-2 ${pct == null ? 'text-dim' : pct >= 60 ? 'text-green' : 'text-red-txt'}`}>
        {pct == null ? 'noch nicht gemacht' : `bestes ${pct}%`}
      </span>
    </button>
  );
}

function Glyph({ k }: { k: string }) {
  if (k === 'gender') {
    return (
      <span className="flex gap-0.5" aria-hidden>
        {(['der', 'die', 'das'] as const).map((g) => (
          <span key={g} className="rounded-sm px-1 text-2xs font-bold"
            style={{ background: markColor(g), color: 'var(--color-mark-ink)' }}>{g}</span>
        ))}
      </span>
    );
  }
  const Icon = k === 'vocab' ? Languages : k === 'context' ? TextCursorInput : Shuffle;
  return <Icon size={18} className="text-accent" aria-hidden />;
}

function History() {
  const past = ex.history();
  if (!past.length) return null;
  return (
    <section className="mt-8" aria-labelledby="hist-h">
      <h2 id="hist-h" className="text-lg font-bold mb-2.5">Frühere Sitzungen</h2>
      <Band label="Frühere Sitzungen">
        {past.slice(0, 12).map((a, i) => {
          const meta = PAPERS.find((p) => p.id === a.paperId);
          // Frozen with the sitting. Rows filed before papers had schemes carry
          // neither figure, and those rows are telc B1 by construction.
          const max = a.score?.max ?? 300;
          const passed = a.score?.passed ?? (a.score ? a.score.written >= 135 && a.score.oral >= 45 : false);
          return (
            <div key={`${a.started}-${i}`} className="px-3 sm:px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-sm font-bold w-8 flex-shrink-0"
                style={meta ? { color: LEVEL_INK[meta.level] } : undefined}>
                {meta?.level ?? '—'}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{meta?.title ?? a.paperId}</span>
                <span className="block font-mono text-2xs text-dim">
                  {new Date(a.finished ?? a.started).toLocaleDateString('de-DE')} · {a.mode === 'exam' ? 'Prüfungsmodus' : 'Übungsmodus'}
                </span>
              </span>
              {a.score
                // A provisional sitting is a floor: ink, not a verdict colour.
                ? <span className={`font-mono text-sm font-bold tabular-nums ${
                  a.score.provisional ? 'text-accent' : passed ? 'text-green' : 'text-red-txt'}`}>
                  {fmt(a.score.total)}<span className="text-dim font-normal">/{fmt(max)}</span>
                </span>
                : <span className="font-mono text-2xs text-dim">abgebrochen</span>}
            </div>
          );
        })}
      </Band>
    </section>
  );
}

// ---- the speaking lab, standalone -----------------------------------------

function SpeakingLab({ paperId, onExit }: { paperId: string; onExit: () => void }) {
  const paper = usePaper(paperId);
  return (
    <div className="w-full max-w-[820px] mx-auto">
      <button onClick={onExit} className="tap-44 inline-flex items-center gap-1.5 text-xs font-semibold text-dim hover:text-accent mb-3">
        <ArrowLeft size={14} /> Prüfung
      </button>
      {!paper ? <Spinner /> : <SpeakingView topics={paper.speaking} redemittel={paper.redemittel} />}
    </div>
  );
}

function usePaper(id: string): ExamPaper | null {
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  useEffect(() => {
    let live = true;
    loadPaper(id).then((p) => { if (live) setPaper(p); }).catch(() => { /* the spinner stays */ });
    return () => { live = false; };
  }, [id]);
  return paper;
}

function Spinner() {
  return <div className="grid place-items-center min-h-[240px] text-dim"><Loader2 className="animate-spin" /></div>;
}

// ---- the runner ------------------------------------------------------------

type Clock = { label: string; minutes: number };
type Screen =
  | { kind: 'brief'; key: string; short: string }
  | { kind: 'part'; key: string; short: string; part: Part; clock: Clock | null }
  | { kind: 'writing'; key: string; short: string; clock: Clock }
  | { kind: 'speaking'; key: string; short: string }
  | { kind: 'results'; key: string; short: string };

function Runner({ attempt }: { attempt: ex.Attempt }) {
  const paper = usePaper(attempt.paperId);
  const [ix, setIx] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const screens: Screen[] = useMemo(() => {
    if (!paper) return [];
    const blocks = sittableBlocks(paper);
    const clockOf = (partId: string): Clock | null => blocks.find((b) => b.partIds.includes(partId)) ?? null;
    return [
      { kind: 'brief', key: 'brief', short: 'Vorher' },
      ...sittable(paper).map((p): Screen => ({
        kind: 'part', key: p.id, short: `${shortName(p)} ${p.teil}`, part: p, clock: clockOf(p.id),
      })),
      // Goethe C1 also sets "Schreiben, Aufgabe 2" as a part, so the letter is Aufgabe 1 there.
      { kind: 'writing', key: 'writing', clock: writingClock(paper),
        short: sittable(paper).some((p) => shortName(p) === 'Schreiben') ? 'Schreiben 1' : 'Schreiben' },
      { kind: 'speaking', key: 'speaking', short: 'Sprechen' },
      { kind: 'results', key: 'results', short: 'Ergebnis' },
    ];
  }, [paper]);

  const screen = screens[Math.min(ix, screens.length - 1)];
  const submitted = !!attempt.submitted;

  // Scroll the sheet, not the window: moving from Teil 2 to Teil 3 must start at
  // the rubric, and on a phone the previous Teil is 2,000px tall.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
    // …and keep the step you are on visible in the stepper, which scrolls sideways
    // on a phone: handing in jumped to "Ergebnis" and left it off the edge.
    const nav = navRef.current;
    const on = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (nav && on) nav.scrollTo({ left: on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
  }, [ix]);

  const sitting: Sitting = { responses: attempt.responses, writing: attempt.writing, speaking: attempt.speaking };
  const result = paper ? scoreExam(paper, sitting) : null;

  const frozen = () => result && ({
    written: result.written, oral: result.oral, total: result.total,
    // The maximum of what was sat, frozen with the points (Hören is not in it).
    max: result.max, passed: result.passed,
    // Frozen too, so history never files a floor as a fail (2026-11-26).
    provisional: result.provisional,
  });
  const hand = () => {
    const score = frozen();
    if (!result || !score) return;
    // Writing and speaking are omitted until self-assessed, so an unmarked letter
    // reads as "not measured" rather than as a zero.
    const strands: Record<string, number> = {};
    for (const k of ['reading', 'language', 'listening', 'writing', 'speaking'] as const) {
      const { points, max } = result.bySubtest[k];
      if (!max) continue;
      // `unmarked` and not `!attempt.speaking`: one marked Teil of three is not a
      // marked oral, and counting the other two as zero understated the strand.
      if ((k === 'writing' || k === 'speaking') && result.unmarked.includes(k)) continue;
      strands[k] = points / max;
    }
    ex.submit(score, strands);
    setIx(screens.findIndex((s) => s.kind === 'results'));
  };
  const leave = () => {
    const score = frozen();
    if (attempt.submitted && score) ex.finish(score);
    else ex.abandon();
  };

  if (!paper || !screen || !result) {
    return <div className="w-full max-w-[820px] mx-auto"><Spinner /></div>;
  }

  const clock = 'clock' in screen ? screen.clock : null;
  const sat = sittable(paper);
  const answered = sat.reduce((n, p) => n + p.items.filter((i) => attempt.responses[i.n]).length, 0);
  const itemCount = sat.reduce((n, p) => n + p.items.length, 0);
  const expired = (c: Clock | null) => attempt.mode === 'exam' && !!c
    && (attempt.clocks?.[c.label] ?? c.minutes * 60) <= 0;

  return (
    <div className="w-full max-w-[820px] mx-auto">
      <div ref={topRef} className="scroll-mt-4" />

      {/* ---- the running head ----
          Two rows, so the title wraps rather than truncating: on a phone the clock and
          the leave key left it "telc Deutsch B1 · Ü…" (simulator, 2026-11-26). */}
      <div className="mb-3">
        <div className="flex items-start gap-2">
          <span className="flex-1 min-w-0 text-sm font-bold leading-snug pt-1.5">{paper.title}</span>
          <button onClick={leave}
            className="tap-44 shrink-0 inline-flex items-center gap-1.5 rounded-key border border-line px-3.5 py-2 text-xs font-semibold text-dim hover:border-accent hover:text-accent transition-colors">
            <LogOut size={13} /> {submitted ? 'Fertig' : 'Verlassen'}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex-1 min-w-0 font-mono text-2xs text-dim tabular-nums">
            {attempt.mode === 'exam' ? 'Prüfungsmodus' : 'Übungsmodus'} · {answered}/{itemCount} beantwortet
          </span>
          {clock && <BlockClock key={clock.label} clock={clock} attempt={attempt} />}
        </div>
      </div>

      {/* ---- the stepper ---- */}
      <nav ref={navRef} aria-label="Teile" className="relative flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
        {screens.map((s, i) => {
          const on = i === ix;
          const done = s.kind === 'part' ? s.part.items.every((it) => attempt.responses[it.n])
            : (s.kind === 'writing' || s.kind === 'speaking') && !result.unmarked.includes(s.kind);
          // A Teil with every item answered is written in the pen's ink
          // *(2026-11-26)*. It was green, which in the Heft means *right*, on a
          // tab that in Prüfungsmodus knows nothing about right until hand-in.
          return (
            <button key={s.key} onClick={() => setIx(i)} aria-current={on ? 'step' : undefined}
              aria-label={done && !on ? `${s.short}, alles beantwortet` : undefined}
              className={`tap-44 flex-shrink-0 rounded-key border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors
                ${on ? 'border-transparent bg-key text-key-ink'
                  : done ? 'border-accent text-accent' : 'border-line text-dim hover:border-accent'}`}>
              {s.short}
            </button>
          );
        })}
      </nav>

      {/* ---- the sheet ---- */}
      <div className="karo -mx-3 px-3 py-5 sm:mx-0 sm:px-6 sm:py-6 sm:rounded-lg sm:border sm:border-line">
        {screen.kind === 'brief' && <Brief paper={paper} mode={attempt.mode} />}

        {screen.kind === 'part' && (
          <PartScreen attempt={attempt} part={screen.part} clock={screen.clock}
            submitted={submitted} expired={expired(screen.clock)} />
        )}

        {screen.kind === 'writing' && (
          <>
            {expired(screen.clock) && !submitted && <TimeUp clock={screen.clock} />}
            <WritingView
              task={paper.writing}
              provider={paper.provider}
              points={(paper.scheme ?? MAX).writing}
              letter={attempt.letter ?? ''}
              onLetter={ex.setLetter}
              marks={attempt.writing}
              onMarks={(m: WritingMarks) => ex.setWritingMarks(m)}
              locked={expired(screen.clock) && !submitted}
            />
          </>
        )}

        {screen.kind === 'speaking' && (
          <SpeakingView
            topics={paper.speaking} redemittel={paper.redemittel}
            marks={attempt.speaking}
            onMarks={(t: 1 | 2 | 3, m: SpeakingMarks) => ex.setSpeakingMarks(t, m)}
          />
        )}

        {screen.kind === 'results' && (
          <Results paper={paper} result={result} onReview={() => setIx(1)} />
        )}
      </div>

      {/* ---- moving on ---- */}
      <div className="flex flex-wrap items-center gap-2 mt-5">
        <Button variant="quiet" size="sm" disabled={ix === 0} onClick={() => setIx((i) => Math.max(0, i - 1))}>
          <ArrowLeft size={13} /> Zurück
        </Button>
        {ix < screens.length - 1 && (
          <Button size="sm" onClick={() => setIx((i) => i + 1)}>
            Weiter <ArrowRight size={13} />
          </Button>
        )}
        <span className="flex-1" />
        {!submitted && (
          <Button variant="secondary" size="sm" onClick={hand}>
            <ClipboardCheck size={13} /> Abgeben
          </Button>
        )}
      </div>
    </div>
  );
}

/** The stepper's tag, from the part's own label ("Leseverstehen, Teil 2" →
 *  "Lesen 2"), with telc's long nouns cut to the word a candidate says. */
const SHORT: Record<string, string> = { Leseverstehen: 'Lesen', Hörverstehen: 'Hören', Sprachbausteine: 'Bausteine' };
const shortName = (p: Part) => {
  const word = p.label.split(/[,\s]/)[0];
  return SHORT[word] ?? word;
};

function TimeUp({ clock }: { clock: Clock }) {
  return (
    <Card accent pad="sm" className="mb-4">
      <p className="text-sm">
        <span className="font-semibold">Zeit abgelaufen.</span> {clock.label}’s {clock.minutes} minutes are
        up, so the sheet is closed — as an invigilator would close it. Move on; your answers are kept.
      </p>
    </Card>
  );
}

/** One part of the sheet, plus the practice-mode "check this Teil" control. */
function PartScreen({ attempt, part, clock, submitted, expired }: {
  attempt: ex.Attempt; part: Part; clock: Clock | null; submitted: boolean; expired: boolean;
}) {
  const checked = attempt.checked.includes(part.id);
  const reveal = submitted || (attempt.mode === 'practice' && checked);
  const done = part.items.filter((i) => attempt.responses[i.n]).length;

  return (
    <>
      {expired && !submitted && clock && <TimeUp clock={clock} />}

      <PartView
        part={part}
        responses={attempt.responses}
        onAnswer={(n, k) => ex.answer(n, k)}
        reveal={reveal}
        locked={reveal || expired}
      />

      {attempt.mode === 'practice' && !reveal && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => ex.markChecked(part.id)}>
            <ClipboardCheck size={13} /> Diesen Teil prüfen
          </Button>
          <span className="font-mono text-2xs text-dim tabular-nums">
            {done}/{part.items.length} beantwortet · checking is final for this Teil
          </span>
        </div>
      )}
    </>
  );
}

/** The countdown for the block this screen belongs to.
 *
 *  Mounted with `key={clock.label}` by the caller, which is what makes the initial
 *  read correct: `attempt` gets a new identity on every store write — including
 *  the clock's own five-second save — so *syncing* `left` from the attempt in an
 *  effect would fight the tick. Read the persisted value once at mount, own it
 *  from there, and let a change of block remount the component. */
function BlockClock({ clock, attempt }: { clock: Clock; attempt: ex.Attempt }) {
  const total = clock.minutes * 60;
  const [left, setLeft] = useState(() => attempt.clocks?.[clock.label] ?? total);
  const saved = useRef(left);

  // The tick lives in the interval callback rather than inside a `setLeft`
  // updater: `setClock` writes to the exam store, the store emits, and `Exam` —
  // subscribed via `useSyncExternalStore` — would be told to update *while this
  // component was rendering*. A state updater has to be pure.
  const leftRef = useRef(left);
  useEffect(() => {
    if (attempt.submitted) return;
    const id = setInterval(() => {
      const next = Math.max(0, leftRef.current - 1);
      leftRef.current = next;
      setLeft(next);
      // Persist every five seconds rather than every tick: a sitting must survive
      // a reload, and rewriting the sheet once a second to save one second is the
      // wrong trade.
      if (saved.current - next >= 5 || next === 0) { saved.current = next; ex.setClock(clock.label, next); }
    }, 1000);
    return () => { clearInterval(id); ex.setClock(clock.label, leftRef.current); };
  }, [clock.label, attempt.submitted]);

  const m = Math.floor(left / 60);
  const s = left % 60;
  const low = left <= 300;
  return (
    <span role="timer" aria-label={`${clock.label}: ${m} Minuten ${s} Sekunden übrig`}
      className={`inline-flex items-center gap-1.5 rounded-key border px-3 py-1.5 font-mono text-sm font-bold tabular-nums
      ${left === 0 ? 'border-red text-red-txt' : low ? 'border-transparent bg-key text-key-ink' : 'border-line text-dim'}`}
      title={`${clock.label} · ${clock.minutes} Minuten`}>
      <Clock size={13} />{m}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ---- the night before ------------------------------------------------------

function Brief({ paper, mode }: { paper: ExamPaper; mode: ex.Mode }) {
  const blocks = sittableBlocks(paper);
  const silent = paper.blocks.filter((b) => !blocks.includes(b));
  const w = writingClock(paper);
  const ownWriting = !paper.blocks.some((b) => b.label === w.label);
  const rows = [...blocks.map((b) => ({ label: b.label, minutes: b.minutes })), ...(ownWriting ? [w] : [])];
  const board = paper.provider === 'telc' ? 'telc' : 'the Goethe-Institut';
  return (
    <div className="w-full">
      <h2 className="display text-2xl sm:text-3xl mb-1">Vor der Prüfung</h2>
      <p className="text-dim text-xs mb-4 leading-relaxed">
        {mode === 'exam'
          ? `Prüfungsmodus: no feedback until you hand in, and each block locks when it runs out — `
            + `${rows.map((b) => `${b.label} ${b.minutes}′`).join(', ')}.`
          : 'Übungsmodus: check each Teil when you finish it and read why each key is the key. The clock runs but nothing locks.'}
      </p>

      <Card pad="md" tone="card" className="mb-4">
        <Kicker tone="accent" className="block mb-2">Der Ablauf</Kicker>
        <div className="space-y-1.5">
          {rows.map((b) => (
            <div key={b.label} className="flex items-baseline gap-3 text-sm">
              <span className="font-mono text-dim tabular-nums w-16 flex-shrink-0">{b.minutes} min</span>
              <span className="flex-1">{b.label}</span>
            </div>
          ))}
          {silent.map((b) => (
            <div key={b.label} className="flex items-baseline gap-3 text-sm text-dim">
              <span className="font-mono tabular-nums w-16 flex-shrink-0"><s>{b.minutes} min</s></span>
              <span className="flex-1 inline-flex items-center gap-1.5"><VolumeX size={13} aria-hidden /><s>{b.label}</s> — not set while Lexi is silent</span>
            </div>
          ))}
          <div className="flex items-baseline gap-3 text-sm">
            <span className="font-mono text-dim tabular-nums w-16 flex-shrink-0">~15 min</span>
            <span className="flex-1">
              Mündliche Prüfung{' '}
              <span className="text-dim">{paper.oralFormat ?? '(paarweise, 20 Minuten Vorbereitung davor)'}</span>
            </span>
          </div>
        </div>
      </Card>

      <div className="space-y-2 mb-4">
        {paper.briefing.map((b, i) => (
          <Card key={i} pad="sm" tone="card">
            <p className="text-sm font-semibold mb-1">{b.q}</p>
            <p className="text-sm text-dim leading-relaxed"><Rich>{b.a}</Rich></p>
          </Card>
        ))}
      </div>

      <Card tone="sunken" pad="sm">
        <div className="flex items-start gap-2.5">
          <FileText size={15} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            This paper follows the structure, item counts and mark scheme {board} publishes. The texts are
            written for Lexi — none of {board}’s material is reproduced, so memorising this paper cannot
            help you on the day. That is the point. Without Hören, every maximum and pass line is scaled to
            what you sit, and the result says so.
          </p>
        </div>
      </Card>

      <p className="text-2xs text-dim mt-4 flex items-center gap-1.5">
        <PenLine size={12} /> Have paper and a pen next to you: in the paper-based exam the writing is by hand.
      </p>
      <p className="text-2xs text-dim mt-1 flex items-center gap-1.5">
        <Trash2 size={12} /> Leaving before you hand in discards the sitting; handing in files it in your history.
      </p>
    </div>
  );
}
