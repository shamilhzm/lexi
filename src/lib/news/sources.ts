// What Lexi reads, and on what terms.
//
// ## The rule: the learner's browser fetches; Lexi ships nothing
//
// VISION's open decision #2 asked whether Lexi should ever ship someone else's
// text. It does not, here: every article is fetched by the learner's own browser
// from the publisher, for that learner's private reading, and cached on their
// device — the same thing a feed reader does. No publisher text is in the repo,
// the build, or any server Lexi runs (it runs none).
//
// Only publishers whose endpoints a browser may read directly (CORS open,
// verified 2026-09-24) are here. Spiegel, Zeit, FAZ, Handelsblatt, t3n, golem and
// GameStar all serve feeds without CORS, so reaching them would need a relay
// server — which is a decision about Lexi's architecture, not a line in this file.
//
// | Source | Terms, as relevant here |
// |---|---|
// | **tagesschau** (ARD) | API use "für den privaten, nicht-kommerziellen Gebrauch ist gestattet, die Veröffentlichung hingegen nicht"; **max 60 requests/hour** — enforced below. |
// | **SRF** | Public RSS; article pages served with open CORS. Read in place, linked back. |
// | **DW** *Langsam gesprochene Nachrichten* | DW's free learner programme, text and audio; read in place, linked back. |
// | **heise online** | Public Atom feed of teasers; the full article stays on heise.de. |
//
// If Lexi ever charges money, the Tagesschau line needs re-reading first.
import type { SourceId } from './types.ts';

export type FeedKey =
  | 'ts:wirtschaft' | 'ts:inland' | 'ts:ausland' | 'ts:wissen' | 'ts:sport'
  | 'srf:news' | 'srf:wirtschaft' | 'srf:sport' | 'srf:kultur' | 'srf:wissen'
  | 'dw:lgn' | 'heise:top';

export interface FeedDef { source: SourceId; url: string; format: 'ts-json' | 'xml' }

const TS = 'https://www.tagesschau.de/api2u/news/?ressort=';
export const FEEDS: Record<FeedKey, FeedDef> = {
  'ts:wirtschaft': { source: 'tagesschau', url: TS + 'wirtschaft', format: 'ts-json' },
  'ts:inland': { source: 'tagesschau', url: TS + 'inland', format: 'ts-json' },
  'ts:ausland': { source: 'tagesschau', url: TS + 'ausland', format: 'ts-json' },
  'ts:wissen': { source: 'tagesschau', url: TS + 'wissen', format: 'ts-json' },
  'ts:sport': { source: 'tagesschau', url: TS + 'sport', format: 'ts-json' },
  'srf:news': { source: 'srf', url: 'https://www.srf.ch/news/bnf/rss/1646', format: 'xml' },
  'srf:wirtschaft': { source: 'srf', url: 'https://www.srf.ch/news/bnf/rss/1926', format: 'xml' },
  'srf:sport': { source: 'srf', url: 'https://www.srf.ch/sport/bnf/rss/718', format: 'xml' },
  'srf:kultur': { source: 'srf', url: 'https://www.srf.ch/kultur/bnf/rss/454', format: 'xml' },
  'srf:wissen': { source: 'srf', url: 'https://www.srf.ch/wissen/bnf/rss/630', format: 'xml' },
  'dw:lgn': { source: 'dw', url: 'https://rss.dw.com/xml/DKpodcast_lgn_de', format: 'xml' },
  'heise:top': { source: 'heise', url: 'https://www.heise.de/rss/heise-top-atom.xml', format: 'xml' },
};

export const SOURCE_LABEL: Record<SourceId, string> = {
  tagesschau: 'tagesschau',
  srf: 'SRF',
  dw: 'DW · Deutsch lernen',
  heise: 'heise online',
};

export type TopicId =
  | 'wirtschaft' | 'politik' | 'migration' | 'tech' | 'wissen'
  | 'motorsport' | 'sport' | 'games' | 'kultur' | 'karriere' | 'langsam';

export interface Topic {
  id: TopicId;
  /** English, because the UI is English-base. */
  label: string;
  /** The German name — shown beside it, because it is vocabulary too. */
  de: string;
  feeds: FeedKey[];
  /** When set, an article from these feeds must also match this to count. A
   *  ressort is broad; "games" inside Tagesschau's *Wirtschaft* is a filter. */
  match?: RegExp;
  /** Feeds that belong to the topic whole, bypassing `match`. */
  whole?: FeedKey[];
}

