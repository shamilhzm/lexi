// Curated line-art illustrations — a bespoke, offline replacement for the emoji
// layer. Each concept is hand-drawn SVG (24×24, stroke = currentColor) so it
// themes with the accent colour and scales crisply. A word resolves to a concrete
// concept where one exists; otherwise it falls back to its semantic group's
// emblem, so every card shows an illustration (no emoji, ever).
import { SECTOR_GROUP } from '../data/index.ts';

export type Concept = keyof typeof ICON;

// Inner SVG markup per concept. fill:none / round caps are applied by the wrapper.
export const ICON = {
  house: '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19"/>',
  cloud: '<path d="M7.5 18h9a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1.2A3.9 3.9 0 0 0 7.5 18Z"/>',
  rain: '<path d="M7.5 14h8.7a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1.1A3.6 3.6 0 0 0 7.5 14Z"/><path d="M8.5 17l-1 2.5M12 17l-1 2.5M15.5 17l-1 2.5"/>',
  tree: '<path d="M12 21v-6"/><path d="M12 3 6.5 13h11L12 3Z"/><path d="M12 8.5 8.5 15h7L12 8.5Z"/>',
  apple: '<path d="M12 8c-1.4-2.2-4.6-2.6-6.2-.4-1.6 2.3-.6 6.3 1.4 8.6 1 1.2 2.2 2.2 3.4 2.2 1.6 0 2.2-.9 3.8-.9s2.2.9 3.8-.9c1.2-1.4 2-3.8 1.6-5.8-.5-2.6-3.4-4-6-2.8"/><path d="M12 8V5"/><path d="M12 5c1-2 3-2.5 4-2-.2 1.6-1.6 2.6-4 2Z"/>',
  cup: '<path d="M5 8.5h11V14a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M16 9.5h2.2a2.3 2.3 0 0 1 0 5.5H16"/><path d="M8 3.5c-.6 1 .6 1.8 0 2.8M12 3.5c-.6 1 .6 1.8 0 2.8"/>',
  book: '<path d="M5 5.5A2 2 0 0 1 7 4h11v14H7a2 2 0 0 0-2 2Z"/><path d="M5 5.5V20"/><path d="M9 8h6M9 11h6"/>',
  car: '<path d="M3 15v-2.5l2-5A2 2 0 0 1 6.8 6h8.4a2 2 0 0 1 1.8 1.5l2 5V15"/><path d="M3 15h16"/><circle cx="7" cy="15.5" r="1.8"/><circle cx="15" cy="15.5" r="1.8"/><path d="M6 12.5h10"/>',
  key: '<circle cx="8" cy="8" r="3.6"/><path d="M10.6 10.6 20 20"/><path d="M17 17l1.8-1.8M19 19l1.6-1.6"/>',
  heart: '<path d="M12 20C6.5 15.4 4 12.3 4 9.2A4.2 4.2 0 0 1 12 6.8 4.2 4.2 0 0 1 20 9.2C20 12.3 17.5 15.4 12 20Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  fish: '<path d="M17 12c-3.5 4.5-9.5 4.5-13 0 3.5-4.5 9.5-4.5 13 0Z"/><path d="M17 12l4-2.5v5Z"/><circle cx="7.5" cy="11" r=".9"/>',
  star: '<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.3 6.9 19l1-5.7-4.1-4 5.7-.8Z"/>',
  envelope: '<rect x="3" y="6" width="18" height="12" rx="1.6"/><path d="M3.5 7 12 13l8.5-6"/>',
  flower: '<circle cx="12" cy="9" r="2.2"/><path d="M12 6.8c-1-2.2 1-4 2.8-2.8M12 6.8c1-2.2-1-4-2.8-2.8M9.8 9c-2.2-1-4 1-2.8 2.8M14.2 9c2.2-1 4 1 2.8 2.8"/><path d="M12 11.5V20"/><path d="M12 16c-2 0-3.5-1.2-4-3 2-.3 3.5.8 4 3Z"/>',
  phone: '<rect x="6.5" y="3" width="11" height="18" rx="2.2"/><path d="M10.5 18h3"/>',
  gift: '<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.5 13v7h13v-7"/><path d="M12 9v11"/><path d="M12 9C11 6 8 5.5 7.5 7.5 7.2 9 9.5 9 12 9Zm0 0c1-3 4-3.5 4.5-1.5.3 1.5-2 1.5-4.5 1.5Z"/>',
  mountain: '<path d="M3 19 10 7l4 6 2.5-3L21 19Z"/><path d="M10 7l2 3-1.5 2"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17"/>',
  dog: '<path d="M7 7 5.5 5C4 7.5 4.2 9.5 5.2 11"/><path d="M17 7 18.5 5C20 7.5 19.8 9.5 18.8 11"/><path d="M6 10c0 4.5 2.5 7 6 7s6-2.5 6-7a6 6 0 0 0-12 0Z"/><circle cx="9.7" cy="11" r=".8"/><circle cx="14.3" cy="11" r=".8"/><path d="M12 12.5v1.6"/><path d="M10.6 14.6h2.8"/>',
  cat: '<path d="M6.5 6 5 4l3.5 2.6"/><path d="M17.5 6 19 4l-3.5 2.6"/><path d="M6 9.5c0 4.5 2.5 7 6 7s6-2.5 6-7a6 6 0 0 0-12 0Z"/><circle cx="9.7" cy="11" r=".7"/><circle cx="14.3" cy="11" r=".7"/><path d="M12 12.6l-1 1.1h2Z"/><path d="M4.5 12h2.8M16.7 12h2.8M4.5 13.8h2.8M16.7 13.8h2.8"/>',
  bird: '<path d="M13 7.5a2.6 2.6 0 0 0-2.6 2.6c-3.2.2-5.9 2.3-5.9 5.4h8.5a5.5 5.5 0 0 0 5.5-5.5V8.2l2.2-.9-2.2-1a2.6 2.6 0 0 0-3.5 1Z"/><circle cx="14.6" cy="8.4" r=".7"/><path d="M8 15.5v3M11 15.5v3"/>',
  bread: '<path d="M4.5 12.5a3.5 3.5 0 0 1 1.8-3 5.5 5.5 0 0 1 11 .6c1.6.3 1.4 3 .2 3l-.5 5H5.5Z"/><path d="M9 10.5c0 2 0 4-.5 8M13 10.8c0 2 0 4 .3 7.7"/>',
  cheese: '<path d="M4 15 14 8l6 3.5v3.5H4Z"/><path d="M4 15v2.5h16V15"/><circle cx="9" cy="13.5" r=".9"/><circle cx="14" cy="12.5" r=".8"/><circle cx="12.5" cy="15" r=".7"/>',
  wine: '<path d="M8 4h8l-.5 5a3.5 3.5 0 0 1-7 0Z"/><path d="M12 12.5V19"/><path d="M8.5 19.5h7"/>',
  water: '<path d="M12 3.5c3.5 4.5 6 7.5 6 10.5a6 6 0 0 1-12 0c0-3 2.5-6 6-10.5Z"/>',
  egg: '<path d="M12 3.5c3.2 0 6 5 6 9a6 6 0 0 1-12 0c0-4 2.8-9 6-9Z"/>',
  cake: '<path d="M4.5 13.5c0-1.6 1.3-3 3-3h9c1.7 0 3 1.4 3 3V19H4.5Z"/><path d="M4.5 15.5c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0"/><path d="M12 10.5V7"/><circle cx="12" cy="5.5" r="1"/>',
  carrot: '<path d="M8 12 15.5 19.5C13 20.5 8 20 6.5 18.5S5.5 14 6.5 11.5Z"/><path d="M9 11 12 8M11 9.5 13.5 6M13 11 16 9"/>',
  head: '<path d="M8.5 20v-3c-2-1-3.5-3.2-3.5-5.8A7 7 0 0 1 19 11c0 2-1 3-2 3.5v2a1.5 1.5 0 0 1-1.5 1.5H14v2"/>',
  hand: '<path d="M8 11V6.5a1.3 1.3 0 0 1 2.6 0V10m0 0V5a1.3 1.3 0 0 1 2.6 0v5m0 0V6.5a1.3 1.3 0 0 1 2.6 0V13c0 4-2 6.5-5 6.5-2 0-3-1-5-4l-1.5-2.3a1.3 1.3 0 0 1 2-1.6L8 12.5"/>',
  eye: '<path d="M3.5 12S7 6.5 12 6.5 20.5 12 20.5 12 17 17.5 12 17.5 3.5 12 3.5 12Z"/><circle cx="12" cy="12" r="2.6"/>',
  tooth: '<path d="M7 4.5C5 4.5 4 6.5 4.5 9c.4 2 .8 2.5 1.2 5 .3 2 .6 5.5 2 5.5 1.6 0 1.2-4 2.6-4h1.4c1.4 0 1 4 2.6 4 1.4 0 1.7-3.5 2-5.5.4-2.5.8-3 1.2-5 .5-2.5-.5-4.5-2.5-4.5-1.8 0-2.3 1-4 1s-2.2-1-4-1Z"/>',
  bus: '<rect x="4" y="5" width="16" height="12" rx="2"/><path d="M4 12h16M9 5v7M15 5v7"/><circle cx="8" cy="19" r="1.4"/><circle cx="16" cy="19" r="1.4"/>',
  train: '<rect x="5" y="4" width="14" height="12" rx="2.5"/><path d="M5 11h14"/><circle cx="9" cy="8" r="1"/><circle cx="15" cy="8" r="1"/><path d="M8 16 6 20M16 16l2 4M9 19h6"/>',
  bicycle: '<circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M6.5 15.5 10 8h5"/><path d="M10 8 13.5 15.5H17.5M9 8h3"/>',
  plane: '<path d="M10 5.5c0-1 .7-2 2-2s2 1 2 2v4l6 3.5V16l-6-2v3.5l2 1.5V21l-4-1-4 1v-2l2-1.5V14l-6 2v-3l6-3.5Z"/>',
  ship: '<path d="M4 14h16l-2 5c-.5 1-1 1-2 .5-1.5-.7-2.5-.7-4 0s-2.5.7-4 0c-1-.5-1.5-.5-2 .5"/><path d="M6 14V9h9l3 5"/><path d="M11 9V5h1.5"/>',
  suitcase: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2"/><path d="M9 8v11M15 8v11"/>',
  shirt: '<path d="M8.5 4 12 6.5 15.5 4l4.5 3-2.5 3-1.5-1v9h-9v-9l-1.5 1L4 7Z"/>',
  shoe: '<path d="M3.5 16v-4l3-1 2 2h5c3 0 4.5 1.5 6.5 2.5.8.4.5 1.5-.5 1.5H3.5Z"/><path d="M9.5 13l1.5 2M11.5 13l1.5 2"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9v6M10.5 10.5h2.2a1.3 1.3 0 0 1 0 2.6h-2M10.5 13.1h2.5"/>',
  briefcase: '<rect x="3.5" y="8" width="17" height="11" rx="2"/><path d="M8.5 8V6.5A1.5 1.5 0 0 1 10 5h4a1.5 1.5 0 0 1 1.5 1.5V8"/><path d="M3.5 13h17"/>',
  computer: '<rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M2 19h20M9.5 16l-.5 3M14.5 16l.5 3"/>',
  pencil: '<path d="M5 19l1-4L16 5l3 3L9 18Z"/><path d="M14 7l3 3"/><path d="M5 19l3-1"/>',
  music: '<path d="M9 17.5V7l9-2v8"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="15.5" cy="15.5" r="2.5"/>',
  fire: '<path d="M12 3.5c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.4-2 1-2.8.2 1 .8 1.8 1.6 1.8.6 0 1-.5 1-1.2 0-2-.4-4 .4-5.6Z"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5 9 8l3 4 3-4Z"/><path d="M9 8 3.7 9.5M15 8l5.3 1.5M12 16l-4 4.5M12 16l4 4.5M9 12l-5 1M15 12l5 1"/>',
  umbrella: '<path d="M12 4a8 8 0 0 1 8 7c-2-1-3-1-4 0-1-1-2-1-4 0-2-1-3-1-4 0-1-1-2-1-4 0a8 8 0 0 1 8-7Z"/><path d="M12 11v7a2 2 0 0 0 4 0"/>',
  city: '<path d="M4 20V10l4-2v12M8 20V6l5-2.5V20M13 20v-9l4 2v7"/><path d="M4 20h16"/>',
  leaf: '<path d="M5 19C4 12 8 5 19 5c1 10-5 15-11 14-2-.3-3-2-3-4 3-1 6-3.5 8-7"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 9.5h16M8.5 4v3M15.5 4v3"/><path d="M8 13h2M14 13h2M8 16h2M14 16h2"/>',
  paw: '<circle cx="12" cy="15" r="3.2"/><circle cx="6.5" cy="12" r="1.7"/><circle cx="17.5" cy="12" r="1.7"/><circle cx="9" cy="7.5" r="1.7"/><circle cx="15" cy="7.5" r="1.7"/>',
} as const;

