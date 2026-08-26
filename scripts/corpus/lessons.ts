// Grammar lessons — author here, apply idempotently, and be nagged about the one
// thing that has actually gone wrong before.
//
// ## Why this file exists
//
// `grammar-sections.ts` broke the *longest* rules into structure. This does the
// opposite job: the bank's median rule is **193 characters**, 95 of 133 points
// have no sections at all, and *Imperativ* shipped **83 characters of explanation
// against 134 exercises**. The drilling was never the thin part. The Journey made
// that impossible to ignore — every node promises a concept and delivered a
// paragraph.
//
// ## The rule this file is built around
//
// LESSONS class 6, bought at the price of a wrong teaching rule that shipped:
//
//   > Before shipping a teaching rule, write the sentence it would reject. If that
//   > sentence is good German, the rule is a default and must say so.
//
// *Mittelfeld* shipped "an Akkusativ noun goes after the Angaben". True only of an
// **indefinite** one. A learner holding the flat version marks correct German
// wrong — and trusts the verdict. Omitting the case would have left a gap; stating
// it flat built a wrong test.
//
// So `RuleSection.limit` is a first-class field, and `--check` fails on any body
// that states an absolute without one. **That is a lint, not a proof.** A machine
// cannot tell whether a grammar claim is true; it can tell when a claim is phrased
// so that it has no room to be false, which is the shape the bad one had.
//
// ## What is and is not verified
//
//   ✅ every German example is checked against the app's own matcher and
//      conjugation engine — a claimed verb form that the engine does not produce
//      is a hard fail, the same standard `authoring:new` holds cards to
//   ✅ absolutes without a `limit` fail
//   ✅ applying is idempotent and prints a diff before it writes
//   ❌ whether a rule is *pedagogically* right. That is human, and the lessons
//      below were written against the standard references, not generated free-hand
//
// Local only — no network, no third-party model.
//
//   node scripts/corpus/lessons.ts             # dry run: diff + lint
//   node scripts/corpus/lessons.ts --check     # lint only, non-zero on failure
//   node scripts/corpus/lessons.ts --write     # apply
//
// After --write: `npm test` then `npm run corpus:validate`.
import { readFileSync, writeFileSync } from 'node:fs';
import type { CEFR } from '../../src/types.ts';
import type { GPoint, RuleSection } from '../../src/lib/grammar.ts';

const PATH = 'public/data/grammar.json';
const write = process.argv.includes('--write');
const checkOnly = process.argv.includes('--check');

/** Words that leave a claim no room to be false. A body containing one of these
 *  and no `limit` is the exact shape of the rule that shipped wrong. */
const ABSOLUTES = /\b(always|never|every|all|only|must|cannot|no exceptions?)\b/i;

/** A body may state an absolute without a limit when the claim is *genuinely*
 *  exceptionless. Listed with a reason so the exemption is reviewable rather than a
 *  silent hole in the check.
 *
 *  **Keyed per section, not per point — and the first version was per point.**
 *  Exempting `A1::Imperativ` for one thing waived *every* section in it, and two
 *  others were quietly hiding behind it: "a stem ending in -d/-t **cannot** be said
 *  without an -e" (colloquial German says «Wart mal» all day) and "e→i verbs
 *  **never** take the -e" («siehe oben» is standard written German). Both were real
 *  over-generalisations, both were caught by the lint, and both were then hidden by
 *  my own exemption. That is the failure mode LESSONS names: *a guard that
 *  enumerates its subjects is only as strong as the enumeration* — and a
 *  coarse-grained exemption is the same bug wearing a different hat.
 *
 *  Key is `<level>::<title>::<label or "intro">`. */
const EXEMPT: Record<string, string> = {
  'A1::Artikel & Genus::intro':
    'every noun really does carry a gender — the inventory is closed and there is no fourth article',
  'A1::Präteritum: sein & haben::Notice the shape you will see again':
    'ich and er/sie/es being identical and bare in the Präteritum is exceptionless — it holds for '
    + 'strong verbs (ich ging / er ging), weak verbs (ich machte / er machte) and the modals in the '
    + 'present alike. A structural fact about the paradigm, not a usage default, so there is no '
    + 'sentence it would wrongly reject',
};

export const LESSONS: Record<string, RuleSection[]> = {};

// ---------------------------------------------------------------------------
// The lessons. Keyed `<level>::<title>` exactly as the bank spells them.
// ---------------------------------------------------------------------------

LESSONS['A1::Artikel & Genus'] = [
  {
    body: 'Every German noun carries a gender, and the gender is a property of the *word*, not of the thing it names. '
      + 'This is the first thing that feels arbitrary and the first thing worth accepting early: the article is part of '
      + 'the noun, so learn «der Tisch», never «Tisch».',
  },
  {
    label: 'The three articles',
    pairs: [
      { from: 'masculine', to: 'der Tisch, der Mann, der Tag' },
      { from: 'feminine', to: 'die Lampe, die Frau, die Nacht' },
      { from: 'neuter', to: 'das Buch, das Kind, das Jahr' },
    ],
  },
  {
    label: 'Endings that give the gender away',
    body: 'Gender is not fully predictable, but roughly 80% of nouns are covered by their ending. These four are worth memorising because they are almost watertight:',
    pairs: [
      { from: '-ung, -heit, -keit, -schaft', to: 'die — die Wohnung, die Freiheit' },
      { from: '-chen, -lein', to: 'das — das Mädchen, das Brötchen' },
      { from: '-er (person doing a thing)', to: 'der — der Lehrer, der Fahrer' },
      { from: '-e (most, not all)', to: 'die — die Lampe, die Blume' },
    ],
    limit: '-e is the weak one of the four. «der Name», «der Junge» and «das Auge» are all -e and none of them is feminine. Treat -e as a good guess, and the other three as near-rules.',
  },
  {
    label: 'The English-speaker trap',
    body: 'English has one article, so it is tempting to treat der/die/das as three spellings of "the". They are not: they change with case as well as gender, and getting the gender wrong now means getting the case ending wrong later. Gender is the cheapest thing to learn early and the most expensive to repair late.',
  },
];

LESSONS['A1::sein & haben'] = [
  {
    body: 'These two verbs are irregular, extremely common, and needed for the perfect tense later — which is why they are worth drilling to reflex now rather than deriving each time.',
  },
  {
    label: 'sein — to be',
    pairs: [
      { from: 'ich', to: 'bin' }, { from: 'du', to: 'bist' }, { from: 'er/sie/es', to: 'ist' },
      { from: 'wir', to: 'sind' }, { from: 'ihr', to: 'seid' }, { from: 'sie/Sie', to: 'sind' },
    ],
  },
  {
    label: 'haben — to have',
    pairs: [
      { from: 'ich', to: 'habe' }, { from: 'du', to: 'hast' }, { from: 'er/sie/es', to: 'hat' },
      { from: 'wir', to: 'haben' }, { from: 'ihr', to: 'habt' }, { from: 'sie/Sie', to: 'haben' },
    ],
  },
  {
    label: 'Where they differ from English',
    body: 'German reaches for haben in several places English uses "be" — hunger, thirst, fear. Learn the haben version first: it is what you will hear.',
    examples: [
      { de: 'Ich habe Hunger.', en: 'I am hungry.' },
      { de: 'Sie hat Angst.', en: 'She is afraid.' },
      { de: 'Wie alt bist du? — Ich bin dreißig.', en: 'How old are you? — I am thirty. Age takes sein, unlike French or Spanish.' },
    ],
    limit: '«Ich bin hungrig» and «Ich bin durstig» are also correct German — the adjectives exist and are used, just less often in everyday speech than the haben phrases. Prefer haben; do not mark sein wrong.'
  },
];

LESSONS['A1::Präsens (regelmäßig)'] = [
  {
    body: 'The regular present tense is one stem plus six endings. Take the infinitive, drop -en, and add the ending. '
      + 'German has no continuous form, so this one tense covers both "I play" and "I am playing".',
  },
  {
    label: 'spielen → spiel- + ending',
    pairs: [
      { from: 'ich', to: 'spiele' }, { from: 'du', to: 'spielst' }, { from: 'er/sie/es', to: 'spielt' },
      { from: 'wir', to: 'spielen' }, { from: 'ihr', to: 'spielt' }, { from: 'sie/Sie', to: 'spielen' },
    ],
  },
  {
    label: 'When the stem makes the ending awkward',
    body: 'A stem ending in -t, -d or a consonant cluster takes an extra -e- so the form stays pronounceable. This is not an exception to learn as a list — say the form without it and you will hear why it is there.',
    pairs: [
      { from: 'arbeiten', to: 'du arbeitest, er arbeitet' },
      { from: 'finden', to: 'du findest, er findet' },
      { from: 'öffnen', to: 'du öffnest, er öffnet' },
    ],
  },
  {
    label: 'The tense covers more than English present',
    body: 'German uses the present for scheduled future too, where English needs "will" or "going to". The time word carries the future meaning, so no extra tense is needed.',
    examples: [
      { de: 'Morgen fahre ich nach Berlin.', en: 'Tomorrow I am going / will go to Berlin.' },
    ],
  },
];

LESSONS['A1::Personalpronomen (Nominativ)'] = [
  {
    body: 'The subject pronouns. German splits "you" three ways, and choosing wrongly is the most socially visible mistake at A1 — worth more attention than the paradigm itself.',
  },
  {
    label: 'The forms',
    pairs: [
      { from: 'ich', to: 'I' }, { from: 'du', to: 'you — one person, informal' },
      { from: 'er / sie / es', to: 'he / she / it' }, { from: 'wir', to: 'we' },
      { from: 'ihr', to: 'you — more than one, informal' }, { from: 'sie', to: 'they' },
      { from: 'Sie', to: 'you — formal, singular or plural' },
    ],
  },
  {
    label: 'sie, sie and Sie',
    body: 'Three different words share a spelling and are told apart by the verb and by the capital. «sie ist» is she; «sie sind» is they; «Sie sind» with a capital S is formal you, and keeps its capital everywhere in the sentence.',
    examples: [
      { de: 'Sie ist Ärztin.', en: 'She is a doctor. — capital only because it starts the sentence.' },
      { de: 'Woher kommen Sie?', en: 'Where are you from? — formal; the capital is mid-sentence and deliberate.' },
    ],
  },
  {
    label: 'er/sie/es follows the noun, not the thing',
    body: 'Because gender belongs to the word, a table is «er» and a girl is «es». It stops feeling strange faster than you expect, but it does have to be learned deliberately — English speakers tend to reach for «es» whenever the thing is an object.',
    examples: [
      { de: 'Wo ist der Tisch? — Er ist dort.', en: 'Where is the table? — It (he) is there.' },
      { de: 'Das Mädchen? Es kommt später.', en: 'The girl? She (it) is coming later — «Mädchen» is neuter.' },
    ],
  },
];

LESSONS['A1::Imperativ'] = [
  {
    body: 'Commands. German has three, because it has three words for "you" — and the du-form is the one with the moving parts.',
  },
  {
    label: 'The three forms',
    pairs: [
      { from: 'du', to: 'Mach! — stem only, no pronoun' },
      { from: 'ihr', to: 'Macht! — same as the present ihr-form, pronoun dropped' },
      { from: 'Sie', to: 'Machen Sie! — infinitive, and the pronoun stays' },
    ],
  },
  {
    label: 'When the du-form needs an -e',
    body: 'A stem ending in -d, -t, or a consonant + -n / -m takes the -e in standard German — try the form without it and you will hear why. Elsewhere the -e is optional and usually dropped in speech.',
    pairs: [
      { from: 'warten', to: 'Warte!' },
      { from: 'öffnen', to: 'Öffne!' },
      { from: 'entschuldigen', to: 'Entschuldige!' },
    ],
    limit: 'Casual speech drops it anyway — «Wart mal!» is everywhere and nobody hears it as an error. Write «Warte!»; do not be surprised by «Wart!».',
  },
  {
    label: 'Stem-changing verbs: the half that trips everyone',
    body: 'Verbs that change e → i or e → ie keep the change in the imperative, and drop the -e with it. Verbs that change a → ä lose the umlaut instead. Two vowel changes, opposite behaviour.',
    pairs: [
      { from: 'geben (du gibst)', to: 'Gib!' },
      { from: 'lesen (du liest)', to: 'Lies!' },
      { from: 'nehmen (du nimmst)', to: 'Nimm!' },
      { from: 'fahren (du fährst)', to: 'Fahr! — not «Fähr»' },
      { from: 'schlafen (du schläfst)', to: 'Schlaf! — not «Schläf»' },
    ],
    limit: 'One survivor: «siehe» keeps its -e in written cross-references — «siehe Seite 12», «siehe oben». It is a fixed form, not a live option, so «Sieh mal!» is still what you say out loud.',
  },
  {
    label: 'sein is its own thing',
    pairs: [{ from: 'du', to: 'Sei!' }, { from: 'ihr', to: 'Seid!' }, { from: 'Sie', to: 'Seien Sie!' }],
  },
  {
    label: 'A bare imperative is blunter than English',
    body: 'German softens commands with a particle rather than with "please" alone. «mal» and «doch» do most of the work, and leaving them out is the commonest way a correct sentence still sounds rude.',
    examples: [
      { de: 'Komm mal her.', en: 'Come here a sec. — «mal» makes it casual rather than an order.' },
      { de: 'Setzen Sie sich doch.', en: 'Do have a seat.' },
    ],
  },
];

LESSONS['A1::Modalverben'] = [
  {
    body: 'Six verbs that modify another verb: können (able), müssen (have to), wollen (want), dürfen (allowed), sollen (supposed to), mögen (like). They are irregular in the singular and they restructure the sentence.',
  },
  {
    label: 'können — the shape they all share',
    pairs: [
      { from: 'ich', to: 'kann' }, { from: 'du', to: 'kannst' }, { from: 'er/sie/es', to: 'kann' },
      { from: 'wir', to: 'können' }, { from: 'ihr', to: 'könnt' }, { from: 'sie/Sie', to: 'können' },
    ],
    limit: 'Note ich and er/sie/es are identical and both bare — no -e, no -t. That pattern holds for all six modals, and it is the opposite of every regular verb you have learned so far.',
  },
  {
    label: 'The bracket',
    body: 'The modal is conjugated and takes position 2. The main verb goes to the very end, as a bare infinitive. Everything else sits between them — this frame is called the Satzklammer and it is the backbone of German word order.',
    examples: [
      { de: 'Ich kann gut schwimmen.', en: 'I can swim well.' },
      { de: 'Du musst heute Abend zu Hause bleiben.', en: 'You have to stay home this evening.' },
    ],
  },
  {
    label: 'The main verb can be missing',
    body: 'When the action is obvious — especially with a direction or an object — German drops the infinitive entirely. English keeps its verb here, so learners tend to add one a native speaker would leave out.',
    examples: [
      { de: 'Ich muss nach Hause.', en: 'I have to go home. — «gehen» is understood.' },
      { de: 'Ich kann kein Deutsch.', en: 'I do not speak German.' },
    ],
  },
  {
    label: 'möchte is not quite mögen',
    body: '«möchte» is the polite way to say you want something, and it is what you will use in a shop or a restaurant. Strictly it is a subjunctive form of mögen, but at this level treat it as its own word: mögen means to like, möchte means would like.',
    examples: [
      { de: 'Ich mag Kaffee.', en: 'I like coffee.' },
      { de: 'Ich möchte einen Kaffee.', en: 'I would like a coffee.' },
    ],
  },
];

LESSONS['A1::Trennbare Verben'] = [
  {
    body: 'Many German verbs are a base verb plus a prefix, and some of those prefixes detach. Which ones do is audible: if the prefix carries the stress, it separates.',
  },
  {
    label: 'Separable — the prefix goes to the end',
    pairs: [
      { from: 'aufstehen', to: 'Ich stehe um sieben auf.' },
      { from: 'ankommen', to: 'Der Zug kommt um acht an.' },
      { from: 'einkaufen', to: 'Wir kaufen am Samstag ein.' },
    ],
  },
  {
    label: 'and rejoins in a subordinate clause',
    body: 'Once the verb is sent to the end anyway, there is nothing to separate from — the prefix goes back on.',
    examples: [
      { de: 'Ich bin müde, weil ich früh aufstehe.', en: 'I am tired because I get up early.' },
    ],
  },
  {
    label: 'Inseparable prefixes never move',
    body: 'be-, ge-, er-, ver-, zer-, ent-, emp-, miss- are unstressed and stay attached. They also take no ge- in the perfect.',
    pairs: [
      { from: 'besuchen', to: 'Ich besuche meine Oma. — Ich habe sie besucht.' },
      { from: 'verstehen', to: 'Ich verstehe das nicht. — Ich habe das nicht verstanden.' },
    ],
  },
  {
    label: 'Listen for the stress, do not memorise a list',
    body: 'The stress test is reliable and free: say the infinitive. AUFstehen separates; besuchen does not.',
    limit: 'A handful of prefixes — durch-, über-, um-, unter-, wieder- — do both, with different meanings, and the stress is what tells them apart. «Ich hole das Buch wieder» (I fetch it again) against «Ich wiederhole den Satz» (I repeat the sentence). You will meet these properly at B1; at A1 it is enough to know the ambiguity exists.',
  },
];

LESSONS['A1::Perfekt'] = [
  {
    body: 'The everyday past tense. German speaks in the Perfekt and writes in the Präteritum, so this is the one you need first: a helper verb in position 2, and a participle at the end.',
  },
  {
    label: 'Building the participle',
    pairs: [
      { from: 'regular: machen', to: 'gemacht — ge- + stem + -t' },
      { from: 'irregular: gehen', to: 'gegangen — ge- + stem + -en, often a vowel change' },
      { from: 'separable: aufstehen', to: 'aufgestanden — ge- goes inside' },
      { from: 'inseparable: besuchen', to: 'besucht — no ge- at all' },
      { from: 'ends in -ieren: studieren', to: 'studiert — no ge- either' },
    ],
  },
  {
    label: 'haben or sein',
    body: 'Most verbs take haben. Verbs of movement from A to B, and verbs of changing state, take sein — along with sein, bleiben and werden, which simply have to be learned.',
    examples: [
      { de: 'Ich habe einen Film gesehen.', en: 'I watched a film.' },
      { de: 'Ich bin nach Berlin gefahren.', en: 'I travelled to Berlin.' },
      { de: 'Er ist eingeschlafen.', en: 'He fell asleep. — a change of state.' },
    ],
    limit: '"Verbs of movement take sein" is a default, not a law: it holds only when the verb has no direct object. «Ich bin gefahren» is I drove/travelled, but «Ich habe das Auto gefahren» is I drove the car — same verb, an object, so haben. The same happens with fliegen and schwimmen. Do not mark a haben-version wrong without checking for an object first.',
  },
  {
    label: 'Word order is the same bracket as the modals',
    body: 'Helper verb second, participle last, everything else in between. If you can already build «Ich kann gut schwimmen», you can build the Perfekt — it is the same frame with a different filling.',
    examples: [
      { de: 'Wir haben gestern im Park Fußball gespielt.', en: 'We played football in the park yesterday.' },
    ],
  },
];

LESSONS['A1::Wortstellung & Fragen'] = [
  {
    body: 'German word order is freer than English in one way and stricter in another. The conjugated verb is nailed to a position; almost everything else can move around it, and moving it is how you choose what the sentence is about.',
  },
  {
    label: 'The three shapes',
    pairs: [
      { from: 'statement', to: 'Ich lerne Deutsch. — verb second' },
      { from: 'W-question', to: 'Was lernst du? — W-word first, verb second' },
      { from: 'yes/no question', to: 'Lernst du Deutsch? — verb first' },
    ],
  },
  {
    label: 'Position 2 means the second *slot*, not the second word',
    body: 'This is the rule English speakers misread. A slot can be one word or six; whatever you put in front, the verb still comes straight after it, and the subject then moves behind the verb.',
    examples: [
      { de: 'Heute lerne ich Deutsch.', en: 'Today I am learning German. — not «Heute ich lerne».' },
      { de: 'Am Montag um acht fahre ich nach Berlin.', en: 'On Monday at eight I travel to Berlin — six words in slot one, verb still second.' },
    ],
  },
  {
    label: 'Why you would move anything',
    body: 'Fronting is emphasis. «Ich lerne heute Deutsch» is neutral; «Heute lerne ich Deutsch» answers when. German uses position where English uses stress in the voice.',
  },
];

