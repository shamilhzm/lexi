// Break the longest grammar rules into structured sections.
//
// 127 of the bank's 128 rules ship as one unbroken paragraph, and `RuleCard` has
// rendered `whitespace-pre-line` since it was written — waiting for newlines the
// data never had. The longest run to 547 characters, and the worst of them are not
// even prose: *Pluralbildung* is a five-item list with two worked examples each,
// set as a single paragraph on a phone.
//
// Sectioning is structure, not markup, so the renderer can column-align the arrow
// and keep German inside `lang="de"`. Neither is possible with a "\n".
//
// This is the reviewable artefact: the sections are authored here, applied
// idempotently, and `rule` is left untouched as the fallback and the full text.
// Local only — no network, no third-party model.
//
//   node scripts/corpus/grammar-sections.ts            # dry run, prints a diff
//   node scripts/corpus/grammar-sections.ts --write     # apply
//
// After --write: npm test (grammar.test.ts pins the ceiling) then commit.
import { readFileSync, writeFileSync } from 'node:fs';
import type { CEFR } from '../../src/types.ts';
import type { GPoint, RuleSection } from '../../src/lib/grammar.ts';

const PATH = 'public/data/grammar.json';
const write = process.argv.includes('--write');

/** Authored sections, keyed by `<level>::<title>`. Ordered longest-rule-first,
 *  which is also roughly worst-on-a-phone-first. */