// German head-word → concept. German compounds head-last, so an ends-with match is
// linguistically sound (der Apfelbaum → baum → tree). Whole-word wins first.
const WORD_CONCEPT: Record<string, Concept> = {
  hund: 'dog', welpe: 'dog', katze: 'cat', kätzchen: 'cat', vogel: 'bird', fisch: 'fish',
  pferd: 'paw', kuh: 'paw', schwein: 'paw', schaf: 'paw', maus: 'paw', ratte: 'paw', bär: 'paw',
  löwe: 'paw', tiger: 'paw', hase: 'paw', kaninchen: 'paw', wolf: 'paw', fuchs: 'paw', affe: 'paw', tier: 'paw', haustier: 'paw',
  apfel: 'apple', obst: 'apple', brot: 'bread', brötchen: 'bread', käse: 'cheese',
  kaffee: 'cup', tee: 'cup', tasse: 'cup', becher: 'cup', wein: 'wine', wasser: 'water',
  gemüse: 'carrot', karotte: 'carrot', möhre: 'carrot', salat: 'leaf', kuchen: 'cake', torte: 'cake', ei: 'egg',
  kopf: 'head', gesicht: 'head', körper: 'head', hand: 'hand', finger: 'hand', auge: 'eye', brille: 'eye',
  herz: 'heart', liebe: 'heart', zahn: 'tooth', arzt: 'heart', ärztin: 'heart', medikament: 'heart',
  auto: 'car', wagen: 'car', straße: 'car', bus: 'bus', zug: 'train', bahn: 'train', bahnhof: 'train',
  rad: 'bicycle', fahrrad: 'bicycle', flugzeug: 'plane', flug: 'plane', flughafen: 'plane', schiff: 'ship', boot: 'ship',
  reise: 'suitcase', koffer: 'suitcase', gepäck: 'suitcase', urlaub: 'suitcase',
  sonne: 'sun', licht: 'sun', tag: 'sun', regen: 'rain',
  schnee: 'cloud', wolke: 'cloud', wind: 'cloud', wetter: 'cloud', sturm: 'cloud', nebel: 'cloud',
  baum: 'tree', wald: 'tree', garten: 'tree', blume: 'flower', rose: 'flower', berg: 'mountain', gebirge: 'mountain',
  meer: 'water', see: 'water', ozean: 'water', natur: 'leaf', blatt: 'leaf', pflanze: 'leaf', umwelt: 'leaf',
  haus: 'house', wohnung: 'house', zuhause: 'house', zimmer: 'house', gebäude: 'house',
  hemd: 'shirt', kleid: 'shirt', rock: 'shirt', hose: 'shirt', jacke: 'shirt', mantel: 'shirt',
  pullover: 'shirt', kleidung: 'shirt', mode: 'shirt', bluse: 'shirt', schuh: 'shoe', stiefel: 'shoe',
  geld: 'coin', konto: 'coin', münze: 'coin', euro: 'coin', preis: 'coin',
  büro: 'briefcase', arbeit: 'briefcase', job: 'briefcase', firma: 'briefcase', beruf: 'briefcase', chef: 'briefcase', kollege: 'briefcase',
  computer: 'computer', laptop: 'computer', rechner: 'computer', bildschirm: 'computer',
  handy: 'phone', telefon: 'phone', smartphone: 'phone', internet: 'globe', welt: 'globe', land: 'globe', erde: 'globe',
  uhr: 'clock', zeit: 'clock', jahr: 'calendar', woche: 'calendar', monat: 'calendar', datum: 'calendar', kalender: 'calendar', termin: 'calendar',
  buch: 'book', schule: 'book', kurs: 'book', universität: 'book', student: 'book', lehrer: 'book', wörterbuch: 'book', heft: 'book',
  wort: 'pencil', prüfung: 'pencil', text: 'pencil', sprache: 'pencil', grammatik: 'pencil',
  musik: 'music', lied: 'music', konzert: 'music', sport: 'ball', spiel: 'ball', fußball: 'ball', ball: 'ball', tor: 'ball',
  feuer: 'fire', brand: 'fire', regenschirm: 'umbrella', schirm: 'umbrella', stadt: 'city', dorf: 'city',
  brief: 'envelope', post: 'envelope', nachricht: 'envelope', paket: 'gift', geschenk: 'gift', schlüssel: 'key',
};

