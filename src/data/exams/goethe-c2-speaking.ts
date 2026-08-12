// Goethe C2 · Sprechen — the last oral, and the only one with no safety net.
//
//   Teil 1  Produktion   ~5 minutes on a topic, alone, then questions
//   Teil 2  Interaktion   a discussion with the examiner, not a partner
//
// The band descriptors stop rewarding correctness at C2 — correctness is assumed
// — and start rewarding *precision*: saying the thing you meant rather than the
// nearest thing you could say. In practice that means three habits. Concede
// before you are pushed. Distinguish claims that are being run together. And be
// willing to say what would change your mind.
//
// Teil 2 is with the examiner rather than another candidate, which candidates
// find harder than it sounds: there is no one to share the silence with, and
// the examiner will press. Being pressed is the task, not a sign of failing.
//
// Bands ladder B2 · C1 · C2 — two below the paper's own level, because at C2 the
// interesting comparison is with what an educated non-native speaker who is
// *already fluent* would say, and where that still falls short.
import type { Redemittel, SpeakingTopic } from '../../lib/exam.ts';

const TEIL1: SpeakingTopic = {
  id: 'c2-sp1',
  teil: 1,
  title: 'Produktion — Vortrag',
  titleEn: 'Speak on a topic, alone',
  minutes: 'circa 5 Minuten, dann Fragen',
  task: 'Wählen Sie eines der beiden Themen. Äußern Sie sich circa fünf Minuten zusammenhängend '
    + 'dazu. Berücksichtigen Sie dabei verschiedene Aspekte, ordnen Sie sie und kommen Sie zu einer '
    + 'begründeten eigenen Position. Im Anschluss beantworten Sie Fragen Ihrer Prüferin / Ihres '
    + 'Prüfers.',
  taskEn: 'Five minutes, alone, from a bare topic — no card of figures, no bullet points. The '
    + 'structure is entirely yours to impose, and imposing one visibly is most of the mark.',
  sheets: [
    {
      label: 'Die Themen',
      text: 'Wählen Sie eines',
      facts: [
        'Thema 1 · Was verlieren wir, wenn Wissen jederzeit abrufbar ist?',
        'Thema 2 · Sollte kulturelles Erbe um jeden Preis erhalten werden?',
      ],
    },
  ],
  notes: [
    'Fünf Minuten sind sehr lang. Drei Aspekte, nicht fünf — und jeder mit einem Beispiel.',
    'Die Prüferin fragt nach der schwächsten Stelle. Nennen Sie sie lieber selbst.',
    'Eine Position ist Pflicht. „Es kommt darauf an“ ist keine, wenn nicht gesagt wird, worauf.',
  ],
  prompts: [
    {
      id: 'c2-t1-wissen', teil: 1, cue: 'Thema 1: abrufbares Wissen',
      de: 'Äußern Sie sich zusammenhängend zu der Frage, was wir verlieren, wenn Wissen jederzeit '
        + 'abrufbar ist.',
      en: 'Speak on the question of what we lose when knowledge is always retrievable.',
      models: [
        {
          band: 'B2', label: 'Zu wenig',
          note: 'Fluent, accurate and organised — and it answers a question nobody asked, because '
            + 'it argues about whether the internet is good rather than about what is *lost*.',
          lines: [
            { de: 'Heute kann man alles im Internet finden. Das hat viele Vorteile: Man spart Zeit und findet Informationen sofort.', en: 'Today you can find everything on the internet. That has many advantages: you save time and find information immediately.' },
            { de: 'Es gibt aber auch Nachteile. Viele Menschen merken sich nichts mehr, weil sie alles nachschlagen können. Außerdem sind nicht alle Informationen richtig.', en: 'But there are disadvantages too. Many people no longer remember anything because they can look everything up. Besides, not all information is correct.' },
            { de: 'Meiner Meinung nach überwiegen trotzdem die Vorteile. Man muss nur lernen, kritisch zu sein.', en: 'In my opinion the advantages nevertheless outweigh. You just have to learn to be critical.' },
          ],
        },
        {
          band: 'C1', label: 'Solide',
          note: 'Answers the actual question, in three ordered aspects, with a position at the end. '
            + 'This is a good C1 performance and would be marked as one.',
          lines: [
            { de: 'Ich möchte die Frage in drei Schritten angehen: was sich am Gedächtnis ändert, was sich am Urteil ändert, und was sich an unserem Verhältnis zum Nichtwissen ändert.', en: 'I would like to approach the question in three steps: what changes about memory, what changes about judgement, and what changes about our relationship to not knowing.' },
            { de: 'Zum Gedächtnis: Wir behalten heute weniger Inhalte und mehr Wege zu Inhalten. Das ist kein Verlust an Leistung, sondern eine Verlagerung — vergleichbar damit, dass kaum jemand mehr Telefonnummern auswendig kann.', en: 'On memory: today we retain fewer contents and more routes to contents. That is not a loss of capacity but a shift — comparable to the fact that hardly anyone knows telephone numbers by heart any more.' },
            { de: 'Beim Urteil sehe ich den ernsteren Punkt. Wer eine Frage in Sekunden beantwortet bekommt, verliert die Zeit, in der sich früher ein eigener Verdacht gebildet hat. Diese Zwischenzeit war unproduktiv und offenbar wichtig.', en: 'On judgement I see the more serious point. Someone who gets a question answered in seconds loses the time in which a suspicion of their own used to form. That interval was unproductive and evidently important.' },
            { de: 'Zusammenfassend: Was wir verlieren, ist weniger Wissen als Ungewissheit — und mit ihr eine bestimmte Form von Neugier. Ich halte das für einen realen Verlust, aber nicht für einen, der sich durch Verzicht rückgängig machen ließe.', en: 'To sum up: what we lose is less knowledge than uncertainty — and with it a certain form of curiosity. I consider that a real loss, but not one that could be undone by abstention.' },
          ],
        },
        {
          band: 'C2', label: 'Ziel',
          note: 'The target, and the difference is precision rather than range. It refuses a false '
            + 'premise, separates two senses of “losing”, and states the condition under which its '
            + 'own conclusion would be wrong.',
          lines: [
            { de: 'Die Frage enthält eine Voraussetzung, die ich zunächst prüfen möchte: dass Wissen jederzeit abrufbar sei. Abrufbar sind Antworten. Wissen im strengen Sinn — begründete, verknüpfte, verfügbare Überzeugung — war noch nie abrufbar und ist es auch heute nicht.', en: 'The question contains a presupposition I would like to examine first: that knowledge is retrievable at any time. Answers are retrievable. Knowledge in the strict sense — justified, connected, available conviction — has never been retrievable and is not today either.' },
            { de: 'Damit zerfällt die Frage in zwei sehr verschiedene. Die erste ist eine Frage der Ökonomie: Wir behalten weniger, weil Behalten billiger geworden ist, sich zu erinnern, wo etwas steht. Darüber lohnt sich wenig Aufregung; so verhalten sich Menschen zu jeder Speichertechnik seit der Schrift, und Platon hat sich schon über diese beklagt.', en: 'That splits the question into two very different ones. The first is a question of economics: we retain less because retaining has become cheaper as remembering where something is. Little excitement is warranted there; people have behaved that way towards every storage technology since writing, and Plato already complained about that one.' },
            { de: 'Die zweite ist die interessante. Sie betrifft nicht das Behalten, sondern das Aushalten. Eine Frage, die nicht sofort beantwortet wird, erzeugt einen Zustand — nennen wir ihn produktive Verlegenheit —, in dem man Vermutungen bildet, Zusammenhänge probiert und sich dabei gelegentlich irrt. Genau dieser Zustand wird von sofortiger Verfügbarkeit zuverlässig beendet, und zwar bevor er etwas hervorgebracht hat.', en: 'The second is the interesting one. It concerns not retaining but enduring. A question that is not answered immediately produces a state — let us call it productive embarrassment — in which one forms conjectures, tries out connections and occasionally gets things wrong. It is precisely this state that immediate availability reliably terminates, and does so before it has produced anything.' },
            { de: 'Meine Position lautet daher: Der Verlust ist real, betrifft aber nicht das Wissen, sondern seine Entstehungsbedingungen. Falsifizieren ließe sie sich leicht — wenn sich zeigte, dass Menschen, die Antworten sofort erhalten, ebenso viele eigene Fragen stellen wie jene, die warten mussten, wäre mein Argument hinfällig. Mir ist keine Untersuchung bekannt, die das täte; ausgeschlossen ist es nicht.', en: 'My position is therefore this: the loss is real, but it concerns not knowledge itself but the conditions under which it comes about. It would be easy to falsify — if it were shown that people who receive answers immediately ask as many questions of their own as those who had to wait, my argument would collapse. I know of no study that does so; it is not ruled out.' },
          ],
        },
      ],
    },
  ],
};

