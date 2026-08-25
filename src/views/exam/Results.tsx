// The result — reported the way the board that owns the paper reports it.
//
// Three things this screen refuses to do. It does not print one number where the
// pass rule is not one number: telc B1 wants 60% of *each* half, so a 240 with a
// weak oral is a fail and leading with "240/300" would be lying by emphasis. It
// does not quietly count an unmarked letter as zero — until both productive parts
// have been self-assessed, every total here is a floor, said out loud. And it does
// not print telc's arithmetic over somebody else's paper: the halves, the total,
// the 60% line on every bar and the sentence under the grade all come from the
// paper's own `Scheme`. Goethe B2 and C2 are *modular* — four independent 60%
// gates and no total at all — and that is a different screen, not a footnote.
import { AlertTriangle, ArrowRight, Check, X } from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Chip from '../../components/ui/Chip.tsx';
import Kicker from '../../components/ui/Kicker.tsx';
import { MAX, type ExamPaper, type Result, type Scheme, type Subtest } from '../../lib/exam.ts';

const SUBTEST_LABEL: Record<Subtest, string> = {
  reading: 'Leseverstehen',
  language: 'Sprachbausteine',
  listening: 'Hörverstehen',
  writing: 'Schriftlicher Ausdruck',
  speaking: 'Mündliche Prüfung',
};

/** The fallback when a paper says nothing of its own. Deliberately free of point
 *  totals and Teil numbers, because those are exactly the facts that differ from
 *  paper to paper — the specific version lives on `paper.remedy`. */
const REMEDY: Record<Subtest, string> = {
  reading: 'Reading is mostly vocabulary breadth under time pressure. The matching tasks are the '
    + 'cheapest marks to recover: they are scanning, not comprehension.',
  language: 'Sprachbausteine is grammar in context — connectors, cases, verbs with fixed prepositions. '
    + 'This maps one-to-one onto the Library’s concepts for your level.',
  listening: 'Listening is the part practice reaches least, and the tracks heard **once** are where the '
    + 'marks go. Read the items in the seconds you are given, and answer as you listen rather than after.',
  writing: 'The content criterion is a count, not a judgement: every prompt point wants its own '
    + 'sentence. If you lost marks here, check whether you actually ran out of time on the last one.',
  speaking: 'Half of the oral is behaviour rather than language — participating, reacting, and in the '
    + 'planning tasks actually deciding things. Work the three-level scripts.',
};

export default function Results({ paper, result, onReview, onGrammar }: {
  paper: ExamPaper;
  result: Result;
  onReview: () => void;
  onGrammar: () => void;
}) {
  const { bySubtest } = result;
  const scheme = paper.scheme ?? MAX;
  const remedy = { ...REMEDY, ...paper.remedy };
  const label = { ...SUBTEST_LABEL, ...paper.subtestLabels };
  // Weakest as a *proportion* of its own maximum — Sprachbausteine can never
  // lose 40 points, so ranking by raw loss would always name Hörverstehen. A
  // subtest this paper does not have (`max` 0) is not a candidate.
  const objective = (['reading', 'language', 'listening'] as Subtest[])
    .filter((s) => bySubtest[s].max > 0);
  const weakest = [...objective].sort((a, b) =>
    bySubtest[a].points / bySubtest[a].max - bySubtest[b].points / bySubtest[b].max)[0];

  return (
    <div className="w-full">
      <h2 className="text-lg sm:text-xl font-bold mb-1">Ergebnis</h2>
      <p className="text-dim text-xs mb-4">
        {paper.title} · {scheme.modular ? 'Ergebnis nach Modulen' : 'Punkte, Gewichtung und Benotung'}
      </p>

      {result.provisional && (
        <Card accent pad="sm" className="mb-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Provisional.</span> The letter and the oral are not marked
              yet, so everything below is a <em>floor</em>, not a score. Assess them against the criteria
              and this becomes a real total.
            </p>
          </div>
        </Card>
      )}

      {/* Modular papers get a gate per module and no total; everything else gets
          the two halves. Showing both would invite the learner to average them,
          which is the one arithmetic the boards never do. */}
      {result.modules.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
          {result.modules.map((m) => (
            <Half key={m.subtest} label={label[m.subtest]} points={m.points} max={m.max}
              need={m.need} passed={m.passed} />
          ))}
        </div>
      ) : (
        // A half with no floor of its own gets no verdict. Goethe A1 and C1 pass
        // on the total alone, so `pass.written` is 0 — and a card that read the
        // floor off that printed a green **bestanden** against 0 / 75, directly
        // above a grade of *nicht bestanden*. The points are still worth showing;
        // the claim is not.
        <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
          <Half label="Schriftliche Prüfung" points={result.written} max={scheme.written}
            need={scheme.pass.written} passed={result.passedWritten} judged={scheme.pass.written > 0} />
          <Half label="Mündliche Prüfung" points={result.oral} max={scheme.oral}
            need={scheme.pass.oral} passed={result.passedOral} judged={scheme.pass.oral > 0} />
        </div>
      )}

      <Card pad="md" className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker tone="accent" className="block mb-1">
              {scheme.modular ? 'Punkte insgesamt (nicht die Bestehensregel)' : 'Gesamtpunktzahl'}
            </Kicker>
            <p className="text-3xl font-bold tabular-nums">
              {fmt(result.total)}<span className="text-dim text-lg font-normal"> / {scheme.total}</span>
            </p>
          </div>
          <div className="text-right">
            <Kicker className="block mb-1">Note</Kicker>
            <p className={`text-xl font-bold ${result.passed ? 'text-green' : 'text-red-txt'}`}>
              {result.note}
            </p>
          </div>
        </div>
        <p className="text-2xs text-dim mt-3 leading-relaxed">{passRule(scheme)}</p>
      </Card>

      <Kicker tone="accent" className="block mb-2">Nach Prüfungsteilen</Kicker>
      <div className="space-y-1.5 mb-4">
        {/* A subtest this paper does not have is not a zero — it is absent. No
            Goethe paper has Sprachbausteine, and printing it as 0/0 would read
            as a wiped part. */}
        {(Object.keys(SUBTEST_LABEL) as Subtest[]).filter((s) => bySubtest[s].max > 0).map((s) => (
          <SubtestRow key={s} label={label[s]} points={bySubtest[s].points} max={bySubtest[s].max}
            parts={result.parts.filter((p) => p.subtest === s)} />
        ))}
      </div>

      <Card tone="sunken" pad="sm" className="mb-4">
        <Kicker tone="accent" className="block mb-1.5">
          Ihr schwächster objektiv bewerteter Teil: {label[weakest]}
        </Kicker>
        <p className="text-sm leading-relaxed">{remedy[weakest]}</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onReview}>Antworten durchgehen <ArrowRight size={14} /></Button>
        <Button variant="secondary" onClick={onGrammar}>Zur Grammatik-Bibliothek</Button>
      </div>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

