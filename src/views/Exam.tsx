// Exam practice — the room, and the paper.
//
// Two surfaces in one file because they are one thing: you come here either to
// sit a paper or to work the speaking scripts, and the second is reachable
// without the first (someone with the exam next week wants the oral material at
// a bus stop, not behind a 90-minute reading test).
//
// The runner is a *sheet*, not a wizard. All ten or twenty items of a Teil are
// on one scrollable surface and you move between Teile freely, because that is
// how a real candidate works: skip 14, do 15–20, come back. The clock is per
// block, exactly as telc runs it — Leseverstehen and Sprachbausteine share one
// 90-minute budget you spend yourself, which is itself an exam skill.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft, ArrowRight, ClipboardCheck, Clock, FileText, Loader2, LogOut,
  MessagesSquare, PenLine, Play, Trash2,
} from 'lucide-react';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Chip from '../components/ui/Chip.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import PartView from './exam/Parts.tsx';
import SpeakingView from './exam/Speaking.tsx';
import WritingView from './exam/Writing.tsx';
import Results from './exam/Results.tsx';
import Rich from './exam/Rich.tsx';
import { stopTrack } from '../lib/exam-audio.ts';
import * as ex from '../lib/exam-store.ts';
import {
  PAPERS, loadPaper, papersFor, scoreExam,
  type ExamPaper, type Part, type Sitting, type SpeakingMarks, type WritingMarks,
} from '../lib/exam.ts';
import { ALL_LEVELS, type CEFR } from '../types.ts';

function useExam(): number {
  return useSyncExternalStore(ex.subscribeExam, ex.examVersion, ex.examVersion);
}

export default function Exam({ onExit, onGrammar }: { onExit: () => void; onGrammar: () => void }) {
  useExam();
  const attempt = ex.current();
  useEffect(() => () => stopTrack(), []);
  if (attempt) return <Runner attempt={attempt} onExit={onExit} onGrammar={onGrammar} />;
  return <Room onGrammar={onGrammar} />;
}

// ---- the room --------------------------------------------------------------

function Room({ onGrammar }: { onGrammar: () => void }) {
  const [level, setLevel] = useState<CEFR>('B1');
  const [lab, setLab] = useState<string | null>(null);
  const papers = papersFor(level);

  if (lab) return <SpeakingLab paperId={lab} onExit={() => setLab(null)} />;

  return (
    <div className="w-full max-w-[820px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Exam practice</h1>
      <p className="text-dim text-xs mb-4 leading-relaxed">
        A full certificate paper in the real format, the real weighting and the real clock — with the
        answer keys explained, and the oral rehearsed against worked answers at three levels.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {ALL_LEVELS.map((l) => {
          const n = papersFor(l).length;
          return (
            <button key={l} onClick={() => setLevel(l)} aria-pressed={level === l}
              className={`tap-44 rounded-md border px-3 py-2 font-mono text-sm font-bold transition-colors
                ${level === l ? 'border-amber text-amber' : 'border-line text-dim hover:border-amber'}`}>
              {l}
              <span className="ml-1.5 text-2xs opacity-70">{n || '–'}</span>
            </button>
          );
        })}
      </div>

      {papers.length === 0 ? (
        <Card pad="md" className="mb-4">
          <p className="text-sm leading-relaxed">
            No {level} paper yet. B1 came first because it is the most-taken certificate in the category
            and the one that gates residence and apprenticeships; the rest follow the same structure and
            the same scoring engine, so adding one is authoring, not building.
          </p>
        </Card>
      ) : papers.map((meta) => {
        const best = ex.bestTotal(meta.id);
        return (
          <Card key={meta.id} pad="md" className="mb-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
              <h2 className="text-base font-bold">{meta.title}</h2>
              <Chip tone="dim">{meta.minutes} min</Chip>
              {best != null && <Chip tone="good">best {fmt(best)} / 300</Chip>}
            </div>
            <p className="text-sm text-dim leading-relaxed mb-3">{meta.blurb}</p>

            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <ModeCard
                title="Übungsmodus" sub="Check each Teil as you finish it and read why every key is the key. The clock runs but nothing locks."
                onClick={() => ex.start(meta.id, 'practice')} primary />
              <ModeCard
                title="Prüfungsmodus" sub="No feedback until you hand in. The 90-minute block locks when it expires, and Teil 1 of the listening plays once."
                onClick={() => ex.start(meta.id, 'exam')} />
            </div>

            <button onClick={() => setLab(meta.id)}
              className="tap-44 w-full flex items-center gap-3 rounded-md border border-line bg-panel2 px-3 py-2.5 text-left hover:border-amber transition-colors">
              <span className="grid place-items-center w-8 h-8 rounded-md bg-panel text-amber flex-shrink-0">
                <MessagesSquare size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">Sprechen — die Skripte</span>
                <span className="block text-2xs text-dim">
                  All three parts of the oral with model answers at A2, B1 and B2, plus the Redemittel. No sitting required.
                </span>
              </span>
              <ArrowRight size={15} className="text-dim flex-shrink-0" />
            </button>
          </Card>
        );
      })}

      <History onGrammar={onGrammar} />
    </div>
  );
}