const TEIL2: SpeakingTopic = {
  id: 'c2-sp2',
  teil: 2,
  title: 'Interaktion — Diskussion mit der Prüferin',
  titleEn: 'Discussion with the examiner',
  minutes: 'circa 5 Minuten',
  task: 'Sie führen ein Gespräch mit Ihrer Prüferin / Ihrem Prüfer über die These: „Eine Sprache, '
    + 'die niemand mehr als Muttersprache spricht, ist tot und sollte nicht künstlich am Leben '
    + 'gehalten werden.“ Vertreten Sie einen Standpunkt, gehen Sie auf Einwände ein und '
    + 'differenzieren Sie, wo es nötig ist.',
  taskEn: 'Not a partner — the examiner, whose job is to press. Being pressed is the task. A '
    + 'candidate who holds a position under pressure without either collapsing or repeating '
    + 'themselves is doing precisely what the band descriptor asks.',
  notes: [
    'Die Prüferin widerspricht auch dann, wenn sie zustimmt. Nehmen Sie es nicht als Urteil.',
    'Nachgeben ist erlaubt und wird belohnt — aber begründet, nicht aus Höflichkeit.',
    'Wenn Sie etwas nicht wissen, sagen Sie es und sagen Sie, was Sie stattdessen wissen.',
  ],
  prompts: [
    {
      id: 'c2-t2-these', teil: 2, cue: 'Zur These Stellung nehmen',
      de: 'Nehmen Sie zu der These Stellung.',
      en: 'Respond to the proposition.',
      models: [
        {
          band: 'B2', label: 'Zu wenig',
          note: 'A clear position with a reason, expressed fluently. What is missing is any '
            + 'engagement with the words of the proposition itself — *tot*, *künstlich* — which is '
            + 'where the whole argument is hiding.',
          lines: [
            { who: 'K', de: 'Ich bin nicht einverstanden. Sprachen sind ein wichtiger Teil der Kultur, deshalb sollte man sie schützen.', en: 'I disagree. Languages are an important part of culture, so they should be protected.' },
          ],
        },
        {
          band: 'C1', label: 'Solide',
          note: 'Takes the proposition apart before answering it, and concedes something real. '
            + 'A strong C1 answer.',
          lines: [
            { who: 'K', de: 'Der These liegt eine Gleichsetzung zugrunde, die ich nicht teile: dass eine Sprache ohne Muttersprachler tot sei. Hebräisch war in diesem Sinne jahrhundertelang tot und ist es heute nicht mehr.', en: 'The proposition rests on an equation I do not share: that a language without native speakers is dead. Hebrew was dead in that sense for centuries and is no longer so today.' },
            { who: 'K', de: 'Zugeben würde ich allerdings, dass „am Leben halten“ oft heißt: von einigen wenigen bezahlten Stellen abhängig sein. Das ist etwas anderes als eine lebendige Sprachgemeinschaft, und diesen Unterschied verwischt die Sprachpolitik gern.', en: 'I would concede, however, that “keeping alive” often means being dependent on a few paid positions. That is something different from a living speech community, and language policy is fond of blurring that distinction.' },
          ],
        },
        {
          band: 'C2', label: 'Ziel',
          note: 'Names what the proposition is really asking — a question about cost, dressed as a '
            + 'question about biology — and answers *that*. Then gives up ground on purpose.',
          lines: [
            { who: 'K', de: 'Bevor ich zustimme oder widerspreche: Die These ist als biologische formuliert — tot, am Leben halten, künstlich —, und sie ist keine. Sie ist eine Frage nach Kosten und danach, wer sie trägt. In dieser Übersetzung wird sie beantwortbar.', en: 'Before I agree or disagree: the proposition is formulated as a biological one — dead, keeping alive, artificial — and it is not one. It is a question about costs and about who bears them. Translated that way it becomes answerable.' },
            { who: 'P', de: 'Aber die Metapher ist doch nicht falsch. Eine Sprache ohne Sprecher hat keine Zukunft.', en: 'But the metaphor is not wrong, surely. A language without speakers has no future.' },
            { who: 'K', de: 'Sie ist nicht falsch, sie ist folgenreich. Wer vom Sterben spricht, macht aus einer Entscheidung ein Naturereignis — und Naturereignisse trägt man, statt sie zu verantworten. Dass die meisten dieser Sprachen nicht gestorben sind, sondern verdrängt wurden, verschwindet in dem Bild vollständig.', en: 'It is not wrong, it is consequential. To speak of dying turns a decision into a natural event — and natural events are borne rather than answered for. That most of these languages did not die but were displaced disappears from the image completely.' },
            { who: 'K', de: 'In einem Punkt gebe ich Ihnen dennoch nach: Es gibt Fälle, in denen Erhaltung gegen den Willen der letzten Sprecher betrieben wird, meist von außen und meist mit dem besten Gewissen. Da halte ich die These für richtig — und zwar aus genau dem Grund, den sie selbst nicht nennt.', en: 'On one point I nevertheless give way to you: there are cases in which preservation is pursued against the will of the last speakers, usually from outside and usually with the best of consciences. There I consider the proposition right — and for exactly the reason it does not itself state.' },
          ],
        },
      ],
    },
    {
      id: 'c2-t2-druck', teil: 2, cue: 'Unter Druck bleiben',
      de: 'Die Prüferin hakt nach: „Sie weichen aus. Ja oder nein — sollte öffentliches Geld dafür '
        + 'ausgegeben werden?“',
      en: 'The examiner presses for a yes or a no. Refusing the binary is legitimate exactly once, '
        + 'and only if you then answer.',
      models: [
        {
          band: 'B2', label: 'Zu wenig',
          note: 'Answers the yes/no and adds nothing. Under pressure this reads as capitulation '
            + 'rather than decisiveness, because no reason survives the concession.',
          lines: [
            { who: 'K', de: 'Ja, ich denke schon. Es ist wichtig für die Kultur.', en: 'Yes, I think so. It is important for the culture.' },
          ],
        },
        {
          band: 'C1', label: 'Solide',
          note: 'Answers, then qualifies. The order matters — qualifying first and answering '
            + 'afterwards is what reads as evasion.',
          lines: [
            { who: 'K', de: 'Ja. Aber unter einer Bedingung, die ich für entscheidend halte: Das Geld sollte an die Sprechergemeinschaft gehen und nicht an ein Archiv. Dokumentation ist billig und erhält niemanden.', en: 'Yes. But on a condition I consider decisive: the money should go to the speech community and not to an archive. Documentation is cheap and preserves nobody.' },
          ],
        },
        {
          band: 'C2', label: 'Ziel',
          note: 'Concedes the evasion before defending it, then answers, then names what would '
            + 'change the answer. Three moves in four sentences — this is what C2 range buys you.',
          lines: [
            { who: 'K', de: 'Der Vorwurf ist berechtigt, ich habe tatsächlich ausgeweicht — allerdings nicht aus Verlegenheit, sondern weil „dafür“ zwei Dinge meinen kann, die ich unterschiedlich beantworte.', en: 'The reproach is justified, I did indeed evade — not out of embarrassment, though, but because “for that” can mean two things which I answer differently.' },
            { who: 'K', de: 'Für Unterricht, den eine Gemeinschaft selbst nachfragt: ja, ohne Einschränkung, und zwar aus demselben Grund, aus dem wir öffentliche Bibliotheken finanzieren. Für Rettungsprogramme, die eine Sprache erhalten wollen, deren Sprecher sie nicht weitergeben: nein.', en: 'For teaching that a community itself asks for: yes, without qualification, and for the same reason we fund public libraries. For rescue programmes that seek to preserve a language whose speakers do not pass it on: no.' },
            { who: 'K', de: 'Die Grenze liegt also nicht bei der Sprache, sondern bei der Frage, wer den Wunsch geäußert hat. Sollte sich herausstellen, dass dieser Wunsch häufiger vorhanden und nur nicht hörbar ist, verschiebt sich meine Antwort — und ich hielte das für den wahrscheinlicheren Fall.', en: 'The line therefore lies not with the language but with the question of who has expressed the wish. Should it turn out that this wish is more often present and merely inaudible, my answer shifts — and I would consider that the more likely case.' },
          ],
        },
      ],
    },
  ],
};

