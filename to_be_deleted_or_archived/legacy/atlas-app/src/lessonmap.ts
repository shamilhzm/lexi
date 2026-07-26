// Star → Lektion tagging overlay. data.ts is auto-ported ("do not hand-edit"),
// so lesson assignments live here as a separate map keyed by the existing,
// stable star ids. Untagged stars stay valid — they scatter freely in their
// CEFR ring outside the lesson sectors, exactly as before.
//
// Invariant (tested): a star may only be tagged to a Lektion of its own CEFR
// level, because map sectors partition each level's ring. Cross-level grammar
// links (e.g. A1 Lektion 5 → the A2 "Perfekt" star) go through
// curriculum.grammarStarIds instead and never through this map.

export interface LessonTag { lektion: number; feld: string; }

// [lektion, feld, terms[]] — terms must match data.ts FREQ entries verbatim.
type Group = [number, string, string[]];

const FREQ_A1: Group[] = [
  [1, 'Menschen', ['der Mann', 'die Frau', 'der Freund']],
  [1, 'Formular & Kontaktdaten', ['der Name']],
  [1, 'Sprachen lernen', ['die Sprache', 'das Wort', 'die Frage', 'sprechen', 'lernen', 'wissen', 'sagen']],
  [1, 'Kleine Wörter', ['ja', 'nein', 'nicht', 'und', 'oder', 'aber']],
  [1, 'Zahlen & Alphabet', ['eins', 'zwei', 'drei']],
  [1, 'Verben', ['sein', 'haben']],
  [2, 'Familie', ['die Familie', 'die Mutter', 'der Vater', 'das Kind', 'lieben']],
  [2, 'Restaurant & Essen', ['das Essen', 'das Brot', 'der Kaffee', 'die Milch', 'das Wasser', 'essen', 'trinken']],
  [2, 'Dinge früher & heute', ['das Buch']],
  [2, 'Adjektive', ['alt', 'jung', 'neu']],
  [3, 'Zeit & Häufigkeit', ['der Tag', 'die Nacht', 'die Zeit', 'das Jahr', 'heute', 'morgen', 'gestern', 'jetzt', 'immer', 'nie']],
  [3, 'Einkaufen & Mengen', ['kaufen', 'der Markt', 'das Geld', 'viel', 'wenig']],
  [3, 'Tageszeiten & Wetter', ['warm', 'kalt']],
  [3, 'Adjektive', ['gut', 'schlecht']],
  [4, 'Arbeit & Beruf', ['die Arbeit', 'arbeiten', 'die Schule']],
  [4, 'Verben', ['machen', 'müssen', 'können', 'werden']],
  [5, 'Hobbys & Freizeit', ['spielen', 'gehen', 'kommen', 'sehen']],
  [5, 'Adjektive', ['schön']],
  [6, 'Wohnen & Möbel', ['das Haus', 'das Zimmer', 'die Tür', 'das Fenster', 'der Tisch', 'der Stuhl', 'wohnen', 'schlafen']],
  [6, 'Adjektive', ['groß', 'klein']],
  [7, 'Verben', ['geben', 'nehmen', 'finden']],
  [7, 'Körper & Co.', ['die Hand', 'der Kopf', 'das Auge']],
  [7, 'Kleine Wörter', ['hier', 'dort']],
  [8, 'Stadt & Wege', ['die Straße', 'das Auto', 'der Zug', 'fahren', 'die Stadt', 'das Land']],
  [8, 'Präpositionen', ['mit', 'ohne', 'für', 'gegen', 'über', 'unter', 'nach', 'vor', 'bei']],
  [8, 'Kleine Wörter', ['wenn', 'weil']]
];

