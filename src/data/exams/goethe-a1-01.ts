// Goethe-Zertifikat A1 · Start Deutsch 1 — Lexi's own paper, in Goethe's format.
//
// The second paper, and the one that proved the engine was not as general as it
// claimed. telc B1 is true/false-over-audio and multiple-choice-over-an-article;
// Start Deutsch 1 is multiple-choice-over-*dialogue* and true/false-over-a-*sign*.
// Same item shapes, different stimuli — which is why `McPart` and `TfPart` now
// carry an optional `audio` block and an optional read stimulus instead of each
// baking one in.
//
// Structure from the published Modellsatz (goethe.de):
//
//   Hören      ~20 min   15 items   Teil 1 (1–6) MC, heard twice
//                                   Teil 2 (7–10) richtig/falsch, heard ONCE
//                                   Teil 3 (11–15) MC, heard twice
//   Lesen      ~25 min   15 items   Teil 1 (16–20) richtig/falsch over two emails
//                                   Teil 2 (21–25) which of two adverts fits
//                                   Teil 3 (26–30) richtig/falsch over public notices
//   Schreiben  ~20 min              a form, then ~30 words on three given points
//   Sprechen   ~15 min              introduce yourself · ask and give information ·
//                                   make and respond to a request
//
// Four skills of 25, scaled to 100, pass at 60 — and, unlike telc B1, **no
// separate floor on the oral**. That difference is why the scheme travels with
// the paper (see `Scheme` in lib/exam.ts) rather than living in a constant.
//
// Every text is written for Lexi. Goethe's own Modellsatz is copyrighted and none
// of it is reproduced.
import { GOETHE_A1, type ExamPaper } from '../../lib/exam.ts';
import { A1_REDEMITTEL, A1_SPEAKING } from './goethe-a1-speaking.ts';

/** 15 items carrying 25 points. Goethe marks one point an item and scales; the
 *  scaling is folded in here so the subtest total is the reported one. */
const PER = 25 / 15;

