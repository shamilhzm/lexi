// German verb conjugation — present (Präsens), simple past (Präteritum),
// present perfect (Perfekt), future (Futur I) and Konjunktiv II. Three sources
// for the synthetic forms, in priority order:
//   1. An explicit table of high-frequency strong/irregular verbs (verified
//      forms — the source of truth; see conjugate.test data).
//   2. Prefix reconstruction: a prefixed verb (ankommen, verstehen, aufstehen)
//      derives from its base verb in the table (kommen, stehen).
//   3. A regular ("weak") generator with the standard orthographic rules.
// Verbs we can't conjugate confidently are flagged `reliable: false` so the
// trainer never drills a wrong form.

export type Person = 'ich' | 'du' | 'er' | 'wir' | 'ihr' | 'sie';
export const PERSONS: Person[] = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
export const PRONOUN: Record<Person, string> = {
  ich: 'ich', du: 'du', er: 'er/sie/es', wir: 'wir', ihr: 'ihr', sie: 'sie/Sie',
};
export type Tense = 'praesens' | 'praeteritum' | 'perfekt' | 'futur1' | 'konjunktiv2';
export type Aux = 'haben' | 'sein';
type Six = [string, string, string, string, string, string];

export interface Conjugation {
  infinitive: string;       // the bare verb (reflexive "sich" stripped)
  reflexive: boolean;
  aux: Aux;
  praesens: Six;            // ich, du, er, wir, ihr, sie  (finite verb only)
  praeteritum: Six;
  partizip: string;         // Partizip II, e.g. "gegangen", "gemacht"
  perfekt: Six;             // full: "ich habe gemacht" / "ich bin gegangen"
  futur1: Six;              // full: "ich werde machen"
  konjunktiv2: Six;         // "ich würde machen"; synthetic for sein/haben/modals ("wäre", "hätte", "könnte")
  separable: string | null; // detached prefix in present/past, e.g. "an"
  source: 'irregular' | 'regular';
  reliable: boolean;
}

// ---- the irregular table (full, verified forms; unprefixed) ---------------
interface Entry { praesens: Six; praeteritum: Six; partizip: string; aux: Aux; }
const six = (a: string, b: string, c: string, d: string, e: string, f: string): Six => [a, b, c, d, e, f];

