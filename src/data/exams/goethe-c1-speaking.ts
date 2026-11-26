// Goethe C1 · Sprechen — a presentation, then a negotiation.
//
//   Aufgabe 1  Vortrag       ~4 minutes alone, from a card with data on it
//   Aufgabe 2  Gemeinsame    a decision to reach together, with a real constraint
//              Aufgabe       that makes agreeing on everything impossible
//
// What separates C1 from B2 here is not vocabulary. It is that Aufgabe 1 hands
// you *material* — figures, a set of options, a short brief — and expects you to
// interpret rather than report it, and that Aufgabe 2 has a built-in scarcity:
// there is one budget, one slot, one prize, and a pair who politely agree with
// each other the whole way through has not done the task.
//
// Bands ladder B2 · C1 · C2.
import type { Redemittel, SpeakingTopic } from '../../lib/exam.ts';

const AUFGABE1: SpeakingTopic = {
  id: 'c1-sp1',
  teil: 1,
  title: 'Vortrag',
  titleEn: 'Presentation from material',
  minutes: 'circa 4 Minuten',
  task: 'Sie halten vor Ihrer Gesprächspartnerin / Ihrem Gesprächspartner einen kurzen Vortrag. '
    + 'Auf Ihrem Blatt finden Sie Zahlen zur Entwicklung des Lesens in Deutschland. Beschreiben Sie '
    + 'die wichtigsten Angaben, deuten Sie sie, stellen Sie einen Bezug zu Ihrem Heimatland her und '
    + 'schließen Sie mit einer eigenen Einschätzung. Sprechen Sie zusammenhängend.',
  taskEn: 'Four minutes from a card of figures. Describing them is the easy half and worth little — '
    + 'the marks are in interpreting them, connecting them to something you know, and committing to '
    + 'a reading of what they mean.',
  sheets: [
    {
      label: 'Ihr Blatt',
      text: 'Lesen in Deutschland — Angaben aus einer Erhebung',
      facts: [
        'Anteil der Erwachsenen, die täglich lesen: vor zwanzig Jahren 38 %, heute 26 %',
        'Durchschnittliche Lesezeit pro Tag: 41 Minuten (davon 17 Minuten auf dem Bildschirm)',
        'Zahl der jährlich verkauften Bücher: seit zehn Jahren nahezu unverändert',
        'Anteil der Vielleserinnen und Vielleser (mehr als ein Buch im Monat): 12 %, vor zwanzig Jahren 11 %',
        'Ausgaben pro Kopf für Bücher: real leicht gestiegen',
      ],
    },
  ],
  notes: [
    'Nicht alle Zahlen vorlesen. Zwei auswählen, die sich widersprechen — das ist die Deutung.',
    'Der Bezug zum Heimatland ist eine eigene Aufgabe und wird eigens bewertet.',
    'Zusammenhängend heißt: keine Aufzählung. Jede Zahl braucht ein „weil“, ein „obwohl“ oder ein „daraus folgt“.',
  ],
  prompts: [
    {
      id: 'c1-a1-vortrag', teil: 1, cue: 'Der Vortrag',
      de: 'Halten Sie den Vortrag anhand der Angaben auf Ihrem Blatt.',
      en: 'Give the talk from the figures on your card.',
      models: [
        {
          band: 'B2', label: 'Zu wenig',
          note: 'Reads the card out accurately and adds an opinion at the end. At B2 this passes; '
            + 'at C1 it fails the central criterion, because nothing has been *interpreted*.',
          lines: [
            { de: 'Auf meinem Blatt sehe ich Zahlen zum Lesen in Deutschland. Früher haben 38 Prozent täglich gelesen, heute sind es nur 26 Prozent.', en: 'On my card I see figures about reading in Germany. In the past 38 per cent read daily, today it is only 26 per cent.' },
            { de: 'Die Menschen lesen 41 Minuten pro Tag, davon 17 Minuten am Bildschirm. Die Zahl der verkauften Bücher ist gleich geblieben.', en: 'People read for 41 minutes a day, of which 17 minutes on screen. The number of books sold has stayed the same.' },
            { de: 'In meinem Land ist es ähnlich. Ich finde, man sollte mehr lesen.', en: 'In my country it is similar. I think people should read more.' },
          ],
        },
        {
          band: 'C1', label: 'Ziel',
          note: 'The target. It picks the two figures that contradict each other, builds the whole '
            + 'talk on the contradiction, and arrives at a claim the examiner could disagree with.',
          lines: [
            { de: 'Die Angaben auf meinem Blatt wirken auf den ersten Blick widersprüchlich, und genau darin liegt für mich das Interessante: Der Anteil der täglich Lesenden ist von 38 auf 26 Prozent gefallen, die Zahl der verkauften Bücher ist jedoch seit zehn Jahren nahezu unverändert.', en: 'The figures on my card seem contradictory at first glance, and that is precisely what I find interesting about them: the proportion of daily readers has fallen from 38 to 26 per cent, yet the number of books sold has remained virtually unchanged for ten years.' },
            { de: 'Auflösen lässt sich das über die vierte Angabe. Der Anteil der Vielleser ist mit zwölf Prozent praktisch konstant geblieben. Es lesen also nicht weniger Menschen viel — es lesen weniger Menschen überhaupt. Der Markt wird von einer kleinen Gruppe getragen, die es vorher auch schon gab.', en: 'That can be resolved via the fourth figure. The proportion of heavy readers has remained practically constant at twelve per cent. So it is not that fewer people read a lot — it is that fewer people read at all. The market is carried by a small group that existed before as well.' },
            { de: 'Bemerkenswert finde ich außerdem, dass von den 41 Minuten täglich bereits 17 auf den Bildschirm entfallen. Wer daraus schließt, das Lesen verschwinde, verwechselt das Medium mit der Tätigkeit.', en: 'I also find it notable that of the 41 minutes a day, 17 already fall to the screen. Anyone who concludes from that that reading is disappearing is confusing the medium with the activity.' },
            { de: 'In meinem Heimatland verläuft die Entwicklung ähnlich, allerdings mit einer Verschiebung: Dort ist nicht die Zahl der Lesenden zurückgegangen, sondern die Länge der Texte. Gelesen wird durchaus, nur selten länger als ein paar Absätze.', en: 'In my home country the development runs similarly, though with a shift: there it is not the number of readers that has declined but the length of the texts. Reading does take place, only rarely for more than a few paragraphs.' },
            { de: 'Meine eigene Einschätzung fällt deshalb weniger pessimistisch aus, als die erste Zahl nahelegt. Was zurückgeht, ist nicht das Lesen, sondern das beiläufige Lesen — und das ist ein Verlust, aber ein anderer als der, über den meistens geklagt wird.', en: 'My own assessment is therefore less pessimistic than the first figure suggests. What is declining is not reading but incidental reading — and that is a loss, but a different one from the one usually complained about.' },
          ],
        },
        {
          band: 'C2', label: 'Stark',
          note: 'Questions the data itself before using it. At C2 this is expected rather than '
            + 'impressive; at C1 it is the single cheapest way to sound like you belong above the band.',
          lines: [
            { de: 'Bevor ich die Zahlen deute, ein Vorbehalt: „Täglich lesen“ ist in solchen Erhebungen eine Selbstauskunft, und Selbstauskünfte über Lesen fallen bekanntlich großzügig aus. Der Rückgang von 38 auf 26 Prozent könnte also ebenso gut ein Rückgang der sozialen Erwünschtheit sein.', en: 'Before I interpret the figures, a caveat: “reading daily” in surveys like this is self-reported, and self-reports about reading are famously generous. The decline from 38 to 26 per cent could therefore just as well be a decline in social desirability.' },
            { de: 'Unter diesem Vorbehalt bleibt die Konstellation dennoch aufschlussreich, denn die harten Größen — verkaufte Bücher, Ausgaben pro Kopf — bewegen sich kaum, und sie unterliegen der Selbstauskunft nicht.', en: 'Subject to that caveat, the constellation nevertheless remains revealing, because the hard figures — books sold, spending per head — barely move, and they are not subject to self-reporting.' },
            { de: 'Was sich also nachweisen lässt, ist eine Polarisierung: eine stabile Minderheit, die den Markt trägt, und eine wachsende Mehrheit, für die Lesen keine Selbstverständlichkeit mehr ist. Das ist kulturpolitisch etwas ganz anderes als ein allgemeiner Rückgang und verlangt andere Maßnahmen.', en: 'What can be demonstrated, then, is a polarisation: a stable minority carrying the market and a growing majority for whom reading is no longer a matter of course. In cultural-policy terms that is something quite different from a general decline and calls for different measures.' },
          ],
        },
      ],
    },
  ],
};

