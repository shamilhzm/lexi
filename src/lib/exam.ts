// Exam practice — a real certificate paper, sat under real conditions.
//
// The backlog has carried "exam alignment without an exam simulator" (#43) for
// months on the grounds that Goethe/telc B1 is the most-taken certificate in the
// category and the app knew a learner's level, pace and weak modes and never
// once said "your weakest area *for B1* is Kasus". This is the other half: the
// paper itself.
//
// ## The format is telc's; the content is ours
//
// Every structural number here — item ranges, options per gap, points per item,
// what is heard once and what is heard twice, the 60% floor on each half — is
// taken from telc's own published Übungstest for Zertifikat Deutsch / telc
// Deutsch B1, so a sitting in Lexi weighs the same as a sitting in a Prüfungs-
// zentrum. **None of telc's texts, adverts, letters or items are reproduced.**
// The reading passages, adverts, cloze letters, listening scripts and speaking
// material are authored for Lexi. Copying a published paper would also be the
// pedagogically worse option: a learner who has memorised Übungstest 1 has
// learned Übungstest 1.
//
// ## What is scored honestly, and what is not
//
// Reading, Sprachbausteine and Hören are objectively scored: one key per item,
// no interpretation. Schriftlicher Ausdruck and the mündliche Prüfung are
// **self-assessed against telc's own published criteria**, and the result screen
// says so on its face. This follows the ruling already recorded in the backlog
// for extended production — free composition cannot be graded honestly without a
// model, and a drill that marks correct German wrong is worse than no drill. So
// the app hands the learner the same A/B/C/D grid the two examiners use, shows
// worked model answers at three strengths, and refuses to pretend the number it
// prints is a machine's judgement.
import type { CEFR } from '../types.ts';

// ---- the paper -------------------------------------------------------------

export type Provider = 'telc' | 'goethe';
export type Subtest = 'reading' | 'language' | 'listening' | 'writing' | 'speaking';

/** One answerable item. `answer` is a letter key ('a'…'o', 'x') or 'r'/'f'. */
export interface Item {
  n: number;
  answer: string;
  /** Why that key is right — shown in review, never before. This is the part a
   *  photocopied Modellsatz cannot give you. */
  why?: string;
}

export interface Opt { k: string; text: string }

interface PartBase {
  id: string;
  subtest: Subtest;
  teil: number;
  /** "Leseverstehen, Teil 1" — the label the real paper prints. */
  label: string;
  /** telc's own name for the sub-skill: Globalverstehen, Detailverstehen… */
  skill: string;
  /** The German rubric, in the register the real paper uses. */
  rubric: string;
  /** …and what it is asking, for an English-base learner under time pressure. */
  rubricEn: string;
  pointsPerItem: number;
  items: Item[];
}

/** Match each numbered item to one lettered option.
 *
 *  telc B1's Leseverstehen Teil 1 (five texts, ten headings, five distractors) and
 *  Goethe A2's Hören Teil 2 (five slots, nine options, each usable once, heard) are
 *  the same task over different stimuli — so the audio is optional here too, and
 *  `once` marks the variants where an option may not be reused. */
export interface MatchPart extends PartBase {
  kind: 'match';
  options: Opt[];
  texts: { n: number; body: string }[];
  audio?: AudioBlock;
  /** Each option may be used only once — the A2 variant. */
  once?: boolean;
}

/** Multiple choice over something you read or hear.
 *
 *  Generalised past telc B1's "one article, five questions" when the Goethe A1
 *  paper landed: A1's Hören Teil 1 and 3 are three-way multiple choice over short
 *  *dialogues*, and its Lesen Teil 2 is a two-way choice between a pair of small
 *  adverts. Same item shape, three different stimuli — so the stimulus is
 *  optional and independent rather than baked in.
 *
 *  Exactly one of `passage`, `audio` or per-question `stimulus` carries the text. */
export interface McPart extends PartBase {
  kind: 'mc';
  passage?: { title: string; standfirst?: string; paras: string[] };
  /** Present when the stimulus is heard rather than read. */
  audio?: AudioBlock;
  questions: {
    n: number;
    stem: string;
    options: Opt[];
    /** A per-item stimulus — the pair of adverts in Goethe A1 Lesen Teil 2. */
    stimulus?: { label: string; body: string }[];
  }[];
}

