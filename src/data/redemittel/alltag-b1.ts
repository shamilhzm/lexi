// Redemittel for the counter, the phone and the corridor — the transactional half.
//
// ## Why this file is not in `exams/`
//
// Every other Redemittel in the app arrives inside a speaking paper, and that is
// exactly what was wrong with the inventory. The audit on 2026-08-29 (see
// [BACKLOG](../../../docs/BACKLOG.md)) matched Lexi against *Schritte plus Neu 6*
// and found all 27 shipped groups to be **exam discourse**: stating an opinion,
// weighing, structuring a talk, buying time, conceding without folding. Excellent
// material for the twenty minutes of a Sprechen module, and none of it helps you
// return a kettle.
//
// The course book spends four of its seven Lektionen on the other kind:
//
//   sich beschweren / etwas reklamieren            Lektion 10
//   einen Arbeitsauftrag höflich ablehnen          Lektion 8
//   ein Problem beschreiben, sich beraten lassen   Lektion 12
//   Verbesserungsvorschläge machen                 Lektion 13
//   über Pannen und Missgeschicke sprechen         Lektion 10
//
// These are DTZ speaking content *and* ordinary survival language, and they are
// the reason `der Beleg`, `der Umtausch` and `die Lieferung` sit where they do in
// the book. So the file lives beside the papers rather than inside one: a
// `Redemittel[]` export is all `redemittel.ts` consumes, and nothing about that
// contract says a group has to belong to a certificate.
//
// ## Register, chosen per group and not globally
//
// The papers are uniformly formal because an examiner is present. Real life is
// not: you reklamierst in **Sie** at a service desk, and you turn down a colleague's
// request in **du** because that is who asks. The `du` groups are the two that
// happen between colleagues; the counter groups are `Sie`. Getting this wrong is
// not a style slip — a learner who complains to a shop in `du` has been taught
// something actively harmful.
//
// ## Level
//
// All B1. The book is Niveau B1/2 and the syntax here stays inside it: `würde` +
// Infinitiv, `könnten Sie`, a `dass`-clause, one `ohne … zu`. Nothing needs
// Konjunktiv II of a full verb, and nothing needs the Passiv.
import type { Redemittel } from '../../lib/exam.ts';

