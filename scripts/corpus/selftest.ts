// Offline end-to-end self-test (no network). Drives the parsers, normalizer,
// leveling, and the full runBuild() orchestrator over the committed fixtures and
// asserts the results. This is the pipeline's regression guard — run it in CI.
//
//   node scripts/corpus/selftest.ts        (Node ≥ 22.18 strips types natively)
import './shim.ts';
import { join } from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { PATHS } from './config.ts';
import { loadFrequency } from './sources/frequency.ts';
import { loadWiktextract } from './sources/wiktextract.ts';
import { attachTatoebaExamples } from './sources/tatoeba.ts';
import { assignLevel, loadReference, freqBandLevel, levelingAgreement } from './level.ts';
import { buildCard } from './normalize.ts';
import { runBuild } from './build.ts';
import type { Word } from '../../src/types.ts';

const F = PATHS.fixtures;
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}`);
  if (cond) pass++; else { fail++; if (detail !== undefined) console.log(`        ${JSON.stringify(detail)}`); }
};

async function main() {
  // --- parsers -------------------------------------------------------------
  const freq = loadFrequency(join(F, 'leipzig-words.txt'));
  ok('frequency: parses rows', freq.length === 10);
  ok('frequency: re-ranked by descending freq', freq[0].word === 'der' && freq[0].rank === 1);

  const wikt = await loadWiktextract(join(F, 'kaikki-de.jsonl'));
  const rolle = wikt.best('Rolle', 'noun');
  ok('wiktextract: Rolle → feminine (die)', rolle?.gender === 'die', rolle);
  ok('wiktextract: Rolle plural = Rollen', rolle?.plural === 'Rollen', rolle);
  ok('wiktextract: Rolle picks noun over verb form-of', rolle?.pos === 'noun');
  const beispiel = wikt.best('Beispiel');
  ok('wiktextract: Beispiel gender from head_templates (das)', beispiel?.gender === 'das', beispiel);
  ok('wiktextract: IPA brackets stripped', beispiel?.ipa === 'ˈbaɪ̯ʃpiːl', beispiel?.ipa);
  const meinen = wikt.best('meinen');
  ok('wiktextract: meinen is a verb with a gloss', meinen?.pos === 'verb' && !!meinen?.gloss);
  ok('wiktextract: worden flagged as inflected form (form-of)', wikt.best('worden')?.form === true, wikt.best('worden'));

  const tat = await attachTatoebaExamples(
    { de: join(F, 'tatoeba-deu.tsv'), en: join(F, 'tatoeba-eng.tsv'), links: join(F, 'tatoeba-links.csv') },
    [
      { key: 'die rolle', lemma: 'Rolle', pos: 'noun', plural: 'Rollen' },
      { key: 'meinen', lemma: 'meinen', pos: 'verb' },
    ],
  );
  ok('tatoeba: attaches example to Rolle', (tat.get('die rolle')?.[0]?.de ?? '').includes('Rolle'), tat.get('die rolle'));
  ok('tatoeba: matches conjugated verb form (meinst → meinen)', (tat.get('meinen')?.[0]?.de ?? '').includes('meinst'), tat.get('meinen'));

  // --- leveling ------------------------------------------------------------
  ok('level: freq band A1 for rank 100', freqBandLevel(100) === 'A1');
  ok('level: freq band C2 for huge rank', freqBandLevel(999999) === 'C2');
  const ref = new Map([['rolle', 'B1']]);
  ok('level: reference overrides frequency', assignLevel('Rolle', 3, ref).source === 'reference' && assignLevel('Rolle', 3, ref).level === 'B1');
  ok('level: falls back to frequency', assignLevel('xyz', 3, ref).source === 'frequency');
  const agree = levelingAgreement(new Map([['rolle', 'A1']]), () => 3);
  ok('level: agreement computes', agree.n === 1 && agree.exactPct === 100, agree);

  // --- normalize -----------------------------------------------------------
  const good = buildCard({
    lemma: 'Rolle', pos: 'noun', gender: 'die', plural: 'Rollen', ipa: 'ˈʁɔlə', gloss: 'role',
    level: 'A1', levelSource: 'frequency', freqRank: 4, field: 'Miscellaneous', fieldSource: 'default',
    glossSource: 'x', factsSource: 'x', examples: [{ de: 'Eine Rolle.', en: 'A role.', source: 'tatoeba:1' }],
  });
  ok('normalize: builds noun with article + plural article', good.ok && good.card.term === 'die Rolle' && good.card.plural === 'die Rollen', good);
  ok('normalize: id follows voc:LEVEL:term', good.ok && good.card.id === 'voc:A1:die Rolle');
  const noGender = buildCard({ ...baseNoun(), gender: null } as any);
  ok('normalize: drops noun without gender', !noGender.ok);
  const noEx = buildCard({ ...baseNoun(), examples: [] } as any);
  ok('normalize: drops card without example (default)', !noEx.ok);
  const noExOk = buildCard({ ...baseNoun(), examples: [] } as any, { requireExample: false });
  ok('normalize: keeps exampleless card when allowed', noExOk.ok);

  // --- full pipeline over fixtures ----------------------------------------
  const outDir = mkdtempSync(join(tmpdir(), 'lexi-selftest-'));
  const summary = await runBuild({
    vocabPath: join(F, 'vocab.fixture.json'),
    sectorsPath: join(F, 'sectors.fixture.json'),
    provenancePath: join(outDir, 'provenance.json'),
    freqPath: join(F, 'leipzig-words.txt'),
    wiktPath: join(F, 'kaikki-de.jsonl'),
    tatoeba: { de: join(F, 'tatoeba-deu.tsv'), en: join(F, 'tatoeba-eng.tsv'), links: join(F, 'tatoeba-links.csv') },
    write: false,
    outDir,
  });
  ok('build: skips covered forms (Name, gehe) + non-headword (Xytzzq)', summary.candidates === 3, summary);
  ok('build: adds exactly the 3 missing lemmas', summary.added === 3, summary.addedByLevel);

  const added: Word[] = JSON.parse(readOut(outDir, 'new-cards.json'));
  const byTerm = new Map(added.map((c) => [c.term, c]));
  ok('build: die Rolle present with plural + example', hasCard(byTerm.get('die Rolle'), { plural: 'die Rollen' }));
  ok('build: das Beispiel present', !!byTerm.get('das Beispiel'));
  ok('build: meinen present as verb', byTerm.get('meinen')?.pos === 'verb');
  ok('build: skips inflected form "worden" (form-of, not a lemma)', !added.some((c) => c.term.toLowerCase() === 'worden'));
  ok('build: skips pronoun "denen" (closed-class → grammar)', !added.some((c) => c.term.toLowerCase() === 'denen'));
  ok('build: skips abbreviation "EU"', !added.some((c) => c.term === 'die EU' || c.term === 'EU'));
  ok('normalize: gloss cleaned of parenthetical aside', byTerm.get('die Rolle')?.en === 'role, part', byTerm.get('die Rolle')?.en);
  ok('build: Rolle example came from Tatoeba', (byTerm.get('die Rolle')?.ex?.[0]?.de ?? '').includes('Rolle'));
  ok('build: every added card has ≥1 example + gloss', added.every((c) => c.ex.length >= 1 && !!c.en));
  ok('build: no card collides with usr:/existing ids', added.every((c) => c.id.startsWith('voc:')));

  console.log(`\n${fail ? 'FAIL' : 'PASS'} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function baseNoun() {
  return {
    lemma: 'Rolle', pos: 'noun', gender: 'die', plural: 'Rollen', ipa: 'ˈʁɔlə', gloss: 'role',
    level: 'A1', levelSource: 'frequency', freqRank: 4, field: 'Miscellaneous', fieldSource: 'default',
    glossSource: 'x', factsSource: 'x', examples: [{ de: 'Eine Rolle.', en: 'A role.', source: 'tatoeba:1' }],
  };
}
function hasCard(c: Word | undefined, want: Partial<Word>): boolean {
  return !!c && Object.entries(want).every(([k, v]) => (c as any)[k] === v);
}
function readOut(dir: string, name: string): string {
  return readFileSync(join(dir, name), 'utf8');
}

main().catch((e) => { console.error(e); process.exit(1); });