const SECTIONS: Record<string, RuleSection[]> = {
  'A1::Pluralbildung (die Nomen im Plural)': [
    { body: 'German forms the plural in five main patterns. Whatever the pattern, the plural article is always die.' },
    {
      label: '-e, often with umlaut',
      pairs: [{ from: 'der Tisch', to: 'die Tische' }, { from: 'der Stuhl', to: 'die Stühle' }],
    },
    {
      label: '-(e)n — the rule for most feminines',
      pairs: [{ from: 'die Frau', to: 'die Frauen' }, { from: 'die Lampe', to: 'die Lampen' }],
    },
    {
      label: '-er, umlaut where possible — mostly neuters',
      pairs: [{ from: 'das Kind', to: 'die Kinder' }, { from: 'das Buch', to: 'die Bücher' }],
    },
    {
      label: '-s — loanwords and words ending in a vowel',
      pairs: [{ from: 'das Auto', to: 'die Autos' }, { from: 'das Büro', to: 'die Büros' }],
    },
    {
      label: 'No ending — masculines/neuters in -er, -el, -en',
      pairs: [{ from: 'der Lehrer', to: 'die Lehrer' }, { from: 'der Vater', to: 'die Väter' }],
    },
  ],

  'A2::Verschmelzung: Präposition + Artikel (im, am, zum …)': [
    { body: 'German fuses many prepositions with a following definite article. These are the everyday, unmarked forms.' },
    {
      label: 'The fusions',
      pairs: [
        { from: 'an / in + dem', to: 'am / im' },
        { from: 'an / in + das', to: 'ans / ins' },
        { from: 'bei / von / zu + dem', to: 'beim / vom / zum' },
        { from: 'zu + der', to: 'zur' },
        { from: 'auf / für / um / durch + das', to: 'aufs / fürs / ums / durchs' },
      ],
    },
    {
      label: 'The case still follows the meaning',
      body: 'With two-way prepositions (Wechselpräpositionen), position (wo?) takes the dative and direction (wohin?) the accusative.',
      examples: [
        { de: 'Ich bin im Kino.', en: 'Position — dative.' },
        { de: 'Ich gehe ins Kino.', en: 'Direction — accusative.' },
      ],
    },
    {
      label: 'When to keep the full form',
      body: 'Only to stress the article itself.',
      examples: [{ de: 'in dem Haus, das ich meine', en: 'in that house, the one I mean' }],
    },
  ],

  'B1::Konzessivsätze: obwohl': [
    { body: 'A concessive names something you would expect to prevent the main event, but which doesn’t. Three words do this job and each takes a different structure — that is the whole difficulty.' },
    {
      label: 'obwohl — subordinator, verb last',
      body: 'Formally also obgleich, obschon.',
      examples: [
        { de: 'Obwohl es regnet, gehen wir spazieren.' },
        { de: 'Wir gehen spazieren, obwohl es regnet.' },
      ],
    },
    {
      label: 'trotzdem — adverb, verb second',
      examples: [{ de: 'Es regnet; trotzdem gehen wir.', en: 'It’s raining; we’re going anyway.' }],
    },
    {
      label: 'trotz — preposition, takes the genitive',
      examples: [{ de: 'trotz des Regens', en: 'despite the rain' }],
    },
  ],

  'B1::Adjektivdeklination: ohne Artikel (stark)': [
    { body: 'With no article — common in plurals, mass nouns and after numbers — the adjective carries the case signal itself, taking the endings the definite article would have shown.' },
    {
      label: 'Nominative',
      pairs: [
        { from: 'masc. (like der)', to: 'guter Wein' },
        { from: 'neut. (like das)', to: 'gutes Bier' },
        { from: 'fem. (like die)', to: 'gute Milch' },
        { from: 'plural', to: 'gute Weine' },
      ],
    },
    {
      label: 'Accusative & dative',
      pairs: [
        { from: 'masc. acc.', to: 'guten Wein' },
        { from: 'dat.', to: 'gutem Wein / guter Milch' },
        { from: 'plural dat.', to: 'guten Weinen' },
      ],
    },
    {
      label: 'The one exception',
      body: 'Masculine and neuter genitive take -en, not -es, because the noun already carries the -s.',
      examples: [{ de: 'guten Weines' }],
    },
  ],

  'A2::Nullartikel: wann kein Artikel steht': [
    { body: 'German drops the article in four places where English often keeps one.' },
    {
      label: 'After sein / werden / bleiben — profession, nationality, religion',
      examples: [{ de: 'Sie ist Ärztin.' }, { de: 'Er wird Lehrer.' }],
    },
    {
      label: 'Uncountable or abstract nouns, used generally',
      examples: [{ de: 'Ich trinke Wasser.' }, { de: 'Zeit ist Geld.' }, { de: 'Sie hat Geduld.' }],
    },
    {
      label: 'Most countries, cities and languages',
      examples: [{ de: 'Ich lerne Deutsch.' }, { de: 'Er wohnt in Deutschland.' }],
    },
    {
      label: 'Set phrases',
      examples: [{ de: 'zu Fuß · nach Hause · mit Freunden' }],
    },
    {
      label: 'Keep the article when the noun is specific',
      examples: [{ de: 'Der Kaffee hier ist gut.' }],
    },
  ],

  'A2::Präpositionen mit Dativ (aus, bei, mit, nach, seit, von, zu)': [
    { body: 'A fixed set of prepositions always governs the dative. Memorise them as one group: aus, bei, mit, nach, seit, von, zu — gegenüber belongs here too.' },
    {
      label: 'The group',
      pairs: [
        { from: 'aus', to: 'from, out of' },
        { from: 'bei', to: 'at, near' },
        { from: 'mit', to: 'with' },
        { from: 'nach', to: 'after, to' },
        { from: 'seit', to: 'since, for' },
        { from: 'von', to: 'from, of' },
        { from: 'zu', to: 'to' },
      ],
    },
    {
      label: 'Dative endings — dem / der / den(+n)',
      examples: [{ de: 'mit dem Auto' }, { de: 'bei der Arbeit' }, { de: 'zu den Kindern' }],
    },
    {
      label: 'Several fuse',
      pairs: [
        { from: 'bei dem', to: 'beim' },
        { from: 'von dem', to: 'vom' },
        { from: 'zu dem', to: 'zum' },
        { from: 'zu der', to: 'zur' },
      ],
    },
  ],

  'C2::Irrelevanzkonzessivsätze: „wer/was/wie … auch (immer)"': [
    { body: 'To say “no matter who / what / how …”, German pairs a w-word with auch (immer). The finite verb still closes the concessive clause, and the main clause that follows keeps verb-second. Formal, argumentative register.' },
    {
      label: 'w-word + auch (immer)',
      examples: [
        { de: 'Wer auch immer anruft, ich bin nicht da.' },
        { de: 'Was auch (immer) geschieht, wir bleiben ruhig.' },
        { de: 'Wie schwer es auch sein mag, wir schaffen es.' },
      ],
    },
    {
      label: 'The paired variant: ob … oder',
      examples: [{ de: 'Ob reich oder arm, alle sind willkommen.' }],
    },
  ],

  'B1::Adjektivdeklination: nach unbestimmtem Artikel (gemischt)': [
    { body: 'After ein, kein and the possessives (mein, dein …) the adjective takes the weak endings -e / -en — except in the three slots where ein itself has no ending. There the adjective must show the gender instead.' },
    {
      label: 'The three slots where the adjective carries the gender',
      pairs: [
        { from: 'masc. nom. → -er', to: 'ein guter Wein' },
        { from: 'neut. nom. → -es', to: 'ein gutes Buch' },
        { from: 'neut. acc. → -es', to: 'ein gutes Buch' },
      ],
    },
    {
      label: 'Everywhere else',
      pairs: [
        { from: 'fem. nom./acc. → -e', to: 'eine gute Idee' },
        { from: 'all other cases → -en', to: 'einen guten Wein' },
        { from: 'dative → -en', to: 'meinem guten Freund' },
        { from: 'plural → -en', to: 'keine guten Ideen' },
      ],
    },
  ],

  'B1::Präpositionaladverbien: da(r)- & wo(r)-': [
    { body: 'When a preposition points to a *thing* rather than a person, German fuses the two instead of saying “preposition + it/that”.' },
    {
      label: 'Statements: da(r)-',
      examples: [
        { de: 'Ich warte darauf.', en: 'Not “auf es”.' },
        { de: 'Ich freue mich darüber.' },
      ],
    },
    {
      label: 'Insert -r- before a vowel',
      pairs: [
        { from: 'da + auf', to: 'darauf' },
        { from: 'da + über', to: 'darüber' },
        { from: 'wo + an', to: 'woran' },
      ],
    },
    {
      label: 'Questions and relative links: wo(r)-',
      examples: [{ de: 'Worauf wartest du?' }],
    },
    {
      label: 'For people, keep preposition + pronoun',
      examples: [{ de: 'Auf wen wartest du? — auf ihn.' }],
    },
  ],

  'C2::Verben mit Genitivobjekt': [
    { body: 'A small, formal set of verbs takes a genitive object. Written, elevated register — everyday German usually substitutes (brauchen for bedürfen, denken an for gedenken).' },
    {
      label: 'Plain genitive object',
      examples: [
        { de: 'Wir gedenken der Opfer.', en: 'gedenken — to commemorate' },
        { de: 'Es bedarf großer Geduld.', en: 'bedürfen — to require' },
      ],
    },
    {
      label: 'Reflexive',
      body: 'sich rühmen, sich schämen, sich bemächtigen, sich entledigen.',
    },
    {
      label: 'Accusative person + genitive thing',
      body: 'jemanden + Genitiv anklagen / beschuldigen / verdächtigen.',
      examples: [{ de: 'Man klagte ihn des Betrugs an.' }],
    },
  ],

  'A1::Präpositionen mit Akkusativ (durch, für, gegen, ohne, um)': [
    { body: 'A fixed set of prepositions always governs the accusative, whatever their meaning. Memorise them as one group: durch, für, gegen, ohne, um — plus bis and entlang.' },
    {
      label: 'The group',
      pairs: [
        { from: 'durch', to: 'through' },
        { from: 'für', to: 'for' },
        { from: 'gegen', to: 'against' },
        { from: 'ohne', to: 'without' },
        { from: 'um', to: 'around, at' },
      ],
    },
    {
      label: 'Only masculine changes: der → den',
      body: 'die, das and the plural die keep their form.',
      examples: [{ de: 'für den Mann · ohne mich · um die Ecke · gegen den Wind' }],
    },
  ],

  'B1::Fokuspartikeln: nur, auch, sogar, selbst': [
    { body: 'Focus particles pick out one part of the sentence and stand directly before it.' },
    {
      label: 'The four',
      pairs: [
        { from: 'nur', to: 'only — restricts' },
        { from: 'auch', to: 'also, too — adds' },
        { from: 'sogar', to: 'even — a surprising addition' },
        { from: 'selbst', to: 'even (before the noun)' },
      ],
    },
    {
      label: 'selbst cuts both ways',
      examples: [
        { de: 'Selbst der Chef kam.', en: 'Before the noun: even the boss came.' },
        { de: 'Der Chef selbst kam.', en: 'After the noun: the boss himself came.' },
      ],
    },
    {
      label: 'Moving the particle moves the meaning',
      examples: [
        { de: 'Nur ich habe ihn gesehen.', en: 'only I' },
        { de: 'Ich habe nur ihn gesehen.', en: 'only him' },
      ],
    },
  ],

  'A1::Possessivartikel (mein, dein …)': [
    { body: 'Possessives (mein, dein, sein, ihr, unser, euer, Ihr) take exactly the endings of ein/kein. The stem shows the possessor; the ending agrees with the noun that follows.' },
    {
      label: 'Nominative',
      examples: [{ de: 'mein Vater · meine Mutter · mein Kind · meine Eltern' }],
    },
    {
      label: 'Accusative — only masculine changes',
      examples: [{ de: 'meinen Vater' }],
    },
    {
      label: 'Dative',
      examples: [{ de: 'meinem Vater · meiner Mutter · meinem Kind' }],
    },
  ],

  'A1::Ordinalzahlen & Datum': [
    {
      label: 'Building the ordinal',
      pairs: [
        { from: 'up to 19: + -t', to: 'der vierte, der siebte' },
        { from: 'from 20: + -st', to: 'der zwanzigste' },
      ],
    },
    {
      label: 'Irregulars',
      body: 'erste, dritte, siebte, achte.',
    },
    {
      label: 'They decline like adjectives',
      examples: [{ de: 'der erste Tag' }, { de: 'am ersten Tag' }],
    },
    {
      label: 'Dates',
      body: '“On” a date is am + the ordinal in -ten.',
      examples: [
        { de: 'Heute ist der erste Mai.', en: 'Nominative.' },
        { de: 'am ersten Mai · am dritten Juni' },
      ],
    },
    {
      label: 'As a figure, the ordinal takes a period',
      examples: [{ de: 'der 1. Mai · am 3. Juni' }],
    },
  ],

  'A2::Gradpartikeln: sehr, ganz, ziemlich, gar': [
    { body: 'Degree particles stand directly before the adjective or adverb they scale, and never take an ending.' },
    {
      label: 'Scaling',
      pairs: [
        { from: 'sehr gut', to: 'very good' },
        { from: 'ziemlich groß', to: 'quite big' },
        { from: 'ganz neu', to: 'completely new' },
      ],
    },
    {
      label: 'Strengthening a negation',
      body: 'gar and überhaupt reinforce a negative.',
      pairs: [
        { from: 'gar nicht', to: 'not at all' },
        { from: 'gar kein', to: 'none whatsoever' },
      ],
    },
  ],

  'A2::Adjektivdeklination: nach bestimmtem Artikel (schwach)': [
    { body: 'After a definite article (der, die, das, dieser, jeder, alle) the adjective takes only two endings — which is why this is the declension to learn first.' },
    {
      label: '-e — nominative singular, and feminine/neuter accusative',
      examples: [{ de: 'der gute Mann · die gute Frau · das gute Kind' }],
    },
    {
      label: '-en — everywhere else, and the whole plural',
      examples: [{ de: 'den guten Mann · dem guten Kind · die guten Kinder' }],
    },
  ],

  'B1::Relativpronomen (der, die, das)': [
    { body: 'A relative pronoun agrees with its noun in gender and number, but takes its case from its own role inside the relative clause. The conjugated verb moves to the end.' },
    {
      label: 'Case comes from the clause',
      pairs: [
        { from: 'nominative', to: 'der Mann, der dort steht' },
        { from: 'accusative', to: 'der Mann, den ich kenne' },
        { from: 'dative', to: 'der Mann, dem ich helfe' },
        { from: 'genitive', to: 'der Mann, dessen Auto …' },
      ],
    },
    {
      label: 'Plural dative & genitive',
      pairs: [{ from: 'denen', to: 'dative' }, { from: 'deren', to: 'genitive' }],
    },
  ],

  'B1::Konjunktionen: sondern vs. aber, sowie': [
    { body: 'All three are coordinating, so the verb does not move.' },
    {
      label: 'sondern — corrects a negation, “but rather”',
      examples: [{ de: 'Das ist nicht rot, sondern blau.' }],
    },
    {
      label: 'aber — a plain contrast, replacing nothing',
      examples: [{ de: 'Es ist klein, aber gemütlich.' }],
    },
    {
      label: 'sowie — links like und, mostly in writing',
      examples: [{ de: 'Getränke sowie Snacks' }],
    },
  ],

  'B2::Textadverbien: bereits, nun, zunächst, schließlich': [
    { body: 'These adverbs guide a reader through time and argument. In position 1 they trigger verb-second inversion: Zunächst müssen wir planen.' },
    {
      label: 'Time and sequence',
      pairs: [
        { from: 'bereits', to: 'already (formal schon)' },
        { from: 'zunächst', to: 'at first' },
        { from: 'schließlich', to: 'finally, after all' },
        { from: 'inzwischen / mittlerweile', to: 'meanwhile, by now' },
        { from: 'derzeit', to: 'currently' },
      ],
    },
    {
      label: 'nun — now, or “well …” to open a point',
    },
  ],

  'B2::Modalpartikeln II: eigentlich, eben, halt, wohl': [
    { body: 'Modal particles colour a statement without changing its facts, and are never stressed. They sit in the middle field, after the finite verb and any pronouns.' },
    {
      label: 'eigentlich — softens, “actually / by the way”',
      examples: [{ de: 'Was machst du eigentlich?' }],
    },
    {
      label: 'eben / halt — resignation, “just the way it is”',
      body: 'eben is more neutral and northern, halt southern.',
      examples: [{ de: 'Das ist halt so.' }],
    },
    {
      label: 'wohl — a guess, “probably”',
      examples: [{ de: 'Er ist wohl krank.' }],
    },
  ],
};