LESSONS['A1::Artikelwörter & kein'] = [
  {
    body: 'Three families of word sit in front of a noun and agree with it: the definite article, the indefinite article, and kein. Learn them together — kein is simply ein with a k, and everything that follows works the same way.',
  },
  {
    label: 'Nominative — the dictionary shape',
    pairs: [
      { from: 'masculine', to: 'der / ein / kein Mann' },
      { from: 'feminine', to: 'die / eine / keine Frau' },
      { from: 'neuter', to: 'das / ein / kein Kind' },
      { from: 'plural', to: 'die / — / keine Kinder' },
    ],
  },
  {
    label: 'Accusative — one change, and only one',
    body: 'The direct-object form differs from the nominative in the masculine and nowhere else. That is the single most useful fact at A1: three of the four boxes do not move.',
    pairs: [
      { from: 'der Mann', to: 'Ich sehe den Mann.' },
      { from: 'ein Mann', to: 'Ich sehe einen Mann.' },
      { from: 'kein Mann', to: 'Ich sehe keinen Mann.' },
    ],
  },
  {
    label: 'ein has no plural — that is what kein is for',
    body: 'There is no plural of ein, so a plural indefinite noun simply has no article: «Ich habe Bücher». To negate it you need keine, which does have a plural.',
    examples: [
      { de: 'Ich habe Bücher. — Ich habe keine Bücher.', en: 'I have books. — I have no books.' },
    ],
  },
  {
    label: 'Negate a noun with kein, not with nicht ein',
    body: 'English negates with "not a". German has a dedicated word, and «nicht ein» sounds broken.',
    examples: [{ de: 'Ich habe kein Auto.', en: 'I do not have a car.' }],
    limit: '«nicht ein» is possible when you are contrasting a *number*: «Ich habe nicht ein Auto, sondern zwei» — not one car, but two. Rare at A1, but it is why the form exists at all.',
  },
];

LESSONS['A1::Possessivartikel'] = [
  {
    body: 'Two things happen in a possessive at once, and separating them makes the whole set easy: the **stem** says who owns it, and the **ending** agrees with the thing owned. The endings are exactly ein/kein’s.',
  },
  {
    label: 'The stems',
    pairs: [
      { from: 'ich → mein', to: 'du → dein' },
      { from: 'er / es → sein', to: 'sie → ihr' },
      { from: 'wir → unser', to: 'ihr → euer' },
      { from: 'sie → ihr', to: 'Sie → Ihr (capital, always)' },
    ],
  },
  {
    label: 'The endings are ein-endings',
    pairs: [
      { from: 'nominative', to: 'mein Vater · meine Mutter · mein Kind · meine Eltern' },
      { from: 'accusative', to: 'meinen Vater — masculine only' },
      { from: 'dative', to: 'meinem Vater · meiner Mutter · meinem Kind' },
    ],
  },
  {
    label: 'sein and ihr are the ones that bite',
    body: 'English picks the possessive from the owner’s sex. German picks the *stem* from the owner’s grammatical gender and the *ending* from the thing owned — so «ihr Bruder» is her brother and «sein Schwester» is simply wrong twice over.',
    examples: [
      { de: 'Anna und ihr Bruder', en: 'Anna and her brother' },
      { de: 'Thomas und seine Schwester', en: 'Thomas and his sister' },
    ],
  },
  {
    label: 'euer loses its e',
    body: 'When euer takes an ending, the -e- in the stem drops out. Written «euere» it looks wrong because it is.',
    pairs: [{ from: 'euer Vater', to: 'eure Mutter, eure Eltern' }],
  },
];

LESSONS['A1::Präteritum: sein & haben'] = [
  {
    body: 'German has two past tenses and mostly speaks in the Perfekt — but not for these two. «Ich war» and «ich hatte» are what you will hear and what you should say; the Perfekt versions exist and sound stilted in conversation.',
  },
  {
    label: 'war — was / were',
    pairs: [
      { from: 'ich', to: 'war' }, { from: 'du', to: 'warst' }, { from: 'er/sie/es', to: 'war' },
      { from: 'wir', to: 'waren' }, { from: 'ihr', to: 'wart' }, { from: 'sie/Sie', to: 'waren' },
    ],
  },
  {
    label: 'hatte — had',
    pairs: [
      { from: 'ich', to: 'hatte' }, { from: 'du', to: 'hattest' }, { from: 'er/sie/es', to: 'hatte' },
      { from: 'wir', to: 'hatten' }, { from: 'ihr', to: 'hattet' }, { from: 'sie/Sie', to: 'hatten' },
    ],
  },
  {
    label: 'Notice the shape you will see again',
    body: 'ich and er/sie/es are identical and bare — no ending at all. That is true of the Präteritum of every German verb, and of the modals in the present. Three paradigms, one pattern.',
    examples: [
      { de: 'Gestern war ich müde.', en: 'Yesterday I was tired.' },
      { de: 'Wir hatten keine Zeit.', en: 'We had no time.' },
    ],
  },
];

LESSONS['A1::Personalpronomen (Akkusativ)'] = [
  {
    body: 'When a pronoun is the direct object it changes shape — as it does in English, which is the good news: you already say "I see **him**", not "I see he".',
  },
  {
    label: 'Nominative → accusative',
    pairs: [
      { from: 'ich', to: 'mich' }, { from: 'du', to: 'dich' }, { from: 'er', to: 'ihn' },
      { from: 'sie', to: 'sie' }, { from: 'es', to: 'es' },
      { from: 'wir', to: 'uns' }, { from: 'ihr', to: 'euch' }, { from: 'sie / Sie', to: 'sie / Sie' },
    ],
  },
  {
    label: 'Only three actually change',
    body: 'ich → mich, du → dich, er → ihn. Everything else keeps its form, so there are three items to learn rather than eight.',
    examples: [
      { de: 'Ich sehe ihn morgen.', en: 'I am seeing him tomorrow.' },
      { de: 'Kennst du mich noch?', en: 'Do you still know me?' },
    ],
  },
  {
    label: 'The pronoun follows the noun’s gender, not the thing’s',
    body: 'A masculine object is «ihn» even when it is a table, and a neuter person is «es». This is the same trap as er/sie/es in the nominative and it costs beginners the same mistake twice.',
    examples: [
      { de: 'Der Tisch? Ich kaufe ihn.', en: 'The table? I am buying it.' },
      { de: 'Das Buch? Ich lese es.', en: 'The book? I am reading it.' },
    ],
  },
];

LESSONS['A1::Zeitangaben mit Präpositionen'] = [
  {
    body: 'Time expressions are one of the few areas where German is genuinely tidier than English: the preposition is fixed by the *kind* of time, not by habit. Learn four and you can say most of what you need.',
  },
  {
    label: 'The four',
    pairs: [
      { from: 'am + day, part of day', to: 'am Dienstag, am Wochenende, am Abend' },
      { from: 'um + clock time', to: 'um acht, um halb neun' },
      { from: 'im + month, season, year-phrase', to: 'im Juli, im Winter, im Jahr 2026' },
      { from: 'von … bis + span', to: 'von Montag bis Freitag' },
    ],
  },
  {
    label: 'Two that take no preposition at all',
    body: 'A bare year, and the words for today/tomorrow/yesterday, stand on their own. English needs "in" for the year; German does not.',
    examples: [
      { de: 'Ich bin 1998 geboren.', en: 'I was born in 1998 — «in 1998» is a common and audible learner error.' },
      { de: 'Morgen habe ich frei.', en: 'Tomorrow I am off.' },
    ],
  },
  {
    label: 'in der Nacht is the odd one out',
    body: 'The parts of the day take am — am Morgen, am Mittag, am Nachmittag, am Abend. The night does not.',
    examples: [{ de: 'in der Nacht', en: 'at night — not «am Nacht».' }],
  },
];

LESSONS['A1::Verben mit Vokalwechsel'] = [
  {
    body: 'A group of common verbs change their stem vowel in the du and er/sie/es forms of the present. Everything else is the regular present you already know, which makes this a small patch rather than a new paradigm.',
    limit: 'The present is not the only place the change shows up: e → i / ie verbs carry it into the imperative too («Nimm!», «Lies!»), which is the last section on this page. a → ä verbs do not.',
  },
  {
    label: 'Only du and er/sie/es change',
    pairs: [
      { from: 'a → ä', to: 'fahren: du fährst, er fährt' },
      { from: 'a → ä', to: 'schlafen: du schläfst, er schläft' },
      { from: 'e → i', to: 'essen: du isst, er isst' },
      { from: 'e → i', to: 'nehmen: du nimmst, er nimmt' },
      { from: 'e → ie', to: 'sehen: du siehst, er sieht' },
      { from: 'e → ie', to: 'lesen: du liest, er liest' },
    ],
  },
  {
    label: 'ich, wir, ihr and sie are untouched',
    body: 'The infinitive vowel comes straight back. If you can say «ich fahre» you have not lost anything — the change is a two-cell exception, not a rewrite.',
    examples: [{ de: 'Ich fahre, du fährst, wir fahren.', en: 'I drive, you drive, we drive.' }],
  },
  {
    label: 'The vowel change and the imperative point in opposite directions',
    body: 'e → i / ie verbs keep the change when you give an order — «Nimm!», «Lies!» — while a → ä verbs drop the umlaut: «Fahr!», not «Fähr!». The two groups behave the same in the present and differently in the imperative, which is why they are worth learning as two lists rather than one.',
  },
];

LESSONS['A1::Ortsangaben mit Dativ'] = [
  {
    body: 'Nine prepositions can answer either **wo?** (where something is) or **wohin?** (where it is going). Answering *wo* puts the noun in the dative. This is the first place a case does real work — it changes the meaning rather than just the ending.',
  },
  {
    label: 'The dative articles',
    pairs: [
      { from: 'masculine', to: 'dem Tisch' },
      { from: 'feminine', to: 'der Küche' },
      { from: 'neuter', to: 'dem Bett' },
      { from: 'plural', to: 'den Kindern — plus an -n on the noun' },
    ],
  },
  {
    label: 'Location, with a static verb',
    examples: [
      { de: 'Das Buch liegt auf dem Tisch.', en: 'The book is lying on the table.' },
      { de: 'Die Lampe hängt über dem Bett.', en: 'The lamp is hanging above the bed.' },
      { de: 'Wir sind in der Küche.', en: 'We are in the kitchen.' },
    ],
  },
  {
    label: 'The same preposition with movement takes the accusative',
    body: 'The preposition does not choose the case — the question does. «auf dem Tisch» is on the table; «auf den Tisch» is onto it. Verbs of position (liegen, stehen, hängen, sein) go with the dative; verbs of movement (legen, stellen, hängen, gehen) with the accusative.',
    pairs: [
      { from: 'wo? — dative', to: 'Das Buch liegt auf dem Tisch.' },
      { from: 'wohin? — accusative', to: 'Ich lege das Buch auf den Tisch.' },
    ],
  },
  {
    label: 'The plural -n is easy to forget',
    body: 'Dative plural adds -n to the noun itself unless it already ends in -n or -s.',
    pairs: [{ from: 'die Kinder', to: 'mit den Kindern' }, { from: 'die Autos', to: 'mit den Autos — already -s' }],
  },
];

LESSONS['A1::Richtungsangaben & Indefinitpronomen'] = [
  {
    body: 'Two small topics that share a page: how to say where you are going, and the handful of words for "someone, something, nothing, people in general".',
  },
  {
    label: 'Going somewhere',
    pairs: [
      { from: 'zu + dative — people, places', to: 'zum Arzt, zur Post, zu meiner Schwester' },
      { from: 'nach — cities, countries, home', to: 'nach Bern, nach Italien, nach Hause' },
      { from: 'in + accusative — inside it', to: 'ins Museum, in die Stadt' },
    ],
    limit: 'nach is for countries **without** an article. Those that have one take in + accusative: «in die Schweiz», «in die Türkei», «in die USA». Say «nach Schweiz» and you will be understood and corrected.',
  },
  {
    label: 'zu Hause and nach Hause',
    body: 'One of the few pairs worth memorising as a unit: nach Hause is going home, zu Hause is being there.',
    examples: [{ de: 'Ich gehe nach Hause. Ich bin zu Hause.', en: 'I am going home. I am at home.' }],
  },
  {
    label: 'man — the missing English word',
    body: 'man means people-in-general and takes the er/sie/es form. English has no good equivalent, so it comes out as "you", "one", or a passive — and learners reach for «du», which sounds like you mean the listener personally.',
    examples: [
      { de: 'In Deutschland isst man viel Brot.', en: 'In Germany people eat a lot of bread.' },
      { de: 'Hier darf man nicht parken.', en: 'You may not park here.' },
    ],
  },
  {
    label: 'etwas, nichts, alle, jemand, niemand',
    pairs: [
      { from: 'etwas / nichts', to: 'something / nothing' },
      { from: 'jemand / niemand', to: 'someone / no one' },
      { from: 'alle / alles', to: 'everyone / everything' },
    ],
  },
];

LESSONS['A1::Partikeln: denn, ja, doch, mal'] = [
  {
    body: 'Modal particles are the most German thing at A1 and the least teachable by rule. They carry no information — remove one and the facts are unchanged — but they carry the *attitude*, and speech without them sounds abrupt and slightly hostile.',
  },
  {
    label: 'What each one does',
    pairs: [
      { from: 'denn', to: 'softens a question — friendly interest rather than interrogation' },
      { from: 'ja', to: 'marks something as obvious or as a shared surprise' },
      { from: 'doch', to: 'pushes back gently, or urges' },
      { from: 'mal', to: 'makes a request small and casual' },
    ],
  },
  {
    label: 'Same sentence, different person',
    pairs: [
      { from: 'Was machst du?', to: 'Was machst du denn? — curious, not accusing' },
      { from: 'Komm her.', to: 'Komm doch mal her. — an invitation, not an order' },
      { from: 'Das ist teuer.', to: 'Das ist ja teuer! — I had not expected that' },
    ],
  },
  {
    label: 'They are never stressed',
    body: 'A particle leans on the word before it and takes no emphasis of its own. Stressing one is the clearest sign of a non-native speaker who has learned them from a list.',
  },
  {
    label: 'doch has a second, louder job',
    body: 'Standing alone, doch contradicts a negative question or statement — the "yes I do" that English needs a whole phrase for.',
    examples: [{ de: 'Du kommst nicht mit? — Doch!', en: 'You are not coming? — Yes I am!' }],
  },
];

LESSONS['A1::dieser-Wörter (Demonstrativa)'] = [
  {
    body: 'A small family that takes the endings of der/die/das. Learn the definite article and the endings come free, which is why these are grouped as "der-words" rather than learned one at a time.',
  },
  {
    label: 'The family',
    pairs: [
      { from: 'dieser', to: 'this' }, { from: 'jeder', to: 'every, each' },
      { from: 'welcher', to: 'which' }, { from: 'jener', to: 'that — mostly written' },
    ],
  },
  {
    label: 'The endings are the article’s endings',
    pairs: [
      { from: 'nominative', to: 'dieser Mann · diese Frau · dieses Kind · diese Kinder' },
      { from: 'accusative', to: 'diesen Mann — masculine only, as always' },
      { from: 'dative', to: 'diesem Mann · dieser Frau · diesem Kind · diesen Kindern' },
    ],
  },
  {
    label: 'German has no everyday word for "that"',
    body: 'jener is the textbook translation and native speakers hardly use it. Real German points with «der/die/das» plus «da», or just uses dieser for both.',
    examples: [
      { de: 'Der Mann da ist mein Nachbar.', en: 'That man over there is my neighbour.' },
      { de: 'Ich nehme dieses hier.', en: 'I will take this one.' },
    ],
  },
  {
    label: 'jeder is singular',
    body: 'Where English says "all my friends", German often says «jeder» with a singular verb. jeder has no plural form; «alle» does that job.',
    examples: [{ de: 'Jeder Student bekommt ein Buch.', en: 'Every student gets a book.' }],
  },
];

LESSONS['A1::Negation: nicht vs. kein'] = [
  {
    body: 'German splits negation in two. Which word you need is decided by *what* you are negating, and the test is quick: if the positive sentence would have ein or no article, use kein. Otherwise use nicht.',
  },
  {
    label: 'The test',
    pairs: [
      { from: 'Ich habe ein Auto.', to: 'Ich habe kein Auto.' },
      { from: 'Ich trinke Kaffee.', to: 'Ich trinke keinen Kaffee.' },
      { from: 'Ich kenne den Mann.', to: 'Ich kenne den Mann nicht.' },
      { from: 'Das ist mein Buch.', to: 'Das ist nicht mein Buch.' },
    ],
  },
  {
    label: 'kein declines like ein and mein',
    body: 'Nothing new to learn: if you can do ein-endings, kein is free.',
    pairs: [{ from: 'accusative m.', to: 'keinen' }, { from: 'dative', to: 'keinem / keiner' }, { from: 'plural', to: 'keine' }],
  },
  {
    label: 'Where nicht goes',
    body: 'Late — usually at the end of the clause, but in front of the thing it is actually denying. Negating the whole sentence sends it to the end; negating one element puts it directly before that element.',
    examples: [
      { de: 'Ich komme heute nicht.', en: 'I am not coming today. — the whole thing is denied.' },
      { de: 'Ich komme nicht heute, sondern morgen.', en: 'I am not coming today, but tomorrow — only the day is denied.' },
    ],
  },
  {
    label: 'It still goes before these',
    body: 'A few things sit after nicht whatever else happens: an adjective completing sein, a separable prefix, and an infinitive or participle at the end of the bracket.',
    pairs: [
      { from: 'Das ist nicht gut.', to: 'adjective' },
      { from: 'Ich rufe dich nicht an.', to: 'separable prefix' },
      { from: 'Ich habe ihn nicht gesehen.', to: 'participle' },
    ],
  },
];

// ---- A2 -------------------------------------------------------------------

LESSONS['A2::Akkusativ'] = [
  {
    body: 'The case for the direct object — the thing the verb acts on. German marks it, English does not, and the good news is how little actually changes.',
  },
  {
    label: 'One box moves',
    pairs: [
      { from: 'masculine', to: 'der / ein → den / einen' },
      { from: 'feminine', to: 'die / eine — unchanged' },
      { from: 'neuter', to: 'das / ein — unchanged' },
      { from: 'plural', to: 'die — unchanged' },
    ],
  },
  {
    label: 'In use',
    examples: [
      { de: 'Ich sehe den Mann, die Frau und das Kind.', en: 'I see the man, the woman and the child.' },
      { de: 'Wir kaufen einen Tisch.', en: 'We are buying a table.' },
    ],
  },
  {
    label: 'It is not only about objects',
    body: 'A group of prepositions takes the accusative whatever the verb is doing: durch, für, gegen, ohne, um. The case follows the preposition, not the meaning.',
    examples: [{ de: 'Ich mache das für meinen Bruder.', en: 'I am doing this for my brother.' }],
  },
];

LESSONS['A2::Personalpronomen (Akkusativ & Dativ)'] = [
  {
    body: 'Both object pronoun sets side by side. English collapsed these into one — "him" does both jobs — so the split is new work rather than a relabelling.',
  },
  {
    label: 'Accusative and dative',
    pairs: [
      { from: 'ich', to: 'mich · mir' }, { from: 'du', to: 'dich · dir' },
      { from: 'er / es', to: 'ihn / es · ihm' }, { from: 'sie', to: 'sie · ihr' },
      { from: 'wir', to: 'uns · uns' }, { from: 'ihr', to: 'euch · euch' },
      { from: 'sie / Sie', to: 'sie / Sie · ihnen / Ihnen' },
    ],
  },
  {
    label: 'Some verbs simply take the dative',
    body: 'helfen, danken, gefallen, gehören, antworten, passen. There is no logic to derive — the verb carries the case as part of its meaning, so learn it with the verb.',
    examples: [
      { de: 'Ich helfe dir.', en: 'I am helping you — not «dich».' },
      { de: 'Das Buch gehört mir.', en: 'The book belongs to me.' },
    ],
  },
  {
    label: 'gefallen turns the sentence around',
    body: 'The thing that pleases is the subject and the person is the dative object — so the German sentence is built back-to-front against the English one.',
    examples: [{ de: 'Der Film gefällt mir.', en: 'I like the film — literally, the film pleases me.' }],
  },
];

