// The corpus as a dataset anyone can download, cite and build on (LEARNING-WEB §5,
// proposal 4; the Lichess database is the model: versioned files, a schema, counts).
//
//   npm run corpus:release                 → release/lexi-de-en-<version>/
//
// What it holds: the 11k teachable cards, each with every field the app teaches from
// (gender, plural, IPA, gloss, definition, examples, synonyms, its English relation),
// as JSON Lines and as a flat TSV, plus the transfer rules, the licence, the sources,
// a README whose every number is counted here, and SHA-256 sums.
//
// What it leaves out: the 93,046 dictionary headwords (`lex/`), which are unverified
// Wiktionary glosses (VISION, *Two layers*); the 110 retired grammar cards; and
// anything about a learner, which never leaves their device.
//
// The version is the date of HEAD's commit and its short sha, so the same tree
// always builds the same release. A dirty tree is marked, and should not be published.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bare } from '../../src/lib/slug.ts';
import type { TransferData } from '../../src/lib/transfer.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = join(ROOT, 'public', 'data');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface Example { de: string; en: string; lvl?: string }
interface Card {
  id: string; term: string; en: string; pos: string; level: string; gender?: string; plural?: string; ipa?: string;
  def?: string; defDe?: string; syn?: string[]; ant?: string[]; ex?: Example[]; field?: string; kind: string;
}
export interface Row {
  id: string; term: string; headword: string; pos: string; level: string;
  gender: string | null; plural: string | null; ipa: string | null;
  en: string; def: string | null; def_de: string | null;
  syn: string[]; ant: string[]; examples: { de: string; en: string; level: string | null }[];
  topic: string | null;
  /** b borrowed · c related, shown in the gloss · h related, not in the gloss */
  english: { kind: 'b' | 'c' | 'h'; word: string | null; rule: string | null } | null;
  /** A Tatoeba sentence id among its examples, where provenance records one. */
  tatoeba: string | null;
}

export function rows(dataDir = DATA): Row[] {
  const cards = (JSON.parse(readFileSync(join(dataDir, 'vocab.json'), 'utf8')) as Card[]).filter((c) => c.kind === 'word');
  const transfer = JSON.parse(readFileSync(join(dataDir, 'transfer.json'), 'utf8')) as TransferData;
  const tatoeba = new Map<string, string>();
  for (const p of JSON.parse(readFileSync(join(dataDir, 'provenance.json'), 'utf8')) as { id: string; exampleSource?: string }[]) {
    if (p.exampleSource?.startsWith('tatoeba:')) tatoeba.set(p.id, p.exampleSource.slice(8));
  }
  return cards.map((c) => {
    const t = transfer.words[c.term];
    return {
      id: c.id, term: c.term, headword: bare(c.term), pos: c.pos, level: c.level,
      gender: c.gender || null, plural: c.plural || null, ipa: c.ipa || null,
      en: c.en, def: c.def || null, def_de: c.defDe || null,
      syn: c.syn ?? [], ant: c.ant ?? [],
      examples: (c.ex ?? []).map((e) => ({ de: e.de, en: e.en, level: e.lvl ?? null })),
      topic: c.field || null,
      english: t ? { kind: t[0], word: t[1] || null, rule: t[2] ?? null } : null,
      tatoeba: tatoeba.get(c.id) ?? null,
    };
  });
}

const TSV_COLS = ['id', 'term', 'headword', 'pos', 'level', 'gender', 'plural', 'ipa', 'en', 'topic'] as const;
const cell = (v: unknown) => String(v ?? '').replace(/[\t\n\r]+/g, ' ');
export const tsv = (rs: Row[]) => [TSV_COLS.join('\t'), ...rs.map((r) => TSV_COLS.map((k) => cell(r[k])).join('\t'))].join('\n') + '\n';
export const jsonl = (rs: Row[]) => rs.map((r) => JSON.stringify(r)).join('\n') + '\n';

