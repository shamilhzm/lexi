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
