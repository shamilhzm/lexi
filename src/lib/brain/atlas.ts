// The atlas — which patch of cortex a German word is filed under, and why.
//
// This is a map of the published literature, not a map of anyone's head. Nobody
// has been scanned. What the neuroscience does support is that semantic
// knowledge is *not* stored in one place: category-selective regions respond
// reliably to particular kinds of meaning, and a continuous semantic space tiles
// the cortex bilaterally (Huth et al. 2016). Filing 291 authored sectors into 16
// of those regions is an interpretation laid over that finding, and every region
// below carries the confidence tier it has actually earned.
//
// Why rules rather than a 291-row table: the corpus moves. Sectors get added,
// renamed and merged by `scripts/corpus/*`, and a table would silently drop each
// new one on the floor. Ordered patterns over the *normalised* name mean a new
// "Weather & Climate" lands in the same place "Weather conditions" already does,
// and the residual is a deliberate destination rather than an accident.
//
// Normalisation is not cosmetic. The corpus ships both `Festivals & Customs` and
// `Festivals & customs`, and `Colors` beside `Colours`; matching the raw string
// would scatter one concept across two regions.
import type { Word } from '../../types.ts';

/** Approximate MNI152 peak, in millimetres. Left hemisphere is negative x.
 *  These are the coordinates the cited work reports, rounded — they place the
 *  region, they do not claim millimetre precision. */
export type MNI = readonly [x: number, y: number, z: number];

/** How much weight the association actually bears.
 *  - `established`  — replicated, uncontroversial, meta-analysed.
 *  - `converging`   — several independent lines agree; details are argued over.
 *  - `illustrative` — a defensible reading, not a finding. Says so in the UI. */
export type Confidence = 'established' | 'converging' | 'illustrative';

export interface BrainRegion {
  id: string;
  /** Anatomical name, for the label. */
  name: string;
  /** The short form the 3D scene can fit. */
  short: string;
  /** What it does, in words a learner reads once and keeps. */
  blurb: string;
  /** What this region is doing *for the lexicon* — grouping for the rail. */
  role: 'form' | 'meaning' | 'memory' | 'control';
  mni: MNI;
  /** Rough spread of the cluster, in millimetres. Wider = more diffuse system. */
  spread: number;
  /** Fraction of this region's words drawn in the left hemisphere.
   *
   *  Not decoration, and not uniform. Language *form* is strongly left-lateralised
   *  in most right-handers — that is one of the oldest findings in the field —
   *  while Huth et al. (2016) found semantic categories tiling the cortex
   *  bilaterally and largely symmetrically. So Broca's runs left-heavy and the
   *  category regions sit near even, and the finished brain reads asymmetric at
   *  the front for a reason it can defend. */
  lateralization: number;
  /** `deep` structures are drawn inside the volume and seen through the cortex;
   *  `surface` ones are pulled out to the cortical shell. */
  depth: 'surface' | 'deep';
  confidence: Confidence;
  sources: string[];
}

/** Where a word lives before it is consolidated. Not a semantic category — a
 *  stage. Every New and Learning card sits here whatever it means. */
export const HIPPOCAMPUS = 'hip';

/** Abstract, heteromodal meaning — and the honest home for everything the rules
 *  do not claim. The angular gyrus is where the literature already puts abstract
 *  and cross-modal concepts, so the residual is a real destination rather than a
 *  bin. */
export const RESIDUAL = 'ag';