/** A track set, heard a fixed number of times. Shared by the listening parts. */
export interface AudioBlock {
  plays: 1 | 2;
  intro?: string;
  /** One block per track: separate short texts, or a single long conversation. */
  tracks: { n?: number; label: string; lines: { who?: string; text: string }[] }[];
}

/** Teil 3 reading: ten situations, twelve adverts, each usable once — and one
 *  situation that nothing fits, answered with `x`. The `x` is the whole point of
 *  the task and the item most candidates get wrong. */
export interface AdsPart extends PartBase {
  kind: 'ads';
  situations: { n: number; text: string }[];
  ads: { k: string; head: string; body: string }[];
}

/** Sprachbausteine. `mode: 'mc'` is the grammar cloze (three options a gap);
 *  `mode: 'bank'` is the vocabulary cloze (fifteen words, ten gaps, each once).
 *  The body carries `[[21]]` markers where the gaps are. */
export interface ClozePart extends PartBase {
  kind: 'cloze';
  mode: 'mc' | 'bank';
  intro?: string;
  body: string;
  /** mc only — the three options for each gap, keyed by item number. */
  options?: Record<number, Opt[]>;
  /** bank only — the fifteen words, printed in the box as the paper prints them. */
  bank?: Opt[];
}

/** Richtig/Falsch. Heard when `audio` is present — no recording ships, so the
 *  script is spoken by the app's German voice and `plays` is the exam's own count,
 *  enforced. Read when it is absent: Goethe A1's Lesen Teil 1 and 3 are the same
 *  item shape over emails and public notices. */
export interface TfPart extends PartBase {
  kind: 'tf';
  intro: string;
  /** What the two buttons say. telc prints *richtig / falsch*; Goethe A2's Hören
   *  Teil 4 prints *Ja / Nein*, and showing the wrong pair is the kind of small
   *  infidelity that makes a practice paper feel like a different exam. */
  labels?: [string, string];
  audio?: AudioBlock;
  /** The read stimulus, when there is no audio. */
  texts?: { label?: string; body: string }[];
  statements: { n: number; text: string }[];
}

export type Part = MatchPart | McPart | AdsPart | ClozePart | TfPart;

/** A worked answer at one strength. Three per prompt: the safe one, the one that
 *  passes, and the one that pulls the mark up. */
export interface Model {
  /** The *language* level of this version of the answer, not a mark. A B1 paper
   *  ladders A2/B1/B2; an A1 paper ladders A1/A2/B1. Always three, always
   *  answering the same question. */
  band: CEFR;
  label: string;
  /** What this version is doing differently, in one line. */
  note: string;
  /** The script itself. Multi-turn for the paired tasks. */
  lines: { who?: string; de: string; en: string }[];
}

export interface SpeakingPrompt {
  id: string;
  teil: 1 | 2 | 3;
  /** Teil 1 topic cue ("Name", "Wohnort") or the Teil 2/3 task title. */
  cue: string;
  /** The question as an examiner or a partner would put it. */
  de: string;
  en: string;
  models: Model[];
}

export interface SpeakingTopic {
  id: string;
  teil: 1 | 2 | 3;
  title: string;
  titleEn: string;
  /** The candidate's task sheet, in German, as the paper prints it. */
  task: string;
  taskEn: string;
  /** Teil 2 only: the two information sheets. A and B get **different** ones and
   *  have to summarise them to each other before the discussion starts — which is
   *  why practising this alone means reading both. */
  sheets?: { label: string; text: string; facts: string[] }[];
  /** Teil 3: the notes column on the planning sheet — every line has to be
   *  settled out loud. Teil 1: the three things candidates get wrong. */
  notes?: string[];
  minutes: string;
  prompts: SpeakingPrompt[];
}

export interface Redemittel {
  group: string;
  phrases: { de: string; en: string }[];
}

export interface WritingTask {
  id: string;
  /** The situation, then the letter you are answering. */
  situation: string;
  situationEn: string;
  letter: { from: string; body: string[] };
  /** The four Leitpunkte. Criterion I is nothing but these. */
  leitpunkte: { de: string; en: string }[];
  minutes: number;
  models: Model[];
}

