// The ingestion pipeline orchestrator (Goals 3–5, 7). Reproducible and
// re-runnable: it discovers the real gaps from the frequency list, enriches each
// missing lemma from Wiktextract, attaches a translated Tatoeba example, assigns
// a CEFR level and sector, dedupes against the corpus, and emits an updated
// vocab.json / sectors.json / provenance.json in deterministic order.
//
//   npm run corpus:build                 # dry run → writes review artefacts to data/out/
//   npm run corpus:build -- --write      # actually update public/data/*
//   npm run corpus:build -- --level=A1 --limit=300 --write   # one reviewable batch
//   npm run corpus:build -- --llm --write                    # use the offline LLM layer
import './shim.ts';
import { join } from 'node:path';
import { PATHS, SOURCES, LEVEL_TARGETS } from './config.ts';
import {
  loadCorpus, loadSectors, primeApp, sortCards, existingTerms, termFor, lemmaKey,
  ProvenanceLog, writeJSON, writeText, fileExists, LEVELS, type Word,
} from './lib.ts';
import { loadFrequency } from './sources/frequency.ts';
import { loadWiktextract, type LexEntry } from './sources/wiktextract.ts';
import { attachTatoebaExamples, type Candidate, type TatEx } from './sources/tatoeba.ts';
import { loadReference, assignLevel, type LevelAssignment } from './level.ts';
import { indexSectors, resolveField, rebuildSectors, loadSectorReference } from './sectors.ts';
import { buildCard, type CardInput } from './normalize.ts';
import { loadAiConfig, llmEnrich, type LlmSuggestion } from './enrich-llm.ts';

export interface BuildOpts {
  vocabPath: string;
  sectorsPath: string;
  provenancePath: string;
  freqPath: string;
  wiktPath: string;
  tatoeba?: { de: string; en: string; links: string };
  refPath?: string;
  sectorRefPath?: string;    // curated lemma → sector map (overrides LLM/default)
  scanN?: number;            // how many top frequency forms to scan for gaps
  limit?: number;            // cap total cards added this run
  onlyLevel?: string;        // restrict this batch to one CEFR level
  useLlm?: boolean;          // enable the offline LLM leveling/sector layer
  llmCap?: number;           // max (most-frequent) candidates to send to the LLM
  referenceOnly?: boolean;   // only add lemmas with a curated reference level (no freq fallback)
  dumpOnly?: boolean;        // write candidates.tsv and stop (for external/manual leveling)
  requireExample?: boolean;  // drop cards with no translated example (default true)
  write?: boolean;           // write into vocabPath/sectorsPath (else dry run)
  outDir?: string;           // where review artefacts go
}

export interface BuildSummary {
  scanned: number; uncovered: number; candidates: number; added: number;
  addedByLevel: Record<string, number>;
  skips: Record<string, number>;
  targetsRemaining: Record<string, number>;
}

