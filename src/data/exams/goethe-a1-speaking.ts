// Start Deutsch 1 · Sprechen — three parts, and the ladder starts lower.
//
// The A1 oral is a **group** exam, not a pair one, and its three parts are much
// smaller than telc B1's: introduce yourself from word cards, ask and answer one
// question from a topic card, then make a request from a picture card and react
// to someone else's. Nothing is prepared in advance.
//
// So the three-band ladder shifts down with the level: **A1 · A2 · B1** rather
// than A2 · B1 · B2. The principle is unchanged and is the whole reason the
// feature exists — a single model answer hides that a short, correct, complete
// answer is a pass, and that the distance to a good mark is a small set of
// learnable moves rather than more words.
import type { Redemittel, SpeakingTopic } from '../../lib/exam.ts';

const TEIL1: SpeakingTopic = {
  id: 'a1-sp1',
  teil: 1,
  title: 'Sich vorstellen',
  titleEn: 'Introducing yourself',
  minutes: '2–3 Minuten',
  task: 'Stellen Sie sich bitte vor. Auf den Karten stehen: Name · Alter · Land · Wohnort · '
    + 'Sprachen · Beruf · Hobby. Am Ende buchstabieren Sie ein Wort und sagen eine Zahl.',
  taskEn: 'Introduce yourself using seven word cards. The examiner then asks you to spell something '
    + '(usually your name) and to say a number (usually your phone number). Both are marks.',
  notes: [
    'Sieben Karten, sieben kurze Sätze — mehr wird nicht verlangt.',
    'Buchstabieren Sie langsam. Das ist eine eigene Aufgabe, keine Nebensache.',
    'Die Zahl ist meistens die Telefonnummer: in Zweiergruppen sprechen.',
  ],
  prompts: [
    {
      id: 'a1-t1-vorstellen', teil: 1, cue: 'Alle sieben Karten',
      de: 'Stellen Sie sich bitte vor: Name, Alter, Land, Wohnort, Sprachen, Beruf, Hobby.',
      en: 'Introduce yourself: name, age, country, place of residence, languages, job, hobby.',
      models: [
        {
          band: 'A1', label: 'Sicher',
          note: 'One sentence per card, in the card order. This is a full pass — the task is the seven '
            + 'facts, not a speech.',
          lines: [{ de: 'Ich heiße Amir Karimi. Ich bin 34 Jahre alt. Ich komme aus dem Iran. Ich wohne in Leipzig. Ich spreche Persisch, Englisch und ein bisschen Deutsch. Ich bin Krankenpfleger. Mein Hobby ist Kochen.', en: 'My name is Amir Karimi. I am 34. I come from Iran. I live in Leipzig. I speak Persian, English and a little German. I am a nurse. My hobby is cooking.' }],
        },
        {
          band: 'A2', label: 'Ziel',
          note: 'The same seven facts, joined with „und", „seit" and „gern". Nothing harder — just less '
            + 'like a list.',
          lines: [{ de: 'Mein Name ist Amir Karimi und ich bin 34 Jahre alt. Ich komme aus dem Iran und wohne seit drei Jahren in Leipzig. Ich spreche Persisch und Englisch, und jetzt lerne ich Deutsch. Von Beruf bin ich Krankenpfleger. In meiner Freizeit koche ich sehr gern.', en: 'My name is Amir Karimi and I am 34. I come from Iran and have lived in Leipzig for three years. I speak Persian and English, and now I am learning German. I am a nurse by profession. In my free time I very much like cooking.' }],
        },
        {
          band: 'B1', label: 'Stark',
          note: 'Past A1, and shown so the ladder is visible: a subordinate clause and a reason.',
          lines: [{ de: 'Ich heiße Amir Karimi, bin 34 und komme ursprünglich aus dem Iran. Seit drei Jahren lebe ich in Leipzig, weil ich hier als Krankenpfleger arbeite. Neben Persisch und Englisch lerne ich seit zwei Jahren Deutsch — am liebsten beim Kochen, denn dabei rede ich mit meinen Kollegen über Rezepte.', en: 'My name is Amir Karimi, I am 34 and originally from Iran. I have lived in Leipzig for three years because I work here as a nurse. Besides Persian and English I have been learning German for two years — preferably while cooking, since that is when I talk to my colleagues about recipes.' }],
        },
      ],
    },
    {
      id: 'a1-t1-buchstabieren', teil: 1, cue: 'Buchstabieren und Zahl',
      de: 'Buchstabieren Sie bitte Ihren Familiennamen. Und wie ist Ihre Telefonnummer?',
      en: 'Please spell your surname. And what is your telephone number?',
      models: [
        {
          band: 'A1', label: 'Sicher',
          note: 'Slowly, letter by letter. Numbers in pairs is how Germans say them and how the examiner '
            + 'expects to hear them.',
          lines: [{ de: 'Karimi: K – A – R – I – M – I. Meine Telefonnummer ist null eins sieben sechs, drei vier, zwei fünf, acht neun.', en: 'Karimi: K – A – R – I – M – I. My phone number is 0176 34 25 89.' }],
        },
        {
          band: 'A2', label: 'Ziel',
          note: 'Add the one repair phrase worth having: offering to say it again.',
          lines: [{ de: 'Mein Familienname ist Karimi: K – A – R – I – M – I. Soll ich das noch einmal sagen? Meine Nummer ist null eins sieben sechs, drei vier, zwei fünf, acht neun.', en: 'My surname is Karimi: K – A – R – I – M – I. Shall I say that again? My number is 0176 34 25 89.' }],
        },
        {
          band: 'B1', label: 'Stark',
          note: 'A small aside makes it a conversation. Do not overdo this — the task is still the letters.',
          lines: [{ de: 'Karimi — das schreibt man K – A – R – I – M – I, ohne h. Viele schreiben es mit ch, deshalb buchstabiere ich es lieber gleich. Und die Nummer: null eins sieben sechs, drei vier, zwei fünf, acht neun.', en: 'Karimi — that is spelled K – A – R – I – M – I, no h. A lot of people write it with ch, so I prefer to spell it straight away. And the number: 0176 34 25 89.' }],
        },
      ],
    },
  ],
};

