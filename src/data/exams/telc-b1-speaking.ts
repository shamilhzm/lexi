// The mündliche Prüfung — and the three scripts.
//
// telc's oral is a *paired* exam: fifteen minutes, three parts, two examiners who
// mostly stay quiet. Twenty minutes before it you are handed the task sheets and
// left alone with them. Practising it alone is therefore not a poor substitute
// for the real thing — the preparation room is exactly this, one person and a
// sheet of paper.
//
// ## Why three answers to every question
//
// A single model answer teaches one thing and hides the two facts that actually
// decide the mark. First, that a **short, correct, complete** answer is a pass:
// criterion 2 is Aufgabenbewältigung, not eloquence, and a candidate who answers
// the question in two clean sentences outscores one who attempts a subordinate
// clause and abandons it halfway. Second, that the difference between a pass and
// a good mark is a small, learnable set of moves — a reason, a connector, a
// question back — and not a bigger vocabulary.
//
// So every prompt carries three versions of the same answer:
//
//   Sicher (A2)  — what to say when your mind goes blank. Still passes.
//   Ziel  (B1)   — what a solid B1 sounds like: reason, connector, question back.
//   Stark (B2)   — the reach: Konjunktiv II, a concession, an opinion with a
//                  counterweight. Aim here, land on Ziel, and you are fine.
//
// The bands are the *language* level of the answer, not a mark. All three answer
// the question, which is the point: the ladder is visible, and on the day you can
// step down it without falling off.
import type { Redemittel, SpeakingTopic } from '../../lib/exam.ts';

// ---- Teil 1 · Kontaktaufnahme (3–4 Minuten) --------------------------------
// Both candidates get the same sheet: a list of topics, not questions. You are
// meant to have a conversation, not to interrogate each other, and the examiners
// close the part with one question that is *not* on the sheet.

