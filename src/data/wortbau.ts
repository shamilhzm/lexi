// Wortbau: words made of words, as a feed slot *(2026-11-27)*.
//
// German makes a noun by setting two words side by side, and the parts are often
// more vivid than the whole: a glove is a hand-shoe, a wedding is a high time,
// breakfast is an early piece. The slot shows the two parts and their senses, the
// learner guesses, and one press puts the parts together. BACKLOG filed this as
// *guess-before-reveal on compounds*: open the gap before closing it. A guess made
// before the answer helps the answer stick even when the guess is wrong.
//
// **Hand-picked, and every row is checked against the cards** (wortbau.test.ts),
// the way the about page's compounds are. Each segment spells the whole, each part is
// a card, each segment is a form of its part, each sense is one of that part's own
// glosses, and the last part's article is the whole's. An automatic splitter was
// measured first (2026-11-27): of 60 readings sampled from 1,105 it produced, about
// one in six was wrong (*Angelpunkt* as fishing rod + dot, *Netzwerk* as net + plant).
// A wrong reading is worse than none, so the list is chosen and the facts are checked.
//
// It never grades. The guess is not recorded anywhere, and the slot carries no
// `data-word`. The one instruction it takes is the bookmark.
import type { CEFR, Word } from '../types.ts';
import type { Status } from '../store.ts';
import { seededOrder } from './jetzt.ts';

/** [segment as written in the whole, the part's card, the sense used]. */
export type WortbauPart = readonly [segment: string, term: string, sense: string];
export interface Wortbau { whole: string; parts: readonly [WortbauPart, WortbauPart] }

const W = (whole: string, a: WortbauPart, b: WortbauPart): Wortbau => ({ whole, parts: [a, b] });

/** Ordered by family, so a reader can see the patterns: one head (-zeug, -stoff,
 *  -haus, -bahn) or one first part (Hand-, Fahr-, Kranken-) making many words. */