export interface ExamPaper {
  id: string;
  provider: Provider;
  level: CEFR;
  title: string;
  /** One honest line about what this is. */
  blurb: string;
  /** Timed blocks, in the order the real exam runs them. */
  blocks: { partIds: string[]; minutes: number; label: string }[];
  parts: Part[];
  writing: WritingTask;
  speaking: SpeakingTopic[];
  redemittel: Redemittel[];
  /** Weighting and pass rule. Defaults to telc B1's when absent. */
  scheme?: Scheme;
  /** How the oral is run, in one parenthetical — "(paarweise, 20 Minuten
   *  Vorbereitung davor)". Six papers now disagree about this: A1 is a group with
   *  no preparation, B1/A2/B2/C1 are pairs, and C2 is a conversation with the
   *  examiner. The pre-exam summary was guessing it from `level === 'A1'`, which
   *  told a C2 candidate they would be sitting with a partner. */
  oralFormat?: string;
  /** Rename a subtest for this paper. Goethe C1 has no Sprachbausteine, but its
   *  Schreiben *Aufgabe 2* — rewrite a note as a formal letter, ten gaps, five
   *  points — is objectively scored and cannot live in the self-assessed writing
   *  slot without being wiped by it. It scores in `language` and says so under
   *  its own name rather than under telc's. */
  subtestLabels?: Partial<Record<Subtest, string>>;
  /** What to do about a weak subtest, in this paper's own terms. Generic study
   *  advice is worthless here — "Teil 3 is scanning, not comprehension" is only
   *  true of the paper that has that Teil — so the text lives with the paper and
   *  the result screen falls back to something level-agnostic when it is absent. */
  remedy?: Partial<Record<Subtest, string>>;
  /** Exam-day facts worth knowing the night before. */
  briefing: { q: string; a: string }[];
}

// ---- the mark scheme -------------------------------------------------------
// telc Deutsch B1, from the Übungstest's own "Punkte, Gewichtung und Benotung"
// table. Held here rather than in the paper so a second B1 paper cannot quietly
// disagree with the first about what a pass is.

export interface Scheme {
  reading: number;
  language: number;
  listening: number;
  writing: number;
  speaking: number;
  written: number;
  oral: number;
  total: number;
  /** The floor on each half, independently, and on the paper as a whole. telc B1
   *  sets 60% of both halves, which happens to imply its total; Goethe A1 has no
   *  oral floor at all and the whole rule lives in `total`. A scheme that sets
   *  only the halves to 0 would pass a blank sheet, so `total` is not optional. */
  pass: { written: number; oral: number; total: number };
  /** Modular exams — Goethe B2 and C2 — are not passed on a total at all. Each of
   *  the four modules needs 60% of *itself*, and a module you fail is the module
   *  you resit; the others keep. Non-modular papers leave this unset. */
  modular?: boolean;
  /** Grade bands, highest first: [floor, name]. */
  bands: [number, Note][];
}

/** The four modules of a modular paper, in the order the certificate prints them.
 *  `language` is not among them: no modular Goethe exam has a Sprachbausteine. */
export const MODULES: Subtest[] = ['reading', 'listening', 'writing', 'speaking'];

/** telc Deutsch B1 — from the Übungstest's own "Punkte, Gewichtung und Benotung". */
export const TELC_B1: Scheme = {
  reading: 75, language: 30, listening: 75, writing: 45, speaking: 75,
  written: 225, oral: 75, total: 300,
  pass: { written: 135, oral: 45, total: 180 },
  bands: [[270, 'sehr gut'], [240, 'gut'], [210, 'befriedigend'], [180, 'ausreichend']],
};

/** Goethe-Zertifikat A1 · Start Deutsch 1 — four skills of 25, scaled to 100,
 *  pass at 60. Neither half has a floor of its own: A1 is the one level where a
 *  strong written performance genuinely does carry a weak oral, so the whole rule
 *  is the total. */
export const GOETHE_A1: Scheme = {
  reading: 25, language: 0, listening: 25, writing: 25, speaking: 25,
  written: 75, oral: 25, total: 100,
  pass: { written: 0, oral: 0, total: 60 },
  bands: [[90, 'sehr gut'], [80, 'gut'], [70, 'befriedigend'], [60, 'ausreichend']],
};

/** Kept as the default so every existing call site and test reads unchanged. */
export const MAX = TELC_B1;
export const PASS = TELC_B1.pass;