const TEIL2: SpeakingTopic = {
  id: 'a1-sp2',
  teil: 2,
  title: 'Um Informationen bitten und geben',
  titleEn: 'Asking for and giving information',
  minutes: '4–5 Minuten',
  task: 'Sie bekommen eine Karte mit einem Thema (zum Beispiel „Einkaufen“) und darauf ein Wort '
    + '(zum Beispiel „Brot“). Stellen Sie eine Frage mit diesem Wort. Ihr Partner / Ihre Partnerin '
    + 'antwortet. Danach fragt er oder sie Sie.',
  taskEn: 'A topic card with one word on it. You ask a question containing that word; someone else '
    + 'answers; then it goes the other way. Two sentences each is the whole task.',
  notes: [
    'Die Frage muss das Wort auf der Karte enthalten — das ist die Aufgabe.',
    'W-Frage oder Ja/Nein-Frage, beides zählt.',
    'Antworten Sie auch, wenn Sie die Frage nur halb verstanden haben. Schweigen kostet mehr.',
  ],
  prompts: [
    {
      id: 'a1-t2-brot', teil: 2, cue: 'Thema „Einkaufen“ · Karte: Brot',
      de: 'Stellen Sie eine Frage mit dem Wort „Brot“.',
      en: 'Ask a question using the word “Brot”.',
      models: [
        { band: 'A1', label: 'Sicher', note: 'A yes/no question is a question. Do not reach for a W-Frage if it will not come.',
          lines: [
            { who: 'A', de: 'Kaufst du Brot?', en: 'Are you buying bread?' },
            { who: 'B', de: 'Ja, ich kaufe Brot im Supermarkt.', en: 'Yes, I buy bread at the supermarket.' },
          ] },
        { band: 'A2', label: 'Ziel', note: 'A W-Frage, and an answer with one extra piece of information.',
          lines: [
            { who: 'A', de: 'Wo kaufst du dein Brot?', en: 'Where do you buy your bread?' },
            { who: 'B', de: 'Ich kaufe Brot immer beim Bäcker. Der Bäcker ist neben meinem Haus.', en: 'I always buy bread at the baker’s. The baker is next to my house.' },
          ] },
        { band: 'B1', label: 'Stark', note: 'A reason and a question back — past A1, and where the ladder goes.',
          lines: [
            { who: 'A', de: 'Wie oft kaufst du Brot, und gehst du dafür zum Bäcker oder in den Supermarkt?', en: 'How often do you buy bread, and do you go to the baker or the supermarket for it?' },
            { who: 'B', de: 'Fast jeden Tag, weil frisches Brot einfach besser schmeckt. Meistens beim Bäcker — und du?', en: 'Almost every day, because fresh bread simply tastes better. Usually at the baker’s — and you?' },
          ] },
      ],
    },
    {
      id: 'a1-t2-bus', teil: 2, cue: 'Thema „Verkehr“ · Karte: Bus',
      de: 'Stellen Sie eine Frage mit dem Wort „Bus“.',
      en: 'Ask a question using the word “Bus”.',
      models: [
        { band: 'A1', label: 'Sicher', note: 'Short, and it contains the card word — which is what is marked.',
          lines: [
            { who: 'A', de: 'Fährst du mit dem Bus?', en: 'Do you go by bus?' },
            { who: 'B', de: 'Ja, ich fahre jeden Tag mit dem Bus.', en: 'Yes, I take the bus every day.' },
          ] },
        { band: 'A2', label: 'Ziel', note: '„Wann" plus a time expression is the commonest A2 move there is.',
          lines: [
            { who: 'A', de: 'Wann fährt dein Bus am Morgen?', en: 'When does your bus go in the morning?' },
            { who: 'B', de: 'Um Viertel nach sieben. Der Bus fährt alle zwanzig Minuten.', en: 'At quarter past seven. The bus runs every twenty minutes.' },
          ] },
        { band: 'B1', label: 'Stark', note: 'A comparison — the sort of thing that lifts a mark without lengthening the answer.',
          lines: [
            { who: 'A', de: 'Nimmst du lieber den Bus oder das Fahrrad, wenn es regnet?', en: 'Do you prefer the bus or the bike when it rains?' },
            { who: 'B', de: 'Bei Regen natürlich den Bus, sonst immer das Rad — das ist schneller als der Bus.', en: 'In the rain the bus of course, otherwise always the bike — it is faster than the bus.' },
          ] },
      ],
    },
  ],
};

