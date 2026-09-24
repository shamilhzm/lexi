// Today's German, about what you care about.
//
// The one surface in Lexi where something new arrives every day that was not there
// yesterday — COMPETITIVE-RESEARCH's weakness #4, "every return mechanism is
// self-referential", answered by the world rather than by a streak.
//
// Each story shows how much of it you already know, once its text is on the
// device: the first few are fetched in the background so the list can be sorted
// by how readable it is for *you* — the thing no other reader can compute
// honestly, because none of them has a forgetting-aware model of what you know.
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Headphones, Check, Settings2, Loader2 } from 'lucide-react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { loadTopics, loadBody, cachedBody, bodyText, rememberArticle, tagesschauBudget, type Feed, type FeedArticle } from '../../lib/news/feed.ts';
import { SOURCE_LABEL, TOPIC_BY_ID, type TopicId } from '../../lib/news/sources.ts';
import { isRead, wordsRead } from '../../lib/news/library.ts';
import { coverageOf } from '../../lib/coverage.ts';
import { stateOf } from '../../lib/learnerState.ts';
import { namesIn } from '../../lib/news/names.ts';
import { ago } from '../../lib/news/text.ts';
import { fmt } from '../../lib/ui.ts';
import { useStore } from '../../useStore.ts';
import { totals } from '../../store.ts';

/** How many stories get their text fetched in the background for ranking. Small,
 *  because Tagesschau allows 60 requests an hour per client and each is one. */
const PREFETCH = 8;
const PAGE = 12;

interface Score { pct: number; counted: number }

