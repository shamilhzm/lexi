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
  // ---- the long tail, from the dictionary ----------------------------------
  // 102 verbs the generator could not vouch for, closed out 2026-08-15. The stems
  // are **not** written from memory: `Präsens_ich/du/er`, `Präteritum_ich`,
  // `Partizip II` and `Hilfsverb` come from each verb's de.wiktionary entry, and
  // only the remaining persons are derived by rule (plural -en/-n, ihr -t, du -st).
  // That follows the pipeline's standing rule that facts are never generated.
  //
  // Two limits worth knowing. The derived persons are rule-based, so a du- or
  // ihr-preterite could be off where German is irregular there — the forms that
  // carry recognition (3sg preterite, participle) are dictionary-exact. And where
  // a prefix is ambiguous, these follow wiktionary's **primary** entry, which may
  // not be the sense the card teaches: `umstellen` here is the inseparable
  // "surround" (umstellte/umstellt), not the separable "rearrange".
  abbiegen: { praesens: six('biege ab','biegst ab','biegt ab','biegen ab','biegt ab','biegen ab'), praeteritum: six('bog ab','bogst ab','bog ab','bogen ab','bogt ab','bogen ab'), partizip: 'abgebogen', aux: 'haben' },
  abhängen: { praesens: six('hänge ab','hängst ab','hängt ab','hängen ab','hängt ab','hängen ab'), praeteritum: six('hing ab','hingst ab','hing ab','hingen ab','hingt ab','hingen ab'), partizip: 'abgehangen', aux: 'haben' },
  abonnieren: { praesens: six('abonniere','abonnierst','abonniert','abonnieren','abonniert','abonnieren'), praeteritum: six('abonnierte','abonniertest','abonnierte','abonnierten','abonniertet','abonnierten'), partizip: 'abonniert', aux: 'haben' },
  absolvieren: { praesens: six('absolviere','absolvierst','absolviert','absolvieren','absolviert','absolvieren'), praeteritum: six('absolvierte','absolviertest','absolvierte','absolvierten','absolviertet','absolvierten'), partizip: 'absolviert', aux: 'haben' },
  analysieren: { praesens: six('analysiere','analysierst','analysiert','analysieren','analysiert','analysieren'), praeteritum: six('analysierte','analysiertest','analysierte','analysierten','analysiertet','analysierten'), partizip: 'analysiert', aux: 'haben' },
  anknüpfen: { praesens: six('knüpfe an','knüpfst an','knüpft an','knüpfen an','knüpft an','knüpfen an'), praeteritum: six('knüpfte an','knüpftest an','knüpfte an','knüpften an','knüpftet an','knüpften an'), partizip: 'angeknüpft', aux: 'haben' },
  anschaffen: { praesens: six('schaffe an','schaffst an','schafft an','schaffen an','schafft an','schaffen an'), praeteritum: six('schaffte an','schafftest an','schaffte an','schafften an','schafftet an','schafften an'), partizip: 'angeschafft', aux: 'haben' },
  anstoßen: { praesens: six('stoße an','stößt an','stößt an','stoßen an','stoßt an','stoßen an'), praeteritum: six('stieß an','stießest an','stieß an','stießen an','stießt an','stießen an'), partizip: 'angestoßen', aux: 'haben' },
  anstrengen: { praesens: six('strenge an','strengst an','strengt an','strengen an','strengt an','strengen an'), praeteritum: six('strengte an','strengtest an','strengte an','strengten an','strengtet an','strengten an'), partizip: 'angestrengt', aux: 'haben' },
  antizipieren: { praesens: six('antizipiere','antizipierst','antizipiert','antizipieren','antizipiert','antizipieren'), praeteritum: six('antizipierte','antizipiertest','antizipierte','antizipierten','antizipiertet','antizipierten'), partizip: 'antizipiert', aux: 'haben' },
  antworten: { praesens: six('antworte','antwortest','antwortet','antworten','antwortet','antworten'), praeteritum: six('antwortete','antwortetest','antwortete','antworteten','antwortetet','antworteten'), partizip: 'geantwortet', aux: 'haben' },
  aufpumpen: { praesens: six('pumpe auf','pumpst auf','pumpt auf','pumpen auf','pumpt auf','pumpen auf'), praeteritum: six('pumpte auf','pumptest auf','pumpte auf','pumpten auf','pumptet auf','pumpten auf'), partizip: 'aufgepumpt', aux: 'haben' },
  auftreten: { praesens: six('trete auf','trittst auf','tritt auf','treten auf','tretet auf','treten auf'), praeteritum: six('trat auf','tratest auf','trat auf','traten auf','tratt auf','traten auf'), partizip: 'aufgetreten', aux: 'sein' },
  ausbreiten: { praesens: six('breite aus','breitest aus','breitet aus','breiten aus','breitet aus','breiten aus'), praeteritum: six('breitete aus','breitetest aus','breitete aus','breiteten aus','breitetet aus','breiteten aus'), partizip: 'ausgebreitet', aux: 'haben' },
  ausflippen: { praesens: six('flippe aus','flippst aus','flippt aus','flippen aus','flippt aus','flippen aus'), praeteritum: six('flippte aus','flipptest aus','flippte aus','flippten aus','flipptet aus','flippten aus'), partizip: 'ausgeflippt', aux: 'sein' },
  ausspannen: { praesens: six('spanne aus','spannst aus','spannt aus','spannen aus','spannt aus','spannen aus'), praeteritum: six('spannte aus','spanntest aus','spannte aus','spannten aus','spanntet aus','spannten aus'), partizip: 'ausgespannt', aux: 'haben' },
  ausweiten: { praesens: six('weite aus','weitest aus','weitet aus','weiten aus','weitet aus','weiten aus'), praeteritum: six('weitete aus','weitetest aus','weitete aus','weiteten aus','weitetet aus','weiteten aus'), partizip: 'ausgeweitet', aux: 'haben' },
  befehlen: { praesens: six('befehle','befiehlst','befiehlt','befehlen','befehlt','befehlen'), praeteritum: six('befahl','befahlst','befahl','befahlen','befahlt','befahlen'), partizip: 'befohlen', aux: 'haben' },
  begleiten: { praesens: six('begleite','begleitest','begleitet','begleiten','begleitet','begleiten'), praeteritum: six('begleitete','begleitetest','begleitete','begleiteten','begleitetet','begleiteten'), partizip: 'begleitet', aux: 'haben' },
  begraben: { praesens: six('begrabe','begräbst','begräbt','begraben','begrabt','begraben'), praeteritum: six('begrub','begrubst','begrub','begruben','begrubt','begruben'), partizip: 'begraben', aux: 'haben' },
  beißen: { praesens: six('beiße','beißt','beißt','beißen','beißt','beißen'), praeteritum: six('biss','bissest','biss','bissen','bisst','bissen'), partizip: 'gebissen', aux: 'haben' },
  bestechen: { praesens: six('besteche','bestichst','besticht','bestechen','bestecht','bestechen'), praeteritum: six('bestach','bestachst','bestach','bestachen','bestacht','bestachen'), partizip: 'bestochen', aux: 'haben' },
  betreiben: { praesens: six('betreibe','betreibst','betreibt','betreiben','betreibt','betreiben'), praeteritum: six('betrieb','betriebst','betrieb','betrieben','betriebt','betrieben'), partizip: 'betrieben', aux: 'haben' },
  betreten: { praesens: six('betrete','betrittst','betritt','betreten','betretet','betreten'), praeteritum: six('betrat','betratest','betrat','betraten','betratt','betraten'), partizip: 'betreten', aux: 'haben' },
  betrügen: { praesens: six('betrüge','betrügst','betrügt','betrügen','betrügt','betrügen'), praeteritum: six('betrog','betrogst','betrog','betrogen','betrogt','betrogen'), partizip: 'betrogen', aux: 'haben' },
  beweisen: { praesens: six('beweise','beweist','beweist','beweisen','beweist','beweisen'), praeteritum: six('bewies','bewiesest','bewies','bewiesen','bewiest','bewiesen'), partizip: 'bewiesen', aux: 'haben' },
  durchführen: { praesens: six('führe durch','führst durch','führt durch','führen durch','führt durch','führen durch'), praeteritum: six('führte durch','führtest durch','führte durch','führten durch','führtet durch','führten durch'), partizip: 'durchgeführt', aux: 'haben' },
  durchgehen: { praesens: six('gehe durch','gehst durch','geht durch','gehen durch','geht durch','gehen durch'), praeteritum: six('ging durch','gingst durch','ging durch','gingen durch','gingt durch','gingen durch'), partizip: 'durchgegangen', aux: 'sein' },
  durchmachen: { praesens: six('mache durch','machst durch','macht durch','machen durch','macht durch','machen durch'), praeteritum: six('machte durch','machtest durch','machte durch','machten durch','machtet durch','machten durch'), partizip: 'durchgemacht', aux: 'haben' },
  durchsetzen: { praesens: six('setze durch','setzt durch','setzt durch','setzen durch','setzt durch','setzen durch'), praeteritum: six('setzte durch','setztest durch','setzte durch','setzten durch','setztet durch','setzten durch'), partizip: 'durchgesetzt', aux: 'haben' },
  durchstehen: { praesens: six('stehe durch','stehst durch','steht durch','stehen durch','steht durch','stehen durch'), praeteritum: six('stand durch','standest durch','stand durch','standen durch','standt durch','standen durch'), partizip: 'durchgestanden', aux: 'haben' },
  einbiegen: { praesens: six('biege ein','biegst ein','biegt ein','biegen ein','biegt ein','biegen ein'), praeteritum: six('bog ein','bogst ein','bog ein','bogen ein','bogt ein','bogen ein'), partizip: 'eingebogen', aux: 'sein' },
  einigen: { praesens: six('einige','einigst','einigt','einigen','einigt','einigen'), praeteritum: six('einigte','einigtest','einigte','einigten','einigtet','einigten'), partizip: 'geeinigt', aux: 'haben' },
  eintreten: { praesens: six('trete ein','trittst ein','tritt ein','treten ein','tretet ein','treten ein'), praeteritum: six('trat ein','tratest ein','trat ein','traten ein','tratt ein','traten ein'), partizip: 'eingetreten', aux: 'haben' },
  erschaffen: { praesens: six('erschaffe','erschaffst','erschafft','erschaffen','erschafft','erschaffen'), praeteritum: six('erschuf','erschufst','erschuf','erschufen','erschuft','erschufen'), partizip: 'erschaffen', aux: 'haben' },
  fliehen: { praesens: six('fliehe','fliehst','flieht','fliehen','flieht','fliehen'), praeteritum: six('floh','flohst','floh','flohen','floht','flohen'), partizip: 'geflohen', aux: 'sein' },
  fließen: { praesens: six('fließe','fließt','fließt','fließen','fließt','fließen'), praeteritum: six('floss','flossest','floss','flossen','flosst','flossen'), partizip: 'geflossen', aux: 'sein' },
  gelingen: { praesens: six('gelinge','gelingst','gelingt','gelingen','gelingt','gelingen'), praeteritum: six('gelang','gelangst','gelang','gelangen','gelangt','gelangen'), partizip: 'gelungen', aux: 'sein' },
  gelten: { praesens: six('gelte','giltst','gilt','gelten','geltet','gelten'), praeteritum: six('galt','galtest','galt','galten','galtt','galten'), partizip: 'gegolten', aux: 'haben' },
  gleiten: { praesens: six('gleite','gleitest','gleitet','gleiten','gleitet','gleiten'), praeteritum: six('glitt','glittest','glitt','glitten','glittt','glitten'), partizip: 'geglitten', aux: 'sein' },
  herrschen: { praesens: six('herrsche','herrschst','herrscht','herrschen','herrscht','herrschen'), praeteritum: six('herrschte','herrschtest','herrschte','herrschten','herrschtet','herrschten'), partizip: 'geherrscht', aux: 'haben' },
  hindern: { praesens: six('hindere','hinderst','hindert','hindern','hindert','hindern'), praeteritum: six('hinderte','hindertest','hinderte','hinderten','hindertet','hinderten'), partizip: 'gehindert', aux: 'haben' },
  hinterfragen: { praesens: six('hinterfrage','hinterfragst','hinterfragt','hinterfragen','hinterfragt','hinterfragen'), praeteritum: six('hinterfragte','hinterfragtest','hinterfragte','hinterfragten','hinterfragtet','hinterfragten'), partizip: 'hinterfragt', aux: 'haben' },
  hinterlegen: { praesens: six('hinterlege','hinterlegst','hinterlegt','hinterlegen','hinterlegt','hinterlegen'), praeteritum: six('hinterlegte','hinterlegtest','hinterlegte','hinterlegten','hinterlegtet','hinterlegten'), partizip: 'hinterlegt', aux: 'haben' },
  hinzufügen: { praesens: six('füge hinzu','fügst hinzu','fügt hinzu','fügen hinzu','fügt hinzu','fügen hinzu'), praeteritum: six('fügte hinzu','fügtest hinzu','fügte hinzu','fügten hinzu','fügtet hinzu','fügten hinzu'), partizip: 'hinzugefügt', aux: 'haben' },
  // Strong: the card's definition leads with "to hang, to be suspended" and its
  // first example is "Das Bild hängt an der Wand". German has a second, weak
  // *hängen* (to hang something up — hängte/gehängt); this card is the
  // intransitive one.
  hängen: { praesens: six('hänge','hängst','hängt','hängen','hängt','hängen'), praeteritum: six('hing','hingst','hing','hingen','hingt','hingen'), partizip: 'gehangen', aux: 'haben' },
  nachvollziehen: { praesens: six('vollziehe nach','vollziehst nach','vollzieht nach','vollziehen nach','vollzieht nach','vollziehen nach'), praeteritum: six('vollzog nach','vollzogst nach','vollzog nach','vollzogen nach','vollzogt nach','vollzogen nach'), partizip: 'nachvollzogen', aux: 'haben' },
  nachweisen: { praesens: six('weise nach','weist nach','weist nach','weisen nach','weist nach','weisen nach'), praeteritum: six('wies nach','wiesest nach','wies nach','wiesen nach','wiest nach','wiesen nach'), partizip: 'nachgewiesen', aux: 'haben' },
  reißen: { praesens: six('reiße','reißt','reißt','reißen','reißt','reißen'), praeteritum: six('riss','rissest','riss','rissen','risst','rissen'), partizip: 'gerissen', aux: 'haben' },
  schaffen: { praesens: six('schaffe','schaffst','schafft','schaffen','schafft','schaffen'), praeteritum: six('schuf','schufst','schuf','schufen','schuft','schufen'), partizip: 'geschaffen', aux: 'haben' },
  schieben: { praesens: six('schiebe','schiebst','schiebt','schieben','schiebt','schieben'), praeteritum: six('schob','schobst','schob','schoben','schobt','schoben'), partizip: 'geschoben', aux: 'haben' },
  schweigen: { praesens: six('schweige','schweigst','schweigt','schweigen','schweigt','schweigen'), praeteritum: six('schwieg','schwiegst','schwieg','schwiegen','schwiegt','schwiegen'), partizip: 'geschwiegen', aux: 'haben' },
  schwören: { praesens: six('schwöre','schwörst','schwört','schwören','schwört','schwören'), praeteritum: six('schwor','schworst','schwor','schworen','schwort','schworen'), partizip: 'geschworen', aux: 'haben' },
  senden: { praesens: six('sende','sendest','sendet','senden','sendet','senden'), praeteritum: six('sendete','sendetest','sendete','sendeten','sendetet','sendeten'), partizip: 'gesendet', aux: 'haben' },
  sinken: { praesens: six('sinke','sinkst','sinkt','sinken','sinkt','sinken'), praeteritum: six('sank','sankst','sank','sanken','sankt','sanken'), partizip: 'gesunken', aux: 'sein' },
  stehlen: { praesens: six('stehle','stiehlst','stiehlt','stehlen','stehlt','stehlen'), praeteritum: six('stahl','stahlst','stahl','stahlen','stahlt','stahlen'), partizip: 'gestohlen', aux: 'haben' },
  stoßen: { praesens: six('stoße','stößt','stößt','stoßen','stoßt','stoßen'), praeteritum: six('stieß','stießest','stieß','stießen','stießt','stießen'), partizip: 'gestoßen', aux: 'haben' },
  streichen: { praesens: six('streiche','streichst','streicht','streichen','streicht','streichen'), praeteritum: six('strich','strichst','strich','strichen','stricht','strichen'), partizip: 'gestrichen', aux: 'haben' },
  treiben: { praesens: six('treibe','treibst','treibt','treiben','treibt','treiben'), praeteritum: six('trieb','triebst','trieb','trieben','triebt','trieben'), partizip: 'getrieben', aux: 'haben' },
  treten: { praesens: six('trete','trittst','tritt','treten','tretet','treten'), praeteritum: six('trat','tratest','trat','traten','tratt','traten'), partizip: 'getreten', aux: 'haben' },
  umbringen: { praesens: six('bringe um','bringst um','bringt um','bringen um','bringt um','bringen um'), praeteritum: six('brachte um','brachtest um','brachte um','brachten um','brachtet um','brachten um'), partizip: 'umgebracht', aux: 'haben' },
  umdrehen: { praesens: six('drehe um','drehst um','dreht um','drehen um','dreht um','drehen um'), praeteritum: six('drehte um','drehtest um','drehte um','drehten um','drehtet um','drehten um'), partizip: 'umgedreht', aux: 'haben' },
  umfassen: { praesens: six('umfasse','umfasst','umfasst','umfassen','umfasst','umfassen'), praeteritum: six('umfasste','umfasstest','umfasste','umfassten','umfasstet','umfassten'), partizip: 'umfasst', aux: 'haben' },
  // Inseparable: *umgeben* is to surround. The generated split produced
  // "gabst um", which is the separable reading German does not use here —
  // caught by checking the full Flexion paradigm rather than the summary box.
  umgeben: { praesens: six('umgebe','umgibst','umgibt','umgeben','umgebt','umgeben'), praeteritum: six('umgab','umgabst','umgab','umgaben','umgabt','umgaben'), partizip: 'umgeben', aux: 'haben' },
  umkommen: { praesens: six('komme um','kommst um','kommt um','kommen um','kommt um','kommen um'), praeteritum: six('kam um','kamst um','kam um','kamen um','kamt um','kamen um'), partizip: 'umgekommen', aux: 'sein' },
  umschauen: { praesens: six('schaue um','schaust um','schaut um','schauen um','schaut um','schauen um'), praeteritum: six('schaute um','schautest um','schaute um','schauten um','schautet um','schauten um'), partizip: 'umgeschaut', aux: 'haben' },
  umsehen: { praesens: six('sehe um','siehst um','sieht um','sehen um','seht um','sehen um'), praeteritum: six('sah um','sahst um','sah um','sahen um','saht um','sahen um'), partizip: 'umgesehen', aux: 'haben' },
  umsetzen: { praesens: six('setze um','setzt um','setzt um','setzen um','setzt um','setzen um'), praeteritum: six('setzte um','setztest um','setzte um','setzten um','setztet um','setzten um'), partizip: 'umgesetzt', aux: 'haben' },
  // Separable — the card teaches "rearrange / switch over" and its own example
  // reads "die Möbel … umgestellt". The inseparable *umstéllen* (to surround,
  // umstellte/umstellt) is a different verb and was what the dictionary's primary
  // entry gave.
  umstellen: { praesens: six('stelle um','stellst um','stellt um','stellen um','stellt um','stellen um'), praeteritum: six('stellte um','stelltest um','stellte um','stellten um','stelltet um','stellten um'), partizip: 'umgestellt', aux: 'haben' },
  umstrukturieren: { praesens: six('strukturiere um','strukturierst um','strukturiert um','strukturieren um','strukturiert um','strukturieren um'), praeteritum: six('strukturierte um','strukturiertest um','strukturierte um','strukturierten um','strukturiertet um','strukturierten um'), partizip: 'umstrukturiert', aux: 'haben' },
  unterbrechen: { praesens: six('unterbreche','unterbrichst','unterbricht','unterbrechen','unterbrecht','unterbrechen'), praeteritum: six('unterbrach','unterbrachst','unterbrach','unterbrachen','unterbracht','unterbrachen'), partizip: 'unterbrochen', aux: 'haben' },
  unterhalten: { praesens: six('unterhalte','unterhältst','unterhält','unterhalten','unterhaltet','unterhalten'), praeteritum: six('unterhielt','unterhieltest','unterhielt','unterhielten','unterhieltt','unterhielten'), partizip: 'unterhalten', aux: 'haben' },
  unterliegen: { praesens: six('unterliege','unterliegst','unterliegt','unterliegen','unterliegt','unterliegen'), praeteritum: six('unterlag','unterlagst','unterlag','unterlagen','unterlagt','unterlagen'), partizip: 'unterlegen', aux: 'haben' },
  unterrichten: { praesens: six('unterrichte','unterrichtest','unterrichtet','unterrichten','unterrichtet','unterrichten'), praeteritum: six('unterrichtete','unterrichtetest','unterrichtete','unterrichteten','unterrichtetet','unterrichteten'), partizip: 'unterrichtet', aux: 'haben' },
  verschaffen: { praesens: six('verschaffe','verschaffst','verschafft','verschaffen','verschafft','verschaffen'), praeteritum: six('verschaffte','verschafftest','verschaffte','verschafften','verschafftet','verschafften'), partizip: 'verschafft', aux: 'haben' },
  verschieben: { praesens: six('verschiebe','verschiebst','verschiebt','verschieben','verschiebt','verschieben'), praeteritum: six('verschob','verschobst','verschob','verschoben','verschobt','verschoben'), partizip: 'verschoben', aux: 'haben' },
  verschwinden: { praesens: six('verschwinde','verschwindest','verschwindet','verschwinden','verschwindet','verschwinden'), praeteritum: six('verschwand','verschwandest','verschwand','verschwanden','verschwandt','verschwanden'), partizip: 'verschwunden', aux: 'sein' },
  vertreiben: { praesens: six('vertreibe','vertreibst','vertreibt','vertreiben','vertreibt','vertreiben'), praeteritum: six('vertrieb','vertriebst','vertrieb','vertrieben','vertriebt','vertrieben'), partizip: 'vertrieben', aux: 'haben' },
  vertreten: { praesens: six('vertrete','vertrittst','vertritt','vertreten','vertretet','vertreten'), praeteritum: six('vertrat','vertratest','vertrat','vertraten','vertratt','vertraten'), partizip: 'vertreten', aux: 'haben' },
  verwenden: { praesens: six('verwende','verwendest','verwendet','verwenden','verwendet','verwenden'), praeteritum: six('verwendete','verwendetest','verwendete','verwendeten','verwendetet','verwendeten'), partizip: 'verwendet', aux: 'haben' },
  vorhersagen: { praesens: six('sage vorher','sagst vorher','sagt vorher','sagen vorher','sagt vorher','sagen vorher'), praeteritum: six('sagte vorher','sagtest vorher','sagte vorher','sagten vorher','sagtet vorher','sagten vorher'), partizip: 'vorhergesagt', aux: 'haben' },
  widerlegen: { praesens: six('widerlege','widerlegst','widerlegt','widerlegen','widerlegt','widerlegen'), praeteritum: six('widerlegte','widerlegtest','widerlegte','widerlegten','widerlegtet','widerlegten'), partizip: 'widerlegt', aux: 'haben' },
  // `splitPrefix` only goes one level: it looks for TABLE[inf minus prefix], and
  // *erkennen* is not tabled — it resolves through its own er- split. So
  // *anerkennen* found no strong entry and the weak generator produced
  // **«anerkennt»**, marked reliable. Tabled here for the same reason
  // *wiedererkennen* below is: a two-prefix verb needs its own row.
  anerkennen: { praesens: six('erkenne an','erkennst an','erkennt an','erkennen an','erkennt an','erkennen an'), praeteritum: six('erkannte an','erkanntest an','erkannte an','erkannten an','erkanntet an','erkannten an'), partizip: 'anerkannt', aux: 'haben' },
  wiedererkennen: { praesens: six('erkenne wieder','erkennst wieder','erkennt wieder','erkennen wieder','erkennt wieder','erkennen wieder'), praeteritum: six('erkannte wieder','erkanntest wieder','erkannte wieder','erkannten wieder','erkanntet wieder','erkannten wieder'), partizip: 'wiedererkannt', aux: 'haben' },
  wiederverwenden: { praesens: six('verwende wieder','verwendest wieder','verwendet wieder','verwenden wieder','verwendet wieder','verwenden wieder'), praeteritum: six('verwendete wieder','verwendetest wieder','verwendete wieder','verwendeten wieder','verwendetet wieder','verwendeten wieder'), partizip: 'wiederverwendet', aux: 'haben' },
  zuwinken: { praesens: six('winke zu','winkst zu','winkt zu','winken zu','winkt zu','winken zu'), praeteritum: six('winkte zu','winktest zu','winkte zu','winkten zu','winktet zu','winkten zu'), partizip: 'zugewinkt', aux: 'haben' },
  zwingen: { praesens: six('zwinge','zwingst','zwingt','zwingen','zwingt','zwingen'), praeteritum: six('zwang','zwangst','zwang','zwangen','zwangt','zwangen'), partizip: 'gezwungen', aux: 'haben' },
  überfahren: { praesens: six('überfahre','überfährst','überfährt','überfahren','überfahrt','überfahren'), praeteritum: six('überfuhr','überfuhrst','überfuhr','überfuhren','überfuhrt','überfuhren'), partizip: 'überfahren', aux: 'haben' },
  überfallen: { praesens: six('überfalle','überfällst','überfällt','überfallen','überfallt','überfallen'), praeteritum: six('überfiel','überfielst','überfiel','überfielen','überfielt','überfielen'), partizip: 'überfallen', aux: 'haben' },
  überfliegen: { praesens: six('überfliege','überfliegst','überfliegt','überfliegen','überfliegt','überfliegen'), praeteritum: six('überflog','überflogst','überflog','überflogen','überflogt','überflogen'), partizip: 'überflogen', aux: 'haben' },
  übergeben: { praesens: six('übergebe','übergibst','übergibt','übergeben','übergebt','übergeben'), praeteritum: six('übergab','übergabst','übergab','übergaben','übergabt','übergaben'), partizip: 'übergeben', aux: 'haben' },
  überholen: { praesens: six('überhole','überholst','überholt','überholen','überholt','überholen'), praeteritum: six('überholte','überholtest','überholte','überholten','überholtet','überholten'), partizip: 'überholt', aux: 'haben' },
  überlassen: { praesens: six('überlasse','überlässt','überlässt','überlassen','überlasst','überlassen'), praeteritum: six('überließ','überließest','überließ','überließen','überließt','überließen'), partizip: 'überlassen', aux: 'haben' },
  überleben: { praesens: six('überlebe','überlebst','überlebt','überleben','überlebt','überleben'), praeteritum: six('überlebte','überlebtest','überlebte','überlebten','überlebtet','überlebten'), partizip: 'überlebt', aux: 'haben' },
  überprüfen: { praesens: six('überprüfe','überprüfst','überprüft','überprüfen','überprüft','überprüfen'), praeteritum: six('überprüfte','überprüftest','überprüfte','überprüften','überprüftet','überprüften'), partizip: 'überprüft', aux: 'haben' },
  überreden: { praesens: six('überrede','überredest','überredet','überreden','überredet','überreden'), praeteritum: six('überredete','überredetest','überredete','überredeten','überredetet','überredeten'), partizip: 'überredet', aux: 'haben' },
  überschreiten: { praesens: six('überschreite','überschreitest','überschreitet','überschreiten','überschreitet','überschreiten'), praeteritum: six('überschritt','überschrittest','überschritt','überschritten','überschrittt','überschritten'), partizip: 'überschritten', aux: 'haben' },
  übersehen: { praesens: six('übersehe','übersiehst','übersieht','übersehen','überseht','übersehen'), praeteritum: six('übersah','übersahst','übersah','übersahen','übersaht','übersahen'), partizip: 'übersehen', aux: 'haben' },
  überstehen: { praesens: six('überstehe','überstehst','übersteht','überstehen','übersteht','überstehen'), praeteritum: six('überstand','überstandest','überstand','überstanden','überstandt','überstanden'), partizip: 'überstanden', aux: 'haben' },
  übertragen: { praesens: six('übertrage','überträgst','überträgt','übertragen','übertragt','übertragen'), praeteritum: six('übertrug','übertrugst','übertrug','übertrugen','übertrugt','übertrugen'), partizip: 'übertragen', aux: 'haben' },
  überwachen: { praesens: six('überwache','überwachst','überwacht','überwachen','überwacht','überwachen'), praeteritum: six('überwachte','überwachtest','überwachte','überwachten','überwachtet','überwachten'), partizip: 'überwacht', aux: 'haben' },
  überwiegen: { praesens: six('überwiege','überwiegst','überwiegt','überwiegen','überwiegt','überwiegen'), praeteritum: six('überwog','überwogst','überwog','überwogen','überwogt','überwogen'), partizip: 'überwogen', aux: 'haben' },
  überwinden: { praesens: six('überwinde','überwindest','überwindet','überwinden','überwindet','überwinden'), praeteritum: six('überwand','überwandest','überwand','überwanden','überwandt','überwanden'), partizip: 'überwunden', aux: 'haben' },

  // ---- strong roots -------------------------------------------------------
  // Adding a root cascades: `greifen` alone rescues *ergreifen*, *angreifen*,
  // *begreifen* and *aufgreifen*, because `splitPrefix` finds the tabled root
  // behind the prefix. These are the roots the corpus builds on, which is why
  // they earn a row before rarer strong verbs do.
  //
  // `aux` is the one field a prefixed form can inherit wrongly — *treten* is
  // haben in *betreten* and sein in *eintreten* — so verbs whose auxiliary
  // depends on the prefix are deliberately left out rather than guessed.
  greifen:   { praesens: six('greife','greifst','greift','greifen','greift','greifen'), praeteritum: six('griff','griffst','griff','griffen','grifft','griffen'), partizip: 'gegriffen', aux: 'haben' },
  schneiden: { praesens: six('schneide','schneidest','schneidet','schneiden','schneidet','schneiden'), praeteritum: six('schnitt','schnittst','schnitt','schnitten','schnittet','schnitten'), partizip: 'geschnitten', aux: 'haben' },
  messen:    { praesens: six('messe','misst','misst','messen','messt','messen'), praeteritum: six('maß','maßest','maß','maßen','maßt','maßen'), partizip: 'gemessen', aux: 'haben' },
  genießen:  { praesens: six('genieße','genießt','genießt','genießen','genießt','genießen'), praeteritum: six('genoss','genossest','genoss','genossen','genosst','genossen'), partizip: 'genossen', aux: 'haben' },
  brechen:   { praesens: six('breche','brichst','bricht','brechen','brecht','brechen'), praeteritum: six('brach','brachst','brach','brachen','bracht','brachen'), partizip: 'gebrochen', aux: 'haben' },
  schießen:  { praesens: six('schieße','schießt','schießt','schießen','schießt','schießen'), praeteritum: six('schoss','schossest','schoss','schossen','schosst','schossen'), partizip: 'geschossen', aux: 'haben' },
  schreien:  { praesens: six('schreie','schreist','schreit','schreien','schreit','schreien'), praeteritum: six('schrie','schriest','schrie','schrien','schriet','schrien'), partizip: 'geschrien', aux: 'haben' },
  fressen:   { praesens: six('fresse','frisst','frisst','fressen','fresst','fressen'), praeteritum: six('fraß','fraßest','fraß','fraßen','fraßt','fraßen'), partizip: 'gefressen', aux: 'haben' },
  brennen:   { praesens: six('brenne','brennst','brennt','brennen','brennt','brennen'), praeteritum: six('brannte','branntest','brannte','brannten','branntet','brannten'), partizip: 'gebrannt', aux: 'haben' },
  wiegen:    { praesens: six('wiege','wiegst','wiegt','wiegen','wiegt','wiegen'), praeteritum: six('wog','wogst','wog','wogen','wogt','wogen'), partizip: 'gewogen', aux: 'haben' },
  heben:     { praesens: six('hebe','hebst','hebt','heben','hebt','heben'), praeteritum: six('hob','hobst','hob','hoben','hobt','hoben'), partizip: 'gehoben', aux: 'haben' },
  binden:    { praesens: six('binde','bindest','bindet','binden','bindet','binden'), praeteritum: six('band','bandest','band','banden','bandet','banden'), partizip: 'gebunden', aux: 'haben' },
  meiden:    { praesens: six('meide','meidest','meidet','meiden','meidet','meiden'), praeteritum: six('mied','miedest','mied','mieden','miedet','mieden'), partizip: 'gemieden', aux: 'haben' },
  klingen:   { praesens: six('klinge','klingst','klingt','klingen','klingt','klingen'), praeteritum: six('klang','klangst','klang','klangen','klangt','klangen'), partizip: 'geklungen', aux: 'haben' },
  frieren:   { praesens: six('friere','frierst','friert','frieren','friert','frieren'), praeteritum: six('fror','frorst','fror','froren','frort','froren'), partizip: 'gefroren', aux: 'haben' },
  leiden:    { praesens: six('leide','leidest','leidet','leiden','leidet','leiden'), praeteritum: six('litt','littst','litt','litten','littet','litten'), partizip: 'gelitten', aux: 'haben' },
  riechen:   { praesens: six('rieche','riechst','riecht','riechen','riecht','riechen'), praeteritum: six('roch','rochst','roch','rochen','rocht','rochen'), partizip: 'gerochen', aux: 'haben' },
  leihen:    { praesens: six('leihe','leihst','leiht','leihen','leiht','leihen'), praeteritum: six('lieh','liehst','lieh','liehen','lieht','liehen'), partizip: 'geliehen', aux: 'haben' },
  braten:    { praesens: six('brate','brätst','brät','braten','bratet','braten'), praeteritum: six('briet','brietst','briet','brieten','brietet','brieten'), partizip: 'gebraten', aux: 'haben' },
  backen:    { praesens: six('backe','backst','backt','backen','backt','backen'), praeteritum: six('backte','backtest','backte','backten','backtet','backten'), partizip: 'gebacken', aux: 'haben' },
  wägen:     { praesens: six('wäge','wägst','wägt','wägen','wägt','wägen'), praeteritum: six('wog','wogst','wog','wogen','wogt','wogen'), partizip: 'gewogen', aux: 'haben' },
  reiten:    { praesens: six('reite','reitest','reitet','reiten','reitet','reiten'), praeteritum: six('ritt','rittst','ritt','ritten','rittet','ritten'), partizip: 'geritten', aux: 'sein' },
  springen:  { praesens: six('springe','springst','springt','springen','springt','springen'), praeteritum: six('sprang','sprangst','sprang','sprangen','sprangt','sprangen'), partizip: 'gesprungen', aux: 'sein' },
  wachsen:   { praesens: six('wachse','wächst','wächst','wachsen','wachst','wachsen'), praeteritum: six('wuchs','wuchsest','wuchs','wuchsen','wuchst','wuchsen'), partizip: 'gewachsen', aux: 'sein' },
  sterben:   { praesens: six('sterbe','stirbst','stirbt','sterben','sterbt','sterben'), praeteritum: six('starb','starbst','starb','starben','starbt','starben'), partizip: 'gestorben', aux: 'sein' },
  weichen:   { praesens: six('weiche','weichst','weicht','weichen','weicht','weichen'), praeteritum: six('wich','wichst','wich','wichen','wicht','wichen'), partizip: 'gewichen', aux: 'sein' },
  // `frieren` is haben (*mich hat gefroren*); `gefrieren` is sein (*das Wasser ist
  // gefroren*). Inheriting the root's auxiliary would have got this one wrong —
  // the risk the note above names, caught by reading the 42 forms the roots
  // unlocked rather than by trusting the note.
  gefrieren: { praesens: six('gefriere','gefrierst','gefriert','gefrieren','gefriert','gefrieren'), praeteritum: six('gefror','gefrorst','gefror','gefroren','gefrort','gefroren'), partizip: 'gefroren', aux: 'sein' },

  // ---- verbs behind an ambiguous prefix -------------------------------------
  // `über`, `unter`, `um`, `durch` and `wieder` are neither in SEPARABLE nor in
  // INSEPARABLE, because German uses them both ways — *umschreiben* genuinely has
  // a separable reading (rewrite) and an inseparable one (paraphrase). So
  // `splitPrefix` never reaches the tabled root, and `umsteigen` came out as
  // *umsteigte*. The ambiguity is real and cannot be resolved by rule, so it is
  // resolved by data: full forms, one verb at a time.
  //
  // The weak members of the family need to be here too. A first draft claimed they
  // "already conjugate correctly once the prefix is treated as inseparable" — they
  // do not: *übersetzen* produced **geübersetzt**, *wiederholen* **gewiederholt**,
  // *überlegen* **geüberlegt**. The gate kept those out of the index, so nothing
  // wrong was ever shown, but nothing right was shown either. Their participles
  // take no `ge-` (the prefix is unstressed), and *umtauschen* is the separable one
  // that does: **umgetauscht**.
  umsteigen:      { praesens: six('steige um','steigst um','steigt um','steigen um','steigt um','steigen um'), praeteritum: six('stieg um','stiegst um','stieg um','stiegen um','stiegt um','stiegen um'), partizip: 'umgestiegen', aux: 'sein' },
  umziehen:       { praesens: six('ziehe um','ziehst um','zieht um','ziehen um','zieht um','ziehen um'), praeteritum: six('zog um','zogst um','zog um','zogen um','zogt um','zogen um'), partizip: 'umgezogen', aux: 'sein' },
  umgehen:        { praesens: six('gehe um','gehst um','geht um','gehen um','geht um','gehen um'), praeteritum: six('ging um','gingst um','ging um','gingen um','gingt um','gingen um'), partizip: 'umgegangen', aux: 'sein' },
  durchfallen:    { praesens: six('falle durch','fällst durch','fällt durch','fallen durch','fallt durch','fallen durch'), praeteritum: six('fiel durch','fielst durch','fiel durch','fielen durch','fielt durch','fielen durch'), partizip: 'durchgefallen', aux: 'sein' },
  übernehmen:     { praesens: six('übernehme','übernimmst','übernimmt','übernehmen','übernehmt','übernehmen'), praeteritum: six('übernahm','übernahmst','übernahm','übernahmen','übernahmt','übernahmen'), partizip: 'übernommen', aux: 'haben' },
  unternehmen:    { praesens: six('unternehme','unternimmst','unternimmt','unternehmen','unternehmt','unternehmen'), praeteritum: six('unternahm','unternahmst','unternahm','unternahmen','unternahmt','unternahmen'), partizip: 'unternommen', aux: 'haben' },
  unterschreiben: { praesens: six('unterschreibe','unterschreibst','unterschreibt','unterschreiben','unterschreibt','unterschreiben'), praeteritum: six('unterschrieb','unterschriebst','unterschrieb','unterschrieben','unterschriebt','unterschrieben'), partizip: 'unterschrieben', aux: 'haben' },
  unterscheiden:  { praesens: six('unterscheide','unterscheidest','unterscheidet','unterscheiden','unterscheidet','unterscheiden'), praeteritum: six('unterschied','unterschiedst','unterschied','unterschieden','unterschiedet','unterschieden'), partizip: 'unterschieden', aux: 'haben' },
  überweisen:     { praesens: six('überweise','überweist','überweist','überweisen','überweist','überweisen'), praeteritum: six('überwies','überwiesest','überwies','überwiesen','überwiest','überwiesen'), partizip: 'überwiesen', aux: 'haben' },
  umschreiben:    { praesens: six('umschreibe','umschreibst','umschreibt','umschreiben','umschreibt','umschreiben'), praeteritum: six('umschrieb','umschriebst','umschrieb','umschrieben','umschriebt','umschrieben'), partizip: 'umschrieben', aux: 'haben' },
  übersetzen:     { praesens: six('übersetze','übersetzt','übersetzt','übersetzen','übersetzt','übersetzen'), praeteritum: six('übersetzte','übersetztest','übersetzte','übersetzten','übersetztet','übersetzten'), partizip: 'übersetzt', aux: 'haben' },
  wiederholen:    { praesens: six('wiederhole','wiederholst','wiederholt','wiederholen','wiederholt','wiederholen'), praeteritum: six('wiederholte','wiederholtest','wiederholte','wiederholten','wiederholtet','wiederholten'), partizip: 'wiederholt', aux: 'haben' },
  überlegen:      { praesens: six('überlege','überlegst','überlegt','überlegen','überlegt','überlegen'), praeteritum: six('überlegte','überlegtest','überlegte','überlegten','überlegtet','überlegten'), partizip: 'überlegt', aux: 'haben' },
  untersuchen:    { praesens: six('untersuche','untersuchst','untersucht','untersuchen','untersucht','untersuchen'), praeteritum: six('untersuchte','untersuchtest','untersuchte','untersuchten','untersuchtet','untersuchten'), partizip: 'untersucht', aux: 'haben' },
  überzeugen:     { praesens: six('überzeuge','überzeugst','überzeugt','überzeugen','überzeugt','überzeugen'), praeteritum: six('überzeugte','überzeugtest','überzeugte','überzeugten','überzeugtet','überzeugten'), partizip: 'überzeugt', aux: 'haben' },
  umtauschen:     { praesens: six('tausche um','tauschst um','tauscht um','tauschen um','tauscht um','tauschen um'), praeteritum: six('tauschte um','tauschtest um','tauschte um','tauschten um','tauschtet um','tauschten um'), partizip: 'umgetauscht', aux: 'haben' },
  // Inseparable (überréichen, to present formally), so no `ge-`. Added 2026-08-24:
  // the gate was correctly refusing it — unsplittable and therefore unreliable —
  // which kept **geüberreicht** off the screen but also kept the card out of the
  // corpus. A table row is the file's own answer for an ambiguous prefix.
  überreichen:    { praesens: six('überreiche','überreichst','überreicht','überreichen','überreicht','überreichen'), praeteritum: six('überreichte','überreichtest','überreichte','überreichten','überreichtet','überreichten'), partizip: 'überreicht', aux: 'haben' },
  // Separable, but the participle takes no `ge-`: it attaches to *bereitet*, whose
  // own unstressed `be-` already suppresses it. The generator produced
  // **gevorbereitet**, which is why `bereiten` is not in SEED_ROOTS.
  vorbereiten:    { praesens: six('bereite vor','bereitest vor','bereitet vor','bereiten vor','bereitet vor','bereiten vor'), praeteritum: six('bereitete vor','bereitetest vor','bereitete vor','bereiteten vor','bereitetet vor','bereiteten vor'), partizip: 'vorbereitet', aux: 'haben' },
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