const AUFGABE2: SpeakingTopic = {
  id: 'c1-sp2',
  teil: 2,
  title: 'Gemeinsame Aufgabe',
  titleEn: 'Reach a decision together',
  minutes: 'circa 5 Minuten',
  task: 'Ihre Volkshochschule hat 6.000 Euro aus einer Spende erhalten und will damit ein einziges '
    + 'Vorhaben finanzieren. Vier Vorschläge liegen vor. Diskutieren Sie die Vorschläge, wägen Sie '
    + 'ab und einigen Sie sich am Ende auf genau einen. Begründen Sie Ihre Entscheidung gemeinsam.',
  taskEn: 'One budget, four proposals, and you must come out with one. The scarcity is deliberate: '
    + 'a pair who agree politely throughout has not done the task, and both candidates are marked '
    + 'down for it.',
  sheets: [
    {
      label: 'Die Vorschläge',
      text: 'Sechstausend Euro, ein Vorhaben',
      facts: [
        'A · Ein Lesesaal mit zwanzig ruhigen Arbeitsplätzen — einmalige Anschaffung, danach kostenlos',
        'B · Kostenlose Sprachkurse für dreißig Neuzugewanderte, ein Jahr lang',
        'C · Eine Vortragsreihe mit bekannten Gästen, sechs Abende, hohe öffentliche Aufmerksamkeit',
        'D · Zuschüsse zu den Kursgebühren, damit niemand aus finanziellen Gründen absagen muss',
      ],
    },
  ],
  notes: [
    'Die Entscheidung ist Pflicht. Ohne sie ist die Aufgabe nicht erfüllt, wie gut auch immer diskutiert wurde.',
    'Widersprechen Sie mindestens einmal deutlich — sonst gibt es keine Interaktion zu bewerten.',
    'Ein guter Schluss nennt auch, was man aufgibt: „Wir verzichten damit bewusst auf …“',
  ],
  prompts: [
    {
      id: 'c1-a2-abwaegen', teil: 2, cue: 'Vorschläge gegeneinander abwägen',
      de: 'Wägen Sie zwei der Vorschläge gegeneinander ab.',
      en: 'Weigh two of the proposals against each other — with a criterion, not a preference.',
      models: [
        {
          band: 'B2', label: 'Zu wenig',
          note: 'States preferences. Nothing here could be argued with, because no criterion has '
            + 'been named — which also means the partner has nothing to react to.',
          lines: [
            { who: 'A', de: 'Ich finde Vorschlag A gut, weil ein Lesesaal für alle da ist.', en: 'I think proposal A is good, because a reading room is there for everyone.' },
            { who: 'B', de: 'Ja, aber B ist auch wichtig. Sprachkurse helfen den Menschen sehr.', en: 'Yes, but B is important too. Language courses help people a lot.' },
          ],
        },
        {
          band: 'C1', label: 'Ziel',
          note: 'The target. A criterion is proposed, the partner accepts it and then uses it '
            + 'against the first speaker — which is what a discussion at this level looks like.',
          lines: [
            { who: 'A', de: 'Bevor wir einzelne Vorschläge bewerten, sollten wir uns auf ein Kriterium einigen. Mir scheint das entscheidende zu sein, wie lange die Wirkung anhält, nachdem das Geld ausgegeben ist.', en: 'Before we assess individual proposals, we should agree on a criterion. It seems to me the decisive one is how long the effect lasts after the money has been spent.' },
            { who: 'B', de: 'Einverstanden, und genau mit diesem Kriterium würde ich gegen Ihren Lesesaal argumentieren. Zwanzig Arbeitsplätze halten zehn Jahre, das stimmt — aber sie erreichen nur die, die ohnehin kommen. Die Sprachkurse laufen zwar nur ein Jahr, verändern in diesem Jahr aber die Lage von dreißig Menschen dauerhaft.', en: 'Agreed, and it is with exactly that criterion that I would argue against your reading room. Twenty workplaces last ten years, true — but they only reach those who come anyway. The language courses run for only a year, but in that year they permanently change the situation of thirty people.' },
            { who: 'A', de: 'Das ist ein starkes Argument, und ich gebe Ihnen im Punkt der Reichweite recht. Bedenken hätte ich beim Wort „dauerhaft“: Ein Jahr Kurs reicht selten bis zu einer Prüfung. Ohne Anschlussfinanzierung finanzieren wir dann einen Anfang, der nicht zu Ende geführt wird.', en: 'That is a strong argument, and I concede your point on reach. My reservation would be with the word “permanently”: a year of classes rarely gets you as far as an exam. Without follow-up funding we would then be financing a beginning that is not seen through.' },
          ],
        },
        {
          band: 'C2', label: 'Stark',
          note: 'Reframes what the money is *for* before comparing anything. Expensive in seconds '
            + 'and cheap in words — one sentence changes the whole discussion.',
          lines: [
            { who: 'A', de: 'Mir fällt auf, dass drei der vier Vorschläge etwas Neues schaffen wollen und nur einer — die Zuschüsse — verhindert, dass etwas Bestehendes wegbricht. Das ist keine Detailfrage, sondern die eigentliche Entscheidung: Wollen wir wachsen oder wollen wir halten?', en: 'It strikes me that three of the four proposals want to create something new and only one — the subsidies — prevents something existing from falling away. That is not a matter of detail but the actual decision: do we want to grow or do we want to hold on to what we have?' },
            { who: 'B', de: 'So gestellt fällt mir die Antwort leichter, als mir lieb ist. Eine Vortragsreihe, die niemand vermisst hätte, gegen Kursplätze, die ohne Zuschuss verfallen — da ist das Sichtbare eindeutig das Verzichtbare.', en: 'Put that way, the answer comes to me more easily than I would like. A lecture series nobody would have missed, against course places that lapse without a subsidy — there the visible option is clearly the dispensable one.' },
          ],
        },
      ],
    },
    {
      id: 'c1-a2-einigen', teil: 2, cue: 'Sich einigen',
      de: 'Einigen Sie sich am Ende auf genau einen Vorschlag und begründen Sie die Entscheidung.',
      en: 'Land it. The task names this explicitly and pairs run out of time and skip it.',
      models: [
        {
          band: 'B2', label: 'Zu wenig',
          note: 'Two people agreeing to differ. The task asked for one proposal.',
          lines: [
            { who: 'A', de: 'Also, ich bin für A und Sie sind für B. Beide Vorschläge sind gut.', en: 'Well, I am for A and you are for B. Both proposals are good.' },
          ],
        },
        {
          band: 'C1', label: 'Ziel',
          note: 'Decides, gives the shared reason, and names what is being given up — the third '
            + 'move is what makes it sound like a decision rather than a surrender.',
          lines: [
            { who: 'B', de: 'Dann halten wir fest: Wir entscheiden uns für die Zuschüsse, Vorschlag D. Ausschlaggebend war für uns beide, dass damit niemand ausgeschlossen wird, der schon da ist.', en: 'Then let us record: we are deciding on the subsidies, proposal D. What was decisive for both of us was that it means nobody who is already here gets excluded.' },
            { who: 'A', de: 'Und wir verzichten damit bewusst auf die Vortragsreihe, obwohl sie der Volkshochschule die meiste Aufmerksamkeit gebracht hätte. Das war die schwerste der vier Entscheidungen.', en: 'And in doing so we are deliberately giving up the lecture series, even though it would have brought the adult education centre the most attention. That was the hardest of the four decisions.' },
          ],
        },
        {
          band: 'C2', label: 'Stark',
          note: 'Adds the condition under which the decision would have gone the other way. It '
            + 'shows the choice was reasoned rather than preferred.',
          lines: [
            { who: 'B', de: 'Wir einigen uns auf D, allerdings unter einer Annahme, die wir offenlegen sollten: dass die Zahl der Absagen aus finanziellen Gründen tatsächlich so hoch ist, wie in der Vorlage behauptet. Wäre sie halb so hoch, hätte der Lesesaal das bessere Verhältnis von Aufwand und Wirkung.', en: 'We are settling on D, though on an assumption we should make explicit: that the number of cancellations for financial reasons really is as high as the paper claims. If it were half as high, the reading room would have the better ratio of cost to effect.' },
          ],
        },
      ],
    },
  ],
};

