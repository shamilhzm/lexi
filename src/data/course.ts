// The course: A1 → C2, eight units a level, twelve at C1. See docs/COURSE.md for
// the reasoning; this file is the plan as data.
//
// ## What a unit is
//
// A **situation** (Beim Arzt, Die Besprechung) — thematic, not semantic, because
// the words of one situation help each other and a set of near-synonyms
// interferes (Tinkham 1997; TRAILS.md) — plus **one idea about how German works**
// that its film teaches. The idea is chosen because the situation needs it: you
// report symptoms with *müssen* and *sollen*, you read forms full of compounds.
//
// The unit's **words** are not hand-listed. They are the cards of its sectors at
// its level, commonest first, so the plan cannot drift from the corpus and every
// word is one the authoring gate verified. A film's own cards ride along.
//
// ## What a unit is not
//
// Not a gate: every unit at every level is open, the way the old syllabus path
// was ("nothing is locked"). Not a grade: the film never writes FSRS, and the
// unit's session is an ordinary Üben session over its words. Not a claim: a unit
// shows how many of its words you know, never that you "can" do the situation.
import { WORDS, WORDS_BY_SECTOR, SECTORS } from './index.ts';
import { freqRankOf } from '../lib/freq.ts';
import { FILM_BY_ID } from '../films/films.ts';
import type { Film } from '../films/types.ts';
import { ALL_LEVELS, type CEFR, type Word } from '../types.ts';

/** At C1, which kind of German a unit serves. The other levels have no strands. */
export type Strand = 'kern' | 'beruf' | 'hochschule';


export interface Unit {
  id: string;
  level: CEFR;
  /** German, as a course book would name it. */
  title: string;
  /** English, one line: the situation. */
  en: string;
  /** The idea about German the film teaches, in a few words. */
  focus: string;
  /** Where the unit's words come from — sector names, exactly as in sectors.json. */
  sectors: string[];
  /** Levels the words are drawn from. Defaults to the unit's own level. */
  levels?: CEFR[];
  film?: string;
  /** Cards the unit is built around, by term. They lead its session, as a film's
   *  cards do — for a unit whose subject is not a sector (modal particles are
   *  A1 words, mastered at C2). */
  terms?: string[];
  strand?: Strand;
  /** A C1 unit that teaches one skill in both settings, side by side. */
  bridge?: boolean;
}

const u = (level: CEFR, id: string, title: string, en: string, focus: string, sectors: string[],
  extra: Partial<Unit> = {}): Unit => ({ id, level, title, en, focus, sectors, ...extra });

