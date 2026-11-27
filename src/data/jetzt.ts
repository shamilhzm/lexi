// Jetzt — the learner's own moment, in German *(2026-11-27)*.
//
// Lexi taught every word for the time of day and never once said what time it
// was. The clock on the device is the one piece of context every learner carries,
// it never leaves the device, and the German for it is the first real sentence a
// course teaches: *Es ist halb acht.* So the feed can say the moment the learner
// is actually in — the time as a German says it, the day as one compound, the
// date as it is spoken — and offer the words people use at that hour.
//
// Everything here is the German school's: number words, the half-hour that counts
// towards the next hour, which article a compound takes. A trust file must not
// learn it (BOARD, *Trust and school*). Every term named below is a card, and
// `jetzt.test.ts` holds the lists to the corpus.

export type Tageszeit = 'morgen' | 'vormittag' | 'mittag' | 'nachmittag' | 'abend' | 'nacht';
export type Jahreszeit = 'frühling' | 'sommer' | 'herbst' | 'winter';

/** The part of the day, as German divides it. *Vormittag* is its own part —
 *  English has no word for the hours between breakfast and lunch. */
export function tageszeit(h: number): Tageszeit {
  if (h >= 5 && h < 9) return 'morgen';
  if (h >= 9 && h < 12) return 'vormittag';
  if (h >= 12 && h < 14) return 'mittag';
  if (h >= 14 && h < 18) return 'nachmittag';
  if (h >= 18 && h < 23) return 'abend';
  return 'nacht';
}

/** The card each part of the day is. */
export const TAGESZEIT_TERM: Record<Tageszeit, string> = {
  morgen: 'der Morgen', vormittag: 'der Vormittag', mittag: 'der Mittag',
  nachmittag: 'der Nachmittag', abend: 'der Abend', nacht: 'die Nacht',
};

const TAGESZEIT_EN: Record<Tageszeit, string> = {
  morgen: 'morning', vormittag: 'late morning', mittag: 'lunchtime',
  nachmittag: 'afternoon', abend: 'evening', nacht: 'night',
};

/** What to call the hour in English, for "Words for …". */
export const FOR_THE_HOUR: Record<Tageszeit, string> = {
  morgen: 'this morning', vormittag: 'this morning', mittag: 'lunchtime',
  nachmittag: 'this afternoon', abend: 'this evening', nacht: 'tonight',
};

/** How a German says hello at this hour, and the card the greeting is made of.
 *  After midnight nobody says *Guten Abend* to a person still awake, and *Gute
 *  Nacht* is a goodbye, so the small hours get the question instead. */
export function gruss(h: number): { de: string; en: string; term: string } {
  if (h >= 5 && h < 11) return { de: 'Guten Morgen', en: 'Good morning.', term: 'der Morgen' };
  if (h >= 11 && h < 18) return { de: 'Guten Tag', en: 'Hello. Literally, good day.', term: 'der Tag' };
  if (h >= 18) return { de: 'Guten Abend', en: 'Good evening.', term: 'der Abend' };
  return { de: 'Noch wach?', en: 'Still up?', term: 'wach' };
}

// ---- numbers ----------------------------------------------------------------

const ONES = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun',
  'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig'];

/** 0–59 as a word. The ones come first, joined by *und*: 21 is *einundzwanzig*. */
export function zahl(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 59) throw new RangeError(`zahl(${n})`);
  if (n < 20) return ONES[n];
  const o = n % 10;
  const t = TENS[Math.floor(n / 10)];
  return o === 0 ? t : `${o === 1 ? 'ein' : ONES[o]}und${t}`;
}

/** The ordinal a date is spoken with, after *der*: *der sechsundzwanzigste*.
 *  Up to 19 it is *-te*, from 20 *-ste*; four of the first eight are irregular. */
export function ordinal(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 31) throw new RangeError(`ordinal(${n})`);
  const odd: Record<number, string> = { 1: 'erste', 3: 'dritte', 7: 'siebte', 8: 'achte' };
  if (n < 20) return odd[n] ?? `${zahl(n)}te`;
  return `${zahl(n)}ste`;
}

// ---- the clock ----------------------------------------------------------------

const EN_HOURS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const h12 = (h: number) => (h % 12) || 12;
/** The hour as it is said after *nach*, *vor* and *halb*: *halb eins*, not *halb ein*. */
const stunde = (h: number) => zahl(h12(h));
/** The full hour: *ein Uhr*, where every other hour keeps its own word. */
const uhr = (h: number) => `${h12(h) === 1 ? 'ein' : zahl(h12(h))} Uhr`;
const enHour = (h: number) => EN_HOURS[h12(h)];