const TABLE: Record<string, Entry> = {
  sein:   { praesens: six('bin','bist','ist','sind','seid','sind'), praeteritum: six('war','warst','war','waren','wart','waren'), partizip: 'gewesen', aux: 'sein' },
  haben:  { praesens: six('habe','hast','hat','haben','habt','haben'), praeteritum: six('hatte','hattest','hatte','hatten','hattet','hatten'), partizip: 'gehabt', aux: 'haben' },
  werden: { praesens: six('werde','wirst','wird','werden','werdet','werden'), praeteritum: six('wurde','wurdest','wurde','wurden','wurdet','wurden'), partizip: 'geworden', aux: 'sein' },
  // modals
  können: { praesens: six('kann','kannst','kann','können','könnt','können'), praeteritum: six('konnte','konntest','konnte','konnten','konntet','konnten'), partizip: 'gekonnt', aux: 'haben' },
  müssen: { praesens: six('muss','musst','muss','müssen','müsst','müssen'), praeteritum: six('musste','musstest','musste','mussten','musstet','mussten'), partizip: 'gemusst', aux: 'haben' },
  wollen: { praesens: six('will','willst','will','wollen','wollt','wollen'), praeteritum: six('wollte','wolltest','wollte','wollten','wolltet','wollten'), partizip: 'gewollt', aux: 'haben' },
  sollen: { praesens: six('soll','sollst','soll','sollen','sollt','sollen'), praeteritum: six('sollte','solltest','sollte','sollten','solltet','sollten'), partizip: 'gesollt', aux: 'haben' },
  dürfen: { praesens: six('darf','darfst','darf','dürfen','dürft','dürfen'), praeteritum: six('durfte','durftest','durfte','durften','durftet','durften'), partizip: 'gedurft', aux: 'haben' },
  mögen:  { praesens: six('mag','magst','mag','mögen','mögt','mögen'), praeteritum: six('mochte','mochtest','mochte','mochten','mochtet','mochten'), partizip: 'gemocht', aux: 'haben' },
  wissen: { praesens: six('weiß','weißt','weiß','wissen','wisst','wissen'), praeteritum: six('wusste','wusstest','wusste','wussten','wusstet','wussten'), partizip: 'gewusst', aux: 'haben' },
  // strong / mixed
  gehen:  { praesens: six('gehe','gehst','geht','gehen','geht','gehen'), praeteritum: six('ging','gingst','ging','gingen','gingt','gingen'), partizip: 'gegangen', aux: 'sein' },
  stehen: { praesens: six('stehe','stehst','steht','stehen','steht','stehen'), praeteritum: six('stand','standest','stand','standen','standet','standen'), partizip: 'gestanden', aux: 'haben' },
  kommen: { praesens: six('komme','kommst','kommt','kommen','kommt','kommen'), praeteritum: six('kam','kamst','kam','kamen','kamt','kamen'), partizip: 'gekommen', aux: 'sein' },
  sehen:  { praesens: six('sehe','siehst','sieht','sehen','seht','sehen'), praeteritum: six('sah','sahst','sah','sahen','saht','sahen'), partizip: 'gesehen', aux: 'haben' },
  geben:  { praesens: six('gebe','gibst','gibt','geben','gebt','geben'), praeteritum: six('gab','gabst','gab','gaben','gabt','gaben'), partizip: 'gegeben', aux: 'haben' },
  nehmen: { praesens: six('nehme','nimmst','nimmt','nehmen','nehmt','nehmen'), praeteritum: six('nahm','nahmst','nahm','nahmen','nahmt','nahmen'), partizip: 'genommen', aux: 'haben' },
  finden: { praesens: six('finde','findest','findet','finden','findet','finden'), praeteritum: six('fand','fandest','fand','fanden','fandet','fanden'), partizip: 'gefunden', aux: 'haben' },
  bleiben:{ praesens: six('bleibe','bleibst','bleibt','bleiben','bleibt','bleiben'), praeteritum: six('blieb','bliebst','blieb','blieben','bliebt','blieben'), partizip: 'geblieben', aux: 'sein' },
  liegen: { praesens: six('liege','liegst','liegt','liegen','liegt','liegen'), praeteritum: six('lag','lagst','lag','lagen','lagt','lagen'), partizip: 'gelegen', aux: 'haben' },
  sprechen:{ praesens: six('spreche','sprichst','spricht','sprechen','sprecht','sprechen'), praeteritum: six('sprach','sprachst','sprach','sprachen','spracht','sprachen'), partizip: 'gesprochen', aux: 'haben' },
  essen:  { praesens: six('esse','isst','isst','essen','esst','essen'), praeteritum: six('aß','aßest','aß','aßen','aßt','aßen'), partizip: 'gegessen', aux: 'haben' },
  trinken:{ praesens: six('trinke','trinkst','trinkt','trinken','trinkt','trinken'), praeteritum: six('trank','trankst','trank','tranken','trankt','tranken'), partizip: 'getrunken', aux: 'haben' },
  fahren: { praesens: six('fahre','fährst','fährt','fahren','fahrt','fahren'), praeteritum: six('fuhr','fuhrst','fuhr','fuhren','fuhrt','fuhren'), partizip: 'gefahren', aux: 'sein' },
  laufen: { praesens: six('laufe','läufst','läuft','laufen','lauft','laufen'), praeteritum: six('lief','liefst','lief','liefen','lieft','liefen'), partizip: 'gelaufen', aux: 'sein' },
  lesen:  { praesens: six('lese','liest','liest','lesen','lest','lesen'), praeteritum: six('las','last','las','lasen','last','lasen'), partizip: 'gelesen', aux: 'haben' },
  schreiben:{ praesens: six('schreibe','schreibst','schreibt','schreiben','schreibt','schreiben'), praeteritum: six('schrieb','schriebst','schrieb','schrieben','schriebt','schrieben'), partizip: 'geschrieben', aux: 'haben' },
  treffen:{ praesens: six('treffe','triffst','trifft','treffen','trefft','treffen'), praeteritum: six('traf','trafst','traf','trafen','traft','trafen'), partizip: 'getroffen', aux: 'haben' },
  fallen: { praesens: six('falle','fällst','fällt','fallen','fallt','fallen'), praeteritum: six('fiel','fielst','fiel','fielen','fielt','fielen'), partizip: 'gefallen', aux: 'sein' },
  halten: { praesens: six('halte','hältst','hält','halten','haltet','halten'), praeteritum: six('hielt','hieltest','hielt','hielten','hieltet','hielten'), partizip: 'gehalten', aux: 'haben' },
  lassen: { praesens: six('lasse','lässt','lässt','lassen','lasst','lassen'), praeteritum: six('ließ','ließest','ließ','ließen','ließt','ließen'), partizip: 'gelassen', aux: 'haben' },
  schlafen:{ praesens: six('schlafe','schläfst','schläft','schlafen','schlaft','schlafen'), praeteritum: six('schlief','schliefst','schlief','schliefen','schlieft','schliefen'), partizip: 'geschlafen', aux: 'haben' },
  tragen: { praesens: six('trage','trägst','trägt','tragen','tragt','tragen'), praeteritum: six('trug','trugst','trug','trugen','trugt','trugen'), partizip: 'getragen', aux: 'haben' },
  fangen: { praesens: six('fange','fängst','fängt','fangen','fangt','fangen'), praeteritum: six('fing','fingst','fing','fingen','fingt','fingen'), partizip: 'gefangen', aux: 'haben' },
  helfen: { praesens: six('helfe','hilfst','hilft','helfen','helft','helfen'), praeteritum: six('half','halfst','half','halfen','halft','halfen'), partizip: 'geholfen', aux: 'haben' },
  werfen: { praesens: six('werfe','wirfst','wirft','werfen','werft','werfen'), praeteritum: six('warf','warfst','warf','warfen','warft','warfen'), partizip: 'geworfen', aux: 'haben' },
  gewinnen:{ praesens: six('gewinne','gewinnst','gewinnt','gewinnen','gewinnt','gewinnen'), praeteritum: six('gewann','gewannst','gewann','gewannen','gewannt','gewannen'), partizip: 'gewonnen', aux: 'haben' },
  beginnen:{ praesens: six('beginne','beginnst','beginnt','beginnen','beginnt','beginnen'), praeteritum: six('begann','begannst','begann','begannen','begannt','begannen'), partizip: 'begonnen', aux: 'haben' },
  singen: { praesens: six('singe','singst','singt','singen','singt','singen'), praeteritum: six('sang','sangst','sang','sangen','sangt','sangen'), partizip: 'gesungen', aux: 'haben' },
  schwimmen:{ praesens: six('schwimme','schwimmst','schwimmt','schwimmen','schwimmt','schwimmen'), praeteritum: six('schwamm','schwammst','schwamm','schwammen','schwammt','schwammen'), partizip: 'geschwommen', aux: 'sein' },
  ziehen: { praesens: six('ziehe','ziehst','zieht','ziehen','zieht','ziehen'), praeteritum: six('zog','zogst','zog','zogen','zogt','zogen'), partizip: 'gezogen', aux: 'haben' },
  fliegen:{ praesens: six('fliege','fliegst','fliegt','fliegen','fliegt','fliegen'), praeteritum: six('flog','flogst','flog','flogen','flogt','flogen'), partizip: 'geflogen', aux: 'sein' },
  schließen:{ praesens: six('schließe','schließt','schließt','schließen','schließt','schließen'), praeteritum: six('schloss','schlossest','schloss','schlossen','schlosst','schlossen'), partizip: 'geschlossen', aux: 'haben' },
  verlieren:{ praesens: six('verliere','verlierst','verliert','verlieren','verliert','verlieren'), praeteritum: six('verlor','verlorst','verlor','verloren','verlort','verloren'), partizip: 'verloren', aux: 'haben' },
  denken: { praesens: six('denke','denkst','denkt','denken','denkt','denken'), praeteritum: six('dachte','dachtest','dachte','dachten','dachtet','dachten'), partizip: 'gedacht', aux: 'haben' },
  bringen:{ praesens: six('bringe','bringst','bringt','bringen','bringt','bringen'), praeteritum: six('brachte','brachtest','brachte','brachten','brachtet','brachten'), partizip: 'gebracht', aux: 'haben' },
  kennen: { praesens: six('kenne','kennst','kennt','kennen','kennt','kennen'), praeteritum: six('kannte','kanntest','kannte','kannten','kanntet','kannten'), partizip: 'gekannt', aux: 'haben' },
  nennen: { praesens: six('nenne','nennst','nennt','nennen','nennt','nennen'), praeteritum: six('nannte','nanntest','nannte','nannten','nanntet','nannten'), partizip: 'genannt', aux: 'haben' },
  tun:    { praesens: six('tue','tust','tut','tun','tut','tun'), praeteritum: six('tat','tatest','tat','taten','tatet','taten'), partizip: 'getan', aux: 'haben' },
  rufen:  { praesens: six('rufe','rufst','ruft','rufen','ruft','rufen'), praeteritum: six('rief','riefst','rief','riefen','rieft','riefen'), partizip: 'gerufen', aux: 'haben' },
  heißen: { praesens: six('heiße','heißt','heißt','heißen','heißt','heißen'), praeteritum: six('hieß','hießest','hieß','hießen','hießt','hießen'), partizip: 'geheißen', aux: 'haben' },
  sitzen: { praesens: six('sitze','sitzt','sitzt','sitzen','sitzt','sitzen'), praeteritum: six('saß','saßest','saß','saßen','saßt','saßen'), partizip: 'gesessen', aux: 'haben' },
  bitten: { praesens: six('bitte','bittest','bittet','bitten','bittet','bitten'), praeteritum: six('bat','batest','bat','baten','batet','baten'), partizip: 'gebeten', aux: 'haben' },
  vergessen:{ praesens: six('vergesse','vergisst','vergisst','vergessen','vergesst','vergessen'), praeteritum: six('vergaß','vergaßt','vergaß','vergaßen','vergaßt','vergaßen'), partizip: 'vergessen', aux: 'haben' },
  empfehlen:{ praesens: six('empfehle','empfiehlst','empfiehlt','empfehlen','empfehlt','empfehlen'), praeteritum: six('empfahl','empfahlst','empfahl','empfahlen','empfahlt','empfahlen'), partizip: 'empfohlen', aux: 'haben' },
  waschen:{ praesens: six('wasche','wäschst','wäscht','waschen','wascht','waschen'), praeteritum: six('wusch','wuschst','wusch','wuschen','wuscht','wuschen'), partizip: 'gewaschen', aux: 'haben' },
  scheinen:{ praesens: six('scheine','scheinst','scheint','scheinen','scheint','scheinen'), praeteritum: six('schien','schienst','schien','schienen','schient','schienen'), partizip: 'geschienen', aux: 'haben' },
  steigen:{ praesens: six('steige','steigst','steigt','steigen','steigt','steigen'), praeteritum: six('stieg','stiegst','stieg','stiegen','stiegt','stiegen'), partizip: 'gestiegen', aux: 'sein' },
  // strong bases included so their common ver-/be-/er-/an-/auf- derivatives
  // (vergleichen, verbieten, bewerben, einladen, vorschlagen…) conjugate right.
  schlagen:{ praesens: six('schlage','schlägst','schlägt','schlagen','schlagt','schlagen'), praeteritum: six('schlug','schlugst','schlug','schlugen','schlugt','schlugen'), partizip: 'geschlagen', aux: 'haben' },
  laden:  { praesens: six('lade','lädst','lädt','laden','ladet','laden'), praeteritum: six('lud','ludest','lud','luden','ludet','luden'), partizip: 'geladen', aux: 'haben' },
  bieten: { praesens: six('biete','bietest','bietet','bieten','bietet','bieten'), praeteritum: six('bot','botest','bot','boten','botet','boten'), partizip: 'geboten', aux: 'haben' },
  raten:  { praesens: six('rate','rätst','rät','raten','ratet','raten'), praeteritum: six('riet','rietest','riet','rieten','rietet','rieten'), partizip: 'geraten', aux: 'haben' },
  werben: { praesens: six('werbe','wirbst','wirbt','werben','werbt','werben'), praeteritum: six('warb','warbst','warb','warben','warbt','warben'), partizip: 'geworben', aux: 'haben' },
  gleichen:{ praesens: six('gleiche','gleichst','gleicht','gleichen','gleicht','gleichen'), praeteritum: six('glich','glichst','glich','glichen','glicht','glichen'), partizip: 'geglichen', aux: 'haben' },
  streiten:{ praesens: six('streite','streitest','streitet','streiten','streitet','streiten'), praeteritum: six('stritt','strittest','stritt','stritten','strittet','stritten'), partizip: 'gestritten', aux: 'haben' },
  scheiden:{ praesens: six('scheide','scheidest','scheidet','scheiden','scheidet','scheiden'), praeteritum: six('schied','schiedest','schied','schieden','schiedet','schieden'), partizip: 'geschieden', aux: 'haben' },
};

