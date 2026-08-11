// Goethe A2 · Sprechen — the level where the oral becomes a conversation.
//
// A1 is a group and every turn goes through the examiner. A2 is a **pair**, and
// the three parts are the first time a candidate has to sustain something:
//
//   Teil 1  four question cards — you ask four, your partner asks four
//   Teil 2  tell your partner about yourself and your life, from a topic card
//   Teil 3  plan something together
//
// Teil 3 is B1's *Gemeinsam etwas planen* in miniature, which makes it the most
// useful thing on this page: a learner who can do it here has already met the
// task that will be worth 30 of 75 marks two levels up.
//
// Bands ladder A2 · B1 · B2 — one above the paper's own level at the top, so the
// reach is visible without pretending it is required.
import type { Redemittel, SpeakingTopic } from '../../lib/exam.ts';

const TEIL1: SpeakingTopic = {
  id: 'a2-sp1',
  teil: 1,
  title: 'Fragen zur Person',
  titleEn: 'Asking about each other',
  minutes: '3–4 Minuten',
  task: 'Sie bekommen vier Karten und stellen mit diesen Karten vier Fragen. Ihr Partner / Ihre '
    + 'Partnerin antwortet. Danach stellt Ihr Partner / Ihre Partnerin vier Fragen und Sie '
    + 'antworten. Themen: Wohnort · Sprachen · Essen · Wochenende.',
  taskEn: 'Four cards, four questions each way. The card gives you a topic word — the question is '
    + 'yours to build. Both asking and answering are marked.',
  notes: [
    'Die Frage muss das Wort auf der Karte benutzen.',
    'Antworten Sie mit mehr als einem Wort — ein Satz und eine kleine Ergänzung.',
    'Wenn Sie nicht verstehen: nachfragen. Das ist erlaubt und kostet keine Punkte.',
  ],
  prompts: [
    {
      id: 'a2-t1-wohnort', teil: 1, cue: 'Karte: Wohnort',
      de: 'Stellen Sie eine Frage mit dem Wort „Wohnort“ — und antworten Sie auf dieselbe Frage.',
      en: 'Ask a question using “Wohnort” — and answer the same question.',
      models: [
        { band: 'A2', label: 'Sicher', note: 'A W-Frage and a two-sentence answer. That is the task, fully done.',
          lines: [
            { who: 'A', de: 'Wo ist dein Wohnort?', en: 'Where do you live?' },
            { who: 'B', de: 'Ich wohne in Leipzig. Ich wohne dort seit drei Jahren.', en: 'I live in Leipzig. I have lived there for three years.' },
          ] },
        { band: 'B1', label: 'Ziel', note: 'A reason, and a question back — the two moves that turn an answer into a conversation.',
          lines: [
            { who: 'A', de: 'Wie gefällt dir dein Wohnort?', en: 'How do you like where you live?' },
            { who: 'B', de: 'Sehr gut, weil ich fast alles mit dem Rad erreichen kann. Nur im Winter ist es ein bisschen grau. Und wo wohnst du?', en: 'Very much, because I can reach almost everything by bike. Only in winter it is a bit grey. And where do you live?' },
          ] },
        { band: 'B2', label: 'Stark', note: '„zwar … aber" concedes a point while keeping your own — audibly above A2 and cheap to learn.',
          lines: [
            { who: 'A', de: 'Würdest du deinen Wohnort weiterempfehlen?', en: 'Would you recommend where you live to others?' },
            { who: 'B', de: 'Auf jeden Fall. Die Mieten sind zwar gestiegen, aber im Vergleich zu München ist es immer noch bezahlbar — und man braucht kein Auto.', en: 'Definitely. Rents have gone up, it is true, but compared with Munich it is still affordable — and you do not need a car.' },
          ] },
      ],
    },
    {
      id: 'a2-t1-essen', teil: 1, cue: 'Karte: Essen',
      de: 'Stellen Sie eine Frage mit dem Wort „Essen“ — und antworten Sie darauf.',
      en: 'Ask a question using “Essen” — and answer it.',
      models: [
        { band: 'A2', label: 'Sicher', note: 'Simple present, one preference, one detail.',
          lines: [
            { who: 'A', de: 'Was ist dein Lieblingsessen?', en: 'What is your favourite food?' },
            { who: 'B', de: 'Ich esse sehr gern Fisch. Meine Mutter kocht ihn am besten.', en: 'I very much like eating fish. My mother cooks it best.' },
          ] },
        { band: 'B1', label: 'Ziel', note: 'A frequency word and a contrast — „meistens … aber am Wochenende".',
          lines: [
            { who: 'A', de: 'Kochst du selbst oder gehst du lieber essen?', en: 'Do you cook yourself or do you prefer eating out?' },
            { who: 'B', de: 'Meistens koche ich selbst, weil das billiger ist. Aber am Wochenende gehen wir gern in ein kleines Lokal.', en: 'Mostly I cook myself because it is cheaper. But at the weekend we like going to a small restaurant.' },
          ] },
        { band: 'B2', label: 'Stark', note: 'A change over time, which needs a past tense beside the present — the commonest B2 lift.',
          lines: [
            { who: 'A', de: 'Hat sich dein Essverhalten in den letzten Jahren verändert?', en: 'Have your eating habits changed in recent years?' },
            { who: 'B', de: 'Ziemlich stark. Früher habe ich fast täglich Fleisch gegessen, inzwischen nur noch am Wochenende — nicht aus Prinzip, sondern weil es mir einfach besser bekommt.', en: 'Quite a lot. I used to eat meat almost daily, now only at the weekend — not on principle, but simply because it agrees with me better.' },
          ] },
      ],
    },
  ],
};

