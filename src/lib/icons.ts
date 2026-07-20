// Semantic emoji icons — a zero-asset, offline "artistry" layer. Pairing each
// word/sector with a picture is dual-coding: the image gives the term a second
// memory hook. Emojis are Unicode glyphs, so there are no image files to ship
// and they render on every platform, online or off.

// Sector-name → emoji. Matched by keyword (substring, lowercased) so every one
// of the ~290 sectors resolves to something sensible; first match wins.
const SECTOR_RULES: [RegExp, string][] = [
  [/exam|prüfung/, '📝'],
  [/weather|wetter|climate/, '🌦️'],
  [/food|dining|restaurant|essen|drink|beverage/, '🍽️'],
  [/travel|around|getting|transport|mobility|excursion|trip|commut|border/, '🧭'],
  [/work|job|apply|applicat|career|business|office|colleague|profession|employ|contract/, '💼'],
  [/health|doctor|care|illness|treatment|wellbeing|pharmacy|medical|ailment|body|prevention/, '🩺'],
  [/money|bank|finance|tax|shopping|market|econom|cash/, '💰'],
  [/politic|democra|election|government|civic|society|power|authority/, '🏛️'],
  [/visual arts|\bart\b|aesthetic|paint/, '🎨'],
  [/music|theatre|theater/, '🎵'],
  [/film|literat|narrative|story|fairy|motif/, '🎬'],
  [/language|multiling|linguistic|pronoun|connector|register|idiom|rhetoric|grammar/, '🗣️'],
  [/animal|farm/, '🐾'],
  [/school|studies|universit|educat|academic|lifelong|learning|training/, '🎓'],
  [/family|relationship|social network|people|generation|greeting/, '👪'],
  [/home|housing|living|apartment|real estate|furniture|building|accommodation|overnight/, '🏠'],
  [/tech|digital|\bai\b|artificial|comput|device|media|internet|network/, '💻'],
  [/sport|fitness|ski|exercise|leisure|hobb|game|free time/, '🏅'],
  [/cloth/, '👕'],
  [/nature|environment|landscape|energy|resource|sustainab|water/, '🌿'],
  [/science|research|scientific|method|knowledge|truth/, '🔬'],
  [/city|urban|town|direction|location|spatial|sight/, '🏙️'],
  [/military|war/, '🎖️'],
  [/religion|being|conscious/, '🕊️'],
  [/emotion|mental|feeling|values|ethic|moral|responsibilit|philosoph|decision/, '💭'],
  [/communicat|contact|phrase|opinion|negotiat|persuas|argument|debate|correspond|pragmat/, '💬'],
  [/number|question word/, '🔢'],
  [/time|days|month|season|future/, '🕐'],
  [/migration|emigration|intercultur|identity|countr|cultur|festival|oktoberfest|volunteer/, '🌍'],
  [/luck|accident|life stage/, '🍀'],
  [/weekend|event|invitation/, '🎉'],
  [/advertis|consumption|service|complaint/, '📣'],
  [/laundry|washing|material|object/, '🧺'],
];

export function iconForSector(name: string): string {
  const n = name.toLowerCase();
  for (const [re, e] of SECTOR_RULES) if (re.test(n)) return e;
  return '📚';
}

// Word (German head noun / verb) → emoji. German compounds put the head noun
// last, so an "ends-with" match is linguistically sound (das Volksfest → Fest).
// Whole-word match wins first. High-confidence, concrete entries only; anything
// unmatched falls back to the word's sector icon.
const WORD_MAP: Record<string, string> = {
  // animals
  hund: '🐕', katze: '🐈', pferd: '🐎', vogel: '🐦', fisch: '🐟', maus: '🐭',
  kuh: '🐄', schwein: '🐖', bär: '🐻', pferde: '🐎', tier: '🐾', haustier: '🐾',
  // food & drink
  apfel: '🍎', brot: '🍞', käse: '🧀', wurst: '🌭', milch: '🥛', kaffee: '☕',
  tee: '🍵', wein: '🍷', bier: '🍺', wasser: '💧', obst: '🍏', gemüse: '🥦',
  fleisch: '🥩', suppe: '🍲', salat: '🥗', kuchen: '🍰', pizza: '🍕', ei: '🥚',
  zitrone: '🍋', essen: '🍽️', frühstück: '🍳', leberkäse: '🥩',
  // home & furniture
  haus: '🏠', wohnung: '🏠', tür: '🚪', tisch: '🪑', stuhl: '🪑', bett: '🛏️',
  lampe: '💡', küche: '🍳', garten: '🌳', möbel: '🛋️', zimmer: '🚪', schrank: '🗄️',
  // body & health
  kopf: '🧠', hand: '✋', auge: '👁️', herz: '🫀', zahn: '🦷', arzt: '🩺',
  schmerz: '🤕', körper: '🧍', bein: '🦵', muskel: '💪', rücken: '🧍',
  // transport & travel
  auto: '🚗', bus: '🚌', zug: '🚆', rad: '🚲', fahrrad: '🚲', flugzeug: '✈️',
  schiff: '🚢', reise: '🧳', koffer: '🧳', straße: '🛣️', bahnhof: '🚉',
  flughafen: '✈️', schlitten: '🛷', reifen: '🛞',
  // weather & nature
  sonne: '☀️', regen: '🌧️', schnee: '❄️', wind: '🌬️', wetter: '🌦️', sturm: '🌩️',
  baum: '🌳', blume: '🌸', berg: '⛰️', meer: '🌊', see: '🌊', wald: '🌲',
  natur: '🌿', gegenwind: '🌬️',
  // clothing
  hose: '👖', kleid: '👗', rock: '👗', schuh: '👟', jacke: '🧥', hemd: '👔',
  mütze: '🧢', mode: '👗', bluse: '👚', handschuh: '🧤',
  // money & work
  geld: '💰', konto: '🏦', bank: '🏦', büro: '💼', arbeit: '💼', job: '💼',
  chef: '👔', firma: '🏢', rechnung: '🧾', gehalt: '💶', kreditkarte: '💳',
  // tech
  computer: '💻', handy: '📱', telefon: '📞', internet: '🌐', gerät: '🔌',
  kamera: '📷', bildschirm: '🖥️',
  // time
  uhr: '🕐', zeit: '⏰', tag: '📅', jahr: '📅', woche: '📅', monat: '📅',
  // school & language
  buch: '📖', schule: '🏫', sprache: '🗣️', wort: '📝', prüfung: '📝', kurs: '🎓',
  universität: '🎓', student: '🎓', lehrer: '🧑‍🏫', wörterbuch: '📖',
  // misc
  musik: '🎵', film: '🎬', sport: '🏅', spiel: '🎮', stadt: '🏙️', welt: '🌍',
  feuer: '🔥', licht: '💡', brief: '✉️', paket: '📦', schlüssel: '🔑', ampel: '🚦',
};

const WORD_KEYS = Object.keys(WORD_MAP).sort((a, b) => b.length - a.length);

export function iconForWord(w: { term: string; field?: string }): string {
  const t = w.term.toLowerCase().replace(/^(der|die|das)\s+/, '').trim();
  if (WORD_MAP[t]) return WORD_MAP[t];
  for (const k of WORD_KEYS) if (t.endsWith(k)) return WORD_MAP[k];
  return w.field ? iconForSector(w.field) : '📚';
}