// German verbs that are strong/irregular but NOT in TABLE (or whose simple form
// isn't). Used only to *gate* the regular generator so we never drill a wrong
// strong form. (Aliases for ß/ü-free spellings included.)
const STRONG_GATE = new Set<string>([
  'geben','nehmen','sehen','lesen','essen','vergessen','treten','gelten','sterben','helfen','werfen',
  'sprechen','brechen','stechen','treffen','empfehlen','stehlen','befehlen','nehmen','gebären',
  'fahren','tragen','waschen','wachsen','schlagen','laden','raten','braten','graben','backen',
  'fallen','halten','lassen','schlafen','fangen','hängen','laufen','stoßen','rufen',
  'biegen','bieten','fliegen','fliehen','fließen','frieren','genießen','gießen','kriechen','riechen','schieben','schießen','schließen','verlieren','wiegen','ziehen','schwören','betrügen','heben',
  'binden','dringen','finden','gelingen','gewinnen','klingen','ringen','singen','sinken','springen','stinken','trinken','schwimmen','schwinden','winden','zwingen','beginnen','spinnen','rinnen',
  'bleiben','leihen','meiden','preisen','reiben','scheiden','scheinen','schreiben','schreien','schweigen','steigen','treiben','weisen','beißen','greifen','leiden','pfeifen','reißen','reiten','scheinen','schleichen','schneiden','schreiten','streichen','streiten','gleiten','gleichen',
  'bitten','liegen','sitzen','denken','bringen','kennen','nennen','brennen','rennen','senden','wenden','tun','gehen','stehen','kommen','sein','haben','werden','wissen','heißen','rufen','schaffen','heben',
  'befehlen','gebären','genesen','geschehen','messen','fressen','quellen','schmelzen','schwellen','verderben','werben','winken',
]);

