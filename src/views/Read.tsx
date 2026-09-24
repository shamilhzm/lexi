// Lesen — real German, about what you care about.
//
// ## What changed on 2026-09-24, and why
//
// This tab was two halves: sentences built from your own cards, and a meter for
// text you paste. Both are still here. Neither gave a B1 learner a reason to open
// the app on a day with nothing due, and the owner — the app's first and most
// committed user — stopped opening it: after five months and B1, German-as-subject
// had lost to everything German could be *about*.
//
// So Lesen now leads with the news: today's articles from tagesschau, SRF, DW and
// heise on the topics the learner chose — economy, politics, immigration, tech,
// motorsport, games, art — each marked with how much of it they already know, and
// each opening into a reader where any word can be looked up, kept as a card with
// the sentence it came from, and written back about. See `components/reader/`.
//
// The measurement that decided it: of the content words in 25 Tagesschau
// articles, 23% are not in Lexi's corpus at all. The corpus was built from course
// books; the news is a different register. A learner cannot flashcard their way
// across that gap from a list — they cross it by reading, with a dictionary and a
// scheduler beside them, which is what this now is.
import { lazy, Suspense, useState } from 'react';
import Card from '../components/ui/Card.tsx';
import Kicker from '../components/ui/Kicker.tsx';
import NewsFeed from '../components/reader/NewsFeed.tsx';
import TopicChooser from '../components/reader/TopicChooser.tsx';
import PasteMeter from '../components/reader/PasteMeter.tsx';
import ReadingList from '../components/ReadingList.tsx';
import { newsTopics, setNewsTopics } from '../lib/news/library.ts';
import { useStore } from '../useStore.ts';
import type { Target } from '../types.ts';

// The reader proper — word sheet, write-back, the AI client, read-aloud — is
// opened deliberately and is most of this feature's code, so it loads on first
// use rather than on the boot path. Same reasoning as Exam and Print in App.tsx.
const ArticleView = lazy(() => import('../components/reader/ArticleView.tsx'));

export default function Read({ onStudy, article, onArticle, onSettings }: {
  onStudy: (t: Target) => void;
  article: string | null;
  onArticle: (id: string | null) => void;
  onSettings: () => void;
}) {
  useStore();
  const topics = newsTopics();
  const [editing, setEditing] = useState(false);

  const openArticle = (id: string | null) => {
    onArticle(id);
    document.getElementById('main')?.scrollTo({ top: 0 });
  };

  if (article) {
    return (
      <Suspense fallback={<div className="grid place-items-center min-h-[240px] text-dim">Loading…</div>}>
        <ArticleView id={article} onBack={() => openArticle(null)} onStudy={onStudy} onSettings={onSettings} />
      </Suspense>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px] flex flex-col gap-6">
      <div>
        <Kicker className="block mb-0.5">Read</Kicker>
        <h1 lang="de" className="display text-3xl sm:text-4xl mb-1">Lesen</h1>
        <p className="text-dim text-sm">
          Today’s news in German, on what you care about — with every word one tap from a dictionary and your deck.
        </p>
      </div>

      {!topics || editing ? (
        <Card tone="panel" pad="md">
          <h2 className="text-lg font-bold">What do you want to read about?</h2>
          <p className="text-sm text-dim mt-1 mb-4">
            Pick what you’d read anyway. German is easier to learn about something you care about — and it’s the fastest way past B1.
          </p>
          <TopicChooser initial={topics ?? []} cta={topics ? 'Save topics' : 'Show me the news'}
            onDone={(ids) => { setNewsTopics(ids); setEditing(false); }} />
        </Card>
      ) : (
        <NewsFeed topics={topics} onOpen={openArticle} onEditTopics={() => setEditing(true)} />
      )}

      <section aria-labelledby="lesen-sentences">
        <h2 id="lesen-sentences" className="text-lg font-bold mb-2">Sentences you can almost read</h2>
        <ReadingList onStudy={onStudy} limit={3} />
      </section>

      <PasteMeter onStudy={onStudy} />
    </div>
  );
}
