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
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Chip from '../../components/ui/Chip.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { speak } from '../../lib/tts.ts';
import { tick, haptic } from '../../lib/ui.ts';
import { recordQuiz } from '../../lib/exam-store.ts';
import type { QuizItem, QuizPreset } from '../../lib/quiz.ts';

export default function Quiz({ preset, items, level, onExit, onRetry, onNew }: {
  preset: QuizPreset;
  items: QuizItem[];
  level: string;
  onExit: () => void;
  /** Same seed — the same twelve questions, which is what makes a second run a
   *  measurement rather than a different, possibly easier, quiz. */
  onRetry: () => void;
  onNew: () => void;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState<QuizItem[]>([]);
  const filed = useRef(false);

  const item = items[i];
  const done = i >= items.length;

  useEffect(() => {
    if (!done || filed.current) return;
    filed.current = true;
    recordQuiz({ preset: preset.key, level, correct, total: items.length, at: Date.now() });
  }, [done, preset.key, level, correct, items.length]);

  const choose = (n: number) => {
    if (picked != null) return;
    setPicked(n);
    const right = n === item.answer;
    if (right) { setCorrect((c) => c + 1); tick('good'); }
    else { setWrong((w) => [...w, item]); tick('wrong'); haptic('wrong'); }
  };
  const next = () => { setPicked(null); setI((n) => n + 1); };

  if (done) {
    return <Result preset={preset} correct={correct} total={items.length} wrong={wrong}
      onExit={onExit} onRetry={onRetry} onNew={onNew} />;
  }
  if (!item) {
    return (
      <Card pad="md">
        <p className="text-sm">Not enough material at this level to build that test yet.</p>
        <Button className="mt-3" variant="secondary" onClick={onExit}>Back</Button>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate">{preset.label}</span>
          <span className="block font-mono text-2xs text-dim">
            {i + 1} / {items.length} · {correct} richtig
          </span>
        </span>
        <button onClick={onExit}
          className="tap-44 rounded-md border border-line px-3 py-2 text-xs font-semibold text-dim hover:border-amber hover:text-amber transition-colors">
          Beenden
        </button>
      </div>

      {/* A rail, not a percentage: the question a learner has mid-quiz is "how
          much longer", and a bar answers it without arithmetic. */}
      <div className="h-1 rounded-full bg-panel2 overflow-hidden mb-5">
        <div className="h-full bg-amber transition-[width] duration-300"
          style={{ width: `${(i / items.length) * 100}%` }} />
      </div>

      <Card pad="lg" tone="card" className="mb-4">
        <Kicker tone="accent" className="block mb-2">{KIND_LABEL[item.kind]}</Kicker>
        <p className="text-xl sm:text-2xl font-bold leading-snug">{item.prompt}</p>
        {item.sub && <p className="text-sm text-dim mt-2">{item.sub}</p>}
      </Card>

      <div className="grid gap-2">
        {item.options.map((o, n) => {
          const isKey = picked != null && n === item.answer;
          const isMiss = picked === n && n !== item.answer;
          return (
            <button key={`${o}-${n}`} onClick={() => choose(n)} disabled={picked != null}
              className={`tap-44 w-full rounded-md border px-4 py-3 text-left text-base transition-colors
                disabled:pointer-events-none
                ${isKey ? 'border-green bg-green-d text-green font-semibold'
                  : isMiss ? 'border-red bg-red-d text-red-txt'
                  : 'border-line bg-panel2 hover:border-amber'}`}>
              <span className="flex items-center gap-2.5">
                {isKey && <Check size={16} className="flex-shrink-0" />}
                {isMiss && <X size={16} className="flex-shrink-0" />}
                <span className="min-w-0">{o}</span>
              </span>
            </button>
          );
        })}
      </div>

      {picked != null && (
        <>
          <Card tone="sunken" pad="sm" className="mt-4">
            <p className="text-sm leading-relaxed">{item.why}</p>
            {/* Hearing the answer is worth more than reading it, and the engine
                is already here. Only offered for the German-bearing kinds. */}
            {item.kind !== 'en-de' && (
              <button onClick={() => speak(germanOf(item))}
                className="tap-44 mt-1 text-2xs font-mono uppercase tracking-widest text-dim hover:text-amber">
                Vorlesen
              </button>
            )}
          </Card>
          <Button className="mt-3" block onClick={next}>
            {i + 1 === items.length ? 'Ergebnis' : 'Weiter'} <ArrowRight size={15} />
          </Button>
        </>
      )}
    </div>
  );
}

const KIND_LABEL: Record<QuizItem['kind'], string> = {
  'de-en': 'Was heißt das?',
  'en-de': 'Wie heißt das auf Deutsch?',
  gender: 'Welcher Artikel?',
  cloze: 'Was passt in die Lücke?',
  grammar: 'Grammatik',
};

/** The German to read aloud: the completed sentence for a cloze, the term
 *  otherwise. Never the English side. */
function germanOf(item: QuizItem): string {
  if (item.kind === 'cloze') return item.prompt.replace('____', item.options[item.answer]);
  if (item.kind === 'gender') return `${item.options[item.answer]} ${item.prompt}`;
  return item.prompt;
}

function Result({ preset, correct, total, wrong, onExit, onRetry, onNew }: {
  preset: QuizPreset; correct: number; total: number; wrong: QuizItem[];
  onExit: () => void; onRetry: () => void; onNew: () => void;
}) {
  const pct = total ? correct / total : 0;
  const passed = pct >= 0.6;
  return (
    <div className="w-full max-w-[640px] mx-auto">
      <Kicker tone="accent" className="block mb-1">{preset.label}</Kicker>
      <div className="flex items-end gap-3 mb-1">
        <p className="text-4xl font-bold tabular-nums">{correct}<span className="text-dim text-2xl font-normal">/{total}</span></p>
        <Chip tone={passed ? 'good' : 'bad'}>{Math.round(pct * 100)}%</Chip>
      </div>
      {/* 60% is the bar both big certificates set, so a quiz reports against the
          same line rather than inventing a friendlier one. */}
      <p className="text-xs text-dim mb-5">
        {passed ? 'Over the 60% both telc and Goethe pass at.' : 'Under the 60% both telc and Goethe pass at.'}
      </p>

      {wrong.length > 0 && (
        <>
          <Kicker className="block mb-2">Was schiefging</Kicker>
          <div className="space-y-1.5 mb-5">
            {wrong.map((w, i) => (
              <Card key={`${w.id}-${i}`} pad="sm">
                <p className="text-sm font-semibold">{w.prompt}</p>
                <p className="text-sm text-green mt-0.5">{w.options[w.answer]}</p>
                <p className="text-xs text-dim mt-1 leading-relaxed">{w.why}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onRetry}><RotateCcw size={14} /> Dieselben Fragen</Button>
        <Button variant="secondary" onClick={onNew}>Neue Fragen</Button>
        <Button variant="quiet" onClick={onExit}>Fertig</Button>
      </div>
      <p className="text-2xs text-dim mt-3 leading-relaxed">
        “Dieselben Fragen” repeats this exact test — which is what makes a second run a
        measurement rather than a different, possibly easier, one.
      </p>
    </div>
  );
}