// Known simple verbs (lexicon infinitives), used to avoid false prefix splits:
// "antworten" must not be read as "an" + "tworten". Populated at app start.
let KNOWN: Set<string> = new Set();
export function setKnownVerbs(infinitives: Iterable<string>) {
  KNOWN = new Set([...infinitives].map((v) => v.replace(/^sich\s+/i, '').toLowerCase()));
}
const isKnownRoot = (root: string) => KNOWN.has(root) || !!TABLE[root];

/** A strong/irregular verb (possibly behind any prefix) we can't generate. */
function isStrong(inf: string): boolean {
  if (STRONG_GATE.has(inf)) return true;
  for (const p of GATE_PREFIXES) {
    if (inf.length > p.length + 2 && inf.startsWith(p)) {
      const core = inf.slice(p.length);
      if (STRONG_GATE.has(core) || TABLE[core]) return true;
    }
  }
  return false;
}

const INSEPARABLE = ['be', 'emp', 'ent', 'er', 'ge', 'miss', 'ver', 'zer', 'hinter', 'wider'];
// Every prefix (incl. ambiguous über/unter/um/durch…) used only to detect a
// strong core, so a strong verb hidden behind any prefix is never drilled with
// a wrongly-generated past tense.
const GATE_PREFIXES = [...INSEPARABLE, ...['ab', 'an', 'auf', 'aus', 'bei', 'durch', 'ein', 'gegen', 'hinter', 'los', 'mit', 'nach', 'über', 'um', 'unter', 'vor', 'voll', 'weg', 'wider', 'wieder', 'zer', 'zu', 'zurück', 'zusammen', 'her', 'hin']];
// Unambiguously separable prefixes (those that can be either, like über/unter/um/durch,
// are deliberately excluded so we don't guess wrong; such verbs fall back to the table only).
const SEPARABLE = [
  'ab', 'an', 'auf', 'aus', 'bei', 'dar', 'ein', 'empor', 'fern', 'fest', 'fort', 'her', 'herab', 'heran',
  'herauf', 'heraus', 'herbei', 'herein', 'herum', 'herunter', 'hervor', 'hin', 'hinauf', 'hinaus',
  'hinein', 'hinunter', 'hinweg', 'hinzu', 'los', 'mit', 'nach', 'nieder', 'statt', 'teil', 'vor', 'voran', 'voraus',
  'vorbei', 'weg', 'weiter', 'zu', 'zurecht', 'zurück', 'zusammen',
];