export interface Uhrzeit {
  /** The sentence: *Es ist kurz nach halb acht.* */
  de: string;
  en: string;
  /** The half hour it names, if it names one: the reading a learner gets an hour
   *  wrong (*halb acht* is 7:30, not 8:30). */
  halb: { de: string; clock: string } | null;
}

/** The time as people say it, on the twelve-hour clock, the half counted towards
 *  the *next* hour. Within three minutes of the hour or the half it is *kurz nach*
 *  or *kurz vor* (*kurz nach zwei* at 14:03, which nobody calls *fünf nach*);
 *  otherwise the nearest five minutes. *Kurz* never rounds a quarter or a twenty:
 *  nobody says *kurz nach zwanzig nach sieben*. Twenty past is *zwanzig nach*
 *  (*zehn vor halb* is regional, and a first reading should be the one understood
 *  everywhere). */
export function uhrzeit(h: number, m: number): Uhrzeit {
  const next = h + 1;
  const anchor = m <= 15 ? 0 : m <= 45 ? 30 : 60;
  const d = m - anchor;
  let de: string;
  let en: string;
  if (d !== 0 && Math.abs(d) <= 3) {
    const after = d > 0;
    if (anchor === 0) { de = `kurz nach ${stunde(h)}`; en = `just after ${enHour(h)}`; }
    else if (anchor === 60) { de = `kurz vor ${stunde(next)}`; en = `just before ${enHour(next)}`; }
    else {
      de = `kurz ${after ? 'nach' : 'vor'} halb ${stunde(next)}`;
      en = `just ${after ? 'after' : 'before'} half past ${enHour(h)}`;
    }
  } else {
    switch (Math.round(m / 5) * 5) {
      case 0: de = uhr(h); en = `${enHour(h)} o’clock`; break;
      case 5: de = `fünf nach ${stunde(h)}`; en = `five past ${enHour(h)}`; break;
      case 10: de = `zehn nach ${stunde(h)}`; en = `ten past ${enHour(h)}`; break;
      case 15: de = `Viertel nach ${stunde(h)}`; en = `quarter past ${enHour(h)}`; break;
      case 20: de = `zwanzig nach ${stunde(h)}`; en = `twenty past ${enHour(h)}`; break;
      case 25: de = `fünf vor halb ${stunde(next)}`; en = `twenty-five past ${enHour(h)}`; break;
      case 30: de = `halb ${stunde(next)}`; en = `half past ${enHour(h)}`; break;
      case 35: de = `fünf nach halb ${stunde(next)}`; en = `twenty-five to ${enHour(next)}`; break;
      case 40: de = `zwanzig vor ${stunde(next)}`; en = `twenty to ${enHour(next)}`; break;
      case 45: de = `Viertel vor ${stunde(next)}`; en = `quarter to ${enHour(next)}`; break;
      case 50: de = `zehn vor ${stunde(next)}`; en = `ten to ${enHour(next)}`; break;
      default: de = `fünf vor ${stunde(next)}`; en = `five to ${enHour(next)}`;
    }
  }
  const halb = de.includes('halb') ? { de: `halb ${stunde(next)}`, clock: `${h12(h)}:30` } : null;
  return { de: `Es ist ${de}.`, en: `It’s ${en}.`, halb };
}

/** The time as a timetable or the radio says it: twenty-four hours, every minute. */
export function uhrzeitFormal(h: number, m: number): string {
  const hour = h === 1 ? 'ein' : zahl(h);
  return m === 0 ? `${hour} Uhr` : `${hour} Uhr ${zahl(m)}`;
}

// ---- the day ------------------------------------------------------------------

/** By `Date.getDay()`: Sunday first. */
export const WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WOCHENTAG_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONAT = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August',
  'September', 'Oktober', 'November', 'Dezember'];

export interface Kompositum {
  /** The two cards it is made of: *der Donnerstag*, *der Abend*. */
  parts: [string, string];
  /** *der Donnerstagabend* — the last part's article, always. */
  term: string;
  gender: 'der' | 'die';
  en: string;
  /** The first part's article differs from the compound's: the case that shows
   *  the rule rather than just obeying it (*der Donnerstag* → *die Donnerstagnacht*). */
  turns: boolean;
}

