// Goethe-Zertifikat B2 — Lexi's own paper, in Goethe's format.
//
// Structure from the published Modellsatz Erwachsene (goethe.de), which is the
// **2019 reform** and not the exam most textbooks still describe:
//
//   Lesen      65 min  5 Teile  Teil 1 forum posts → who says what (a–d, reusable)
//                               Teil 2 article with sentences removed, more sentences than gaps
//                               Teil 3 newspaper article, three-way multiple choice
//                               Teil 4 opinions → headings, each used once
//                               Teil 5 regulations → contents-page headings, each used once
//   Hören      40 min  4 Teile  Teil 1 short texts, heard ONCE, two items each (richtig/falsch + MC)
//                               Teil 2 radio interview, heard TWICE
//                               Teil 3 discussion, heard ONCE — *who* said it
//                               Teil 4 a lecture, heard TWICE
//   Schreiben  75 min           a forum post (~150 words) and a message (~100)
//   Sprechen  ~15 min           a four-minute talk, then a debate
//
// ## The reform is the thing to know, and it is a scoring change
//
// B2 is **modular**. There is no total to pass: Lesen, Hören, Schreiben and
// Sprechen are four separate exams that happen to be sat on one day, each needs
// 60% of *itself*, and each is certificated on its own. Fail one and you resit
// that one — the other three keep. A learner coming from A2 (one total, two
// floors) will get this wrong, so the result screen leads with four gates and
// prints the total under a label that says it decides nothing.
//
// Real counts are 30 reading and 30 listening items; this paper runs 20 and 20 at
// 1.25 points each. Every Teil is present in its real shape, with its real
// playback rule — what is shortened is the number of times each task repeats,
// not the task.
//
// Every text is written for Lexi; none of Goethe's Modellsatz is reproduced.
import { type ExamPaper, type Scheme } from '../../lib/exam.ts';
import { B2_REDEMITTEL, B2_SPEAKING } from './goethe-b2-speaking.ts';

/** Goethe B2 — four modules of 25, each passed alone at 60% of itself. The
 *  written/oral floors below are the same rule stated in this engine's terms;
 *  `modular` is what actually decides the sitting. */
export const GOETHE_B2: Scheme = {
  reading: 25, language: 0, listening: 25, writing: 25, speaking: 25,
  written: 75, oral: 25, total: 100,
  pass: { written: 45, oral: 15, total: 60 },
  modular: true,
  bands: [[90, 'sehr gut'], [80, 'gut'], [70, 'befriedigend'], [60, 'ausreichend']],
};

const PER = 25 / 20;   // 20 items carrying 25 points, in each of the two modules