const FREQ_A2: Group[] = [
  [9, 'Feste & Feiern', ['einladen', 'mitbringen', 'treffen', 'bestellen', 'die Musik', 'zusammen', 'endlich']],
  [10, 'Wohnung & Lage', ['die Wohnung', 'die Miete', 'der Nachbar', 'der Schlüssel', 'der Aufzug']],
  [10, 'Verben', ['suchen', 'zeigen', 'brauchen', 'ändern', 'bringen']],
  [10, 'Adjektive', ['frei', 'besetzt']],
  [11, 'Stadt & Kultur', ['der Film', 'das Bild', 'besuchen']],
  [11, 'Verben', ['glauben', 'denken', 'verstehen', 'erklären', 'fragen', 'antworten']],
  [12, 'Bank & Konto', ['bezahlen', 'die Rechnung']],
  [12, 'Geschichten', ['vergessen', 'plötzlich', 'holen']],
  [13, 'Arzt & Apotheke', ['die Gesundheit', 'die Krankheit', 'der Arzt', 'das Krankenhaus', 'die Apotheke']],
  [13, 'Körper & Befinden', ['der Hunger', 'der Durst', 'helfen', 'hoffen', 'leben']],
  [14, 'Kleidung & Kauf', ['das Geschäft', 'der Preis', 'das Angebot', 'der Kunde', 'verkaufen', 'die Farbe']],
  [15, 'Reise & Unterkunft', ['die Reise', 'warten', 'fertig']],
  [15, 'Zeit & Maß', ['früh', 'spät', 'schnell', 'langsam', 'ungefähr', 'mindestens', 'höchstens', 'gleich']],
  [16, 'Schule & Ausbildung', ['lesen', 'schreiben', 'richtig', 'falsch', 'einfach', 'schwierig']],
  [16, 'Berufe', ['der Beruf', 'die Stelle']],
  [17, 'Firma & Abteilungen', ['der Chef', 'der Kollege', 'das Büro']],
  [17, 'Bewerbung & Lebenslauf', ['anfangen', 'aufhören', 'versuchen', 'wichtig', 'möglich', 'nötig']],
  [18, 'Natur & Landschaft', ['das Wetter', 'die Sonne', 'der Regen', 'der Schnee', 'der Wind', 'der Himmel', 'der Berg', 'das Meer', 'der See', 'der Wald', 'das Tier', 'der Hund', 'die Katze', 'der Vogel', 'der Baum', 'die Blume']],
  [18, 'Sportarten', ['der Sport', 'die Mannschaft', 'das Spiel']],
  [18, 'Urlaub & Regionen', ['der Urlaub', 'das Frühstück', 'das Mittagessen', 'das Abendessen']],
  [18, 'Kleine Wörter', ['allein', 'vielleicht', 'wahrscheinlich', 'eigentlich']]
];

const FREQ_B1: Group[] = [
  [19, 'Verkehr & Mobilität', ['die Gefahr', 'gefährlich', 'vorsichtig', 'vermeiden']],
  [20, 'Vergleichen & Beschreiben', ['der Unterschied', 'vergleichen', 'ähnlich']],
  [21, 'Kultur & Bühne', ['der Eindruck', 'die Stimmung']],
  [22, 'Meinung & Gefühl', ['die Meinung', 'das Gefühl', 'der Gedanke', 'die Vorstellung', 'vertrauen', 'die Beziehung', 'persönlich', 'deutlich']],
  [23, 'Entscheidungen', ['die Entscheidung', 'die Möglichkeit', 'die Gelegenheit', 'der Vorteil', 'der Nachteil', 'das Ziel', 'die Aufgabe', 'der Grund', 'der Zweck', 'die Ursache', 'die Folge', 'entscheiden', 'überlegen', 'empfehlen', 'vorschlagen', 'der Vorschlag', 'die Absicht', 'zweifeln', 'die Erfahrung', 'erreichen']],
  [23, 'Hochschule & Studium', ['die Bildung', 'die Forschung']],
  [23, 'Kleine Wörter', ['trotzdem', 'obwohl', 'deshalb', 'außerdem']],
  [24, 'Ehrenamt & Einsatz', ['sich kümmern', 'gemeinsam', 'nützlich', 'notwendig']],
  [24, 'Natur & Umwelt', ['die Umwelt']],
  [24, 'Kleine Wörter', ['damit']],
  [25, 'Fehlerkultur', ['das Problem', 'die Lösung', 'das Verhalten', 'die Gewohnheit']],
  [26, 'Arbeit & Entwicklung', ['der Erfolg', 'die Leistung', 'die Anstrengung', 'der Versuch', 'der Fortschritt', 'die Fähigkeit', 'die Entwicklung', 'die Veränderung', 'entwickeln', 'verbessern', 'verändern', 'ermöglichen', 'verlangen', 'gelingen', 'selbstständig', 'zuverlässig', 'erfolgreich', 'zufrieden', 'neugierig', 'gründlich']],
  [27, 'Erzählen & Geschichte', ['die Erinnerung', 'beschreiben']],
  [27, 'Kleine Wörter', ['während', 'sobald']],
  [28, 'Auswandern & Pläne', ['erwarten', 'vermuten', 'vorbereiten', 'verzichten', 'verlieren', 'gehören']],
  [29, 'Politik & System', ['die Gesellschaft', 'die Regierung', 'das Gesetz', 'die Wirtschaft', 'die Verantwortung', 'die Freiheit', 'das Recht', 'die Pflicht', 'die Sicherheit', 'öffentlich', 'erlauben', 'verbieten', 'fördern', 'überzeugen', 'behaupten']],
  [29, 'Kleine Wörter', ['besonders', 'einerseits', 'je nachdem']],
  [30, 'Sprache & Stil', ['die Bedeutung', 'unterscheiden', 'beweisen']]
];