// Auxiliary for prefixed verbs whose Perfekt aux differs from their base verb.
// (e.g. stehen→haben but aufstehen→sein; kommen→sein but bekommen→haben.)
const AUX_OVERRIDE: Record<string, Aux> = {
  aufstehen: 'sein', aufwachen: 'sein', aufwachsen: 'sein', einschlafen: 'sein',
  umziehen: 'sein', umsteigen: 'sein', aussteigen: 'sein', einsteigen: 'sein',
  entstehen: 'sein', erscheinen: 'sein', verschwinden: 'sein',
  bekommen: 'haben', gehören: 'haben', verstehen: 'haben', bestehen: 'haben',
};

function moveToEnd(form: string, prefix: string): string { return `${form} ${prefix}`; }
function frontAttach(forms: Six, prefix: string): Six {
  return forms.map((f) => prefix + f) as Six;
}
function appendSep(forms: Six, prefix: string): Six {
  return forms.map((f) => moveToEnd(f, prefix)) as Six;
}

/** Strip a leading "sich " (reflexive). */
function deReflex(verb: string): { base: string; reflexive: boolean } {
  const m = /^sich\s+(.+)$/i.exec(verb.trim());
  return m ? { base: m[1].trim(), reflexive: true } : { base: verb.trim(), reflexive: false };
}