// Known simple verbs, used to avoid false prefix splits: "antworten" must not be
// read as "an" + "tworten".
//
// Seeded from the lexicon at app start — and that alone was not enough. A prefixed
// verb is only split when its **root** is known, so `aufräumen`, `einordnen` and
// `zurückkehren` were all left unsplit and therefore `reliable: false`, purely
// because *räumen*, *ordnen* and *kehren* are not themselves cards. Measured
// 2026-08-15: 52 distinct roots missing this way. The learner then met a verb whose
// preterite and participle resolved nowhere.
//
// These are roots, not cards: German verbs that exist whether or not Lexi teaches
// them. Adding one can only *confirm* a split the code already suspected — it can
// never invent one, because the prefix must also match — and a strong root stays
// gated by `isStrong`, so `abheben` does not become reliable just because *heben*
// is listed here.
const SEED_ROOTS = [
  // bases of separable verbs the corpus teaches but whose root it does not
  'kehren', 'fassen', 'räumen', 'ordnen', 'melden', 'füllen', 'passen', 'klicken',
  'schauen', 'zahlen', 'suchen', 'reichen', 'bauen', 'zeichnen',
  'klären', 'grenzen', 'decken', 'lehnen', 'weisen', 'schränken', 'dämmen',
  'wachen', 'ruhen', 'zünden', 'regen', 'beugen', 'heitern', 'hellen', 'kurbeln',
  'hetzen', 'tönen', 'winken', 'checken', 'probieren',
  // Three roots the corpus stopped carding, or never did — added 2026-08-25 when
  // the reflexive drill gate opened and three cards came out unconjugatable:
  // *sich aneignen* built **«aneigne» / «geaneignet»**, *sich abkühlen* and
  // *sich hineinversetzen* the same shape.
  //
  // `eignen` is the one worth remembering: it **was** a card that morning, and a
  // merge retired it into `sich eignen für + A`. `setKnownVerbs` is seeded from
  // the corpus, so retiring a card silently removed the root a *different* card's
  // prefix split depended on. A merge is a schedule migration and also, it turns
  // out, a conjugation change. See LESSONS.
  'eignen', 'kühlen', 'versetzen',
  // `fühlen` is a genuine weak verb that Lexi happens not to card, so `wohlfühlen`
  // and `mitfühlen` had no root to split on. Added 2026-08-24 with `wohl`.
  'fühlen',
  // `händigen` is a bound root — modern German has only *aushändigen* and
  // *einhändigen*, never the bare verb — but it is exactly what those two split on,
  // and without it both came out as **geaushändigt**. Listing it can only confirm a
  // split the prefix already licensed, per the note above; it cannot invent one.
  'händigen',
  // very common bases that anchor many prefixed forms
  'machen', 'kaufen', 'hören', 'sagen', 'führen', 'setzen', 'stellen', 'legen',
  'schalten', 'holen', 'zeigen', 'danken', 'wohnen', 'lernen', 'leben', 'spielen',
  'arbeiten', 'kochen', 'packen', 'drehen', 'schicken', 'rechnen', 'buchen',
  // Strong bases are **deliberately absent**. The first draft listed them on the
  // reasoning that `isStrong` would still gate anything built on them — which is
  // true for `abheben` (prefix `ab` is in GATE_PREFIXES) and false for
  // `hervorheben`, which came out as *hebte hervor / hervorgehebt*. Four of the 89
  // verbs the seed unlocked were wrong that way — `hervorheben`, `ausweichen`
  // (wich aus), `abwägen` (wog ab) — and `bereiten` produced *vorgebereitet* for
  // a participle that takes no -ge-. A root goes in this list only when it is weak
  // and its prefixed forms have been read by eye.
];