// Deck/seed cards (id = '{deckId}:{front}') tagged where the card's own level
// matches the lesson's level; everything else stays free atlas content.
const DECK_TAGS: Record<string, LessonTag> = {
  // rad (A2 → L15 travel, B1 → L19 mobility)
  'rad:die Kette': { lektion: 15, feld: 'Rad & Unterwegs' },
  'rad:der Reifen': { lektion: 15, feld: 'Rad & Unterwegs' },
  'rad:die Strecke': { lektion: 15, feld: 'Rad & Unterwegs' },
  'rad:die Abfahrt': { lektion: 15, feld: 'Rad & Unterwegs' },
  'rad:die Verspätung': { lektion: 15, feld: 'Rad & Unterwegs' },
  'rad:der Bahnhof': { lektion: 15, feld: 'Rad & Unterwegs' },
  'rad:das Rennrad': { lektion: 19, feld: 'Rad & Unterwegs' },
  'rad:die Gangschaltung': { lektion: 19, feld: 'Rad & Unterwegs' },
  'rad:der Sattel': { lektion: 19, feld: 'Rad & Unterwegs' },
  'rad:der Lenker': { lektion: 19, feld: 'Rad & Unterwegs' },
  'rad:die Steigung': { lektion: 19, feld: 'Rad & Unterwegs' },
  'rad:die Fahrradkarte': { lektion: 19, feld: 'Rad & Unterwegs' },
  // kueche (A2 → L9 party cooking; B1 stays free)
  'kueche:die Bohne': { lektion: 9, feld: 'Café & Küche' },
  'kueche:die Zutat': { lektion: 9, feld: 'Café & Küche' },
  'kueche:der Teelöffel': { lektion: 9, feld: 'Café & Küche' },
  'kueche:rühren': { lektion: 9, feld: 'Café & Küche' },
  // holz (A2 → L10 furnishing; B1 stays free)
  'holz:das Werkzeug': { lektion: 10, feld: 'Werkstatt' },
  'holz:die Schraube': { lektion: 10, feld: 'Werkstatt' },
  'holz:das Brett': { lektion: 10, feld: 'Werkstatt' },
  // glaube
  'glaube:die Kirche': { lektion: 11, feld: 'Stadt & Kultur' },
  // immo (B1 → L26 arriving for the new job)
  'immo:der Mietvertrag': { lektion: 26, feld: 'Wohnen & Ankommen' },
  'immo:die Anmeldung': { lektion: 26, feld: 'Wohnen & Ankommen' },
  'immo:der Vermieter': { lektion: 26, feld: 'Wohnen & Ankommen' },
  'immo:der Umzug': { lektion: 26, feld: 'Wohnen & Ankommen' },
  'immo:der Quadratmeter': { lektion: 26, feld: 'Wohnen & Ankommen' },
  // behoerden (A2 pieces to fitting A2 lessons; B1 → L26 paperwork)
  'behoerden:das Formular': { lektion: 17, feld: 'Bewerbung & Lebenslauf' },
  'behoerden:der Termin': { lektion: 13, feld: 'Arzt & Apotheke' },
  'behoerden:die Unterschrift': { lektion: 12, feld: 'Bank & Konto' },
  'behoerden:das Bürgeramt': { lektion: 26, feld: 'Behörden & Papiere' },
  'behoerden:die Krankenversicherung': { lektion: 26, feld: 'Behörden & Papiere' },
  'behoerden:die Frist': { lektion: 26, feld: 'Behörden & Papiere' },
  'behoerden:der Antrag': { lektion: 26, feld: 'Behörden & Papiere' },
  'behoerden:die Gebühr': { lektion: 26, feld: 'Behörden & Papiere' },
  // politik / energie (B1 pieces)
  'politik:die Mehrheit': { lektion: 29, feld: 'Politik & System' },
  'energie:die Umwelt': { lektion: 24, feld: 'Natur & Umwelt' }
};

