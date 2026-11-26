// Goethe-Zertifikat C2 · Großes Deutsches Sprachdiplom — Lexi's own paper.
//
// Structure from the published Modellsatz (goethe.de):
//
//   Lesen      80 min  4 Teile  Teil 1 a commentary, four-way multiple choice
//                               Teil 2 statements → the section of the article they match
//                               Teil 3 a reportage with paragraphs removed
//                               Teil 4 job adverts → which post each requirement describes
//   Hören      35 min  3 Teile  Teil 1 five radio excerpts, Ja/Nein, heard ONCE
//                               Teil 2 a discussion, Ja/Nein, heard ONCE
//                               Teil 3 an interview, three-way choice, heard TWICE
//   Schreiben  80 min           rework a short text into a given frame, then ~350 words free
//   Sprechen  ~15 min           five minutes alone, then a discussion with the examiner
//
// ## Modular, like B2 — four exams on one day
//
// Each module needs 60% of itself and certificates on its own; a failed module is
// resat alone. C2 is also the level at which the *whole point* of the reading
// changes: at B1 you are asked what a text says, at C2 what it is doing. Teil 1's
// distractors are all things the author does say, in a voice that is not their own.
//
// ## What C2 asks that C1 does not
//
// Nothing here is longer or faster than C1. It is more *exact*. Every wrong option
// in Lesen Teil 1 is defensible if you read the paragraph in isolation, and the
// Hören items turn on a single qualifying word — *überwiegend*, *zunächst*,
// *angeblich* — rather than on content. Vocabulary breadth stops being the thing
// that separates candidates somewhere around here; precision replaces it.
//
// Real counts are 30 reading and 30 listening items; this paper runs 20 and 20 at
// 1.25 points each, with every Teil present in its real shape and playback rule.
//
// Every text is written for Lexi; none of Goethe's Modellsatz is reproduced.
import { type ExamPaper, type Scheme } from '../../lib/exam.ts';
import { C2_REDEMITTEL, C2_SPEAKING } from './goethe-c2-speaking.ts';

/** Goethe C2 — four modules of 25, each passed alone at 60% of itself, exactly
 *  as B2. The total is reported and decides nothing. */
export const GOETHE_C2: Scheme = {
  reading: 25, language: 0, listening: 25, writing: 25, speaking: 25,
  written: 75, oral: 25, total: 100,
  pass: { written: 45, oral: 15, total: 60 },
  modular: true,
  bands: [[90, 'sehr gut'], [80, 'gut'], [70, 'befriedigend'], [60, 'ausreichend']],
};

const PER = 25 / 20;

