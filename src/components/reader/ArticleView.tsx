// One article, read with Lexi beside you.
//
// The loop this surface exists for, in the order it happens:
//
//   read      — the publisher's text, with every word you have not got yet marked,
//               and every word tappable;
//   look up   — a card Lexi has, or a Wiktionary entry for one it does not; hear
//               the sentence; with a key, have it explained;
//   keep      — save what is worth keeping, as a card whose example is the sentence
//               you met it in; say "I know it" for what you already have;
//   respond   — write two to four sentences back, in German;
//   study     — the words you took, in a session that says where they came from.
//
// The meter at the top is the same arithmetic as the paste box, so "known" means
// one thing across the app. What is new here is that proper names are looked up
// (not guessed) and leave the denominator.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ArrowLeft, ExternalLink, Volume2, Square, Check, Play, Loader2, Headphones } from 'lucide-react';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import Kicker from '../ui/Kicker.tsx';
import WordSheet, { type Picked } from './WordSheet.tsx';
import Respond from './Respond.tsx';
import { coverageOf, ASSISTED, INDEPENDENT, type Coverage, type CoverageToken } from '../../lib/coverage.ts';
import { stateOf } from '../../lib/learnerState.ts';
import { loadBody, recallArticle, bodyText } from '../../lib/news/feed.ts';
import { SOURCE_LABEL } from '../../lib/news/sources.ts';
import { markRead, isRead } from '../../lib/news/library.ts';
import { namesIn } from '../../lib/news/names.ts';
import { sentenceAt, wordCount, ago } from '../../lib/news/text.ts';
import { readAloud } from '../../lib/news/voice.ts';
import { useStore } from '../../useStore.ts';
import { fmt } from '../../lib/ui.ts';
import { WORDS } from '../../data/index.ts';
import type { Article, Para } from '../../lib/news/types.ts';
import type { Target, Word } from '../../types.ts';

const TINT: Record<string, string> = {
  known: '',
  learning: 'text-accent font-semibold',
  new: 'text-accent underline decoration-dotted underline-offset-4',
  absent: 'underline decoration-dotted decoration-dim/70 underline-offset-4',
};