function ModeCard({ title, sub, onClick, primary = false }: {
  title: string; sub: string; onClick: () => void; primary?: boolean;
}) {
  return (
    <Card as="button" nested pad="none" accent={primary} onClick={onClick}
      className="tap-44 w-full px-3 py-2.5 text-left hover:border-amber transition-colors">
      <span className="flex items-center gap-2">
        <Play size={13} className={primary ? 'text-amber' : 'text-dim'} />
        <span className="text-sm font-semibold">{title}</span>
      </span>
      <span className="block text-2xs text-dim leading-relaxed mt-1">{sub}</span>
    </Card>
  );
}

function History({ onGrammar }: { onGrammar: () => void }) {
  const past = ex.history();
  if (!past.length) return null;
  return (
    <div className="mt-5">
      <Kicker tone="accent" className="block mb-2">Frühere Sitzungen</Kicker>
      <div className="space-y-1.5">
        {past.map((a, i) => {
          const meta = PAPERS.find((p) => p.id === a.paperId);
          const passed = a.score ? a.score.written >= 135 && a.score.oral >= 45 : false;
          return (
            <Card key={`${a.started}-${i}`} pad="sm">
              <div className="flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{meta?.title ?? a.paperId}</span>
                  <span className="block font-mono text-2xs text-dim">
                    {new Date(a.finished ?? a.started).toLocaleDateString('en-GB')} · {a.mode === 'exam' ? 'Prüfungsmodus' : 'Übungsmodus'}
                  </span>
                </span>
                {a.score
                  ? <Chip tone={passed ? 'good' : 'bad'}>{fmt(a.score.total)} / 300</Chip>
                  : <Chip tone="dim">abgebrochen</Chip>}
              </div>
            </Card>
          );
        })}
      </div>
      <button onClick={onGrammar}
        className="tap-44 mt-2 text-2xs font-mono uppercase tracking-widest text-dim hover:text-amber">
        Zur Grammatik-Bibliothek
      </button>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

// ---- the speaking lab, standalone -----------------------------------------

function SpeakingLab({ paperId, onExit }: { paperId: string; onExit: () => void }) {
  const paper = usePaper(paperId);
  return (
    <div className="w-full max-w-[820px] mx-auto">
      <button onClick={onExit} className="tap-44 inline-flex items-center gap-1.5 text-xs text-dim hover:text-amber mb-3">
        <ArrowLeft size={14} /> Exam practice
      </button>
      {!paper ? <Spinner /> : <SpeakingView topics={paper.speaking} redemittel={paper.redemittel} />}
    </div>
  );
}

function usePaper(id: string): ExamPaper | null {
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  useEffect(() => {
    let live = true;
    loadPaper(id).then((p) => { if (live) setPaper(p); }).catch(() => { /* handled by the spinner */ });
    return () => { live = false; };
  }, [id]);
  return paper;
}

function Spinner() {
  return <div className="grid place-items-center min-h-[240px] text-dim"><Loader2 className="animate-spin" /></div>;
}

// ---- the runner ------------------------------------------------------------

type Screen =
  | { kind: 'brief'; key: string; short: string }
  | { kind: 'part'; key: string; short: string; part: Part; block: string }
  | { kind: 'writing'; key: string; short: string; block: string }
  | { kind: 'speaking'; key: string; short: string }
  | { kind: 'results'; key: string; short: string };

function Runner({ attempt, onExit, onGrammar }: {
  attempt: ex.Attempt; onExit: () => void; onGrammar: () => void;
}) {
  const paper = usePaper(attempt.paperId);
  const [ix, setIx] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const screens: Screen[] = useMemo(() => {
    if (!paper) return [];
    const blockOf = (partId: string) =>
      paper.blocks.find((b) => b.partIds.includes(partId))?.label ?? '';
    return [
      { kind: 'brief', key: 'brief', short: 'Vorher' },
      ...paper.parts.map((p): Screen => ({
        kind: 'part', key: p.id, short: `${shortName(p)} ${p.teil}`, part: p, block: blockOf(p.id),
      })),
      { kind: 'writing', key: 'writing', short: 'Brief', block: 'Schriftlicher Ausdruck' },
      { kind: 'speaking', key: 'speaking', short: 'Sprechen' },
      { kind: 'results', key: 'results', short: 'Ergebnis' },
    ];
  }, [paper]);

  const screen = screens[Math.min(ix, screens.length - 1)];
  const submitted = !!attempt.submitted;

  // Scroll the sheet, not the window: moving from Teil 2 to Teil 3 must start at
  // the rubric, and on a phone the previous Teil is 2,000px tall.
  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start' }); }, [ix]);

  const sitting: Sitting = {
    responses: attempt.responses,
    writing: attempt.writing,
    speaking: attempt.speaking,
  };
  const result = paper ? scoreExam(paper, sitting) : null;

  const hand = () => {
    if (!result) return;
    ex.submit({ written: result.written, oral: result.oral, total: result.total });
    setIx(screens.findIndex((s) => s.kind === 'results'));
  };
  const leave = () => {
    stopTrack();
    if (attempt.submitted && result) {
      ex.finish({ written: result.written, oral: result.oral, total: result.total });
    } else {
      ex.abandon();
    }
    onExit();
  };

  if (!paper || !screen || !result) {
    return <div className="w-full max-w-[820px] mx-auto"><Spinner /></div>;
  }

  const block = 'block' in screen ? screen.block : null;
  const answered = paper.parts.reduce((n, p) =>
    n + p.items.filter((i) => attempt.responses[i.n]).length, 0);

  return (
    <div className="w-full max-w-[820px] mx-auto">
      <div ref={topRef} className="scroll-mt-4" />

      {/* ---- the running head ---- */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate">{paper.title}</span>
          <span className="block font-mono text-2xs text-dim">
            {attempt.mode === 'exam' ? 'PRÜFUNGSMODUS' : 'ÜBUNGSMODUS'} · {answered}/60 beantwortet
          </span>
        </span>
        {block && <BlockClock key={block} paper={paper} attempt={attempt} block={block} />}
        <button onClick={leave} aria-label="Prüfung verlassen"
          className="tap-44 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-semibold text-dim hover:border-amber hover:text-amber transition-colors">
          <LogOut size={13} /> {submitted ? 'Fertig' : 'Verlassen'}
        </button>
      </div>

      {/* ---- the stepper ---- */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
        {screens.map((s, i) => {
          const on = i === ix;
          const done = s.kind === 'part'
            && s.part.items.every((it) => attempt.responses[it.n]);
          return (
            <button key={s.key} onClick={() => setIx(i)} aria-current={on ? 'step' : undefined}
              className={`flex-shrink-0 rounded-md border px-2.5 py-1.5 font-mono text-2xs font-bold uppercase tracking-wider
                transition-colors ${on ? 'border-amber text-amber bg-panel2'
                  : done ? 'border-green/40 text-green' : 'border-line text-dim hover:border-amber'}`}>
              {s.short}
            </button>
          );
        })}
      </div>

      {/* ---- the sheet ---- */}
      {screen.kind === 'brief' && <Brief paper={paper} mode={attempt.mode} />}

      {screen.kind === 'part' && (
        <PartScreen paper={paper} attempt={attempt} part={screen.part} submitted={submitted} />
      )}

      {screen.kind === 'writing' && (
        <WritingView
          task={paper.writing}
          letter={attempt.letter ?? ''}
          onLetter={ex.setLetter}
          marks={attempt.writing}
          onMarks={(m: WritingMarks) => ex.setWritingMarks(m)}
          locked={false}
        />
      )}

      {screen.kind === 'speaking' && (
        <SpeakingView
          topics={paper.speaking} redemittel={paper.redemittel}
          marks={attempt.speaking}
          onMarks={(t: 1 | 2 | 3, m: SpeakingMarks) => ex.setSpeakingMarks(t, m)}
        />
      )}

      {screen.kind === 'results' && (
        <Results result={result} onReview={() => setIx(1)} onGrammar={onGrammar} />
      )}

      {/* ---- moving on ---- */}
      <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-line">
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
            <ClipboardCheck size={13} /> Prüfung abgeben
          </Button>
        )}
      </div>
    </div>
  );
}

const shortName = (p: Part) =>
  p.subtest === 'reading' ? 'LV' : p.subtest === 'language' ? 'SB' : 'HV';

/** One part of the sheet, plus the practice-mode "check this Teil" control. */
function PartScreen({ paper, attempt, part, submitted }: {
  paper: ExamPaper; attempt: ex.Attempt; part: Part; submitted: boolean;
}) {
  const checked = attempt.checked.includes(part.id);
  const reveal = submitted || (attempt.mode === 'practice' && checked);
  const block = paper.blocks.find((b) => b.partIds.includes(part.id));
  const expired = attempt.mode === 'exam' && block
    ? (attempt.clocks?.[block.label] ?? block.minutes * 60) <= 0
    : false;
  const done = part.items.filter((i) => attempt.responses[i.n]).length;

  return (
    <>
      {expired && !submitted && (
        <Card accent pad="sm" className="mb-3">
          <p className="text-sm">
            <span className="font-semibold">Zeit abgelaufen.</span> This block’s
            {' '}{block?.minutes} minutes are up, so the sheet is closed — exactly as an invigilator
            would close it. Move on; your answers are kept.
          </p>
        </Card>
      )}

      <PartView
        part={part}
        responses={attempt.responses}
        onAnswer={(n, k) => ex.answer(n, k)}
        reveal={reveal}
        locked={reveal || expired}
      />

      {attempt.mode === 'practice' && !reveal && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => ex.markChecked(part.id)}>
            <ClipboardCheck size={13} /> Diesen Teil prüfen
          </Button>
          <span className="font-mono text-2xs text-dim">
            {done}/{part.items.length} beantwortet · checking is final for this Teil
          </span>
        </div>
      )}
    </>
  );
}

