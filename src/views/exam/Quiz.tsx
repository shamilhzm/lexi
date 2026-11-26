// The short test — one item at a time, answer, know immediately.
//
// Deliberately the opposite interaction from the paper next door, and the
// difference is the point. A paper is a *sheet*: every item visible, nothing
// marked until you hand in, because that is the skill being rehearsed. A quiz is
// a **loop**: answer, find out, move on, five minutes total. Blurring the two
// would give you a paper that spoils itself and a quiz that makes you wait.
//
// Generated rather than authored (see lib/quiz.ts), so this works at A1 through
// C2 today instead of at whichever level someone has written a paper for.
//
// *(2026-11-26, the Heft)* The rail is a **tally** — one stroke per question,
// green or red as it is answered — because "how am I doing" and "how much is
// left" are the two questions mid-quiz and a bar answered only one. A gender item
// is asked with the gap where the article goes and answered on the same three
// highlighters the drills use; the right article is *drawn into* the gap. And a
// quiz ends somewhere: the words you missed can be saved for Üben or practised
// now. Nothing here writes a schedule — Üben grades, a quiz only reports.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, Bookmark, Check, GraduationCap, RotateCcw, X } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { Band } from '../../components/ui/Band.tsx';
import { haptic, markColor } from '../../lib/ui.ts';
import { recordQuiz } from '../../lib/exam-store.ts';
import { isSaved, toggleSaved } from '../../store.ts';
import type { QuizItem, QuizPreset } from '../../lib/quiz.ts';

/** The card behind an item — a cloze item carries a suffix so it never collides
 *  with the same word's vocabulary item inside one quiz. */