export const COURSE: Unit[] = [
  // A1 — Erste Schritte
  u('A1', 'a1-hallo', 'Hallo!', 'Greetings and first words', 'der, die, das', ['Greetings', 'Everyday greetings and farewells', 'People', 'First words to learn'], { film: 'a1-artikel' }),
  u('A1', 'a1-familie', 'Familie', 'Family and friends', 'One noun, two forms: the plural', ['Family', 'People', 'Family relationships'], { film: 'a1-plural' }),
  u('A1', 'a1-essen', 'Essen und Trinken', 'Food and drink', 'Compound nouns', ['Food & drink', 'Restaurant & Dining'], { film: 'a1-komposita' }),
  u('A1', 'a1-wohnen', 'Meine Wohnung', 'Home and furniture', 'ein, eine: the article family', ['Home', 'Furniture', 'Housing & Room Search'], { film: 'a1-ein' }),
  u('A1', 'a1-tag', 'Mein Tag', 'Daily routine and time', 'The verb in position 2', ['Time', 'Days & dates', 'Basic time concepts', 'Core verbs'], { film: 'a1-position2' }),
  u('A1', 'a1-einkaufen', 'Einkaufen', 'Shopping and prices', 'einen: the accusative', ['Money & shopping', 'Clothing', 'Numbers'], { film: 'a1-akkusativ' }),
  u('A1', 'a1-freizeit', 'Freizeit', 'Free time', 'gern and können', ['Free time', 'Hobbies & leisure', 'Sport'], { film: 'a1-gern' }),
  u('A1', 'a1-stadt', 'In der Stadt', 'Around town', 'Questions: W-word, then verb', ['Town & travel', 'Directions', 'Transport & Mobility'], { film: 'a1-fragen' }),

  // A2 — Im Alltag
  u('A2', 'a2-arzt', 'Beim Arzt', 'At the doctor’s', 'müssen, sollen, dürfen', ['Health', 'Body & health', 'Doctor & patient', 'Ailments'], { film: 'a2-modal' }),
  u('A2', 'a2-beruf', 'Arbeit und Beruf', 'Jobs and workplaces', '-in: der Lehrer, die Lehrerin', ['Work', 'Work & profession'], { film: 'a2-in' }),
  u('A2', 'a2-wohnung', 'Wohnungssuche', 'Finding a flat', 'Compounds that name things', ['Housing & Room Search', 'Real Estate & Moving', 'Home'], { film: 'a2-komposita' }),
  u('A2', 'a2-gestern', 'Was hast du gemacht?', 'Talking about the past', 'Perfekt: haben or sein', ['Free time', 'Travel', 'Core verbs'], { film: 'a2-perfekt' }),
  u('A2', 'a2-feste', 'Feste und Feiern', 'Celebrations', 'Verbs with their preposition', ['Festivals & customs', 'Social life'], { film: 'a2-praepositionen' }),
  u('A2', 'a2-medien', 'Handy und Internet', 'Phones and the internet', 'Loanwords and false friends', ['Technology & Devices', 'Social Networks', 'Post & Communication'], { film: 'a2-falsch' }),
  u('A2', 'a2-reisen', 'Reisen', 'Travel', 'weil, dass: the verb goes last', ['Travel', 'Accommodation', 'City sightseeing'], { film: 'a2-weil' }),
  u('A2', 'a2-bank', 'Bank und Post', 'Banks, post and offices', 'be-, ver-, er-: prefixes that stay', ['At the bank', 'Administration', 'Services & Complaints'], { film: 'a2-praefixe' }),

  // B1 — Selbstständig
  u('B1', 'b1-bewerbung', 'Bewerbung', 'Applying for work', 'Nouns and their verbs', ['Work & career', 'Applying for Jobs', 'Work & Colleagues', 'Employment contract'], { film: 'b1-kollokationen' }),
  u('B1', 'b1-umwelt', 'Umwelt', 'The environment', '-ung, -heit, -keit: always die', ['Environment', 'Climate Change', 'Sustainable Lifestyle', 'Weather conditions'], { film: 'b1-endungen' }),
  u('B1', 'b1-bildung', 'Bildung', 'School, training, university', 'Word families', ['Education', 'School & Education System', 'University & study'], { film: 'b1-familien' }),
  u('B1', 'b1-gesund', 'Gesund leben', 'Healthy living', 'sich: reflexive verbs', ['Health & Prevention', 'Mental health concepts', 'Fitness and training'], { film: 'b1-reflexiv' }),
  u('B1', 'b1-konsum', 'Konsum', 'Shopping and advertising', 'One verb, many prefixes', ['Advertising & Consumption', 'Money & shopping', 'Personal finance'], { film: 'b1-praefixe' }),
  u('B1', 'b1-nachrichten', 'Nachrichten', 'Following the news', 'deshalb, trotzdem: connectors', ['News Media', 'Media Critique', 'Connectors'], { film: 'b1-konnektoren' }),
  u('B1', 'b1-gesellschaft', 'Zusammenleben', 'Neighbours and society', 'Relative clauses: der, die, das again', ['Society', 'Social life', 'Rules & Etiquette'], { film: 'b1-relativ' }),
  u('B1', 'b1-amt', 'Ämter und Formulare', 'Offices and forms', 'Long words, short parts', ['Administration', 'Migration & Integration', 'Emigration & immigration'], { film: 'b1-komposita' }),

  // B2 — Fließend
  u('B2', 'b2-arbeit', 'Arbeitswelt', 'The changing workplace', 'From verb to noun', ['Business & Workplace', 'Working Life', 'Work & Study', 'Digitalisation & Work'], { film: 'b2-nominal' }),
  u('B2', 'b2-wissenschaft', 'Wissenschaft und Technik', 'Science and technology', 'International endings', ['Science concepts', 'Technology', 'Science & Technology'], { film: 'b2-fremdwort' }),
  u('B2', 'b2-wirtschaft', 'Wirtschaft', 'Economy and finance', 'Describing change', ['Economy & Markets', 'Finance & Taxes', 'Financial Markets'], { film: 'b2-veraenderung' }),
  u('B2', 'b2-politik', 'Politik', 'Politics and elections', 'The passive: what happens', ['Politics', 'Elections', 'Democratic Structures'], { film: 'b2-passiv' }),
  u('B2', 'b2-meinung', 'Meinung', 'Opinions and debate', 'Phrases for an opinion', ['Opinion', 'Negotiation & Argument', 'Rhetoric & Debate'], { film: 'b2-meinung' }),
  u('B2', 'b2-energie', 'Energie und Klima', 'Energy and climate', 'Compounds for ideas', ['Energy & Resources', 'Environment', 'Climate Change'], { film: 'b2-komposita' }),
  u('B2', 'b2-gesundheit', 'Gesundheitssystem', 'The health system', 'Prepositions that belong to verbs', ['Healthcare System', 'Medical Treatment', 'Health'], { film: 'b2-dawort' }),
  u('B2', 'b2-kultur', 'Kunst und Kultur', 'Art and culture', 'Konjunktiv II: würde, hätte, könnte', ['Arts and culture', 'Music & Theatre', 'Literature', 'Visual Arts'], { film: 'b2-konjunktiv2' }),

  // C1 — Beruf und Hochschule, integrated: core, then each setting in turn, with bridges
  u('C1', 'c1-nominalstil', 'Nominalstil', 'How reports and papers sound', 'weil … → wegen …', ['Abstract', 'Academic Writing', 'Business Correspondence'], { strand: 'kern', film: 'c1-nominalstil' }),
  u('C1', 'c1-besprechung', 'Besprechung und Protokoll', 'Meetings and minutes', 'The words that run a meeting', ['Business & Workplace', 'Leadership & Teamwork', 'Office & Communication'], { strand: 'beruf', film: 'c1-besprechung' }),
  u('C1', 'c1-studium', 'Studium', 'Lectures, seminars, office hours', 'The words of a university', ['University & study', 'Education', 'School & Education System'], { strand: 'hochschule', levels: ['B2', 'C1'], film: 'c1-studium' }),
  u('C1', 'c1-fvg', 'Funktionsverbgefüge', 'Noun-verb expressions', 'eine Entscheidung treffen', ['Abstract', 'Legal Terms'], { strand: 'kern', film: 'c1-fvg' }),
  u('C1', 'c1-korrespondenz', 'Geschäftskorrespondenz', 'Business letters and complaints', 'The formal register', ['Business Correspondence', 'Services & Complaints'], { strand: 'beruf', film: 'c1-korrespondenz' }),
  u('C1', 'c1-hausarbeit', 'Wissenschaftlich schreiben', 'Writing a paper', 'Konjunktiv I for other people’s claims', ['Academic Writing', 'Academic Work', 'Knowledge & Truth'], { strand: 'hochschule', film: 'c1-hausarbeit' }),
  u('C1', 'c1-argument', 'Argumentieren', 'Arguing in a meeting and in a seminar', 'zwar … aber: conceding and countering', ['Argument & Thesis', 'Negotiation & Argument', 'Rhetoric & Debate'], { strand: 'kern', bridge: true, film: 'c1-argument' }),
  u('C1', 'c1-karriere', 'Karriere und Verhandlung', 'Career and negotiation', 'Negotiating politely', ['Career & Advancement', 'Applying for Jobs', 'Negotiation & Argument'], { strand: 'beruf', film: 'c1-verhandlung' }),
  u('C1', 'c1-referat', 'Referat und Diskussion', 'Presenting and discussing', 'Phrases that structure a talk', ['Rhetoric & Debate', 'Pragmatics & Communication', 'Argument & Thesis'], { strand: 'hochschule', film: 'c1-referat' }),
  u('C1', 'c1-grafik', 'Grafiken beschreiben', 'A chart at work and at university', 'steigen, sinken, stagnieren', ['Science concepts', 'Economy & Markets', 'Academic Work'], { strand: 'kern', bridge: true, film: 'c1-grafik' }),
  u('C1', 'c1-ethik', 'Wirtschaft und Verantwortung', 'Business, ethics and digital work', 'Abstract nouns of responsibility', ['Business Ethics', 'Global Economy', 'Digitalisation & Work'], { strand: 'beruf', film: 'c1-ethik' }),
  u('C1', 'c1-forschung', 'Forschung und Ethik', 'Research and its ethics', 'Hedging a claim', ['Research Ethics', 'Science & Public', 'Science & Technology'], { strand: 'hochschule', film: 'c1-forschung' }),

  // C2 — Nuance
  u('C2', 'c2-idiome', 'Redewendungen', 'Idioms', 'Pictures that mean something else', ['Idioms & Nuance'], { film: 'c2-idiome', levels: ['C1', 'C2'] }),
  u('C2', 'c2-register', 'Register', 'Casual, neutral, formal', 'kriegen, bekommen, erhalten', ['Core Vocabulary', 'Pragmatics & Communication'], { film: 'c2-register', levels: ['C1', 'C2'] }),
  u('C2', 'c2-wortbildung', 'Wortbildung', 'Prefixes and suffixes that carry meaning', '-bar and -los', ['Adjectives', 'Abstract'], { levels: ['C1', 'C2'], film: 'c2-suffixe' }),
  u('C2', 'c2-recht', 'Recht', 'The language of law', 'Legal compounds', ['Legal Terms', 'Political and legal philosophy'], { levels: ['C1', 'C2'], film: 'c2-recht' }),
  u('C2', 'c2-finanzen', 'Finanzwelt', 'Markets and the global economy', 'The register of finance', ['Financial Markets', 'Global Economy'], { levels: ['C1', 'C2'], film: 'c2-finanzen' }),
  u('C2', 'c2-wissenschaft', 'Wissenschaftssprache', 'Scientific German', 'Precision words', ['Science & Technology', 'Knowledge & Truth', 'Science concepts'], { levels: ['C1', 'C2'], film: 'c2-praezision' }),
  u('C2', 'c2-partikeln', 'Modalpartikeln', 'Small words that set the tone', 'doch, ja, mal, halt', ['Adverbs', 'Communication'],
    { levels: ['C1', 'C2'], terms: ['doch', 'ja', 'mal', 'halt', 'eben', 'denn', 'schon', 'wohl', 'eigentlich', 'bloß', 'ruhig', 'einfach'], film: 'c2-partikeln' }),
  u('C2', 'c2-stil', 'Stil und Ausdruck', 'Style and expression', 'Words for nuance', ['Aesthetic Concepts', 'Literature', 'Rhetoric & Debate'], { levels: ['C1', 'C2'], film: 'c2-stil' }),
];