/** Every number the README states, counted from the rows it describes. */
export function counts(rs: Row[]) {
  const by = (f: (r: Row) => string) => Object.entries(rs.reduce<Record<string, number>>((m, r) => ({ ...m, [f(r)]: (m[f(r)] ?? 0) + 1 }), {}));
  const has = (f: (r: Row) => unknown) => rs.filter((r) => { const v = f(r); return Array.isArray(v) ? v.length : v; }).length;
  const nouns = rs.filter((r) => r.pos === 'noun');
  return {
    cards: rs.length,
    levels: LEVELS.map((l) => [l, rs.filter((r) => r.level === l).length] as const),
    pos: by((r) => r.pos).sort((a, b) => b[1] - a[1]),
    ipa: has((r) => r.ipa), def: has((r) => r.def), examples: has((r) => r.examples),
    exampleTotal: rs.reduce((n, r) => n + r.examples.length, 0),
    nounGender: nouns.filter((r) => r.gender).length, nouns: nouns.length,
    nounPlural: nouns.filter((r) => r.plural).length,
    english: has((r) => r.english), tatoeba: has((r) => r.tatoeba),
  };
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

export function readme(version: string, rs: Row[], transfer: TransferData): string {
  const c = counts(rs);
  return `# Lexi German–English vocabulary, ${version}

${c.cards.toLocaleString('en')} German words for English speakers, levelled A1–C2, each with
the facts a learner needs. Gender, plural, part of speech and IPA come from Wiktionary:
the first cards were built from it, and every card since 2026-08-11 was checked against
it by a machine gate that refuses what it cannot verify (\`npm run authoring:new\`).

This is the corpus the Lexi app teaches from, released as data. It is not a dictionary:
it holds only the cards that passed the gate.

## Files

| File | What |
|---|---|
| \`words.jsonl\` | One card per line, every field below |
| \`words.tsv\` | The same cards, flat: ${TSV_COLS.join(', ')} |
| \`transfer.json\` | Each card's English relation, and the ${Object.keys(transfer.rules).length} sound correspondences named |
| \`NOTICE.txt\` | Sources and licence |
| \`CITATION.cff\` | How to cite this release |
| \`SHA256SUMS\` | Checksums |

## Counts

| Level | Cards |
|---|---|
${c.levels.map(([l, n]) => `| ${l} | ${n.toLocaleString('en')} |`).join('\n')}
| **All** | **${c.cards.toLocaleString('en')}** |

Parts of speech: ${c.pos.map(([p, n]) => `${p} ${n.toLocaleString('en')}`).join(', ')}.

Coverage: IPA ${pct(c.ipa, c.cards)} · definition ${pct(c.def, c.cards)} · at least one
example ${pct(c.examples, c.cards)} (${c.exampleTotal.toLocaleString('en')} sentences) · nouns with
gender ${c.nounGender.toLocaleString('en')} of ${c.nouns.toLocaleString('en')} · nouns with a plural ${c.nounPlural.toLocaleString('en')} ·
an English relation ${c.english.toLocaleString('en')} · an example credited to Tatoeba ${c.tatoeba.toLocaleString('en')}.

## Fields (\`words.jsonl\`)

- \`id\` the card's id in this release (it carries the level, so a relevel changes it; \`term\` is the stable key)
- \`term\` the headword as taught, with its article for nouns (\`der Name\`)
- \`headword\` the same without the article
- \`pos\`, \`level\` (CEFR, A1–C2), \`topic\`
- \`gender\` (der, die, das), \`plural\` (with *die*), \`ipa\`
- \`en\` the English gloss; \`def\` an English definition; \`def_de\` a German one, where written
- \`syn\`, \`ant\` other cards' terms
- \`examples\` German sentences with English, each with the level it was written for
- \`english\` the word's relation to English: \`b\` borrowed, \`c\` related and visible in the
  gloss, \`h\` related to an English word the gloss does not show; \`rule\` names a sound
  correspondence in \`transfer.json\`. Only what Wiktionary's etymology states, gated.
- \`tatoeba\` the id of a Tatoeba sentence among its examples, where the corpus log records one

## What to know before you use it

- Glosses, definitions and many example sentences were **written with an AI model and
  then machine-checked**: the gate proves every new example contains a real inflection
  of its headword. A gloss can still be imperfect. Reports are welcome as issues.
- Levels are placed by published CEFR word lists where a word is on one, and by
  frequency otherwise.

## Licence

Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0), because the corpus adapts
Wiktionary. Tatoeba sentences are CC BY 2.0 FR. See \`NOTICE.txt\` for every source.
The Lexi application code is MIT and is not part of this release.

Built from commit ${version.split('+')[1]} of https://github.com/shamilhzm/lexi by \`npm run corpus:release\`.
`;
}

export const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

function version(): string {
  const git = (...a: string[]) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
  const date = git('log', '-1', '--format=%cs').replace(/-/g, '.');
  const dirty = git('status', '--porcelain', '--', 'public/data').length > 0;
  return `${date}+${git('rev-parse', '--short', 'HEAD')}${dirty ? '.dirty' : ''}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const v = version();
  const out = join(ROOT, 'release', `lexi-de-en-${v}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const rs = rows();
  const transfer = JSON.parse(readFileSync(join(DATA, 'transfer.json'), 'utf8')) as TransferData;
  const files: Record<string, string | Buffer> = {
    'words.jsonl': jsonl(rs),
    'words.tsv': tsv(rs),
    'transfer.json': JSON.stringify(transfer, null, 1) + '\n',
    'README.md': readme(v, rs, transfer),
    'NOTICE.txt': readFileSync(join(DATA, 'NOTICE.txt')),
    'CITATION.cff': readFileSync(join(ROOT, 'CITATION.cff'), 'utf8').replace(/^version: .*$/m, `version: "${v}"`),
  };
  for (const [f, body] of Object.entries(files)) writeFileSync(join(out, f), body);
  writeFileSync(join(out, 'SHA256SUMS'), Object.entries(files).map(([f, b]) => `${sha256(b)}  ${f}`).join('\n') + '\n');
  const mb = Object.values(files).reduce((n, b) => n + Buffer.byteLength(b), 0) / 1e6;
  console.log(`corpus release ${v}: ${rs.length} cards, ${mb.toFixed(1)} MB → ${out}`);
  if (v.endsWith('.dirty')) console.log('public/data has uncommitted changes: commit before publishing this release.');
}
