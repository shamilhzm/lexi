// The feed's news topics, editable. The first choice is made in the feed itself
// (`TopicSlot`); this is where it is changed or switched off.
import { Newspaper } from 'lucide-react';
import Card from '../ui/Card.tsx';
import { TOPICS, type TopicId } from '../../lib/news/sources.ts';
import { newsTopics, setNewsTopics, wordsRead } from '../../lib/news/library.ts';
import { useStore } from '../../useStore.ts';
import { fmt } from '../../lib/ui.ts';

export default function NewsTopicsSettings() {
  useStore();
  const on = new Set<TopicId>(newsTopics() ?? []);
  const toggle = (id: TopicId) => {
    const next = new Set(on);
    if (next.has(id)) next.delete(id); else next.add(id);
    setNewsTopics(TOPICS.map((t) => t.id).filter((t) => next.has(t)));
  };
  const week = wordsRead(7);
  return (
    <Card as="section" className="mb-4">
      <div className="flex items-center gap-2 mb-1"><Newspaper size={16} className="text-accent" /><h2 className="text-base font-semibold">Stories in the feed</h2></div>
      <p className="text-dim text-xs mb-3">
        A German news story joins the word feed every few words, on the topics you pick — from tagesschau, SRF, DW and heise,
        fetched by your browser from each publisher. Pick none to switch stories off.
        {week.articles > 0 && <> This week: {week.articles} read, {fmt(week.words)} words.</>}
      </p>
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button key={t.id} onClick={() => toggle(t.id)} aria-pressed={on.has(t.id)}
            className={`tap-44 rounded-full px-3.5 py-2 text-xs border transition-colors ${
              on.has(t.id) ? 'border-accent text-accent bg-panel2 font-semibold' : 'border-line text-dim hover:border-accent'}`}>
            {t.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
