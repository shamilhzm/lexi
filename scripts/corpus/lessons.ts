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

/** A paradigm written as six `{ from: person, to: form }` pairs is a *factual
 *  claim about a verb*, and the app already owns an engine that can settle it.
 *  Checked the same way `authoring:new` checks a card: the claim has to match
 *  what the engine produces, and a disagreement is a hard reject rather than a
 *  warning. Sections that are not paradigms are skipped — `from` is a person
 *  label only when all six are, in order. */
async function checkParadigm(key: string, sec: RuleSection, verb: string, out: Problem[]) {
  const pairs = sec.pairs ?? [];
  if (pairs.length !== 6) return;
  if (!pairs.every((p, i) => p.from === PERSON_ORDER[i])) return;

  const { conjugate } = await import('../../src/lib/conjugate.ts');
  const c = conjugate(verb);
  if (!c.reliable) { out.push({ key, kind: 'unverifiable-verb', detail: `${verb}: engine is not confident` }); return; }
  pairs.forEach((p, i) => {
    const claimed = p.to.trim();
    const actual = c.praesens[i];
    if (claimed !== actual) {
      out.push({ key, kind: 'wrong-form', detail: `${verb} ${PERSON_ORDER[i]}: lesson says “${claimed}”, engine says “${actual}”` });
    }
  });
}

/** The class-6 lint: a body that leaves its claim no room to be false, and no
 *  `limit` saying where it stops. Not a proof — a machine cannot tell whether a
 *  grammar claim is true. It can tell when a claim is *phrased* the way the one
 *  that shipped wrong was phrased, which is worth failing a build over. */
function checkAbsolutes(key: string, sec: RuleSection, out: Problem[]) {
  const text = `${sec.body ?? ''}`;
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

async function lint(bank: Record<CEFR, GPoint[]>): Promise<Problem[]> {
  const out: Problem[] = [];
  checkOverlap(out);
  // Which verb a paradigm is about, per section label. Written here rather than
  // parsed out of the label, because guessing it from prose is the kind of clever
  // that fails silently on the one section that words it differently.
  const PARADIGM_VERB: Record<string, string> = {
    'sein — to be': 'sein',
    'haben — to have': 'haben',
    'spielen → spiel- + ending': 'spielen',
    'können — the shape they all share': 'können',
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
      checkAbsolutes(key, sec, out);
      const verb = sec.label ? PARADIGM_VERB[sec.label] : undefined;
      if (verb) await checkParadigm(key, sec, verb, out);
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