export type Note = 'sehr gut' | 'gut' | 'befriedigend' | 'ausreichend' | 'nicht bestanden';

/** Grade bands, applied only once every half has cleared its floor. */
export function noteFor(total: number, passedWritten: boolean, passedOral: boolean,
                        scheme: Scheme = TELC_B1): Note {
  if (!passedWritten || !passedOral) return 'nicht bestanden';
  for (const [floor, name] of scheme.bands) if (total >= floor) return name;
  return 'nicht bestanden';
}

// ---- self-assessment -------------------------------------------------------
// The two productive parts, scored with the examiners' own grid. A/B/C/D, four
// criteria for speaking and three (plus two discretionary points) for the letter.

export type Band = 'A' | 'B' | 'C' | 'D';
export const BANDS: Band[] = ['A', 'B', 'C', 'D'];
const BAND_IX: Record<Band, number> = { A: 0, B: 1, C: 2, D: 3 };

export interface WritingMarks {
  /** I — were all four Leitpunkte covered? */
  leitpunkte: Band;
  /** II — order, linking, register, greeting and sign-off. */
  gestaltung: Band;
  /** III — syntax, morphology, spelling. */
  richtigkeit: Band;
  /** IV — up to two discretionary points, for range and for length. */
  extraRange: boolean;
  extraLength: boolean;
}

const WRITE_SCALE: number[] = [5, 3, 1, 0];

/**
 * Score the letter. `(I + II + III + extras) × 3`, as telc computes it.
 *
 * The two hard rules from the criteria sheet are enforced rather than described:
 * a D on criterion I or III zeroes the whole letter, and the discretionary points
 * cannot be awarded to a letter that already scored full marks or that scored C
 * or worse anywhere.
 */
export function scoreWriting(m: WritingMarks): number {
  if (m.leitpunkte === 'D' || m.richtigkeit === 'D') return 0;
  const base = WRITE_SCALE[BAND_IX[m.leitpunkte]]
    + WRITE_SCALE[BAND_IX[m.gestaltung]]
    + WRITE_SCALE[BAND_IX[m.richtigkeit]];
  const worseThanB = [m.leitpunkte, m.gestaltung, m.richtigkeit].some((b) => b === 'C' || b === 'D');
  const extras = (base === 15 || worseThanB) ? 0 : Number(m.extraRange) + Number(m.extraLength);
  return Math.min((base + extras) * 3, MAX.writing);
}

export interface SpeakingMarks {
  /** 1 Ausdrucksfähigkeit · 2 Aufgabenbewältigung · 3 Formale Richtigkeit ·
   *  4 Aussprache und Intonation. */
  expression: Band;
  task: Band;
  accuracy: Band;
  pronunciation: Band;
}

/** Teil 1 is worth 15, Teil 2 and Teil 3 are worth 30 each. */
const SPEAK_SCALE: Record<1 | 2 | 3, { main: number[]; pron: number[] }> = {
  1: { main: [4, 3, 1, 0], pron: [3, 2, 1, 0] },
  2: { main: [8, 6, 2, 0], pron: [6, 4, 2, 0] },
  3: { main: [8, 6, 2, 0], pron: [6, 4, 2, 0] },
};
export const SPEAK_MAX: Record<1 | 2 | 3, number> = { 1: 15, 2: 30, 3: 30 };

export function scoreSpeaking(teil: 1 | 2 | 3, m: SpeakingMarks): number {
  const s = SPEAK_SCALE[teil];
  return s.main[BAND_IX[m.expression]]
    + s.main[BAND_IX[m.task]]
    + s.main[BAND_IX[m.accuracy]]
    + s.pron[BAND_IX[m.pronunciation]];
}

// ---- scoring a sitting -----------------------------------------------------

/** What the learner put on the answer sheet: item number → letter key. */
export type Responses = Record<number, string>;

export interface PartScore {
  partId: string;
  label: string;
  subtest: Subtest;
  correct: number;
  answered: number;
  total: number;
  points: number;
  max: number;
}