// ---- regular (weak) generation -------------------------------------------
function stemOf(inf: string): string {
  if (inf.endsWith('en')) return inf.slice(0, -2);
  if (inf.endsWith('n')) return inf.slice(0, -1); // -eln/-ern/-n
  return inf;
}
// stems ending in d/t, or consonant-cluster + m/n, take an -e- before -st/-t.
// (arbeiten→arbeitest, atmen→atmest, rechnen→rechnest; but lernen→lernst,
//  wohnen→wohnst since the h after a vowel is a silent lengthening mark.)
const VOWEL = 'aeiouäöü';
function needsE(stem: string): boolean {
  if (/[dt]$/.test(stem)) return true;
  if (/[mn]$/.test(stem)) {
    const a = stem[stem.length - 2];
    if (!a || VOWEL.includes(a) || a === 'l' || a === 'r') return false;
    if (a === 'h') { const b = stem[stem.length - 3]; return !!b && !VOWEL.includes(b); }
    return true;
  }
  return false;
}
// stems ending in a sibilant take only -t in du (du reist, du tanzt, du heißt).
function sibilant(stem: string): boolean { return /[sßxz]$/.test(stem) || stem.endsWith('ss'); }

function regularPraesens(inf: string): Six {
  const stem = stemOf(inf);
  const e = needsE(stem);
  const ich = inf.endsWith('eln') ? stem.replace(/el$/, 'le') : stem + 'e';
  const du = sibilant(stem) ? stem + (e ? 'est' : 't') : stem + (e ? 'est' : 'st');
  const er = stem + (e ? 'et' : 't');
  const wir = inf; // identical to infinitive
  const ihr = stem + (e ? 'et' : 't');
  const sie = inf;
  return six(ich, du, er, wir, ihr, sie);
}
function regularPraeteritum(inf: string): Six {
  const stem = stemOf(inf);
  const base = stem + (needsE(stem) ? 'ete' : 'te'); // ich/er form, e.g. "machte", "arbeitete"
  return six(base, base + 'st', base, base + 'n', base + 't', base + 'n');
}
function regularPartizip(inf: string, sep: string | null, inseparable: boolean): string {
  // Build the participle off the *root* (prefix stripped) so we don't double it.
  const root = sep ? inf.slice(sep.length) : inf;
  const stem = stemOf(root);
  const end = needsE(stem) ? 'et' : 't';
  if (root.endsWith('ieren')) return stem + end;         // studieren -> studiert (no ge-)
  if (inseparable) return stemOf(inf) + end;             // verkaufen -> verkauft (keep prefix)
  if (sep) return sep + 'ge' + stem + end;               // aufmachen -> aufgemacht
  return 'ge' + stem + end;                              // machen -> gemacht
}

