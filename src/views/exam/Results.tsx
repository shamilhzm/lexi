// The result — reported the way telc reports it, and no better.
//
// Two things this screen refuses to do. It does not print one number: telc's
// pass rule is 60% of *each* half independently, so a 240 with a weak oral is a
// fail and a screen that leads with "240/300" would be lying by emphasis. And it
// does not quietly count an unmarked letter as zero — until both productive
// parts have been self-assessed, every total on this screen is a floor, said out
// loud, rather than a score.
import { AlertTriangle, ArrowRight, Check, X } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Chip from '../../components/ui/Chip.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { MAX, PASS, type Result, type Subtest } from '../../lib/exam.ts';

const SUBTEST_LABEL: Record<Subtest, string> = {
  reading: 'Leseverstehen',
  language: 'Sprachbausteine',
  listening: 'Hörverstehen',
  writing: 'Schriftlicher Ausdruck',
  speaking: 'Mündliche Prüfung',
};

/** What to do about a weak subtest — the "exam alignment" half of the feature.
 *  Generic study advice would be worthless here; each of these names the thing
 *  the subtest actually tests and where in Lexi it lives. */
const REMEDY: Record<Subtest, string> = {
  reading: 'Reading is 75 points and mostly vocabulary breadth under time pressure. The 2.5-point items '
    + 'in Teil 3 are the cheapest to recover: they are scanning, not comprehension.',
  language: 'Sprachbausteine is grammar in context — connectors, cases, verbs with fixed prepositions. '
    + 'This maps one-to-one onto the Library’s B1 concepts, and it is the smallest subtest, so fix it '
    + 'only after reading and listening are safe.',
  listening: 'Hörverstehen is 75 points and the part practice reaches least. Teil 1 is worth 5 points an '
    + 'item and is heard once — read the five statements in the 30 seconds you are given, and answer as '
    + 'you listen rather than after.',
  writing: 'Criterion I is a count, not a judgement: four Leitpunkte, four passages. If you lost marks '
    + 'here, check whether you actually ran out of time on the fourth.',
  speaking: 'The oral is a quarter of the exam and half of it is behaviour rather than language — '
    + 'participating, reacting, and in Teil 3 actually deciding things. Work the three-level scripts.',
};

