import type { ReactNode } from 'react';
import { totals, streak } from '../store.ts';
import { useStore } from '../useStore.ts';
import { fmt } from '../lib/ui.ts';
import CountUp from './CountUp.tsx';
import Card from './ui/Card.tsx';
import Kicker from './ui/Kicker.tsx';

function Kpi({ label, value, sub, subClass }: { label: string; value: ReactNode; sub: string; subClass?: string }) {
  return (
    <Card pad="none" className="px-3 py-3 sm:px-4 sm:py-3.5">
      <Kicker className="block">{label}</Kicker>
      <div className="font-mono text-2xl sm:text-3xl font-bold mt-1 leading-none tabular-nums">{value}</div>
      <div className={`text-2xs mt-1.5 ${subClass ?? 'text-dim'}`}>{sub}</div>
    </Card>
  );
}

export default function Kpis() {
  useStore();
  const t = totals();
  const cov = Math.round(t.coverage * 100);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
      <Kpi label="Due today" value={<CountUp value={t.due} />} sub="▲ ready to study" subClass="text-green" />
      <Kpi label="Words known" value={<CountUp value={t.known} />} sub={`${cov}% coverage · ${fmt(t.learned)} seen`} subClass="text-green" />
      <Kpi label="Words learned" value={<CountUp value={t.learned} />} sub={`of ${fmt(t.count)} in lexicon`} subClass="text-amber" />
      <Kpi label="Streak" value={<CountUp value={streak()} />} sub="days in a row" subClass="text-green" />
    </div>
  );
}
