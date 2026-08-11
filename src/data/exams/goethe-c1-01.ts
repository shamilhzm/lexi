// Goethe-Zertifikat C1 — Lexi's own paper, in Goethe's format.
//
// Structure from the published Modellsatz (goethe.de):
//
//   Lesen        70 min  Aufgabe 1  a text with words removed — one word a gap
//                        Aufgabe 2  four texts, which of them addresses which theme
//                        Aufgabe 3  lexical and structural gaps, four options each
//   Hören        40 min  Aufgabe 1  take notes from an information line, heard ONCE
//                        Aufgabe 2  an interview, three-way multiple choice, heard TWICE
//   Schreiben    80 min  Aufgabe 1  a structured text on a theme (20 points, self-assessed)
//                        Aufgabe 2  rewrite a note as a formal letter (5 points, objective)
//   Sprechen    ~15 min  a talk from material, then a decision reached together
//
// ## C1 is not modular — and that is the news, because B2 and C2 are
//
// A candidate arriving from B2 will expect four independent gates. C1 has none:
// it is one exam, 100 points, and 60 of them pass it, with no floor on any single
// part. A weak Hören really is carried by a strong Lesen here, which is true at
// no other level Lexi ships except A1.
//
// ## Two adaptations, said out loud
//
// **Lesen Aufgabe 1** and **Hören Aufgabe 1** are open production in the real
// paper: you write the missing word, you write the note. Lexi cannot mark free
// text honestly — the ruling that governs the letter and the oral governs these
// too — so both become closed tasks over the same stimulus: a word bank for the
// reading gaps, and a set of phrases to place in the note grid for the listening.
// What is lost is spelling and recall; what is tested — reading a gap for what
// the syntax demands, holding a grid open while an unrepeated recording runs — is
// unchanged. Stated in the rubric rather than passed off as the original.
//
// **Schreiben Aufgabe 2** is objectively scored and worth 5 points, so it cannot
// sit in the self-assessed writing slot without being wiped by it. It scores in
// `language` and is relabelled to its own name.
//
// Every text is written for Lexi; none of Goethe's Modellsatz is reproduced.
import { type ExamPaper, type Scheme } from '../../lib/exam.ts';
import { C1_REDEMITTEL, C1_SPEAKING } from './goethe-c1-speaking.ts';

/** Goethe C1 — one exam, not four. 100 points, 60 to pass, no part floor. The
 *  25 for Schreiben is split 20 / 5 between the essay and the register task, as
 *  the Modellsatz splits it. */
export const GOETHE_C1: Scheme = {
  reading: 25, language: 5, listening: 25, writing: 20, speaking: 25,
  written: 75, oral: 25, total: 100,
  pass: { written: 0, oral: 0, total: 60 },
  bands: [[90, 'sehr gut'], [80, 'gut'], [70, 'befriedigend'], [60, 'ausreichend']],
};

const PER = 25 / 20;    // 20 items carrying 25 points, reading and listening alike