/** The pass rule in the board's own words. Three genuinely different rules ship
 *  here, and paraphrasing them into one sentence would make two of them false. */
function passRule(s: Scheme): string {
  if (s.modular) {
    return `Bestanden wird modulweise: jedes Modul braucht 60 % von sich selbst. Ein bestandenes `
      + `Modul bleibt bestehen, ein nicht bestandenes wiederholen Sie allein — die Gesamtpunktzahl `
      + `oben ist nur zur Information.`;
  }
  if (s.pass.written === 0 && s.pass.oral === 0) {
    return `Bestanden heißt: mindestens ${s.pass.total} von ${s.total} Punkten insgesamt. Es gibt keine `
      + `Mindestpunktzahl für die einzelnen Teile — ein starker Teil gleicht hier einen schwachen aus.`;
  }
  return `Bestanden heißt: mindestens ${s.pass.written} von ${s.written} Punkten schriftlich `
    + `und ${s.pass.oral} von ${s.oral} mündlich, und insgesamt ${s.pass.total} von ${s.total}. `
    + `Ein starker Teil gleicht einen schwachen nicht aus.`;
}

function Half({ label, points, max, need, passed, judged = true }: {
  label: string; points: number; max: number; need: number; passed: boolean;
  /** False when this half carries no pass rule of its own — see the call site. */
  judged?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, points / max));
  const needPct = need / max;
  return (
    <Card pad="sm">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-sm font-semibold">{label}</span>
        {judged ? (
          <Chip tone={passed ? 'good' : 'bad'}>
            {passed ? <Check size={11} /> : <X size={11} />}
            {passed ? 'bestanden' : 'nicht bestanden'}
          </Chip>
        ) : (
          <Chip tone="dim">zählt zur Gesamtpunktzahl</Chip>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums mb-2">
        {fmt(points)}<span className="text-dim text-base font-normal"> / {max}</span>
      </p>
      <div className="relative h-2 rounded-full bg-bg overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct * 100}%`, background: passed ? 'var(--color-green)' : 'var(--color-red)' }} />
      </div>
      {/* The floor line, drawn on the bar rather than stated beside it: the only
          question a learner has here is "am I over it". Omitted when there is no
          floor to draw — a marker at zero reads as a threshold of zero. */}
      {judged && (
        <div className="relative h-3">
          <span className="absolute -top-2 w-px h-3 bg-txt" style={{ left: `${needPct * 100}%` }} aria-hidden />
          <span className="absolute top-1 font-mono text-2xs text-dim -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${needPct * 100}%` }}>
            {need}
          </span>
        </div>
      )}
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