export const C2_SPEAKING: SpeakingTopic[] = [TEIL1, TEIL2];

export const C2_REDEMITTEL: Redemittel[] = [
  {
    group: 'Eine Voraussetzung prüfen',
    phrases: [
      { de: 'Die Frage enthält eine Voraussetzung, die ich zunächst prüfen möchte.', en: 'The question contains a presupposition I would like to examine first.' },
      { de: 'Der These liegt eine Gleichsetzung zugrunde, die ich nicht teile.', en: 'The proposition rests on an equation I do not share.' },
      { de: 'In dieser Übersetzung wird die Frage beantwortbar.', en: 'Translated that way the question becomes answerable.' },
      { de: 'Damit zerfällt die Frage in zwei sehr verschiedene.', en: 'That splits the question into two very different ones.' },
    ],
  },
  {
    group: 'Unterscheiden',
    phrases: [
      { de: 'Das eine ist eine Frage der Ökonomie, das andere eine der Verantwortung.', en: 'The one is a question of economics, the other of responsibility.' },
      { de: 'Es betrifft nicht das Behalten, sondern das Aushalten.', en: 'It concerns not retaining but enduring.' },
      { de: '„Dafür“ kann zweierlei meinen, und ich beantworte beides unterschiedlich.', en: '“For that” can mean two things, and I answer each differently.' },
      { de: 'Die Grenze liegt nicht bei …, sondern bei der Frage, wer …', en: 'The line lies not with … but with the question of who …' },
    ],
  },
  {
    group: 'Nachgeben, ohne einzuknicken',
    phrases: [
      { de: 'Der Vorwurf ist berechtigt — allerdings nicht aus dem Grund, den Sie vermuten.', en: 'The reproach is justified — though not for the reason you suspect.' },
      { de: 'In einem Punkt gebe ich Ihnen nach: …', en: 'On one point I give way to you: …' },
      { de: 'Es ist nicht falsch, es ist folgenreich.', en: 'It is not wrong, it is consequential.' },
      { de: 'Da halte ich die These für richtig, und zwar aus einem Grund, den sie selbst nicht nennt.', en: 'There I consider the proposition right, for a reason it does not itself state.' },
    ],
  },
  {
    group: 'Die eigene Position begrenzen',
    phrases: [
      { de: 'Falsifizieren ließe sich das leicht: …', en: 'That would be easy to falsify: …' },
      { de: 'Wäre das gezeigt, wäre mein Argument hinfällig.', en: 'Were that shown, my argument would collapse.' },
      { de: 'Mir ist keine Untersuchung bekannt, die das täte; ausgeschlossen ist es nicht.', en: 'I know of no study that does so; it is not ruled out.' },
      { de: 'Sollte sich herausstellen, dass …, verschiebt sich meine Antwort.', en: 'Should it turn out that …, my answer shifts.' },
    ],
  },
];