const TEIL1: SpeakingTopic = {
  id: 'sp1-kontakt',
  teil: 1,
  title: 'Kontaktaufnahme',
  titleEn: 'Making contact',
  minutes: '3–4 Minuten',
  task: 'Unterhalten Sie sich bitte mit Ihrem Partner / Ihrer Partnerin. '
    + 'Folgende Themen sind möglich: Name · Wohnort · Arbeit oder Studium · Familie · '
    + 'Sprachen · Freizeit · ein normaler Tag bei Ihnen. '
    + 'Es kann sein, dass der Prüfer / die Prüferin am Ende ein weiteres Thema ins Spiel bringt.',
  taskEn: 'Have a conversation with your partner using the topics on the sheet. It is a '
    + 'warm-up, not a questionnaire — ask back, react, and let it breathe. One examiner '
    + 'will close with a question that is not on your sheet.',
  notes: [
    'Sie duzen sich normalerweise nicht — bleiben Sie beim „Sie", wenn Sie Ihren Partner nicht kennen.',
    'Fragen Sie zurück. Ein Monolog kostet Punkte bei Kriterium 2.',
    'Wenn Sie Ihren Partner schon kennen, fragen Sie nicht nach dem Namen.',
  ],
  prompts: [
    {
      id: 't1-name',
      teil: 1,
      cue: 'Name',
      de: 'Wie heißen Sie? Und wie schreibt man Ihren Namen?',
      en: 'What is your name? And how do you spell it?',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: 'Name, buchstabieren, fertig. Buchstabieren Sie langsam — das hört der Prüfer gern.',
          lines: [{ de: 'Ich heiße Amir Karimi. Karimi schreibt man K-A-R-I-M-I.', en: 'My name is Amir Karimi. Karimi is spelled K-A-R-I-M-I.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: 'Dasselbe, aber mit einer Frage zurück. Damit beginnt ein Gespräch statt eines Verhörs.',
          lines: [{ de: 'Mein Name ist Amir Karimi. Den Nachnamen schreibt man K-A-R-I-M-I. Und wie heißen Sie?', en: 'My name is Amir Karimi. The surname is spelled K-A-R-I-M-I. And what is your name?' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: 'Eine kleine persönliche Bemerkung macht aus einer Pflichtantwort ein Gespräch.',
          lines: [{ de: 'Ich heiße Amir Karimi — Karimi mit K, also K-A-R-I-M-I. Viele sprechen den Vornamen falsch aus, deshalb sage ich lieber gleich dazu: Amir, mit der Betonung hinten. Wie darf ich Sie nennen?', en: 'My name is Amir Karimi — Karimi with a K, so K-A-R-I-M-I. A lot of people mispronounce my first name, so I say it up front: Amir, stressed on the second syllable. What should I call you?' }],
        },
      ],
    },
    {
      id: 't1-wohnort',
      teil: 1,
      cue: 'Wohnort',
      de: 'Wo wohnen Sie? Wohnen Sie gern dort?',
      en: 'Where do you live? Do you like living there?',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: 'Ort, wie lange, ein Grund. Drei Informationen reichen völlig.',
          lines: [{ de: 'Ich wohne in Leipzig, seit drei Jahren. Ich wohne gern hier, weil die Stadt nicht zu groß ist.', en: 'I live in Leipzig, for three years now. I like it here because the city is not too big.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: 'Zwei Gründe, mit „weil" und „außerdem" verbunden — und eine Frage zurück.',
          lines: [{ de: 'Ich wohne in Leipzig, im Stadtteil Plagwitz. Ich wohne sehr gern dort, weil ich fast alles mit dem Fahrrad erreichen kann. Außerdem sind die Mieten noch bezahlbar. Und Sie, wohnen Sie auch in der Stadt?', en: 'I live in Leipzig, in the Plagwitz district. I really like it because I can reach almost everything by bike. On top of that, rents are still affordable. And you — do you live in the city too?' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: 'Ein Zugeständnis („zwar … aber") zeigt, dass Sie zwei Seiten sehen. Das ist Kriterium 1.',
          lines: [{ de: 'Ich lebe in Leipzig, genauer gesagt in Plagwitz. Der Stadtteil hat sich in den letzten Jahren stark verändert: Es gibt zwar deutlich mehr Cafés als früher, aber eben auch höhere Mieten. Insgesamt fühle ich mich dort trotzdem sehr wohl, vor allem weil ich kein Auto brauche. Wie ist das bei Ihnen?', en: 'I live in Leipzig, in Plagwitz to be precise. The district has changed a lot in recent years: there are far more cafés than there used to be, but also higher rents. On balance I still feel very much at home there, mainly because I do not need a car. How is it where you are?' }],
        },
      ],
    },
    {
      id: 't1-arbeit',
      teil: 1,
      cue: 'Arbeit oder Studium',
      de: 'Was machen Sie beruflich? Oder studieren Sie?',
      en: 'What do you do for a living? Or are you studying?',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: 'Beruf, Ort, wie lange. Wenn Sie den Fachbegriff nicht wissen, beschreiben Sie ihn.',
          lines: [{ de: 'Ich bin Krankenpfleger. Ich arbeite seit zwei Jahren in einem Krankenhaus hier in der Stadt.', en: 'I am a nurse. I have been working at a hospital here in the city for two years.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: 'Beruf plus eine Aufgabe plus eine Bewertung. „Am liebsten mag ich …" ist ein sicherer Satzbau.',
          lines: [{ de: 'Ich arbeite als Krankenpfleger in einem Krankenhaus. Ich bin auf der Station für innere Medizin und kümmere mich vor allem um ältere Patienten. Am liebsten mag ich den Kontakt zu den Menschen, aber die Schichtarbeit ist manchmal anstrengend.', en: 'I work as a nurse in a hospital. I am on the internal medicine ward and mainly look after elderly patients. What I like best is the contact with people, though the shift work is tiring sometimes.' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: 'Ein Nebensatz mit „was" bezieht sich auf den ganzen Satz davor — ein typisch B2-Zug.',
          lines: [{ de: 'Ich bin gelernter Krankenpfleger und arbeite auf einer internistischen Station. Der Beruf hat sich verändert: Wir dokumentieren inzwischen fast alles digital, was einerseits Zeit spart, andererseits aber Zeit am Bett kostet. Trotzdem würde ich nichts anderes machen wollen. Und was machen Sie?', en: 'I am a trained nurse and I work on an internal medicine ward. The job has changed: we now document almost everything digitally, which saves time on the one hand but costs time at the bedside on the other. All the same, I would not want to do anything else. And what do you do?' }],
        },
      ],
    },
    {
      id: 't1-familie',
      teil: 1,
      cue: 'Familie',
      de: 'Erzählen Sie etwas über Ihre Familie.',
      en: 'Tell me something about your family.',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: 'Wer, wo, wie alt. Sie müssen nichts Privates sagen, was Sie nicht sagen wollen.',
          lines: [{ de: 'Ich bin verheiratet und habe eine Tochter. Sie ist sechs Jahre alt und geht seit dem Sommer in die Schule.', en: 'I am married and have a daughter. She is six and started school in the summer.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: 'Eine kleine Geschichte statt einer Liste. Ein Detail bleibt hängen, eine Aufzählung nicht.',
          lines: [{ de: 'Ich bin verheiratet und wir haben eine sechsjährige Tochter. Meine Eltern und mein Bruder leben noch in meinem Heimatland, deshalb telefonieren wir jeden Sonntag. Meine Tochter spricht mit ihnen dann auf Persisch, das üben wir zu Hause bewusst.', en: 'I am married and we have a six-year-old daughter. My parents and my brother still live in my home country, so we phone every Sunday. My daughter speaks Persian with them — we practise it deliberately at home.' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: '„Es fällt mir schwer, … zu …" — eine Infinitivkonstruktion, die fast immer passt.',
          lines: [{ de: 'Wir sind zu dritt: meine Frau, unsere Tochter und ich. Der Rest der Familie lebt weit weg, und ehrlich gesagt fällt es mir manchmal schwer, diese Entfernung auszuhalten — besonders an Feiertagen. Dafür haben wir hier inzwischen einen Freundeskreis, der fast wie eine zweite Familie ist.', en: 'There are three of us: my wife, our daughter and me. The rest of the family lives far away, and honestly it is sometimes hard to bear that distance — especially on holidays. On the other hand we now have a circle of friends here that is almost like a second family.' }],
        },
      ],
    },
    {
      id: 't1-sprachen',
      teil: 1,
      cue: 'Sprachen',
      de: 'Welche Sprachen sprechen Sie? Wie lange lernen Sie schon Deutsch?',
      en: 'Which languages do you speak? How long have you been learning German?',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: '„seit" + Dativ, Präsens: „Ich lerne seit zwei Jahren Deutsch." Nicht „ich habe gelernt".',
          lines: [{ de: 'Ich spreche Persisch, Englisch und ein bisschen Deutsch. Ich lerne seit zwei Jahren Deutsch.', en: 'I speak Persian, English and a little German. I have been learning German for two years.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: 'Sagen Sie, *wie* Sie lernen. Das gibt dem Prüfer sofort etwas zum Nachfragen.',
          lines: [{ de: 'Persisch ist meine Muttersprache, außerdem spreche ich fließend Englisch. Deutsch lerne ich seit zwei Jahren, zuerst in einem Integrationskurs und jetzt vor allem bei der Arbeit. Am schwersten finde ich immer noch die Artikel.', en: 'Persian is my mother tongue, and I also speak fluent English. I have been learning German for two years, first in an integration course and now mainly at work. The hardest part for me is still the articles.' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: 'Konjunktiv II („hätte ich … gemacht") ist der schnellste Weg zu einem B2-Eindruck.',
          lines: [{ de: 'Meine Muttersprache ist Persisch, dazu kommen Englisch und seit zwei Jahren Deutsch. Wenn ich noch einmal anfangen könnte, würde ich von Anfang an mehr sprechen und weniger Grammatik pauken — das habe ich zu spät gemerkt. Inzwischen führe ich fast alle Gespräche auf der Arbeit auf Deutsch, und das hat mehr gebracht als jedes Buch.', en: 'My mother tongue is Persian, plus English and, for the last two years, German. If I could start again I would speak more from the beginning and cram less grammar — I realised that too late. These days I have nearly all my conversations at work in German, and that has done more than any book.' }],
        },
      ],
    },
    {
      id: 't1-freizeit',
      teil: 1,
      cue: 'Freizeit',
      de: 'Was machen Sie in Ihrer Freizeit?',
      en: 'What do you do in your free time?',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: 'Zwei Hobbys und wann. „einmal in der Woche", „am Wochenende" — sichere Zeitangaben.',
          lines: [{ de: 'Ich koche gern und ich schwimme einmal in der Woche. Am Wochenende gehe ich oft mit meiner Familie spazieren.', en: 'I like cooking and I swim once a week. At the weekend I often go for a walk with my family.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: 'Ein Hobby mit Grund schlägt vier Hobbys ohne. Und die Frage zurück nicht vergessen.',
          lines: [{ de: 'Am liebsten koche ich. Das entspannt mich nach der Schicht, und ich probiere gern neue Rezepte aus — letzte Woche zum Beispiel Rouladen, zum ersten Mal. Außerdem gehe ich einmal pro Woche schwimmen. Was machen Sie denn nach der Arbeit?', en: 'What I like most is cooking. It relaxes me after a shift and I like trying new recipes — last week I made Rouladen for the first time. I also go swimming once a week. What do you do after work?' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: '„je … desto" ist ein Punkt, den B1-Kandidaten fast nie benutzen — und Prüfer immer hören.',
          lines: [{ de: 'Kochen ist mein Ausgleich. Je stressiger die Woche war, desto aufwendiger koche ich am Samstag — das ist inzwischen fast ein Ritual bei uns. Daneben schwimme ich regelmäßig, weniger aus Begeisterung als aus Vernunft, weil ich beruflich den ganzen Tag stehe.', en: 'Cooking is my counterbalance. The more stressful the week has been, the more elaborate my Saturday cooking gets — it has become almost a ritual for us. I also swim regularly, less out of enthusiasm than out of common sense, because I am on my feet all day at work.' }],
        },
      ],
    },
    {
      id: 't1-tag',
      teil: 1,
      cue: 'Ein normaler Tag',
      de: 'Beschreiben Sie einen ganz normalen Tag bei Ihnen.',
      en: 'Describe an ordinary day in your life.',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: 'Der Tag von morgens bis abends, mit „dann", „danach", "am Abend". Reihenfolge ist alles.',
          lines: [{ de: 'Ich stehe um halb sechs auf. Dann frühstücke ich und fahre mit dem Fahrrad zur Arbeit. Ich arbeite bis vier Uhr. Danach hole ich meine Tochter ab, und am Abend kochen wir zusammen.', en: 'I get up at half past five. Then I have breakfast and cycle to work. I work until four. After that I pick my daughter up, and in the evening we cook together.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: 'Gleiche Struktur, aber mit einem Nebensatz („bevor", „während") und einer Bewertung am Ende.',
          lines: [{ de: 'Mein Tag beginnt früh: Ich stehe um halb sechs auf, weil meine Schicht um sieben anfängt. Bevor ich losfahre, mache ich Frühstück für alle. Nach der Arbeit hole ich meine Tochter aus dem Hort ab, und abends kochen wir zusammen. Ehrlich gesagt ist der Tag ziemlich voll, aber ich mag diesen Rhythmus.', en: 'My day starts early: I get up at half past five because my shift begins at seven. Before I leave I make breakfast for everyone. After work I collect my daughter from after-school care, and in the evening we cook together. Honestly the day is pretty full, but I like the rhythm.' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: 'Ein Vergleich („anders als früher") gibt der Beschreibung eine Perspektive statt einer Liste.',
          lines: [{ de: 'Anders als früher ist mein Tag heute streng durchgeplant. Um halb sechs klingelt der Wecker, um sieben beginnt die Schicht, und ab vier gehört der Nachmittag meiner Tochter. Was dabei regelmäßig zu kurz kommt, ist die Zeit für mich selbst — deshalb versuche ich, wenigstens den Sonntagvormittag freizuhalten.', en: 'Unlike before, my day is tightly planned now. The alarm goes at half past five, the shift starts at seven, and from four the afternoon belongs to my daughter. What regularly loses out is time for myself — which is why I try to keep at least Sunday morning free.' }],
        },
      ],
    },
    {
      id: 't1-zusatz',
      teil: 1,
      cue: 'Die Zusatzfrage der Prüfer',
      de: 'Was würden Sie machen, wenn Sie plötzlich eine Woche frei hätten?',
      en: 'What would you do if you suddenly had a week off? (a typical off-sheet question)',
      models: [
        {
          band: 'A2', label: 'Sicher',
          note: 'Wenn der Konjunktiv nicht kommt: antworten Sie im Präsens. Eine Antwort schlägt Schweigen.',
          lines: [{ de: 'Ich fahre gern ans Meer. Also: eine Woche frei, dann fahre ich mit meiner Familie an die Ostsee.', en: 'I like going to the sea. So: a week off, and I would go to the Baltic with my family.' }],
        },
        {
          band: 'B1', label: 'Ziel',
          note: '„würde" + Infinitiv reicht völlig. Sie brauchen kein „führe" oder „bliebe".',
          lines: [{ de: 'Ich würde mit meiner Familie an die Ostsee fahren. Wir waren letztes Jahr dort und meine Tochter redet immer noch davon. Und wenn das Wetter schlecht wäre, würde ich einfach eine Woche lang zu Hause kochen und schlafen.', en: 'I would go to the Baltic with my family. We were there last year and my daughter still talks about it. And if the weather were bad, I would simply spend the week at home cooking and sleeping.' }],
        },
        {
          band: 'B2', label: 'Stark',
          note: 'Zwei Konjunktive plus ein „obwohl" — hier zeigen Sie in drei Sätzen Ihr ganzes Repertoire.',
          lines: [{ de: 'Spontan würde ich sagen: ans Meer. Obwohl — wenn ich ehrlich bin, hätte ich wahrscheinlich nach zwei Tagen genug vom Nichtstun und würde anfangen, die Wohnung umzuräumen. Am ehesten würde ich die Zeit wohl für einen Besuch bei meinen Eltern nutzen, das schiebe ich seit Jahren auf.', en: 'Off the top of my head I would say the sea. Although — if I am honest, after two days I would have had enough of doing nothing and would start rearranging the flat. Most likely I would use the time to visit my parents, something I have been putting off for years.' }],
        },
      ],
    },
  ],
};

// ---- Teil 2 · Gespräch über ein Thema (5–6 Minuten) ------------------------
// A and B get *different* sheets on the same theme. You summarise yours to your
// partner, they summarise theirs, and then you talk about your own experience of
// it. The summary is the part candidates skip and the examiners are marking.

const TEIL2: SpeakingTopic[] = [
  {
    id: 'sp2-freizeit',
    teil: 2,
    title: 'Freizeit und Sport',
    titleEn: 'Free time and sport',
    minutes: '5–6 Minuten',
    task: 'Sehen Sie sich Ihre Vorlage an und lesen Sie den Text dazu. Berichten Sie Ihrem Partner / '
      + 'Ihrer Partnerin kurz, welche Informationen Sie zum Thema Freizeit und Sport vorliegen haben. '
      + 'Danach berichtet Ihr Partner / Ihre Partnerin über seine / ihre Informationen. '
      + 'Erzählen Sie anschließend, wie Sie selbst Ihre Freizeit verbringen, und geben Sie Gründe an. '
      + 'Reagieren Sie auf das, was Ihr Partner / Ihre Partnerin erzählt.',
    taskEn: 'Summarise your information sheet to your partner, listen to theirs, then talk about how you '
      + 'spend your own free time and why — and react to what your partner says.',
    sheets: [
      {
        label: 'Teilnehmende/r A',
        text: 'Sport im Verein — Deutschland zählt rund 87 000 Sportvereine. Fußball ist mit Abstand '
          + 'am beliebtesten, danach folgen Turnen und Tennis. Auffällig ist: Kinder unter 14 Jahren '
          + 'sind besonders häufig Mitglied, bei jungen Erwachsenen sinken die Zahlen deutlich.',
        facts: [
          'ca. 87 000 Sportvereine in Deutschland',
          'Beliebteste Sportarten: Fußball, Turnen, Tennis',
          'Viele Mitglieder unter 14 Jahren',
          'Bei jungen Erwachsenen gehen die Zahlen zurück',
        ],
      },
      {
        label: 'Teilnehmende/r B',
        text: 'Sport ohne Verein — Immer mehr Menschen treiben Sport allein und ohne Anmeldung: '
          + 'Laufen, Radfahren und Fitnessstudio stehen ganz oben. Als wichtigsten Grund nennen die '
          + 'Befragten die freie Zeiteinteilung. Fast die Hälfte nutzt dabei eine App.',
        facts: [
          'Laufen, Radfahren, Fitnessstudio am häufigsten',
          'Wichtigster Grund: freie Zeiteinteilung',
          'Fast 50 % nutzen eine Sport-App',
          'Feste Trainingszeiten schrecken viele ab',
        ],
      },
    ],
    prompts: [
      {
        id: 't2-freizeit-bericht',
        teil: 2,
        cue: 'Die Vorlage zusammenfassen',
        de: 'Berichten Sie kurz, welche Informationen Sie vorliegen haben.',
        en: 'Briefly report what information you have on your sheet.',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Nur die Zahlen vorlesen reicht nicht — aber „Auf meinem Blatt steht …" reicht.',
            lines: [{ de: 'Auf meinem Blatt geht es um Sport im Verein. In Deutschland gibt es ungefähr 87 000 Sportvereine. Fußball ist am beliebtesten. Viele Kinder sind Mitglied, junge Erwachsene weniger.', en: 'My sheet is about club sport. There are around 87,000 sports clubs in Germany. Football is the most popular. Many children are members, young adults less so.' }],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Einleiten, ordnen, den auffälligsten Punkt hervorheben — genau das ist die Aufgabe.',
            lines: [{ de: 'Ich habe hier Informationen über den Vereinssport. Es gibt in Deutschland etwa 87 000 Sportvereine; am beliebtesten ist Fußball, danach kommen Turnen und Tennis. Interessant finde ich vor allem, dass sehr viele Kinder unter 14 im Verein sind, die Zahlen bei jungen Erwachsenen aber stark zurückgehen. Und was steht auf deinem Blatt?', en: 'I have information here about club sport. There are about 87,000 sports clubs in Germany; football is the most popular, followed by gymnastics and tennis. What I find most interesting is that a lot of children under 14 are club members, but the numbers drop sharply among young adults. And what does your sheet say?' }],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Eine Vermutung („das dürfte daran liegen") hebt die Zusammenfassung auf B2.',
            lines: [{ de: 'Meine Vorlage behandelt den organisierten Sport. Zentral sind zwei Zahlen: rund 87 000 Vereine, und ein deutlicher Bruch beim Alter — bis 14 sind sehr viele Mitglied, danach bricht es ein. Das dürfte damit zusammenhängen, dass feste Trainingszeiten mit Ausbildung oder Studium schwer vereinbar sind. Wie sieht das auf deiner Seite aus?', en: 'My sheet deals with organised sport. Two figures matter: around 87,000 clubs, and a clear break by age — up to 14 a great many are members, after that it collapses. That probably has to do with fixed training times being hard to combine with training or study. How does it look on your side?' }],
          },
        ],
      },
      {
        id: 't2-freizeit-eigen',
        teil: 2,
        cue: 'Die eigene Erfahrung',
        de: 'Erzählen Sie, wie Sie selbst Ihre Freizeit verbringen. Geben Sie Gründe an.',
        en: 'Say how you spend your own free time, and give reasons.',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Was, wie oft, warum. Drei Sätze — und „weil" einmal richtig, nicht dreimal falsch.',
            lines: [{ de: 'Ich gehe zweimal in der Woche schwimmen. Ich bin nicht im Verein, weil ich Schichtdienst habe. Schwimmen kann ich immer, wenn ich Zeit habe.', en: 'I go swimming twice a week. I am not in a club because I work shifts. I can swim whenever I have time.' }],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Die eigene Erfahrung ausdrücklich mit der Vorlage verbinden — dafür gibt es Punkte.',
            lines: [{ de: 'Bei mir ist es genau wie in deiner Statistik: Ich mache Sport ohne Verein. Ich gehe zweimal pro Woche schwimmen, meistens früh am Morgen. Der Grund ist ganz praktisch — ich arbeite im Schichtdienst und könnte feste Trainingszeiten gar nicht einhalten. Früher habe ich Volleyball im Verein gespielt, das hat mir wegen der Gruppe besser gefallen.', en: 'It is exactly like your statistic in my case: I do sport outside a club. I swim twice a week, usually early in the morning. The reason is entirely practical — I work shifts and could not keep to fixed training times. I used to play volleyball in a club, and I liked that better because of the group.' }],
          },
          {
            band: 'B2', label: 'Stark',
            note: '„Was mir fehlt, ist …" — eine Struktur, die eine Meinung fokussiert, statt sie anzukündigen.',
            lines: [{ de: 'Ich falle klar in deine Gruppe: Sport allein, ohne Anmeldung. Zweimal die Woche schwimmen, morgens, ohne dass jemand auf mich wartet. Der Vorteil liegt auf der Hand, aber was mir dabei fehlt, ist genau das, was der Verein bietet — man verabredet sich nicht, also fällt es auch leichter, es ausfallen zu lassen. Deshalb überlege ich schon länger, ob ich nicht doch wieder in eine Mannschaft gehe.', en: 'I clearly fall into your group: sport on my own, no registration. Swimming twice a week, in the mornings, with nobody waiting for me. The advantage is obvious, but what I miss is exactly what a club provides — you have not arranged to meet anyone, so it is also easier to skip. That is why I have been wondering for a while whether to join a team again.' }],
          },
        ],
      },
    ],
  },
  {
    id: 'sp2-einkaufen',
    teil: 2,
    title: 'Einkaufen: online oder im Geschäft',
    titleEn: 'Shopping: online or in a shop',
    minutes: '5–6 Minuten',
    task: 'Sehen Sie sich Ihre Vorlage an. Berichten Sie Ihrem Partner / Ihrer Partnerin kurz über Ihre '
      + 'Informationen zum Thema Einkaufen. Danach berichtet Ihr Partner / Ihre Partnerin. '
      + 'Erzählen Sie anschließend, wie und wo Sie selbst am liebsten einkaufen, und begründen Sie das.',
    taskEn: 'Summarise your sheet on shopping, listen to your partner’s, then say how and where you '
      + 'prefer to shop, with reasons.',
    sheets: [
      {
        label: 'Teilnehmende/r A',
        text: 'Online-Handel — Rund drei Viertel der Deutschen bestellen regelmäßig im Internet. '
          + 'Am häufigsten gekauft werden Kleidung, Bücher und Elektronik. Ein Problem bleibt die '
          + 'Rücksendung: Bei Kleidung geht fast jedes zweite Paket zurück.',
        facts: [
          '≈ 75 % bestellen regelmäßig online',
          'Am häufigsten: Kleidung, Bücher, Elektronik',
          'Bei Kleidung: fast jede zweite Bestellung wird zurückgeschickt',
          'Hauptgrund für Online-Kauf: Bequemlichkeit',
        ],
      },
      {
        label: 'Teilnehmende/r B',
        text: 'Die Innenstädte — In vielen kleineren Städten schließen Geschäfte, weil die Kundschaft '
          + 'fehlt. Gleichzeitig sagen über 60 Prozent der Befragten, dass ihnen persönliche Beratung '
          + 'wichtig ist. Lebensmittel kaufen die meisten weiterhin im Laden.',
        facts: [
          'In kleineren Städten schließen viele Geschäfte',
          'Über 60 % ist persönliche Beratung wichtig',
          'Lebensmittel: fast alle kaufen im Laden',
          'Beliebt: erst im Geschäft ansehen, dann online bestellen',
        ],
      },
    ],
    prompts: [
      {
        id: 't2-einkauf-bericht',
        teil: 2,
        cue: 'Die Vorlage zusammenfassen',
        de: 'Berichten Sie kurz über Ihre Informationen.',
        en: 'Briefly report your information.',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Prozentzahlen darf man vereinfachen: „ungefähr drei von vier" ist völlig in Ordnung.',
            lines: [{ de: 'Auf meinem Blatt steht etwas über Online-Einkaufen. Ungefähr drei von vier Deutschen bestellen im Internet. Sie kaufen vor allem Kleidung, Bücher und Elektronik. Bei Kleidung schicken viele die Sachen zurück.', en: 'My sheet is about online shopping. Around three in four Germans order on the internet. They mainly buy clothes, books and electronics. With clothing, many send things back.' }],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Eine Zahl kommentieren („das finde ich viel") ist einfacher als sie zu erklären — und zählt genauso.',
            lines: [{ de: 'Ich habe Informationen zum Online-Handel. Etwa 75 Prozent der Deutschen bestellen regelmäßig im Internet, am meisten Kleidung, Bücher und Elektronik. Was mich überrascht hat: Bei Kleidung geht fast jedes zweite Paket wieder zurück. Das finde ich ziemlich viel. Was steht bei dir?', en: 'I have information on online retail. About 75 percent of Germans order online regularly, mostly clothing, books and electronics. What surprised me: with clothing, almost every second parcel goes back. I find that quite a lot. What does yours say?' }],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Eine Zahl in eine Folge übersetzen („das heißt konkret …") ist der Unterschied zu B1.',
            lines: [{ de: 'Meine Vorlage dreht sich um den Online-Handel: drei Viertel der Bevölkerung bestellen regelmäßig, vor allem Kleidung. Entscheidend finde ich aber die Rücksendequote — fast jedes zweite Kleidungsstück kommt zurück. Das heißt konkret, dass jedes Paket zweimal durch die Stadt gefahren wird, und darüber redet in der Werbung natürlich niemand.', en: 'My sheet is about online retail: three quarters of the population order regularly, mostly clothing. What strikes me as decisive, though, is the return rate — nearly every second garment comes back. In practice that means each parcel is driven across town twice, and of course nobody mentions that in the advertising.' }],
          },
        ],
      },
      {
        id: 't2-einkauf-eigen',
        teil: 2,
        cue: 'Die eigene Erfahrung',
        de: 'Wie und wo kaufen Sie selbst am liebsten ein? Warum?',
        en: 'How and where do you prefer to shop yourself? Why?',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Zwei Bereiche trennen (Lebensmittel / anderes) gibt der Antwort sofort Struktur.',
            lines: [{ de: 'Lebensmittel kaufe ich im Supermarkt, weil ich das Gemüse sehen möchte. Kleidung bestelle ich manchmal online, weil ich wenig Zeit habe.', en: 'I buy food at the supermarket because I want to see the vegetables. I sometimes order clothes online because I do not have much time.' }],
          },
          {
            band: 'B1', label: 'Ziel',
            note: '„einerseits … andererseits" — ein einziger Ausdruck, der eine Antwort erwachsen klingen lässt.',
            lines: [{ de: 'Bei mir kommt es darauf an. Lebensmittel kaufe ich immer im Laden um die Ecke, weil ich sehen will, was ich kaufe. Kleidung bestelle ich einerseits gern online, weil ich abends nach der Arbeit keine Lust mehr auf die Innenstadt habe, andererseits passt fast nie etwas beim ersten Mal. Deshalb versuche ich, weniger und dafür bewusster zu bestellen.', en: 'It depends for me. I always buy food at the shop round the corner because I want to see what I am buying. Clothes I like ordering online on the one hand, because after work in the evening I have no appetite for the town centre — on the other hand almost nothing ever fits first time. So I try to order less and more deliberately.' }],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Ein Gegenargument gegen die eigene Position ist die stärkste Karte in Teil 2.',
            lines: [{ de: 'Ich gehöre eindeutig zu deiner Gruppe: Lebensmittel im Laden, alles andere online. Trotzdem ist mir das nicht ganz wohl dabei. Solange ich mich über leere Innenstädte beschwere und gleichzeitig alles bestelle, ist das eben nicht besonders konsequent. Ich habe mir deshalb vorgenommen, wenigstens Bücher wieder in der Buchhandlung zu kaufen — auch wenn ich zwei Tage warten muss.', en: 'I clearly belong to your group: food in the shop, everything else online. All the same I am not entirely comfortable with it. As long as I complain about empty town centres while ordering everything, that is not exactly consistent. So I have decided to buy books in the bookshop again at least — even if I have to wait two days.' }],
          },
        ],
      },
    ],
  },
  {
    id: 'sp2-wohnen',
    teil: 2,
    title: 'Wohnen: Stadt oder Land',
    titleEn: 'Living: town or country',
    minutes: '5–6 Minuten',
    task: 'Sehen Sie sich Ihre Vorlage an. Informieren Sie Ihren Partner / Ihre Partnerin kurz über Ihre '
      + 'Informationen zum Thema Wohnen. Erzählen Sie danach, wie und wo Sie am liebsten wohnen möchten, '
      + 'und begründen Sie Ihre Meinung. Gehen Sie auf Ihren Partner / Ihre Partnerin ein.',
    taskEn: 'Summarise your sheet on housing, then say where and how you would most like to live, with '
      + 'reasons — and respond to your partner.',
    sheets: [
      {
        label: 'Teilnehmende/r A',
        text: 'Mieten in den Städten — In den großen Städten sind die Mieten in den letzten zehn Jahren '
          + 'stark gestiegen. Viele Haushalte geben inzwischen mehr als ein Drittel ihres Einkommens '
          + 'für die Wohnung aus. Besonders schwierig ist die Suche für Familien mit Kindern.',
        facts: [
          'Mieten in Großstädten stark gestiegen',
          'Oft über ein Drittel des Einkommens für Miete',
          'Wohnungssuche für Familien besonders schwer',
          'Viele ziehen deshalb ins Umland',
        ],
      },
      {
        label: 'Teilnehmende/r B',
        text: 'Leben auf dem Land — Auf dem Land sind Wohnungen und Häuser deutlich günstiger, und viele '
          + 'schätzen die Ruhe. Dafür fehlen oft Busse und Bahnen: Ohne Auto ist der Alltag schwierig. '
          + 'Auch Ärzte und Geschäfte sind seltener geworden.',
        facts: [
          'Wohnen ist deutlich günstiger',
          'Ruhe und mehr Platz',
          'Schlechte Verbindungen — ohne Auto schwierig',
          'Weniger Ärzte und Geschäfte als früher',
        ],
      },
    ],
    prompts: [
      {
        id: 't2-wohnen-bericht',
        teil: 2,
        cue: 'Die Vorlage zusammenfassen',
        de: 'Informieren Sie Ihren Partner kurz über Ihre Vorlage.',
        en: 'Briefly inform your partner about your sheet.',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Auch hier gilt: drei klare Sätze schlagen einen langen, der abbricht.',
            lines: [{ de: 'Bei mir geht es um die Mieten in der Stadt. Die Mieten sind in zehn Jahren stark gestiegen. Viele Leute bezahlen mehr als ein Drittel von ihrem Geld für die Wohnung. Für Familien ist es besonders schwer.', en: 'Mine is about rents in the city. Rents have risen a lot in ten years. Many people pay more than a third of their money for their flat. It is especially hard for families.' }],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Ein „das bedeutet, dass …" macht aus einer Zahl eine Aussage.',
            lines: [{ de: 'Auf meinem Blatt geht es um die Mieten in den Großstädten. Sie sind in den letzten zehn Jahren deutlich gestiegen, und viele Haushalte zahlen heute über ein Drittel ihres Einkommens für die Miete. Das bedeutet, dass für alles andere weniger übrig bleibt. Am schwersten haben es offenbar Familien mit Kindern.', en: 'My sheet is about rents in the big cities. They have risen sharply over the last ten years, and many households now pay over a third of their income in rent. That means there is less left for everything else. Families with children apparently have the hardest time of it.' }],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Die beiden Vorlagen ausdrücklich gegeneinanderstellen — genau darauf zielt die Aufgabe.',
            lines: [{ de: 'Meine Vorlage beschreibt die Lage auf dem städtischen Wohnungsmarkt: stark gestiegene Mieten, oft über ein Drittel des Einkommens, und eine besonders schwierige Suche für Familien. Wenn ich deine Informationen daneben lege, ergibt sich ein ziemlich klares Bild — die Leute weichen nicht aufs Land aus, weil es dort so schön ist, sondern weil die Stadt sie sich nicht mehr leisten lässt.', en: 'My sheet describes the situation on the urban housing market: sharply increased rents, often over a third of income, and a particularly difficult search for families. Putting your information beside it gives a fairly clear picture — people are not moving to the countryside because it is lovely there, but because the city has priced them out.' }],
          },
        ],
      },
      {
        id: 't2-wohnen-eigen',
        teil: 2,
        cue: 'Die eigene Meinung',
        de: 'Wie und wo möchten Sie am liebsten wohnen? Warum?',
        en: 'How and where would you most like to live? Why?',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: '„Ich möchte lieber … , weil …" trägt die ganze Antwort. Kein Konjunktiv nötig.',
            lines: [{ de: 'Ich möchte lieber in der Stadt wohnen, weil ich kein Auto habe. Ich fahre mit dem Fahrrad zur Arbeit. Auf dem Land ist es schön, aber für mich zu ruhig.', en: 'I would rather live in the city because I do not have a car. I cycle to work. The countryside is nice, but too quiet for me.' }],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Eine Bedingung („wenn … wäre") zeigt, dass die Meinung durchdacht ist.',
            lines: [{ de: 'Ich wohne gern in der Stadt und würde da auch bleiben, vor allem weil ich kein Auto brauche. Wenn die Mieten weiter so steigen würden, müsste ich allerdings umdenken. Ein kleines Haus im Umland mit einer guten Zugverbindung — das wäre für mich der beste Kompromiss.', en: 'I like living in the city and would stay there, mainly because I do not need a car. If rents kept rising like this, though, I would have to think again. A small house on the outskirts with a good train connection — that would be the best compromise for me.' }],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Auf den Partner eingehen („du hast vorhin gesagt …") ist der einfachste Punktgewinn im ganzen Teil.',
            lines: [{ de: 'Du hast vorhin gesagt, dass ohne Auto auf dem Land wenig geht — und genau das ist für mich der entscheidende Punkt. Ich bin bewusst autofrei, deshalb käme ein Dorf für mich im Moment nicht in Frage. Andererseits verstehe ich jeden, der wegzieht: Wer für sechzig Quadratmeter die Hälfte seines Gehalts zahlt, rechnet irgendwann anders. Ideal fände ich eine mittelgroße Stadt — Platz und trotzdem eine Bahn, die abends noch fährt.', en: 'You said earlier that without a car there is not much going on in the countryside — and that is exactly the decisive point for me. I am deliberately car-free, so a village would be out of the question for me at the moment. On the other hand I understand anyone who moves away: when you pay half your salary for sixty square metres, at some point the sums look different. My ideal would be a medium-sized town — space, and still a train that runs in the evening.' }],
          },
        ],
      },
    ],
  },
];

// ---- Teil 3 · Gemeinsam eine Aufgabe lösen (5–6 Minuten) -------------------
// The one part candidates most often fail on task rather than on language: two
// people take turns making statements and never actually decide anything. The
// notes column is a checklist — every line on it has to be settled out loud.

const TEIL3: SpeakingTopic[] = [
  {
    id: 'sp3-abschied',
    teil: 3,
    title: 'Eine Abschiedsfeier planen',
    titleEn: 'Planning a leaving party',
    minutes: '5–6 Minuten',
    task: 'Eine Kollegin aus Ihrer Abteilung geht in eine andere Stadt und arbeitet ab nächstem Monat '
      + 'dort. Sie möchten sie mit einer kleinen Feier verabschieden. Planen Sie diese Feier zusammen '
      + 'mit Ihrem Partner / Ihrer Partnerin. Überlegen Sie, was alles zu tun ist und wer welche Aufgabe '
      + 'übernimmt. Sie haben sich schon einen Zettel mit Notizen gemacht.',
    taskEn: 'A colleague is leaving for another city. Plan her leaving party together: work out what needs '
      + 'doing and who takes on what. Every line on the notes has to be decided out loud.',
    notes: ['Wann?', 'Wo?', 'Essen und Getränke', 'Geschenk', 'Wer lädt ein?', 'Wer bezahlt was?'],
    prompts: [
      {
        id: 't3-abschied-dialog',
        teil: 3,
        cue: 'Das ganze Gespräch',
        de: 'Planen Sie die Feier gemeinsam. Machen Sie Vorschläge, reagieren Sie und einigen Sie sich.',
        en: 'Plan the party together — make suggestions, react to them, and reach agreement.',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Vorschlag – Reaktion – Entscheidung, sechsmal. Mehr braucht diese Aufgabe nicht.',
            lines: [
              { who: 'A', de: 'Wann machen wir die Feier? Vielleicht am Freitag?', en: 'When shall we have the party? Maybe on Friday?' },
              { who: 'B', de: 'Ja, Freitag ist gut. Nach der Arbeit, um 17 Uhr.', en: 'Yes, Friday is good. After work, at five.' },
              { who: 'A', de: 'Und wo? Im Büro oder im Restaurant?', en: 'And where? In the office or at a restaurant?' },
              { who: 'B', de: 'Im Büro ist billiger. Wir können den großen Raum nehmen.', en: 'The office is cheaper. We can use the big room.' },
              { who: 'A', de: 'Gut. Ich kaufe Getränke. Kannst du einen Kuchen backen?', en: 'Good. I will buy drinks. Can you bake a cake?' },
              { who: 'B', de: 'Ja, das mache ich. Und das Geschenk?', en: 'Yes, I will do that. And the present?' },
              { who: 'A', de: 'Wir sammeln Geld im Team und kaufen einen Gutschein.', en: 'We collect money in the team and buy a voucher.' },
              { who: 'B', de: 'Einverstanden. Ich schreibe eine E-Mail an alle.', en: 'Agreed. I will write an email to everyone.' },
            ],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Jetzt mit Begründung, Nachfrage und einem echten Kompromiss. Das ist die Zielmarke.',
            lines: [
              { who: 'A', de: 'Sollen wir mit dem Termin anfangen? Ich würde den Freitag vorschlagen, da müssen die meisten nicht früh raus.', en: 'Shall we start with the date? I would suggest Friday — most people do not have to get up early the next day.' },
              { who: 'B', de: 'Freitag passt mir gut, aber ich arbeite bis vier. Wäre halb fünf in Ordnung für dich?', en: 'Friday suits me, but I work until four. Would half past four be all right for you?' },
              { who: 'A', de: 'Ja, machen wir halb fünf. Und wo? Ich hätte an das Café gegenüber gedacht.', en: 'Yes, let us say half past four. And where? I was thinking of the café opposite.' },
              { who: 'B', de: 'Ehrlich gesagt finde ich das Büro praktischer — da müssen wir nichts reservieren und es kostet nichts. Was hältst du davon?', en: 'To be honest I find the office more practical — we do not have to book anything and it costs nothing. What do you think?' },
              { who: 'A', de: 'Da hast du recht. Dann nehmen wir den Besprechungsraum. Beim Essen würde ich es einfach halten: Brezeln, etwas Obst, ein paar Salate.', en: 'You are right. Then let us take the meeting room. For food I would keep it simple: pretzels, some fruit, a couple of salads.' },
              { who: 'B', de: 'Gute Idee. Ich bringe die Salate mit, ich koche sowieso gern. Übernimmst du dann die Getränke?', en: 'Good idea. I will bring the salads, I like cooking anyway. Will you take care of the drinks?' },
              { who: 'A', de: 'Mache ich. Bleibt noch das Geschenk — hast du eine Idee?', en: 'I will. That leaves the present — do you have an idea?' },
              { who: 'B', de: 'Sie fährt viel Rad. Wie wäre es, wenn wir im Team sammeln und einen Gutschein vom Fahrradladen kaufen?', en: 'She cycles a lot. How about we collect money in the team and buy a voucher from the bike shop?' },
              { who: 'A', de: 'Perfekt. Dann sammle ich das Geld und du schreibst die Einladung an alle. Einverstanden?', en: 'Perfect. Then I will collect the money and you write the invitation to everyone. Agreed?' },
              { who: 'B', de: 'Einverstanden. Ich schicke die Mail noch heute raus.', en: 'Agreed. I will send the email out today.' },
            ],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Höflich widersprechen, einen Einwand aufnehmen, am Ende zusammenfassen — die drei B2-Züge.',
            lines: [
              { who: 'A', de: 'Fangen wir beim Termin an. Der Freitag wäre mir am liebsten, weil danach niemand früh aufstehen muss — es sei denn, du hast schon etwas vor.', en: 'Let us start with the date. Friday would be my preference, since nobody has to get up early afterwards — unless you already have plans.' },
              { who: 'B', de: 'Nein, Freitag geht. Ich müsste allerdings bis vier arbeiten. Könnten wir uns auf halb fünf einigen?', en: 'No, Friday works. I would have to work until four though. Could we settle on half past four?' },
              { who: 'A', de: 'Halb fünf, abgemacht. Beim Ort bin ich unschlüssig: Ein Café wäre gemütlicher, aber wahrscheinlich müssten wir reservieren und jeder zahlt selbst.', en: 'Half past four, agreed. On the venue I am torn: a café would be cosier, but we would probably have to book and everyone would pay for themselves.' },
              { who: 'B', de: 'Genau das spricht dagegen. Ich wäre für den Besprechungsraum — kostenlos, und wir können dekorieren, wie wir wollen.', en: 'That is exactly the argument against it. I would go for the meeting room — free of charge, and we can decorate it however we like.' },
              { who: 'A', de: 'Da kann ich mich anschließen. Dann würde ich vorschlagen, dass wir das Essen bewusst klein halten — lieber ein paar gute Sachen als ein Buffet, das keiner schafft.', en: 'I can go along with that. Then I would suggest we deliberately keep the food small — a few good things rather than a buffet nobody gets through.' },
              { who: 'B', de: 'Sehe ich genauso. Ich kümmere mich um zwei Salate und das Brot, wenn du die Getränke übernimmst. Wobei wir uns beim Alkohol einig sein sollten.', en: 'I see it the same way. I will handle two salads and the bread if you take on the drinks. Though we should agree about alcohol.' },
              { who: 'A', de: 'Guter Punkt. Ich würde es bei einem Glas Sekt zum Anstoßen belassen und sonst alkoholfrei bleiben — es ist ja eine Feier während der Arbeitszeit.', en: 'Good point. I would leave it at a glass of sparkling wine for the toast and otherwise stay alcohol-free — it is a party during working hours, after all.' },
              { who: 'B', de: 'Einverstanden. Beim Geschenk hätte ich einen Vorschlag: Sie fährt jeden Tag mit dem Rad, ein Gutschein vom Fahrradladen käme sicher gut an.', en: 'Agreed. On the present I have a suggestion: she cycles every day, so a voucher from the bike shop would surely go down well.' },
              { who: 'A', de: 'Sehr gute Idee — dann fühlt sich das nicht nach Pflichtgeschenk an. Ich sammle im Team, du kaufst den Gutschein?', en: 'Very good idea — then it will not feel like an obligatory present. I will collect in the team, you buy the voucher?' },
              { who: 'B', de: 'Machen wir. Also noch einmal zusammengefasst: Freitag halb fünf, Besprechungsraum, du Getränke und Sammlung, ich Essen, Gutschein und Einladung. Habe ich etwas vergessen?', en: 'Let us do that. So to summarise: Friday at half past four, meeting room, you on drinks and the collection, me on food, the voucher and the invitation. Have I forgotten anything?' },
              { who: 'A', de: 'Nur eins: Wir sollten ihrem Chef Bescheid sagen, damit sie an dem Nachmittag nicht noch in eine Besprechung muss.', en: 'Just one thing: we should tell her manager, so she is not stuck in a meeting that afternoon.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sp3-ausflug',
    teil: 3,
    title: 'Einen Ausflug mit dem Deutschkurs planen',
    titleEn: 'Planning a day out with the German class',
    minutes: '5–6 Minuten',
    task: 'Ihr Deutschkurs endet in vier Wochen. Zum Abschluss möchten Sie mit der Gruppe einen Ausflug '
      + 'machen. Planen Sie diesen Ausflug zusammen mit Ihrem Partner / Ihrer Partnerin und überlegen Sie, '
      + 'wer welche Aufgabe übernimmt.',
    taskEn: 'Your German course ends in four weeks and you want to finish with a class outing. Plan it '
      + 'together and decide who does what.',
    notes: ['Wohin?', 'Wann und wie lange?', 'Wie kommen wir hin?', 'Was kostet es?', 'Essen', 'Wer informiert die Gruppe?'],
    prompts: [
      {
        id: 't3-ausflug-dialog',
        teil: 3,
        cue: 'Das ganze Gespräch',
        de: 'Planen Sie den Ausflug gemeinsam und einigen Sie sich auf alle Punkte.',
        en: 'Plan the outing together and settle every point on the sheet.',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Sechs kurze Entscheidungen. „Wir können …" und „Ich mache …" tragen das ganze Gespräch.',
            lines: [
              { who: 'A', de: 'Wohin möchten wir fahren? Ich schlage den Zoo vor.', en: 'Where shall we go? I suggest the zoo.' },
              { who: 'B', de: 'Der Zoo ist teuer. Wir können auch an den See fahren.', en: 'The zoo is expensive. We could also go to the lake.' },
              { who: 'A', de: 'Gute Idee. Der See ist billig und schön. Wann fahren wir?', en: 'Good idea. The lake is cheap and nice. When shall we go?' },
              { who: 'B', de: 'Am Samstag, um zehn Uhr. Wir bleiben bis vier.', en: 'On Saturday, at ten. We stay until four.' },
              { who: 'A', de: 'Wie kommen wir hin? Mit dem Bus?', en: 'How do we get there? By bus?' },
              { who: 'B', de: 'Ja, mit dem Bus. Das Gruppenticket kostet nicht viel.', en: 'Yes, by bus. The group ticket is not expensive.' },
              { who: 'A', de: 'Und das Essen? Jeder bringt etwas mit.', en: 'And food? Everyone brings something.' },
              { who: 'B', de: 'Ja. Ich schreibe eine Liste. Sagst du es der Lehrerin?', en: 'Yes. I will write a list. Will you tell the teacher?' },
              { who: 'A', de: 'Ja, das mache ich morgen.', en: 'Yes, I will do that tomorrow.' },
            ],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Vorschläge begründen und mindestens einmal höflich ablehnen — sonst ist es keine Verhandlung.',
            lines: [
              { who: 'A', de: 'Sollen wir zuerst überlegen, wohin wir fahren? Mein Vorschlag wäre der Zoo, da war bestimmt noch nicht jeder.', en: 'Shall we first think about where to go? My suggestion would be the zoo — surely not everyone has been there.' },
              { who: 'B', de: 'Das gefällt mir grundsätzlich, aber der Eintritt kostet über zwanzig Euro. Für unsere Gruppe ist das viel. Wie wäre es stattdessen mit dem See?', en: 'I like that in principle, but admission costs over twenty euros. That is a lot for our group. How about the lake instead?' },
              { who: 'A', de: 'Da hast du recht, das ist zu teuer. Der See ist eine gute Alternative — dort können wir grillen und schwimmen. Sagen wir Samstag in drei Wochen?', en: 'You are right, that is too expensive. The lake is a good alternative — we can barbecue and swim there. Shall we say Saturday in three weeks?' },
              { who: 'B', de: 'Samstag passt. Ich würde vorschlagen, dass wir uns um zehn am Bahnhof treffen und gegen fünf zurück sind.', en: 'Saturday works. I would suggest we meet at ten at the station and are back around five.' },
              { who: 'A', de: 'Einverstanden. Mit dem Bus gibt es ein Gruppenticket, das kostet pro Person nur ein paar Euro. Soll ich mich darum kümmern?', en: 'Agreed. There is a group ticket on the bus, only a few euros per person. Shall I take care of that?' },
              { who: 'B', de: 'Gern. Dann kümmere ich mich ums Essen: Jeder bringt etwas mit, und ich schreibe eine Liste, damit wir nicht fünfmal Kartoffelsalat haben.', en: 'Please do. Then I will look after the food: everyone brings something and I will write a list so we do not end up with potato salad five times.' },
              { who: 'A', de: 'Sehr gut. Und wer informiert die Gruppe? Ich könnte es am Montag im Kurs sagen.', en: 'Very good. And who tells the group? I could say it in class on Monday.' },
              { who: 'B', de: 'Mach das, und ich schreibe zusätzlich in unsere Kursgruppe im Handy. Dann wissen es auch die, die fehlen.', en: 'Do that, and I will also post in our class group on the phone. Then the people who are absent will know too.' },
            ],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Ein Problem vorwegnehmen („was, wenn es regnet?") zeigt Aufgabenbewältigung auf höchster Stufe.',
            lines: [
              { who: 'A', de: 'Bevor wir uns auf ein Ziel festlegen: Wir sollten daran denken, dass zwei aus dem Kurs kleine Kinder haben. Etwas, das gut erreichbar ist, wäre also klug.', en: 'Before we settle on a destination: we should remember that two people in the class have small children. So something easy to reach would be sensible.' },
              { who: 'B', de: 'Guter Einwand. Damit fällt der Zoo eigentlich schon weg, der liegt am anderen Ende der Stadt und ist obendrein teuer. Ich wäre für den See.', en: 'Good point. That effectively rules out the zoo, which is at the other end of town and expensive on top of that. I would go for the lake.' },
              { who: 'A', de: 'Dem stimme ich zu. Nur eine Sache: Was machen wir, wenn es an dem Tag regnet? Ich fände es besser, wenn wir gleich einen Ersatzplan hätten.', en: 'I agree. Just one thing: what do we do if it rains that day? I would prefer to have a fallback ready.' },
              { who: 'B', de: 'Dann könnten wir ins Museum ausweichen, sonntags ist der Eintritt frei. Aber lass uns erst das Wichtigste festlegen: Samstag in drei Wochen, Treffpunkt zehn Uhr am Bahnhof?', en: 'Then we could switch to the museum — admission is free on Sundays. But let us settle the main thing first: Saturday in three weeks, meeting at ten at the station?' },
              { who: 'A', de: 'Genau so. Bei den Kosten würde ich darauf achten, dass niemand ausgeschlossen wird. Mit dem Gruppenticket kämen wir auf etwa vier Euro pro Person, das sollte für alle machbar sein.', en: 'Exactly. On costs I would make sure nobody is excluded. With the group ticket we would be at about four euros a head, which should be manageable for everyone.' },
              { who: 'B', de: 'Sehe ich auch so. Ich übernehme das Essen und schreibe eine Liste, damit sich die Sachen nicht doppeln — und damit wir an die denken, die kein Schweinefleisch essen.', en: 'I see it the same way. I will take on the food and write a list so things do not double up — and so we think of those who do not eat pork.' },
              { who: 'A', de: 'Daran hätte ich nicht gedacht, danke. Dann kümmere ich mich um die Fahrkarten und rede am Montag mit der Lehrerin, ob sie mitkommt.', en: 'I would not have thought of that, thank you. Then I will handle the tickets and talk to the teacher on Monday about whether she is coming.' },
              { who: 'B', de: 'Halten wir fest: See, Samstag in drei Wochen, zehn Uhr Bahnhof, Gruppenticket über dich, Essen über mich, Museum als Plan B. Fehlt noch etwas?', en: 'Let us note it down: lake, Saturday in three weeks, ten o’clock at the station, group ticket via you, food via me, museum as plan B. Anything missing?' },
              { who: 'A', de: 'Nur die Rückmeldung — ich würde sagen, wer mitkommt, meldet sich bis Mittwoch, sonst können wir nicht planen.', en: 'Only the replies — I would say anyone coming confirms by Wednesday, otherwise we cannot plan.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sp3-nachbarn',
    teil: 3,
    title: 'Ein Fest für die neuen Nachbarn organisieren',
    titleEn: 'Organising a party for the new neighbours',
    minutes: '5–6 Minuten',
    task: 'In Ihr Haus ist eine Familie aus dem Ausland eingezogen. Sie möchten die Familie zusammen mit '
      + 'den anderen Nachbarn willkommen heißen und ein kleines Fest im Hof organisieren. Planen Sie das '
      + 'Fest mit Ihrem Partner / Ihrer Partnerin.',
    taskEn: 'A family from abroad has moved into your building. Plan a small welcome party in the courtyard '
      + 'with the other neighbours.',
    notes: ['Wann?', 'Wo genau?', 'Wen einladen?', 'Essen und Getränke', 'Musik?', 'Wer räumt auf?'],
    prompts: [
      {
        id: 't3-nachbarn-dialog',
        teil: 3,
        cue: 'Das ganze Gespräch',
        de: 'Planen Sie das Fest gemeinsam. Einigen Sie sich auf alle Punkte der Notizen.',
        en: 'Plan the party together and agree on every point in the notes.',
        models: [
          {
            band: 'A2', label: 'Sicher',
            note: 'Kurze Sätze, klare Aufgaben. „Ich frage …", „Du machst …" — das reicht für Kriterium 2.',
            lines: [
              { who: 'A', de: 'Wann machen wir das Fest? Am Sonntagnachmittag?', en: 'When shall we hold the party? Sunday afternoon?' },
              { who: 'B', de: 'Ja, Sonntag um drei. Dann haben alle Zeit.', en: 'Yes, Sunday at three. Then everyone has time.' },
              { who: 'A', de: 'Wir machen es im Hof. Da ist Platz für Tische.', en: 'We will do it in the courtyard. There is room for tables.' },
              { who: 'B', de: 'Gut. Wen laden wir ein? Alle aus dem Haus?', en: 'Good. Who shall we invite? Everyone in the building?' },
              { who: 'A', de: 'Ja, alle. Ich hänge einen Zettel ins Treppenhaus.', en: 'Yes, everyone. I will put a note in the stairwell.' },
              { who: 'B', de: 'Jeder bringt etwas zu essen mit. Ich kaufe Getränke.', en: 'Everyone brings something to eat. I will buy drinks.' },
              { who: 'A', de: 'Und Musik? Nicht zu laut, wegen der Nachbarn.', en: 'And music? Not too loud, because of the neighbours.' },
              { who: 'B', de: 'Leise Musik ist okay. Um sieben räumen wir zusammen auf.', en: 'Quiet music is fine. At seven we tidy up together.' },
            ],
          },
          {
            band: 'B1', label: 'Ziel',
            note: 'Rücksicht auf andere („damit sich niemand ausgeschlossen fühlt") ist hier der stärkste Inhalt.',
            lines: [
              { who: 'A', de: 'Ich würde vorschlagen, dass wir das Fest an einem Sonntagnachmittag machen — da sind die meisten zu Hause und niemand muss am nächsten Morgen früh raus.', en: 'I would suggest we hold the party on a Sunday afternoon — most people are at home then and nobody has to get up early the next morning.' },
              { who: 'B', de: 'Sonntag finde ich gut, sagen wir um drei. Im Hof haben wir genug Platz, und wenn es regnet, könnten wir in den Fahrradkeller ausweichen.', en: 'Sunday sounds good, let us say three. There is enough room in the courtyard, and if it rains we could move into the bike cellar.' },
              { who: 'A', de: 'Einverstanden. Beim Einladen sollten wir aufpassen, dass sich niemand ausgeschlossen fühlt — ich hänge einen Zettel ins Treppenhaus und klingle bei den älteren Nachbarn persönlich.', en: 'Agreed. With the invitations we should be careful that nobody feels left out — I will put a note in the stairwell and ring the older neighbours’ bells in person.' },
              { who: 'B', de: 'Das ist eine gute Idee. Beim Essen würde ich sagen: Jeder bringt etwas aus seiner Küche mit. Dann lernen sich die Leute auch gleich über das Essen kennen.', en: 'That is a good idea. For food I would say everyone brings something from their own kitchen. Then people get to know each other through the food as well.' },
              { who: 'A', de: 'Sehr schön. Ich kümmere mich um Getränke und Becher. Was meinst du zu Musik?', en: 'Very nice. I will look after drinks and cups. What do you think about music?' },
              { who: 'B', de: 'Musik ja, aber leise. Sonst beschwert sich Frau Weber aus dem Erdgeschoss, und das wäre genau das Gegenteil von dem, was wir wollen.', en: 'Music yes, but quiet. Otherwise Mrs Weber on the ground floor will complain, and that would be exactly the opposite of what we want.' },
              { who: 'A', de: 'Dann laden wir sie einfach mit ein. Und beim Aufräumen — sagen wir, wir hören um sieben auf und räumen alle zusammen auf?', en: 'Then we will simply invite her too. And about clearing up — shall we say we finish at seven and all tidy up together?' },
              { who: 'B', de: 'Genau. Ich schreibe das auf den Zettel dazu, dann weiß es jeder vorher.', en: 'Exactly. I will write that on the note, then everyone knows in advance.' },
            ],
          },
          {
            band: 'B2', label: 'Stark',
            note: 'Ein Vorschlag, der die Perspektive der neuen Familie mitdenkt — Inhalt ist hier der Punktbringer.',
            lines: [
              { who: 'A', de: 'Eine Sache vorweg: Ich würde das Fest bewusst klein halten. Wenn die Familie gerade erst angekommen ist, wäre ein großes Willkommensfest womöglich eher überfordernd als nett gemeint.', en: 'One thing up front: I would deliberately keep the party small. If the family has only just arrived, a big welcome party might be more overwhelming than kindly meant.' },
              { who: 'B', de: 'Der Gedanke gefällt mir. Dann also Sonntagnachmittag im Hof, ein paar Tische, und wer will, kommt dazu — statt einer festen Einladung mit Programm.', en: 'I like that thought. So Sunday afternoon in the courtyard, a few tables, and anyone who wants joins in — rather than a formal invitation with a programme.' },
              { who: 'A', de: 'Genau. Ich würde trotzdem persönlich bei ihnen klingeln, damit sie es nicht nur vom Zettel im Treppenhaus erfahren. Das macht einen Unterschied.', en: 'Exactly. I would still ring their bell in person so they do not just learn about it from the note in the stairwell. That makes a difference.' },
              { who: 'B', de: 'Unbedingt. Beim Essen wäre ich dafür, dass jeder etwas mitbringt — allerdings sollten wir dazuschreiben, was drin ist. Nicht jeder isst alles, und das fragt sich am Buffet niemand gern laut.', en: 'Definitely. On food I would be for everyone bringing something — though we should write down what is in it. Not everyone eats everything, and nobody likes asking out loud at the buffet.' },
              { who: 'A', de: 'Daran hätte ich nicht gedacht, das ist ein guter Punkt. Ich übernehme Getränke und Geschirr; könntest du die Tische und Bänke aus dem Keller organisieren?', en: 'I would not have thought of that, it is a good point. I will take on drinks and crockery; could you organise the tables and benches from the cellar?' },
              { who: 'B', de: 'Mache ich. Musik würde ich weglassen oder höchstens ganz leise laufen lassen — man versteht sich sonst schlecht, und darum geht es ja gerade.', en: 'I will. I would leave out music, or at most have it very quiet — otherwise you cannot hear each other, and that is precisely the point.' },
              { who: 'A', de: 'Einverstanden. Bleibt das Aufräumen: Wenn wir das vorher ansagen, hilft erfahrungsgemäß die Hälfte mit; wenn nicht, stehen wir beide um neun allein im Hof.', en: 'Agreed. That leaves the clearing up: if we announce it in advance, in my experience half of them help; if not, the two of us are standing in the courtyard alone at nine.' },
              { who: 'B', de: 'Dann schreiben wir es auf den Zettel: drei bis sieben, danach räumen alle gemeinsam auf. Fassen wir zusammen — Sonntag drei Uhr, Hof, jeder bringt etwas mit, du Getränke, ich Tische, wir beide klingeln vorher persönlich?', en: 'Then we will write it on the note: three to seven, then everyone clears up together. To summarise — Sunday at three, courtyard, everyone brings something, you on drinks, me on tables, and we both ring their bell in advance?' },
            ],
          },
        ],
      },
    ],
  },
];

export const SPEAKING: SpeakingTopic[] = [TEIL1, ...TEIL2, ...TEIL3];

// ---- Redemittel ------------------------------------------------------------
// The phrase bank is the highest-yield thing in the whole oral. Four criteria are
// marked, and two of them — Aufgabenbewältigung and Ausdrucksfähigkeit — are
// largely a question of whether you have the right formula ready. These are the
// ones that carry the exam; they are worth knowing cold rather than half-knowing
// twenty more.

export const REDEMITTEL: Redemittel[] = [
  {
    group: 'Teil 1 · ins Gespräch kommen',
    phrases: [
      { de: 'Darf ich mich kurz vorstellen? Ich heiße …', en: 'May I briefly introduce myself? My name is …' },
      { de: 'Und wie ist das bei Ihnen?', en: 'And how is it with you?' },
      { de: 'Das ging mir genauso.', en: 'It was exactly the same for me.' },
      { de: 'Ach, interessant — erzählen Sie mehr davon.', en: 'Oh, interesting — do tell me more.' },
      { de: 'Entschuldigung, könnten Sie das bitte wiederholen?', en: 'Sorry, could you repeat that please?' },
    ],
  },
  {
    group: 'Eine Vorlage zusammenfassen (Teil 2)',
    phrases: [
      { de: 'Auf meinem Blatt geht es um …', en: 'My sheet is about …' },
      { de: 'Ich habe hier Informationen zum Thema …', en: 'I have information here on the topic of …' },
      { de: 'Besonders interessant finde ich, dass …', en: 'What I find particularly interesting is that …' },
      { de: 'Aus der Statistik geht hervor, dass …', en: 'The statistics show that …' },
      { de: 'Was steht denn auf deinem Blatt?', en: 'And what does your sheet say?' },
    ],
  },
  {
    group: 'Die eigene Meinung sagen',
    phrases: [
      { de: 'Ich finde / Meiner Meinung nach …', en: 'I think / In my opinion …' },
      { de: 'Ich bin der Meinung, dass …', en: 'I am of the opinion that …' },
      { de: 'Für mich ist wichtig, dass …', en: 'For me it is important that …' },
      { de: 'Ehrlich gesagt …', en: 'To be honest …' },
      { de: 'Einerseits … , andererseits …', en: 'On the one hand … , on the other hand …' },
      { de: 'Es kommt darauf an, ob …', en: 'It depends on whether …' },
    ],
  },
  {
    group: 'Zustimmen und widersprechen',
    phrases: [
      { de: 'Da bin ich ganz deiner Meinung.', en: 'I completely agree with you.' },
      { de: 'Das sehe ich genauso.', en: 'I see it the same way.' },
      { de: 'Da hast du recht, aber …', en: 'You are right there, but …' },
      { de: 'Das stimmt schon, trotzdem …', en: 'That is true, all the same …' },
      { de: 'Das sehe ich etwas anders.', en: 'I see that somewhat differently.' },
      { de: 'Ich bin da nicht ganz sicher.', en: 'I am not entirely sure about that.' },
    ],
  },
  {
    group: 'Vorschlagen und planen (Teil 3)',
    phrases: [
      { de: 'Ich würde vorschlagen, dass wir …', en: 'I would suggest that we …' },
      { de: 'Wie wäre es, wenn wir …?', en: 'How would it be if we …?' },
      { de: 'Sollen wir vielleicht …?', en: 'Shall we perhaps …?' },
      { de: 'Was hältst du davon?', en: 'What do you think of that?' },
      { de: 'Einverstanden. / Abgemacht.', en: 'Agreed. / It’s a deal.' },
      { de: 'Dann übernehme ich … und du kümmerst dich um …', en: 'Then I will take on … and you will look after …' },
      { de: 'Halten wir fest: …', en: 'So let us establish: …' },
    ],
  },
  {
    group: 'Zeit gewinnen, ohne zu schweigen',
    phrases: [
      { de: 'Moment, lass mich kurz überlegen.', en: 'One moment, let me think for a second.' },
      { de: 'Das ist eine gute Frage.', en: 'That is a good question.' },
      { de: 'Wie soll ich sagen …', en: 'How shall I put it …' },
      { de: 'Mir fällt das Wort gerade nicht ein — ich meine so etwas wie …', en: 'The word escapes me — I mean something like …' },
      { de: 'Also, ich fange mal so an: …', en: 'Right, let me start like this: …' },
    ],
  },
];