/** The countdown for the block this screen belongs to.
 *
 *  Mounted with `key={block}` by the caller, which is what makes the initial
 *  read correct: `attempt` gets a new identity on every store write — including
 *  the clock's own five-second save — so *syncing* `left` from the attempt in an
 *  effect would fight the tick. Read the persisted value once at mount, own it
 *  from there, and let a change of block remount the component. */
function BlockClock({ paper, attempt, block }: {
  paper: ExamPaper; attempt: ex.Attempt; block: string;
}) {
  const meta = paper.blocks.find((b) => b.label === block);
  const total = (meta?.minutes ?? 30) * 60;
  const [left, setLeft] = useState(() => attempt.clocks?.[block] ?? total);
  const saved = useRef(left);

  useEffect(() => {
    if (attempt.submitted) return;
    const id = setInterval(() => {
      setLeft((s) => {
        const next = Math.max(0, s - 1);
        // Persist every five seconds rather than every tick: a sitting must
        // survive a reload, and rewriting the whole sheet once a second to save
        // one second is the wrong trade.
        if (saved.current - next >= 5 || next === 0) { saved.current = next; ex.setClock(block, next); }
        return next;
      });
    }, 1000);
    return () => { clearInterval(id); ex.setClock(block, saved.current); };
  }, [block, attempt.submitted]);

  const m = Math.floor(left / 60);
  const s = left % 60;
  const low = left <= 300;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-sm tabular-nums
      ${left === 0 ? 'border-red text-red-txt' : low ? 'border-amber text-amber' : 'border-line text-dim'}`}
      title={`${block} · ${meta?.minutes} Minuten`}>
      <Clock size={13} />{m}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ---- the night before ------------------------------------------------------

function Brief({ paper, mode }: { paper: ExamPaper; mode: ex.Mode }) {
  return (
    <div className="w-full">
      <h2 className="text-lg sm:text-xl font-bold mb-1">Vor der Prüfung</h2>
      <p className="text-dim text-xs mb-4 leading-relaxed">
        {mode === 'exam'
          ? 'Prüfungsmodus: no feedback until you hand in, and the 90-minute block locks when it runs out.'
          : 'Übungsmodus: check each Teil when you finish it and read why each key is the key. The clock runs but nothing locks.'}
      </p>

      <Card pad="md" className="mb-4">
        <Kicker tone="accent" className="block mb-2">Der Ablauf</Kicker>
        <div className="space-y-1.5">
          {paper.blocks.map((b) => (
            <div key={b.label} className="flex items-baseline gap-3 text-sm">
              <span className="font-mono text-dim tabular-nums w-16 flex-shrink-0">{b.minutes} min</span>
              <span className="flex-1">{b.label}</span>
            </div>
          ))}
          <div className="flex items-baseline gap-3 text-sm">
            <span className="font-mono text-dim tabular-nums w-16 flex-shrink-0">~15 min</span>
            <span className="flex-1">Mündliche Prüfung <span className="text-dim">(paarweise, 20 Minuten Vorbereitung davor)</span></span>
          </div>
        </div>
      </Card>

      <div className="space-y-2 mb-4">
        {paper.briefing.map((b, i) => (
          <Card key={i} pad="sm">
            <p className="text-sm font-semibold mb-1">{b.q}</p>
            <p className="text-sm text-dim leading-relaxed"><Rich>{b.a}</Rich></p>
          </Card>
        ))}
      </div>

      <Card tone="sunken" pad="sm">
        <div className="flex items-start gap-2.5">
          <FileText size={15} className="text-amber flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            This paper follows telc's published structure, item counts, playback rules and mark scheme
            exactly. The texts themselves are written for Lexi — no telc material is reproduced here,
            which also means memorising this paper cannot help you on the day. That is the point.
          </p>
        </div>
      </Card>

      <p className="text-2xs text-dim mt-4 flex items-center gap-1.5">
        <PenLine size={12} /> Have paper and a pen next to you: the letter is handwritten in the real exam.
      </p>
      <p className="text-2xs text-dim mt-1 flex items-center gap-1.5">
        <Trash2 size={12} /> Leaving before you hand in discards the sitting; handing in files it in your history.
      </p>
    </div>
  );
}
