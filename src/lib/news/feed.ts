// Fetching, caching and assembling the feed.
//
// Everything is cached in IndexedDB on the learner's device: feed lists for a
// short while (news moves), article bodies for a week (an article rarely changes
// after the first hour, and re-reading one should not cost a request). Offline,
// the reader shows what it last had, and says how old it is.
import { idbGet, idbSet } from '../idb.ts';
import { FEEDS, TOPICS, topicsFor, type FeedKey, type TopicId } from './sources.ts';
import { parseFeed, parseTagesschauList, parseTagesschauDetail, parseSrfArticle, parseDwArticle } from './parse.ts';
import type { Article, Para } from './types.ts';

const LIST_TTL = 20 * 60 * 1000;
const BODY_TTL = 7 * 24 * 3600 * 1000;

// ---- the Tagesschau budget ----------------------------------------------------
//
// The API's terms cap use at 60 requests an hour. That is per client, and this
// client is one learner's browser, so the budget lives in localStorage and is
// spent conservatively — 45, leaving room for a second tab and for our own
// arithmetic being wrong. A request the budget refuses is not an error: the list
// falls back to its cache and a body stays unopened until the hour rolls over.
const BUDGET_KEY = 'lexi.news.tsbudget.v1';
const BUDGET = 45;
const HOUR = 3600 * 1000;

function budgetLog(now = Date.now()): number[] {
  try {
    const a = JSON.parse(localStorage.getItem(BUDGET_KEY) || '[]');
    return Array.isArray(a) ? (a as number[]).filter((t) => now - t < HOUR) : [];
  } catch { return []; }
}
/** Requests left this hour. Exported for the UI's "rate-limited" note. */
export function tagesschauBudget(now = Date.now()): number { return Math.max(0, BUDGET - budgetLog(now).length); }
function spend(url: string): boolean {
  if (!url.startsWith('https://www.tagesschau.de/')) return true;
  const now = Date.now();
  const log = budgetLog(now);
  if (log.length >= BUDGET) return false;
  log.push(now);
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(log)); } catch { /* quota */ }
  return true;
}

class BudgetSpent extends Error {}

async function get(url: string, as: 'json' | 'text'): Promise<unknown> {
  if (!spend(url)) throw new BudgetSpent('tagesschau hourly budget spent');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'json' ? res.json() : res.text();
}

// ---- lists -----------------------------------------------------------------------

interface CachedList { at: number; articles: Article[] }
interface FeedArticle extends Article { feeds: FeedKey[]; topics: TopicId[] }
export type { FeedArticle };

async function loadFeed(key: FeedKey, force = false): Promise<{ articles: Article[]; at: number; stale: boolean }> {
  const cacheKey = `news:list:${key}`;
  let cached: CachedList | undefined;
  try { cached = await idbGet<CachedList>(cacheKey); } catch { /* none */ }
  if (cached && !force && Date.now() - cached.at < LIST_TTL) return { ...cached, stale: false };
  const def = FEEDS[key];
  try {
    const raw = await get(def.url, def.format === 'ts-json' ? 'json' : 'text');
    const articles = def.format === 'ts-json' ? parseTagesschauList(raw) : parseFeed(raw as string, def.source);
    const fresh = { at: Date.now(), articles };
    try { await idbSet(cacheKey, fresh); } catch { /* quota */ }
    return { ...fresh, stale: false };
  } catch {
    // Offline, rate-limited, or the publisher changed something. Yesterday's
    // news is better than an error, and the UI says how old it is.
    return cached ? { ...cached, stale: true } : { articles: [], at: 0, stale: true };
  }
}

export interface Feed {
  articles: FeedArticle[];
  /** Oldest list fetch among the sources used — "updated 12 min ago". */
  at: number;
  /** Some source could not be refreshed and is showing its cache (or nothing). */
  stale: boolean;
}

/** The feed for a set of topics: every article from their sources, tagged with
 *  the topics it belongs to, deduplicated, newest first. */
