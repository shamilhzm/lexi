// Stats — the terminal’s terminal screen. Five honest panels over data the
// store already owns: reviews/day, recall trend, the 7-day due forecast, the
// Known growth curve, and the scheduler's own calibration. Inline SVG bars, no
// chart library. The review log starts accruing the day this ships; empty panels
// say so instead of lying.
//
// The fifth is the odd one out on purpose: the other four measure the learner and
// go up when they study. Calibration measures *Lexi* — whether FSRS's predictions
// match what actually happened — and cannot be moved by studying more.
import { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { reviewLog, dueForecast, knownHistory, totals } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import { loadLedger } from '../lib/ledger.ts';
import { calibration, MIN_N, type Calibration } from '../lib/calibration.ts';
import Card from '../components/ui/Card.tsx';
import Kicker from '../components/ui/Kicker.tsx';

const DAY = 86_400_000;
const dayKey = (offset: number) => new Date(Date.now() - offset * DAY).toISOString().slice(0, 10);
const dayLabel = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short' });

export default function Stats() {
  const v = useStore();
  const log = useMemo(() => reviewLog(), [v]);
  const forecast = useMemo(() => dueForecast(7), [v]);
  const history = useMemo(() => knownHistory(), [v]);
  const t = totals();

  // Last 14 days, oldest first.
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => dayKey(13 - i)), [v]);
  const perDay = days.map((d) => log[d]?.n ?? 0);
  const recall = days.map((d) => {
    const e = log[d];
    return e && e.n > 0 ? Math.round(((e.n - e.again) / e.n) * 100) : null;
  });
  const anyReviews = perDay.some((n) => n > 0);

  // The ledger, read once on mount rather than on every store emit: it is up to
  // 50,000 rows and nothing about it changes fast enough to be worth re-reading
  // mid-session. `null` means "not read yet" and renders nothing, which is not the
  // same as "read, and empty".
  const [cal, setCal] = useState<Calibration | null>(null);
  useEffect(() => {
    let live = true;
    loadLedger().then((evts) => { if (live) setCal(calibration(evts)); });
    return () => { live = false; };
  }, []);

  return (
    // A section of Progress, not a page: Progress owns the h1 and the width.
    // These four panels answer "how am I trending", which is the same question
    // the heatmap above them answers spatially.
    <section aria-labelledby="trend-heading">
      <div className="flex items-center gap-2.5 mb-1">
        <BarChart3 size={18} className="text-accent" />
        <h2 id="trend-heading" className="text-lg font-bold">Trend</h2>
      </div>
      <p className="text-dim text-xs mb-3">
        {fmt(t.known)} known · {fmt(t.learned)} learning · {fmt(t.due)} due now
      </p>

      {/* **Two-up at every width.** It was one column on a phone, which made four
          sparklines four full-width panels and turned a glanceable section into a
          screen and a half of scrolling. These are 120px sparklines with a label
          and one number: at 440px, two of them side by side are still legible and
          the whole trend reads in one look, which is the only thing a trend
          section is for. */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
        <Panel title="Reviews per day" sub="last 14 days">
          {anyReviews
            ? <Bars values={perDay} labels={days.map(dayLabel)} color="var(--color-accent)" />
            : <Empty text="Starts counting from today — study a session and come back." />}
        </Panel>

        <Panel title="Recall" sub="% graded correct, last 14 days">
          {recall.some((r) => r !== null)
            ? <Bars values={recall.map((r) => r ?? 0)} muted={recall.map((r) => r === null)}
                labels={days.map(dayLabel)} color="var(--color-green)" max={100} suffix="%" />
            : <Empty text="Appears with your first graded reviews." />}
        </Panel>

        <Panel title="Due forecast" sub="scheduled reviews, next 7 days">
          <Bars values={forecast}
            labels={forecast.map((_, i) => i === 0 ? 'today' : dayLabel(dayKey(-i)))}
            color="var(--color-accent)" />
        </Panel>

        {/* The one panel whose series can be *shorter than two*, because it
            accrues one point per study day rather than filling a fixed window.
            Found on a real device with a one-point history: `Bars` divides its
            viewBox by the number of values, so a single point rendered as a
            **solid green slab** filling the panel, labelled "Known growth" — the
            most confident-looking chart in the app, drawn from one number.
            Every learner's first study day looked like that.
            Two points is the floor for a *growth* chart: one point is a value,
            and growth is a difference. */}
        <Panel title="Known growth" sub={`daily totals · ${history.length < 3 ? 'accrues one point per study day' : `${history.length} days`}`}>
          {history.length >= 2
            ? <Bars values={history.slice(-14).map((h) => h.known)}
                labels={history.slice(-14).map((h) => dayLabel(h.date))}
                color="var(--color-green)" />
            : <Empty text={history.length === 1
                ? `${fmt(history[0].known)} known today. The curve needs a second study day to have a shape.`
                : 'Appears after your first two study days.'} />}
        </Panel>

        {/* Full width at every size, unlike the four bar panels. This one is a
            table with four labelled columns, and the grid above it is two-up even
            at 375px — dropped into half of that, "FSRS expected" and "You recalled"
            each wrap to two lines and the numeric columns touch. Measured, not
            assumed: the first cut used `sm:col-span-2` and looked exactly like
            that on a phone. */}
        <div className="col-span-2">
          <Panel title="Was the scheduler right?" sub="predicted recall vs. what happened">
            <Cal cal={cal} />
          </Panel>
        </div>
      </div>
    </section>
  );
}

