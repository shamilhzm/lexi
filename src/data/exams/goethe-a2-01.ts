// Goethe-Zertifikat A2 — Lexi's own paper, in Goethe's format.
//
// Structure from the published Modellsatz für Erwachsene (goethe.de):
//
//   Lesen      30 min  20 items  Teil 1 (1–5)   newspaper text, MC a/b/c
//                                Teil 2 (6–10)  a department-store directory, MC
//                                Teil 3 (11–15) an email, MC a/b/c
//                                Teil 4 (16–20) six people → six adverts a–f, one has no answer (x)
//   Hören      30 min  20 items  Teil 1 (21–25) five short texts, heard TWICE, MC
//                                Teil 2 (26–30) one conversation, heard ONCE, match a–i, each once
//                                Teil 3 (31–35) five short conversations, heard ONCE, MC
//                                Teil 4 (36–40) an interview, heard TWICE, Ja/Nein
//   Schreiben  30 min            an SMS (20–30 words) and an email
//   Sprechen  ~15 min            four question cards · tell us about your life · plan something together
//
// Four parts of 25, 100 in all, pass at 60 — but with two floors that A1 does not
// have: the written parts together need 45 of 75, and Sprechen needs 15 of 25. So
// A2 sits between A1 (no oral floor) and telc B1 (60% of each half), which is
// exactly why the pass rule is a per-paper `Scheme` rather than a constant.
//
// ## One deliberate adaptation
//
// Hören Teil 2 matches what you hear to **pictures** (a–i). Lexi has no pictures,
// so the nine options are written phrases instead. The task is unchanged — hold
// five things in your head while a single unrepeated conversation runs past, and
// spend each option once — and that is the part being examined. Said out loud in
// the rubric rather than passed off as the original.
//
// Every text is written for Lexi; none of Goethe's Modellsatz is reproduced.
import { type ExamPaper, type Scheme } from '../../lib/exam.ts';
import { A2_REDEMITTEL, A2_SPEAKING } from './goethe-a2-speaking.ts';

/** Goethe A2: four skills of 25; 45/75 across the written parts and 15/25 on the
 *  oral, both required, and 60/100 overall. */
export const GOETHE_A2: Scheme = {
  reading: 25, language: 0, listening: 25, writing: 25, speaking: 25,
  written: 75, oral: 25, total: 100,
  pass: { written: 45, oral: 15, total: 60 },
  bands: [[90, 'sehr gut'], [80, 'gut'], [70, 'befriedigend'], [60, 'ausreichend']],
};

const PER = 25 / 20;   // 20 items carrying 25 points, in each of the two blocks