export const WORTBAU: readonly Wortbau[] = [
  // -zeug: stuff. Five things German names by what the stuff is for.
  W('das Flugzeug', ['Flug', 'der Flug', 'flight'], ['zeug', 'das Zeug', 'stuff']),
  W('das Spielzeug', ['Spiel', 'spielen', 'play'], ['zeug', 'das Zeug', 'stuff']),
  W('das Werkzeug', ['Werk', 'das Werk', 'works'], ['zeug', 'das Zeug', 'stuff']),
  W('das Fahrzeug', ['Fahr', 'fahren', 'drive'], ['zeug', 'das Zeug', 'stuff']),
  W('das Feuerzeug', ['Feuer', 'das Feuer', 'fire'], ['zeug', 'das Zeug', 'stuff']),
  // -stoff: material. Chemistry in plain words.
  W('der Sauerstoff', ['Sauer', 'sauer', 'sour'], ['stoff', 'der Stoff', 'material']),
  W('der Wasserstoff', ['Wasser', 'das Wasser', 'water'], ['stoff', 'der Stoff', 'material']),
  W('der Kunststoff', ['Kunst', 'die Kunst', 'art'], ['stoff', 'der Stoff', 'material']),
  W('der Brennstoff', ['Brenn', 'brennen', 'burn'], ['stoff', 'der Stoff', 'material']),
  W('der Treibstoff', ['Treib', 'treiben', 'drive'], ['stoff', 'der Stoff', 'material']),
  // Hand-
  W('der Handschuh', ['Hand', 'die Hand', 'hand'], ['schuh', 'der Schuh', 'shoe']),
  W('das Handtuch', ['Hand', 'die Hand', 'hand'], ['tuch', 'das Tuch', 'cloth']),
  W('das Handwerk', ['Hand', 'die Hand', 'hand'], ['werk', 'das Werk', 'works']),
  // Kranken-, and -haus
  W('das Krankenhaus', ['Kranken', 'krank', 'sick'], ['haus', 'das Haus', 'house']),
  W('der Krankenwagen', ['Kranken', 'krank', 'sick'], ['wagen', 'der Wagen', 'car']),
  W('die Krankenschwester', ['Kranken', 'krank', 'sick'], ['schwester', 'die Schwester', 'sister']),
  W('das Kaufhaus', ['Kauf', 'kaufen', 'buy'], ['haus', 'das Haus', 'house']),
  W('das Rathaus', ['Rat', 'der Rat', 'counsel'], ['haus', 'das Haus', 'house']),
  W('das Treppenhaus', ['Treppen', 'die Treppe', 'stairs'], ['haus', 'das Haus', 'house']),
  // Haus-
  W('die Hausaufgabe', ['Haus', 'das Haus', 'house'], ['aufgabe', 'die Aufgabe', 'task']),
  W('der Hausmeister', ['Haus', 'das Haus', 'house'], ['meister', 'der Meister', 'master']),
  W('das Haustier', ['Haus', 'das Haus', 'house'], ['tier', 'das Tier', 'animal']),
  W('der Bürgermeister', ['Bürger', 'der Bürger', 'citizen'], ['meister', 'der Meister', 'master']),
  // Fahr-
  W('das Fahrrad', ['Fahr', 'fahren', 'drive'], ['rad', 'das Rad', 'wheel']),
  W('der Fahrstuhl', ['Fahr', 'fahren', 'drive'], ['stuhl', 'der Stuhl', 'chair']),
  W('die Fahrkarte', ['Fahr', 'fahren', 'drive'], ['karte', 'die Karte', 'card']),
  W('der Fahrplan', ['Fahr', 'fahren', 'drive'], ['plan', 'der Plan', 'plan']),
  // -bahn, and where trains and planes stop
  W('die Autobahn', ['Auto', 'das Auto', 'car'], ['bahn', 'die Bahn', 'track']),
  W('die Straßenbahn', ['Straßen', 'die Straße', 'street'], ['bahn', 'die Bahn', 'railway']),
  W('die Seilbahn', ['Seil', 'das Seil', 'rope'], ['bahn', 'die Bahn', 'railway']),
  W('der Bahnhof', ['Bahn', 'die Bahn', 'railway'], ['hof', 'der Hof', 'courtyard']),
  W('der Flughafen', ['Flug', 'der Flug', 'flight'], ['hafen', 'der Hafen', 'harbour']),
  // Hoch-, and time
  W('die Hochzeit', ['Hoch', 'hoch', 'high'], ['zeit', 'die Zeit', 'time']),
  W('die Hochschule', ['Hoch', 'hoch', 'high'], ['schule', 'die Schule', 'school']),
  W('die Jahreszeit', ['Jahres', 'das Jahr', 'year'], ['zeit', 'die Zeit', 'time']),
  W('die Zeitschrift', ['Zeit', 'die Zeit', 'time'], ['schrift', 'die Schrift', 'writing']),
  W('der Zeitgeist', ['Zeit', 'die Zeit', 'time'], ['geist', 'der Geist', 'spirit']),
  W('die Langeweile', ['Lange', 'lang', 'long'], ['weile', 'die Weile', 'while']),
  W('der Augenblick', ['Augen', 'das Auge', 'eye'], ['blick', 'der Blick', 'look']),
  W('der Stundenplan', ['Stunden', 'die Stunde', 'hour'], ['plan', 'der Plan', 'plan']),
  // Meals
  W('das Frühstück', ['Früh', 'früh', 'early'], ['stück', 'das Stück', 'piece']),
  W('das Mittagessen', ['Mittag', 'der Mittag', 'midday'], ['essen', 'das Essen', 'food']),
  W('das Abendessen', ['Abend', 'der Abend', 'evening'], ['essen', 'das Essen', 'food']),
  W('der Nachtisch', ['Nach', 'nach', 'after'], ['tisch', 'der Tisch', 'table']),
  // At home
  W('der Kühlschrank', ['Kühl', 'kühl', 'cool'], ['schrank', 'der Schrank', 'cupboard']),
  W('der Kleiderschrank', ['Kleider', 'das Kleid', 'dress'], ['schrank', 'der Schrank', 'cupboard']),
  W('der Schreibtisch', ['Schreib', 'schreiben', 'write'], ['tisch', 'der Tisch', 'table']),
  W('die Spülmaschine', ['Spül', 'spülen', 'rinse'], ['maschine', 'die Maschine', 'machine']),
  W('die Glühbirne', ['Glüh', 'glühen', 'glow'], ['birne', 'die Birne', 'pear']),
  W('die Fernbedienung', ['Fern', 'fern', 'distant'], ['bedienung', 'die Bedienung', 'operation']),
  W('das Schlafzimmer', ['Schlaf', 'der Schlaf', 'sleep'], ['zimmer', 'das Zimmer', 'room']),
  W('das Wohnzimmer', ['Wohn', 'wohnen', 'live'], ['zimmer', 'das Zimmer', 'room']),
  W('der Schlafanzug', ['Schlaf', 'der Schlaf', 'sleep'], ['anzug', 'der Anzug', 'suit']),
  W('der Dachboden', ['Dach', 'das Dach', 'roof'], ['boden', 'der Boden', 'floor']),
  W('das Erdgeschoss', ['Erd', 'die Erde', 'earth'], ['geschoss', 'das Geschoss', 'floor']),
  W('die Fensterbank', ['Fenster', 'das Fenster', 'window'], ['bank', 'die Bank', 'bench']),
  W('das Balkonkraftwerk', ['Balkon', 'der Balkon', 'balcony'], ['kraftwerk', 'das Kraftwerk', 'power station']),
  // Things you carry
  W('der Regenschirm', ['Regen', 'der Regen', 'rain'], ['schirm', 'der Schirm', 'screen']),
  W('die Brieftasche', ['Brief', 'der Brief', 'letter'], ['tasche', 'die Tasche', 'pocket']),
  W('die Taschenlampe', ['Taschen', 'die Tasche', 'pocket'], ['lampe', 'die Lampe', 'lamp']),
  W('der Kopfhörer', ['Kopf', 'der Kopf', 'head'], ['hörer', 'der Hörer', 'listener']),
  W('der Führerschein', ['Führer', 'der Führer', 'driver'], ['schein', 'der Schein', 'certificate']),
  W('der Geldautomat', ['Geld', 'das Geld', 'money'], ['automat', 'der Automat', 'machine']),
  // People and places
  W('der Zahnarzt', ['Zahn', 'der Zahn', 'tooth'], ['arzt', 'der Arzt', 'doctor']),
  W('der Tierarzt', ['Tier', 'das Tier', 'animal'], ['arzt', 'der Arzt', 'doctor']),
  W('die Großmutter', ['Groß', 'groß', 'big'], ['mutter', 'die Mutter', 'mother']),
  W('der Kindergarten', ['Kinder', 'das Kind', 'child'], ['garten', 'der Garten', 'garden']),
  W('die Erdbeere', ['Erd', 'die Erde', 'earth'], ['beere', 'die Beere', 'berry']),
  // Words about words
  W('das Wörterbuch', ['Wörter', 'das Wort', 'word'], ['buch', 'das Buch', 'book']),
  W('der Wortschatz', ['Wort', 'das Wort', 'word'], ['schatz', 'der Schatz', 'treasure']),
  W('die Muttersprache', ['Mutter', 'die Mutter', 'mother'], ['sprache', 'die Sprache', 'language']),
];

