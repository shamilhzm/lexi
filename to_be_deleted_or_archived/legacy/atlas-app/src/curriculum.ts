// The 30-Lektionen curriculum skeleton — structure modeled on the learner's own
// A1–B1 coursebook (lesson order, grammar progression, situational topics), with
// all titles, themes and can-do statements paraphrased in our own words and all
// vocabulary/Redemittel authored fresh (see lexikon.ts). No book text ships here.
import type { CEFR } from './model.ts';

// A two-column speech-act pattern (own phrasing), like a mini dialogue script.
export interface RedemittelPattern {
  situation: string;          // e.g. 'Nach dem Weg fragen'
  a: string;                  // Person A line / pattern
  b?: string;                 // Person B reply pattern
}
// A small reference table rendered on the lesson's "Auf einen Blick" page.
export interface GrammarTable {
  title: string;
  head: string[];
  rows: string[][];
}
export interface Lektion {
  n: number;                              // 1..30 — stable key, never renumber
  cefr: CEFR;                             // A1: 1–8 · A2: 9–18 · B1: 19–30
  title: string;                          // paraphrased lesson theme
  short: string;                          // very short label for map sectors
  subsections: [string, string, string];  // A/B/C sub-themes
  handlungsfelder: string[];              // situational topics
  sprachhandlungen: string[];             // can-do statements (own wording)
  grammatik: string[];                    // grammar topics (display labels)
  grammarStarIds: string[];               // linked grammar stars (gram-*)
  felder: string[];                       // semantic vocab fields
  redemittel: RedemittelPattern[];
  tables?: GrammarTable[];
}