export const REGIONS: BrainRegion[] = [
  {
    id: 'ifg',
    name: 'Inferior frontal gyrus',
    short: "Broca's",
    blurb: 'Grammar and word form. The machinery that assembles a sentence rather than the meaning it carries.',
    role: 'form',
    mni: [-48, 18, 14],
    spread: 11,
    lateralization: 0.9,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Friederici (2011), Physiol Rev — the cortical language circuit',
      'Fedorenko et al. (2011), PNAS — functional specificity of the language network',
    ],
  },
  {
    id: 'pstg',
    name: 'Posterior superior temporal gyrus',
    short: "Wernicke's",
    blurb: 'Hearing words as words. Where a stream of sound becomes a form you recognise.',
    role: 'form',
    mni: [-54, -44, 12],
    spread: 12,
    lateralization: 0.88,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Hickok & Poeppel (2007), Nat Rev Neurosci — the dual-stream model',
      'Binder et al. (2009), Cereb Cortex — semantic system meta-analysis',
    ],
  },
  {
    id: 'smg',
    name: 'Supramarginal gyrus',
    short: 'Phonological loop',
    blurb: 'Holding an unfamiliar shape of sound long enough to learn it. Grey-matter density here tracks second-language proficiency.',
    role: 'memory',
    mni: [-52, -40, 36],
    spread: 10,
    lateralization: 0.85,
    depth: 'surface',
    confidence: 'converging',
    sources: [
      'Mechelli et al. (2004), Nature — structural plasticity from bilingualism',
      'Baddeley (2003), Nat Rev Neurosci — working memory and vocabulary acquisition',
    ],
  },
  {
    id: 'ag',
    name: 'Angular gyrus',
    short: 'Abstract meaning',
    blurb: 'Concepts with no shape, sound or place to hang them on. The most heteromodal part of the semantic system.',
    role: 'meaning',
    mni: [-45, -62, 30],
    spread: 13,
    lateralization: 0.7,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Binder et al. (2009), Cereb Cortex — semantic system meta-analysis',
      'Bonner et al. (2013), J Cogn Neurosci — abstract word representation',
    ],
  },
  {
    id: 'atl',
    name: 'Anterior temporal lobe',
    short: 'The hub',
    blurb: 'The amodal hub that binds a concept’s attributes into one thing. Damage here degrades meaning across every sense at once.',
    role: 'meaning',
    mni: [-40, -6, -30],
    spread: 12,
    lateralization: 0.6,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Patterson, Nestor & Rogers (2007), Nat Rev Neurosci — hub-and-spoke',
      'Lambon Ralph et al. (2017), Nat Rev Neurosci — the neural basis of semantic cognition',
    ],
  },
  {
    id: 'ffg',
    name: 'Fusiform gyrus',
    short: 'Living things',
    blurb: 'Animals, faces, bodies, colour. The ventral stream’s answer to “what am I looking at?”',
    role: 'meaning',
    mni: [-40, -50, -18],
    spread: 12,
    lateralization: 0.5,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Martin (2007), Annu Rev Psychol — the representation of object concepts',
      'Simmons et al. (2007), Neuropsychologia — colour knowledge in ventral temporal cortex',
    ],
  },
  {
    id: 'ppa',
    name: 'Parahippocampal place area',
    short: 'Places',
    blurb: 'Rooms, streets, landscapes, weather. Scene layout — the sense of somewhere rather than something.',
    role: 'meaning',
    mni: [-26, -46, -10],
    spread: 12,
    lateralization: 0.5,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Epstein & Kanwisher (1998), Nature — a cortical representation of local visual environment',
      'Huth et al. (2016), Nature — the "place" dimension of the cortical semantic map',
    ],
  },
  {
    id: 'pmc',
    name: 'Premotor cortex',
    short: 'Actions',
    blurb: 'Action verbs land on the strip that moves the body part they describe — kicking near the leg, grasping near the hand.',
    role: 'meaning',
    mni: [-42, -8, 46],
    spread: 13,
    lateralization: 0.55,
    depth: 'surface',
    confidence: 'converging',
    sources: [
      'Pulvermüller (2005), Nat Rev Neurosci — brain mechanisms linking language and action',
      'Hauk, Johnsrude & Pulvermüller (2004), Neuron — somatotopic action-word representation',
    ],
  },
  {
    id: 'pmtg',
    name: 'Posterior middle temporal gyrus',
    short: 'Tools & artefacts',
    blurb: 'Made things, and what you do with them. Manipulable objects recruit this alongside the motor system.',
    role: 'meaning',
    mni: [-52, -52, 2],
    spread: 11,
    lateralization: 0.65,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Martin (2007), Annu Rev Psychol — tool concepts in posterior temporal cortex',
      'Chao, Haxby & Martin (1999), Nat Neurosci — category-specific responses to tools',
    ],
  },
  {
    id: 'ips',
    name: 'Intraparietal sulcus',
    short: 'Number & space',
    blurb: 'Quantity, magnitude, and where things sit relative to each other. Counting and spatial relation share this cortex.',
    role: 'meaning',
    mni: [-34, -50, 48],
    spread: 12,
    lateralization: 0.5,
    depth: 'surface',
    confidence: 'established',
    sources: [
      'Dehaene et al. (2003), Cogn Neuropsychol — three parietal circuits for number',
      'Amalric & Dehaene (2016), PNAS — the mathematical network',
    ],
  },
  {
    id: 'ins',
    name: 'Insula',
    short: 'Taste & the body',
    blurb: 'Flavour and the sense of your own body from the inside. Food and health words share an interoceptive home.',
    role: 'meaning',
    mni: [-38, 4, -6],
    spread: 10,
    lateralization: 0.5,
    depth: 'deep',
    confidence: 'converging',
    sources: [
      'Craig (2009), Nat Rev Neurosci — interoception and the insula',
      'Khosla et al. (2022), Curr Biol / Jain et al. (2023), Nat Commun — food-selective ventral cortex',
    ],
  },
  {
    id: 'amy',
    name: 'Amygdala & ventromedial prefrontal cortex',
    short: 'Feeling',
    blurb: 'What a word is worth to you. Emotional and moral vocabulary carries a valence this circuit computes.',
    role: 'meaning',
    mni: [-22, -4, -18],
    spread: 11,
    lateralization: 0.5,
    depth: 'deep',
    confidence: 'converging',
    sources: [
      'Citron (2012), Brain Lang — emotion word processing',
      'Roy, Shohamy & Wager (2012), Trends Cogn Sci — vmPFC and valuation',
    ],
  },
  {
    id: 'tpj',
    name: 'Temporoparietal junction & dorsomedial prefrontal cortex',
    short: 'Other minds',
    blurb: 'People as people: intentions, institutions, politics, work. The social brain does the heavy lifting for this vocabulary.',
    role: 'meaning',
    mni: [-52, -56, 22],
    spread: 14,
    lateralization: 0.6,
    depth: 'surface',
    confidence: 'converging',
    sources: [
      'Saxe & Kanwisher (2003), NeuroImage — theory of mind and the TPJ',
      'Huth et al. (2016), Nature — the "social" and "professional" dimensions',
    ],
  },
  {
    id: 'stg',
    name: 'Superior temporal gyrus',
    short: 'Sound & story',
    blurb: 'Music, theatre, film, narrative. Structured sound and the comprehension of a story unfolding.',
    role: 'meaning',
    mni: [-58, -20, 6],
    spread: 12,
    lateralization: 0.5,
    depth: 'surface',
    confidence: 'converging',
    sources: [
      'Zatorre, Belin & Penhune (2002), Trends Cogn Sci — auditory cortex and music',
      'Lerner et al. (2011), J Neurosci — a temporal hierarchy for narrative',
    ],
  },
  {
    id: HIPPOCAMPUS,
    name: 'Hippocampus',
    short: 'New memory',
    blurb: 'Where a word lives before it belongs to you. Everything you have just met sits here, whatever it means, until repetition moves it out.',
    role: 'memory',
    mni: [-26, -22, -14],
    spread: 9,
    lateralization: 0.5,
    depth: 'deep',
    confidence: 'established',
    sources: [
      'McClelland, McNaughton & O’Reilly (1995), Psychol Rev — complementary learning systems',
      'Davis & Gaskell (2009), Phil Trans R Soc B — consolidation of novel spoken words',
    ],
  },
  {
    id: 'cau',
    name: 'Caudate nucleus',
    short: 'Switching',
    blurb: 'Choosing which of your languages to speak. Stimulating this region makes a bilingual switch tongue mid-sentence.',
    role: 'control',
    mni: [-14, 6, 12],
    spread: 8,
    lateralization: 0.5,
    depth: 'deep',
    confidence: 'converging',
    sources: [
      'Crinion et al. (2006), Science — language control in the bilingual brain',
      'Abutalebi & Green (2007), J Neurolinguistics — bilingual language control',
    ],
  },
];

