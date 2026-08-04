// corpus:audio — build public/data/audio.json, the human-recording manifest.
//
// Joins the Tatoeba sentence ids Lexi already records in provenance.json against
// Tatoeba's `sentences_with_audio` export, keeping only recordings whose licence
// permits reuse (see sources/tatoeba-audio.ts — that filter is the point of this
// whole path). Writes ids only; no audio bytes are downloaded or committed. The
// app fetches and caches the audio itself, the way it already does the Piper voice.
//
// Safe to skip: the app treats a missing audio.json as "no human recordings" and
// falls back to synthetic speech for every card, so a contributor who never runs
// this still gets a working listening feature.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { PATHS, SOURCES } from './config.ts';
import { buildAudioManifest, sentenceToCard } from './sources/tatoeba-audio.ts';

const OUT = join(PATHS.repoRoot, 'public', 'data', 'audio.json');

async function main() {
  const csv = join(PATHS.raw, SOURCES.tatoebaAudio.file);
  if (!existsSync(csv)) {
    console.error(`✗ ${SOURCES.tatoebaAudio.file} not cached.\n  Run: npm run corpus:fetch`);
    process.exit(1);
  }
  if (!existsSync(PATHS.provenance)) {
    console.error(`✗ provenance.json missing — nothing to join against.`);
    process.exit(1);
  }

  const provenance = JSON.parse(readFileSync(PATHS.provenance, 'utf8')) as { id?: string; exampleSource?: string | null }[];
  // Keyed by card, not sentence: the app has `Word.id` and deliberately never
  // loads provenance.json, so the join has to resolve to a card id here.
  const cardBySentence = sentenceToCard(provenance);
  console.log(`  ${cardBySentence.size} cards cite a Tatoeba sentence`);

  const { manifest, stats } = await buildAudioManifest(csv, cardBySentence);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(manifest), 'utf8');

  const pct = cardBySentence.size ? ((stats.kept / cardBySentence.size) * 100).toFixed(1) : '0.0';
  const kb = (Buffer.byteLength(JSON.stringify(manifest)) / 1024).toFixed(1);
  console.log(`  ${stats.rows} recordings scanned`);
  console.log(`  ${stats.unlicensed} dropped — no reusable licence`);
  console.log(`  ${stats.unmatched} licensed but not on any card`);
  console.log(`✓ ${stats.kept} cards gain a human voice (${pct}% of Tatoeba-sourced cards) → audio.json (${kb} KB)`);
  console.log(`  the remaining ${cardBySentence.size - stats.kept} fall back to Piper/system speech`);

  // Distinct contributors, because ATTRIBUTIONS.md promises per-recording credit
  // and the app has to be able to show it.
  const voices = new Set(Object.values(manifest).map((e) => e.by)).size;
  const licences = [...new Set(Object.values(manifest).map((e) => e.license))].sort();
  console.log(`  ${voices} distinct contributors · licences: ${licences.join(', ') || '—'}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