export const PAPER: ExamPaper = {
  id: 'goethe-a2-01',
  provider: 'goethe',
  level: 'A2',
  title: 'Goethe-Zertifikat A2',
  blurb: 'The full A2 exam in Goethe’s format — 40 scored items across reading and listening, '
    + 'an SMS and an email, and the paired oral with model answers at three levels.',
  scheme: GOETHE_A2,
  blocks: [
    { label: 'Lesen', minutes: 30, partIds: ['l1', 'l2', 'l3', 'l4'] },
    { label: 'Hören', minutes: 30, partIds: ['h1', 'h2', 'h3', 'h4'] },
  ],

  parts: [
    // ---- Lesen, Teil 1 (1–5) ---------------------------------------------
    {
      id: 'l1',
      kind: 'mc',
      subtest: 'reading',
      teil: 1,
      label: 'Lesen, Teil 1',
      skill: 'Zeitungstext',
      rubric: 'Sie lesen in einer Zeitung diesen Text. Wählen Sie für die Aufgaben 1 bis 5 die '
        + 'richtige Lösung a, b oder c.',
      rubricEn: 'One short newspaper piece, five three-way questions in the order the text raises '
        + 'them. Find the sentence first, then choose — at A2 the wrong options are usually true '
        + 'statements about a different part of the text.',
      pointsPerItem: PER,
      passage: {
        title: 'Ein Laden ohne Verpackung',
        paras: [
          'Seit zwei Jahren gibt es in der Innenstadt einen Laden, in dem es keine Plastiktüten und '
          + 'keine Packungen gibt. Die Kundinnen und Kunden bringen ihre eigenen Gläser und Dosen mit '
          + 'und füllen Reis, Nudeln oder Müsli selbst ab.',
          'Die Idee hatte Marta Weiß, eine Lehrerin aus der Stadt. „Am Anfang haben viele Leute '
          + 'gelacht", sagt sie. „Heute kommen jeden Tag über hundert Kunden." Besonders am Samstag '
          + 'ist der Laden voll.',
          'Nicht alles ist einfach. Die Waren sind oft teurer als im Supermarkt, weil der Laden klein '
          + 'ist und wenig einkauft. Dafür wirft Frau Weiß fast nichts weg. „Wir bestellen genau so '
          + 'viel, wie wir verkaufen", erklärt sie.',
          'Im nächsten Jahr möchte das Team auch Brot und Käse anbieten. Dafür sucht der Laden noch '
          + 'zwei Mitarbeiter. Wer Interesse hat, kann einfach vorbeikommen.',
        ],
      },
      questions: [
        { n: 1, stem: 'Was ist bei diesem Laden anders?', options: [
          { k: 'a', text: 'Die Kunden bringen Gefäße selbst mit.' },
          { k: 'b', text: 'Die Kunden bekommen Plastiktüten gratis.' },
          { k: 'c', text: 'Die Kunden dürfen nur Reis kaufen.' }] },
        { n: 2, stem: 'Was sagt Marta Weiß über den Anfang?', options: [
          { k: 'a', text: 'Sie hatte sofort viele Kunden.' },
          { k: 'b', text: 'Viele Leute fanden die Idee komisch.' },
          { k: 'c', text: 'Sie wollte eigentlich Lehrerin bleiben.' }] },
        { n: 3, stem: 'Wann ist besonders viel los?', options: [
          { k: 'a', text: 'Am Montag.' }, { k: 'b', text: 'Am Mittwoch.' }, { k: 'c', text: 'Am Samstag.' }] },
        { n: 4, stem: 'Warum kosten die Waren mehr?', options: [
          { k: 'a', text: 'Weil der Laden nur wenig einkauft.' },
          { k: 'b', text: 'Weil die Mitarbeiter viel verdienen.' },
          { k: 'c', text: 'Weil die Miete sehr hoch ist.' }] },
        { n: 5, stem: 'Was plant der Laden?', options: [
          { k: 'a', text: 'Er möchte umziehen.' },
          { k: 'b', text: 'Er möchte mehr Produkte verkaufen.' },
          { k: 'c', text: 'Er möchte samstags schließen.' }] },
      ],
      items: [
        { n: 1, answer: 'a', why: '„…bringen ihre eigenen Gläser und Dosen mit". (b) is the opposite — there are no plastic bags at all.' },
        { n: 2, answer: 'b', why: '„Am Anfang haben viele Leute gelacht." Laughing at an idea is finding it odd.' },
        { n: 3, answer: 'c', why: '„Besonders am Samstag ist der Laden voll."' },
        { n: 4, answer: 'a', why: '„…weil der Laden klein ist und wenig einkauft." Rent and wages are never mentioned — a classic A2 distractor: plausible, but not in the text.' },
        { n: 5, answer: 'b', why: 'Bread and cheese next year. Moving and Saturday closing are inventions.' },
      ],
    },

    // ---- Lesen, Teil 2 (6–10) --------------------------------------------
    {
      id: 'l2',
      kind: 'mc',
      subtest: 'reading',
      teil: 2,
      label: 'Lesen, Teil 2',
      skill: 'Informationstafel',
      rubric: 'Sie lesen die Informationstafel in einem Kaufhaus. Lesen Sie die Aufgaben 6 bis 10 '
        + 'und den Text. In welchen Stock gehen Sie? Wählen Sie die richtige Lösung a, b oder c.',
      rubricEn: 'A store directory and five errands. The third option is always "another floor", '
        + 'and it is right more often than candidates expect — check the directory rather than '
        + 'picking the plausible floor.',
      pointsPerItem: PER,
      // One directory serving all five questions is a shared stimulus, which is
      // what `passage` is for — a per-question `stimulus` would repeat it five
      // times and, more to the point, would say something untrue about the task.
      passage: {
        title: 'Kaufhaus Nord',
        paras: [
          '4. Stock — Bücher, Geschenke, Spielwaren, Café, Kundentoiletten',
          '3. Stock — Fernseher, Computer, Handys, Kameras',
          '2. Stock — Damenmode, Schuhe, Taschen',
          '1. Stock — Herrenmode, Sportbekleidung',
          'Erdgeschoss — Parfüm, Schmuck, Information, Kasse',
          'Untergeschoss — Lebensmittel, Getränke, Bäckerei',
        ],
      },
      questions: [
        { n: 6, stem: 'Sie möchten einer Freundin ein Buch schenken.',
          options: [{ k: 'a', text: '4. Stock' }, { k: 'b', text: '2. Stock' }, { k: 'c', text: 'anderer Stock' }] },
        { n: 7, stem: 'Sie brauchen ein neues Handy.',
          options: [{ k: 'a', text: '4. Stock' }, { k: 'b', text: '3. Stock' }, { k: 'c', text: 'anderer Stock' }] },
        { n: 8, stem: 'Sie möchten Brot und Milch kaufen.',
          options: [{ k: 'a', text: 'Erdgeschoss' }, { k: 'b', text: '1. Stock' }, { k: 'c', text: 'anderer Stock' }] },
        { n: 9, stem: 'Sie suchen Laufschuhe für Ihren Mann.',
          options: [{ k: 'a', text: '2. Stock' }, { k: 'b', text: '1. Stock' }, { k: 'c', text: 'anderer Stock' }] },
        { n: 10, stem: 'Sie möchten eine Uhr als Geschenk kaufen.',
          options: [{ k: 'a', text: '4. Stock' }, { k: 'b', text: 'Erdgeschoss' }, { k: 'c', text: 'anderer Stock' }] },
      ],
      items: [
        { n: 6, answer: 'a', why: 'Bücher are on the 4th floor, listed first.' },
        { n: 7, answer: 'b', why: 'Handys are on the 3rd floor with the other electronics.' },
        { n: 8, answer: 'c', why: 'Lebensmittel are in the **Untergeschoss** — neither offered floor. This is the item the third option exists for.' },
        { n: 9, answer: 'b', why: 'Sportbekleidung is on the 1st floor. Schuhe on the 2nd are Damenmode — the trap.' },
        { n: 10, answer: 'b', why: 'Schmuck is in the Erdgeschoss. „Geschenke" on the 4th is a category name, not where watches are.' },
      ],
    },

    // ---- Lesen, Teil 3 (11–15) -------------------------------------------
    {
      id: 'l3',
      kind: 'mc',
      subtest: 'reading',
      teil: 3,
      label: 'Lesen, Teil 3',
      skill: 'E-Mail',
      rubric: 'Sie lesen eine E-Mail. Wählen Sie für die Aufgaben 11 bis 15 die richtige Lösung '
        + 'a, b oder c.',
      rubricEn: 'A personal email. Each question paraphrases one sentence — the right answer says '
        + 'the same thing in different words, which is the whole A2 reading skill.',
      pointsPerItem: PER,
      passage: {
        title: 'Liebe Sonja,',
        paras: [
          'ich bin jetzt seit sechs Wochen in Leipzig und langsam wird alles normal. Am Anfang war '
          + 'das Studium sehr anders als zu Hause: Man muss viel allein organisieren und niemand sagt '
          + 'dir, was du machen sollst.',
          'Zum Glück gibt es eine Gruppe für neue Studierende. Sie haben mir die Bibliothek und die '
          + 'Mensa gezeigt und mit mir einen Stadtplan angeschaut. Eine Stadtführung gab es leider '
          + 'nicht, aber wir waren zusammen im Café.',
          'Ich wohne in einem Zimmer im Studentenwohnheim. Es ist klein, aber die Miete ist billig '
          + 'und ich brauche nur zehn Minuten zur Uni. Meine Nachbarin kommt aus Polen und wir kochen '
          + 'oft zusammen.',
          'Im Juli habe ich Prüfungen. Danach möchte ich einen Monat arbeiten und im September nach '
          + 'Hause kommen. Kommst du mich vorher besuchen? Im Mai wäre schön.',
          'Viele Grüße, Gülcan',
        ],
      },
      questions: [
        { n: 11, stem: 'Gülcan sagt über den Anfang, dass', options: [
          { k: 'a', text: 'sie alles selbst planen musste.' },
          { k: 'b', text: 'das Studium wie zu Hause war.' },
          { k: 'c', text: 'ihr jemand alles erklärt hat.' }] },
        { n: 12, stem: 'Die Gruppe für neue Studierende hat', options: [
          { k: 'a', text: 'eine Stadtführung gemacht.' },
          { k: 'b', text: 'ihr wichtige Orte an der Uni gezeigt.' },
          { k: 'c', text: 'ihr eine Wohnung gesucht.' }] },
        { n: 13, stem: 'Über ihr Zimmer sagt sie, dass', options: [
          { k: 'a', text: 'es groß und teuer ist.' },
          { k: 'b', text: 'es günstig und nah an der Uni ist.' },
          { k: 'c', text: 'sie bald umziehen möchte.' }] },
        { n: 14, stem: 'Was macht Gülcan nach den Prüfungen?', options: [
          { k: 'a', text: 'Sie fährt sofort nach Hause.' },
          { k: 'b', text: 'Sie arbeitet noch einen Monat.' },
          { k: 'c', text: 'Sie macht Urlaub in Polen.' }] },
        { n: 15, stem: 'Was möchte Gülcan von Sonja?', options: [
          { k: 'a', text: 'dass sie im Mai kommt.' },
          { k: 'b', text: 'dass sie ihr Geld schickt.' },
          { k: 'c', text: 'dass sie im September kommt.' }] },
      ],
      items: [
        { n: 11, answer: 'a', why: '„Man muss viel allein organisieren und niemand sagt dir, was du machen sollst." (c) is its exact opposite.' },
        { n: 12, answer: 'b', why: 'Library and Mensa are places at the university. The Stadtführung is explicitly what did *not* happen — a very common A2 trap.' },
        { n: 13, answer: 'b', why: '„klein, aber die Miete ist billig … nur zehn Minuten zur Uni".' },
        { n: 14, answer: 'b', why: '„Danach möchte ich einen Monat arbeiten." Home comes in September, after that.' },
        { n: 15, answer: 'a', why: '„Kommst du mich vorher besuchen? Im Mai wäre schön." — *vorher* means before the exams.' },
      ],
    },

    // ---- Lesen, Teil 4 (16–20) -------------------------------------------
    {
      id: 'l4',
      kind: 'ads',
      subtest: 'reading',
      teil: 4,
      label: 'Lesen, Teil 4',
      skill: 'Anzeigen',
      rubric: 'Fünf Personen suchen einen Kurs. Lesen Sie die Aufgaben 16 bis 20 und die Anzeigen '
        + 'a bis f. Welche Anzeige passt zu welcher Person? Für eine Aufgabe gibt es keine Lösung. '
        + 'Markieren Sie dann x. Sie können jede Anzeige nur einmal verwenden.',
      rubricEn: 'Five people, six adverts, and one person nothing fits — that x is the item most '
        + 'candidates lose. Check every constraint: a day, a price, who it is for.',
      pointsPerItem: PER,
      situations: [
        { n: 16, text: 'Frau Adami arbeitet bis 17 Uhr und möchte abends Gitarre lernen. Sie hat noch nie ein Instrument gespielt.' },
        { n: 17, text: 'Herr Bruhn ist Rentner und sucht am Vormittag einen Sportkurs, der nicht anstrengend ist.' },
        { n: 18, text: 'Lea (16) möchte in den Ferien ihr Englisch verbessern und danach ein Zertifikat bekommen.' },
        { n: 19, text: 'Familie Tas sucht einen Schwimmkurs für ihren fünfjährigen Sohn am Wochenende.' },
        { n: 20, text: 'Herr Kaya möchte samstags kochen lernen — am liebsten türkische Gerichte.' },
      ],
      ads: [
        { k: 'a', head: 'Gitarre für Anfänger', body: 'Für Erwachsene ohne Vorkenntnisse. Dienstags und donnerstags 19–20.30 Uhr. 12 Termine, 96 €. Instrument wird gestellt.' },
        { k: 'b', head: 'Sanfte Gymnastik 60+', body: 'Montag und Mittwoch, 10–11 Uhr. Langsames Training für Rücken und Gelenke. Krankenkasse zahlt einen Teil.' },
        { k: 'c', head: 'Englisch-Ferienkurs mit Prüfung', body: 'Für Jugendliche von 14 bis 18. Zwei Wochen in den Sommerferien, täglich 9–13 Uhr. Am Ende Zertifikat.' },
        { k: 'd', head: 'Schwimmen lernen — Kinder ab 4', body: 'Samstags 9–10 Uhr im Hallenbad Süd. Kleine Gruppen, zwei Trainerinnen. 10 Termine, 80 €.' },
        { k: 'e', head: 'Italienisch kochen', body: 'Freitagabend ab 18 Uhr. Wir kochen drei Gänge und essen zusammen. 45 € inklusive Zutaten.' },
        { k: 'f', head: 'Yoga am Abend', body: 'Dienstags 20–21.30 Uhr. Für alle, die nach der Arbeit abschalten möchten. Erste Stunde kostenlos.' },
      ],
      items: [
        { n: 16, answer: 'a', why: 'Evenings, adults, no prior knowledge — all three stated. (f) is also an evening course but it is yoga.' },
        { n: 17, answer: 'b', why: '„Sanfte" and „langsames Training" answer *nicht anstrengend*; 10–11 Uhr answers *am Vormittag*.' },
        { n: 18, answer: 'c', why: 'Holidays, her age band, and a certificate at the end.' },
        { n: 19, answer: 'd', why: 'Saturday, and „ab 4" covers a five-year-old.' },
        { n: 20, answer: 'x', why: 'The only cooking course (e) is **Italian and on a Friday**; he wants Turkish food on a Saturday. Two constraints fail, and nothing else cooks. That is what x is for.' },
      ],
    },

    // ---- Hören, Teil 1 (21–25) -------------------------------------------
    {
      id: 'h1',
      kind: 'mc',
      subtest: 'listening',
      teil: 1,
      label: 'Hören, Teil 1',
      skill: 'Kurze Texte',
      rubric: 'Sie hören fünf kurze Texte. Sie hören jeden Text zweimal. Wählen Sie für die '
        + 'Aufgaben 21 bis 25 die richtige Lösung a, b oder c.',
      rubricEn: 'Five short texts, each heard twice. Read the question before each one — you are '
        + 'listening for a single fact, not the gist.',
      pointsPerItem: PER,
      audio: {
        plays: 2,
        intro: 'Sie hören fünf kurze Texte. Sie hören jeden Text zweimal.',
        tracks: [
          { n: 21, label: 'Durchsage im Parkhaus', lines: [{ text: 'Liebe Kundinnen und Kunden, das Parkhaus am Einkaufszentrum ist leider voll. Freie Plätze finden Sie noch am Bahnhof und an der Sporthalle.' }] },
          { n: 22, label: 'Nachricht auf dem Anrufbeantworter', lines: [{ text: 'Hallo Sabine, wir treffen uns morgen um sechs. Vergiss bitte das Geschenk für Tobias nicht! Den Kuchen bringe ich mit.' }] },
          { n: 23, label: 'Im Radio', lines: [{ text: 'Und nun das Wetter: Heute Nachmittag bleibt es trocken bei achtzehn Grad. Erst am Abend kommt Regen dazu.' }] },
          { n: 24, label: 'Im Zug', lines: [{ text: 'Sehr geehrte Fahrgäste, wir erreichen Hannover in etwa zehn Minuten. Der Anschlusszug nach Bremen fährt heute von Gleis sieben.' }] },
          { n: 25, label: 'Im Sprachkurs', lines: [{ text: 'So, für nächste Woche lesen Sie bitte den Text auf Seite 42. Die Aufgaben dazu machen wir dann gemeinsam im Unterricht.' }] },
        ],
      },
      questions: [
        { n: 21, stem: 'Wo kann man noch parken?', options: [
          { k: 'a', text: 'Am Einkaufszentrum.' }, { k: 'b', text: 'Am Bahnhof.' }, { k: 'c', text: 'Nirgendwo.' }] },
        { n: 22, stem: 'Was soll Sabine mitbringen?', options: [
          { k: 'a', text: 'Den Kuchen.' }, { k: 'b', text: 'Das Geschenk.' }, { k: 'c', text: 'Nichts.' }] },
        { n: 23, stem: 'Wie wird das Wetter am Nachmittag?', options: [
          { k: 'a', text: 'Es regnet.' }, { k: 'b', text: 'Es bleibt trocken.' }, { k: 'c', text: 'Es schneit.' }] },
        { n: 24, stem: 'Von welchem Gleis fährt der Zug nach Bremen?', options: [
          { k: 'a', text: 'Von Gleis sieben.' }, { k: 'b', text: 'Von Gleis zehn.' }, { k: 'c', text: 'Von Gleis siebzehn.' }] },
        { n: 25, stem: 'Was sollen die Kursteilnehmer zu Hause machen?', options: [
          { k: 'a', text: 'Die Aufgaben lösen.' }, { k: 'b', text: 'Den Text lesen.' }, { k: 'c', text: 'Einen Text schreiben.' }] },
      ],
      items: [
        { n: 21, answer: 'b', why: 'The shopping centre is the one that is **full**; the station and the sports hall still have space.' },
        { n: 22, answer: 'b', why: 'She is told not to forget the present; the cake is what the speaker brings.' },
        { n: 23, answer: 'b', why: '„Heute Nachmittag bleibt es trocken." Rain comes „erst am Abend".' },
        { n: 24, answer: 'a', why: 'Gleis sieben. „Zehn Minuten" is the arrival time, and *siebzehn* is there to catch a half-heard *sieben*.' },
        { n: 25, answer: 'b', why: 'Read the text at home; the exercises are done together in class.' },
      ],
    },

    // ---- Hören, Teil 2 (26–30) -------------------------------------------
    {
      id: 'h2',
      kind: 'match',
      subtest: 'listening',
      teil: 2,
      label: 'Hören, Teil 2',
      skill: 'Ein Gespräch',
      once: true,
      rubric: 'Sie hören ein Gespräch. Sie hören den Text einmal. Was machen Nina und Jonas in '
        + 'der Woche? Wählen Sie für die Aufgaben 26 bis 30 eine passende Antwort aus a bis i. '
        + 'Wählen Sie jeden Buchstaben nur einmal.',
      rubricEn: 'One conversation, heard **once**, five days to fill from nine options, each usable '
        + 'once. In the real exam the options are pictures; here they are phrases — the task is the '
        + 'same and it is the hardest listening item at this level. Read all nine first.',
      pointsPerItem: PER,
      audio: {
        plays: 1,
        intro: 'Sie hören ein Gespräch. Sie hören den Text einmal.',
        tracks: [
          { label: 'Nina und Jonas planen die Woche', lines: [
            { who: 'Nina', text: 'Also, Jonas, wann können wir diese Woche zusammen Sport machen?' },
            { who: 'Jonas', text: 'Warte. Am Montag geht es nicht, da habe ich einen Termin beim Zahnarzt.' },
            { who: 'Nina', text: 'Okay. Und Dienstag?' },
            { who: 'Jonas', text: 'Dienstag arbeite ich bis acht. Aber am Mittwoch bin ich frei — da könnten wir schwimmen gehen.' },
            { who: 'Nina', text: 'Mittwoch passt mir gut. Am Donnerstag muss ich leider zu meinen Eltern, die haben Geburtstag.' },
            { who: 'Jonas', text: 'Und am Freitag? Da kommt meine Schwester zu Besuch, wir kochen zusammen.' },
            { who: 'Nina', text: 'Dann bleibt nur das Wochenende. Samstag räume ich die Wohnung auf, das dauert.' },
            { who: 'Jonas', text: 'Und am Sonntag machen wir einen Ausflug ins Grüne, hast du gesagt?' },
            { who: 'Nina', text: 'Genau, mit dem Fahrrad an den See. Das steht schon fest.' },
          ] },
        ],
      },
      options: [
        { k: 'a', text: 'zum Zahnarzt gehen' },
        { k: 'b', text: 'lange arbeiten' },
        { k: 'c', text: 'schwimmen gehen' },
        { k: 'd', text: 'die Eltern besuchen' },
        { k: 'e', text: 'mit der Schwester kochen' },
        { k: 'f', text: 'die Wohnung aufräumen' },
        { k: 'g', text: 'einen Ausflug machen' },
        { k: 'h', text: 'ins Kino gehen' },
        { k: 'i', text: 'einkaufen fahren' },
      ],
      texts: [
        { n: 26, body: 'Dienstag' },
        { n: 27, body: 'Mittwoch' },
        { n: 28, body: 'Donnerstag' },
        { n: 29, body: 'Freitag' },
        { n: 30, body: 'Samstag' },
      ],
      items: [
        { n: 26, answer: 'b', why: '„Dienstag arbeite ich bis acht."' },
        { n: 27, answer: 'c', why: '„…am Mittwoch bin ich frei — da könnten wir schwimmen gehen."' },
        { n: 28, answer: 'd', why: '„Am Donnerstag muss ich leider zu meinen Eltern."' },
        { n: 29, answer: 'e', why: '„Am Freitag? Da kommt meine Schwester zu Besuch, wir kochen zusammen."' },
        { n: 30, answer: 'f', why: '„Samstag räume ich die Wohnung auf." Monday (a) and Sunday (g) are both mentioned but are not asked about — h and i are never mentioned at all.' },
      ],
    },

    // ---- Hören, Teil 3 (31–35) -------------------------------------------
    {
      id: 'h3',
      kind: 'mc',
      subtest: 'listening',
      teil: 3,
      label: 'Hören, Teil 3',
      skill: 'Kurze Gespräche',
      rubric: 'Sie hören fünf kurze Gespräche. Sie hören jeden Text einmal. Wählen Sie für die '
        + 'Aufgaben 31 bis 35 die richtige Lösung a, b oder c.',
      rubricEn: 'Five short conversations, each heard **once**. The answer is usually in the second '
        + 'speaker’s turn, and usually corrects something the first one said.',
      pointsPerItem: PER,
      audio: {
        plays: 1,
        intro: 'Sie hören fünf kurze Gespräche. Sie hören jeden Text einmal.',
        tracks: [
          { n: 31, label: 'Zu Hause', lines: [
            { who: 'Mutter', text: 'Was hast du gestern Abend bei Lisa gegessen?' },
            { who: 'Tochter', text: 'Erst wollten wir Pizza bestellen, aber dann haben wir Nudeln gekocht.' }] },
          { n: 32, label: 'Im Geschäft', lines: [
            { who: 'Verkäufer', text: 'Suchen Sie eine Hose?' },
            { who: 'Kundin', text: 'Nein, danke. Ich hätte gern die blaue Jacke aus dem Fenster. In Größe achtunddreißig.' }] },
          { n: 33, label: 'Beim Arzt', lines: [
            { who: 'Arzt', text: 'Wo tut es denn weh — im Rücken?' },
            { who: 'Patient', text: 'Nein, der Rücken ist in Ordnung. Es ist mein Knie, seit dem Sport am Samstag.' }] },
          { n: 34, label: 'Am Telefon', lines: [
            { who: 'Frau', text: 'Kommst du mit dem Auto?' },
            { who: 'Mann', text: 'Nein, ich nehme lieber die Bahn. Parken ist in der Stadt zu teuer geworden.' }] },
          { n: 35, label: 'Im Büro', lines: [
            { who: 'Kollege', text: 'Ist die Besprechung um zehn?' },
            { who: 'Kollegin', text: 'Sie war um zehn geplant, aber der Chef hat sie auf halb zwölf verschoben.' }] },
        ],
      },
      questions: [
        { n: 31, stem: 'Was hat das Mädchen gegessen?', options: [
          { k: 'a', text: 'Pizza.' }, { k: 'b', text: 'Nudeln.' }, { k: 'c', text: 'Nichts.' }] },
        { n: 32, stem: 'Was möchte die Kundin kaufen?', options: [
          { k: 'a', text: 'Eine Hose.' }, { k: 'b', text: 'Eine Jacke.' }, { k: 'c', text: 'Ein Kleid.' }] },
        { n: 33, stem: 'Was tut dem Patienten weh?', options: [
          { k: 'a', text: 'Der Rücken.' }, { k: 'b', text: 'Das Knie.' }, { k: 'c', text: 'Der Kopf.' }] },
        { n: 34, stem: 'Wie kommt der Mann?', options: [
          { k: 'a', text: 'Mit dem Auto.' }, { k: 'b', text: 'Mit der Bahn.' }, { k: 'c', text: 'Mit dem Rad.' }] },
        { n: 35, stem: 'Wann ist die Besprechung?', options: [
          { k: 'a', text: 'Um zehn.' }, { k: 'b', text: 'Um halb zwölf.' }, { k: 'c', text: 'Um zwölf.' }] },
      ],
      items: [
        { n: 31, answer: 'b', why: 'Pizza was the plan; noodles are what happened. „aber dann" is the turn.' },
        { n: 32, answer: 'b', why: 'She declines the trousers and asks for the blue jacket.' },
        { n: 33, answer: 'b', why: '„Nein, der Rücken ist in Ordnung. Es ist mein Knie."' },
        { n: 34, answer: 'b', why: 'He takes the train because parking has become too expensive.' },
        { n: 35, answer: 'b', why: 'It *was* planned for ten and has been moved to half past eleven — *halb zwölf* is 11.30, not 12.30.' },
      ],
    },

    // ---- Hören, Teil 4 (36–40) -------------------------------------------
    {
      id: 'h4',
      kind: 'tf',
      subtest: 'listening',
      teil: 4,
      label: 'Hören, Teil 4',
      skill: 'Interview',
      rubric: 'Sie hören ein Interview. Sie hören den Text zweimal. Wählen Sie für die Aufgaben '
        + '36 bis 40 Ja oder Nein.',
      rubricEn: 'One interview, heard twice, five yes/no statements in the order they come up. Use '
        + 'the first pass for the ones you are sure of.',
      pointsPerItem: PER,
      intro: '',
      labels: ['Ja', 'Nein'],
      audio: {
        plays: 2,
        intro: 'Sie hören ein Interview mit der Bäckerin Sarah Klein.',
        tracks: [
          { label: 'Interview mit Sarah Klein', lines: [
            { who: 'Moderator', text: 'Frau Klein, Sie sind Bäckerin. Wollten Sie das schon als Kind?' },
            { who: 'Sarah Klein', text: 'Überhaupt nicht. Ich wollte Tierärztin werden. Erst nach der Schule habe ich in einer Bäckerei gejobbt — und bin geblieben.' },
            { who: 'Moderator', text: 'Wann fangen Sie morgens an?' },
            { who: 'Sarah Klein', text: 'Um drei Uhr. Das klingt schlimm, ist es aber nicht: Ich bin dafür am Nachmittag frei.' },
            { who: 'Moderator', text: 'Arbeiten Sie allein?' },
            { who: 'Sarah Klein', text: 'Nein, wir sind zu viert. Zwei Bäcker und zwei Verkäuferinnen. Ohne das Team ginge gar nichts.' },
            { who: 'Moderator', text: 'Ist der Beruf schwer zu lernen?' },
            { who: 'Sarah Klein', text: 'Die Ausbildung dauert drei Jahre. Schwer ist nicht das Backen, sondern das frühe Aufstehen — daran gewöhnt man sich langsam.' },
            { who: 'Moderator', text: 'Und was möchten Sie in Zukunft machen?' },
            { who: 'Sarah Klein', text: 'Irgendwann einen eigenen Laden. Aber erst in ein paar Jahren, jetzt fehlt mir noch das Geld.' },
          ] },
        ],
      },
      statements: [
        { n: 36, text: 'Sarah Klein wollte als Kind Bäckerin werden.' },
        { n: 37, text: 'Sie beginnt ihre Arbeit sehr früh.' },
        { n: 38, text: 'Sie arbeitet mit anderen zusammen.' },
        { n: 39, text: 'Für sie ist das Backen selbst das Schwerste.' },
        { n: 40, text: 'Sie möchte später einen eigenen Laden haben.' },
      ],
      items: [
        { n: 36, answer: 'f', why: '„Überhaupt nicht. Ich wollte Tierärztin werden."' },
        { n: 37, answer: 'r', why: 'Three in the morning.' },
        { n: 38, answer: 'r', why: '„wir sind zu viert" — two bakers and two shop assistants.' },
        { n: 39, answer: 'f', why: '„Schwer ist nicht das Backen, sondern das frühe Aufstehen." The *nicht … sondern* is the item.' },
        { n: 40, answer: 'r', why: '„Irgendwann einen eigenen Laden" — later, once she has the money.' },
      ],
    },
  ],

  // ---- Schreiben ---------------------------------------------------------
  writing: {
    id: 'a2-schreiben',
    minutes: 30,
    situation: 'Schreiben Teil 2. Ihre Nachbarin, Frau Osman, hat für Sie ein Paket angenommen, '
      + 'während Sie im Urlaub waren. Schreiben Sie ihr eine E-Mail.',
    situationEn: 'About 30–40 words plus greeting and sign-off. Goethe’s Schreiben also has a Teil '
      + '1 — a 20–30 word SMS covering three given points — which is worth drafting on paper: the '
      + 'shortness is the difficulty.',
    letter: {
      from: 'An: Frau Osman',
      body: [
        'Schreiben Sie eine E-Mail an Ihre Nachbarin.',
        'Schreiben Sie etwas zu allen drei Punkten und achten Sie auf die Reihenfolge.',
        'Vergessen Sie die Anrede und den Gruß nicht.',
      ],
    },
    leitpunkte: [
      { de: 'Bedanken Sie sich.', en: 'Thank her.' },
      { de: 'Schreiben Sie, wann Sie das Paket abholen können.', en: 'Say when you can collect the parcel.' },
      { de: 'Machen Sie einen Vorschlag für ein Wiedersehen.', en: 'Suggest meeting up.' },
      { de: 'Anrede und Gruß', en: 'Greeting and sign-off' },
    ],
    models: [
      {
        band: 'A2', label: 'Sicher',
        note: 'Three short sentences, one per point, in the order the task gives them. That order is '
          + 'itself marked at A2 — the task says „achten Sie auf die Reihenfolge".',
        lines: [
          { de: 'Liebe Frau Osman,', en: 'Dear Mrs Osman,' },
          { de: 'vielen Dank für das Paket!', en: 'Many thanks for the parcel!' },
          { de: 'Ich kann es am Samstag am Vormittag abholen.', en: 'I can collect it on Saturday morning.' },
          { de: 'Möchten Sie danach einen Kaffee trinken?', en: 'Would you like a coffee afterwards?' },
          { de: 'Viele Grüße', en: 'Best wishes' },
          { de: 'Amir Karimi', en: 'Amir Karimi' },
        ],
      },
      {
        band: 'B1', label: 'Ziel',
        note: 'The same three points with a reason and a connector. „weil" and „wenn" are the two '
          + 'that lift an A2 email without risking anything.',
        lines: [
          { de: 'Liebe Frau Osman,', en: 'Dear Mrs Osman,' },
          { de: 'vielen Dank, dass Sie mein Paket angenommen haben — das war wirklich nett von Ihnen.', en: 'Many thanks for taking in my parcel — that was really kind of you.' },
          { de: 'Ich bin seit gestern wieder zu Hause und könnte es am Samstag zwischen zehn und zwölf abholen, wenn Ihnen das passt.', en: 'I have been back since yesterday and could collect it on Saturday between ten and twelve, if that suits you.' },
          { de: 'Vielleicht trinken wir danach zusammen einen Kaffee? Ich habe Ihnen etwas aus dem Urlaub mitgebracht.', en: 'Perhaps we could have a coffee together afterwards? I have brought you something from my holiday.' },
          { de: 'Herzliche Grüße', en: 'Warm regards' },
          { de: 'Amir Karimi', en: 'Amir Karimi' },
        ],
      },
      {
        band: 'B2', label: 'Stark',
        note: 'Beyond what A2 asks for, shown so the ladder is visible: Konjunktiv II for politeness '
          + 'and a subordinate clause carrying the reason.',
        lines: [
          { de: 'Liebe Frau Osman,', en: 'Dear Mrs Osman,' },
          { de: 'ich bin gestern aus dem Urlaub zurückgekommen und habe Ihren Zettel im Briefkasten gefunden. Ganz herzlichen Dank, dass Sie das Paket für mich angenommen haben.', en: 'I got back from holiday yesterday and found your note in the letterbox. Thank you so much for taking the parcel in for me.' },
          { de: 'Würde es Ihnen am Samstagvormittag passen, wenn ich es abhole? Falls das ungünstig ist, ginge auch Sonntag.', en: 'Would Saturday morning suit you for me to collect it? If that is inconvenient, Sunday would work too.' },
          { de: 'Und wenn Sie Zeit und Lust haben, würde ich Sie gern auf einen Kaffee einladen — ich habe Ihnen etwas mitgebracht.', en: 'And if you have the time and inclination, I would like to invite you for a coffee — I have brought you something.' },
          { de: 'Mit herzlichen Grüßen', en: 'With warm regards' },
          { de: 'Amir Karimi', en: 'Amir Karimi' },
        ],
      },
    ],
  },

  speaking: A2_SPEAKING,
  redemittel: A2_REDEMITTEL,

  briefing: [
    {
      q: 'Wie läuft die Prüfung ab?',
      a: 'Lesen 30 minutes, Hören 30 minutes, Schreiben 30 minutes, then Sprechen (~15 minutes) as '
        + 'a **pair**. A2 is where the oral stops being a group and becomes two candidates talking '
        + 'to each other.',
    },
    {
      q: 'Wie viele Punkte brauche ich?',
      a: 'Four parts of 25, and 60 of 100 overall — but with **two floors**: the written parts '
        + 'together need 45 of 75, and Sprechen needs 15 of 25. A1 has no oral floor and telc B1 '
        + 'wants 60% of each half, so A2 sits between them.',
    },
    {
      q: 'Wo verliert man am meisten Punkte?',
      a: 'Hören Teil 2 and Teil 3, both heard **once**. Teil 2 asks you to hold five slots open '
        + 'while one conversation runs past, and each option may be used only once — read all nine '
        + 'before the audio starts. And Lesen Teil 4, where one person has no matching advert.',
    },
    {
      q: 'Was muss ich schreiben können?',
      a: 'An SMS of 20–30 words and an email of about 30–40, each covering three given points **in '
        + 'the order given** — the task says so, and the order is marked. Learn one greeting and one '
        + 'sign-off for each register and you have banked marks before you start.',
    },
  ],
};
