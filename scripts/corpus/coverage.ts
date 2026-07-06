// Goal 1 — measure the gap. Scores the corpus against the Leipzig frequency list
// using the app's own matcher (so "covered" == "the reader would light it up"),
// and reports: coverage % by frequency band and by CEFR heuristic level, the
// current level/sector distribution, and a ranked list of missing high-frequency
// lemmas. Run: `npm run corpus:coverage`.
import './shim.ts';
import { PATHS, SOURCES, FREQ_BANDS, COVERAGE_TOP_N } from './config.ts';
import { loadCorpus, loadSectors, primeApp, fileExists, writeJSON, writeText, LEVELS } from './lib.ts';
import { loadFrequency, type FreqEntry } from './sources/frequency.ts';
import { join } from 'node:path';
import type { Word } from '../../src/types.ts';

const BANDS: [number, number][] = [[1, 500], [501, 1000], [1001, 2000], [2001, 5000], [5001, 10000], [10001, 20000]];
const pct = (n: number, d: number) => (d ? (100 * n / d) : 0);

function bandForRank(rank: number): string {
  for (const b of FREQ_BANDS) if (rank <= b.maxRank) return b.level;
  return 'C2';
}

async function main() {
  const freqPath = join(PATHS.raw, SOURCES.frequency.file);
  if (!fileExists(freqPath)) {
    console.error(`No frequency list at ${freqPath}. Run \`npm run corpus:fetch\` first (or set LEXI_FREQ_URL).`);
    process.exit(1);
  }
  const corpus = loadCorpus(PATHS.vocab).filter((w) => w.kind === 'word');
  const sectors = loadSectors(PATHS.sectors);
  const mining = await primeApp(loadCorpus(PATHS.vocab));

  const freq: FreqEntry[] = loadFrequency(freqPath, COVERAGE_TOP_N);

  // Classify every top-N surface form.
  let matched = 0, neutral = 0, entity = 0;
  const bandTotals = BANDS.map(() => ({ n: 0, hit: 0 }));
  const levelTotals: Record<string, { n: number; hit: number }> = Object.fromEntries(LEVELS.map((l) => [l, { n: 0, hit: 0 }]));
  const missing: FreqEntry[] = [];

  for (const e of freq) {
    const seg = mining.annotate(e.word)[0];
    const isMatch = !!(seg && seg.word);
    const isNeutral = mining.isNeutralWord(e.word);
    const isEntity = !isMatch && mining.isLikelyEntity(e.word);
    const covered = isMatch || isNeutral; // reader isn't blocked by function words
    if (isMatch) matched++; else if (isNeutral) neutral++; else if (isEntity) entity++;

    for (let i = 0; i < BANDS.length; i++) {
      const [lo, hi] = BANDS[i];
      if (e.rank >= lo && e.rank <= hi) { bandTotals[i].n++; if (covered) bandTotals[i].hit++; }
    }
    const lvl = bandForRank(e.rank);
    levelTotals[lvl].n++; if (covered) levelTotals[lvl].hit++;

    if (!covered && !isEntity) missing.push(e); // genuine content-word holes
  }

  // Optional: map missing forms to lemmas if a Wiktextract dump is cached.
  const wiktPath = join(PATHS.raw, SOURCES.wiktextract.file);
  let missingRanked = missing.slice(0, 400).map((e) => ({ rank: e.rank, form: e.word, lemma: e.word }));
  if (fileExists(wiktPath)) {
    const { loadWiktextract } = await import('./sources/wiktextract.ts');
    const wanted = new Set(missing.slice(0, 1500).map((e) => e.word.toLowerCase()));
    const wikt = await loadWiktextract(wiktPath, wanted);
    const seen = new Set<string>();
    missingRanked = [];
    for (const e of missing) {
      const le = wikt.best(e.word);
      if (le && le.form) continue; // inflection of a function word ("diese") — not a lemma gap
      const lemma = le ? le.word : e.word;
      const k = lemma.toLowerCase();
      if (seen.has(k)) continue; // collapse inflections of the same lemma
      seen.add(k);
      missingRanked.push({ rank: e.rank, form: e.word, lemma });
      if (missingRanked.length >= 400) break;
    }
  }

  const top2000 = freq.filter((e) => e.rank <= 2000);
  const cov2000 = top2000.filter((e) => mining.annotate(e.word)[0]?.word || mining.isNeutralWord(e.word)).length;

  // Distributions from the shipped corpus.
  const byLevel: Record<string, number> = {};
  for (const w of corpus) byLevel[w.level] = (byLevel[w.level] ?? 0) + 1;
  const groupCount: Record<string, number> = {};
  for (const s of sectors) groupCount[s.group] = (groupCount[s.group] ?? 0) + s.count;

  const report = {
    generatedAt: new Date().toISOString(),
    source: `${SOURCES.frequency.url} (${SOURCES.frequency.license})`,
    scoredForms: freq.length,
    headline: {
      top2000Coverage: +pct(cov2000, top2000.length).toFixed(1),
      matched, neutralFunctionWords: neutral, likelyEntities: entity,
    },
    coverageByBand: BANDS.map(([lo, hi], i) => ({ band: `${lo}-${hi}`, coverage: +pct(bandTotals[i].hit, bandTotals[i].n).toFixed(1), n: bandTotals[i].n })),
    coverageByCefrHeuristic: LEVELS.map((l) => ({ level: l, coverage: +pct(levelTotals[l].hit, levelTotals[l].n).toFixed(1), n: levelTotals[l].n })),
    corpusLevelDistribution: byLevel,
    corpusGroupDistribution: groupCount,
    missingHighFrequencyLemmas: missingRanked,
  };

  writeJSON(join(PATHS.out, 'coverage.json'), report);
  writeMarkdown(report, corpus);
  console.log(`\nTop-2000 coverage: ${report.headline.top2000Coverage}%  (matched ${matched}, neutral ${neutral}, entities ${entity})`);
  console.log(`Missing lemmas (top): ${missingRanked.slice(0, 15).map((m) => m.lemma).join(', ')}`);
  console.log(`Reports → ${join(PATHS.out, 'coverage.json')} and coverage-report.md`);
}