export async function runBuild(opts: BuildOpts): Promise<BuildSummary> {
  const outDir = opts.outDir ?? PATHS.out;
  const full = loadCorpus(opts.vocabPath);
  const words = full.filter((w) => w.kind === 'word');
  const sectors = loadSectors(opts.sectorsPath);
  const sIndex = indexSectors(sectors);
  const sectorRef = loadSectorReference(opts.sectorRefPath ?? '');
  const knownTerms = existingTerms(words);

  // 1) Discover gaps with the app's own matcher.
  const mining = await primeApp(full);
  const freq = loadFrequency(opts.freqPath, opts.scanN ?? 40000);
  const uncovered: { word: string; rank: number }[] = [];
  for (const e of freq) {
    if (mining.annotate(e.word)[0]?.word) continue;      // already lights up
    if (mining.isNeutralWord(e.word) || mining.isLikelyEntity(e.word)) continue;
    uncovered.push({ word: e.word, rank: e.rank });
  }

  // 2) Resolve each uncovered form to a Wiktextract headword (facts + gloss).
  const wanted = new Set(uncovered.map((u) => u.word.toLowerCase()));
  const wikt = await loadWiktextract(opts.wiktPath, wanted);
  const ref = loadReference(opts.refPath ?? '');

  interface Cand { key: string; lemma: string; le: LexEntry; rank: number; lvl: LevelAssignment; }
  const cands: Cand[] = [];
  const queued = new Set<string>();
  for (const u of uncovered) {
    const le = wikt.best(u.word);
    if (!le) continue;                                    // not a headword → skip
    if (le.form) continue;                                // inflected form ("diese"), not a lemma
    if (le.pos === 'pronoun') continue;                   // closed-class → grammar cards, not vocab
    if (/^[A-ZÄÖÜ]{1,4}$/.test(le.word)) continue;        // all-caps abbreviation/acronym (AB, EU, CDU)
    if (le.pos === 'noun' && !le.gender) continue;        // unusable noun (no gender)
    const term = termFor(le.word, le.pos, le.gender).toLowerCase(); // real identity
    if (knownTerms.has(term) || queued.has(term)) continue;
    queued.add(term);
    cands.push({ key: term, lemma: le.word, le, rank: u.rank, lvl: assignLevel(le.word, u.rank, ref) });
  }

  // Always emit the candidate pool (rank, lemma, pos, frequency-guess level, gloss)
  // so it can be reviewed or leveled externally (e.g. hand-authored reference).
  const candLines = ['rank\tlemma\tpos\tfreq_level\tgloss',
    ...cands.slice(0, 3000).map((c) => `${c.rank}\t${c.lemma}\t${c.le.pos}\t${c.lvl.level}\t${(c.le.gloss ?? '').replace(/\s+/g, ' ').trim()}`)];
  writeText(join(outDir, 'candidates.tsv'), candLines.join('\n') + '\n');
  if (opts.dumpOnly) {
    console.log(`Dumped ${Math.min(cands.length, 3000)} candidates → ${join(outDir, 'candidates.tsv')}`);
    return { scanned: freq.length, uncovered: uncovered.length, candidates: cands.length, added: 0,
      addedByLevel: Object.fromEntries(LEVELS.map((l) => [l, 0])), skips: {}, targetsRemaining: {} };
  }

  // 3) Optional offline LLM layer for level + sector.
  let llm = new Map<string, LlmSuggestion>();
  if (opts.useLlm) {
    const cfg = loadAiConfig();
    if (!cfg) console.warn('  --llm set but no key found (openrouter.key.local / OPENROUTER_KEY); skipping LLM layer');
    else {
      // Candidates are frequency-ordered, so the most-frequent slice is where the
      // fillable A1/A2 words are — cap the LLM there to bound cost/rate limits.
      const pool = cands.slice(0, opts.llmCap ?? 1500);
      console.log(`  llm leveling ${pool.length} of ${cands.length} candidates…`);
      llm = await llmEnrich(pool.map((c) => ({ key: c.key, lemma: c.lemma, pos: c.le.pos, gloss: c.le.gloss })), cfg, [...sIndex.fields]);
    }
  }

  // 4) Attach Tatoeba examples in one pass (falls back to Wiktextract examples).
  let tat = new Map<string, TatEx[]>();
  if (opts.tatoeba && fileExists(opts.tatoeba.de) && fileExists(opts.tatoeba.en) && fileExists(opts.tatoeba.links)) {
    const tatCands: Candidate[] = cands.map((c) => ({ key: c.key, lemma: c.lemma, pos: c.le.pos, plural: c.le.plural }));
    tat = await attachTatoebaExamples(opts.tatoeba, tatCands);
  }

  // 5) Assemble cards under per-level targets, most-frequent first.
  const currentByLevel: Record<string, number> = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  for (const w of words) currentByLevel[w.level] = (currentByLevel[w.level] ?? 0) + 1;
  const remaining: Record<string, number> = {};
  for (const l of LEVELS) remaining[l] = Math.max(0, (LEVEL_TARGETS[l] ?? 0) - currentByLevel[l]);

  const prov = new ProvenanceLog(opts.write ? opts.provenancePath : undefined);
  const added: Word[] = [];
  const skips: Record<string, number> = {};
  const bump = (r: string) => { skips[r] = (skips[r] ?? 0) + 1; };

  for (const c of cands) {
    if (opts.limit && added.length >= opts.limit) break;
    // Merge level layers: reference > llm > frequency.
    let level = c.lvl.level, levelSource = c.lvl.source;
    const sug = llm.get(c.key);
    if (c.lvl.source !== 'reference' && sug?.level) { level = sug.level; levelSource = 'llm'; }
    if (opts.referenceOnly && levelSource !== 'reference') { bump('not-in-reference'); continue; }
    if (opts.onlyLevel && level !== opts.onlyLevel) { bump('other-level'); continue; }
    if (remaining[level] <= 0) { bump('level-full'); continue; }

    const field = resolveField(sIndex, sectorRef.get(lemmaKey(c.lemma)) ?? sug?.field);
    const tatExs = tat.get(c.key) ?? [];
    const examples = tatExs.length
      ? tatExs.map((e) => ({ de: e.de, en: e.en, source: `tatoeba:${e.id}` }))
      : c.le.examples.map((e) => ({ de: e.de, en: e.en, source: 'wiktextract' }));

    const input: CardInput = {
      lemma: c.lemma, pos: c.le.pos, gender: c.le.gender, plural: c.le.plural, ipa: c.le.ipa,
      gloss: c.le.gloss, level, levelSource, freqRank: c.rank, field: field.field, fieldSource: field.source,
      glossSource: `wiktextract:${SOURCES.wiktextract.file}`,
      factsSource: `wiktextract:${SOURCES.wiktextract.file}`,
      examples,
    };
    const res = buildCard(input, { requireExample: opts.requireExample ?? true });
    if (!res.ok) { bump(res.reason); continue; }
    added.push(res.card);
    prov.record(res.prov);
    remaining[level]--;
  }

  // 6) Append the new cards (in deterministic order) to the existing corpus,
  // preserving prior order so the diff is just the additions, then rebuild sectors.
  const merged = full.concat(sortCards(added));
  const newSectors = rebuildSectors(merged, sectors);

  const addedByLevel: Record<string, number> = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  for (const w of added) addedByLevel[w.level]++;
  const summary: BuildSummary = {
    scanned: freq.length, uncovered: uncovered.length, candidates: cands.length, added: added.length,
    addedByLevel, skips, targetsRemaining: remaining,
  };

  // 7) Always emit review artefacts; write into public/data only with --write.
  writeJSON(join(outDir, 'new-cards.json'), added);
  writeJSON(join(outDir, 'build-summary.json'), summary);
  writeText(join(outDir, 'build-summary.md'), summaryMarkdown(summary));
  if (opts.write) {
    writeJSON(opts.vocabPath, merged);
    writeJSON(opts.sectorsPath, newSectors);
    writeJSON(opts.provenancePath, prov.toArray());
  }
  return summary;
}