const TEIL3: SpeakingTopic = {
  id: 'a1-sp3',
  teil: 3,
  title: 'Bitten formulieren und darauf reagieren',
  titleEn: 'Making and responding to a request',
  minutes: '3–4 Minuten',
  task: 'Sie bekommen eine Bildkarte (zum Beispiel ein Fenster, ein Handy, eine Uhr). '
    + 'Formulieren Sie damit eine Bitte. Ihr Partner / Ihre Partnerin reagiert darauf — und Sie '
    + 'reagieren auf seine oder ihre Bitte.',
  taskEn: 'A picture card. Make a request with it; someone responds; then you respond to theirs. '
    + 'The Bitte and the reaction are marked separately, so react out loud even if the answer is no.',
  notes: [
    'Eine Bitte, nicht eine Frage: „Können Sie bitte …“ oder der Imperativ mit „bitte“.',
    'Immer reagieren — „Ja, gern“ oder „Tut mir leid, …“. Ein Nicken zählt nicht.',
    'Siezen oder duzen: bleiben Sie bei einer Form.',
  ],
  prompts: [
    {
      id: 'a1-t3-fenster', teil: 3, cue: 'Bildkarte: Fenster',
      de: 'Formulieren Sie eine Bitte mit dem Bild „Fenster“ — und reagieren Sie auf die Bitte Ihres Partners.',
      en: 'Make a request from the picture “window” — and respond to your partner’s.',
      models: [
        { band: 'A1', label: 'Sicher', note: 'The imperative with „bitte“ is a perfectly good A1 request.',
          lines: [
            { who: 'A', de: 'Mach bitte das Fenster auf.', en: 'Please open the window.' },
            { who: 'B', de: 'Ja, gern.', en: 'Yes, gladly.' },
          ] },
        { band: 'A2', label: 'Ziel', note: '„Können Sie … bitte“ plus a reason. The reaction is a full sentence, which is where the second mark is.',
          lines: [
            { who: 'A', de: 'Können Sie bitte das Fenster aufmachen? Es ist sehr warm hier.', en: 'Could you please open the window? It is very warm in here.' },
            { who: 'B', de: 'Ja, natürlich. Ich mache es sofort auf.', en: 'Yes, of course. I will open it right away.' },
          ] },
        { band: 'B1', label: 'Stark', note: 'Konjunktiv II („könnten“) and a polite refusal — the version worth having if the answer is no.',
          lines: [
            { who: 'A', de: 'Könnten Sie vielleicht kurz das Fenster öffnen? Mir ist ein bisschen zu warm.', en: 'Could you perhaps open the window for a moment? I am a little too warm.' },
            { who: 'B', de: 'Tut mir leid, ich bin erkältet. Aber ich kann die Tür aufmachen, wenn Ihnen das hilft.', en: 'I am sorry, I have a cold. But I can open the door if that helps you.' },
          ] },
      ],
    },
    {
      id: 'a1-t3-handy', teil: 3, cue: 'Bildkarte: Handy',
      de: 'Formulieren Sie eine Bitte mit dem Bild „Handy“ — und reagieren Sie darauf.',
      en: 'Make a request from the picture “mobile phone” — and respond to one.',
      models: [
        { band: 'A1', label: 'Sicher', note: 'Six words is enough. The mark is for making a request at all.',
          lines: [
            { who: 'A', de: 'Gib mir bitte dein Handy.', en: 'Please give me your phone.' },
            { who: 'B', de: 'Ja, hier bitte.', en: 'Yes, here you are.' },
          ] },
        { band: 'A2', label: 'Ziel', note: 'A reason makes a request sound like a request rather than an order.',
          lines: [
            { who: 'A', de: 'Kann ich bitte dein Handy haben? Mein Akku ist leer.', en: 'Can I have your phone please? My battery is dead.' },
            { who: 'B', de: 'Klar, kein Problem. Hier ist es.', en: 'Sure, no problem. Here it is.' },
          ] },
        { band: 'B1', label: 'Stark', note: 'A conditional request and a conditional yes — both very cheap to learn and both audibly above A1.',
          lines: [
            { who: 'A', de: 'Dürfte ich kurz dein Handy benutzen? Ich müsste nur schnell zu Hause anrufen.', en: 'Might I use your phone briefly? I just need to call home quickly.' },
            { who: 'B', de: 'Ja, wenn es nicht zu lange dauert — ich brauche es gleich selbst.', en: 'Yes, as long as it does not take too long — I need it myself shortly.' },
          ] },
      ],
    },
  ],
};