export const ALLTAG_B1_REDEMITTEL: Redemittel[] = [
  {
    // The single most useful sequence at B1, and the one most courses skip: open,
    // state the fault, say what you want. The third step is the one learners
    // omit — a complaint with no request attached gets sympathy and nothing else.
    group: 'Sich beschweren und reklamieren',
    phrases: [
      { de: 'Entschuldigung, ich habe ein Problem mit …', en: 'Excuse me, I have a problem with …' },
      { de: 'Ich möchte mich über … beschweren.', en: 'I would like to complain about …' },
      { de: 'Ich habe das vor einer Woche hier gekauft. Hier ist der Beleg.', en: 'I bought this here a week ago. Here is the receipt.' },
      { de: 'Leider funktioniert es nicht richtig.', en: 'Unfortunately it does not work properly.' },
      { de: 'Die Lieferung ist beschädigt angekommen.', en: 'The delivery arrived damaged.' },
      { de: 'Könnten Sie mir das bitte umtauschen?', en: 'Could you exchange this for me, please?' },
      { de: 'Ich hätte gern mein Geld zurück.', en: 'I would like my money back.' },
      { de: 'Mit wem kann ich darüber sprechen?', en: 'Who can I speak to about this?' },
    ],
  },
  {
    // `du`: this is a colleague asking, and the whole difficulty is saying no
    // without damage. Every phrase gives a reason or an alternative, because a
    // bare "nein" is what learners default to and what costs them at work.
    group: 'Höflich ablehnen',
    phrases: [
      { de: 'Das schaffe ich diese Woche leider nicht.', en: 'I am afraid I will not manage that this week.' },
      { de: 'Da muss ich leider passen.', en: 'I am afraid I will have to pass on that.' },
      { de: 'Ich würde gern, aber ich habe schon zwei andere Sachen zugesagt.', en: 'I would like to, but I have already said yes to two other things.' },
      { de: 'Können wir das auf nächste Woche verschieben?', en: 'Could we move that to next week?' },
      { de: 'Könnte das vielleicht jemand anders übernehmen?', en: 'Could someone else take that on, perhaps?' },
      { de: 'Wenn ich das mache, bleibt der Bericht liegen. Was ist dir wichtiger?', en: 'If I do that, the report will not get done. Which matters more to you?' },
      { de: 'Sag mir bitte früh Bescheid, dann kann ich es einplanen.', en: 'Please let me know early, then I can plan it in.' },
    ],
  },
  {
    // Describe, then *ask*. The book's Lektion 12 pairs these because a learner
    // who can only describe ends up telling a story to someone who was waiting to
    // help — the question at the end is what converts it into advice.
    group: 'Ein Problem beschreiben und sich beraten lassen',
    phrases: [
      { de: 'Ich habe da ein Problem und weiß nicht weiter.', en: 'I have a problem here and I do not know what to do next.' },
      { de: 'Es geht um Folgendes: …', en: 'It is about the following: …' },
      { de: 'Das Problem ist, dass …', en: 'The problem is that …' },
      { de: 'Ich habe schon versucht, … zu …, aber es hat nichts gebracht.', en: 'I have already tried to …, but it did not help.' },
      { de: 'Was würden Sie mir raten?', en: 'What would you advise me to do?' },
      { de: 'An wen kann ich mich da wenden?', en: 'Who can I turn to about that?' },
      { de: 'Was würdest du an meiner Stelle machen?', en: 'What would you do in my position?' },
      { de: 'Danke, das hilft mir schon weiter.', en: 'Thank you, that already helps.' },
    ],
  },
  {
    // Improvement, not criticism: each of these puts the fix in front of the
    // fault. `Man könnte …` is the load-bearing one and is worth the card on its
    // own — it proposes without naming anyone as the cause.
    group: 'Verbesserungsvorschläge machen',
    phrases: [
      { de: 'Mir ist aufgefallen, dass …', en: 'It struck me that …' },
      { de: 'Man könnte das vielleicht anders machen.', en: 'One could perhaps do that differently.' },
      { de: 'Ich hätte da einen Vorschlag.', en: 'I have a suggestion, if I may.' },
      { de: 'Wäre es nicht besser, wenn …?', en: 'Would it not be better if …?' },
      { de: 'Was halten Sie davon, wenn wir …?', en: 'What would you think if we …?' },
      { de: 'Das würde uns viel Zeit sparen.', en: 'That would save us a lot of time.' },
      { de: 'Es ist nur eine Idee — aber vielleicht hilft es.', en: 'It is only an idea — but perhaps it helps.' },
    ],
  },
  {
    // Telling the story afterwards, which is a different job from complaining:
    // the tense is Perfekt, the mood is rueful, and `Zum Glück` / `Das kann
    // passieren` are how the exchange is allowed to end.
    group: 'Über Pannen und Missgeschicke sprechen',
    phrases: [
      { de: 'Mir ist gestern etwas Dummes passiert.', en: 'Something silly happened to me yesterday.' },
      { de: 'Das ist mir noch nie passiert.', en: 'That has never happened to me before.' },
      { de: 'Ich habe den Zug um zwei Minuten verpasst.', en: 'I missed the train by two minutes.' },
      { de: 'Es ist alles schiefgegangen.', en: 'Everything went wrong.' },
      { de: 'So ein Pech!', en: 'What bad luck!' },
      { de: 'Zum Glück ist nichts Schlimmes passiert.', en: 'Luckily nothing serious happened.' },
      { de: 'Das kann jedem mal passieren.', en: 'That can happen to anyone.' },
      { de: 'Beim nächsten Mal mache ich es anders.', en: 'Next time I will do it differently.' },
    ],
  },
];
