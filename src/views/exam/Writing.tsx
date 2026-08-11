// Schriftlicher Ausdruck — one letter, thirty minutes, forty-five points.
//
// The single most mechanical mark in the whole exam lives here: criterion I is
// nothing but "were all four Leitpunkte covered", it is worth a third of the
// part, and candidates lose it by running out of time on the fourth point. So
// the Leitpunkte are a checklist you tick as you go, sitting beside the text
// area rather than above it — the one piece of scaffolding that maps exactly
// onto how the part is marked.
import { useState } from 'react';
import { Check, PenLine, Volume2 } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Chip from '../../components/ui/Chip.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { speak } from '../../lib/tts.ts';
import { scoreWriting, type Band, type Model, type WritingMarks, type WritingTask } from '../../lib/exam.ts';
import { CriterionRow, WRITING_CRITERIA } from './SelfAssess.tsx';

export default function Writing({ task, letter, onLetter, marks, onMarks, locked }: {
  task: WritingTask;
  letter: string;
  onLetter: (s: string) => void;
  marks?: WritingMarks;
  onMarks: (m: WritingMarks) => void;
  locked: boolean;
}) {
  const [covered, setCovered] = useState<Set<number>>(new Set());
  const [showModels, setShowModels] = useState(false);
  const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
          <h2 className="text-lg sm:text-xl font-bold">Schriftlicher Ausdruck (Brief)</h2>
          <span className="font-mono text-2xs text-dim tracking-wider">{task.minutes} MINUTEN · 45 PUNKTE</span>
        </div>
        <Card tone="sunken" pad="sm" className="text-sm">
          <p className="leading-relaxed">{task.situation}</p>
          <p className="text-dim text-xs mt-2 leading-relaxed">{task.situationEn}</p>
        </Card>
      </div>

      <Card pad="md" className="mb-4">
        <Kicker tone="accent" className="block mb-2">Der Brief, den Sie bekommen haben</Kicker>
        <div className="space-y-2.5">
          {task.letter.body.map((p, i) => <p key={i} className="text-sm leading-relaxed">{p}</p>)}
          <p className="text-sm leading-relaxed">{task.letter.from}</p>
        </div>
      </Card>

      <Card pad="sm" className="mb-4">
        <Kicker tone="accent" className="block mb-1.5">Schreiben Sie etwas zu diesen vier Punkten</Kicker>
        <p className="text-2xs text-dim mb-2.5">
          Tick each one as you cover it. Criterion I is literally this count — four points is 5 marks,
          three is 3, two is 1.
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
                  className={`tap-44 w-full flex items-start gap-2.5 rounded-md border px-3 py-2 text-left text-sm
                    transition-colors ${on ? 'border-green bg-green-d' : 'border-line bg-panel2 hover:border-amber'}`}>
                  <span className={`grid place-items-center w-4 h-4 rounded-sm border flex-shrink-0 mt-0.5
                    ${on ? 'border-green text-green' : 'border-dim'}`}>
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
        <p className="text-2xs text-dim mt-2.5 leading-relaxed">
          Vergessen Sie Datum und Anrede nicht, überlegen Sie sich eine passende Reihenfolge der Punkte
          und schreiben Sie auch eine passende Einleitung und einen passenden Schluss.
        </p>
      </Card>

      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <Kicker tone="accent">Ihr Brief</Kicker>
          <span className="font-mono text-2xs text-dim tabular-nums">
            {words} {words === 1 ? 'Wort' : 'Wörter'}
            <span className="opacity-60"> · ~150 üblich</span>
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
          lang="de"
          placeholder="Liebe Katja,&#10;&#10;…"
          className="w-full rounded-lg border border-line bg-card p-4 text-sm leading-relaxed
            focus:outline-none focus:border-amber disabled:opacity-60"
        />
        <p className="text-2xs text-dim mt-1.5 leading-relaxed">
          Written on paper in the real exam, and worth practising that way at least once — handwriting
          is slower than you think and the thirty minutes are tight.
        </p>
      </div>

      <div className="mb-5">
        <Button variant="secondary" onClick={() => setShowModels((s) => !s)}>
          <PenLine size={14} /> {showModels ? 'Musterbriefe ausblenden' : 'Musterbriefe ansehen'}
        </Button>
        {showModels && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-dim leading-relaxed">
              The same letter at three strengths. All three answer all four Leitpunkte — that is the
              constant. What changes is the connective tissue between them.
            </p>
            {task.models.map((m) => <ModelLetter key={m.band} model={m} />)}
          </div>
        )}
      </div>

      <WritingMarksPanel value={marks} onChange={onMarks} />
    </div>
  );
}