function summaryMarkdown(s: BuildSummary): string {
  const lvl = (o: Record<string, number>) => LEVELS.map((l) => `${l} ${o[l] ?? 0}`).join(' · ');
  const skipLines = Object.entries(s.skips).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`);
  return [
    `# Corpus build summary`, ``,
    `- Frequency forms scanned: ${s.scanned}`,
    `- Uncovered content forms: ${s.uncovered}`,
    `- Candidate lemmas (Wiktextract headwords): ${s.candidates}`,
    `- **Cards added: ${s.added}** (${lvl(s.addedByLevel)})`,
    `- Targets remaining after this run: ${lvl(s.targetsRemaining)}`, ``,
    `## Skips`, ``, ...(skipLines.length ? skipLines : ['- none']), ``,
  ].join('\n') + '\n';
}

// ---- CLI ------------------------------------------------------------------
function flag(name: string): boolean { return process.argv.includes(`--${name}`); }
function opt(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split('=')[1] : undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const freqPath = join(PATHS.raw, SOURCES.frequency.file);
  const wiktPath = join(PATHS.raw, SOURCES.wiktextract.file);
  if (!fileExists(freqPath) || !fileExists(wiktPath)) {
    console.error(`Missing raw sources under ${PATHS.raw}. Run \`npm run corpus:fetch\` first (or set the LEXI_*_URL env vars / download manually — see ATTRIBUTIONS.md).`);
    process.exit(1);
  }
  const summary = await runBuild({
    vocabPath: PATHS.vocab,
    sectorsPath: PATHS.sectors,
    provenancePath: PATHS.provenance,
    freqPath,
    wiktPath,
    tatoeba: {
      de: join(PATHS.raw, SOURCES.tatoebaDe.file),
      en: join(PATHS.raw, SOURCES.tatoebaEn.file),
      links: join(PATHS.raw, SOURCES.tatoebaLinks.file),
    },
    refPath: PATHS.cefrReference,
    sectorRefPath: PATHS.sectorReference,
    limit: opt('limit') ? parseInt(opt('limit')!, 10) : undefined,
    onlyLevel: opt('level'),
    useLlm: flag('llm'),
    llmCap: opt('llm-cap') ? parseInt(opt('llm-cap')!, 10) : undefined,
    referenceOnly: flag('reference-only'),
    dumpOnly: flag('dump-candidates'),
    requireExample: !flag('examples-optional'),
    write: flag('write'),
  });
  console.log(summaryMarkdown(summary));
  console.log(flag('write') ? 'Wrote public/data/{vocab,sectors,provenance}.json' : 'Dry run — review scripts/corpus/data/out/new-cards.json, then re-run with --write');
}