// ---- strong-form prefix split --------------------------------------------
function splitPrefix(inf: string): { prefix: string; rest: string; sep: boolean } | null {
  for (const p of SEPARABLE) {
    if (inf.startsWith(p) && TABLE[inf.slice(p.length)]) return { prefix: p, rest: inf.slice(p.length), sep: true };
  }
  for (const p of INSEPARABLE) {
    if (inf.startsWith(p) && TABLE[inf.slice(p.length)]) return { prefix: p, rest: inf.slice(p.length), sep: false };
  }
  return null;
}

function lookup(inf: string): { entry: Entry; prefix: string; sep: boolean } | null {
  if (TABLE[inf]) return { entry: TABLE[inf], prefix: '', sep: false };
  const sp = splitPrefix(inf);
  if (sp) return { entry: TABLE[sp.rest], prefix: sp.prefix, sep: sp.sep };
  return null;
}

function reattachPartizip(basePart: string, prefix: string, sep: boolean): string {
  if (!prefix) return basePart;
  if (sep) return prefix + basePart;                      // an + gekommen = angekommen
  // inseparable: drop the base ge-; bekommen, verstanden
  return prefix + basePart.replace(/^ge/, '');
}

function buildPerfekt(partizip: string, aux: Aux, reflexive: boolean): Six {
  const auxForms: Six = aux === 'haben'
    ? six('habe', 'hast', 'hat', 'haben', 'habt', 'haben')
    : six('bin', 'bist', 'ist', 'sind', 'seid', 'sind');
  const refl: Six = six('mich', 'dich', 'sich', 'uns', 'euch', 'sich');
  return auxForms.map((a, i) => reflexive ? `${a} ${refl[i]} ${partizip}` : `${a} ${partizip}`) as Six;
}

const WERDEN_PRES: Six = six('werde', 'wirst', 'wird', 'werden', 'werdet', 'werden');
const WUERDE: Six = six('würde', 'würdest', 'würde', 'würden', 'würdet', 'würden');
const K2_REFL: Six = six('mich', 'dich', 'sich', 'uns', 'euch', 'sich');
// Konjunktiv II is analytic (würde + infinitive) for virtually all verbs in
// modern usage; the high-frequency verbs below keep their synthetic forms, which
// are the ones actually spoken ("ich wäre", not "ich würde sein").
const K2_SYNTH: Record<string, Six> = {
  sein:   six('wäre', 'wärst', 'wäre', 'wären', 'wärt', 'wären'),
  haben:  six('hätte', 'hättest', 'hätte', 'hätten', 'hättet', 'hätten'),
  werden: six('würde', 'würdest', 'würde', 'würden', 'würdet', 'würden'),
  können: six('könnte', 'könntest', 'könnte', 'könnten', 'könntet', 'könnten'),
  müssen: six('müsste', 'müsstest', 'müsste', 'müssten', 'müsstet', 'müssten'),
  dürfen: six('dürfte', 'dürftest', 'dürfte', 'dürften', 'dürftet', 'dürften'),
  sollen: six('sollte', 'solltest', 'sollte', 'sollten', 'solltet', 'sollten'),
  wollen: six('wollte', 'wolltest', 'wollte', 'wollten', 'wolltet', 'wollten'),
  mögen:  six('möchte', 'möchtest', 'möchte', 'möchten', 'möchtet', 'möchten'),
  wissen: six('wüsste', 'wüsstest', 'wüsste', 'wüssten', 'wüsstet', 'wüssten'),
};

/** Futur I: werden (present) + infinitive. Correct once the infinitive is known,
 *  independent of strong/weak, and keeps a separable prefix attached (werde ankommen). */
function buildFutur(infinitive: string, reflexive: boolean): Six {
  return WERDEN_PRES.map((w, i) => reflexive ? `${w} ${K2_REFL[i]} ${infinitive}` : `${w} ${infinitive}`) as Six;
}
/** Konjunktiv II (Gegenwart): synthetic for sein/haben/werden/modals/wissen,
 *  else the analytic würde-form (würde + infinitive) — the standard taught form. */
function buildKonjunktiv2(inf: string, infinitive: string, reflexive: boolean): Six {
  const synth = K2_SYNTH[inf];
  if (synth) return (reflexive ? synth.map((f, i) => `${f} ${K2_REFL[i]}`) : synth) as Six;
  return WUERDE.map((w, i) => reflexive ? `${w} ${K2_REFL[i]} ${infinitive}` : `${w} ${infinitive}`) as Six;
}