// ── How a segment is a form of its part ─────────────────────────────────────────

/** The linking letters German puts between the parts (*Geburt-s-tag*, *Sonne-n-schein*). */
export const FUGEN = ['s', 'es', 'n', 'en', 'er', 'e', 'ns'] as const;

export const bareTerm = (term: string) => term.replace(/^(der|die|das)\s+/, '').replace(/^sich\s+/, '').trim();

/** What happened to the part on its way into the whole, for the one line the slot
 *  says about it. `null` means the segment is not a form of the card at all. */
export type Join =
  | { kind: 'same' }
  | { kind: 'glue'; glue: string }
  | { kind: 'elided' }
  | { kind: 'plural' }
  | { kind: 'stem' };

export function joinOf(segment: string, card: Pick<Word, 'term' | 'pos' | 'plural'>): Join | null {
  const b = bareTerm(card.term).toLowerCase();
  const s = segment.toLowerCase();
  if (s === b) return { kind: 'same' };
  const glued = (gs: readonly string[]): Join | null => {
    for (const g of gs) if (s === b + g) return { kind: 'glue', glue: segment.slice(b.length) };
    return null;
  };
  if (card.pos === 'adjective') return glued(FUGEN);
  if (card.pos === 'noun') {
    // Order matters where a linking letter spells the plural too. *Straßen*bahn is
    // one street with an *n* between, so -s, -es, -n, -en and -ns are glue first.
    // *Kinder*garten and *Kleider*schrank are read as plurals before -er and -e
    // are tried, because a learner already knows *Kinder* and *Kleider* as plurals.
    const plural = card.plural?.startsWith('die ') ? bareTerm(card.plural).toLowerCase() : null;
    return glued(['s', 'es', 'n', 'en', 'ns'])
      ?? (plural && s === plural ? { kind: 'plural' } : null)
      ?? glued(['er', 'e'])
      ?? (b.endsWith('e') && s === b.slice(0, -1) ? { kind: 'elided' } : null);
  }
  if (card.pos === 'verb') {
    const stem = b.endsWith('en') ? b.slice(0, -2) : b.endsWith('n') ? b.slice(0, -1) : null;
    if (stem && s === stem) return { kind: 'stem' };
  }
  return null;
}

