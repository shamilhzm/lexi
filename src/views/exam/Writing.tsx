// Schriftlicher Ausdruck — one letter, thirty minutes, forty-five points.
//
// The single most mechanical mark in the whole exam lives here: criterion I is
// nothing but "were all four Leitpunkte covered", it is worth a third of the
// part, and candidates lose it by running out of time on the fourth point. So
// the Leitpunkte are a checklist you tick as you go, sitting beside the text
// area rather than above it — the one piece of scaffolding that maps exactly
// onto how the part is marked.
import { useState } from 'react';
import { Check, PenLine } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Chip from '../../components/ui/Chip.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { fmtPoints, writingOnScheme, type Band, type Model, type Provider, type WritingMarks, type WritingTask } from '../../lib/exam.ts';
import { LEVEL_INK } from '../../lib/ui.ts';
import { CriterionRow, WRITING_CRITERIA } from './SelfAssess.tsx';

// *(2026-11-26)* The header, the rubric line and the word hint were telc B1's on
// every paper — a Goethe A1 candidate was told to write ~150 words for 45 points.
// They come from the paper now; the self-assessment grid stays telc's, because
// that is the grid every paper is marked on here and then scaled (lib/exam.ts).
const COUNT = ['', 'diesem Punkt', 'diesen zwei Punkten', 'diesen drei Punkten', 'diesen vier Punkten'];