LESSONS['A2::Dativ: Pronomen & Stellung'] = [
  {
    body: 'Where two objects meet, German has a fixed order — and one rule that overrides it. Getting this right is most of what makes a sentence sound arranged rather than assembled.',
  },
  {
    label: 'Two nouns: dative first',
    examples: [{ de: 'Ich gebe dem Kind den Ball.', en: 'I give the child the ball.' }],
  },
  {
    label: 'A pronoun jumps in front',
    body: 'Short and known information goes early. If either object is a pronoun it moves ahead of the noun; if the accusative is a pronoun it goes first.',
    pairs: [
      { from: 'Ich gebe dem Kind den Ball.', to: 'two nouns — dative first' },
      { from: 'Ich gebe ihm den Ball.', to: 'dative pronoun, still first' },
      { from: 'Ich gebe ihn dem Kind.', to: 'accusative pronoun — now first' },
      { from: 'Ich gebe ihn ihm.', to: 'two pronouns — accusative first' },
    ],
  },
  {
    label: 'The shortcut worth memorising',
    body: 'Pronouns before nouns; and between two pronouns, accusative before dative. That single line accounts for each row above.',
  },
];

LESSONS['A2::Wechselpräpositionen'] = [
  {
    body: 'Nine prepositions that take either case, and the case is the meaning. This is the clearest example in German of grammar carrying information rather than decorating it.',
  },
  {
    label: 'The nine',
    pairs: [{ from: 'in, an, auf', to: 'über, unter, vor, hinter, neben, zwischen' }],
  },
  {
    label: 'wo? → dative · wohin? → accusative',
    pairs: [
      { from: 'Die Lampe hängt über dem Tisch.', to: 'where it is — dative' },
      { from: 'Ich hänge die Lampe über den Tisch.', to: 'where it goes — accusative' },
      { from: 'Das Buch liegt auf dem Tisch.', to: 'dative' },
      { from: 'Ich lege das Buch auf den Tisch.', to: 'accusative' },
    ],
  },
  {
    label: 'The verbs come in pairs too',
    body: 'German splits the English verbs that do both jobs. Position verbs take the dative, placement verbs take the accusative, and they are irregular/regular in matching pairs.',
    pairs: [
      { from: 'liegen (lie) — dative', to: 'legen (lay) — accusative' },
      { from: 'stehen (stand) — dative', to: 'stellen (stand it up) — accusative' },
      { from: 'sitzen (sit) — dative', to: 'setzen (set) — accusative' },
      { from: 'hängen (hang) — dative', to: 'hängen (hang it) — accusative' },
    ],
  },
  {
    label: 'Not every use is physical',
    body: 'Fixed expressions keep a case that no longer answers a spatial question, and they have to be learned as phrases.',
    examples: [
      { de: 'Ich warte auf den Bus.', en: 'I am waiting for the bus — accusative, no movement anywhere.' },
      { de: 'Ich denke an dich.', en: 'I am thinking of you — accusative again.' },
    ],
  },
];

LESSONS['A2::Reflexive Verben'] = [
  {
    body: 'Verbs whose object is the subject. German uses them far more than English does, and many have no reflexive translation at all — «sich freuen» is simply "to be glad".',
  },
  {
    label: 'The pronouns',
    pairs: [
      { from: 'ich', to: 'mich · mir' }, { from: 'du', to: 'dich · dir' },
      { from: 'er/sie/es', to: 'sich' }, { from: 'wir', to: 'uns' },
      { from: 'ihr', to: 'euch' }, { from: 'sie/Sie', to: 'sich' },
    ],
  },
  {
    label: 'Accusative by default',
    examples: [
      { de: 'Ich freue mich auf das Wochenende.', en: 'I am looking forward to the weekend.' },
      { de: 'Beeil dich!', en: 'Hurry up!' },
    ],
  },
  {
    label: 'Dative when something else is the object',
    body: 'Add a direct object and the reflexive steps down to the dative — it is no longer the thing being acted on, it is who it is done for.',
    pairs: [
      { from: 'Ich wasche mich.', to: 'I wash — accusative' },
      { from: 'Ich wasche mir die Hände.', to: 'I wash my hands — dative, because die Hände is now the object' },
    ],
  },
  {
    label: 'German does not say "my hands"',
    body: 'With body parts and clothing the dative pronoun already says whose, so the possessive would be redundant and sounds wrong.',
    examples: [{ de: 'Ich putze mir die Zähne.', en: 'I brush my teeth — not «meine Zähne».' }],
  },
];

LESSONS['A2::Vergleiche: so … wie / als'] = [
  {
    body: 'Two patterns, and the trap is that English uses "than" for one and "as" for the other while German splits them the opposite way round from what learners expect.',
  },
  {
    label: 'Equal — so … wie',
    examples: [
      { de: 'Köln ist so schön wie Bonn.', en: 'Cologne is as nice as Bonn.' },
      { de: 'Sie ist nicht so groß wie ihr Bruder.', en: 'She is not as tall as her brother.' },
    ],
  },
  {
    label: 'Unequal — comparative + als',
    examples: [
      { de: 'Berlin ist größer als Köln.', en: 'Berlin is bigger than Cologne.' },
      { de: 'Heute ist es kälter als gestern.', en: 'Today it is colder than yesterday.' },
    ],
  },
  {
    label: 'The one error everyone makes',
    body: 'A comparative takes als, not wie. «größer wie» is the single most recognisable learner mistake in German — and you will hear native speakers say it in some regions, which does not make it standard.',
    limit: 'Regionally, «größer wie» is genuinely common in southern Germany and Austria in speech. It is still marked wrong in every exam and every piece of writing, so treat it as dialect you may hear rather than a variant you may use.',
  },
];

LESSONS['A2::Komparativ & Superlativ'] = [
  {
    body: 'German comparatives are regular in a way English is not: there is no "more beautiful" construction, and the -er ending goes on adjectives of any length.',
    limit: 'Regular in *form*, not universal in *use*: adjectives that are already absolute — tot, schwanger, einzig — have no comparative, because there is nothing to grade. The ending would build fine; the sentence would not mean anything.',
  },
  {
    label: 'The pattern',
    pairs: [
      { from: 'schön', to: 'schöner — am schönsten' },
      { from: 'interessant', to: 'interessanter — am interessantesten' },
      { from: 'klein', to: 'kleiner — am kleinsten' },
    ],
  },
  {
    label: 'Short words often take an umlaut',
    pairs: [
      { from: 'groß', to: 'größer — am größten' },
      { from: 'lang', to: 'länger — am längsten' },
      { from: 'alt', to: 'älter — am ältesten' },
      { from: 'jung', to: 'jünger — am jüngsten' },
    ],
  },
  {
    label: 'The four irregulars',
    pairs: [
      { from: 'gut', to: 'besser — am besten' },
      { from: 'viel', to: 'mehr — am meisten' },
      { from: 'gern', to: 'lieber — am liebsten' },
      { from: 'hoch', to: 'höher — am höchsten' },
    ],
  },
  {
    label: 'Two superlatives, two jobs',
    body: 'After a verb, use «am …-sten». In front of a noun, the superlative is an adjective and takes an article and an ending.',
    pairs: [
      { from: 'Dieser Berg ist am höchsten.', to: 'after the verb' },
      { from: 'Das ist der höchste Berg.', to: 'before the noun' },
    ],
  },
];

LESSONS['A2::Adjektivdeklination: indefiniter Artikel'] = [
  {
    body: 'When an adjective sits between an article and a noun it takes an ending, and the whole system rests on one idea: **the gender has to be visible once.** If the article shows it, the adjective relaxes. If the article does not, the adjective does the work.',
  },
  {
    label: 'Where ein hides the gender, the adjective shows it',
    body: 'ein is the same word for masculine and neuter, so it tells you nothing. In exactly those three slots the adjective takes the strong ending instead.',
    pairs: [
      { from: 'Nom. m.', to: 'ein neuer Laden — strong -er' },
      { from: 'Nom./Akk. n.', to: 'ein schönes Licht — strong -es' },
      { from: 'everything else', to: 'the weak ending -en, or -e' },
    ],
  },
  {
    label: 'The full picture',
    pairs: [
      { from: 'Nom. m.', to: 'ein neuer Laden' },
      { from: 'Akk. m.', to: 'einen neuen Laden' },
      { from: 'Nom./Akk. f.', to: 'eine schöne Wohnung' },
      { from: 'Nom./Akk. n.', to: 'ein schönes Licht' },
      { from: 'Dativ', to: 'in einem neuen Laden · in einer schönen Wohnung' },
      { from: 'Plural (kein/mein)', to: 'keine neuen Läden' },
    ],
  },
  {
    label: 'The shortcut',
    body: 'Three endings differ from -en: the masculine nominative -er, the neuter -es, and the feminine -e. Learn those three and default everything else to -en.',
  },
];

LESSONS['A2::Adjektivdeklination: ohne Artikel'] = [
  {
    body: 'With no article at all, nothing is left to mark the gender — so the adjective takes the ending the article would have had. Same principle as the ein-words, taken to its conclusion.',
  },
  {
    label: 'The adjective becomes the article',
    pairs: [
      { from: 'der → Nom. m.', to: 'schöner Blick' },
      { from: 'das → Nom./Akk. n.', to: 'leckeres Frühstück' },
      { from: 'die → Nom./Akk. f.', to: 'schöne Lage' },
      { from: 'die → plural', to: 'regionale Produkte' },
      { from: 'dem → Dativ', to: 'mit günstigen Zimmern' },
    ],
  },
  {
    label: 'Where you actually meet it',
    body: 'Uncountables, plurals without a determiner, and — above all — advertising and menus, which drop articles to save space. Recognising the pattern matters more than producing it at A2.',
    examples: [
      { de: 'Wir trinken kalten Kaffee.', en: 'We are drinking cold coffee.' },
      { de: 'Zimmer mit schöner Aussicht', en: 'Room with a lovely view — a listing, not a sentence.' },
    ],
  },
];

LESSONS['A2::Nebensätze: wenn & als'] = [
  {
    body: 'English has one word — "when" — and German splits it by how often and by when. Choosing wrongly is not ambiguous, it is simply wrong, so this is worth getting straight early.',
  },
  {
    label: 'als — one completed thing in the past',
    examples: [
      { de: 'Als ich 18 war, bin ich nach Berlin gezogen.', en: 'When I was 18, I moved to Berlin.' },
      { de: 'Als wir ankamen, hat es geregnet.', en: 'When we arrived, it was raining.' },
    ],
  },
  {
    label: 'wenn — repeated, or present and future',
    examples: [
      { de: 'Immer wenn ich müde bin, trinke ich Kaffee.', en: 'Whenever I am tired, I drink coffee.' },
      { de: 'Wenn es regnet, bleiben wir hier.', en: 'If / when it rains, we will stay here.' },
    ],
  },
  {
    label: 'The test',
    body: 'Past **and** once → als. Anything else → wenn.',
  },
  {
    label: 'Both send the verb to the end',
    body: 'A subordinate clause puts its conjugated verb last. If the subordinate clause comes first, the whole clause fills slot one — so the main verb follows immediately, and two verbs end up side by side.',
    examples: [{ de: 'Wenn es regnet, bleiben wir hier.', en: 'Note «regnet, bleiben» — comma, then the two verbs meet.' }],
  },
];

LESSONS['A2::Passiv Präsens'] = [
  {
    body: 'The passive moves the action to the front and the doer out of the way. German uses it far more than English in signs, instructions and anything institutional — which is where you will meet it first.',
  },
  {
    label: 'werden + Partizip II',
    pairs: [
      { from: 'active', to: 'Man spricht hier Deutsch.' },
      { from: 'passive', to: 'Hier wird Deutsch gesprochen.' },
      { from: 'active', to: 'Der Techniker repariert das Gerät.' },
      { from: 'passive', to: 'Das Gerät wird repariert.' },
    ],
  },
  {
    label: 'werden conjugates, the participle sits at the end',
    body: 'Same bracket as the modals and the Perfekt: the finite verb takes position two, the non-finite part goes last. Third structure, same frame.',
    examples: [{ de: 'Die Formulare werden am Eingang ausgeteilt.', en: 'The forms are handed out at the entrance.' }],
  },
  {
    label: 'Naming the doer, when you must',
    body: 'von for a person or agent, durch for a means. Most passive sentences name nobody, which is usually the reason for choosing the passive at all.',
    examples: [{ de: 'Das Haus wurde von einem Architekten geplant.', en: 'The house was designed by an architect.' }],
  },
  {
    label: 'werden also means "to become"',
    body: 'On its own werden is a full verb with its own meaning, and it is the participle at the end that tells you which one you are looking at.',
    pairs: [
      { from: 'Er wird Arzt.', to: 'He is becoming a doctor.' },
      { from: 'Er wird operiert.', to: 'He is being operated on.' },
    ],
  },
];

LESSONS['A2::Temporalsätze: seit(dem) & bis'] = [
  {
    body: 'Two subordinating conjunctions that mark the ends of a stretch of time — where it began, and where it stops.',
  },
  {
    label: 'seit(dem) — the starting point of something still going',
    examples: [
      { de: 'Seitdem ich in Köln wohne, fahre ich Rad.', en: 'Since I have been living in Cologne, I cycle.' },
    ],
  },
  {
    label: 'bis — the end point',
    examples: [
      { de: 'Ich warte, bis du kommst.', en: 'I will wait until you come.' },
    ],
  },
  {
    label: 'German keeps the present tense here',
    body: 'This is the tense mismatch English speakers carry over. A situation that started in the past and is still true takes the **present** in German, where English needs a perfect.',
    pairs: [
      { from: 'Ich wohne seit drei Jahren hier.', to: 'I have been living here for three years.' },
      { from: 'Ich lerne seit Januar Deutsch.', to: 'I have been learning German since January.' },
    ],
  },
  {
    label: 'seit the preposition, seitdem the conjunction',
    body: 'seit + a noun phrase in the dative; seitdem + a whole clause with its verb at the end. Both translate as "since", and mixing them is the usual slip.',
    pairs: [
      { from: 'seit + noun', to: 'seit drei Jahren' },
      { from: 'seitdem + clause', to: 'seitdem ich hier wohne' },
    ],
  },
];

LESSONS['A2::Frageartikel & Demonstrativartikel'] = [
  {
    body: 'Two der-words that work as a pair in conversation: one asks which of several, the other answers by pointing.',
  },
  {
    label: 'The endings are the article’s',
    pairs: [
      { from: 'masculine', to: 'welcher / dieser' },
      { from: 'feminine', to: 'welche / diese' },
      { from: 'neuter', to: 'welches / dieses' },
      { from: 'accusative m.', to: 'welchen / diesen' },
    ],
  },
  {
    label: 'Asking and answering',
    examples: [
      { de: 'Welches Hemd nimmst du? — Dieses hier.', en: 'Which shirt are you taking? — This one.' },
      { de: 'In welcher Straße wohnst du?', en: 'Which street do you live on?' },
    ],
  },
  {
    label: 'German has no separate word for "one"',
    body: 'English props the demonstrative up with "one" — this one, which ones. German lets the ending carry it, and adding a word for "one" is a recognisable English intrusion.',
    examples: [{ de: 'Welche möchten Sie? — Diese.', en: 'Which ones would you like? — These.' }],
  },
];

LESSONS['A2::Indirekte Fragesätze'] = [
  {
    body: 'A question folded inside another sentence. It is the standard way to be polite in German — «Wo ist der Bahnhof?» is fine, but «Können Sie mir sagen, wo der Bahnhof ist?» is what you actually say to a stranger.',
  },
  {
    label: 'W-questions keep their W-word',
    pairs: [
      { from: 'Wann fährt der Zug?', to: 'Wissen Sie, wann der Zug fährt?' },
      { from: 'Wo ist die Post?', to: 'Können Sie mir sagen, wo die Post ist?' },
    ],
  },
  {
    label: 'Yes/no questions need ob',
    body: 'There is no W-word to reuse, so ob does the job. English uses "if" or "whether"; German uses ob for this, and «wenn» is the conditional — a different word for a different job.',
    pairs: [
      { from: 'Kommt er?', to: 'Ich weiß nicht, ob er kommt.' },
    ],
  },
  {
    label: 'The verb goes to the end',
    body: 'The embedded question is a subordinate clause, so it loses the question word order entirely — no inversion, verb last. Keeping the inversion is the commonest mistake.',
    examples: [
      { de: 'Wissen Sie, wann der Zug fährt?', en: 'Do you know when the train leaves? — not «wann fährt der Zug».' },
    ],
  },
];

LESSONS['A2::Konjunktiv II: Wünsche & Vorschläge'] = [
  {
    body: 'The polite register. At A2 you need four forms and two jobs — wishing for something, and suggesting something without pushing.',
  },
  {
    label: 'The four you need',
    pairs: [
      { from: 'sein', to: 'wäre' }, { from: 'haben', to: 'hätte' },
      { from: 'können', to: 'könnte' }, { from: 'anything else', to: 'würde + infinitive' },
    ],
  },
  {
    label: 'Wishes — hätte / wäre, usually with gern',
    examples: [
      { de: 'Ich hätte gern ein bisschen Ruhe.', en: 'I would like a bit of quiet.' },
      { de: 'Das wäre schön.', en: 'That would be nice.' },
    ],
  },
  {
    label: 'Suggestions — könnte, würde',
    examples: [
      { de: 'Wir könnten ins Kino gehen.', en: 'We could go to the cinema.' },
      { de: 'Würden Sie mir bitte helfen?', en: 'Would you help me, please?' },
    ],
  },
  {
    label: 'It is politeness, not tense',
    body: 'The forms look like a past tense and are not one. «Ich hätte gern» is a request happening now — the distance is social, not temporal, exactly as English "I would like" is not about the past.',
  },
  {
    label: 'Say hätte, not würde haben',
    body: 'sein, haben and the modals have their own one-word Konjunktiv II and use it. Building «würde haben» is understood and marks you out immediately.',
    limit: 'For nearly every other verb, würde + infinitive is the normal spoken form and the synthetic one (führe, gäbe, käme) sounds literary. So the rule is the reverse of what it looks like: the short form for these six, würde for the rest.',
  },
];

LESSONS['A2::Verbindungsadverbien: trotzdem & deshalb'] = [
  {
    body: 'These join two **main** clauses, and that is the whole difficulty: they look like conjunctions and behave like adverbs, so the verb does not go to the end.',
  },
  {
    label: 'What each one means',
    pairs: [
      { from: 'deshalb / deswegen / darum', to: 'that is why — consequence' },
      { from: 'trotzdem', to: 'even so — concession' },
    ],
  },
  {
    label: 'In slot one, they push the subject behind the verb',
    examples: [
      { de: 'Tommy mag Tiger. Deshalb möchte er in den Zoo gehen.', en: 'Tommy likes tigers. That is why he wants to go to the zoo.' },
      { de: 'Es hat geregnet. Trotzdem sind wir spazieren gegangen.', en: 'It rained. We went for a walk even so.' },
    ],
  },
  {
    label: 'Compare with weil and obwohl',
    body: 'Same meanings, different machinery. weil and obwohl are subordinating conjunctions and send the verb to the end; deshalb and trotzdem are adverbs and keep it in position two. Knowing which word you have chosen tells you where the verb goes.',
    pairs: [
      { from: 'Er geht in den Zoo, weil er Tiger mag.', to: 'verb last' },
      { from: 'Er mag Tiger. Deshalb geht er in den Zoo.', to: 'verb second' },
    ],
  },
];