// Grammar stars tagged to the Lektion that introduces them (same level only).
const GRAMMAR_TAGS: Record<string, number> = {
  'gram-A1:artikel-&-genus': 1,
  'gram-A1:sein-&-haben': 1,
  'gram-A1:präsens-(regelmäßig)': 1,
  'gram-A1:personalpronomen-(nominativ)': 1,
  'gram-A1:wortstellung-&-fragen': 1,
  'gram-A1:artikelwörter-&-kein': 2,
  'gram-A1:possessivartikel': 2,
  'gram-A1:präteritum:-sein-&-haben': 3,
  'gram-A1:personalpronomen-(akkusativ)': 3,
  'gram-A1:zeitangaben-mit-präpositionen': 4,
  'gram-A1:verben-mit-vokalwechsel': 5,
  'gram-A1:ortsangaben-mit-dativ': 6,
  'gram-A1:partikeln:-denn,-ja,-doch,-mal': 7,
  'gram-A1:richtungsangaben-&-indefinitpronomen': 8,
  'gram-A2:n-deklination': 9,
  'gram-A2:dativ:-pronomen-&-stellung': 9,
  'gram-A2:vergleiche:-so-…-wie-/-als': 10,
  'gram-A2:wechselpräpositionen': 10,
  'gram-A2:reflexive-verben': 11,
  'gram-A2:präteritum': 12,
  'gram-A2:nebensätze:-wenn-&-als': 12,
  'gram-A2:temporalsätze:-seit(dem)-&-bis': 13,
  'gram-A2:modalverben': 13,
  'gram-A2:frageartikel-&-demonstrativartikel': 14,
  'gram-A2:indirekte-fragesätze': 15,
  'gram-B1:passiv:-perfekt-&-modalverben': 19,
  'gram-B1:komparativ-&-superlativ': 20,
  'gram-B1:infinitivsätze-(zu-+-infinitiv)': 21,
  'gram-B1:genitiv': 21,
  'gram-B1:irreale-konditionalsätze': 22,
  'gram-B1:konjunktiv-ii-(würde)': 22,
  'gram-B1:nebensätze-(weil/dass)': 23,
  'gram-B1:finalsätze:-damit-&-um-…-zu': 24,
  'gram-B1:konsekutivsätze:-sodass': 25,
  'gram-B1:lassen-&-modalverben-im-perfekt': 26,
  'gram-B1:plusquamperfekt-&-nachdem/bevor': 27,
  'gram-B1:futur-i': 28,
  'gram-B1:zweiteilige-konnektoren': 28
};

function build(): Record<string, LessonTag> {
  const out: Record<string, LessonTag> = {};
  const add = (level: string, groups: Group[]) => {
    for (const [lektion, feld, terms] of groups)
      for (const t of terms) out['freq-' + level + ':' + t] = { lektion, feld };
  };
  add('A1', FREQ_A1); add('A2', FREQ_A2); add('B1', FREQ_B1);
  Object.assign(out, DECK_TAGS);
  for (const id in GRAMMAR_TAGS) out[id] = { lektion: GRAMMAR_TAGS[id], feld: 'Grammatik' };
  return out;
}

export const LESSON_TAGS: Record<string, LessonTag> = build();

export function tagFor(starId: string): LessonTag | undefined {
  return LESSON_TAGS[starId];
}
