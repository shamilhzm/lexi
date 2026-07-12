// Adds curated grammar paradigm points for the hard closed-class tables that
// don't belong in the frequency-driven vocab stream (demonstratives, possessives,
// negation, relative pronouns, personal-pronoun cases, passive "worden",
// interrogatives). Each point becomes BOTH a Gym drill (grammar.json GPoint) and
// a flip-card (vocab.json kind:'grammar'), mirroring the existing 74/76. Append-
// only and idempotent — existing points are never touched.
//
//   npm run corpus:grammar            # dry run — lists what would be added
//   npm run corpus:grammar -- --write # apply to public/data/{grammar,vocab}.json
import { PATHS } from './config.ts';
import { readJSON, writeJSON, LEVELS, type Word, type SectorMeta } from './lib.ts';
import type { GExercise, GPoint, GrammarByLevel } from '../../src/lib/grammar.ts';
import type { CEFR } from '../../src/types.ts';

interface NewPoint { level: CEFR; title: string; summary: string; rule: string; exercises: GExercise[]; }

const POINTS: NewPoint[] = [
  {
    level: 'A1', title: 'dieser-Wörter (Demonstrativa)',
    summary: 'dieser/diese/dieses decline like der/die/das.',
    rule: 'The demonstratives dieser (this), jener (that), jeder (every) and welcher (which) take the same endings as the definite article: dieser Mann, diese Frau, dieses Kind; accusative diesen Mann; dative diesem Mann, dieser Frau, diesem Kind; plural diese. Learn them as "der-words".',
    exercises: [
      { kind: 'choose', prompt: '___ Mann kenne ich gut.', options: ['Dieser', 'Diese', 'Dieses'], answer: 0, explain: 'Mann is masculine, nominative → dieser.' },
      { kind: 'choose', prompt: 'Ich nehme ___ Buch.', options: ['dieses', 'diesen', 'diesem'], answer: 0, explain: 'Buch neuter, accusative = nominative → dieses.' },
      { kind: 'type', prompt: 'Mit ___ Frau habe ich gesprochen. (this)', accept: ['dieser'], explain: 'Frau feminine, dative → dieser.' },
      { kind: 'choose', prompt: '___ Kinder spielen draußen.', options: ['Diese', 'Dieser', 'Diesem'], answer: 0, explain: 'Plural nominative → diese.' },
      { kind: 'mc', prompt: 'Which is dative masculine?', options: ['diesem Mann', 'diesen Mann', 'dieser Mann'], answer: 0, explain: 'Dative masculine → diesem.' },
    ],
  },
  {
    level: 'A1', title: 'Possessivartikel (mein, dein …)',
    summary: 'mein/dein/sein/ihr take ein-word endings.',
    rule: 'Possessives (mein, dein, sein, ihr, unser, euer, Ihr) take the same endings as ein/kein: mein Vater, meine Mutter, mein Kind; accusative meinen Vater; dative meinem Vater, meiner Mutter, meinem Kind; plural meine. The stem shows the possessor, the ending agrees with the following noun.',
    exercises: [
      { kind: 'choose', prompt: 'Das ist ___ Vater.', options: ['mein', 'meine', 'meinen'], answer: 0, explain: 'Vater masc. nominative, ein-word → no ending: mein.' },
      { kind: 'choose', prompt: 'Ich sehe ___ Bruder.', options: ['meinen', 'mein', 'meinem'], answer: 0, explain: 'Masculine accusative → meinen.' },
      { kind: 'type', prompt: 'Ich helfe ___ Schwester. (my)', accept: ['meiner'], explain: 'Schwester fem., dative → meiner.' },
      { kind: 'choose', prompt: '___ Eltern wohnen in Berlin.', options: ['Meine', 'Mein', 'Meiner'], answer: 0, explain: 'Plural → meine.' },
      { kind: 'error', prompt: 'Ich spreche mit meiner Vater.', answer: 3, fix: 'Ich spreche mit meinem Vater.', explain: 'Vater masc., dative → meinem.' },
    ],
  },
  {
    level: 'A1', title: 'Negation: nicht vs. kein',
    summary: 'kein negates nouns; nicht negates the rest.',
    rule: 'Use kein to negate a noun that would take ein or no article: Ich habe kein Auto. kein declines like ein/mein: keinen (m. acc.), keinem/keiner (dat.), keine (pl.). Use nicht for verbs, adjectives or definite nouns: Ich kenne ihn nicht.',
    exercises: [
      { kind: 'choose', prompt: 'Ich habe ___ Zeit.', options: ['keine', 'kein', 'keinen'], answer: 0, explain: 'Zeit feminine → keine.' },
      { kind: 'choose', prompt: 'Er hat ___ Bruder.', options: ['keinen', 'kein', 'keinem'], answer: 0, explain: 'Masculine accusative → keinen.' },
      { kind: 'type', prompt: 'Das ist ___ gute Idee. (no)', accept: ['keine'], explain: 'Idee feminine → keine.' },
      { kind: 'mc', prompt: 'Negate: „Ich kenne den Mann.“', options: ['Ich kenne den Mann nicht.', 'Ich kenne kein Mann.', 'Ich kenne den Mann kein.'], answer: 0, explain: 'Definite noun → nicht.' },
      { kind: 'choose', prompt: 'Wir haben ___ Kinder.', options: ['keine', 'kein', 'keinen'], answer: 0, explain: 'Plural → keine.' },
    ],
  },
  {
    level: 'A2', title: 'Personalpronomen (Akkusativ & Dativ)',
    summary: 'mich/dich/ihn… (acc.) vs. mir/dir/ihm… (dat.).',
    rule: 'Accusative pronouns: mich, dich, ihn, sie, es, uns, euch, sie/Sie. Dative pronouns: mir, dir, ihm, ihr, ihm, uns, euch, ihnen/Ihnen. Some verbs (helfen, danken, gefallen) take the dative. With two objects, a pronoun comes before a noun.',
    exercises: [
      { kind: 'choose', prompt: 'Kannst du ___ helfen?', options: ['mir', 'mich', 'ich'], answer: 0, explain: 'helfen takes the dative → mir.' },
      { kind: 'choose', prompt: 'Ich sehe ___ jeden Tag.', options: ['ihn', 'ihm', 'er'], answer: 0, explain: 'Accusative → ihn.' },
      { kind: 'type', prompt: 'Ich gebe ___ das Buch. (to her)', accept: ['ihr'], explain: 'Dative → ihr.' },
      { kind: 'choose', prompt: 'Der Film gefällt ___.', options: ['uns', 'wir', 'unser'], answer: 0, explain: 'gefallen takes the dative → uns.' },
      { kind: 'mc', prompt: 'Correct order?', options: ['Ich gebe ihm das Buch.', 'Ich gebe das Buch ihm.', 'Ich gebe ihm es.'], answer: 0, explain: 'Pronoun dative before noun accusative.' },
    ],
  },
  {
    // Contraction inventory curated from the categorized wordlist's
    // preposition-with-article.txt / contraction.txt — standard written forms only;
    // spoken elisions in that list (gehts, wennste, biste …) are excluded.
    level: 'A2', title: 'Verschmelzung: Präposition + Artikel (im, am, zum …)',
    summary: 'in dem→im, an das→ans, zu der→zur.',
    rule: 'German fuses many prepositions with a following definite article: an/in + dem → am/im; an/in + das → ans/ins; bei/von/zu + dem → beim/vom/zum; zu + der → zur; and auf/für/um/durch + das → aufs/fürs/ums/durchs. These are the everyday, unmarked forms. With two-way prepositions (Wechselpräpositionen) the case still follows the meaning: position (wo?) takes the dative (im, am), direction (wohin?) takes the accusative (ins, ans). Keep the full "in dem/das" only to stress the article: „in dem Haus, das ich meine".',
    exercises: [
      { kind: 'choose', prompt: 'Ich gehe ___ Kino.', options: ['ins', 'im', 'in dem'], answer: 0, explain: 'Direction (wohin?) → accusative in das → ins.' },
      { kind: 'choose', prompt: 'Wir treffen uns ___ Bahnhof.', options: ['am', 'ans', 'an das'], answer: 0, explain: 'Position (wo?) → dative an dem → am.' },
      { kind: 'type', prompt: 'Ich fahre ___ Arbeit. (zu der)', accept: ['zur'], explain: 'zu der → zur.' },
      { kind: 'mc', prompt: 'Combine „von dem":', options: ['vom', 'von’s', 'vondem'], answer: 0, explain: 'von dem → vom.' },
      { kind: 'error', prompt: 'Ich gehe im Kino.', answer: 2, fix: 'Ich gehe ins Kino.', explain: 'gehen = direction (wohin?) → in das = ins, not in dem (im).' },
    ],
  },
  {
    level: 'B1', title: 'Relativpronomen (der, die, das)',
    summary: 'Relative clauses use der/die/das; case from the clause.',
    rule: 'A relative pronoun agrees with its noun in gender/number but takes its case from its role in the relative clause: der Mann, der dort steht (nom.); den ich kenne (acc.); dem ich helfe (dat.); dessen Auto … (gen.). Plural dative/genitive: denen, deren. The conjugated verb moves to the end.',
    exercises: [
      { kind: 'choose', prompt: 'Das ist der Mann, ___ mir geholfen hat.', options: ['der', 'den', 'dem'], answer: 0, explain: 'Subject of the clause → nominative der.' },
      { kind: 'choose', prompt: 'Das Buch, ___ ich lese, ist gut.', options: ['das', 'dem', 'dessen'], answer: 0, explain: 'Neuter accusative → das.' },
      { kind: 'type', prompt: 'Die Frau, ___ ich danke, ist nett. (dat.)', accept: ['der'], explain: 'Feminine dative → der.' },
      { kind: 'choose', prompt: 'Die Kinder, ___ ich helfe, lernen schnell.', options: ['denen', 'die', 'deren'], answer: 0, explain: 'Plural dative → denen.' },
      { kind: 'order', prompt: 'Build: „…, den ich gestern gesehen habe.“', tiles: ['den', 'ich', 'gestern', 'gesehen', 'habe'], explain: 'Relative pronoun first, verb last.' },
    ],
  },
  {
    level: 'B1', title: 'welcher & was für ein',
    summary: 'welcher = which; was für (ein) = what kind of.',
    rule: 'welcher/welche/welches declines like dieser and asks about a specific choice: Welches Buch liest du? "was für ein" asks about type; the ein declines for case while für does not govern it: Was für ein Auto ist das? In the plural drop ein: Was für Bücher magst du?',
    exercises: [
      { kind: 'choose', prompt: '___ Kleid nimmst du?', options: ['Welches', 'Welcher', 'Welchem'], answer: 0, explain: 'Kleid neuter accusative → welches.' },
      { kind: 'choose', prompt: 'In ___ Haus wohnst du?', options: ['welchem', 'welches', 'welcher'], answer: 0, explain: 'Haus neuter dative → welchem.' },
      { kind: 'type', prompt: '___ Farbe magst du? (which)', accept: ['Welche', 'welche'], explain: 'Farbe feminine → welche.' },
      { kind: 'mc', prompt: 'Ask about the type of car:', options: ['Was für ein Auto ist das?', 'Welches für Auto ist das?', 'Was Auto ist das?'], answer: 0, explain: '"was für ein" asks about type.' },
      { kind: 'choose', prompt: '___ Schuhe sind das?', options: ['Was für', 'Welches', 'Was für ein'], answer: 0, explain: 'Plural drops ein → was für.' },
    ],
  },
  {
    level: 'B2', title: 'Passiv Perfekt: „ist … worden“',
    summary: 'Perfect passive uses worden, not geworden.',
    rule: 'The passive is werden + past participle: Das Haus wird gebaut. In the perfect, the auxiliary werden becomes worden (not geworden): Das Haus ist gebaut worden. Only the full verb werden ("to become") uses geworden: Er ist Arzt geworden.',
    exercises: [
      { kind: 'choose', prompt: 'Das Haus ist letztes Jahr gebaut ___.', options: ['worden', 'geworden', 'werden'], answer: 0, explain: 'Passive perfect → worden.' },
      { kind: 'mc', prompt: 'Correct perfect passive?', options: ['Der Brief ist geschrieben worden.', 'Der Brief ist geschrieben geworden.', 'Der Brief hat geschrieben worden.'], answer: 0, explain: 'sein + participle + worden.' },
      { kind: 'choose', prompt: 'Er ist Lehrer ___.', options: ['geworden', 'worden', 'werden'], answer: 0, explain: 'Full verb werden → geworden.' },
      { kind: 'type', prompt: 'Das Auto ist repariert ___. (passive perfect)', accept: ['worden'], explain: 'Passive → worden.' },
      { kind: 'error', prompt: 'Die Tür ist geöffnet geworden.', answer: 4, fix: 'Die Tür ist geöffnet worden.', explain: 'Passive perfect → worden, not geworden.' },
    ],
  },

  // ── High-frequency function words from the coverage gap ───────────────────
  // These closed-class words (degree/focus particles, coordinating conjunctions,
  // text adverbs, modal particles) sit at the very top of the frequency list but
  // make poor translation flashcards — "nur = only" teaches nothing about
  // placement or nuance. They are taught here as in-context usage exercises,
  // which is where they actually live in a learner's voice. Deliberately excludes
  // pronouns, proper nouns/entities, and filler interjections; and avoids the
  // connective adverbs (deshalb/trotzdem …) and two-part correlatives already
  // covered by "Konnektoren (deshalb/trotzdem)" and "Zweiteilige Konnektoren".
  {
    level: 'A2', title: 'Gradpartikeln: sehr, ganz, ziemlich, gar',
    summary: 'sehr / ziemlich / ganz scale an adjective; gar nicht = not at all.',
    rule: 'Degree particles stand directly before the adjective or adverb they scale and never take an ending: sehr gut (very good), ziemlich groß (quite big), ganz neu (completely new, before an article-less adjective). To strengthen a negation, gar or überhaupt reinforce it: gar nicht = not at all, gar kein = none whatsoever.',
    exercises: [
      { kind: 'choose', prompt: 'Der Film war ___ gut.', options: ['sehr', 'viel', 'gut'], answer: 0, explain: 'Intensify an adjective → sehr gut.' },
      { kind: 'choose', prompt: 'Ich bin ___ müde und gehe ins Bett.', options: ['ziemlich', 'ziemliche', 'viele'], answer: 0, explain: 'Degree particles take no ending → ziemlich müde.' },
      { kind: 'type', prompt: 'Das Zimmer ist ___ neu. (completely)', accept: ['ganz'], explain: 'ganz + article-less adjective = completely → ganz neu.' },
      { kind: 'mc', prompt: 'Say "not at all tired":', options: ['gar nicht müde', 'nicht gar müde', 'gar keine müde'], answer: 0, explain: 'gar nicht = not at all.' },
      { kind: 'error', prompt: 'Der Kaffee ist sehre heiß.', answer: 3, fix: 'Der Kaffee ist sehr heiß.', explain: 'sehr never takes an ending → sehr.' },
    ],
  },
  {
    level: 'B1', title: 'Fokuspartikeln: nur, auch, sogar, selbst',
    summary: 'Focus particles highlight the element right after them.',
    rule: 'Focus particles pick out one part of the sentence and stand directly before it: nur = only (restricts), auch = also/too (adds), sogar = even (a surprising addition). selbst before the focused noun also means even (Selbst der Chef kam), but after a noun it means -self (Der Chef selbst kam). Moving the particle shifts the meaning: Nur ich habe ihn gesehen (only I) vs. Ich habe nur ihn gesehen (only him).',
    exercises: [
      { kind: 'choose', prompt: '___ Anna hat bestanden, sonst niemand.', options: ['Nur', 'Auch', 'Sogar'], answer: 0, explain: '"sonst niemand" marks a restriction → Nur Anna.' },
      { kind: 'mc', prompt: 'Say "Even the children helped.":', options: ['Sogar die Kinder haben geholfen.', 'Die Kinder sogar haben geholfen.', 'Die Kinder haben geholfen sogar.'], answer: 0, explain: 'sogar = even, directly before the focused noun.' },
      { kind: 'type', prompt: '___ ich weiß die Antwort nicht. (Even I)', accept: ['Sogar', 'Selbst'], explain: 'sogar / selbst before the subject = even I.' },
      { kind: 'choose', prompt: 'Ich trinke ___ Wasser, keinen Kaffee.', options: ['nur', 'auch', 'sogar'], answer: 0, explain: 'Restriction "only water" → nur.' },
      { kind: 'choose', prompt: 'Der Chef ___ hat angerufen. (the boss himself)', options: ['selbst', 'sogar', 'nur'], answer: 0, explain: 'selbst AFTER the noun = himself.' },
    ],
  },
  {
    level: 'B1', title: 'Konjunktionen: sondern vs. aber, sowie',
    summary: 'sondern corrects a negation; aber contrasts; sowie links like und.',
    rule: 'sondern corrects a negated statement and means "but rather": Das ist nicht rot, sondern blau. Use aber for a plain contrast that does not replace a negated element: Es ist klein, aber gemütlich. sowie links items like und, mostly in writing: Getränke sowie Snacks. All three are coordinating — the verb does not move.',
    exercises: [
      { kind: 'choose', prompt: 'Das ist nicht mein Buch, ___ deins.', options: ['sondern', 'aber', 'oder'], answer: 0, explain: 'Correcting a negation → sondern.' },
      { kind: 'choose', prompt: 'Ich bin müde, ___ ich mache weiter.', options: ['aber', 'sondern', 'sowie'], answer: 0, explain: 'Plain contrast, nothing negated → aber.' },
      { kind: 'type', prompt: 'Wir verkaufen Kaffee ___ Tee. (as well as)', accept: ['sowie'], explain: 'sowie = as well as, links a list.' },
      { kind: 'mc', prompt: 'Which is correct?', options: ['Er ist nicht groß, sondern klein.', 'Er ist nicht groß, aber klein.', 'Er ist groß, sondern klein.'], answer: 0, explain: 'After a negation, the replacement uses sondern.' },
      { kind: 'error', prompt: 'Ich trinke keinen Tee, aber Kaffee.', answer: 4, fix: 'Ich trinke keinen Tee, sondern Kaffee.', explain: 'After a negation the correction uses sondern, not aber.' },
    ],
  },
  {
    level: 'B2', title: 'Textadverbien: bereits, nun, zunächst, schließlich',
    summary: 'Adverbs that order and structure time and argument.',
    rule: 'These adverbs guide the reader through steps and time: bereits = already (formal schon); nun = now / well (also opens a point); zunächst = at first; schließlich = finally / after all; inzwischen and mittlerweile = meanwhile, by now; derzeit = currently. In position 1 they trigger verb-second inversion: Zunächst müssen wir planen.',
    exercises: [
      { kind: 'choose', prompt: '___ klären wir das Ziel, dann den Plan. (at first)', options: ['Zunächst', 'Schließlich', 'Inzwischen'], answer: 0, explain: 'The first step → zunächst.' },
      { kind: 'choose', prompt: 'Er hat die Arbeit ___ beendet. (already, formal)', options: ['bereits', 'nun', 'damals'], answer: 0, explain: 'bereits = already (formal schon).' },
      { kind: 'type', prompt: '___ ist es zu spät, wir müssen warten. (by now)', accept: ['Inzwischen', 'Mittlerweile'], explain: 'inzwischen / mittlerweile = by now, meanwhile.' },
      { kind: 'mc', prompt: 'Correct inversion?', options: ['Zunächst gehen wir einkaufen.', 'Zunächst wir gehen einkaufen.', 'Wir zunächst gehen einkaufen.'], answer: 0, explain: 'A position-1 adverb keeps the verb second (gehen).' },
      { kind: 'choose', prompt: '___ hat sie doch noch gewonnen. (finally / after all)', options: ['Schließlich', 'Bereits', 'Zunächst'], answer: 0, explain: 'schließlich = finally / after all.' },
    ],
  },
  {
    level: 'B2', title: 'Modalpartikeln II: eigentlich, eben, halt, wohl',
    summary: 'Unstressed flavouring particles that add attitude.',
    rule: 'Modal particles colour a statement without changing its facts and are never stressed. eigentlich softens or adds "actually / by the way" (Was machst du eigentlich?); eben and halt express resignation, "just the way it is" (eben more neutral/northern, halt southern: Das ist halt so); wohl marks a guess, "probably" (Er ist wohl krank). They sit in the middle field, after the finite verb and any pronouns.',
    exercises: [
      { kind: 'choose', prompt: 'Wie spät ist es ___? (by the way)', options: ['eigentlich', 'eben', 'wohl'], answer: 0, explain: 'eigentlich softens a question = actually / by the way.' },
      { kind: 'choose', prompt: 'Er antwortet nicht; er ist ___ beschäftigt. (probably)', options: ['wohl', 'halt', 'eigentlich'], answer: 0, explain: 'wohl = probably, marks a guess.' },
      { kind: 'type', prompt: 'Das kann man nicht ändern, das ist ___ so. (just, resigned)', accept: ['eben', 'halt'], explain: 'eben / halt = just the way it is.' },
      { kind: 'mc', prompt: 'Where does the particle go?', options: ['Das war eigentlich eine gute Idee.', 'Das eigentlich war eine gute Idee.', 'Eigentlich das war eine gute Idee.'], answer: 0, explain: 'A modal particle sits in the middle field; the finite verb stays second.' },
      { kind: 'error', prompt: 'Wohl er ist krank.', answer: 0, fix: 'Er ist wohl krank.', explain: 'Modal particles sit in the middle field, not in position 1.' },
    ],
  },

  // ── Grammar mastery pass · batch 1 (2026-07-12) ───────────────────────────
  // Case-governed prepositions: the two closed lists every learner must fix
  // early. Complements the existing Wechselpräpositionen (A2), Verschmelzung
  // (A2) and Genitivpräpositionen (C1) points without overlapping them. German
  // and answer indices spot-checked; still to be human-reviewed before --write.
  {
    level: 'A1', title: 'Präpositionen mit Akkusativ (durch, für, gegen, ohne, um)',
    summary: 'durch, für, gegen, ohne, um always take the accusative.',
    rule: 'A fixed set of prepositions always governs the accusative, whatever their meaning: durch (through), für (for), gegen (against), ohne (without), um (around / at). Memorize them as one group — "durch, für, gegen, ohne, um" — plus bis and entlang. The following article and pronouns go into the accusative: für den Mann, ohne mich, um die Ecke, gegen den Wind. Masculine der becomes den; die/das/plural die keep their form.',
    exercises: [
      { kind: 'choose', prompt: 'Ich mache das nur ___ dich.', options: ['für', 'mit', 'bei'], answer: 0, explain: 'für always takes the accusative → für dich.' },
      { kind: 'choose', prompt: 'Wir gehen ___ den Park.', options: ['durch', 'durch dem', 'aus'], answer: 0, explain: 'durch + accusative → durch den Park (masc. acc. = den).' },
      { kind: 'type', prompt: 'Sie kämpfen gegen ___ Regierung. (die, fem.)', accept: ['die'], explain: 'gegen + accusative; feminine die stays die in the accusative.' },
      { kind: 'mc', prompt: 'Which is correct?', options: ['Ich habe ein Geschenk für meinen Vater.', 'Ich habe ein Geschenk für meinem Vater.', 'Ich habe ein Geschenk für mein Vater.'], answer: 0, explain: 'für + accusative → meinen Vater (masc. acc.).' },
      { kind: 'error', prompt: 'Wir gehen um dem See.', answer: 3, fix: 'Wir gehen um den See.', explain: 'um takes the accusative → den See (masc.), not dem.' },
    ],
  },
  {
    level: 'A2', title: 'Präpositionen mit Dativ (aus, bei, mit, nach, seit, von, zu)',
    summary: 'aus, bei, mit, nach, seit, von, zu always take the dative.',
    rule: 'A fixed set of prepositions always governs the dative: aus (from / out of), bei (at / near), mit (with), nach (after / to), seit (since / for), von (from / of), zu (to). Memorize the group "aus, bei, mit, nach, seit, von, zu" (gegenüber belongs here too). Articles take dative endings — masculine/neuter dem, feminine der, plural den(+n): mit dem Auto, bei der Arbeit, zu den Kindern. Several fuse: bei dem → beim, von dem → vom, zu dem → zum, zu der → zur.',
    exercises: [
      { kind: 'choose', prompt: 'Ich fahre ___ dem Auto zur Arbeit.', options: ['mit', 'für', 'ohne'], answer: 0, explain: 'mit + dative → mit dem Auto.' },
      { kind: 'choose', prompt: 'Sie kommt ___ der Schweiz.', options: ['aus', 'nach', 'durch'], answer: 0, explain: 'aus + dative → aus der Schweiz.' },
      { kind: 'type', prompt: 'Wir fahren mit ___ Bus. (der, masc. dat.)', accept: ['dem'], explain: 'mit + dative; masculine der → dem.' },
      { kind: 'mc', prompt: 'Which is correct?', options: ['Ich gehe zu meinem Arzt.', 'Ich gehe zu meinen Arzt.', 'Ich gehe zu mein Arzt.'], answer: 0, explain: 'zu + dative → meinem Arzt (masc. dat.).' },
      { kind: 'error', prompt: 'Nach der Film gehen wir essen.', answer: 1, fix: 'Nach dem Film gehen wir essen.', explain: 'nach + dative → dem Film (masc.), not der.' },
    ],
  },

  // ── Grammar mastery pass · batch 2 (2026-07-12) ───────────────────────────
  // The two B1 gaps: the concessive subordinator obwohl (vs. the adverb trotzdem
  // / the genitive preposition trotz), and the da-/wo- pronominal adverbs that
  // stand in for "preposition + it/that". German + answer indices spot-checked;
  // still human-review before --write.
  {
    level: 'B1', title: 'Konzessivsätze: obwohl',
    summary: 'obwohl introduces a concession; its verb goes to the end.',
    rule: 'A concessive clause names something you would expect to prevent the main event, but doesn\'t. The subordinating conjunction obwohl (formally also obgleich, obschon) sends the finite verb to the end: Obwohl es regnet, gehen wir spazieren. / Wir gehen spazieren, obwohl es regnet. Don\'t confuse it with the adverb trotzdem (nevertheless), which keeps the verb in second position — Es regnet; trotzdem gehen wir — or the preposition trotz, which takes the genitive: trotz des Regens.',
    exercises: [
      { kind: 'choose', prompt: '___ es regnet, gehen wir spazieren.', options: ['Obwohl', 'Trotzdem', 'Trotz'], answer: 0, explain: 'A subordinate clause with the verb at the end → obwohl.' },
      { kind: 'mc', prompt: 'Which uses trotzdem correctly?', options: ['Es ist spät; trotzdem arbeiten wir weiter.', 'Trotzdem es spät ist, arbeiten wir weiter.', 'Wir arbeiten, trotzdem es spät ist.'], answer: 0, explain: 'trotzdem is an adverb (verb second), not a subordinator.' },
      { kind: 'type', prompt: '___ er krank war, ist er zur Arbeit gegangen. (although)', accept: ['Obwohl'], explain: 'obwohl = although; the verb (war) goes to the end.' },
      { kind: 'order', prompt: 'Build the clause: „…, obwohl sie müde war.“', tiles: ['obwohl', 'sie', 'müde', 'war'], explain: 'Subordinator first, finite verb (war) last.' },
      { kind: 'error', prompt: 'Obwohl es ist kalt, schwimmen wir.', answer: 2, fix: 'Obwohl es kalt ist, schwimmen wir.', explain: 'In an obwohl-clause the finite verb goes to the end: … es kalt ist.' },
    ],
  },
  {
    level: 'B1', title: 'Präpositionaladverbien: da(r)- & wo(r)-',
    summary: 'For things use darauf/dafür… (statement) and worauf/wofür… (question).',
    rule: 'When a preposition points to a thing (not a person), German fuses it into a pronominal adverb rather than "preposition + it/that": Ich warte darauf (not "auf es"), Ich freue mich darüber. Insert -r- when the preposition starts with a vowel: da + auf → darauf, da + über → darüber, wo + an → woran. Questions and relative links use the wo(r)- form: Worauf wartest du? For people, keep preposition + pronoun: Auf wen wartest du? — auf ihn.',
    exercises: [
      { kind: 'choose', prompt: 'Ich warte auf den Bus. → Ich warte ___.', options: ['darauf', 'auf es', 'darüber'], answer: 0, explain: 'A thing → da + auf (vowel) → darauf.' },
      { kind: 'choose', prompt: '___ freust du dich? (about what)', options: ['Worüber', 'Worauf', 'Wofür'], answer: 0, explain: 'sich freuen über → wo + über → worüber.' },
      { kind: 'type', prompt: 'Wir sprechen über das Problem. → Wir sprechen ___. (about it)', accept: ['darüber'], explain: 'über + a thing → darüber.' },
      { kind: 'mc', prompt: 'Ask about a thing: "What are you waiting for?"', options: ['Worauf wartest du?', 'Auf was wartest du?', 'Für was wartest du?'], answer: 0, explain: 'warten auf + thing → worauf (standard question form).' },
      { kind: 'error', prompt: 'Ich denke an es.', answer: 3, fix: 'Ich denke daran.', explain: 'denken an + a thing → daran, not "an es".' },
    ],
  },

  // ── Grammar mastery pass · batch 3 (2026-07-12) ───────────────────────────
  // Adjektivdeklination, split the standard three ways (weak / mixed / strong)
  // and introduced early (A2/B1) — the single B2 point under-served one of
  // German's hardest systems. Tables spot-checked against the standard paradigm;
  // human-review before --write.
  {
    level: 'A2', title: 'Adjektivdeklination: nach bestimmtem Artikel (schwach)',
    summary: 'After der/die/das the adjective is -e or -en.',
    rule: 'After a definite article (der, die, das, dieser, jeder, alle) the adjective takes only two endings. It is -e in the nominative singular of every gender and in the accusative singular of feminine and neuter: der gute Mann, die gute Frau, das gute Kind. It is -en everywhere else — all other cases and the entire plural: den guten Mann, dem guten Kind, die guten Kinder.',
    exercises: [
      { kind: 'choose', prompt: 'Der ___ Mann wartet.', options: ['alte', 'alter', 'alten'], answer: 0, explain: 'Masc. nom. after der → -e: der alte Mann.' },
      { kind: 'choose', prompt: 'Ich sehe den ___ Hund.', options: ['großen', 'große', 'großer'], answer: 0, explain: 'Masc. acc. after den → -en: den großen Hund.' },
      { kind: 'type', prompt: 'Das ___ Auto ist teuer. (neu)', accept: ['neue'], explain: 'Neut. nom. after das → -e: das neue Auto.' },
      { kind: 'choose', prompt: 'Wir helfen der ___ Frau.', options: ['netten', 'nette', 'netter'], answer: 0, explain: 'Fem. dat. after der → -en: der netten Frau.' },
      { kind: 'choose', prompt: 'Die ___ Kinder spielen.', options: ['kleinen', 'kleine', 'kleiner'], answer: 0, explain: 'Plural after die → -en: die kleinen Kinder.' },
    ],
  },
  {
    level: 'B1', title: 'Adjektivdeklination: nach unbestimmtem Artikel (gemischt)',
    summary: 'After ein/kein/mein the adjective shows the gender where ein can’t.',
    rule: 'After ein, kein and the possessives (mein, dein …) the adjective takes weak endings (-e / -en) EXCEPT in the three slots where ein itself has no ending — there the adjective must show the gender: masculine nominative → -er (ein guter Wein) and neuter nominative/accusative → -es (ein gutes Buch). Everywhere else it is -e (fem. nom./acc.: eine gute Idee) or -en (all other cases and the plural: einen guten Wein, meinem guten Freund, keine guten Ideen).',
    exercises: [
      { kind: 'choose', prompt: 'Das ist ein ___ Wein.', options: ['guter', 'gute', 'gutes'], answer: 0, explain: 'Masc. nom.; ein has no ending, so the adjective shows it → guter.' },
      { kind: 'choose', prompt: 'Sie hat ein ___ Kind.', options: ['kleines', 'kleine', 'kleiner'], answer: 0, explain: 'Neut. nom./acc.; ein has no ending → -es: ein kleines Kind.' },
      { kind: 'type', prompt: 'Ich sehe einen ___ Mann. (alt)', accept: ['alten'], explain: 'Masc. acc.; einen carries the ending, so the adjective is weak → alten.' },
      { kind: 'choose', prompt: 'Ich spreche mit meinem ___ Freund.', options: ['besten', 'beste', 'bester'], answer: 0, explain: 'Masc. dat. after mein- → -en: meinem besten Freund.' },
      { kind: 'error', prompt: 'Er trinkt ein kaltes Bier mit einem gutem Freund.', answer: 7, fix: 'Er trinkt ein kaltes Bier mit einem guten Freund.', explain: 'Masc. dat. after ein- is weak → guten, not gutem.' },
    ],
  },
  {
    level: 'B1', title: 'Adjektivdeklination: ohne Artikel (stark)',
    summary: 'With no article the adjective takes the der/die/das endings.',
    rule: 'With no article (common in plurals, mass nouns, after numbers) the adjective must carry the case signal itself, taking the endings the definite article would show: guter Wein (masc. nom., like der), gutes Bier (neut., like das), gute Milch (fem., like die), guten Wein (masc. acc.), gutem Wein / guter Milch (dat.), gute Weine (pl. nom./acc.), guten Weinen (pl. dat.). The one exception: masculine/neuter genitive is -en (guten Weines), because the noun already carries -s.',
    exercises: [
      { kind: 'choose', prompt: 'Ich trinke gern ___ Kaffee.', options: ['schwarzen', 'schwarzer', 'schwarzes'], answer: 0, explain: 'Masc. acc., no article → like den: schwarzen Kaffee.' },
      { kind: 'choose', prompt: '___ Wein ist teuer.', options: ['Guter', 'Gutes', 'Guten'], answer: 0, explain: 'Masc. nom., no article → like der: guter Wein.' },
      { kind: 'type', prompt: 'Sie trinkt ___ Milch. (frisch, fem. acc.)', accept: ['frische'], explain: 'Fem. acc., no article → like die: frische Milch.' },
      { kind: 'choose', prompt: 'Wir essen mit ___ Freunden.', options: ['guten', 'gute', 'guter'], answer: 0, explain: 'Plural dat., no article → -en: guten Freunden.' },
      { kind: 'mc', prompt: 'Choose the phrase for "with cold water":', options: ['mit kaltem Wasser', 'mit kaltes Wasser', 'mit kalter Wasser'], answer: 0, explain: 'Neut. dat., no article → like dem: kaltem Wasser.' },
    ],
  },

  // ── Grammar mastery pass · batch 4 (2026-07-12) ───────────────────────────
  // The two everyday gaps: ordinals & dates, and the Nullartikel (when German
  // omits the article). Human-review before --write.
  {
    level: 'A1', title: 'Ordinalzahlen & Datum',
    summary: 'der erste, der zweite …; „am …ten" for dates.',
    rule: 'Ordinals add -t up to 19 (der vierte, der siebte) and -st from 20 on (der zwanzigste); erste, dritte, siebte and achte are irregular. They decline like adjectives: der erste Tag, am ersten Tag. Dates use the ordinal: Heute ist der erste Mai (nom.); "on" a date is am + ordinal in -ten: am ersten Mai, am dritten Juni. Written as a figure, the ordinal takes a period: der 1. Mai, am 3. Juni.',
    exercises: [
      { kind: 'choose', prompt: 'Heute ist der ___ Mai.', options: ['erste', 'ersten', 'einte'], answer: 0, explain: 'Nominative ordinal → der erste.' },
      { kind: 'choose', prompt: 'Ich habe am ___ Juni Geburtstag.', options: ['dritten', 'dritte', 'drei'], answer: 0, explain: 'am + ordinal in -ten → am dritten.' },
      { kind: 'type', prompt: 'Der ___ Tag der Woche ist Montag. (1st)', accept: ['erste'], explain: 'der erste Tag (nom.).' },
      { kind: 'mc', prompt: 'Say "on the 20th of July":', options: ['am zwanzigsten Juli', 'am zwanzigste Juli', 'an zwanzig Juli'], answer: 0, explain: 'From 20 on: -st, dative -en → am zwanzigsten.' },
      { kind: 'error', prompt: 'Wir treffen uns am zweite April.', answer: 4, fix: 'Wir treffen uns am zweiten April.', explain: 'am + ordinal takes -ten → am zweiten April.' },
    ],
  },
  {
    level: 'A2', title: 'Nullartikel: wann kein Artikel steht',
    summary: 'No article with professions, nationalities and general mass nouns.',
    rule: 'German drops the article where English often keeps one: after sein/werden/bleiben with a profession, nationality or religion — Sie ist Ärztin, Er wird Lehrer; with uncountable or abstract nouns used generally — Ich trinke Wasser, Zeit ist Geld, Sie hat Geduld; with most countries, cities and languages — Ich lerne Deutsch, Er wohnt in Deutschland; and in set phrases — zu Fuß, nach Hause, mit Freunden. Keep the article when the noun is specific: Der Kaffee hier ist gut.',
    exercises: [
      { kind: 'choose', prompt: 'Meine Schwester ist ___ Ärztin.', options: ['—', 'eine', 'die'], answer: 0, explain: 'Profession after sein → no article: Sie ist Ärztin.' },
      { kind: 'mc', prompt: 'Which is correct?', options: ['Ich lerne Deutsch.', 'Ich lerne das Deutsch.', 'Ich lerne ein Deutsch.'], answer: 0, explain: 'Languages take no article.' },
      { kind: 'choose', prompt: '___ Kaffee hier schmeckt gut.', options: ['Der', '—', 'Ein'], answer: 0, explain: 'A specific, present coffee → keep the article: Der Kaffee hier.' },
      { kind: 'choose', prompt: 'Er wohnt in ___ Deutschland.', options: ['—', 'dem', 'das'], answer: 0, explain: 'Most country names take no article.' },
      { kind: 'error', prompt: 'Sie ist eine Lehrerin.', answer: 2, fix: 'Sie ist Lehrerin.', explain: 'A bare profession after sein → no article: Sie ist Lehrerin.' },
    ],
  },

  // ── Grammar mastery pass · batch 5 (2026-07-12) ───────────────────────────
  // Thickens the thin C2 tier with two genuinely-C2, clearly-gradable structures:
  // universal ("irrelevance") concession and the formal genitive-object verbs.
  // The rest of C2's thinness is stylistic/register and better hand-authored.
  {
    level: 'C2', title: 'Irrelevanzkonzessivsätze: „wer/was/wie … auch (immer)"',
    summary: 'No matter who/what/how …; the verb still closes the clause.',
    rule: 'To express "no matter who / what / how …", German combines a w-word with auch (immer): Wer auch immer anruft, ich bin nicht da; Was auch (immer) geschieht, wir bleiben ruhig; Wie schwer es auch sein mag, wir schaffen es. The finite verb still stands at the end of the concessive clause, and the following main clause keeps verb-second. A paired variant uses ob … oder: Ob reich oder arm, alle sind willkommen. These belong to formal, argumentative register.',
    exercises: [
      { kind: 'choose', prompt: '___ auch immer anruft, ich bin nicht da.', options: ['Wer', 'Wen', 'Wem'], answer: 0, explain: 'Subject of the clause → Wer auch immer.' },
      { kind: 'mc', prompt: 'Which is correct?', options: ['Was auch immer passiert, wir bleiben ruhig.', 'Was passiert auch immer, wir bleiben ruhig.', 'Was auch immer passiert wir ruhig bleiben.'], answer: 0, explain: 'w-word + auch immer, verb last; main clause verb-second.' },
      { kind: 'type', prompt: '___ schwer es auch ist, wir geben nicht auf. (however)', accept: ['Wie'], explain: 'Wie … auch = however.' },
      { kind: 'choose', prompt: '___ reich oder arm, alle sind willkommen.', options: ['Ob', 'Wenn', 'Als'], answer: 0, explain: 'Ob … oder = whether … or, a paired concession.' },
      { kind: 'order', prompt: 'Build: „Wen du auch fragst, …" (whomever you ask)', tiles: ['Wen', 'du', 'auch', 'fragst'], explain: 'w-word + auch, finite verb (fragst) last.' },
    ],
  },
  {
    level: 'C2', title: 'Verben mit Genitivobjekt',
    summary: 'Formal verbs that govern the genitive: gedenken, bedürfen, anklagen …',
    rule: 'A small, formal set of verbs takes a genitive object: gedenken (commemorate) — wir gedenken der Opfer; bedürfen (require) — es bedarf großer Geduld; sich rühmen, sich schämen, sich bemächtigen, sich entledigen; and jn. + gen. anklagen / beschuldigen / verdächtigen — man klagte ihn des Betrugs an. They belong to written, elevated register; everyday German often substitutes (brauchen for bedürfen, denken an for gedenken).',
    exercises: [
      { kind: 'choose', prompt: 'Wir gedenken ___ Opfer.', options: ['der', 'die', 'den'], answer: 0, explain: 'gedenken + genitive → der Opfer (pl. gen.).' },
      { kind: 'choose', prompt: 'Es bedarf ___ Geduld.', options: ['großer', 'große', 'großen'], answer: 0, explain: 'bedürfen + genitive → großer Geduld (fem. gen.).' },
      { kind: 'type', prompt: 'Man klagte ihn ___ Diebstahls an. (masc. gen. article)', accept: ['des'], explain: 'jn. + gen. anklagen → des Diebstahls.' },
      { kind: 'mc', prompt: 'Which is correct?', options: ['Der Kranke bedarf der Ruhe.', 'Der Kranke bedarf die Ruhe.', 'Der Kranke bedarf an Ruhe.'], answer: 0, explain: 'bedürfen + genitive → der Ruhe.' },
      { kind: 'error', prompt: 'Wir gedenken die Verstorbenen.', answer: 2, fix: 'Wir gedenken der Verstorbenen.', explain: 'gedenken governs the genitive → der Verstorbenen.' },
    ],
  },
];