export interface Result {
  parts: PartScore[];
  /** Points and maximum per subtest, including the two self-assessed ones. */
  bySubtest: Record<Subtest, { points: number; max: number }>;
  written: number;
  oral: number;
  total: number;
  passedWritten: boolean;
  passedOral: boolean;
  /** Modular papers only — one row per module, each passed or failed alone. Empty
   *  for the papers that are scored as a whole. */
  modules: { subtest: Subtest; points: number; max: number; need: number; passed: boolean }[];
  passed: boolean;
  note: Note;
  /** True while either productive part is still unmarked — the totals are then a
   *  floor, not a score, and the result screen must say so. */
  provisional: boolean;
}

export function scorePart(part: Part, responses: Responses): PartScore {
  let correct = 0;
  let answered = 0;
  for (const it of part.items) {
    const given = responses[it.n];
    if (given !== undefined && given !== '') answered++;
    if (given === it.answer) correct++;
  }
  return {
    partId: part.id,
    label: part.label,
    subtest: part.subtest,
    correct,
    answered,
    total: part.items.length,
    points: correct * part.pointsPerItem,
    max: part.items.length * part.pointsPerItem,
  };
}

/** Half-points are real here (2.5 an item in two parts, 1.25 in the Goethe
 *  papers), so points are carried **exact** and rounded once, at the totals a
 *  learner actually reads. Rounding each part first is how a perfect Goethe A2
 *  sheet came to 100.4 out of 100: four parts of 6.25 each rounded up to 6.3. */
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface Sitting {
  responses: Responses;
  writing?: WritingMarks;
  /** Marks per Teil of the oral, once self-assessed. */
  speaking?: Partial<Record<1 | 2 | 3, SpeakingMarks>>;
}

export function scoreExam(paper: ExamPaper, sitting: Sitting): Result {
  const scheme = paper.scheme ?? TELC_B1;
  const parts = paper.parts.map((p) => scorePart(p, sitting.responses));

  const bySubtest = {
    reading: { points: 0, max: scheme.reading },
    language: { points: 0, max: scheme.language },
    listening: { points: 0, max: scheme.listening },
    writing: { points: 0, max: scheme.writing },
    speaking: { points: 0, max: scheme.speaking },
  } satisfies Record<Subtest, { points: number; max: number }>;

  for (const p of parts) bySubtest[p.subtest].points += p.points;

  // The two self-assessed parts are marked on telc's grids — 15 points for the
  // letter, 15/30/30 for the oral — and then **scaled** to whatever this paper
  // says they are worth. Clamping instead (which is what this did) would have
  // made a B/B/B letter full marks on a 25-point scheme, because 27 clamps to 25.
  bySubtest.writing.points = sitting.writing
    ? scoreWriting(sitting.writing) / MAX.writing * scheme.writing : 0;

  // Which parts the oral *has* is the paper's business, not the engine's: telc B1
  // and Goethe A1/A2 run three, Goethe B2 upwards runs two.
  const sp = sitting.speaking ?? {};
  const teile = [...new Set(paper.speaking.map((t) => t.teil))].sort();
  const oralMax = teile.reduce((n, t) => n + SPEAK_MAX[t], 0) || 1;
  const oralRaw = teile.reduce((n, t) => n + (sp[t] ? scoreSpeaking(t, sp[t]!) : 0), 0);
  bySubtest.speaking.points = oralRaw / oralMax * scheme.speaking;

  const written = round1(bySubtest.reading.points + bySubtest.language.points
    + bySubtest.listening.points + bySubtest.writing.points);
  const oral = round1(bySubtest.speaking.points);
  const total = round1(written + oral);
  for (const k of Object.keys(bySubtest) as Subtest[]) {
    bySubtest[k].points = round1(bySubtest[k].points);
  }

  // A module you fail is a module you resit, so on a modular paper the total is
  // reported but decides nothing. Elsewhere the halves and the total all bind.
  const modules = scheme.modular
    ? MODULES.filter((s) => bySubtest[s].max > 0).map((s) => {
      const need = round1(0.6 * bySubtest[s].max);
      return { subtest: s, points: bySubtest[s].points, max: bySubtest[s].max, need,
        passed: bySubtest[s].points >= need };
    })
    : [];

  const passedWritten = written >= scheme.pass.written
    && modules.every((m) => m.subtest === 'speaking' || m.passed);
  const passedOral = oral >= scheme.pass.oral
    && modules.every((m) => m.subtest !== 'speaking' || m.passed);
  const passedTotal = scheme.modular || total >= scheme.pass.total;
  return {
    parts,
    bySubtest,
    written,
    oral,
    total,
    passedWritten,
    passedOral,
    modules,
    passed: passedWritten && passedOral && passedTotal,
    note: noteFor(total, passedWritten && passedTotal, passedOral, scheme),
    provisional: !sitting.writing || teile.some((t) => !sp[t]),
  };
}