LESSONS['A2::Lokale Präpositionen: Wegbeschreibung'] = [
  {
    body: 'The vocabulary for giving and following directions. Each preposition carries a fixed case, and the case does not shift with meaning here — so these can be learned as set phrases.',
  },
  {
    label: 'Accusative',
    pairs: [
      { from: 'durch', to: 'durch den Park — through' },
      { from: 'über', to: 'über die Straße — across' },
      { from: '… entlang', to: 'die Straße entlang — along, and it follows its noun' },
    ],
  },
  {
    label: 'Dative',
    pairs: [
      { from: 'an … vorbei', to: 'am See vorbei — past' },
      { from: 'gegenüber', to: 'gegenüber der Post — opposite' },
      { from: 'bis zu', to: 'bis zur Ampel — as far as' },
    ],
  },
  {
    label: 'Where you came from',
    body: 'aus for coming out of an enclosed space, von for coming from a point or a person.',
    pairs: [
      { from: 'aus dem Hotel', to: 'out of the hotel' },
      { from: 'vom Arzt', to: 'from the doctor’s' },
    ],
  },
  {
    label: 'entlang and vorbei come after',
    body: 'Two of these are postpositions — they sit behind the noun rather than in front of it, which is why a sentence built the English way round sounds wrong even with the right case.',
    examples: [{ de: 'Gehen Sie die Straße entlang und am Kino vorbei.', en: 'Go along the street and past the cinema.' }],
  },
];

LESSONS['A2::Verb: lassen'] = [
  {
    body: 'One verb, three everyday meanings, and the useful one at A2 is the one English needs a whole construction for: having something done by somebody else.',
  },
  {
    label: 'The forms — note the umlaut',
    pairs: [
      { from: 'ich', to: 'lasse' }, { from: 'du', to: 'lässt' }, { from: 'er/sie/es', to: 'lässt' },
      { from: 'wir', to: 'lassen' }, { from: 'ihr', to: 'lasst' }, { from: 'sie/Sie', to: 'lassen' },
    ],
  },
  {
    label: 'lassen + infinitive — have it done',
    examples: [
      { de: 'Sie lässt ihr Konto prüfen.', en: 'She is having her account checked — by someone else.' },
      { de: 'Sie sollten die Reifen wechseln lassen.', en: 'You should have the tyres changed.' },
    ],
  },
  {
    label: 'lassen + infinitive — let someone do it',
    body: 'Same construction, and context decides which reading. German does not distinguish them the way English does with "have" and "let".',
    examples: [{ de: 'Lass mich das machen.', en: 'Let me do that.' }],
  },
  {
    label: 'lassen on its own — leave behind',
    examples: [{ de: 'Ich habe meinen Schlüssel zu Hause gelassen.', en: 'I left my key at home.' }],
  },
];

LESSONS['A2::Wortbildung: Adjektive'] = [
  {
    body: 'German builds new adjectives out of old ones rather than borrowing, which means a suffix you recognise turns an unknown word into a guessable one. This is the cheapest vocabulary you will ever gain.',
  },
  {
    label: 'The productive suffixes',
    pairs: [
      { from: '-los', to: 'without — arbeitslos, hoffnungslos' },
      { from: '-bar', to: 'able to be — benutzbar, essbar' },
      { from: '-ig', to: 'having the quality of — eisig, sonnig' },
      { from: '-isch', to: 'of that kind — stürmisch, kindisch' },
    ],
  },
  {
    label: 'un- reverses',
    pairs: [
      { from: 'interessant', to: 'uninteressant' },
      { from: 'angenehm', to: 'unangenehm' },
      { from: 'freundlich', to: 'unfreundlich' },
    ],
    limit: 'un- is not the reverser for every adjective. The opposite of «schön» is «hässlich», not «unschön» — and where both exist they differ: «unschön» means unfortunate or unpleasant, not ugly. Recognise un-; do not manufacture it.',
  },
  {
    label: '-isch can be neutral or rude',
    body: 'On a nationality it is plain — spanisch, dänisch. On a person it usually carries judgement: kindisch is childish, not childlike, and kindlich is the neutral word.',
  },
];

LESSONS['A2::Wortbildung: Nomen & Diminutiv'] = [
  {
    body: 'Three patterns that produce a large share of German nouns — and each one hands you the gender for free, which is the real prize.',
  },
  {
    label: '-ung: a verb becomes a thing, and it is die',
    pairs: [
      { from: 'senden', to: 'die Sendung' },
      { from: 'wohnen', to: 'die Wohnung' },
      { from: 'meinen', to: 'die Meinung' },
    ],
  },
  {
    label: '-er / -in: the person doing it',
    pairs: [
      { from: 'arbeiten', to: 'der Arbeiter / die Arbeiterin' },
      { from: 'lehren', to: 'der Lehrer / die Lehrerin' },
    ],
  },
  {
    label: 'Compounds take the gender of the last noun',
    body: 'German stacks nouns into one word, and the final element decides the article — so an arbitrarily long compound is as easy as its last piece.',
    pairs: [
      { from: 'die Arbeit + der Kollege', to: 'der Arbeitskollege' },
      { from: 'der Bahnhof + die Straße', to: 'die Bahnhofstraße' },
    ],
  },
  {
    label: '-chen makes it small, and neuter',
    body: 'The diminutive umlauts the stem where it can and turns the noun neuter whatever it was before. This is why «das Mädchen» is neuter — it is a diminutive, not a statement about girls.',
    pairs: [
      { from: 'der Bär', to: 'das Bärchen' },
      { from: 'die Katze', to: 'das Kätzchen' },
      { from: 'das Brot', to: 'das Brötchen' },
    ],
  },
];

LESSONS['A2::Präpositionen: von … an, über, ohne'] = [
  {
    body: 'Three prepositions doing jobs that are not their usual ones — which is why they are grouped here rather than filed under place.',
  },
  {
    label: 'von … an + Dativ — from a point onward',
    examples: [
      { de: 'Von Oktober an wohne ich in Wien.', en: 'From October on I will be living in Vienna.' },
      { de: 'Von morgen an mache ich Sport.', en: 'From tomorrow on I am doing sport.' },
    ],
  },
  {
    label: 'über + Akkusativ — for a duration',
    body: 'The spatial über means above. With a length of time it means more than, or right through.',
    examples: [{ de: 'über eine Stunde Aufenthalt', en: 'over an hour’s stopover' }],
  },
  {
    label: 'ohne + Akkusativ — and no article',
    body: 'ohne usually drops the indefinite article, where English keeps it.',
    examples: [
      { de: 'ohne lauten Verkehr', en: 'without loud traffic' },
      { de: 'Ich trinke Kaffee ohne Zucker.', en: 'I drink coffee without sugar — not «ohne einen Zucker».' },
    ],
  },
];

// ---- B1 -------------------------------------------------------------------

LESSONS['B1::Dativ'] = [
  {
    body: 'The third case, and the one that turns up in the most places. It marks the indirect object, it is demanded outright by a set of verbs and prepositions, and it answers *wo?* after the two-way prepositions.',
  },
  {
    label: 'The articles',
    pairs: [
      { from: 'der → dem', to: 'dem Mann' },
      { from: 'die → der', to: 'der Frau' },
      { from: 'das → dem', to: 'dem Kind' },
      { from: 'die (pl.) → den', to: 'den Kindern — plus -n on the noun' },
    ],
  },
  {
    label: 'Four jobs',
    pairs: [
      { from: 'indirect object', to: 'Ich gebe dem Mann das Buch.' },
      { from: 'dative verbs', to: 'Ich helfe dem Kind.' },
      { from: 'dative prepositions', to: 'Wir fahren mit dem Bus.' },
      { from: 'wo? after a two-way preposition', to: 'Das Buch liegt auf dem Tisch.' },
    ],
  },
  {
    label: 'The prepositions that always take it',
    body: 'aus, bei, mit, nach, seit, von, zu — plus gegenüber and ab. Worth learning as a chant: the case is settled the moment you choose the word, whatever the verb is doing.',
  },
  {
    label: 'The plural -n',
    body: 'Dative plural adds -n to the noun unless it already ends in -n or -s. It is the one ending that marks the noun rather than the article, and the one most often dropped.',
    pairs: [
      { from: 'die Kinder', to: 'mit den Kindern' },
      { from: 'die Freunde', to: 'mit den Freunden' },
      { from: 'die Autos', to: 'mit den Autos — already -s' },
    ],
  },
];

LESSONS['B1::Nebensätze (weil/dass)'] = [
  {
    body: 'A subordinating conjunction sends the conjugated verb to the very end of its clause. This is the structural fact that most separates German from English, and it is worth over-practising until it stops requiring thought.',
  },
  {
    label: 'The common ones',
    pairs: [
      { from: 'weil', to: 'because' }, { from: 'dass', to: 'that' },
      { from: 'wenn / als', to: 'when, if' }, { from: 'obwohl', to: 'although' },
      { from: 'damit', to: 'so that' }, { from: 'ob', to: 'whether' },
    ],
  },
  {
    label: 'The verb goes last',
    examples: [
      { de: 'Ich bleibe zu Hause, weil ich krank bin.', en: 'I am staying home because I am ill.' },
      { de: 'Ich glaube, dass er morgen kommt.', en: 'I think he is coming tomorrow.' },
    ],
  },
  {
    label: 'Put the clause first and the two verbs meet',
    body: 'A leading subordinate clause fills slot one of the main clause, so the main verb follows the comma immediately. The result is two verbs side by side, which looks wrong to an English eye and is the shape you want.',
    examples: [{ de: 'Weil ich krank bin, bleibe ich zu Hause.', en: 'Note «bin, bleibe» across the comma.' }],
  },
  {
    label: 'What goes to the end when there are two verbs',
    body: 'The **conjugated** one. A participle or infinitive that was already at the end stays put and the finite verb tucks in behind it.',
    pairs: [
      { from: 'Ich habe ihn gesehen.', to: '…, weil ich ihn gesehen habe.' },
      { from: 'Ich muss arbeiten.', to: '…, weil ich arbeiten muss.' },
    ],
  },
  {
    label: 'What you will hear instead',
    body: 'Spoken German very often keeps main-clause order after weil — «weil ich bin krank». It is everywhere in casual speech and it is not accepted in writing or exams.',
    limit: 'Treat it as something to understand, not to produce. In the Prüfung it is marked wrong; among friends nobody will notice either way.',
  },
];

LESSONS['B1::Konjunktiv II (würde)'] = [
  {
    body: 'The mood for things that are not the case — wishes, polite requests, advice, hypotheses. German splits it between one short form for a handful of verbs and a helper for the rest.',
  },
  {
    label: 'The short forms — use these',
    pairs: [
      { from: 'sein', to: 'wäre' }, { from: 'haben', to: 'hätte' },
      { from: 'können', to: 'könnte' }, { from: 'müssen', to: 'müsste' },
      { from: 'dürfen', to: 'dürfte' }, { from: 'sollen', to: 'sollte' },
    ],
  },
  {
    label: 'Everything else: würde + infinitive',
    examples: [
      { de: 'Ich würde gern kommen.', en: 'I would like to come.' },
      { de: 'Was würdest du machen?', en: 'What would you do?' },
    ],
  },
  {
    label: 'Giving advice',
    body: '«An deiner Stelle …» — in your place — is the standard opener, and it is followed by Konjunktiv II because the situation is hypothetical.',
    examples: [{ de: 'An deiner Stelle wäre ich vorsichtig.', en: 'If I were you I would be careful.' }],
  },
  {
    label: 'The synthetic forms exist and you should not use them',
    body: 'Strong verbs have one-word Konjunktiv II forms — käme, ginge, gäbe, führe. They are correct, they appear in literature and set phrases, and using them in conversation sounds like a costume.',
    limit: 'Two exceptions worth having: «käme» and «ginge» are still current in careful speech, and «wüsste» from wissen is the normal form — «würde wissen» sounds wrong. So the rule is *würde for most*, not *würde for all*.',
  },
];

LESSONS['B1::Genitiv'] = [
  {
    body: 'The possessive case. It is the one case that is genuinely retreating from spoken German, so the useful skill at B1 is reading it confidently and producing it in writing.',
  },
  {
    label: 'The forms',
    pairs: [
      { from: 'der / das → des', to: 'des Mannes, des Kindes — plus -s or -es on the noun' },
      { from: 'die → der', to: 'der Frau' },
      { from: 'plural → der', to: 'der Kinder' },
    ],
  },
  {
    label: 'When the noun takes -es rather than -s',
    body: 'One-syllable nouns and anything ending in -s, -ß, -z, -tz take -es because -s alone would be unsayable. Longer nouns take a bare -s.',
    pairs: [
      { from: 'das Kind', to: 'des Kindes' },
      { from: 'der Platz', to: 'des Platzes' },
      { from: 'der Lehrer', to: 'des Lehrers' },
    ],
  },
  {
    label: 'In use',
    examples: [
      { de: 'die Würde des Menschen', en: 'the dignity of man — the opening of the Grundgesetz.' },
      { de: 'das Auto meiner Schwester', en: 'my sister’s car' },
    ],
  },
  {
    label: 'Speech prefers von + Dativ',
    body: 'Conversational German largely replaces the genitive: «das Auto von meiner Schwester». This is normal, not sloppy, and you will hear it constantly.',
    limit: 'Writing, formal registers, fixed phrases and the genitive prepositions keep the real thing — and the B1 written exam expects it. Read the genitive; write the genitive; do not be surprised when nobody says it.',
  },
];

LESSONS['B1::Genitiv-Präpositionen (wegen, während, trotz, außerhalb, innerhalb)'] = [
  {
    body: 'A small group of prepositions that govern the genitive. They are the place the case is most alive, which is why they are worth a page of their own.',
  },
  {
    label: 'The set',
    pairs: [
      { from: 'wegen', to: 'because of — wegen des Wetters' },
      { from: 'während', to: 'during — während der Woche' },
      { from: 'trotz', to: 'despite — trotz des Regens' },
      { from: 'außerhalb / innerhalb', to: 'outside / within — innerhalb einer Woche' },
      { from: '(an)statt', to: 'instead of — statt des Autos' },
    ],
  },
  {
    label: 'The endings are the genitive’s',
    pairs: [
      { from: 'der / das', to: 'des Wetters, des Regens' },
      { from: 'die', to: 'der Woche' },
      { from: 'plural', to: 'der Ferien' },
    ],
  },
  {
    label: 'You will hear the dative instead',
    body: '«wegen dem Wetter» is extremely common in speech and is the form most Germans use without thinking.',
    limit: 'It is still non-standard: Duden marks it colloquial, and it is wrong in the written exam. Two more things to know — «wegen» may follow its noun in a fixed phrase («des Wetters wegen»), and «trotz» historically took the dative, which is why «trotz allem» is correct and not a mistake.',
  },
];

LESSONS['B1::Passiv: Perfekt & Modalverben'] = [
  {
    body: 'The passive beyond the present tense. Two constructions, and each has one detail that is easy to get almost right.',
  },
  {
    label: 'Perfekt passive — sein + Partizip + worden',
    body: 'The participle of werden here is **worden**, not geworden. The ge- drops whenever werden is the passive helper rather than a verb in its own right.',
    examples: [
      { de: 'Das Haus ist 1900 gebaut worden.', en: 'The house was built in 1900.' },
      { de: 'Der Brief ist gestern geschickt worden.', en: 'The letter was sent yesterday.' },
    ],
  },
  {
    label: 'geworden versus worden',
    pairs: [
      { from: 'Er ist Arzt geworden.', to: 'werden as a full verb — he became a doctor' },
      { from: 'Er ist operiert worden.', to: 'werden as the passive helper — he was operated on' },
    ],
  },
  {
    label: 'With a modal — modal + Partizip + werden',
    examples: [
      { de: 'Der Wagen muss repariert werden.', en: 'The car has to be repaired.' },
      { de: 'Der Wagen musste repariert werden.', en: 'The car had to be repaired.' },
    ],
  },
  {
    label: 'Why German reaches for it so often',
    body: 'Signs, instructions, regulations and anything institutional. The passive removes the doer, and in official German the doer is usually nobody in particular — which is exactly the effect wanted.',
  },
];

LESSONS['B1::Infinitivsätze (zu + Infinitiv)'] = [
  {
    body: 'A clause with no subject of its own, hanging off a verb or an expression in the main clause. English does the same thing with "to": *I am trying **to** come*.',
  },
  {
    label: 'What triggers it',
    pairs: [
      { from: 'verbs', to: 'versuchen, vorhaben, vergessen, anfangen, hoffen, beginnen' },
      { from: 'expressions', to: 'es ist wichtig, es macht Spaß, Lust haben, Zeit haben' },
    ],
  },
  {
    label: 'zu goes at the end, with the infinitive',
    examples: [
      { de: 'Ich habe vor, nächstes Jahr nach Wien zu ziehen.', en: 'I plan to move to Vienna next year.' },
      { de: 'Es ist wichtig, jeden Tag zu üben.', en: 'It is important to practise every day.' },
    ],
  },
  {
    label: 'Separable verbs swallow the zu',
    body: 'The zu goes **inside**, between the prefix and the stem, and the whole thing is one word.',
    pairs: [
      { from: 'aufstehen', to: 'früh aufzustehen' },
      { from: 'einkaufen', to: 'einzukaufen' },
      { from: 'anrufen', to: 'dich anzurufen' },
    ],
  },
  {
    label: 'No zu after a modal',
    body: 'Modals take a bare infinitive, and so do sehen, hören, lassen and gehen in this construction.',
    pairs: [
      { from: 'Ich muss arbeiten.', to: 'no zu' },
      { from: 'Ich versuche zu arbeiten.', to: 'zu' },
    ],
  },
  {
    label: 'The comma is not always required any more',
    body: 'Since the 1996 spelling reform a plain zu-infinitive may stand without a comma.',
    limit: 'It is still required in three cases: after um / ohne / statt / anstatt / außer / als, when the main clause announces the infinitive with a word like «es» or «darauf», and when the clause is added as an afterthought. Setting the comma is never wrong, so if in doubt, set it.',
  },
];

LESSONS['B1::Irreale Konditionalsätze'] = [
  {
    body: 'Conditions that are not true, and may not become true. Both halves go into Konjunktiv II, which is what tells the listener you are speculating rather than planning.',
  },
  {
    label: 'Real versus unreal',
    pairs: [
      { from: 'real — indicative', to: 'Wenn ich Zeit habe, komme ich mit.' },
      { from: 'unreal — Konjunktiv II', to: 'Wenn ich Zeit hätte, würde ich mitkommen.' },
    ],
  },
  {
    label: 'Both clauses take the mood',
    body: 'This is where English and German agree in principle and diverge in habit: English speakers often leave the main clause in the indicative. German wants Konjunktiv II on both sides.',
    examples: [
      { de: 'Wenn ich reich wäre, würde ich weniger arbeiten.', en: 'If I were rich I would work less.' },
    ],
  },
  {
    label: 'Drop the wenn and the verb leads',
    body: 'A more formal, slightly literary alternative. The conditional clause simply starts with its conjugated verb — the same trick English does with "Had I known…".',
    pairs: [
      { from: 'Wenn ich Zeit hätte, käme ich mit.', to: 'Hätte ich Zeit, käme ich mit.' },
    ],
  },
  {
    label: 'Past unreal — one form for everything',
    body: 'For a condition that already failed, use hätte or wäre plus the participle. There is no separate past subjunctive to learn.',
    examples: [
      { de: 'Wenn ich das gewusst hätte, wäre ich nicht gekommen.', en: 'If I had known that, I would not have come.' },
    ],
  },
];

