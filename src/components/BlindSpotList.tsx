// Ranked recurring mistakes with one-tap drilling. Every wrong answer in a drill
// is logged under a structural tag (grammar point, drill type); this ranks them so
// you fix what actually trips you up. Rendered inline in Today’s Blind Spots
// accordion (expands in place — no page jump).
import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { missStats, missTotal } from '../store.ts';
import { useStore } from '../useStore.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';

export default function BlindSpotList({ onDrill, days = 30 }:
  { onDrill: (tag?: string) => void; days?: number }) {
  const v = useStore();
  const stats = useMemo(() => missStats(days), [days, v]);
  const total = missTotal(days);
  const max = stats[0]?.count ?? 1;

  if (stats.length === 0) {
    return (
      <Card pad="none" className="px-6 py-8 text-center">
        <div className="grid place-items-center w-11 h-11 rounded-full mx-auto mb-3" style={{ background: 'var(--color-green-d)' }}>
          <Target className="text-green" size={18} />
        </div>
        <h3 className="text-base font-bold mb-1">No blind spots yet</h3>
        <p className="text-dim text-xs">Do some drills — every miss is tracked here so you can target your weak points.</p>
      </Card>
    );
  }

  return (
    <Card pad="none" className="p-4">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-mono font-bold text-xl tabular-nums">{total}</span>
        <span className="text-dim text-xs">misses across {stats.length} area{stats.length === 1 ? '' : 's'} · last {days} days</span>
      </div>
      <div className="space-y-2.5">
        {stats.map((s) => (
          <button key={s.tag} onClick={() => onDrill(s.tag)}
            className="block w-full text-left rounded-md px-1.5 py-1 -mx-1.5 hover:bg-panel2 transition-colors" title="Drill this weakness">
            <div className="flex justify-between text-xs mb-1">
              <span className="truncate pr-2">{s.tag}</span>
              <span className="font-mono text-dim flex-shrink-0">{s.count}×</span>
            </div>
            <div className="h-2 rounded-full bg-panel2 overflow-hidden">
              <div className="h-full bg-red" style={{ width: `${Math.max(8, (s.count / max) * 100)}%` }} />
            </div>
            {/* "Verb conjugation 15×" is true and unactionable. The words it
                actually happened on are what you'd go and drill — and the log
                knew them all along. Only worth showing when one stands out. */}
            {s.terms.length > 0 && s.terms[0].count > 1 && (
              <p className="text-2xs text-dim mt-1 truncate">
                most often{' '}
                {s.terms.slice(0, 3).map((t, k) => (
                  <span key={t.term}>
                    {k > 0 && ', '}
                    <span lang="de" className="text-txt">{t.term}</span>
                    <span className="font-mono"> {t.count}×</span>
                  </span>
                ))}
              </p>
            )}
            {/* The substitution, which is the only line here a teacher would
                call a diagnosis. "Kasus 15×" names a category and "most often
                *der Tisch*" names a word; neither says what the learner
                actually does — and what they do is reach for the accusative
                when the frame wants a dative, every time, which is one lesson.
                Shown only for a repeated pair: a single confusion is a slip,
                and calling it a pattern would be the app overclaiming. */}
            {s.confusions.length > 0 && s.confusions[0].count > 1 && (
              <p className="text-2xs mt-1 truncate">
                <span className="text-dim">reaches for </span>
                <span lang="de" className="text-red-txt">{s.confusions[0].chose}</span>
                <span className="text-dim"> when it should be </span>
                <span lang="de" className="text-txt">{s.confusions[0].asked}</span>
                <span className="text-dim font-mono"> {s.confusions[0].count}×</span>
              </p>
            )}
          </button>
        ))}
      </div>
      {/* Target, not Sparkles: this button drills the exact weaknesses listed
          above it, and the icon should say so. */}
      <Button size="sm" className="mt-4" onClick={() => onDrill()}>
        <Target size={14} /> Drill grammar
      </Button>
    </Card>
  );
}