export default function NewsFeed({ topics, onOpen, onEditTopics }: {
  topics: TopicId[];
  onOpen: (id: string) => void;
  onEditTopics: () => void;
}) {
  const v = useStore();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TopicId | 'all'>('all');
  const [sort, setSort] = useState<'fresh' | 'easy'>('fresh');
  const [shown, setShown] = useState(PAGE);
  const [scores, setScores] = useState<Map<string, Score>>(new Map());
  const [bodies, setBodies] = useState<Map<string, string>>(new Map());

  const refresh = (force = false) => {
    setLoading(true);
    loadTopics(topics, force).then((f) => { setFeed(f); setLoading(false); }).catch(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [topics.join(',')]);

  const filtered = useMemo(
    () => (feed?.articles ?? []).filter((a) => filter === 'all' || a.topics.includes(filter)),
    [feed, filter],
  );
  const visible = useMemo(() => (sort === 'easy'
    ? [...filtered].sort((a, b) => (scores.get(b.id)?.pct ?? -1) - (scores.get(a.id)?.pct ?? -1))
    : filtered), [filtered, sort, scores]);

  // Bodies for the first few: from the device if already there, else fetched —
  // text only, the scoring happens below so a review re-scores without refetching.
  // Keyed on the *unsorted* list: sorting by ease reorders by score, and keying on
  // that order would fetch more bodies every time a score arrived.
  useEffect(() => {
    let live = true;
    const want = filtered.slice(0, Math.max(PREFETCH, shown)).filter((a) => a.fullText && !bodies.has(a.id));
    (async () => {
      let fetched = 0;
      for (const a of want) {
        if (!live) return;
        let paras = await cachedBody(a.id);
        if (!paras && fetched < PREFETCH && (a.source !== 'tagesschau' || tagesschauBudget() > 12)) {
          fetched++;
          paras = (await loadBody(a))?.paras ?? null;
        }
        if (paras && live) setBodies((m) => new Map(m).set(a.id, bodyText(paras)));
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.map((a) => a.id).slice(0, shown).join(',')]);

  // Names are looked up once per story (and cached per token), so the number here
  // is the number the reader shows when the story is opened.
  const [names, setNames] = useState<Map<string, Set<string>>>(new Map());
  useEffect(() => {
    let live = true;
    (async () => {
      for (const [id, text] of bodies) {
        if (names.has(id)) continue;
        const n = await namesIn(text.split('\n'), stateOf).catch(() => new Set<string>());
        if (!live) return;
        setNames((m) => new Map(m).set(id, n));
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodies]);

  useEffect(() => {
    const m = new Map<string, Score>();
    for (const [id, text] of bodies) {
      const c = coverageOf(text, { stateOf, names: names.get(id) });
      if (c.counted) m.set(id, { pct: Math.round((c.known / c.counted) * 100), counted: c.counted });
    }
    setScores(m);
  }, [bodies, names, v]);

  const week = wordsRead(7);
  // A learner with nothing studied yet would see "0% known" on every story, which
  // is true and useless. The bar appears once there is something to measure.
  const measuring = totals().known > 0;
  const topicChips = topics.map((id) => TOPIC_BY_ID.get(id)).filter((t): t is NonNullable<typeof t> => !!t);

  const open = (a: FeedArticle) => { void rememberArticle(a).then(() => onOpen(a.id)); };

  return (
    <section aria-labelledby="lesen-news" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 id="lesen-news" className="text-lg font-bold">Today, in German</h2>
          <p className="text-xs text-dim">
            {week.articles > 0
              ? <>This week: {week.articles} {week.articles === 1 ? 'article' : 'articles'} · {fmt(week.words)} words read</>
              : <>Read one a day. Tap any word you don’t know.</>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => refresh(true)} aria-label="Refresh the news" title="Refresh"
            className="tap-44-sq grid place-items-center rounded-md text-dim hover:text-accent">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onEditTopics} aria-label="Choose topics" title="Choose topics"
            className="tap-44-sq grid place-items-center rounded-md text-dim hover:text-accent">
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* One scrolling row on a phone — nine topics wrapped to three rows and
          pushed the first story below the fold. */}
      <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap" style={{ scrollbarWidth: 'none' }} role="tablist" aria-label="Topic">
        {[{ id: 'all' as const, label: 'All' }, ...topicChips.map((t) => ({ id: t.id, label: t.label }))].map((t) => (
          <button key={t.id} role="tab" aria-selected={filter === t.id} onClick={() => { setFilter(t.id); setShown(PAGE); }}
            className={`tap-44 flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors
              ${filter === t.id ? 'border-accent text-accent bg-panel2 font-semibold' : 'border-line text-dim hover:border-accent'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex">
        <div className="flex rounded-full border border-line overflow-hidden text-xs" role="group" aria-label="Sort">
          {(['fresh', ...(measuring ? ['easy'] : [])] as ('fresh' | 'easy')[]).map((s) => (
            <button key={s} onClick={() => setSort(s)} aria-pressed={sort === s}
              className={`tap-44 px-3 py-1 ${sort === s ? 'bg-panel2 text-accent font-semibold' : 'text-dim hover:text-accent'}`}>
              {s === 'fresh' ? 'Newest' : 'Easiest for you'}
            </button>
          ))}
        </div>
      </div>

      {loading && !feed && (
        <p className="flex items-center gap-2 text-sm text-dim py-6"><Loader2 size={14} className="animate-spin" /> Fetching today’s news…</p>
      )}
      {feed && feed.stale && (
        <p className="text-2xs text-dim">
          Some sources couldn’t be refreshed{feed.at ? <> — showing what you had {ago(feed.at)}</> : null}.
        </p>
      )}
      {feed && !visible.length && !loading && (
        <Card pad="md"><p className="text-sm text-dim">Nothing on this topic in today’s feeds. Try another, or check back later.</p></Card>
      )}

      <ul className="flex flex-col gap-2">
        {visible.slice(0, shown).map((a) => {
          const s = scores.get(a.id);
          const read = isRead(a.id);
          return (
            <li key={a.id}>
              <Card as="button" pad="none" onClick={() => open(a)}
                className="w-full text-left px-4 py-3 hover:border-accent transition-colors">
                <p className="text-2xs text-dim flex flex-wrap items-center gap-x-2">
                  <span className="font-mono uppercase tracking-wider">{SOURCE_LABEL[a.source]}</span>
                  {a.topline && <span lang="de">{a.topline}</span>}
                  {a.published > 0 && <span>{ago(a.published)}</span>}
                  {a.audio && <span className="inline-flex items-center gap-0.5"><Headphones size={11} /> audio</span>}
                  {!a.fullText && <span>summary only</span>}
                  {read && <span className="inline-flex items-center gap-0.5 text-green"><Check size={11} /> read</span>}
                </p>
                <p lang="de" className={`headword text-lg font-semibold leading-snug mt-1 ${read ? 'text-dim' : ''}`}>{a.title}</p>
                {a.teaser && <p lang="de" className="text-sm text-dim mt-0.5 line-clamp-2">{a.teaser}</p>}
                {s && measuring && (
                  <div className="mt-2 flex items-center gap-2" aria-label={`${s.pct}% of the words known`}>
                    <span className="h-1.5 w-24 rounded-full bg-panel2 overflow-hidden">
                      <span className="block h-full bg-accent" style={{ width: `${s.pct}%` }} />
                    </span>
                    <span className="font-mono text-2xs text-dim tabular-nums">{s.pct}% known</span>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      {visible.length > shown && (
        <Button variant="quiet" size="sm" className="self-start" onClick={() => setShown((n) => n + PAGE)}>
          More stories ({visible.length - shown})
        </Button>
      )}
      {feed && (
        <p className="text-2xs text-dim">
          From tagesschau, SRF, DW and heise — fetched by your browser from each publisher, for your own reading.
          {feed.at > 0 && <> Updated {ago(feed.at)}.</>}
        </p>
      )}
    </section>
  );
}