LESSONS['B1::Finalsätze: damit & um … zu'] = [
  {
    body: 'Two ways to say what something is *for*. The choice is decided by whether the purpose belongs to the same person.',
  },
  {
    label: 'Same subject — um … zu',
    examples: [
      { de: 'Ich lerne Deutsch, um in Köln zu studieren.', en: 'I am learning German in order to study in Cologne — I learn, I study.' },
    ],
  },
  {
    label: 'Different subjects — damit',
    examples: [
      { de: 'Ich spreche langsam, damit du mich verstehst.', en: 'I speak slowly so that you understand me — I speak, you understand.' },
    ],
  },
  {
    label: 'The rule runs one way only',
    body: 'um … zu has no subject of its own, so it *requires* the subjects to match. damit carries a full clause with its own subject and verb at the end.',
    limit: 'The reverse is not true, and this is the half that gets taught as a law. damit is perfectly correct with the same subject — «Ich lerne Deutsch, damit ich in Köln studieren kann» is good German, just wordier. So: different subjects **must** take damit; matching subjects **may** take either, and um … zu is the lighter choice.',
  },
  {
    label: 'Two relatives worth having',
    pairs: [
      { from: 'ohne … zu', to: 'Er ging, ohne etwas zu sagen. — without saying anything' },
      { from: '(an)statt … zu', to: 'Statt zu arbeiten, schlief er. — instead of working' },
    ],
  },
];

LESSONS['B1::Konsekutivsätze: sodass'] = [
  {
    body: 'Result clauses — what followed from what. Two shapes, and the difference between them is whether you are emphasising the cause.',
  },
  {
    label: 'sodass — plain result',
    examples: [
      { de: 'Es regnete stark, sodass wir zu Hause blieben.', en: 'It rained hard, so we stayed home.' },
    ],
  },
  {
    label: 'so + adjective … dass — the cause is intensified',
    body: 'Splitting the pair puts the weight on *how much*, which is what makes the result inevitable.',
    examples: [
      { de: 'Der Vortrag war so langweilig, dass ich einschlief.', en: 'The talk was so boring that I fell asleep.' },
      { de: 'Ich war so müde, dass ich sofort ins Bett ging.', en: 'I was so tired that I went straight to bed.' },
    ],
  },
  {
    label: 'Both send the verb to the end',
    body: 'sodass and dass are subordinating conjunctions, so their clause ends with the conjugated verb.',
  },
  {
    label: 'Do not confuse it with also',
    body: 'German «also» means therefore, not "also". It is an adverb, so the verb stays in position two — «Es regnete. Also blieben wir zu Hause.»',
  },
];

LESSONS['B1::Lassen & Modalverben im Perfekt'] = [
  {
    body: 'What happens when a verb that governs an infinitive goes into the perfect. German produces a shape English has no equivalent for: two infinitives at the end, where you expected a participle.',
  },
  {
    label: 'The double infinitive',
    pairs: [
      { from: 'Ich lasse das Rad reparieren.', to: 'Ich habe das Rad reparieren lassen.' },
      { from: 'Ich kann kommen.', to: 'Ich habe kommen können.' },
      { from: 'Ich muss arbeiten.', to: 'Ich habe arbeiten müssen.' },
    ],
  },
  {
    label: 'Not gelassen, not gekonnt',
    body: 'The participle you would expect — gelassen, gekonnt, gemusst — is replaced by the plain infinitive whenever a second verb is present. The participle comes back when the modal stands alone.',
    limit: 'The neighbouring verbs are looser. sehen and hören take either — «Ich habe ihn kommen sehen» and «… kommen gesehen» are both current, with the double infinitive preferred. Only the modals and lassen are strict about it.',
    pairs: [
      { from: 'Ich habe es nicht gekonnt.', to: 'modal alone — participle' },
      { from: 'Ich habe es nicht machen können.', to: 'with a second verb — infinitive' },
    ],
  },
  {
    label: 'lassen + Infinitiv — have it done',
    examples: [
      { de: 'Ich lasse mir die Haare schneiden.', en: 'I am getting my hair cut.' },
      { de: 'Wir haben das Auto waschen lassen.', en: 'We had the car washed.' },
    ],
  },
  {
    label: 'In a subordinate clause the helper jumps in front',
    body: 'A double infinitive will not let the conjugated verb sit behind it, so haben moves ahead of both. This is the one place a German subordinate clause does not end with its finite verb.',
    examples: [{ de: '…, weil ich das Rad habe reparieren lassen.', en: 'Note «habe» before the two infinitives.' }],
  },
];

LESSONS['B1::Plusquamperfekt & nachdem/bevor'] = [
  {
    body: 'The tense for the earlier of two past events. It exists to keep an order straight, and at B1 it is mostly met in a fixed pairing with nachdem.',
  },
  {
    label: 'Building it',
    body: 'The Präteritum of haben or sein, plus the participle. Whichever helper the Perfekt takes, the Plusquamperfekt takes too.',
    pairs: [
      { from: 'Ich habe gegessen.', to: 'Ich hatte gegessen.' },
      { from: 'Ich bin gegangen.', to: 'Ich war gegangen.' },
    ],
  },
  {
    label: 'nachdem — the earlier clause steps back a tense',
    examples: [
      { de: 'Nachdem ich gegessen hatte, ging ich los.', en: 'After I had eaten, I set off.' },
    ],
  },
  {
    label: 'The tense pairing',
    pairs: [
      { from: 'nachdem + Plusquamperfekt', to: 'main clause in Präteritum or Perfekt' },
      { from: 'nachdem + Perfekt', to: 'main clause in Präsens' },
    ],
  },
  {
    label: 'bevor and während do not shift',
    body: 'bevor introduces the *later* event and während a simultaneous one, so neither needs the step back. Both clauses simply stay in the same tense.',
    examples: [
      { de: 'Bevor ich gehe, rufe ich dich an.', en: 'Before I go I will call you.' },
      { de: 'Während ich kochte, hat er gelesen.', en: 'While I was cooking he read.' },
    ],
  },
];

LESSONS['B1::Futur I'] = [
  {
    body: 'German has a future tense and mostly does not use it. Knowing when it *is* used is more useful than knowing how to build it.',
  },
  {
    label: 'werden + infinitive',
    examples: [
      { de: 'Ich werde nächstes Jahr die B1-Prüfung machen.', en: 'I am going to take the B1 exam next year.' },
    ],
  },
  {
    label: 'The present usually does the job',
    body: 'With a time word, the present is the ordinary way to talk about the future, and Futur I would sound heavy.',
    pairs: [
      { from: 'Morgen fahre ich nach Berlin.', to: 'normal' },
      { from: 'Morgen werde ich nach Berlin fahren.', to: 'correct, but emphatic' },
    ],
  },
  {
    label: 'What Futur I adds',
    pairs: [
      { from: 'prediction', to: 'Es wird regnen.' },
      { from: 'a promise or resolution', to: 'Ich werde dir helfen.' },
      { from: 'an assumption about now', to: 'Er wird wohl krank sein. — he is probably ill' },
    ],
  },
  {
    label: 'The last one is not about the future at all',
    body: 'werden + wohl / wahrscheinlich expresses a guess about the present. It is a common B1 exam item precisely because the form and the meaning point in different directions.',
  },
];

LESSONS['B1::welcher & was für ein'] = [
  {
    body: 'Two ways of asking "which" — and German separates a question about *choice* from a question about *kind*, where English uses "which" and "what" loosely.',
  },
  {
    label: 'welch- — one out of a known set',
    pairs: [
      { from: 'Welches Buch liest du?', to: 'which of these books' },
      { from: 'Welche Farbe magst du?', to: 'which colour' },
    ],
  },
  {
    label: 'was für ein — what type',
    pairs: [
      { from: 'Was für ein Auto ist das?', to: 'what kind of car' },
      { from: 'Was für Bücher magst du?', to: 'plural — drop the ein entirely' },
    ],
  },
  {
    label: 'The für does not govern the case',
    body: 'This is the trap. «für» normally takes the accusative, but in this phrase it is welded into the question word and the ein takes whatever case the sentence needs.',
    pairs: [
      { from: 'nominative', to: 'Was für ein Auto ist das?' },
      { from: 'accusative', to: 'Was für einen Wagen hast du?' },
      { from: 'dative', to: 'Mit was für einem Auto fährst du?' },
    ],
  },
];

LESSONS['B1::Temporale Konjunktion: als'] = [
  {
    body: 'English "when" splits three ways in German, and this page is the whole set. The als/wenn pair was introduced at A2; what B1 adds is the third member — and the fact that als does a second, unrelated job.',
  },
  {
    label: 'The three-way split',
    pairs: [
      { from: 'als', to: 'one completed event in the past — Als ich klein war, …' },
      { from: 'wenn', to: 'repeated, or present and future — Immer wenn …, Wenn es regnet, …' },
      { from: 'wann', to: 'the question word — Wann kommst du? · Ich weiß nicht, wann er kommt.' },
    ],
  },
  {
    label: 'wann is not a conjunction',
    body: 'It belongs to questions — direct or embedded. Using it for "when I was young" is the error the three-way split exists to prevent.',
    pairs: [
      { from: 'Als ich jung war, …', to: 'correct' },
      { from: 'Wann ich jung war, …', to: 'wrong — that is a question' },
    ],
  },
  {
    label: 'als also means "than", and "as"',
    body: 'The same word carries the comparative and a role or capacity. Context separates them easily; the point is not to assume an als is temporal.',
    pairs: [
      { from: 'comparative', to: 'Berlin ist größer als Köln.' },
      { from: 'in the role of', to: 'Er arbeitet als Lehrer.' },
      { from: 'temporal', to: 'Als er ankam, regnete es.' },
    ],
  },
];

LESSONS['B1::Verben & Ausdrücke mit „es“'] = [
  {
    body: 'German will not leave a sentence without a subject, so where there is nothing to be the subject it uses «es». Some of these are idioms to learn whole; others are a structural placeholder that appears and disappears.',
  },
  {
    label: 'es gibt — and it takes the accusative',
    body: 'The single most useful one, and the case is the thing to remember: whatever exists is the *object* of geben, not the subject.',
    examples: [
      { de: 'Es gibt einen Bahnhof in der Nähe.', en: 'There is a station nearby — «einen», not «ein».' },
      { de: 'Gibt es hier ein Café?', en: 'Is there a café here?' },
    ],
  },
  {
    label: 'Weather and time',
    body: 'Nothing is doing the raining, so es stands in as the subject the grammar insists on.',
    examples: [
      { de: 'Es regnet. Es schneit.', en: 'It is raining. It is snowing.' },
      { de: 'Es ist kalt. Es wird spät.', en: 'It is cold. It is getting late.' },
      { de: 'Es ist acht Uhr.', en: 'It is eight o’clock.' },
    ],
  },
  {
    label: 'Evaluations, pointing forward to an infinitive',
    examples: [
      { de: 'Es ist wichtig, jeden Tag zu üben.', en: 'It is important to practise every day.' },
      { de: 'Es macht Spaß, mit euch zu arbeiten.', en: 'It is fun working with you.' },
    ],
  },
  {
    label: 'The placeholder es disappears when something takes its slot',
    body: 'A structural es is there to fill position one. Front anything else and it is simply gone — which is why it looks inconsistent until you see what it is for.',
    pairs: [
      { from: 'Es kommen viele Gäste.', to: 'Heute kommen viele Gäste.' },
      { from: 'Es wurde viel gelacht.', to: 'Gestern wurde viel gelacht.' },
    ],
  },
  {
    label: 'Idioms worth memorising',
    pairs: [
      { from: 'es geht um', to: 'it is about — Es geht um deine Zukunft.' },
      { from: 'es lohnt sich', to: 'it is worth it' },
      { from: 'es kommt darauf an', to: 'it depends' },
    ],
  },
];

LESSONS['B1::statt / ohne … zu + Infinitiv'] = [
  {
    body: 'Two infinitive constructions that behave like um … zu — no subject of their own, so they borrow the main clause’s.',
  },
  {
    label: 'ohne … zu — without doing',
    examples: [
      { de: 'Er ging weg, ohne sich zu verabschieden.', en: 'He left without saying goodbye.' },
      { de: 'Sie hat bestanden, ohne viel zu lernen.', en: 'She passed without studying much.' },
    ],
  },
  {
    label: '(an)statt … zu — instead of doing',
    examples: [
      { de: 'Statt zu arbeiten, hat er geschlafen.', en: 'Instead of working he slept.' },
    ],
  },
  {
    label: 'Different subjects need a full clause',
    body: 'When the two halves belong to different people the infinitive construction has no way to say so, and dass steps in.',
    pairs: [
      { from: 'same subject', to: 'Er ging, ohne sich zu verabschieden.' },
      { from: 'different subjects', to: 'Er ging, ohne dass ich es merkte.' },
    ],
  },
  {
    label: 'The comma stays',
    body: 'These are among the cases the spelling reform left alone: an infinitive clause introduced by um, ohne, statt, anstatt, außer or als keeps its comma.',
  },
];

LESSONS['B1::Konjunktiv II der Vergangenheit (irreale Wünsche)'] = [
  {
    body: 'One form covers unreal statements about the past: hätte or wäre plus the participle. There is no second past subjunctive to learn, which makes this smaller than it looks.',
    limit: 'Add a modal and the shape changes — you get hätte plus two infinitives, not a participle: «Ich hätte kommen können», not «gekonnt». Same double-infinitive rule as the ordinary Perfekt.',
  },
  {
    label: 'Building it',
    pairs: [
      { from: 'Ich habe Zeit gehabt.', to: 'Ich hätte Zeit gehabt.' },
      { from: 'Ich bin gekommen.', to: 'Ich wäre gekommen.' },
    ],
  },
  {
    label: 'Conditions that already failed',
    examples: [
      { de: 'Wenn ich Zeit gehabt hätte, wäre ich gekommen.', en: 'If I had had time I would have come.' },
    ],
  },
  {
    label: 'Regrets — and the little words that carry them',
    body: 'Drop the wenn, lead with the verb, and add bloß, nur or doch. That combination is how German sounds rueful.',
    examples: [
      { de: 'Hätte ich bloß nichts gesagt!', en: 'If only I had said nothing!' },
      { de: 'Wäre ich doch früher gegangen!', en: 'If only I had left earlier!' },
    ],
  },
  {
    label: 'The helper follows the Perfekt’s rule',
    body: 'Whichever of haben or sein the verb takes in the Perfekt, it takes here — so verbs of motion and change of state go with wäre.',
  },
];

LESSONS['B1::Konjunktion: falls'] = [
  {
    body: 'A conditional conjunction: if, or in case. It is subordinating, so the verb goes to the end.',
  },
  {
    label: 'In use',
    examples: [
      { de: 'Falls es regnet, bleiben wir zu Hause.', en: 'If it rains we will stay home.' },
      { de: 'Wir sind jetzt per Du, falls dich das interessiert.', en: 'We are on first-name terms now, in case that interests you.' },
    ],
  },
  {
    label: 'falls against wenn',
    body: 'Both translate as "if". falls leans towards a possibility you are not counting on, and it is slightly more formal. wenn covers conditions **and** time; falls covers conditions alone.',
    pairs: [
      { from: 'Wenn ich Zeit habe, komme ich.', to: 'condition — either word works' },
      { from: 'Wenn ich Zeit hatte, kam ich immer.', to: 'time — only wenn' },
    ],
  },
  {
    label: 'Why it is worth having',
    body: 'Because wenn is overloaded. Choosing falls for a genuine condition removes the ambiguity between "if" and "whenever" that wenn carries.',
  },
];

LESSONS['B1::Zweiteilige Konjunktion: je … desto/umso'] = [
  {
    body: 'The more … the more. Two comparatives locked together, and the word order differs between the halves — which is the whole difficulty.',
  },
  {
    label: 'The shape',
    pairs: [
      { from: 'je + comparative …', to: 'subordinate clause — verb at the end' },
      { from: 'desto / umso + comparative', to: 'main clause — verb straight after, then the subject' },
    ],
  },
  {
    label: 'In use',
    examples: [
      { de: 'Je länger man wartet, desto schlechter wird die Stimmung.', en: 'The longer you wait, the worse the mood gets.' },
      { de: 'Je mehr ich lerne, umso besser verstehe ich.', en: 'The more I learn, the better I understand.' },
    ],
  },
  {
    label: 'desto and umso are interchangeable',
    body: 'No difference in meaning or register. Pick either; do not mix them inside one sentence.',
  },
  {
    label: 'The je-clause comes first',
    body: 'It is the condition, and German puts it in slot one. Reversing the halves is possible but unusual and reads as a stylistic choice rather than a neutral sentence.',
  },
];

LESSONS['B1::Adjektive als Nomen (der/die Bekannte)'] = [
  {
    body: 'German turns adjectives into nouns freely — capitalise it and it is a noun. The catch is that it keeps its **adjective** endings, so the same word looks different after der than after ein.',
  },
  {
    label: 'The same word, two shapes',
    pairs: [
      { from: 'der Bekannte', to: 'ein Bekannter' },
      { from: 'die Bekannte', to: 'eine Bekannte' },
      { from: 'die Bekannten', to: 'Bekannte — no article, strong ending' },
    ],
  },
  {
    label: 'Why it changes',
    body: 'Exactly the rule from adjective declension: der shows the gender so the ending relaxes to -e; ein does not, so the ending has to do it and becomes -er. Nothing new — the same system, applied to a word standing on its own.',
  },
  {
    label: 'The common ones',
    pairs: [
      { from: 'der/die Deutsche', to: 'a German person' },
      { from: 'der/die Jugendliche', to: 'a young person' },
      { from: 'der/die Erwachsene', to: 'an adult' },
      { from: 'der/die Angestellte', to: 'an employee' },
    ],
  },
  {
    label: 'Neuter for abstractions',
    body: 'With das, the nominalised adjective means the quality or the thing in general — and after etwas, nichts, viel and wenig it takes -es.',
    examples: [
      { de: 'Ich wünsche dir alles Gute.', en: 'I wish you all the best.' },
      { de: 'Gibt es etwas Neues?', en: 'Is there anything new?' },
    ],
  },
];

LESSONS['B1::Relativsätze mit Präpositionen, wo & was'] = [
  {
    body: 'Relative clauses beyond the basic der/die/das — what happens when a preposition is involved, and the two special pronouns that replace them.',
  },
  {
    label: 'The preposition decides the case',
    body: 'Gender and number come from the noun being described; the case comes from the preposition in front of the pronoun. Two different sources, one word.',
    examples: [
      { de: 'Der Mann, mit dem ich gesprochen habe, …', en: 'The man I spoke to — mit takes the dative.' },
      { de: 'Die Freunde, von denen ich erzählt habe, …', en: 'The friends I told you about — dative plural is denen.' },
    ],
  },
  {
    label: 'German cannot strand the preposition',
    body: 'English happily says "the man I spoke **to**". German puts the preposition in front of the pronoun, and a sentence that leaves it stranded at the end is not standard.',
    limit: 'Two things look like exceptions and are not. For a *thing* rather than a person, German prefers a wo(r)- compound — «das Thema, worüber wir gesprochen haben». And spoken northern German does split «da» from its preposition: «da habe ich nichts von gehört». The first is standard and worth using; the second is regional and stays out of writing.'
  },
  {
    label: 'wo for places',
    examples: [
      { de: 'Die Stadt, wo ich geboren bin, …', en: 'The town where I was born.' },
    ],
  },
  {
    label: 'was after an indefinite, or after a whole clause',
    body: 'Use was where there is no noun to agree with: after das, alles, nichts, etwas, viel, or referring back to the entire preceding sentence.',
    examples: [
      { de: 'Das, was du suchst, liegt dort.', en: 'What you are looking for is over there.' },
      { de: 'Er kam zu spät, was mich geärgert hat.', en: 'He arrived late, which annoyed me.' },
    ],
  },
];

LESSONS['B1::Konjunktion: als ob (irreal)'] = [
  {
    body: 'As if — and the clause after it is by definition not true, which is why it takes Konjunktiv II.',
  },
  {
    label: 'als ob + Konjunktiv II, verb at the end',
    examples: [
      { de: 'Du tust so, als ob ich keine Ahnung hätte.', en: 'You act as if I had no idea.' },
      { de: 'Er sieht aus, als ob er krank wäre.', en: 'He looks as if he were ill.' },
    ],
  },
  {
    label: 'Drop the ob and the verb moves up',
    body: 'A common variant: bare als, with the verb immediately after it. Same meaning, and it is the more elegant of the two.',
    pairs: [
      { from: 'als ob er krank wäre', to: 'als wäre er krank' },
      { from: 'als ob sie schliefe', to: 'als schliefe sie' },
    ],
  },
  {
    label: 'It usually answers a verb of appearing',
    body: 'aussehen, tun, scheinen, klingen, sich fühlen — the construction describes an impression, and the Konjunktiv is what says the impression is false.',
  },
];