export const PAPER: ExamPaper = {
  id: 'goethe-c2-01',
  provider: 'goethe',
  level: 'C2',
  title: 'Goethe-Zertifikat C2 · GDS',
  blurb: 'The Großes Deutsches Sprachdiplom in Goethe’s modular format — 40 items where the wrong '
    + 'answers are all things the text says, a 350-word Leserbrief, and the oral with the examiner.',
  oralFormat: '(mit der Prüferin / dem Prüfer, 15 Minuten Vorbereitung davor)',
  scheme: GOETHE_C2,
  blocks: [
    { label: 'Lesen', minutes: 80, partIds: ['l1', 'l2', 'l3', 'l4'] },
    { label: 'Hören', minutes: 35, partIds: ['h1', 'h2', 'h3'] },
  ],

  parts: [
    // ---- Lesen, Teil 1 (1–5) ----------------------------------------------
    {
      id: 'l1',
      subtest: 'reading',
      teil: 1,
      label: 'Lesen, Teil 1',
      skill: 'Interpretierendes Lesen',
      rubric: 'Lesen Sie den folgenden Kommentar. Wählen Sie bei jeder Aufgabe die richtige Lösung '
        + '(a, b, c oder d). Es gibt nur eine richtige Lösung.',
      rubricEn: 'Four options, and all four are things the text contains. What separates them is '
        + 'attribution — whose view is it — and force: what the author asserts, concedes, reports '
        + 'or merely entertains.',
      pointsPerItem: PER,
      kind: 'mc',
      passage: {
        title: 'Der Applaus und die Rechnung',
        standfirst: 'Über das Verhältnis zwischen öffentlicher Anerkennung und den Bedingungen, '
          + 'unter denen gearbeitet wird. Ein Kommentar.',
        paras: [
          'Es gibt einen Satz, den ich in den vergangenen Jahren so oft gehört habe, dass ich ihn nicht mehr neutral hören kann: „Diese Menschen leisten Großartiges.“ Er wird über Pflegekräfte gesagt, über Erzieherinnen, über Beschäftigte im Rettungsdienst, und er ist wahr. Genau darin liegt das Problem. Ein wahrer Satz, der zur richtigen Zeit gesagt wird, kann eine Debatte beenden, ohne sie geführt zu haben.',
          'Man wende nicht ein, Anerkennung sei nichts wert. Sie ist viel wert; wer sie nicht bekommt, verlässt einen Beruf schneller als jemand, der schlecht bezahlt wird. Nur ist sie das Einzige an diesen Berufen, was sich kostenlos vermehren lässt, und die Ökonomie öffentlicher Debatten sorgt zuverlässig dafür, dass das reichlich Vorhandene das Knappe verdrängt. Es wurde applaudiert, und es wurde nicht eingestellt.',
          'Die Verteidigung dagegen ist bekannt und nicht dumm: Das Geld sei nicht da, die Kassen seien leer, man könne nicht alles zugleich. Ich halte diese Auskunft für aufrichtig gemeint und trotzdem für irreführend, weil sie eine Verteilungsfrage als Kassenstand darstellt. Wo ein Etat um zehn Prozent wächst und ein anderer stagniert, ist keine Kasse leer; es ist entschieden worden.',
          'Interessanter als die Empörung finde ich, warum das Muster so verlässlich funktioniert. Meine Vermutung: Wir haben für diese Berufe kein Vokabular, das ohne Pathos auskommt. Man kann sagen, jemand pflege aufopferungsvoll. Man kann kaum sagen, jemand verrichte eine anspruchsvolle Tätigkeit von hohem gesellschaftlichem Nutzen und werde dafür unterdurchschnittlich entlohnt — obwohl nur der zweite Satz eine Forderung enthält, die sich beziffern lässt.',
          'Es wäre ein Fortschritt, das Lob für einige Zeit einzustellen. Nicht weil es falsch wäre, sondern weil es alles besetzt, was gesagt werden könnte. Wer die Rechnung sehen will, muss den Applaus abstellen — und wird dafür, das ist die unangenehme Pointe, für undankbar gehalten werden.',
        ],
      },
      questions: [
        {
          n: 1, stem: 'Was stört den Autor an dem Satz „Diese Menschen leisten Großartiges“?',
          options: [
            { k: 'a', text: 'Dass er sachlich falsch ist.' },
            { k: 'b', text: 'Dass er eine Diskussion abschließt, bevor sie stattgefunden hat.' },
            { k: 'c', text: 'Dass er zu selten gesagt wird.' },
            { k: 'd', text: 'Dass er nur von Fachleuten verstanden wird.' },
          ],
        },
        {
          n: 2, stem: 'Wie beurteilt der Autor die Bedeutung von Anerkennung?',
          options: [
            { k: 'a', text: 'Sie ist wirkungslos.' },
            { k: 'b', text: 'Sie ist wichtiger als die Bezahlung.' },
            { k: 'c', text: 'Sie hält Menschen im Beruf, ist aber im Überfluss vorhanden.' },
            { k: 'd', text: 'Sie wird von den Betroffenen abgelehnt.' },
          ],
        },
        {
          n: 3, stem: 'Was hält er dem Argument „Das Geld ist nicht da“ entgegen?',
          options: [
            { k: 'a', text: 'Dass es bewusst vorgeschoben wird.' },
            { k: 'b', text: 'Dass die Zahlen falsch erhoben werden.' },
            { k: 'c', text: 'Dass es ehrlich gemeint sein kann und eine Entscheidung als Sachzwang darstellt.' },
            { k: 'd', text: 'Dass die Kassen tatsächlich leer sind.' },
          ],
        },
        {
          n: 4, stem: 'Worin sieht er die Ursache dafür, dass sich das Muster wiederholt?',
          options: [
            { k: 'a', text: 'In der Gleichgültigkeit der Öffentlichkeit.' },
            { k: 'b', text: 'Im Fehlen einer nüchternen Sprache für diese Berufe.' },
            { k: 'c', text: 'In der schlechten Organisation der Beschäftigten.' },
            { k: 'd', text: 'In der Berichterstattung der Medien über Einzelfälle.' },
          ],
        },
        {
          n: 5, stem: 'Was erwartet der Autor von seinem eigenen Vorschlag?',
          options: [
            { k: 'a', text: 'Dass er schnell umgesetzt wird.' },
            { k: 'b', text: 'Dass er als undankbar aufgefasst wird.' },
            { k: 'c', text: 'Dass er die Betroffenen entlastet.' },
            { k: 'd', text: 'Dass er von der Politik aufgegriffen wird.' },
          ],
        },
      ],
      items: [
        { n: 1, answer: 'b', why: '„kann eine Debatte beenden, ohne sie geführt zu haben“. He says outright that the sentence is true („und er ist wahr“), which is what makes (a) the trap for a candidate skimming for a complaint.' },
        { n: 2, answer: 'c', why: 'Both halves are in the second paragraph: „wer sie nicht bekommt, verlässt einen Beruf schneller“ and „das Einzige … was sich kostenlos vermehren lässt“. (b) is close and is never claimed — he compares the two, he does not rank them.' },
        { n: 3, answer: 'c', why: '„für aufrichtig gemeint und trotzdem für irreführend“ — he explicitly declines (a). At C2 the distractor is usually the more cynical reading the author refused.' },
        { n: 4, answer: 'b', why: '„Wir haben für diese Berufe kein Vokabular, das ohne Pathos auskommt“, flagged as „Meine Vermutung“ — a conjecture, and still the only cause he offers.' },
        { n: 5, answer: 'b', why: '„wird dafür, das ist die unangenehme Pointe, für undankbar gehalten werden“ — the last clause of the piece, and the only expectation he states.' },
      ],
    },

    // ---- Lesen, Teil 2 (6–10) ---------------------------------------------
    {
      id: 'l2',
      subtest: 'reading',
      teil: 2,
      label: 'Lesen, Teil 2',
      skill: 'Zuordnung von Aussagen zu Textabschnitten',
      rubric: 'Fünf der folgenden Aussagen entsprechen dem Inhalt des Artikels. Ordnen Sie jede '
        + 'Aussage dem Abschnitt zu, in dem sie steht. Jeder Abschnitt kommt nur einmal vor.',
      rubricEn: 'The statement is a paraphrase, never a quotation, and it will usually be true of '
        + 'two sections in spirit and of one in substance. Find the section where the claim is '
        + 'actually *made* rather than implied.',
      pointsPerItem: PER,
      kind: 'match',
      once: true,
      options: [
        { k: 'a', text: 'Abschnitt A — Was ein Reparaturcafé ist' },
        { k: 'b', text: 'Abschnitt B — Wer kommt, und womit' },
        { k: 'c', text: 'Abschnitt C — Warum manches nicht zu reparieren ist' },
        { k: 'd', text: 'Abschnitt D — Der Streit um das Recht auf Reparatur' },
        { k: 'e', text: 'Abschnitt E — Was die Initiativen wirklich leisten' },
        { k: 'f', text: 'Abschnitt F — Ein Blick auf die Zahlen' },
      ],
      texts: [
        { n: 6, body: 'Die eigentliche Wirkung liegt nicht in der Menge des geretteten Materials, sondern darin, dass Menschen wieder erleben, wie ein Gerät von innen aussieht.' },
        { n: 7, body: 'Häufig scheitert eine Reparatur nicht am Können, sondern daran, dass sich das Gehäuse ohne Beschädigung gar nicht öffnen lässt.' },
        { n: 8, body: 'Wer kommt, bringt meist kein wertvolles Stück mit, sondern eines, an dem etwas hängt.' },
        { n: 9, body: 'Die Hersteller berufen sich auf Sicherheit; die Gegenseite hält das für ein Argument, das den Wettbewerb schützen soll.' },
        { n: 10, body: 'Gemessen am gesamten Elektroschrott fällt der Beitrag der Initiativen kaum ins Gewicht.' },
      ],
      items: [
        { n: 6, answer: 'e', why: 'A claim about what the initiatives *achieve*, explicitly set against quantity — which is section F’s subject, and the reason the two are easy to swap.' },
        { n: 7, answer: 'c', why: 'The cause of a failed repair, and a physical one. Section D also concerns manufacturers, but as a political dispute rather than a casing that will not open.' },
        { n: 8, answer: 'b', why: 'Who turns up and with what. „an dem etwas hängt“ — attachment, not value.' },
        { n: 9, answer: 'd', why: 'Two positions in one sentence, which is what a section about a dispute contains.' },
        { n: 10, answer: 'f', why: '„Gemessen am gesamten Elektroschrott“ — a proportion, and the only statement of the five that is a measurement.' },
      ],
    },

    // ---- Lesen, Teil 3 (11–15) --------------------------------------------
    {
      id: 'l3',
      subtest: 'reading',
      teil: 3,
      label: 'Lesen, Teil 3',
      skill: 'Textkohärenz über Absätze',
      rubric: 'Lesen Sie die folgende Reportage, aus der Textabschnitte entfernt wurden. Setzen Sie '
        + 'die Abschnitte an der richtigen Stelle wieder ein. Ein Abschnitt passt nicht.',
      rubricEn: 'Whole paragraphs, not sentences. The join is made by a referring expression at the '
        + 'start of the *following* paragraph — a demonstrative, a definite article doing new work, '
        + 'a „diese“ with no antecedent unless your paragraph supplies it.',
      pointsPerItem: PER,
      kind: 'cloze',
      mode: 'bank',
      intro: 'Die Nachtschicht der Stadt',
      body: 'Um vier Uhr morgens ist die Halle das hellste Gebäude im Umkreis von zwei Kilometern. '
        + 'Achtzig Menschen arbeiten hier, während die Stadt schläft, und sortieren, was sie am '
        + 'Vortag weggeworfen hat.\n\n[[11]]\n\n'
        + 'Diese Zahl überrascht sie selbst nicht mehr. „Am Anfang habe ich sie den Leuten genannt“, '
        + 'sagt die Schichtleiterin, „inzwischen lasse ich es. Man glaubt es nicht, und dann glaubt '
        + 'man auch den Rest nicht.“\n\n[[12]]\n\n'
        + 'Woran es tatsächlich liegt, lässt sich an einem einzigen Band beobachten. Was sauber '
        + 'getrennt ankommt, ist in Sekunden verarbeitet; was in einer Tüte zusammenklebt, hält die '
        + 'Anlage auf und wird am Ende doch verbrannt.\n\n[[13]]\n\n'
        + 'Für die Beschäftigten ist das der frustrierende Teil der Arbeit. Nicht der Geruch, nicht '
        + 'die Uhrzeit, sondern die Gewissheit, dass ein Teil dessen, was sie mühsam trennen, ohnehin '
        + 'denselben Weg nimmt.\n\n[[14]]\n\n'
        + 'Wer so lange dabei ist, hat aufgehört, sich darüber zu ärgern; die Neueren ärgern sich '
        + 'noch. Ob sich überhaupt etwas ändert, hängt weniger von der Technik ab als von einer '
        + 'Entscheidung, die niemand gern trifft.\n\n[[15]]\n\n'
        + 'Um halb sechs wird es draußen hell, und die Halle verliert ihren Vorsprung. Die erste '
        + 'Straßenbahn fährt vorbei, in ihr sitzen Menschen, die gleich anfangen zu arbeiten, und '
        + 'in der Halle legen achtzig andere ihre Handschuhe ab.',
      bank: [
        { k: 'a', text: 'In einer Nacht laufen hier vierhundert Tonnen über die Bänder — so viel, wie eine Kleinstadt in einer Woche produziert.' },
        { k: 'b', text: 'Denn dass die Anlage überfordert sei, ist das Erste, was Besucher vermuten, und es stimmt nicht: Sie läuft weit unter ihrer Kapazität.' },
        { k: 'c', text: 'Die Quote, die am Ende in der Statistik steht, entsteht deshalb nicht in der Halle, sondern in den Küchen der Stadt — Wochen bevor irgendetwas hier ankommt.' },
        { k: 'd', text: 'Man müsste den Leuten sagen, dass es auf sie ankommt, und das klingt nach Belehrung. Bisher hat sich keine Kampagne getraut, es deutlich zu sagen.' },
        { k: 'e', text: 'Die Halle wurde vor elf Jahren gebaut und im vergangenen Sommer um einen zweiten Eingang erweitert.' },
        { k: 'f', text: 'Zwei von ihnen arbeiten seit der Eröffnung hier, die übrigen sind in den letzten drei Jahren dazugekommen.' },
      ],
      items: [
        { n: 11, answer: 'a', why: 'The paragraph after the gap opens „Diese Zahl überrascht sie selbst nicht mehr“ — so the gap must contain a number, and (a) is the only option that is one.' },
        { n: 12, answer: 'b', why: '„Woran es tatsächlich liegt“ in the next paragraph requires a wrong explanation to have just been dismissed. (b) dismisses one and says so: „es stimmt nicht“.' },
        { n: 13, answer: 'c', why: 'It follows the belt observation and precedes „Für die Beschäftigten ist das der frustrierende Teil“ — *das* needs the futility to have been stated, and (c) states it: the quota is decided in the city’s kitchens.' },
        { n: 14, answer: 'f', why: '„Zwei von **ihnen**“ needs a plural of people, and the preceding paragraph supplies it: *die Beschäftigten*. The sentence after the gap — „Wer so lange dabei ist“ — then picks up the length of service (f) introduces.' },
        { n: 15, answer: 'd', why: '„eine Entscheidung, die niemand gern trifft“ is the last thing said before the gap, and (d) is that decision named: telling people it is on them, which sounds like a lecture. (e) is the decoy — true-sounding, hooked to nothing before or after it.' },
      ],
    },

    // ---- Lesen, Teil 4 (16–20) --------------------------------------------
    {
      id: 'l4',
      subtest: 'reading',
      teil: 4,
      label: 'Lesen, Teil 4',
      skill: 'Selektives Lesen · formale Texte',
      rubric: 'Sie lesen Stellenanzeigen. Welche Anzeige (a–e) trifft auf die jeweilige Aussage zu? '
        + 'Jede Anzeige kann nur einmal verwendet werden.',
      rubricEn: 'The fastest marks on the paper and the easiest to lose to a clock. Each statement '
        + 'restates one clause of one advert in different words — read the statements first and '
        + 'scan for the clause, not the topic.',
      pointsPerItem: PER,
      kind: 'ads',
      situations: [
        { n: 16, text: 'Die Tätigkeit ist mit regelmäßigen Dienstreisen verbunden.' },
        { n: 17, text: 'Vorausgesetzt wird die Bereitschaft, längere Zeit im Ausland zu leben.' },
        { n: 18, text: 'Die Aufgabe besteht wesentlich darin, Mittel einzuwerben.' },
        { n: 19, text: 'Erwartet wird die Zugehörigkeit zu einer Konfession.' },
        { n: 20, text: 'Zu den Aufgaben gehört die Weiterbildung örtlicher Mitarbeitender.' },
      ],
      ads: [
        {
          k: 'a', head: 'Referentin / Referent für Hochschulkooperationen',
          body: 'Sie betreuen unsere Partnerhochschulen im europäischen Ausland, bereiten Abkommen vor und begleiten Delegationsreisen. Wir bieten eine unbefristete Stelle in Vollzeit am Standort Bonn. Reisetätigkeit circa 30 Prozent.',
        },
        {
          k: 'b', head: 'Projektleitung Wasserversorgung, Ostafrika',
          body: 'Für unser Vorhaben in der Region suchen wir eine erfahrene Ingenieurin oder einen erfahrenen Ingenieur. Der Einsatzort ist vor Ort; wir setzen die Bereitschaft voraus, mindestens drei Jahre dort zu leben. Familiennachzug ist möglich.',
        },
        {
          k: 'c', head: 'Fundraising und Mittelakquise',
          body: 'Sie entwickeln unsere Spendenstrategie weiter, betreuen Großspender und stellen Anträge bei öffentlichen Gebern. Erfahrung im Umgang mit institutionellen Förderern ist erwünscht. Die Stelle ist zunächst auf zwei Jahre befristet, eine Entfristung wird angestrebt.',
        },
        {
          k: 'd', head: 'Fachkraft Ausbildung und Qualifizierung',
          body: 'Sie schulen lokale Kolleginnen und Kollegen in Wartung und Betrieb unserer Anlagen, entwickeln Curricula und begleiten die Ausbildungsgänge. Erfahrung in der Erwachsenenbildung ist von Vorteil.',
        },
        {
          k: 'e', head: 'Leitung Gemeindearbeit',
          body: 'Wir suchen eine Persönlichkeit, die unsere diakonische Arbeit im Stadtteil verantwortet. Die Mitgliedschaft in einer christlichen Kirche ist Voraussetzung für diese Stelle. Vergütung nach kirchlichem Tarif.',
        },
      ],
      items: [
        { n: 16, answer: 'a', why: '„Reisetätigkeit circa 30 Prozent“ — the only advert that quantifies travel. (b) involves going abroad, but to live there, which is the opposite of a business trip.' },
        { n: 17, answer: 'b', why: '„wir setzen die Bereitschaft voraus, mindestens drei Jahre dort zu leben“. (c) also names a period of years — as a limit on the contract, not a requirement to stay — and that pair is the item.' },
        { n: 18, answer: 'c', why: '„Sie entwickeln unsere Spendenstrategie weiter … stellen Anträge bei öffentlichen Gebern“ — *Mittel einwerben* restated in the advert’s own vocabulary.' },
        { n: 19, answer: 'e', why: '„Die Mitgliedschaft in einer christlichen Kirche ist Voraussetzung“.' },
        { n: 20, answer: 'd', why: '„Sie schulen lokale Kolleginnen und Kollegen“ — training local staff, restated as *Weiterbildung örtlicher Mitarbeitender*.' },
      ],
    },

    // ---- Hören, Teil 1 (21–26) --------------------------------------------
    {
      id: 'h1',
      subtest: 'listening',
      teil: 1,
      label: 'Hören, Teil 1',
      skill: 'Globalverstehen · kurze Ausschnitte',
      rubric: 'Sie hören drei Ausschnitte aus Radiosendungen zu verschiedenen Themen. Zu jedem '
        + 'Ausschnitt gibt es zwei Aufgaben. Entscheiden Sie, ob die Aussage mit dem Textinhalt '
        + 'übereinstimmt. Sie hören die Texte einmal.',
      rubricEn: 'Heard ONCE, Ja/Nein. At C2 the statement usually reproduces the content correctly '
        + 'and gets one qualifier wrong — *überwiegend*, *erstmals*, *ausschließlich*. Read the '
        + 'qualifiers before the audio starts; they are the whole item.',
      pointsPerItem: PER,
      kind: 'tf',
      labels: ['Ja', 'Nein'],
      intro: 'Drei Ausschnitte, je zwei Aussagen. Sie hören jeden Text nur einmal.',
      audio: {
        plays: 1,
        tracks: [
          {
            n: 1, label: 'Ausschnitt 1 — Wirtschaftsmeldungen',
            lines: [
              { who: 'Sprecher', text: 'Der Absatz von Lastenrädern ist im vergangenen Jahr erneut gestiegen, allerdings deutlich langsamer als in den Jahren zuvor. Der Branchenverband spricht von einer Normalisierung nach einer Phase, in der die Nachfrage die Produktion überstieg.' },
              { who: 'Sprecher', text: 'Auffällig ist die Verschiebung bei den Käufern: Erwarben die Räder anfangs überwiegend Familien, kommen inzwischen mehr als die Hälfte der Bestellungen von Gewerbetreibenden — Handwerksbetriebe, Lieferdienste, kommunale Verwaltungen.' },
              { who: 'Sprecher', text: 'Für das laufende Jahr rechnet der Verband erstmals mit einem Rückgang, begründet allerdings nicht mit der Nachfrage, sondern mit dem Auslaufen mehrerer Förderprogramme.' },
            ],
          },
          {
            n: 2, label: 'Ausschnitt 2 — Aus der Wissenschaftssendung',
            lines: [
              { who: 'Sprecherin', text: 'Eine Arbeitsgruppe in Zürich hat untersucht, wie verlässlich Menschen einschätzen, ob sie eine Nachricht schon einmal gelesen haben. Das Ergebnis fällt ernüchternd aus: Bereits eine einzige Wiederholung erhöht deutlich, für wie glaubwürdig eine Aussage gehalten wird — unabhängig davon, ob sie zutrifft.' },
              { who: 'Sprecherin', text: 'Bemerkenswert ist, dass der Effekt auch dann auftritt, wenn die Teilnehmenden vorher ausdrücklich gewarnt wurden. Die Forschenden betonen jedoch, dass er sich abschwächt, sobald es um Aussagen aus dem eigenen Fachgebiet geht.' },
              { who: 'Sprecherin', text: 'Eine praktische Empfehlung wollten die Beteiligten ausdrücklich nicht geben. Man wisse, dass Wiederholung wirkt; wie man ihr begegnet, sei eine andere Frage und bislang unbeantwortet.' },
            ],
          },
          {
            n: 3, label: 'Ausschnitt 3 — Kulturnachrichten',
            lines: [
              { who: 'Sprecher', text: 'Das Stadttheater hat angekündigt, in der kommenden Spielzeit auf Premieren im großen Haus weitgehend zu verzichten und stattdessen ältere Inszenierungen wieder aufzunehmen. Als Grund nennt die Intendanz nicht die Finanzen, sondern den Zustand der Bühnentechnik, deren Sanierung sich um mindestens ein Jahr verzögert.' },
              { who: 'Sprecher', text: 'Kritik kam prompt vom Ensemble, das eine Beteiligung an der Entscheidung vermisst. Der Personalrat spricht von einem Verfahren, das man so nicht hinnehmen werde, kündigt jedoch keine konkreten Schritte an.' },
              { who: 'Sprecher', text: 'Das Publikum reagiert bislang gelassen: Die Abonnements liegen auf dem Niveau des Vorjahres.' },
            ],
          },
        ],
      },
      statements: [
        { n: 21, text: 'Der Absatz von Lastenrädern ist im vergangenen Jahr zurückgegangen.' },
        { n: 22, text: 'Inzwischen stammt die Mehrheit der Bestellungen nicht mehr von Familien.' },
        { n: 23, text: 'Eine Warnung vor dem Wiederholungseffekt verhindert ihn nicht.' },
        { n: 24, text: 'Die Forschenden empfehlen, Nachrichten nur einmal zu lesen.' },
        { n: 25, text: 'Das Theater begründet den Verzicht auf Premieren mit fehlendem Geld.' },
        { n: 26, text: 'Die Zuschauerzahlen sind bisher stabil geblieben.' },
      ],
      items: [
        { n: 21, answer: 'f', why: '„erneut gestiegen, allerdings deutlich langsamer“. A decline is *forecast* for the current year — a different year, and the commonest C2 listening trap.' },
        { n: 22, answer: 'r', why: '„kommen inzwischen mehr als die Hälfte der Bestellungen von Gewerbetreibenden“, against „anfangs überwiegend Familien“.' },
        { n: 23, answer: 'r', why: '„der Effekt auch dann auftritt, wenn die Teilnehmenden vorher ausdrücklich gewarnt wurden“.' },
        { n: 24, answer: 'f', why: '„Eine praktische Empfehlung wollten die Beteiligten ausdrücklich nicht geben.“ The statement is the recommendation a listener would supply for themselves.' },
        { n: 25, answer: 'f', why: '„nennt die Intendanz nicht die Finanzen, sondern den Zustand der Bühnentechnik“.' },
        { n: 26, answer: 'r', why: '„Die Abonnements liegen auf dem Niveau des Vorjahres“ — subscriptions standing in for audience figures, which is the paraphrase the item is testing.' },
      ],
    },

    // ---- Hören, Teil 2 (27–31) --------------------------------------------
    {
      id: 'h2',
      subtest: 'listening',
      teil: 2,
      label: 'Hören, Teil 2',
      skill: 'Detailverstehen · Gespräch',
      rubric: 'Sie hören ein Gespräch zwischen zwei Fachleuten. Entscheiden Sie, ob die Aussagen mit '
        + 'dem Textinhalt übereinstimmen. Sie hören den Text einmal.',
      rubricEn: 'Heard ONCE. Two speakers who mostly agree — so the items turn on which of them '
        + 'said a thing, and on the one point where they part.',
      pointsPerItem: PER,
      kind: 'tf',
      labels: ['Ja', 'Nein'],
      intro: 'Ein Gespräch über die Zukunft der Innenstädte. Sie hören den Text nur einmal.',
      audio: {
        plays: 1,
        tracks: [
          {
            label: 'Zwei Fachleute über leere Innenstädte',
            lines: [
              { who: 'Frau Ahrens', text: 'Man muss zunächst das Bild korrigieren, das die meisten haben. Die Innenstädte leeren sich nicht wegen des Onlinehandels — der hat den Prozess beschleunigt, aber angefangen hat er in den achtziger Jahren mit den Einkaufszentren auf der grünen Wiese.' },
              { who: 'Herr Kern', text: 'Da würde ich zustimmen und trotzdem eine andere Betonung setzen. Für die einzelne Händlerin ist es ziemlich gleichgültig, ob die Kundschaft ins Zentrum am Stadtrand fährt oder online bestellt. Was sie merkt, ist die Frequenz, und die ist weg.' },
              { who: 'Frau Ahrens', text: 'Sicher. Nur folgt aus der Diagnose die Therapie, und da macht es einen erheblichen Unterschied. Wenn das Problem der Onlinehandel wäre, könnte man ihn besteuern. Wenn es die Erreichbarkeit ist, muss man über Verkehr und Mieten reden, und das ist unangenehmer.' },
              { who: 'Herr Kern', text: 'Über die Mieten reden allerdings inzwischen alle. Meine Erfahrung ist, dass Eigentümer eine leere Fläche einer günstig vermieteten vorziehen, weil eine niedrige Miete den Wert der Immobilie dauerhaft senkt. Das ist betriebswirtschaftlich vernünftig und stadtplanerisch verheerend.' },
              { who: 'Frau Ahrens', text: 'Ich halte diesen Punkt für überschätzt. Er gilt für die großen Bestandshalter, nicht für die vielen kleinen Eigentümer, denen die Hälfte der Innenstadtflächen gehört. Die haben meistens andere Gründe — Erbengemeinschaften, ungeklärte Sanierungen, schlicht Trägheit.' },
              { who: 'Herr Kern', text: 'Das ist ein fairer Einwand, und ich habe dafür keine Zahlen. Bei dem, was wirkt, sind wir uns vermutlich einig: Zwischennutzung, weniger Auflagen bei Umbauten, und Wohnen in den oberen Geschossen.' },
              { who: 'Frau Ahrens', text: 'Beim Wohnen ja, unbedingt. Bei der Zwischennutzung bin ich vorsichtiger geworden. Sie füllt Fenster und schafft selten etwas, das bleibt — und sie ersetzt inzwischen an einigen Orten die Diskussion, statt sie anzustoßen.' },
            ],
          },
        ],
      },
      statements: [
        { n: 27, text: 'Frau Ahrens datiert den Beginn der Entwicklung auf die Zeit vor dem Onlinehandel.' },
        { n: 28, text: 'Herr Kern hält die Unterscheidung der Ursachen für praktisch bedeutungslos.' },
        { n: 29, text: 'Frau Ahrens hält die Erklärung über die Immobilienwerte für die wichtigste.' },
        { n: 30, text: 'Herr Kern räumt ein, seine These nicht mit Zahlen belegen zu können.' },
        { n: 31, text: 'Beide halten Wohnen in den oberen Geschossen für sinnvoll.' },
      ],
      items: [
        { n: 27, answer: 'r', why: '„angefangen hat er in den achtziger Jahren mit den Einkaufszentren auf der grünen Wiese“.' },
        { n: 28, answer: 'f', why: 'He says it makes little difference *to the individual retailer* — a narrower claim, and Ahrens then argues the distinction matters for policy without his contradicting her.' },
        { n: 29, answer: 'f', why: '„Ich halte diesen Punkt für überschätzt.“ It is Kern’s explanation, and she limits it to large portfolio owners.' },
        { n: 30, answer: 'r', why: '„Das ist ein fairer Einwand, und ich habe dafür keine Zahlen.“' },
        { n: 31, answer: 'r', why: 'Kern lists it and Ahrens answers „Beim Wohnen ja, unbedingt“ — the only thing in the conversation they agree on without qualification.' },
      ],
    },

    // ---- Hören, Teil 3 (32–40) --------------------------------------------
    {
      id: 'h3',
      subtest: 'listening',
      teil: 3,
      label: 'Hören, Teil 3',
      skill: 'Detailverstehen · Interview',
      rubric: 'Sie hören ein Interview mit einer Restauratorin. Wählen Sie bei jeder Aufgabe die '
        + 'richtige Lösung. Sie hören das Gespräch zweimal.',
      rubricEn: 'Heard TWICE, three options. The distractors are positions she describes in order '
        + 'to reject them, or that the interviewer puts to her — so the question is always what '
        + '*she* holds.',
      pointsPerItem: PER,
      kind: 'mc',
      audio: {
        plays: 2,
        intro: 'Ein Interview. Sie hören den Text zweimal.',
        tracks: [
          {
            label: 'Im Gespräch mit einer Restauratorin',
            lines: [
              { who: 'Moderator', text: 'Frau Baumann, Sie restaurieren seit dreißig Jahren Gemälde. Was ist das größte Missverständnis über Ihren Beruf?' },
              { who: 'Frau Baumann', text: 'Dass wir etwas wiederherstellen. Wir stellen nichts wieder her — den Zustand von 1650 hat niemand gesehen, auch der Maler nicht, denn die Farben haben sich schon unter seinen Händen verändert. Wir treffen Entscheidungen darüber, welchen Zustand wir für lesbar halten.' },
              { who: 'Moderator', text: 'Das klingt beunruhigend beliebig.' },
              { who: 'Frau Baumann', text: 'Beliebig ist es nicht, es ist begründungspflichtig. Jeder Eingriff wird dokumentiert und muss umkehrbar sein — das ist die eigentliche Regel des Fachs, und sie ist streng. Was ich nicht rückgängig machen kann, mache ich nicht.' },
              { who: 'Moderator', text: 'Gibt es Arbeiten, die Sie ablehnen?' },
              { who: 'Frau Baumann', text: 'Regelmäßig, und meist nicht aus technischen Gründen. Es kommen Leute mit einem Bild, an dem etwas hängt, und sie wollen es so haben, wie sie es in Erinnerung haben. Das ist ein legitimer Wunsch und keine Restaurierung. Manchmal empfehle ich, es einfach hängen zu lassen.' },
              { who: 'Moderator', text: 'Wie hat sich die Arbeit durch neue Technik verändert?' },
              { who: 'Frau Baumann', text: 'Weniger, als man denkt, aber an einer entscheidenden Stelle: Wir sehen heute vor dem Eingriff, was unter der Oberfläche liegt. Früher hat man aufgemacht und dann gestaunt. Das hat nicht nur Fehler verhindert — es hat auch dazu geführt, dass wir viel häufiger gar nichts tun.' },
              { who: 'Moderator', text: 'Nichts tun als Fortschritt?' },
              { who: 'Frau Baumann', text: 'Der wichtigste, ja. Die meisten Schäden an alten Bildern stammen von früheren Restaurierungen, nicht von der Zeit. Wer das einmal begriffen hat, wird zurückhaltend.' },
              { who: 'Moderator', text: 'Wird der Beruf noch gebraucht, wenn man immer weniger eingreift?' },
              { who: 'Frau Baumann', text: 'Mehr denn je, nur anders. Die Arbeit verlagert sich von der Behandlung zur Vorbeugung — Klima, Licht, Transport. Das ist weniger sichtbar und schwerer zu finanzieren, weil man Schäden, die nicht eintreten, niemandem zeigen kann.' },
              { who: 'Moderator', text: 'Was raten Sie jemandem, der den Beruf ergreifen will?' },
              { who: 'Frau Baumann', text: 'Sich darüber klar zu werden, dass es ein handwerklicher Beruf mit einer wissenschaftlichen Verantwortung ist, und nicht umgekehrt. Wer vor allem forschen will, ist in der Kunstgeschichte besser aufgehoben. Man verbringt sehr viele Stunden sehr nah an einer Leinwand.' },
            ],
          },
        ],
      },
      questions: [
        {
          n: 32, stem: 'Was hält Frau Baumann für das größte Missverständnis?',
          options: [
            { k: 'a', text: 'Dass Restaurierung einen früheren Zustand wiederherstelle.' },
            { k: 'b', text: 'Dass der Beruf schlecht bezahlt sei.' },
            { k: 'c', text: 'Dass Restaurierung nur alte Bilder betreffe.' },
          ],
        },
        {
          n: 33, stem: 'Wie antwortet sie auf den Vorwurf der Beliebigkeit?',
          options: [
            { k: 'a', text: 'Sie räumt ihn ein.' },
            { k: 'b', text: 'Sie verweist auf Dokumentation und Umkehrbarkeit.' },
            { k: 'c', text: 'Sie verweist auf gesetzliche Vorgaben.' },
          ],
        },
        {
          n: 34, stem: 'Warum lehnt sie Aufträge ab?',
          options: [
            { k: 'a', text: 'Weil die Bilder technisch zu stark beschädigt sind.' },
            { k: 'b', text: 'Weil die Auftraggeber etwas anderes wollen als eine Restaurierung.' },
            { k: 'c', text: 'Weil ihr die Zeit fehlt.' },
          ],
        },
        {
          n: 35, stem: 'Was hat die neue Technik vor allem bewirkt?',
          options: [
            { k: 'a', text: 'Die Eingriffe dauern kürzer.' },
            { k: 'b', text: 'Man greift häufiger gar nicht ein.' },
            { k: 'c', text: 'Die Ergebnisse sind haltbarer.' },
          ],
        },
        {
          n: 36, stem: 'Woher stammen laut Frau Baumann die meisten Schäden?',
          options: [
            { k: 'a', text: 'Von früheren Restaurierungen.' },
            { k: 'b', text: 'Vom Transport.' },
            { k: 'c', text: 'Vom Alter der Materialien.' },
          ],
        },
        {
          n: 37, stem: 'Wie verändert sich der Beruf ihrer Ansicht nach?',
          options: [
            { k: 'a', text: 'Er wird überflüssig.' },
            { k: 'b', text: 'Er verlagert sich zur Vorbeugung.' },
            { k: 'c', text: 'Er wird stärker von Kunsthistorikern übernommen.' },
          ],
        },
        {
          n: 38, stem: 'Warum ist dieser Teil der Arbeit schwer zu finanzieren?',
          options: [
            { k: 'a', text: 'Weil er besonders teuer ist.' },
            { k: 'b', text: 'Weil verhinderte Schäden nicht vorzeigbar sind.' },
            { k: 'c', text: 'Weil es dafür keine Fachleute gibt.' },
          ],
        },
        {
          n: 39, stem: 'Was rät sie Berufsanfängern?',
          options: [
            { k: 'a', text: 'Sich über den handwerklichen Charakter des Berufs klar zu werden.' },
            { k: 'b', text: 'Zuerst Kunstgeschichte zu studieren.' },
            { k: 'c', text: 'Sich früh zu spezialisieren.' },
          ],
        },
        {
          n: 40, stem: 'Wem empfiehlt sie ausdrücklich ein anderes Fach?',
          options: [
            { k: 'a', text: 'Wer ungern allein arbeitet.' },
            { k: 'b', text: 'Wer vor allem forschen möchte.' },
            { k: 'c', text: 'Wer keine Geduld hat.' },
          ],
        },
      ],
      items: [
        { n: 32, answer: 'a', why: '„Dass wir etwas wiederherstellen. Wir stellen nichts wieder her.“' },
        { n: 33, answer: 'b', why: '„Jeder Eingriff wird dokumentiert und muss umkehrbar sein.“ (a) is what the interviewer offers and she opens by refusing it: „Beliebig ist es nicht.“' },
        { n: 34, answer: 'b', why: '„meist nicht aus technischen Gründen“ — which rules out (a) explicitly — and „Das ist ein legitimer Wunsch und keine Restaurierung.“' },
        { n: 35, answer: 'b', why: '„es hat auch dazu geführt, dass wir viel häufiger gar nichts tun“, which she then calls the most important advance.' },
        { n: 36, answer: 'a', why: '„Die meisten Schäden an alten Bildern stammen von früheren Restaurierungen, nicht von der Zeit.“' },
        { n: 37, answer: 'b', why: '„Die Arbeit verlagert sich von der Behandlung zur Vorbeugung.“ She answers (a) in the first three words: „Mehr denn je“.' },
        { n: 38, answer: 'b', why: '„weil man Schäden, die nicht eintreten, niemandem zeigen kann“.' },
        { n: 39, answer: 'a', why: '„dass es ein handwerklicher Beruf mit einer wissenschaftlichen Verantwortung ist, und nicht umgekehrt“.' },
        { n: 40, answer: 'b', why: '„Wer vor allem forschen will, ist in der Kunstgeschichte besser aufgehoben.“ (b) and (a) both name art history; only one names the person she is sending there.' },
      ],
    },
  ],

  // ---- Schreiben -----------------------------------------------------------
  writing: {
    id: 'c2-w1',
    situation: 'Schreiben, Teil 2 — Sie haben in einer überregionalen Zeitung die folgende '
      + 'Artikelserie verfolgt. Schreiben Sie einen ausführlichen Leserbrief an die Redaktion, in '
      + 'dem Sie sich auf die drei genannten Aussagen beziehen und Ihre Meinung dazu äußern. '
      + 'Dauer: 60 Minuten, circa 350 Wörter.',
    situationEn: 'C2’s longest piece, and the one where length is a trap: 350 words that circle the '
      + 'topic score below 350 words that take a position and defend it against the strongest '
      + 'objection. The three statements must each be addressed — not necessarily agreed with.',
    letter: {
      from: 'Artikelserie · „Wem gehört die Stadt?“ — drei Aussagen aus der Debatte',
      body: [
        '1. „Wer in einer Stadt wohnt, in der er sich die Miete nicht mehr leisten kann, ist kein Bewohner mehr, sondern ein Gast auf Abruf.“',
        '2. „Der Wohnungsmangel ist kein Verteilungsproblem, sondern ein Bauproblem. Es gibt schlicht zu wenige Wohnungen, und alles andere ist Ablenkung.“',
        '3. „Städte, die ihre Mitte für Wohnen reservieren, verlieren, was sie erst zur Stadt macht: Läden, Werkstätten, Betrieb.“',
      ],
    },
    leitpunkte: [
      { de: 'Beziehen Sie sich auf Aussage 1 und ordnen Sie sie ein.', en: 'Address statement 1 and place it in context.' },
      { de: 'Beziehen Sie sich auf Aussage 2 und prüfen Sie ihre Voraussetzung.', en: 'Address statement 2 and examine its premise.' },
      { de: 'Beziehen Sie sich auf Aussage 3 und wägen Sie ab.', en: 'Address statement 3 and weigh it up.' },
      { de: 'Formulieren Sie eine eigene, begründete Position.', en: 'Formulate a reasoned position of your own.' },
    ],
    minutes: 60,
    models: [
      {
        band: 'B2', label: 'Zu wenig',
        note: 'Addresses all three statements and reaches a view. It would pass B2 comfortably and '
          + 'sits well below C2, because it agrees with each statement in turn without noticing '
          + 'that statements 2 and 3 contradict each other.',
        lines: [
          { de: 'Sehr geehrte Redaktion, ich habe Ihre Serie mit Interesse gelesen und möchte dazu Stellung nehmen.', en: 'Dear Editors, I have read your series with interest and would like to comment on it.' },
          { de: 'Die erste Aussage finde ich richtig. Wenn man die Miete nicht bezahlen kann, muss man wegziehen, und dann gehört man nicht mehr wirklich zur Stadt.', en: 'I find the first statement correct. If you cannot pay the rent you have to move away, and then you no longer really belong to the city.' },
          { de: 'Auch der zweiten Aussage stimme ich zu. Es gibt zu wenige Wohnungen, deshalb muss mehr gebaut werden.', en: 'I also agree with the second statement. There are too few flats, so more must be built.' },
          { de: 'Die dritte Aussage ist ebenfalls berechtigt. Eine Stadt braucht Geschäfte und Werkstätten, sonst ist sie langweilig.', en: 'The third statement is likewise justified. A city needs shops and workshops, otherwise it is boring.' },
          { de: 'Meiner Meinung nach muss die Politik mehr tun. Mit freundlichen Grüßen', en: 'In my opinion politicians must do more. Yours sincerely' },
        ],
      },
      {
        band: 'C1', label: 'Solide',
        note: 'Structured, connected, and it notices the tension between statements 2 and 3. What '
          + 'keeps it below the top band is that it never questions a premise — it argues inside '
          + 'the terms the newspaper set.',
        lines: [
          { de: 'Sehr geehrte Damen und Herren, Ihre Serie hat den Vorzug, drei Positionen nebeneinanderzustellen, die sich schlechter vertragen, als es zunächst aussieht — und genau daran möchte ich anknüpfen.', en: 'Dear Sir or Madam, your series has the merit of placing three positions side by side that sit together less comfortably than it first appears — and that is precisely what I would like to pick up on.' },
          { de: 'Die erste Aussage halte ich für zugespitzt und in der Sache für zutreffend. Wer jederzeit damit rechnen muss, umziehen zu müssen, investiert nicht mehr in seine Umgebung: nicht in Nachbarschaft, nicht in einen Verein, nicht in die Schule um die Ecke. Der Schaden trifft also nicht nur die Betroffenen, sondern die Stadt selbst.', en: 'I consider the first statement pointed and, in substance, accurate. Anyone who must constantly reckon with having to move no longer invests in their surroundings: not in the neighbourhood, not in a club, not in the school round the corner. The damage therefore affects not only those concerned but the city itself.' },
          { de: 'Die zweite Aussage stimmt und erklärt weniger, als sie behauptet. Dass zu wenig gebaut wird, ist unbestritten; nur folgt daraus nicht, dass die Verteilung gleichgültig wäre. Neubau wirkt frühestens in fünf Jahren, und wer heute verdrängt wird, ist dann nicht mehr da.', en: 'The second statement is true and explains less than it claims. That too little is being built is undisputed; it does not follow, however, that distribution is a matter of indifference. New building takes effect in five years at the earliest, and whoever is displaced today will not be there then.' },
          { de: 'Bei der dritten Aussage wird die Spannung offen. Sie fordert Fläche für Läden und Werkstätten — dieselbe Fläche, die Aussage 2 bebaut sehen will. Beide können nicht in vollem Umfang recht behalten, und die Serie sagt nicht, wie sie das auflöst.', en: 'With the third statement the tension becomes open. It demands space for shops and workshops — the same space that statement 2 wants built on. Both cannot be fully right, and the series does not say how it resolves that.' },
          { de: 'Meine eigene Position: Bauen ja, aber gleichzeitig und nicht stattdessen. Ohne Regeln für den Bestand baut man zwanzig Jahre lang an einer Stadt, in der die heutigen Bewohner nicht mehr wohnen. Mit freundlichen Grüßen', en: 'My own position: build, yes, but at the same time and not instead. Without rules for existing housing, one spends twenty years building a city in which today’s residents no longer live. Yours sincerely' },
        ],
      },
      {
        band: 'C2', label: 'Ziel',
        note: 'The target. It refuses one premise outright, grants a second more than the writer '
          + 'wants to, and its conclusion is stated together with what would refute it. Note also '
          + 'that it is not longer than the C1 version — precision, not volume.',
        lines: [
          { de: 'Sehr geehrte Damen und Herren, drei Sätze Ihrer Serie werden regelmäßig zitiert, und alle drei haben denselben rhetorischen Bau: Sie erklären ein politisches Ergebnis zu einer Tatsache. Darauf möchte ich der Reihe nach eingehen.', en: 'Dear Sir or Madam, three sentences from your series are quoted regularly, and all three have the same rhetorical construction: they declare a political outcome to be a fact. I should like to address them in turn.' },
          { de: 'Der erste Satz ist der stärkste, weil er beschreibt, was Verdrängung mit der Zeitrechnung eines Lebens macht. Er hat allerdings einen Nachteil, den seine Schärfe verdeckt: Wer sich als „Gast auf Abruf“ versteht, hat sich bereits mit der Rolle abgefunden. Ich würde ihn deshalb umformulieren — nicht der Bewohner wird zum Gast, sondern die Stadt behandelt ihn wie einen. Der Unterschied ist keiner der Wortwahl; er entscheidet darüber, an wen sich eine Forderung richtet.', en: 'The first sentence is the strongest, because it describes what displacement does to the reckoning of a life. It has, however, a drawback that its sharpness conceals: whoever understands themselves as a “guest on call” has already accepted the role. I would therefore reformulate it — it is not the resident who becomes a guest, but the city that treats them as one. The difference is not one of wording; it decides whom a demand is addressed to.' },
          { de: 'Dem zweiten Satz gebe ich mehr recht, als mir lieb ist. Es wird zu wenig gebaut, und ein erheblicher Teil dessen, was als Verteilungspolitik firmiert, verwaltet die Knappheit, statt sie zu beenden. Nur ist der Zusatz „alles andere ist Ablenkung“ kein Befund, sondern eine Rangfolge — und Rangfolgen begründet man. Wenn Neubau frühestens ein halbes Jahrzehnt später wirkt, dann ist der Umgang mit dem Bestand nicht die Ablenkung, sondern die Überbrückung, ohne die der Neubau eine andere Bevölkerung vorfindet als die, für die er beschlossen wurde.', en: 'To the second sentence I concede more than I would like. Too little is being built, and a considerable part of what passes for distributive policy administers scarcity instead of ending it. But the addendum “everything else is a distraction” is not a finding but a ranking — and rankings require justification. If new building takes effect half a decade later at the earliest, then the handling of existing stock is not the distraction but the bridge, without which the new building meets a different population from the one it was decided for.' },
          { de: 'Der dritte Satz enthält eine falsche Alternative. Läden und Werkstätten verschwinden nicht, weil in der Mitte gewohnt wird — in den Gründerzeitvierteln geschah beides im selben Haus, und zwar über hundert Jahre. Sie verschwinden, weil Erdgeschossmieten sich an Filialisten orientieren. Wer Betrieb in der Stadt will, muss also über Gewerbemieten reden und nicht gegen das Wohnen.', en: 'The third sentence contains a false alternative. Shops and workshops do not disappear because people live in the centre — in the nineteenth-century districts both happened in the same building, and did so for over a hundred years. They disappear because ground-floor rents are set by reference to chain stores. Anyone who wants activity in the city must therefore talk about commercial rents and not against residential use.' },
          { de: 'Meine Position lautet daher: Das Problem ist gebaut, aber nicht in erster Linie im Wortsinn. Widerlegt wäre sie, wenn sich Städte fänden, die über zehn Jahre stark gebaut und dabei weder Verdrängung noch Ladensterben erlebt haben. Mir ist keine bekannt; ich lasse mich gern belehren. Mit freundlichen Grüßen', en: 'My position is therefore this: the problem is constructed, though not primarily in the literal sense. It would be refuted if cities could be found that built heavily over ten years and experienced neither displacement nor the death of their shops. I know of none; I am happy to be corrected. Yours sincerely' },
        ],
      },
    ],
  },

  speaking: C2_SPEAKING,
  redemittel: C2_REDEMITTEL,

  remedy: {
    reading: 'C2 reading is 80 minutes for four tasks and the last one — the adverts — is the '
      + 'cheapest on the paper and the one candidates run out of time for. Do Teil 4 *first* if you '
      + 'know you read slowly; nothing in the rubric requires the given order.',
    listening: 'Teil 1 and Teil 2 are heard **once** and their items turn on qualifiers rather than '
      + 'content: *überwiegend*, *erstmals*, *zunächst*, *angeblich*. Underline every qualifier in '
      + 'the statements during the reading time — that is what is being tested.',
    writing: 'Length is a trap at C2. Three hundred and fifty words that circle the topic score '
      + 'below three hundred and fifty that take one position and defend it against the strongest '
      + 'objection. Budget a third of your time for the objection.',
    speaking: 'Teil 2 is with the examiner, whose job is to press you. Being pressed is the task, '
      + 'not a verdict. The move that reads as C2 is conceding a point on purpose and saying why — '
      + 'not defending everything.',
  },

  briefing: [
    {
      q: 'Wie läuft die Prüfung ab?',
      a: 'Lesen 80 minutes, Hören 35, Schreiben 80, Sprechen about 15 — five minutes alone and then '
        + 'a discussion **with the examiner**, not with another candidate. Fifteen minutes of '
        + 'preparation for both oral parts together.',
    },
    {
      q: 'Wie viele Punkte brauche ich?',
      a: 'Sixty per cent of **each module**, like B2 and unlike C1. Each module certificates on its '
        + 'own and a failed one is resat alone, so a C2 candidate can legitimately sit Schreiben '
        + 'this spring and the rest next year.',
    },
    {
      q: 'Was ist an C2 wirklich anders?',
      a: 'Not speed and not length — precision. Every wrong option in Lesen Teil 1 is defensible if '
        + 'you read the paragraph alone, and the listening items hang on a single qualifying word. '
        + 'Vocabulary breadth stops separating candidates around here; what separates them is '
        + 'whether they can tell an author’s claim from a claim the author is reporting.',
    },
    {
      q: 'Muss ich muttersprachlich klingen?',
      a: 'No, and the criteria say so. C2 is *near-native command*, not native accent or idiom. An '
        + 'audible accent costs nothing. Saying almost-the-right-word costs a great deal.',
    },
  ],
};