// ---- apply ----------------------------------------------------------------
const bank = JSON.parse(readFileSync(PATH, 'utf8')) as Record<CEFR, GPoint[]>;
const keys = new Set(Object.keys(SECTIONS));
let applied = 0;

for (const level of Object.keys(bank) as CEFR[]) {
  for (const point of bank[level]) {
    const key = `${level}::${point.title}`;
    const sections = SECTIONS[key];
    if (!sections) continue;
    keys.delete(key);
    const before = JSON.stringify(point.sections ?? null);
    point.sections = sections;
    if (before !== JSON.stringify(sections)) applied++;
    const chars = sections.reduce((n, s) =>
      n + (s.label?.length ?? 0) + (s.body?.length ?? 0)
      + (s.pairs ?? []).reduce((m, p) => m + p.from.length + p.to.length, 0)
      + (s.examples ?? []).reduce((m, e) => m + e.de.length + (e.en?.length ?? 0), 0), 0);
    console.log(`  ${level.padEnd(2)} ${point.title}`);
    console.log(`     rule ${String(point.rule.length).padStart(3)} chars  →  ${sections.length} sections, ${chars} chars`);
  }
}

if (keys.size) {
  console.error(`\n✗ ${keys.size} authored key(s) matched no point in the bank — check the title exactly:`);
  for (const k of keys) console.error(`   ${k}`);
  process.exit(1);
}

// Report what is still over the ceiling, so the next batch has a worklist.
const over: string[] = [];
for (const level of Object.keys(bank) as CEFR[]) {
  for (const p of bank[level]) {
    if (!p.sections?.length && p.rule.length > 280) over.push(`${level} · ${p.title} (${p.rule.length})`);
  }
}

console.log(`\n${applied} point(s) sectioned.`);
if (over.length) {
  console.log(`\nStill over 280 chars without sections (${over.length}) — the next batch:`);
  for (const o of over.slice(0, 20)) console.log(`   ${o}`);
  if (over.length > 20) console.log(`   … and ${over.length - 20} more`);
}

if (write) {
  writeFileSync(PATH, JSON.stringify(bank, null, 2) + '\n');
  console.log(`\n✓ wrote ${PATH}`);
} else {
  console.log('\nDry run — pass --write to apply.');
}