// Semantic group → emblem, so a word with no concrete concept still gets a picture.
const GROUP_EMBLEM: Record<string, Concept> = {
  'Food & Drink': 'bread',
  'Nature & Environment': 'leaf',
  'Travel & Transport': 'plane',
  'Home & Daily Life': 'house',
  'Health & Body': 'heart',
  'Tech & Science': 'computer',
  'Work & Economy': 'briefcase',
  'Arts, Media & Leisure': 'music',
  'Society & Politics': 'city',
  'Education & Language': 'book',
  'Feelings & Relationships': 'heart',
  'Shopping & Clothing': 'shirt',
  'Core Vocabulary': 'star',
  'Language Building Blocks': 'pencil',
  'Miscellaneous': 'star',
  'Grammar': 'pencil',
};

const WORD_KEYS = Object.keys(WORD_CONCEPT).sort((a, b) => b.length - a.length);
const stripArticle = (t: string) => t.toLowerCase().replace(/^(der|die|das)\s+/, '').trim();

export function conceptForSector(name: string): Concept {
  const group = SECTOR_GROUP.get(name) ?? name;
  return GROUP_EMBLEM[group] ?? GROUP_EMBLEM[name] ?? 'star';
}

/** Resolve a word to its illustration: exact/ends-with concept, else group emblem. */
export function conceptForWord(w: { term: string; field?: string }): Concept {
  const t = stripArticle(w.term);
  if (WORD_CONCEPT[t]) return WORD_CONCEPT[t];
  for (const k of WORD_KEYS) if (t.endsWith(k)) return WORD_CONCEPT[k];
  return w.field ? conceptForSector(w.field) : 'star';
}

/** Raw inner markup for a concept — for callers drawing inside an existing <svg>. */
export const conceptPaths = (c: Concept): string => ICON[c];

interface Props {
  concept?: Concept;
  word?: { term: string; field?: string };
  sector?: string;
  size?: number;
  className?: string;
  title?: string;
}

/** Themeable line-art. Colour follows `currentColor` (set it via text-* class). */
export function Illustration({ concept, word, sector, size = 40, className, title }: Props) {
  const c: Concept = concept ?? (word ? conceptForWord(word) : sector ? conceptForSector(sector) : 'star');
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      className={className} role="img" aria-label={title ?? c}
      dangerouslySetInnerHTML={{ __html: ICON[c] }}
    />
  );
}