LESSONS['B1::Temporale Konjunktionen: während, bis, seit/seitdem'] = [
  {
    body: 'Three subordinating conjunctions for placing one event against another. Each sends the verb to the end; what differs is the relationship in time.',
  },
  {
    label: 'What each one places',
    pairs: [
      { from: 'während', to: 'at the same time — while' },
      { from: 'bis', to: 'up to the end point — until' },
      { from: 'seit / seitdem', to: 'from a past start that still holds — since' },
    ],
  },
  {
    label: 'In use',
    examples: [
      { de: 'Während ich koche, hört er Musik.', en: 'While I cook he listens to music.' },
      { de: 'Ich warte, bis du kommst.', en: 'I will wait until you come.' },
      { de: 'Ich bin Mitglied, seit ich 16 bin.', en: 'I have been a member since I was 16.' },
    ],
  },
  {
    label: 'seit keeps the present tense',
    body: 'The situation is still going, so German uses the present where English needs a perfect. «seit ich 16 bin», not «war».',
  },
  {
    label: 'während has a second, non-temporal use',
    body: 'It also means whereas, drawing a contrast rather than placing a time. The clause structure is identical, so the sense is what tells them apart.',
    examples: [{ de: 'Er mag Kaffee, während sie lieber Tee trinkt.', en: 'He likes coffee, whereas she prefers tea.' }],
  },
];

LESSONS['B1::Konjunktionen: da (kausal) & indem'] = [
  {
    body: 'Two subordinating conjunctions that fill gaps weil does not cover: a reason the listener already knows, and a means rather than a cause.',
  },
  {
    label: 'da — a reason taken as given',
    body: 'Where weil delivers new information, da presents the reason as shared background. It very often comes first in the sentence, which weil rarely does.',
    examples: [
      { de: 'Da ich spät dran bin, nehme ich ein Taxi.', en: 'As I am running late, I will take a taxi.' },
    ],
  },
  {
    label: 'da against weil',
    pairs: [
      { from: 'weil', to: 'answers "why?" — new information, usually second' },
      { from: 'da', to: 'sets up known context — usually first, slightly more formal' },
    ],
  },
  {
    label: 'indem — by doing',
    body: 'It names the method. English uses "by" plus an -ing form, which is why learners reach for «bei» — a preposition that does not do this job.',
    examples: [
      { de: 'Sie können helfen, indem Sie Geld spenden.', en: 'You can help by donating money.' },
      { de: 'Man lernt Sprachen, indem man sie spricht.', en: 'You learn languages by speaking them.' },
    ],
  },
  {
    label: 'Both send the verb to the end',
    body: 'Neither is an adverb, so neither behaves like deshalb or trotzdem. Verb last, in both.',
  },
];

LESSONS['B1::Partizip Präsens als Adjektiv'] = [
  {
    body: 'Infinitive plus -d gives an adjective meaning *doing that thing*. It is easy to build and easy to misuse, because it looks like the English -ing form and is not one.',
  },
  {
    label: 'Building it',
    pairs: [
      { from: 'hupen', to: 'hupend — ein hupendes Auto' },
      { from: 'leuchten', to: 'leuchtend — die leuchtenden Schuhe' },
      { from: 'wohltun', to: 'wohltuend — der wohltuende Tee' },
      { from: 'lachen', to: 'lachend — ein lachendes Kind' },
    ],
  },
  {
    label: 'It takes ordinary adjective endings',
    body: 'Once formed it is simply an adjective and declines like any other in front of a noun.',
  },
  {
    label: 'This is not the English progressive',
    body: 'German has no continuous tense. «I am working» is «Ich arbeite» — never «Ich bin arbeitend». The present participle describes a noun; it never builds a tense.',
    limit: 'It also barely works as a standalone predicate. «Der Tee ist wohltuend» is fine because wohltuend has become a normal adjective, but most present participles resist that use — say «Das Kind lacht», not «Das Kind ist lachend».',
  },
];

LESSONS['B1::Passiv Perfekt & Präteritum'] = [
  {
    body: 'The past tenses of the passive. The pattern from the present carries straight over: werden conjugates, the participle stays at the end.',
  },
  {
    label: 'Präteritum passive — wurde',
    body: 'The written and narrative past. This is the form you will meet most often in reading.',
    examples: [
      { de: 'Sie wurde gewählt.', en: 'She was elected.' },
      { de: 'Die Brücke wurde 1970 gebaut.', en: 'The bridge was built in 1970.' },
    ],
  },
  {
    label: 'Perfekt passive — ist … worden',
    examples: [
      { de: '1975 ist ein Verein gegründet worden.', en: 'A club was founded in 1975.' },
    ],
  },
  {
    label: 'worden, never geworden',
    body: 'The passive helper loses its ge-. If you see geworden, werden is a full verb meaning "became" and there is no passive in the sentence.',
    pairs: [
      { from: 'Sie ist Ärztin geworden.', to: 'she became a doctor' },
      { from: 'Sie ist gewählt worden.', to: 'she was elected' },
    ],
  },
  {
    label: 'Which past to use',
    body: 'The passive leans towards Präteritum even in speech, where the active would take the Perfekt. «Die Brücke wurde gebaut» sounds normal spoken; «ist gebaut worden» is heavier.',
  },
];

LESSONS['B1::Präposition: außer + Dativ'] = [
  {
    body: 'Except, apart from. It takes the dative, and it is one of the prepositions that is easy to use and easy to place wrongly.',
  },
  {
    label: 'In use',
    examples: [
      { de: 'Alle außer meiner Schwester waren da.', en: 'Everyone except my sister was there.' },
      { de: 'Außer dem Kollegen war niemand da.', en: 'Apart from the colleague nobody was there.' },
    ],
  },
  {
    label: 'It also means "besides"',
    body: 'With «noch», außer adds rather than subtracts — the opposite meaning, decided by the rest of the sentence.',
    examples: [{ de: 'Außer Deutsch spricht sie noch Französisch.', en: 'Besides German she also speaks French.' }],
  },
  {
    label: 'Fixed phrases drop the article and the case',
    body: 'A set of idioms use außer with a bare noun, where no ending is visible at all.',
    pairs: [
      { from: 'außer Haus', to: 'out of the house' },
      { from: 'außer Betrieb', to: 'out of order' },
      { from: 'außer Atem', to: 'out of breath' },
    ],
  },
];

LESSONS['B1::Wortbildung: Komposita (Nomen)'] = [
  {
    body: 'German builds long nouns by stacking short ones. The reading rule is simple and worth internalising: the **last** element is what the word actually is; everything before it narrows the meaning.',
  },
  {
    label: 'The last noun decides the gender',
    pairs: [
      { from: 'das Volk + das Fest', to: 'das Volksfest' },
      { from: 'der Bahnhof + die Straße', to: 'die Bahnhofstraße' },
      { from: 'die Hand + der Schuh', to: 'der Handschuh' },
    ],
  },
  {
    label: 'What can join',
    pairs: [
      { from: 'Nomen + Nomen', to: 'die Haustür' },
      { from: 'Adjektiv + Nomen', to: 'die Weißwurst' },
      { from: 'Verb + Nomen', to: 'die Bratwurst — brat- from braten' },
    ],
  },
  {
    label: 'The linking letters',
    body: 'A -s-, -n- or -en- often appears at the seam. It carries no meaning and is not a genitive; it is there because the join would be hard to say without it, and it has to be learned per word.',
    pairs: [
      { from: 'Arbeit + Kollege', to: 'der Arbeitskollege' },
      { from: 'Sonne + Schein', to: 'der Sonnenschein' },
    ],
  },
  {
    label: 'Read them backwards',
    body: 'Faced with an unfamiliar compound, find the final noun first — that is the thing. «Geschwindigkeitsbegrenzung» is a Begrenzung, a limit, of Geschwindigkeit, speed. The strategy scales to any length.',
  },
];

// ---- B2 -------------------------------------------------------------------
// Several of these points duplicate B1 or A2 (see the CHANGELOG). Rather than
// write the same lesson twice, each takes what B2 genuinely adds.

LESSONS['B2::Passiv'] = [
  {
    body: 'The passive was built at A2 and extended through the tenses at B1. What B2 adds is the *other* passive — and the fact that German usually avoids both.',
  },
  {
    label: 'Two passives, and they mean different things',
    pairs: [
      { from: 'Vorgangspassiv — werden', to: 'Das Fenster wird geöffnet. — it is being opened' },
      { from: 'Zustandspassiv — sein', to: 'Das Fenster ist geöffnet. — it is open' },
    ],
  },
  {
    label: 'Why the distinction matters',
    body: 'English uses "is opened" for both and relies on context. German separates the process from the resulting state, so choosing sein where you meant werden reports a finished condition instead of an event.',
  },
  {
    label: 'The alternatives German actually prefers',
    body: 'Written German uses the passive heavily; spoken German dodges it. These four say the same thing without it, and recognising them is worth more at B2 than producing another werden-form.',
    pairs: [
      { from: 'man', to: 'Man repariert das Auto.' },
      { from: 'sich lassen + Infinitiv', to: 'Das lässt sich reparieren. — that can be fixed' },
      { from: 'sein + zu + Infinitiv', to: 'Das ist zu reparieren. — that is to be fixed' },
      { from: '-bar', to: 'Das ist reparierbar.' },
    ],
  },
  {
    label: 'Not every verb has a passive',
    body: 'The passive needs an accusative object to promote. Verbs that take the dative — helfen, danken, gratulieren — cannot make a normal personal passive.',
    limit: 'They form an *impersonal* one instead, with es or nothing in slot one: «Mir wurde geholfen» or «Es wurde mir geholfen». What you may not say is «Ich wurde geholfen» — the commonest B2 passive error, and it comes straight from English.',
  },
];

LESSONS['B2::Adjektivdeklination'] = [
  {
    body: 'A1 and A2 taught the ein- and no-article cases separately. This is the consolidation: **three declension types, chosen by what stands in front.** German has one governing idea, and once you have it the tables stop needing memorising.',
  },
  {
    label: 'The idea',
    body: 'Gender and case have to be marked once in the phrase. Whoever can mark it, does — and whoever comes second relaxes.',
  },
  {
    label: 'The three types',
    pairs: [
      { from: 'after der-words (weak)', to: 'the article marks it → -e or -en' },
      { from: 'after ein-words (mixed)', to: 'ein marks nothing in three slots → the adjective steps in there' },
      { from: 'no article (strong)', to: 'nothing else can → the adjective takes the article’s own endings' },
    ],
  },
  {
    label: 'The same adjective, three ways',
    pairs: [
      { from: 'weak', to: 'der gute Mann · dem guten Mann' },
      { from: 'mixed', to: 'ein guter Mann · einem guten Mann' },
      { from: 'strong', to: 'guter Mann · gutem Mann' },
    ],
  },
  {
    label: 'The weak table is almost all -en',
    body: 'After a der-word there are exactly five -e endings — the nominative singulars and the feminine and neuter accusative. Everything else in the whole table is -en. Learn the five; default the rest.',
  },
  {
    label: 'Two adjectives both take the ending',
    body: 'Stacked adjectives decline in parallel; the second does not somehow become weak.',
    examples: [{ de: 'ein guter alter Freund', en: 'a good old friend — both -er.' }],
  },
];

LESSONS['B2::Konnektoren (deshalb/trotzdem)'] = [
  {
    body: 'The same meanings can be expressed by three different word classes, and each puts the verb somewhere else. B2 is where you are expected to move between them rather than pick one and stay.',
  },
  {
    label: 'Three ways to say "because"',
    pairs: [
      { from: 'coordinating — denn', to: 'Ich bleibe zu Hause, denn es regnet. — verb second, nothing moves' },
      { from: 'subordinating — weil', to: 'Ich bleibe zu Hause, weil es regnet. — verb last' },
      { from: 'adverb — deshalb', to: 'Es regnet, deshalb bleibe ich zu Hause. — verb second, subject after it' },
    ],
  },
  {
    label: 'The adverbs',
    pairs: [
      { from: 'deshalb, deswegen, darum', to: 'therefore' },
      { from: 'trotzdem, dennoch', to: 'nevertheless' },
      { from: 'außerdem, zudem', to: 'moreover' },
      { from: 'sonst', to: 'otherwise' },
    ],
  },
  {
    label: 'Why the class matters more than the meaning',
    body: 'trotzdem and obwohl both concede. But trotzdem is an adverb and takes slot one of a main clause; obwohl is a conjunction and sends its verb to the end. Choosing the word decides the syntax, so it has to be chosen deliberately.',
    pairs: [
      { from: 'Obwohl es regnete, gingen wir.', to: 'conjunction — verb last' },
      { from: 'Es regnete. Trotzdem gingen wir.', to: 'adverb — verb second' },
    ],
  },
  {
    label: 'denn is not weil',
    body: 'denn coordinates: it joins two full main clauses, does not start a sentence and does not move. weil subordinates and can go either first or second. When in doubt, weil is the flexible one.',
  },
];

LESSONS['B2::Relativsätze'] = [
  {
    body: 'The core relative pronoun system. Two sources feed one word, and keeping them apart is the whole skill: **gender and number come from the noun outside; case comes from the job inside.**',
  },
  {
    label: 'The paradigm',
    pairs: [
      { from: 'nominative', to: 'der · die · das · die' },
      { from: 'accusative', to: 'den · die · das · die' },
      { from: 'dative', to: 'dem · der · dem · denen' },
      { from: 'genitive', to: 'dessen · deren · dessen · deren' },
    ],
  },
  {
    label: 'Two sources, one pronoun',
    examples: [
      { de: 'Der Mann, der dort steht, …', en: 'masculine from Mann; nominative because he is the one standing.' },
      { de: 'Der Mann, den ich kenne, …', en: 'masculine from Mann; accusative because I know him.' },
      { de: 'Der Mann, dem ich helfe, …', en: 'masculine from Mann; dative because helfen takes it.' },
    ],
  },
  {
    label: 'Only two forms are new',
    body: 'The table is the definite article with two changes: dative plural is **denen**, and the genitive is **dessen / deren**. Everything else you already know.',
  },
  {
    label: 'dessen and deren replace the possessive',
    body: 'They agree with the *owner*, not with the thing owned, and the noun after them takes no article and no ending.',
    examples: [
      { de: 'Der Mann, dessen Auto gestohlen wurde, …', en: 'The man whose car was stolen.' },
      { de: 'Die Frau, deren Kinder hier spielen, …', en: 'The woman whose children play here.' },
    ],
  },
  {
    label: 'The comma is not optional',
    body: 'English drops the relative pronoun and the comma freely — "the man I know". German keeps both, and a relative clause is set off by commas on either side.',
  },
];

LESSONS['B2::Temporale Nebensätze (als/wenn/nachdem/bevor)'] = [
  {
    body: 'The temporal conjunctions collected in one place, with the tense each one wants. At B2 the choice of conjunction is assumed; what is tested is getting the tense pairing right.',
  },
  {
    label: 'Which word',
    pairs: [
      { from: 'als', to: 'one completed past event' },
      { from: 'wenn', to: 'repeated, or present and future' },
      { from: 'nachdem', to: 'the earlier of two events' },
      { from: 'bevor', to: 'the later of two events' },
      { from: 'während', to: 'simultaneous' },
      { from: 'sobald', to: 'as soon as' },
    ],
  },
  {
    label: 'The tense pairing after nachdem',
    body: 'This is the part that is actually marked. nachdem forces a step back in tense, because its clause is by definition earlier.',
    pairs: [
      { from: 'nachdem + Plusquamperfekt', to: 'main clause: Präteritum or Perfekt' },
      { from: 'nachdem + Perfekt', to: 'main clause: Präsens' },
    ],
  },
  {
    label: 'bevor and während do not shift',
    body: 'Neither is earlier than the main clause, so both keep the same tense on either side. Applying nachdem’s rule to them is over-generalising a pattern.',
    examples: [
      { de: 'Nachdem er gegangen war, kam sie.', en: 'After he had left, she came.' },
      { de: 'Bevor er ging, rief er an.', en: 'Before he left he called.' },
    ],
  },
];

LESSONS['B2::Finalsätze (um … zu / damit)'] = [
  {
    body: 'Purpose clauses, and at B2 the addition is the nominal register — the way purpose is expressed in formal writing without a clause at all.',
  },
  {
    label: 'The clause forms',
    pairs: [
      { from: 'same subject', to: 'Ich lerne, um zu bestehen.' },
      { from: 'different subjects', to: 'Ich erkläre es, damit du es verstehst.' },
    ],
  },
  {
    label: 'The rule is not symmetrical',
    body: 'um … zu has no subject, so it requires the subjects to match. damit does not require them to differ.',
    limit: 'Different subjects **must** take damit. Matching subjects **may** take either — «Ich lerne, damit ich bestehe» is correct, just heavier. Taught as a two-way rule, it is a one-way one.',
  },
  {
    label: 'The nominal register',
    body: 'Formal German compresses the clause into a prepositional phrase. This is what B2 writing is rewarded for and what B2 reading is full of.',
    pairs: [
      { from: 'um zu informieren', to: 'zur Information' },
      { from: 'um zu verbessern', to: 'zur Verbesserung' },
      { from: 'damit die Sicherheit steigt', to: 'zwecks Erhöhung der Sicherheit' },
    ],
  },
];

LESSONS['B2::Plusquamperfekt'] = [
  {
    body: 'The past before the past. Its mechanics were covered at B1; what matters at B2 is knowing that it is rarer than learners think and why.',
  },
  {
    label: 'Building it',
    pairs: [
      { from: 'Perfekt: ich habe gegessen', to: 'Plusquamperfekt: ich hatte gegessen' },
      { from: 'Perfekt: ich bin gegangen', to: 'Plusquamperfekt: ich war gegangen' },
    ],
  },
  {
    label: 'It needs a second past event to be before',
    body: 'The tense exists to order two things. On its own it has nothing to be earlier than, and a Plusquamperfekt with no reference point simply reads as an error.',
    examples: [
      { de: 'Nachdem er gegangen war, kam sie.', en: 'Two events, ordered.' },
    ],
  },
  {
    label: 'Where you actually meet it',
    body: 'Overwhelmingly with nachdem, and in narrative prose filling in what happened before the story’s present. In conversation it is uncommon — German is content to let the Perfekt and a time word do the ordering.',
  },
];

LESSONS['B2::Infinitiv mit zu'] = [
  {
    body: 'Covered at B1 as a construction. What B2 adds is the list of verbs that take a **bare** infinitive, because the errors here are mostly about zu turning up where it should not.',
  },
  {
    label: 'No zu after these',
    pairs: [
      { from: 'modals', to: 'Ich muss arbeiten.' },
      { from: 'sehen, hören, spüren', to: 'Ich sehe ihn kommen.' },
      { from: 'lassen', to: 'Ich lasse das Auto reparieren.' },
      { from: 'gehen, fahren, kommen', to: 'Ich gehe schwimmen.' },
      { from: 'bleiben, lernen, helfen', to: 'Er bleibt stehen.' },
    ],
  },
  {
    label: 'zu after almost everything else',
    examples: [
      { de: 'Ich habe vor, morgen zu kommen.', en: 'I plan to come tomorrow.' },
      { de: 'Er hat vergessen, mich anzurufen.', en: 'He forgot to call me — the zu goes inside the separable verb.' },
    ],
  },
  {
    label: 'brauchen is the one that changed',
    body: 'With a negative, brauchen behaves like a modal and prescriptively takes no zu — «Du brauchst nicht zu kommen» is the careful form, and «Du brauchst nicht kommen» is what most people say.',
    limit: 'Both are current and Duden lists the zu-less version as colloquial rather than wrong. Write the zu; do not correct a German who leaves it out.',
  },
];