const BAND_TONE: Record<Model['band'], string> = {
  A2: 'var(--color-green)',
  B1: 'var(--color-amber)',
  B2: 'var(--color-b2)',
};

function ModelLetter({ model }: { model: Model }) {
  const [open, setOpen] = useState(false);
  const [showEn, setShowEn] = useState(false);
  return (
    <Card pad="sm">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="tap-44 w-full flex items-center gap-3 text-left">
        <span className="font-mono text-2xs font-bold px-2 py-1 rounded-md border"
          style={{ color: BAND_TONE[model.band], borderColor: BAND_TONE[model.band] }}>
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
                <button onClick={() => speak(l.de)} aria-label="Diesen Satz hören"
                  className="grid place-items-center w-11 h-11 -m-2 text-dim hover:text-amber flex-shrink-0">
                  <Volume2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setShowEn((s) => !s)}
            className="tap-44 mt-1 text-2xs font-mono uppercase tracking-widest text-dim hover:text-amber">
            {showEn ? 'Hide English' : 'Show English'}
          </button>
        </>
      )}
    </Card>
  );
}

function WritingMarksPanel({ value, onChange }: {
  value?: WritingMarks; onChange: (m: WritingMarks) => void;
}) {
  const base: WritingMarks = { leitpunkte: 'B', gestaltung: 'B', richtigkeit: 'B', extraRange: false, extraLength: false };
  const cur = value ?? base;
  const set = (patch: Partial<WritingMarks>) => onChange({ ...cur, ...patch });
  // The discretionary points are unavailable in exactly the cases telc says they
  // are, and the UI says why rather than silently ignoring the toggle.
  const worseThanB = [cur.leitpunkte, cur.gestaltung, cur.richtigkeit].some((b) => b === 'C' || b === 'D');
  const full = cur.leitpunkte === 'A' && cur.gestaltung === 'A' && cur.richtigkeit === 'A';
  const extrasBlocked = worseThanB || full;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-base font-bold">Den Brief bewerten</h3>
        {value && <Chip tone="good"><Check size={11} /> {scoreWriting(value)} / 45</Chip>}
      </div>
      <p className="text-xs text-dim leading-relaxed mb-3">
        Two examiners mark every letter and have to agree on one grade. Mark your own against the same
        three criteria — and be aware of the hard rule: a D on criterion I or III zeroes the letter
        completely.
      </p>
      <div className="space-y-2.5">
        {WRITING_CRITERIA.map((c) => (
          <CriterionRow key={c.key} c={c}
            value={value ? (cur[c.key as keyof WritingMarks] as Band) : undefined}
            onPick={(b) => set({ [c.key]: b } as Partial<WritingMarks>)} />
        ))}

        <Card pad="sm">
          <div className="flex items-baseline gap-2 mb-1">
            <Kicker tone="accent">Kriterium IV</Kicker>
            <span className="text-sm font-bold">Zusatzpunkte</span>
          </div>
          <p className="text-xs text-dim leading-relaxed mb-2.5">
            Up to two extra points, each worth 3 after the ×3 — but only for a letter that is not
            already at full marks and has no C or D anywhere.
            {extrasBlocked && (
              <span className="text-red-txt">
                {' '}Not available here: {full ? 'the letter already scores 15/15.' : 'a criterion is graded C or below.'}
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
                    ${on ? 'border-amber bg-panel2' : 'border-line bg-panel2 hover:border-amber'}`}>
                  <span className={`grid place-items-center w-4 h-4 rounded-sm border flex-shrink-0 mt-0.5
                    ${on ? 'border-amber text-amber' : 'border-dim'}`}>
                    {on && <Check size={12} />}
                  </span>
                  <span className="flex-1 min-w-0">{label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {!value && (
        <Button className="mt-3" onClick={() => onChange(base)}>Bewertung eintragen</Button>
      )}
    </div>
  );
}
