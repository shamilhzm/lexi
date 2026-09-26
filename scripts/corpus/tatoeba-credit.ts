// How many shipped example sentences are Tatoeba's, and how many are credited?
//
//   node scripts/corpus/tatoeba-credit.ts
//
// Read-only. Tatoeba's sentences are CC BY 2.0 FR, and the only per-sentence
// credit the app can show is the link `provenance.json` records for a card
// (`exampleSource: tatoeba:<id>`, rendered by `lib/provenance.ts`). That file
// covers the cards built by the original pipeline and nothing authored since, so
// a sentence can ship verbatim from Tatoeba with no link — which is the gap this
// measures (panel review, 2026-09-25; ATTRIBUTIONS source 3).
//
// Exact string match against the local Tatoeba dump
// (`scripts/corpus/data/raw/tatoeba-deu.tsv`, from `corpus:fetch`). A short,
// common sentence ("Was ist das?") can match because an author wrote the same
// words independently; crediting it anyway costs nothing, so the count is the
// upper bound of what needs a link, not an accusation.
//
// `--list` prints `cardId<TAB>sentenceId<TAB>sentence` for every uncited match —
// the input a credit pass needs.
import { readFileSync, existsSync } from 'node:fs';

const TSV = 'scripts/corpus/data/raw/tatoeba-deu.tsv';
if (!existsSync(TSV)) {
  console.error(`${TSV} is missing — run the Tatoeba step of corpus:fetch first.`);
  process.exit(1);
}

const tatoeba = new Map<string, string>();
for (const line of readFileSync(TSV, 'utf8').split('\n')) {
  const [id, , text] = line.split('\t');
  if (text) tatoeba.set(text.trim(), id);
}

const prov = new Map<string, string>(
  (JSON.parse(readFileSync('public/data/provenance.json', 'utf8')) as { id: string; exampleSource: string }[])
    .map((r) => [r.id, r.exampleSource]),
);

let cards = 0, examples = 0, matched = 0, cited = 0;
const matchedCards = new Set<string>();
const uncited: string[] = [];
for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
  const detail = JSON.parse(readFileSync(`public/data/detail/${level}.json`, 'utf8')) as Record<string, { ex?: { de: string }[] }>;
  for (const [id, d] of Object.entries(detail)) {
    if (!id.startsWith('voc:')) continue;
    cards++;
    for (const ex of d.ex ?? []) {
      examples++;
      const sid = tatoeba.get((ex.de ?? '').trim());
      if (!sid) continue;
      matched++;
      matchedCards.add(id);
      if (prov.get(id) === `tatoeba:${sid}`) cited++;
      else uncited.push(`${id}\t${sid}\t${ex.de}`);
    }
  }
}

if (process.argv.includes('--list')) {
  for (const row of uncited) console.log(row);
} else {
  console.log(`word cards                      ${cards}`);
  console.log(`example sentences               ${examples}`);
  console.log(`exact Tatoeba matches           ${matched}  (in ${matchedCards.size} cards)`);
  console.log(`  credited by a provenance link ${cited}`);
  console.log(`  not credited                  ${matched - cited}`);
}
