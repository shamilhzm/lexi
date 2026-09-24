// A news story, as a slot in the Wörter feed.
//
// ## Why the feed, and not a room
//
// The 2026-09-05 refocus cut the reading room because it was a seventh product
// competing for the same twenty minutes. That argument still holds against a
// *room*. It does not hold against a slot: the feed is already where the learner
// is, it already scrolls forever, and a story every few words costs no navigation
// at all. What changed is recorded in VISION — the owner stopped opening the app
// at B1, because a feed of single words, however well ordered, is German as a
// subject; a story about the DAX or the Grand Prix is German as a medium.
//
// ## What a story slot does and does not do
//
// It does not grade and records no exposure: it carries no `data-word`, so the
// feed's dwell observer never sees it. It shows the publisher's photograph behind
// glass — the material exists to have something to refract, and a headline over
// a picture is the most direct way to make a scroll feel like the world rather
// than a word list. It says how much of the text the learner already knows, once
// the text is on the device.
import { useEffect, useState } from 'react';
import { Headphones, ArrowRight, Check } from 'lucide-react';
import { loadBody, cachedBody, bodyText, tagesschauBudget, type FeedArticle } from '../../lib/news/feed.ts';
import { SOURCE_LABEL, TOPICS, TOPIC_BY_ID, primaryTopic, type TopicId } from '../../lib/news/sources.ts';
import { isRead, setNewsTopics } from '../../lib/news/library.ts';
import { namesIn } from '../../lib/news/names.ts';
import { coverageOf } from '../../lib/coverage.ts';
import { stateOf } from '../../lib/learnerState.ts';
import { ago } from '../../lib/news/text.ts';
import { totals } from '../../store.ts';

const slotClass = 'feed-slot snap-start snap-always h-full flex-shrink-0 w-full relative overflow-hidden';

export function StorySlot({ story, onOpen }: { story: FeedArticle; onOpen: (a: FeedArticle) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [imgOk, setImgOk] = useState(true);

  // How much of it the learner knows — from the device if the text is there,
  // otherwise fetched, within Tagesschau's hourly allowance. A learner with nothing
  // studied yet is not shown "0%": true and useless.
  useEffect(() => {
    if (!story.fullText || totals().known === 0) return;
    let live = true;
    (async () => {
      let paras = await cachedBody(story.id);
      if (!paras && (story.source !== 'tagesschau' || tagesschauBudget() > 12)) paras = (await loadBody(story))?.paras ?? null;
      if (!paras || !live) return;
      const names = await namesIn(paras.map((p) => p.text), stateOf).catch(() => new Set<string>());
      const c = coverageOf(bodyText(paras), { stateOf, names });
      if (live && c.counted) setPct(Math.round((c.known / c.counted) * 100));
    })();
    return () => { live = false; };
  }, [story]);

  const topic = TOPIC_BY_ID.get(primaryTopic(story.topics) ?? story.topics[0]);
  const read = isRead(story.id);

  return (
    <section aria-labelledby={`story-${story.id}`} className={slotClass}>
      {story.image && imgOk && (
        <>
          {/* The photograph is the publisher's, loaded from their server like the
              text. A slow push-in is the one movement here: transform-only, the
              resting frame is the photograph, and it is off under reduced motion. */}
          <img src={story.image.src} alt={story.image.alt ?? ''} loading="lazy" decoding="async"
            onError={() => setImgOk(false)}
            className="story-photo absolute inset-0 w-full h-full object-cover" />
          <div aria-hidden className="absolute inset-0 story-scrim" />
        </>
      )}
      <div className="relative h-full flex flex-col justify-end items-center px-4 sm:px-6
        pt-[var(--bar-t)] pb-[calc(var(--bar-b)+1rem)]">
        <button onClick={() => onOpen(story)}
          className="story-card glass rounded-xl w-full max-w-[560px] text-left px-5 py-5 active:scale-[.99] transition">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-dim">
            <span className="font-mono uppercase tracking-widest text-accent">{SOURCE_LABEL[story.source]}</span>
            {topic && <span>{topic.label}</span>}
            {story.published > 0 && <span>{ago(story.published)}</span>}
            {story.audio && <span className="inline-flex items-center gap-0.5"><Headphones size={11} /> read slowly</span>}
            {read && <span className="inline-flex items-center gap-0.5 text-green"><Check size={11} /> read</span>}
          </p>
          {story.topline && <p lang="de" className="mt-2 text-xs font-semibold text-dim">{story.topline}</p>}
          <h2 id={`story-${story.id}`} lang="de" className="headword text-[1.75rem] sm:text-4xl font-bold leading-[1.1] mt-1 break-words">
            {story.title}
          </h2>
          {story.teaser && <p lang="de" className="mt-2 text-base text-dim leading-snug line-clamp-3">{story.teaser}</p>}
          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent text-bg font-bold text-sm px-4 h-10">
              Lesen <ArrowRight size={15} />
            </span>
            {/* Shown only once it says something encouraging *and* informative. On
                a learner whose Lexi record is thin, "3% known" is true of the record
                and false of the person, and a feed is the wrong place to argue that;
                the reader shows the number with the context line that makes it fair. */}
            {pct !== null && pct >= 50 && (
              <span className="flex items-center gap-2" aria-label={`${pct}% of the words known`}>
                <span className="h-1.5 w-20 rounded-full bg-panel2 overflow-hidden">
                  <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
                </span>
                <span className="font-mono text-2xs text-dim tabular-nums">{pct}% known</span>
              </span>
            )}
            {!story.fullText && <span className="text-2xs text-dim">summary only</span>}
          </div>
          {story.image?.credit && <p className="mt-3 text-2xs text-dim/80 truncate">Photo: {story.image.credit}</p>}
        </button>
      </div>
    </section>
  );
}

/** The one slot that asks something of the learner — once, and only until they
 *  answer. Choosing topics is what turns the story slots on. */
export function TopicSlot({ onChosen }: { onChosen: () => void }) {
  const [picked, setPicked] = useState<Set<TopicId>>(new Set());
  const toggle = (id: TopicId) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  return (
    <section aria-labelledby="topics-slot" className={`${slotClass} flex flex-col items-center justify-safe-center px-5
      pt-[var(--bar-t)] pb-[var(--bar-b)]`}>
      <div className="w-full max-w-[520px]">
        <p className="font-mono text-2xs uppercase tracking-widest text-accent text-center">Also in the feed</p>
        <h2 id="topics-slot" className="text-2xl font-bold text-center mt-1">Today’s news, in German</h2>
        <p className="text-sm text-dim text-center mt-1 mb-5 max-w-[40ch] mx-auto">
          Pick what you’d read anyway, and a story joins the feed every few words — tap any word in it to look it up or save it.
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {TOPICS.map((t) => {
            const on = picked.has(t.id);
            return (
              <li key={t.id}>
                <button onClick={() => toggle(t.id)} aria-pressed={on}
                  className={`tap-44 rounded-full px-4 h-10 text-sm font-semibold transition active:scale-95
                    ${on ? 'bg-accent text-bg' : 'glass text-txt'}`}>
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex justify-center">
          <button disabled={!picked.size}
            onClick={() => { setNewsTopics(TOPICS.map((t) => t.id).filter((id) => picked.has(id))); onChosen(); }}
            className="tap-44 inline-flex items-center gap-2 rounded-full bg-accent text-bg font-bold text-sm px-5 h-11
              disabled:opacity-40 active:scale-95 transition">
            Add stories to my feed <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
