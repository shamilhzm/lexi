// Central configuration for the corpus pipeline. Every path, source URL, and
// tunable lives here so the pipeline is reproducible and a contributor can see
// the whole shape at a glance. Nothing here is app runtime code — it only runs
// at build time on a maintainer's machine (`npm run corpus:*`).
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // scripts/corpus
export const REPO_ROOT = resolve(HERE, '..', '..');

export const PATHS = {
  repoRoot: REPO_ROOT,
  corpusDir: HERE,
  raw: join(HERE, 'data', 'raw'),        // git-ignored cache of downloaded sources
  out: join(HERE, 'data', 'out'),        // git-ignored reports/intermediate artefacts
  fixtures: join(HERE, 'fixtures'),      // committed tiny samples for the self-test
  cefrReference: join(HERE, 'cefr-reference.tsv'),     // committed curated leveling (original)
  sectorReference: join(HERE, 'sector-reference.tsv'), // committed curated sector map (original)
  vocab: join(REPO_ROOT, 'public', 'data', 'vocab.json'),
  sectors: join(REPO_ROOT, 'public', 'data', 'sectors.json'),
  provenance: join(REPO_ROOT, 'public', 'data', 'provenance.json'),
  keyFile: join(REPO_ROOT, 'openrouter.key.local'),
};

/**
 * Raw sources. `url` documents where the file comes from; `file` is its cached
 * name under PATHS.raw. Any URL can be overridden with the matching env var so a
 * contributor can point at a newer corpus year without editing code. The bulk
 * dumps are NOT redistributed by this repo — only derived facts and attributed
 * glosses/examples land in vocab.json. See ATTRIBUTIONS.md.
 */
export const SOURCES = {
  // Leipzig Corpora Collection word-frequency list (CC BY 4.0). The archive holds
  // `*-words.txt` with `rank<TAB>word<TAB>frequency`. Any year/corpus works.
  frequency: {
    url: process.env.LEXI_FREQ_URL ??
      'https://downloads.wortschatz-leipzig.de/corpora/deu_news_2023_1M.tar.gz',
    file: 'leipzig-words.txt',
    license: 'CC BY 4.0',
  },
  // OpenSubtitles-derived spoken/subtitle frequency (Hermit Dave's FrequencyWords,
  // MIT). Surfaces everyday spoken vocabulary that a news corpus under-represents —
  // the key to growing A1/A2. Format: `word<space>count`. Counts are bare facts.
  frequencySpoken: {
    url: process.env.LEXI_FREQ_SPOKEN_URL ??
      'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt',
    file: 'opensubtitles-de.txt',
    license: 'MIT (Hermit Dave) — counts derived from OpenSubtitles/OPUS',
  },
  // Wiktextract / kaikki machine-readable English Wiktionary, German entries
  // (CC BY-SA 4.0 + GFDL). One JSON object per line: word, pos, senses[].glosses
  // (English), sounds[].ipa, forms[] (plural), tags/head_templates (gender).
  wiktextract: {
    url: process.env.LEXI_WIKT_URL ??
      'https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl',
    file: 'kaikki-de.jsonl',
    license: 'CC BY-SA 4.0 + GFDL',
  },
  // Tatoeba (CC BY 2.0 FR, some CC0). Three files joined to make de↔en pairs.
  tatoebaDe: {
    url: process.env.LEXI_TATOEBA_DE_URL ?? 'https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2',
    file: 'tatoeba-deu.tsv',
    license: 'CC BY 2.0 FR',
  },
  tatoebaEn: {
    url: process.env.LEXI_TATOEBA_EN_URL ?? 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2',
    file: 'tatoeba-eng.tsv',
    license: 'CC BY 2.0 FR',
  },
  tatoebaLinks: {
    url: process.env.LEXI_TATOEBA_LINKS_URL ?? 'https://downloads.tatoeba.org/exports/links.tar.bz2',
    file: 'tatoeba-links.csv',
    license: 'CC BY 2.0 FR',
  },
  // Optional local CEFR ground-truth reference: `lemma<TAB>level` (one per line).
  // NOT shipped or redistributed — used only to assign/verify levels (a bare
  // level fact isn't copyrightable). Drop a Goethe/telc/Profile-Deutsch–derived
  // TSV here if you have one; the pipeline runs without it.
  cefrReference: {
    url: process.env.LEXI_CEFR_URL ?? '(supply locally — see ATTRIBUTIONS.md)',
    file: 'cefr-reference.tsv',
    license: 'reference only — not redistributed',
  },
} as const;

/** Foundation-weighted target distribution summing to ~10,000 (Goal 4). */
export const LEVEL_TARGETS: Record<string, number> = {
  A1: 1200, A2: 2000, B1: 2800, B2: 2000, C1: 1300, C2: 700,
};

/**
 * Frequency-rank → CEFR band heuristic (leveling layer b). Ranks are 1-based on
 * the Leipzig list (1 = most frequent surface form). Frequency correlates with
 * level; edges are deliberately fuzzy so the LLM/reference layers can override
 * near a boundary. `maxRank` is inclusive.
 */
export const FREQ_BANDS: { level: string; maxRank: number }[] = [
  { level: 'A1', maxRank: 750 },
  { level: 'A2', maxRank: 2500 },
  { level: 'B1', maxRank: 6000 },
  { level: 'B2', maxRank: 13000 },
  { level: 'C1', maxRank: 30000 },
  { level: 'C2', maxRank: Number.MAX_SAFE_INTEGER },
];

/** kaikki/Wiktionary part-of-speech → the Word.pos vocabulary the app expects. */
// proper_noun/name are intentionally absent — entities aren't learnable vocab.
export const POS_MAP: Record<string, string> = {
  noun: 'noun', verb: 'verb', adj: 'adjective', adjective: 'adjective',
  adv: 'adverb', adverb: 'adverb', pron: 'pronoun', prep: 'preposition', prep_phrase: 'preposition',
  conj: 'conjunction', num: 'number', intj: 'interjection', particle: 'particle', phrase: 'phrase',
};
/** Allowed Word.pos for a newly-generated card (existing cards are left alone). */
export const ALLOWED_POS = new Set(Object.values(POS_MAP).concat('other'));

/** Coarse group each existing/added sector rolls up into (mirrors sectors.json). */
export const DEFAULT_GROUP = 'Miscellaneous';
export const DEFAULT_FIELD = 'Miscellaneous';

/** How many top frequency forms the coverage report scores (Goal 1). */
export const COVERAGE_TOP_N = 20000;
