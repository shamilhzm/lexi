// Tatoeba audio manifest — human recordings for sentences Lexi already ships.
//
// Lexi's cards already carry a Tatoeba sentence id in provenance.json
// (`exampleSource: "tatoeba:12382447"`), so pairing a card with a real human
// voice is a join, not an ingestion. No audio bytes are downloaded here and none
// are committed: this produces a small manifest of ids, and the app fetches and
// caches the audio itself, the same way it already does the Piper voice.
//
// ── The licence rule, which is the reason this file exists ──────────────────
// Every other source in this pipeline has one licence for the whole corpus.
// Tatoeba's audio does not: each recording carries its contributor's own choice,
// and Tatoeba's download page states plainly that **an empty licence field means
// the audio may not be reused outside Tatoeba**. A blanket "Tatoeba is CC BY"
// assumption would therefore ship recordings we have no right to.
//
// So the filter here is allow-list, not deny-list: a row is kept only if its
// licence string is one we recognise as permitting reuse. An unrecognised
// licence is treated exactly like an empty one — dropped. That direction is
// deliberate; the failure mode of being too strict is a card that falls back to
// synthetic speech, and the failure mode of being too loose is redistributing
// someone's voice against their terms.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/** One usable recording. */
export interface AudioEntry {
  audioId: string;
  license: string;
  /** Contributor attribution URL as Tatoeba supplies it; may be empty. */
  attribution: string;
  /** Recording contributor's username. */
  by: string;
}

/**
 * **card id → recording.**
 *
 * Keyed by card, not by Tatoeba sentence, and that is a runtime constraint
 * rather than a preference: `Word` carries no provenance field, and the app
 * deliberately never loads the 596KB `provenance.json`. A sentence-keyed
 * manifest would be unusable in the browser — there would be nothing to look the
 * card up by. The join happens here, at build time, where both ids are in hand.
 */
export type AudioManifest = Record<string, AudioEntry>;

/**
 * Licences we accept, normalised to lower case.
 *
 * Tatoeba writes these as free text, so the set is matched loosely on the
 * meaningful prefix — "cc by 4.0" and "cc by-sa 3.0" both start with a token we
 * recognise. Anything else, including the empty string, is not reusable *as far
 * as this pipeline is concerned*, which is the only standard that matters when
 * the alternative is guessing.
 */
const REUSABLE = [
  'cc0',
  'cc by',      // covers cc by 2.0 / 3.0 / 4.0 and the -fr variants
  'cc-by',
  'public domain',
];

/** Is this licence string one we may redistribute a recording under? */
export function isReusableLicense(license: string | undefined | null): boolean {
  const l = (license ?? '').trim().toLowerCase();
  if (!l) return false;                       // the documented "do not reuse" case
  // `\N` is Tatoeba's NULL marker and appears in ~1,400 real rows. It means the
  // same thing as empty; it is only called out because seeing it in the data is
  // the sort of thing that gets "fixed" by someone assuming it is a licence name.
  if (l === '\\n') return false;
  // Share-alike is fine (the corpus is already CC BY-SA); non-commercial and
  // no-derivatives are not, and must not slip through on the `cc by` prefix.
  if (l.includes('nc') || l.includes('noncommercial') || l.includes('non-commercial')) return false;
  if (l.includes('nd') || l.includes('noderiv')) return false;
  return REUSABLE.some((ok) => l.startsWith(ok));
}

/** Parse one `sentences_with_audio.csv` row. Returns null if unusable. */
export function parseRow(line: string): { sentenceId: string; entry: AudioEntry } | null {
  if (!line) return null;
  // audioId <TAB> sentenceId <TAB> username <TAB> licence <TAB> attributionUrl
  const [audioId, sentenceId, by, license, attribution] = line.split('\t');
  if (!audioId || !sentenceId) return null;
  if (!isReusableLicense(license)) return null;
  return {
    sentenceId,
    entry: { audioId, license: license.trim(), attribution: (attribution ?? '').trim(), by: (by ?? '').trim() },
  };
}

export interface BuildResult {
  manifest: AudioManifest;
  /** Rows seen, rows dropped for licence, rows kept but not matching any card. */
  stats: { rows: number; unlicensed: number; unmatched: number; kept: number };
}

/**
 * Stream the export and keep only rows that are (a) licensed for reuse and
 * (b) attached to a sentence some card actually cites.
 *
 * `cardBySentence` maps Tatoeba sentence id → card id (see `sentenceToCard`).
 * It is passed in rather than read here so this stays a pure-ish function the
 * tests can drive with a fixture.
 */
export async function buildAudioManifest(
  csvPath: string, cardBySentence: Map<string, string>,
): Promise<BuildResult> {
  const manifest: AudioManifest = {};
  const stats = { rows: 0, unlicensed: 0, unmatched: 0, kept: 0 };

  const rl = createInterface({ input: createReadStream(csvPath, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    stats.rows++;
    const parsed = parseRow(line);
    if (!parsed) { stats.unlicensed++; continue; }
    const cardId = cardBySentence.get(parsed.sentenceId);
    if (!cardId) { stats.unmatched++; continue; }
    // First usable recording per card wins; several contributors may have read
    // the same line and one voice per card is enough.
    if (!manifest[cardId]) { manifest[cardId] = parsed.entry; stats.kept++; }
  }
  return { manifest, stats };
}

/**
 * Tatoeba sentence id → card id, from provenance rows.
 *
 * Several cards can cite the same sentence; the first wins, which is arbitrary
 * but stable, and the loser still gets synthetic speech.
 */
export function sentenceToCard(provenance: { id?: string; exampleSource?: string | null }[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of provenance) {
    if (!p.id) continue;
    const m = /^tatoeba:(\d+)$/.exec((p.exampleSource ?? '').trim());
    if (m && !out.has(m[1])) out.set(m[1], p.id);
  }
  return out;
}