let KNOWN: Set<string> = new Set(SEED_ROOTS);
export function setKnownVerbs(infinitives: Iterable<string>) {
  KNOWN = new Set([...SEED_ROOTS, ...[...infinitives].map((v) => v.replace(/^sich\s+/i, '').toLowerCase())]);
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
const GATE_PREFIXES = [...INSEPARABLE, ...['ab', 'an', 'auf', 'aus', 'bei', 'durch', 'ein', 'frei', 'gegen', 'hinter', 'los', 'mit', 'nach', 'über', 'um', 'unter', 'vor', 'voll', 'weg', 'wider', 'wieder', 'zer', 'zu', 'zurück', 'zusammen', 'her', 'hin']];
// Prefixes that are separable in one verb and inseparable in the next, with no
// rule that decides which: *übersetzen* is "translate" (übersetzt) or "ferry
// across" (setzt über) depending on stress alone. They are kept out of SEPARABLE
// below so the separable machinery never guesses — but keeping them out was only
// half the job, because the *regular* generator then ran on the full infinitive
// and produced `ge` + infinitive: **geübersetzt, geunterstützt, gewiederholt,
// geüberzeugt**. Twenty-eight corpus verbs, every one `reliable: true`, every one
// drilled. No reading of German produces those forms — the separable reading
// would be *übergesetzt* — so this is not a wrong guess between two options but a
// form that is wrong under both.
//
// They are now a reliability gate. The present tense still resolves for reading
// through `recognitionPraesens`, where the regular forms are correct for the
// inseparable reading; what stops is drilling a participle nobody can write.
const AMBIGUOUS_PREFIXES = ['über', 'unter', 'um', 'durch', 'wieder', 'voll', 'hinter', 'wider'];

// Unambiguously separable prefixes (those that can be either, like über/unter/um/durch,
// are deliberately excluded so we don't guess wrong; such verbs fall back to the table only).
const SEPARABLE = [
  'ab', 'an', 'auf', 'aus', 'bei', 'dar', 'ein', 'empor', 'fern', 'fest', 'fort', 'her', 'herab', 'heran',
  'frei', 'herauf', 'heraus', 'herbei', 'herein', 'herum', 'herunter', 'hervor', 'hin', 'hinauf', 'hinaus',
  'hinein', 'hinunter', 'hinweg', 'hinzu', 'los', 'mit', 'nach', 'nieder', 'statt', 'teil', 'überein',
  // `entgegen` must be listed, and listed as a whole: without it *entgegenwirken*
  // matched the **inseparable** `ent` instead, and came back «entgegenwirkt» —
  // reliable, and missing its ge-. German is *entgegengewirkt*. The lists are
  // scanned longest-first below, so this cannot shadow `ent` for a verb that
  // really is ent-prefixed.
  'entgegen',
  'vor', 'voran', 'voraus',
  'vorbei', 'weg', 'weiter', 'zu', 'zurecht', 'zurück', 'zusammen',
  // Added 2026-08-24. Missing from the list, so `splitPrefix` never fired and the
  // weak generator treated the whole compound as a simplex — while still reporting
  // `reliable: true`, which is how a wrong form reached the drill rather than being
  // gated out. `gegenüberstellen` came out **gegenüberstellt** (C1, and offered by
  // the conjugation drill today); `wohlfühlen` came out **gewohlfühlt**.
  'gegenüber', 'wohl',
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
    // A doubled m/n is not "a consonant before m/n" in the sense this rule means.
    // The epenthetic -e- exists to make an unpronounceable cluster sayable —
    // *atm-st*, *öffn-st*, *rechn-st* — and a geminate is already sayable:
    // stimmen → du stimmst, gewinnen → er gewinnt, summen → es summt. Without
    // this line `stimmen` conjugated to *stimmest / stimmet*, which are the
    // Konjunktiv I forms, so every regular -mm-/-nn- verb in the corpus resolved
    // its present tense to nothing. The common ones hid it by being in the
    // irregular table: kommen, nennen and schwimmen were all correct.
    if (a === stem[stem.length - 1]) return false;
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
  // -ieren verbs take no ge- — but a separable prefix still attaches, and this
  // branch used to return the bare root's participle and drop it: ausprobieren
  // became "probiert" rather than "ausprobiert". Wrong German, and reachable from
  // the conjugation drill, which asks for Partizip II on any reliable verb.
  if (root.endsWith('ieren')) return (sep ?? '') + stem + end;  // studieren -> studiert, ausprobieren -> ausprobiert
  if (inseparable) return stemOf(inf) + end;             // verkaufen -> verkauft (keep prefix)
  // A separable prefix on an **inseparably prefixed root** takes no `ge-` either:
  // the ge- slot belongs to the root, and the root has already spent it.
  // *hineinversetzen* is hinein + versetzen -> **hineinversetzt**, not
  // «hineingeversetzt»; the same governs *anerkennen* -> anerkannt and
  // *aufbewahren* -> aufbewahrt. Found 2026-08-25 when seeding `versetzen` as a
  // root made `sich hineinversetzen` conjugatable and immediately wrong — the
  // fix that only splits is not a fix.
  if (sep && INSEPARABLE.some((p) => root.startsWith(p) && root.length > p.length + 2)) {
    return sep + stem + end;                             // hineinversetzen -> hineinversetzt
  }
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
  // An ambiguous prefix whose remainder is **not** a verb in its own right —
  // *überraschen*, *unterstützen*, *übernachten*, *umarmen*. There is no separable
  // reading available for those (there is no verb *raschen* to strip off), so the
  // inseparable one is the only one, and the ge-drop applies. It is the pair where
  // the root *is* a verb — übersetzen/setzen, umstellen/stellen — that stays
  // genuinely undecidable and is gated below.
  const ambiguous = !sep && AMBIGUOUS_PREFIXES.find(
    (p) => inf.startsWith(p) && inf.length > p.length + 2);
  if (ambiguous && !isKnownRoot(inf.slice(ambiguous.length))) inseparable = true;

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
  // An unstressed-or-stressed prefix we cannot resolve — see AMBIGUOUS_PREFIXES.
  const ambiguousPrefix = !!ambiguous && isKnownRoot(inf.slice(ambiguous.length));
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
  const reliable = !looksStrong && goodEnding && !unstrippedSeparable && !ambiguousPrefix;

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

/**
 * The regular present tense of any verb, **for recognition only**.
 *
 * `conjugate().reliable` is a single flag covering three unrelated failures, and
 * the matcher was treating it as one: a strong verb outside the table produced no
 * indexed forms *at all*, so `hängt`, `klingt` and `gilt` resolved to nothing
 * even though `hängen`, `klingen` and `gelten` are all in the lexicon. That is
 * hundreds of verbs whose present tense — by far their commonest appearance in
 * running text — the app could not read.
 *
 * The gate is right about drilling and wrong about reading, because the two want
 * opposite things. Generating `hangte` for a drill teaches a false form. Indexing
 * `hängst` as a *key* cannot teach anything: either the string occurs, in which
 * case it really is that verb, or it never occurs and the entry is inert. What is
 * lost is only the vowel-changing du/er forms of strong verbs (`gibt`, `hält`),
 * which are missed rather than mis-taught — and those come back the moment the
 * verb earns a row in the irregular table.
 *
 * Present tense only. The Präteritum and the Partizip II of a strong verb are
 * genuinely unguessable (`klang`, `geklungen`), and guessing them would put a
 * wrong string in the index where a right one might later land.
 */
export function recognitionPraesens(rawVerb: string): string[] {
  const { base } = deReflex(rawVerb);
  const inf = base.toLowerCase();
  if (!/(en|eln|ern|n)$/.test(inf)) return [];
  if (lookup(inf)) return [];                       // already generated correctly
  let sep: string | null = null;
  for (const p of SEPARABLE) { if (inf.startsWith(p) && isKnownRoot(inf.slice(p.length))) { sep = p; break; } }
  const forms = regularPraesens(inf);
  return [...new Set(sep ? appendSep(stripPrefixForms(forms, sep), sep) : forms)];
}

/** Whether the trainer should drill this verb (we can conjugate it correctly). */
export function canConjugate(rawVerb: string): boolean {
  return conjugate(rawVerb).reliable;
}