LESSONS['B2::Konjunktiv II (Gegenwart)'] = [
  {
    body: 'Consolidation. The forms were introduced at B1; at B2 the expectation is that you choose between the short form and würde correctly, and use the mood for more than politeness.',
  },
  {
    label: 'Short form for these, würde for the rest',
    pairs: [
      { from: 'sein → wäre', to: 'haben → hätte' },
      { from: 'können → könnte', to: 'müssen → müsste' },
      { from: 'dürfen → dürfte', to: 'sollen → sollte' },
      { from: 'wissen → wüsste', to: 'werden → würde' },
    ],
  },
  {
    label: 'The four jobs',
    pairs: [
      { from: 'unreal condition', to: 'Wenn ich Zeit hätte, würde ich reisen.' },
      { from: 'politeness', to: 'Könnten Sie mir helfen?' },
      { from: 'advice', to: 'An deiner Stelle würde ich warten.' },
      { from: 'cautious assertion', to: 'Das wäre eine Möglichkeit.' },
    ],
  },
  {
    label: 'Do not stack würde onto a verb that has its own form',
    body: '«würde haben» and «würde sein» are the marks of a learner. The eight verbs above use their own Konjunktiv II and always have.',
    limit: 'For strong verbs the reverse holds and the synthetic form is the marked one: käme, ginge and gäbe are correct but literary, and würde + infinitive is the neutral spoken choice.',
  },
];

LESSONS['B2::Passiv Perfekt: „ist … worden“'] = [
  {
    body: 'One detail, isolated because it persists well past the level it is taught at: the participle of werden in a passive is **worden**, not geworden.',
  },
  {
    label: 'The two participles',
    pairs: [
      { from: 'werden as a full verb', to: 'Er ist Arzt geworden. — he became a doctor' },
      { from: 'werden as the passive helper', to: 'Er ist operiert worden. — he was operated on' },
    ],
  },
  {
    label: 'Why the ge- drops',
    body: 'A helper verb does not carry its own participle marking when another participle is already present. The same instinct is behind the double infinitive with modals — German avoids marking the same thing twice in one bracket.',
  },
  {
    label: 'The test',
    body: 'Is there another participle in the sentence? Then it is a passive and you want worden. Is werden carrying the meaning by itself? Then it means become and you want geworden.',
    examples: [
      { de: 'Das Haus ist gebaut worden.', en: 'gebaut is already there → worden.' },
      { de: 'Das Haus ist alt geworden.', en: 'no second participle → geworden.' },
    ],
  },
];

LESSONS['B2::Partizipialattribute'] = [
  {
    body: 'A participle used as an adjective in front of a noun. German packs into one phrase what English needs a relative clause for, and B2 reading is dense with it.',
  },
  {
    label: 'Partizip I — active and ongoing',
    pairs: [
      { from: 'das lachende Kind', to: 'the child who is laughing' },
      { from: 'die steigenden Preise', to: 'the prices that are rising' },
    ],
  },
  {
    label: 'Partizip II — completed, and usually passive',
    pairs: [
      { from: 'das gekochte Ei', to: 'the egg that has been boiled' },
      { from: 'die eingeladenen Gäste', to: 'the guests who have been invited' },
    ],
  },
  {
    label: 'Both take ordinary adjective endings',
    body: 'Once in front of a noun, a participle is an adjective and declines like one. Nothing new is needed.',
  },
  {
    label: 'Partizip II is not always passive',
    body: 'With verbs that take sein in the Perfekt, the Partizip II is **active** and simply means finished.',
    limit: 'Compare «der eingeladene Gast» (the guest who was invited — passive, haben-verb) with «der angekommene Zug» (the train that has arrived — active, sein-verb). Reading every Partizip II as passive will invert the meaning of the second.',
  },
  {
    label: 'Unpacking one when reading',
    body: 'Find the noun at the end, then read the participle back as a relative clause. «die von der Regierung beschlossenen Maßnahmen» → die Maßnahmen, die von der Regierung beschlossen wurden.',
  },
];

LESSONS['B2::Subjektive Modalverben'] = [
  {
    body: 'The modals, used to say how sure you are rather than what is possible. Same six words, a completely different job — and the meaning is invisible unless you know the construction exists.',
  },
  {
    label: 'Objective against subjective',
    pairs: [
      { from: 'Er muss arbeiten.', to: 'he has to work — objective' },
      { from: 'Das muss ein Irrtum sein.', to: 'that must be a mistake — subjective, near certainty' },
    ],
  },
  {
    label: 'The scale',
    pairs: [
      { from: 'muss', to: 'I am certain' },
      { from: 'dürfte', to: 'probably' },
      { from: 'könnte / kann', to: 'possibly' },
      { from: 'soll', to: 'people say — hearsay, source unnamed' },
      { from: 'will', to: 'he claims — and I am sceptical' },
    ],
  },
  {
    label: 'soll and will report other people',
    body: 'These two are not about probability at all. soll passes on what is said; will passes on what the subject asserts about themselves, usually with a raised eyebrow.',
    examples: [
      { de: 'Er soll reich sein.', en: 'He is said to be rich.' },
      { de: 'Er will alles gesehen haben.', en: 'He claims to have seen everything.' },
    ],
  },
  {
    label: 'For the past, the infinitive changes, not the modal',
    body: 'The modal stays in the present; the perfect infinitive carries the time. This is the form that makes the construction unmistakable.',
    pairs: [
      { from: 'Er soll reich sein.', to: 'Er soll reich gewesen sein.' },
      { from: 'Sie dürfte zu Hause sein.', to: 'Sie dürfte zu Hause gewesen sein.' },
    ],
  },
];

// ---- C1 -------------------------------------------------------------------

LESSONS['C1::Konjunktiv I (indirekte Rede)'] = [
  {
    body: 'The reporting mood. German journalism runs on it: Konjunktiv I signals *this is what was said*, without the writer endorsing or doubting it. English has no equivalent and reaches for "allegedly" or "he claimed" — German changes the verb.',
  },
  {
    label: 'Building it — from the infinitive stem',
    pairs: [
      { from: 'sein', to: 'er sei, sie seien — the irregular one, and the commonest' },
      { from: 'haben', to: 'er habe' },
      { from: 'kommen', to: 'er komme' },
      { from: 'können', to: 'er könne' },
      { from: 'werden', to: 'er werde' },
    ],
  },
  {
    label: 'In use',
    examples: [
      { de: 'Er sagte, er sei krank.', en: 'He said he was ill — reported, not endorsed.' },
      { de: 'Die Sprecherin erklärte, die Zahlen seien korrekt.', en: 'The spokeswoman said the figures were correct.' },
    ],
  },
  {
    label: 'When Konjunktiv I is invisible, switch to II',
    body: 'For most verbs the third person plural of Konjunktiv I is identical to the indicative — «sie haben» either way — so it would report nothing. The rule is to fall back to Konjunktiv II.',
    limit: 'Konjunktiv II is not automatically distinct either: for **weak** verbs it is identical to the Präteritum, so «sie machten» is ambiguous in exactly the same way. There the chain goes one step further to würde + infinitive — «sie würden machen». Strong verbs are fine, because kämen and gäben differ from kamen and gaben.',
    pairs: [
      { from: 'sie haben (indicative = K I)', to: 'sie hätten' },
      { from: 'sie kommen', to: 'sie kämen' },
    ],
  },
  {
    label: 'The neutrality is the point',
    body: 'Konjunktiv I does not mean the writer disbelieves the statement. It marks the sentence as *someone else’s*. Reaching for Konjunktiv II instead — when a K I form is available — reads as scepticism, which is a real editorial difference.',
  },
  {
    label: 'It is a written register',
    body: 'Spoken German reports with «Er hat gesagt, dass …» plus the indicative. Konjunktiv I in conversation sounds like a news bulletin.',
    limit: '«sei» is the exception that survives everywhere, including speech. If you learn one form of Konjunktiv I, learn that one.',
  },
];

LESSONS['C1::Nominalisierung ↔ Verbalstil'] = [
  {
    body: 'The single most characteristic move of formal written German: a subordinate clause compressed into a noun phrase. C1 reading is full of it, and C1 writing is assessed on being able to go both ways.',
  },
  {
    label: 'The standard conversions',
    pairs: [
      { from: 'weil die Kosten stiegen', to: 'wegen des Kostenanstiegs' },
      { from: 'obwohl es regnete', to: 'trotz des Regens' },
      { from: 'wenn man sie richtig anwendet', to: 'bei richtiger Anwendung' },
      { from: 'nachdem er zurückgekehrt war', to: 'nach seiner Rückkehr' },
      { from: 'um zu informieren', to: 'zur Information' },
    ],
  },
  {
    label: 'Reading: go backwards',
    body: 'Faced with a dense nominal phrase, find the noun built from a verb and rebuild the clause. «nach Beendigung der Verhandlungen» → «nachdem die Verhandlungen beendet worden waren».',
    limit: 'The two are not quite equivalent, and this is why the style is contested. A nominal phrase drops tense, mood and — most consequentially — the agent: «nach Beendigung der Verhandlungen» does not say who ended them. That vagueness is sometimes the reason the construction was chosen.',
  },
  {
    label: 'The preposition tells you the conjunction',
    pairs: [
      { from: 'wegen, aufgrund, infolge + G', to: 'weil — cause' },
      { from: 'trotz + G', to: 'obwohl — concession' },
      { from: 'bei + D', to: 'wenn — condition' },
      { from: 'nach / vor + D', to: 'nachdem / bevor — time' },
      { from: 'durch + A', to: 'indem — means' },
    ],
  },
  {
    label: 'Denser is not automatically better',
    body: 'The nominal style is the register of administration and academic prose. Used everywhere it produces the airless German that Germans themselves complain about — *Behördendeutsch*. C1 asks you to command it, not to default to it.',
  },
];

LESSONS['C1::Konjunktiv II Vergangenheit'] = [
  {
    body: 'The past unreal, at the level where it has to be produced accurately rather than recognised. One helper, one participle — until a modal appears.',
  },
  {
    label: 'The plain form',
    examples: [
      { de: 'Wenn ich das gewusst hätte, wäre ich gekommen.', en: 'Had I known that, I would have come.' },
    ],
  },
  {
    label: 'With a modal — two infinitives, no participle',
    pairs: [
      { from: 'Ich hätte kommen müssen.', to: 'I would have had to come' },
      { from: 'Er hätte es wissen können.', to: 'he could have known' },
      { from: 'Das hätte nicht passieren dürfen.', to: 'that should not have been allowed to happen' },
    ],
  },
  {
    label: 'Regret and reproach',
    body: 'Lead with the verb, drop the wenn, and add doch, bloß or nur. This is how German expresses the thing English does with "if only".',
    examples: [
      { de: 'Hätte ich doch mehr gelernt!', en: 'If only I had studied more!' },
      { de: 'Du hättest mir das sagen können.', en: 'You could have told me.' },
    ],
  },
  {
    label: 'In a subordinate clause the helper moves forward',
    body: 'A double infinitive will not take the conjugated verb behind it, so hätte jumps in front of both — the same displacement as the ordinary Perfekt with modals.',
    examples: [{ de: '…, weil ich hätte kommen müssen.', en: 'hätte first, then the two infinitives.' }],
  },
];

LESSONS['C1::Genitivpräpositionen (C1)'] = [
  {
    body: 'The formal register’s prepositions. These are the words that mark a text as official, academic or legal, and at C1 they are largely a reading skill — recognising the relation each one signals.',
  },
  {
    label: 'The set',
    pairs: [
      { from: 'angesichts + G', to: 'in view of — angesichts der Lage' },
      { from: 'infolge + G', to: 'as a result of — infolge des Unfalls' },
      { from: 'anhand + G', to: 'on the basis of — anhand der Daten' },
      { from: 'hinsichtlich + G', to: 'regarding — hinsichtlich der Kosten' },
      { from: 'mangels + G', to: 'for lack of — mangels Beweisen' },
      { from: 'zugunsten + G', to: 'in favour of' },
    ],
  },
  {
    label: 'What each one signals',
    body: 'These are not interchangeable. angesichts frames a situation, infolge asserts causation, anhand names evidence, hinsichtlich narrows a topic. Choosing by sound rather than by relation is the C1 writing error.',
  },
  {
    label: 'They fall back to the dative on a bare plural',
    body: 'A plural noun with no article shows no genitive, so German uses the dative instead — «mangels Beweisen», not «Beweise». The preposition has not changed its case; there is simply nothing to mark it on.',
    limit: 'This is a general rule for genitive prepositions with unaccompanied nouns, not a quirk of mangels. «trotz Regens» is fine because -s is visible; «trotz Regen» is also accepted precisely because it is not.',
  },
];

LESSONS['C1::Konnektoren (indem/sodass/folglich)'] = [
  {
    body: 'Connectors at C1 are sorted by *what relation they express* and *what syntax they force*. Both have to be right, and the second is what separates a C1 text from a B2 one.',
  },
  {
    label: 'Three classes, three word orders',
    pairs: [
      { from: 'subordinating — indem, sodass', to: 'verb to the end' },
      { from: 'adverb — folglich, demnach, somit', to: 'verb stays second' },
      { from: 'coordinating — denn, aber, sondern', to: 'nothing moves' },
    ],
  },
  {
    label: 'indem — the means',
    examples: [
      { de: 'Man lernt, indem man übt.', en: 'You learn by practising.' },
      { de: 'Sie senkten die Kosten, indem sie die Produktion verlagerten.', en: 'They cut costs by relocating production.' },
    ],
  },
  {
    label: 'sodass — the result',
    examples: [
      { de: 'Die Nachfrage stieg, sodass die Preise anzogen.', en: 'Demand rose, so prices went up.' },
    ],
  },
  {
    label: 'folglich, demnach, somit — consequently',
    body: 'Adverbs, so they take slot one and push the subject behind the verb. They are the formal register’s version of deshalb.',
    examples: [{ de: 'Die Frist ist abgelaufen. Folglich ist der Antrag ungültig.', en: 'The deadline has passed. The application is therefore invalid.' }],
  },
  {
    label: 'je nachdem — depending on',
    body: 'Takes a following question word or ob, and the whole thing is subordinating.',
    examples: [{ de: 'Je nachdem, wie das Wetter wird, fahren wir.', en: 'Depending on how the weather turns out, we will drive.' }],
  },
];

LESSONS['C1::Relativsätze mit wo(r)- & wessen'] = [
  {
    body: 'The relative clauses that have no noun to agree with, and the possessive question word. Both are C1 markers in writing.',
  },
  {
    label: 'was — after an indefinite, or a whole clause',
    pairs: [
      { from: 'alles, was ich weiß', to: 'everything I know' },
      { from: 'das Beste, was passieren konnte', to: 'after a superlative' },
      { from: 'Er kam zu spät, was mich ärgerte.', to: 'referring to the whole preceding clause' },
    ],
  },
  {
    label: 'wo(r)- + preposition, for things',
    body: 'When the antecedent is a thing rather than a person, German fuses the preposition onto wo — and inserts -r- before a vowel.',
    pairs: [
      { from: 'worüber', to: 'das Thema, worüber wir sprachen' },
      { from: 'womit', to: 'das Werkzeug, womit er arbeitet' },
      { from: 'worauf', to: 'der Moment, worauf alle warteten' },
    ],
  },
  {
    label: 'dessen, deren, wessen',
    pairs: [
      { from: 'dessen / deren', to: 'relative — der Mann, dessen Auto …' },
      { from: 'wessen', to: 'interrogative — Wessen Auto ist das?' },
    ],
  },
  {
    label: 'The noun after dessen takes nothing',
    body: 'No article, no adjective ending change — dessen has already done the marking. «der Mann, dessen neues Auto» keeps the adjective strong.',
  },
];

LESSONS['C1::Futur II'] = [
  {
    body: 'Two meanings, and the second is far commoner than the first. Futur II is built from werden + Partizip + haben/sein, and most of the time it is not about the future at all.',
  },
  {
    label: 'Completed by a point in the future',
    examples: [
      { de: 'Bis Freitag werde ich den Bericht geschrieben haben.', en: 'By Friday I will have written the report.' },
    ],
  },
  {
    label: 'A supposition about the past — the common use',
    body: 'werden + a perfect infinitive expresses a confident guess about something already over. English needs "probably" or "must have".',
    examples: [
      { de: 'Er wird den Zug verpasst haben.', en: 'He will have missed the train — I assume he did.' },
      { de: 'Sie wird es vergessen haben.', en: 'She must have forgotten.' },
    ],
  },
  {
    label: 'The pattern it belongs to',
    body: 'Futur I does the same thing for the present — «Er wird wohl krank sein». Futur II does it for the past. Both are German using a future form to mark an inference, which is the opposite of what the name suggests.',
  },
  {
    label: 'The first meaning is rare',
    body: 'For genuine future completion, German usually says «Bis Freitag habe ich den Bericht geschrieben» — Perfekt plus a time phrase. Producing Futur II for that is correct and heavy.',
  },
];

LESSONS['C1::TeKaMoLo & Satzklammer'] = [
  {
    body: 'The default order of the middle field. German lets you move almost anything, which means a neutral sentence has a default — and departing from it is how emphasis is made. At C1 both halves matter.',
  },
  {
    label: 'The default sequence',
    pairs: [
      { from: 'Te — temporal', to: 'wann?  morgen' },
      { from: 'Ka — kausal', to: 'warum?  wegen des Termins' },
      { from: 'Mo — modal', to: 'wie?  mit dem Zug' },
      { from: 'Lo — lokal', to: 'wo / wohin?  nach Bonn' },
    ],
  },
  {
    label: 'All four at once',
    examples: [
      { de: 'Ich fahre morgen wegen des Termins mit dem Zug nach Bonn.', en: 'Te — Ka — Mo — Lo, in order.' },
    ],
  },
  {
    label: 'The bracket around it',
    body: 'The middle field sits inside the Satzklammer: the conjugated verb at position two, and the non-finite part at the very end. Modals, the Perfekt, the passive and the futures build one and the same frame.',
    examples: [{ de: 'Ich werde morgen mit dem Zug nach Bonn fahren.', en: 'werde … fahren, everything else between them.' }],
  },
  {
    label: 'It is a default, not a rule',
    body: 'Any of the four can be fronted into slot one for emphasis, and pronouns break the order entirely by moving to the front of the middle field.',
    limit: 'Known information drifts left and new information right, and that pressure outranks TeKaMoLo. «Ich fahre morgen nach Bonn mit dem Zug» is good German if the point is *how* you are travelling. Treat the sequence as the neutral baseline, and never as grounds for calling a native sentence wrong.',
  },
];

// ---- C2 -------------------------------------------------------------------

LESSONS['C2::Modalpartikeln'] = [
  {
    body: 'The particles were introduced at A1 as tone. At C2 they are a precision instrument: each one narrows the range of attitudes a sentence can be read with, and using them accurately is one of the clearest markers of a near-native speaker.',
  },
  {
    label: 'The core inventory',
    pairs: [
      { from: 'doch', to: 'contradicts an expectation, or urges' },
      { from: 'ja', to: 'appeals to shared knowledge, or marks surprise' },
      { from: 'eben / halt', to: 'resignation — that is simply how it is' },
      { from: 'wohl', to: 'a guess, or a concession' },
      { from: 'mal', to: 'reduces a request to something trivial' },
      { from: 'schon', to: 'concedes then qualifies — yes, but' },
    ],
  },
  {
    label: 'The same words are also ordinary adverbs',
    body: 'These particles each have a full lexical twin, and position and stress separate them. Stressed and in slot one it is an adverb; unstressed in the middle field it is a particle.',
    pairs: [
      { from: 'Schon gut.', to: 'adverb — already, fine' },
      { from: 'Das ist schon richtig, aber …', to: 'particle — granted, but' },
      { from: 'Er ist wohl zu Hause.', to: 'particle — probably' },
      { from: 'Ich fühle mich wohl.', to: 'adjective — comfortable' },
    ],
  },
  {
    label: 'Stacking them',
    body: 'Particles combine in a fixed order and the combination is not the sum of the parts. «doch mal» softens an imperative; «ja nicht» is a sharp warning, not a mild one.',
    examples: [
      { de: 'Komm doch mal vorbei!', en: 'Do drop by sometime — friendly.' },
      { de: 'Mach das ja nicht!', en: 'Don’t you dare do that — emphatic.' },
    ],
  },
  {
    label: 'They resist translation, and that is the skill',
    body: 'A particle rarely has an English word; it has an English *intonation*. Learning them means learning which contour a sentence is meant to be said with, which is why they are the last thing to arrive.',
  },
];

