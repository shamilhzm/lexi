// Today's reading, on Today.
//
// Today answers "what do I do now?". Until 2026-09-24 the answer was only ever a
// card session, and a learner past B1 with nothing due was told "All clear" and
// sent away. Now the second half of every day is one article on something the
// learner chose — the part of the day that is about the world, not about Lexi.
import { useEffect, useState } from 'react';
import { Newspaper, ChevronRight, Headphones } from 'lucide-react';
import Card from '../ui/Card.tsx';
import Kicker from '../ui/Kicker.tsx';
import { loadTopics, rememberArticle, type FeedArticle } from '../../lib/news/feed.ts';
import { newsTopics, isRead, wordsRead } from '../../lib/news/library.ts';
import { SOURCE_LABEL } from '../../lib/news/sources.ts';
import { fmt } from '../../lib/ui.ts';

export default function TodayReading({ onRead, onArticle }: { onRead: () => void; onArticle: (id: string) => void }) {
  const topics = newsTopics();
  const [picks, setPicks] = useState<FeedArticle[] | null>(null);

  useEffect(() => {
    if (!topics?.length) return;
    let live = true;
    loadTopics(topics).then((f) => {
      if (!live) return;
      // One from each of the first topics that has something unread, so the card
      // is not three stories about the same war.
      const out: FeedArticle[] = [];
      for (const t of topics) {
        const a = f.articles.find((x) => x.topics.includes(t) && x.fullText && !isRead(x.id) && !out.includes(x));
        if (a) out.push(a);
        if (out.length === 2) break;
      }
      setPicks(out);
    }).catch(() => { if (live) setPicks([]); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics?.join(',')]);

  const week = wordsRead(7);

  if (!topics?.length) {
    return (
      <Card as="button" pad="none" onClick={onRead} className="w-full text-left px-4 sm:px-6 py-4 mb-4 hover:border-accent transition-colors">
        <Kicker tone="accent" className="flex items-center gap-1.5"><Newspaper size={12} /> Heute lesen</Kicker>
        <p className="text-base font-semibold mt-1.5">Read today’s news in German — on what you actually care about</p>
        <p className="text-xs text-dim mt-0.5">Economy, tech, politics, motorsport, games… pick your topics and every word is one tap from your deck.</p>
      </Card>
    );
  }

  return (
    <Card pad="none" className="px-4 sm:px-6 py-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        <Kicker tone="accent" className="flex items-center gap-1.5"><Newspaper size={12} /> Heute lesen</Kicker>
        {week.articles > 0 && <span className="font-mono text-2xs text-dim">{fmt(week.words)} words read this week</span>}
      </div>
      {picks === null ? (
        <p className="text-sm text-dim mt-2">Fetching today’s stories…</p>
      ) : picks.length === 0 ? (
        <p className="text-sm text-dim mt-2">You’ve read everything new on your topics. <button onClick={onRead} className="underline decoration-dotted hover:text-accent">See the feed</button></p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-line">
          {picks.map((a) => (
            <li key={a.id}>
              <button onClick={() => { void rememberArticle(a).then(() => onArticle(a.id)); }}
                className="tap-44 w-full flex items-center gap-3 py-2.5 text-left group">
                <span className="flex-1 min-w-0">
                  <span className="block text-2xs text-dim font-mono uppercase tracking-wider">
                    {SOURCE_LABEL[a.source]}{a.audio && <Headphones size={10} className="inline ml-1 -mt-0.5" />}
                  </span>
                  <span lang="de" className="block headword text-base font-semibold leading-snug group-hover:text-accent">{a.title}</span>
                </span>
                <ChevronRight size={15} className="text-dim flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
