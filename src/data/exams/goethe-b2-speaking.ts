// Goethe B2 · Sprechen — the level where you stop answering and start arguing.
//
// Two parts, not three, and that is the structural news:
//
//   Teil 1  Vortrag halten     ~4 minutes alone, then questions from your partner
//   Teil 2  Diskussion führen  a position, a reaction, and a summary at the end
//
// A1 and A2 reward *saying more*. B2 rewards saying it in an order. Teil 1 is
// marked on having an Einleitung, a Hauptteil and a Schluss that the examiner can
// hear the joins of; Teil 2 is marked on **reacting** — a candidate who delivers
// two beautiful prepared minutes and never once picks up what the other person
// said has failed the interaction criterion with perfect German.
//
// Bands ladder B1 · B2 · C1: one below to show what falls short and why, and one
// above so the reach is visible without pretending it is required.
import type { Redemittel, SpeakingTopic } from '../../lib/exam.ts';

const TEIL1: SpeakingTopic = {
  id: 'b2-sp1',
  teil: 1,
  title: 'Vortrag halten',
  titleEn: 'Give a short talk',
  minutes: '4 Minuten Vortrag, dann Fragen',
  task: 'Sie nehmen an einem Seminar teil und sollen dort einen kurzen Vortrag halten. Wählen Sie '
    + 'ein Thema aus. Ihre Gesprächspartnerin / Ihr Gesprächspartner hört zu und stellt Ihnen '
    + 'anschließend Fragen. Strukturieren Sie Ihren Vortrag mit einer Einleitung, einem Hauptteil '
    + 'und einem Schluss. Sprechen Sie circa vier Minuten.',
  taskEn: 'Four minutes, alone, on one of two topics — then your partner asks you questions. The '
    + 'structure is marked as heavily as the language: the examiner must be able to hear where the '
    + 'introduction ends and where you are summing up.',
  notes: [
    'Die Gliederung muss hörbar sein: „Ich möchte über … sprechen“ — „Zunächst …“ — „Zusammenfassend …“',
    'Beschreiben Sie mehrere Möglichkeiten, nicht nur Ihre eigene. Die Aufgabe verlangt Alternativen.',
    'Bewerten Sie am Ende. Ein Vortrag, der nur beschreibt, erfüllt die Aufgabe nur zur Hälfte.',
    'Vier Minuten sind lang. Notieren Sie in der Vorbereitungszeit drei Punkte, nicht drei Sätze.',
  ],
  prompts: [
    {
      id: 'b2-t1-wohnen', teil: 1, cue: 'Thema A: Wohnen in der Stadt oder auf dem Land',
      de: 'Halten Sie einen kurzen Vortrag: Beschreiben Sie mehrere Möglichkeiten, nennen Sie Vor- '
        + 'und Nachteile und bewerten Sie diese. Beschreiben Sie eine Möglichkeit genauer.',
      en: 'Give the talk: describe several options, give advantages and disadvantages, evaluate them, '
        + 'and take one option further than the others.',
      models: [
        {
          band: 'B1', label: 'Zu wenig',
          note: 'Everything here is correct German — and it still loses marks, because it is a list '
            + 'of opinions with no visible structure and no evaluation. Worth reading as a warning.',
          lines: [
            { de: 'Ich möchte über Wohnen sprechen. In der Stadt gibt es viele Geschäfte und man kann alles schnell erreichen.', en: 'I would like to talk about housing. In the city there are lots of shops and you can reach everything quickly.' },
            { de: 'Aber die Wohnungen sind teuer und es ist laut. Auf dem Land ist es ruhiger und billiger.', en: 'But the flats are expensive and it is noisy. In the country it is quieter and cheaper.' },
            { de: 'Man braucht aber ein Auto. Ich wohne lieber in der Stadt. Das ist alles, danke.', en: 'But you need a car. I prefer to live in the city. That is all, thank you.' },
          ],
        },
        {
          band: 'B2', label: 'Ziel',
          note: 'The same content, but signposted. Three moves do the work: the topic is announced, '
            + 'each option is weighed rather than listed, and the last sentence is audibly a Schluss.',
          lines: [
            { de: 'Ich möchte heute über die Frage sprechen, ob man besser in der Stadt oder auf dem Land wohnt. Ich stelle zunächst drei Möglichkeiten vor, wäge dann Vor- und Nachteile ab und komme am Ende zu einer Bewertung.', en: 'I would like to talk today about whether it is better to live in the city or in the country. First I will present three options, then weigh up the advantages and disadvantages, and at the end I will come to an assessment.' },
            { de: 'Die erste Möglichkeit ist die Innenstadt. Der große Vorteil liegt auf der Hand: kurze Wege, ein dichtes Nahverkehrsnetz und ein Kulturangebot, das man tatsächlich nutzt. Dem stehen allerdings Mieten gegenüber, die in vielen Städten inzwischen die Hälfte des Einkommens verschlingen.', en: 'The first option is the city centre. The big advantage is obvious: short distances, a dense public transport network and a cultural offering you actually use. Against that, however, stand rents that in many cities now swallow half your income.' },
            { de: 'Die zweite Möglichkeit ist das Umland. Hier bekommt man deutlich mehr Wohnfläche für sein Geld, zahlt das aber mit Zeit: Wer täglich pendelt, verliert schnell zehn Stunden pro Woche.', en: 'The second option is the surrounding area. Here you get considerably more living space for your money, but you pay for it in time: anyone commuting daily quickly loses ten hours a week.' },
            { de: 'Die dritte Möglichkeit ist das Dorf. Auf diese möchte ich genauer eingehen, weil sie sich in den letzten Jahren stark verändert hat. Früher bedeutete Dorf vor allem Abhängigkeit vom Auto. Seit sich das Homeoffice durchgesetzt hat, ist daraus für viele eine echte Alternative geworden — vorausgesetzt, die Internetverbindung stimmt und es gibt vor Ort noch einen Arzt.', en: 'The third option is the village. I would like to go into this one in more detail, because it has changed a great deal in recent years. In the past, village meant above all dependence on the car. Since working from home has become established, it has become a real alternative for many — provided the internet connection is good and there is still a doctor locally.' },
            { de: 'Zusammenfassend würde ich sagen: Die Entscheidung hängt weniger vom Ort ab als von der Lebensphase. Für mich persönlich überwiegen im Moment die Vorteile der Stadt, aber ich halte das für eine Entscheidung auf Zeit.', en: 'To sum up, I would say the decision depends less on the place than on the stage of life. For me personally the advantages of the city currently outweigh the others, but I regard that as a decision for the time being.' },
          ],
        },
        {
          band: 'C1', label: 'Stark',
          note: 'Beyond what B2 asks for: the talk opens by refusing the premise of the question, '
            + 'which is a C1 move — and it costs one sentence.',
          lines: [
            { de: 'Ich möchte die Frage zunächst etwas anders stellen. „Stadt oder Land“ klingt nach einer Entscheidung zwischen zwei Orten; tatsächlich entscheidet man sich für ein Verhältnis von Miete, Zeit und Nähe zu anderen Menschen.', en: 'I would like to reframe the question slightly. “City or country” sounds like a choice between two places; in fact one is choosing a ratio of rent, time and closeness to other people.' },
            { de: 'Betrachtet man es so, lassen sich drei Modelle unterscheiden, die ich der Reihe nach durchgehen und anschließend gegeneinander abwägen werde.', en: 'Looked at that way, three models can be distinguished, which I will go through in turn and then weigh against one another.' },
            { de: 'Besonders aufschlussreich finde ich dabei das Umland, weil es die Nachteile beider Seiten auf sich vereinen kann: die Mieten steigen dort inzwischen ähnlich schnell wie in der Stadt, während die Infrastruktur die des Dorfes bleibt.', en: 'I find the surrounding area particularly revealing here, because it can combine the disadvantages of both sides: rents there are now rising at a similar rate to the city, while the infrastructure remains that of the village.' },
            { de: 'Mein Fazit fällt deshalb weniger eindeutig aus, als die Fragestellung nahelegt: Nicht der Ort ist entscheidend, sondern die Frage, was man bereit ist einzutauschen — Geld gegen Zeit oder Zeit gegen Geld.', en: 'My conclusion is therefore less clear-cut than the question suggests: it is not the place that is decisive but the question of what one is prepared to trade — money for time or time for money.' },
          ],
        },
      ],
    },
    {
      id: 'b2-t1-fragen', teil: 1, cue: 'Nach dem Vortrag: die Fragen',
      de: 'Ihre Gesprächspartnerin fragt: „Sie haben das Homeoffice erwähnt. Glauben Sie, dass das '
        + 'auf Dauer funktioniert?“',
      en: 'Your partner asks a question about something you said. This is marked too — and a short, '
        + 'direct answer scores better than a second speech.',
      models: [
        {
          band: 'B1', label: 'Zu wenig',
          note: 'Answers the question and stops. Nothing wrong with it; nothing above B1 in it either.',
          lines: [
            { who: 'B', de: 'Ja, ich glaube schon. Viele Firmen machen das jetzt und es funktioniert gut.', en: 'Yes, I think so. Many companies do it now and it works well.' },
          ],
        },
        {
          band: 'B2', label: 'Ziel',
          note: 'Takes up the questioner’s own word („auf Dauer“) before answering — the cheapest '
            + 'way to sound like you were listening, and the interaction criterion is watching for it.',
          lines: [
            { who: 'B', de: 'Auf Dauer — das ist genau der Punkt. Kurzfristig funktioniert es fast überall; die Frage ist, was nach fünf Jahren mit dem Zusammenhalt in einem Team passiert.', en: 'In the long run — that is exactly the point. In the short term it works almost everywhere; the question is what happens to the cohesion of a team after five years.' },
            { who: 'B', de: 'Ich vermute, wir landen bei einer Mischform: zwei Tage im Büro, drei zu Hause. Das ist im Moment jedenfalls das, was sich in den meisten Betrieben durchsetzt.', en: 'I suspect we will end up with a mixed form: two days in the office, three at home. That is at any rate what is becoming established in most companies at the moment.' },
          ],
        },
        {
          band: 'C1', label: 'Stark',
          note: 'Concedes the weakest part of your own talk before being pushed on it. Examiners '
            + 'reward this because it is what a confident speaker actually does.',
          lines: [
            { who: 'B', de: 'Ehrlich gesagt habe ich das im Vortrag etwas zu optimistisch dargestellt. Dass es technisch funktioniert, ist unbestritten — ob es sozial trägt, weiß im Moment niemand.', en: 'To be honest, I presented that somewhat too optimistically in my talk. That it works technically is undisputed — whether it holds up socially, nobody currently knows.' },
            { who: 'B', de: 'Was mich skeptisch macht, ist weniger die Produktivität als die Frage, wie jemand, der neu anfängt, ein Team überhaupt kennenlernen soll.', en: 'What makes me sceptical is less the productivity than the question of how someone starting out is supposed to get to know a team at all.' },
          ],
        },
      ],
    },
  ],
};