export const PAPER: ExamPaper = {
  id: 'goethe-c1-01',
  provider: 'goethe',
  level: 'C1',
  title: 'Goethe-Zertifikat C1',
  blurb: 'The full C1 in Goethe’s format — 40 scored items plus the register task, a structured '
    + 'essay, and the oral’s talk-from-data and joint decision, with models at three levels.',
  scheme: GOETHE_C1,
  subtestLabels: { language: 'Schreiben, Aufgabe 2' },
  blocks: [
    { label: 'Lesen', minutes: 70, partIds: ['l1', 'l2', 'l3'] },
    { label: 'Hören', minutes: 40, partIds: ['h1', 'h2'] },
    { label: 'Schreiben, Aufgabe 2', minutes: 15, partIds: ['s2'] },
  ],

  parts: [
    // ---- Lesen, Aufgabe 1 (1–8) -------------------------------------------
    {
      id: 'l1',
      subtest: 'reading',
      teil: 1,
      label: 'Lesen, Aufgabe 1',
      skill: 'Rekonstruktion · Syntax und Semantik',
      rubric: 'Ergänzen Sie im folgenden Text die fehlenden Wörter. Wählen Sie für jede Lücke ein '
        + 'Wort aus dem Kasten. Nicht alle Wörter passen; ein Wort kann mehrmals gebraucht werden.',
      rubricEn: 'In the real paper you write the missing word yourself. Here you choose it — the '
        + 'adaptation is stated in the file header. Read past the gap before you decide: most of '
        + 'these are settled by what the *following* clause requires, not by meaning.',
      pointsPerItem: PER,
      kind: 'cloze',
      mode: 'bank',
      intro: 'Die Saatgutbank',
      body: 'In einem Kellergewölbe am Rand der Stadt lagern rund zwölftausend Sorten Getreide, '
        + 'Gemüse und Hülsenfrüchte — die meisten davon [[1]] man im Handel längst nicht mehr. '
        + 'Betrieben wird die Sammlung von einem Verein, der sich seit dreißig Jahren der Aufgabe '
        + 'widmet, alte Nutzpflanzen vor dem Verschwinden zu bewahren.\n\n'
        + 'Dass dies nötig ist, [[2]] an einer Zahl deutlich: Von den Apfelsorten, die vor '
        + 'hundert Jahren in Mitteleuropa angebaut wurden, ist heute noch etwa ein Zehntel '
        + 'verfügbar. Der Rest ist nicht verboten worden, [[3]] schlicht aus dem Anbau '
        + 'gefallen, weil er sich schlechter lagern oder transportieren ließ.\n\n'
        + 'Die Arbeit der Sammlung besteht [[4]] weniger im Lagern als im Nachbauen. Saatgut '
        + 'ist kein Archivgut: Es verliert seine Keimfähigkeit und muss alle paar Jahre ausgesät '
        + 'werden, damit es überhaupt erhalten bleibt. Für jede einzelne Sorte bedeutet das ein '
        + 'Beet, eine Ernte und jemanden, der sich darum kümmert.\n\n'
        + 'Ob sich dieser Aufwand lohnt, wird gelegentlich bezweifelt. Die Antwort des Vereins '
        + '[[5]] pragmatisch aus: Welche Eigenschaft in vierzig Jahren gebraucht wird — '
        + 'Trockenheit, ein neuer Pilz, ein veränderter Boden —, weiß heute niemand. Wer eine Sorte '
        + 'verliert, verliert nicht eine Frucht, [[6]] eine Möglichkeit.\n\n'
        + 'Inzwischen arbeiten mehrere Höfe mit dem Verein zusammen. Sie übernehmen jeweils ein '
        + 'Dutzend Sorten und bauen sie regelmäßig an, [[7]] die Sammlung nicht an einem '
        + 'einzigen Ort hängt. Ein Brand, ein Stromausfall, ein aufgegebener Verein — das Risiko '
        + 'wird auf diese Weise verteilt, [[8]] es zu beseitigen wäre.',
      bank: [
        { k: 'a', text: 'bekommt' }, { k: 'b', text: 'wird' }, { k: 'c', text: 'sondern' },
        { k: 'd', text: 'ohnehin' }, { k: 'e', text: 'fällt' }, { k: 'f', text: 'damit' },
        { k: 'g', text: 'statt' }, { k: 'h', text: 'obwohl' }, { k: 'i', text: 'trotzdem' },
        { k: 'j', text: 'zeigt' }, { k: 'k', text: 'nämlich' }, { k: 'l', text: 'weil' },
      ],
      items: [
        { n: 1, answer: 'a', why: '„die meisten davon [bekommt] man im Handel längst nicht mehr“ — the object is fronted, so the verb must be one that takes *man* as subject and the sorts as object. „wird“ would need a participle.' },
        { n: 2, answer: 'j', why: '„[zeigt] sich an einer Zahl deutlich“ — the fixed expression is *sich an etwas zeigen*. „wird … deutlich“ would work without *sich*, and *sich* is printed.' },
        { n: 3, answer: 'c', why: '„nicht verboten worden, [sondern] schlicht aus dem Anbau gefallen“ — *nicht … sondern* is a pair, and the first half is already on the page.' },
        { n: 4, answer: 'd', why: '„besteht [ohnehin] weniger im Lagern als im Nachbauen“ — an adverb is the only part of speech the slot admits between the verb and *weniger*.' },
        { n: 5, answer: 'e', why: '„Die Antwort … [fällt] pragmatisch aus“ — *ausfallen* is separable and its particle *aus* is at the end of the clause, waiting for its stem.' },
        { n: 6, answer: 'c', why: 'The second *nicht … sondern* — and the reason the rubric lets a word be used twice. In the open original you simply write the word again; a bank that forbade it would turn a real gap into a process-of-elimination puzzle.' },
        { n: 7, answer: 'f', why: '„bauen sie regelmäßig an, [damit] die Sammlung nicht an einem einzigen Ort hängt“ — a purpose clause, marked by the verb-final *hängt*.' },
        { n: 8, answer: 'g', why: '„verteilt, [statt] es zu beseitigen“ — *statt … zu* + infinitive. The *zu*-infinitive at the end of the sentence admits only *statt*, *ohne* or *um*, and only one is in the box.' },
      ],
    },

    // ---- Lesen, Aufgabe 2 (9–14) ------------------------------------------
    {
      id: 'l2',
      subtest: 'reading',
      teil: 2,
      label: 'Lesen, Aufgabe 2',
      skill: 'Detailverstehen über mehrere Texte',
      rubric: 'Lesen Sie die vier Texte. Vier Menschen berichten davon, wie sie einen Beruf '
        + 'gewechselt haben. In welchem Text (A–D) finden Sie eine Aussage zu den folgenden '
        + 'Punkten? Jeder Text kann mehrmals vorkommen.',
      rubricEn: 'Four texts, six questions, and a text can be the answer more than once. The skill '
        + 'is holding four accounts apart while looking for one specific claim in each.',
      pointsPerItem: PER,
      kind: 'mc',
      passage: {
        title: 'Vier Menschen über den Wechsel',
        paras: [
          '[A] Adriana, Anwältin, heute Tischlerin: Der Ausstieg wird gern als Erleuchtung erzählt, und so war es bei mir nicht. Es war eine Rechnung. Ich habe zwei Jahre lang aufgeschrieben, wie viele Stunden ich arbeite und wie viele davon ich als sinnvoll empfand, und irgendwann stand das Ergebnis da und ließ sich nicht mehr wegdiskutieren. Meine Familie hat sehr besorgt reagiert — mein Vater hat ein halbes Jahr nicht darüber gesprochen. Heute verdiene ich etwa ein Drittel dessen, was ich vorher verdient habe, und ich würde die Entscheidung sofort wieder treffen. Was ich unterschätzt habe, ist, wie lange es dauert, in einem Handwerk wirklich gut zu werden. Vier Jahre, und ich lerne täglich.',
          '[B] Bernd, Lehrer, heute Softwareentwickler: Bei mir gab es kein einzelnes Ereignis. Ich habe fünfzehn Jahre gern unterrichtet und dann festgestellt, dass ich mich in den Ferien besser fühlte als sonst — nicht ausgeruhter, sondern gegenwärtiger. Die Umschulung war finanziell der schwierigste Teil: achtzehn Monate ohne Gehalt, mit zwei Kindern. Ohne die Rücklagen meiner Frau hätte es nicht funktioniert, und genau deshalb erzähle ich die Geschichte ungern als Mutbeweis. Sie war zu einem großen Teil ein Privileg. Beruflich bereue ich nichts. Was mir fehlt, sind die Rückmeldungen: In der Schule wusste ich am Freitag, ob eine Woche gelungen war.',
          '[C] Katja, Ärztin, heute Ärztin — aber im öffentlichen Dienst: Ich habe nicht den Beruf gewechselt, sondern seine Bedingungen, und ich glaube, das wird zu selten als Möglichkeit gesehen. In der Klinik habe ich in zwölf Jahren zwei Weihnachten zu Hause verbracht. Heute arbeite ich im Gesundheitsamt, verdiene deutlich weniger und habe zum ersten Mal eine Woche, die planbar ist. Der Preis dafür ist real: Ich behandle kaum noch. Manches, wofür ich zehn Jahre ausgebildet wurde, mache ich schlicht nicht mehr, und an manchen Tagen tut das weh. Trotzdem war es richtig. Man kann sich nicht Jahrzehnte lang etwas leihen, was man nicht hat.',
          '[D] Rui, Koch, heute Pflegefachkraft: Ich bin gewechselt, weil mein Rücken nicht mehr wollte, also nicht aus freien Stücken. Das Merkwürdige ist, dass ich rückblickend froh darüber bin. In der Küche war ich gut und ersetzbar; auf der Station bin ich beides auch, aber es fällt jemandem auf, wenn ich da bin. Die Umstellung war körperlich leichter, als alle behauptet haben, und emotional viel schwerer. Über die Bezahlung möchte ich mich gar nicht äußern — beide Berufe werden schlecht bezahlt, das ist keine Neuigkeit und wird auch nicht dadurch besser, dass man es wiederholt.',
        ],
      },
      questions: [
        {
          n: 9, stem: 'Wer beschreibt den Wechsel als Ergebnis einer nüchternen Auswertung?',
          options: [{ k: 'a', text: 'Text A' }, { k: 'b', text: 'Text B' }, { k: 'c', text: 'Text C' }, { k: 'd', text: 'Text D' }],
        },
        {
          n: 10, stem: 'Wer betont, dass der Wechsel nur durch fremde Unterstützung möglich war?',
          options: [{ k: 'a', text: 'Text A' }, { k: 'b', text: 'Text B' }, { k: 'c', text: 'Text C' }, { k: 'd', text: 'Text D' }],
        },
        {
          n: 11, stem: 'Wer hat nicht den Beruf, sondern nur dessen Rahmen verändert?',
          options: [{ k: 'a', text: 'Text A' }, { k: 'b', text: 'Text B' }, { k: 'c', text: 'Text C' }, { k: 'd', text: 'Text D' }],
        },
        {
          n: 12, stem: 'Wer hat den Beruf nicht freiwillig aufgegeben?',
          options: [{ k: 'a', text: 'Text A' }, { k: 'b', text: 'Text B' }, { k: 'c', text: 'Text C' }, { k: 'd', text: 'Text D' }],
        },
        {
          n: 13, stem: 'Wer vermisst die regelmäßige Rückmeldung über die eigene Arbeit?',
          options: [{ k: 'a', text: 'Text A' }, { k: 'b', text: 'Text B' }, { k: 'c', text: 'Text C' }, { k: 'd', text: 'Text D' }],
        },
        {
          n: 14, stem: 'Wer nennt die Zeit, die das Erlernen des neuen Fachs braucht, als Überraschung?',
          options: [{ k: 'a', text: 'Text A' }, { k: 'b', text: 'Text B' }, { k: 'c', text: 'Text C' }, { k: 'd', text: 'Text D' }],
        },
      ],
      items: [
        { n: 9, answer: 'a', why: 'Adriana: „Es war eine Rechnung“ — and she describes two years of writing hours down. She explicitly rejects the *Erleuchtung* version.' },
        { n: 10, answer: 'b', why: 'Bernd: „Ohne die Rücklagen meiner Frau hätte es nicht funktioniert“ — and he draws the conclusion himself: „Sie war zu einem großen Teil ein Privileg.“' },
        { n: 11, answer: 'c', why: 'Katja: „Ich habe nicht den Beruf gewechselt, sondern seine Bedingungen.“ The first sentence of the text.' },
        { n: 12, answer: 'd', why: 'Rui: „weil mein Rücken nicht mehr wollte, also nicht aus freien Stücken“.' },
        { n: 13, answer: 'b', why: 'Bernd again — a text can answer twice, which the rubric says and candidates still resist. „Was mir fehlt, sind die Rückmeldungen.“' },
        { n: 14, answer: 'a', why: 'Adriana: „Was ich unterschätzt habe, ist, wie lange es dauert, in einem Handwerk wirklich gut zu werden.“ Rui also mentions an expectation being wrong, but about the physical side, not the learning time.' },
      ],
    },

    // ---- Lesen, Aufgabe 3 (15–20) -----------------------------------------
    {
      id: 'l3',
      subtest: 'reading',
      teil: 3,
      label: 'Lesen, Aufgabe 3',
      skill: 'Wortschatz und Strukturen',
      rubric: 'Lesen Sie den folgenden Text und wählen Sie bei jeder Lücke das Wort, das am besten '
        + 'passt. Nur eine Lösung ist richtig.',
      rubricEn: 'Four options a gap, and at C1 all four are usually real words that fit the '
        + 'grammar. What is being tested is collocation and register — which word this *kind of '
        + 'text* would use.',
      pointsPerItem: PER,
      kind: 'cloze',
      mode: 'mc',
      body: 'Sehr geehrte Damen und Herren,\n\n'
        + 'mit Schreiben vom 3. März haben Sie mir mitgeteilt, dass mein Antrag auf Verlängerung '
        + 'des Stipendiums abgelehnt wurde. Gegen diese Entscheidung möchte ich hiermit '
        + '[[15]] einlegen.\n\n'
        + 'Zur Begründung führen Sie an, die im Antrag geforderten Nachweise seien nicht '
        + 'vollständig eingereicht worden. Dem muss ich [[16]]: Sämtliche Unterlagen wurden '
        + 'am 12. Februar über das Portal hochgeladen; die Eingangsbestätigung liegt mir vor und '
        + 'ist diesem Schreiben in Kopie [[17]].\n\n'
        + 'Es ist denkbar, dass die Dateien aufgrund einer technischen Störung nicht zugeordnet '
        + 'werden konnten. Da mir dieser Umstand nicht [[18]] werden kann, bitte ich Sie, den '
        + 'Antrag erneut zu prüfen.\n\n'
        + 'Für eine Nachricht bis Ende des Monats wäre ich Ihnen [[19]], da die Frist für '
        + 'das kommende Semester andernfalls verstreicht. Für Rückfragen stehe ich Ihnen '
        + '[[20]] zur Verfügung.\n\n'
        + 'Mit freundlichen Grüßen',
      options: {
        15: [{ k: 'a', text: 'Beschwerde' }, { k: 'b', text: 'Widerspruch' }, { k: 'c', text: 'Einwand' }, { k: 'd', text: 'Protest' }],
        16: [{ k: 'a', text: 'widersprechen' }, { k: 'b', text: 'ablehnen' }, { k: 'c', text: 'verweigern' }, { k: 'd', text: 'bestreiten' }],
        17: [{ k: 'a', text: 'angehängt' }, { k: 'b', text: 'beigefügt' }, { k: 'c', text: 'zugelegt' }, { k: 'd', text: 'eingelegt' }],
        18: [{ k: 'a', text: 'angelastet' }, { k: 'b', text: 'aufgetragen' }, { k: 'c', text: 'zugeteilt' }, { k: 'd', text: 'übergeben' }],
        19: [{ k: 'a', text: 'dankend' }, { k: 'b', text: 'verbunden' }, { k: 'c', text: 'erfreut' }, { k: 'd', text: 'gewogen' }],
        20: [{ k: 'a', text: 'jederzeit' }, { k: 'b', text: 'immerzu' }, { k: 'c', text: 'stets noch' }, { k: 'd', text: 'allzeit' }],
      },
      items: [
        { n: 15, answer: 'b', why: '*Widerspruch einlegen* is the fixed administrative pair. *Beschwerde* takes *einreichen*, *Einwand* takes *erheben*, and *Protest* is not an administrative act at all.' },
        { n: 16, answer: 'a', why: '„Dem muss ich widersprechen“ — *widersprechen* takes the dative, and *dem* is printed. *bestreiten* and *ablehnen* both want an accusative.' },
        { n: 17, answer: 'b', why: '*beigefügt* is the letter-writing verb. *angehängt* is what an email attachment does, and this is a letter „in Kopie“.' },
        { n: 18, answer: 'a', why: '*jemandem etwas anlasten* — to hold something against someone. The other three are all real verbs that leave the sentence meaningless.' },
        { n: 19, answer: 'b', why: '„Ich wäre Ihnen verbunden“ — a set formula of formal gratitude. *dankend* exists only in *dankend erhalten*.' },
        { n: 20, answer: 'a', why: '*jederzeit zur Verfügung stehen* is the closing formula. *allzeit* and *immerzu* are archaic or wrong in register; *stets noch* is not German.' },
      ],
    },

    // ---- Hören, Aufgabe 1 (21–30) -----------------------------------------
    {
      id: 'h1',
      subtest: 'listening',
      teil: 1,
      label: 'Hören, Aufgabe 1',
      skill: 'Selektives Verstehen · Notizen',
      rubric: 'Sie hören eine Ansage vom Anrufbeantworter einer Schreibwerkstatt. Ergänzen Sie den '
        + 'Notizzettel: Welche Angabe gehört in welche Zeile? Jede Angabe kann nur einmal verwendet '
        + 'werden; nicht alle Angaben passen. Sie hören den Text nur einmal.',
      rubricEn: 'The real task has you *write* the notes. Here you place them — the adaptation is '
        + 'in the file header. Read all the options before the recording starts: it runs once, and '
        + 'the lines come in the order the speaker says them.',
      pointsPerItem: PER,
      kind: 'match',
      once: true,
      audio: {
        plays: 1,
        intro: 'Eine Ansage vom Anrufbeantworter. Sie hören den Text nur einmal.',
        tracks: [
          {
            label: 'Schreibwerkstatt am Rosenhof — Ansage',
            lines: [
              { who: 'Ansage', text: 'Guten Tag und willkommen bei der Schreibwerkstatt am Rosenhof. Unser Büro ist zurzeit nicht besetzt. Die wichtigsten Auskünfte können Sie dieser Ansage entnehmen.' },
              { who: 'Ansage', text: 'Unsere Kurse finden als Wochenendseminare statt und dauern jeweils zwei Tage, samstags und sonntags von zehn bis siebzehn Uhr. Ein Seminar umfasst also vierzehn Zeitstunden.' },
              { who: 'Ansage', text: 'Die Teilnehmerzahl ist begrenzt: Mehr als neun Personen nehmen wir grundsätzlich nicht auf, weil jeder eingereichte Text im Kurs vollständig besprochen wird.' },
              { who: 'Ansage', text: 'Zur Anmeldung: Wir bitten um eine Textprobe von höchstens fünf Seiten, und zwar spätestens drei Wochen vor Kursbeginn. Ohne Textprobe können wir Sie leider nicht einplanen.' },
              { who: 'Ansage', text: 'Die Kursgebühr beträgt zweihundertvierzig Euro. Für Studierende und Erwerbslose ermäßigt sie sich auf einhundertsechzig Euro; einen Nachweis bringen Sie bitte zum ersten Termin mit.' },
              { who: 'Ansage', text: 'Zwei Hinweise noch. Erstens: Bei einer Absage später als eine Woche vor Beginn behalten wir die halbe Gebühr ein. Und zweitens ist unsere Werkstatt im Hinterhaus nicht barrierefrei zugänglich — bitte melden Sie sich in diesem Fall vorher, wir weichen dann in den Seminarraum im Erdgeschoss aus.' },
              { who: 'Ansage', text: 'Für alles Weitere erreichen Sie uns dienstags und donnerstags zwischen vierzehn und siebzehn Uhr. Vielen Dank für Ihren Anruf.' },
            ],
          },
        ],
      },
      options: [
        { k: 'a', text: 'zwei Tage / 14 Zeitstunden' },
        { k: 'b', text: 'höchstens neun' },
        { k: 'c', text: 'eine Textprobe, max. 5 Seiten' },
        { k: 'd', text: 'spätestens drei Wochen vorher' },
        { k: 'e', text: '240 € · ermäßigt 160 €' },
        { k: 'f', text: 'die Hälfte wird einbehalten' },
        { k: 'g', text: 'Ausweichraum im Erdgeschoss' },
        { k: 'h', text: 'Di und Do, 14–17 Uhr' },
        { k: 'i', text: 'höchstens fünfzehn' },
        { k: 'j', text: 'die volle Gebühr wird fällig' },
        { k: 'k', text: 'jeden Werktag vormittags' },
        { k: 'l', text: 'ein Motivationsschreiben' },
        { k: 'm', text: 'Samstag und Sonntag, 10–17 Uhr' },
        { k: 'n', text: 'zum ersten Termin mitbringen' },
      ],
      texts: [
        { n: 21, body: 'Dauer eines Seminars' },
        { n: 22, body: 'Teilnehmerzahl' },
        { n: 23, body: 'Für die Anmeldung einzureichen' },
        { n: 24, body: 'Frist für die Einreichung' },
        { n: 25, body: 'Gebühr' },
        { n: 26, body: 'Bei Absage in der letzten Woche' },
        { n: 27, body: 'Bei eingeschränkter Mobilität' },
        { n: 28, body: 'Telefonische Sprechzeiten' },
        { n: 29, body: 'Kurstage' },
        { n: 30, body: 'Nachweis für die Ermäßigung' },
      ],
      items: [
        { n: 21, answer: 'a', why: '„dauern jeweils zwei Tage … Ein Seminar umfasst also vierzehn Zeitstunden.“ The speaker does the arithmetic for you, which is a courtesy the real paper also extends.' },
        { n: 22, answer: 'b', why: '„Mehr als neun Personen nehmen wir grundsätzlich nicht auf.“ (i) is the decoy for anyone who hears a number and stops listening.' },
        { n: 23, answer: 'c', why: '„Wir bitten um eine Textprobe von höchstens fünf Seiten.“ (l) is the thing such a course would plausibly ask for and does not.' },
        { n: 24, answer: 'd', why: '„spätestens drei Wochen vor Kursbeginn“ — said in the same sentence as the sample, which is why the two lines sit next to each other on the sheet.' },
        { n: 25, answer: 'e', why: 'Both figures belong on one line: „zweihundertvierzig Euro … ermäßigt … einhundertsechzig“.' },
        { n: 26, answer: 'f', why: '„behalten wir die halbe Gebühr ein“. (j) is what most cancellation policies say and this one does not.' },
        { n: 27, answer: 'g', why: '„wir weichen dann in den Seminarraum im Erdgeschoss aus“ — the answer is the remedy, not the problem.' },
        { n: 28, answer: 'h', why: '„dienstags und donnerstags zwischen vierzehn und siebzehn Uhr“, in the last block — the one candidates miss because they have stopped writing.' },
        { n: 29, answer: 'm', why: '„samstags und sonntags von zehn bis siebzehn Uhr“ — said in the same breath as the duration, which is why two lines of the grid are filled from one sentence.' },
        { n: 30, answer: 'n', why: '„einen Nachweis bringen Sie bitte zum ersten Termin mit“ — attached to the reduced fee, half a sentence after the figure most listeners are still writing down.' },
      ],
    },

    // ---- Hören, Aufgabe 2 (31–40) -----------------------------------------
    {
      id: 'h2',
      subtest: 'listening',
      teil: 2,
      label: 'Hören, Aufgabe 2',
      skill: 'Detailverstehen · Standpunkte',
      rubric: 'Sie hören ein Gespräch zwischen einer Moderatorin und einem Sprachwissenschaftler. '
        + 'Sie hören den Text zweimal. Wählen Sie bei jeder Aufgabe die richtige Lösung.',
      rubricEn: 'Heard TWICE. At C1 the wrong options are things the speaker very nearly says — '
        + 'a position he attributes to others, a claim he concedes before rejecting. Listen for '
        + 'whose view is being reported.',
      pointsPerItem: PER,
      kind: 'mc',
      audio: {
        plays: 2,
        intro: 'Ein Gespräch. Sie hören den Text zweimal.',
        tracks: [
          {
            label: 'Im Gespräch — Verändert sich unsere Sprache zu schnell?',
            lines: [
              { who: 'Moderatorin', text: 'Herr Professor Ahrens, kaum ein Thema erhitzt die Gemüter so zuverlässig wie der Zustand der deutschen Sprache. Verfällt sie?' },
              { who: 'Prof. Ahrens', text: 'Diese Frage wird seit mindestens dreihundert Jahren in denselben Worten gestellt, und sie ist bemerkenswerterweise nie beantwortet worden — man hat sie immer nur neu gestellt. Das allein sollte skeptisch machen.' },
              { who: 'Moderatorin', text: 'Aber es lässt sich doch messen, dass der Wortschatz vieler Jugendlicher kleiner geworden ist.' },
              { who: 'Prof. Ahrens', text: 'Das lässt sich nicht messen, und das ist keine Spitzfindigkeit. Messen kann man den Wortschatz in einem bestimmten Textkorpus — in Schulaufsätzen etwa. Ob jemand ein Wort *kennt*, misst man damit nicht. Wenn sich die Textsorte ändert, ändern sich die Ergebnisse, ohne dass sich am Sprecher etwas geändert hätte.' },
              { who: 'Moderatorin', text: 'Sie halten die Klage also für unbegründet?' },
              { who: 'Prof. Ahrens', text: 'Nein, das wäre zu einfach. Ich halte sie für falsch adressiert. Was sich tatsächlich verändert, und zwar rasch, ist nicht der Wortschatz, sondern die Fähigkeit, längere zusammenhängende Texte zu produzieren. Das ist eine andere Kompetenz und sie wird tatsächlich seltener geübt.' },
              { who: 'Moderatorin', text: 'Was ist mit den Anglizismen? Da regen sich die meisten am lautesten auf.' },
              { who: 'Prof. Ahrens', text: 'Da bin ich am gelassensten. Sprachen entlehnen, seit es Sprachen gibt; das Deutsche hat vom Lateinischen und vom Französischen weit mehr übernommen als je vom Englischen. Was mich daran interessiert, ist etwas anderes: Entlehnungen zeigen sehr genau an, aus welcher Richtung gerade Prestige kommt. Wer sich über Anglizismen ärgert, ärgert sich in Wahrheit selten über Wörter.' },
              { who: 'Moderatorin', text: 'Müsste man dann überhaupt etwas tun?' },
              { who: 'Prof. Ahrens', text: 'Regulieren lässt sich das nicht, und Versuche dazu sind regelmäßig gescheitert — meistens lächerlich gescheitert. Was hilft, ist banal und teuer: Zeit zum Lesen und Menschen, die schreiben lassen und dann korrigieren. Beides ist eine Frage von Personal, nicht von Sprachpolitik.' },
              { who: 'Moderatorin', text: 'Eine letzte Frage: Gibt es etwas, das Sie an der Entwicklung besorgt?' },
              { who: 'Prof. Ahrens', text: 'Ja, und es ist nicht die Sprache selbst. Mich beunruhigt, wie schnell sprachliche Merkmale heute benutzt werden, um Menschen einzuordnen. Ein Akzent, ein Dialekt, ein Fehler — daraus wird binnen Sekunden ein Urteil über Bildung und Herkunft. Das war früher auch so, aber es ging langsamer und war weniger öffentlich.' },
            ],
          },
        ],
      },
      questions: [
        {
          n: 31, stem: 'Was sagt Ahrens über die Frage nach dem Sprachverfall?',
          options: [
            { k: 'a', text: 'Sie ist inzwischen wissenschaftlich geklärt.' },
            { k: 'b', text: 'Sie wird seit Jahrhunderten unverändert wiederholt.' },
            { k: 'c', text: 'Sie ist erst in jüngerer Zeit aufgekommen.' },
          ],
        },
        {
          n: 32, stem: 'Warum bestreitet er, dass ein schrumpfender Wortschatz messbar sei?',
          options: [
            { k: 'a', text: 'Weil die Untersuchungen zu klein angelegt sind.' },
            { k: 'b', text: 'Weil gemessen wird, was in einem Text steht, nicht was jemand kann.' },
            { k: 'c', text: 'Weil sich Wortschatz grundsätzlich nicht beziffern lässt.' },
          ],
        },
        {
          n: 33, stem: 'Wie beurteilt er die Klage über den Sprachverfall insgesamt?',
          options: [
            { k: 'a', text: 'Als unbegründet.' },
            { k: 'b', text: 'Als berechtigt, aber auf das falsche Problem gerichtet.' },
            { k: 'c', text: 'Als bewusste Übertreibung interessierter Kreise.' },
          ],
        },
        {
          n: 34, stem: 'Was verändert sich seiner Ansicht nach tatsächlich?',
          options: [
            { k: 'a', text: 'Die Zahl der bekannten Wörter.' },
            { k: 'b', text: 'Die Aussprache.' },
            { k: 'c', text: 'Die Fähigkeit, längere Texte zu verfassen.' },
          ],
        },
        {
          n: 35, stem: 'Was findet er an Entlehnungen aus dem Englischen interessant?',
          options: [
            { k: 'a', text: 'Dass sie das Deutsche vereinfachen.' },
            { k: 'b', text: 'Dass sie zeigen, woher gerade Prestige kommt.' },
            { k: 'c', text: 'Dass sie zahlreicher sind als frühere Entlehnungen.' },
          ],
        },
        {
          n: 36, stem: 'Wie steht er zu Versuchen, die Sprachentwicklung zu steuern?',
          options: [
            { k: 'a', text: 'Sie sind bisher regelmäßig misslungen.' },
            { k: 'b', text: 'Sie sollten der Politik überlassen bleiben.' },
            { k: 'c', text: 'Sie wären wirksam, sind aber zu teuer.' },
          ],
        },
        {
          n: 37, stem: 'Was hält er stattdessen für wirksam?',
          options: [
            { k: 'a', text: 'Verbindliche Regeln in den Medien.' },
            { k: 'b', text: 'Lesezeit und Menschen, die Texte korrigieren.' },
            { k: 'c', text: 'Mehr Unterricht in Grammatik.' },
          ],
        },
        {
          n: 38, stem: 'Worin sieht er ein Kostenproblem?',
          options: [
            { k: 'a', text: 'In der Ausstattung der Schulen mit Technik.' },
            { k: 'b', text: 'Im Personal, das dafür nötig wäre.' },
            { k: 'c', text: 'In der Herstellung von Büchern.' },
          ],
        },
        {
          n: 39, stem: 'Was beunruhigt ihn an der Entwicklung?',
          options: [
            { k: 'a', text: 'Dass Sprache zur Einordnung von Menschen benutzt wird.' },
            { k: 'b', text: 'Dass Dialekte verschwinden.' },
            { k: 'c', text: 'Dass Fehler nicht mehr korrigiert werden.' },
          ],
        },
        {
          n: 40, stem: 'Was sagt er über dieses Phänomen im Vergleich zu früher?',
          options: [
            { k: 'a', text: 'Es ist neu.' },
            { k: 'b', text: 'Es gab es auch früher, aber langsamer und weniger öffentlich.' },
            { k: 'c', text: 'Es war früher stärker ausgeprägt.' },
          ],
        },
      ],
      items: [
        { n: 31, answer: 'b', why: '„seit mindestens dreihundert Jahren in denselben Worten“ — and „nie beantwortet worden“ rules out (a).' },
        { n: 32, answer: 'b', why: '„Messen kann man den Wortschatz in einem bestimmten Textkorpus … Ob jemand ein Wort *kennt*, misst man damit nicht.“ (c) is the stronger claim he is careful not to make.' },
        { n: 33, answer: 'b', why: '„Nein, das wäre zu einfach. Ich halte sie für falsch adressiert.“ He is offered (a) by the presenter and refuses it in as many words.' },
        { n: 34, answer: 'c', why: '„nicht der Wortschatz, sondern die Fähigkeit, längere zusammenhängende Texte zu produzieren“.' },
        { n: 35, answer: 'b', why: '„Entlehnungen zeigen sehr genau an, aus welcher Richtung gerade Prestige kommt.“ (c) is the opposite of what he says about Latin and French.' },
        { n: 36, answer: 'a', why: '„Versuche dazu sind regelmäßig gescheitert — meistens lächerlich gescheitert.“' },
        { n: 37, answer: 'b', why: '„Zeit zum Lesen und Menschen, die schreiben lassen und dann korrigieren.“' },
        { n: 38, answer: 'b', why: '„Beides ist eine Frage von Personal, nicht von Sprachpolitik“ — the cost is people.' },
        { n: 39, answer: 'a', why: '„wie schnell sprachliche Merkmale heute benutzt werden, um Menschen einzuordnen“, and he says first that it is „nicht die Sprache selbst“.' },
        { n: 40, answer: 'b', why: '„Das war früher auch so, aber es ging langsamer und war weniger öffentlich.“ The final sentence, and the one item that rewards listening to the end.' },
      ],
    },

    // ---- Schreiben, Aufgabe 2 (41–50) — objectively scored ----------------
    {
      id: 's2',
      subtest: 'language',
      teil: 2,
      label: 'Schreiben, Aufgabe 2',
      skill: 'Registerwechsel',
      rubric: 'Eine Kollegin hat Ihnen eine formlose Notiz hinterlassen. Übertragen Sie sie in einen '
        + 'formellen Brief an die Hausverwaltung. Wählen Sie für jede Lücke das passende Wort aus '
        + 'dem Kasten. Jedes Wort kann nur einmal verwendet werden; nicht alle Wörter passen.',
      rubricEn: 'The one part of C1 Schreiben that is marked objectively — five points, ten gaps. '
        + 'Every gap is the formal counterpart of something the note says casually, and the note is '
        + 'printed above so you can see what each gap is translating.',
      pointsPerItem: 0.5,
      kind: 'cloze',
      mode: 'bank',
      intro: 'Die Notiz: „Hey — kannst du der Hausverwaltung schreiben? Der Aufzug geht seit Montag '
        + 'nicht, wir haben schon zweimal angerufen und keiner meldet sich. Frau Weber im dritten '
        + 'Stock ist 84 und kommt gar nicht mehr raus. Die sollen sagen, wann das repariert wird, '
        + 'und zwar diese Woche. Danke!“',
      body: 'Sehr geehrte Damen und Herren,\n\n'
        + 'ich wende mich [[41]] der Bewohnerinnen und Bewohner des Hauses Lindenstraße 14 an Sie.\n\n'
        + 'seit Montag, dem 9. März, ist der Aufzug außer [[42]]. Zwei telefonische Meldungen '
        + 'vom 9. und 10. März sind bislang [[43]] geblieben; eine Rückmeldung haben wir zu '
        + 'keinem Zeitpunkt erhalten.\n\n'
        + 'Der Ausfall [[44]] mehrere Mietparteien erheblich. Eine Bewohnerin im dritten '
        + 'Obergeschoss ist 84 Jahre alt und kann die Wohnung derzeit nicht [[45]] fremde '
        + 'Hilfe verlassen. Wir betrachten dies nicht als Unannehmlichkeit, [[46]] als eine '
        + 'Frage der Sicherheit.\n\n'
        + 'Wir bitten Sie daher, uns [[47]] dieser Woche schriftlich mitzuteilen, bis wann '
        + 'mit der Instandsetzung zu rechnen ist. Sollte eine Reparatur nicht kurzfristig möglich '
        + 'sein, bitten wir um Auskunft darüber, welche [[48]] Sie vorsehen.\n\n'
        + 'Für eine Antwort bis Freitag wären wir Ihnen [[49]].\n\n'
        + 'Mit freundlichen Grüßen\n[[50]] der Hausgemeinschaft',
      bank: [
        { k: 'a', text: 'im Namen' }, { k: 'b', text: 'Betrieb' }, { k: 'c', text: 'unbeantwortet' },
        { k: 'd', text: 'beeinträchtigt' }, { k: 'e', text: 'ohne' }, { k: 'f', text: 'sondern' },
        { k: 'g', text: 'innerhalb' }, { k: 'h', text: 'Übergangslösung' }, { k: 'i', text: 'dankbar' },
        { k: 'j', text: 'Für' }, { k: 'k', text: 'Dienst' }, { k: 'l', text: 'aber' },
        { k: 'm', text: 'stört' }, { k: 'n', text: 'unbekannt' },
      ],
      items: [
        { n: 41, answer: 'a', why: '„Ich wende mich im Namen … an Sie“ — the standard opening when you write for a group. The note’s „kannst du … schreiben?“ is what makes it a group letter.' },
        { n: 42, answer: 'b', why: '*außer Betrieb* is the fixed phrase for a lift. *außer Dienst* is used of people, chiefly officers.' },
        { n: 43, answer: 'c', why: '„keiner meldet sich“ → „sind unbeantwortet geblieben“. *unbekannt* would say the calls never arrived, which is a different claim.' },
        { n: 44, answer: 'd', why: '*beeinträchtigen* is the formal register of the note’s complaint; *stört* is the word the note itself would have used.' },
        { n: 45, answer: 'e', why: '„nicht ohne fremde Hilfe verlassen“ — the double negative is what makes it formal, and it is how „kommt gar nicht mehr raus“ becomes precise.' },
        { n: 46, answer: 'f', why: '„nicht als …, sondern als …“ — *aber* cannot follow a *nicht* in this construction.' },
        { n: 47, answer: 'g', why: '„innerhalb dieser Woche“, translating the note’s „und zwar diese Woche“. *innerhalb* takes the genitive, and *dieser Woche* is printed.' },
        { n: 48, answer: 'h', why: 'Nothing in the note corresponds to this — it is the one thing the formal letter *adds*, and asking what happens meanwhile is what makes it a good letter.' },
        { n: 49, answer: 'i', why: '„wären wir Ihnen dankbar“ — the closing formula.' },
        { n: 50, answer: 'j', why: '„Für die Hausgemeinschaft“ under the signature. The remaining bank words — *aber*, *stört*, *Dienst*, *unbekannt* — are each the informal or wrong-collocation twin of a word that fits.' },
      ],
    },
  ],

  // ---- Schreiben, Aufgabe 1 ------------------------------------------------
  writing: {
    id: 'c1-w1',
    situation: 'Schreiben, Aufgabe 1 — In einer überregionalen Zeitung ist der folgende Kommentar '
      + 'erschienen. Sie schreiben eine Zuschrift an die Redaktion. Dauer: 65 Minuten. Schreiben Sie '
      + 'circa 250 Wörter und gehen Sie auf alle vier Leitpunkte ein.',
    situationEn: 'C1’s essay is a response to an argument, not a description of a topic. The '
      + 'assessment explicitly rewards structure and the linking of ideas — a text that answers all '
      + 'four points in four disconnected paragraphs is marked down for it.',
    letter: {
      from: 'Kommentar · „Die freiwillige Stunde“',
      body: [
        'Wer heute in Deutschland ein Ehrenamt übernimmt, tut das im Schnitt für weniger Stunden und für kürzere Zeit als noch vor zwanzig Jahren. Vereine finden Vorstände nicht mehr, Feuerwehren im ländlichen Raum werden knapp, und die Zahl derer, die sich langfristig binden, sinkt seit Jahren.',
        'Die übliche Erklärung lautet: Egoismus. Sie ist bequem und vermutlich falsch. Denn die Zahl der Menschen, die sich überhaupt engagieren, ist erstaunlich stabil geblieben — verändert hat sich nur die Form.',
        'Vielleicht sollten wir die Frage deshalb umdrehen. Nicht: Warum wollen die Leute nicht mehr? Sondern: Warum verlangen unsere Vereine immer noch eine Verpflichtung über Jahre, wenn kaum jemand sein Leben noch über Jahre planen kann?',
      ],
    },
    leitpunkte: [
      { de: 'Fassen Sie die Position des Kommentars kurz zusammen.', en: 'Summarise the commentary’s position briefly.' },
      { de: 'Beschreiben Sie die Lage des ehrenamtlichen Engagements in Ihrem Heimatland.', en: 'Describe the situation of voluntary work in your home country.' },
      { de: 'Nennen Sie mögliche Gründe für die beschriebene Entwicklung.', en: 'Give possible reasons for the development described.' },
      { de: 'Nehmen Sie Stellung: Welche Verantwortung tragen die Vereine selbst?', en: 'Take a position: what responsibility do the associations themselves bear?' },
    ],
    minutes: 65,
    models: [
      {
        band: 'B2', label: 'Zu wenig',
        note: 'All four points are covered, in order, and each in its own paragraph. At B2 that is '
          + 'a good text. At C1 it fails on connection: nothing in paragraph three depends on '
          + 'anything in paragraph two.',
        lines: [
          { de: 'Der Kommentar sagt, dass sich weniger Menschen langfristig ehrenamtlich engagieren. Der Autor glaubt nicht, dass die Menschen egoistisch sind.', en: 'The commentary says that fewer people volunteer long-term. The author does not believe that people are selfish.' },
          { de: 'In meinem Heimatland ist die Lage ähnlich. Viele Menschen helfen, aber sie wollen sich nicht für viele Jahre verpflichten.', en: 'In my home country the situation is similar. Many people help, but they do not want to commit for many years.' },
          { de: 'Ein Grund ist, dass die Arbeit heute unsicherer ist. Man weiß nicht, wo man in drei Jahren wohnt. Außerdem haben viele Menschen wenig Zeit.', en: 'One reason is that work is less secure today. You do not know where you will live in three years. Besides, many people have little time.' },
          { de: 'Ich denke, die Vereine haben auch Verantwortung. Sie sollten kürzere Aufgaben anbieten. Dann würden mehr Menschen mitmachen.', en: 'I think the associations bear responsibility too. They should offer shorter tasks. Then more people would join in.' },
        ],
      },
      {
        band: 'C1', label: 'Ziel',
        note: 'The target. Same four points, but each paragraph picks up the last: the home-country '
          + 'section is used as evidence for the reasons, and the final position follows from both '
          + 'rather than being announced.',
        lines: [
          { de: 'Der Kommentar bestreitet die geläufigste Erklärung für den Rückgang des Ehrenamts — den vermeintlichen Egoismus — und setzt an ihre Stelle eine strukturelle: Nicht die Bereitschaft habe abgenommen, sondern die Passung zwischen dem, was Vereine verlangen, und dem, was Menschen zusagen können.', en: 'The commentary disputes the commonest explanation for the decline in voluntary work — supposed selfishness — and puts a structural one in its place: it is not willingness that has decreased but the fit between what associations demand and what people are able to promise.' },
          { de: 'Was ich aus meinem Heimatland kenne, stützt diese Deutung eher, als dass es ihr widerspräche. Auch dort finden die traditionellen Verbände kaum noch Vorsitzende, während Nachbarschaftsinitiativen, die für einen Sommer gegründet und im Herbst wieder aufgelöst werden, ohne Werbung mehr Zulauf haben, als sie brauchen können. Es fehlt nicht an Menschen, sondern an Formaten.', en: 'What I know from my home country supports this reading rather than contradicting it. There too the traditional associations can barely find chairpersons, while neighbourhood initiatives founded for a summer and dissolved again in the autumn attract more people without any advertising than they can use. It is not people that are lacking but formats.' },
          { de: 'Die Gründe dafür liegen meines Erachtens weniger in einer veränderten Gesinnung als in veränderten Biografien. Wer alle drei Jahre den Wohnort wechselt, seine Arbeitszeit nicht selbst bestimmt und Angehörige pflegt, kann eine Vorstandswahl auf vier Jahre schlicht nicht seriös annehmen. Hinzu kommt ein zweiter, unangenehmerer Grund: Ehrenamt ist in vielen Bereichen zur Voraussetzung dafür geworden, dass ein Angebot überhaupt existiert — und wer merkt, dass er eine Lücke im System füllt, engagiert sich ungern unbefristet.', en: 'The reasons for this lie in my view less in a changed attitude than in changed biographies. Someone who moves house every three years, does not control their own working hours and cares for relatives simply cannot seriously accept election to a four-year committee. There is a second, more uncomfortable reason as well: in many areas voluntary work has become the precondition for a service existing at all — and anyone who notices they are filling a gap in the system is reluctant to commit indefinitely.' },
          { de: 'Daraus folgt für mich, dass die Vereine einen erheblichen Teil der Verantwortung tragen, wenn auch nicht die Schuld. Wer weiterhin Ämter statt Aufgaben ausschreibt, wählt die Bewerberzahl mit, die er anschließend beklagt. Zumutbar wäre, Verantwortung zu teilen und Mitarbeit zu befristen — beides ist mühsamer als die alte Ordnung und offenbar die einzige, die noch trägt.', en: 'From this it follows for me that the associations bear a considerable part of the responsibility, if not the blame. Anyone who continues to advertise offices rather than tasks is choosing the number of applicants they subsequently complain about. What could reasonably be asked is to share responsibility and to put a time limit on involvement — both are more laborious than the old order and apparently the only thing that still works.' },
        ],
      },
      {
        band: 'C2', label: 'Stark',
        note: 'Beyond what C1 asks for. It disputes the commentary’s framing rather than answering '
          + 'inside it, and still covers all four points — which is the harder trick.',
        lines: [
          { de: 'Der Kommentar dreht die übliche Frage um und gewinnt damit viel; er dreht sie allerdings nicht weit genug. Auch seine Neufassung — warum verlangen Vereine noch Jahre? — unterstellt, das Ehrenamt sei in erster Linie ein Angebotsproblem. Ich halte es für ein Zuständigkeitsproblem.', en: 'The commentary inverts the usual question and gains a great deal by doing so; it does not, however, turn it far enough. Even its reformulation — why do associations still demand years? — presupposes that voluntary work is primarily a problem of supply. I consider it a problem of responsibility.' },
          { de: 'In meinem Heimatland lässt sich das gut beobachten. Dort ist das Engagement dort am stabilsten, wo es klar zusätzlich ist — Chöre, Sportvereine, Feste. Es bricht dort weg, wo es eine öffentliche Aufgabe ersetzt: Fahrdienste, Nachhilfe, Betreuung. Dass ausgerechnet die zweite Gruppe die Nachwuchssorgen hat, ist kein Zufall und kein Ausdruck von Bequemlichkeit.', en: 'In my home country this can be observed clearly. There, involvement is most stable where it is unambiguously supplementary — choirs, sports clubs, festivals. It falls away where it replaces a public task: transport services, tutoring, care. That it is precisely the second group that has trouble recruiting is no coincidence and no expression of laziness.' },
          { de: 'Die Gründe sind daher nur zum Teil biografisch. Zum anderen Teil sind sie moralisch: Menschen entziehen sich nicht der Arbeit, sondern der Erpressung, die darin liegt, dass ohne sie jemand nicht versorgt wird.', en: 'The reasons are therefore only partly biographical. For the rest they are moral: people are not withdrawing from the work but from the coercion inherent in the fact that without them somebody goes uncared for.' },
          { de: 'Den Vereinen bliebe damit eine unbequeme Aufgabe: nicht nur kürzere Formate zu schaffen, sondern offen zu benennen, welche ihrer Tätigkeiten dort nicht hingehören. Das kostet sie kurzfristig Ansehen und ist langfristig das Einzige, was sie vor der Überforderung schützt.', en: 'That would leave the associations with an uncomfortable task: not merely to create shorter formats but to state openly which of their activities do not belong there. In the short term that costs them standing, and in the long term it is the only thing that protects them from being overwhelmed.' },
        ],
      },
    ],
  },

  speaking: C1_SPEAKING,
  redemittel: C1_REDEMITTEL,

  remedy: {
    reading: 'C1 reading is 70 minutes for three tasks and Aufgabe 1 is scheduled for 25 of them. '
      + 'If you are spending longer, you are reading it for meaning — most of its gaps are settled '
      + 'by syntax, and *nicht … sondern*, a stranded separable particle or a verb-final clause '
      + 'answers them faster than the sense does.',
    language: 'Schreiben Aufgabe 2 is five points for fifteen minutes and it is the best-value part '
      + 'of the paper: every gap is a fixed formula (*außer Betrieb*, *im Namen*, *wären wir Ihnen '
      + 'dankbar*) and the whole task can be learned as a list of about forty phrases.',
    listening: 'Aufgabe 1 is heard **once** and rewards preparation over comprehension: read every '
      + 'line of the grid before it starts, and expect the answers in the order the speaker says '
      + 'them. Aufgabe 2 is heard twice — the second hearing is for the items you left open, so do '
      + 'not answer everything on the first pass.',
    writing: 'C1 marks the *linking* of ideas, not just their presence. Four correct paragraphs '
      + 'that could be shuffled without loss will not reach the top band — each one has to pick up '
      + 'something from the last.',
    speaking: 'Aufgabe 1 hands you figures and expects interpretation, not description. Pick two '
      + 'that disagree with each other and build the talk on the disagreement — reading the card '
      + 'aloud accurately is the B2 answer.',
  },

  briefing: [
    {
      q: 'Wie läuft die Prüfung ab?',
      a: 'Lesen 70 minutes, Hören 40, Schreiben 80, then Sprechen about 15 in a pair, with 15 '
        + 'minutes’ preparation. The written parts run in one sitting.',
    },
    {
      q: 'Wie viele Punkte brauche ich?',
      a: '60 of 100, and — unlike B2 and C2 — **there is no floor on any single part**. C1 is not '
        + 'modular: one exam, one total. A weak Hören really can be carried here, which is worth '
        + 'knowing when you decide where to spend your last fortnight.',
    },
    {
      q: 'Was ist der Unterschied zu B2?',
      a: 'B2 asks whether you understood; C1 asks what you make of it. Reading Aufgabe 2 wants you '
        + 'to hold four accounts apart, Hören Aufgabe 2 hides the wrong answers in positions the '
        + 'speaker attributes to *other* people, and the oral hands you data instead of a topic.',
    },
    {
      q: 'Wo verliert man am meisten Punkte?',
      a: 'Lesen Aufgabe 1, because candidates read it for sense instead of for syntax, and the oral '
        + 'Aufgabe 2, where pairs discuss beautifully and never actually decide. The task says '
        + '*einigen Sie sich* and the mark sheet has a line for it.',
    },
  ],
};