LESSONS['C2::Irreale Vergleiche (als ob)'] = [
  {
    body: 'Unreal comparison, at the level where the tense of the subjunctive is expected to be right rather than merely present.',
  },
  {
    label: 'Three shapes, one meaning',
    pairs: [
      { from: 'als ob + K II, verb last', to: 'Er tut so, als ob er alles wüsste.' },
      { from: 'als + K II, verb second', to: 'Er tut so, als wüsste er alles.' },
      { from: 'als wenn', to: 'possible, and old-fashioned' },
    ],
  },
  {
    label: 'The bare als form is the elevated one',
    body: 'Dropping ob and raising the verb is the literary and careful-speech choice. It is the form C2 writing is expected to produce.',
  },
  {
    label: 'The tense carries the timing',
    pairs: [
      { from: 'simultaneous', to: 'als wüsste er es — as if he knew, now' },
      { from: 'anterior', to: 'als hätte er es gewusst — as if he had known' },
    ],
  },
  {
    label: 'Konjunktiv I appears here too',
    body: 'In careful written German als ob can take Konjunktiv I when the comparison is reported rather than dismissed — «als sei er krank». It is rarer and marks a difference in stance rather than in time.',
    limit: 'The default remains Konjunktiv II, because the construction is about unreality. Reach for K I only where the surrounding text is already in reported speech.',
  },
];

LESSONS['C2::Gerundivum (das zu lösende Problem)'] = [
  {
    body: 'A passive obligation folded into a single adjective. It is dense, entirely regular, and everywhere in technical and legal German.',
  },
  {
    label: 'Building it',
    body: 'zu + Partizip I, declined like any adjective. It means *that has to be, or can be, done* — the passive plus necessity, in one word.',
    pairs: [
      { from: 'das Problem, das gelöst werden muss', to: 'das zu lösende Problem' },
      { from: 'die Fragen, die beantwortet werden müssen', to: 'die zu beantwortenden Fragen' },
      { from: 'der Betrag, der zu zahlen ist', to: 'der zu zahlende Betrag' },
    ],
  },
  {
    label: 'Separable verbs take the zu inside',
    pairs: [{ from: 'durchführen', to: 'die durchzuführenden Maßnahmen' }],
  },
  {
    label: 'Against the plain Partizip I',
    body: 'Without zu the participle is active and ongoing; with zu it is passive and obligatory. One syllable inverts the voice.',
    pairs: [
      { from: 'das lösende Problem', to: 'wrong — a problem that solves' },
      { from: 'das zu lösende Problem', to: 'the problem to be solved' },
    ],
  },
  {
    label: 'Reading it',
    body: 'Unpack to a relative clause with müssen or können. «die noch zu klärenden Punkte» → die Punkte, die noch geklärt werden müssen.',
  },
];

LESSONS['C2::Gehobene Konnektoren'] = [
  {
    body: 'The connectors that mark a text as literary, legal or academic. At C2 the skill is knowing the relation *and* the register — several of these would be absurd in conversation.',
  },
  {
    label: 'The set',
    pairs: [
      { from: 'gleichwohl', to: 'nevertheless — adverb, verb stays second' },
      { from: 'indes(sen)', to: 'however, meanwhile' },
      { from: 'sofern', to: 'provided that — subordinating, verb last' },
      { from: 'zumal', to: 'especially since — subordinating' },
      { from: 'ungeachtet + G', to: 'notwithstanding — preposition' },
      { from: 'mithin', to: 'consequently' },
    ],
  },
  {
    label: 'They are not all the same word class',
    body: 'This is the trap. gleichwohl and indessen are adverbs and keep the verb in second position; sofern and zumal are conjunctions and send it to the end; ungeachtet is a preposition and takes the genitive. Register does not exempt you from syntax.',
    examples: [
      { de: 'Die Kosten stiegen; gleichwohl blieb die Nachfrage stabil.', en: 'adverb — verb second.' },
      { de: 'Wir kommen, sofern es das Wetter erlaubt.', en: 'conjunction — verb last.' },
    ],
  },
  {
    label: 'zumal adds weight to a reason already given',
    body: 'It does not simply mean weil. It marks the following reason as the *decisive* one on top of others.',
    examples: [{ de: 'Wir sollten früher aufbrechen, zumal es schneien soll.', en: 'especially as it is supposed to snow.' }],
  },
  {
    label: 'Register is a choice, and it can be wrong',
    body: 'Using these in speech sounds like reading aloud from a contract. C2 is judged on matching the register to the situation, and reaching for the most elevated option regardless is itself an error.',
  },
];

LESSONS['C2::Idiomatik & feste Wendungen'] = [
  {
    body: 'Idiomatic range is explicitly rewarded in the C2 Sprechen and Schreiben. What is being assessed is not how many idioms you know but whether you place them where a native would.',
  },
  {
    label: 'A working handful',
    pairs: [
      { from: 'etw. auf die lange Bank schieben', to: 'to put something off' },
      { from: 'jmdm. reinen Wein einschenken', to: 'to tell someone the truth' },
      { from: 'ins Gewicht fallen', to: 'to matter, to carry weight' },
      { from: 'den Nagel auf den Kopf treffen', to: 'to hit the nail on the head' },
      { from: 'aus dem Rahmen fallen', to: 'to be out of the ordinary' },
      { from: 'mit etw. hinter dem Berg halten', to: 'to keep something back' },
    ],
  },
  {
    label: 'They are fixed — that is what makes them idioms',
    body: 'The words do not take synonyms and the grammar does not rearrange. «auf die kurze Bank schieben» is not a variation, it is a mistake, and the same goes for changing the article or the case.',
  },
  {
    label: 'Register varies enormously',
    body: 'These are not one class of expression. Some are neutral and usable in a report; others are colloquial and would jar in formal writing. Learn each with a note on where it belongs.',
  },
  {
    label: 'Density is the giveaway',
    body: 'The examiner is listening for idiom used the way a native uses it — occasionally, and to make a point. Three in a paragraph reads as a list being recited, and marks *down* rather than up.',
  },
];

/** Fixes to a point's fallback `rule` text, expect-guarded.
 *
 *  `rule` is what renders when a point has no authored lesson, and it is also the
 *  accessible full text, so a bad example in it survives even after a lesson lands
 *  on top. Guarded the way `authoring/fix-authored.ts` guards its edits: the current
 *  value has to match `from` exactly, so a rule someone has since rewritten is
 *  reported rather than silently overwritten.
 *
 *  Not a general-purpose rule editor — three entries and a hard match. Rewriting
 *  rules wholesale belongs in an authoring batch, not in a fix map. */
const RULE_FIXES: Record<string, { from: string; to: string; why: string }> = {
  'A1::Imperativ': {
    from: 'du: Mach! Geh! Mahl(e)! · ihr: Macht! · Sie: Machen Sie! · sein → Sei! / Seien Sie!',
    to: 'du: Mach! Geh! Mal(e)! · ihr: Macht! · Sie: Machen Sie! · sein → Sei! / Seien Sie!',
    why: '«Mahle!» is the imperative of *mahlen*, to grind — a real form, but a strange '
      + 'word to meet at A1 and almost certainly a slip for *malen*, to paint. The slot it '
      + 'sits in is illustrating the optional -e, which «Mal(e)!» does with an A1 verb.',
  },
};

// ---------------------------------------------------------------------------
// The gate.
// ---------------------------------------------------------------------------

/** The six persons, in the order `conjugate()` returns them and the order every
 *  paradigm above is written in. */
const PERSON_ORDER = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

interface Problem { key: string; kind: string; detail: string }

/** Which verb a paradigm is about, **and in which tense**.
 *
 *  The tense was not here at first and the checker always compared against
 *  `praesens` — so registering the *Präteritum* table for war/hatte produced twelve
 *  confident "wrong-form" errors against forms that are perfectly correct. The
 *  lesson was right and the gate was wrong, which is the more dangerous direction:
 *  a gate that cries wolf gets its output skimmed, and the next real failure goes
 *  through with it. */
interface ParadigmSpec { verb: string; tense: 'praesens' | 'praeteritum' }

/** A paradigm written as six `{ from: person, to: form }` pairs is a *factual
 *  claim about a verb*, and the app already owns an engine that can settle it.
 *  Checked the same way `authoring:new` checks a card: the claim has to match
 *  what the engine produces, and a disagreement is a hard reject rather than a
 *  warning. Sections that are not paradigms are skipped — `from` is a person
 *  label only when all six are, in order. */
async function checkParadigm(key: string, sec: RuleSection, spec: ParadigmSpec, out: Problem[]) {
  const pairs = sec.pairs ?? [];
  if (pairs.length !== 6) return;
  if (!pairs.every((p, i) => p.from === PERSON_ORDER[i])) return;

  const { verb, tense } = spec;
  const { conjugate } = await import('../../src/lib/conjugate.ts');
  const c = conjugate(verb);
  if (!c.reliable) { out.push({ key, kind: 'unverifiable-verb', detail: `${verb}: engine is not confident` }); return; }
  const forms = c[tense];
  pairs.forEach((p, i) => {
    const claimed = p.to.trim();
    const actual = forms[i];
    if (claimed !== actual) {
      out.push({ key: `${key} · ${sec.label ?? 'intro'}`, kind: 'wrong-form', detail: `${verb} ${tense} ${PERSON_ORDER[i]}: lesson says “${claimed}”, engine says “${actual}”` });
    }
  });
}

/** The class-6 lint: a body that leaves its claim no room to be false, and no
 *  `limit` saying where it stops. Not a proof — a machine cannot tell whether a
 *  grammar claim is true. It can tell when a claim is *phrased* the way the one
 *  that shipped wrong was phrased, which is worth failing a build over. */
/** Quoted material — «German» and "English glosses" — is *cited*, not claimed. The
 *  lint is about the assertions this app makes in its own voice, so a sentence
 *  reading `Where English says "all my friends", German often says «jeder»` is not
 *  an absolute about German and should not need an exemption to say so.
 *
 *  Stripped rather than exempted on purpose: 125 more lessons are coming, quoted
 *  glosses are everywhere in them, and an exemption per false positive is how a
 *  check ends up with more waivers than teeth. */
const stripQuoted = (t: string) => t.replace(/«[^»]*»/g, ' ').replace(/"[^"]*"/g, ' ').replace(/“[^”]*”/g, ' ');

/** Fixed English phrases where the trigger word is not a quantifier. "no article at
 *  all" is an intensifier; "above all" means chiefly; "first of all" is an ordinal.
 *  None of them makes a claim that could reject a German sentence.
 *
 *  Kept to an explicit, short list rather than anything clever — this is a hole in
 *  the check and every hole should be legible. If it grows past a dozen, the lint is
 *  probably testing the wrong thing. */
const IDIOMS = /\b(?:at all|above all|first of all|after all|all the same|all in all|not at all)\b/gi;

function checkAbsolutes(key: string, sec: RuleSection, out: Problem[]) {
  const text = stripQuoted(sec.body ?? '').replace(IDIOMS, ' ');
  if (!ABSOLUTES.test(text)) return;
  if (sec.limit) return;
  if (EXEMPT[`${key}::${sec.label ?? 'intro'}`]) return;
  const hit = text.match(ABSOLUTES)?.[0];
  // Name the section, not just the point: a point can hold several bodies and two
  // identical-looking errors are two trips back to the file to work out which is which.
  out.push({ key: `${key} · ${sec.label ?? 'intro'}`, kind: 'absolute-without-limit', detail: `“…${hit}…” — state where it stops, or soften it` });
}

/** `grammar-sections.ts` also writes `point.sections`. Nothing stopped both files
 *  claiming the same point, and whichever ran second would win — silently, with the
 *  loser's authoring still sitting in its source file looking applied. They do not
 *  overlap today; this is what keeps that true. */
function checkOverlap(out: Problem[]) {
  const other = readFileSync('scripts/corpus/grammar-sections.ts', 'utf8');
  const claimed = new Set<string>();
  for (const m of other.matchAll(/^\s*'([A-C][12]::[^']+)':/gm)) claimed.add(m[1]);
  for (const key of Object.keys(LESSONS)) {
    if (claimed.has(key)) {
      out.push({ key, kind: 'double-claimed', detail: 'grammar-sections.ts authors this point too — one of the two must give it up' });
    }
  }
}

/** A section has to render. `grammar.test.ts` has asserted this since it was
 *  written — and it caught an empty `pairs` right-hand side here, *after* the
 *  authoring had already been written into `grammar.json*. The test was doing its
 *  job; the feedback simply arrived a step too late.
 *
 *  Same check, moved left: a lesson that would not render is refused before it is
 *  applied rather than reported afterwards. Duplicating an assertion is worth it
 *  when it changes a bad write into a blocked one. */
/** The renderer supports `**strong**` and `*em*` in a body or a limit, and nothing
 *  else. Anything further is a structure question and belongs in a typed field —
 *  which is the whole premise of `RuleSection`. Rejected here so the concession
 *  cannot quietly widen into "the lessons are markdown now".
 *
 *  Also catches an unclosed mark, which is how the literal asterisks would come
 *  back one at a time. */
const UNSUPPORTED_MARKUP = /(`|~~|^\s*[-*+]\s|^\s*#{1,6}\s|\[[^\]]*\]\(|<[a-z]+>|_[^_]+_)/m;

function checkMarkup(key: string, sec: RuleSection, out: Problem[]) {
  for (const field of ['body', 'limit'] as const) {
    const v = sec[field];
    if (!v) continue;
    const where = `${key} · ${sec.label ?? 'intro'}`;
    if (UNSUPPORTED_MARKUP.test(v)) {
      out.push({ key: where, kind: 'unsupported-markup', detail: `${field}: only **strong** and *em* render — everything else prints literally` });
    }
    // An odd number of unpaired asterisks means one will reach the screen.
    const stripped = v.replace(/\*\*[^*]+\*\*/g, '').replace(/\*[^*]+\*/g, '');
    if (stripped.includes('*')) {
      out.push({ key: where, kind: 'stray-asterisk', detail: `${field}: an unclosed * would render as a literal asterisk` });
    }
  }
  // Fields the renderer prints verbatim must contain no marks at all.
  for (const raw of [...(sec.pairs ?? []).flatMap((p) => [p.from, p.to]), ...(sec.examples ?? []).flatMap((e) => [e.de, e.en])]) {
    if (raw && /\*/.test(raw)) {
      out.push({ key: `${key} · ${sec.label ?? 'intro'}`, kind: 'markup-in-verbatim', detail: 'pairs and examples are printed as-is — an asterisk there is an asterisk on screen' });
    }
  }
}

function checkRenderable(key: string, sec: RuleSection, out: Problem[]) {
  const where = `${key} · ${sec.label ?? 'intro'}`;
  const has = !!(sec.label || sec.body || sec.pairs?.length || sec.examples?.length);
  if (!has) { out.push({ key: where, kind: 'empty-section', detail: 'nothing to render' }); return; }
  for (const pr of sec.pairs ?? []) {
    if (!pr.from?.trim() || !pr.to?.trim()) {
      out.push({ key: where, kind: 'half-pair', detail: `“${pr.from}” → “${pr.to}” — the arrow column needs both sides. Use \`examples\` for a list that is not a transformation.` });
    }
  }
  for (const ex of sec.examples ?? []) {
    if (!ex.de?.trim()) out.push({ key: where, kind: 'empty-example', detail: 'an example with no German in it' });
  }
}

async function lint(bank: Record<CEFR, GPoint[]>): Promise<Problem[]> {
  const out: Problem[] = [];
  checkOverlap(out);
  // Which verb a paradigm is about, per section label. Written here rather than
  // parsed out of the label, because guessing it from prose is the kind of clever
  // that fails silently on the one section that words it differently.
  const PARADIGM_VERB: Record<string, ParadigmSpec> = {
    'sein — to be': { verb: 'sein', tense: 'praesens' },
    'haben — to have': { verb: 'haben', tense: 'praesens' },
    'spielen → spiel- + ending': { verb: 'spielen', tense: 'praesens' },
    'können — the shape they all share': { verb: 'können', tense: 'praesens' },
    'war — was / were': { verb: 'sein', tense: 'praeteritum' },
    'hatte — had': { verb: 'haben', tense: 'praeteritum' },
    'The forms — note the umlaut': { verb: 'lassen', tense: 'praesens' },
  };

  for (const [key, fix] of Object.entries(RULE_FIXES)) {
    const [level, title] = key.split('::') as [CEFR, string];
    const point = (bank[level] ?? []).find((p) => p.title === title);
    if (!point) { out.push({ key, kind: 'no-such-point', detail: 'rule fix targets a point that does not exist' }); continue; }
    // Already applied is fine and silent — this has to be idempotent.
    if (point.rule !== fix.from && point.rule !== fix.to) {
      out.push({ key, kind: 'rule-drifted', detail: `expected to find:\n      ${fix.from}\n      but the bank holds:\n      ${point.rule}` });
    }
  }

  for (const [key, secs] of Object.entries(LESSONS)) {
    const [level, title] = key.split('::') as [CEFR, string];
    const point = (bank[level] ?? []).find((p) => p.title === title);
    if (!point) { out.push({ key, kind: 'no-such-point', detail: 'no point in the bank with this level+title' }); continue; }
    for (const sec of secs) {
      checkRenderable(key, sec, out);
      checkMarkup(key, sec, out);
      checkAbsolutes(key, sec, out);
      const spec = sec.label ? PARADIGM_VERB[sec.label] : undefined;
      if (spec) await checkParadigm(key, sec, spec, out);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------

const bank = JSON.parse(readFileSync(PATH, 'utf8')) as Record<CEFR, GPoint[]>;
const problems = await lint(bank);

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const p of problems) console.error(`  [${p.kind}] ${p.key}\n      ${p.detail}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ lint clean — ${Object.keys(LESSONS).length} lessons`);

if (checkOnly) process.exit(0);

// ---- apply ----------------------------------------------------------------
let changed = 0;
for (const [key, fix] of Object.entries(RULE_FIXES)) {
  const [level, title] = key.split('::') as [CEFR, string];
  const point = (bank[level] ?? []).find((p) => p.title === title)!;
  if (point.rule !== fix.from) continue;   // already applied
  changed++;
  console.log(`\n${key} — rule`);
  console.log(`  ${fix.why}`);
  console.log(`  - ${fix.from}`);
  console.log(`  + ${fix.to}`);
  if (write) point.rule = fix.to;
}
for (const [key, secs] of Object.entries(LESSONS)) {
  const [level, title] = key.split('::') as [CEFR, string];
  const point = (bank[level] ?? []).find((p) => p.title === title)!;
  const before = JSON.stringify(point.sections ?? null);
  const after = JSON.stringify(secs);
  if (before === after) continue;
  changed++;
  console.log(`\n${key}`);
  console.log(`  sections: ${point.sections?.length ?? 0} → ${secs.length}`);
  if (write) point.sections = secs;
}

if (!changed) { console.log('\nNothing to apply — the bank already matches.'); process.exit(0); }
if (write) {
  writeFileSync(PATH, JSON.stringify(bank, null, 2) + '\n');
  console.log(`\n✓ wrote ${changed} lesson${changed === 1 ? '' : 's'} to ${PATH}`);
  console.log('  next: npm test && npm run corpus:validate');
} else {
  console.log(`\n${changed} lesson${changed === 1 ? '' : 's'} would change. Re-run with --write to apply.`);
}