const TEIL2: SpeakingTopic = {
  id: 'b2-sp2',
  teil: 2,
  title: 'Diskussion führen',
  titleEn: 'Hold a discussion',
  minutes: '5 Minuten',
  task: 'Sie sind Teilnehmende eines Debattierclubs und diskutieren über die Frage: Sollen Handys '
    + 'an Schulen verboten werden? Tauschen Sie Ihren Standpunkt und Ihre Argumente aus. Reagieren '
    + 'Sie auf die Argumente Ihrer Gesprächspartnerin / Ihres Gesprächspartners. Fassen Sie am Ende '
    + 'zusammen: Sind Sie dafür oder dagegen?',
  taskEn: 'A debate, not a presentation. Three things are marked: your position, your reaction to '
    + 'theirs, and a summary at the end that actually comes down on one side.',
  notes: [
    'Reagieren ist die eigentliche Aufgabe. Wer nur seine eigenen Argumente abarbeitet, verliert Punkte.',
    'Widersprechen Sie höflich, aber widersprechen Sie: „Das mag stimmen, allerdings …“',
    'Der Schluss ist Pflicht. „Ich bin also dafür/dagegen, weil …“ — ein Satz, aber er muss kommen.',
    'Stichpunkte zur Hilfe: Konzentration im Unterricht? · Notfälle? · Umgang lernen statt verbieten? · Kontrolle durch Lehrkräfte?',
  ],
  prompts: [
    {
      id: 'b2-t2-position', teil: 2, cue: 'Den Standpunkt setzen',
      de: 'Eröffnen Sie die Diskussion mit Ihrem Standpunkt.',
      en: 'Open with your position — and make it a position, not a survey of the question.',
      models: [
        {
          band: 'B1', label: 'Zu wenig',
          note: 'A view, stated. What is missing is a reason that could be argued *against*, which '
            + 'is what gives your partner something to react to.',
          lines: [
            { who: 'A', de: 'Ich bin dagegen. Handys stören im Unterricht und die Schüler passen nicht auf.', en: 'I am against it. Phones disturb lessons and the pupils do not pay attention.' },
          ],
        },
        {
          band: 'B2', label: 'Ziel',
          note: 'States the position, gives one reason, and concedes one point in advance — which '
            + 'makes it much harder to knock down.',
          lines: [
            { who: 'A', de: 'Ich bin grundsätzlich für ein Verbot während des Unterrichts, und zwar aus einem einzigen Grund: Aufmerksamkeit lässt sich nicht teilen. Wer alle drei Minuten aufs Display schaut, folgt dem Unterricht nicht mehr.', en: 'I am fundamentally in favour of a ban during lessons, for one single reason: attention cannot be divided. Anyone who looks at their screen every three minutes is no longer following the lesson.' },
            { who: 'A', de: 'Dass ein generelles Verbot auch in den Pausen sinnvoll wäre, würde ich allerdings bestreiten. Da geht es dann nicht mehr um Lernen, sondern um Kontrolle.', en: 'That a general ban during breaks as well would make sense is something I would dispute, however. At that point it is no longer about learning but about control.' },
          ],
        },
        {
          band: 'C1', label: 'Stark',
          note: 'Names the strongest argument on the *other* side and then explains why it does not '
            + 'decide the question. The most efficient opening there is.',
          lines: [
            { who: 'A', de: 'Das stärkste Argument gegen ein Verbot ist meines Erachtens nicht der Notfall, sondern der Lerneffekt: Man lernt den Umgang mit einem Gerät nicht dadurch, dass es weggeschlossen wird.', en: 'The strongest argument against a ban is in my view not the emergency but the learning effect: you do not learn to handle a device by having it locked away.' },
            { who: 'A', de: 'Trotzdem halte ich ein Verbot im Unterricht für richtig — aber begründet mit der Konzentration und nicht, wie es meistens geschieht, mit der Disziplin.', en: 'Nevertheless I consider a ban during lessons to be right — but justified by concentration and not, as usually happens, by discipline.' },
          ],
        },
      ],
    },
    {
      id: 'b2-t2-reagieren', teil: 2, cue: 'Auf ein Gegenargument reagieren',
      de: 'Ihre Partnerin sagt: „Aber in einem Notfall müssen die Kinder ihre Eltern erreichen '
        + 'können.“ Reagieren Sie.',
      en: 'React to the counter-argument. This exchange is where the interaction marks are won and '
        + 'lost — repeating your own position instead of answering theirs scores nothing.',
      models: [
        {
          band: 'B1', label: 'Zu wenig',
          note: 'Ignores what was said and restates the opening. Correct German, no interaction mark.',
          lines: [
            { who: 'B', de: 'Ja, aber ich denke trotzdem, dass Handys im Unterricht stören.', en: 'Yes, but I still think phones disturb lessons.' },
          ],
        },
        {
          band: 'B2', label: 'Ziel',
          note: 'Accepts the point, limits it, and offers a solution. „Das mag sein, allerdings …“ '
            + 'is worth learning by heart.',
          lines: [
            { who: 'B', de: 'Das mag sein, allerdings gab es Notfälle auch, bevor es Handys gab — dafür hat jede Schule ein Sekretariat mit einem Telefon.', en: 'That may be so, however emergencies existed before mobile phones too — every school has an office with a telephone for that.' },
            { who: 'B', de: 'Man könnte den Punkt aber leicht auffangen: Das Gerät bleibt in der Tasche, nicht im Schließfach. Dann ist es im Ernstfall erreichbar und im Unterricht trotzdem weg.', en: 'The point could easily be accommodated, though: the device stays in the bag, not in a locker. Then it is available in a real emergency and still out of the lesson.' },
          ],
        },
        {
          band: 'C1', label: 'Stark',
          note: 'Separates the two claims hidden in the objection and answers them differently. '
            + 'This is the move that most reliably reads as C1 in a discussion.',
          lines: [
            { who: 'B', de: 'Da stecken eigentlich zwei Fragen drin, die ich gern trennen würde: Ob Kinder im Notfall erreichbar sein müssen — unstrittig. Und ob dafür ein eingeschaltetes Gerät auf der Schulbank nötig ist — das halte ich für nicht belegt.', en: 'There are really two questions in that, which I would like to separate: whether children must be reachable in an emergency — indisputable. And whether that requires a switched-on device on the desk — that I consider unproven.' },
            { who: 'B', de: 'Solange die Schule selbst erreichbar ist, verliert das Argument seine Kraft, ohne dass wir es abstreiten müssten.', en: 'As long as the school itself is reachable, the argument loses its force without our having to deny it.' },
          ],
        },
      ],
    },
    {
      id: 'b2-t2-schluss', teil: 2, cue: 'Zusammenfassen und sich festlegen',
      de: 'Fassen Sie am Ende zusammen: Sind Sie dafür oder dagegen?',
      en: 'The task explicitly asks for this and candidates run out of time and skip it. It is one '
        + 'sentence, and it is marked.',
      models: [
        {
          band: 'B1', label: 'Zu wenig',
          note: 'Summarises without deciding. The task said *dafür oder dagegen*.',
          lines: [
            { who: 'A', de: 'Also, es gibt gute Argumente auf beiden Seiten. Man muss das genau überlegen.', en: 'Well, there are good arguments on both sides. One has to think it over carefully.' },
          ],
        },
        {
          band: 'B2', label: 'Ziel',
          note: 'Names the point of agreement, names the point of disagreement, commits.',
          lines: [
            { who: 'A', de: 'Wir sind uns offenbar einig, dass es in den Pausen kein Verbot geben sollte. Uneinig sind wir beim Unterricht.', en: 'We evidently agree that there should be no ban during breaks. We disagree about lessons.' },
            { who: 'A', de: 'Ich bleibe dabei: dafür — aber nur für die Unterrichtszeit und nur, solange die Schule im Notfall erreichbar ist.', en: 'I stand by it: in favour — but only for lesson time and only as long as the school is reachable in an emergency.' },
          ],
        },
        {
          band: 'C1', label: 'Stark',
          note: 'Says what would change your mind. Nothing signals a genuinely held position faster.',
          lines: [
            { who: 'A', de: 'Ich bleibe bei meiner Position, würde sie aber unter einer Bedingung aufgeben: Wenn sich zeigen ließe, dass Schulen, die den Umgang aktiv unterrichten, bessere Ergebnisse erzielen als Schulen mit Verbot, wäre das Argument entkräftet.', en: 'I stand by my position, but would give it up under one condition: if it could be shown that schools which actively teach how to use these devices achieve better results than schools with a ban, the argument would be refuted.' },
            { who: 'A', de: 'Bis dahin: dafür, und zwar aus Gründen der Konzentration, nicht der Disziplin.', en: 'Until then: in favour, and for reasons of concentration, not discipline.' },
          ],
        },
      ],
    },
  ],
};