export const UNIT_BY_ID = new Map(COURSE.map((x) => [x.id, x]));

/** How many words a unit teaches. Enough for one sitting, few enough to finish. */
export const UNIT_SIZE = 24;

/** The units of one level, in course order. At C1 that order **is** the
 *  integration: language schools split C1 into *Beruf* and *Hochschule* courses,
 *  and Lexi does not make the learner pick one. The shared core comes first, then
 *  a unit from each setting in turn, with bridge units that teach one skill in
 *  both — so every C1 learner meets the meeting room and the seminar, and the
 *  words that serve both are learnt once. */
export function unitsFor(level: CEFR): Unit[] {
  return COURSE.filter((x) => x.level === level);
}

/** A unit's words: the cards it leads with (its own, then its film's), then its
 *  sectors' cards at its levels, commonest first, skipping any in `skip`. */
export function unitWords(unit: Unit, lead: string[] = [], skip: Set<string> = new Set()): Word[] {
  const levels = new Set(unit.levels ?? [unit.level]);
  const out: Word[] = [];
  const seen = new Set<string>();
  const add = (w: Word | undefined) => { if (w && !seen.has(w.id)) { seen.add(w.id); out.push(w); } };
  for (const t of lead) add(cardByTerm(t));
  const pool = unit.sectors.flatMap((s) => WORDS_BY_SECTOR.get(s) ?? [])
    .filter((w) => levels.has(w.level) && !skip.has(w.id));
  const rank = (w: Word) => freqRankOf(w.id) ?? Number.MAX_SAFE_INTEGER;
  for (const w of [...pool].sort((a, b) => rank(a) - rank(b))) {
    if (out.length >= UNIT_SIZE) break;
    add(w);
  }
  return out;
}

