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
import type { GExercise, GPoint, GrammarByLevel, RuleSection } from '../../src/lib/grammar.ts';
import type { CEFR } from '../../src/types.ts';

// `sections` is optional but not decorative: corpus:validate fails a rule over
// 280 characters that has none, so anything list-shaped ships structured from the
// start rather than being retro-fitted out of a wall of prose later.
interface NewPoint {
  level: CEFR; title: string; summary: string; rule: string;
  sections?: RuleSection[]; exercises: GExercise[];
  /** Replace an existing point of the same title rather than skipping it.
   *
   *  Without this the script could only ever *add*, so deepening a point that
   *  already exists meant authoring a near-duplicate beside it — which is worse
   *  than the thin point it was meant to fix, because now the learner meets the
   *  same system twice under two names. An upgrade keeps the title, and therefore
   *  the `gram:` card id and any FSRS progress riding on it, and merges exercises
   *  by prompt so the originals survive. */
  upgrade?: boolean;
}

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
  {
    // Requested by the session's remediation loop: plural-drill misses had no
    // grammar point to remediate to (MODE_REMEDY.plural was empty).
    level: 'A1', title: 'Pluralbildung (die Nomen im Plural)',
    summary: 'The five plural patterns: -e, -(e)n, -er, -s, no ending — often with umlaut; the article is always die.',
    rule: 'German nouns form the plural in five main patterns. -e, often with umlaut: der Tisch → die Tische, der Stuhl → die Stühle. -(e)n, the rule for most feminines: die Frau → die Frauen, die Lampe → die Lampen. -er, always with umlaut where possible, mostly neuters: das Kind → die Kinder, das Buch → die Bücher. -s for loanwords and words ending in a vowel: das Auto → die Autos. No ending for masculines/neuters in -er/-el/-en, often with umlaut: der Lehrer → die Lehrer, der Vater → die Väter. Whatever the pattern, the plural article is always die.',
    exercises: [
      { kind: 'choose', prompt: 'der Tisch → die ___', options: ['Tische', 'Tischen', 'Tischer'], answer: 0, explain: 'Many masculines take -e: die Tische.' },
      { kind: 'choose', prompt: 'das Kind → die ___', options: ['Kinder', 'Kinde', 'Kinds'], answer: 0, explain: 'Many neuters take -er: die Kinder.' },
      { kind: 'type', prompt: 'die Frau → die ___', accept: ['Frauen'], explain: 'Most feminines take -(e)n: die Frauen.' },
      { kind: 'choose', prompt: 'das Auto → die ___', options: ['Autos', 'Auten', 'Autoer'], answer: 0, explain: 'Loanwords and vowel-final nouns take -s: die Autos.' },
      { kind: 'choose', prompt: 'der Vater → die ___', options: ['Väter', 'Vaters', 'Vateren'], answer: 0, explain: 'Nouns in -er/-el/-en add no ending, often umlaut: die Väter.' },
      { kind: 'mc', prompt: 'Which plural is correct?', options: ['die Stühle', 'die Stuhle', 'die Stuhlen'], answer: 0, explain: '-e plus umlaut: der Stuhl → die Stühle.' },
      { kind: 'error', prompt: 'Ich habe zwei Buch gelesen.', answer: 3, fix: 'Ich habe zwei Bücher gelesen.', explain: 'After a number the noun is plural: das Buch → die Bücher (-er + umlaut).' },
    ],
  },

  // ── The advanced syllabus (personas B2 #31/#32, C1 #41/#43, C2 #47) ─────────
  // Below B2 Lexi is a curriculum; above it, it was a word list — 12 C1 points
  // and 8 C2. These six close the specific gaps the advanced personas named, and
  // each is a *system* rather than a single form, because phrase-level and
  // register failures are what actually plateau at B2.
  {
    level: 'B2', title: 'Verben mit Präpositionen', upgrade: true,
    summary: 'The preposition belongs to the verb and cannot be reasoned out.',
    rule: 'Many German verbs govern a fixed preposition, and that preposition also fixes the case. The pairing is arbitrary — it is learned with the verb, not derived from meaning, and English almost never matches: warten AUF is "wait FOR", sich freuen ÜBER is "be pleased ABOUT". Get the preposition wrong and the sentence is wrong however good the rest is.',
    sections: [
      { label: 'auf + Akkusativ', pairs: [
        { from: 'warten', to: 'auf den Bus warten' },
        { from: 'sich freuen (future)', to: 'sich auf den Urlaub freuen' },
        { from: 'achten', to: 'auf die Kinder achten' },
      ] },
      { label: 'über + Akkusativ', pairs: [
        { from: 'sich freuen (past/present)', to: 'sich über das Geschenk freuen' },
        { from: 'sich ärgern', to: 'sich über den Lärm ärgern' },
        { from: 'sprechen', to: 'über die Arbeit sprechen' },
      ] },
      { label: 'an + Akkusativ / Dativ', pairs: [
        { from: 'denken an (+A)', to: 'an dich denken' },
        { from: 'teilnehmen an (+D)', to: 'an der Sitzung teilnehmen' },
      ] },
      { label: 'mit / von / nach + Dativ', pairs: [
        { from: 'sich beschäftigen mit', to: 'sich mit dem Thema beschäftigen' },
        { from: 'abhängen von', to: 'vom Wetter abhängen' },
        { from: 'fragen nach', to: 'nach dem Weg fragen' },
      ] },
      { body: 'auf and über with sich freuen differ in time, not in style: auf looks forward, über looks back.' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Ich warte ___ den Bus.', options: ['auf', 'für', 'über'], answer: 0, explain: 'warten auf + Akkusativ. English "wait for" does not transfer.' },
      { kind: 'choose', prompt: 'Sie ärgert sich ___ den Lärm.', options: ['über', 'auf', 'von'], answer: 0, explain: 'sich ärgern über + Akkusativ.' },
      { kind: 'type', prompt: 'Das hängt ___ dem Wetter ab. (preposition)', accept: ['von'], explain: 'abhängen von + Dativ.' },
      { kind: 'choose', prompt: 'Ich freue mich ___ das Wochenende.', options: ['auf', 'über', 'für'], answer: 0, explain: 'The weekend is still ahead → sich freuen auf.' },
      { kind: 'choose', prompt: 'Wir nehmen ___ der Sitzung teil.', options: ['an', 'auf', 'in'], answer: 0, explain: 'teilnehmen an + Dativ.' },
      { kind: 'type', prompt: 'Sie fragt ___ dem Weg. (preposition)', accept: ['nach'], explain: 'fragen nach + Dativ.' },
    ],
  },
  {
    level: 'C1', title: 'Funktionsverbgefüge', upgrade: true,
    summary: 'A noun carries the meaning; the verb is nearly empty — and fixed.',
    rule: 'In formal and written German a verb is often replaced by a noun plus a "light" verb that adds almost no meaning of its own: entscheiden becomes eine Entscheidung treffen. The noun chooses its verb and the choice is not negotiable — eine Entscheidung machen is the single most recognisable learner error at this level. The construction raises the register; the simple verb is never wrong, only plainer.',
    sections: [
      { label: 'treffen', pairs: [
        { from: 'entscheiden', to: 'eine Entscheidung treffen' },
        { from: 'vereinbaren', to: 'eine Vereinbarung treffen' },
      ] },
      { label: 'stellen', pairs: [
        { from: 'fragen', to: 'eine Frage stellen' },
        { from: 'beantragen', to: 'einen Antrag stellen' },
      ] },
      { label: 'ziehen / leisten', pairs: [
        { from: 'folgern', to: 'eine Schlussfolgerung ziehen' },
        { from: 'beitragen', to: 'einen Beitrag leisten' },
      ] },
      { label: 'üben / erheben', pairs: [
        { from: 'kritisieren', to: 'Kritik üben' },
        { from: 'einwenden', to: 'Einspruch erheben' },
      ] },
      { body: 'Never machen. It is the default in English ("make a decision") and it is wrong in nearly every German pairing here.' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Wir müssen heute eine Entscheidung ___.', options: ['treffen', 'machen', 'nehmen'], answer: 0, explain: 'eine Entscheidung treffen. "machen" is the English calque.' },
      { kind: 'choose', prompt: 'Darf ich eine Frage ___?', options: ['stellen', 'machen', 'fragen'], answer: 0, explain: 'eine Frage stellen.' },
      { kind: 'type', prompt: 'Daraus lässt sich ein Schluss ___. (light verb, infinitive)', accept: ['ziehen'], explain: 'einen Schluss ziehen.' },
      { kind: 'choose', prompt: 'Der Verband hat scharfe Kritik ___.', options: ['geübt', 'gemacht', 'gestellt'], answer: 0, explain: 'Kritik üben → hat Kritik geübt.' },
      { kind: 'choose', prompt: 'Sie hat einen wichtigen Beitrag ___.', options: ['geleistet', 'gemacht', 'getroffen'], answer: 0, explain: 'einen Beitrag leisten.' },
      { kind: 'type', prompt: 'Er will einen Antrag ___. (light verb, infinitive)', accept: ['stellen'], explain: 'einen Antrag stellen.' },
    ],
  },
  {
    level: 'C2', title: 'Nominalstil', upgrade: true,
    summary: 'Written German packs clauses into nouns; spoken German unpacks them.',
    rule: 'Formal written German — laws, reports, academic prose — prefers a noun where speech uses a subordinate clause: "nach der Prüfung der Unterlagen" instead of "nachdem die Unterlagen geprüft worden sind". Reading C1 texts means unpacking these; writing them means being able to build one. Overused it becomes the notorious Behördendeutsch, so the skill is switching, not converting everything.',
    sections: [
      { label: 'Clause → noun phrase', pairs: [
        { from: 'nachdem man die Daten erhoben hat', to: 'nach der Erhebung der Daten' },
        { from: 'weil die Preise gestiegen sind', to: 'wegen des Preisanstiegs' },
        { from: 'wenn das Wetter schlecht ist', to: 'bei schlechtem Wetter' },
        { from: 'um zu prüfen, ob …', to: 'zur Prüfung, ob …' },
      ] },
      { body: 'The preposition carries the logical relation the conjunction used to: nach = nachdem, wegen = weil, bei = wenn.' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Nominal for "weil die Preise gestiegen sind":', options: ['wegen des Preisanstiegs', 'wegen die Preise steigen', 'weil des Preisanstiegs'], answer: 0, explain: 'weil → wegen + Genitiv, verb → noun.' },
      { kind: 'choose', prompt: 'Nominal for "wenn das Wetter schlecht ist":', options: ['bei schlechtem Wetter', 'bei schlechtes Wetter', 'wenn schlechtem Wetter'], answer: 0, explain: 'wenn → bei + Dativ; strong ending after a bare preposition.' },
      { kind: 'type', prompt: '„nachdem man die Daten erhoben hat" → nach der ___ der Daten', accept: ['Erhebung'], explain: 'erheben → die Erhebung.' },
      { kind: 'choose', prompt: 'Which is the *spoken* version of "nach Abschluss der Arbeiten"?', options: ['nachdem die Arbeiten abgeschlossen worden sind', 'nach die Arbeiten abschließen', 'weil die Arbeiten abschließen'], answer: 0, explain: 'Unpacking the noun restores the temporal clause.' },
      { kind: 'mc', prompt: 'Nominalstil is characteristic of…', options: ['written, formal registers', 'casual speech', 'all German equally'], answer: 0, explain: 'It marks formal writing; speech unpacks it.' },
    ],
  },
  {
    level: 'C2', title: 'Stilebenen: gehoben, neutral, umgangssprachlich',
    summary: 'Near-synonyms differ by register, not meaning — and the mismatch is audible.',
    rule: 'At this level the remaining vocabulary problem is not meaning but register. Words that a dictionary lists as synonyms sit at different heights, and choosing the wrong height is the clearest marker of a non-native writer: an academic paper that says "kriegen" or a text message that says "erwerben" is wrong in a way no grammar check catches.',
    sections: [
      { label: 'gehoben → neutral → umgangssprachlich', pairs: [
        { from: 'erwerben · kaufen · sich zulegen', to: 'to buy' },
        { from: 'erhalten · bekommen · kriegen', to: 'to get' },
        { from: 'speisen · essen · futtern', to: 'to eat' },
        { from: 'sich äußern · sagen · loswerden', to: 'to say' },
        { from: 'umfangreich · groß · riesig', to: 'extensive / large / huge' },
      ] },
      { body: 'The middle column is safe almost everywhere. The outer columns carry information about you, not about the thing described.' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'In a scientific paper: „Die Studie ___ zahlreiche Belege."', options: ['liefert', 'kriegt', 'holt'], answer: 0, explain: 'kriegen/holen are colloquial; liefern is the neutral-formal choice.' },
      { kind: 'choose', prompt: 'Which is gehoben (elevated)?', options: ['erwerben', 'kaufen', 'sich zulegen'], answer: 0, explain: 'erwerben is formal; sich zulegen is colloquial.' },
      { kind: 'choose', prompt: 'A friend texts you. Which fits?', options: ['Hast du das Buch gekriegt?', 'Habt Ihr das Buch erhalten?', 'Wurde Ihnen das Buch zugestellt?'], answer: 0, explain: 'kriegen is right at home in a text message; the others are office German.' },
      { kind: 'type', prompt: 'Neutral synonym of „speisen"? (infinitive)', accept: ['essen'], explain: 'speisen is elevated; essen is neutral.' },
      { kind: 'mc', prompt: 'A register mismatch is a mistake because…', options: ['it misplaces the text socially, even when the meaning is right', 'the word means something else', 'the grammar breaks'], answer: 0, explain: 'Register carries social information independent of meaning.' },
    ],
  },
  {
    level: 'C2', title: 'Idiomatik: wörtlich vs. übertragen',
    summary: 'An idiom means nothing like its parts — and it is fixed word for word.',
    rule: 'Idioms are learned whole. The literal reading is usually absurd, which is the point: it is what makes the phrase memorable and what makes a word-by-word translation fail. They are also frozen — swapping a synonym in breaks them, so "den Nagel auf den Kopf schlagen" is not German however reasonable it looks.',
    sections: [
      { label: 'Literal → what it means', pairs: [
        { from: 'den Nagel auf den Kopf treffen', to: 'to put it exactly right' },
        { from: 'die Katze im Sack kaufen', to: 'to buy without checking' },
        { from: 'ins Fettnäpfchen treten', to: 'to say the wrong thing' },
        { from: 'die Flinte ins Korn werfen', to: 'to give up' },
        { from: 'über den Tellerrand schauen', to: 'to look beyond your own field' },
        { from: 'jemandem reinen Wein einschenken', to: 'to tell someone the truth' },
      ] },
      { body: 'Fixed means fixed: the verb, the preposition and the article are all part of the phrase.' },
    ],
    exercises: [
      { kind: 'choose', prompt: '„Damit hast du den Nagel auf den Kopf ___."', options: ['getroffen', 'geschlagen', 'gehauen'], answer: 0, explain: 'The idiom is treffen. schlagen is what you would do to a real nail.' },
      { kind: 'choose', prompt: 'Wer eine Wohnung ungesehen mietet, …', options: ['kauft die Katze im Sack', 'wirft die Flinte ins Korn', 'tritt ins Fettnäpfchen'], answer: 0, explain: 'Committing without inspecting = die Katze im Sack kaufen.' },
      { kind: 'type', prompt: 'Er gab nach dem ersten Rückschlag auf: Er warf die Flinte ins ___.', accept: ['Korn'], explain: 'die Flinte ins Korn werfen.' },
      { kind: 'choose', prompt: '„über den Tellerrand schauen" heißt:', options: ['den eigenen Horizont erweitern', 'sehr genau hinsehen', 'beim Essen stören'], answer: 0, explain: 'Looking beyond your own plate = beyond your own field.' },
      { kind: 'mc', prompt: 'Why can an idiom not be translated word for word?', options: ['its meaning is not the sum of its parts', 'the words are archaic', 'it has no grammar'], answer: 0, explain: 'That non-compositionality is what makes it an idiom.' },
    ],
  },
  {
    level: 'C2', title: 'Passiversatzformen (sein + zu, sich lassen, -bar)',
    summary: 'Three ways to say "can be done" without ever using werden.',
    rule: 'Formal German usually avoids a modal passive. Instead of "das kann gemacht werden" it writes "das ist zu machen", "das lässt sich machen" or "das ist machbar". All three mean roughly the same thing and all three sound more idiomatic in writing than the full passive; sein + zu can also carry obligation rather than possibility, which the context decides.',
    sections: [
      { label: 'Passive with modal → the three replacements', pairs: [
        { from: 'Das kann gemacht werden.', to: 'Das ist zu machen.' },
        { from: 'Das kann gemacht werden.', to: 'Das lässt sich machen.' },
        { from: 'Das kann gemacht werden.', to: 'Das ist machbar.' },
        { from: 'Der Antrag muss unterschrieben werden.', to: 'Der Antrag ist zu unterschreiben.' },
      ] },
      { body: 'sein + zu is possibility or obligation; sich lassen is possibility only; -bar makes an adjective and not every verb allows one.' },
    ],
    exercises: [
      { kind: 'choose', prompt: '„Das Problem kann gelöst werden." → ', options: ['Das Problem lässt sich lösen.', 'Das Problem lässt sich zu lösen.', 'Das Problem ist sich lösen.'], answer: 0, explain: 'sich lassen + infinitive.' },
      { kind: 'choose', prompt: '„Die Rechnung muss bis Freitag bezahlt werden." → ', options: ['Die Rechnung ist bis Freitag zu bezahlen.', 'Die Rechnung ist bis Freitag bezahlbar.', 'Die Rechnung lässt sich bis Freitag bezahlen.'], answer: 0, explain: 'Obligation → sein + zu. bezahlbar would mean "affordable".' },
      { kind: 'type', prompt: '„Das kann man machen." mit -bar: Das ist ___.', accept: ['machbar'], explain: 'machen → machbar.' },
      { kind: 'choose', prompt: 'Which does NOT express possibility?', options: ['Der Antrag ist zu unterschreiben.', 'Der Antrag lässt sich unterschreiben.', 'Der Antrag ist unterschreibbar.'], answer: 0, explain: 'Here sein + zu reads as obligation: it must be signed.' },
      { kind: 'mc', prompt: 'Why does formal German prefer these to "kann … werden"?', options: ['they are shorter and more idiomatic in writing', 'the passive is ungrammatical', 'they mean something different'], answer: 0, explain: 'The full modal passive is correct but heavy.' },
    ],
  },

  // ---- B2, the layer that was mostly revision -----------------------------
  // The 2026-08-06 audit found 11 of B2's 16 points re-treading a topic already
  // taught at A2 or B1 — n-Deklination appears at A2, B1 *and* B2; Genitiv,
  // Plusquamperfekt, Zweiteilige Konnektoren and Finalsätze each twice under
  // near-identical titles. B2 contributed roughly four genuinely new points, on
  // the certificate that gates university admission and many jobs.
  //
  // All five below were checked against the whole bank for absence before being
  // written, which is the discipline the audit exists to enforce. Two other
  // candidates were dropped for being covered already: the verb-first conditional
  // ("Hätte ich Zeit, käme ich mit") is in B1's Irreale Konditionalsätze, and
  // subjective modals are at C1.
  {
    level: 'B2', title: 'Adjektive mit fester Präposition',
    summary: 'stolz auf, interessiert an — the preposition is learned, not derived.',
    rule: 'Like verbs, many adjectives govern a fixed preposition, and that preposition fixes the case. The pairing is arbitrary and rarely matches English, so the adjective, its preposition and its case are learned as one item.',
    sections: [
      { label: 'auf + Akkusativ', pairs: [
        { from: 'stolz', to: 'stolz auf seine Tochter' },
        { from: 'gespannt', to: 'gespannt auf den Film' },
        { from: 'böse', to: 'böse auf den Nachbarn' },
      ] },
      { label: 'an + Dativ', pairs: [
        { from: 'interessiert', to: 'interessiert an Kunst' },
        { from: 'beteiligt', to: 'beteiligt an dem Projekt' },
      ] },
      { label: 'mit / von + Dativ', pairs: [
        { from: 'zufrieden', to: 'zufrieden mit dem Ergebnis' },
        { from: 'abhängig', to: 'abhängig von den Eltern' },
        { from: 'überzeugt', to: 'überzeugt von der Idee' },
      ] },
      { label: 'für + Akkusativ', pairs: [
        { from: 'verantwortlich', to: 'verantwortlich für das Projekt' },
        { from: 'dankbar', to: 'dankbar für die Hilfe' },
      ] },
      { label: 'the trap', body: 'The adjective and its related verb often take different prepositions: interessiert AN etwas, but sich interessieren FÜR etwas.' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Sie ist sehr stolz ___ ihre Tochter.', options: ['auf', 'über', 'von'], answer: 0, explain: 'stolz auf + Akkusativ.' },
      { kind: 'choose', prompt: 'Ich bin ___ Kunst interessiert.', options: ['an', 'für', 'auf'], answer: 0, explain: 'interessiert an + Dativ. The verb sich interessieren takes FÜR — same idea, different preposition.' },
      { kind: 'choose', prompt: 'Wir sind mit dem Ergebnis ___.', options: ['zufrieden', 'stolz', 'gespannt'], answer: 0, explain: 'Only zufrieden pairs with mit + Dativ.' },
      { kind: 'type', prompt: 'Er ist verantwortlich ___ das Projekt.', accept: ['für'], explain: 'verantwortlich für + Akkusativ.' },
      { kind: 'error', prompt: 'Das Kind ist abhängig von seine Eltern.', answer: 5, fix: 'Das Kind ist abhängig von seinen Eltern.', explain: 'abhängig von takes the dative → seinen Eltern.' },
      { kind: 'mc', prompt: 'Which is correct?', options: ['Ich bin gespannt auf den Film.', 'Ich bin gespannt für den Film.', 'Ich bin gespannt über den Film.'], answer: 0, explain: 'gespannt auf + Akkusativ.' },
    ],
  },
  {
    level: 'B2', title: 'Zustandspassiv: „ist geschlossen“',
    summary: 'sein + Partizip II describes a state, not an action.',
    rule: 'German separates the action from the state it leaves behind. werden + Partizip II reports something happening; sein + Partizip II reports the result that now holds.',
    sections: [
      { label: 'action → state', pairs: [
        { from: 'Die Tür wird geschlossen.', to: 'Die Tür ist geschlossen.' },
        { from: 'Das Auto wird repariert.', to: 'Das Auto ist repariert.' },
        { from: 'Der Brief wird geschrieben.', to: 'Der Brief ist geschrieben.' },
      ] },
      { label: 'in the past', pairs: [
        { from: 'wurde geschlossen (it happened)', to: 'war geschlossen (it stood shut)' },
      ] },
      { label: 'why it matters', body: 'Choosing sein where werden belongs turns an event into a description. "Das Auto wird repariert" answers "what is happening?"; "Das Auto ist repariert" answers "can I drive it?".' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Vorsicht, die Tür ___ gerade geschlossen!', options: ['wird', 'ist', 'war'], answer: 0, explain: 'Happening now → Vorgangspassiv with werden.' },
      { kind: 'choose', prompt: 'Das Geschäft ___ seit acht Uhr geöffnet.', options: ['ist', 'wird', 'werden'], answer: 0, explain: 'A state that holds → Zustandspassiv with sein.' },
      { kind: 'mc', prompt: 'Which reports a state rather than an event?', options: ['Der Brief ist geschrieben.', 'Der Brief wird geschrieben.', 'Der Brief wurde geschrieben.'], answer: 0, explain: 'sein + Partizip II: the letter is written and now exists.' },
      { kind: 'type', prompt: 'Das Fenster ___ kaputt — jemand hat es gestern zerbrochen. (state, present)', accept: ['ist'], explain: 'The result holds now → sein.' },
      { kind: 'error', prompt: 'Die Rechnung wird schon bezahlt, du musst nichts mehr tun.', answer: 2, fix: 'Die Rechnung ist schon bezahlt, du musst nichts mehr tun.', explain: '"Nothing left to do" describes the state → ist bezahlt.' },
      { kind: 'order', prompt: 'Build: „The shop was closed yesterday.“ (state)', tiles: ['Das', 'Geschäft', 'war', 'gestern', 'geschlossen'], explain: 'war + Partizip II is the past of the state.' },
    ],
  },
  {
    level: 'B2', title: 'Die Stellung von „nicht“',
    summary: 'Where nicht stands decides what it denies.',
    rule: 'A1 settles which negator to use — kein for nouns, nicht for everything else. This settles where nicht goes, because its position changes the meaning.',
    sections: [
      { label: 'nicht comes before', examples: [
        { de: 'Ich rufe dich nicht an.', en: 'before a separable prefix' },
        { de: 'Ich habe nicht geschlafen.', en: 'before an infinitive or Partizip II' },
        { de: 'Der Kaffee ist nicht heiß.', en: 'before a predicate adjective' },
        { de: 'Wir fahren nicht nach Berlin.', en: 'before a directional phrase' },
      ] },
      { label: 'nicht comes after', examples: [
        { de: 'Ich kenne ihn nicht.', en: 'after the subject and objects' },
        { de: 'Er kommt heute nicht.', en: 'after time expressions' },
      ] },
      { label: 'Sondernegation', body: 'To deny one element rather than the sentence, nicht stands immediately before it — usually with a correction: Nicht ich habe angerufen, sondern Peter.' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Ich rufe dich heute ___ an.', options: ['nicht', 'kein', 'nichts'], answer: 0, explain: 'A verb is negated with nicht, and it sits before the separable prefix.' },
      { kind: 'order', prompt: 'Build: „I did not read the book.“', tiles: ['Ich', 'habe', 'das', 'Buch', 'nicht', 'gelesen'], explain: 'nicht sits before the Partizip II.' },
      { kind: 'mc', prompt: 'Which denies only the subject, and invites a correction?', options: ['Nicht ich habe angerufen.', 'Ich habe nicht angerufen.', 'Ich habe niemanden angerufen.'], answer: 0, explain: 'Sondernegation: nicht stands directly before the element it denies.' },
      { kind: 'type', prompt: 'Wir fahren ___ nach Berlin. (deny the whole sentence)', accept: ['nicht'], explain: 'nicht precedes the directional phrase.' },
      { kind: 'choose', prompt: 'Er kommt ___ heute, sondern morgen.', options: ['nicht', 'kein', 'nie'], answer: 0, explain: 'Sondernegation on "heute", corrected by sondern.' },
      { kind: 'choose', prompt: 'Der Kaffee ist ___ heiß.', options: ['nicht', 'kein', 'nichts'], answer: 0, explain: 'nicht precedes the predicate adjective.' },
    ],
  },
  {
    level: 'B2', title: 'Adversative Konnektoren: dennoch, allerdings, hingegen',
    summary: 'Four ways to say "but" that are not aber.',
    rule: 'Written German rarely repeats aber. All four below are adverbs rather than conjunctions — they occupy a position in the clause, so the verb still comes second.',
    sections: [
      { label: 'dennoch / trotzdem — concession', examples: [
        { de: 'Es regnete; dennoch gingen wir spazieren.', en: 'even so' },
      ] },
      { label: 'jedoch — contrast', examples: [
        { de: 'Er wollte kommen, jedoch war er krank.', en: 'position 1, verb second' },
        { de: 'Er war jedoch krank.', en: 'or inside the clause' },
      ] },
      { label: 'allerdings — qualification', examples: [
        { de: 'Das Hotel war schön, allerdings ziemlich teuer.', en: 'a mild objection to what was just said' },
      ] },
      { label: 'hingegen / dagegen — opposition', examples: [
        { de: 'Berlin ist günstig, München hingegen ist teuer.', en: 'two things set against each other' },
      ] },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Es regnete stark. ___ gingen wir spazieren.', options: ['Dennoch', 'Denn', 'Sondern'], answer: 0, explain: 'Concession in position 1, verb second.' },
      { kind: 'choose', prompt: 'Das Hotel war schön, ___ ziemlich teuer.', options: ['allerdings', 'dennoch', 'hingegen'], answer: 0, explain: 'allerdings qualifies what was just said.' },
      { kind: 'choose', prompt: 'Berlin ist günstig, München ___ ist teuer.', options: ['hingegen', 'trotzdem', 'deshalb'], answer: 0, explain: 'hingegen marks a direct contrast between two things.' },
      { kind: 'error', prompt: 'Dennoch wir gingen spazieren.', answer: 1, fix: 'Dennoch gingen wir spazieren.', explain: 'dennoch is an adverb in position 1, so the verb must come second.' },
      { kind: 'order', prompt: 'Build: „He wanted to come; however he was ill.“', tiles: ['Er', 'wollte', 'kommen,', 'jedoch', 'war', 'er', 'krank'], explain: 'jedoch takes position 1 of its clause, verb second.' },
      { kind: 'mc', prompt: 'Which of these is NOT a conjunction like aber?', options: ['dennoch', 'sondern', 'denn'], answer: 0, explain: 'dennoch is an adverb: it fills a clause position and pushes the verb to second.' },
    ],
  },
  {
    level: 'B2', title: 'Präpositionalobjekt mit da-Kompositum',
    summary: 'Ich freue mich darauf, dass du kommst.',
    rule: 'When a verb with a fixed preposition takes a whole clause as its object, the preposition cannot stand in front of a dass-clause. A da-Kompositum holds its place.',
    sections: [
      { label: 'verb + preposition → correlate', pairs: [
        { from: 'warten auf', to: 'Ich warte darauf, dass er anruft.' },
        { from: 'sich freuen über', to: 'Ich freue mich darüber, dass du da bist.' },
        { from: 'denken an', to: 'Ich denke daran, dass du das gesagt hast.' },
      ] },
      { label: 'with an infinitive clause', examples: [
        { de: 'Ich freue mich darauf, dich zu sehen.', en: 'the same correlate introduces zu + Infinitiv' },
      ] },
      { label: 'form and question', body: 'Before a vowel the form takes -r-: darauf, darüber, daran, darin. Questions use the wo-form: Worauf wartest du? Dropping the correlate reads as unfinished German.' },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Ich warte ___, dass er endlich anruft.', options: ['darauf', 'auf das', 'darüber'], answer: 0, explain: 'warten auf → the correlate darauf carries the preposition.' },
      { kind: 'choose', prompt: 'Sie freut sich ___, dich zu sehen.', options: ['darauf', 'darüber', 'davon'], answer: 0, explain: 'sich freuen auf (anticipation) → darauf + infinitive clause.' },
      { kind: 'type', prompt: '___ wartest du? (ask about the thing)', accept: ['Worauf', 'worauf'], explain: 'The question form of darauf is worauf.' },
      { kind: 'error', prompt: 'Ich denke oft, dass du das gesagt hast.', answer: 3, fix: 'Ich denke oft daran, dass du das gesagt hast.', explain: 'denken an needs its correlate daran before the dass-clause.' },
      { kind: 'order', prompt: 'Build: „I am pleased that you are here.“', tiles: ['Ich', 'freue', 'mich', 'darüber,', 'dass', 'du', 'da', 'bist'], explain: 'sich freuen über → darüber holds the preposition’s place.' },
      { kind: 'mc', prompt: 'Why does „Ich warte auf, dass er kommt“ fail?', options: ['A preposition cannot stand before a dass-clause; it needs the da-form.', 'warten takes the dative.', 'dass must be replaced by ob.'], answer: 0, explain: 'The correlate darauf is what carries the preposition.' },
    ],
  },

  // Pronoun position, at B1.
  //
  // Not a thinner copy of the B2 Mittelfeld point below. That one teaches the *noun*
  // system — Dativ before the Angaben, Akkusativ after — and te–ka–mo–lo. This one
  // teaches the move a pronoun makes, which no point in the bank currently states:
  // a personal pronoun leaves the object slots entirely and runs to the front of the
  // Mittelfeld, **in front of a noun subject as well** („Gestern hat mir mein Freund
  // geholfen“). A2's `Dativ: Pronomen & Stellung` gives the two-object rule with the
  // subject always a pronoun, so the learner never meets the case that breaks it.
  //
  // It sits at B1 because that is where the courses put it — Aspekte neu B1plus opens
  // Kapitel 1 with exactly these exercises — and because until now the level filter
  // gave a B1 learner nothing on word order between A1's verb-second and B2.
  {
    level: 'B1', title: 'Wortstellung: Pronomen im Mittelfeld',
    summary: 'Pronouns run to the front — and Akkusativ before Dativ.',
    rule: 'A personal pronoun does not wait for its ordinary object slot: it moves to the front of the Mittelfeld, straight after the finite verb, in front of every noun — including a noun subject. Two nouns keep the dative first; two pronouns put the accusative first; and with one of each, the pronoun goes first whatever its case. Position 1 still holds exactly one element, with the finite verb second.',
    sections: [
      { label: 'two nouns — dative first', examples: [
        { de: 'Ich schenke meinem Bruder das Buch.', en: 'the person, then the thing' },
      ] },
      { label: 'two pronouns — accusative first', examples: [
        { de: 'Ich schenke es ihm.', en: 'the thing, then the person — the mirror image' },
      ] },
      { label: 'one of each — the pronoun leads', pairs: [
        { from: 'Ich schenke ihm das Buch.', to: 'dative pronoun before accusative noun' },
        { from: 'Ich schenke es meinem Bruder.', to: 'accusative pronoun before dative noun' },
      ] },
      { label: 'in front of a noun subject too', body: 'The pronoun overtakes a subject that is a noun. The other order is heard, but this is the neutral one.', examples: [
        { de: 'Gestern hat mir mein Freund geholfen.', en: 'pronoun in front of the subject' },
        { de: 'Am Flughafen hat uns der Beamte alles erklärt.', en: 'the same move after a fronted element' },
      ] },
      { label: 'position 1 holds one element', body: 'Any single element can open the sentence — a time phrase, a place, an object — and the finite verb still stands second, with the subject immediately behind it.', examples: [
        { de: 'Letzten Monat sind wir ganz spontan zu Ella geflogen.', en: 'time in position 1, subject after the verb' },
      ] },
    ],
    exercises: [
      { kind: 'choose', prompt: 'Maria und Paul wandern aus. Zum Abschied schenken wir ___ einen Fluggutschein.', options: ['ihnen', 'sie', 'ihre'], answer: 0, explain: 'The two of them receive it, so dative plural — and the pronoun stands directly after the verb and subject.' },
      { kind: 'choose', prompt: 'Paul wollte Informationen über China. Das Reisebüro hat ___ gegeben.', options: ['sie ihm', 'ihm sie', 'sie ihn'], answer: 0, explain: 'Two pronouns: accusative (the information) before dative (Paul).' },
      { kind: 'choose', prompt: 'Maria hat ein Visum beantragt. Das Konsulat hat ___ dann zugeschickt.', options: ['es ihr', 'ihr es', 'es sie'], answer: 0, explain: 'Accusative pronoun first, dative second — the opposite of the noun order.' },
      { kind: 'error', prompt: 'Ich habe ihr ihn noch nicht vorgestellt.', answer: 2, fix: 'Ich habe ihn ihr noch nicht vorgestellt.', explain: 'With two pronouns the accusative comes first, so the flatmate precedes the mother.' },
      { kind: 'mc', prompt: 'Das Subjekt ist ein Nomen — wo steht das Pronomen?', options: ['davor — „Gestern hat mir mein Freund geholfen.“', 'dahinter — „Gestern hat mein Freund mir geholfen.“', 'am Ende des Mittelfelds'], answer: 0, explain: 'A pronoun runs to the front of the Mittelfeld, and that is in front of a noun subject too. The other order occurs, but this one is neutral.' },
      { kind: 'order', prompt: 'Beginnen Sie mit der Zeitangabe: „We flew to Ella last month, quite spontaneously.“', tiles: ['Letzten', 'Monat', 'sind', 'wir', 'ganz', 'spontan', 'zu', 'Ella', 'geflogen'], explain: 'Position 1 takes the time phrase; the finite verb stays second and the subject follows it.' },
      { kind: 'type', prompt: 'Hast du Hannah den Schlüssel gebracht? — Ja, ich habe ___ schon gebracht. (both as pronouns)', accept: ['ihn ihr'], hints: ['two pronouns — accusative first', 'the key is masculine accusative', 'ihn … ihr'], explain: 'The key is the accusative (ihn) and Hannah the dative (ihr), so the thing leads.' },
      { kind: 'choose', prompt: 'Für den Umzug habe ich ___ von einem Freund geliehen.', options: ['mir gestern den Kleinbus', 'gestern den Kleinbus mir', 'gestern mir den Kleinbus'], answer: 0, explain: 'The pronoun moves to the front of the Mittelfeld, in front of the time phrase and the accusative noun.' },
      { kind: 'choose', prompt: 'Der Vermieter hat ___ geschickt.', options: ['uns erst letzte Woche den neuen Mietvertrag', 'erst letzte Woche uns den neuen Mietvertrag', 'erst letzte Woche den neuen Mietvertrag uns'], answer: 0, explain: 'Same move: the dative pronoun leads, then the Angabe, then the accusative noun.' },
      { kind: 'mc', prompt: 'Zwei Nomen — welche Reihenfolge ist neutral?', options: ['Dativ vor Akkusativ — „Ich gebe dem Kind den Ball.“', 'Akkusativ vor Dativ — „Ich gebe den Ball dem Kind.“', 'Beide sind gleich häufig.'], answer: 0, explain: 'Nouns keep the dative first. Only pronouns flip it.' },
      { kind: 'choose', prompt: 'Ihre neue Stadt ist toll, und im Sommer zeigen sie ___.', options: ['sie mir', 'mir sie', 'mich ihr'], answer: 0, explain: 'The city is the accusative and stands first; I am the dative and follow.' },
      { kind: 'error', prompt: 'Zum Abschied habe ich gestern Blumen meiner Freundin geschenkt.', answer: 5, fix: 'Zum Abschied habe ich gestern meiner Freundin Blumen geschenkt.', explain: 'Two nouns, so the dative comes first — and an indefinite accusative is new information and stays behind it.' },
    ],
  },

  // Mittelfeld order, at B2 rather than C1.
  //
  // `TeKaMoLo & Satzklammer` already exists at C1 and is not being moved: its id
  // carries FSRS progress, and the bracket really is the harder half. But every
  // mainstream B2 course opens with this — it is Modul 1 of the first chapter — and
  // Lexi's own B2 already teaches `Die Stellung von „nicht“`, which is a
  // Mittelfeld-position rule. Introducing the field at B2 and consolidating it at C1
  // is a spiral, not a duplicate.
  //
  // What the C1 point genuinely does not cover, and what this is mostly for: the
  // **Ergänzungen**. C1 states the *pronoun* rule ("es ihm"). The noun rule runs the
  // other way — Dativ before the Angaben, Akkusativ after them — and a learner holding
  // only the pronoun rule will order every noun pair wrong while believing they know
  // the system. That is worse than not having been taught.
  //
  // Upgraded 2026-08-20: the rule said an Akkusativ noun goes *after* the Angaben,
  // flat. That is only true of a new, indefinite one. A definite Akkusativ is known
  // information and may stand in front of them — „Ich habe die Rechnung gestern in
  // die Filiale geschickt“ is as neutral as „Ich habe gestern die Rechnung …“. The
  // flat version made a learner mark a correct sentence wrong, which is the one kind
  // of error a rule must not produce. See LESSONS.md.
  {
    level: 'B2', title: 'Mittelfeld: Ergänzungen & Angaben', upgrade: true,
    summary: 'Dativ before the Angaben, a new Akkusativ after them — te–ka–mo–lo between.',
    rule: 'The Mittelfeld is everything between the finite verb and the closing bracket, and it has a default order rather than a fixed one. Adverbials (Angaben) run temporal – kausal – modal – lokal: te–ka–mo–lo. Complements (Ergänzungen) slot around them: a Dativ noun goes in front of the Angaben, a new (indefinite) Akkusativ noun goes after them but before the lokal Angabe, and a prepositional object closes the Mittelfeld. Known information moves left, so a definite Akkusativ noun may also stand in front of the Angaben, and a pronoun always does. Any one element can move to position 1 for emphasis; the rest keep their order.',
    sections: [
      { label: 'the default order', body: 'Dativ – temporal – kausal – modal – Akkusativ – lokal – Präpositionalergänzung.', examples: [
        { de: 'Ella hat ihren Eltern gestern aus Freude spontan eine E-Mail geschrieben.', en: 'Dativ (ihren Eltern) first, Akkusativ (eine E-Mail) after the Angaben' },
      ] },
      { label: 'te – ka – mo – lo', body: 'temporal (wann?) – kausal (warum?) – modal (wie?) – lokal (wo/wohin/woher?).', examples: [
        { de: 'Ich bin letztes Jahr aus Liebe ziemlich spontan nach Australien ausgewandert.', en: 'all four slots, in order' },
      ] },
      { label: 'Dativ before, a new Akkusativ after', pairs: [
        { from: 'Ein Bekannter hat Ella letztes Jahr geholfen.', to: 'Dativ-Ergänzung → in front of the Angabe' },
        { from: 'Ella hat täglich E-Mails nach Deutschland geschickt.', to: 'indefinite Akkusativ → after the Angabe, before the lokal' },
      ] },
      { label: 'known information moves left', body: 'The slot is decided by what is new, not by the case alone. A definite Akkusativ names something already in play and may cross the Angabe; an indefinite one is the news of the sentence and stays behind it.', examples: [
        { de: 'Ich habe gestern dem Kunden die Rechnung in die Filiale geschickt.', en: 'neutral' },
        { de: 'Ich habe dem Kunden die Rechnung gestern in die Filiale geschickt.', en: 'also neutral — the invoice is known, so it may move in front of the Angabe' },
        { de: 'Ich habe gestern eine Rechnung in die Filiale geschickt.', en: 'indefinite: this one cannot move left' },
      ] },
      { label: 'but pronouns run the other way', body: 'Pronouns move to the front of the Mittelfeld, and among them the Akkusativ comes first: Er hat es ihr gestern gegeben. The noun rule and the pronoun rule are genuinely opposite — see TeKaMoLo & Satzklammer at C1.' },
      { label: 'the prepositional object closes it', examples: [
        { de: 'Ella wartet seit Monaten sehnsüchtig auf den Besuch ihrer Freundin.', en: 'auf + Akkusativ stands last, right before the bracket' },
      ] },
      { label: 'emphasis', body: 'Moving one element to position 1 pushes the subject behind the verb and leaves everything else as it was: Aus Liebe bin ich letztes Jahr ziemlich spontan ausgewandert.' },
    ],
    exercises: [
      { kind: 'type', prompt: 'The Angaben order, as four syllables: ___ – ka – mo – lo', accept: ['te', 'Te'], explain: 'temporal first — te–ka–mo–lo.' },
      { kind: 'mc', prompt: 'Wofür steht „lo“ in te–ka–mo–lo?', options: ['lokal — wo? wohin? woher?', 'logisch — in welcher Reihenfolge?', 'lokativ — nur „wo?“'], answer: 0, explain: 'lokal covers all three directional questions, and comes last.' },
      { kind: 'choose', prompt: 'Ich fahre ___ nach Bonn.', options: ['morgen wegen des Termins mit dem Zug', 'mit dem Zug morgen wegen des Termins', 'wegen des Termins mit dem Zug morgen'], answer: 0, explain: 'te (morgen) – ka (wegen des Termins) – mo (mit dem Zug) – lo (nach Bonn).' },
      { kind: 'choose', prompt: 'Ein Bekannter hat ___ bei der Wohnungssuche geholfen.', options: ['Ella letztes Jahr netterweise', 'letztes Jahr netterweise Ella', 'netterweise letztes Jahr Ella'], answer: 0, explain: 'helfen takes the Dativ, and a Dativ noun stands in front of the Angaben.' },
      { kind: 'choose', prompt: 'Ella hat ___ geschickt.', options: ['täglich mehrere E-Mails nach Deutschland', 'mehrere E-Mails täglich nach Deutschland', 'nach Deutschland täglich mehrere E-Mails'], answer: 0, explain: 'Akkusativ noun after the temporal Angabe, before the lokal one.' },
      { kind: 'mc', prompt: 'Wo steht die Dativergänzung normalerweise?', options: ['vor den temporalen, kausalen und modalen Angaben', 'hinter allen Angaben', 'immer am Ende des Mittelfelds'], answer: 0, explain: 'Dativ in front, Akkusativ behind — that is the whole rule for nouns.' },
      { kind: 'choose', prompt: 'Ella hat sich während eines Urlaubs ___ verliebt.', options: ['in David', 'David in', 'in David sehr'], answer: 0, explain: 'The prepositional object stands last in the Mittelfeld, right before the participle.' },
      { kind: 'choose', prompt: 'Sie wartet seit Monaten ___.', options: ['sehnsüchtig auf den Besuch', 'auf den Besuch sehnsüchtig', 'auf sehnsüchtig den Besuch'], answer: 0, explain: 'The modal Angabe precedes; the Präpositionalergänzung closes the Mittelfeld.' },
      { kind: 'order', prompt: 'Arrange neutrally (Dativ – Angaben – Akkusativ):', tiles: ['Er', 'hat', 'seiner', 'Schwester', 'gestern', 'schnell', 'einen', 'Brief', 'geschrieben'], explain: 'Dativ (seiner Schwester) – te (gestern) – mo (schnell) – Akkusativ (einen Brief).' },
      { kind: 'error', prompt: 'Ich habe eine E-Mail meiner Mutter gestern geschrieben.', answer: 2, fix: 'Ich habe meiner Mutter gestern eine E-Mail geschrieben.', explain: 'The Dativ noun belongs in front of the Angabe and the Akkusativ noun behind it.' },
      { kind: 'choose', prompt: 'Pronouns: „Er hat ___ gestern gegeben.“', options: ['es ihr', 'ihr es', 'gestern es ihr'], answer: 0, explain: 'Pronouns move to the front, and Akkusativ precedes Dativ — the mirror image of the noun rule.' },
      { kind: 'mc', prompt: 'Warum ist „Aus Liebe bin ich spontan ausgewandert“ richtig?', options: ['Position 1 kann jedes Element tragen; das Subjekt rückt hinter das Verb.', 'Kausale Angaben müssen immer auf Position 1 stehen.', 'Nach „aus“ folgt immer das Verb.'], answer: 0, explain: 'Fronting is for emphasis. Verb stays second, subject follows it, the remaining order is unchanged.' },
      { kind: 'choose', prompt: 'Wer auswandert, muss ___ auflösen.', options: ['vor dem Umzug oft die ganze Wohnung', 'die ganze Wohnung vor dem Umzug oft', 'oft die ganze Wohnung vor dem Umzug'], answer: 0, explain: 'Temporal before the Akkusativ noun; the separable prefix closes the bracket.' },
      { kind: 'mc', prompt: 'Was steht am Ende des Mittelfelds?', options: ['die Präpositionalergänzung', 'die temporale Angabe', 'die Dativergänzung'], answer: 0, explain: 'It sits last, immediately before the closing bracket.' },
      { kind: 'mc', prompt: 'Warum sind „Ich habe gestern die Rechnung geschickt“ und „Ich habe die Rechnung gestern geschickt“ beide richtig?', options: ['Die Rechnung ist bekannt, und Bekanntes darf vor die Angabe rücken.', 'Die Zeitangabe ist im Mittelfeld frei beweglich.', 'Die zweite Variante ist nur umgangssprachlich.'], answer: 0, explain: 'The slot follows information structure: a definite Akkusativ may cross the Angabe, an indefinite one may not.' },
      { kind: 'error', prompt: 'Ich habe eine Rechnung gestern in die Filiale geschickt.', answer: 2, fix: 'Ich habe gestern eine Rechnung in die Filiale geschickt.', explain: 'An indefinite Akkusativ is the new information and stays behind the temporal Angabe.' },
      { kind: 'mc', prompt: 'Welcher Satz ist NICHT möglich?', options: ['Ich habe eine Rechnung gestern geschickt.', 'Ich habe gestern eine Rechnung geschickt.', 'Ich habe die Rechnung gestern geschickt.'], answer: 0, explain: 'Only the indefinite one is blocked in front of the Angabe — it is the news of the sentence, and news comes last.' },
    ],
  },

  // `Die Stellung von „nicht“`, deepened from a Dreyer §14 page worked by hand.
  //
  // The point taught four "before" cases and two "after" cases. Dreyer's list is
  // longer in exactly the place a B2 learner lives: **everything the verb still
  // needs to its right** takes nicht in front of it — the prepositional object
  // („Er interessiert sich nicht für Politik“), the place the verb requires („Sie
  // wohnt nicht in Münster“), the bare noun that completes it („Er wird nicht
  // Arzt“) and the noun of a Funktionsverbgefüge („nicht in Betrieb nehmen“).
  // None of those four was stated.
  //
  // One of them was already being *tested*: exercise „Sie wohnt ___ in München.“
  // has shipped since the point was written, and the rule never covered it — the
  // existing „before a directional phrase“ is *wohin*, and Münster is *wo*. A drill
  // on a rule the panel does not state is the same defect as the flat Akkusativ
  // rule above, pointing the other way: there the learner was taught something
  // untrue, here they are tested on something untaught.
  //
  // The exercises also drifted from the title. Of the nineteen, **fourteen were
  // `choose` between nicht / kein / nichts** — which is *which negator*, the job of
  // A1's `Negation: nicht vs. kein`, not *where it goes*. Position is a word-order
  // fact, so the ten added here are mostly `order` and `error`: build the sentence,
  // or find the nicht that is in the wrong slot. Merging is by prompt, so the
  // originals survive untouched.
  {
    level: 'B2', title: 'Die Stellung von „nicht“', upgrade: true,
    summary: 'Where nicht stands decides how much of the sentence it denies.',
    rule: 'A1 settles which negator to use — kein for nouns, nicht for everything else. This settles where nicht goes, because its position is what decides how much it denies. Ask two questions in order: is the whole sentence denied, or one element in it? And then — what does the verb still need to its right?',
    sections: [
      { label: 'Satznegation — nicht goes as late as it can', body: 'Denying the whole sentence, nicht stands after the case objects (Akkusativ, Dativ, Genitiv) and after most Angaben — time, cause, condition: „Der Präsident überreichte gestern dem Sieger die Goldmedaille wegen Dopingverdachts nicht.“ Everything below is a reason it has to stop earlier.' },
      { label: '…but before the second half of the verb', examples: [
        { de: 'Er schreibt den Text nicht ab.', en: 'before a separable prefix' },
        { de: 'Er kann den Text nicht lesen.', en: 'before an infinitive' },
        { de: 'Er hat den Text nicht verstanden.', en: 'before a Partizip II' },
        { de: 'Der Text ist nicht korrigiert worden.', en: 'before the passive participle' },
        { de: 'Sie war im vergangenen Jahr nicht krank.', en: 'before a predicate adjective' },
      ] },
      { label: '…and before whatever completes the verb', examples: [
        { de: 'Er interessiert sich nicht für Politik.', en: 'prepositional object — also „nicht dafür“' },
        { de: 'Er erinnert sich nicht an mich.', en: 'prepositional object' },
        { de: 'Sie wohnt nicht in Münster.', en: 'wo? — a place the verb requires' },
        { de: 'Er fährt nicht nach Hamburg.', en: 'wohin? — a direction the verb requires' },
        { de: 'Er wird nicht Arzt.', en: 'a bare noun completing the verb (also „kein Arzt“)' },
        { de: 'Man kann die Maschine nicht in Betrieb nehmen.', en: 'the noun of a Funktionsverbgefüge' },
      ] },
      { label: 'Teilnegation — deny one element, then correct it', body: 'nicht stands immediately before the element it denies, and sondern supplies the correction. Move nicht and the meaning moves with it: „Nicht mein Bruder hat das Wörterbuch gekauft, sondern meine Schwester“ · „nicht gestern …, sondern vorgestern“ · „nicht das Wörterbuch …, sondern einen Krimi“.' },
      { label: 'A Modal-Angabe is always Teilnegation', examples: [
        { de: 'Sie schreibt den Brief nicht mit der Hand.', en: 'wie? — she writes it, just not by hand' },
        { de: 'Sie schreibt den Brief nicht fehlerfrei.', en: 'wie? — she writes it, just not faultlessly' },
      ] },
      { label: 'Often only the context separates the two', body: '„Mein Bruder hat gestern das Wörterbuch nicht gekauft“ can deny the whole sentence, or only gekauft — waiting for „sondern ausgeliehen“. Satznegation and Teilnegation share this position, so nothing in the word order tells them apart.' },
    ],
    exercises: [
      { kind: 'order', prompt: 'Build: „He is not interested in politics.“', tiles: ['Er', 'interessiert', 'sich', 'nicht', 'für', 'Politik'], explain: 'A prepositional object completes the verb, so nicht stands in front of it — never after Politik.' },
      { kind: 'order', prompt: 'Build: „She does not live in Münster.“', tiles: ['Sie', 'wohnt', 'nicht', 'in', 'Münster'], explain: 'wohnen requires a place (wo?). nicht precedes it, exactly as with a direction.' },
      { kind: 'order', prompt: 'Build: „The machine cannot be put into operation.“', tiles: ['Man', 'kann', 'die', 'Maschine', 'nicht', 'in', 'Betrieb', 'nehmen'], explain: 'in Betrieb nehmen is a Funktionsverbgefüge — nicht goes before its noun, not before the infinitive.' },
      { kind: 'order', prompt: 'Build: „The text has not been corrected.“', tiles: ['Der', 'Text', 'ist', 'nicht', 'korrigiert', 'worden'], explain: 'The passive participle is the second half of the verb, so nicht stands in front of the whole of it.' },
      { kind: 'error', prompt: 'Er erinnert sich an mich nicht.', answer: 5, fix: 'Er erinnert sich nicht an mich.', explain: 'sich erinnern an is a prepositional object: nicht goes before the preposition, not at the end.' },
      { kind: 'error', prompt: 'Sie wohnt in Münster nicht.', answer: 4, fix: 'Sie wohnt nicht in Münster.', explain: 'The place completes wohnen, so nicht precedes it.' },
      { kind: 'error', prompt: 'Er wird Arzt nicht.', answer: 3, fix: 'Er wird nicht Arzt.', explain: 'A bare noun completing werden takes nicht in front of it. „Er wird kein Arzt“ is equally good.' },
      { kind: 'mc', prompt: 'Wohin gehört „nicht“ bei einem Präpositionalobjekt?', options: ['vor die Präposition: Er interessiert sich nicht für Politik.', 'hinter das Objekt: Er interessiert sich für Politik nicht.', 'vor das konjugierte Verb: Er nicht interessiert sich für Politik.'], answer: 0, explain: 'The prepositional object is an Ergänzung, and nicht stands before every Ergänzung the verb still needs.' },
      { kind: 'mc', prompt: 'Welcher Satz verneint nur die Art und Weise?', options: ['Sie schreibt den Brief nicht mit der Hand.', 'Sie schreibt den Brief mit der Hand nicht.', 'Sie schreibt nicht den Brief mit der Hand.'], answer: 0, explain: 'Before a Modal-Angabe the negation is always partial: she writes it, just not by hand.' },
      { kind: 'type', prompt: 'Nur die Zeit verneinen: „Mein Bruder hat gestern das Wörterbuch gekauft.“ → Mein Bruder hat das Wörterbuch ___ gestern gekauft, sondern vorgestern.', accept: ['nicht'], explain: 'Teilnegation: nicht stands immediately before the denied element, and sondern corrects it.' },
    ],
  },

  // The other half of negation, and the half Lexi had almost nothing on.
  //
  // A2's `Wortbildung: Adjektive` teaches the suffixes plus un-, which is right for
  // A2. It cannot cover the part that actually costs a B2 learner marks: **which**
  // negator a given word takes, and the fact that miss- is not a negator at all.
  // `missverständlich` does not mean "not understandable" — that is
  // `unverständlich`. It means *liable to be misunderstood*, which is a different
  // claim, and the pair is the cleanest way to show it.
  //
  // in-/il-/im-/ir- is the one genuinely rule-governed piece here: it attaches only
  // to Latin and Greek loanwords, and assimilates to the consonant after it. So a
  // learner who knows the word is a loan can predict the prefix, and otherwise
  // cannot — which is worth saying out loud rather than leaving them to guess.
  //
  // Written from a B2 coursebook page (Aspekte Modul 3, „Missverständliches“) whose
  // exercise 5a is exactly this system: „Jemand, der keine Geduld hat, ist ___“.
  // The exercises keep that frame, because defining the person and asking for the
  // adjective is a production task, not a recognition one.
  {
    level: 'B2', title: 'Verneinung durch Wortbildung: un-, miss-, in-',
    summary: 'German negates inside the word too — and which negator is lexical.',
    rule: 'Beside nicht and kein, German negates by building the negation into the word. Four devices do almost all of it, and choosing between them is mostly a matter of the word rather than a rule — with one reliable exception, in-, which attaches only to loanwords.',
    sections: [
      { label: 'un- — the default, and it stays stressed', examples: [
        { de: 'geduldig → ungeduldig', en: 'the plain opposite' },
        { de: 'vernünftig → unvernünftig', en: 'unreasonable' },
        { de: 'interessant → uninteressant', en: 'uninteresting' },
        { de: 'verständlich → unverständlich', en: 'incomprehensible — cannot be understood' },
      ] },
      { label: 'miss- — not "not", but wrongly or in vain', body: 'miss- does not deny the word, it spoils it. „missverständlich“ is not the opposite of „verständlich“ — that is „unverständlich“. It means *easily misunderstood*, which is a claim about how a thing goes wrong, not about whether it works at all. The same shape gives misslingen (to fail), missachten (to disregard) and das Missverständnis.' },
      { label: 'in- / il- / im- / ir- — loanwords only, and it assimilates', examples: [
        { de: 'tolerant → intolerant', en: 'the base form' },
        { de: 'legal → illegal', en: 'before l- it becomes il-' },
        { de: 'mobil → immobil', en: 'before m- and b- it becomes im-' },
        { de: 'reparabel → irreparabel', en: 'before r- it becomes ir-' },
      ] },
      { label: '-los vs. -frei — both mean "without", not the same way', body: '-los is neutral or a lack: arbeitslos, hilflos, sinnlos. -frei says the missing thing is unwanted, so it reads as an improvement: fehlerfrei, stressfrei, zuckerfrei. The pair schuldlos (blameless) and schuldenfrei (free of debt) shows both at once.' },
      { label: 'Which one a word takes is lexical', body: 'There is no rule deriving unmöglich rather than *inmöglich*, or arbeitslos rather than *unarbeitsam*. Only the loanword pattern is predictable. Learn the negated form as its own word — which is why they are carded separately here.' },
    ],
    exercises: [
      { kind: 'type', prompt: 'Jemand, der keine Geduld hat, ist ___.', accept: ['ungeduldig'], explain: 'geduldig + un-.' },
      { kind: 'type', prompt: 'Jemand, der nicht vernünftig ist, ist ___.', accept: ['unvernünftig'], explain: 'vernünftig + un-.' },
      { kind: 'type', prompt: 'Jemand, der keine Arbeit hat, ist ___.', accept: ['arbeitslos'], explain: '-los = without. Not un-: *unarbeitsam is not a word.' },
      { kind: 'type', prompt: 'Etwas, das mich nicht interessiert, finde ich ___.', accept: ['uninteressant'], explain: 'interessant + un-.' },
      { kind: 'type', prompt: 'Jemand, der andere Gewohnheiten nicht toleriert, ist ___.', accept: ['intolerant'], explain: 'tolerant is a loanword, so it takes in-, not un-.' },
      { kind: 'type', prompt: 'Etwas, das nicht repariert werden kann, ist ___.', accept: ['irreparabel'], explain: 'reparabel is a loanword and begins with r-, so in- assimilates to ir-.' },
      { kind: 'mc', prompt: 'Eine Aussage, die leicht falsch verstanden wird, ist …', options: ['missverständlich', 'unverständlich', 'verständnislos'], answer: 0, explain: 'miss- = goes wrong. unverständlich would mean it cannot be understood at all.' },
      { kind: 'mc', prompt: 'Was ist der Unterschied zwischen „unverständlich“ und „missverständlich“?', options: ['unverständlich = gar nicht zu verstehen; missverständlich = leicht falsch zu verstehen', 'Es gibt keinen — beide verneinen „verständlich“', 'unverständlich ist gehoben, missverständlich umgangssprachlich'], answer: 0, explain: 'miss- is not a negator. It says the understanding goes wrong, not that it fails.' },
      { kind: 'choose', prompt: 'Das Gegenteil von „legal“ ist ___.', options: ['illegal', 'unlegal', 'misslegal'], answer: 0, explain: 'A loanword takes in-, and before l- it assimilates to il-.' },
      { kind: 'choose', prompt: 'Ein Text ohne einen einzigen Fehler ist ___.', options: ['fehlerfrei', 'fehlerlos', 'unfehlerhaft'], answer: 0, explain: '-frei, because the absence of errors is a good thing. (fehlerlos exists but is rarer.)' },
      { kind: 'mc', prompt: 'Warum „arbeitslos“ und nicht „unarbeitsam“?', options: ['Weil die Wahl der Verneinung lexikalisch ist und gelernt werden muss', 'Weil un- nie an Nomen-Ableitungen steht', 'Weil -los immer bei Personen steht'], answer: 0, explain: 'Only the loanword pattern (in-) is predictable; the rest is learned word by word.' },
      { kind: 'error', prompt: 'Sein Verhalten war sehr intolerant und unmoralisch, aber nicht inmöglich.', answer: 8, fix: 'Sein Verhalten war sehr intolerant und unmoralisch, aber nicht unmöglich.', explain: 'möglich is a native word, so it takes un-. in- is only for loanwords.' },
      { kind: 'choose', prompt: 'Ein Leben ohne Schulden ist ___.', options: ['schuldenfrei', 'schuldlos', 'unschuldig'], answer: 0, explain: 'schuldenfrei = free of debt. schuldlos and unschuldig are about blame, not money.' },
      { kind: 'type', prompt: 'Bilden Sie das Gegenteil mit einer Vorsilbe: „mobil“ → ___', accept: ['immobil'], explain: 'A loanword beginning with m-, so in- assimilates to im-.' },
    ],
  },

  // The freedom German is *known* for, and the bank only ever mentioned it.
  //
  // A1's `Wortstellung & Fragen` closes with "the verb placement is fixed — the rest
  // can move", B1's pronoun point gives it one section and one example, C1's TeKaMoLo
  // ends with "emphasis can front one element". Nowhere is it shown: no point puts
  // the *same sentence* on the page four ways. The word „Vorfeld“ does not appear in
  // the bank at all.
  //
  // That is a real gap rather than a tidy one. Position 1 is where German says what
  // the sentence is *about*, and a learner who only ever writes subject-first has the
  // grammar but none of the rhetoric — every paragraph reads like a list. And the
  // error it prevents is the classic one: «Morgen ich fahre nach Köln», two elements
  // before the verb, which is English word order wearing German words.
  //
  // A2, because that is when a learner starts wanting to open with a time phrase, and
  // it spirals: B1 adds what pronouns do inside the Mittelfeld, B2 adds the
  // information-structure reason, C1 adds the full TeKaMoLo bracket.
  //
  // The `order` exercises here name the opener in the prompt on purpose. The general
  // sentence-builder cannot accept every valid arrangement — that needs a parser —
  // but a drill whose *subject* is the Vorfeld can simply say which element to start
  // with, which makes the task well-posed and teaches the choice at the same time.
  {
    level: 'A2', title: 'Das Vorfeld: was vor dem Verb steht',
    summary: 'One element before the verb — and you choose which.',
    rule: 'German fixes the finite verb in second position and leaves the first almost free. Exactly one element stands there, and swapping it changes nothing about the grammar and everything about what the sentence is about. This is why German word order feels loose and is in fact strict: one slot, one occupant, verb immediately after.',
    sections: [
      { label: 'One sentence, four openers — all correct', examples: [
        { de: 'Ich fahre morgen mit dem Zug nach Köln.', en: 'neutral: the subject opens' },
        { de: 'Morgen fahre ich mit dem Zug nach Köln.', en: 'the time is the point — tomorrow, as opposed to today' },
        { de: 'Mit dem Zug fahre ich morgen nach Köln.', en: 'the means is the point — by train, not by car' },
        { de: 'Nach Köln fahre ich morgen mit dem Zug.', en: 'the destination is the point' },
      ] },
      { label: 'The verb does not move — everything else does', body: 'In all four the finite verb is the second element and the subject falls in behind it the moment something else takes first place. That inversion is not an extra rule to learn; it is what "verb second" means once the first slot is occupied by something other than the subject.' },
      { label: 'Exactly one element — the classic error', body: 'Position 1 holds one constituent, not two. «Morgen ich fahre nach Köln» puts *morgen* and *ich* both in front of the verb, which is English order in German words, and it is the single most common word-order mistake an English speaker makes. Count what stands before the verb: if it is more than one thing, the sentence is wrong.' },
      { label: 'A whole phrase counts as one element', examples: [
        { de: 'Mit dem Zug fahre ich gern.', en: 'three words, one element' },
        { de: 'Jeden Montagmorgen stehe ich früh auf.', en: 'three words, still one element' },
        { de: 'Weil es regnet, bleiben wir zu Hause.', en: 'a whole clause can hold the slot' },
      ] },
      { label: 'What position 1 is for', body: 'It is the sentence\'s topic — the hook to what came before. In a paragraph about tomorrow you open with *morgen*; answering "how are you getting there?" you open with *mit dem Zug*. Writing every sentence subject-first is grammatical and reads like a list, which is why this is a rhetorical tool and not only a rule.' },
    ],
    exercises: [
      { kind: 'order', prompt: 'Start with „Morgen“: „I am going to the cinema tomorrow.“', tiles: ['Morgen', 'gehe', 'ich', 'ins', 'Kino'], explain: 'The time takes position 1, so the verb stays second and the subject follows it.' },
      { kind: 'order', prompt: 'Start with „Am Wochenende“: „I visit my parents at the weekend.“', tiles: ['Am', 'Wochenende', 'besuche', 'ich', 'meine', 'Eltern'], explain: '„Am Wochenende“ is three words but one element, so the verb is still second.' },
      { kind: 'order', prompt: 'Start with „Ich“: the same sentence, neutral.', tiles: ['Ich', 'besuche', 'meine', 'Eltern', 'am', 'Wochenende'], explain: 'Subject first is the neutral order — same grammar, different emphasis.' },
      { kind: 'error', prompt: 'Morgen ich fahre nach Köln.', answer: 1, fix: 'Morgen fahre ich nach Köln.', explain: 'Two elements before the verb. Once *morgen* takes position 1, the verb must come next and *ich* falls in behind it.' },
      { kind: 'error', prompt: 'Am Samstag wir gehen ins Schwimmbad.', answer: 2, fix: 'Am Samstag gehen wir ins Schwimmbad.', explain: 'Same error: „Am Samstag“ already fills the slot, so the verb is next.' },
      { kind: 'mc', prompt: 'Warum heißt es „Morgen fahre ich“ und nicht „Morgen ich fahre“?', options: ['Weil nur ein Element vor dem Verb stehen darf', 'Weil Zeitangaben immer eine Inversion verlangen', 'Weil „morgen“ ein Adverb ist'], answer: 0, explain: 'The slot holds one constituent. Whatever occupies it, the finite verb comes immediately after.' },
      { kind: 'mc', prompt: 'Welcher Satz betont, womit man fährt?', options: ['Mit dem Zug fahre ich nach Köln.', 'Ich fahre mit dem Zug nach Köln.', 'Nach Köln fahre ich mit dem Zug.'], answer: 0, explain: 'Position 1 is what the sentence is about — put the means there and the means is the point.' },
      { kind: 'mc', prompt: 'Wie viele Elemente stehen in „Jeden Montagmorgen stehe ich früh auf“ vor dem Verb?', options: ['eins', 'zwei', 'drei'], answer: 0, explain: '„Jeden Montagmorgen“ is one time phrase, however many words it runs to.' },
      { kind: 'choose', prompt: 'Heute ___ wir zu Hause.', options: ['bleiben', 'wir bleiben', 'bleiben wir wir'], answer: 0, explain: 'The verb follows the Vorfeld directly; the subject comes after it.' },
      { kind: 'type', prompt: 'Schreiben Sie neu, beginnend mit „Im Sommer“: „Wir fahren im Sommer ans Meer.“ → ___ fahren wir ans Meer.', accept: ['Im Sommer', 'im Sommer'], explain: 'The time phrase moves to position 1 and the subject drops in behind the verb.' },
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
    const current = grammar[level].find((g: GPoint) => g.title === p.title);
    if (!current) {
      grammar[level].push({ title: p.title, summary: p.summary, rule: p.rule, ...(p.sections ? { sections: p.sections } : {}), exercises: p.exercises });
      addedPoints.push(`${level} · ${p.title} (${p.exercises.length} exercises)`);
    } else if (p.upgrade) {
      const have = new Set(current.exercises.map((e) => e.prompt));
      const added = p.exercises.filter((e) => !have.has(e.prompt));
      const before = current.rule.length;
      current.summary = p.summary;
      current.rule = p.rule;
      if (p.sections) current.sections = p.sections;
      current.exercises = [...current.exercises, ...added];
      addedPoints.push(`${level} · ${p.title} — upgraded (rule ${before} → ${p.rule.length} chars, +${added.length} exercises)`);
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
