// Normalize enriched inputs into schema-valid Word cards (Goal 5). Mirrors the
// app's own Word card shape: nouns carry their article on the term and require a
// gender; every card needs a gloss and (unless
// examples are made optional) at least one translated example. Malformed inputs
// are dropped with a reason rather than shipped.
import { ALLOWED_POS } from './config.ts';
import { cardId, type Word, type Provenance } from './lib.ts';

export interface CardInput {
  lemma: string;                 // bare headword (no article)
  pos: string;                   // already mapped to Word.pos
  gender: 'der' | 'die' | 'das' | null;
  plural: string | null;         // bare nominative plural (no article)
  ipa: string | null;
  gloss: string | null;          // English
  level: string;
  levelSource: Provenance['levelSource'];
  freqRank: number | null;
  field: string;
  fieldSource: Provenance['fieldSource'];
  glossSource: string;
  factsSource: string;
  examples: { de: string; en: string; source: string }[];
}

export type BuildResult = { ok: true; card: Word; prov: Provenance } | { ok: false; reason: string };

const TERM_RE = /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß .'-]*$/;

/** Tidy a raw Wiktionary gloss into a short card headline: drop parenthetical
 *  asides ("(see derived terms)", "(only in combination…)") and keep the first
 *  clause. Keeps cards readable without inventing meaning. */
function cleanGloss(raw: string): string {
  return raw
    .replace(/\s*\([^)]*\)/g, '')   // parenthetical notes
    .split(/\s*[;]\s*/)[0]          // first clause only
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCard(input: CardInput, opts: { requireExample?: boolean } = {}): BuildResult {
  const requireExample = opts.requireExample ?? true;
  const lemma = input.lemma.trim();
  if (!lemma || !TERM_RE.test(lemma)) return { ok: false, reason: 'bad-term' };
  if (!ALLOWED_POS.has(input.pos)) return { ok: false, reason: 'bad-pos' };

  const isNoun = input.pos === 'noun';
  if (isNoun && !input.gender) return { ok: false, reason: 'noun-no-gender' };

  const gloss = cleanGloss(input.gloss ?? '');
  if (!gloss) return { ok: false, reason: 'no-gloss' };

  const examples = input.examples.filter((e) => e.de.trim() && e.en.trim());
  if (requireExample && !examples.length) return { ok: false, reason: 'no-example' };

  const term = isNoun ? `${input.gender} ${lemma}` : lemma;
  const plural = isNoun && input.plural ? `die ${input.plural.trim().replace(/^die\s+/i, '')}` : null;
  const id = cardId(input.level, term);

  const card: Word = {
    id,
    term,
    en: gloss,
    pos: input.pos,
    level: input.level as Word['level'],
    gender: isNoun ? input.gender : null,
    plural,
    ipa: input.ipa ? input.ipa.replace(/\//g, '').trim() || null : null,
    def: null,
    syn: [],
    ant: [],
    ex: examples.map((e) => ({ de: e.de.trim(), en: e.en.trim(), lvl: input.level })),
    field: input.field,
    kind: 'word',
  };

  const prov: Provenance = {
    id,
    lemma,
    level: input.level,
    levelSource: input.levelSource,
    freqRank: input.freqRank,
    glossSource: input.glossSource,
    factsSource: input.factsSource,
    exampleSource: examples[0]?.source ?? null,
    fieldSource: input.fieldSource,
  };
  return { ok: true, card, prov };
}