/** Conjugate any German verb. Never throws. */
export function conjugate(rawVerb: string): Conjugation {
  const { base, reflexive } = deReflex(rawVerb);
  const inf = base.toLowerCase();

  const hit = lookup(inf);
  if (hit) {
    const { entry, prefix, sep } = hit;
    const praesens = !prefix ? entry.praesens : sep ? appendSep(entry.praesens, prefix) : frontAttach(entry.praesens, prefix);
    const praeteritum = !prefix ? entry.praeteritum : sep ? appendSep(entry.praeteritum, prefix) : frontAttach(entry.praeteritum, prefix);
    const partizip = reattachPartizip(entry.partizip, prefix, sep);
    const aux = AUX_OVERRIDE[inf] ?? entry.aux;
    return {
      infinitive: base, reflexive, aux, praesens, praeteritum, partizip,
      perfekt: buildPerfekt(partizip, aux, reflexive),
      futur1: buildFutur(base, reflexive),
      konjunktiv2: buildKonjunktiv2(inf, base, reflexive),
      separable: sep ? prefix : null, source: 'irregular', reliable: true,
    };
  }

  // Regular generation. Separable prefix: only strip when the remainder is a real
  // verb, so "antworten" isn't read as "an"+"tworten". Inseparable prefix: the
  // ge-drop is a reliable rule for the unstressed prefixes, so no base check
  // needed (erzählen→erzählt, beobachten→beobachtet).
  let sep: string | null = null;
  let inseparable = false;
  for (const p of SEPARABLE) { if (inf.startsWith(p) && isKnownRoot(inf.slice(p.length))) { sep = p; break; } }
  if (!sep) for (const p of INSEPARABLE) { if (inf.startsWith(p) && inf.length > p.length + 2) { inseparable = true; break; } }

  const praesens0 = regularPraesens(inf);
  const praeteritum0 = regularPraeteritum(inf);
  const praesens = sep ? appendSep(stripPrefixForms(praesens0, sep), sep) : praesens0;
  const praeteritum = sep ? appendSep(stripPrefixForms(praeteritum0, sep), sep) : praeteritum0;
  const partizip = regularPartizip(inf, sep, inseparable);
  const aux: Aux = AUX_OVERRIDE[inf] ?? 'haben';

  // Reliability gates:
  //  - a strong verb we couldn't table → unreliable (would generate a wrong form)
  //  - an unrecognized infinitive ending → unreliable
  //  - a verb that *starts* like a prefixed verb but whose base we couldn't
  //    confirm (aufräumen, beobachten) → unreliable, rather than guess wrong.
  const looksStrong = isStrong(inf);
  const goodEnding = /(en|eln|ern|n)$/.test(inf);
  // A verb that *looks* separable (starts with a separable prefix, remainder is
  // verb-like) but whose base we couldn't confirm — e.g. aufräumen (räumen not
  // in the lexicon) — would generate a wrong participle/finite form. Flag those.
  let unstrippedSeparable = false;
  if (!sep) {
    for (const p of SEPARABLE) {
      if (inf.startsWith(p) && inf.length > p.length + 2 && /(en|n)$/.test(inf.slice(p.length))) { unstrippedSeparable = true; break; }
    }
  }
  const reliable = !looksStrong && goodEnding && !unstrippedSeparable;

  return {
    infinitive: base, reflexive, aux, praesens, praeteritum, partizip,
    perfekt: buildPerfekt(partizip, aux, reflexive),
    futur1: buildFutur(base, reflexive),
    konjunktiv2: buildKonjunktiv2(inf, base, reflexive),
    separable: sep, source: 'regular', reliable,
  };
}

// When a separable verb is generated regularly, the finite verb is the base
// stem without the prefix, then the prefix moves to the end. regularPraesens
// was computed on the full infinitive, so strip the prefix off the front of
// each finite form before re-appending it.
function stripPrefixForms(forms: Six, prefix: string): Six {
  return forms.map((f) => (f.startsWith(prefix) ? f.slice(prefix.length) : f)) as Six;
}

/** Whether the trainer should drill this verb (we can conjugate it correctly). */
export function canConjugate(rawVerb: string): boolean {
  return conjugate(rawVerb).reliable;
}