/** A gloss's senses as a reader would list them, the about page's rule: "to glow" → "glow". */
export const sensesOf = (en: string) => en.split(/[,;/]/).map((s) => s.trim().replace(/^to /, '')).filter(Boolean);

/** The whole's meaning, short enough to close an equation: its first sense, unless
 *  that is the German word again (*zeitgeist*), when the next one says more. */
export function meaningOf(w: Pick<Word, 'term' | 'en'>): string {
  const alts = w.en.split(';')[0].split(',').map((s) => s.trim()).filter(Boolean);
  const own = bareTerm(w.term).toLowerCase();
  return alts.find((a) => a.toLowerCase() !== own) ?? alts[0] ?? w.en;
}

// ── Resolved against the lexicon ────────────────────────────────────────────────

export interface Built {
  item: Wortbau;
  whole: Word;
  parts: readonly [Word, Word];
  joins: readonly [Join, Join];
}

/** Every row whose cards are all in the lexicon and whose segments are forms of
 *  them. The test holds the shipped corpus to all of them; at runtime a row that
 *  stopped resolving (a card renamed) is dropped rather than shown wrong. */
export function resolveWortbau(card: (term: string) => Word | undefined, rows: readonly Wortbau[] = WORTBAU): Built[] {
  const out: Built[] = [];
  for (const item of rows) {
    const whole = card(item.whole);
    const a = card(item.parts[0][1]), b = card(item.parts[1][1]);
    if (!whole || !a || !b) continue;
    const ja = joinOf(item.parts[0][0], a), jb = joinOf(item.parts[1][0], b);
    if (!ja || !jb) continue;
    out.push({ item, whole, parts: [a, b], joins: [ja, jb] });
  }
  return out;
}

/** The literal reading: "hand + shoe". */
export const readingOf = (b: Built) => `${b.item.parts[0][2]} + ${b.item.parts[1][2]}`;

/**
 * The order a learner meets them in. A compound they already know has no gap left,
 * so it is out. Then the ones whose parts they have met, because *you know both
 * halves* is the moment this slot exists for; then the ones inside their level
 * filter, easier first; and within that a seeded order, so the slot holds still all
 * day and changes tomorrow.
 */
export function rankWortbau(all: Built[], o: { status: (id: string) => Status; inScope: (l: CEFR) => boolean; seed: string; levels: readonly CEFR[] }): Built[] {
  const met = (b: Built) => b.parts.filter((p) => o.status(p.id) !== 'new').length;
  const lv = (b: Built) => o.levels.indexOf(b.whole.level);
  return seededOrder(all.filter((b) => o.status(b.whole.id) !== 'known'), o.seed)
    .sort((x, y) => met(y) - met(x)
      || Number(o.inScope(y.whole.level)) - Number(o.inScope(x.whole.level))
      || lv(x) - lv(y));
}

/** The rows that share one part with this one, and which part: this one's last
 *  part if others have it, in either place (after *Jahreszeit*: *Hochzeit*,
 *  *Zeitschrift*, *Zeitgeist*), else its first part (after *Flughafen*: *Flugzeug*).
 *  Never a mix, so "more with *Zeit*" lists only words with *Zeit* in them. */
export function siblingsOf(b: Built, all: Built[], n = 3): { via: Word; list: Built[] } | null {
  const others = all.filter((x) => x.item.whole !== b.item.whole);
  for (const k of [1, 0] as const) {
    const term = b.item.parts[k][1];
    const list = [
      ...others.filter((x) => x.item.parts[k][1] === term),
      ...others.filter((x) => x.item.parts[1 - k][1] === term),
    ];
    if (list.length) return { via: b.parts[k], list: list.slice(0, n) };
  }
  return null;
}