const cardId = (i: QuizItem) => i.id.replace(/#cloze$/, '');

export default function Quiz({ preset, items, level, onExit, onRetry, onNew, onPractise }: {
  preset: QuizPreset;
  items: QuizItem[];
  level: string;
  onExit: () => void;
  /** Same seed — the same twelve questions, which is what makes a second run a
   *  measurement rather than a different, possibly easier, quiz. */
  onRetry: () => void;
  onNew: () => void;
  /** Hand the missed words to Üben, which is where grading happens. */
  onPractise?: (ids: string[]) => void;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [marks, setMarks] = useState<boolean[]>([]);
  const filed = useRef(false);

  const item = items[i];
  const done = i >= items.length;
  const correct = marks.filter(Boolean).length;
  const run = (() => { let n = 0; for (let k = marks.length - 1; k >= 0 && marks[k]; k--) n++; return n; })();

  useEffect(() => {
    if (!done || filed.current || !items.length) return;
    filed.current = true;
    recordQuiz({ preset: preset.key, level, correct, total: items.length, at: Date.now() });
  }, [done, preset.key, level, correct, items.length]);

  const choose = (n: number) => {
    if (picked != null || !item) return;
    setPicked(n);
    const right = n === item.answer;
    setMarks((m) => [...m, right]);
    haptic(right ? 'grade' : 'wrong');
  };
  const next = () => { setPicked(null); setI((n) => n + 1); };

  // Keys for the desk: 1–4 answer, Enter moves on. A quiz you can take without
  // the mouse is a quiz you take twice.
  const keys = useRef({ choose, next, picked, count: item?.options.length ?? 0 });
  useEffect(() => { keys.current = { choose, next, picked, count: item?.options.length ?? 0 }; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keys.current;
      const d = Number(e.key);
      if (k.picked == null && d >= 1 && d <= k.count) { e.preventDefault(); k.choose(d - 1); }
      else if (k.picked != null && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); k.next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (done && items.length) {
    const wrong = items.filter((_, k) => marks[k] === false);
    return <Result preset={preset} correct={correct} total={items.length} wrong={wrong}
      onExit={onExit} onRetry={onRetry} onNew={onNew} onPractise={onPractise} />;
  }
  if (!item) {
    return (
      <div className="w-full max-w-[640px] mx-auto py-10">
        <p className="text-sm">Not enough material at this level to build that test yet.</p>
        <Button className="mt-3" variant="secondary" onClick={onExit}>Zurück</Button>
      </div>
    );
  }

  const answered = picked != null;
  const gender = item.kind === 'gender';

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate">{preset.label}</span>
          <span className="block font-mono text-2xs text-dim tabular-nums">
            {i + 1} / {items.length} · {correct} richtig{run >= 3 ? ` · ${run} in Folge` : ''}
          </span>
        </span>
        <button onClick={onExit}
          className="tap-44 rounded-key border border-line px-3.5 py-2 text-xs font-semibold text-dim hover:border-accent hover:text-accent transition-colors">
          Beenden
        </button>
      </div>

      <Tally total={items.length} marks={marks} at={i} />

      <Card pad="lg" tone="card" className="mb-4 mt-4">
        <Kicker tone="accent" className="block mb-3">{KIND_LABEL[item.kind]}</Kicker>
        <Prompt item={item} answered={answered} />
        {item.sub && <p className="text-sm text-dim mt-3">{item.sub}</p>}
      </Card>

      <div className={gender ? 'grid grid-cols-3 gap-2' : 'grid gap-2'}>
        {item.options.map((o, n) => {
          const isKey = answered && n === item.answer;
          const isMiss = picked === n && n !== item.answer;
          const faded = answered && !isKey && !isMiss;
          // Answered and not chosen: the option steps back to plain paper rather
          // than fading — faded ink is a contrast pair nobody tested (DESIGN §2).
          const style = gender && !isMiss && !faded
            ? { background: markColor(o), color: 'var(--color-mark-ink)' } : undefined;
          return (
            <button key={`${o}-${n}`} onClick={() => choose(n)} disabled={answered}
              style={style} lang={item.kind === 'de-en' ? undefined : 'de'} translate={item.kind === 'de-en' ? undefined : 'no'}
              className={`tap-44 relative w-full rounded-md border-2 px-4 py-3 text-base transition-[opacity,border-color,background-color] duration-200
                disabled:pointer-events-none
                ${gender ? 'text-center font-bold text-lg' : 'text-left'}
                ${isKey ? (gender ? 'border-[var(--color-mark-ink)]' : 'border-green bg-knew font-semibold')
                  : isMiss ? 'border-red bg-again'
                  : faded ? 'border-line bg-panel2 text-dim'
                  : gender ? 'border-transparent hover:border-[var(--color-mark-ink)]' : 'border-line bg-card hover:border-accent'}`}>
              <span className={`flex items-center gap-2.5 ${gender ? 'justify-center' : ''}`}>
                {!gender && !answered && (
                  <kbd className="hidden sm:grid place-items-center w-[1.8em] h-[1.8em] rounded border border-line font-mono text-2xs text-dim flex-shrink-0">{n + 1}</kbd>
                )}
                {isKey && <Check size={16} className="flex-shrink-0" />}
                {isMiss && <X size={16} className="flex-shrink-0 text-red-txt" />}
                <span className={`min-w-0 ${isMiss ? 'line-through decoration-red decoration-2' : ''}`}>{o}</span>
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed border-l-2 border-accent pl-3">{item.why}</p>
          <Button className="mt-4" block onClick={next}>
            {i + 1 === items.length ? 'Ergebnis' : 'Weiter'} <ArrowRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}

/** One stroke per question. */
function Tally({ total, marks, at }: { total: number; marks: boolean[]; at: number }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${marks.filter(Boolean).length} of ${marks.length} right so far, question ${Math.min(at + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, k) => (
        <span key={k}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            marks[k] === true ? 'bg-green' : marks[k] === false ? 'bg-red'
              : k === at ? 'bg-key' : 'bg-panel2'}`} />
      ))}
    </div>
  );
}

/** The question, set the way its kind reads best. */
function Prompt({ item, answered }: { item: QuizItem; answered: boolean }): ReactNode {
  const key = item.options[item.answer];
  if (item.kind === 'gender') {
    return (
      <p lang="de" translate="no" className="headword text-4xl sm:text-5xl leading-tight">
        {answered
          ? <span className="swash swash-in" style={{ '--swash': markColor(key) } as CSSProperties}>{key}</span>
          : <span className="inline-block w-[2.2em] border-b-[3px] border-dim align-baseline" aria-label="Artikel" />}
        {' '}{item.prompt}
      </p>
    );
  }
  if (item.kind === 'cloze') {
    const [before, after] = item.prompt.split('____');
    return (
      <p lang="de" translate="no" className="text-xl sm:text-2xl font-semibold leading-snug">
        {before}
        {answered
          ? <span className="swash swash-in">{key}</span>
          : <span className="inline-block w-[3.5em] border-b-[3px] border-dim align-baseline" aria-label="Lücke" />}
        {after}
      </p>
    );
  }
  return (
    <p lang={item.kind === 'de-en' ? 'de' : undefined} translate={item.kind === 'de-en' ? 'no' : undefined}
      className={item.kind === 'de-en' ? 'headword text-4xl sm:text-5xl leading-tight' : 'text-2xl sm:text-3xl font-bold leading-snug'}>
      {item.prompt}
    </p>
  );
}

/** A missed item, set as the right answer reads — the article drawn onto its noun,
 *  the word written into its gap — so the list is the correction, not the error. */
function Missed({ item }: { item: QuizItem }) {
  const key = item.options[item.answer];
  if (item.kind === 'gender') {
    return (
      <p lang="de" translate="no" className="text-base font-bold">
        <span className="swash" style={{ '--swash': markColor(key) } as CSSProperties}>{key}</span> {item.prompt}
      </p>
    );
  }
  if (item.kind === 'cloze') {
    const [before, after] = item.prompt.split('____');
    return <p lang="de" translate="no" className="text-sm font-semibold">{before}<span className="swash">{key}</span>{after}</p>;
  }
  return (
    <p className="text-sm font-semibold">
      <span lang={item.kind === 'de-en' ? 'de' : undefined} translate={item.kind === 'de-en' ? 'no' : undefined}>{item.prompt}</span>
      <span className="text-dim font-normal"> → </span>
      <span className="text-green" lang={item.kind === 'en-de' ? 'de' : undefined} translate={item.kind === 'en-de' ? 'no' : undefined}>{key}</span>
    </p>
  );
}

const KIND_LABEL: Record<QuizItem['kind'], string> = {
  'de-en': 'Was heißt das?',
  'en-de': 'Wie heißt das auf Deutsch?',
  gender: 'Welcher Artikel?',
  cloze: 'Was passt in die Lücke?',
};

function Result({ preset, correct, total, wrong, onExit, onRetry, onNew, onPractise }: {
  preset: QuizPreset; correct: number; total: number; wrong: QuizItem[];
  onExit: () => void; onRetry: () => void; onNew: () => void;
  onPractise?: (ids: string[]) => void;
}) {
  const pct = total ? correct / total : 0;
  const passed = pct >= 0.6;
  const ids = [...new Set(wrong.map(cardId))];
  const [saved, setSaved] = useState(() => ids.length > 0 && ids.every(isSaved));
  const saveAll = () => {
    for (const id of ids) if (!isSaved(id)) toggleSaved(id);
    setSaved(true);
    haptic('grade');
  };

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <Kicker tone="accent" className="block mb-2">{preset.label}</Kicker>
      <div className="flex items-center justify-between gap-4 mb-1">
        <p className="display text-6xl tabular-nums leading-none">
          {correct}<span className="text-dim text-3xl font-semibold">/{total}</span>
        </p>
        {/* 60% is the bar both big certificates set, so a quiz reports against the
            same line rather than inventing a friendlier one. */}
        <span role="status" className={`stamp stamp-in text-lg ${passed ? 'text-green' : 'text-red-txt'}`}>
          {passed ? 'Bestanden' : 'Noch nicht'}
        </span>
      </div>
      <p className="text-xs text-dim mb-6">
        {Math.round(pct * 100)}% — {passed ? 'over' : 'under'} the 60% both telc and Goethe pass at.
      </p>

      {wrong.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {onPractise && (
              <Button onClick={() => onPractise(ids)}>
                <GraduationCap size={15} /> {ids.length === 1 ? 'Dieses Wort üben' : `Diese ${ids.length} üben`}
              </Button>
            )}
            <Button variant="secondary" onClick={saveAll} disabled={saved}>
              <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Gemerkt' : 'Alle merken'}
            </Button>
          </div>
          <Kicker className="block mb-2">Was schiefging</Kicker>
          <Band className="mb-6" label="Was schiefging">
            {wrong.map((w, k) => (
              <div key={`${w.id}-${k}`} className="px-3 sm:px-5 py-3">
                <Missed item={w} />
                <p className="text-xs text-dim mt-1 leading-relaxed">{w.why}</p>
              </div>
            ))}
          </Band>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={wrong.length ? 'secondary' : 'primary'} onClick={onRetry}><RotateCcw size={14} /> Dieselben Fragen</Button>
        <Button variant="secondary" onClick={onNew}>Neue Fragen</Button>
        <Button variant="quiet" onClick={onExit}>Fertig</Button>
      </div>
      <p className="text-2xs text-dim mt-3 leading-relaxed">
        “Dieselben Fragen” repeats this exact test — which is what makes a second run a
        measurement rather than a different, possibly easier, one. A quiz never touches your
        schedule; practising the missed words in Üben does.
      </p>
    </div>
  );
}