export const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));

/** Lowercase, strip punctuation to spaces, collapse runs. `Festivals & customs`
 *  and `Festivals & Customs` are one sector as far as the atlas is concerned. */
export function normSector(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Ordered. First match wins, so the conflicts are resolved here rather than
// argued about at every call site. The order that matters, with the reasoning:
//
//  - verbs before everything: "Intermediate everyday verbs" is a verb list that
//    happens to be filed under Arts, and it belongs on the motor strip.
//  - ethics before work: "Business Ethics" is moral vocabulary wearing a suit.
//  - film before festival: "Films & festivals" is cinema, "Festivals & Customs"
//    is cultural practice, and they part company here.
//  - L2-learning before politics before plain language: "Language Acquisition"
//    is how you learn, "Language Policy" is who decides, "Language" is neither.
//  - clothing before shop: a Kleiderladen is full of artefacts, not of retail.
//
// Every stem below is a *prefix*: `\b(?:animal)` deliberately matches "Animals",
// and `\b(?:work)` matches "Working Life". An earlier draft wrote these as
// `\b(?:animal|work)\b` and the trailing boundary silently broke every plural
// and every inflection in the file — "Animals" fell past the fusiform rule to a
// group fallback, "Communication" never reached Wernicke's, "Working Life"
// landed in the residual. Stems that are a prefix of an unrelated word are
// anchored on their own: `art` inside "artificial", `care` inside "career".
const RULES: [region: string, pattern: RegExp][] = [
  // Form and function — the closed class, and the machinery around it.
  ['ifg', /\b(?:grammar|connector|conjunction|modal verb|pronoun|question word|preposition)|\b(?:article)s?\b/],
  ['pmc', /\bverbs?\b/],
  ['atl', /\b(?:adjectiv|adverb|aesthetic|connotation|fine distinction|taste and judgement)/],

  // Learning, and the vocabulary of studying. This is a study app: the words for
  // how you learn earn a cluster where learning happens. Ahead of the motor rule
  // because "Studies & Training" and "School & Training" are education, and
  // `training` would otherwise send them to the gym.
  ['smg', /\b(?:exam|acquisition|linguistic|multilingual|learning language|language learning|lifelong|first word|study session|academic|studies|studying|school|universit|educat|pupil|student|abroad)/],

  // Action and the body in motion.
  ['pmc', /\b(?:sport|fitness|training|exercise|ski|snowboard|swim|athlet)/],

  // Activities done for their own sake. Ahead of the parietal rule on purpose:
  // "Free time" is leisure, and `time` would otherwise file it under the clock.
  ['pmc', /\b(?:game|hobb|leisure|free time|weekend|excursion)/],

  // Evaluation — moral and emotional weight, wherever the corpus files it.
  ['amy', /\b(?:emotion|feeling|ethic|moral|guilt|virtue|opinion|judgement|judgment|responsib|value|norm|luck|decision)/],

  // Cinema, ahead of the social rule: "Films & festivals" is a film festival,
  // while "Festivals & Customs" is cultural practice, and `festival` alone
  // cannot tell them apart.
  ['stg', /\b(?:film|cinema|movie)/],

  // Other minds, institutions, and the social world — including working life,
  // which is institutional before it is anything else. This is the atlas's
  // loosest join and docs/BRAIN.md says so.
  ['tpj', /\b(?:social|societ|politic|polic|civic|civil|democra|election|govern|administrat|legal|justice|migrat|emigrat|immigrat|integration|intercultur|identity|demographic|generation|religio|power|authorit|militar|news media|media critique|propaganda|manipulation|populis|histor|festival|custom|etiquette|politeness|address|invitation|volunteer|engagement|inequalit|development|charit|advertis|consumption|interculturalit)|\b(?:law|report)s?\b/],
  ['tpj', /\b(?:work|job|career|employ|business|compan|colleague|profession|office|leadership|teamwork|negotiat|applicat|corresponden|complaint|service|contract|department)/],

  // Discourse you produce: argument structure, not audience modelling.
  ['ifg', /\b(?:rhetoric|debate|argument|thesis|persuas|critique|rebuttal|register|narrative technique|scientific language|oral presentation|sources and evidence)|\b(?:style)s?\b/],

  // Number, magnitude, and spatial relation — the parietal pair.
  ['ips', /\b(?:number|numeral|quantit|math|money|bank|financ|econom|tax|price|cost|cash|market|shopping|spatial|time|date|day|month|season|clock|hour)/],

  // Places, scenes, and the outdoors.
  ['ppa', /\b(?:home|apartment|building|hous|living|room|urban|city|town|street|travel|countr|nation|direction|orientation|sightsee|tourist|accommodat|overnight|transport|mobilit|traffic|trip|border|commut|landscape|nature|environment|weather|climate|sustainab|energy|resource|farm|agricultur|real estate|moving|location|everyday life|daily life|laundry|europe|around town)/],

  // Living things, faces, colour. Anchored `^body$` so the bare sector goes to
  // the body map while "Body & health" carries on to the insula.
  ['ffg', /\b(?:animal|creature|bird|fish|plant|colou?r|face|people|person|famil|body part|the body)|^body$/],

  // Taste, and the body sensed from the inside.
  ['ins', /\b(?:food|drink|beverage|dining|restaurant|eat|cook|meal|taste|oktoberfest|health|body|illness|ailment|sick|doctor|medic|treatment|pharmac|wellbeing|prevention|therap|hospital|beschwerden)|\b(?:care)\b/],

  // Made things.
  ['pmtg', /\b(?:clothing|clothes|dress|shoe|technolog|technic|device|digital|artificial intelligence|comput|machine|tool|furniture|object|material|equipment)|\bai\b/],

  // Structured sound, and stories told in time.
  ['stg', /\b(?:music|theatre|theater|song|opera|film|cinema|literature|book|poem|stor|fairy tale|motif|symbol|aesthetic|visual art|media|entertain|event)|\b(?:art)s?\b/],

  // Word forms and the act of speaking.
  ['pstg', /\b(?:core vocabulary|communicat|phrase|greeting|farewell|conversation|speaking|listening|pragmatic|idiom|language|word|vocabulary|contact|post)/],

  // Abstractions with nothing to hang them on.
  ['ag', /\b(?:abstract|knowledge|truth|consciousness|being|method|model|theor|concept|philosoph|scien|research|future|forecast|scenario|challenge|system|distinction|limit)/],
];

/** The fine corpus group a sector belongs to decides where it lands when no rule
 *  claims it. Keyed on `SectorMeta.group` as it ships in `sectors.json` — i.e.
 *  *before* `GROUP_SUPER` in `src/data/index.ts` rolls it up to the ten market
 *  categories, which is why the app must pass `SECTOR_FINEGROUP`, not `group`. */
const GROUP_FALLBACK: Record<string, string> = {
  'Arts, Media & Leisure': 'stg',
  'Core Vocabulary': 'pstg',
  'Education & Language': 'smg',
  'Feelings & Relationships': 'amy',
  'Food & Drink': 'ins',
  Grammar: 'ifg',
  'Health & Body': 'ins',
  'Home & Daily Life': 'ppa',
  'Language Building Blocks': 'ifg',
  Miscellaneous: RESIDUAL,
  'Nature & Environment': 'ppa',
  'Shopping & Clothing': 'pmtg',
  'Society & Politics': 'tpj',
  'Tech & Science': 'pmtg',
  'Travel & Transport': 'ppa',
  'Work & Economy': 'tpj',
};

const cache = new Map<string, string>();

/** Which region a sector's words are filed under. Total by construction: an
 *  unmatched sector in an unknown group still lands in the angular gyrus. */
export function regionForSector(sector: string, fineGroup?: string): string {
  const key = `${sector} ${fineGroup ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const n = normSector(sector);
  // `matched` is tracked separately from the value on purpose. `ag` is both a
  // real rule outcome (abstract nouns, "Knowledge & Truth") and the residual
  // sentinel, so testing `out === RESIDUAL` to decide whether to fall back sent
  // every legitimately-abstract sector to its group instead — "Science concepts"
  // to tools, "Abstract" to Broca's.
  let out = RESIDUAL;
  let matched = false;
  for (const [region, pattern] of RULES) {
    if (pattern.test(n)) { out = region; matched = true; break; }
  }
  if (!matched && fineGroup) out = GROUP_FALLBACK[fineGroup] ?? RESIDUAL;

  cache.set(key, out);
  return out;
}

/** Which region a card is filed under — its *home*, where it ends up once it is
 *  consolidated. Where it is drawn right now is a separate question, answered by
 *  `consolidation.ts`: until a word is learned it sits in the hippocampus
 *  regardless of what it means.
 *
 *  Grammar cards go to Broca's whatever their sector claims, and the `gym:`
 *  direction drills go to the caudate: neither is a topic, both are a mode. */
export function regionForWord(w: Word, fineGroup?: string): string {
  if (w.kind === 'grammar') return 'ifg';
  return regionForSector(w.field, fineGroup);
}

/** Card ids are namespaced (`voc:`, `gram:`, `gex:`, `gym:`, `usr:`) — see
 *  `src/store.ts`. The drill modes are the one namespace that is about switching
 *  between your two languages rather than about meaning. */
export function regionForCardId(id: string, w?: Word, fineGroup?: string): string {
  if (id.startsWith('gym:')) return 'cau';
  if (id.startsWith('gram:') || id.startsWith('gex:')) return 'ifg';
  return w ? regionForWord(w, fineGroup) : RESIDUAL;
}