/** The cards a unit names itself: its own `terms`, then its film's — except a
 *  film's scaffolding. The compound film builds *Haustür* out of *Haus* and *Tür*,
 *  and the FVG film sets *fragen* beside *eine Frage stellen*; a B1 or C1 session
 *  should teach the new word, not re-serve the A1 one it was built from. So a
 *  film card more than one level below its unit is shown, never taught here. */
export function leadTerms(unit: Unit): string[] {
  const film = unit.film ? FILM_BY_ID.get(unit.film) : undefined;
  const floor = Math.min(...(unit.levels ?? [unit.level]).map((l) => ALL_LEVELS.indexOf(l))) - 1;
  const fromFilm = (film ? filmTerms(film) : []).filter((t) => ALL_LEVELS.indexOf(cardByTerm(t)!.level) >= floor);
  return [...(unit.terms ?? []), ...fromFilm];
}

let plan: Map<string, Word[]> | null = null;
let planFor: Word[] | null = null;
let planN = 0;
/** Every unit's words, assigned so that **no card is taught by two units** unless
 *  one of them names it. Sectors overlap — *Argument & Thesis* serves a meeting
 *  and a seminar alike — and drawn independently, Argumentieren and Karriere
 *  opened on the same three words. So units fill in course order, each taking
 *  the commonest cards no earlier unit has; a card a unit names (its `terms`, its
 *  film's) is always its own, even when an earlier unit had it — that is a film
 *  coming back to a word on purpose. Course order, so a unit's words are the same
 *  for every learner and every visit. */