// ---- the paper registry ----------------------------------------------------
// Papers are dynamic imports for the same reason `detail.json` is a second fetch:
// one B1 paper is ~90 KB of German prose that nothing on the boot path reads, and
// six levels of them would be most of the bundle. Nothing here is fetched until a
// learner opens the exam room.

export interface PaperMeta {
  id: string;
  provider: Provider;
  level: CEFR;
  title: string;
  blurb: string;
  minutes: number;
  load: () => Promise<ExamPaper>;
}

export const PAPERS: PaperMeta[] = [
  {
    id: 'telc-b1-01',
    provider: 'telc',
    level: 'B1',
    title: 'telc Deutsch B1 · Übungstest 1',
    blurb: 'A full paper in the real format — reading, Sprachbausteine, listening, a letter and the paired oral.',
    minutes: 150,
    load: () => import('../data/exams/telc-b1-01.ts').then((m) => m.PAPER),
  },
  {
    id: 'goethe-a1-01',
    provider: 'goethe',
    level: 'A1',
    title: 'Goethe-Zertifikat A1 · Start Deutsch 1',
    blurb: 'The whole A1 exam in Goethe’s format — 30 scored items, the short written message, '
      + 'and the three-part group oral with model answers at three levels.',
    minutes: 80,
    load: () => import('../data/exams/goethe-a1-01.ts').then((m) => m.PAPER),
  },
  {
    id: 'goethe-a2-01',
    provider: 'goethe',
    level: 'A2',
    title: 'Goethe-Zertifikat A2',
    blurb: 'The full A2 exam in Goethe’s format — 40 scored items across reading and listening, '
      + 'an SMS and an email, and the paired oral with model answers at three levels.',
    minutes: 105,
    load: () => import('../data/exams/goethe-a2-01.ts').then((m) => m.PAPER),
  },
  {
    id: 'goethe-b2-01',
    provider: 'goethe',
    level: 'B2',
    title: 'Goethe-Zertifikat B2',
    blurb: 'The reformed modular B2 — 40 scored items across five reading and four listening tasks, '
      + 'a forum post and a message, and the four-minute talk plus debate, with models at three levels.',
    minutes: 195,
    load: () => import('../data/exams/goethe-b2-01.ts').then((m) => m.PAPER),
  },
  {
    id: 'goethe-c1-01',
    provider: 'goethe',
    level: 'C1',
    title: 'Goethe-Zertifikat C1',
    blurb: 'The full C1 in Goethe’s format — 40 scored items plus the register task, a structured '
      + 'essay, and the oral’s talk-from-data and joint decision, with models at three levels.',
    minutes: 205,
    load: () => import('../data/exams/goethe-c1-01.ts').then((m) => m.PAPER),
  },
  {
    id: 'goethe-c2-01',
    provider: 'goethe',
    level: 'C2',
    title: 'Goethe-Zertifikat C2 · GDS',
    blurb: 'The Großes Deutsches Sprachdiplom in Goethe’s modular format — 40 items where the wrong '
      + 'answers are all things the text says, a 350-word Leserbrief, and the oral with the examiner.',
    minutes: 210,
    load: () => import('../data/exams/goethe-c2-01.ts').then((m) => m.PAPER),
  },
];

export function papersFor(level: CEFR): PaperMeta[] {
  return PAPERS.filter((p) => p.level === level);
}

const cache = new Map<string, Promise<ExamPaper>>();
/** Load a paper once per session. */
export function loadPaper(id: string): Promise<ExamPaper> {
  const meta = PAPERS.find((p) => p.id === id);
  if (!meta) return Promise.reject(new Error(`unknown paper: ${id}`));
  let p = cache.get(id);
  if (!p) { p = meta.load(); cache.set(id, p); }
  return p;
}

/** Split a cloze body on its `[[n]]` gap markers. */
export function clozeSegments(body: string): (string | number)[] {
  return body.split(/\[\[(\d+)\]\]/).map((s, i) => (i % 2 ? Number(s) : s));
}