const TEIL2: SpeakingTopic = {
  id: 'a2-sp2',
  teil: 2,
  title: 'Von sich erzählen',
  titleEn: 'Talking about yourself',
  minutes: '4–5 Minuten',
  task: 'Sie bekommen eine Karte mit einem Thema und vier Stichpunkten. Erzählen Sie Ihrem '
    + 'Partner / Ihrer Partnerin etwas über sich und Ihr Leben. Thema: „Mein Arbeitstag“ — '
    + 'Stichpunkte: Aufstehen · Weg zur Arbeit · Kollegen · Feierabend.',
  taskEn: 'A topic card with four bullet points. Cover all four — that is the marked part — and '
    + 'keep going for a minute or so. Your partner then does the same and asks you one question.',
  notes: [
    'Alle vier Stichpunkte ansprechen. Das ist der Unterschied zwischen bestanden und knapp.',
    'Reihenfolge frei — aber sagen Sie zu jedem Punkt mindestens einen Satz.',
    'Am Ende stellt Ihr Partner eine Frage. Antworten Sie darauf, auch kurz.',
  ],
  prompts: [
    {
      id: 'a2-t2-arbeitstag', teil: 2, cue: 'Alle vier Stichpunkte',
      de: 'Erzählen Sie von Ihrem Arbeitstag: Aufstehen, Weg zur Arbeit, Kollegen, Feierabend.',
      en: 'Talk about your working day: getting up, the journey, colleagues, the evening.',
      models: [
        { band: 'A2', label: 'Sicher', note: 'One sentence per bullet, in order, joined with „dann" and „danach". Four points covered is the mark.',
          lines: [{ de: 'Ich stehe um halb sechs auf. Dann fahre ich mit dem Fahrrad zur Arbeit, das dauert zwanzig Minuten. Meine Kollegen sind sehr nett, wir trinken morgens zusammen Kaffee. Nach der Arbeit hole ich meine Tochter ab und wir kochen zusammen.', en: 'I get up at half past five. Then I cycle to work, which takes twenty minutes. My colleagues are very nice, we have coffee together in the morning. After work I collect my daughter and we cook together.' }],
        },
        { band: 'B1', label: 'Ziel', note: 'Same four points, now with a reason, a frequency word and one small opinion.',
          lines: [{ de: 'Mein Tag fängt früh an: Um halb sechs klingelt der Wecker, weil meine Schicht um sieben beginnt. Ich fahre fast immer mit dem Rad, auch im Winter — mit dem Auto stehe ich nur im Stau. Im Team sind wir zu sechst, und ich mag besonders, dass wir uns gegenseitig helfen. Nach Feierabend hole ich meine Tochter aus dem Hort ab, und abends koche ich, das entspannt mich.', en: 'My day starts early: the alarm goes at half past five because my shift begins at seven. I nearly always cycle, even in winter — by car I just sit in traffic. There are six of us on the team, and what I particularly like is that we help each other. After work I collect my daughter, and in the evening I cook, which relaxes me.' }],
        },
        { band: 'B2', label: 'Stark', note: 'A comparison over time and a concession. Beyond A2, and the shape a B1 Teil 2 answer wants.',
          lines: [{ de: 'Anders als früher ist mein Tag heute ziemlich durchgeplant. Der Wecker klingelt um halb sechs, und ich nehme grundsätzlich das Rad — nicht weil ich besonders sportlich wäre, sondern weil ich damit verlässlich pünktlich bin. Das Team trägt den Tag: Wir sind zu sechst, und ohne die Absprachen morgens würde einiges liegen bleiben. Was regelmäßig zu kurz kommt, ist der Abend für mich selbst, deshalb halte ich mir wenigstens den Sonntag frei.', en: 'Unlike before, my day is now fairly tightly planned. The alarm goes at half past five and I take the bike as a matter of course — not because I am especially sporty, but because it makes me reliably punctual. The team carries the day: there are six of us, and without the morning check-in a fair amount would be left undone. What regularly loses out is the evening for myself, so I keep at least Sunday free.' }],
        },
      ],
    },
  ],
};