/** The day and the part of it as one word. Written together since the 1996
 *  reform; the compound takes the article of its last part. `null` between
 *  midnight and five, when the night still belongs to yesterday and naming
 *  today's weekday would be wrong. */
export function kompositum(day: number, h: number): Kompositum | null {
  if (h < 5) return null;
  const tz = tageszeit(h);
  const last = TAGESZEIT_TERM[tz];
  const gender = last.startsWith('die ') ? 'die' : 'der';
  return {
    parts: [`der ${WOCHENTAG[day]}`, last],
    term: `${gender} ${WOCHENTAG[day]}${tz}`,
    gender,
    en: `${WOCHENTAG_EN[day]} ${TAGESZEIT_EN[tz]}`,
    turns: gender !== 'der',
  };
}

/** Meteorological seasons, three months each. */
export function jahreszeit(month: number, southern = false): Jahreszeit {
  const north: Jahreszeit[] = ['winter', 'winter', 'frühling', 'frühling', 'frühling', 'sommer',
    'sommer', 'sommer', 'herbst', 'herbst', 'herbst', 'winter'];
  const s = north[month];
  if (!southern) return s;
  const flip: Record<Jahreszeit, Jahreszeit> = { winter: 'sommer', sommer: 'winter', frühling: 'herbst', herbst: 'frühling' };
  return flip[s];
}

export const JAHRESZEIT_TERM: Record<Jahreszeit, string> = {
  frühling: 'der Frühling', sommer: 'der Sommer', herbst: 'der Herbst', winter: 'der Winter',
};

/** A guess at the hemisphere from the time zone the device reports — the only
 *  location Lexi reads, and it never leaves the device. A learner in Sydney is in
 *  summer at Christmas. */
const SOUTH = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham)$|^America\/(Argentina\/|Santiago$|Montevideo$|Sao_Paulo$|Punta_Arenas$)|^Africa\/(Johannesburg|Maputo|Windhoek|Gaborone|Maseru|Mbabane)$/;
export function southern(timeZone: string | undefined): boolean {
  return !!timeZone && SOUTH.test(timeZone);
}

export interface Moment {
  h: number; m: number;
  /** `Date.getDay()` */
  day: number;
  date: number;
  month: number;
  tageszeit: Tageszeit;
  jahreszeit: Jahreszeit;
  /** Saturday, Sunday, and Friday from the evening on. */
  weekend: boolean;
}

export function momentOf(d: Date, timeZone?: string): Moment {
  const h = d.getHours();
  const day = d.getDay();
  return {
    h, m: d.getMinutes(), day, date: d.getDate(), month: d.getMonth(),
    tageszeit: tageszeit(h),
    jahreszeit: jahreszeit(d.getMonth(), southern(timeZone)),
    weekend: day === 6 || day === 0 || (day === 5 && h >= 18),
  };
}

/** *Heute ist der 26. November.* */
export function datum(mo: Moment): { de: string; spoken: string } {
  return { de: `Heute ist der ${mo.date}. ${MONAT[mo.month]}.`, spoken: `der ${ordinal(mo.date)}` };
}

// ---- words for the hour -------------------------------------------------------
//
// What people do, eat and say at this hour — A1 first, a few higher up so a B2
// learner is not handed only words they had in their first week. Order matters
// only as a tie-break; the slot prefers what the learner does not know yet.

export const FOR_NOW: Record<Tageszeit, string[]> = {
  morgen: ['aufstehen', 'das Frühstück', 'der Kaffee', 'das Brötchen', 'duschen', 'der Wecker',
    'aufwachen', 'pünktlich', 'sich beeilen', 'die Zeitung', 'pendeln', 'der Pendler', 'munter', 'der Tau'],
  vormittag: ['die Arbeit', 'arbeiten', 'das Büro', 'der Termin', 'die Besprechung', 'die Schule',
    'die Pause', 'der Kalender', 'der Alltag', 'die Frist', 'die Gewohnheit', 'die Routine'],
  mittag: ['das Mittagessen', 'die Mittagspause', 'der Hunger', 'hungrig', 'essen', 'die Kantine',
    'der Imbiss', 'das Nickerchen', 'die Pause'],
  nachmittag: ['der Kuchen', 'die Tasse', 'einkaufen', 'der Supermarkt', 'der Spaziergang', 'der Stau',
    'die Verspätung', 'müde', 'der Feierabend', 'die Laune', 'das Nickerchen', 'erschöpft'],
  abend: ['das Abendessen', 'kochen', 'der Feierabend', 'fernsehen', 'gemütlich', 'die Serie', 'das Sofa',
    'entspannen', 'müde', 'die Dämmerung', 'der Sonnenuntergang', 'abschalten', 'erschöpft', 'die Sendung'],
  nacht: ['schlafen', 'das Bett', 'müde', 'wach', 'träumen', 'der Traum', 'der Mond', 'der Stern', 'dunkel',
    'das Kissen', 'der Schlafanzug', 'die Mitternacht', 'der Schlaf', 'schlaflos', 'die Schlaflosigkeit', 'die Nachtschicht'],
};

