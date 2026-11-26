// telc Deutsch B1 · Übungstest 1 — Lexi's own paper, in telc's format.
//
// Structure, item numbering, options per gap, points per item and playback counts
// are telc's, taken from their published Übungstest so a sitting here weighs the
// same as a sitting in a Prüfungszentrum:
//
//   Leseverstehen        1–20   75 pts   Teil 1 ×5 pts · Teil 2 ×5 · Teil 3 ×2,5
//   Sprachbausteine     21–40   30 pts   Teil 1 ×1,5 · Teil 2 ×1,5
//   Hörverstehen        41–60   75 pts   Teil 1 ×5 · Teil 2 ×2,5 · Teil 3 ×5
//   Schriftl. Ausdruck           45 pts  three criteria, ×3
//   Mündliche Prüfung            75 pts  15 + 30 + 30
//
// Every text below is written for Lexi. See the note at the head of lib/exam.ts
// for why that matters in both directions — the licence and the pedagogy.
import type { ExamPaper } from '../../lib/exam.ts';
import { REDEMITTEL, SPEAKING } from './telc-b1-speaking.ts';

export const PAPER: ExamPaper = {
  id: 'telc-b1-01',
  provider: 'telc',
  level: 'B1',
  title: 'telc Deutsch B1 · Übungstest 1',
  blurb: 'A full paper in the real format and the real weighting — 60 objectively '
    + 'scored items, a letter, and the paired oral with worked answers at three levels.',
  oralFormat: '(paarweise, 20 Minuten Vorbereitung davor)',
  blocks: [
    { label: 'Leseverstehen und Sprachbausteine', minutes: 90, partIds: ['lv1', 'lv2', 'lv3', 'sb1', 'sb2'] },
    { label: 'Hörverstehen', minutes: 30, partIds: ['hv1', 'hv2', 'hv3'] },
    { label: 'Schriftlicher Ausdruck', minutes: 30, partIds: [] },
  ],

  parts: [
    // ---- Leseverstehen, Teil 1 · Globalverstehen (1–5) --------------------
    {
      id: 'lv1',
      kind: 'match',
      subtest: 'reading',
      teil: 1,
      label: 'Leseverstehen, Teil 1',
      skill: 'Globalverstehen',
      rubric: 'Lesen Sie zuerst die 10 Überschriften. Lesen Sie dann die 5 Texte und entscheiden Sie, '
        + 'welcher Text (1–5) am besten zu welcher Überschrift (a–j) passt.',
      rubricEn: 'Read the ten headlines first, then the five texts. Five headlines fit nothing — that is '
        + 'the task. Match the gist, not a repeated word.',
      pointsPerItem: 5,
      options: [
        { k: 'a', text: 'Immer mehr Firmen schaffen das Büro ganz ab' },
        { k: 'b', text: 'Kleingärten sind bei jungen Familien wieder gefragt' },
        { k: 'c', text: 'Sprachcafé in der Bibliothek: Deutsch üben bei Kaffee und Kuchen' },
        { k: 'd', text: 'Nahverkehr wird für alle deutlich teurer' },
        { k: 'e', text: 'Reparieren statt wegwerfen: Ehrenamtliche helfen kostenlos' },
        { k: 'f', text: 'Städte planen neue Parks für junge Familien' },
        { k: 'g', text: 'Mehr Fahrgäste in den Städten – auf dem Land ändert sich wenig' },
        { k: 'h', text: 'Bibliothek verlängert ihre Öffnungszeiten' },
        { k: 'i', text: 'Studie: Beschäftigte wollen beides – Büro und Homeoffice' },
        { k: 'j', text: 'Neue Werkstatt eröffnet: Reparaturen zum halben Preis' },
      ],
      texts: [
        {
          n: 1,
          body: 'Seit der Einführung des günstigen Monatstickets fahren in den großen Städten deutlich '
            + 'mehr Menschen mit Bus und Bahn. Einzelne Verkehrsbetriebe melden bis zu 15 Prozent mehr '
            + 'Fahrgäste als im Vorjahr. Auf dem Land sieht die Sache anders aus: Wo nur dreimal am Tag '
            + 'ein Bus fährt, nützt auch ein billiges Ticket wenig. Der Fahrgastverband fordert deshalb, '
            + 'das Geld nicht nur in die Preise zu stecken, sondern vor allem in zusätzliche Verbindungen.',
        },
        {
          n: 2,
          body: 'Einmal im Monat wird aus dem Gemeindesaal eine Werkstatt. Zehn Ehrenamtliche reparieren '
            + 'dann, was die Besucher mitbringen: Toaster, Lampen, Hosen mit kaputtem Reißverschluss. '
            + 'Bezahlt wird nichts, gespendet werden darf. Wichtiger als die Reparatur ist den Helfern '
            + 'aber etwas anderes — sie zeigen den Leuten, wie es geht. „Wer seinen Wasserkocher einmal '
            + 'selbst aufgeschraubt hat, wirft den nächsten nicht mehr weg", sagt Organisator Bernd Ostheim.',
        },
        {
          n: 3,
          body: 'Eine neue Untersuchung unter 4 000 Beschäftigten zeigt: Nur jeder Zehnte möchte '
            + 'ausschließlich zu Hause arbeiten, ganz zurück ins Büro will aber kaum jemand. Am '
            + 'beliebtesten ist die Mischung aus beidem, zwei bis drei Tage in der Firma. Als Grund '
            + 'nennen die Befragten vor allem den Austausch mit den Kolleginnen und Kollegen, der am '
            + 'Bildschirm fehle. Firmen, die auf tägliche Anwesenheit bestehen, hätten es bei der Suche '
            + 'nach Personal inzwischen schwerer.',
        },
        {
          n: 4,
          body: 'Lange galt der Schrebergarten als Hobby für Rentner. Das hat sich geändert: In vielen '
            + 'Städten warten Interessierte inzwischen drei bis fünf Jahre auf eine freie Parzelle. Die '
            + 'neuen Pächter sind im Schnitt deutlich jünger als früher, kommen oft mit kleinen Kindern '
            + 'und bauen vor allem Gemüse an. Die Vereine freuen sich über den Zulauf, mahnen aber auch: '
            + 'Ein Garten sei kein Wochenendhaus, sondern Arbeit.',
        },
        {
          n: 5,
          body: 'Jeden Donnerstag von 16 bis 18 Uhr stehen in der Stadtbibliothek Kaffee und Kuchen '
            + 'bereit. Wer Deutsch übt, ist eingeladen — ohne Anmeldung, ohne Prüfung und ohne Kosten. '
            + 'An den Tischen sitzen Ehrenamtliche, die vor allem zuhören und weiterhelfen, wenn ein '
            + 'Wort fehlt. Für viele Besucherinnen und Besucher ist es die einzige Gelegenheit in der '
            + 'Woche, außerhalb des Kurses frei zu sprechen.',
        },
      ],
      items: [
        { n: 1, answer: 'g', why: 'Two halves: more passengers in the cities, no change in the country. (d) is the trap — the ticket is described as günstig, not teurer.' },
        { n: 2, answer: 'e', why: 'Free, volunteer-run, and the point is teaching people to repair. (j) invents a business with half-price repairs; nothing here is sold.' },
        { n: 3, answer: 'i', why: 'Neither extreme wins — the mix does. (a) is the opposite of "kaum jemand will ganz zurück ins Büro" plus an invented conclusion.' },
        { n: 4, answer: 'b', why: 'Allotments, younger tenants, small children, long waiting lists. (f) borrows "Familien" but the text is not about parks or city planning.' },
        { n: 5, answer: 'c', why: 'A weekly German-practice session with coffee, free and unregistered. (h) borrows "Bibliothek" only — opening hours are never mentioned.' },
      ],
    },

    // ---- Leseverstehen, Teil 2 · Detailverstehen (6–10) -------------------
    {
      id: 'lv2',
      kind: 'mc',
      subtest: 'reading',
      teil: 2,
      label: 'Leseverstehen, Teil 2',
      skill: 'Detailverstehen',
      rubric: 'Lesen Sie zuerst den Zeitungsartikel und lösen Sie dann die fünf Aufgaben (6–10) zum Text. '
        + 'Entscheiden Sie, welche Antwort (a, b oder c) am besten passt.',
      rubricEn: 'Read the article, then answer five three-way questions. The questions follow the order '
        + 'of the text — find the paragraph first, then choose.',
      pointsPerItem: 5,
      passage: {
        title: 'Ausleihen statt kaufen',
        standfirst: 'In einer kleinen Bibliothek im Norden der Stadt gibt es keine Bücher, sondern '
          + 'Bohrmaschinen. Nach vier Jahren zieht das Team eine gemischte Bilanz.',
        paras: [
          'Wer bei Jana Reuter etwas ausleihen möchte, kommt selten wegen eines Romans. In den Regalen '
          + 'des kleinen Ladens stehen Bohrmaschinen, Nähmaschinen, ein Raclette-Grill für zwölf Personen '
          + 'und ein Anhänger fürs Fahrrad. „Bibliothek der Dinge" nennt sich das Projekt, und die Idee '
          + 'dahinter ist schnell erklärt: Viele Geräte braucht man zweimal im Jahr — gekauft werden sie '
          + 'trotzdem.',

          'Angefangen haben Reuter und ihr Mitgründer Tobias Klein vor vier Jahren mit 60 Gegenständen, '
          + 'die sie im Bekanntenkreis eingesammelt hatten. Heute sind es über 700. Wer mitmachen will, '
          + 'zahlt 24 Euro im Jahr und darf pro Woche drei Dinge mitnehmen. Den Raum stellt die Stadt, '
          + 'alles andere machen fünfzehn Ehrenamtliche.',

          'Am häufigsten ausgeliehen wird nicht etwa die Bohrmaschine, sondern der Fahrradanhänger — er '
          + 'ist Monate im Voraus vergeben. „Damit hatten wir überhaupt nicht gerechnet", sagt Klein. '
          + '„So ein Anhänger kostet 400 Euro und wird gebraucht, solange die Kinder klein sind. Danach '
          + 'steht er im Keller."',

          'Nicht alles läuft glatt. Etwa jeder zwanzigste Gegenstand kommt beschädigt zurück, manches gar '
          + 'nicht. Am Anfang habe man darüber lange diskutiert, sagt Reuter. Inzwischen gibt es eine '
          + 'einfache Regel: Wer etwas kaputt macht, sagt Bescheid; repariert wird dann gemeinsam am '
          + 'Reparaturabend. „Wir haben gemerkt, dass die Leute ehrlich sind, wenn man sie nicht wie '
          + 'Kunden behandelt."',

          'Ob sich das Projekt trägt? Finanziell gerade so. Die Mitgliedsbeiträge decken die Versicherung '
          + 'und ab und zu ein neues Gerät, für Löhne reicht es nicht. Trotzdem plant das Team eine zweite '
          + 'Ausgabestelle im Osten der Stadt und berät inzwischen andere Städte, die dasselbe vorhaben. '
          + '„Am schwierigsten ist nicht das Material", sagt Reuter. „Am schwierigsten ist es, genug Leute '
          + 'zu finden, die jede Woche zwei Stunden da sind."',
        ],
      },
      questions: [
        {
          n: 6,
          stem: 'Die „Bibliothek der Dinge" …',
          options: [
            { k: 'a', text: 'verleiht neben Werkzeug auch Bücher.' },
            { k: 'b', text: 'verleiht vor allem Dinge, die man selten braucht.' },
            { k: 'c', text: 'verkauft gebrauchte Geräte zu günstigen Preisen.' },
          ],
        },
        {
          n: 7,
          stem: 'Wie hat das Projekt angefangen?',
          options: [
            { k: 'a', text: 'Die Gründer haben die ersten Geräte von Bekannten bekommen.' },
            { k: 'b', text: 'Die Stadt hat die ersten Geräte bezahlt.' },
            { k: 'c', text: 'Die Gründer haben die Geräte mit einem Kredit gekauft.' },
          ],
        },
        {
          n: 8,
          stem: 'Was sagt Tobias Klein über den Fahrradanhänger?',
          options: [
            { k: 'a', text: 'Er wird seltener ausgeliehen als erwartet.' },
            { k: 'b', text: 'Seine Beliebtheit hat das Team überrascht.' },
            { k: 'c', text: 'Er musste schon mehrmals ersetzt werden.' },
          ],
        },
        {
          n: 9,
          stem: 'Was passiert, wenn ein Gegenstand kaputtgeht?',
          options: [
            { k: 'a', text: 'Das Mitglied muss den Schaden bezahlen.' },
            { k: 'b', text: 'Das Gerät wird sofort durch ein neues ersetzt.' },
            { k: 'c', text: 'Es wird an einem festen Abend gemeinsam repariert.' },
          ],
        },
        {
          n: 10,
          stem: 'Was ist für das Team im Moment die größte Schwierigkeit?',
          options: [
            { k: 'a', text: 'Es fehlen Menschen, die regelmäßig mithelfen.' },
            { k: 'b', text: 'Es fehlt der Platz für neue Geräte.' },
            { k: 'c', text: 'Viele Mitglieder zahlen ihren Beitrag nicht.' },
          ],
        },
      ],
      items: [
        { n: 6, answer: 'b', why: '„Viele Geräte braucht man zweimal im Jahr — gekauft werden sie trotzdem." Nothing is sold, and the books are the joke in the name.' },
        { n: 7, answer: 'a', why: '„…mit 60 Gegenständen, die sie im Bekanntenkreis eingesammelt hatten." The city gives the room, not the equipment.' },
        { n: 8, answer: 'b', why: '„Damit hatten wir überhaupt nicht gerechnet" — the trailer is the most-borrowed item, not the least. (a) inverts it.' },
        { n: 9, answer: 'c', why: '„…repariert wird dann gemeinsam am Reparaturabend." The text explicitly says people are not treated as customers, which rules out (a).' },
        { n: 10, answer: 'a', why: 'The closing quote: not the material, but finding people with two hours a week. Money is described as "gerade so" — tight, not the biggest problem.' },
      ],
    },

    // ---- Leseverstehen, Teil 3 · Selektives Verstehen (11–20) -------------
    {
      id: 'lv3',
      kind: 'ads',
      subtest: 'reading',
      teil: 3,
      label: 'Leseverstehen, Teil 3',
      skill: 'Selektives Verstehen',
      rubric: 'Lesen Sie zuerst die 10 Situationen (11–20) und dann die 12 Anzeigen (a–l). Welche Anzeige '
        + 'passt zu welcher Situation? Sie können jede Anzeige nur einmal verwenden. Es ist auch möglich, '
        + 'dass Sie das, was Sie suchen, nicht finden. In diesem Fall markieren Sie den Buchstaben x.',
      rubricEn: 'Ten situations, twelve adverts, each usable once — and one situation that nothing fits, '
        + 'answered with x. The x is the item most candidates lose. Check every detail: a day, a time or '
        + 'a price is usually what disqualifies the near-miss.',
      pointsPerItem: 2.5,
      situations: [
        { n: 11, text: 'Sie möchten Ihr Fahrrad in Zukunft selbst reparieren können und suchen jemanden, der Ihnen zeigt, wie das geht.' },
        { n: 12, text: 'Sie ziehen am Monatsende um und brauchen für einen Samstag zwei kräftige Helfer.' },
        { n: 13, text: 'Sie fahren zwei Wochen in Urlaub und wissen nicht, wohin mit Ihrem Hund.' },
        { n: 14, text: 'Ihr Sohn (13) hat Schwierigkeiten in Mathematik. Er soll nachmittags von zu Hause aus Hilfe bekommen.' },
        { n: 15, text: 'Sie lernen Spanisch und würden gern regelmäßig mit einer Muttersprachlerin sprechen. Dafür können Sie Deutsch anbieten.' },
        { n: 16, text: 'Sie essen kein Fleisch mehr und möchten am Wochenende lernen, wie man ohne Fleisch kocht.' },
        { n: 17, text: 'Ihre Kinder sind aus ihren Sachen herausgewachsen. Sie suchen günstige Kleidung in gutem Zustand.' },
        { n: 18, text: 'Sie möchten nach der Arbeit ein Instrument lernen, haben aber noch nie eines gespielt.' },
        { n: 19, text: 'In Ihrem Wohnzimmer gibt es eine schmale Nische, in die kein normales Regal passt.' },
        { n: 20, text: 'Sie möchten das Fotografieren lernen, haben aber nur an Werktagen nach 18 Uhr Zeit.' },
      ],
      ads: [
        { k: 'a', head: 'Schrauberstunde – die Fahrrad-Selbsthilfewerkstatt', body: 'Jeden Samstag 10–14 Uhr. Werkzeug und Beratung kostenlos, Ersatzteile zum Selbstkostenpreis. Wir reparieren nicht für Sie – wir zeigen Ihnen, wie es geht. Hofstraße 4, Hinterhof.' },
        { k: 'b', head: 'Umzug? Wir packen an!', body: 'Studentinnen und Studenten helfen beim Tragen, Packen und Fahren. Ab 15 € pro Stunde und Person, auch samstags und sonntags. Transporter auf Wunsch. Kurzfristige Termine möglich.' },
        { k: 'c', head: 'Tierpension Sonnenhof', body: 'Ihr Hund in guten Händen, wenn Sie unterwegs sind. Große Auslaufflächen, Betreuung Tag und Nacht, ab 22 € pro Tag. Auch für längere Zeiträume. Bitte frühzeitig anmelden.' },
        { k: 'd', head: 'Mathe leicht gemacht – Nachhilfe online', body: 'Einzelunterricht per Video für die Klassen 5 bis 10. Montag bis Donnerstag ab 15 Uhr, von zu Hause aus. Die erste Stunde ist kostenlos. Studierte Lehrkräfte.' },
        { k: 'e', head: 'Wohnungsauflösung & Entrümpelung', body: 'Wir räumen Keller, Dachboden und ganze Wohnungen – besenrein und zum Festpreis. Kostenloses Angebot bei Ihnen vor Ort. Auch am Wochenende.' },
        { k: 'f', head: 'Gitarre lernen mit 40? Aber sicher!', body: 'Unterricht ausdrücklich für Erwachsene, auch ganz ohne Vorkenntnisse. Termine abends ab 18 Uhr, Montag bis Freitag. Erste Probestunde gratis. Musikschule Kern.' },
        { k: 'g', head: 'Vegetarisch kochen – Wochenendkurs', body: 'Samstag, 10–15 Uhr: drei Gänge ganz ohne Fleisch, danach essen wir gemeinsam. 45 € inklusive aller Zutaten. Keine Vorkenntnisse nötig. VHS-Küche, Raum 2.' },
        { k: 'h', head: 'Kinderbasar im Gemeindehaus', body: 'Gut erhaltene Kinderkleidung, Schuhe und Spielzeug zu kleinen Preisen. Samstag, 9–13 Uhr. Verkauf nur gegen Barzahlung. Nächster Termin im Frühjahr.' },
        { k: 'i', head: 'Garten zu groß?', body: 'Wir mähen den Rasen, schneiden Hecken und pflegen Beete – einmalig oder das ganze Jahr über. Zuverlässig, versichert und günstig. Im Winter auch Räumdienst.' },
        { k: 'j', head: 'Sprachtandem gesucht', body: 'Ich bin Muttersprachlerin (Spanisch) und möchte mein Deutsch verbessern. Ich biete Spanisch, ich suche Deutsch – einmal pro Woche, im Café oder im Park. Kein Geld, nur Zeit.' },
        { k: 'k', head: 'Fotokurs für Anfänger', body: 'Ein Sonntag, sechs Stunden, mit Kamera oder Handy. Wir üben draußen in der Altstadt und sehen uns die Bilder danach gemeinsam an. 60 €, Anmeldung erforderlich.' },
        { k: 'l', head: 'Möbel nach Maß', body: 'Die Schreinerei Baumann baut Regale, Schränke und Tische genau für Ihren Raum – auch für schwierige Ecken und Nischen. Beratung bei Ihnen zu Hause, kostenlos und unverbindlich.' },
      ],
      items: [
        { n: 11, answer: 'a', why: '„Wir reparieren nicht für Sie – wir zeigen Ihnen, wie es geht." That sentence is written for this situation.' },
        { n: 12, answer: 'b', why: 'Helpers for carrying, and explicitly „auch samstags".' },
        { n: 13, answer: 'c', why: 'Boarding kennel, day and night, „auch für längere Zeiträume" — two weeks is covered.' },
        { n: 14, answer: 'd', why: 'Class 13-year-old = Klasse 5–10, online from home, afternoons from 15 Uhr.' },
        { n: 15, answer: 'j', why: 'An exact exchange: she offers Spanish and wants German. No money involved, which the situation does not mind.' },
        { n: 16, answer: 'g', why: 'Vegetarian, and on a Saturday. The situation asks for the weekend.' },
        { n: 17, answer: 'h', why: 'Second-hand children’s clothing in good condition, at small prices.' },
        { n: 18, answer: 'f', why: 'Explicitly for adults, explicitly without prior knowledge, evenings from 18 Uhr — all three conditions.' },
        { n: 19, answer: 'l', why: '„auch für schwierige Ecken und Nischen" — a bespoke joiner is the only thing that fits a Nische.' },
        { n: 20, answer: 'x', why: 'The photography course (k) is the only candidate and it runs on a **Sunday**, for six hours. The situation says weekdays after 18:00 only. Nothing fits — that is what x is for. Ads e and i are also unused.' },
      ],
    },

    // ---- Sprachbausteine, Teil 1 (21–30) ---------------------------------
    {
      id: 'sb1',
      kind: 'cloze',
      mode: 'mc',
      subtest: 'language',
      teil: 1,
      label: 'Sprachbausteine, Teil 1',
      skill: 'Grammatik im Text',
      rubric: 'Lesen Sie den folgenden Text und entscheiden Sie, welches Wort (a, b oder c) in die Lücken '
        + '21–30 passt.',
      rubricEn: 'Ten gaps, three options each. This part is grammar: conjunctions, cases, endings, verb '
        + 'forms. Read the whole clause before choosing — word order usually decides it.',
      pointsPerItem: 1.5,
      body: 'Liebe Nina,\n\n'
        + 'endlich komme ich dazu, dir zu schreiben! Seit August wohne ich jetzt in Freiburg, [[21]] ich '
        + 'hier eine Stelle als Erzieher gefunden habe. Der Umzug war anstrengend, [[22]] ich bereue ihn '
        + 'keinen einzigen Tag.\n\n'
        + 'Die Wohnung ist klein, dafür habe ich [[23]] großen Balkon, und morgens sitze ich dort mit '
        + 'meinem Kaffee. Am Anfang [[24]] ich die Leute hier ziemlich verschlossen, inzwischen sehe ich '
        + 'das anders. Meine Nachbarin, [[25]] ich in den ersten Wochen kaum gegrüßt habe, hat mich schon '
        + 'zweimal zum Essen eingeladen.\n\n'
        + 'Im Kindergarten habe ich unglaublich viel [[26]]: Die Kinder korrigieren mein Deutsch schneller '
        + 'als jeder Lehrer. [[27]] nächstem Monat mache ich außerdem eine Fortbildung, die zwei Wochen '
        + 'dauert.\n\n'
        + 'Und wann besuchst du mich endlich? Im Mai ist es hier am [[28]] — dann blüht alles. Schlafen '
        + 'kannst du natürlich bei [[29]], das Sofa ist wirklich bequem. Schreib mir bitte bald, [[30]] '
        + 'ich rechtzeitig freinehmen kann.\n\n'
        + 'Viele Grüße\nMilan',
      options: {
        21: [{ k: 'a', text: 'denn' }, { k: 'b', text: 'obwohl' }, { k: 'c', text: 'weil' }],
        22: [{ k: 'a', text: 'aber' }, { k: 'b', text: 'sondern' }, { k: 'c', text: 'trotzdem' }],
        23: [{ k: 'a', text: 'ein' }, { k: 'b', text: 'einen' }, { k: 'c', text: 'einem' }],
        24: [{ k: 'a', text: 'fand' }, { k: 'b', text: 'finde' }, { k: 'c', text: 'gefunden' }],
        25: [{ k: 'a', text: 'der' }, { k: 'b', text: 'die' }, { k: 'c', text: 'den' }],
        26: [{ k: 'a', text: 'gelernt' }, { k: 'b', text: 'lernen' }, { k: 'c', text: 'lernte' }],
        27: [{ k: 'a', text: 'Ab' }, { k: 'b', text: 'Nach' }, { k: 'c', text: 'Seit' }],
        28: [{ k: 'a', text: 'schön' }, { k: 'b', text: 'schöner' }, { k: 'c', text: 'schönsten' }],
        29: [{ k: 'a', text: 'mich' }, { k: 'b', text: 'mir' }, { k: 'c', text: 'dir' }],
        30: [{ k: 'a', text: 'damit' }, { k: 'b', text: 'dass' }, { k: 'c', text: 'um' }],
      },
      items: [
        { n: 21, answer: 'c', why: 'The verb is at the end („gefunden habe"), so the clause is a Nebensatz — only *weil* takes that word order. *denn* would need „denn ich habe … gefunden".' },
        { n: 22, answer: 'a', why: '*aber* joins two main clauses with no inversion. *trotzdem* would force „trotzdem bereue ich"; *sondern* needs a negative before it.' },
        { n: 23, answer: 'b', why: 'Direct object of *haben* → Akkusativ, masculine: **einen** großen Balkon.' },
        { n: 24, answer: 'a', why: '„Am Anfang … , inzwischen sehe ich das anders" contrasts past with present, so the first verb is past: *fand*.' },
        { n: 25, answer: 'b', why: 'Relative pronoun for *die Nachbarin* as the **object** of „gegrüßt habe" → Akkusativ feminine: **die**. (*der* would be dative, *den* masculine.)' },
        { n: 26, answer: 'a', why: '*habe … gelernt* — the Perfekt was already opened by „habe" at the start of the clause.' },
        { n: 27, answer: 'a', why: '*ab* + Dativ points forward from a moment in the future; *seit* looks backwards, *nach* would need a completed event.' },
        { n: 28, answer: 'c', why: 'Superlative in the „am …sten" form: **am schönsten**.' },
        { n: 29, answer: 'b', why: '*bei* always takes the Dativ → **mir**. (*dir* is grammatical but says the wrong thing: Milan is the host.)' },
        { n: 30, answer: 'a', why: '*damit* introduces a purpose with a different subject in each clause. *um … zu* would need the same subject and no „ich".' },
      ],
    },

    // ---- Sprachbausteine, Teil 2 (31–40) ---------------------------------
    {
      id: 'sb2',
      kind: 'cloze',
      mode: 'bank',
      subtest: 'language',
      teil: 2,
      label: 'Sprachbausteine, Teil 2',
      skill: 'Wortschatz im Text',
      rubric: 'Lesen Sie den folgenden Text und entscheiden Sie, welches Wort aus dem Kasten (a–o) in die '
        + 'Lücken 31–40 passt. Sie können jedes Wort im Kasten nur einmal verwenden. Nicht alle Wörter '
        + 'passen in den Text.',
      rubricEn: 'Fifteen words, ten gaps, each word usable once — five are decoys. This part is '
        + 'vocabulary and collocation: verbs with fixed prepositions, connectors, and the standard '
        + 'phrases of a formal letter.',
      pointsPerItem: 1.5,
      bank: [
        { k: 'a', text: 'ALS' },
        { k: 'b', text: 'AUF' },
        { k: 'c', text: 'DAMIT' },
        { k: 'd', text: 'ERFOLGREICH' },
        { k: 'e', text: 'FALLS' },
        { k: 'f', text: 'FREUEN' },
        { k: 'g', text: 'FÜR' },
        { k: 'h', text: 'HÖCHSTENS' },
        { k: 'i', text: 'INTERESSANT' },
        { k: 'j', text: 'LEIDER' },
        { k: 'k', text: 'NORMALERWEISE' },
        { k: 'l', text: 'SCHLIESSLICH' },
        { k: 'm', text: 'WEIL' },
        { k: 'n', text: 'WICHTIG' },
        { k: 'o', text: 'ZUERST' },
      ],
      body: 'Sehr geehrte Frau Berger,\n\n'
        + 'ich habe Ihre Anzeige in der Zeitung gelesen und interessiere mich sehr [[31]] Ihren Abendkurs '
        + 'Deutsch. Ich arbeite tagsüber in einer Bäckerei und könnte [[32]] erst ab 18 Uhr im Unterricht '
        + 'sein.\n\n'
        + 'Ich lerne seit zwei Jahren Deutsch und habe im Frühjahr die Prüfung A2 [[33]] bestanden. Jetzt '
        + 'möchte ich mich [[34]] die Prüfung B1 vorbereiten, [[35]] ich mich im nächsten Jahr um eine '
        + 'Ausbildung bewerben möchte.\n\n'
        + 'Dazu hätte ich noch einige Fragen. Wie viele Teilnehmerinnen und Teilnehmer sind [[36]] in einer '
        + 'Gruppe? Und wäre es möglich, in einen anderen Kurs zu wechseln, [[37]] sich meine Arbeitszeiten '
        + 'ändern?\n\n'
        + '[[38]] wäre mir außerdem, ob der Kurs mit einer Prüfung endet. [[39]] würde ich gern wissen, ob '
        + 'ich die Bücher selbst kaufen muss.\n\n'
        + 'Über eine kurze Antwort würde ich mich sehr [[40]].\n\n'
        + 'Mit freundlichen Grüßen\nAdriana Popescu',
      items: [
        { n: 31, answer: 'g', why: '*sich interessieren* **für** + Akkusativ. A fixed preposition — there is nothing to work out, only to know.' },
        { n: 32, answer: 'j', why: '„…könnte **leider** erst ab 18 Uhr" — the writer is apologising for a limitation.' },
        { n: 33, answer: 'd', why: 'eine Prüfung **erfolgreich** bestehen — the standard collocation for passing.' },
        { n: 34, answer: 'b', why: '*sich vorbereiten* **auf** + Akkusativ. The other fixed preposition in this letter.' },
        { n: 35, answer: 'm', why: 'A reason, with the verb at the end („bewerben möchte") → **weil**. *denn* is not in the box, and *damit* would state a purpose, not a cause.' },
        { n: 36, answer: 'k', why: '„Wie viele … sind **normalerweise** in einer Gruppe?" — asking about the usual case.' },
        { n: 37, answer: 'e', why: '**falls** = if / in the event that, for a condition that may not arise. *wenn* is not in the box; *falls* is its formal twin.' },
        { n: 38, answer: 'n', why: '„**Wichtig** wäre mir außerdem, ob …" — an adjective in first position, a standard move in a formal enquiry.' },
        { n: 39, answer: 'l', why: '**Schließlich** here means "lastly", closing the list of questions.' },
        { n: 40, answer: 'f', why: '„Über eine Antwort würde ich mich **freuen**" — the fixed closing formula of a German letter of enquiry.' },
      ],
    },

    // ---- Hörverstehen, Teil 1 · Globalverstehen (41–45) -------------------
    {
      id: 'hv1',
      kind: 'tf',
      subtest: 'listening',
      teil: 1,
      label: 'Hörverstehen, Teil 1',
      skill: 'Globalverstehen',
      rubric: 'Sie hören nun fünf kurze Texte. Dazu sollen Sie fünf Aufgaben lösen. Sie hören diese Texte '
        + 'nur einmal. Entscheiden Sie beim Hören, ob die Aussagen 41–45 richtig oder falsch sind. Lesen '
        + 'Sie jetzt die Aufgaben. Sie haben dazu 30 Sekunden Zeit.',
      rubricEn: 'Five short statements, heard **once**. Read the five items during the 30 seconds first — '
        + 'in the real exam that half-minute is most of the task. Decide as you listen; there is no '
        + 'second pass.',
      pointsPerItem: 5,
      intro: '',
      audio: {
        plays: 1,
        intro: 'Wir haben Menschen auf der Straße gefragt: Wie sind Sie eigentlich zu Ihrem Beruf gekommen? '
        + 'Hören Sie fünf Antworten.',
        tracks: [
        {
          n: 41, label: 'Sprecherin 1',
          lines: [{ text: 'Also ehrlich gesagt war das Zufall. Ich habe nach der Schule erst einmal gejobbt, in einer Apotheke, eigentlich nur für ein halbes Jahr. Und dann hat mir die Chefin gesagt, ich solle doch die Ausbildung machen. Jetzt bin ich seit zwölf Jahren dabei und würde nichts anderes machen wollen.' }],
        },
        {
          n: 42, label: 'Sprecher 2',
          lines: [{ text: 'Bei mir war das klar, seit ich denken kann. Mein Vater hatte eine Werkstatt, ich stand da schon als Kind zwischen den Autos. Alle haben gesagt, such dir lieber etwas Eigenes. Aber nein — ich habe die Werkstatt vor drei Jahren übernommen und bin sehr froh darüber.' }],
        },
        {
          n: 43, label: 'Sprecherin 3',
          lines: [{ text: 'Ich wollte eigentlich Lehrerin werden, das habe ich auch studiert. Nach dem Referendariat habe ich aber gemerkt, dass mir die Klassen einfach zu groß sind. Heute arbeite ich in der Erwachsenenbildung, mit Gruppen von zehn Leuten. Das passt viel besser zu mir.' }],
        },
        {
          n: 44, label: 'Sprecher 4',
          lines: [{ text: 'Ich bin über Umwege hier gelandet. In meinem Heimatland war ich Ingenieur, hier wurde mein Abschluss aber nicht anerkannt. Das war eine harte Zeit. Inzwischen arbeite ich in der Qualitätskontrolle, und die Firma bezahlt mir eine Weiterbildung. Es geht also aufwärts.' }],
        },
        {
          n: 45, label: 'Sprecherin 5',
          lines: [{ text: 'Ich habe drei Kinder und war zehn Jahre zu Hause. Der Wiedereinstieg war schwierig, das muss man ehrlich sagen. Geholfen hat mir am Ende ein Praktikum — danach hat die Firma mich einfach übernommen. Ohne dieses Praktikum säße ich wahrscheinlich immer noch zu Hause.' }],
        },
        ],
      },
      statements: [
        { n: 41, text: 'Die Sprecherin ist eher zufällig zu ihrem Beruf gekommen.' },
        { n: 42, text: 'Der Sprecher hat sich bewusst gegen den Beruf seines Vaters entschieden.' },
        { n: 43, text: 'Die Sprecherin arbeitet heute nicht mehr an einer Schule.' },
        { n: 44, text: 'Der Sprecher arbeitet heute in dem Beruf, den er in seinem Heimatland gelernt hat.' },
        { n: 45, text: 'Die Sprecherin hat ihre Stelle nach einem Praktikum bekommen.' },
      ],
      items: [
        { n: 41, answer: 'r', why: '„Ehrlich gesagt war das Zufall" — she says it in the first sentence.' },
        { n: 42, answer: 'f', why: 'Others advised him to find his own thing; he took over the workshop anyway. „Aber nein" is the turn — the statement follows the advice, not the speaker.' },
        { n: 43, answer: 'r', why: 'She trained as a teacher but now works in adult education with groups of ten.' },
        { n: 44, answer: 'f', why: 'His engineering qualification was not recognised; he works in quality control. The trap is that he *is* working in a technical field.' },
        { n: 45, answer: 'r', why: '„Geholfen hat mir am Ende ein Praktikum — danach hat die Firma mich einfach übernommen."' },
      ],
    },

    // ---- Hörverstehen, Teil 2 · Detailverstehen (46–55) -------------------
    {
      id: 'hv2',
      kind: 'tf',
      subtest: 'listening',
      teil: 2,
      label: 'Hörverstehen, Teil 2',
      skill: 'Detailverstehen',
      rubric: 'Sie hören nun ein Gespräch. Dazu sollen Sie zehn Aufgaben lösen. Sie hören das Gespräch '
        + 'zweimal. Entscheiden Sie beim Hören, ob die Aussagen 46–55 richtig oder falsch sind. Lesen Sie '
        + 'jetzt die Aufgaben. Sie haben dazu eine Minute Zeit.',
      rubricEn: 'One long interview, heard **twice**, ten true/false items in the order the conversation '
        + 'raises them. Use the first pass for the ones you are sure of and the second for the rest — do '
        + 'not try to settle all ten on the first hearing.',
      pointsPerItem: 2.5,
      intro: '',
      audio: {
        plays: 2,
        intro: 'Sie hören ein Interview aus der Sendung „Stadtgespräch".',
        tracks: [
        {
          label: 'Interview · „Stadtgespräch"',
          lines: [
            { who: 'Moderator', text: 'Guten Tag und willkommen bei „Stadtgespräch". Heute geht es um das Mehrgenerationenhaus in der Lindenstraße. Bei mir im Studio sitzt Katrin Ahrens, die das Haus seit der Eröffnung leitet. Frau Ahrens, was ist ein Mehrgenerationenhaus eigentlich?' },
            { who: 'Frau Ahrens', text: 'Ganz einfach gesagt: ein offenes Wohnzimmer für den Stadtteil. Bei uns treffen sich Menschen von zwei bis zweiundneunzig, im selben Raum und am selben Tisch. Wir sind kein Verein — man muss also nicht Mitglied werden und auch nichts bezahlen.' },
            { who: 'Moderator', text: 'Sie sagen „seit der Eröffnung". Wann war das denn?' },
            { who: 'Frau Ahrens', text: 'Vor sieben Jahren. Angefangen haben wir übrigens gar nicht in diesem Gebäude, sondern in zwei Räumen der alten Schule. Erst als die Stadt das Haus in der Lindenstraße frei hatte, sind wir umgezogen.' },
            { who: 'Moderator', text: 'Und wie viele Menschen kommen heute zu Ihnen?' },
            { who: 'Frau Ahrens', text: 'An einem normalen Nachmittag zwischen sechzig und achtzig. Am stärksten besucht ist der Mittwoch, da haben wir das gemeinsame Mittagessen.' },
            { who: 'Moderator', text: 'Wer kocht denn dieses Essen?' },
            { who: 'Frau Ahrens', text: 'Eine Gruppe von Ehrenamtlichen, überwiegend ältere Damen — seit zwei Jahren aber auch drei junge Männer, die früher selbst als Gäste gekommen sind. Das Essen kostet drei Euro; wer weniger hat, zahlt weniger. Danach fragt bei uns niemand.' },
            { who: 'Moderator', text: 'Sie arbeiten also fast nur mit Ehrenamtlichen?' },
            { who: 'Frau Ahrens', text: 'Fast. Es gibt zwei feste Stellen, meine und eine halbe für die Verwaltung. Alles andere machen rund fünfzig Freiwillige. Ohne sie gäbe es das Haus nicht — das ist keine Höflichkeitsfloskel, das ist einfach die Rechnung.' },
            { who: 'Moderator', text: 'Was ist im Moment Ihr größtes Problem?' },
            { who: 'Frau Ahrens', text: 'Nicht das Geld, auch wenn das viele vermuten. Die Finanzierung steht bis 2028, da haben wir wirklich Glück gehabt. Schwieriger ist der Platz. Wir müssten dringend erweitern, aber das Haus gehört der Stadt, und ein Umbau dauert eben.' },
            { who: 'Moderator', text: 'Gab es auch etwas, das nicht funktioniert hat?' },
            { who: 'Frau Ahrens', text: 'Ja, und darüber rede ich sogar gern. Am Anfang hatten wir ein festes Programm — montags Handarbeit, dienstags Spielenachmittag, alles genau geplant. Das hat kaum jemand angenommen. Heute ist das Haus einfach offen, und die Angebote entstehen aus den Leuten selbst. Unser Computerkurs zum Beispiel gibt es nur, weil ein Rentner eines Tages seinen Enkel mitgebracht hat.' },
            { who: 'Moderator', text: 'Und was wünschen Sie sich für die nächsten Jahre?' },
            { who: 'Frau Ahrens', text: 'Dass es solche Häuser in jedem Stadtteil gibt. Und dass die Leute nicht erst kommen, wenn sie einsam sind, sondern schon vorher.' },
          ],
        },
        ],
      },
      statements: [
        { n: 46, text: 'Wer das Haus besuchen möchte, muss Mitglied werden.' },
        { n: 47, text: 'Das Haus ist seit der Eröffnung im selben Gebäude.' },
        { n: 48, text: 'Mittwochs kommen besonders viele Besucher.' },
        { n: 49, text: 'Das Mittagessen wird von bezahlten Köchen zubereitet.' },
        { n: 50, text: 'Wer wenig Geld hat, zahlt für das Essen weniger.' },
        { n: 51, text: 'Im Haus arbeiten mehr Freiwillige als fest angestellte Personen.' },
        { n: 52, text: 'Die Finanzierung des Hauses ist zurzeit nicht gesichert.' },
        { n: 53, text: 'Frau Ahrens hätte gern mehr Platz für das Haus.' },
        { n: 54, text: 'Das feste Wochenprogramm am Anfang war ein großer Erfolg.' },
        { n: 55, text: 'Der Computerkurs ist auf Anregung eines Besuchers entstanden.' },
      ],
      items: [
        { n: 46, answer: 'f', why: '„Wir sind kein Verein — man muss also nicht Mitglied werden und auch nichts bezahlen."' },
        { n: 47, answer: 'f', why: 'They started in two rooms of the old school and moved later. „Angefangen haben wir übrigens gar nicht in diesem Gebäude."' },
        { n: 48, answer: 'r', why: '„Am stärksten besucht ist der Mittwoch, da haben wir das gemeinsame Mittagessen."' },
        { n: 49, answer: 'f', why: 'Volunteers cook — mostly older women, plus three young men. Only two posts in the whole house are paid, and neither is a cook.' },
        { n: 50, answer: 'r', why: '„Das Essen kostet drei Euro; wer weniger hat, zahlt weniger."' },
        { n: 51, answer: 'r', why: 'Two paid posts against „rund fünfzig Freiwillige".' },
        { n: 52, answer: 'f', why: '„Die Finanzierung steht bis 2028" — and she says explicitly that money is *not* the problem, which is the trap.' },
        { n: 53, answer: 'r', why: '„Wir müssten dringend erweitern" — space is named as the real difficulty.' },
        { n: 54, answer: 'f', why: '„Das hat kaum jemand angenommen." The fixed programme is her example of what failed.' },
        { n: 55, answer: 'r', why: 'It exists „nur, weil ein Rentner eines Tages seinen Enkel mitgebracht hat" — a visitor, not the management.' },
      ],
    },

    // ---- Hörverstehen, Teil 3 · Selektives Verstehen (56–60) --------------
    {
      id: 'hv3',
      kind: 'tf',
      subtest: 'listening',
      teil: 3,
      label: 'Hörverstehen, Teil 3',
      skill: 'Selektives Verstehen',
      rubric: 'Sie hören jetzt fünf kurze Texte. Dazu sollen Sie fünf Aufgaben lösen. Sie hören jeden Text '
        + 'zweimal. Entscheiden Sie beim Hören, ob die Aussagen 56–60 richtig oder falsch sind.',
      rubricEn: 'Five short announcements, each heard **twice**. You are listening for one fact per text — '
        + 'a platform, a date, a price. Everything else is noise, deliberately.',
      pointsPerItem: 5,
      intro: '',
      audio: {
        plays: 2,
        intro: 'Sie hören fünf kurze Ansagen aus dem Alltag.',
        tracks: [
        {
          n: 56, label: 'Ansage im Bahnhof',
          lines: [{ text: 'Information für die Reisenden nach Hamburg: Der ICE 574, planmäßige Abfahrt 14 Uhr 32, fährt heute von Gleis 9, nicht wie angezeigt von Gleis 4. Ich wiederhole: von Gleis 9. Der Zug hat voraussichtlich zehn Minuten Verspätung.' }],
        },
        {
          n: 57, label: 'Anrufbeantworter einer Arztpraxis',
          lines: [{ text: 'Guten Tag, Sie sind verbunden mit der Praxis Doktor Weiß. Unsere Praxis ist vom zwölften bis zum sechsundzwanzigsten Juli geschlossen. In dringenden Fällen wenden Sie sich bitte an die Praxis Doktor Lang in der Bahnhofstraße 12. Rezepte können Sie in dieser Zeit weiterhin über unsere Internetseite bestellen.' }],
        },
        {
          n: 58, label: 'Wetterbericht im Radio',
          lines: [{ text: 'Und nun das Wetter für morgen: Am Vormittag ist es im ganzen Land noch stark bewölkt, örtlich fällt Regen. Ab Mittag setzt sich dann von Westen her die Sonne durch. Die Höchstwerte liegen bei 18 bis 21 Grad, in den Bergen nur bei 14 Grad.' }],
        },
        {
          n: 59, label: 'Durchsage im Supermarkt',
          lines: [{ text: 'Liebe Kundinnen und Kunden, an unserer Frischetheke finden Sie heute Forellen aus der Region für nur 4 Euro 99 das Stück. Dieses Angebot gilt ausschließlich heute bis Ladenschluss um 20 Uhr. Wir wünschen Ihnen einen angenehmen Einkauf.' }],
        },
        {
          n: 60, label: 'Ansage am Telefon eines Kinos',
          lines: [{ text: 'Willkommen beim Kino am Markt. Heute Abend zeigen wir um 20 Uhr den Film „Nordwind" in der Originalfassung mit Untertiteln. Karten gibt es nur noch an der Abendkasse — der Verkauf über unsere Internetseite ist für diese Vorstellung bereits geschlossen.' }],
        },
        ],
      },
      statements: [
        { n: 56, text: 'Der Zug nach Hamburg fährt heute von Gleis 4.' },
        { n: 57, text: 'Während der Schließung kann man Rezepte im Internet bestellen.' },
        { n: 58, text: 'Am Nachmittag wird das Wetter besser.' },
        { n: 59, text: 'Das Sonderangebot gilt auch morgen noch.' },
        { n: 60, text: 'Karten für die Vorstellung kann man heute noch online kaufen.' },
      ],
      items: [
        { n: 56, answer: 'f', why: 'Gleis 9, „nicht wie angezeigt von Gleis 4". Both numbers are said aloud — that is the whole item.' },
        { n: 57, answer: 'r', why: '„Rezepte können Sie in dieser Zeit weiterhin über unsere Internetseite bestellen."' },
        { n: 58, answer: 'r', why: 'Cloudy in the morning, „ab Mittag setzt sich die Sonne durch" — the afternoon improves.' },
        { n: 59, answer: 'f', why: '„ausschließlich heute bis Ladenschluss um 20 Uhr".' },
        { n: 60, answer: 'f', why: 'Box office only — the online sale „ist für diese Vorstellung bereits geschlossen".' },
      ],
    },
  ],

  // ---- Schriftlicher Ausdruck (Brief) --------------------------------------
  writing: {
    id: 'sa-katja',
    minutes: 30,
    situation: 'Sie haben in einem Sprachkurs Katja aus Deutschland kennengelernt. Jetzt schreibt sie '
      + 'Ihnen, dass sie für drei Monate in Ihrer Stadt arbeiten wird.',
    situationEn: 'You met Katja on a language course. She writes to say she is coming to work in your '
      + 'city for three months. Answer her letter.',
    letter: {
      from: 'Deine Katja',
      body: [
        'Liebe/r …,',
        'stell dir vor: Ich habe die Stelle bekommen! Ab September arbeite ich drei Monate bei euch in '
        + 'der Stadt. Ich bin ganz aufgeregt — und habe tausend Fragen.',
        'Vor allem weiß ich überhaupt nicht, wie ich von hier aus eine Wohnung finden soll. Und was '
        + 'kostet das Leben bei euch eigentlich so? Ich möchte natürlich nicht nur arbeiten, sondern auch '
        + 'etwas von der Stadt sehen und Leute kennenlernen.',
        'Hättest du am ersten Wochenende vielleicht Zeit für mich? Schreib bald!',
      ],
    },
    leitpunkte: [
      { de: 'wie sie von Deutschland aus eine Wohnung finden kann', en: 'how she can find a flat from Germany' },
      { de: 'was das Leben in Ihrer Stadt kostet', en: 'what living in your city costs' },
      { de: 'was sie in ihrer Freizeit machen kann', en: 'what she can do in her free time' },
      { de: 'wie Sie ihr am ersten Wochenende helfen können', en: 'how you can help her on the first weekend' },
    ],
    models: [
      {
        band: 'A2', label: 'Sicher',
        note: 'Alle vier Leitpunkte, kurze Sätze, korrekte Anrede und Schluss. Das ist bereits ein Bestehen: '
          + 'Kriterium I fragt nach Vollständigkeit, nicht nach Eleganz.',
        lines: [
          { de: 'Aveiro, den 14. August', en: 'Aveiro, 14 August' },
          { de: 'Liebe Katja,', en: 'Dear Katja,' },
          { de: 'vielen Dank für deine E-Mail. Ich freue mich sehr, dass du kommst!', en: 'Many thanks for your email. I am very glad you are coming!' },
          { de: 'Eine Wohnung findest du am besten im Internet. Es gibt eine Seite für WG-Zimmer, da schreiben viele Studenten. Du kannst auch in einer Facebook-Gruppe fragen. Ich schaue auch für dich.', en: 'The best way to find a flat is online. There is a site for shared rooms where a lot of students post. You can also ask in a Facebook group. I will look for you too.' },
          { de: 'Das Leben hier ist nicht teuer. Ein Zimmer kostet ungefähr 300 Euro im Monat. Essen im Restaurant kostet 10 bis 12 Euro. Der Bus ist billig.', en: 'Life here is not expensive. A room costs about 300 euros a month. A restaurant meal costs 10 to 12 euros. The bus is cheap.' },
          { de: 'In deiner Freizeit kannst du viel machen. Wir haben einen schönen Strand und ein Museum. Am Wochenende gibt es einen Markt. Du kannst auch mit meinen Freunden Fußball spielen.', en: 'There is a lot to do in your free time. We have a nice beach and a museum. At the weekend there is a market. You can also play football with my friends.' },
          { de: 'Am ersten Wochenende habe ich Zeit. Ich hole dich vom Bahnhof ab und zeige dir die Stadt. Am Sonntag können wir zusammen essen.', en: 'I have time on the first weekend. I will pick you up from the station and show you the city. On Sunday we can eat together.' },
          { de: 'Schreib mir, wann du ankommst.', en: 'Write and tell me when you arrive.' },
          { de: 'Viele Grüße', en: 'Best wishes' },
          { de: 'Rui', en: 'Rui' },
        ],
      },
      {
        band: 'B1', label: 'Ziel',
        note: 'Dieselben vier Punkte, aber in einer sinnvollen Reihenfolge, mit Verbindungswörtern und einer '
          + 'echten Einleitung und einem echten Schluss. Genau das misst Kriterium II.',
        lines: [
          { de: 'Aveiro, den 14. August', en: 'Aveiro, 14 August' },
          { de: 'Liebe Katja,', en: 'Dear Katja,' },
          { de: 'was für eine tolle Nachricht — herzlichen Glückwunsch zur Stelle! Ich habe mich riesig gefreut, als ich deine Mail gelesen habe, und natürlich helfe ich dir gern bei der Vorbereitung.', en: 'What great news — congratulations on the job! I was delighted when I read your email, and of course I am happy to help you get ready.' },
          { de: 'Zur Wohnung: Such am besten schon jetzt im Internet, denn im September ziehen viele Studenten her und dann wird es eng. Am meisten Angebote findest du auf den bekannten WG-Portalen; außerdem gibt es hier eine Facebook-Gruppe für Neuankömmlinge, in die ich dich gern einlade. Falls du willst, schaue ich mir Wohnungen an, bevor du unterschreibst — aus der Ferne sieht leider jede Wohnung gut aus.', en: 'On the flat: start looking online now, because a lot of students move here in September and it gets tight. You will find most listings on the well-known flatshare portals; there is also a Facebook group here for newcomers, which I will happily add you to. If you like, I will view flats before you sign — from a distance every flat unfortunately looks good.' },
          { de: 'Teuer ist es bei uns nicht. Für ein Zimmer in einer WG zahlt man etwa 300 Euro, für eine kleine eigene Wohnung ungefähr 500. Essen gehen kostet um die 12 Euro, und das Monatsticket für den Bus liegt bei 30 Euro. Mit 800 Euro im Monat kommst du gut zurecht.', en: 'It is not expensive here. A room in a flatshare costs around 300 euros, a small place of your own around 500. Eating out costs about 12 euros, and the monthly bus ticket is 30. You will manage well on 800 euros a month.' },
          { de: 'Langweilig wird dir bestimmt nicht. Der Strand ist mit dem Rad in zwanzig Minuten zu erreichen, im Herbst ist er sogar noch angenehm. Abends triffst du dich am besten in der Altstadt, dort ist immer etwas los. Und wenn du Leute kennenlernen willst, empfehle ich dir den Sportverein — dort war ich am Anfang auch, und ich habe schneller Anschluss gefunden als über die Arbeit.', en: 'You certainly will not be bored. The beach is twenty minutes away by bike and is still pleasant in autumn. In the evenings the old town is the place to meet — there is always something going on. And if you want to meet people I recommend the sports club: that is where I started too, and I made friends faster there than through work.' },
          { de: 'Für das erste Wochenende habe ich mir schon frei genommen. Ich hole dich am Flughafen ab, und am Samstag zeige ich dir die Stadt. Am Sonntag lade ich dich zum Essen bei meiner Familie ein — meine Mutter freut sich schon.', en: 'I have already taken the first weekend off. I will pick you up at the airport, and on Saturday I will show you the city. On Sunday I am inviting you to eat with my family — my mother is already looking forward to it.' },
          { de: 'Schreib mir bitte, sobald du deinen Flug gebucht hast. Ich freue mich sehr auf dich!', en: 'Please write as soon as you have booked your flight. I am really looking forward to seeing you!' },
          { de: 'Liebe Grüße', en: 'Warm regards' },
          { de: 'Rui', en: 'Rui' },
        ],
      },
      {
        band: 'B2', label: 'Stark',
        note: 'Für die beiden Zusatzpunkte: sprachliche Vielfalt (Konjunktiv, Passiv, Nebensätze) und Umfang. '
          + 'Achtung — Zusatzpunkte gibt es nur, wenn kein Kriterium mit C bewertet ist.',
        lines: [
          { de: 'Aveiro, den 14. August', en: 'Aveiro, 14 August' },
          { de: 'Liebe Katja,', en: 'Dear Katja,' },
          { de: 'endlich mal eine gute Nachricht im Postfach! Herzlichen Glückwunsch — ich hatte gehofft, dass es klappt, aber gerechnet hatte ich ehrlich gesagt nicht damit. Damit du nicht völlig unvorbereitet ankommst, hier alles, was ich weiß.', en: 'Finally some good news in my inbox! Congratulations — I had hoped it would work out, though honestly I had not counted on it. So that you do not arrive completely unprepared, here is everything I know.' },
          { de: 'Fang mit der Wohnungssuche sofort an. Ab Mitte September wird der Markt hier von Studenten leer gekauft, und wer dann erst sucht, zahlt drauf. Die meisten Zimmer werden über zwei Portale vergeben, dazu kommt eine Facebook-Gruppe, in der fast nur Neuankömmlinge unterwegs sind. Was ich dir dringend rate: Unterschreib nichts, ohne dass jemand die Wohnung gesehen hat. Ich würde jederzeit für dich hingehen — es wäre nicht das erste Mal, dass ein Foto schöner ist als der Flur dahinter.', en: 'Start the flat search immediately. From mid-September the market here is bought out by students, and anyone who starts looking then pays for it. Most rooms go through two portals, plus a Facebook group used almost entirely by newcomers. What I strongly advise: do not sign anything without someone having seen the place. I would go for you any time — it would not be the first time a photo was prettier than the hallway behind it.' },
          { de: 'Zu den Kosten: Mit einem WG-Zimmer für rund 300 Euro und etwa 200 Euro für Lebensmittel bist du gut dabei; eine eigene kleine Wohnung würde dich eher 500 kosten. Das Monatsticket liegt bei 30 Euro, aber ehrlich gesagt brauchst du es kaum — hier fährt fast jeder Rad. Insgesamt lebt es sich deutlich günstiger als bei euch, außer beim Kaffee, den trinken wir dafür dreimal so oft.', en: 'On costs: with a room at around 300 euros and about 200 for food you will be fine; a small place of your own would be more like 500. The monthly ticket is 30 euros, but honestly you will hardly need it — nearly everyone here cycles. Overall it is considerably cheaper than where you are, except for coffee, which we drink three times as often.' },
          { de: 'Freizeit ist hier kein Problem, im Gegenteil. Der Strand ist in zwanzig Minuten erreichbar und im Oktober fast leer, was ich schöner finde als im Hochsommer. Wenn du wirklich Leute kennenlernen möchtest, würde ich dir aber weniger die Bars als einen Verein empfehlen. Ich bin damals in einen Laufverein eingetreten, ohne besonders sportlich zu sein, und hatte nach drei Wochen mehr Kontakte als nach drei Monaten im Büro.', en: 'Free time is no problem here, quite the opposite. The beach is twenty minutes away and almost empty in October, which I find nicer than midsummer. But if you really want to meet people I would recommend a club rather than the bars. I joined a running club back then without being remotely sporty, and after three weeks I had more contacts than after three months in the office.' },
          { de: 'Das erste Wochenende habe ich mir freigehalten. Ich hole dich ab, wir bringen dein Gepäck weg, und dann zeige ich dir die Stadt in dem Tempo, das du nach dem Flug schaffst. Am Sonntag wären wir bei meiner Familie zum Essen eingeladen — falls dir das zu viel ist, sag ruhig ab, sie versteht das.', en: 'I have kept the first weekend free. I will pick you up, we will drop off your luggage, and then I will show you the city at whatever pace you can manage after the flight. On Sunday we would be invited to eat at my family’s — if that is too much, just say no, she will understand.' },
          { de: 'Melde dich, sobald der Flug steht. Und mach dir keine Sorgen: Die ersten zwei Wochen sind anstrengend, danach wirst du dich fragen, warum du überhaupt nervös warst.', en: 'Get in touch as soon as the flight is fixed. And do not worry: the first two weeks are exhausting, after that you will wonder why you were nervous at all.' },
          { de: 'Ganz liebe Grüße', en: 'All the best' },
          { de: 'Rui', en: 'Rui' },
        ],
      },
    ],
  },

  speaking: SPEAKING,
  redemittel: REDEMITTEL,

  briefing: [
    {
      q: 'Wie lange dauert die Prüfung?',
      a: 'Leseverstehen and Sprachbausteine run together as one 90-minute block — you budget your own '
        + 'time across all five parts. Then roughly 30 minutes of Hörverstehen, paced by the recording, '
        + 'and 30 minutes for the letter. The oral is a separate 15-minute slot with 20 minutes of '
        + 'preparation beforehand.',
    },
    {
      q: 'Wie viele Punkte brauche ich?',
      a: '60% of each half, independently: 135 of 225 in the written exam and 45 of 75 in the oral. '
        + 'Failing one fails the sitting even if the other is excellent — and you may retake just that '
        + 'half within the same or the following calendar year.',
    },
    {
      q: 'Wo verliert man am meisten Punkte?',
      a: 'Leseverstehen Teil 3 (2.5 points an item, and the x nobody marks) and Hörverstehen Teil 1, '
        + 'which is worth 5 points an item and is heard only **once**. Sprachbausteine looks hard and is '
        + 'worth the least: all 20 items together are 30 points, less than half of the reading.',
    },
    {
      q: 'Was zählt beim Brief?',
      a: 'Three criteria, each A/B/C/D: whether all four Leitpunkte are covered, the communicative shape '
        + '(order, linking, register, date, greeting, sign-off) and formal accuracy. Miss two Leitpunkte '
        + 'and criterion I is already a C. A D on criterion I or III zeroes the whole letter.',
    },
    {
      q: 'Was mache ich in den 20 Minuten Vorbereitung?',
      a: 'You get the speaking sheets and may take notes — on your own paper, not on the sheets, and you '
        + 'may not talk to your partner. Use it for Teil 2 and 3: note four or five keywords per task, '
        + 'not sentences. Reading from notes in the exam itself is penalised.',
    },
    {
      q: 'Was, wenn ich mein Gegenüber nicht verstehe?',
      a: 'Ask. „Entschuldigung, könnten Sie das bitte wiederholen?" costs nothing and is normal '
        + 'conversational behaviour, which is exactly what criterion 2 rewards. Silence costs points; '
        + 'a clarifying question does not.',
    },
    {
      q: 'Darf ich ein Wörterbuch benutzen?',
      a: 'No — not in the written exam and not during the 20 minutes of preparation.',
    },
  ],
};