function assignment(): Map<string, Word[]> {
  if (plan && planFor === WORDS && planN === WORDS.length) return plan;
  const taken = new Set<string>();
  plan = new Map();
  for (const u of COURSE) {
    const ws = unitWords(u, leadTerms(u), taken);
    for (const w of ws) taken.add(w.id);
    plan.set(u.id, ws);
  }
  planFor = WORDS;
  planN = WORDS.length;
  return plan;
}

/** Every card a film names, in the order it shows them. */
export function filmTerms(film: Film): string[] {
  const out: string[] = [];
  for (const b of film.beats) {
    if (b.kind === 'words') out.push(...b.terms);
    if (b.kind === 'gender' || b.kind === 'example' || b.kind === 'trap') out.push(b.term);
    if (b.kind === 'plural') out.push(...b.terms);
    if (b.kind === 'compound') out.push(...b.parts, b.whole);
    if (b.kind === 'pair') out.push(...b.left.items, ...b.right.items);
    if (b.kind === 'scale') for (const s of b.steps) if (s.term) out.push(s.term);
  }
  return out.filter((t) => !!cardByTerm(t));
}

/** The words a unit's session teaches. */
export function unitCards(unit: Unit): Word[] {
  return assignment().get(unit.id) ?? unitWords(unit, leadTerms(unit));
}

/** Sector names that exist — for the test that holds the plan to the corpus. */
export function knownSectors(): Set<string> { return new Set(SECTORS.map((s) => s.name)); }

let byTerm: Map<string, Word> | null = null;
let byTermFor: Word[] | null = null;
let byTermN = 0;
/** A card by its exact term (`der Tisch`), or by its article-stripped headword.
 *  Rebuilt when the lexicon grows — the learner's own words join `WORDS` in place. */
export function cardByTerm(term: string): Word | undefined {
  if (!byTerm || byTermFor !== WORDS || byTermN !== WORDS.length) {
    byTerm = new Map();
    for (const w of WORDS) {
      const k = w.term.toLowerCase();
      if (!byTerm.has(k)) byTerm.set(k, w);
    }
    for (const w of WORDS) {
      const k = w.term.replace(/^(der|die|das)\s+/i, '').toLowerCase();
      if (!byTerm.has(k)) byTerm.set(k, w);
    }
    byTermFor = WORDS;
    byTermN = WORDS.length;
  }
  return byTerm.get(term.toLowerCase());
}

/** Where a learner is in a level: the first unit whose words are not mostly known. */
export function nextUnit(units: Unit[], knownShare: (u: Unit) => number): Unit | undefined {
  return units.find((x) => knownShare(x) < 0.8) ?? units[units.length - 1];
}