export default function Writing({ task, provider, points, letter, onLetter, marks, onMarks, locked }: {
  task: WritingTask;
  provider: Provider;
  /** What the letter is worth on this paper's own scheme. */
  points: number;
  letter: string;
  onLetter: (s: string) => void;
  marks?: WritingMarks;
  onMarks: (m: WritingMarks) => void;
  locked: boolean;
}) {
  const [covered, setCovered] = useState<Set<number>>(new Set());
  const [showModels, setShowModels] = useState(false);
  const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;
  const telc = provider === 'telc';

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
          <h2 className="text-lg sm:text-xl font-bold">{telc ? 'Schriftlicher Ausdruck (Brief)' : 'Schreiben'}</h2>
          <span className="font-mono text-2xs text-dim tracking-wider">{task.minutes} MINUTEN · {points} PUNKTE</span>
        </div>
        <Card tone="sunken" pad="sm" className="text-sm">
          <p className="leading-relaxed">{task.situation}</p>
          <p className="text-dim text-xs mt-2 leading-relaxed">{task.situationEn}</p>
        </Card>
      </div>

      <Card pad="md" className="mb-4">
        <Kicker tone="accent" className="block mb-2">{telc ? 'Der Brief, den Sie bekommen haben' : 'Der Text, auf den Sie antworten'}</Kicker>
        <div className="space-y-2.5">
          {task.letter.body.map((p, i) => <p key={i} className="text-sm leading-relaxed">{p}</p>)}
          <p className="text-sm leading-relaxed">{task.letter.from}</p>
        </div>
      </Card>

      <Card pad="sm" className="mb-4">
        <Kicker tone="accent" className="block mb-1.5">Schreiben Sie etwas zu {COUNT[task.leitpunkte.length] ?? 'diesen Punkten'}</Kicker>
        <p className="text-2xs text-dim mb-2.5">
          {/* telc's grid for criterion I is written for four Leitpunkte; a paper with
              another number gets the rule without the figures. */}
          Tick each one as you cover it. Criterion I counts them: {task.leitpunkte.length === 4
            ? 'all four is 5 marks, three is 3, two is 1.'
            : 'every one covered is full marks.'}
        </p>
        <ul className="space-y-1.5">
          {task.leitpunkte.map((l, i) => {
            const on = covered.has(i);
            return (
              <li key={i}>
                <button
                  onClick={() => setCovered((s) => {
                    const n = new Set(s);
                    if (n.has(i)) n.delete(i); else n.add(i);
                    return n;
                  })}
                  aria-pressed={on}
                  // A tick here is the writer's own claim, not a verdict, so it is
                  // Königsblau like every other mark the learner makes. Green is kept
                  // for "right" (2026-11-26). Square, because it is a checklist.
                  className={`tap-44 w-full flex items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm
                    transition-colors ${on ? 'border-accent bg-panel2' : 'border-line bg-panel2 hover:border-accent'}`}>
                  <span className={`grid place-items-center w-[16px] h-[16px] rounded-[4px] border flex-shrink-0 mt-0.5
                    ${on ? 'border-accent bg-accent text-bg' : 'border-dim'}`}>
                    {on && <Check size={12} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block">{l.de}</span>
                    <span className="block text-2xs text-dim">{l.en}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {telc && <p className="text-2xs text-dim mt-2.5 leading-relaxed">
          Vergessen Sie Datum und Anrede nicht, überlegen Sie sich eine passende Reihenfolge der Punkte
          und schreiben Sie auch eine passende Einleitung und einen passenden Schluss.
        </p>}
      </Card>

      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <Kicker tone="accent">{telc ? 'Ihr Brief' : 'Ihr Text'}</Kicker>
          <span className="font-mono text-2xs text-dim tabular-nums">
            {words} {words === 1 ? 'Wort' : 'Wörter'}
            {telc && <span> · ~150 üblich</span>}
          </span>
        </div>
        <textarea
          value={letter}
          onChange={(e) => onLetter(e.target.value)}
          disabled={locked}
          rows={16}
          spellCheck={false}
          autoCapitalize="sentences"
          autoCorrect="off"
          lang="de" translate="no"
          placeholder={telc ? 'Liebe Katja,\n\n…' : '…'}
          // Ruled paper with a red margin (index.css → .lined): the one surface in
          // the app that is written on rather than tapped.
          className="lined w-full rounded-lg border border-line pr-4 pb-4 pt-0 text-[15px]
            focus:outline-none focus:border-accent disabled:opacity-60"
        />
        <p className="text-2xs text-dim mt-1.5 leading-relaxed">
          Written on paper in the real exam, and worth practising that way at least once — handwriting
          is slower than you think and {task.minutes} minutes go quickly.
        </p>
      </div>

      <div className="mb-5">
        <Button variant="secondary" onClick={() => setShowModels((s) => !s)}>
          <PenLine size={14} /> {telc
            ? (showModels ? 'Musterbriefe ausblenden' : 'Musterbriefe ansehen')
            : (showModels ? 'Mustertexte ausblenden' : 'Mustertexte ansehen')}
        </Button>
        {showModels && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-dim leading-relaxed">
              The same text at different strengths. Every one answers every Leitpunkt, so that stays
              constant. What changes is how the sentences are joined.
            </p>
            {task.models.map((m) => <ModelLetter key={m.band} model={m} />)}
          </div>
        )}
      </div>

      <WritingMarksPanel value={marks} onChange={onMarks} points={points} telc={telc} />
    </div>
  );
}


function ModelLetter({ model }: { model: Model }) {
  const [open, setOpen] = useState(false);
  const [showEn, setShowEn] = useState(false);
  return (
    <Card pad="sm">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="tap-44 w-full flex items-center gap-3 text-left">
        <span className="font-mono text-2xs font-bold px-2 py-1 rounded-md border"
          // The level's own ink (lib/ui.ts). A2 was drawn in the verdict green here.
          style={{ color: LEVEL_INK[model.band], borderColor: LEVEL_INK[model.band] }}>
          {model.band}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">{model.label}</span>
          <span className="block text-2xs text-dim leading-relaxed">{model.note}</span>
        </span>
      </button>
      {open && (
        <>
          <div className="mt-3 pt-3 border-t border-line space-y-2">
            {model.lines.map((l, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed">{l.de}</p>
                  {showEn && <p className="text-xs text-dim leading-relaxed mt-0.5">{l.en}</p>}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowEn((s) => !s)}
            className="tap-44 mt-1 text-2xs font-semibold uppercase tracking-widest text-dim hover:text-accent">
            {showEn ? 'Hide English' : 'Show English'}
          </button>
        </>
      )}
    </Card>
  );
}

function WritingMarksPanel({ value, onChange, points, telc }: {
  value?: WritingMarks; onChange: (m: WritingMarks) => void;
  /** What writing is worth on this paper; the grid's 45 is scaled to it. */
  points: number;
  telc: boolean;
}) {
  // The writer grades each criterion; nothing is scored until all three are.
  // *(2026-11-26)* The first tap used to commit B for the two criteria not yet
  // touched, and a "Bewertung eintragen" button committed B/B/B outright: a grade
  // the learner never gave, counted in the paper's total.
  const [draft, setDraft] = useState<Partial<WritingMarks>>(() => value ?? {});
  const cur: Partial<WritingMarks> = value ?? draft;
  const set = (patch: Partial<WritingMarks>) => {
    const next = { ...cur, ...patch };
    setDraft(next);
    if (next.leitpunkte && next.gestaltung && next.richtigkeit) {
      onChange({ extraRange: false, extraLength: false, ...next } as WritingMarks);
    }
  };
  const bands = [cur.leitpunkte, cur.gestaltung, cur.richtigkeit];
  const graded = bands.every(Boolean);
  // The discretionary points are unavailable in exactly the cases telc says they
  // are, and the UI says why rather than silently ignoring the toggle.
  const worseThanB = bands.some((b) => b === 'C' || b === 'D');
  const full = bands.every((b) => b === 'A');
  const extrasBlocked = !graded || worseThanB || full;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-base font-bold">{telc ? 'Den Brief bewerten' : 'Den Text bewerten'}</h3>
        {/* The paper's own points, not the grid's 45, and in ink rather than the
            verdict green: it is the writer's mark of themselves (2026-11-26). */}
        {value && <Chip>{fmtPoints(writingOnScheme(value, points))} / {points} Punkte</Chip>}
      </div>
      <p className="text-xs text-dim leading-relaxed mb-3">
        Mark your own text against the three criteria examiners use. One hard rule: a D on
        criterion I or III scores the whole text 0.
        {!telc && <> These are telc's descriptors. Lexi scales the result to the {points} points
          Schreiben is worth on this paper.</>}
      </p>
      <div className="space-y-2.5">
        {WRITING_CRITERIA.map((c) => (
          <CriterionRow key={c.key} c={c}
            value={cur[c.key as keyof WritingMarks] as Band | undefined}
            onPick={(b) => set({ [c.key]: b } as Partial<WritingMarks>)} />
        ))}

        <Card pad="sm">
          <div className="flex items-baseline gap-2 mb-1">
            <Kicker tone="accent">Kriterium IV</Kicker>
            <span className="text-sm font-bold">Zusatzpunkte</span>
          </div>
          <p className="text-xs text-dim leading-relaxed mb-2.5">
            Up to two extra points, only for a text that is not already at full marks and has no
            C or D anywhere.
            {!graded && <span>{' '}Grade criteria I to III first.</span>}
            {graded && extrasBlocked && (
              <span className="text-red-txt">
                {' '}Not available here: {full ? 'the text already has full marks.' : 'a criterion is graded C or below.'}
              </span>
            )}
          </p>
          <div className="grid gap-1.5">
            {([
              ['extraRange', 'überdurchschnittliche sprachliche Vielfalt (Wortschatz, Strukturen)'],
              ['extraLength', 'überdurchschnittlicher Umfang (inhaltliche Gestaltung)'],
            ] as const).map(([k, label]) => {
              const on = !!cur[k] && !extrasBlocked;
              return (
                <button key={k} onClick={() => set({ [k]: !cur[k] })} disabled={extrasBlocked} aria-pressed={on}
                  className={`tap-44 w-full flex items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm
                    transition-colors disabled:opacity-40 disabled:pointer-events-none
                    ${on ? 'border-accent bg-panel2' : 'border-line bg-panel2 hover:border-accent'}`}>
                  <span className={`grid place-items-center w-[16px] h-[16px] rounded-[4px] border flex-shrink-0 mt-0.5
                    ${on ? 'border-accent bg-accent text-bg' : 'border-dim'}`}>
                    {on && <Check size={12} />}
                  </span>
                  <span className="flex-1 min-w-0">{label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