function toCard(p: NewPoint): Word {
  return {
    id: `gram:${p.level}:${p.title}`, term: p.title, en: p.summary, pos: 'grammar', level: p.level,
    gender: null, plural: null, ipa: null, def: p.rule, syn: [], ant: [], ex: [], field: 'Grammar', kind: 'grammar',
  };
}

function main() {
  const write = process.argv.includes('--write');
  const grammar = readJSON<GrammarByLevel>(PATHS.repoRoot + '/public/data/grammar.json');
  const vocab = readJSON<Word[]>(PATHS.vocab);
  const haveCard = new Set(vocab.map((w) => w.id));

  const addedPoints: string[] = [];
  for (const p of POINTS) {
    const level = p.level;
    grammar[level] ??= [];
    const exists = grammar[level].some((g: GPoint) => g.title === p.title);
    if (!exists) {
      grammar[level].push({ title: p.title, summary: p.summary, rule: p.rule, exercises: p.exercises });
      addedPoints.push(`${level} · ${p.title} (${p.exercises.length} exercises)`);
    }
    const card = toCard(p);
    if (!haveCard.has(card.id)) vocab.push(card);
  }

  // Keep the "Grammar" sector's count/levels in sync with the actual cards.
  const grammarCards = vocab.filter((w) => w.kind === 'grammar');
  const sectors = readJSON<SectorMeta[]>(PATHS.sectors);
  const gsec = sectors.find((s) => s.name === 'Grammar');
  const levels = LEVELS.filter((l) => grammarCards.some((w) => w.level === l));
  const sectorsChanged = !!gsec && (gsec.count !== grammarCards.length || gsec.levels.join() !== levels.join());
  if (gsec) { gsec.count = grammarCards.length; gsec.levels = levels; }

  console.log(addedPoints.length ? `Would add ${addedPoints.length} grammar point(s):` : 'Nothing to add — all points already present.');
  for (const a of addedPoints) console.log(`  + ${a}`);
  if (sectorsChanged) console.log(`Grammar sector count → ${grammarCards.length}.`);

  if (write && (addedPoints.length || sectorsChanged)) {
    if (addedPoints.length) {
      writeJSON(PATHS.repoRoot + '/public/data/grammar.json', grammar);
      writeJSON(PATHS.vocab, vocab);
    }
    if (sectorsChanged) writeJSON(PATHS.sectors, sectors);
    console.log('\nWrote updated public/data/*.json.');
  } else if (!write && (addedPoints.length || sectorsChanged)) {
    console.log('\nDry run — re-run with --write to apply.');
  }
}

main();