export const PAPER: ExamPaper = {
  id: 'goethe-b2-01',
  provider: 'goethe',
  level: 'B2',
  title: 'Goethe-Zertifikat B2',
  blurb: 'The reformed modular B2 — 40 scored items across five reading and four listening tasks, '
    + 'a forum post and a message, and the four-minute talk plus debate, with models at three levels.',
  scheme: GOETHE_B2,
  blocks: [
    { label: 'Lesen', minutes: 65, partIds: ['l1', 'l2', 'l3', 'l4', 'l5'] },
    { label: 'Hören', minutes: 40, partIds: ['h1', 'h2', 'h3', 'h4'] },
  ],

  parts: [
    // ---- Lesen, Teil 1 (1–5) ----------------------------------------------
    {
      id: 'l1',
      subtest: 'reading',
      teil: 1,
      label: 'Lesen, Teil 1',
      skill: 'Detailverstehen · Zuordnung',
      rubric: 'Sie lesen in einem Forum, wie Menschen über das Arbeiten von zu Hause denken. Auf '
        + 'welche der vier Personen treffen die einzelnen Aussagen zu? Die Personen können mehrmals '
        + 'gewählt werden.',
      rubricEn: 'Four forum posts, five statements. Which person does each statement fit? A person '
        + 'can be the answer more than once — this is the part candidates get wrong by assuming '
        + 'one answer each.',
      pointsPerItem: PER,
      kind: 'mc',
      passage: {
        title: 'Forum: Arbeiten von zu Hause — was hat sich für Sie verändert?',
        paras: [
          '[a] Tobias, 34, Softwareentwickler: Ich arbeite seit vier Jahren fast ausschließlich zu Hause und würde nicht zurückwollen. Der eigentliche Gewinn ist nicht die gesparte Fahrzeit, sondern dass ich meinen Tag selbst einteilen kann: Ich schreibe morgens Code, wenn ich frisch bin, und lege nachmittags eine lange Pause ein. Was ich allerdings unterschätzt habe, ist der Aufwand für die Ausstattung. Ein vernünftiger Stuhl, ein zweiter Bildschirm, eine ordentliche Leitung — das summiert sich, und mein Arbeitgeber beteiligt sich daran nicht.',
          '[b] Katrin, 51, Steuerberaterin: Für mich war das Homeoffice eine Notlösung, die geblieben ist. Fachlich funktioniert es tadellos, dafür sorgt die Technik. Was fehlt, ist das Beiläufige: die kurze Frage über den Schreibtisch hinweg, das Gespräch in der Teeküche, aus dem sich plötzlich eine Lösung ergibt. Meine jüngeren Kolleginnen tun mir aufrichtig leid — wer neu anfängt, lernt ein Unternehmen so einfach nicht kennen. Ich bin deshalb wieder an drei Tagen im Büro, freiwillig.',
          '[c] Milan, 28, Grafiker: Ehrlich gesagt hat sich für mich weniger verändert, als alle behaupten. Ich habe schon vorher von überall gearbeitet. Neu ist nur, dass es niemanden mehr wundert. Praktisch finde ich, dass ich die Miete für ein Büro spare und dieses Geld in Reisen stecken kann; ich arbeite regelmäßig mehrere Wochen aus einer anderen Stadt. Voraussetzung ist allerdings eine stabile Verbindung, und die ist außerhalb der Ballungsräume immer noch ein Glücksspiel.',
          '[d] Nadia, 43, Projektleiterin: Ich halte die Debatte für zu einseitig. Über Produktivität wird ständig geredet, über Wohnfläche fast nie. Wer eine Vierzimmerwohnung hat, richtet sich ein Arbeitszimmer ein; wer zu dritt auf sechzig Quadratmetern lebt, sitzt am Küchentisch. Das Homeoffice verteilt also Vorteile ungleich, und zwar entlang der Miete. Solange darüber nicht gesprochen wird, halte ich alle Zufriedenheitsumfragen für wenig aussagekräftig.',
        ],
      },
      questions: [
        {
          n: 1, stem: 'Wer weist darauf hin, dass die Vorteile nicht allen gleichermaßen zugutekommen?',
          options: [{ k: 'a', text: 'Tobias' }, { k: 'b', text: 'Katrin' }, { k: 'c', text: 'Milan' }, { k: 'd', text: 'Nadia' }],
        },
        {
          n: 2, stem: 'Wer schätzt vor allem die freie Einteilung des Arbeitstages?',
          options: [{ k: 'a', text: 'Tobias' }, { k: 'b', text: 'Katrin' }, { k: 'c', text: 'Milan' }, { k: 'd', text: 'Nadia' }],
        },
        {
          n: 3, stem: 'Wer sorgt sich um Berufsanfänger?',
          options: [{ k: 'a', text: 'Tobias' }, { k: 'b', text: 'Katrin' }, { k: 'c', text: 'Milan' }, { k: 'd', text: 'Nadia' }],
        },
        {
          n: 4, stem: 'Wer nennt die Internetverbindung als Bedingung?',
          options: [{ k: 'a', text: 'Tobias' }, { k: 'b', text: 'Katrin' }, { k: 'c', text: 'Milan' }, { k: 'd', text: 'Nadia' }],
        },
        {
          n: 5, stem: 'Wer beklagt, dass er die Kosten selbst tragen muss?',
          options: [{ k: 'a', text: 'Tobias' }, { k: 'b', text: 'Katrin' }, { k: 'c', text: 'Milan' }, { k: 'd', text: 'Nadia' }],
        },
      ],
      items: [
        { n: 1, answer: 'd', why: 'Nadia: „verteilt also Vorteile ungleich, und zwar entlang der Miete“ — the whole post is about who benefits, not whether it works.' },
        { n: 2, answer: 'a', why: 'Tobias: „dass ich meinen Tag selbst einteilen kann“, and he says explicitly that this, not the commute, is the real gain.' },
        { n: 3, answer: 'b', why: 'Katrin: „Meine jüngeren Kolleginnen tun mir aufrichtig leid — wer neu anfängt, lernt ein Unternehmen so einfach nicht kennen.“' },
        { n: 4, answer: 'c', why: 'Milan: „Voraussetzung ist allerdings eine stabile Verbindung“. Tobias mentions „eine ordentliche Leitung“ too — but as a cost, not a condition, which is why the stem says *Bedingung*.' },
        { n: 5, answer: 'a', why: 'Tobias: „das summiert sich, und mein Arbeitgeber beteiligt sich daran nicht“. Milan also mentions money, but as a saving.' },
      ],
    },

    // ---- Lesen, Teil 2 (6–9) ----------------------------------------------
    {
      id: 'l2',
      subtest: 'reading',
      teil: 2,
      label: 'Lesen, Teil 2',
      skill: 'Textkohärenz',
      rubric: 'Sie lesen in einer Zeitschrift einen Artikel über die Rückkehr des Nachtzugs. Welche '
        + 'Sätze passen in die Lücken? Zwei Sätze passen nicht.',
      rubricEn: 'Six sentences, four gaps — two are decoys. The answer is decided by what comes '
        + '*before and after* the gap, not by the topic: look for a pronoun, a connector or a tense '
        + 'that only fits in one place.',
      pointsPerItem: PER,
      kind: 'cloze',
      mode: 'bank',
      intro: 'Nachts unterwegs',
      body: 'Zwanzig Jahre lang galt der Nachtzug als Auslaufmodell. Eine Strecke nach der anderen '
        + 'wurde gestrichen, die Wagen waren alt, und wer schnell reisen wollte, flog. [[6]] Seither '
        + 'bestellen mehrere europäische Bahnen wieder neue Nachtzugwagen, und einzelne Strecken sind '
        + 'monatelang im Voraus ausgebucht.\n\n'
        + 'Der Grund dafür ist nur zum Teil das Klima. Wichtiger scheint zu sein, dass sich das '
        + 'Zeitgefühl der Reisenden verschoben hat. [[7]] Eine Nacht im Liegewagen kostet dagegen '
        + 'keinen einzigen Arbeitstag.\n\n'
        + 'Ganz ohne Schwierigkeiten ist die Rückkehr allerdings nicht. Nachtzüge sind im Betrieb '
        + 'teuer: Sie brauchen mehr Personal, stehen tagsüber ungenutzt herum und müssen sich die '
        + 'Gleise mit dem Güterverkehr teilen. [[8]] Genau daran ist der letzte Versuch vor gut '
        + 'zehn Jahren gescheitert.\n\n'
        + 'Ob es diesmal anders ausgeht, hängt weniger von der Nachfrage ab als von der Politik. '
        + '[[9]] Bleibt sie aus, wird der Nachtzug bleiben, was er lange war: eine schöne Idee mit '
        + 'einem schwierigen Fahrplan.',
      bank: [
        { k: 'a', text: 'Erst seit wenigen Jahren hat sich das Bild gedreht.' },
        { k: 'b', text: 'Wer fliegt, verliert für zwei Stunden Flug leicht einen halben Tag an Wegen und Wartezeiten.' },
        { k: 'c', text: 'Solange die Trassengebühren so hoch bleiben, rechnet sich eine Verbindung selbst bei vollen Zügen kaum.' },
        { k: 'd', text: 'Wird der Nachtverkehr wie andere umweltfreundliche Verkehrsmittel gefördert, kann er sich tragen.' },
        { k: 'e', text: 'Die Fahrkarten waren damals deutlich billiger als heute.' },
        { k: 'f', text: 'Auch das Frühstück an Bord wurde von den Reisenden sehr gelobt.' },
      ],
      items: [
        { n: 6, answer: 'a', why: '„Seither“ in the next sentence needs a point in time to refer back to, and „hat sich das Bild gedreht“ is the turn that „Seither“ follows.' },
        { n: 7, answer: 'b', why: 'The sentence after the gap begins „Eine Nacht im Liegewagen kostet **dagegen** …“ — so the gap must contain the thing being contrasted: the time flying costs.' },
        { n: 8, answer: 'c', why: 'The paragraph lists costs, and the sentence after the gap says the last attempt failed „genau daran“ — at that. Only (c) names a cost that could be failed at.' },
        { n: 9, answer: 'd', why: '„Bleibt sie aus“ needs a feminine singular noun to refer to: „die Förderung“, implied by „gefördert“. (e) and (f) are the decoys — both true-sounding, neither hooked to anything.' },
      ],
    },

    // ---- Lesen, Teil 3 (10–13) --------------------------------------------
    {
      id: 'l3',
      subtest: 'reading',
      teil: 3,
      label: 'Lesen, Teil 3',
      skill: 'Detailverstehen · Meinungen erkennen',
      rubric: 'Sie lesen in einer Zeitung einen Artikel über Sprachassistenten im Haushalt. Wählen '
        + 'Sie bei jeder Aufgabe die richtige Lösung.',
      rubricEn: 'One article, four three-way questions. At B2 the distractors are all *stated in the '
        + 'text* — what is being tested is whether the text says it as the author’s own view.',
      pointsPerItem: PER,
      kind: 'mc',
      passage: {
        title: 'Wer hört hier eigentlich zu?',
        standfirst: 'Sprachassistenten sind aus vielen Wohnungen nicht mehr wegzudenken. Über das, '
          + 'was sie können, wird viel geredet — über das, was sie nebenbei tun, wenig.',
        paras: [
          'Man gewöhnt sich schnell an sie. Das Licht ausschalten, ohne aufzustehen, einen Timer stellen mit nassen Händen, mitten im Kochen nach einer Umrechnung fragen — nichts davon ist lebensnotwendig, und trotzdem möchte kaum jemand darauf verzichten, der es einmal hatte. Nach einer Erhebung des Branchenverbands steht inzwischen in jedem dritten deutschen Haushalt mindestens ein solches Gerät.',
          'Bemerkenswert ist weniger diese Zahl als die Selbstverständlichkeit dahinter. Als vor einigen Jahren die ersten Modelle auf den Markt kamen, drehte sich die öffentliche Debatte fast ausschließlich um die Frage, ob ein Mikrofon im Wohnzimmer zumutbar sei. Diese Frage ist nicht beantwortet worden. Sie ist verschwunden.',
          'Dabei hat sich technisch durchaus etwas getan, und zwar zum Besseren: Die Verarbeitung findet häufiger als früher auf dem Gerät selbst statt, und die Hersteller haben nachvollziehbare Löschfunktionen eingebaut. Wer sich damit befasst, kann heute deutlich mehr kontrollieren als vor fünf Jahren. Nur befasst sich kaum jemand damit. In einer Untersuchung der Verbraucherzentrale hatte weniger als ein Zehntel der Befragten die Einstellungen jemals geöffnet.',
          'Man kann das den Nutzern vorwerfen. Überzeugender finde ich eine andere Erklärung: Geräte, die im Alltag verschwinden sollen, laden nicht dazu ein, sich mit ihnen zu beschäftigen. Ein Assistent, der ständig an seine Einstellungen erinnerte, wäre kein guter Assistent — und genau darin liegt das Problem, das sich technisch nicht lösen lässt.',
          'Was folgt daraus? Kein Verbot, wohl aber eine andere Voreinstellung. Solange das Speichern der Standard ist und das Löschen die Ausnahme, entscheidet nicht der Nutzer, sondern die Bequemlichkeit. Das ließe sich umdrehen, ohne dass ein einziges Gerät schlechter würde.',
        ],
      },
      questions: [
        {
          n: 10, stem: 'Was sagt der Autor über die frühere Debatte?',
          options: [
            { k: 'a', text: 'Sie hat zu strengeren Regeln geführt.' },
            { k: 'b', text: 'Sie ist ohne Ergebnis zu Ende gegangen.' },
            { k: 'c', text: 'Sie wurde von den Herstellern beendet.' },
          ],
        },
        {
          n: 11, stem: 'Wie beurteilt der Autor die technische Entwicklung?',
          options: [
            { k: 'a', text: 'Sie hat die Lage der Nutzer verbessert.' },
            { k: 'b', text: 'Sie hat kaum etwas verändert.' },
            { k: 'c', text: 'Sie hat die Geräte unsicherer gemacht.' },
          ],
        },
        {
          n: 12, stem: 'Warum beschäftigen sich nach Ansicht des Autors so wenige mit den Einstellungen?',
          options: [
            { k: 'a', text: 'Weil die Einstellungen zu kompliziert sind.' },
            { k: 'b', text: 'Weil die Nutzer die Risiken nicht ernst nehmen.' },
            { k: 'c', text: 'Weil ein Gerät, das im Alltag verschwindet, dazu nicht einlädt.' },
          ],
        },
        {
          n: 13, stem: 'Was fordert der Autor am Ende?',
          options: [
            { k: 'a', text: 'Dass die Geräte weniger können sollen.' },
            { k: 'b', text: 'Dass Löschen zum Normalfall wird.' },
            { k: 'c', text: 'Dass Sprachassistenten verboten werden.' },
          ],
        },
      ],
      items: [
        { n: 10, answer: 'b', why: '„Diese Frage ist nicht beantwortet worden. Sie ist verschwunden.“ — two short sentences doing the work of one B2 item.' },
        { n: 11, answer: 'a', why: '„hat sich technisch durchaus etwas getan, und zwar zum Besseren“ … „kann heute deutlich mehr kontrollieren“. (b) is true of what people *do*, not of the technology — the classic B2 trap.' },
        { n: 12, answer: 'c', why: 'The author explicitly rejects blaming the users („Man kann das den Nutzern vorwerfen. Überzeugender finde ich …“) — so (b) is stated and then disowned.' },
        { n: 13, answer: 'b', why: '„Solange das Speichern der Standard ist und das Löschen die Ausnahme …“ and „Das ließe sich umdrehen“. (a) and (c) are both ruled out by „Kein Verbot“ and „ohne dass ein einziges Gerät schlechter würde“.' },
      ],
    },

    // ---- Lesen, Teil 4 (14–17) --------------------------------------------
    {
      id: 'l4',
      subtest: 'reading',
      teil: 4,
      label: 'Lesen, Teil 4',
      skill: 'Hauptaussagen erkennen',
      rubric: 'Sie lesen in einer Zeitschrift Meinungsäußerungen zum Thema Ehrenamt. Welche Äußerung '
        + 'passt zu welcher Überschrift? Jede Überschrift kann nur einmal verwendet werden; zwei '
        + 'Überschriften passen nicht.',
      rubricEn: 'Four opinions, six headings, each usable once. The heading has to fit the *main* '
        + 'point — every text will touch on two or three of the headings in passing.',
      pointsPerItem: PER,
      kind: 'match',
      once: true,
      options: [
        { k: 'a', text: 'Ohne feste Zeiten geht es nicht' },
        { k: 'b', text: 'Ein Ersatz für Aufgaben, die der Staat übernehmen müsste' },
        { k: 'c', text: 'Wer sich engagiert, bekommt selbst am meisten zurück' },
        { k: 'd', text: 'Junge Menschen wollen sich anders binden als früher' },
        { k: 'e', text: 'Anerkennung wiegt schwerer als Bezahlung' },
        { k: 'f', text: 'Vereine müssen zuerst ihre Verwaltung vereinfachen' },
      ],
      texts: [
        { n: 14, body: 'Ich höre ständig, die Jugend wolle sich nicht mehr engagieren. Das stimmt so nicht. In unserem Verein melden sich genügend Leute unter dreißig — nur eben für ein Projekt, für einen Sommer, für eine Aufgabe mit einem Ende. Wer von ihnen verlangt, sich auf fünf Jahre in einen Vorstand wählen zu lassen, bekommt niemanden. Wer eine überschaubare Aufgabe anbietet, bekommt mehr Hilfe, als er gebrauchen kann.' },
        { n: 15, body: 'Man sollte ehrlich benennen, was hier passiert. In vielen Orten hält das Ehrenamt Dinge am Laufen, für die es eigentlich Personal bräuchte: Fahrdienste, Nachhilfe, die Betreuung von Menschen, die allein nicht zurechtkommen. Solange das so ist, ist Freiwilligkeit kein Zusatz zum System, sondern seine Voraussetzung — und das ist ein Zustand, über den man reden muss, statt ihn zu feiern.' },
        { n: 16, body: 'Ich mache das seit elf Jahren, zwei Nachmittage pro Woche, und ich bin ehrlich: Ich tue es nicht in erster Linie für die anderen. Ich habe dadurch Menschen kennengelernt, mit denen ich sonst nie ein Wort gewechselt hätte, und ich weiß an einem Dienstag, wozu ich aufstehe. Das ist mehr, als mir mein Beruf in zwanzig Jahren gegeben hat.' },
        { n: 17, body: 'Bezahlung wäre bei uns weder möglich noch erwünscht — die meisten würden sie ablehnen. Was dagegen fehlt, ist ein Ton. Eine Einladung, eine Erwähnung im Jahresbericht, ein Anruf, wenn jemand zwei Wochen nicht da war. Es klingt nach Kleinigkeiten. Wir verlieren aber kaum jemanden, weil die Arbeit zu viel wird, sondern weil sie niemandem auffällt.' },
      ],
      items: [
        { n: 14, answer: 'd', why: 'The point is not that the young are unwilling but that they bind themselves *differently* — „für ein Projekt, für einen Sommer“.' },
        { n: 15, answer: 'b', why: '„für die es eigentlich Personal bräuchte“ … „kein Zusatz zum System, sondern seine Voraussetzung“.' },
        { n: 16, answer: 'c', why: '„Ich tue es nicht in erster Linie für die anderen“ — the whole text is about the return to the volunteer.' },
        { n: 17, answer: 'e', why: 'Pay is dismissed in the first line; what is missing is „ein Ton“ — being noticed. (a) and (f) are the decoys, and both are plausible-sounding headings about volunteering in general.' },
      ],
    },

    // ---- Lesen, Teil 5 (18–20) --------------------------------------------
    {
      id: 'l5',
      subtest: 'reading',
      teil: 5,
      label: 'Lesen, Teil 5',
      skill: 'Orientierendes Lesen · formale Texte',
      rubric: 'Sie möchten an einer deutschen Hochschule ein Semester verbringen und lesen die '
        + 'Benutzungsordnung der Universitätsbibliothek. Welche der Überschriften aus dem '
        + 'Inhaltsverzeichnis passen zu den Paragrafen? Vier Überschriften werden nicht gebraucht.',
      rubricEn: 'The one task on the paper written in officialese. Three paragraphs, seven headings. '
        + 'You are not reading for meaning — you are matching a paragraph’s *subject* to a heading, '
        + 'and it can be done without understanding every clause.',
      pointsPerItem: PER,
      kind: 'match',
      once: true,
      options: [
        { k: 'a', text: 'Öffnungszeiten' },
        { k: 'b', text: 'Zulassung zur Benutzung' },
        { k: 'c', text: 'Ausleihfristen und Verlängerung' },
        { k: 'd', text: 'Verhalten in den Lesesälen' },
        { k: 'e', text: 'Haftung bei Verlust und Beschädigung' },
        { k: 'f', text: 'Gebühren' },
        { k: 'g', text: 'Nutzung der Arbeitsplätze' },
      ],
      texts: [
        { n: 18, body: '§ 3 — Zur Benutzung berechtigt sind Mitglieder und Angehörige der Universität sowie Personen, die das sechzehnte Lebensjahr vollendet haben und ihren Wohnsitz im Freistaat nachweisen. Die Anmeldung erfolgt persönlich unter Vorlage eines amtlichen Lichtbildausweises. Über Ausnahmen entscheidet die Bibliotheksleitung auf schriftlichen Antrag.' },
        { n: 19, body: '§ 7 — Die Leihfrist beträgt vier Wochen. Sie kann zweimal um jeweils vier Wochen verlängert werden, sofern das Werk nicht von einer anderen Person vorgemerkt wurde. Die Verlängerung ist vor Ablauf der Frist über das Benutzerkonto zu beantragen; eine nachträgliche Verlängerung ist ausgeschlossen.' },
        { n: 20, body: '§ 12 — Wer ein entliehenes Werk beschädigt oder nicht zurückgibt, hat der Bibliothek den entstandenen Schaden zu ersetzen. Maßgeblich ist der Wiederbeschaffungswert zuzüglich eines Bearbeitungsentgelts. Die Bibliothek kann stattdessen die Beschaffung eines gleichwertigen Exemplars verlangen.' },
      ],
      items: [
        { n: 18, answer: 'b', why: '„Zur Benutzung berechtigt sind …“ — who may register at all. Not (f): no money is mentioned.' },
        { n: 19, answer: 'c', why: '„Die Leihfrist beträgt vier Wochen. Sie kann zweimal … verlängert werden.“ Both halves of the heading are in the first two sentences.' },
        { n: 20, answer: 'e', why: '„hat der Bibliothek den entstandenen Schaden zu ersetzen“ — liability. The „Bearbeitungsentgelt“ makes (f) tempting, but it is one clause inside a paragraph about damage.' },
      ],
    },

    // ---- Hören, Teil 1 (21–26) --------------------------------------------
    {
      id: 'h1',
      subtest: 'listening',
      teil: 1,
      label: 'Hören, Teil 1',
      skill: 'Globalverstehen und Detailverstehen',
      rubric: 'Sie hören drei kurze Texte. Sie hören jeden Text einmal. Zu jedem Text lösen Sie '
        + 'zwei Aufgaben: eine Aussage ist richtig oder falsch, und bei der zweiten wählen Sie die '
        + 'richtige Lösung.',
      rubricEn: 'Heard ONCE. Two items per text and they test different things: the richtig/falsch '
        + 'item is about the situation as a whole, the multiple choice about one detail. Read both '
        + 'before the audio starts — after it, one of them is gone.',
      pointsPerItem: PER,
      kind: 'mc',
      audio: {
        plays: 1,
        intro: 'Drei kurze Texte. Jeder Text wird nur einmal gespielt.',
        tracks: [
          {
            n: 1, label: 'Text 1 — Nachricht auf der Mailbox',
            lines: [
              { who: 'Frau Ostheim', text: 'Guten Tag, Herr Baumann, hier ist Ostheim von der Hausverwaltung. Es geht um den Termin für den Heizungsableser am Donnerstag. Wir haben ein Problem: Der Kollege schafft es an dem Tag nur bis vierzehn Uhr, und Sie hatten sechzehn Uhr gewünscht.' },
              { who: 'Frau Ostheim', text: 'Ich möchte Ihnen deshalb zwei Möglichkeiten anbieten. Entweder wir bleiben beim Donnerstag und Sie hinterlegen den Schlüssel bei einer Nachbarin — das machen die meisten im Haus so —, oder wir verschieben auf den folgenden Dienstag, dann können Sie selbst dabei sein.' },
              { who: 'Frau Ostheim', text: 'Rufen Sie mich bitte bis morgen Mittag zurück, sonst muss ich den Donnerstagstermin absagen und wir landen im Januar. Meine Nummer haben Sie ja. Auf Wiederhören.' },
            ],
          },
          {
            n: 2, label: 'Text 2 — Durchsage im Bahnhof',
            lines: [
              { who: 'Durchsage', text: 'Sehr geehrte Fahrgäste am Gleis sieben: Der Intercity nach Hamburg, planmäßige Abfahrt siebzehn Uhr zwölf, verspätet sich um voraussichtlich fünfundzwanzig Minuten. Grund dafür ist eine Störung an einem vorausfahrenden Zug.' },
              { who: 'Durchsage', text: 'Reisende mit Anschluss in Hannover bitten wir, sich nicht am Serviceschalter anzustellen, sondern die Anschlussauskunft in der App abzurufen — dort werden die Verbindungen laufend aktualisiert. Die Sitzplatzreservierungen bleiben gültig.' },
              { who: 'Durchsage', text: 'Der Speisewagen führt heute kein warmes Angebot. Wir bitten um Ihr Verständnis.' },
            ],
          },
          {
            n: 3, label: 'Text 3 — Kurzes Gespräch',
            lines: [
              { who: 'Mann', text: 'Und, wie war der erste Tag im neuen Büro?' },
              { who: 'Frau', text: 'Anstrengend, aber gut. Was mich überrascht hat: Es gibt keine festen Plätze mehr. Man sucht sich morgens einen aus.' },
              { who: 'Mann', text: 'Das würde mich wahnsinnig machen. Jeden Tag woanders sitzen?' },
              { who: 'Frau', text: 'Ich dachte auch, dass mich das stört. Tatsächlich war es eher praktisch — ich habe an einem Tag mehr Leute kennengelernt als sonst in einer Woche. Was mir wirklich fehlt, ist etwas anderes: Man kann nichts liegen lassen. Alles muss abends in einen Schrank.' },
              { who: 'Mann', text: 'Also doch nicht ideal.' },
              { who: 'Frau', text: 'Doch, für mich schon. Ich würde nur gern eine Schublade behalten.' },
            ],
          },
        ],
      },
      questions: [
        {
          n: 21, stem: 'Text 1: Der Termin am Donnerstag ist endgültig abgesagt.',
          options: [{ k: 'r', text: 'Richtig' }, { k: 'f', text: 'Falsch' }],
        },
        {
          n: 22, stem: 'Text 1: Wenn Herr Baumann sich nicht meldet,',
          options: [
            { k: 'a', text: 'kommt der Ableser am Dienstag.' },
            { k: 'b', text: 'entfällt der Donnerstagstermin.' },
            { k: 'c', text: 'wird der Schlüssel bei der Nachbarin geholt.' },
          ],
        },
        {
          n: 23, stem: 'Text 2: Die Reservierungen der Fahrgäste verfallen wegen der Verspätung.',
          options: [{ k: 'r', text: 'Richtig' }, { k: 'f', text: 'Falsch' }],
        },
        {
          n: 24, stem: 'Text 2: Reisende mit Anschluss in Hannover sollen',
          options: [
            { k: 'a', text: 'zum Serviceschalter gehen.' },
            { k: 'b', text: 'die Auskunft in der App nutzen.' },
            { k: 'c', text: 'im Speisewagen warten.' },
          ],
        },
        {
          n: 25, stem: 'Text 3: Die Frau ist mit dem neuen Bürokonzept insgesamt zufrieden.',
          options: [{ k: 'r', text: 'Richtig' }, { k: 'f', text: 'Falsch' }],
        },
        {
          n: 26, stem: 'Text 3: Was stört die Frau an der neuen Regelung?',
          options: [
            { k: 'a', text: 'Dass sie täglich neue Kollegen trifft.' },
            { k: 'b', text: 'Dass sie abends alles wegräumen muss.' },
            { k: 'c', text: 'Dass die Arbeitstage länger geworden sind.' },
          ],
        },
      ],
      items: [
        { n: 21, answer: 'f', why: 'It is only cancelled *if he does not call back* — „sonst muss ich den Donnerstagstermin absagen“. A conditional presented as a fact is the standard richtig/falsch trap.' },
        { n: 22, answer: 'b', why: 'Same sentence, read as the question asks: no call by tomorrow midday → Thursday is off. (a) is the alternative he would have to choose, not the default.' },
        { n: 23, answer: 'f', why: '„Die Sitzplatzreservierungen bleiben gültig.“ — stated outright at the end of the second block.' },
        { n: 24, answer: 'b', why: '„sich nicht am Serviceschalter anzustellen, sondern die Anschlussauskunft in der App abzurufen“. Both options are named; only one is the instruction.' },
        { n: 25, answer: 'r', why: 'She corrects him directly: „Doch, für mich schon.“ Her complaint is one detail, not the verdict — and the whole item is whether you kept those apart.' },
        { n: 26, answer: 'b', why: '„Man kann nichts liegen lassen. Alles muss abends in einen Schrank.“ (a) is the thing she says turned out to be an advantage.' },
      ],
    },

    // ---- Hören, Teil 2 (27–31) --------------------------------------------
    {
      id: 'h2',
      subtest: 'listening',
      teil: 2,
      label: 'Hören, Teil 2',
      skill: 'Detailverstehen',
      rubric: 'Sie hören im Radio ein Interview mit einer Wissenschaftlerin. Sie hören den Text '
        + 'zweimal. Wählen Sie bei jeder Aufgabe die richtige Lösung.',
      rubricEn: 'Heard TWICE, and the two hearings have different jobs: the first is for the shape '
        + 'of the argument, the second for the items you left open. Do not try to answer everything '
        + 'on the first pass.',
      pointsPerItem: PER,
      kind: 'mc',
      audio: {
        plays: 2,
        intro: 'Ein Interview. Sie hören den Text zweimal.',
        tracks: [
          {
            label: 'Radiointerview — Lärm in der Stadt',
            lines: [
              { who: 'Moderator', text: 'Frau Dr. Reuter, Sie erforschen seit Jahren, was Lärm mit uns macht. Fangen wir einfach an: Ab wann wird Geräusch zu Lärm?' },
              { who: 'Dr. Reuter', text: 'Das ist die entscheidende Frage, und die Antwort enttäuscht viele: Es hängt kaum von der Lautstärke ab. Entscheidend ist, ob ich das Geräusch kontrollieren kann. Meine eigene Musik in derselben Lautstärke empfinde ich nicht als Lärm, die des Nachbarn schon.' },
              { who: 'Moderator', text: 'Das heißt, Grenzwerte in Dezibel sind sinnlos?' },
              { who: 'Dr. Reuter', text: 'Nein, das würde ich so nicht sagen. Für den Gehörschutz sind sie unverzichtbar. Nur erklären sie eben nicht, warum Menschen an einer relativ leisen Straße schlechter schlafen als an einer lauten Bahnstrecke.' },
              { who: 'Moderator', text: 'Und warum tun sie das?' },
              { who: 'Dr. Reuter', text: 'Weil der Zug regelmäßig kommt. Das Gehirn lernt Muster. Ein gleichmäßiges Geräusch wird nach einigen Wochen weitgehend ausgeblendet; ein unregelmäßiges nie. Genau deshalb ist der Rasenmäher am Sonntagnachmittag ein größeres Problem als die Autobahn.' },
              { who: 'Moderator', text: 'Was raten Sie jemandem, der in einer lauten Wohnung sitzt und nicht umziehen kann?' },
              { who: 'Dr. Reuter', text: 'Ganz praktisch: Schlafzimmer nach hinten, wenn das geht. Und ansonsten — das klingt banal — reden Sie mit den Leuten. Ein großer Teil der Belastung entsteht dadurch, dass man sich ausgeliefert fühlt. Wer weiß, dass der Umbau nebenan in drei Wochen fertig ist, schläft messbar besser als jemand, der es nicht weiß.' },
              { who: 'Moderator', text: 'Und was müsste die Politik tun?' },
              { who: 'Dr. Reuter', text: 'Weniger über Fenster reden und mehr über Verkehr. Schallschutzfenster verlagern das Problem nur nach draußen: Sie helfen nachts und nehmen Ihnen den Balkon. Tempo dreißig dagegen wirkt an beiden Orten, kostet fast nichts und ist trotzdem politisch am schwersten durchzusetzen.' },
            ],
          },
        ],
      },
      questions: [
        {
          n: 27, stem: 'Wann wird ein Geräusch nach Frau Reuter zu Lärm?',
          options: [
            { k: 'a', text: 'Wenn es eine bestimmte Lautstärke überschreitet.' },
            { k: 'b', text: 'Wenn man keinen Einfluss darauf hat.' },
            { k: 'c', text: 'Wenn es nachts auftritt.' },
          ],
        },
        {
          n: 28, stem: 'Was hält sie von Grenzwerten in Dezibel?',
          options: [
            { k: 'a', text: 'Sie sind für den Gehörschutz notwendig.' },
            { k: 'b', text: 'Sie sollten abgeschafft werden.' },
            { k: 'c', text: 'Sie sind zu niedrig angesetzt.' },
          ],
        },
        {
          n: 29, stem: 'Warum stört eine Bahnstrecke weniger als eine leise Straße?',
          options: [
            { k: 'a', text: 'Weil Züge seltener fahren.' },
            { k: 'b', text: 'Weil das Geräusch regelmäßig wiederkehrt.' },
            { k: 'c', text: 'Weil Bahnstrecken meist weiter entfernt liegen.' },
          ],
        },
        {
          n: 30, stem: 'Was empfiehlt sie Betroffenen außer baulichen Maßnahmen?',
          options: [
            { k: 'a', text: 'Sich bei der Stadt zu beschweren.' },
            { k: 'b', text: 'Das Gespräch mit den Verursachern zu suchen.' },
            { k: 'c', text: 'Ohrstöpsel zu benutzen.' },
          ],
        },
        {
          n: 31, stem: 'Wie beurteilt sie Schallschutzfenster?',
          options: [
            { k: 'a', text: 'Als die wirksamste einzelne Maßnahme.' },
            { k: 'b', text: 'Als nutzlos.' },
            { k: 'c', text: 'Als Lösung, die nur drinnen wirkt.' },
          ],
        },
      ],
      items: [
        { n: 27, answer: 'b', why: '„Entscheidend ist, ob ich das Geräusch kontrollieren kann.“ She rules (a) out in the same breath: „Es hängt kaum von der Lautstärke ab.“' },
        { n: 28, answer: 'a', why: '„Für den Gehörschutz sind sie unverzichtbar.“ The interviewer offers (b) and she refuses it — „das würde ich so nicht sagen“.' },
        { n: 29, answer: 'b', why: '„Weil der Zug regelmäßig kommt. Das Gehirn lernt Muster.“ (a) sounds like the same thing and is not: frequency is not regularity.' },
        { n: 30, answer: 'b', why: '„reden Sie mit den Leuten“ — and her reason is the one that makes it an item: „Ein großer Teil der Belastung entsteht dadurch, dass man sich ausgeliefert fühlt.“' },
        { n: 31, answer: 'c', why: '„Sie helfen nachts und nehmen Ihnen den Balkon.“ That is neither useless (b) nor the best measure (a) — she names Tempo 30 as the one that works in both places.' },
      ],
    },

    // ---- Hören, Teil 3 (32–35) --------------------------------------------
    {
      id: 'h3',
      subtest: 'listening',
      teil: 3,
      label: 'Hören, Teil 3',
      skill: 'Sprecherzuordnung',
      rubric: 'Sie hören ein Gespräch mit mehreren Personen. Die Personen sprechen über das Radfahren '
        + 'in der Stadt. Sie hören den Text einmal. Wählen Sie bei jeder Aufgabe: Wer sagt das?',
      rubricEn: 'Heard ONCE, and the task is not *what* but *who*. Three voices, and they agree more '
        + 'often than they disagree — the marks are in the one sentence where they part.',
      pointsPerItem: PER,
      kind: 'mc',
      audio: {
        plays: 1,
        intro: 'Ein Gespräch mit drei Personen. Sie hören den Text nur einmal.',
        tracks: [
          {
            label: 'Stadtgespräch — Wem gehört die Straße?',
            lines: [
              { who: 'Moderatorin', text: 'Willkommen im Stadtgespräch. Bei mir sitzen Frau Berger vom Radverkehrsverband und Herr Kern, der einen Handwerksbetrieb in der Innenstadt führt. Frau Berger, die Stadt will die Hofstraße für Autos sperren. Ein gutes Signal?' },
              { who: 'Frau Berger', text: 'Ein längst überfälliges. Wir diskutieren seit fünfzehn Jahren über Radwege und bauen sie dann einen Meter breit an eine vierspurige Straße. Das benutzt niemand, der Kinder hat. Sicherheit entsteht nicht durch Farbe auf dem Asphalt, sondern durch Trennung.' },
              { who: 'Herr Kern', text: 'Dem letzten Satz würde ich sogar zustimmen. Nur betrifft mich die Sperrung anders. Ich fahre nicht zum Vergnügen in die Innenstadt, ich fahre mit vierhundert Kilo Material. Solange mir niemand sagt, wie ich eine Heizungsanlage mit dem Lastenrad transportieren soll, ist die Sperrung für mich schlicht ein Berufsverbot.' },
              { who: 'Moderatorin', text: 'Frau Berger, was antworten Sie darauf?' },
              { who: 'Frau Berger', text: 'Dass Herr Kern recht hat und trotzdem nicht das Problem ist. Lieferverkehr und Handwerk machen einen kleinen Teil der Fahrten aus. Für die gibt es Ausnahmegenehmigungen, und die sollte es großzügig geben.' },
              { who: 'Herr Kern', text: 'Da bin ich skeptisch. Ausnahmegenehmigungen bedeuten in dieser Stadt ein Formular pro Fahrzeug und pro Quartal. Ich habe sieben Fahrzeuge.' },
              { who: 'Moderatorin', text: 'Das ist ein Punkt, den ich aus vielen Zuschriften kenne — nicht die Regel selbst ärgert die Leute, sondern der Weg dorthin.' },
              { who: 'Frau Berger', text: 'Und da sind wir uns einig. Wenn eine Maßnahme daran scheitert, dass die Verwaltung sie nicht abbilden kann, ist es keine gute Maßnahme.' },
              { who: 'Herr Kern', text: 'Was mich zusätzlich stört: Es wird immer über die Innenstadt geredet. Meine Leute wohnen alle außerhalb. Für die ändert sich gar nichts, außer dass sie eine halbe Stunde länger brauchen.' },
              { who: 'Moderatorin', text: 'Über das Umland reden wir tatsächlich zu selten, das gebe ich zu.' },
            ],
          },
        ],
      },
      questions: [
        {
          n: 32, stem: 'Schmale Radwege an großen Straßen werden kaum genutzt.',
          options: [{ k: 'a', text: 'Moderatorin' }, { k: 'b', text: 'Frau Berger' }, { k: 'c', text: 'Herr Kern' }],
        },
        {
          n: 33, stem: 'Nicht die Regel selbst stört, sondern das Verfahren dahinter.',
          options: [{ k: 'a', text: 'Moderatorin' }, { k: 'b', text: 'Frau Berger' }, { k: 'c', text: 'Herr Kern' }],
        },
        {
          n: 34, stem: 'Für Handwerksbetriebe sollte es großzügige Ausnahmen geben.',
          options: [{ k: 'a', text: 'Moderatorin' }, { k: 'b', text: 'Frau Berger' }, { k: 'c', text: 'Herr Kern' }],
        },
        {
          n: 35, stem: 'Die Diskussion vernachlässigt die Menschen außerhalb der Stadt.',
          options: [{ k: 'a', text: 'Moderatorin' }, { k: 'b', text: 'Frau Berger' }, { k: 'c', text: 'Herr Kern' }],
        },
      ],
      items: [
        { n: 32, answer: 'b', why: 'Frau Berger: „bauen sie dann einen Meter breit an eine vierspurige Straße. Das benutzt niemand, der Kinder hat.“' },
        { n: 33, answer: 'a', why: 'The presenter, summarising the listeners’ letters: „nicht die Regel selbst ärgert die Leute, sondern der Weg dorthin“. Berger then agrees with her — agreeing is not saying it.' },
        { n: 34, answer: 'b', why: 'Counter-intuitive and therefore the item: it is Berger, not Kern, who calls for generous exemptions. Kern only doubts they would work.' },
        { n: 35, answer: 'c', why: 'Herr Kern: „Meine Leute wohnen alle außerhalb.“ The presenter concedes the point afterwards — again, conceding is not saying.' },
      ],
    },

    // ---- Hören, Teil 4 (36–40) --------------------------------------------
    {
      id: 'h4',
      subtest: 'listening',
      teil: 4,
      label: 'Hören, Teil 4',
      skill: 'Detailverstehen · Vortrag',
      rubric: 'Sie hören einen kurzen Vortrag. Der Redner spricht über das Thema Schlaf und Lernen. '
        + 'Sie hören den Text zweimal. Wählen Sie bei jeder Aufgabe die richtige Lösung.',
      rubricEn: 'Heard TWICE. A monologue is harder than a dialogue at this level because nobody '
        + 'reformulates for you — the speaker says each thing once, in his own words.',
      pointsPerItem: PER,
      kind: 'mc',
      audio: {
        plays: 2,
        intro: 'Ein Vortrag. Sie hören den Text zweimal.',
        tracks: [
          {
            label: 'Vortrag — Was im Schlaf mit dem Gelernten geschieht',
            lines: [
              { who: 'Redner', text: 'Guten Abend. Ich möchte heute mit einem Missverständnis aufräumen, das sich hartnäckig hält: dass Schlaf eine Pause vom Lernen sei. Das Gegenteil trifft zu. Ein erheblicher Teil dessen, was wir Lernen nennen, findet überhaupt erst statt, wenn wir schlafen.' },
              { who: 'Redner', text: 'Tagsüber nehmen wir auf. Nachts wird sortiert. Das Gehirn spielt bestimmte Abläufe noch einmal ab und entscheidet dabei, was in den Langzeitspeicher übernommen wird und was nicht. Wer nach dem Lernen nicht schläft, hat den Stoff also nicht etwa langsamer gespeichert — er hat einen Arbeitsschritt ausgelassen.' },
              { who: 'Redner', text: 'Nun wird oft gefragt, wie viele Stunden es denn sein müssen. Diese Frage führt in die Irre. Wichtiger als die Dauer ist, dass beide Schlafarten vorkommen: der tiefe Schlaf in der ersten Nachthälfte, der vor allem Fakten festigt, und der Traumschlaf gegen Morgen, in dem eher Zusammenhänge entstehen. Wer regelmäßig fünf Stunden schläft und dabei den Morgen abschneidet, verliert nicht ein Fünftel seines Lernens, sondern eine ganze Art davon.' },
              { who: 'Redner', text: 'Daraus folgt etwas sehr Praktisches für Prüfungen. Die durchgearbeitete Nacht vor dem Examen ist der schlechteste denkbare Tausch: Man gewinnt vier Stunden Wiederholung und bezahlt sie mit dem Verlust dessen, was in den Wochen davor aufgebaut wurde. In Untersuchungen schneiden Studierende, die nach dem Lernen normal geschlafen haben, regelmäßig besser ab als solche, die stattdessen weitergelernt haben — und zwar auch dann, wenn die zweite Gruppe insgesamt mehr Zeit investiert hat.' },
              { who: 'Redner', text: 'Zum Schluss ein Wort zum Mittagsschlaf, weil ich danach immer gefragt werde. Zwanzig Minuten helfen nachweislich, aber anders, als die meisten hoffen: Sie stellen die Aufnahmefähigkeit für den Nachmittag wieder her. Sie ersetzen nicht die Nacht. Wer glaubt, er könne Schlaf über den Tag verteilt nachholen, verwechselt Erholung mit Verarbeitung.' },
            ],
          },
        ],
      },
      questions: [
        {
          n: 36, stem: 'Welches Missverständnis will der Redner ausräumen?',
          options: [
            { k: 'a', text: 'Dass Schlaf eine Unterbrechung des Lernens sei.' },
            { k: 'b', text: 'Dass Schlaf nur der Erholung diene.' },
            { k: 'c', text: 'Dass man im Schlaf lernen könne.' },
          ],
        },
        {
          n: 37, stem: 'Was geschieht laut Vortrag nachts mit dem Gelernten?',
          options: [
            { k: 'a', text: 'Es wird wiederholt und ausgewählt.' },
            { k: 'b', text: 'Es wird vollständig gespeichert.' },
            { k: 'c', text: 'Es wird mit älterem Wissen verglichen.' },
          ],
        },
        {
          n: 38, stem: 'Warum hält der Redner die Frage nach der Stundenzahl für falsch gestellt?',
          options: [
            { k: 'a', text: 'Weil jeder Mensch unterschiedlich viel Schlaf braucht.' },
            { k: 'b', text: 'Weil es auf das Vorkommen beider Schlafarten ankommt.' },
            { k: 'c', text: 'Weil sich die Dauer nicht messen lässt.' },
          ],
        },
        {
          n: 39, stem: 'Was sagt er über die Nacht vor einer Prüfung?',
          options: [
            { k: 'a', text: 'Kurzes Wiederholen am Abend ist sinnvoll.' },
            { k: 'b', text: 'Durchlernen kostet mehr, als es bringt.' },
            { k: 'c', text: 'Sie ist für das Ergebnis kaum von Bedeutung.' },
          ],
        },
        {
          n: 40, stem: 'Wie beurteilt er den Mittagsschlaf?',
          options: [
            { k: 'a', text: 'Er ist ein vollwertiger Ersatz für fehlenden Nachtschlaf.' },
            { k: 'b', text: 'Er nützt nur Menschen, die schlecht schlafen.' },
            { k: 'c', text: 'Er stellt die Aufnahmefähigkeit wieder her, verarbeitet aber nichts.' },
          ],
        },
      ],
      items: [
        { n: 36, answer: 'a', why: '„dass Schlaf eine Pause vom Lernen sei“ — the first sentence of the talk, and the one thing he announces he is there to correct.' },
        { n: 37, answer: 'a', why: '„spielt bestimmte Abläufe noch einmal ab und entscheidet dabei, was … übernommen wird und was nicht“ — replay plus selection. (b) fails on „und was nicht“.' },
        { n: 38, answer: 'b', why: '„Wichtiger als die Dauer ist, dass beide Schlafarten vorkommen.“ (a) is a true statement about sleep that he never makes.' },
        { n: 39, answer: 'b', why: '„der schlechteste denkbare Tausch: Man gewinnt vier Stunden Wiederholung und bezahlt sie mit dem Verlust dessen, was in den Wochen davor aufgebaut wurde.“' },
        { n: 40, answer: 'c', why: '„Sie stellen die Aufnahmefähigkeit für den Nachmittag wieder her. Sie ersetzen nicht die Nacht.“ — both halves of the option, in his own two sentences.' },
      ],
    },
  ],

  // ---- Schreiben -----------------------------------------------------------
  writing: {
    id: 'b2-w1',
    situation: 'Schreiben, Teil 1 — Sie schreiben einen Forumsbeitrag zum Thema Handys an Schulen. '
      + 'Vorgeschlagene Arbeitszeit: 50 Minuten. Schreiben Sie circa 150 Wörter. Denken Sie an eine '
      + 'Einleitung und einen Schluss.',
    situationEn: 'B2 Schreiben Teil 1 is not a letter to a person — it is a public post in a thread, '
      + 'and the register is different: no Anrede to an individual, no Grüße, but an opening and a '
      + 'closing sentence that are explicitly marked.',
    letter: {
      from: 'Forum „Schule heute“ · Beitrag von Jana_R',
      body: [
        'Bei uns an der Schule wurde diese Woche beschlossen: Handys bleiben ab Januar den ganzen Tag in der Tasche, auch in den Pausen. Wer erwischt wird, gibt das Gerät bis zum Nachmittag ab.',
        'Ich bin ehrlich gesagt hin- und hergerissen. Im Unterricht leuchtet es mir ein. Aber in der Pause? Meine Tochter schreibt mir da manchmal, wenn der Bus ausfällt.',
        'Mich würde interessieren, wie das andere sehen — und ob jemand eine Schule kennt, die es anders macht und bei der es funktioniert.',
      ],
    },
    leitpunkte: [
      { de: 'Äußern Sie Ihre Meinung zu Handyverboten an Schulen.', en: 'Give your opinion on phone bans at schools.' },
      { de: 'Nennen Sie Gründe, warum Handys im Unterricht als Problem gelten.', en: 'Give reasons why phones in lessons are seen as a problem.' },
      { de: 'Beschreiben Sie eine andere Möglichkeit, mit dem Thema umzugehen.', en: 'Describe another way of handling the issue.' },
      { de: 'Nennen Sie Vorteile dieser anderen Möglichkeit.', en: 'Give advantages of that other approach.' },
    ],
    minutes: 50,
    models: [
      {
        band: 'B1', label: 'Zu wenig',
        note: 'Covers the four points and would pass a B1 letter. At B2 it loses marks in two places: '
          + 'the sentences are all the same length, and there is no opening or closing move at all.',
        lines: [
          { de: 'Ich finde das Thema sehr interessant. Handys sind ein Problem in der Schule.', en: 'I find the topic very interesting. Phones are a problem at school.' },
          { de: 'Die Schüler schauen im Unterricht auf das Handy und hören nicht zu. Deshalb lernen sie weniger.', en: 'Pupils look at their phones during lessons and do not listen. That is why they learn less.' },
          { de: 'Man kann auch etwas anderes machen. Die Lehrer können mit den Schülern über das Handy sprechen.', en: 'You can also do something else. Teachers can talk to the pupils about phones.' },
          { de: 'Das ist besser, weil die Schüler dann selbst denken müssen. Ein Verbot hilft nur kurz.', en: 'That is better because then the pupils have to think for themselves. A ban only helps briefly.' },
        ],
      },
      {
        band: 'B2', label: 'Ziel',
        note: 'The target. An Einleitung that takes up the original post, each Leitpunkt in its own '
          + 'paragraph, and a Schluss that comes down on one side. Note how often the sentences '
          + 'start with something other than the subject.',
        lines: [
          { de: 'Der Beitrag von Jana_R trifft einen Punkt, an dem sich gerade sehr viele Schulen abarbeiten — und ich finde bemerkenswert, dass sie zwischen Unterricht und Pause unterscheidet, denn genau da liegt für mich der Unterschied.', en: 'Jana_R’s post touches on a point that a great many schools are currently wrestling with — and I find it notable that she distinguishes between lessons and breaks, because for me that is exactly where the difference lies.' },
          { de: 'Ein Verbot während des Unterrichts halte ich für richtig. Der Grund ist weniger die Disziplin als die Aufmerksamkeit: Wer alle paar Minuten auf ein Display schaut, verliert den Faden und braucht anschließend Zeit, um wieder hineinzufinden. Hinzu kommt, dass Lehrkräfte sonst einen erheblichen Teil der Stunde damit verbringen, Geräte einzusammeln statt zu unterrichten.', en: 'A ban during lessons I consider right. The reason is less discipline than attention: anyone who glances at a screen every few minutes loses the thread and then needs time to find their way back in. On top of that, teachers otherwise spend a considerable part of the lesson collecting devices instead of teaching.' },
          { de: 'In den Pausen würde ich dagegen einen anderen Weg gehen. Statt eines Verbots könnte die Schule feste handyfreie Zonen einrichten — den Hof und die Mensa etwa — und den Rest freigeben. Einige Schulen verbinden das damit, dass der Umgang mit sozialen Medien im Unterricht selbst behandelt wird.', en: 'In the breaks, however, I would take a different route. Instead of a ban, the school could set up fixed phone-free zones — the yard and the canteen, say — and leave the rest open. Some schools combine this with dealing with social media in lessons themselves.' },
          { de: 'Der Vorteil liegt für mich auf der Hand: Eine Regel, die begründet und begrenzt ist, wird eher eingehalten als eine, die alles verbietet. Außerdem bleibt der Weg zu den Eltern offen, der Jana_R zu Recht wichtig ist.', en: 'The advantage is obvious to me: a rule that is justified and limited is more likely to be observed than one that forbids everything. Besides, the route to parents stays open, which Jana_R rightly considers important.' },
          { de: 'Insgesamt bin ich also für ein Verbot — aber für ein kleineres, als ihre Schule es beschlossen hat.', en: 'On the whole I am therefore in favour of a ban — but a smaller one than her school has decided on.' },
        ],
      },
      {
        band: 'C1', label: 'Stark',
        note: 'Beyond what B2 asks for. Two devices carry it: a subordinate clause fronted for '
          + 'emphasis, and a concession that names the strongest counter-argument before answering it.',
        lines: [
          { de: 'Dass die Diskussion über Handys an Schulen so hitzig geführt wird, liegt vermutlich daran, dass in ihr zwei Fragen vermischt werden, die wenig miteinander zu tun haben: die nach der Konzentration im Unterricht und die nach der Kontrolle über den Tag der Kinder.', en: 'That the discussion about phones at schools is conducted so heatedly is probably because two questions are mixed up in it that have little to do with one another: that of concentration in lessons and that of control over children’s day.' },
          { de: 'Auf die erste gibt es eine klare Antwort. Geteilte Aufmerksamkeit gibt es nicht, und der Rückweg in eine unterbrochene Aufgabe dauert länger, als die Unterbrechung selbst gedauert hat. Ein Verbot im Unterricht ist deshalb kein pädagogisches Misstrauen, sondern eine schlichte Konsequenz.', en: 'To the first there is a clear answer. Divided attention does not exist, and the way back into an interrupted task takes longer than the interruption itself lasted. A ban during lessons is therefore not pedagogical mistrust but a straightforward consequence.' },
          { de: 'Die zweite Frage lässt sich so nicht beantworten. Man kann einwenden, Kinder müssten den Umgang mit dem Gerät lernen, und dieser Einwand ist stark — nur setzt er voraus, dass ihn jemand unterrichtet. Wo das geschieht, halte ich Pausenverbote für überflüssig; wo es nicht geschieht, verschieben sie das Problem lediglich auf den Nachmittag.', en: 'The second question cannot be answered that way. One may object that children need to learn how to handle the device, and that objection is strong — it merely presupposes that somebody teaches it. Where that happens, I consider break-time bans superfluous; where it does not, they merely postpone the problem to the afternoon.' },
          { de: 'Mein Vorschlag wäre daher, die Regel an eine Bedingung zu knüpfen: strenge Vorgaben im Unterricht, offene Pausen — sobald das Thema fest im Lehrplan steht.', en: 'My suggestion would therefore be to tie the rule to a condition: strict requirements during lessons, open breaks — as soon as the topic is firmly in the curriculum.' },
        ],
      },
    ],
  },

  speaking: B2_SPEAKING,
  redemittel: B2_REDEMITTEL,

  remedy: {
    reading: 'Reading is 65 minutes for five tasks and the clock is the examiner. Teil 1 and Teil 4 '
      + 'are matching and should cost you 25 minutes together; if they cost more, you will not finish '
      + 'Teil 5, which is the cheapest part of the paper. Practise reading the *items* first.',
    listening: 'Two of the four listening tasks are heard **once** — Teil 1 and Teil 3 — and that is '
      + 'where B2 candidates lose the module. Teil 3 asks who said something, not what: mark the '
      + 'speaker in the margin as you hear each claim rather than trying to remember three voices.',
    writing: 'B2 Schreiben is a forum post, not a letter. An Einleitung and a Schluss are named in '
      + 'the task and are marked as content — a text that starts straight into the first Leitpunkt '
      + 'has already lost points before its German is judged.',
    speaking: 'Teil 2 is marked on **reacting**. Two perfectly delivered minutes that never pick up '
      + 'what your partner said score badly on interaction — learn three phrases for taking up '
      + 'someone’s point and use them on purpose.',
  },

  briefing: [
    {
      q: 'Wie läuft die Prüfung ab?',
      a: 'Lesen 65 minutes, Hören 40, Schreiben 75, and Sprechen about 15 as a **pair**. The four can '
        + 'be sat on one day or, at most centres, on separate days — because they are separate exams.',
    },
    {
      q: 'Wie viele Punkte brauche ich?',
      a: '**Sixty per cent of each module, and no total at all.** This is the reform, and it is the '
        + 'thing most candidates arrive not knowing. A 95 in Lesen does not carry a 55 in Hören: you '
        + 'would be certificated in three modules and resit the fourth, alone, keeping the others.',
    },
    {
      q: 'Was ist neu gegenüber B1?',
      a: 'Two things. The reading is roughly twice as long for the same time, so the skill being '
        + 'tested is triage rather than comprehension. And the oral drops from three parts to two: '
        + 'a four-minute solo talk, which B1 never asks for, and a debate in which you have to '
        + 'react rather than take turns.',
    },
    {
      q: 'Wo verliert man am meisten Punkte?',
      a: 'Hören Teil 3, heard once, where the question is *who* said it — and Lesen Teil 2, where '
        + 'the answer is decided by a pronoun or a connector rather than by the topic. Both reward '
        + 'a specific technique far more than more vocabulary.',
    },
  ],
};