export const A1_SPEAKING: SpeakingTopic[] = [TEIL1, TEIL2, TEIL3];

export const A1_REDEMITTEL: Redemittel[] = [
  {
    group: 'Sich vorstellen',
    phrases: [
      { de: 'Ich heiße … / Mein Name ist …', en: 'My name is …' },
      { de: 'Ich komme aus …', en: 'I come from …' },
      { de: 'Ich wohne in …', en: 'I live in …' },
      { de: 'Ich bin … von Beruf.', en: 'I am a … by profession.' },
      { de: 'Ich spreche … und ein bisschen Deutsch.', en: 'I speak … and a little German.' },
      { de: 'Das schreibt man: …', en: 'That is spelled: …' },
    ],
  },
  {
    group: 'Fragen stellen',
    phrases: [
      { de: 'Wo …? / Wann …? / Wie oft …?', en: 'Where …? / When …? / How often …?' },
      { de: 'Wie viel kostet …?', en: 'How much does … cost?' },
      { de: 'Haben Sie …? / Hast du …?', en: 'Do you have …?' },
      { de: 'Gibt es hier …?', en: 'Is there a … here?' },
      { de: 'Und du? / Und Sie?', en: 'And you?' },
    ],
  },
  {
    group: 'Bitten und reagieren',
    phrases: [
      { de: 'Können Sie bitte …?', en: 'Could you please …?' },
      { de: 'Kann ich bitte … haben?', en: 'Can I have … please?' },
      { de: 'Ja, gern. / Ja, natürlich.', en: 'Yes, gladly. / Yes, of course.' },
      { de: 'Tut mir leid, das geht leider nicht.', en: 'I am sorry, that is unfortunately not possible.' },
      { de: 'Einen Moment, bitte.', en: 'One moment, please.' },
    ],
  },
  {
    group: 'Wenn Sie etwas nicht verstehen',
    phrases: [
      { de: 'Entschuldigung, können Sie das bitte wiederholen?', en: 'Sorry, could you repeat that please?' },
      { de: 'Können Sie bitte langsamer sprechen?', en: 'Could you speak more slowly please?' },
      { de: 'Wie bitte?', en: 'Pardon?' },
      { de: 'Was bedeutet …?', en: 'What does … mean?' },
    ],
  },
];