export default function Results({ result, onReview, onGrammar }: {
  result: Result;
  onReview: () => void;
  onGrammar: () => void;
}) {
  const { bySubtest } = result;
  // Weakest as a *proportion* of its own maximum — Sprachbausteine can never
  // lose 40 points, so ranking by raw loss would always name Hörverstehen.
  const objective: Subtest[] = ['reading', 'language', 'listening'];
  const weakest = [...objective].sort((a, b) =>
    bySubtest[a].points / bySubtest[a].max - bySubtest[b].points / bySubtest[b].max)[0];

  return (
    <div className="w-full">
      <h2 className="text-lg sm:text-xl font-bold mb-1">Ergebnis</h2>
      <p className="text-dim text-xs mb-4">
        telc Deutsch B1 · Punkte, Gewichtung und Benotung
      </p>

      {result.provisional && (
        <Card accent pad="sm" className="mb-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Provisional.</span> The letter and the oral are not marked
              yet, so everything below is a <em>floor</em>, not a score. Assess them against the criteria
              and this becomes a real total.
            </p>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
        <Half label="Schriftliche Prüfung" points={result.written} max={MAX.written}
          need={PASS.written} passed={result.passedWritten} />
        <Half label="Mündliche Prüfung" points={result.oral} max={MAX.oral}
          need={PASS.oral} passed={result.passedOral} />
      </div>

      <Card pad="md" className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker tone="accent" className="block mb-1">Gesamtpunktzahl</Kicker>
            <p className="text-3xl font-bold tabular-nums">
              {fmt(result.total)}<span className="text-dim text-lg font-normal"> / 300</span>
            </p>
          </div>
          <div className="text-right">
            <Kicker className="block mb-1">Note</Kicker>
            <p className={`text-xl font-bold ${result.passed ? 'text-green' : 'text-red-txt'}`}>
              {result.note}
            </p>
          </div>
        </div>
        <p className="text-2xs text-dim mt-3 leading-relaxed">
          Bestanden heißt: mindestens 60 % in <em>beiden</em> Teilen — 135 von 225 schriftlich und 45 von
          75 mündlich. Ein starker Teil gleicht einen schwachen nicht aus.
        </p>
      </Card>

      <Kicker tone="accent" className="block mb-2">Nach Prüfungsteilen</Kicker>
      <div className="space-y-1.5 mb-4">
        {(Object.keys(SUBTEST_LABEL) as Subtest[]).map((s) => (
          <SubtestRow key={s} label={SUBTEST_LABEL[s]} points={bySubtest[s].points} max={bySubtest[s].max}
            parts={result.parts.filter((p) => p.subtest === s)} />
        ))}
      </div>

      <Card tone="sunken" pad="sm" className="mb-4">
        <Kicker tone="accent" className="block mb-1.5">
          Ihr schwächster objektiv bewerteter Teil: {SUBTEST_LABEL[weakest]}
        </Kicker>
        <p className="text-sm leading-relaxed">{REMEDY[weakest]}</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onReview}>Antworten durchgehen <ArrowRight size={14} /></Button>
        <Button variant="secondary" onClick={onGrammar}>Zur Grammatik-Bibliothek</Button>
      </div>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

function Half({ label, points, max, need, passed }: {
  label: string; points: number; max: number; need: number; passed: boolean;
}) {
  const pct = Math.max(0, Math.min(1, points / max));
  const needPct = need / max;
  return (
    <Card pad="sm">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-sm font-semibold">{label}</span>
        <Chip tone={passed ? 'good' : 'bad'}>
          {passed ? <Check size={11} /> : <X size={11} />}
          {passed ? 'bestanden' : 'nicht bestanden'}
        </Chip>
      </div>
      <p className="text-2xl font-bold tabular-nums mb-2">
        {fmt(points)}<span className="text-dim text-base font-normal"> / {max}</span>
      </p>
      {/* The 60% line is drawn on the bar rather than stated beside it: the only
          question a learner has here is "am I over it". */}
      <div className="relative h-2 rounded-full bg-bg overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct * 100}%`, background: passed ? 'var(--color-green)' : 'var(--color-red)' }} />
      </div>
      <div className="relative h-3">
        <span className="absolute -top-2 w-px h-3 bg-txt" style={{ left: `${needPct * 100}%` }} aria-hidden />
        <span className="absolute top-1 font-mono text-2xs text-dim -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${needPct * 100}%` }}>
          {need} = 60 %
        </span>
      </div>
    </Card>
  );
}

function SubtestRow({ label, points, max, parts }: {
  label: string; points: number; max: number;
  parts: { partId: string; label: string; correct: number; total: number; points: number; max: number }[];
}) {
  const pct = max ? points / max : 0;
  return (
    <Card pad="sm">
      <div className="flex items-center gap-3">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{label}</span>
          {parts.length > 0 && (
            <span className="block font-mono text-2xs text-dim">
              {parts.map((p) => `Teil ${p.partId.slice(-1)} ${p.correct}/${p.total}`).join(' · ')}
            </span>
          )}
          {parts.length === 0 && (
            <span className="block font-mono text-2xs text-dim">selbst bewertet</span>
          )}
        </span>
        <span className="w-16 sm:w-24 flex-shrink-0">
          <span className="block h-1.5 rounded-full bg-bg overflow-hidden">
            <span className="block h-full transition-[width] duration-500"
              style={{ width: `${Math.max(pct * 100, 2)}%`, background: pct >= 0.6 ? 'var(--color-green)' : 'var(--color-red)' }} />
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums w-16 text-right flex-shrink-0">
          {fmt(points)}<span className="text-dim">/{max}</span>
        </span>
      </div>
    </Card>
  );
}