/** The weekend's hours, where they differ. Night is night either way. */
export const WEEKEND: Partial<Record<Tageszeit, string[]>> = {
  morgen: ['das Wochenende', 'der Langschläfer', 'frühstücken', 'das Brötchen', 'die Bäckerei', 'die Freizeit'],
  vormittag: ['das Wochenende', 'der Markt', 'frühstücken', 'die Freizeit', 'aufräumen', 'die Wäsche'],
  mittag: ['das Wochenende', 'der Ausflug', 'die Freizeit', 'sich ausruhen'],
  nachmittag: ['der Ausflug', 'wandern', 'die Wanderung', 'der Spaziergang', 'der Kuchen', 'sich ausruhen', 'entspannen'],
  abend: ['ausgehen', 'die Party', 'feiern', 'das Kino', 'der Film', 'die Kneipe', 'der Wein', 'das Bier'],
};

export const SEASON: Record<Jahreszeit, string[]> = {
  frühling: ['der Frühling', 'die Blume', 'blühen', 'der Garten', 'der Vogel', 'sonnig', 'der Schauer', 'der Regenschirm'],
  sommer: ['der Sommer', 'heiß', 'die Hitze', 'schwül', 'das Gewitter', 'der Strand', 'das Eis', 'schwimmen',
    'das Freibad', 'der Biergarten', 'grillen', 'der Urlaub'],
  herbst: ['der Herbst', 'der Nebel', 'neblig', 'das Blatt', 'das Laub', 'der Wind', 'der Sturm', 'regnerisch',
    'der Regenschirm', 'der Mantel', 'die Ernte', 'der Drachen', 'bewölkt'],
  winter: ['der Winter', 'der Schnee', 'kalt', 'die Kälte', 'die Heizung', 'der Schal', 'die Mütze', 'der Handschuh',
    'der Frost', 'die Erkältung', 'die Kerze', 'gemütlich', 'der Kamin', 'die Decke'],
};

/** A month's own words, wherever the learner is: Christmas is in December in
 *  Sydney too. By `Date.getMonth()`. */
export const MONTH_EXTRA: Partial<Record<number, string[]>> = {
  1: ['der Karneval', 'der Fasching'],
  2: ['Ostern'],
  3: ['Ostern'],
  11: ['Weihnachten', 'der Weihnachtsmarkt', 'die Kerze'],
};

/** Every term the moment can name: the lists, the parts of the day, the weekdays,
 *  the months, the seasons and the greetings' words. `jetzt.test.ts` holds each
 *  to a card. */
export function allJetztTerms(): string[] {
  return [...new Set([
    ...Object.values(FOR_NOW).flat(),
    ...Object.values(WEEKEND).flatMap((x) => x ?? []),
    ...Object.values(SEASON).flat(),
    ...Object.values(MONTH_EXTRA).flatMap((x) => x ?? []),
    ...Object.values(TAGESZEIT_TERM),
    ...Object.values(JAHRESZEIT_TERM),
    ...WOCHENTAG.map((d) => `der ${d}`),
    ...MONAT.map((m) => `der ${m}`),
    'der Tag', 'wach', 'halb', 'das Viertel', 'die Uhr', 'jetzt', 'heute',
  ])];
}

/** The candidates for the moment, nearest first: the weekend's version of the
 *  hour, then the hour, then the season and the month. */
export function nowTerms(mo: Moment): { hour: string[]; season: string[] } {
  const hour = [...(mo.weekend ? WEEKEND[mo.tageszeit] ?? [] : []), ...FOR_NOW[mo.tageszeit]];
  const season = [...(MONTH_EXTRA[mo.month] ?? []), ...SEASON[mo.jahreszeit]];
  return { hour: [...new Set(hour)], season: [...new Set(season)].filter((t) => !hour.includes(t)) };
}

/** A small seeded shuffle, so the picks hold still for the whole part of the day
 *  and change with the next one — the same words every time the feed opens this
 *  evening, other words tomorrow morning. */
export function seededOrder<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
