// What do you want to read about?
//
// Different from the onboarding "interests" picker, and deliberately so: that one
// chooses which *corpus sectors* new cards come from. This chooses which *news*
// arrives — the reason to open the app on a day with nothing due.
import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import Button from '../ui/Button.tsx';
import { TOPICS, type TopicId } from '../../lib/news/sources.ts';

export default function TopicChooser({ initial, onDone, cta = 'Show me the news' }: {
  initial: TopicId[];
  onDone: (ids: TopicId[]) => void;
  cta?: string;
}) {
  const [picked, setPicked] = useState<Set<TopicId>>(new Set(initial));
  const toggle = (id: TopicId) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  return (
    <div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TOPICS.map((t) => {
          const on = picked.has(t.id);
          return (
            <li key={t.id}>
              <button onClick={() => toggle(t.id)} aria-pressed={on}
                className={`tap-44 w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors
                  ${on ? 'border-accent bg-panel2' : 'border-line hover:border-accent'}`}>
                <span className={`grid place-items-center w-5 h-5 rounded-sm border flex-shrink-0 ${on ? 'bg-accent border-accent text-bg' : 'border-line'}`}>
                  {on && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span lang="de" className="block text-xs text-dim">{t.de}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button className="mt-4" disabled={!picked.size} onClick={() => onDone(TOPICS.map((t) => t.id).filter((id) => picked.has(id)))}>
        {cta} <ArrowRight size={14} />
      </Button>
    </div>
  );
}