export const LEKTIONEN: Lektion[] = [
  /* ------------------------------ A1 ------------------------------ */
  {
    n: 1, cefr: 'A1', title: 'Ankommen & sich vorstellen', short: 'Vorstellen',
    subsections: ['Hallo und guten Tag', 'Sprachen im Leben', 'Buchstaben & Zahlen'],
    handlungsfelder: ['Begrüßung & Vorstellung', 'Telefonnummern & Adressen', 'Formulare ausfüllen'],
    sprachhandlungen: [
      'jemanden formell und informell begrüßen und sich verabschieden',
      'sich und andere vorstellen (Name, Herkunft, Sprachen)',
      'Namen buchstabieren und Zahlen bis 1 Milliarde verstehen',
      'nach Adresse, Telefonnummer und Studienfach fragen',
      'ein einfaches Formular ausfüllen'
    ],
    grammatik: ['Regelmäßige Verben im Präsens', '„sein" im Präsens', 'Personalpronomen im Nominativ', 'Wortstellung: Aussage, W-Frage, Ja/Nein-Frage', 'Genus & Plural', 'Partikeln „denn", „ja"'],
    grammarStarIds: ['gram-A1:präsens-(regelmäßig)', 'gram-A1:sein-&-haben', 'gram-A1:personalpronomen-(nominativ)', 'gram-A1:wortstellung-&-fragen', 'gram-A1:artikel-&-genus'],
    felder: ['Formular & Kontaktdaten', 'Sprachen lernen', 'Länder & Nationalitäten', 'Zahlen & Alphabet'],
    redemittel: [
      { situation: 'Sich begrüßen', a: 'Guten Tag! / Hallo! Mein Name ist …', b: 'Guten Tag, freut mich. Ich heiße …' },
      { situation: 'Nach dem Namen fragen', a: 'Wie heißen Sie? / Wie heißt du?', b: 'Ich heiße … . Und Sie? / Und du?' },
      { situation: 'Nach der Herkunft fragen', a: 'Woher kommen Sie?', b: 'Ich komme aus … . Ich wohne jetzt in Köln.' },
      { situation: 'Um Wiederholung bitten', a: 'Wie bitte? Können Sie das buchstabieren?', b: 'Ja, gern: …' }
    ],
    tables: [
      { title: '„sein" im Präsens', head: ['Person', 'Form'], rows: [['ich', 'bin'], ['du', 'bist'], ['er/sie/es', 'ist'], ['wir', 'sind'], ['ihr', 'seid'], ['sie/Sie', 'sind']] },
      { title: 'Regelmäßige Endungen (kommen)', head: ['Person', 'Endung', 'Beispiel'], rows: [['ich', '-e', 'komme'], ['du', '-st', 'kommst'], ['er/sie/es', '-t', 'kommt'], ['wir', '-en', 'kommen'], ['ihr', '-t', 'kommt'], ['sie/Sie', '-en', 'kommen']] },
      { title: 'Wortstellung', head: ['Position 1', 'Position 2 (Verb)', 'Rest'], rows: [['Ich', 'wohne', 'in Köln.'], ['Wo', 'wohnst', 'du?'], ['', 'Wohnst', 'du in Köln?']] }
    ]
  },
  {
    n: 2, cefr: 'A1', title: 'Menschen, Familie & Dinge', short: 'Familie',
    subsections: ['Früher und heute', 'Familiengeschichten', 'Essen gehen'],
    handlungsfelder: ['Technik & Alltagsgegenstände', 'Familie', 'Im Restaurant'],
    sprachhandlungen: [
      'über die eigene Familie sprechen',
      'Dinge von früher und heute vergleichen und benennen',
      'Uhrzeiten (formell) verstehen und sagen',
      'eine Speisekarte verstehen und etwas bestellen',
      'über Vorlieben beim Essen sprechen'
    ],
    grammatik: ['Bestimmter, unbestimmter & Negativartikel (Nom./Akk.)', 'Possessivartikel im Nominativ', 'Akkusativergänzung', 'W-Fragen: wer, was, wen, wann', '„haben" im Präsens und Präteritum', 'Konnektoren „aber", „oder", „und"'],
    grammarStarIds: ['gram-A1:artikelwörter-&-kein', 'gram-A1:possessivartikel', 'gram-A1:sein-&-haben', 'gram-A2:akkusativ'],
    felder: ['Familie', 'Technik & Geräte', 'Restaurant & Essen', 'Wochentage'],
    redemittel: [
      { situation: 'Über die Familie sprechen', a: 'Hast du Geschwister?', b: 'Ja, ich habe einen Bruder und eine Schwester.' },
      { situation: 'Im Restaurant bestellen', a: 'Was möchten Sie trinken?', b: 'Ich nehme einen Kaffee, bitte.' },
      { situation: 'Nach der Uhrzeit fragen', a: 'Wie spät ist es? / Wie viel Uhr ist es?', b: 'Es ist Viertel nach acht.' },
      { situation: 'Etwas (nicht) mögen', a: 'Magst du Fisch?', b: 'Nein, Fisch mag ich nicht so gern. Ich esse lieber Gemüse.' }
    ],
    tables: [
      { title: '„haben" im Präsens', head: ['Person', 'Form'], rows: [['ich', 'habe'], ['du', 'hast'], ['er/sie/es', 'hat'], ['wir', 'haben'], ['ihr', 'habt'], ['sie/Sie', 'haben']] },
      { title: 'Artikel im Nominativ & Akkusativ', head: ['Genus', 'Nominativ', 'Akkusativ'], rows: [['maskulin', 'der / ein', 'den / einen'], ['feminin', 'die / eine', 'die / eine'], ['neutral', 'das / ein', 'das / ein'], ['Plural', 'die / –', 'die / –']] }
    ]
  },
  {
    n: 3, cefr: 'A1', title: 'Alltag, Termine & Einkaufen', short: 'Termine',
    subsections: ['Uni & Termine', 'Im Supermarkt', 'Endlich Wochenende'],
    handlungsfelder: ['Termine vereinbaren', 'Lebensmittel einkaufen', 'Private Verabredungen', 'Wochenendpläne'],
    sprachhandlungen: [
      'Uhrzeiten und Tageszeiten informell sagen',
      'einen Termin vereinbaren oder absagen',
      'an der Frischetheke einkaufen (Mengen, Verpackungen)',
      'über das Wochenende und private Pläne sprechen',
      'eine kurze persönliche Mail verstehen und schreiben'
    ],
    grammatik: ['W-Fragen: wann, wohin, wie viel(e)', 'Personalpronomen im Akkusativ', '„sein" im Präteritum', 'Partikel „wohl"'],
    grammarStarIds: ['gram-A1:personalpronomen-(akkusativ)', 'gram-A1:präteritum:-sein-&-haben', 'gram-A1:wortstellung-&-fragen'],
    felder: ['Essen & Trinken', 'Einkaufen & Mengen', 'Tageszeiten & Wetter', 'Uni & Termine'],
    redemittel: [
      { situation: 'An der Theke einkaufen', a: 'Sie wünschen? / Was darf es sein?', b: 'Ich hätte gern ein Kilo Äpfel und drei Brötchen.' },
      { situation: 'Nach dem Preis fragen', a: 'Was kostet das? / Wie viel macht das?', b: 'Das macht zusammen 4,50 €.' },
      { situation: 'Einen Termin vereinbaren', a: 'Hast du am Freitag Zeit?', b: 'Freitag passt mir gut. / Tut mir leid, da kann ich nicht.' },
      { situation: 'Einen Termin absagen', a: 'Können wir den Termin verschieben?', b: 'Kein Problem, sagen wir Samstag?' }
    ],
    tables: [
      { title: 'Personalpronomen: Nom. → Akk.', head: ['Nominativ', 'Akkusativ'], rows: [['ich', 'mich'], ['du', 'dich'], ['er', 'ihn'], ['sie', 'sie'], ['es', 'es'], ['wir', 'uns'], ['ihr', 'euch'], ['sie/Sie', 'sie/Sie']] }
    ]
  },
  {
    n: 4, cefr: 'A1', title: 'Arbeit, Beruf & Verabredungen', short: 'Beruf',
    subsections: ['Leben und arbeiten', 'Essen gehen oder Picknick?', 'Im Beruf'],
    handlungsfelder: ['Arbeit & Beruf', 'Geschäftliche Termine', 'Freizeitpläne'],
    sprachhandlungen: [
      'sagen, was man (beruflich) kann, muss, darf oder möchte',
      'einen geschäftlichen Termin vereinbaren',
      'eine formelle E-Mail im Büro verstehen',
      'Monate, Datum und Jahreszahlen nennen',
      'Vorlieben begründen (denn)'
    ],
    grammatik: ['Modalverben im Präsens: können, müssen, wollen, dürfen, möcht-', 'Konnektor „denn"', 'Präpositionen mit Zeitangaben (am, um, im, von … bis)'],
    grammarStarIds: ['gram-A2:modalverben', 'gram-A1:zeitangaben-mit-präpositionen'],
    felder: ['Arbeit & Beruf', 'Monate & Jahreszeiten', 'Büro & Kommunikation'],
    redemittel: [
      { situation: 'Über den Beruf sprechen', a: 'Was sind Sie von Beruf?', b: 'Ich bin Ingenieur. Ich arbeite bei einer Firma in Köln.' },
      { situation: 'Können / müssen ausdrücken', a: 'Können Sie am Montag kommen?', b: 'Montag muss ich leider arbeiten. Dienstag kann ich.' },
      { situation: 'Einen geschäftlichen Termin machen', a: 'Passt Ihnen Mittwoch um 10 Uhr?', b: 'Ja, das passt. Ich trage es in den Kalender ein.' },
      { situation: 'Eine Vorliebe begründen', a: 'Warum nimmst du den Zug?', b: 'Ich fahre lieber Zug, denn dann kann ich lesen.' }
    ],
    tables: [
      { title: 'Modalverben im Präsens', head: ['', 'können', 'müssen', 'wollen', 'dürfen'], rows: [['ich', 'kann', 'muss', 'will', 'darf'], ['du', 'kannst', 'musst', 'willst', 'darfst'], ['er/sie/es', 'kann', 'muss', 'will', 'darf'], ['wir/sie/Sie', 'können', 'müssen', 'wollen', 'dürfen']] },
      { title: 'Zeitangaben mit Präposition', head: ['Frage', 'Präposition', 'Beispiel'], rows: [['Wann? (Tag)', 'am', 'am Montag'], ['Wann? (Uhrzeit)', 'um', 'um 8 Uhr'], ['Wann? (Monat)', 'im', 'im Mai'], ['Zeitraum', 'von … bis', 'von 9 bis 17 Uhr']] }
    ]
  },
  {
    n: 5, cefr: 'A1', title: 'Freizeit, Hobbys & Sport', short: 'Freizeit',
    subsections: ['Das macht Spaß', 'Sport an der Hochschule', 'Gut gelaufen'],
    handlungsfelder: ['Freizeit & Hobbys', 'Sport', 'Anzeigen & Angebote'],
    sprachhandlungen: [
      'über Hobbys, Sport und die eigene Woche sprechen',
      'Freizeitanzeigen verstehen und darauf antworten',
      'Vorlieben und Abneigungen ausdrücken',
      'erzählen, was am Wochenende passiert ist (Perfekt)',
      'sich für eine Sportveranstaltung anmelden'
    ],
    grammatik: ['Verben mit Vokalwechsel im Präsens', 'Trennbare Verben im Präsens', 'Regelmäßige Verben im Perfekt'],
    grammarStarIds: ['gram-A1:verben-mit-vokalwechsel', 'gram-A2:trennbare-verben', 'gram-A2:perfekt'],
    felder: ['Sport & Bewegung', 'Hobbys & Freizeit', 'Zeitung & Anzeigen'],
    redemittel: [
      { situation: 'Über Hobbys sprechen', a: 'Was machst du in deiner Freizeit?', b: 'Ich fahre gern Rennrad und koche viel.' },
      { situation: 'Vorlieben ausdrücken', a: 'Treibst du gern Sport?', b: 'Ja, am liebsten schwimme ich. Joggen finde ich langweilig.' },
      { situation: 'Vom Wochenende erzählen (Perfekt)', a: 'Was hast du am Wochenende gemacht?', b: 'Ich habe Fußball gespielt und einen Film geschaut.' },
      { situation: 'Sich anmelden', a: 'Ich möchte mich für den Kurs anmelden.', b: 'Gern. Füllen Sie bitte dieses Formular aus.' }
    ],
    tables: [
      { title: 'Verben mit Vokalwechsel', head: ['Infinitiv', 'du', 'er/sie/es'], rows: [['fahren', 'fährst', 'fährt'], ['lesen', 'liest', 'liest'], ['essen', 'isst', 'isst'], ['sehen', 'siehst', 'sieht'], ['nehmen', 'nimmst', 'nimmt']] },
      { title: 'Perfekt (regelmäßig)', head: ['Hilfsverb', 'Partizip II', 'Beispiel'], rows: [['haben', 'ge-…-t', 'Ich habe gespielt.'], ['sein (Bewegung)', 'ge-…-t/-en', 'Ich bin gelaufen.']] }
    ]
  },
  {
    n: 6, cefr: 'A1', title: 'Wohnen & Zimmersuche', short: 'Wohnen',
    subsections: ['Zimmer gesucht', 'Eingerichtet', 'In der WG'],
    handlungsfelder: ['Zimmersuche', 'Möbel & Einrichtung', 'Leben in der WG'],
    sprachhandlungen: [
      'eine Wohnungsanzeige verstehen',
      'das eigene Zimmer mündlich und schriftlich beschreiben',
      'erzählen, was beim Einzug passiert ist',
      'sagen, wo Dinge stehen oder liegen',
      'einen Möbelkauf am Telefon besprechen'
    ],
    grammatik: ['Unregelmäßige & gemischte Verben im Perfekt', 'Trennbare & untrennbare Verben im Perfekt', 'Ortsangaben mit Dativ', 'W-Fragen mit „wo"'],
    grammarStarIds: ['gram-A2:perfekt', 'gram-A2:trennbare-verben', 'gram-A1:ortsangaben-mit-dativ'],
    felder: ['Wohnen & Zimmersuche', 'Möbel', 'Materialien', 'Wohnheim & WG'],
    redemittel: [
      { situation: 'Ein Zimmer beschreiben', a: 'Wie ist dein Zimmer?', b: 'Es ist hell und ziemlich groß. Das Bett steht am Fenster.' },
      { situation: 'Sagen, wo etwas steht', a: 'Wo ist der Schreibtisch?', b: 'Der Schreibtisch steht neben dem Schrank.' },
      { situation: 'Auf eine Anzeige reagieren', a: 'Ist das Zimmer noch frei?', b: 'Ja, es ist noch frei. Möchten Sie es besichtigen?' },
      { situation: 'Vom Einzug erzählen', a: 'Wie war der Umzug?', b: 'Anstrengend! Wir haben den ganzen Tag Kisten getragen.' }
    ],
    tables: [
      { title: 'Perfekt: haben oder sein?', head: ['Verbtyp', 'Hilfsverb', 'Beispiel'], rows: [['die meisten Verben', 'haben', 'Ich habe gewohnt.'], ['Bewegung (A→B)', 'sein', 'Ich bin umgezogen.'], ['Zustandswechsel', 'sein', 'Er ist eingeschlafen.']] },
      { title: 'Ortsangaben (wo?) + Dativ', head: ['Präposition', 'Beispiel'], rows: [['in', 'in dem (im) Zimmer'], ['auf', 'auf dem Tisch'], ['neben', 'neben dem Bett'], ['zwischen', 'zwischen den Stühlen']] }
    ]
  },
  {
    n: 7, cefr: 'A1', title: 'Kleidung, Farben & Alltagshilfe', short: 'Kleidung',
    subsections: ['Im Waschsalon', 'Pass auf!', 'Neue Kleider, neue Freunde'],
    handlungsfelder: ['Kleidung & Farben', 'Materialien', 'Anleitungen verstehen'],
    sprachhandlungen: [
      'Kleidungsstücke, Farben und Materialien benennen',
      'eine schriftliche Anleitung verstehen und formulieren',
      'höfliche Bitten äußern und auf Bitten reagieren',
      'Vorschläge für den Abend machen',
      'Anweisungen geben (du / ihr / Sie)'
    ],
    grammatik: ['Imperativ: formell & informell', 'Vorschläge mit „wir", „Sollen/Wollen wir …?", „Soll ich …?"', 'Modalpartikeln: doch, mal, doch mal'],
    grammarStarIds: ['gram-A2:imperativ', 'gram-A1:partikeln:-denn,-ja,-doch,-mal'],
    felder: ['Kleidung', 'Farben', 'Material', 'Waschen & Pflege'],
    redemittel: [
      { situation: 'Eine Bitte äußern', a: 'Kannst du mir bitte helfen?', b: 'Klar, was brauchst du?' },
      { situation: 'Einen Vorschlag machen', a: 'Sollen wir heute Abend ins Kino gehen?', b: 'Gute Idee! / Lieber morgen, heute bin ich müde.' },
      { situation: 'Eine Anweisung geben', a: 'Wasch das bei 30 Grad und häng es zum Trocknen auf.', b: 'Okay, mach ich.' },
      { situation: 'Über Kleidung sprechen', a: 'Wie findest du die Jacke?', b: 'Die steht dir gut! Welche Farbe nimmst du?' }
    ],
    tables: [
      { title: 'Imperativ', head: ['Form', 'Beispiel (machen)', 'sein'], rows: [['du', 'Mach!', 'Sei!'], ['ihr', 'Macht!', 'Seid!'], ['Sie', 'Machen Sie!', 'Seien Sie!']] },
      { title: 'Vorschläge', head: ['Muster', 'Beispiel'], rows: [['Wollen wir …?', 'Wollen wir essen gehen?'], ['Sollen wir …?', 'Sollen wir ins Kino gehen?'], ['Lass uns …', 'Lass uns laufen!']] }
    ]
  },
  {
    n: 8, cefr: 'A1', title: 'Unterwegs in der Schweiz', short: 'Unterwegs',
    subsections: ['Neu in Bern', 'Kulinarisches', 'Wie komme ich …?'],
    handlungsfelder: ['Sehenswürdigkeiten', 'Wegbeschreibung', 'Feste & Partys', 'Interkulturelles'],
    sprachhandlungen: [
      'nach dem Weg fragen und einen Weg beschreiben',
      'Informationen über Sehenswürdigkeiten verstehen',
      'über interkulturelle Unterschiede sprechen',
      'über Pläne sprechen (Präsens für Zukunft)',
      'von Erlebnissen in einer Stadt berichten'
    ],
    grammatik: ['Richtungsangaben mit Dativ/Akkusativ', 'Indefinitpronomen: etwas, nichts, alle, man', 'Präsens für Zukünftiges'],
    grammarStarIds: ['gram-A1:richtungsangaben-&-indefinitpronomen'],
    felder: ['Stadt & Wege', 'Feste & Partys', 'Kunst & Sehenswürdigkeiten'],
    redemittel: [
      { situation: 'Nach dem Weg fragen', a: 'Entschuldigung, wie komme ich zum Bahnhof?', b: 'Gehen Sie geradeaus und dann links.' },
      { situation: 'Einen Weg beschreiben', a: 'Ist es weit?', b: 'Nein, zu Fuß etwa fünf Minuten. Es ist gegenüber der Post.' },
      { situation: 'Über Pläne sprechen', a: 'Was machst du am Wochenende?', b: 'Ich besuche das Museum und gehe am Abend auf ein Fest.' },
      { situation: 'Höflich nachfragen', a: 'Können Sie mir sagen, wo das Rathaus ist?', b: 'Klar, das ist am Marktplatz.' }
    ],
    tables: [
      { title: 'Richtung (wohin?)', head: ['Ziel', 'Präposition', 'Beispiel'], rows: [['Person/Ort', 'zu + Dat.', 'zum Arzt, zur Post'], ['Stadt/Land', 'nach', 'nach Bern'], ['hinein', 'in + Akk.', 'ins Kino'], ['Heimat', 'nach Hause', 'Ich gehe nach Hause.']] },
      { title: 'Indefinitpronomen', head: ['Pronomen', 'Bedeutung'], rows: [['man', 'people in general'], ['etwas / nichts', 'something / nothing'], ['alle / niemand', 'everyone / no one']] }
    ]
  },
  /* ------------------------------ A2 ------------------------------ */
  {
    n: 9, cefr: 'A2', title: 'Feste & Geschenke', short: 'Feste',
    subsections: ['Grund zum Feiern', 'Der Abschluss', 'Feste hier und dort'],
    handlungsfelder: ['Feiern & Feste', 'Einladungen', 'Geschenke', 'Bräuche'],
    sprachhandlungen: [
      'eine Einladung verstehen, zusagen und absagen',
      'eine Party planen und Vorschläge machen',
      'überlegen und begründen, welches Geschenk zu wem passt',
      'über Feste und Bräuche in der Heimat sprechen und schreiben'
    ],
    grammatik: ['n-Deklination', 'Personalpronomen im Dativ', 'Dativergänzung', 'Stellung von Dativ- & Akkusativergänzung', 'Adjektive nach unbestimmtem Artikel (Nom./Akk./Dat.)'],
    grammarStarIds: ['gram-A2:n-deklination', 'gram-A2:dativ:-pronomen-&-stellung', 'gram-B1:dativ', 'gram-B2:adjektivdeklination'],
    felder: ['Feste & Feiern', 'Geschenke', 'Einladung & Antwort'],
    redemittel: [
      { situation: 'Einladen', a: 'Ich feiere am Samstag. Hast du Lust zu kommen?', b: 'Sehr gern! Was soll ich mitbringen?' },
      { situation: 'Zu-/absagen', a: 'Kommst du zu meiner Party?', b: 'Ich komme gern. / Schade, da habe ich schon etwas vor.' },
      { situation: 'Ein Geschenk überlegen', a: 'Was schenken wir ihr?', b: 'Wir könnten ihr ein Buch schenken. Das gefällt ihr bestimmt.' },
      { situation: 'Gratulieren', a: 'Herzlichen Glückwunsch!', b: 'Vielen Dank, das ist lieb!' }
    ],
    tables: [
      { title: 'Dativ-Pronomen', head: ['Nominativ', 'Dativ'], rows: [['ich', 'mir'], ['du', 'dir'], ['er/es', 'ihm'], ['sie', 'ihr'], ['wir', 'uns'], ['ihr', 'euch'], ['sie/Sie', 'ihnen/Ihnen']] },
      { title: 'Stellung Dativ ↔ Akkusativ', head: ['Regel', 'Beispiel'], rows: [['Nomen: Dativ vor Akkusativ', 'Ich gebe dem Kind den Ball.'], ['Akk.-Pronomen zuerst', 'Ich gebe ihn dem Kind.']] }
    ]
  },
  {
    n: 10, cefr: 'A2', title: 'Neue Stadt, neue Wohnung', short: 'Umzug',
    subsections: ['Neu in der Stadt', 'Ist die Wohnung frei?', 'Unsere Wohnung'],
    handlungsfelder: ['Wohnungslage', 'Wohnung mieten', 'Einrichten'],
    sprachhandlungen: [
      'Wohnungsanzeigen verstehen und über Lage & Ausstattung sprechen',
      'einen Besichtigungstermin am Telefon ausmachen',
      'eine Hausordnung verstehen und darüber sprechen',
      'Wohnungen vergleichen (größer, am besten, so groß wie)',
      'Veränderungen im Raum beschreiben'
    ],
    grammatik: ['Komparativ & Superlativ (prädikativ)', 'Vergleiche: so/genauso … wie, nicht so … wie, als', 'Possessivpronomen (Nom./Akk./Dat.)', 'Wechselpräpositionen'],
    grammarStarIds: ['gram-B1:komparativ-&-superlativ', 'gram-A2:vergleiche:-so-…-wie-/-als', 'gram-A2:wechselpräpositionen', 'gram-A1:possessivartikel'],
    felder: ['Wohnung & Lage', 'Mieten & Besichtigung', 'Einrichtung'],
    redemittel: [
      { situation: 'Eine Besichtigung ausmachen', a: 'Ich interessiere mich für die Wohnung. Kann ich sie ansehen?', b: 'Gern, passt Ihnen Donnerstag um 17 Uhr?' },
      { situation: 'Nach Details fragen', a: 'Wie hoch sind die Nebenkosten?', b: 'Die Warmmiete liegt bei 850 Euro.' },
      { situation: 'Wohnungen vergleichen', a: 'Welche Wohnung gefällt dir besser?', b: 'Die zweite ist größer, aber die erste ist günstiger.' },
      { situation: 'Lage beschreiben', a: 'Wie ist die Lage?', b: 'Sehr zentral. Die Haltestelle ist gleich um die Ecke.' }
    ],
    tables: [
      { title: 'Komparativ & Superlativ', head: ['Adjektiv', 'Komparativ', 'Superlativ'], rows: [['billig', 'billiger', 'am billigsten'], ['groß', 'größer', 'am größten'], ['gut', 'besser', 'am besten'], ['hoch', 'höher', 'am höchsten']] },
      { title: 'Vergleiche', head: ['Muster', 'Beispiel'], rows: [['so … wie (gleich)', 'so groß wie meins'], ['Komparativ + als', 'größer als deins'], ['nicht so … wie', 'nicht so teuer wie …']] }
    ]
  },
  {
    n: 11, cefr: 'A2', title: 'Ankommen in Köln', short: 'Köln',
    subsections: ['Auf nach Köln', 'Kunst & Medien', 'Sprache der Stadt'],
    handlungsfelder: ['Sehenswürdigkeiten', 'Studium im Ausland', 'Ausgehen', 'Dialekte'],
    sprachhandlungen: [
      'begründen, warum man etwas tut (weil)',
      'wiedergeben, was andere sagen oder glauben (dass)',
      'über Ausgehmöglichkeiten in einer Stadt sprechen',
      'über Erfahrungen in der Fremde sprechen',
      'einen Blogeintrag über eine Stadt verstehen'
    ],
    grammatik: ['Nebensätze mit „weil" und „dass"', 'Reflexivpronomen im Akkusativ & Dativ', 'Adjektive nach bestimmtem Artikel'],
    grammarStarIds: ['gram-B1:nebensätze-(weil/dass)', 'gram-A2:reflexive-verben', 'gram-B2:adjektivdeklination'],
    felder: ['Stadt & Kultur', 'Ausgehen', 'Studium im Ausland'],
    redemittel: [
      { situation: 'Etwas begründen (weil)', a: 'Warum lebst du gern in Köln?', b: 'Weil die Stadt offen ist und ich hier viele Freunde habe.' },
      { situation: 'Wiedergeben, was jemand sagt (dass)', a: 'Was sagt dein Vermieter?', b: 'Er sagt, dass die Heizung bald repariert wird.' },
      { situation: 'Ausgehen vorschlagen', a: 'Wo treffen wir uns heute Abend?', b: 'Lass uns in die Altstadt gehen, da ist viel los.' },
      { situation: 'Über Erfahrungen sprechen', a: 'Wie war dein erstes Jahr im Ausland?', b: 'Am Anfang schwer, aber jetzt fühle ich mich wohl.' }
    ],
    tables: [
      { title: 'Nebensatz: Verb am Ende', head: ['Konjunktion', 'Hauptsatz', 'Nebensatz'], rows: [['weil', 'Ich bleibe zu Hause,', 'weil ich krank bin.'], ['dass', 'Ich glaube,', 'dass er recht hat.']] },
      { title: 'Reflexivpronomen (Akk.)', head: ['Person', 'Pronomen'], rows: [['ich', 'mich'], ['du', 'dich'], ['er/sie/es', 'sich'], ['wir', 'uns'], ['ihr', 'euch'], ['sie/Sie', 'sich']] }
    ]
  },
  {
    n: 12, cefr: 'A2', title: 'Geld & Bank im Alltag', short: 'Geld',
    subsections: ['Ein Konto eröffnen', 'Wie konnte das passieren?', 'Wie im Märchen'],
    handlungsfelder: ['Bankgeschäfte', 'Verlust & Fundbüro', 'Geschichten erzählen'],
    sprachhandlungen: [
      'ein Gespräch am Bankschalter führen',
      'einen Vorfall beschreiben (Präteritum)',
      'sagen, was unter einer Bedingung passiert (wenn)',
      'erzählen, was früher war (als)',
      'ein Märchen verstehen und nacherzählen'
    ],
    grammatik: ['Konditionale Nebensätze mit „wenn"', 'Temporale Nebensätze mit „als"', 'Präteritum: regelmäßig, unregelmäßig, Modalverben', 'Verben mit Dativergänzung'],
    grammarStarIds: ['gram-A2:präteritum', 'gram-A2:nebensätze:-wenn-&-als', 'gram-B1:dativ'],
    felder: ['Bank & Konto', 'Fundbüro & Verlust', 'Märchen & Geschichten'],
    redemittel: [
      { situation: 'Am Bankschalter', a: 'Ich möchte ein Konto eröffnen.', b: 'Gern. Haben Sie Ihren Ausweis dabei?' },
      { situation: 'Einen Verlust melden', a: 'Ich habe meine Tasche verloren.', b: 'Wo haben Sie sie zuletzt gesehen?' },
      { situation: 'Eine Bedingung nennen (wenn)', a: 'Was machst du, wenn die Karte gesperrt ist?', b: 'Wenn das passiert, rufe ich sofort die Bank an.' },
      { situation: 'Von früher erzählen (als)', a: 'Wann warst du das erste Mal in Deutschland?', b: 'Als ich zwanzig war, habe ich hier studiert.' }
    ],
    tables: [
      { title: 'Präteritum', head: ['Typ', 'Infinitiv → er-Form'], rows: [['regelmäßig', 'machen → machte'], ['unregelmäßig', 'gehen → ging'], ['gemischt', 'bringen → brachte'], ['Modalverb', 'können → konnte']] },
      { title: 'wenn ↔ als', head: ['Konjunktion', 'Gebrauch'], rows: [['als', 'einmal in der Vergangenheit'], ['wenn', 'wiederholt / Gegenwart / Zukunft']] }
    ]
  },
  {
    n: 13, cefr: 'A2', title: 'Gesundheit & Arztbesuch', short: 'Gesundheit',
    subsections: ['Mir geht es nicht gut', 'Was fehlt Ihnen?', 'Alles für die Gesundheit'],
    handlungsfelder: ['Krankheiten & Symptome', 'Arztbesuch', 'Der Körper'],
    sprachhandlungen: [
      'Beschwerden beschreiben und den passenden Arzt finden',
      'ein Gespräch in der Arztpraxis führen',
      'einen Beipackzettel im Kern verstehen',
      'sagen, seit wann oder bis wann etwas gilt',
      'über die eigene Gesundheit sprechen'
    ],
    grammatik: ['Temporale Nebensätze mit „seit(dem)" und „bis"', 'Bedeutung der Modalverben', '„brauchen … nicht/kein … zu" + Infinitiv', 'Kausale Adverbien: darum, deshalb, deswegen, daher'],
    grammarStarIds: ['gram-A2:temporalsätze:-seit(dem)-&-bis', 'gram-A2:modalverben', 'gram-B2:konnektoren-(deshalb/trotzdem)'],
    felder: ['Körper', 'Krankheit & Symptome', 'Arzt & Apotheke'],
    redemittel: [
      { situation: 'Beim Arzt', a: 'Was fehlt Ihnen?', b: 'Ich habe seit zwei Tagen Kopfschmerzen und Fieber.' },
      { situation: 'Beschwerden beschreiben', a: 'Wo tut es weh?', b: 'Hier, der Hals tut weh, und ich kann schlecht schlucken.' },
      { situation: 'Einen Rat geben', a: 'Was soll ich tun?', b: 'Sie sollten viel trinken und sich ausruhen.' },
      { situation: 'In der Apotheke', a: 'Haben Sie etwas gegen Husten?', b: 'Ja, nehmen Sie diesen Saft, dreimal täglich.' }
    ],
    tables: [
      { title: 'Temporalsätze', head: ['Konjunktion', 'Bedeutung', 'Beispiel'], rows: [['seit(dem)', 'ab einem Startpunkt', 'Seitdem ich hier wohne, …'], ['bis', 'bis zu einem Endpunkt', 'Ich warte, bis du kommst.']] }
    ]
  },
  {
    n: 14, cefr: 'A2', title: 'Einkaufen & Feste im Süden', short: 'Einkaufen',
    subsections: ['Auszeit', 'Der Kleiderbügel', 'Zwei Originale'],
    handlungsfelder: ['Kleidung kaufen', 'Volksfeste', 'Stadtleben'],
    sprachhandlungen: [
      'ein Verkaufsgespräch über Kleidung führen',
      'genauer nachfragen (welcher? dieser?)',
      'einen Flyer oder ein Angebot verstehen',
      'über ein Volksfest in der Heimat berichten'
    ],
    grammatik: ['Diminutiv', 'Frageartikel & -pronomen „welch-"', 'Demonstrativartikel & -pronomen: dies-, der/das/die', 'Indefinitartikel & -pronomen: jed-, kein-, all-, viel-, wenig-'],
    grammarStarIds: ['gram-A2:frageartikel-&-demonstrativartikel'],
    felder: ['Kleidung & Kauf', 'Volksfeste', 'Maße & Größen'],
    redemittel: [
      { situation: 'Im Geschäft beraten lassen', a: 'Kann ich Ihnen helfen?', b: 'Ja, ich suche eine Jacke in Größe M.' },
      { situation: 'Genauer nachfragen', a: 'Welche möchten Sie anprobieren?', b: 'Diese hier in Blau, bitte.' },
      { situation: 'Über Passform sprechen', a: 'Und, passt sie?', b: 'Sie ist ein bisschen zu eng. Haben Sie eine Nummer größer?' },
      { situation: 'Über ein Fest berichten', a: 'Wie war das Fest?', b: 'Toll! Es gab Musik, Essen und viele Leute.' }
    ],
    tables: [
      { title: 'welch- & dies-', head: ['Genus', 'welch-? (Frage)', 'dies- (Antwort)'], rows: [['maskulin', 'welcher / welchen', 'dieser / diesen'], ['feminin', 'welche', 'diese'], ['neutral', 'welches', 'dieses'], ['Plural', 'welche', 'diese']] }
    ]
  },
  {
    n: 15, cefr: 'A2', title: 'Eine Reise nach Wien', short: 'Reise',
    subsections: ['Unterwegs zum Festival', 'Innenstadt', 'Was unternehmen wir?'],
    handlungsfelder: ['Reiseplanung', 'Übernachtung', 'Stadtbesichtigung', 'Wegbeschreibung'],
    sprachhandlungen: [
      'eine Reise planen und Unterkünfte vergleichen',
      'höflich indirekt fragen (Wissen Sie, wo …?)',
      'eine Wegbeschreibung verstehen und geben',
      'einen Reiseblog verstehen',
      'über Filme und Veranstaltungen sprechen'
    ],
    grammatik: ['Wortstellung von Orts- & Zeitangaben im Satz', 'Indirekte Fragesätze', 'Ortsangaben: bei, (bis) zu, links/rechts, gegenüber von, entlang, rein/raus'],
    grammarStarIds: ['gram-A2:indirekte-fragesätze', 'gram-A1:richtungsangaben-&-indefinitpronomen'],
    felder: ['Reise & Unterkunft', 'Stadt & Orientierung', 'Veranstaltungen'],
    redemittel: [
      { situation: 'Ein Zimmer reservieren', a: 'Haben Sie ein Doppelzimmer für zwei Nächte?', b: 'Ja, mit Frühstück? Das macht 120 Euro.' },
      { situation: 'Höflich indirekt fragen', a: 'Wissen Sie, wann das Museum öffnet?', b: 'Ich glaube, ab zehn Uhr.' },
      { situation: 'Nach dem Weg fragen', a: 'Können Sie mir sagen, wie ich zum Dom komme?', b: 'Gehen Sie hier rechts und immer geradeaus.' },
      { situation: 'Etwas vorschlagen', a: 'Was unternehmen wir heute?', b: 'Wie wäre es mit einer Stadtführung?' }
    ],
    tables: [
      { title: 'Indirekte Fragen', head: ['Direkte Frage', 'Indirekt'], rows: [['Wo ist der Bahnhof?', '…, wo der Bahnhof ist.'], ['Kommt er?', '…, ob er kommt.']] },
      { title: 'Satzstellung: Te-Ka-Mo-Lo', head: ['Reihenfolge', 'Beispiel'], rows: [['temporal → kausal → modal → lokal', 'Ich fahre morgen mit dem Zug nach Wien.']] }
    ]
  },
  {
    n: 16, cefr: 'A2', title: 'Bildungswege & Berufswahl', short: 'Bildung',
    subsections: ['Nach der Schule', 'Ich bin Azubi', 'Das duale Studium'],
    handlungsfelder: ['Schulsystem', 'Ausbildungsberufe', 'Berufswahl'],
    sprachhandlungen: [
      'das Schulsystem in Deutschland im Überblick verstehen',
      'höfliche Fragen und Wünsche formulieren (Konjunktiv II)',
      'über Ausbildungswege sprechen',
      'Vorschläge zur Berufswahl verstehen, geben und darauf reagieren',
      'Dinge genauer beschreiben (Relativsätze)'
    ],
    grammatik: ['Konjunktiv II: haben, können, dürfen, werden, sollen (höflich)', 'Genitivergänzung', 'Adjektive im Genitiv', 'Relativsätze & -pronomen (Nom./Akk./Dat.)'],
    grammarStarIds: ['gram-B1:konjunktiv-ii-(würde)', 'gram-B1:genitiv', 'gram-B2:relativsätze'],
    felder: ['Schule & Ausbildung', 'Berufe', 'Studium'],
    redemittel: [
      { situation: 'Höflich bitten (Konjunktiv II)', a: 'Könnten Sie mir das bitte erklären?', b: 'Natürlich, gern.' },
      { situation: 'Über Berufswahl sprechen', a: 'Was möchtest du später machen?', b: 'Ich würde gern Ingenieurin werden.' },
      { situation: 'Einen Rat geben', a: 'Ich weiß nicht, welchen Weg ich nehmen soll.', b: 'An deiner Stelle würde ich erst ein Praktikum machen.' },
      { situation: 'Etwas genauer beschreiben', a: 'Welchen Beruf meinst du?', b: 'Den Beruf, der mit Technik und Menschen zu tun hat.' }
    ],
    tables: [
      { title: 'Konjunktiv II (höflich)', head: ['Verb', 'Form'], rows: [['sein', 'wäre'], ['haben', 'hätte'], ['können', 'könnte'], ['werden', 'würde'], ['sollen', 'sollte']] },
      { title: 'Relativpronomen', head: ['Genus', 'Nom.', 'Akk.', 'Dat.'], rows: [['m', 'der', 'den', 'dem'], ['f', 'die', 'die', 'der'], ['n', 'das', 'das', 'dem'], ['Pl.', 'die', 'die', 'denen']] }
    ]
  },
  {
    n: 17, cefr: 'A2', title: 'Bewerbung & Praktikum', short: 'Bewerbung',
    subsections: ['Der Platz', 'Warum gerade wir?', 'Der erste Tag'],
    handlungsfelder: ['Bewerbung', 'Firmen & Abteilungen', 'Praktikum'],
    sprachhandlungen: [
      'einen Lebenslauf und ein Bewerbungsschreiben aufbauen',
      'ein Vorstellungsgespräch nachvollziehen',
      'beschreiben, was (in einer Firma) gemacht wird (Passiv)',
      'einen Tagebucheintrag über den ersten Arbeitstag schreiben'
    ],
    grammatik: ['Passiv: Präsens & Präteritum', 'Wortstellung im Satz'],
    grammarStarIds: ['gram-B2:passiv'],
    felder: ['Bewerbung & Lebenslauf', 'Firma & Abteilungen', 'Praktikum'],
    redemittel: [
      { situation: 'Im Vorstellungsgespräch', a: 'Warum bewerben Sie sich bei uns?', b: 'Weil mich Ihre Projekte sehr interessieren.' },
      { situation: 'Über Stärken sprechen', a: 'Was sind Ihre Stärken?', b: 'Ich arbeite zuverlässig und lerne schnell.' },
      { situation: 'Abläufe beschreiben (Passiv)', a: 'Wie läuft das hier ab?', b: 'Die Anträge werden zuerst geprüft und dann bearbeitet.' },
      { situation: 'Nachfragen zum Ablauf', a: 'Wann höre ich von Ihnen?', b: 'Sie werden bis Ende der Woche informiert.' }
    ],
    tables: [
      { title: 'Passiv: werden + Partizip II', head: ['Zeit', 'Beispiel'], rows: [['Präsens', 'Der Brief wird geschrieben.'], ['Präteritum', 'Der Brief wurde geschrieben.'], ['mit Modalverb', 'Der Brief muss geschrieben werden.']] }
    ]
  },
  {
    n: 18, cefr: 'A2', title: 'Endlich Ferien!', short: 'Ferien',
    subsections: ['Wohin in den Ferien?', 'Ab in die Ferien', 'Urlaub in den Bergen'],
    handlungsfelder: ['Urlaubsregionen', 'Unterkunft & Verpflegung', 'Sport im Urlaub'],
    sprachhandlungen: [
      'Urlaubsangebote und Anzeigen vergleichen',
      'über die eigene Urlaubsplanung sprechen',
      'eine schriftliche Anleitung verstehen',
      'von einem Urlaubserlebnis als Blogeintrag berichten'
    ],
    grammatik: ['Vergleichssätze: so/genauso … wie, nicht so … wie, als', 'Vorsilbe „un-"', 'Temporale Nebensätze mit „wenn" und „als"', '„werden" + Nominativ/Adjektiv'],
    grammarStarIds: ['gram-A2:vergleiche:-so-…-wie-/-als', 'gram-A2:nebensätze:-wenn-&-als'],
    felder: ['Urlaub & Regionen', 'Unterkunft', 'Sportarten'],
    redemittel: [
      { situation: 'Urlaub planen', a: 'Wohin fahren wir in den Ferien?', b: 'Ich würde gern in die Berge fahren und wandern.' },
      { situation: 'Angebote vergleichen', a: 'Welches Angebot nehmen wir?', b: 'Das zweite ist nicht so teuer wie das erste, aber genauso schön.' },
      { situation: 'Über Urlaubspläne sprechen', a: 'Was macht ihr dieses Jahr?', b: 'Wir bleiben in Deutschland. Im Sommer wird es bestimmt warm.' },
      { situation: 'Vom Urlaub erzählen', a: 'Wie war euer Urlaub?', b: 'Wunderbar – das Wetter war besser als erwartet.' }
    ],
    tables: [
      { title: 'Vergleichssätze', head: ['Muster', 'Beispiel'], rows: [['so … wie', 'Es war so schön wie zu Hause.'], ['nicht so … wie', 'nicht so teuer wie gedacht'], ['Komparativ + als', 'wärmer als letztes Jahr']] }
    ]
  },
  /* ------------------------------ B1 ------------------------------ */
  {
    n: 19, cefr: 'B1', title: 'Mobilität & Verkehr', short: 'Verkehr',
    subsections: ['Der Führerschein', 'Mobilität um jeden Preis?', 'Gemeinsam fahren'],
    handlungsfelder: ['Führerschein & Verkehrsregeln', 'Öffentlicher Verkehr', 'Alternative Mobilität', 'Pendeln'],
    sprachhandlungen: [
      'über die Rolle des Führerscheins früher und heute sprechen',
      'Verkehrsmeldungen und Durchsagen verstehen',
      'einen Verkehrsunfall schildern',
      'Vor- und Nachteile von Fahrgemeinschaften abwägen',
      'eine Stellungnahme abgeben'
    ],
    grammatik: ['Passiv im Perfekt', 'Passiv mit Modalverben (Präsens & Präteritum)', 'Zustandspassiv (sein-Passiv)', 'Partizip Perfekt als Adjektiv'],
    grammarStarIds: ['gram-B1:passiv:-perfekt-&-modalverben', 'gram-B2:passiv'],
    felder: ['Verkehr & Mobilität', 'Auto & Führerschein', 'Pendeln'],
    redemittel: [
      { situation: 'Eine Meinung äußern', a: 'Brauchen junge Leute heute noch ein Auto?', b: 'Meiner Meinung nach nicht – in der Stadt reicht das Rad.' },
      { situation: 'Vor- und Nachteile abwägen', a: 'Was hältst du von Fahrgemeinschaften?', b: 'Einerseits spart man Geld, andererseits ist man weniger flexibel.' },
      { situation: 'Einen Vorfall schildern', a: 'Was ist passiert?', b: 'An der Kreuzung ist ein Auto in mein Rad gefahren.' },
      { situation: 'Zustimmen / widersprechen', a: 'Der Nahverkehr ist zu teuer.', b: 'Da stimme ich dir zu. / Das sehe ich anders.' }
    ],
    tables: [
      { title: 'Passiv-Formen', head: ['Form', 'Beispiel'], rows: [['Perfekt', 'ist gebaut worden'], ['mit Modalverb', 'muss gebaut werden'], ['Zustandspassiv', 'ist geöffnet (sein + Part. II)']] }
    ]
  },
  {
    n: 20, cefr: 'B1', title: 'Zwischen den Ländern', short: 'Grenzen',
    subsections: ['Wo liegt das eigentlich?', 'Studieren im Kleinstaat', 'Im Vierländereck'],
    handlungsfelder: ['Länderkunde', 'Studium im Ausland', 'Grenzverkehr', 'Freizeit in der Region'],
    sprachhandlungen: [
      'einen längeren Landeskunde-Text verstehen',
      'ein Land oder eine Region erklärend beschreiben',
      'Dinge genau vergleichen (der größte, am schönsten)',
      'Umgangssprache erkennen',
      'gemeinsam einen Ausflug planen'
    ],
    grammatik: ['Komparativ & Superlativ (attributiv)', 'Relativsätze mit „was"', 'Merkmale der Umgangssprache'],
    grammarStarIds: ['gram-B1:komparativ-&-superlativ', 'gram-B2:relativsätze'],
    felder: ['Länder & Regionen', 'Grenze & Pendeln', 'Ausflüge'],
    redemittel: [
      { situation: 'Eine Region beschreiben', a: 'Wo liegt das eigentlich?', b: 'Im Dreiländereck, an der Grenze zwischen drei Ländern.' },
      { situation: 'Genau vergleichen', a: 'Welches ist das kleinste Land?', b: 'Liechtenstein – es ist viel kleiner als die Schweiz.' },
      { situation: 'Einen Ausflug planen', a: 'Sollen wir am Sonntag rüberfahren?', b: 'Gern, das ist der schönste Ort in der Gegend.' },
      { situation: 'Umgangssprache erkennen', a: '„Das isch mega guet" – was heißt das?', b: 'Das ist Schweizerdeutsch für „sehr gut".' }
    ],
    tables: [
      { title: 'Superlativ attributiv', head: ['Genus', 'Beispiel'], rows: [['m', 'der größte See'], ['f', 'die schönste Stadt'], ['n', 'das kleinste Land']] }
    ]
  },
  {
    n: 21, cefr: 'B1', title: 'Kultur & Veranstaltungen', short: 'Kultur',
    subsections: ['Neu in Hamburg', 'Wohin am Wochenende?', 'Theaterabend'],
    handlungsfelder: ['Sehenswürdigkeiten', 'Veranstaltungen', 'Theater'],
    sprachhandlungen: [
      'Reiseführertexte verstehen',
      'Vorschläge für Unternehmungen machen, annehmen oder ablehnen',
      'sagen, was man vorhat (Infinitiv mit zu)',
      'ein Theaterstück zusammenfassen'
    ],
    grammatik: ['Adjektive im Genitiv ohne Artikel', 'Infinitivsätze (zu + Infinitiv)', 'Alternativen mit „entweder … oder"'],
    grammarStarIds: ['gram-B1:infinitivsätze-(zu-+-infinitiv)', 'gram-B1:genitiv'],
    felder: ['Kultur & Bühne', 'Veranstaltungen', 'Stadtleben'],
    redemittel: [
      { situation: 'Etwas vorschlagen', a: 'Hast du Lust, ins Theater zu gehen?', b: 'Ja, gute Idee! Was wird denn gespielt?' },
      { situation: 'Vorhaben ausdrücken (zu+Inf.)', a: 'Was hast du am Wochenende vor?', b: 'Ich habe vor, die neue Ausstellung zu besuchen.' },
      { situation: 'Annehmen / ablehnen', a: 'Kommst du mit ins Konzert?', b: 'Sehr gern. / Leider habe ich keine Zeit.' },
      { situation: 'Ein Stück zusammenfassen', a: 'Worum ging es?', b: 'Es geht um eine Familie, die ein Geheimnis hat.' }
    ],
    tables: [
      { title: 'Infinitiv mit „zu"', head: ['Auslöser', 'Beispiel'], rows: [['vorhaben', 'Ich habe vor, zu kommen.'], ['versuchen', 'Ich versuche, mehr zu üben.'], ['trennbar', 'Ich vergesse, einzukaufen.']] }
    ]
  },
  {
    n: 22, cefr: 'B1', title: 'In Kontakt bleiben', short: 'Kontakt',
    subsections: ['Nachrichten schicken', 'Ärger mit dem Päckchen', 'Die „neuen" Medien'],
    handlungsfelder: ['Kommunikation', 'Post & Sendungen', 'Mediennutzung', 'Freundschaft'],
    sprachhandlungen: [
      'darüber sprechen, wie man mit wem kommuniziert',
      'eine Beschwerde bei der Post formulieren',
      'Ratschläge geben (Ich würde …)',
      'sagen, was wäre, wenn … (irreale Bedingungen)',
      'einen Beitrag in einem Meinungsforum schreiben'
    ],
    grammatik: ['Indefinitartikel & -pronomen mit „irgend-"', 'Konjunktiv II: regelmäßig, unregelmäßig, gemischt', 'Irreale Konditionalsätze mit und ohne „wenn"', 'Ratschläge im Konjunktiv II'],
    grammarStarIds: ['gram-B1:irreale-konditionalsätze', 'gram-B1:konjunktiv-ii-(würde)'],
    felder: ['Kommunikation & Medien', 'Post & Paket', 'Freundschaft'],
    redemittel: [
      { situation: 'Sich beschweren', a: 'Mein Paket ist seit zwei Wochen unterwegs.', b: 'Das tut mir leid. Haben Sie eine Sendungsnummer?' },
      { situation: 'Einen Rat geben (würde)', a: 'Was würdest du an meiner Stelle tun?', b: 'Ich würde eine Beschwerde schreiben.' },
      { situation: 'Irreales ausdrücken', a: 'Was wäre, wenn du das Paket nicht bekommst?', b: 'Wenn es nicht ankäme, würde ich mein Geld zurückverlangen.' },
      { situation: 'Über Mediennutzung sprechen', a: 'Wie hältst du Kontakt zu Freunden?', b: 'Meistens über Messenger, manchmal telefoniere ich.' }
    ],
    tables: [
      { title: 'Konjunktiv II', head: ['Bildung', 'Beispiel'], rows: [['würde + Infinitiv', 'Ich würde kommen.'], ['sein → wäre', 'Wenn ich reich wäre …'], ['haben → hätte', 'Wenn ich Zeit hätte …']] }
    ]
  },
  {
    n: 23, cefr: 'B1', title: 'Hochschule & Studienwege', short: 'Studium',
    subsections: ['Campus Deutschland', 'Wer die Wahl hat …', 'Den eigenen Weg finden'],
    handlungsfelder: ['Hochschultypen', 'Studienfächer', 'Frust & Abbruch', 'Alternativen'],
    sprachhandlungen: [
      'einen Vortrag über das Hochschulsystem verstehen und Notizen machen',
      'wichtige persönliche Entscheidungen begründen',
      'Einräumen und Entgegensetzen (obwohl, trotzdem, zwar … aber)',
      'irreale Wünsche äußern',
      'einen Forumsbeitrag verfassen'
    ],
    grammatik: ['Kausale Verbindungen mit „wegen" und „nämlich"', 'Konzessive Haupt- & Nebensätze: trotzdem, dennoch, zwar … aber, obwohl', 'Konjunktiv II: irreale Wunschsätze'],
    grammarStarIds: ['gram-B2:konnektoren-(deshalb/trotzdem)', 'gram-B1:irreale-konditionalsätze'],
    felder: ['Hochschule & Studium', 'Entscheidungen', 'Lebenswege'],
    redemittel: [
      { situation: 'Eine Entscheidung begründen', a: 'Warum hast du das Fach gewechselt?', b: 'Weil es mir keinen Spaß gemacht hat. Nämlich gar keinen.' },
      { situation: 'Einräumen (obwohl/trotzdem)', a: 'Du studierst weiter?', b: 'Ja, obwohl es schwer ist. Trotzdem will ich den Abschluss.' },
      { situation: 'Einen Wunsch äußern (irreal)', a: 'Bist du zufrieden?', b: 'Im Großen und Ganzen. Hätte ich nur früher angefangen!' },
      { situation: 'Notizen ankündigen', a: 'Ich halte gleich einen kurzen Vortrag.', b: 'Gut, ich mache mir Notizen.' }
    ],
    tables: [
      { title: 'Konzessiv', head: ['Typ', 'Beispiel'], rows: [['Nebensatz', 'obwohl es schwer ist'], ['Hauptsatz', 'Es ist schwer, trotzdem mache ich weiter.'], ['zwar … aber', 'zwar teuer, aber gut']] }
    ]
  },
  {
    n: 24, cefr: 'B1', title: 'Ehrenamt & Engagement', short: 'Ehrenamt',
    subsections: ['Engagement für Mensch & Natur', 'Im Tal oder auf der Alp?', 'Eine Erfahrung'],
    handlungsfelder: ['Ehrenamt', 'Freiwilligeneinsatz', 'Natur & Landwirtschaft'],
    sprachhandlungen: [
      'eine Radiosendung über Freiwilligenarbeit verstehen',
      'sagen, wozu man etwas tut (damit, um … zu)',
      'eine E-Mail mit Bitten um Informationen schreiben',
      'einen kurzen Vortrag halten und auf Vorträge reagieren'
    ],
    grammatik: ['Finalsätze mit „damit" und „um … zu"', '„zum/zur" + Nomen', 'Fragewort „wo(r)-?"', 'Präpositionalpronomen „da(r)-"', 'Partizip Präsens als Adjektiv'],
    grammarStarIds: ['gram-B1:finalsätze:-damit-&-um-…-zu', 'gram-C1:partizipialattribute'],
    felder: ['Ehrenamt & Einsatz', 'Natur & Hof', 'Organisation'],
    redemittel: [
      { situation: 'Zweck ausdrücken (damit/um zu)', a: 'Warum engagierst du dich?', b: 'Um anderen zu helfen – und damit sich etwas ändert.' },
      { situation: 'Um Informationen bitten', a: 'Ich würde gern mitmachen. Wie funktioniert das?', b: 'Schreiben Sie uns eine kurze E-Mail, dann melden wir uns.' },
      { situation: 'Über Motive sprechen', a: 'Was motiviert dich?', b: 'Das Gefühl, etwas Sinnvolles zu tun.' },
      { situation: 'Auf einen Vortrag reagieren', a: 'Vielen Dank für den Vortrag.', b: 'Ich habe eine Frage dazu …' }
    ],
    tables: [
      { title: 'Finalsätze', head: ['Subjekt', 'Form', 'Beispiel'], rows: [['gleich', 'um … zu', 'Ich spare, um zu reisen.'], ['verschieden', 'damit', 'Ich erkläre es, damit du es verstehst.']] }
    ]
  },
  {
    n: 25, cefr: 'B1', title: 'Umgangsformen & Höflichkeit', short: 'Umgang',
    subsections: ['Begrüßungen international', 'Duzen oder siezen?', 'Keine Panik'],
    handlungsfelder: ['Anrede & Begrüßung', 'Small Talk', 'Umgang mit Fehlern'],
    sprachhandlungen: [
      'über Begrüßungsformen in verschiedenen Ländern sprechen',
      'Duzen und Siezen richtig einsetzen',
      'Small Talk führen',
      'Folgen ausdrücken (also, sodass, so … dass)',
      'über den Umgang mit Fehlern in der Fremdsprache sprechen'
    ],
    grammatik: ['Reflexivpronomen mit reziproker Bedeutung', 'Konsekutive Haupt- & Nebensätze: also, folglich, sodass, so … dass'],
    grammarStarIds: ['gram-A2:reflexive-verben', 'gram-B1:konsekutivsätze:-sodass'],
    felder: ['Anrede & Höflichkeit', 'Small Talk', 'Fehlerkultur'],
    redemittel: [
      { situation: 'Duzen anbieten', a: 'Wollen wir uns duzen?', b: 'Gern! Ich bin Shamil.' },
      { situation: 'Small Talk beginnen', a: 'Schönes Wetter heute, nicht?', b: 'Ja, endlich mal Sonne!' },
      { situation: 'Folgen ausdrücken (so … dass)', a: 'Wie war der Vortrag?', b: 'So interessant, dass die Zeit verflogen ist.' },
      { situation: 'Mit Fehlern umgehen', a: 'Entschuldigung, ist das richtig?', b: 'Fast – aber keine Sorge, Fehler gehören dazu.' }
    ],
    tables: [
      { title: 'Konsekutiv', head: ['Muster', 'Beispiel'], rows: [['so + Adj. + dass', 'so kalt, dass der See zufror'], ['…, sodass', 'Er kam spät, sodass wir warteten.']] }
    ]
  },
  {
    n: 26, cefr: 'B1', title: 'Arbeitsstart in Dresden', short: 'Arbeit',
    subsections: ['Eine Stelle in Dresden', 'Der erste Arbeitstag', 'Silicon Saxony'],
    handlungsfelder: ['Arbeitsvertrag', 'Vorstellung im Team', 'Wirtschaftsstandort'],
    sprachhandlungen: [
      'einen Arbeitsvertrag im Kern verstehen',
      'ausführlich über sich Auskunft geben',
      'sagen, was man machen lässt (lassen + Infinitiv)',
      'über Zukunftsträume schreiben',
      'Kleinanzeigen verstehen'
    ],
    grammatik: ['„(sich) lassen" + Verb (Präsens & Perfekt)', 'Modalverben im Perfekt'],
    grammarStarIds: ['gram-B1:lassen-&-modalverben-im-perfekt'],
    felder: ['Vertrag & Stelle', 'Erster Arbeitstag', 'Wirtschaft & Region'],
    redemittel: [
      { situation: 'Sich im Team vorstellen', a: 'Darf ich mich kurz vorstellen?', b: 'Ja, bitte!' },
      { situation: 'Etwas machen lassen', a: 'Reparierst du das Rad selbst?', b: 'Nein, ich lasse es in der Werkstatt reparieren.' },
      { situation: 'Über den Vertrag sprechen', a: 'Wie sind die Arbeitszeiten?', b: 'Gleitzeit, 40 Stunden pro Woche.' },
      { situation: 'Über Zukunftspläne schreiben', a: 'Wo siehst du dich in fünf Jahren?', b: 'Ich würde gern ein eigenes Team leiten.' }
    ],
    tables: [
      { title: '„lassen" & Perfekt', head: ['Struktur', 'Beispiel'], rows: [['lassen + Infinitiv', 'Ich lasse das Auto waschen.'], ['Perfekt (Doppelinfinitiv)', 'Ich habe es reparieren lassen.'], ['Modal im Perfekt', 'Ich habe warten müssen.']] }
    ]
  },
  {
    n: 27, cefr: 'B1', title: 'Berlin: Geschichte & Orte', short: 'Berlin',
    subsections: ['Alles anders', 'Berliner Geschichte(n)', 'Entdeckungen'],
    handlungsfelder: ['Sehenswürdigkeiten', 'Stadtgeschichte', 'Lieblingsorte'],
    sprachhandlungen: [
      'einen längeren Text über Stadtgeschichte verstehen',
      'erzählen, was vorher passiert war (Plusquamperfekt)',
      'Abläufe ordnen (nachdem, bevor, während)',
      'die Geschichte der eigenen Heimatstadt vorstellen',
      'eigene Texte über Lieblingsorte verfassen'
    ],
    grammatik: ['Plusquamperfekt: Aktiv & Passiv', 'Vorzeitigkeit mit „nachdem"', 'Nachzeitigkeit mit „bevor"', 'Gleichzeitigkeit mit „während"'],
    grammarStarIds: ['gram-B1:plusquamperfekt-&-nachdem/bevor'],
    felder: ['Stadtgeschichte', 'Orte & Entdeckungen', 'Erzählen'],
    redemittel: [
      { situation: 'Eine Stadt vorstellen', a: 'Was sollte man unbedingt sehen?', b: 'Die Altstadt – und das Viertel, das früher geteilt war.' },
      { situation: 'Vorzeitigkeit (Plusquamperfekt)', a: 'Warum war alles so anders?', b: 'Nachdem die Mauer gefallen war, veränderte sich die Stadt.' },
      { situation: 'Abläufe ordnen', a: 'Was kam zuerst?', b: 'Bevor wir umzogen, hatten wir lange gesucht.' },
      { situation: 'Über Lieblingsorte sprechen', a: 'Hast du einen Lieblingsort?', b: 'Ja, einen kleinen Park am Fluss.' }
    ],
    tables: [
      { title: 'Plusquamperfekt', head: ['Hilfsverb (Prät.)', 'Beispiel'], rows: [['hatte + Part. II', 'Ich hatte gegessen.'], ['war + Part. II', 'Ich war gegangen.']] },
      { title: 'Zeit-Konjunktionen', head: ['Konjunktion', 'Bedeutung'], rows: [['nachdem', 'vorher (Vorzeitigkeit)'], ['bevor', 'nachher'], ['während', 'gleichzeitig']] }
    ]
  },
  {
    n: 28, cefr: 'B1', title: 'Auswandern & Ankommen', short: 'Auswandern',
    subsections: ['Warum auswandern?', 'Sich informieren', 'Im Gastland'],
    handlungsfelder: ['Auswanderungsgründe', 'Informationen einholen', 'Erwartungen & Überraschungen'],
    sprachhandlungen: [
      'sich über Gründe für das Auswandern austauschen',
      'über Zukunftspläne sprechen (Futur I)',
      'sagen, was man nur noch tun muss (brauchen … nur zu)',
      'Aufzählungen verknüpfen (sowohl … als auch, weder … noch)',
      'von unerwarteten Erlebnissen berichten'
    ],
    grammatik: ['Futur I: „werden" + Infinitiv', '„brauchen … nur zu" / „brauchen … nicht/kein … zu" + Infinitiv', 'Zweiteilige Konnektoren: sowohl … als auch, nicht nur … sondern auch', 'Aufzählende Negation: weder … noch'],
    grammarStarIds: ['gram-B1:futur-i', 'gram-B1:zweiteilige-konnektoren'],
    felder: ['Auswandern', 'Pläne & Zukunft', 'Gastland'],
    redemittel: [
      { situation: 'Über Gründe sprechen', a: 'Warum bist du ausgewandert?', b: 'Sowohl wegen der Arbeit als auch wegen der Sprache.' },
      { situation: 'Über Zukunft sprechen (Futur I)', a: 'Was sind deine Pläne?', b: 'Ich werde nächstes Jahr die B1-Prüfung machen.' },
      { situation: 'Was noch zu tun ist', a: 'Ist alles erledigt?', b: 'Fast – ich muss nur noch das Formular abgeben.' },
      { situation: 'Von Überraschungen berichten', a: 'Was hat dich überrascht?', b: 'Dass die Leute weder unfreundlich noch distanziert waren.' }
    ],
    tables: [
      { title: 'Futur I', head: ['Struktur', 'Beispiel'], rows: [['werden + Infinitiv', 'Ich werde umziehen.'], ['Vermutung', 'Es wird wohl regnen.']] },
      { title: 'Zweiteilige Konnektoren', head: ['Konnektor', 'Beispiel'], rows: [['sowohl … als auch', 'sowohl Deutsch als auch Englisch'], ['weder … noch', 'weder Fleisch noch Fisch'], ['nicht nur … sondern auch', 'nicht nur günstig, sondern auch schön']] }
    ]
  },
  {
    n: 29, cefr: 'B1', title: 'Politik & Mitbestimmung', short: 'Politik',
    subsections: ['Politik in Deutschland', 'Parteien', 'Ich engagiere mich'],
    handlungsfelder: ['Politisches System', 'Bundesländer & Wahlen', 'Engagement'],
    sprachhandlungen: [
      'Fachtexte zum politischen System im Kern verstehen',
      'über Wahlen in verschiedenen Ländern berichten',
      'Verhältnisse ausdrücken (je … desto)',
      'verstehen, warum jemand eine Partei wählt',
      'über politisches Engagement recherchieren und berichten'
    ],
    grammatik: ['„je … desto/umso"', 'Relativsätze mit „was" und „wo(r)-"', 'Indefinitartikel & -pronomen: „manch-", „einig-"'],
    grammarStarIds: ['gram-B1:zweiteilige-konnektoren', 'gram-B2:relativsätze'],
    felder: ['Politik & System', 'Wahlen & Parteien', 'Engagement'],
    redemittel: [
      { situation: 'Über Wahlen sprechen', a: 'Gehst du wählen?', b: 'Klar, je mehr Leute wählen, desto besser für die Demokratie.' },
      { situation: 'Eine Position begründen', a: 'Warum wählst du diese Partei?', b: 'Weil sie sich für Bildung einsetzt – das ist mir wichtig.' },
      { situation: 'Verhältnisse ausdrücken', a: 'Lohnt sich Engagement?', b: 'Je aktiver man ist, desto mehr kann man bewegen.' },
      { situation: 'Vorsichtig widersprechen', a: 'Politik bringt doch nichts.', b: 'Das würde ich so nicht sagen – Vieles ändert sich langsam.' }
    ],
    tables: [
      { title: '„je … desto"', head: ['Teil', 'Beispiel'], rows: [['je + Komparativ (Nebensatz)', 'Je mehr ich übe,'], ['desto + Komparativ (Hauptsatz)', 'desto besser werde ich.']] }
    ]
  },
  {
    n: 30, cefr: 'B1', title: 'Deutsch & seine Vielfalt', short: 'Sprache',
    subsections: ['Wie Deutsch wurde, was es ist', 'Varietäten', 'Wörter & Worte'],
    handlungsfelder: ['Deutsch weltweit', 'Dialekte & Varietäten', 'Lieblingswörter'],
    sprachhandlungen: [
      'sich austauschen, wo Deutsch gesprochen wird',
      'Varietäten des Deutschen (D/A/CH) unterscheiden',
      'einen kurzen Vortrag anhand von Fachartikeln halten',
      'das eigene Lieblingswort begründen',
      'kleine Texte und Gedichte selbst verfassen'
    ],
    grammatik: ['Relativsätze & -pronomen im Genitiv'],
    grammarStarIds: ['gram-B2:relativsätze'],
    felder: ['Sprache & Geschichte', 'Dialekte', 'Wörter & Stil'],
    redemittel: [
      { situation: 'Über Sprache sprechen', a: 'Wo wird überall Deutsch gesprochen?', b: 'In Deutschland, Österreich, der Schweiz und einigen Nachbarländern.' },
      { situation: 'Varietäten unterscheiden', a: 'Ist Schweizerdeutsch eine andere Sprache?', b: 'Eher eine Varietät – vieles versteht man, manches nicht.' },
      { situation: 'Ein Lieblingswort begründen', a: 'Was ist dein Lieblingswort?', b: '„Feierabend" – weil es ein Gefühl beschreibt, das es so nur hier gibt.' },
      { situation: 'Einen Vortrag halten', a: 'Heute spreche ich über die Vielfalt des Deutschen.', b: 'Wir sind gespannt.' }
    ],
    tables: [
      { title: 'Relativpronomen im Genitiv', head: ['Genus', 'Form', 'Beispiel'], rows: [['m/n', 'dessen', 'der Mann, dessen Auto …'], ['f/Pl.', 'deren', 'die Frau, deren Kinder …']] }
    ]
  }
];

export const LESSON_LEVELS: Record<CEFR, number[]> = {
  A1: [1, 2, 3, 4, 5, 6, 7, 8],
  A2: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  B1: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  B2: [], C1: [], C2: []
};

const byN = new Map(LEKTIONEN.map((l) => [l.n, l]));
export function lektionByN(n: number): Lektion | undefined { return byN.get(n); }
export function lessonsFor(cefr: CEFR): Lektion[] { return LEKTIONEN.filter((l) => l.cefr === cefr); }