/** Calibration — the one panel here that measures Lexi rather than the learner.
 *
 *  Every other number on this screen goes up when you study more. This one goes up
 *  only when FSRS's predictions get closer to your outcomes, and it cannot be
 *  flattered by picking easy cards: easier material raises the predicted column
 *  alongside the actual one and leaves the gap where it was. */
function Cal({ cal }: { cal: Calibration | null }) {
  if (!cal) return <div className="h-[120px]" aria-hidden />;

  if (cal.scored < MIN_N) {
    return (
      <Empty text={cal.scored === 0
        ? 'Starts with your next reviews. Cards seen for the first time carry no prediction, so there is nothing yet to check.'
        : `${fmt(cal.scored)} of the ${fmt(MIN_N)} reviews needed before a rate here would mean anything.`} />
    );
  }

  const shown = cal.bands.filter((b) => b.n > 0);
  return (
    <>
      <table className="w-full text-xs tabular-nums">
        <caption className="sr-only">
          Predicted recall against actual recall, grouped by how confident the scheduler was.
        </caption>
        <thead className="text-dim">
          <tr>
            <th scope="col" className="text-left font-medium pb-1">FSRS expected</th>
            <th scope="col" className="text-right font-medium pb-1">Reviews</th>
            <th scope="col" className="text-right font-medium pb-1">Predicted</th>
            <th scope="col" className="text-right font-medium pb-1">You recalled</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((b) => (
            <tr key={b.label} className="border-t border-line/60">
              <th scope="row" className="text-left font-normal py-1.5">{b.label}</th>
              <td className="text-right py-1.5">{fmt(b.n)}</td>
              <td className="text-right py-1.5" style={{ color: 'var(--color-accent)' }}>{pct(b.predicted)}</td>
              <td className="text-right py-1.5" style={{ color: 'var(--color-green)' }}>{pct(b.actual)}</td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="text-left py-1.5 font-semibold">All reviews</th>
            <td className="text-right py-1.5 font-semibold">{fmt(cal.overall.n)}</td>
            <td className="text-right py-1.5 font-semibold" style={{ color: 'var(--color-accent)' }}>{pct(cal.overall.predicted)}</td>
            <td className="text-right py-1.5 font-semibold" style={{ color: 'var(--color-green)' }}>{pct(cal.overall.actual)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-dim text-xs mt-3">
        {verdict(cal)}
        {cal.unscored > 0 && ` ${fmt(cal.unscored)} earlier reviews carry no prediction and are left out.`}
      </p>
    </>
  );
}

/** A rate the evidence does not carry prints as a dash, never as a number. */
function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

/** One sentence of reading — from the **worst band**, not from the pool.
 *
 *  The pool is where a miscalibration goes to hide. On the first real data this
 *  panel saw, overall was 84% predicted against 83% actual — a point apart, and a
 *  sentence saying "about right" sat directly under a row reading 97% predicted
 *  against 87% actual across 120 reviews. Averaging an over-confident band against
 *  an under-confident one cancels them, and the cancellation is the failure this
 *  panel exists to show. VISION §3 forbids a number that flatters; a summary line
 *  that contradicts the table above it is the same offence in prose.
 *
 *  Deliberately not advice: the app does not know whether a learner *wants* the
 *  extra reviews a higher target buys, and `candos.ts`'s rule against claiming
 *  competence applies equally to claiming a setting is wrong. */
function verdict(cal: Calibration): string {
  const rated = cal.bands.filter((b) => b.predicted !== null && b.actual !== null);
  if (!rated.length) return '';
  // Ranked by gap × reviews, not by gap alone. On the first real data this saw,
  // the widest gap was a 15-point one over 35 reviews while a 10-point one sat on
  // 120 — and the second is both the stronger evidence and the one worth acting
  // on. Weighting by `n` is the whole difference between naming the noisiest band
  // and naming the consequential one.
  const weight = (b: typeof rated[number]) => Math.abs(b.actual! - b.predicted!) * b.n;
  const worst = rated.reduce((a, b) => (weight(b) > weight(a) ? b : a));
  const gap = Math.round((worst.actual! - worst.predicted!) * 100);
  if (Math.abs(gap) <= 3) return 'The scheduler is calling it about right, in every band.';
  return gap > 0
    ? `Where it expected ${worst.label}, you recalled ${gap} points more — it is being cautious with you there.`
    : `Where it expected ${worst.label}, you recalled ${Math.abs(gap)} points fewer — it is more confident than your results in that band.`;
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <Card pad="none" className="p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <Kicker className="block mb-3">{sub}</Kicker>
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid place-items-center h-[120px] text-dim text-xs text-center px-4">{text}</div>;
}

/** Minimal SVG bar chart: proportional heights, hover titles, last-value label.
 *  Bars grow from the baseline on mount (see `.bar-grow` in index.css) — the one
 *  chart-shaped surface in the app had no entrance at all while the recap had
 *  five. */
/** Minimum columns the viewBox is divided into.
 *
 *  Without it `bw = 100 / n`, so two values are two 35-unit-wide bars and one is
 *  a slab — a chart whose *bar width* encodes how little data it has, which is
 *  the opposite of what a bar width should mean. Bars are left-aligned in the
 *  reserved grid, so a short series reads as a series that has not filled up
 *  rather than as a series of enormous values. */
const MIN_COLUMNS = 7;

function Bars({ values, labels, color, max, muted, suffix = '' }:
  { values: number[]; labels: string[]; color: string; max?: number; muted?: boolean[]; suffix?: string }) {
  const top = max ?? Math.max(1, ...values);
  const n = values.length;
  const bw = 100 / Math.max(n, MIN_COLUMNS);
  const last = values[n - 1];
  return (
    <div>
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="w-full h-[120px] block" role="img"
        aria-label={`${n} bars, latest ${last}${suffix}`}>
        {values.map((val, i) => {
          const h = Math.max(val > 0 ? 1.5 : 0.75, (val / top) * 40);
          return (
            <rect key={i} className="bar-grow" x={i * bw + bw * 0.15} y={44 - h} width={bw * 0.7} height={h} rx={0.8}
              fill={muted?.[i] ? 'var(--color-line)' : color} opacity={i === n - 1 ? 1 : 0.55}>
              <title>{`${labels[i]}: ${val}${suffix}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-2xs text-dim font-mono mt-1">
        <span>{labels[0]}</span>
        <span className="text-txt font-bold">{last}{suffix}</span>
        <span>{labels[n - 1]}</span>
      </div>
    </div>
  );
}
