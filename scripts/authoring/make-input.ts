// Build the input batches a Claude authoring task reads (see card-authoring.md).
// Selects the cards that are missing a field and splits them into numbered JSON
// batches small enough to author in one pass. Read-only: it never touches
// vocab.json — `apply-authored.ts` is the only writer.
//
//   node scripts/authoring/make-input.ts --level C1 --need ex,syn --size 120 \
//     --out scripts/authoring/batches/inputs/c1-ex
//
// --need ex   → cards with fewer than two examples
// --need syn  → open-class cards with no synonyms
// --need def/ipa/plural/gender → cards where that field is empty
// Grammar cards are always excluded: they are points, not words.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PATHS } from '../corpus/config.ts';
import { readJSON } from '../corpus/lib.ts';
import type { Word } from '../../src/types.ts';

const arg = (name: string, fallback = '') => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const level = arg('level');
const needs = arg('need', 'ex').split(',').map((s) => s.trim()).filter(Boolean);
const size = Number(arg('size', '120'));
const out = arg('out');
if (!level || !out) {
  console.error('Usage: node scripts/authoring/make-input.ts --level C1 --need ex,syn --size 120 --out <prefix>');
  process.exit(1);
}

const OPEN_CLASS = new Set(['noun', 'verb', 'adjective', 'adverb']);

/** Does this card still need `field` authored? */
const wants = (c: Word, field: string): boolean => {
  switch (field) {
    case 'ex': return (c.ex?.length ?? 0) < 2;
    case 'syn': return (!c.syn || c.syn.length === 0) && (c.pos === '' || OPEN_CLASS.has(c.pos));
    case 'def': return !c.def;
    case 'ipa': return !c.ipa;
    case 'plural': return c.pos === 'noun' && !c.plural;
    case 'gender': return c.pos === 'noun' && !c.gender;
    default: return false;
  }
};

const cards = readJSON<Word[]>(PATHS.vocab)
  .filter((c) => c.level === level && c.pos !== 'grammar' && c.kind !== 'grammar')
  .map((c) => ({ card: c, need: needs.filter((f) => wants(c, f)) }))
  // The first listed need drives selection, so a --need ex,syn run authors
  // synonyms only for the cards it is already visiting for examples.
  .filter(({ need }) => need.includes(needs[0]));

const batches: unknown[][] = [];
for (let i = 0; i < cards.length; i += size) {
  batches.push(cards.slice(i, i + size).map(({ card, need }) => ({
    id: card.id,
    term: card.term,
    en: card.en,
    pos: card.pos || 'word',
    level: card.level,
    need,
    have: {
      def: card.def || undefined,
      field: card.field || undefined,
      ex_de: (card.ex ?? []).map((e) => e.de),
    },
  })));
}

mkdirSync(dirname(out), { recursive: true });
batches.forEach((batch, i) => {
  const path = `${out}-${String(i + 1).padStart(2, '0')}.json`;
  writeFileSync(path, JSON.stringify(batch, null, 1) + '\n');
  console.log(`${path}  ${batch.length} cards`);
});
console.log(`${cards.length} ${level} cards need [${needs.join(', ')}] → ${batches.length} batches`);
