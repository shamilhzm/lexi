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