export const B2_SPEAKING: SpeakingTopic[] = [TEIL1, TEIL2];

export const B2_REDEMITTEL: Redemittel[] = [
  {
    group: 'Einen Vortrag gliedern',
    phrases: [
      { de: 'Ich möchte heute über … sprechen.', en: 'I would like to talk today about …' },
      { de: 'Ich gehe dabei in drei Schritten vor.', en: 'I will proceed in three steps.' },
      { de: 'Zunächst … · Anschließend … · Abschließend …', en: 'First … · Then … · Finally …' },
      { de: 'Auf diesen Punkt möchte ich genauer eingehen.', en: 'I would like to go into this point in more detail.' },
      { de: 'Zusammenfassend lässt sich sagen, dass …', en: 'To sum up, it can be said that …' },
    ],
  },
  {
    group: 'Abwägen',
    phrases: [
      { de: 'Der Vorteil liegt auf der Hand: …', en: 'The advantage is obvious: …' },
      { de: 'Dem steht allerdings gegenüber, dass …', en: 'Against that, however, stands the fact that …' },
      { de: 'Einerseits … andererseits …', en: 'On the one hand … on the other …' },
      { de: 'Das spricht zwar für …, hat aber den Nachteil, dass …', en: 'That speaks in favour of …, but has the disadvantage that …' },
      { de: 'Unter dem Strich überwiegen für mich die Vorteile.', en: 'On balance the advantages outweigh for me.' },
    ],
  },
  {
    group: 'Widersprechen, ohne unhöflich zu werden',
    phrases: [
      { de: 'Das mag stimmen, allerdings …', en: 'That may be true, however …' },
      { de: 'Da bin ich anderer Meinung, und zwar weil …', en: 'I take a different view there, namely because …' },
      { de: 'Ich verstehe den Einwand, sehe das Problem aber woanders.', en: 'I understand the objection, but I see the problem elsewhere.' },
      { de: 'In diesem Punkt gebe ich Ihnen recht — nicht aber in jenem.', en: 'On this point I agree with you — but not on that one.' },
      { de: 'Genau das würde ich bestreiten.', en: 'That is exactly what I would dispute.' },
    ],
  },
  {
    group: 'Auf die andere Person eingehen',
    phrases: [
      { de: 'Sie haben eben … erwähnt — daran möchte ich anknüpfen.', en: 'You just mentioned … — I would like to pick up on that.' },
      { de: 'Wenn ich Sie richtig verstehe, meinen Sie, dass …', en: 'If I understand you correctly, you mean that …' },
      { de: 'Wie sehen Sie das?', en: 'How do you see it?' },
      { de: 'Da stecken eigentlich zwei Fragen drin.', en: 'There are really two questions in that.' },
    ],
  },
  {
    group: 'Sich festlegen',
    phrases: [
      { de: 'Wir sind uns offenbar einig, dass …', en: 'We evidently agree that …' },
      { de: 'Uneinig sind wir bei der Frage, ob …', en: 'We disagree on the question of whether …' },
      { de: 'Ich bleibe dabei: … , und zwar aus folgendem Grund.', en: 'I stand by it: … , for the following reason.' },
      { de: 'Meine Position würde ich unter einer Bedingung aufgeben: …', en: 'I would give up my position under one condition: …' },
    ],
  },
];