const TEIL3: SpeakingTopic = {
  id: 'a2-sp3',
  teil: 3,
  title: 'Gemeinsam etwas planen',
  titleEn: 'Planning something together',
  minutes: '4–5 Minuten',
  task: 'Ihre Deutschlehrerin hat Geburtstag. Sie möchten mit dem Kurs etwas schenken und '
    + 'organisieren. Planen Sie das zusammen mit Ihrem Partner / Ihrer Partnerin.',
  taskEn: 'The same task B1 is built on, in miniature. Every line of the notes has to be settled '
    + 'out loud — two parallel monologues score badly here even in perfect German.',
  notes: ['Was schenken?', 'Wer kauft es?', 'Wie viel Geld?', 'Wann geben wir es?'],
  prompts: [
    {
      id: 'a2-t3-geschenk', teil: 3, cue: 'Das ganze Gespräch',
      de: 'Planen Sie gemeinsam das Geschenk für Ihre Lehrerin.',
      en: 'Plan the present for your teacher together.',
      models: [
        { band: 'A2', label: 'Sicher', note: 'Suggestion, reaction, decision — four times. Nothing more is required.',
          lines: [
            { who: 'A', de: 'Was schenken wir der Lehrerin?', en: 'What shall we give the teacher?' },
            { who: 'B', de: 'Vielleicht Blumen? Blumen mag jeder.', en: 'Maybe flowers? Everyone likes flowers.' },
            { who: 'A', de: 'Gute Idee. Wer kauft sie?', en: 'Good idea. Who is buying them?' },
            { who: 'B', de: 'Ich kaufe die Blumen. Der Laden ist neben meiner Wohnung.', en: 'I will buy the flowers. The shop is next to my flat.' },
            { who: 'A', de: 'Und wie viel Geld? Zwei Euro pro Person?', en: 'And how much money? Two euros each?' },
            { who: 'B', de: 'Ja, das ist gut. Wir geben das Geschenk am Freitag.', en: 'Yes, that is good. We will give the present on Friday.' },
          ] },
        { band: 'B1', label: 'Ziel', note: 'One polite disagreement and one compromise. Without those it is not a negotiation.',
          lines: [
            { who: 'A', de: 'Sollen wir der Lehrerin Blumen schenken? Das ist einfach und macht immer Freude.', en: 'Shall we give the teacher flowers? It is simple and always goes down well.' },
            { who: 'B', de: 'Blumen sind schön, aber sie sind nach einer Woche weg. Wie wäre es mit einem Buch oder einem Gutschein?', en: 'Flowers are lovely, but they are gone after a week. How about a book or a voucher?' },
            { who: 'A', de: 'Da hast du recht. Ein Gutschein für die Buchhandlung — und dazu eine Karte von allen?', en: 'You are right. A voucher for the bookshop — and a card from everyone with it?' },
            { who: 'B', de: 'Perfekt. Ich kaufe den Gutschein, wenn du die Karte besorgst und alle unterschreiben lässt.', en: 'Perfect. I will buy the voucher if you get the card and have everyone sign it.' },
            { who: 'A', de: 'Machen wir. Sagen wir drei Euro pro Person, dann kommen wir auf dreißig.', en: 'Let us do that. Say three euros each, then we get to thirty.' },
            { who: 'B', de: 'Einverstanden. Und wir geben es am Freitag am Ende des Unterrichts.', en: 'Agreed. And we will give it on Friday at the end of class.' },
          ] },
        { band: 'B2', label: 'Stark', note: 'Anticipating a problem before it happens is the single strongest move in any planning task.',
          lines: [
            { who: 'A', de: 'Bevor wir uns auf ein Geschenk festlegen: Wir sollten etwas nehmen, das nicht zu persönlich ist — wir kennen sie ja nur aus dem Kurs.', en: 'Before we settle on a present: we should take something that is not too personal — we only know her from the course, after all.' },
            { who: 'B', de: 'Guter Punkt. Damit fällt Parfüm weg. Ein Buchgutschein wäre unverfänglich und trotzdem persönlich genug.', en: 'Good point. That rules out perfume. A book voucher would be uncontroversial and still personal enough.' },
            { who: 'A', de: 'Sehe ich auch so. Beim Betrag würde ich aufpassen, dass niemand unter Druck gerät — drei Euro sind für alle machbar, und wer mehr geben will, kann das.', en: 'I see it the same way. On the amount I would be careful that nobody feels pressured — three euros is manageable for everyone, and anyone who wants to give more can.' },
            { who: 'B', de: 'Einverstanden. Ich besorge den Gutschein bis Mittwoch; übernimmst du die Karte und das Sammeln?', en: 'Agreed. I will get the voucher by Wednesday; will you take on the card and the collection?' },
            { who: 'A', de: 'Mache ich. Und falls jemand am Freitag fehlt, sammeln wir schon am Donnerstag ein — sonst stehen wir am Ende ohne Geld da.', en: 'I will. And in case someone is missing on Friday, we will collect on Thursday — otherwise we end up without the money.' },
            { who: 'B', de: 'Halten wir fest: Buchgutschein, drei Euro, Karte von allen, Übergabe Freitag nach dem Unterricht.', en: 'Let us note it down: book voucher, three euros, card from everyone, handover Friday after class.' },
          ] },
      ],
    },
  ],
};

