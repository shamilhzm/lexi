// Stats — the terminal's terminal screen. Four honest panels over data the
// store already owns: reviews/day, recall trend, the 7-day due forecast, and
// the Known growth curve. Inline SVG bars, no chart library. The review log
// starts accruing the day this ships; empty panels say so instead of lying.
import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { reviewLog, dueForecast, knownHistory, totals } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';

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

  return (
    <div className="max-w-[820px] mx-auto">
      <div className="flex items-center gap-2.5 mb-1">
        <BarChart3 size={20} className="text-amber" />
        <h1 className="text-[20px] sm:text-[22px] font-bold">Stats</h1>
      </div>
      <p className="text-dim text-[13px] mb-4">
        {fmt(t.known)} known · {fmt(t.learned)} learning · {fmt(t.due)} due now
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Panel title="Reviews per day" sub="last 14 days">
          {anyReviews
            ? <Bars values={perDay} labels={days.map(dayLabel)} color="var(--color-amber)" />
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
            color="var(--color-amber)" />
        </Panel>

        <Panel title="Known growth" sub={`daily totals · ${history.length < 3 ? 'accrues one point per study day' : `${history.length} days`}`}>
          <Bars values={history.slice(-14).map((h) => h.known)}
            labels={history.slice(-14).map((h) => dayLabel(h.date))}
            color="var(--color-green)" />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-line rounded-[16px] p-4">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="text-[11px] text-dim uppercase tracking-[1px] mb-3">{sub}</p>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid place-items-center h-[120px] text-dim text-[13px] text-center px-4">{text}</div>;
}

/** Minimal SVG bar chart: proportional heights, hover titles, last-value label. */
function Bars({ values, labels, color, max, muted, suffix = '' }:
  { values: number[]; labels: string[]; color: string; max?: number; muted?: boolean[]; suffix?: string }) {
  const top = max ?? Math.max(1, ...values);
  const n = values.length;
  const bw = 100 / n;
  const last = values[n - 1];
  return (
    <div>
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="w-full h-[120px] block">
        {values.map((val, i) => {
          const h = Math.max(val > 0 ? 1.5 : 0.75, (val / top) * 40);
          return (
            <rect key={i} x={i * bw + bw * 0.15} y={44 - h} width={bw * 0.7} height={h} rx={0.8}
              fill={muted?.[i] ? 'var(--color-line)' : color} opacity={i === n - 1 ? 1 : 0.55}>
              <title>{`${labels[i]}: ${val}${suffix}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-dim font-mono mt-1">
        <span>{labels[0]}</span>
        <span className="text-txt font-bold">{last}{suffix}</span>
        <span>{labels[n - 1]}</span>
      </div>
    </div>
  );
}