export const PAPER: ExamPaper = {
  id: 'goethe-a1-01',
  provider: 'goethe',
  level: 'A1',
  title: 'Goethe-Zertifikat A1 · Start Deutsch 1',
  blurb: 'The whole A1 exam in Goethe’s format — 30 scored items across listening and reading, '
    + 'the short written message, and the three-part group oral with model answers at three levels.',
  scheme: GOETHE_A1,
  blocks: [
    { label: 'Hören', minutes: 20, partIds: ['h1', 'h2', 'h3'] },
    { label: 'Lesen und Schreiben', minutes: 45, partIds: ['l1', 'l2', 'l3'] },
  ],

  parts: [
    // ---- Hören, Teil 1 (1–6) ---------------------------------------------
    {
      id: 'h1',
      kind: 'mc',
      subtest: 'listening',
      teil: 1,
      label: 'Hören, Teil 1',
      skill: 'Kurze Gespräche',
      rubric: 'Was ist richtig? Kreuzen Sie an: a, b oder c. Sie hören jeden Text zweimal.',
      rubricEn: 'Six short conversations, each heard twice. Read the question before the audio '
        + 'starts — at A1 the wrong answers are usually numbers you also hear.',
      pointsPerItem: PER,
      audio: {
        plays: 2,
        intro: 'Sie hören sechs kurze Gespräche. Zu jedem Gespräch gibt es eine Aufgabe.',
        tracks: [
          { n: 1, label: 'Im Kaufhaus', lines: [
            { who: 'Kundin', text: 'Entschuldigung, was kostet diese Jacke?' },
            { who: 'Verkäufer', text: 'Einen Moment … die Jacke kostet neunundfünfzig Euro. Aber heute ist sie im Angebot: neununddreißig Euro.' },
            { who: 'Kundin', text: 'Neununddreißig? Gut, die nehme ich.' },
          ] },
          { n: 2, label: 'Am Telefon', lines: [
            { who: 'Mann', text: 'Hallo Sabine, wann fängt der Film an? Um acht?' },
            { who: 'Frau', text: 'Nein, um halb neun. Aber komm bitte schon um acht, dann trinken wir noch etwas.' },
            { who: 'Mann', text: 'Alles klar, ich bin um acht da.' },
          ] },
          { n: 3, label: 'Im Café', lines: [
            { who: 'Kellnerin', text: 'Was möchten Sie trinken?' },
            { who: 'Gast', text: 'Einen Kaffee, bitte. Ach nein, warten Sie — lieber einen Tee. Es ist so kalt heute.' },
            { who: 'Kellnerin', text: 'Einen Tee, gern.' },
          ] },
          { n: 4, label: 'Im Deutschkurs', lines: [
            { who: 'Lehrerin', text: 'Frau Bauer, wo wohnen Sie eigentlich?' },
            { who: 'Frau Bauer', text: 'Ich habe früher in München gewohnt, aber jetzt wohne ich in Bonn. Meine Schwester lebt in Berlin.' },
          ] },
          { n: 5, label: 'Vor dem Büro', lines: [
            { who: 'Kollege', text: 'Kommst du mit dem Auto zur Arbeit?' },
            { who: 'Kollegin', text: 'Nein, das ist zu teuer. Ich fahre mit dem Fahrrad, auch im Winter. Nur bei Regen nehme ich den Bus.' },
          ] },
          { n: 6, label: 'Am Bahnhof', lines: [
            { who: 'Reisender', text: 'Entschuldigung, wann fährt der nächste Zug nach Köln?' },
            { who: 'Beamtin', text: 'Um vierzehn Uhr zwanzig, Gleis drei. Der Zug um dreizehn Uhr fünfzig fällt heute leider aus.' },
          ] },
        ],
      },
      questions: [
        { n: 1, stem: 'Was kostet die Jacke heute?', options: [
          { k: 'a', text: 'Neununddreißig Euro.' }, { k: 'b', text: 'Neunundfünfzig Euro.' }, { k: 'c', text: 'Fünfundneunzig Euro.' }] },
        { n: 2, stem: 'Wann fängt der Film an?', options: [
          { k: 'a', text: 'Um acht Uhr.' }, { k: 'b', text: 'Um halb neun.' }, { k: 'c', text: 'Um neun Uhr.' }] },
        { n: 3, stem: 'Was möchte der Gast trinken?', options: [
          { k: 'a', text: 'Einen Kaffee.' }, { k: 'b', text: 'Einen Tee.' }, { k: 'c', text: 'Ein Wasser.' }] },
        { n: 4, stem: 'Wo wohnt Frau Bauer jetzt?', options: [
          { k: 'a', text: 'In München.' }, { k: 'b', text: 'In Berlin.' }, { k: 'c', text: 'In Bonn.' }] },
        { n: 5, stem: 'Wie kommt die Kollegin normalerweise zur Arbeit?', options: [
          { k: 'a', text: 'Mit dem Auto.' }, { k: 'b', text: 'Mit dem Fahrrad.' }, { k: 'c', text: 'Mit dem Bus.' }] },
        { n: 6, stem: 'Wann fährt der nächste Zug nach Köln?', options: [
          { k: 'a', text: 'Um 13.50 Uhr.' }, { k: 'b', text: 'Um 14.20 Uhr.' }, { k: 'c', text: 'Um 15.00 Uhr.' }] },
      ],
      items: [
        { n: 1, answer: 'a', why: 'Both prices are said. 59 is the normal price; **39** is today’s. The trap is answering with the first number you hear.' },
        { n: 2, answer: 'b', why: '„Nein, um halb neun." Eight o’clock is when she asks him to *arrive*, not when the film starts.' },
        { n: 3, answer: 'b', why: 'He orders a coffee and immediately corrects himself — *„Ach nein … lieber einen Tee."* A1 listening tests the correction constantly.' },
        { n: 4, answer: 'c', why: '„…früher in München … aber jetzt wohne ich in Bonn." Berlin is her sister.' },
        { n: 5, answer: 'b', why: 'Bike normally, bus only in the rain, and the car is rejected as too expensive.' },
        { n: 6, answer: 'b', why: '14.20 from platform three; the 13.50 is cancelled.' },
      ],
    },

    // ---- Hören, Teil 2 (7–10) --------------------------------------------
    {
      id: 'h2',
      kind: 'tf',
      subtest: 'listening',
      teil: 2,
      label: 'Hören, Teil 2',
      skill: 'Durchsagen',
      rubric: 'Kreuzen Sie an: Richtig oder Falsch. Sie hören jeden Text einmal.',
      rubricEn: 'Four public announcements, each heard **once**. This is the part that punishes '
        + 'reading the statement after the audio instead of before it.',
      pointsPerItem: PER,
      intro: '',
      audio: {
        plays: 1,
        intro: 'Sie hören vier Durchsagen. Sie hören jeden Text einmal.',
        tracks: [
          { n: 7, label: 'Am Bahnhof', lines: [{ text: 'Achtung auf Gleis fünf: Der Regionalzug nach Kassel, Abfahrt sechzehn Uhr zwölf, fährt heute von Gleis acht. Wir bitten um Entschuldigung.' }] },
          { n: 8, label: 'Im Supermarkt', lines: [{ text: 'Liebe Kundinnen und Kunden, wir schließen in zehn Minuten. Bitte kommen Sie jetzt zur Kasse. Morgen sind wir ab sieben Uhr wieder für Sie da.' }] },
          { n: 9, label: 'Am Flughafen', lines: [{ text: 'Letzter Aufruf für Frau Meier, gebucht auf den Flug nach Wien. Bitte kommen Sie sofort zum Ausgang B zwölf.' }] },
          { n: 10, label: 'Im Schwimmbad', lines: [{ text: 'Liebe Gäste, das Schwimmbad bleibt am Montag geschlossen. Am Dienstag können Sie wieder ab acht Uhr schwimmen.' }] },
        ],
      },
      statements: [
        { n: 7, text: 'Der Zug nach Kassel fährt heute von Gleis fünf.' },
        { n: 8, text: 'Der Supermarkt schließt bald.' },
        { n: 9, text: 'Frau Meier soll zum Ausgang kommen.' },
        { n: 10, text: 'Am Dienstag ist das Schwimmbad geschlossen.' },
      ],
      items: [
        { n: 7, answer: 'f', why: 'Platform **eight** today, not five. Both numbers are said and the announcement leads with the wrong one.' },
        { n: 8, answer: 'r', why: '„…wir schließen in zehn Minuten."' },
        { n: 9, answer: 'r', why: '„Bitte kommen Sie sofort zum Ausgang B zwölf."' },
        { n: 10, answer: 'f', why: 'Closed on **Monday**; Tuesday it reopens at eight.' },
      ],
    },

    // ---- Hören, Teil 3 (11–15) -------------------------------------------
    {
      id: 'h3',
      kind: 'mc',
      subtest: 'listening',
      teil: 3,
      label: 'Hören, Teil 3',
      skill: 'Nachrichten und Ansagen',
      rubric: 'Was ist richtig? Kreuzen Sie an: a, b oder c. Sie hören jeden Text zweimal.',
      rubricEn: 'Five recorded messages, each heard twice. Every question asks for one fact — a '
        + 'time, a place, a thing to bring.',
      pointsPerItem: PER,
      audio: {
        plays: 2,
        intro: 'Sie hören fünf kurze Nachrichten auf dem Anrufbeantworter.',
        tracks: [
          { n: 11, label: 'Nachricht 1', lines: [{ text: 'Hallo Julia, hier ist Mehmet. Wir treffen uns morgen nicht um sieben, sondern schon um sechs Uhr vor dem Kino. Bis dann!' }] },
          { n: 12, label: 'Nachricht 2', lines: [{ text: 'Hi Papa, ich koche heute Abend. Kannst du bitte Brot mitbringen? Milch haben wir noch genug. Danke!' }] },
          { n: 13, label: 'Nachricht 3', lines: [{ text: 'Frau Klein, hier ist die Hausverwaltung. Ihr Schlüssel liegt bei Ihrer Nachbarin in Wohnung vier. Sie ist ab siebzehn Uhr zu Hause.' }] },
          { n: 14, label: 'Nachricht 4', lines: [{ text: 'Guten Tag, hier ist die Praxis Doktor Schulz. Bitte rufen Sie uns zurück: null zwei zwei eins, drei vier fünf sechs.' }] },
          { n: 15, label: 'Nachricht 5', lines: [{ text: 'Hallo Anna, ich komme heute später. Mein Bus hat Verspätung. Ich bin gegen halb acht da. Fang schon mal ohne mich an.' }] },
        ],
      },
      questions: [
        { n: 11, stem: 'Wann treffen sich Julia und Mehmet?', options: [
          { k: 'a', text: 'Um sechs Uhr.' }, { k: 'b', text: 'Um sieben Uhr.' }, { k: 'c', text: 'Um halb acht.' }] },
        { n: 12, stem: 'Was soll der Vater mitbringen?', options: [
          { k: 'a', text: 'Milch.' }, { k: 'b', text: 'Brot.' }, { k: 'c', text: 'Nichts.' }] },
        { n: 13, stem: 'Wo ist der Schlüssel?', options: [
          { k: 'a', text: 'Bei der Hausverwaltung.' }, { k: 'b', text: 'Bei der Nachbarin.' }, { k: 'c', text: 'In der Wohnung.' }] },
        { n: 14, stem: 'Wie ist die Telefonnummer?', options: [
          { k: 'a', text: '0221 3456' }, { k: 'b', text: '0212 3456' }, { k: 'c', text: '0221 4356' }] },
        { n: 15, stem: 'Warum kommt der Mann später?', options: [
          { k: 'a', text: 'Er muss arbeiten.' }, { k: 'b', text: 'Sein Bus hat Verspätung.' }, { k: 'c', text: 'Er ist krank.' }] },
      ],
      items: [
        { n: 11, answer: 'a', why: '„…nicht um sieben, sondern schon um sechs Uhr." *sondern* is the whole item.' },
        { n: 12, answer: 'b', why: 'Bread is asked for; milk is explicitly the thing they already have enough of.' },
        { n: 13, answer: 'b', why: '„Ihr Schlüssel liegt bei Ihrer Nachbarin in Wohnung vier." Wohnung vier is where the neighbour lives, not the key.' },
        { n: 14, answer: 'a', why: '0221 3456. All three options are the same digits in a different order — A1 listening tests the digits themselves.' },
        { n: 15, answer: 'b', why: '„Mein Bus hat Verspätung."' },
      ],
    },

    // ---- Lesen, Teil 1 (16–20) -------------------------------------------
    {
      id: 'l1',
      kind: 'tf',
      subtest: 'reading',
      teil: 1,
      label: 'Lesen, Teil 1',
      skill: 'Kurze Texte',
      rubric: 'Lesen Sie die beiden Texte und die Aufgaben 16 bis 20. Kreuzen Sie an: Richtig oder Falsch.',
      rubricEn: 'Two short emails, five true/false statements. Every statement is decided by one '
        + 'sentence — find it before you decide.',
      pointsPerItem: PER,
      intro: '',
      texts: [
        { label: 'Text 1', body: 'Liebe Nadia,\n\nam Samstag habe ich Geburtstag und mache eine kleine Party. '
          + 'Wir fangen um achtzehn Uhr an, bei mir zu Hause. Kannst du einen Salat mitbringen? '
          + 'Getränke habe ich genug. Bring bitte auch eine Jacke mit — wir sitzen im Garten.\n\n'
          + 'Bis Samstag!\nDeine Lena' },
        { label: 'Text 2', body: 'Sehr geehrte Frau Ali,\n\nIhr Deutschkurs beginnt am Montag, dem 8. September, '
          + 'um neun Uhr in Raum 12. Der Kurs dauert vier Wochen. Bitte bringen Sie das Buch am ersten '
          + 'Tag noch nicht mit — Sie bekommen es von uns.\n\nMit freundlichen Grüßen\nSprachschule Aktiv' },
      ],
      statements: [
        { n: 16, text: 'Lenas Party beginnt am Abend.' },
        { n: 17, text: 'Nadia soll Getränke mitbringen.' },
        { n: 18, text: 'Die Party ist draußen.' },
        { n: 19, text: 'Der Deutschkurs dauert einen Monat.' },
        { n: 20, text: 'Frau Ali muss das Buch selbst kaufen.' },
      ],
      items: [
        { n: 16, answer: 'r', why: '„Wir fangen um achtzehn Uhr an" — six in the evening.' },
        { n: 17, answer: 'f', why: 'A **salad**. Drinks are the thing Lena already has enough of.' },
        { n: 18, answer: 'r', why: '„…wir sitzen im Garten", which is also why she asks for a jacket.' },
        { n: 19, answer: 'r', why: 'Four weeks is a month. The item tests whether you convert rather than match words.' },
        { n: 20, answer: 'f', why: '„Sie bekommen es von uns" — the school provides it.' },
      ],
    },

    // ---- Lesen, Teil 2 (21–25) -------------------------------------------
    {
      id: 'l2',
      kind: 'mc',
      subtest: 'reading',
      teil: 2,
      label: 'Lesen, Teil 2',
      skill: 'Anzeigen',
      rubric: 'Lesen Sie die Situationen und die Anzeigen. Welche Anzeige passt? Kreuzen Sie an: a oder b.',
      rubricEn: 'A situation and two adverts. Exactly one detail decides it each time — a day, a '
        + 'price, who the thing is for. Read the situation twice, the adverts once.',
      pointsPerItem: PER,
      questions: [
        { n: 21, stem: 'Sie suchen eine kleine Wohnung für eine Person.',
          stimulus: [
            { label: 'a', body: 'Schöne 1-Zimmer-Wohnung, 32 m², Küche und Bad, ab sofort frei. 480 € warm.' },
            { label: 'b', body: 'Familienhaus, 4 Zimmer, großer Garten, ruhige Lage. 1 400 € kalt.' },
          ],
          options: [{ k: 'a', text: 'Anzeige a' }, { k: 'b', text: 'Anzeige b' }] },
        { n: 22, stem: 'Sie möchten abends nach der Arbeit Deutsch lernen.',
          stimulus: [
            { label: 'a', body: 'Intensivkurs Deutsch — Montag bis Freitag, 9–13 Uhr. Für Studierende.' },
            { label: 'b', body: 'Deutsch am Abend — Dienstag und Donnerstag, 18.30–20.00 Uhr. Für Berufstätige.' },
          ],
          options: [{ k: 'a', text: 'Anzeige a' }, { k: 'b', text: 'Anzeige b' }] },
        { n: 23, stem: 'Ihr Kind ist am Sonntag krank. Sie brauchen einen Arzt.',
          stimulus: [
            { label: 'a', body: 'Praxis Dr. Weber, Kinderärztin. Mo–Fr 8–17 Uhr. Am Wochenende geschlossen.' },
            { label: 'b', body: 'Notdienst für Kinder — jedes Wochenende 9–20 Uhr, Klinikum Nord, Haus 3.' },
          ],
          options: [{ k: 'a', text: 'Anzeige a' }, { k: 'b', text: 'Anzeige b' }] },
        { n: 24, stem: 'Sie möchten ein gebrauchtes Fahrrad kaufen.',
          stimulus: [
            { label: 'a', body: 'Fahrrad zu verkaufen, 3 Jahre alt, gut gefahren, 90 €. Nur Abholung.' },
            { label: 'b', body: 'Fahrradwerkstatt Kern — Reparaturen aller Marken, Termine online.' },
          ],
          options: [{ k: 'a', text: 'Anzeige a' }, { k: 'b', text: 'Anzeige b' }] },
        { n: 25, stem: 'Sie wollen am Wochenende mit Ihrer Familie ins Schwimmbad.',
          stimulus: [
            { label: 'a', body: 'Hallenbad Süd — Familienkarte samstags und sonntags 12 € für zwei Erwachsene und zwei Kinder.' },
            { label: 'b', body: 'Schwimmkurs für Anfänger — 10 Termine, dienstags 17 Uhr, Anmeldung nötig.' },
          ],
          options: [{ k: 'a', text: 'Anzeige a' }, { k: 'b', text: 'Anzeige b' }] },
      ],
      items: [
        { n: 21, answer: 'a', why: 'One room for one person. (b) is a family house — four rooms and three times the rent.' },
        { n: 22, answer: 'b', why: '„am Abend … für Berufstätige". (a) runs 9–13, which is exactly when you are at work.' },
        { n: 23, answer: 'b', why: 'The weekend is the whole point: (a) says „Am Wochenende geschlossen".' },
        { n: 24, answer: 'a', why: 'You want to *buy* a bike; (b) repairs them.' },
        { n: 25, answer: 'a', why: 'A family ticket at the weekend. (b) is a course on Tuesdays, and needs registration.' },
      ],
    },

    // ---- Lesen, Teil 3 (26–30) -------------------------------------------
    {
      id: 'l3',
      kind: 'tf',
      subtest: 'reading',
      teil: 3,
      label: 'Lesen, Teil 3',
      skill: 'Schilder und Aushänge',
      rubric: 'Lesen Sie die Texte und die Aufgaben 26 bis 30. Kreuzen Sie an: Richtig oder Falsch.',
      rubricEn: 'Five public notices — the German you actually meet on a door. Short, and every '
        + 'word counts: an opening time, a day, a negation.',
      pointsPerItem: PER,
      intro: '',
      texts: [
        { label: 'An der Bäckerei', body: 'Öffnungszeiten:\nMontag–Freitag 6.00–18.00\nSamstag 6.00–12.00\nSonntag geschlossen' },
        { label: 'Im Hausflur', body: 'Der Aufzug ist bis Freitag außer Betrieb.\nBitte benutzen Sie die Treppe.' },
        { label: 'Vor dem Haus', body: 'Parken nur für Bewohner.\nBesucher: Parkplatz hinter dem Haus.' },
        { label: 'In der Bibliothek', body: 'Bitte leise sprechen.\nEssen und Trinken sind nicht erlaubt.\nWLAN kostenlos.' },
        { label: 'Am Schwimmbad', body: 'Heute wegen einer Veranstaltung erst ab 15.00 Uhr geöffnet.' },
      ],
      statements: [
        { n: 26, text: 'Am Sonntag können Sie hier Brot kaufen.' },
        { n: 27, text: 'Sie müssen diese Woche die Treppe nehmen.' },
        { n: 28, text: 'Besucher dürfen vor dem Haus parken.' },
        { n: 29, text: 'In der Bibliothek können Sie kostenlos ins Internet.' },
        { n: 30, text: 'Das Schwimmbad ist heute den ganzen Tag geschlossen.' },
      ],
      items: [
        { n: 26, answer: 'f', why: '„Sonntag geschlossen."' },
        { n: 27, answer: 'r', why: 'The lift is out of service until Friday and the notice says to use the stairs.' },
        { n: 28, answer: 'f', why: 'Residents only in front; visitors park **behind** the building.' },
        { n: 29, answer: 'r', why: '„WLAN kostenlos." Note that eating is what is forbidden, not the internet.' },
        { n: 30, answer: 'f', why: 'Closed until 15.00, then open — *erst ab* is the word the item turns on.' },
      ],
    },
  ],

  // ---- Schreiben ---------------------------------------------------------
  writing: {
    id: 'a1-schreiben',
    minutes: 20,
    situation: 'Schreiben Teil 2. Sie möchten im Mai einen Deutschkurs in Wien machen. '
      + 'Schreiben Sie an die Sprachschule.',
    situationEn: 'About 30 words, plus a greeting and a sign-off. Goethe’s Schreiben also has a '
      + 'Teil 1 in which you complete five fields of a form — practise that on paper; it is the '
      + 'one task in the exam that is pure transcription.',
    letter: {
      from: 'Sprachschule Wien · info@sprachschule-wien.at',
      body: [
        'Sie schreiben eine kurze Nachricht an die Sprachschule.',
        'Schreiben Sie zu jedem Punkt ein bis zwei Sätze (circa 30 Wörter).',
        'Vergessen Sie die Anrede und den Gruß nicht.',
      ],
    },
    leitpunkte: [
      { de: 'Warum schreiben Sie?', en: 'Why are you writing?' },
      { de: 'Wann möchten Sie kommen?', en: 'When would you like to come?' },
      { de: 'Was möchten Sie wissen (Preis, Uhrzeit …)?', en: 'What do you want to know (price, time …)?' },
      { de: 'Anrede und Gruß', en: 'Greeting and sign-off' },
    ],
    models: [
      {
        band: 'A1', label: 'Sicher',
        note: 'Three short sentences and the two formulas. At A1 this is a full pass — the task asks '
          + 'for about thirty words, not for range.',
        lines: [
          { de: 'Sehr geehrte Damen und Herren,', en: 'Dear Sir or Madam,' },
          { de: 'ich möchte einen Deutschkurs machen.', en: 'I would like to do a German course.' },
          { de: 'Ich komme im Mai nach Wien.', en: 'I am coming to Vienna in May.' },
          { de: 'Was kostet der Kurs?', en: 'What does the course cost?' },
          { de: 'Mit freundlichen Grüßen', en: 'Yours faithfully' },
          { de: 'Amir Karimi', en: 'Amir Karimi' },
        ],
      },
      {
        band: 'A2', label: 'Ziel',
        note: 'The same three points, joined up. „und", „vom … bis" and a second question are all the '
          + 'extra machinery this needs.',
        lines: [
          { de: 'Sehr geehrte Damen und Herren,', en: 'Dear Sir or Madam,' },
          { de: 'ich interessiere mich für einen Deutschkurs bei Ihnen.', en: 'I am interested in a German course with you.' },
          { de: 'Ich möchte vom 4. bis zum 29. Mai nach Wien kommen.', en: 'I would like to come to Vienna from 4 to 29 May.' },
          { de: 'Können Sie mir bitte schreiben, was der Kurs kostet und wann der Unterricht beginnt?', en: 'Could you please tell me what the course costs and when lessons start?' },
          { de: 'Vielen Dank im Voraus.', en: 'Many thanks in advance.' },
          { de: 'Mit freundlichen Grüßen', en: 'Yours faithfully' },
          { de: 'Amir Karimi', en: 'Amir Karimi' },
        ],
      },
      {
        band: 'B1', label: 'Stark',
        note: 'Beyond what A1 asks for, and shown so you can see where the ladder goes: an indirect '
          + 'question, a subordinate clause, and a reason.',
        lines: [
          { de: 'Sehr geehrte Damen und Herren,', en: 'Dear Sir or Madam,' },
          { de: 'ich schreibe Ihnen, weil ich im Mai einen Deutschkurs in Wien besuchen möchte.', en: 'I am writing because I would like to attend a German course in Vienna in May.' },
          { de: 'Geplant ist der Zeitraum vom 4. bis zum 29. Mai; ein Vormittagskurs wäre mir am liebsten, da ich nachmittags arbeite.', en: 'I am planning 4 to 29 May; a morning course would suit me best, as I work in the afternoons.' },
          { de: 'Könnten Sie mir mitteilen, wie viel der Kurs kostet und ob noch Plätze frei sind?', en: 'Could you tell me how much the course costs and whether there are still places?' },
          { de: 'Über eine kurze Antwort würde ich mich sehr freuen.', en: 'I would be very glad of a brief reply.' },
          { de: 'Mit freundlichen Grüßen', en: 'Yours faithfully' },
          { de: 'Amir Karimi', en: 'Amir Karimi' },
        ],
      },
    ],
  },

  speaking: A1_SPEAKING,
  redemittel: A1_REDEMITTEL,

  briefing: [
    {
      q: 'Wie läuft die Prüfung ab?',
      a: 'Hören (~20 min), then Lesen and Schreiben together in one 45-minute block, then Sprechen '
        + '(~15 min) — which at A1 is a **group** exam with two or three other candidates, not a pair.',
    },
    {
      q: 'Wie viele Punkte brauche ich?',
      a: 'Each of the four skills is worth 25, scaled to 100, and you pass at 60. Unlike telc B1 there '
        + 'is **no separate minimum on the oral**, so a strong written half genuinely can carry a '
        + 'weak spoken one — the one place where the usual advice does not apply.',
    },
    {
      q: 'Wo verliert man am meisten Punkte?',
      a: 'Hören Teil 2, which is heard only **once**, and Lesen Teil 3, where a single word — *erst '
        + 'ab*, *nur für*, *außer* — flips the answer. Read the statements before the audio starts; '
        + 'you are given time for exactly that.',
    },
    {
      q: 'Was muss ich beim Schreiben können?',
      a: 'Two things and no more: fill in five fields of a form, and write about thirty words on '
        + 'three given points with a greeting and a sign-off. Learn the two formulas — *Sehr geehrte '
        + 'Damen und Herren* / *Mit freundlichen Grüßen* — and you have already scored.',
    },
    {
      q: 'Was passiert beim Sprechen?',
      a: 'Three short parts: introduce yourself from seven word cards, ask and answer a question '
        + 'using a topic card, then make a request from a picture card and respond to someone else’s. '
        + 'Nothing is a monologue and nothing is prepared in advance.',
    },
  ],
};