export const A2_SPEAKING: SpeakingTopic[] = [TEIL1, TEIL2, TEIL3];

export const A2_REDEMITTEL: Redemittel[] = [
  {
    group: 'Fragen stellen (Teil 1)',
    phrases: [
      { de: 'Wie lange … schon?', en: 'How long have you … ?' },
      { de: 'Was machst du am liebsten …?', en: 'What do you most like doing …?' },
      { de: 'Wie oft …?', en: 'How often …?' },
      { de: 'Und wie ist das bei dir?', en: 'And how is it for you?' },
      { de: 'Kannst du das bitte wiederholen?', en: 'Could you repeat that please?' },
    ],
  },
  {
    group: 'Von sich erzählen (Teil 2)',
    phrases: [
      { de: 'Mein Tag beginnt um …', en: 'My day begins at …' },
      { de: 'Meistens … , aber manchmal …', en: 'Mostly … , but sometimes …' },
      { de: 'Am liebsten …', en: 'Most of all I like …' },
      { de: 'Das finde ich gut, weil …', en: 'I think that is good because …' },
      { de: 'Danach / Zuerst / Zum Schluss …', en: 'After that / First / Finally …' },
    ],
  },
  {
    group: 'Planen und sich einigen (Teil 3)',
    phrases: [
      { de: 'Sollen wir …?', en: 'Shall we …?' },
      { de: 'Wie wäre es mit …?', en: 'How about …?' },
      { de: 'Das ist eine gute Idee.', en: 'That is a good idea.' },
      { de: 'Da hast du recht, aber …', en: 'You are right there, but …' },
      { de: 'Einverstanden. / Abgemacht.', en: 'Agreed. / It’s a deal.' },
      { de: 'Dann kaufe ich … und du …', en: 'Then I will buy … and you …' },
    ],
  },
];