function writeMarkdown(r: any, corpus: Word[]): void {
  const L = (o: Record<string, number>) => LEVELS.map((l) => `${l} ${o[l] ?? 0}`).join(' · ');
  const lines = [
    `# Lexi coverage report`, ``,
    `_Generated ${r.generatedAt}_`, ``,
    `Source: ${r.source}. Scored the top ${r.scoredForms} surface forms with the app's own matcher, so "covered" means the reader would light the word up (a matched card, or a function word handled as neutral).`, ``,
    `## Headline`, ``,
    `- **Top-2000 coverage: ${r.headline.top2000Coverage}%** (target ≥95%)`,
    `- Matched to a card: ${r.headline.matched} · neutral function words: ${r.headline.neutralFunctionWords} · likely entities (skipped): ${r.headline.likelyEntities}`, ``,
    `## Coverage by frequency band`, ``,
    `| Rank band | Coverage | Forms |`, `| --- | --- | --- |`,
    ...r.coverageByBand.map((b: any) => `| ${b.band} | ${b.coverage}% | ${b.n} |`), ``,
    `## Coverage by CEFR band (frequency heuristic)`, ``,
    `| Level | Coverage | Forms |`, `| --- | --- | --- |`,
    ...r.coverageByCefrHeuristic.map((b: any) => `| ${b.level} | ${b.coverage}% | ${b.n} |`), ``,
    `## Current corpus`, ``,
    `- Word cards: ${corpus.length}`,
    `- Level distribution: ${L(r.corpusLevelDistribution)}`, ``,
    `## Top missing high-frequency lemmas`, ``,
    `Ranked by frequency; these are the real holes to fill first.`, ``,
    `| Freq rank | Lemma | (surface form) |`, `| --- | --- | --- |`,
    ...r.missingHighFrequencyLemmas.slice(0, 100).map((m: any) => `| ${m.rank} | ${m.lemma} | ${m.form} |`), ``,
  ];
  writeText(join(PATHS.out, 'coverage-report.md'), lines.join('\n') + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