export const C1_SPEAKING: SpeakingTopic[] = [AUFGABE1, AUFGABE2];

export const C1_REDEMITTEL: Redemittel[] = [
  {
    group: 'Zahlen deuten, nicht vorlesen',
    phrases: [
      { de: 'Auf den ersten Blick wirken die Angaben widersprüchlich.', en: 'At first glance the figures seem contradictory.' },
      { de: 'Auflösen lässt sich das über die dritte Angabe.', en: 'That can be resolved via the third figure.' },
      { de: 'Daraus folgt jedoch nicht, dass …', en: 'It does not, however, follow from this that …' },
      { de: 'Wer daraus schließt, dass …, verwechselt … mit …', en: 'Anyone who concludes from this that … is confusing … with …' },
      { de: 'Bemerkenswert ist weniger die Zahl selbst als ihr Verhältnis zu …', en: 'What is remarkable is less the figure itself than its relation to …' },
    ],
  },
  {
    group: 'Einen Vorbehalt anmelden',
    phrases: [
      { de: 'Vorausgeschickt sei, dass …', en: 'Let it be said in advance that …' },
      { de: 'Unter diesem Vorbehalt bleibt festzuhalten, dass …', en: 'Subject to that caveat, it remains the case that …' },
      { de: 'Das setzt allerdings voraus, dass …', en: 'That does presuppose, however, that …' },
      { de: 'Ob sich das verallgemeinern lässt, halte ich für offen.', en: 'Whether that can be generalised I consider an open question.' },
    ],
  },
  {
    group: 'Ein Kriterium setzen',
    phrases: [
      { de: 'Bevor wir bewerten, sollten wir uns auf ein Kriterium einigen.', en: 'Before we assess, we should agree on a criterion.' },
      { de: 'Entscheidend scheint mir zu sein, ob …', en: 'What seems decisive to me is whether …' },
      { de: 'Mit genau diesem Kriterium würde ich gegen … argumentieren.', en: 'It is with exactly that criterion that I would argue against …' },
      { de: 'Gemessen daran schneidet … deutlich besser ab.', en: 'Measured by that, … performs considerably better.' },
    ],
  },
  {
    group: 'Zugestehen und trotzdem widersprechen',
    phrases: [
      { de: 'Im Punkt … gebe ich Ihnen recht, Bedenken hätte ich bei …', en: 'On the point of … I concede, my reservation would be with …' },
      { de: 'Das ist ein starkes Argument — es trägt aber nur, wenn …', en: 'That is a strong argument — but it only holds if …' },
      { de: 'So gestellt fällt mir die Antwort leichter, als mir lieb ist.', en: 'Put that way, the answer comes to me more easily than I would like.' },
    ],
  },
  {
    group: 'Zu einem Ergebnis kommen',
    phrases: [
      { de: 'Dann halten wir fest: Wir entscheiden uns für …', en: 'Then let us record: we are deciding on …' },
      { de: 'Ausschlaggebend war für uns beide, dass …', en: 'What was decisive for both of us was that …' },
      { de: 'Wir verzichten damit bewusst auf …', en: 'In doing so we are deliberately giving up …' },
      { de: 'Unter einer anderen Annahme wäre die Entscheidung anders ausgefallen.', en: 'Under a different assumption the decision would have gone otherwise.' },
    ],
  },
];