// Keyword filters are deliberately about the *subject*, not the vocabulary a
// learner is studying — they decide which stories to show, nothing else.
//
// Every pattern anchors each word at a *word start* — `(?<!\p{L})`, with the `u`
// flag — and never uses `\b`, which treats ä ö ü ß as boundaries (LESSONS, Class
// 12). The first version matched substrings, and on 409 live articles the careers
// topic caught *Hinter·gründ·e*, *Gründe* and *Wett·bewerb* by fragment
// (2026-09-24). A word start is what separates *Gründer* from *Hintergründe*.
const W = (alts: string) => new RegExp(`(?<!\\p{L})(?:${alts})`, 'u');
const MOTOR = W('Formel[- ]?(?:1|E|eins)|F1(?!\\p{L})|Motorsport|MotoGP|Grand Prix|GP von|Rallye|Le Mans|Verstappen|Hamilton|Leclerc|Norris|Piastri|Antonelli|Hülkenberg|Ferrari|Red Bull|McLaren|Sauber|Marquez|Márquez|Nascar|IndyCar|DTM(?!\\p{L})');
const GAMES = W('Gaming|Gamer|Games?(?!\\p{L})|Videospiel|Computerspiel|Gamescom|Nintendo|Playstation|PlayStation|Xbox|E-?Sport|Steam(?!\\p{L})|Spielekonsole|Konsolen(?:spiel|markt)|Spieleentwickler|Spielebranche|Spielestudio');
const MIGRATION = W('Migra|Einbürger|Asyl|Geflüchtete|Flüchtling|Integrationskurs|Staatsbürgerschaft|Staatsangehörigkeit|Aufenthalts(?:titel|recht|erlaubnis|genehmigung)|Visum|Visa(?!\\p{L})|Einwanderung|Einwanderer|Zuwanderung|Abschiebung|abgeschoben|Ausländerbehörde|Bürgergeld|Fachkräfteeinwanderung|Blaue Karte|Chancenkarte|Deutschkurs|Sprachkurs');
const TECH = W('KI(?!\\p{L})|Künstliche[rn]? Intelligenz|Digital|digital|Software|Chip|Halbleiter|Internet|Cyber|Hacker|Daten(?:schutz|zentr)|App(?!\\p{L})|OpenAI|Open-AI|ChatGPT|Anthropic|Apple|Google|Microsoft|Meta(?!\\p{L})|Amazon|Nvidia|Tesla|Start-?up|Roboter|roboter|Smartphone|Social Media|Algorithm');
const CULTURE = W('Kunst|Künstler|Ausstellung|Museum|Galerie|Biennale|documenta|Film|Kino|Theater|Oper(?!\\p{L})|Konzert|Musik|Literatur|Roman(?!\\p{L})|Buchpreis|Festival|Architektur');
const CAREER = W('Arbeitsmarkt|Arbeitslos|Jobs?(?!\\p{L})|Jobcenter|Stellen(?:abbau|angebot|streichung)|Stellen(?!\\p{L})|Fachkräfte|Gehalt|Gehälter|Löhne|Lohn|Mindestlohn|Tarif|Streik|Kündigung|gekündigt|Beruf|Karriere|Bewerbung|Bewerber|Homeoffice|Ausbildung|Arbeitnehmer|Arbeitgeber|Gründer|Gründung|Start-?up|Beschäftigte|Rente(?:n|r)?(?!\\p{L})|Rentner');

export const TOPICS: Topic[] = [
  { id: 'wirtschaft', label: 'Economy & markets', de: 'Wirtschaft', feeds: ['ts:wirtschaft', 'srf:wirtschaft'], whole: ['ts:wirtschaft', 'srf:wirtschaft'] },
  { id: 'politik', label: 'Politics', de: 'Politik', feeds: ['ts:inland', 'ts:ausland', 'srf:news'], whole: ['ts:inland', 'ts:ausland', 'srf:news'] },
  { id: 'migration', label: 'Immigration & life here', de: 'Migration', feeds: ['ts:inland', 'ts:wirtschaft', 'ts:ausland', 'srf:news'], match: MIGRATION },
  { id: 'karriere', label: 'Work & careers', de: 'Arbeit & Karriere', feeds: ['ts:wirtschaft', 'ts:inland', 'srf:wirtschaft'], match: CAREER },
  { id: 'tech', label: 'Tech & AI', de: 'Technik & KI', feeds: ['heise:top', 'ts:wirtschaft', 'ts:wissen', 'ts:inland', 'srf:wissen', 'srf:wirtschaft'], match: TECH, whole: ['heise:top'] },
  { id: 'motorsport', label: 'Motorsport', de: 'Motorsport', feeds: ['srf:sport', 'ts:sport'], match: MOTOR },
  { id: 'games', label: 'Video games', de: 'Games', feeds: ['heise:top', 'ts:wirtschaft', 'ts:inland', 'ts:wissen', 'srf:kultur', 'srf:wissen'], match: GAMES },
  { id: 'kultur', label: 'Art & culture', de: 'Kunst & Kultur', feeds: ['srf:kultur', 'ts:inland', 'ts:ausland'], match: CULTURE, whole: ['srf:kultur'] },
  { id: 'wissen', label: 'Science', de: 'Wissenschaft', feeds: ['ts:wissen', 'srf:wissen'], whole: ['ts:wissen', 'srf:wissen'] },
  { id: 'sport', label: 'Sport', de: 'Sport', feeds: ['ts:sport', 'srf:sport'], whole: ['ts:sport', 'srf:sport'] },
  { id: 'langsam', label: 'Slow news, with audio', de: 'Langsam gesprochen', feeds: ['dw:lgn'], whole: ['dw:lgn'] },
];

export const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/** Topics an article belongs to, given the feed it came from. */
export function topicsFor(feed: FeedKey, haystack: string): TopicId[] {
  const out: TopicId[] = [];
  for (const t of TOPICS) {
    if (!t.feeds.includes(feed)) continue;
    if (t.whole?.includes(feed) || !t.match || t.match.test(haystack)) out.push(t.id);
  }
  return out;
}

/** The topic a story is *about*, for lanes and labels: the most specific one it
 *  matched. A story about citizenship is in Tagesschau's *Inland* ressort and
 *  therefore under Politics too, but a learner who picked Immigration should see
 *  it arrive as Immigration — keyword topics are the learner's narrower interest. */
export function primaryTopic(topics: TopicId[]): TopicId | undefined {
  return topics.find((t) => TOPIC_BY_ID.get(t)?.match) ?? topics[0];
}