export async function loadTopics(ids: TopicId[], force = false): Promise<Feed> {
  const topics = TOPICS.filter((t) => ids.includes(t.id));
  const keys = [...new Set(topics.flatMap((t) => t.feeds))];
  const lists = await Promise.all(keys.map(async (k) => ({ key: k, ...(await loadFeed(k, force)) })));

  const byId = new Map<string, FeedArticle>();
  // Near-duplicate titles across sources (the same agency story) collapse to one.
  const byTitle = new Map<string, string>();
  for (const { key, articles } of lists) {
    for (const a of articles) {
      const hay = [a.title, a.topline ?? '', a.teaser, ...a.tags].join(' ');
      const tIds = topicsFor(key, hay).filter((t) => ids.includes(t));
      if (!tIds.length) continue;
      const titleKey = a.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const existingId = byId.has(a.id) ? a.id : byTitle.get(titleKey);
      const existing = existingId ? byId.get(existingId) : undefined;
      if (existing) {
        existing.feeds = [...new Set([...existing.feeds, key])];
        existing.topics = [...new Set([...existing.topics, ...tIds])];
        continue;
      }
      byId.set(a.id, { ...a, feeds: [key], topics: tIds });
      byTitle.set(titleKey, a.id);
    }
  }
  const articles = [...byId.values()].sort((x, y) => y.published - x.published);
  const used = lists.filter((l) => l.articles.length);
  return {
    articles,
    at: used.length ? Math.min(...used.map((l) => l.at)) : 0,
    stale: lists.some((l) => l.stale),
  };
}

// ---- bodies ----------------------------------------------------------------------

interface CachedBody { at: number; paras: Para[] }

/** The article's body, from cache or the publisher. For a teaser-only source the
 *  teaser *is* the body, and the UI links out for the rest. */
export async function loadBody(a: Article): Promise<{ paras: Para[]; complete: boolean } | null> {
  if (!a.fullText || !a.detail) {
    return { paras: a.teaser ? [{ kind: 'p', text: a.teaser }] : [], complete: false };
  }
  const cacheKey = `news:body:${a.id}`;
  let cached: CachedBody | undefined;
  try { cached = await idbGet<CachedBody>(cacheKey); } catch { /* none */ }
  if (cached && Date.now() - cached.at < BODY_TTL) return { paras: cached.paras, complete: true };
  try {
    let paras: Para[] = [];
    if (a.source === 'tagesschau') paras = parseTagesschauDetail(await get(a.detail, 'json'));
    else if (a.source === 'srf') paras = parseSrfArticle(await get(a.detail, 'text') as string);
    else if (a.source === 'dw') paras = parseDwArticle(await get(a.detail, 'text') as string);
    if (!paras.length) throw new Error('empty body');
    try { await idbSet(cacheKey, { at: Date.now(), paras }); } catch { /* quota */ }
    return { paras, complete: true };
  } catch (e) {
    if (cached) return { paras: cached.paras, complete: true };
    if (e instanceof BudgetSpent) return null;
    // Fall back to what the feed gave us rather than a blank page.
    return a.teaser ? { paras: [{ kind: 'p', text: a.teaser }], complete: false } : null;
  }
}

/** A body only if it is already on the device — for ranking without spending requests. */
export async function cachedBody(id: string): Promise<Para[] | null> {
  try { return (await idbGet<CachedBody>(`news:body:${id}`))?.paras ?? null; } catch { return null; }
}

/** Plain text of an article, for the meter. */
export const bodyText = (paras: Para[]) => paras.map((p) => p.text).join('\n');

// ---- the open article ---------------------------------------------------------------
//
// An article is linkable (`#/read/a/<id>`), so it must be recoverable from its id
// alone after a reload. The feed remembers each one as it is opened.

export async function rememberArticle(a: Article): Promise<void> {
  try { await idbSet(`news:article:${a.id}`, a); } catch { /* quota — the link just won't survive a reload */ }
}
export async function recallArticle(id: string): Promise<Article | null> {
  try { return (await idbGet<Article>(`news:article:${id}`)) ?? null; } catch { return null; }
}