export default function ArticleView({ id, onBack, onStudy, onSettings }: {
  id: string;
  onBack: () => void;
  onStudy: (t: Target) => void;
  onSettings: () => void;
}) {
  const v = useStore();
  const [article, setArticle] = useState<Article | null | 'missing'>(null);
  const [body, setBody] = useState<{ paras: Para[]; complete: boolean } | null | 'loading' | 'failed'>('loading');
  const [names, setNames] = useState<ReadonlySet<string>>(new Set());
  const [picked, setPicked] = useState<(Picked & { key: string }) | null>(null);
  const [queued, setQueued] = useState<Set<string>>(new Set());
  const [mined, setMined] = useState<Word[]>([]);
  const [speaking, setSpeaking] = useState(-1);
  const stopRef = useRef<(() => void) | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    recallArticle(id).then((a) => { if (live) setArticle(a ?? 'missing'); });
    return () => { live = false; stopRef.current?.(); };
  }, [id]);

  useEffect(() => {
    if (!article || article === 'missing') return;
    let live = true;
    setBody('loading');
    setDone(isRead(article.id));
    loadBody(article).then((b) => { if (live) setBody(b ?? 'failed'); }).catch(() => { if (live) setBody('failed'); });
    return () => { live = false; };
  }, [article]);

  const paras = useMemo(() => (body && typeof body === 'object' ? body.paras : []), [body]);
  const text = useMemo(() => bodyText(paras), [paras]);

  // Names: look up the capitalised words the corpus cannot place, once per body.
  useEffect(() => {
    if (!paras.length) return;
    let live = true;
    namesIn(paras.map((p) => p.text), stateOf).then((n) => { if (live) setNames(n); }).catch(() => { /* offline — count them */ });
    return () => { live = false; };
  }, [paras]);

  const cov: Coverage | null = useMemo(
    () => (text ? coverageOf(text, { stateOf, names }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, names, v, WORDS.length],
  );
  const paraCovs = useMemo(
    () => paras.map((p) => coverageOf(p.text, { stateOf, names })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paras, names, v, WORDS.length],
  );

  if (article === 'missing') {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <BackLink onBack={onBack} />
        <Card pad="md"><p className="text-sm text-dim">This article is no longer on this device. Open it again from the feed.</p></Card>
      </div>
    );
  }
  if (!article) return <div className="grid place-items-center min-h-[200px] text-dim"><Loader2 className="animate-spin" /></div>;

  const pct = cov && cov.counted ? Math.round((cov.known / cov.counted) * 100) : 0;
  const absentForms = cov ? new Set(cov.tokens.filter((t) => t.state === 'absent').map((t) => t.text.toLowerCase())).size : 0;
  const worth = cov ? cov.unlocks.filter((u) => !queued.has(u.word.id) && !mined.some((m) => m.id === u.word.id)).slice(0, 8) : [];
  const studyIds = [...new Set([...queued, ...mined.map((w) => w.id)])];

  const pickEl = (el: HTMLElement) => {
    const pi = Number(el.dataset.p), ti = Number(el.dataset.t);
    const tok = paraCovs[pi]?.tokens[ti];
    if (!tok) return;
    const offset = Number(el.dataset.o);
    setPicked({
      key: `${pi}:${ti}`,
      surface: tok.text,
      word: tok.word,
      sentence: sentenceAt(paras[pi].text, offset),
      paragraph: paras[pi].text,
    });
  };
  const onWord = (e: MouseEvent<HTMLElement>) => {
    const el = (e.target as HTMLElement).closest('[data-t]') as HTMLElement | null;
    if (el) pickEl(el);
  };
  // The words are one tab stop, not six hundred: Tab reaches the text, the arrow
  // keys walk it word by word, Enter looks the focused word up. A roving tabindex
  // — the pattern a toolbar uses — so a keyboard can do everything a finger can.
  const onKeys = (e: KeyboardEvent<HTMLElement>) => {
    const el = (e.target as HTMLElement).closest('[data-t]') as HTMLElement | null;
    if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickEl(el); return; }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const all = [...(e.currentTarget.querySelectorAll('[data-t]') as NodeListOf<HTMLElement>)];
    const next = all[all.indexOf(el) + (e.key === 'ArrowRight' ? 1 : -1)];
    if (next) { el.tabIndex = -1; next.tabIndex = 0; next.focus(); }
  };

  const toggleAloud = () => {
    if (speaking >= 0) { stopRef.current?.(); stopRef.current = null; return; }
    stopRef.current = readAloud(paras.map((p) => p.text), setSpeaking);
  };

  const finish = () => {
    markRead({ id: article.id, title: article.title, source: article.source, url: article.url, words: wordCount(text) });
    setDone(true);
  };

  return (
    <div className="mx-auto w-full max-w-[720px] flex flex-col gap-4 pb-4">
      <BackLink onBack={onBack} />

      <header>
        <p className="text-2xs text-dim flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono uppercase tracking-wider">{SOURCE_LABEL[article.source]}</span>
          {article.published > 0 && <span>{ago(article.published)}</span>}
          <a href={article.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline decoration-dotted hover:text-accent">
            Original <ExternalLink size={10} />
          </a>
        </p>
        {article.topline && <Kicker tone="accent" className="block mt-2" lang="de">{article.topline}</Kicker>}
        <h1 lang="de" className="display text-2xl sm:text-3xl mt-1 leading-tight">{article.title}</h1>
      </header>

      {/* The meter — how much of this is yours already. */}
      {cov && cov.counted > 0 && (
        <Card tone="panel" pad="md">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-mono text-3xl font-bold tabular-nums">{pct}%</span>
            <span className="text-sm">of the words here are ones you know in Lexi</span>
          </div>
          <p className="mt-1 text-xs text-dim">
            {fmt(cov.known)} of {fmt(cov.counted)} words
            {cov.learning > 0 && <> · {cov.learning} still learning</>}
            {cov.fresh > 0 && <> · <span className="text-accent">{cov.fresh} Lexi can teach you</span></>}
            {absentForms > 0 && <> · {absentForms} to look up</>}
            {cov.excluded.entity > 0 && <> · names not counted</>}
          </p>
          <p className="mt-2 text-xs text-dim">
            {cov.ratio >= INDEPENDENT ? 'This one reads without help.'
              : cov.ratio >= ASSISTED ? 'Readable with the odd lookup.'
                : 'Real news runs above textbook level. Tap anything you don’t know — and keep what’s worth keeping.'}
          </p>
        </Card>
      )}

      {/* Listening. */}
      {paras.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {article.audio ? (
            <div className="w-full">
              <p className="text-xs text-dim flex items-center gap-1.5 mb-1.5"><Headphones size={13} /> Read slowly by DW — listen while you read</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption --
                  the captions are the page: DW's audio is a reading of exactly the
                  text rendered below it, which is the transcript. */}
              <audio controls preload="none" src={article.audio} className="w-full" />
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={toggleAloud}>
              {speaking >= 0 ? <><Square size={12} /> Stop reading</> : <><Volume2 size={13} /> Read it to me</>}
            </Button>
          )}
        </div>
      )}

      {/* The text. */}
      {body === 'loading' && <p className="flex items-center gap-2 text-sm text-dim"><Loader2 size={14} className="animate-spin" /> Fetching the article…</p>}
      {body === 'failed' && (
        <Card pad="md">
          <p className="text-sm text-dim">
            Couldn’t load the text right now — you may be offline, or Lexi has used this hour’s allowance of Tagesschau requests.
            {' '}<a href={article.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-accent">Read it on the publisher’s site</a>.
          </p>
        </Card>
      )}
      {paras.length > 0 && (
        // A delegation target: the interactive elements are the word spans inside
        // (role="button", roving tabindex), and both events are handled here.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <article lang="de" onClick={onWord} onKeyDown={onKeys} className="flex flex-col gap-4 text-lg leading-loose">
          {paras.map((p, pi) => (
            p.kind === 'h'
              ? <h2 key={pi} className="headword text-xl font-semibold mt-2 leading-snug">{renderTokens(paraCovs[pi], pi, picked?.key)}</h2>
              : (
                <p key={pi} className={`transition-colors ${speaking === pi ? 'border-l-2 border-accent pl-3 -ml-3.5' : ''}`}>
                  {renderTokens(paraCovs[pi], pi, picked?.key)}
                </p>
              )
          ))}
        </article>
      )}
      {body && typeof body === 'object' && !body.complete && (
        <p className="text-sm text-dim">
          {article.source === 'heise'
            ? 'heise shares only this summary with other apps — the full article is on heise.de.'
            : 'Only the summary could be loaded.'}
          {' '}<a href={article.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-accent inline-flex items-center gap-0.5">Read the rest <ExternalLink size={11} /></a>
        </p>
      )}
      {paras.length > 0 && (
        <p className="text-2xs text-dim">
          Text © {SOURCE_LABEL[article.source]}, loaded by your browser from the publisher for your own reading. Lexi stores it only on this device.
        </p>
      )}

      {/* The word you tapped — pinned to the bottom of the reading column. */}
      {picked && (
        <div className="sticky bottom-2 z-20">
          <WordSheet
            key={picked.key}
            picked={picked}
            article={{ title: article.title, url: article.url }}
            queued={queued}
            onQueue={(wid) => setQueued((q) => new Set(q).add(wid))}
            onMined={(w) => setMined((m) => (m.some((x) => x.id === w.id) ? m : [...m, w]))}
            onClose={() => setPicked(null)}
          />
        </div>
      )}

      {/* What to take away. */}
      {cov && (studyIds.length > 0 || worth.length > 0) && (
        <Card tone="panel" pad="md">
          <Kicker>Words from this article</Kicker>
          {studyIds.length > 0 && (
            <p className="text-sm mt-1">
              You picked <b>{studyIds.length}</b> {studyIds.length === 1 ? 'word' : 'words'} to learn.
            </p>
          )}
          {worth.length > 0 && (
            <>
              <p className="text-xs text-dim mt-2">Worth learning here — they recur in this text or are common everywhere:</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {worth.map((u) => (
                  <li key={u.word.id}>
                    <button onClick={() => setQueued((q) => new Set(q).add(u.word.id))}
                      className="tap-44 flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-3 py-1.5 text-sm hover:border-accent transition-colors">
                      <span lang="de" className="font-semibold">{u.word.term}</span>
                      {u.occurrences > 1 && <span className="text-2xs text-dim">×{u.occurrences}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {studyIds.length > 0 && (
            <Button className="mt-3" onClick={() => onStudy({
              kind: 'custom', name: article.title, ids: studyIds, unlockText: article.title,
            })}>
              <Play size={14} /> Study {studyIds.length === 1 ? 'it' : `these ${studyIds.length}`} now
            </Button>
          )}
        </Card>
      )}

      {paras.length > 0 && (
        <Respond
          articleId={article.id}
          title={article.title}
          targets={[...mined, ...[...queued].map((q) => cov?.unlocks.find((u) => u.word.id === q)?.word).filter((w): w is Word => !!w)]}
          onSettings={onSettings}
        />
      )}

      {paras.length > 0 && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" disabled={done} onClick={finish}>
            {done ? <><Check size={14} /> Read · {fmt(wordCount(text))} words</> : <>Done reading</>}
          </Button>
          <button onClick={onBack} className="text-sm text-dim underline decoration-dotted hover:text-accent">Back to the feed</button>
        </div>
      )}
    </div>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="tap-44 self-start inline-flex items-center gap-1.5 text-sm text-dim hover:text-accent">
      <ArrowLeft size={15} /> Lesen
    </button>
  );
}

/** Index of the first tappable token — the roving tabindex's resting stop. */
function firstTappable(c: Coverage): number {
  return c.tokens.findIndex((t) => t.isWord && (t.text.length >= 3 || !!t.word));
}

/** A paragraph's tokens as spans. One click handler on the article reads the
 *  data attributes — a button per word would put six hundred tab stops in a
 *  keyboard user's way, and the text reads as plain prose to a screen reader. */
function renderTokens(c: Coverage | undefined, pi: number, pickedKey: string | undefined) {
  if (!c) return null;
  let offset = 0;
  return c.tokens.map((t: CoverageToken, ti) => {
    const o = offset;
    offset += t.text.length;
    if (!t.isWord) return <span key={ti}>{t.text}</span>;
    const tappable = t.text.length >= 3 || !!t.word;
    const isPicked = pickedKey === `${pi}:${ti}`;
    const tint = t.counted && t.state ? TINT[t.state] : '';
    return (
      <span key={ti}
        data-p={tappable ? pi : undefined} data-t={tappable ? ti : undefined} data-o={tappable ? o : undefined}
        role={tappable ? 'button' : undefined}
        tabIndex={tappable ? (pi === 0 && ti === firstTappable(c) ? 0 : -1) : undefined}
        className={`${tint} ${tappable ? 'cursor-pointer hover:bg-panel2 rounded-sm' : ''} ${isPicked ? 'bg-panel2 outline outline-1 outline-accent' : ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}>
        {t.text}
      </span>
    );
  });
}
